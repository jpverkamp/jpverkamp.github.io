import logging from "../lib/logging.js"
const log = logging.get("lexer")

import { TOKEN_PATTERNS } from "./constants.js"

export default function lex(text) {
  let row = 0,
    col = 0
  let tokens = []

  while (text.length > 0) {
    let match

    // Match against comments
    match = text.match(/^\#.*\n/)
    if (match !== null) {
      row += 1
      text = text.substring(match[0].length)
      continue
    }

    // Try to match against known tokens
    let matched = false
    for (let token_pattern of TOKEN_PATTERNS) {
      let match = text.match(token_pattern)
      if (match === null) continue

      let token = match[0]
      let chars = token.length

      tokens.push({ row, col, token })
      row += chars
      text = text.substring(chars)

      matched = true
      break
    }
    if (matched) continue

    // Try to match against a newline
    if (text[0] === "\n") {
      row = 0
      col += 1
      text = text.substring(1)
      continue
    }

    // Try to match against other whitespace
    match = text.match(/^\s+/)
    if (match !== null) {
      let chars = match[0].length

      row += chars
      text = text.substring(chars)
      continue
    }

    // Error case, no idea what's at the beginning
    let context = text.substring(0, 10).replace(/\n/g, "\\n")
    if (text.length > 10) context += "..."
    log.error("Lex Error, unknown token at", row, ":", col, ":", context, "")
  }

  return tokens
}
