import sendMessage from './extension-messaging'

let feedbackTimerGlobal

chrome.contextMenus.onClicked.addListener((itemData) => {
  startActionFeedback()
  if (itemData.selectionText) {
    chrome.tabs.executeScript(
      {
        code: 'window.getSelection().toString();',
      },
      (selection) => {
        sendMessage({
          src: window.location.href,
          capturedAt: Date.now(),
          dataUrl: `data:text/plain,${selection[0]}`,
        })
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

      sendMessage({
        src: itemData.srcUrl,
        capturedAt: Date.now(),
        dataUrl: canvas.toDataURL(),
      })
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
  chrome.tabs.executeScript(
    {
      file: 'content.js',
    },
    () => {
      let e = chrome.runtime.lastError
      if (e !== undefined) {
        console.log('error during executeScript')
        triggerActionFeedback('❌', '')
      }
    }
  )
})

function updateBadge(text, color) {
  chrome.browserAction.setBadgeText({ text })
  chrome.browserAction.setBadgeBackgroundColor({ color: [255, 255, 255, 0] })
}

function startActionFeedback() {
  updateBadge('🔄', '#00000000')
  chrome.browserAction.disable()

  feedbackTimerGlobal = setTimeout(() => {
    feedbackTimerGlobal = null
    updateBadge('', '#00000000')
    chrome.browserAction.enable()
  }, 20000)
}

function triggerActionFeedback(text, color) {
  updateBadge(text, color)
  if (feedbackTimerGlobal) {
    clearTimeout(feedbackTimerGlobal)
  }
  feedbackTimerGlobal = setTimeout(() => {
    feedbackTimerGlobal = null
    updateBadge('', color)
    chrome.browserAction.enable()
  }, 2000)
}

function clipperResponse(response) {
  switch (response.type) {
    case 'Ack':
      triggerActionFeedback('✔️', '')
      break
    case 'Failed':
      console.log(response)
      triggerActionFeedback('❌', '')
      break
    default:
      console.log(response)
      triggerActionFeedback('❓', '')
  }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // For now, all messages go to the native host. We might want to filter here
  // in the future.
  sendMessage(request, clipperResponse)
})
