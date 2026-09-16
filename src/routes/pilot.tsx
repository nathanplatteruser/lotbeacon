import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ResearchShell } from "@/components/research-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/pilot")({ component: PilotPage });

function PilotPage() {
  const [form, setForm] = useState({ name: "", shop: "", page: "", paste: "" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = encodeURIComponent(
      `Name: ${form.name}\nShop: ${form.shop}\nNamed Page: ${form.page}\nWhat we will paste:\n${form.paste}\n\nHuman Send stays. No live Meta wiring claimed.`,
    );
    window.location.href = `mailto:nathan@zoellner.example?subject=${encodeURIComponent("LotBeacon founding-dealer pilot")}&body=${body}`;
    toast("Opens your mail app. Nothing is sent from this page.");
  }

  return (
    <ResearchShell
      current="/pilot"
      title="Request a founding-dealer pilot"
      kicker="Zoellner Ford of Beatrice first. Month to month. You still hit Send."
    >
      <p className="max-w-xl text-muted-foreground">
        We will not claim a live Meta inbox. You paste a real inquiry or work the seeded floor. Name the Page you
        actually use. Tell us what you will paste in week one. We will not log into a personal Facebook profile or
        auto-type drafts so Meta cannot tell — that path is documented and refused on{" "}
        <Link to="/spot" className="underline-offset-2 hover:underline">
          Spot agents
        </Link>
        .
      </p>
      <form className="mt-8 max-w-lg space-y-4" onSubmit={submit}>
        <label className="block text-sm">
          Your name
          <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label className="block text-sm">
          Shop
          <Input className="mt-1" value={form.shop} onChange={(e) => setForm({ ...form, shop: e.target.value })} required />
        </label>
        <label className="block text-sm">
          Named Facebook Page
          <Input className="mt-1" value={form.page} onChange={(e) => setForm({ ...form, page: e.target.value })} required />
        </label>
        <label className="block text-sm">
          What you will paste (week-one inquiries)
          <Textarea className="mt-1" rows={5} value={form.paste} onChange={(e) => setForm({ ...form, paste: e.target.value })} />
        </label>
        <Button type="submit">Open mail to request a pilot</Button>
      </form>
    </ResearchShell>
  );
}
