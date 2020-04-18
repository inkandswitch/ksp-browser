import { html, nothing, Template, TemplateResult } from '../node_modules/lit-html/lit-html'
import { Link, Tag, Resource } from './protocol'
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
  html`<ul class="${classNames.join(' ')}">
    ${map((a) => html`<li class="${classNames.join(' ')}">${view(a)}</li>`, data)}
  </ul>`

const viewLinkGroup = (links: Link[]) =>
  html`<details>
    <summary>${renderReferrer(links[0])}</summary>
    ${viewList(links, viewLink, ['link'])}
  </details>`

const renderReferrer_ = (link: Link) =>
  html`<a target="_blank" title="${link.title}" href="${link.referrer.url}">
      ${link.referrer.info.title.trim()}
    </a>
    ${viewTags(link.referrer.tags)} ${viewReference(link)}
    <p>${md(link.referrer.info.description)}</p>`

const renderReferrer = (link: Link) =>
  html`<div class="card">
    <div class="card-image">
      <img class="image" src="${getImageURL(link.referrer)}" alt="" />
    </div>
    <div class="card-content">
      <a class="title" target="_blank" title="${link.title}" href="${link.referrer.url}">
        ${link.referrer.info.title.trim()}
      </a>
      <div class="description">${md(link.referrer.info.description)}</div>
      <a class="url" target="_blank" title="${link.title}" href="${link.referrer.url}">
        <img class="site-icon" src="${getIconURL(link.referrer)}" alt="" />
        ${link.referrer.url}
      </a>
    </div>
  </div>`

const getIconURL = (resource: Resource): string =>
  resource.info.icon || chrome.extension.getURL('link-solid.svg')

const getImageURL = (resource: Resource) => {
  const { image } = resource.info
  if (image) {
    return image
  } else {
    const url = new URL(resource.url)
    switch (url.protocol) {
      case 'file:': {
        const extension = url.pathname.slice(url.pathname.lastIndexOf('.')).toLowerCase()
        switch (extension) {
          case '.markdown':
          case '.md': {
            return chrome.extension.getURL('md-icon.svg')
          }
          default: {
            return chrome.extension.getURL('file-alt-solid.svg')
          }
        }
      }
      default: {
        return chrome.extension.getURL('icon-on.svg')
      }
    }
  }
}

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
