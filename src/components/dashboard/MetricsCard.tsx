import { LucideIcon } from "lucide-react";

interface MetricsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "destructive" | "info" | "purple";
  onClick?: () => void;
  active?: boolean;
  subtitle?: string;
}

const styles = {
  default: {
    border: "border-primary/25",
    label: "text-primary",
    iconBg: "bg-primary/10 text-primary",
    value: "text-foreground",
    track: "bg-primary/10",
    bar: "bg-primary",
  },
  success: {
    border: "border-success/25",
    label: "text-success",
    iconBg: "bg-success/10 text-success",
    value: "text-success",
    track: "bg-success/10",
    bar: "bg-success",
  },
  warning: {
    border: "border-warning/30",
    label: "text-warning",
    iconBg: "bg-warning/10 text-warning",
    value: "text-warning",
    track: "bg-warning/15",
    bar: "bg-warning",
  },
  destructive: {
    border: "border-destructive/25",
    label: "text-destructive",
    iconBg: "bg-destructive/10 text-destructive",
    value: "text-destructive",
    track: "bg-destructive/10",
    bar: "bg-destructive",
  },
  info: {
    border: "border-info/25",
    label: "text-info",
    iconBg: "bg-info/10 text-info",
    value: "text-info",
    track: "bg-info/10",
    bar: "bg-info",
  },
  purple: {
    border: "border-purple/25",
    label: "text-purple",
    iconBg: "bg-purple/10 text-purple",
    value: "text-purple",
    track: "bg-purple/10",
    bar: "bg-purple",
  },
} as const;

export const MetricsCard = ({
  title,
  value,
  icon: Icon,
  variant = "default",
  onClick,
  active = false,
  subtitle,
}: MetricsCardProps) => {
  const s = styles[variant];

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border ${s.border} bg-card p-4 shadow-card transition-all hover:shadow-elevated hover:-translate-y-0.5 ${
        onClick ? "cursor-pointer" : ""
      } ${active ? "ring-2 ring-offset-2 ring-[hsl(var(--ring))]" : ""}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider leading-tight ${s.label}`}>
          {title}
        </span>
        <div className={`shrink-0 rounded-lg p-1.5 ${s.iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className={`font-mono text-2xl font-bold tracking-tight tabular-nums ${s.value}`}>
        {value}
      </div>

      {subtitle && (
        <p className={`mt-1 text-[10px] font-medium uppercase tracking-wider leading-tight ${s.label} opacity-80`}>
          {subtitle}
        </p>
      )}

      <div className={`mt-2 h-1 w-full overflow-hidden rounded-full ${s.track}`}>
        <div className={`h-full w-full origin-left ${s.bar} transition-transform duration-500 group-hover:scale-x-100`} />
      </div>
    </div>
  );
};
