import freezeDry from 'freeze-dry'

freezeDry(document, { addMetadata: true }).then((html) => {
  const msg = { src: window.location.href, dataUrl: `data:text/html,${encodeURIComponent(html)}` }
  chrome.runtime.sendMessage(msg)
})
