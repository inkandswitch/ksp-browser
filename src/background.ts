import { ExtensionInbox, ScriptInbox } from './mailbox'
import * as Protocol from './protocol'

const onRequest = (message: ExtensionInbox) => {
  switch (message.type) {
    case 'CloseRequest': {
      return close()
    }
    case 'LookupRequest': {
      return lookup(message.url)
    }
  }
}

const lookup = async (url: string) => {
  const request = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: {
      contentType: 'application/json',
    },
    body: JSON.stringify({
      query: `{
        lookup(url:"${url}") {
          url
          backLinks {
            kind,
            identifier,
            name,
            title,
            referrer {
              url
              tags {
                tag
              }
              links {
                target{
                  url
                }
              }
            }
          }
          tags {
            tag
          }
        }
      }`,
      variables: null,
    }),
  })
  const data: { data: { lookup: Protocol.Resource } } = await request.json()
  console.log(data)
  return { type: 'LookupResponse', response: data }
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
  let response = onRequest(request)
  if (response) {
    Promise.resolve(response).then(sendResponse)
  }
  return true
})
// chrome.browserAction.onClicked.addListener(onBrowserAction)
// chrome.contextMenus.onClicked.addListener(onContextMenuAction)
