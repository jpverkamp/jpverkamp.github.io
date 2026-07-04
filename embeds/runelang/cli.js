import logging from "./lib/logging.js"
const log = logging.get()

import { include } from "./runelang/main.js"
import fs from "fs"

if (process.argv.length == 2) {
  process.argv.push("-")
}

for (let path of process.argv.slice(2)) {
  let svg = include(path)
  fs.writeFileSync(path + ".svg", svg)
}
