import { html, nothing, Template, TemplateResult } from '../node_modules/lit-html/lit-html'
import { Link, Tag } from './protocol'
import { map } from './iterable'
import { md } from './remark'

export const viewLinks = (links: Link[], title: string) =>
  links.length === 0
    ? nothing
    : html`<h2 class="marked"><span>${title}</span></h2>
        ${viewList(groupByReferrer(links), viewLinkGroup, ['link'])}`

const groupByReferrer = (links: Link[]) => {
  const map = new Map()
  for (const link of links) {
    const list = map.get(link.referrer.url)
    if (!list) {
      map.set(link.referrer.url, [link])
    } else {
      map.set(link.referrer.url, [link, ...list])
    }
  }
  return map.values()
}

const viewList = <a>(
  data: Iterable<a>,
  view: (data: a) => TemplateResult,
  classNames: string[]
): TemplateResult =>
  html`<ul>
    <li class="${classNames.join(' ')}">
      ${map(view, data)}
    </li>
  </ul>`

const viewLinkGroup = (links: Link[]) =>
  html`<details>
    <summary>${renderReferrer(links[0])}</summary>
    ${viewList(links, viewLink, ['link'])}
  </details>`

const renderReferrer = (link: Link) =>
  html`<a target="_blank" title="${link.title}" href="${link.referrer.url}">
      ${link.referrer.info.title.trim()}
    </a>
    ${viewTags(link.referrer.tags)} ${viewReference(link)}
    <p>${md(link.referrer.info.description)}</p>`

const viewTags = (tags: Tag[]) =>
  tags.map(({ name }) => html`<a href="#${name}" class="tag">${name}</a>`)

const viewLink = (link: Link) =>
  html`<section">
    ${viewTags(link.referrer.tags)}
    ${md(linkedFragment(link))}
  </section>`

const linkedFragment = (link: Link): string =>
  link.identifier
    ? `${link.fragment || ''}\n[${link.identifier}]:${link.referrer.url}`
    : link.fragment || ''

const viewContext = (link: Link) =>
  html`<div class="context">
    ${md(link.fragment || link.referrer.info.description)}
  </div>`

const viewReference = (link: Link) =>
  link.identifier == null || link.identifier === '' ? nothing : viewReferenceLinkTarget(link)

const viewReferenceLinkTarget = (link: Link) =>
  html`→
    <a target="_blank" href="${chrome.extension.getURL('ui.html')}#${link.identifier}">
      ${link.identifier}
    </a>`
