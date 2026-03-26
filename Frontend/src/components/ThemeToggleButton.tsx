import clsx from "clsx";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import IconActionButton from "./IconActionButton";

type ThemeToggleButtonProps = {
  compact?: boolean;
  className?: string;
};

export default function ThemeToggleButton({ compact = false, className }: ThemeToggleButtonProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <IconActionButton
      label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      icon={isDark ? Sun : Moon}
      compact={compact}
      onClick={toggleTheme}
      className={clsx("glass-control text-[var(--text-primary)]", className)}
    />
  );
}
