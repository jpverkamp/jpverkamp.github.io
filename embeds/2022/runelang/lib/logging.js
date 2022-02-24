let mode = "ERROR";
let listeners = [];

export function log(
  msg,
  level = "INFO",
  logger = null,
  location = null,
  context = null
) {
  logger = logger ? logger : "default";
  location = location ? `${location.col}:${location.row}` : "";
  context = context ? `context: ${JSON.stringify(context)}` : "";

  if (mode === "ERROR" && level !== "ERROR" && level !== "AWESOME") {
    return;
  } else if (mode === "INFO" && level === "DEBUG") {
    return;
  }

  let now = new Date().toLocaleTimeString();

  msg = `[${now} ${level}@${logger}] ${location} ${msg} ${context}`;

  if (listeners) {
    for (let f of listeners) {
      f(msg);
    }
  } else {
    console.log(msg);
  }
}

export function setMode(newMode) {
  mode = newMode;
}

export function register(f) {
  listeners.push(f);
}

export function get(name) {
  return {
    debug: (msg, location = null, context = null) => {
      log(msg, "DEBUG", name, location, context);
    },
    info: (msg, location = null, context = null) => {
      log(msg, "INFO", name, location, context);
    },
    error: (msg, location = null, context = null) => {
      log(msg, "ERROR", name, location, context);
      throw { msg, name, location, content };
    },
    awesome: (msg, location = null, context = null) => {
      log(msg, "AWESOME", name, location, context);
    },
  };
}

export default { register, setMode, get };
