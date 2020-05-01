import {
  AgentInbox,
  AgentMessage,
  UIInbox,
  SimilarResponse,
  SimilarRequest,
  Display,
  HoveredLink,
  SelectionChange,
} from './mailbox'
import * as Protocol from './protocol'
import { Program, Context } from './program'
// No idea why just `from 'lit-html' does not seem to work here.
import { html, renderView, nothing, View, ViewDriver, Viewer } from './view/html'
import { md } from './remark'
import { map } from './iterable'
import { send, request } from './runtime'
import * as scanner from './scanner'
import * as Siblinks from './siblinks'
import * as Backlinks from './backlinks'
import * as Simlinks from './simlinks'
import * as Thumb from './thumb'
import * as URL from './url'
import { Mode } from './mode'
import { getSelectionTooltipRect, resolveRect } from './dom/selection'

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
  display: Display

  siblinks: Siblinks.Model
  resource: null | Protocol.Resource
  simlinks: Simlinks.Model
}

type Message = AgentInbox | AgentMessage
type Address = { tabId: number; frameId: number }

const init = (): [Model, Promise<null | Message>] => {
  return [
    {
      mode: Mode.Enabled,
      display: Display.Backlinks,
      resource: null,
      siblinks: Siblinks.init(),
      simlinks: Simlinks.init(),
    },
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
    case 'Hide': {
      return [hide(state), null]
    }
    case 'Show': {
      return [show(state, message.show), null]
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
      return [setHoveredLink(state, message.link), null]
    }
    case 'SelectionChange': {
      return updateSimlinks(state, message)
    }
    case 'SimilarResponse': {
      return updateSimlinks(state, message)
    }
  }
}

const setHoveredLink = (state: Model, link: HoveredLink | null) => {
  return { ...state, siblinks: Siblinks.hover(state.siblinks, link) }
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

const updateSimlinks = (
  state: Model,
  message: SimilarResponse | SelectionChange
): [Model, null | Promise<null | Message>] => {
  const [simlinks, fx] = Simlinks.update(message, state.simlinks)
  return [{ ...state, simlinks }, fx]
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
  const lookupURL = URL.from(location.href, { hash: '' })
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

const show = (state: Model, display: Display): Model => {
  return { ...state, display, mode: Mode.Active }
}

const toggle = (state: Model): Model => {
  switch (state.mode) {
    case Mode.Disabled:
      return { ...state, display: Display.Backlinks }
    case Mode.Enabled:
      return { ...state, mode: Mode.Active, display: Display.Backlinks }
    case Mode.Active:
      return { ...state, mode: Mode.Enabled, display: Display.Backlinks }
  }
}

const hide = (state: Model): Model => {
  return { ...state, mode: Mode.Enabled }
}

const render = (context: Context<Model, Message>) => {
  let ui = document.querySelector('double-dagger-ui')
  if (!ui) {
    const ui = <HTMLElement & { program: Context<Model, Message> }>(
      document.createElement('double-dagger-ui')
    )
    let shadowRoot = ui.attachShadow({ mode: 'open' })
    renderView(view(context.state), shadowRoot, { eventContext: <any>context })
    const target = document.documentElement.appendChild(ui)
    shadowRoot.addEventListener('click', context, { passive: true })
    document.addEventListener('mouseover', context, { passive: true })
    document.addEventListener('mouseout', context, { passive: true })
    document.addEventListener('mouseup', context, { passive: true })
    document.addEventListener('click', context)

    target.program = context
  } else {
    renderView(view(context.state), ui.shadowRoot!)
  }

  let overlay = document.querySelector('double-dagger-overlay')
  if (overlay) {
    renderView(viewOverlay(context.state), overlay.shadowRoot!)
  } else if (document.body) {
    const overlay = <HTMLElement & { program: Context<Model, Message> }>(
      document.createElement('double-dagger-overlay')
    )
    let shadowRoot = overlay.attachShadow({ mode: 'open' })
    renderView(viewOverlay(context.state), shadowRoot, { eventContext: <any>context })
    const target = document.body.appendChild(overlay)
    shadowRoot.addEventListener('click', context)
  }
}

const view = (state: Model) =>
  html`
    <style>
      aside {
        display: none;
      }
    </style>
    <link rel="stylesheet" href="${chrome.extension.getURL('ui.css')}" />
    <div class="${state.display}">
      <!-- Thumb -->
      ${Thumb.view(state) && nothing}
      <!-- Backlinks -->
      ${Backlinks.view(state)}
      <!-- Siblinks -->
      ${Siblinks.view(state.siblinks)}
      <!-- Simlinks -->
      ${Simlinks.view(state.simlinks)}
    </div>
    <main class="viewport">
      <div class="frame top"></div>
      <div class="frame left"></div>
      <div class="frame right"></div>
      <div class="frame bottom"></div>
      <div class="frame center"></div>
    </main>
    ${rootView(state)}
  `

const viewOverlay = (state: Model) =>
  html`
    <link rel="stylesheet" href="${chrome.extension.getURL('ui.css')}" />
    ${Thumb.view(state) && nothing}
    <!-- Siblinks -->
    ${Siblinks.viewOverlay(state.siblinks)}
    <!-- Similnks -->
    ${Simlinks.viewOverlay(state.simlinks)}
  `

const rootView = Viewer((state: Model) => (driver: ViewDriver): void => {
  if (state.mode === Mode.Active) {
    document.documentElement.classList.add('ksp-browser-active')
  } else {
    document.documentElement.classList.remove('ksp-browser-active')
  }
})

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
    case 'mouseup': {
      return onSelectionChange(<MouseEvent>event)
    }
    default: {
      return null
    }
  }
}

