/* eslint-env webextensions */

import freezeDry from 'freeze-dry'

console.log('running freeze')
freezeDry(document, { addMetadata: true }).then((html) => {
  const msg = { contentType: 'HTML', src: window.location.href, content: html }
  console.log('pushing a message')
  chrome.runtime.sendMessage(msg)
})
