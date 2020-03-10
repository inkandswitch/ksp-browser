type Time = number

const second = 1000
// Parameters

// Zone A is while connecting (waiting for the server to respond). This can be very fast (especially if server has beeen reached before).
// Zone B is downloading the page and loading it.
// Zone C is when the page is fully loaded and we finish the animation

const limitA = 0.2 // what is the limit for the A zone. It will never reach this point, but tend to it. 1 is 100% of the width
const limitB = 0.7
const inflectionA = 1 * second // After how many ms it stops accelerating to slowing approaching the limit
const inflectionB = 2 * second
const durationC = 200

const TAU = Math.PI / 2

const curve = (currentTime: Time, inflectionTime: Time) =>
  Math.atan((TAU / 2) * (currentTime / inflectionTime)) / TAU

const progressConnecting = (loadStart: Time, updateTime: Time) =>
  limitA * curve(updateTime - loadStart, inflectionA)

const progressLoading = (loadStart: Time, connectTime: Time, updateTime: Time) => {
  const padding = progressConnecting(loadStart, connectTime)
  const toFill = limitB - padding
  return padding + toFill * curve(updateTime - connectTime, inflectionB)
}

const progressLoaded = (loadStart: Time, connectTime: Time, loadEnd: Time, updateTime: Time) => {
  const padding = progressLoading(loadStart, connectTime, updateTime)
  const toFill = 1 - padding
  return padding + (toFill * (updateTime - loadEnd)) / durationC
}

// Implied to be 0.0 - 1.0 range
export type LoadProgress = number

const progress = (start: Time, connect: Time, end: Time, now: Time): LoadProgress =>
  end > 0
    ? progressLoaded(start, connect, end, now)
    : connect > 0
    ? progressLoading(start, connect, now)
    : start > 0
    ? progressConnecting(start, now)
    : 0

type Percentage = number // 0 to 100
type Model = {
  updateTime: Time
  loadStart: Time
  connectTime: Time
  loadEnd: Time

  value: Percentage
}

export type View = HTMLProgressElement & Model

export const renderIdle = (view: View): void => {
  view.loadStart = 0
  view.updateTime = 0
  view.connectTime = 0
  view.loadEnd = 0
  view.value = 0
}

export const renderLoadStart = (view: View, time: Time): void => {
  view.loadStart = time
  view.updateTime = time
  view.connectTime = 0
  view.loadEnd = 0
  view.value = 0
  renderLoading(view, time)
}

export const renderConnected = (view: View, time: Time): void => {
  view.connectTime = time
}

export const renderLoadEnded = (view: View, time: Time): void => {
  view.loadEnd = time
}

const renderLoading = (view: View, time: Time): void => {
  const value = progress(view.loadStart, view.connectTime, view.loadEnd, time)
  view.updateTime = time

  if (value < 1) {
    window.requestAnimationFrame((time: Time) => renderLoading(view, time))
    view.value = value * 100
  } else {
    renderIdle(view)
  }
}
