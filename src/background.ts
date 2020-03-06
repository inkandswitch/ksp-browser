let feedbackTimerGlobal: any
let terminateTimerGlobal: any

const onContextMenuAction = async (itemData: chrome.contextMenus.OnClickData) => {
  startActionFeedback()
  if (itemData.selectionText) {
    const clip = await clipSelection()
    console.log(clip)
  }

  if (itemData.mediaType === 'image' && itemData.srcUrl) {
    const clip = await clipImage(itemData.srcUrl)
    console.log(clip)
  }
}

const onBrowserAction = async (tab: chrome.tabs.Tab) => {
  startActionFeedback()
  try {
    await archiveTab()
  } catch (error) {
    console.log('error during executeScript')
    responseFeedback('❌')
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

const archiveTab = () => executeScript({ file: 'content.js' })

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

const executeFunction = <a>(fn: () => a, details: chrome.tabs.InjectDetails = {}): Promise<a> => {
  delete details.file
  return executeScript({
    ...details,
    code: `(${fn})()`,
  })
}

function updateBadge(text: string) {
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
  updateBadge(badgeGenerator.next().value || '')

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

function responseFeedback(text: string) {
  updateBadge(text)
  if (feedbackTimerGlobal) {
    clearTimeout(feedbackTimerGlobal)
  }
  feedbackTimerGlobal = setTimeout(() => {
    endFeedback()
  }, 2000)
}

type ClipperResponse = { type: 'Ack' } | { type: 'Failed' }

function clipperResponse(response: ClipperResponse) {
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

chrome.browserAction.onClicked.addListener(onBrowserAction)
chrome.contextMenus.onClicked.addListener(onContextMenuAction)

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  sendMessage(request, clipperResponse)
})

const sendMessage = (message: any, callback?: Function) => {
  console.log(message)
  if (callback) {
    callback({ type: 'Ack' })
  }
}
