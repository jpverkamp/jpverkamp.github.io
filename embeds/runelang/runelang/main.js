import logging from "../lib/logging.js"
const log = logging.get("main")

import lex from "./lexer.js"
import parse from "./parser.js"
import evaluate from "./evaluator.js"

// import fs from "fs"

export function render(input, environment = null) {
  log.info("Lexer running")
  let lexed = lex(input)
  log.info("Lexer finished", null, lexed)

  log.info("Parser running")
  let parsed = parse(lexed)
  log.info(
    "Parser finished",
    null,
    JSON.stringify(parsed, (k, v) => (k === "next" || k === "token" ? "~" : v))
  )

  log.info("Eval running")
  let result = evaluate(parsed, environment)
  log.info("Eval finished")
  // log.info(result)

  return result
}

/*
export function include(path, environment = null) {
  if (path === "-") {
    path = "/dev/stdin"
  }

  log.info(`Rendering ${path}`)

  let input = fs.readFileSync(path, "utf-8")
  return render(input, environment)
}
*/
