import * as Protocol from './protocol'

export type Disable = { type: 'Disable' }
export type Enable = { type: 'Enable' }
export type CloseRequest = { type: 'CloseRequest' }

export type ToggleRequest = {
  type: 'Toggle'
}

export type LinkHover = {
  type: 'LinkHover'
  url: string | null
}

export type InspectLinksRequest = {
  type: 'InspectLinksRequest'
}

export type InspectLinksResponse = {
  type: 'InspectLinksResponse'
  resource: Protocol.Resource
}

export type SimilarRequest = {
  type: 'SimilarRequest'
  id: number
  input: Protocol.InputSimilar
}

export type SimilarResponse = {
  type: 'SimilarResponse'
  id: number
  similar: Protocol.SimilarResources
}

export type OpenRequest = {
  type: 'OpenRequest'
  url: string
}

export type OpenResponse = {
  type: 'OpenResponse'
  open: Protocol.Open
}

export type LookupResponse = {
  type: 'LookupResponse'
  resource: Protocol.Resource
}

export type LookupRequest = {
  type: 'LookupRequest'
  lookup: string
}

export type IngestRequest = {
  type: 'IngestRequest'
  resource: Protocol.InputResource
}

export type IngestResponse = {
  type: 'IngestResponse'
  ingest: Protocol.Ingest
}

export type TagsRequest = {
  type: 'TagsRequest'
}

export type TagsResponse = {
  type: 'TagsResponse'
  response: { data: { tags: Protocol.Tag[] } }
}

export type ExtensionInbox =
  | CloseRequest
  | LookupRequest
  | IngestRequest
  | TagsRequest
  | OpenRequest
  | SimilarRequest

export type AgentInbox =
  | ToggleRequest
  | LookupResponse
  | IngestResponse
  | OpenResponse
  | InspectLinksRequest
  | SimilarResponse

export type AgentOwnInbox =
  | Enable
  | Disable
  | OpenRequest
  | InspectLinksResponse
  | LinkHover
  | SimilarRequest

export type AgentMessage = AgentInbox | AgentOwnInbox

export type UIInbox = CloseRequest

type Address =
  | { to: 'extension' }
  | { to: 'tab'; tabId: number }
  | { to: 'frame'; tabId: number; frameId: number }
