import * as Protocol from './protocol'

export type Deactivate = { type: 'Deactivate' }
export type Activate = { type: 'Activate' }
export type CloseRequest = { type: 'CloseRequest' }

export type LookupResponse = {
  type: 'LookupResponse'
  response: { data: { lookup: Protocol.Resource } }
}

export type LookupRequest = {
  type: 'LookupRequest'
  url: string
}

export type ExtensionInbox = CloseRequest | LookupRequest

export type ScriptInbox = CloseRequest

export type UIInbox = CloseRequest

type Address =
  | { to: 'extension' }
  | { to: 'tab'; tabId: number }
  | { to: 'frame'; tabId: number; frameId: number }
