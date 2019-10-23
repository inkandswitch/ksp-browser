export default function sendMessage(msg, replyCb?) {
  ; (chrome.runtime as any).sendNativeMessage('com.pushpin.pushpin', msg, function (response) {
    if (replyCb && response) {
      replyCb(response)
    }
  })
}
