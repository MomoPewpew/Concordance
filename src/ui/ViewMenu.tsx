import { useId } from 'react'
import { ORBIT_AXIS_COLOR, SPIN_AXIS_COLOR } from '../globe/axes'
import { SliderField } from './SliderField'

type ViewMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  showSpinAxis: boolean
  onShowSpinAxisChange: (show: boolean) => void
  evenLight: boolean
  onEvenLightChange: (even: boolean) => void
  dayAngle: number
  onDayAngleChange: (angle: number) => void
}

export function ViewMenu({
  open,
  onOpenChange,
  showSpinAxis,
  onShowSpinAxisChange,
  evenLight,
  onEvenLightChange,
  dayAngle,
  onDayAngleChange,
}: ViewMenuProps) {
  const spinId = useId()
  const fillId = useId()

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
        </div>
      )}
    </div>
  )
}
