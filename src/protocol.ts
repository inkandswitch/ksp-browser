export enum LinkKind {
  INLINE = 'INLINE',
  REFERENCE = 'REFERENCE',
}

export type Resource = {
  url: string
  links: Link[]
  backLinks: Link[]
  tags: Tag[]
}

export type Link = {
  kind: LinkKind
  name: string
  title: string
  identifier: null | void | string
  target: Resource
  referrer: Resource
}

export type Tag = {
  tag: string
  targetUrl: string
}

export type Lookup = Resource
