// my TS checker thinks this file is in the same namespace as background.ts. need to follow up
const executeScript2 = (details: chrome.tabs.InjectDetails): Promise<any> =>
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

const archiveTab = () => executeScript2({ file: 'content.js' })

const onLoad = async () => {
  console.log('loaded')
}

onLoad()
