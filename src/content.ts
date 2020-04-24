import { AgentInbox, AgentMessage, UIInbox, SimilarResponse, SimilarRequest } from './mailbox'
import * as Protocol from './protocol'
import { Program, Context } from './program'
// No idea why just `from 'lit-html' does not seem to work here.
import { html, renderView, nothing, View } from './view/html'
import { md } from './remark'
import { map } from './iterable'
import { send, request } from './runtime'
import * as scanner from './scanner'
import * as Siblinks from './siblinks'
import * as Backlinks from './backlinks'
import * as Similar from './similar'
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
  siblinks: Siblinks.Model
  resource: null | Protocol.Resource
  similar: Similar.Model
}

type Message = AgentInbox | AgentMessage
type Address = { tabId: number; frameId: number }

const init = (): [Model, Promise<null | Message>] => {
  return [
    { mode: Mode.Enabled, resource: null, siblinks: Siblinks.init(), similar: Similar.init() },
    lookup(),
  ]
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
      return [setIngested(state, message.ingest), null]
    }
    case 'LinkHover': {
      return [setHoveredLink(state, message.url), null]
    }
    case 'SimilarRequest': {
      return updateSimilar(state, message)
    }
    case 'SimilarResponse': {
      return updateSimilar(state, message)
    }
  }
}

const setHoveredLink = (state: Model, url: null | string) => {
  return { ...state, siblinks: Siblinks.hover(state.siblinks, url) }
}

const setIngested = (state: Model, ingested: Protocol.Ingest) => {
  return { ...state, siblinks: Siblinks.ingested(state.siblinks, ingested) }
}

const setMetadata = (state: Model, resource: Protocol.Resource) => {
  return { ...state, resource }
}

const inspectLocalLinks = (state: Model, resource: Protocol.Resource) => {
  return { ...state, mode: Mode.Active, resource }
}

const updateSimilar = (
  state: Model,
  message: SimilarResponse | SimilarRequest
): [Model, null | Promise<null | Message>] => {
  const [similar, fx] = Similar.update(message, state.similar)
  return [{ ...state, similar }, fx]
}

const ingest = async (): Promise<Message | null> => {
  await loaded(document)
  const resource = scanner.read(document)
  const response = await request({ type: 'IngestRequest', resource })
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
    icon: input.icon,
    image: input.image,
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

const render = (context: Context<Model>) => {
  let node = document.querySelector('cont-ext')
  if (!node) {
    const node = <HTMLElement & { program: Context<Model> }>document.createElement('cont-ext')
    let shadowRoot = node.attachShadow({ mode: 'open' })
    renderView(view(context.state), shadowRoot)
    const target = document.documentElement.appendChild(node)
    shadowRoot.addEventListener('click', context, { passive: true })
    document.addEventListener('mouseover', context, { passive: true })
    document.addEventListener('mouseout', context, { passive: true })
    document.addEventListener('selectionchange', context, { passive: true })

    target.program = context
    console.log('!!!!!!!!!!!!!!!!', node.program, target.program, node === target)
  } else {
    renderView(view(context.state), node.shadowRoot!)
  }
}

const view = (state: Model) =>
  html`
    <link rel="stylesheet" href="${chrome.extension.getURL('ui.css')}" />
    ${Thumb.view(state)} ${Backlinks.view(state)} ${Siblinks.view(state.siblinks)}
    ${Similar.view(state.similar)}
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
    case 'selectionchange': {
      return onSelectionChange(event)
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

const onSelectionChange = (event: Event): Message | null => {
  const { timeStamp } = event
  const selection = document.getSelection()
  const input = selection ? selection.toString().trim() : ''
  return { type: 'SimilarRequest', input, id: timeStamp }
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
      render,
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

onload()
