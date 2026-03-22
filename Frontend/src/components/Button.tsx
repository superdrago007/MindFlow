import clsx from "clsx";

type ButtonVariant = "primary" | "ghost";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-400 disabled:bg-indigo-400",
  ghost:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus-visible:ring-indigo-400"
};

export default function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex h-11 w-full items-center justify-center rounded-lg px-4 font-body text-sm font-medium transition duration-200",
        "focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed",
        variantClassName[variant],
        className
      )}
      {...props}
    />
  );
}
