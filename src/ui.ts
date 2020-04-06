import { Program, Context } from './program'
import { BlobReader } from './blob-reader'
import { UIInbox, ExtensionInbox, ScriptInbox, CloseRequest } from './mailbox'

type Model = {
  port: chrome.runtime.Port
}

type Message = { type: 'Init' } | CloseRequest

const render = (context: Context<Model>) => {}

const onEvent = (event: Event) => {
  return null
}

const init = (port: chrome.runtime.Port): [Model, null | Promise<Message | null>] => {
  return [
    {
      port,
    },
    null,
  ]
}

const update = (message: Message, state: Model): [Model, null | Promise<Message | null>] => {
  switch (message.type) {
    case 'Init': {
      return [state, null]
    }
    case 'CloseRequest': {
      return [state, close(state)]
    }
    default: {
      throw RangeError(`Unsupported message received ${JSON.stringify(message)}`)
    }
  }
}

const close = async (state: Model): Promise<null> => {
  try {
    await send(state.port, { type: 'CloseRequest' })
  } catch (error) {
    // Add-on was unloaded and there is no other way to communicate with
    // contents script.
    window.parent.postMessage({ type: 'unload' }, '*')
  }
  return null
}

const extension = (url: string): string => new URL(url).pathname.split('/').pop()!.split('.').pop()!

const send = async (port: chrome.runtime.Port, message: ScriptInbox) => {
  port.postMessage(message)
  return null
}

const getTab = (): Promise<null | chrome.tabs.Tab> =>
  new Promise((resolve) => chrome.tabs.getCurrent(resolve))

const connect = async (): Promise<chrome.runtime.Port> => {
  const tab = await getTab()
  return chrome.tabs.connect(tab!.id!)
}

const onload = async () => {
  const port = await connect()
  const program = Program.ui(
    {
      init,
      onEvent,
      update,
      render,
    },
    port,
    document.body
  )

  port.onMessage.addListener((message: UIInbox) => program.send(message))
}
onload()
