export class Program<message, model, config> {
  state: model
  app: App<message, model, config>
  target: HTMLElement

  static ui<message, model, config>(
    app: App<message, model, config>,
    options: config,
    target: HTMLElement
  ) {
    return new Program(target, options, app)
  }

  constructor(target: HTMLElement, options: config, app: App<message, model, config>) {
    this.target = target
    this.app = app
    const [state, fx] = app.init(options)
    this.state = state
    this.app.render(this)

    if (fx) {
      this.wait(fx)
    }
  }
  handleEvent(event: Event) {
    const message = this.app.onEvent(event)
    if (message) {
      this.send(message)
    }
  }
  transact([state, fx]: [model, null | Promise<null | message>]) {
    if (this.state !== state) {
      this.state = state
      this.app.render(this)
    }

    if (fx) {
      this.wait(fx)
    }
    this.state = state
  }
  send(input: message) {
    this.transact(this.app.update(input, this.state))
  }
  async wait(fx: Promise<null | message>) {
    const message = await fx
    if (message) {
      this.send(message)
    }
  }
}

export type App<message, model, config> = {
  onEvent: (event: Event) => null | message
  init(options: config): [model, null | Promise<message>]
  update(input: message, state: model): [model, null | Promise<message>]
  render(context: Context<model>): void
}

export interface Context<model> {
  readonly target: HTMLElement
  readonly state: model
  handleEvent(event: Event): void
}
