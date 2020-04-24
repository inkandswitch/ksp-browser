import { Resource } from '../protocol'
import { html, View } from './html'
import { md } from '../remark'

export const getIconURL = (resource: Resource): string =>
  resource.info.icon || chrome.extension.getURL('link-solid.svg')

export const getImageURL = (resource: Resource): string => {
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

export const view = (resource: Resource): View =>
  html`<div class="card resource">
    <div class="card-image">
      <img class="image" src="${getImageURL(resource)}" alt="" />
    </div>
    <div class="card-content">
      <a class="title" target="_blank" title="${resource.info.title}" href="${resource.url}">
        ${resource.info.title.trim()}
      </a>
      <div class="description">${md(resource.info.description)}</div>
      <a class="url" target="_blank" title="${resource.info.title}" href="${resource.url}">
        <img class="site-icon" src="${getIconURL(resource)}" alt="" />
        ${resource.url}
      </a>
    </div>
  </div>`
