type Listener = (active: boolean) => void

let pendingRequests = 0
const listeners = new Set<Listener>()

function publish() {
  const active = pendingRequests > 0
  listeners.forEach((listener) => listener(active))
}

export function beginNetworkActivity() {
  pendingRequests += 1
  publish()
  let finished = false
  return () => {
    if (finished) return
    finished = true
    pendingRequests = Math.max(0, pendingRequests - 1)
    publish()
  }
}

export function subscribeNetworkActivity(listener: Listener) {
  listeners.add(listener)
  listener(pendingRequests > 0)
  return () => listeners.delete(listener)
}
