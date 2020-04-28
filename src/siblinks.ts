import { html, nothing, View } from './view/html'
import { Link, Tag, Ingest } from './protocol'
import { viewLinks } from './links'
import { HoveredLink } from './mailbox'

type Siblink = { links: Link[]; tags: Tag[] }
type Siblinks = Map<string, Siblink>

const isEqualLink = (left: HoveredLink, right: HoveredLink): boolean => {
  return left.url === right.url
}

export type Model = {
  hoveredLink: null | HoveredLink
  activeSiblink: null | Siblink
  sibLinks: null | Siblinks
}

type ReadyModel = {
  hoveredLink: HoveredLink
  activeSiblink: Siblink
}

export const init = (): Model => {
  return { hoveredLink: null, activeSiblink: null, sibLinks: null }
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
    activeSiblink: state.hoveredLink ? activeSiblink(map, state.hoveredLink) : null,
  }
}

export const hover = (state: Model, link: HoveredLink | null): Model => {
  if (state.hoveredLink && link && isEqualLink(state.hoveredLink, link)) {
    return state
  } else if (link != null) {
    return { ...state, hoveredLink: link, activeSiblink: activeSiblink(state.sibLinks, link) }
  } else {
    return { ...state, hoveredLink: null }
  }
}

export const activeSiblink = (sibLinks: null | Siblinks, link: HoveredLink): Siblink | null =>
  (sibLinks && sibLinks.get(link.url)) || null

export const viewSidebar = (state: Model): View => {
  const target = state.activeSiblink
  const links = target ? target.links : []
  const mode = target && state.hoveredLink ? 'active' : 'disabled'
  return html`<aside class="panel sans-serif ${mode}">
    ${viewLinks(links, 'Siblinks')}
  </aside>`
}

export const viewTooltip = (state: Model): View => {
  const { activeSiblink, hoveredLink } = state
  if (activeSiblink && hoveredLink) {
    return viewActiveTooltip({ activeSiblink, hoveredLink })
  } else {
    return viewInactiveTooltip(state)
  }
}

const viewInactiveTooltip = (state: Model): View => nothing

const viewActiveTooltip = ({ hoveredLink: { rect }, activeSiblink: { links } }: ReadyModel) =>
  html`<dialog
    class="tooltip sans-serif siblinks"
    open
    style="top: ${rect.top + rect.height}px; left:${rect.left + rect.width / 2}px;"
  >
    ${viewLinks(links, 'Siblinks')}
  </dialog>`

export const view = viewTooltip
