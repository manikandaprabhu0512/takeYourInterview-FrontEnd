import { Loader2 } from "lucide-react";

export default function Loader({ label = "Loading…", className = "" }) {
  return (
    <div
      className={`flex items-center justify-center align-middle gap-2 text-sm text-(--ink-soft) z-10 bg-black/50 dark:bg-white/10 ${className}`}
    >
      <Loader2 size={14} className="animate-spin text-(--binding)" />
      <span>{label}</span>
    </div>
  );
}
