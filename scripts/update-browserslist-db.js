'use strict'

const updateBrowserslistDb = require('update-browserslist-db')

try {
  // Surprisingly update-browserslist-db runs synchronously.
  updateBrowserslistDb()
} catch (e) {
  if (e.name === 'BrowserslistUpdateError') {
    console.error(`update-browserslist-db: ${e.message}\n`)
  } else {
    throw e
  }
}
