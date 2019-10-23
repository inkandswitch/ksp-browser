// /* eslint-env webextensions */

import freezeDry from 'freeze-dry'

console.log('running freeze')
freezeDry(document, { addMetadata: true }).then((html) => {
  const msg = { src: window.location.href, dataUrl: `data:text/html,${encodeURIComponent(html)}` }
  chrome.runtime.sendMessage(msg)
})

// NOTE: This won't work if auth is required to retrieve the content.
// const url = window.location.href
// chrome.runtime.sendMessage({ src: url, dataUrl: `data:text/plain,${url}` })
