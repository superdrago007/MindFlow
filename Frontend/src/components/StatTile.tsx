import type { LucideIcon } from "lucide-react";

type StatTileProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  gradientClassName: string;
};

export default function StatTile({ icon: Icon, label, value, gradientClassName }: StatTileProps) {
  return (
    <article className="glass-panel elevate-hover rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${gradientClassName} shadow-[var(--shadow-button)]`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <p className="font-display text-2xl text-[var(--text-primary)]">{value}</p>
      </div>
      <p className="mt-3 text-sm text-[var(--text-secondary)]">{label}</p>
    </article>
  );
}
