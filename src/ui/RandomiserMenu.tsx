import type { RandomiserSettings } from '../data/randomiser'
import { SliderField } from './SliderField'

type RandomiserMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: RandomiserSettings
  onSettingsChange: (settings: RandomiserSettings) => void
  seedDraft: string
  onSeedDraftChange: (seed: string) => void
  generating: boolean
  onGenerate: () => void
  onRebuild: () => void
  onCopySeed: () => void
  comparing: boolean
  onCompare: () => void
  onCloseCompare: () => void
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function RandomiserMenu({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  seedDraft,
  onSeedDraftChange,
  generating,
  onGenerate,
  onRebuild,
  onCopySeed,
  comparing,
  onCompare,
  onCloseCompare,
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
            hint="Angle between spin axis and orbit around the star"
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
          <SliderField
            label="Resolution"
            hint="Mesh density. Higher is sharper coasts, slower to generate"
            value={settings.resolution}
            min={128}
            max={512}
            step={32}
            display={`${settings.resolution}`}
            onChange={(resolution) => patch({ resolution })}
          />
          <div className="randomiser-footer">
            <label className="randomiser-seed-field">
              <span>Seed</span>
              <span className="randomiser-seed-row">
                <input
                  value={seedDraft}
                  onChange={(event) => onSeedDraftChange(event.target.value)}
                  inputMode="numeric"
                  spellCheck={false}
                />
                <button type="button" onClick={onCopySeed}>
                  Copy
                </button>
              </span>
            </label>
            <div className="randomiser-actions">
              <button
                type="button"
                className="randomiser-generate randomiser-generate-secondary"
                disabled={generating}
                onClick={onRebuild}
              >
                Rebuild
              </button>
              <button
                type="button"
                className="randomiser-generate"
                disabled={generating}
                onClick={onGenerate}
              >
                {generating ? 'Generating…' : 'New seed'}
              </button>
            </div>
            <button
              type="button"
              className="randomiser-generate randomiser-generate-secondary"
              disabled={generating}
              onClick={onCompare}
            >
              {comparing ? 'New compare seed' : 'Compare another seed'}
            </button>
            {comparing && (
              <button
                type="button"
                className="randomiser-generate randomiser-generate-secondary"
                onClick={onCloseCompare}
              >
                Close compare
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
