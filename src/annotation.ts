import { Selector } from './web-annotation'

export enum Motivation {
  assessing = 'assessing',
  bookmarking = 'bookmarking',
  classifying = 'classifying',
  commenting = 'commenting',
  describing = 'describing',
  editing = 'editing',
  highlighting = 'highlighting',
  identifying = 'identifying',
  linking = 'linking',
  moderating = 'moderating',
  questioning = 'questioning',
  replying = 'replying',
  tagging = 'tagging',
}

export type Annotation = {
  '@context': 'http://www.w3.org/ns/anno.jsonld'
  type: 'Annotation'
  id: string
  motivation: Motivation
  created: string
  generator: string
  body: AnnotationBody[]
  target: AnnotationTarget
}

type AnnotationSource = string

type SpecificResource = {
  type: 'SpecificResource'
  purpose: Motivation
  source: AnnotationSource
}

type AnnotationBody = TextualBody | SpecificResource

export const annotation = (
  sourceURL: AnnotationSource,
  time: Date,
  comment: string,
  selector: Selector[],
  archiveURL: string
): Annotation => {
  const body = comment == '' ? [] : [textualBody(comment)]
  const target = encodeTarget(sourceURL, selector, {
    type: 'TimeState',
    cached: archiveURL,
    sourceDate: time.toUTCString(),
  })

  return {
    '@context': 'http://www.w3.org/ns/anno.jsonld',
    type: 'Annotation',
    // @TODO: We need unique id but then again cid is unique but we can't compute it
    // without hashing content that contains it. Here we sort of imply that id is the
    // URL of this.
    id: '.',
    created: time.toUTCString(),
    generator: 'https://xcr.pt',
    motivation: comment === '' ? Motivation.bookmarking : Motivation.commenting,
    body: body,
    target: target,
  }
}

type AnnotationTarget = {
  source: string
  selector: Selector[]
  state?: AnnotationState
}

type TimeState = {
  type: 'TimeState'
  cached: string
  sourceDate: string
}

type AnnotationState = TimeState

const encodeTarget = (
  source: string,
  selector: Selector[],
  state?: AnnotationState
): AnnotationTarget => {
  return {
    source,
    selector,
    state,
  }
}

type TextualBody = {
  type: 'TextualBody'
  value: string
}

const textualBody = (text: string): TextualBody => ({
  type: 'TextualBody',
  value: text,
})
