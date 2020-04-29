import * as Protocol from './protocol'

export type Disable = { type: 'Disable' }
export type Enable = { type: 'Enable' }
export type CloseRequest = { type: 'CloseRequest' }

export type HideRequest = {
  type: 'Hide'
}

export type ToggleRequest = {
  type: 'Toggle'
}

export enum Display {
  Backlinks = 'backlinks',
  Siblinks = 'siblinks',
  Simlinks = 'simlinks',
}

export type ShowRequest = {
  type: 'Show'
  show: Display
}

export type Rect = {
  top: number
  left: number
  width: number
  height: number
}

export type HoveredLink = {
  url: string
  rect: Rect
}

export type LinkHover = {
  type: 'LinkHover'
  link: HoveredLink | null
}

export type SelectionChange = {
  type: 'SelectionChange'
  data: SelectionData | null
}

export type SelectionData = {
  url: string
  content: string
  id: number
  rect: Rect
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
  rect: Rect
  input: Protocol.InputSimilar
}

export type SimilarResponse = {
  type: 'SimilarResponse'
  id: number
  similar: Protocol.Simlinks
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
  | ShowRequest
  | HideRequest
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
  | SelectionChange

export type AgentMessage = AgentInbox | AgentOwnInbox

export type UIInbox = CloseRequest

type Address =
  | { to: 'extension' }
  | { to: 'tab'; tabId: number }
  | { to: 'frame'; tabId: number; frameId: number }
