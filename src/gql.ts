type Variable =
  | GQL
  | string
  | number
  | boolean
  | null
  | GQL[]
  | string[]
  | number[]
  | boolean[]
  | null[]

class GQL {
  static toGQLString(value: Variable) {
    return value instanceof GQL ? value.toGQLString() : JSON.stringify(value)
  }
  toGQLString() {
    return this.toString()
  }
  toJSON() {
    return this.toGQLString()
  }
}

class GQLTemplate extends GQL {
  template: TemplateStringsArray | string[]
  variables: Variable[]
  constructor(template: TemplateStringsArray | string[], variables: Variable[]) {
    super()
    this.template = template
    this.variables = variables
  }
  toGQLString(): string {
    const { template, variables } = this
    let out = ``
    let index = 0
    while (index < template.length) {
      out += template[index]
      if (index < variables.length) {
        const variable = variables[index]
        out += GQL.toGQLString(variable)
      }
      index++
    }
    return out
  }
  toString(): string {
    return this.toGQLString()
  }
}

export class GQLView<a> extends GQL {
  data: a
  static toGQLString<a>(data: a): string {
    return new this(data).toGQLString()
  }
  static toGQL<a>(data: a): GQL {
    return new this(data).toGQL()
  }
  constructor(data: a) {
    super()
    this.data = data
  }
  toGQL(): GQL {
    throw new RangeError('Subclass supposed to implement this')
  }
  toGQLString() {
    return this.toGQL().toString()
  }
  toString() {
    return this.toGQLString()
  }
}

export const gql = (
  template: TemplateStringsArray | string[] | string,
  ...variables: Variable[]
): GQL => new GQLTemplate(typeof template === 'string' ? [template] : template, variables)
