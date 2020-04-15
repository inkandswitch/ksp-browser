import {
  ExtensionInbox,
  ScriptInbox,
  UIInbox,
  CloseRequest,
  Enable,
  Disable,
  LookupResponse,
  ToggleRequest,
  InspectLinksResponse,
  OpenRequest,
  OpenResponse,
} from './mailbox'
import * as Protocol from './protocol'
import { Program, Context } from './program'
// No idea why just `from 'lit-html' does not seem to work here.
import {
  html,
  render as renderHTML,
  nothing,
  Template,
  TemplateResult,
} from '../node_modules/lit-html/lit-html'
import { stat } from 'fs'
import { md } from './remark'
import { map } from './iterable'
import * as scanner from './scanner'

const onUIMessage = (message: MessageEvent) => {
  switch (message.type) {
    case 'close': {
      return close()
    }
  }
}

const close = () => {
  const view = document.querySelector('#xcrpt')
  if (view) {
    view.remove()
  }
}

enum Mode {
  Active,
  Enabled,
  Disabled,
}

type Model = {
  mode: Mode
  resource: null | Protocol.Resource
}

type Message = Enable | Disable | OpenRequest | InspectLinksResponse | ScriptInbox
type Address = { tabId: number; frameId: number }

const init = (): [Model, Promise<null | Message>] => {
  return [{ mode: Mode.Enabled, resource: null }, lookup()]
}

const update = (message: Message, state: Model): [Model, null | Promise<null | Message>] => {
  switch (message.type) {
    case 'Enable': {
      return [enable(state), null]
    }
    case 'Disable': {
      return [disable(state), null]
    }
    case 'Toggle': {
      return [toggle(state), null]
    }
    case 'InspectLinksRequest': {
      return [state, scan()]
    }
    case 'InspectLinksResponse': {
      return [inspectLocalLinks(state, message.resource), null]
    }
    case 'OpenRequest': {
      return [state, open(message.url)]
    }
    case 'OpenResponse': {
      return [state, null]
    }
    case 'LookupResponse': {
      return [setMetadata(state, message.resource), ingest()]
    }
    case 'IngestResponse': {
      return [state, null]
    }
  }
}

const setMetadata = (state: Model, resource: Protocol.Resource) => {
  return { ...state, resource }
}

const inspectLocalLinks = (state: Model, resource: Protocol.Resource) => {
  return { ...state, mode: Mode.Active, resource }
}

const ingest = async (): Promise<Message | null> => {
  await loaded(document)
  const resource = scanner.read(document)
  const response = await request({ type: 'IngestRequest', resource })
  console.log(response)
  return response
}

const loaded = (document: Document) => {
  if (document.readyState !== 'complete') {
    return once(document.defaultView!, 'load')
  }
}

const once = (target: Node | Window, type: string) =>
  new Promise((resolve) => target.addEventListener(type, resolve, { once: true }))

const lookup = async (): Promise<Message | null> => {
  const response = await request({ type: 'LookupRequest', lookup: location.href })
  console.log(response)
  return response
}

const scan = async (): Promise<Message | null> => {
  await loaded(document)
  const resource = scanner.read(document)
  return { type: 'InspectLinksResponse', resource: toOutput(resource) }
}

const toOutput = (input: Protocol.InputResource): Protocol.Resource => {
  const info = {
    cid: null,
    title: input.title,
    description: input.description,
  }

  const resource = {
    url: input.url,
    info,
    links: [],
    backLinks: !input.links
      ? []
      : input.links.map(
          (link): Protocol.Link => ({
            kind: link.kind,
            name: link.name,
            title: link.title,
            fragment: link.referrerFragment,
            location: link.referrerLocation,
            identifier: '',
            target: <Protocol.Resource>{
              url: link.targetURL,
            },
            referrer: {
              url: input.url,
              info,
              links: [],
              backLinks: [],
              tags: [],
            },
          })
        ),
    tags: input.tags
      ? input.tags.map((tag) => ({
          name: tag.name,
          fragment: tag.targetFragment,
          location: tag.targetLocation,
          target: <Protocol.Resource>{ url: input.url },
        }))
      : [],
  }

  return resource
}

const open = async (url: string): Promise<Message | null> => request({ type: 'OpenRequest', url })

class UIRequest {
  type: 'UIRequest'
  message: Request
  respond: (response: UIInbox) => void
  constructor(message: Request, respond: (response: UIInbox) => void) {
    this.respond = respond
    this.message = message
    this.type = 'UIRequest'
  }
}

const disable = (state: Model): Model => ({ ...state, mode: Mode.Disabled })
const enable = (state: Model) => {
  if (state.mode === Mode.Disabled) {
    return { ...state, mode: Mode.Enabled }
  } else {
    return state
  }
}

const toggle = (state: Model): Model => {
  switch (state.mode) {
    case Mode.Disabled:
      return state
    case Mode.Enabled:
      return { ...state, mode: Mode.Active }
    case Mode.Active:
      return { ...state, mode: Mode.Enabled }
  }
}

