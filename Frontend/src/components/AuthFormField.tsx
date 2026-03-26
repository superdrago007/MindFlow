import clsx from "clsx";

type AuthFormFieldProps = {
  id: string;
  label: string;
  type?: React.HTMLInputTypeAttribute;
  autoComplete?: string;
  value: string;
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
};

export default function AuthFormField({
  id,
  label,
  type = "text",
  autoComplete,
  value,
  placeholder,
  error,
  onChange
}: AuthFormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-body text-sm font-semibold text-[var(--text-secondary)]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={clsx(
          "glass-control h-11 w-full rounded-xl px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)]",
          error
            ? "border-red-400 bg-red-500/10 focus:border-red-400 focus:ring-2 focus:ring-red-300/35"
            : "focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--focus-ring)]"
        )}
      />
      {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
