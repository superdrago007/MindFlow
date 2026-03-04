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
      <label htmlFor={id} className="mb-2 block font-body text-sm font-medium text-ink-800">
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
          "h-11 w-full rounded-lg border px-3 text-sm text-ink-900 outline-none transition",
          error
            ? "border-coral-500 bg-coral-500/5 focus:border-coral-500"
            : "border-ink-200 bg-white focus:border-ink-400 focus:shadow-focus"
        )}
      />
      {error ? <p className="mt-2 text-xs text-coral-700">{error}</p> : null}
    </div>
  );
}
