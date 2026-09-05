"""Build the zero-backend showcase: docs/index.html.

Runs the real app in-process, plays every seeded conversation forward (send → scripted customer reply → new draft → …,
booking when the customer picks a time) and records each state. The showcase page is the real UI with the API swapped
for those recordings, so it can be served from GitHub Pages (or any static host) with no server, no key, no cost.

    python -m scripts.export_showcase            # writes docs/index.html
    python -m scripts.export_showcase --artifact  # also writes docs/showcase-artifact.html (no doctype/html/head/body)

What still works: queue, every thread, Send & next (advances the recording), Book, why-this-action, inventory evidence,
Impact, Owner dashboard, tour, keyboard. What is disabled (needs the live server): free-text edits being re-validated,
the live-inquiry analyzer, reply-style changes, follow-up nudges, fact corrections, inventory events.
"""
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.environ["LOTBEACON_AI_PROVIDER"] = "mock"
os.environ["LOTBEACON_DATABASE_URL"] = f"sqlite:///{ROOT / 'showcase-build.db'}"
if (ROOT / "showcase-build.db").exists():
    (ROOT / "showcase-build.db").unlink()

from fastapi.testclient import TestClient  # noqa: E402

from lotbeacon.api import app  # noqa: E402

MAX_STEPS = 12


def build() -> dict:
    data = {"built_at": datetime.now(timezone.utc).isoformat(), "threads": {}, "evidence": {}, "queue_rows": {}}
    with TestClient(app) as c:
        data["meta"] = c.get("/api/meta").json()
        data["owner"] = c.get("/api/metrics/owner").json()
        q0 = c.get("/api/queue").json()
        data["buckets"] = q0["buckets"]
        ids = [r["id"] for r in q0["rows"]]
        rep_id = data["meta"]["reps"][0]["id"]
        # opening a lead assigns it (mirrors the UI)
        for tid in ids:
            c.post(f"/api/threads/{tid}/assign", json={"rep_id": rep_id})
        for tid in ids:
            steps = []
            for _ in range(MAX_STEPS):
                detail = c.get(f"/api/threads/{tid}").json()
                row = next((r for r in c.get("/api/queue").json()["rows"] if r["id"] == tid), None)
                step = {"detail": detail, "explain": c.get(f"/api/threads/{tid}/explain").json()["steps"],
                        "impact": c.get(f"/api/threads/{tid}/impact").json(), "row": row, "action": None, "result": None}
                steps.append(step)
                bk = detail.get("booking") or {}
                dr = detail.get("draft")
                if bk.get("stage") == "time_selected":
                    r = c.post(f"/api/threads/{tid}/book", json={"rep_id": rep_id})
                    step["action"], step["result"] = "book", (r.json() if r.status_code == 200 else None)
                    if r.status_code != 200:
                        break
                elif dr and dr["status"] == "pending" and dr["text"] and detail["window"]["open"] and not detail["customer"]["opted_out"]:
                    r = c.post(f"/api/drafts/{dr['id']}/send", json={"rep_id": rep_id, "text": dr["text"]})
                    step["action"], step["result"] = "send", (r.json() if r.status_code == 200 else None)
                    if r.status_code != 200:
                        break
                else:
                    break
            data["threads"][str(tid)] = {"steps": steps}
        for v in c.get("/api/inventory").json():
            data["evidence"][v["stock_number"]] = c.get(f"/api/inventory/{v['stock_number']}/evidence").json()
        data["owner_after"] = c.get("/api/metrics/owner").json()
    (ROOT / "showcase-build.db").unlink(missing_ok=True)
    return data


