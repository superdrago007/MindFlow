import type { LucideIcon } from "lucide-react";

type StatTileProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  gradientClassName: string;
};

export default function StatTile({ icon: Icon, label, value, gradientClassName }: StatTileProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${gradientClassName}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <p className="font-display text-2xl text-slate-800">{value}</p>
      </div>
      <p className="mt-3 text-sm text-slate-600">{label}</p>
    </article>
  );
}
