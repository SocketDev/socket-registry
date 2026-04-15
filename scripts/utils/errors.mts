/** @fileoverview Error extraction utilities for cleaner error logging. */

/**
 * Extract concise npm error from stderr.
 */
function extractNpmError(stderr) {
  const lines = stderr.split('\n')
  const errorLines = []

  for (const line of lines) {
    // Skip npm warnings and notices.
    if (line.startsWith('npm warn') || line.startsWith('npm notice')) {
      continue
    }
    // Include npm errors.
    if (line.startsWith('npm error')) {
      errorLines.push(line)
    }
  }

  return errorLines.length > 0
    ? errorLines.join('\n')
    : lines
        .filter(l => l.trim() && !l.startsWith('npm warn'))
        .slice(0, 5)
        .join('\n')
}

/**
 * Extract concise error information from stderr.
 */
function extractErrorInfo(stderr) {
  const lines = stderr.split('\n')
  const result = []

  // Find the main error message.
  let foundError = false
  for (const line of lines) {
    // Skip Node.js internal stack trace lines.
    if (/^\s+at\s+/.test(line) || /node:internal/.test(line)) {
      continue
    }

    // Include error type and message.
    if (line.includes('Error:') || line.includes('error:')) {
      foundError = true
      result.push(line.trim())
      continue
    }

    // Include code property if present.
    if (foundError && /^\s*code:/.test(line)) {
      result.push(line.trim())
    }

    // Stop after collecting essential info.
    if (result.length >= 3) {
      break
    }
  }

  return result.length > 0
    ? result.join('\n')
    : stderr.split('\n').slice(0, 3).join('\n')
}

export { extractErrorInfo, extractNpmError }
