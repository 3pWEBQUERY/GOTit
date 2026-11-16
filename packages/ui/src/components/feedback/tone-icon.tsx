import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "../../cn";

export type Tone = "neutral" | "info" | "success" | "warning" | "error";

const icons = { neutral: Info, info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert } as const;

const colors: Record<Tone, string> = {
  neutral: "text-ink-muted",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
};

/** Icon eines Tons. Der Ton steht nie allein in der Farbe: Daneben steht immer Text. */
export function ToneIcon({ tone, className }: { tone: Tone; className?: string }) {
  const Icon = icons[tone];
  return <Icon aria-hidden strokeWidth={1.5} className={cn("size-5 shrink-0", colors[tone], className)} />;
}
