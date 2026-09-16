import { createFileRoute } from "@tanstack/react-router";
import { InboxWorkspace } from "@/components/inbox-workspace";

export const Route = createFileRoute("/app/inbox")({
  component: InboxPage,
});

function InboxPage() {
  return <InboxWorkspace />;
}
