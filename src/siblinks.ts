import { html, nothing, Template, TemplateResult } from '../node_modules/lit-html/lit-html'
import { Link, Tag } from './protocol'
import { viewLinks } from './links'

type Siblink = { links: Link[]; tags: Tag[] }
type Siblinks = Map<string, Siblink>

type Model = {
  hoveredURL: null | string
  sibLinks: null | Siblinks
}

export const activeSiblink = ({ sibLinks, hoveredURL }: Model): Siblink | null =>
  (sibLinks && hoveredURL && sibLinks.get(hoveredURL)) || null

export const view = (state: Model): TemplateResult => {
  const target = activeSiblink(state)
  const links = target ? target.links : []
  const mode = target == null ? 'disabled' : 'active'
  return html`<aside class="panel sans-serif ${mode}">
    ${viewLinks(links, 'Siblinks')}
  </aside>`
}
