import { ScrapeData } from './scraper'

export type ArchiveData = { archiveURL: string; capturedAt: string }

export type Deactivate = { type: 'Deactivate' }
export type Activate = { type: 'Activate' }
export type CloseRequest = { type: 'CloseRequest' }
export type ExcerptRequest = { type: 'ExcerptRequest' }
export type ExcerptResponse = { type: 'ExcerptResponse'; excerpt: ScrapeData }
export type ArchiveRequest = { type: 'ArchiveRequest' }
export type ArchiveResponse = { type: 'ArchiveResponse'; archive: ArchiveData }

export type ExtensionInbox =
  | ArchiveRequest
  | ArchiveResponse
  | ExcerptRequest
  | ExcerptResponse
  | CloseRequest

export type ScriptInbox = CloseRequest | ExcerptRequest | ArchiveRequest

export type UIInbox = ArchiveResponse | ExcerptResponse

type Address =
  | { to: 'extension' }
  | { to: 'tab'; tabId: number }
  | { to: 'frame'; tabId: number; frameId: number }
