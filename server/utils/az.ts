import type { MalAnime, MalCardResult } from './mal'
import { toCardResult } from './mal'

export type AzMatchSource = 'english' | 'romaji' | 'native' | 'synonym'

export type AzTitleMatch = {
  matchedTitle: string
  sortTitle: string
  source: AzMatchSource
}

export type AzCardResult = MalCardResult & AzTitleMatch

const alphaSuffixes = ['a', 'e', 'i', 'o', 'u', 'y', 'h', 'r', 'l', 'n', 's', 't', 'k', 'm']

const extraSearchQueries: Record<string, string[]> = {
  number: [
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
    '20',
    '21',
    '22',
    '23',
    '24',
    '25',
    '26',
    '27',
    '28',
    '29',
    '30',
    '50',
    '60',
    '70',
    '80',
    '86',
    '90',
  ],
  symbol: ['raw', 'hack', 'tis', 'dot hack'],
  q: ['qu', 'qua', 'quan', 'que', 'queen', 'quest', 'qui', 'quin', 'quint', 'qo', 'qi'],
  x: ['xa', 'xe', 'xi', 'xia', 'xo', 'xu', 'xy'],
  z: ['za', 'ze', 'zi', 'zo', 'zu'],
}

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

export const toSortableAzTitle = (title: string) => {
  const cleaned = normalizeWhitespace(title)
    .replace(/^[\s"'([{]+/, '')
    .replace(/^[!#$%&*+./:;=?@\\^_`|~-]+/, '')
    .replace(/[\s"')\]}]+$/, '')

  return normalizeWhitespace(cleaned.replace(/^(?:the|an|a)\s+/i, ''))
}

export const getAzGroup = (title: string) => {
  const first = toSortableAzTitle(title).charAt(0).toLowerCase()

  if (/[a-z]/.test(first)) return first
  if (/\d/.test(first)) return 'number'
  if (first) return 'symbol'

  return ''
}

const getVisibleAzGroup = (title: string) => {
  const first = normalizeWhitespace(title).charAt(0).toLowerCase()

  if (/[a-z]/.test(first)) return first
  if (/\d/.test(first)) return 'number'
  if (first) return 'symbol'

  return ''
}

const uniqueTitleCandidates = (candidates: Array<{ title?: string; source: AzMatchSource }>) => {
  const seen = new Set<string>()

  return candidates
    .map((candidate) => ({
      ...candidate,
      title: normalizeWhitespace(candidate.title || ''),
    }))
    .filter((candidate): candidate is { title: string; source: AzMatchSource } => {
      const key = candidate.title.toLowerCase()

      if (!key || seen.has(key)) {
        return false
      }

      seen.add(key)

      return true
    })
}

export const getAzTitleCandidates = (anime: MalAnime) => {
  return uniqueTitleCandidates([
    { title: anime.alternative_titles?.en, source: 'english' },
    { title: anime.title, source: 'romaji' },
    { title: anime.alternative_titles?.ja, source: 'native' },
    ...(anime.alternative_titles?.synonyms || []).map((title) => ({ title, source: 'synonym' as const })),
  ])
}

const getDisplayTitleCandidate = (anime: MalAnime) => {
  return getAzTitleCandidates(anime)[0]
}

export const getAzTitleMatch = (anime: MalAnime, letter: string): AzTitleMatch | null => {
  const normalizedLetter = letter.toLowerCase()
  const candidates = getAzTitleCandidates(anime)
  const displayCandidate = getDisplayTitleCandidate(anime)

  if (normalizedLetter === 'all') {
    return displayCandidate
      ? {
          matchedTitle: displayCandidate.title,
          sortTitle: toSortableAzTitle(displayCandidate.title),
          source: displayCandidate.source,
        }
      : null
  }

  if (normalizedLetter === 'number' || normalizedLetter === 'symbol') {
    if (!displayCandidate || getVisibleAzGroup(displayCandidate.title) !== normalizedLetter) {
      return null
    }

    return {
      matchedTitle: displayCandidate.title,
      sortTitle: normalizeWhitespace(displayCandidate.title),
      source: displayCandidate.source,
    }
  }

  for (const candidate of candidates) {
    const sortTitle = toSortableAzTitle(candidate.title)

    if (getAzGroup(sortTitle) === normalizedLetter) {
      return {
        matchedTitle: candidate.title,
        sortTitle,
        source: candidate.source,
      }
    }
  }

  return null
}

export const isAzMatch = (anime: MalAnime, letter: string) => Boolean(getAzTitleMatch(anime, letter))

export const toAzCardResult = (anime: MalAnime, letter: string): AzCardResult => {
  const card = toCardResult(anime)
  const match = getAzTitleMatch(anime, letter) || {
    matchedTitle: card.title,
    sortTitle: toSortableAzTitle(card.title),
    source: 'english' as const,
  }

  return {
    ...card,
    ...match,
  }
}

const compareTitleValues = (left: string, right: string) => {
  return toSortableAzTitle(left).localeCompare(toSortableAzTitle(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

const compareVisibleTitleValues = (left: string, right: string) => {
  return normalizeWhitespace(left).localeCompare(normalizeWhitespace(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

const getDisplayTitle = (anime: MalAnime) => {
  return anime.alternative_titles?.en || anime.title || anime.alternative_titles?.ja || ''
}

export const compareAzAnime = (letter: string) => (left: MalAnime, right: MalAnime) => {
  const leftMatch = getAzTitleMatch(left, letter)
  const rightMatch = getAzTitleMatch(right, letter)

  if (letter === 'number' || letter === 'symbol') {
    const visibleTitleComparison = compareVisibleTitleValues(
      leftMatch?.sortTitle || getDisplayTitle(left),
      rightMatch?.sortTitle || getDisplayTitle(right),
    )

    if (visibleTitleComparison !== 0) {
      return visibleTitleComparison
    }

    return left.id - right.id
  }

  const sortTitleComparison = compareTitleValues(
    leftMatch?.sortTitle || getDisplayTitle(left),
    rightMatch?.sortTitle || getDisplayTitle(right),
  )

  if (sortTitleComparison !== 0) {
    return sortTitleComparison
  }

  const displayTitleComparison = compareTitleValues(getDisplayTitle(left), getDisplayTitle(right))

  if (displayTitleComparison !== 0) {
    return displayTitleComparison
  }

  return left.id - right.id
}

export const getAzSearchQueries = (letter: string) => {
  const normalizedLetter = letter.toLowerCase()

  if (normalizedLetter === 'number' || normalizedLetter === 'symbol') {
    return extraSearchQueries[normalizedLetter] || []
  }

  if (!/^[a-z]$/.test(normalizedLetter)) {
    return []
  }

  return Array.from(
    new Set([
      ...(extraSearchQueries[normalizedLetter] || []),
      ...alphaSuffixes.map((suffix) => normalizedLetter + suffix),
    ]),
  )
}
