/** Minimal styled select used across builder/config panels. */
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'None',
  allowEmpty = false,
}: SelectProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-content-muted">
          {label}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border-subtle bg-bg-inset px-2 py-1.5 text-[13px] text-content-primary outline-none focus:border-accent"
      >
        {allowEmpty && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
