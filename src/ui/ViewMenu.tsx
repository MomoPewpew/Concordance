import { useId } from 'react'
import { OVERLAY_MODES, type OverlayMode } from '../data/overlay'
import { ORBIT_AXIS_COLOR, SPIN_AXIS_COLOR } from '../globe/axes'
import { SliderField } from './SliderField'

const OVERLAY_LABELS: Record<OverlayMode, string> = {
  none: 'Biome',
  temperature: 'Temperature',
  humidity: 'Humidity',
  continentalness: 'Continentalness',
  erosion: 'Erosion',
}

type ViewMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  showSpinAxis: boolean
  onShowSpinAxisChange: (show: boolean) => void
  evenLight: boolean
  onEvenLightChange: (even: boolean) => void
  overlay: OverlayMode
  onOverlayChange: (overlay: OverlayMode) => void
  dayAngle: number
  onDayAngleChange: (angle: number) => void
  daylightPlaying: boolean
  onDaylightPlayingChange: (playing: boolean) => void
  showFlow: boolean
  onShowFlowChange: (show: boolean) => void
  onPreset: (preset: 'atlas' | 'space' | 'climate') => void
}

export function ViewMenu({
  open,
  onOpenChange,
  showSpinAxis,
  onShowSpinAxisChange,
  evenLight,
  onEvenLightChange,
  overlay,
  onOverlayChange,
  dayAngle,
  onDayAngleChange,
  daylightPlaying,
  onDaylightPlayingChange,
  showFlow,
  onShowFlowChange,
  onPreset,
}: ViewMenuProps) {
  const spinId = useId()
  const fillId = useId()
  const overlayId = useId()
  const flowId = useId()

  return (
    <div className="chrome-menu">
      <button
        type="button"
        className="chrome-button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => onOpenChange(!open)}
      >
        View
      </button>
      {open && (
        <div className="chrome-panel chrome-panel-wide">
          <div className="view-presets">
            <span className="view-menu-item-title">Presets</span>
            <div className="view-preset-row">
              <button type="button" onClick={() => onPreset('atlas')}>
                Atlas
              </button>
              <button type="button" onClick={() => onPreset('space')}>
                From space
              </button>
              <button type="button" onClick={() => onPreset('climate')}>
                Climate
              </button>
            </div>
          </div>
          <label className="view-menu-item" htmlFor={spinId}>
            <input
              id={spinId}
              type="checkbox"
              checked={showSpinAxis}
              onChange={(event) => onShowSpinAxisChange(event.target.checked)}
            />
            <span className="view-menu-item-text">
              <span className="view-menu-item-title">Spin axis</span>
              <span className="view-menu-item-hint">
                Cyan is planet spin, gold is the orbit around the star. They
                split when the world has axial tilt.
              </span>
            </span>
          </label>
          {showSpinAxis && (
            <ul className="view-menu-legend">
              <li>
                <span
                  className="view-menu-swatch view-menu-swatch-solid"
                  style={{ background: SPIN_AXIS_COLOR }}
                />
                Planet spin
              </li>
              <li>
                <span
                  className="view-menu-swatch view-menu-swatch-dashed"
                  style={{ borderColor: ORBIT_AXIS_COLOR }}
                />
                Orbit around star
              </li>
            </ul>
          )}
          <label className="view-menu-item" htmlFor={fillId}>
            <input
              id={fillId}
              type="checkbox"
              checked={evenLight}
              onChange={(event) => onEvenLightChange(event.target.checked)}
            />
            <span className="view-menu-item-text">
              <span className="view-menu-item-title">Light from all sides</span>
              <span className="view-menu-item-hint">
                Fill the night side so the whole globe is readable.
              </span>
            </span>
          </label>
          <label className="view-menu-item" htmlFor={flowId}>
            <input
              id={flowId}
              type="checkbox"
              checked={showFlow}
              onChange={(event) => onShowFlowChange(event.target.checked)}
            />
            <span className="view-menu-item-text">
              <span className="view-menu-item-title">Wind and currents</span>
              <span className="view-menu-item-hint">
                White strokes are prevailing winds. Teal strokes are ocean
                flow, stronger along coasts.
              </span>
            </span>
          </label>
          <label className="view-overlay" htmlFor={overlayId}>
            <span className="view-menu-item-title">Overlay</span>
            <select
              id={overlayId}
              value={overlay}
              onChange={(event) =>
                onOverlayChange(event.target.value as OverlayMode)
              }
            >
              {OVERLAY_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {OVERLAY_LABELS[mode]}
                </option>
              ))}
            </select>
          </label>
          <div className="view-daylight">
            <SliderField
              label="Daylight"
              hint="Rotate the planet around its spin axis to change which side faces the star"
              value={dayAngle}
              min={0}
              max={360}
              step={1}
              display={`${Math.round(dayAngle)}°`}
              onChange={onDayAngleChange}
            />
            <button
              type="button"
              className="view-play"
              onClick={() => onDaylightPlayingChange(!daylightPlaying)}
            >
              {daylightPlaying ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
