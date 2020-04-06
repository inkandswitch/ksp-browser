import {
  ExtensionInbox,
  ScriptInbox,
  UIInbox,
  CloseRequest,
  Activate,
  Deactivate,
  LookupResponse,
} from './mailbox'
import * as Protocol from './protocol'
import { Program, Context } from './program'
import { html, render as renderHTML, nothing } from '../node_modules/lit-html/lit-html'
import { stat } from 'fs'

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

type Inactive = { isActive: false }
type Active = { isActive: true; resource: Protocol.Resource }
type Model = Inactive | Active
type Message = Activate | Deactivate | Request | Response | LookupResponse
type Address = { tabId: number; frameId: number }

type Request = {
  type: 'Request'
  request: ScriptInbox
  port: chrome.runtime.Port
}

type Response = {
  type: 'Response'
  response: 'TODO'
  port: chrome.runtime.Port
}

const init = (): [Model, Promise<null | Message>] => {
  return [{ isActive: false }, queryKnowledgeServer()]
}

const update = (message: Message, state: Model): [Model, null | Promise<null | Message>] => {
  switch (message.type) {
    case 'Activate': {
      return [activate(state), null]
    }
    case 'LookupResponse': {
      return [setMetadata(state, message.response.data.lookup), null]
    }
    case 'Deactivate': {
      return deactivate(state)
    }
    case 'Response': {
      return [state, respond(message)]
    }
    case 'Request': {
      return handleRequest(message, state)
    }
  }
}

const setMetadata = (state: Model, resource: Protocol.Resource) => {
  return { ...state, isActive: true, resource }
}

const queryKnowledgeServer = (): Promise<Message | null> => {
  let url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  return request({ type: 'LookupRequest', url: url.href })
}

const handleRequest = (message: Request, state: Model): [Model, null | Promise<null | Message>] => {
  switch (message.request.type) {
    case 'CloseRequest': {
      return deactivate(state)
    }
  }
}

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

const deactivate = (state: Model): [Model, null] => [{ isActive: false }, null]

const activate = (state: Model) => {
  if (state.isActive) {
    return state
  } else {
    return state
  }
}

const view = (context: Context<Model>) => {
  const view = document.querySelector('cont-ext')
  if (!view) {
    const view = document.createElement('cont-ext')
    let shadowRoot = view.attachShadow({ mode: 'open' })
    renderHTML(render(context.state), shadowRoot)
    document.documentElement.appendChild(view)
  } else {
    renderHTML(render(context.state), view.shadowRoot!)
  }
}

const getContext = (state: Model): null | Protocol.Resource => {
  if (!state.isActive) {
    return null
  } else {
    const { resource } = state
    if (resource.backLinks.length > 0 || resource.tags.length > 0) {
      return resource
    } else {
      return null
    }
  }
}

const render = (state: Model) => {
  const context = getContext(state)
  return context ? renderActive(context) : nothing
}

const renderActive = (resource: Protocol.Resource) =>
  html`
    <link rel="stylesheet" href="${chrome.extension.getURL('ui.css')}" />
    <aside class="sans-serif">
      ${renderBacklinks(resource.backLinks)}
    </aside>
  `

const renderBacklinks = (backLinks: Protocol.Link[]) =>
  backLinks.length === 0
    ? nothing
    : html`<h2 class="marked"><span>Backlinks</span></h2>
        <ul>
          ${backLinks.map(
            (link) =>
              html`<li class="backlink">
                <a target="_blank" title="${link.title}" href="${link.referrer.url}">
                  ${link.referrer.url.split('/').pop()}
                </a>
                →
                <a target="_blank" href="${chrome.extension.getURL('ui.html')}#${link.name}">
                  ${link.name}
                </a>
              </li>`
          )}
        </ul>`

// const view = (context: Context<Model>) => {
//   if (context.state.isActive) {
//     viewActive(document)
//   } else {
//     viewInactive(document)
//   }
// }

const viewActive = (document: Document) => {
  const view = document.querySelector('iframe#xcrpt')
  if (!view) {
    const view = document.createElement('iframe')
    view.id = 'xcrpt'
    view.src = chrome.extension.getURL('ui.html')
    view.setAttribute(
      'style',
      'dispaly:block!important;border:none!important;height:100vh!important;width:100%!important;clip:auto!important;'
    )
    document.documentElement.appendChild(view)
    view.focus()
  }
}

const viewInactive = (document: Document) => {
  const view = <HTMLIFrameElement>document.querySelector('iframe#xcrpt')
  if (view) {
    view.remove()
  }
}

const onload = async () => {
  const program = Program.ui(
    {
      init,
      update,
      onEvent: () => null,
      render: view,
    },
    undefined,
    document.body
  )

  const onunload = () => {
    window.removeEventListener('message', onWindowMessage)
    chrome.runtime.onMessage.removeListener(onExtensionMessage)
    chrome.runtime.onConnect.removeListener(onConnect)
    program.send({ type: 'Deactivate' })
  }

  const onWindowMessage = (event: MessageEvent) => {
    const frame = <null | HTMLIFrameElement>document.querySelector('#xcrpt')
    if (frame && frame.src.startsWith(event.origin) && event.data.type === 'unload') {
      onunload()
    }
  }
  const onExtensionMessage = (message: Activate) => program.send(message)
  const onConnect = (port: chrome.runtime.Port) => {
    port.onMessage.addListener((request: ScriptInbox, port: chrome.runtime.Port) => {
      const message: Request = {
        type: 'Request',
        request,
        port,
      }

      console.log('Content Inbox', request)

      program.send(message)
    })
  }
  window.addEventListener('message', onWindowMessage)
  chrome.runtime.onMessage.addListener(onExtensionMessage)
  chrome.runtime.onConnect.addListener(onConnect)
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

const respond = async ({ port, response }: Response) => {
  port.postMessage(response)
  return null
}

// class HTMLContextElement extends HTMLElement {
//   view: any
//   shadowRoot!: ShadowRoot
//   static get observedAttributes(): string[] {
//     return []
//   }
//   constructor() {
//     super()
//     this.view = nothing
//   }
//   connectedCallback() {
//     this.attachShadow({ mode: 'open' })
//     this.update()
//   }
//   update() {
//     this.view = this.render()
//     this.transact()
//   }
//   render() {
//     return nothing
//   }
//   disconnectedCallback() {}
//   attributeChangedCallback(name: string, before: string, after: string) {}
//   transact() {
//     render(this.view, this.shadowRoot, { eventContext: this })
//   }
// }

onload()
