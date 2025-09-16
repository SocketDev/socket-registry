'use strict'

const which = /*@__PURE__*/ require('../../external/which')
const fs = /*@__PURE__*/ require('node:fs')
const path = /*@__PURE__*/ require('node:path')

// Try to find the real npm executable, bypassing any aliases
function findRealNpm() {
  // Try to find npm in the same directory as the node executable
  const nodeDir = path.dirname(process.execPath)
  const npmInNodeDir = path.join(nodeDir, 'npm')

  if (fs.existsSync(npmInNodeDir)) {
    return npmInNodeDir
  }

  // Try common npm locations
  const commonPaths = ['/usr/local/bin/npm', '/usr/bin/npm']

  for (const npmPath of commonPaths) {
    if (fs.existsSync(npmPath)) {
      return npmPath
    }
  }

  // Fall back to which.sync if no direct path found
  return which.sync('npm')
}

module.exports = findRealNpm()