SHIM = r"""
/* ---------------- showcase: recorded API (no server) ---------------- */
const LB=window.LB_STATIC; const CUR={}; for(const k in LB.threads) CUR[k]=0;
const stepOf=id=>LB.threads[String(id)].steps[Math.min(CUR[String(id)],LB.threads[String(id)].steps.length-1)];
function needsLive(what){toast(what+' needs the live demo (Claude + server) — this is the recorded showcase');}
function buildQueue(){
  const rows=[];for(const k in LB.threads){const st=stepOf(k);if(st.row)rows.push(st.row);}
  const order=LB.buckets.map(b=>b.key);rows.sort((a,b)=>order.indexOf(a.bucket)-order.indexOf(b.bucket)||(b.waiting_seconds||0)-(a.waiting_seconds||0));
  return {buckets:LB.buckets,rows};
}
async function api(path,opts={}){
  const m=path.match(/^\/api\/threads\/(\d+)(?:\/(\w+))?$/),body=opts.body||{},method=opts.method||'GET';
  if(path==='/api/meta') return LB.meta;
  if(path==='/api/queue') return buildQueue();
  if(path==='/api/metrics/owner') return LB.owner;
  if(path==='/api/metrics/assumptions'){needsLive('Editing assumptions');return LB.owner.assumptions;}
  if(path==='/api/inventory') return Object.values(LB.evidence).map(e=>e.vehicle);
  const ev=path.match(/^\/api\/inventory\/([^/]+)\/evidence$/); if(ev) return LB.evidence[decodeURIComponent(ev[1])];
  if(path==='/api/analyze'){throw new Error('The live-inquiry analyzer runs Claude against live inventory — it needs the hosted demo, not this recording.');}
  const dm=path.match(/^\/api\/drafts\/(\d+)\/(edit|send)$/);
  if(dm){
    const id=Object.keys(LB.threads).find(k=>stepOf(k).detail.draft&&stepOf(k).detail.draft.id===+dm[1]);
    if(!id) throw new Error('This draft is not part of the recording');
    const st=stepOf(id);
    if(dm[2]==='edit'){return {...st.detail.draft,text:body.text};}
    if(st.action!=='send'){throw new Error('Recording ends here for this conversation — the live demo keeps going');}
    CUR[id]++; return st.result;
  }
  if(m){
    const id=m[1],sub=m[2],st=stepOf(id);
    if(!sub) return st.detail;
    if(sub==='explain') return {thread_id:+id,steps:st.explain};
    if(sub==='impact') return st.impact;
    if(sub==='assign') return {ok:true};
    if(sub==='book'){ if(st.action!=='book') throw new Error('Recording ends here — the live demo books it'); CUR[id]++; return st.result; }
    if(sub==='slots'){needsLive('Swapping the slot pair');return {};}
    needsLive({takeover:'Manual mode',voice:'Reply style',followup:'Follow-up nudges',offline:'Offline logging',state:'Stage correction',appointment:'Appointment edits'}[sub]||sub);
    return {};
  }
  if(path.startsWith('/api/facts/')){needsLive('Fact correction');return {};}
  if(path==='/webhook/messenger'){needsLive('Simulating a new customer message');return {};}
  if(path.startsWith('/api/inventory/')){needsLive('Inventory events');return {};}
  throw new Error('Not in the recording: '+path);
}
"""


def render(data: dict, artifact: bool = False) -> str:
    html = (ROOT / "lotbeacon" / "web" / "index.html").read_text()
    # swap the network api() for the recorded one
    start = html.index("async function api(path,opts={}){")
    end = html.index("\n", html.index("return r.json();", start)) + 1
    end = html.index("\n", end) + 1  # closing brace line
    html = html[:start] + "/* api() replaced by the showcase shim below */\n" + html[end:]
    html = html.replace("<script>\nconst $=s=>document.querySelector(s);",
                        "<script>\nwindow.LB_STATIC=" + json.dumps(data, separators=(",", ":")).replace("</", "<\\/") + ";\n</script>\n<script>\nconst $=s=>document.querySelector(s);" + SHIM)
    # keep the page honest about what it is
    built = datetime.fromisoformat(data["built_at"]).strftime("%b %d, %Y")
    banner = f'<div style="background:#FFF3DF;color:#7A4A00;font-size:12.5px;padding:6px 20px;text-align:center;border-bottom:1px solid #F0D9B0">Interactive showcase · recorded {built} · Send &amp; next and Book play the conversation forward</div>'
    html = html.replace("</header>", "</header>" + banner, 1)
    html = html.replace("calc(100vh - 52px)", "calc(100vh - 52px - 31px)")
    html = html.replace("window.open(`/api/audit/export?thread_id=${d.id}`,'_blank');", "needsLive('Audit export');")
    html = html.replace("window.open('/api/audit/export','_blank')", "needsLive('Audit export')")
    html = html.replace("<title>LotBeacon</title>", "<title>LotBeacon · showcase</title>")
    if artifact:
        html = re.sub(r"^<!doctype html>\s*<html[^>]*>\s*<head>\s*", "", html, flags=re.I)
        html = re.sub(r"<meta charset=\"utf-8\">\s*<meta name=\"viewport\"[^>]*>\s*", "", html)
        html = html.replace("</head>\n<body>", "").replace("</body>\n</html>", "").replace("</body>", "").replace("</html>", "")
    return html


if __name__ == "__main__":
    data = build()
    docs = ROOT / "docs"
    docs.mkdir(exist_ok=True)
    (docs / "index.html").write_text(render(data))
    (docs / ".nojekyll").write_text("")
    n_steps = sum(len(t["steps"]) for t in data["threads"].values())
    print(f"docs/index.html — {len(data['threads'])} conversations, {n_steps} recorded states, {os.path.getsize(docs / 'index.html') / 1024:.0f} KB")
    if "--artifact" in sys.argv:
        (docs / "showcase-artifact.html").write_text(render(data, artifact=True))
        print("docs/showcase-artifact.html")
