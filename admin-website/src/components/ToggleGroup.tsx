type ToggleGroupProps<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (next: T[]) => void;
};

/** A multi-select as a row of toggle buttons: every option visible, selected ones filled. */
export function ToggleGroup<T extends string>({ label, options, selected, onChange }: ToggleGroupProps<T>) {
  const toggle = (value: T) =>
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : // Kept in the options' order, not the order they were clicked.
          options.map((option) => option.value).filter((item) => item === value || selected.includes(item)),
    );

  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="buttonRow" role="group" aria-label={label} style={{ flexWrap: 'wrap' }}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              className={`button buttonSmall${isSelected ? ' buttonPrimary' : ''}`}
              aria-pressed={isSelected}
              onClick={() => toggle(option.value)}>
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
