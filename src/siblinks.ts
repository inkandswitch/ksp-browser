import { html, nothing, View, Viewer, ViewDriver, renderView } from './view/html'
import { Link, Tag, Ingest, SibLink } from './protocol'
import { viewLinks } from './links'
import { HoveredLink } from './mailbox'
import { scanLinks } from './scanner'
import * as URL from './url'

type Siblink = { links: Link[]; tags: Tag[] }
type Siblinks = Map<string, Siblink>

const isEqualLink = (left: HoveredLink, right: HoveredLink): boolean => {
  return left.url === right.url
}

enum Status {
  Over = 'over',
  Out = 'out',
}

type TargetLink = {
  status: Status
  link: HoveredLink
}

export type Model = {
  siblinks: null | Siblinks
  target: null | TargetLink
}

export const siblinksOf = ({ target, siblinks }: Model): Siblink | null =>
  (siblinks && target && siblinks.get(target.link.url)) || null

type ReadyState = {
  status: Status
  link: HoveredLink
  siblinks: Siblink
}

const read = (state: Model): ReadyState | null => {
  const siblinks = siblinksOf(state)
  const { target } = state
  if (target && siblinks) {
    const { link, status } = target
    return { link, siblinks, status }
  } else {
    return null
  }
}

export const init = (): Model => {
  return { target: null, siblinks: null }
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
    siblinks: map,
  }
}

export const hover = (state: Model, link: HoveredLink | null): Model => {
  // If same link is hoverd do nothing
  if (link) {
    return { ...state, target: { link, status: Status.Over } }
  } else {
    const { target } = state
    if (target == null) {
      return state
    } else if (target.status !== Status.Out) {
      return { ...state, target: { ...target, status: Status.Out } }
    } else {
      return state
    }
  }
}

export const viewSidebar = (state: Model): View => {
  const siblinks = siblinksOf(state)
  const links = siblinks ? siblinks.links : []
  const { target } = state
  const mode = siblinks && target && target.status === Status.Over ? 'active' : 'disabled'
  return html`<aside class="panel sans-serif siblinks">
    ${viewLinks(links, 'Siblinks')}
  </aside>`
}

export const viewTooltip = (state: Model): View => {
  const { target } = state
  const link = target && target.link
  const siblinks = siblinksOf(state)
  if (siblinks && link) {
    return viewActiveTooltip(link, siblinks)
  } else {
    return viewInactiveTooltip()
  }
}

const viewInactiveTooltip = (): View => nothing

const viewActiveTooltip = ({ rect }: HoveredLink, { links }: Siblink): View =>
  html`<dialog
    class="tooltip sans-serif siblinks"
    open
    style="top: ${rect.top + rect.height}px; left:${rect.left + rect.width / 2}px;"
  >
    ${viewLinks(links, 'Siblinks')}
  </dialog>`

const viewBadge = (state: Model): View => {
  const data = read(state)
  return data ? showBadge(data) : hideBadge()
}

const hideBadge = (): View => nothing
const showBadge = ({ link: { rect }, status, siblinks }: ReadyState): View =>
  html`<button
    class="badge sans-serif siblinks ${status}"
    style="top: ${rect.top + rect.height / 2}px; left:${rect.left + rect.width}px;"
  >
    <span class="double-dagger">‡</span>${siblinks.links.length}
  </button>`

const viewLinkAnnotations = Viewer((state: Model) => (driver: ViewDriver) => {
  const { siblinks } = state
  if (siblinks && !driver.value) {
    driver.setValue(html`<!-- DONE -->`)
    for (const link of scanLinks(document)) {
      const url = URL.from(link.href, { hash: '' }).href
      const siblink = siblinks.get(url)
      if (siblink) {
        const fragment = document.createDocumentFragment()
        renderView(viewLinkAnnotation(siblink, url), fragment)
        link.parentElement!.insertBefore(fragment, link.nextSibling)
        // link.append(fragment)
      }
    }
  }
})

const viewLinkAnnotation = (siblink: Siblink, url: string): View =>
  html`<sup class="ksp-browser-annotation">
    <a class="ksp-browser-siblinks" href="${url}">[‡${siblink.links.length}]</a>
  </sup>`

export const view = (state: Model): View => html`${viewSidebar(state)}${viewLinkAnnotations(state)}`
