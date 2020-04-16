import { html, nothing, Template, TemplateResult } from '../node_modules/lit-html/lit-html'
import { Resource } from './protocol'
import { viewLinks } from './links'

type Model = {
  resource: Resource | null
}

export const view = ({ resource }: Model) => {
  const mode = !resource ? 'hide' : isEmpty(resource) ? 'disabled' : 'show'
  return html`<button class="thumb ${mode}"></button>`
}

const isEmpty = ({ backLinks, tags }: Resource): boolean => {
  if (backLinks.length + tags.length > 0) {
    return false
  } else {
    return true
  }
}
