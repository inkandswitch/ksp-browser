import sendMessage from './extension-messaging'

chrome.contextMenus.onClicked.addListener((itemData) => {
  triggerActionFeedback()
  console.log(itemData)
  if (itemData.selectionText) {
    chrome.tabs.executeScript(
      {
        code: 'window.getSelection().toString();',
      },
      (selection) => {
        sendMessage({ contentType: 'Text', content: selection[0] })
      }
    )
  }
  if (itemData.mediaType === 'image') {
    const tmpImage = new Image()
    const canvas = document.createElement('canvas')

    tmpImage.crossOrigin = 'anonymous'
    if (!itemData.srcUrl) {
      throw new Error('no srcUrl for an image!')
    }
    tmpImage.src = itemData.srcUrl

    tmpImage.onload = () => {
      canvas.width = tmpImage.width
      canvas.height = tmpImage.height

      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Failed to get a 2d context for the canvas!')
      }
      context.drawImage(tmpImage, 0, 0)

      sendMessage({ contentType: 'Image', content: canvas.toDataURL() })
    }
  }
})

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'pushpin-clipper',
    title: 'Send to Pushpin',
    contexts: ['selection', 'image'], // ContextType
  })
})

chrome.browserAction.onClicked.addListener((tab) => {
  triggerActionFeedback()
  chrome.tabs.executeScript({
    file: 'content.js',
  })
})

function triggerActionFeedback() {
  chrome.browserAction.setBadgeText({ text: 'OK' })
  chrome.browserAction.setBadgeBackgroundColor({ color: 'green' })
  setTimeout(() => {
    chrome.browserAction.setBadgeText({ text: '' })
    chrome.browserAction.setBadgeBackgroundColor({ color: 'green' })
  }, 1000)
}