const view = (context: Context<Model>) => {
  const view = document.querySelector('cont-ext')
  if (!view) {
    const view = document.createElement('cont-ext')
    let shadowRoot = view.attachShadow({ mode: 'open' })
    renderHTML(render(context.state), shadowRoot)
    document.documentElement.appendChild(view)
    shadowRoot.addEventListener('click', context)
  } else {
    renderHTML(render(context.state), view.shadowRoot!)
  }
}

const isEmptyResource = (resource: null | Protocol.Resource): boolean => {
  if (resource && (resource.backLinks.length > 0 || resource.tags.length > 0)) {
    return false
  } else {
    return true
  }
}

const render = (state: Model) => {
  switch (state.mode) {
    case Mode.Disabled:
      return renderDisabled(state.resource)
    case Mode.Enabled:
      return renderDisabled(state.resource)
    case Mode.Active:
      return renderActive(state.resource)
  }
}

const renderDisabled = (resource: null | Protocol.Resource) => renderUI(resource, 'disabled')
const renderInline = (resource: null | Protocol.Resource) => renderUI(resource, 'inline')
const renderActive = (resource: null | Protocol.Resource) => renderUI(resource, 'active')

const renderUI = (resource: null | Protocol.Resource, mode: string) =>
  html`
    <link rel="stylesheet" href="${chrome.extension.getURL('ui.css')}" />
    ${renderThumb(resource)}
    <aside class="panel sans-serif ${mode}" open>
      ${resource ? renderBacklinks(resource.backLinks) : nothing}
    </aside>
  `

const renderBacklinks = (backLinks: Protocol.Link[]) =>
  backLinks.length === 0
    ? nothing
    : html`<h2 class="marked"><span>Backlinks</span></h2>
        ${renderList(groupByReferrer(backLinks), renderLinkGroup, ['backlink'])}`

const groupByReferrer = (links: Protocol.Link[]) => {
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

const renderList = <a>(
  data: Iterable<a>,
  view: (data: a) => TemplateResult,
  classNames: string[]
): TemplateResult =>
  html`<ul>
    <li class="${classNames.join(' ')}">
      ${map(view, data)}
    </li>
  </ul>`

const renderLinkGroup = (links: Protocol.Link[]) =>
  html`<details>
    <summary>${renderReferrer(links[0])}</summary>
    ${renderList(links, renderBacklink, ['backlink'])}
  </details>`

const renderReferrer = (link: Protocol.Link) =>
  html`<a target="_blank" title="${link.title}" href="${link.referrer.url}">
      ${link.referrer.info.title.trim()}
    </a>
    ${renderTags(link.referrer.tags)} ${renderReference(link)}
    <p>${md(link.referrer.info.description)}</p>`

const renderTags = (tags: Protocol.Tag[]) =>
  tags.map(({ name }) => html`<a href="#${name}" class="tag">${name}</a>`)

const renderBacklink = (link: Protocol.Link) =>
  html`<section">
    ${renderTags(link.referrer.tags)}
    ${md(linkedFragment(link))}
  </section>`

const linkedFragment = (link: Protocol.Link): string =>
  link.identifier
    ? `${link.fragment || ''}\n[${link.identifier}]:${link.referrer.url}`
    : link.fragment || ''

const renderContext = (link: Protocol.Link) =>
  html`<div class="context">
    ${md(link.fragment || link.referrer.info.description)}
  </div>`

const renderReference = (link: Protocol.Link) =>
  link.identifier == null || link.identifier === '' ? nothing : renderReferenceLinkTarget(link)

const renderReferenceLinkTarget = (link: Protocol.Link) =>
  html`→
    <a target="_blank" href="${chrome.extension.getURL('ui.html')}#${link.identifier}">
      ${link.identifier}
    </a>`

const renderThumb = (resource: null | Protocol.Resource) =>
  html`<button
    class="thumb ${isEmptyResource(resource) ? 'disabled' : resource ? 'show' : 'hide'}"
  ></button>`

const onEvent = (event: Event): Message | null => {
  switch (event.type) {
    case 'click': {
      return onClick(<MouseEvent>event)
    }
    default: {
      return null
    }
  }
}

const onClick = (event: MouseEvent): Message | null => {
  const target = <HTMLElement>event.target
  if (target.localName === 'a') {
    const anchor = <HTMLAnchorElement>target
    if (!anchor.href.startsWith('http')) {
      event.preventDefault()
      return { type: 'OpenRequest', url: anchor.href }
    } else {
      return null
    }
  }
  return null
}

const onload = async () => {
  const program = Program.ui(
    {
      init,
      update,
      onEvent,
      render: view,
    },
    undefined,
    document.body
  )

  const onunload = () => {
    chrome.runtime.onMessage.removeListener(onExtensionMessage)
    program.send({ type: 'Disable' })
  }

  const onExtensionMessage = (message: ScriptInbox) => program.send(message)
  chrome.runtime.onMessage.addListener(onExtensionMessage)
}

const send = async (message: ExtensionInbox) => {
  chrome.runtime.sendMessage(message)
  return null
}

const request = (message: ExtensionInbox): Promise<Message | null> =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (response) {
        resolve(response)
      } else if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError
        if (!error) {
          resolve(response)
        } else {
          reject(error)
        }
      }
    })
  })

onload()
