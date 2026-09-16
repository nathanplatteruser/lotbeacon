export const THEME_IDS = ["spacex", "classic", "zoellner", "husker"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const THEMES: {
  id: ThemeId;
  label: string;
  note: string;
  swatch: string;
  scheme: "dark" | "light";
}[] = [
  {
    id: "spacex",
    label: "SpaceX Black",
    note: "Ink and paper. Tesla-quiet.",
    swatch: "#09090b",
    scheme: "dark",
  },
  {
    id: "classic",
    label: "Classic White",
    note: "White page, black type.",
    swatch: "#ffffff",
    scheme: "light",
  },
  {
    id: "zoellner",
    label: "Zoellner Blue",
    note: "Ford Blue PMS 288 C.",
    swatch: "#003478",
    scheme: "light",
  },
  {
    id: "husker",
    label: "Husker Red",
    note: "UNL Scarlet PMS 186 CP.",
    swatch: "#d00000",
    scheme: "light",
  },
];

export const THEME_KEY = "lotbeacon-theme";

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && (THEME_IDS as readonly string[]).includes(v);
}

export function readTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === "night") return "spacex";
    if (isThemeId(raw)) return raw;
  } catch {
    /* private mode */
  }
  return "spacex";
}

export function applyTheme(id: ThemeId) {
  const spec = THEMES.find((t) => t.id === id) ?? THEMES[0];
  const root = document.documentElement;
  root.setAttribute("data-theme", spec.id);
  root.style.colorScheme = spec.scheme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", spec.swatch);
}

export function writeTheme(id: ThemeId) {
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {
    /* ignore */
  }
  applyTheme(id);
}

export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="night")t="spacex";if(t==="classic"||t==="zoellner"||t==="husker"||t==="spacex"){document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t==="spacex"?"dark":"light";}}catch(e){}})();`;
