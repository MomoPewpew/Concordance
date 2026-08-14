import { mulberry32 } from './noise'

const ONSETS = [
  'Th',
  'K',
  'V',
  'M',
  'N',
  'R',
  'L',
  'S',
  'D',
  'Br',
  'Kr',
  'Qu',
  'H',
  'Y',
  'Ae',
  'Or',
  'Il',
  'Ar',
]

const VOWELS = ['a', 'e', 'i', 'o', 'u', 'ae', 'ia', 'au']

const CODAS = ['', 'n', 'r', 'l', 'th', 's', 'm', 'nd', 'st']

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length]
}

function syllable(rng: () => number, first: boolean): string {
  const onset = pick(rng, ONSETS)
  const vowel = pick(rng, VOWELS)
  const coda = pick(rng, CODAS)
  const raw = `${onset}${vowel}${coda}`
  if (!first) return raw.toLowerCase()
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
}

export function placeName(seed: number, salt: number): string {
  const rng = mulberry32((seed ^ salt) >>> 0)
  const parts = rng() > 0.55 ? 2 : 3
  let name = ''
  for (let i = 0; i < parts; i++) name += syllable(rng, i === 0)
  return name
}

export function featureTitle(
  kind: 'peak' | 'basin' | 'island' | 'lake',
  seed: number,
  salt: number,
): string {
  const rng = mulberry32((seed ^ salt ^ 0x51ed) >>> 0)
  const name = placeName(seed, salt)
  if (kind === 'peak') {
    return rng() > 0.45 ? `Mount ${name}` : `${name} Peaks`
  }
  if (kind === 'basin') {
    return rng() > 0.5 ? `${name} Basin` : `The ${name} Lowlands`
  }
  if (kind === 'lake') {
    return rng() > 0.4 ? `Lake ${name}` : `The ${name} Sea`
  }
  return rng() > 0.5 ? `Isle of ${name}` : `${name} Island`
}
