import * as Protocol from './protocol'

export type Disable = { type: 'Disable' }
export type Enable = { type: 'Enable' }
export type CloseRequest = { type: 'CloseRequest' }

export type ToggleRequest = {
  type: 'Toggle'
}

export type ResourceResponse = {
  type: 'ResourceResponse'
  response: { data: { resource: Protocol.Resource } }
}

export type ResourceRequest = {
  type: 'ResourceRequest'
  url: string
}

export type TagsRequest = {
  type: 'TagsRequest'
}

export type TagsResponse = {
  type: 'TagsResponse'
  response: { data: { tags: Protocol.Tag[] } }
}

export type ExtensionInbox = CloseRequest | ResourceRequest | TagsRequest

export type ScriptInbox = ToggleRequest

export type UIInbox = CloseRequest

type Address =
  | { to: 'extension' }
  | { to: 'tab'; tabId: number }
  | { to: 'frame'; tabId: number; frameId: number }
