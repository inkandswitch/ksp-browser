import sendMessage from './extension-messaging'

let feedbackTimerGlobal
let terminateTimerGlobal

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
          capturedAt: new Date().toISOString(),
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
        capturedAt: new Date().toISOString(),
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
        responseFeedback('❌')
      }
    }
  )
})

function updateBadge(text) {
  chrome.browserAction.setBadgeText({ text })
}

function* actionFeedback() {
  // const cycle = '◴◷◶◵'
  // const cycle = '⠁⠂⠄⡀⢀⠠⠐⠈'
  // const cycle = '◢◣◤◥'
  const cycle = '⠁⠂⠄⠠⠐⠈'
  const chars = cycle.split('')
  let i = 0
  while (true) {
    i = i + 1
    const next = ' ' + chars[i % chars.length] + ' '
    yield next
  }
}

function runActionFeedback(badgeGenerator = actionFeedback()) {
  updateBadge(badgeGenerator.next().value)

  feedbackTimerGlobal = setTimeout(() => {
    runActionFeedback(badgeGenerator)
  }, 500)
}

function startActionFeedback() {
  runActionFeedback()
  terminateTimerGlobal = setTimeout(() => responseFeedback('❌'), 20000)
}

function endFeedback() {
  clearTimeout(feedbackTimerGlobal)
  clearTimeout(terminateTimerGlobal)
  feedbackTimerGlobal = null
  terminateTimerGlobal = null
  updateBadge('')
  chrome.browserAction.enable()
}

function responseFeedback(text) {
  updateBadge(text)
  if (feedbackTimerGlobal) {
    clearTimeout(feedbackTimerGlobal)
  }
  feedbackTimerGlobal = setTimeout(() => {
    endFeedback()
  }, 2000)
}

function clipperResponse(response) {
  switch (response.type) {
    case 'Ack':
      responseFeedback('✔️')
      break
    case 'Failed':
      console.log(response)
      responseFeedback('❌')
      break
    default:
      console.log(response)
      responseFeedback('❓')
  }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // For now, all messages go to the native host. We might want to filter here
  // in the future.
  sendMessage(request, clipperResponse)
})
