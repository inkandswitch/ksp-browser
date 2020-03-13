import freezeDry from 'freeze-dry'
import { clip, ScrapeData } from './scraper'
import {
  ExtensionInbox,
  ScriptInbox,
  ArchiveResponse,
  ExcerptResponse,
  UIInbox,
  ArchiveRequest,
  ExcerptRequest,
  Activate,
  Deactivate,
  CloseRequest,
} from './mailbox'
import { Program, Context } from './program'
import { publicDecrypt } from 'crypto'

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
type Active = { isActive: true; source: Document }
type Model = Inactive | Active
type Message = Activate | Deactivate | Request | Response
type Address = { tabId: number; frameId: number }

type Request = {
  type: 'Request'
  request: ScriptInbox
  port: chrome.runtime.Port
}

type Response = {
  type: 'Response'
  response: ArchiveResponse | ExcerptResponse
  port: chrome.runtime.Port
}

const init = (): [Model, null] => {
  return [{ isActive: false }, null]
}

const update = (message: Message, state: Model): [Model, null | Promise<null | Message>] => {
  switch (message.type) {
    case 'Activate': {
      return [activate(state), null]
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

const handleRequest = (message: Request, state: Model): [Model, null | Promise<null | Message>] => {
  switch (message.request.type) {
    case 'CloseRequest': {
      return deactivate(state)
    }
    case 'ArchiveRequest': {
      let active = activate(state)
      return [active, archive(active.source, message)]
    }
    case 'ExcerptRequest': {
      let active = activate(state)
      return [active, excerpt(document, message)]
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
    const source = <Document>document.cloneNode(true)
    return { ...state, isActive: true, source }
  }
}

const render = (context: Context<Model>) => {
  if (context.state.isActive) {
    renderActive(document)
  } else {
    renderInactive(document)
  }
}

const renderActive = (document: Document) => {
  const view = document.querySelector('iframe#xcrpt')
  if (!view) {
    const view = document.createElement('iframe')
    view.id = 'xcrpt'
    view.src = chrome.extension.getURL('ui.html')
    view.setAttribute(
      'style',
      'dispaly:block!important;border:none!important;position:fixed!important;height:100%!important;width:100%!important;top:0!important;right:0!important;bottom:0!important;left:0!important;margin:0!important;clip:auto!important;opacity:1!important;z-index:9223472036854775807'
    )
    document.body.appendChild(view)
    view.focus()
  }
}

const renderInactive = (document: Document) => {
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
      render,
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

  program.send({ type: 'Activate' })
}

const archive = async (source: Document, request: Request): Promise<Response> => {
  const content = await freezeDry(source, {
    addMetadata: true,
    fetchResource: async (
      input: RequestInfo,
      init?: RequestInit | undefined
    ): Promise<{ blob: Blob; url: string }> => {
      try {
        const response = await fetch(input, init)
        const blob = await response.blob()
        const url =
          response.url !== '' ? response.url : typeof input === 'string' ? input : input.url
        return { url, blob }
      } catch (error) {
        console.error(error)
        throw error
      }
    },
  })
  const blob = new Blob([content], { type: 'text/html' })
  const archiveURL = URL.createObjectURL(blob)
  // const archiveURL = `data:text/html;base64,${btoa(content)}`
  const capturedAt = new Date().toISOString()
  return {
    type: 'Response',
    port: request.port,
    response: { type: 'ArchiveResponse', archive: { archiveURL, capturedAt } },
  }
}

const excerpt = async (document: Document, request: Request): Promise<Response> => {
  const excerpt = await clip(document)
  return {
    type: 'Response',
    port: request.port,
    response: { type: 'ExcerptResponse', excerpt },
  }
}

const send = async (message: ExtensionInbox) => {
  chrome.runtime.sendMessage(message)
  return null
}

const respond = async ({ port, response }: Response) => {
  port.postMessage(response)
  return null
}

const scrape = () => {
  if (document.querySelector('embed[type="application/pdf"]')) {
    const msg = {
      src: window.location.href,
      dataUrl: `data:text/plain,${window.location.href}`,
      capturedAt: new Date().toISOString(),
    }
    chrome.runtime.sendMessage(msg)
  } else {
    freezeDry(document, { addMetadata: true }).then((html: string) => {
      const msg = {
        src: window.location.href,
        dataUrl: `data:text/html,${encodeURIComponent(html)}`,
        capturedAt: new Date().toISOString(),
      }
      chrome.runtime.sendMessage(msg)
    })
  }
}

onload()
