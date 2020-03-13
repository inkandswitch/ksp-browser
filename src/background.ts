import { ExtensionInbox, ScriptInbox, ArchiveResponse } from './mailbox'

const onContextMenuAction = async (itemData: chrome.contextMenus.OnClickData) => {
  if (itemData.selectionText) {
    const clip = await clipSelection()
    alert('no action taken')
  }

  if (itemData.mediaType === 'image' && itemData.srcUrl) {
    const clip = await clipImage(itemData.srcUrl)
    alert('no action taken')
  }
}

const onBrowserAction = async (tab: chrome.tabs.Tab) => {
  try {
    await request(tab.id!, { type: 'Activate' })
  } catch (error) {
    if (error instanceof NoReceiverError) {
      await executeScript({ file: 'content.js' })
    }
  }
}

const clipSelection = async () => {
  const selection = await executeFunction(() => {
    const selection = window.getSelection()
    return selection ? selection.toString() : null
  })

  if (selection) {
    return {
      src: window.location.href,
      capturedAt: new Date().toISOString(),
      dataUrl: `data:text/plain,${selection[0]}`,
    }
  }
}

const clipImage = (url: string) =>
  new Promise((resolve, reject) => {
    const tmpImage = new Image()
    const canvas = document.createElement('canvas')

    tmpImage.crossOrigin = 'anonymous'
    tmpImage.src = url

    tmpImage.onload = () => {
      canvas.width = tmpImage.width
      canvas.height = tmpImage.height

      const context = canvas.getContext('2d')
      if (!context) {
        return reject(new Error('Failed to get a 2d context for the canvas!'))
      }
      context.drawImage(tmpImage, 0, 0)

      resolve({
        src: url,
        capturedAt: new Date().toISOString(),
        dataUrl: canvas.toDataURL(),
      })
    }
    tmpImage.onerror = reject
  })

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

chrome.browserAction.onClicked.addListener(onBrowserAction)
chrome.contextMenus.onClicked.addListener(onContextMenuAction)
