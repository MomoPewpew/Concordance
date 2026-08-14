import { useId } from 'react'
import { ORBIT_AXIS_COLOR, SPIN_AXIS_COLOR } from '../globe/axes'

type ViewMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  showSpinAxis: boolean
  onShowSpinAxisChange: (show: boolean) => void
}

export function ViewMenu({
  open,
  onOpenChange,
  showSpinAxis,
  onShowSpinAxisChange,
}: ViewMenuProps) {
  const toggleId = useId()

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
        <div className="chrome-panel">
          <label className="view-menu-item" htmlFor={toggleId}>
            <input
              id={toggleId}
              type="checkbox"
              checked={showSpinAxis}
              onChange={(event) => onShowSpinAxisChange(event.target.checked)}
            />
            <span className="view-menu-item-text">
              <span className="view-menu-item-title">Spin axis</span>
              <span className="view-menu-item-hint">
                Cyan is planet spin, gold is the orbit around the sun. They
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
                Orbit around sun
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
