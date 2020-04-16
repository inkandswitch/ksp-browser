import { html, nothing, Template, TemplateResult } from '../node_modules/lit-html/lit-html'
import { Link, Tag, Resource } from './protocol'
import { viewLinks } from './links'
import { Mode } from './mode'

type Model = {
  mode: Mode
  resource: Resource | null
}

export const view = ({ resource, mode }: Model) => {
  const links = resource ? resource.backLinks : []
  return html`<aside class="panel sans-serif ${mode}">
    ${viewLinks(links, 'Backlinks')}
  </aside>`
}
