export function SeaLevel() {
  return (
    <mesh visible={false} name="sea-level">
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial />
    </mesh>
  )
}
