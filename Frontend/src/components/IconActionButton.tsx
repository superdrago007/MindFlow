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
        "inline-flex items-center justify-center rounded-xl border transition duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60",
        compact ? "h-9 w-9" : "h-10 w-10",
        active
          ? "border-transparent bg-[var(--accent)] text-white shadow-[var(--shadow-button)]"
          : "glass-control text-[var(--text-secondary)] hover:bg-[color:var(--glass-surface)] hover:text-[var(--text-primary)]",
        className
      )}
      {...props}
    >
      <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
      <span className="sr-only">{label}</span>
    </button>
  );
}
