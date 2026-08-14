import { useEffect, useRef, useState } from 'react'
import {
  createWorld,
  defaultRandomiserSettings,
  randomSeed,
  type RandomiserSettings,
} from './data/randomiser'
import { sampleWorld } from './data/sampleWorld'
import { Globe } from './globe/Globe'
import { RandomiserMenu } from './ui/RandomiserMenu'
import { ViewMenu } from './ui/ViewMenu'

export default function App() {
  const menusRef = useRef<HTMLDivElement>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [randomiserOpen, setRandomiserOpen] = useState(false)
  const [showSpinAxis, setShowSpinAxis] = useState(false)
  const [dayAngle, setDayAngle] = useState(0)
  const [settings, setSettings] = useState<RandomiserSettings>(
    defaultRandomiserSettings,
  )
  const [world, setWorld] = useState(sampleWorld)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!viewOpen && !randomiserOpen) return

    const onPointerDown = (event: PointerEvent) => {
      if (!menusRef.current?.contains(event.target as Node)) {
        setViewOpen(false)
        setRandomiserOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setViewOpen(false)
        setRandomiserOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [viewOpen, randomiserOpen])

  useEffect(() => {
    setGenerating(false)
  }, [world])

  const generate = () => {
    setGenerating(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setWorld(createWorld(settings, randomSeed()))
      })
    })
  }

  return (
    <div className="app">
      <div className="app-menus" ref={menusRef}>
        <ViewMenu
          open={viewOpen}
          onOpenChange={setViewOpen}
          showSpinAxis={showSpinAxis}
          onShowSpinAxisChange={setShowSpinAxis}
          dayAngle={dayAngle}
          onDayAngleChange={setDayAngle}
        />
        <RandomiserMenu
          open={randomiserOpen}
          onOpenChange={setRandomiserOpen}
          settings={settings}
          onSettingsChange={setSettings}
          seed={world.globe.seed}
          generating={generating}
          onGenerate={generate}
        />
      </div>
      <Globe world={world} showSpinAxis={showSpinAxis} dayAngle={dayAngle} />
    </div>
  )
}
