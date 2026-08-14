type SliderFieldProps = {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (value: number) => void
}

export function SliderField({
  label,
  hint,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: SliderFieldProps) {
  return (
    <label className="randomiser-slider">
      <span className="randomiser-slider-head">
        <span>{label}</span>
        <span className="randomiser-slider-value">{display}</span>
      </span>
      {hint && <span className="randomiser-slider-hint">{hint}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}
