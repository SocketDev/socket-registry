'use strict'

const { createNewSortInstance } = require('fast-sort')

const { compare: localCompare } = new Intl.Collator()

const naturalSort = createNewSortInstance({
  comparer: new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    .compare
})

module.exports = {
  localCompare,
  naturalSort
}
