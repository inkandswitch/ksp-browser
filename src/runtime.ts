import { ExtensionInbox, AgentInbox } from 'mailbox'

export const send = async (message: ExtensionInbox) => {
  chrome.runtime.sendMessage(message)
  return null
}

export const request = (message: ExtensionInbox): Promise<AgentInbox | null> =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (response) {
        resolve(response)
      } else if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError
        if (!error) {
          resolve(response)
        } else {
          reject(error)
        }
      }
    })
  })
