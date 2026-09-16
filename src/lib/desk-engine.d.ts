export function getDesk(): Window["LB_DESK"] | undefined;

declare global {
  interface Window {
    LB_DESK: {
      THREAD_ID: number;
      LANGS: { id: string; label: string }[];
      PATHS: { id: string; label: string; blurb: string }[];
      MIN_EXCHANGES: { quick: number; medium: number; guided: number };
      NEXT: { yes: string; no: string; later: string };
      OUTCOME: { label: string; line: string };
      SEEDED_ADDRESS: string;
      PARKING: string;
      REP_NAME: string;
      state: {
        lang: string;
        path: string;
        step: number;
        booked: boolean;
        sent: boolean;
        close: null | "withdrawn" | "ghosted";
      };
      setLang: (id: string) => void;
      setPath: (id: string) => void;
      resetStep: () => void;
      send: () => { demo: { replied?: boolean; confirmation_played?: boolean } };
      book: () => { label: string; booked: boolean; sent: boolean };
      withdraw: () => { label: string; closed: boolean };
      ghostClose: () => { label: string; closed: boolean };
      editDraft: (text: string) => { text: string };
      detail: () => Record<string, unknown>;
      row: () => Record<string, unknown>;
      explain: () => { step: string; label: string; detail: string }[];
      impact: () => Record<string, unknown>;
      adminNote: () => {
        path: string;
        language: string;
        asked: string;
        acknowledged: string;
        holding: string;
        note: string;
        demo_copy: boolean;
      };
      calendarPack?: (booking: unknown, vehicle: unknown) => { ics?: string; google?: string };
      fromQuery: () => void;
    };
  }
}