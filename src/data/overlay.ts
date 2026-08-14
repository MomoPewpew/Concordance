export const OVERLAY_MODES = [
  'none',
  'temperature',
  'humidity',
  'continentalness',
  'erosion',
] as const

export type OverlayMode = (typeof OVERLAY_MODES)[number]

export function overlayIndex(mode: OverlayMode): number {
  return OVERLAY_MODES.indexOf(mode)
}
