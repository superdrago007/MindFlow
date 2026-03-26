import clsx from "clsx";

type ButtonVariant = "primary" | "ghost";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClassName: Record<ButtonVariant, string> = {
  primary: "bg-[var(--accent)] text-white shadow-[var(--shadow-button)] hover:bg-[var(--accent-strong)]",
  ghost: "glass-control text-[var(--text-primary)] hover:bg-[color:var(--glass-surface)]"
};

export default function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex h-11 w-full items-center justify-center rounded-xl px-4 font-body text-sm font-semibold transition duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60",
        variantClassName[variant],
        className
      )}
      {...props}
    />
  );
}
