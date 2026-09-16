import { createFileRoute } from "@tanstack/react-router";
import { OwnerDashboard } from "@/components/owner-dashboard";

export const Route = createFileRoute("/app/analytics")({
  component: OwnerDashboard,
});
