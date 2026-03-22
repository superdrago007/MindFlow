import clsx from "clsx";

type TagTone = "blue" | "green" | "purple" | "orange" | "pink" | "slate";

type TagChipProps = {
  name: string;
  count?: number;
  tone?: TagTone;
  onClick?: () => void;
};

const toneClassName: Record<TagTone, string> = {
  blue: "bg-blue-100 text-blue-700",
  green: "bg-emerald-100 text-emerald-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
  pink: "bg-pink-100 text-pink-700",
  slate: "bg-slate-100 text-slate-700"
};

export default function TagChip({ name, count, tone = "slate", onClick }: TagChipProps) {
  const content = `#${name}${typeof count === "number" ? ` (${count})` : ""}`;

  if (!onClick) {
    return <span className={clsx("rounded-md px-2 py-1 text-xs font-medium", toneClassName[tone])}>{content}</span>;
  }

  return (
    <button
      type="button"
      className={clsx(
        "rounded-md px-2 py-1 text-xs font-medium transition hover:brightness-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
        toneClassName[tone]
      )}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
