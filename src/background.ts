const onContextMenuAction = async (itemData: chrome.contextMenus.OnClickData) => {
  if (itemData.selectionText) {
    const clip = await clipSelection()
    console.log(clip)
    alert('no action taken')
  }

  if (itemData.mediaType === 'image' && itemData.srcUrl) {
    const clip = await clipImage(itemData.srcUrl)
    console.log(clip)
    alert('no action taken')
  }
}

const onBrowserAction = () => {
  chrome.windows.getCurrent(function(win) {
    var width = 440
    var height = 220

    var left = screen.width / 2 - width / 2 + (win.left || 0)
    var top = screen.height / 2 - height / 2 + (win.top || 0)

    chrome.windows.create({
      url: 'prompt.html',
      width: width,
      height: height,
      type: 'popup',
      focused: true,
      top: Math.round(top),
      left: Math.round(left),
    })
  })

  executeScript({ file: 'content.js' })
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

const executeFunction = <a>(fn: () => a, details: chrome.tabs.InjectDetails = {}): Promise<a> => {
  delete details.file
  return executeScript({
    ...details,
    code: `(${fn})()`,
  })
}

chrome.browserAction.onClicked.addListener(onBrowserAction)
chrome.contextMenus.onClicked.addListener(onContextMenuAction)
