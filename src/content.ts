/* eslint-env webextensions */

import freezeDry from 'freeze-dry'
import sendMessage from './extension-messaging'

freezeDry(document, { addMetadata: true }).then((html) => {
  const msg = { contentType: 'HTML', src: window.location.href, content: html }
  sendMessage(msg)
})
