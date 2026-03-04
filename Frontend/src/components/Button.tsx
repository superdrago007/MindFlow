import clsx from "clsx";

type ButtonVariant = "primary" | "ghost";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    "bg-coral-500 text-white hover:bg-coral-600 focus-visible:shadow-focus disabled:bg-coral-500/60",
  ghost:
    "border border-ink-300 bg-white text-ink-800 hover:bg-ink-50 focus-visible:shadow-focus"
};

export default function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex h-11 w-full items-center justify-center rounded-lg px-4 font-body text-sm font-medium transition duration-200",
        "focus-visible:outline-none disabled:cursor-not-allowed",
        variantClassName[variant],
        className
      )}
      {...props}
    />
  );
}
