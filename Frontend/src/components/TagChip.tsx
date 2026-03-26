import clsx from "clsx";

type TagTone = "blue" | "green" | "purple" | "orange" | "pink" | "slate";

type TagChipProps = {
  name: string;
  count?: number;
  tone?: TagTone;
  onClick?: () => void;
};

const toneClassName: Record<TagTone, string> = {
  blue: "border-[color:var(--tag-blue-border)] bg-[color:var(--tag-blue-bg)] text-[color:var(--tag-blue-text)]",
  green: "border-[color:var(--tag-green-border)] bg-[color:var(--tag-green-bg)] text-[color:var(--tag-green-text)]",
  purple: "border-[color:var(--tag-purple-border)] bg-[color:var(--tag-purple-bg)] text-[color:var(--tag-purple-text)]",
  orange: "border-[color:var(--tag-orange-border)] bg-[color:var(--tag-orange-bg)] text-[color:var(--tag-orange-text)]",
  pink: "border-[color:var(--tag-pink-border)] bg-[color:var(--tag-pink-bg)] text-[color:var(--tag-pink-text)]",
  slate: "border-[color:var(--tag-slate-border)] bg-[color:var(--tag-slate-bg)] text-[color:var(--tag-slate-text)]"
};

export default function TagChip({ name, count, tone = "slate", onClick }: TagChipProps) {
  const content = `#${name}${typeof count === "number" ? ` (${count})` : ""}`;

  if (!onClick) {
    return <span className={clsx("rounded-lg border px-2.5 py-1 text-xs font-semibold", toneClassName[tone])}>{content}</span>;
  }

  return (
    <button
      type="button"
      className={clsx(
        "rounded-lg border px-2.5 py-1 text-xs font-semibold transition duration-200 hover:brightness-105",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]",
        toneClassName[tone]
      )}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
