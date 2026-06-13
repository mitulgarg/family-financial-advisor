// Fails if any frontend source file contains an em dash (U+2014).
// User-facing copy must never show one; banning the character repo-wide in
// src keeps the check simple and honest (comments included).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const TARGETS = [join(here, '..', 'src'), join(here, '..', 'index.html')]
const EXT = /\.(jsx?|css|html)$/

const offenders = []

const scanFile = (path) => {
  const lines = readFileSync(path, 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (line.includes('—')) offenders.push(`${path}:${i + 1}`)
  })
}

const walk = (path) => {
  const stat = statSync(path)
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) walk(join(path, entry))
  } else if (EXT.test(path)) {
    scanFile(path)
  }
}

for (const target of TARGETS) walk(target)

if (offenders.length > 0) {
  console.error('check:copy FAILED, em dash (U+2014) found at:')
  for (const o of offenders) console.error('  ' + o)
  process.exit(1)
}
console.log('check:copy passed: no em dashes in frontend source')
