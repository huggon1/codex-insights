import { writeSync } from "node:fs"

const PREFIX = "[codex-insights]"

function writeLine(stream, line) {
  if (typeof stream?.fd === "number") {
    writeSync(stream.fd, line)
    return
  }
  stream.write(line)
}

export function createProgressLogger({
  enabled = true,
  stream = process.stderr,
} = {}) {
  return {
    enabled,
    log(message) {
      if (!enabled) {
        return
      }
      writeLine(stream, `${PREFIX} ${message}\n`)
    },
    step(label, details = "") {
      this.log(details ? `${label} ${details}` : label)
    },
    done(label, details = "") {
      this.log(details ? `${label} done ${details}` : `${label} done`)
    },
  }
}

export const silentProgress = createProgressLogger({ enabled: false })
