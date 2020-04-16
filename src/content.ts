import {
  ExtensionInbox,
  AgentInbox,
  AgentMessage,
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
import * as Siblinks from './siblinks'
import * as Backlinks from './backlinks'
import * as Thumb from './thumb'
import { Mode } from './mode'

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

type Model = {
  mode: Mode
  hoveredURL: null | string
  sibLinks: null | Map<string, { links: Protocol.Link[]; tags: Protocol.Tag[] }>
  resource: null | Protocol.Resource
}

type Message = AgentInbox | AgentMessage
type Address = { tabId: number; frameId: number }

const init = (): [Model, Promise<null | Message>] => {
  return [{ mode: Mode.Enabled, resource: null, sibLinks: null, hoveredURL: null }, lookup()]
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
      return [setSiblinks(state, message.ingest.sibLinks), null]
    }
    case 'LinkHover': {
      return [setHoveredLink(state, message.url), null]
    }
  }
}

const setHoveredLink = (state: Model, url: null | string) => {
  return { ...state, hoveredURL: url }
}

const setSiblinks = (state: Model, sibLinks: Protocol.SibLink[]) => {
  let url = document.URL
  let map = new Map()
  for (const { target } of sibLinks) {
    const links = target.backLinks.filter((link) => link.referrer.url !== url)
    const tags = target.tags
    if (links.length > 0 || tags.length > 0) {
      map.set(target.url, { links, tags })
    }
  }

  return { ...state, sibLinks: map }
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
    const view = <HTMLElement & { program: Context<Model> }>document.createElement('cont-ext')
    let shadowRoot = view.attachShadow({ mode: 'open' })
    renderHTML(render(context.state), shadowRoot)
    document.documentElement.appendChild(view)
    shadowRoot.addEventListener('click', context, { passive: true })
    document.addEventListener('mouseover', context, { passive: true })
    document.addEventListener('mouseout', context, { passive: true })

    view.program = context
  } else {
    renderHTML(render(context.state), view.shadowRoot!)
  }
}

const render = (state: Model) =>
  html`
    <link rel="stylesheet" href="${chrome.extension.getURL('ui.css')}" />
    ${Thumb.view(state)} ${Backlinks.view(state)} ${Siblinks.view(state)}
  `

const onEvent = (event: Event): Message | null => {
  switch (event.type) {
    case 'click': {
      return onClick(<MouseEvent>event)
    }
    case 'mouseover': {
      return onMouseOver(<MouseEvent>event)
    }
    case 'mouseout': {
      return onMouseOut(<MouseEvent>event)
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

const onMouseOver = (event: MouseEvent): Message | null => {
  const target = <HTMLElement>event.target
  if (target.localName === 'a') {
    const anchor = <HTMLAnchorElement>target
    return { type: 'LinkHover', url: anchor.href }
  }
  return null
}

const onMouseOut = (event: MouseEvent): Message | null => {
  const target = <HTMLElement>event.target
  if (target.localName === 'a') {
    const anchor = <HTMLAnchorElement>target
    return { type: 'LinkHover', url: null }
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

  const onExtensionMessage = (message: AgentInbox) => program.send(message)
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
