import freezeDry from 'freeze-dry'

if (document.querySelector('embed[type="application/pdf"]')) {
  const msg = {
    src: window.location.href,
    dataUrl: `data:text/plain,${window.location.href}`,
    capturedAt: new Date().toISOString(),
  }
  chrome.runtime.sendMessage(msg)
} else {
  freezeDry(document, { addMetadata: true }).then((html) => {
    const msg = {
      src: window.location.href,
      dataUrl: `data:text/html,${encodeURIComponent(html)}`,
      capturedAt: new Date().toISOString(),
    }
    chrome.runtime.sendMessage(msg)
  })
}
