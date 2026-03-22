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
      <label htmlFor={id} className="mb-2 block font-body text-sm font-medium text-slate-700">
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
          "h-11 w-full rounded-lg border px-3 text-sm text-slate-900 outline-none transition",
          error
            ? "border-red-400 bg-red-50 focus:border-red-500"
            : "border-slate-300 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        )}
      />
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
