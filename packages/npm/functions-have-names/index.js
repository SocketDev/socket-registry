'use strict'

function functionsHaveNames() {
  return true
}

function boundFunctionsHaveNames() {
  return true
}

function functionsHaveConfigurableNames() {
  return true
}

module.exports = functionsHaveNames
module.exports.boundFunctionsHaveNames = boundFunctionsHaveNames
module.exports.functionsHaveConfigurableNames = functionsHaveConfigurableNames
