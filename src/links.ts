import { html, nothing, View } from './view/html'
import { viewList } from './view/list'
import { Link, Tag, Resource } from './protocol'
import { map } from './iterable'
import { md } from './remark'
import { view as viewResource } from './view/resource'

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

const viewLinkGroup = (links: Link[]) =>
  html`<details>
    <summary>${viewReferrer(links[0])}</summary>
    ${viewList(links, viewLink, ['link'])}
  </details>`

const viewReferrer = (link: Link) => viewResource(link.referrer)

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