const onClick = (event: MouseEvent): Message | null => {
  const target = <HTMLElement>event.target
  if (target.classList.contains('badge') || target.classList.contains('bubble')) {
    event.preventDefault()
    event.stopPropagation()
    if (target.classList.contains('siblinks')) {
      return { type: 'Show', show: Display.Siblinks }
    }
    if (target.classList.contains('simlinks')) {
      return { type: 'Show', show: Display.Simlinks }
    }
    if (target.classList.contains('backlinks')) {
      return { type: 'Show', show: Display.Backlinks }
    }
  }

  if (target.classList.contains('ksp-browser-siblinks')) {
    event.preventDefault()
    return { type: 'Show', show: Display.Siblinks }
  }

  if (target.localName === 'a') {
    const anchor = <HTMLAnchorElement>target
    if (!anchor.href.startsWith('http')) {
      event.preventDefault()
      return { type: 'OpenRequest', url: anchor.href }
    } else {
      return null
    }
  }

  if (document.body.contains(target) || target.classList.contains('frame')) {
    return { type: 'Hide' }
  } else {
    return null
  }

  return null
}

const onSelectionChange = (event: MouseEvent): Message | null => {
  const { timeStamp } = event
  const selection = document.getSelection()
  const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
  const content = range ? range.toString().trim() : ''
  if (content != '') {
    const url = URL.from(document.URL, { hash: '' }).href
    // const { top, left, width, height } = range!.getBoundingClientRect()
    const rect = <DOMRect>getSelectionTooltipRect(selection!)
    const id = timeStamp
    return { type: 'SelectionChange', data: { content, url, rect, id } }
  } else {
    return { type: 'SelectionChange', data: null }
  }
}

const onMouseOver = (event: MouseEvent): Message | null => {
  const target = <HTMLElement>event.target
  if (target.localName === 'a' && target.hasAttribute('data-siblinks')) {
    const anchor = <HTMLAnchorElement>target
    const { top, left, height, width } = resolveRect(anchor, anchor.getBoundingClientRect())

    const rect = { top: top + window.scrollY, left: window.scrollX + left, height, width }
    return { type: 'LinkHover', link: { url: anchor.href, rect } }
  }
  return null
}

const onMouseOut = (event: MouseEvent): Message | null => {
  const target = <HTMLElement>event.target
  if (target.localName === 'a' && target.hasAttribute('data-siblinks')) {
    const anchor = <HTMLAnchorElement>target
    return { type: 'LinkHover', link: null }
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
