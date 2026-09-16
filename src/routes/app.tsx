import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/app")({
  validateSearch: (raw: Record<string, unknown>): { as?: "sales" | "owner" | "admin" | "finance" } => ({
    as: raw.as === "owner" || raw.as === "sales" || raw.as === "admin" || raw.as === "finance" ? raw.as : undefined,
  }),
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
