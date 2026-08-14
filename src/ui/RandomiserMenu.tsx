import type { RandomiserSettings } from '../data/randomiser'

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

function SliderField({
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

type RandomiserMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: RandomiserSettings
  onSettingsChange: (settings: RandomiserSettings) => void
  seed: number
  generating: boolean
  onGenerate: () => void
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function RandomiserMenu({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  seed,
  generating,
  onGenerate,
}: RandomiserMenuProps) {
  const patch = (partial: Partial<RandomiserSettings>) => {
    onSettingsChange({ ...settings, ...partial })
  }

  return (
    <div className="chrome-menu">
      <button
        type="button"
        className="chrome-button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => onOpenChange(!open)}
      >
        Randomiser
      </button>
      {open && (
        <div className="chrome-panel chrome-panel-wide">
          <SliderField
            label="Axial tilt"
            hint="Angle between spin axis and orbit around the sun"
            value={settings.axialTilt}
            min={0}
            max={90}
            step={0.5}
            display={`${settings.axialTilt.toFixed(1)}°`}
            onChange={(axialTilt) => patch({ axialTilt })}
          />
          <SliderField
            label="Oceans"
            hint="More water vs more land"
            value={settings.oceanAmount}
            min={0}
            max={1}
            step={0.01}
            display={percent(settings.oceanAmount)}
            onChange={(oceanAmount) => patch({ oceanAmount })}
          />
          <SliderField
            label="Mountains"
            hint="How tall the relief is"
            value={settings.mountainHeight}
            min={0}
            max={1}
            step={0.01}
            display={percent(settings.mountainHeight)}
            onChange={(mountainHeight) => patch({ mountainHeight })}
          />
          <SliderField
            label="Continent size"
            hint="Few large landmasses vs many small ones"
            value={settings.continentSize}
            min={0}
            max={1}
            step={0.01}
            display={percent(settings.continentSize)}
            onChange={(continentSize) => patch({ continentSize })}
          />
          <SliderField
            label="Roughness"
            hint="Worn flats vs sharp ridges"
            value={settings.roughness}
            min={0}
            max={1}
            step={0.01}
            display={percent(settings.roughness)}
            onChange={(roughness) => patch({ roughness })}
          />
          <SliderField
            label="Climate variation"
            hint="Smooth latitude bands vs patchier biomes"
            value={settings.climateVariation}
            min={0}
            max={1}
            step={0.01}
            display={percent(settings.climateVariation)}
            onChange={(climateVariation) => patch({ climateVariation })}
          />
          <div className="randomiser-footer">
            <span className="randomiser-seed">Seed {seed}</span>
            <button
              type="button"
              className="randomiser-generate"
              disabled={generating}
              onClick={onGenerate}
            >
              {generating ? 'Generating…' : 'Generate world'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
