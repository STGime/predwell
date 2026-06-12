// Resolve `//#include <file>` directives in an edge-function source file by
// inlining the referenced file (the runner sandbox has no imports). Used by
// both the deploy helper and the local test harness so the assembled code is
// identical in both.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export function assembleFunction(filePath) {
  const dir = dirname(filePath)
  const code = readFileSync(filePath, 'utf8')
  return code.replace(/^\/\/#include\s+(\S+)[ \t]*$/gm, (_, inc) =>
    readFileSync(join(dir, inc), 'utf8'),
  )
}
