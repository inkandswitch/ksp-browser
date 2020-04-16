import { html, nothing, Template, TemplateResult } from '../node_modules/lit-html/lit-html'
import { Link, Tag, Ingest } from './protocol'
import { viewLinks } from './links'

type Siblink = { links: Link[]; tags: Tag[] }
type Siblinks = Map<string, Siblink>

export type Model = {
  hoveredURL: null | string
  activeSiblink: null | Siblink
  sibLinks: null | Siblinks
}

export const init = (): Model => {
  return { hoveredURL: null, activeSiblink: null, sibLinks: null }
}

export const ingested = (state: Model, { sibLinks }: Ingest): Model => {
  let url = document.URL
  let map = new Map()
  for (const { target } of sibLinks) {
    const links = target.backLinks.filter((link) => link.referrer.url !== url)
    const tags = target.tags
    if (links.length > 0 || tags.length > 0) {
      map.set(target.url, { links, tags })
    }
  }

  return {
    ...state,
    sibLinks: map,
    activeSiblink: state.hoveredURL ? activeSiblink(map, state.hoveredURL) : null,
  }
}

export const hover = (state: Model, url: string | null): Model => {
  if (state.hoveredURL === url) {
    return state
  } else if (url != null) {
    return { ...state, hoveredURL: url, activeSiblink: activeSiblink(state.sibLinks, url) }
  } else {
    return { ...state, hoveredURL: null }
  }
}

export const activeSiblink = (sibLinks: null | Siblinks, url: string): Siblink | null =>
  (sibLinks && sibLinks.get(url)) || null

export const view = (state: Model): TemplateResult => {
  const target = state.activeSiblink
  const links = target ? target.links : []
  const mode = target && state.hoveredURL ? 'active' : 'disabled'
  return html`<aside class="panel sans-serif ${mode}">
    ${viewLinks(links, 'Siblinks')}
  </aside>`
}
