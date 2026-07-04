let mode = "INFO"
let listeners = []

function log(msg, level = "INFO", logger = null, location = null, context = null) {
  logger = logger ? logger : "default"

  let locationString = ""
  if (location?.col !== undefined && location?.row !== undefined) {
    locationString = `r${location.col}:c${location.row}`
  } else if (location?.token?.col !== undefined && location?.token?.row !== undefined) {
    locationString = `r${location.token.col}:c${location.token.row}`
  } else {
  }

  let contextString = ""
  if (typeof context === "string") {
    contextString = context
  } else if (context) {
    contextString = `context: ${JSON.stringify(context)}`
  }

  if (level === "AWESOME" || mode === "DEBUG") {
    // always log
  } else if (mode === "ERROR" && level !== "ERROR") {
    return
  } else if (mode === "INFO" && level === "DEBUG") {
    return
  }

  let now = new Date().toLocaleTimeString()

  msg = `[${now} ${level}@${logger}] ${locationString} ${msg} ${contextString}`

  if (listeners) {
    for (let f of listeners) {
      f(msg)
    }
  } else {
    console.log(msg)
  }
}

export function register(f) {
  listeners.push(f)
}

export function get(name) {
  return {
    debug: (msg, location = null, context = null) => {
      log(msg, "DEBUG", name, location, context)
    },
    info: (msg, location = null, context = null) => {
      log(msg, "INFO", name, location, context)
    },
    error: (msg, location = null, context = null) => {
      log(msg, "ERROR", name, location, context)
      throw { msg, name, location, content }
    },
    awesome: (msg, location = null, context = null) => {
      log(msg, "AWESOME", name, location, context)
    },
  }
}

export function setMode(newMode) {
  mode = newMode
}

export default { register, get, setMode }
