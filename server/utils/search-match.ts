import type { MalAnime } from './mal'
import { toCardResult } from './mal'

export type SearchTitleMatch = {
  matchedTitle: string
  sortTitle: string
}

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

const toSearchComparable = (value: string) => {
  return normalizeWhitespace(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

const toLooseSearchComparable = (value: string) => {
  return normalizeWhitespace(toSearchComparable(value).replace(/[^a-z0-9]+/g, ' '))
}

export const isSearchTitleMatch = (title: string, query: string) => {
  const comparableTitle = toSearchComparable(title)
  const comparableQuery = toSearchComparable(query)

  if (!comparableTitle || !comparableQuery) {
    return false
  }

  if (comparableTitle.includes(comparableQuery)) {
    return true
  }

  const looseTitle = toLooseSearchComparable(title)
  const looseQuery = toLooseSearchComparable(query)

  return Boolean(looseTitle && looseQuery && looseTitle.includes(looseQuery))
}

const uniqueTitles = (titles: Array<string | undefined>) => {
  const seen = new Set<string>()

  return titles
    .map((title) => normalizeWhitespace(title || ''))
    .filter((title) => {
      const key = title.toLowerCase()

      if (!key || seen.has(key)) {
        return false
      }

      seen.add(key)

      return true
    })
}

export const getSearchTitleCandidates = (anime: MalAnime) => {
  const card = toCardResult(anime)

  return uniqueTitles([
    card.title,
    card.romajiTitle,
    anime.alternative_titles?.ja,
    ...(anime.alternative_titles?.synonyms || []),
  ])
}

export const getSearchTitleMatch = (anime: MalAnime, query: string): SearchTitleMatch | null => {
  const matchedTitle = getSearchTitleCandidates(anime).find((title) => isSearchTitleMatch(title, query))

  if (!matchedTitle) {
    return null
  }

  return {
    matchedTitle,
    sortTitle: matchedTitle,
  }
}
