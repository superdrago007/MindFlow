import clsx from "clsx";
import type { CSSProperties } from "react";

type TagTone = "blue" | "green" | "purple" | "orange" | "pink" | "slate";

type TagChipProps = {
  name: string;
  count?: number;
  tone?: TagTone;
  color?: string | null;
  selected?: boolean;
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

const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

function hexToRgba(hexColor: string, alpha: number): string {
  const normalized = hexColor.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function buildCustomColorStyle(color?: string | null): CSSProperties | undefined {
  if (!color) {
    return undefined;
  }

  const normalized = color.trim().toUpperCase();
  if (!hexColorPattern.test(normalized)) {
    return undefined;
  }

  return {
    borderColor: hexToRgba(normalized, 0.35),
    backgroundColor: hexToRgba(normalized, 0.18),
    color: normalized
  };
}

export default function TagChip({ name, count, tone = "slate", color, selected = false, onClick }: TagChipProps) {
  const content = `#${name}${typeof count === "number" ? ` (${count})` : ""}`;
  const customStyle = buildCustomColorStyle(color);
  const chipClassName = clsx(
    "rounded-lg border px-2.5 py-1 text-xs font-semibold",
    !customStyle && toneClassName[tone],
    selected && "ring-2 ring-[color:var(--focus-ring)]"
  );

  if (!onClick) {
    return (
      <span className={chipClassName} style={customStyle}>
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={clsx(
        "rounded-lg border px-2.5 py-1 text-xs font-semibold transition duration-200 hover:brightness-105",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]",
        !customStyle && toneClassName[tone],
        selected && "ring-2 ring-[color:var(--focus-ring)]"
      )}
      onClick={onClick}
      style={customStyle}
    >
      {content}
    </button>
  );
}
