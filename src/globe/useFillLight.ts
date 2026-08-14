import { useEffect } from 'react'
import type { ShaderMaterial } from 'three'

export function useFillLight(material: ShaderMaterial, evenLight: boolean) {
  useEffect(() => {
    material.uniforms.uFill.value = evenLight ? 1 : 0
  }, [material, evenLight])
}
