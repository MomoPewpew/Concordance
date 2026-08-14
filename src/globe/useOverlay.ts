import { useEffect } from 'react'
import type { ShaderMaterial } from 'three'
import { overlayIndex, type OverlayMode } from '../data/overlay'

export function useOverlay(material: ShaderMaterial, overlay: OverlayMode) {
  useEffect(() => {
    material.uniforms.uOverlay.value = overlayIndex(overlay)
  }, [material, overlay])
}
