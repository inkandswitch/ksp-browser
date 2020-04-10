import * as protocol from './protocol'
import { GQLView, gql } from './gql'

export class InputTag extends GQLView<protocol.InputTag> {
  toGQL() {
    const { data } = this
    return gql`{
      name: ${data.name}
      targetFragment: ${data.name}
      targetLocation: ${data.targetLocation}
    }`
  }
}

export class InputLink extends GQLView<protocol.InputLink> {
  toGQL() {
    const { data } = this
    return gql`{
      targetURL: ${data.targetURL}
      referrerFragment: ${data.referrerFragment}
      referrerLocation: ${data.referrerLocation}
      kind: ${gql(data.kind)}
      name: ${data.name}
      title: ${data.title}
      identifier: ${data.identifier}
    }`
  }
}

export class InputResource extends GQLView<protocol.InputResource> {
  toGQL() {
    const { data } = this
    return gql`{
      url: ${data.url}
      cid: ${data.cid}
      title: ${data.title}
      description: ${data.description}
      links: ${data.links && data.links.map((link) => new InputLink(link))}
      tags: ${data.tags && data.tags.map((tag) => new InputTag(tag))}
    }`
  }
}
