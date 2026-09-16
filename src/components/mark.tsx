import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("text-silver", className)} fill="none" aria-hidden>
      <path d="M12 3v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 6.5 16 9.2 12 12 8 9.2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 20h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.5 20v-2.5h5V20" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Mark className="size-5" />
      <span className="font-medium tracking-tight">LotBeacon</span>
    </span>
  );
}
