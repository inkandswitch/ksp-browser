import { ExtensionInbox, ScriptInbox, ResourceResponse } from './mailbox'
import * as Protocol from './protocol'

const onRequest = async (message: ExtensionInbox, { tab }: chrome.runtime.MessageSender) => {
  switch (message.type) {
    case 'CloseRequest': {
      return close()
    }
    case 'ResourceRequest': {
      chrome.browserAction.disable(tab!.id!)
      chrome.browserAction.setIcon({ path: 'disable-icon-128.png', tabId: tab!.id })
      chrome.browserAction.setBadgeText({ text: ``, tabId: tab!.id })
      const payload = await resource(message.url)
      const count = payload.response.data.resource.backLinks.length
      if (count > 0) {
        chrome.browserAction.enable(tab!.id)
        chrome.browserAction.setIcon({ path: 'icon-128.png', tabId: tab!.id })
        chrome.browserAction.setBadgeText({ text: `${count}`, tabId: tab!.id })
      }

      return payload
    }
  }
}

const resource = async (url: string): Promise<ResourceResponse> => {
  const request = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: {
      contentType: 'application/json',
    },
    body: JSON.stringify({
      query: `{
        resource(url:"${url}") {
          url
          backLinks {
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
              }
              tags {
                name
              }
              links {
                target{
                  url
                }
              }
            }
          }
          tags {
            name
          }
        }
      }`,
      variables: null,
    }),
  })
  const data = await request.json()
  return { type: 'ResourceResponse', response: data }
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  let response = onRequest(request, sender)
  if (response) {
    Promise.resolve(response).then(sendResponse)
  }
  return true
})
// chrome.browserAction.onClicked.addListener(onBrowserAction)
// chrome.contextMenus.onClicked.addListener(onContextMenuAction)

chrome.browserAction.disable()
chrome.browserAction.setIcon({ path: 'disable-icon-128.png' })
chrome.browserAction.setBadgeBackgroundColor({ color: '#000' })
chrome.browserAction.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id!, { type: 'Toggle' })
})
