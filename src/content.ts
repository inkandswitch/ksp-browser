import {
  ExtensionInbox,
  ScriptInbox,
  UIInbox,
  CloseRequest,
  Enable,
  Disable,
  ResourceResponse,
  ToggleRequest,
  OpenRequest,
  OpenResponse,
} from './mailbox'
import * as Protocol from './protocol'
import { Program, Context } from './program'
// No idea why just `from 'lit-html' does not seem to work here.
import { html, render as renderHTML, nothing } from '../node_modules/lit-html/lit-html'
import { stat } from 'fs'
import { md } from './remark'
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

type Message = Enable | Disable | ResourceResponse | ToggleRequest | OpenRequest | OpenResponse
type Address = { tabId: number; frameId: number }

const init = (): [Model, Promise<null | Message>] => {
  return [{ mode: Mode.Enabled, resource: null }, queryKnowledgeServer()]
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
    case 'OpenRequest': {
      return [state, open(message.url)]
    }
    case 'OpenResponse': {
      return [state, null]
    }
    case 'ResourceResponse': {
      return [setMetadata(state, message.response.data.ingest), null]
    }
  }
}

const setMetadata = (state: Model, resource: Protocol.Resource) => {
  return { ...state, isActive: true, resource }
}

const queryKnowledgeServer = async (): Promise<Message | null> => {
  const resource = scanner.read(document)
  const response = await request({ type: 'ResourceRequest', resource })
  console.log(response)
  return response
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

const getContext = ({ resource }: Model): null | Protocol.Resource => {
  if (resource && (resource.backLinks.length > 0 || resource.tags.length > 0)) {
    return resource
  } else {
    return null
  }
}

const render = (state: Model) => {
  const context = getContext(state)
  if (!context) return nothing
  switch (state.mode) {
    case Mode.Disabled:
      return nothing
    case Mode.Enabled:
      return renderInline(context)
    case Mode.Active:
      return renderPanel(context)
  }
}

const renderInline = (resource: Protocol.Resource) => renderUI(resource, 'inline')
const renderPanel = (resource: Protocol.Resource) => renderUI(resource, 'panel')

const renderUI = (resource: Protocol.Resource, mode: string) =>
  html`
    <link rel="stylesheet" href="${chrome.extension.getURL('ui.css')}" />
    <aside class="sans-serif ${mode}">
      ${renderBacklinks(resource.backLinks)}
    </aside>
  `

const renderBacklinks = (backLinks: Protocol.Link[]) =>
  backLinks.length === 0
    ? nothing
    : html`<h2 class="marked"><span>Backlinks</span></h2>
        <ul>
          ${backLinks.map(renderBacklink)}
        </ul>`

const renderBacklink = (link: Protocol.Link) =>
  html`<li class="backlink">
    <a target="_blank" title="${link.title}" href="${link.referrer.url}">
      ${link.referrer.info.title || link.referrer.url.split('/').pop()}
    </a>
    ${link.referrer.tags.map(({ name }) => html`<a href="#${name}" class="tag">${name}</a>`)}
    ${renderReference(link)}
    <p>
      ${md(link.fragment || link.referrer.info.description)}
    </p>
  </li>`

const renderReference = (link: Protocol.Link) =>
  link.identifier == null || link.identifier === '' ? nothing : renderReferenceLinkTarget(link)

const renderReferenceLinkTarget = (link: Protocol.Link) =>
  html`→
    <a target="_blank" href="${chrome.extension.getURL('ui.html')}#${link.identifier}">
      ${link.identifier}
    </a>`

const renderStatus = (resource: Protocol.Resource) => html`<dialog class="notification">
  <input id="hotswap" type="checkbox" checked />
  <form>
    <label class="version" for="hotswap">${resource.backLinks.length}</label>
    <label class="status">&nbsp;</label>
  </form>
</dialog>`

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
