import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

type IconActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  compact?: boolean;
};

export default function IconActionButton({
  label,
  icon: Icon,
  active = false,
  compact = false,
  className,
  ...props
}: IconActionButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={clsx(
        "inline-flex items-center justify-center rounded-lg border transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-60",
        compact ? "h-9 w-9" : "h-10 w-10",
        active
          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100",
        className
      )}
      {...props}
    >
      <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
      <span className="sr-only">{label}</span>
    </button>
  );
}
