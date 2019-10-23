import sendMessage from './extension-messaging'

let feedbackTimerGlobal

chrome.contextMenus.onClicked.addListener((itemData) => {
  startActionFeedback()
  console.log(itemData)
  if (itemData.selectionText) {
    chrome.tabs.executeScript(
      {
        code: 'window.getSelection().toString();',
      },
      (selection) => {
        sendMessage({ dataUrl: `data:text/plain,${selection[0]}` })
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

      sendMessage({ dataUrl: canvas.toDataURL() })
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
  startActionFeedback()
  chrome.tabs.executeScript({
    file: 'content.js',
  })
})

function updateBadge(text, color) {
  chrome.browserAction.setBadgeText({ text })
  chrome.browserAction.setBadgeBackgroundColor({ color })
}

function startActionFeedback() {
  triggerActionFeedback('', 'green')
}

function triggerActionFeedback(text, color) {
  updateBadge(text, color)
  if (feedbackTimerGlobal) {
    clearTimeout(feedbackTimerGlobal)
  }
  feedbackTimerGlobal = setTimeout(() => {
    feedbackTimerGlobal = null
    updateBadge('', color)
  }, 1000)
}

function clipperResponse(response) {
  console.log(response)
  switch (response.type) {
    case 'Ack':
      triggerActionFeedback('OK', 'green')
      break
    case 'Failed':
      triggerActionFeedback('NO', 'red')
      break
    default:
      triggerActionFeedback('?', 'yellow')
  }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // For now, all messages go to the native host. We might want to filter here
  // in the future.
  sendMessage(request, clipperResponse)
})
