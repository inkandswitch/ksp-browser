export enum LinkKind {
  INLINE = 'INLINE',
  REFERENCE = 'REFERENCE',
}

export type ResourceInfo = {
  title: string
  description: string
  cid: string | null | void
}

export type Resource = {
  url: string
  info: ResourceInfo
  links: Link[]
  backLinks: Link[]
  tags: Tag[]
}

export type Link = {
  kind: LinkKind
  name: string
  title: string

  fragment: string | null | void
  location: string | null | void

  identifier: null | void | string
  target: Resource
  referrer: Resource
}

export type Tag = {
  name: string
  fragment: string | null | void
  location: string | null | void
  target: Resource
}
