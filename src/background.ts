import { ExtensionInbox, AgentInbox, LookupResponse, IngestResponse, OpenResponse } from './mailbox'
import * as Protocol from './protocol'

const onRequest = async (
  message: ExtensionInbox,
  { tab }: chrome.runtime.MessageSender
): Promise<null | AgentInbox> => {
  switch (message.type) {
    case 'CloseRequest': {
      close()
      return null
    }
    case 'OpenRequest': {
      const result = await open(message.url)
      return { type: 'OpenResponse', open: result }
    }
    case 'LookupRequest': {
      // chrome.browserAction.disable(tab!.id!)
      // chrome.browserAction.setIcon({ path: 'icon-off.png', tabId: tab!.id })
      // chrome.browserAction.setBadgeText({ text: ``, tabId: tab!.id })
      const resource = await lookup(message.lookup)
      const count = resource.backLinks.length
      if (count > 0) {
        // chrome.browserAction.enable(tab!.id)
        // chrome.browserAction.setIcon({ path: 'icon-on.png', tabId: tab!.id })
        // chrome.browserAction.setBadgeText({ text: `${count}`, tabId: tab!.id })
      }

      return { type: 'LookupResponse', resource }
    }
    case 'IngestRequest': {
      const output = await ingest(message.resource)
      return { type: 'IngestResponse', ingest: output }
    }
    case 'TagsRequest': {
      return null
    }
    case 'SimilarRequest': {
      const output = await similar(message.input)
      return { type: 'SimilarResponse', similar: output, id: message.id }
    }
  }
}

enum Command {
  InspectLinks = 'inspect-links',
  TogglePanel = 'toggle-panel',
}

const onCommand = (command: Command): void => {
  switch (command) {
    case Command.InspectLinks:
      return void inspectLinks()
    case Command.TogglePanel:
      return void togglePanel()
  }
}

const inspectLinks = async () => {
  const tab = await getSelectedTab()
  if (tab) {
    sendAgentMessage(tab, { type: 'InspectLinksRequest' })
  }
}

const togglePanel = async () => {
  const tab = await getSelectedTab()
  if (tab) {
    sendAgentMessage(tab, { type: 'Toggle' })
  }
}

const getSelectedTab = (): Promise<chrome.tabs.Tab | null> =>
  new Promise((resolve) => chrome.tabs.getSelected(resolve))

const open = async (url: string): Promise<Protocol.Open> =>
  ksp(
    {
      query: `mutation open {
        open(url:${JSON.stringify(url)}) {
          openOk
          exitOk
          code
        }
      }`,
      operationName: 'open',
      variables: {},
    },
    (data): Protocol.Open => data.open
  )

const ingest = async (resource: Protocol.InputResource): Promise<Protocol.Ingest> =>
  ksp(
    {
      operationName: 'Ingest',
      variables: { resource },
      query: `mutation Ingest($resource:InputResource!) {
        ingest(resource:$resource) {
            sibLinks: links {
              ...sibLink
            }
          }
        }

        fragment sibLink on Link {
          target {
            url
            backLinks {
              ...backLink
            }
            tags {
              ...tag
            }
          }
        }

        fragment tag on Tag {
          name
        }

        fragment backLink on Link {
          kind
          identifier
          name
          title
          fragment
          location
          referrer {
            url
            info {
              title
              description
              cid
              icon
              image
            }
            tags {
              ...tag
            }
          }
        }`,
    },
    (data) => data.ingest
  )

const lookup = async (url: string): Promise<Protocol.Resource> =>
  ksp(
    {
      operationName: 'Lookup',
      variables: {},
      query: `query Lookup {
        resource(url: "${url}") {
          url
          backLinks {
            ...backLink
          }
          tags {
            ...tag
          }
        }
      }

      fragment tag on Tag {
        name
      }

      fragment backLink on Link {
        kind
        identifier
        name
        title
        fragment
        location
        referrer {
          url
          info {
            title
            description
            cid
            icon
            image
          }
          tags {
            ...tag
          }
        }
      }`,
    },
    (data) => data.resource
  )

const similar = async (input: string): Promise<Protocol.SimilarResources> =>
  ksp(
    {
      operationName: 'Similar',
      variables: { input },
      query: `query Similar($input:String!) {
        similar(input:$input) {
          keywords
          similar {
            score,
            resource {
              url
              info {
                icon
                title
                description
              }
            }
          }
        }
      }`,
    },
    (data) => data.similar
  )

const ksp = async <a, b>(input: a, decode: (output: any) => b): Promise<b> => {
  const request = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: {
      contentType: 'application/json',
    },
    body: JSON.stringify(input),
  })
  const json = await request.json()
  return decode(json.data)
}

const close = () => {}
const executeScript = (details: chrome.tabs.InjectDetails): Promise<any> =>
  new Promise((resolve, reject) => {
    chrome.tabs.executeScript(details, (results) => {
      const error = chrome.runtime.lastError
      if (error !== undefined) {
        reject(error)
      } else {
        resolve(results)
      }
    })
  })

class NoReceiverError extends Error {
  error: chrome.runtime.LastError
  constructor(error: chrome.runtime.LastError) {
    super(error.message)
    this.error = error
  }
}

const executeFunction = <a>(fn: () => a, details: chrome.tabs.InjectDetails = {}): Promise<a> => {
  delete details.file
  return executeScript({
    ...details,
    code: `(${fn})()`,
  })
}

const request = <a, b>(tabId: number, message: a): Promise<b> =>
  new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (response) {
        resolve(response)
      } else if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError
        if (!error) {
          resolve(response)
        }
        if (error.message && error.message.includes('Receiving end does not exist')) {
          reject(new NoReceiverError(error))
        } else {
          reject(error)
        }
      }
    })
  })

const sendAgentMessage = (tab: chrome.tabs.Tab, message: AgentInbox) =>
  chrome.tabs.sendMessage(tab.id!, message)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  let response = onRequest(request, sender)
  if (response) {
    Promise.resolve(response).then(sendResponse)
  }
  return true
})
// chrome.browserAction.onClicked.addListener(onBrowserAction)
// chrome.contextMenus.onClicked.addListener(onContextMenuAction)

// chrome.browserAction.disable()
// chrome.browserAction.setIcon({ path: 'icon-off.png' })
// chrome.browserAction.setBadgeBackgroundColor({ color: '#000' })
chrome.browserAction.onClicked.addListener((tab) => sendAgentMessage(tab, { type: 'Toggle' }))
chrome.commands.onCommand.addListener(<(command: string) => void>onCommand)
