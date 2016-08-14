var MODULE = 'cerebral-module-router'
var getByPath = require('cerebral').getByPath

function isObject (value) {
  var type = typeof value
  return !!value && (type === 'object' || type === 'function')
}

function flattenConfig (config, prev, flatten) {
  flatten = flatten || {}
  prev = prev || ''

  Object.keys(config).forEach(function (key) {
    if (isObject(config[key])) {
      flattenConfig(config[key], prev + key, flatten)
    } else {
      flatten[prev + key] = config[key]
    }
  })

  return flatten
}

function getRoutableSignals (config, signals) {
  var routableSignals = {}

  Object.keys(config).forEach(function (route) {
    var signal = getByPath(signals, config[route])
    if (!signal) {
      throw new Error('Cerebral router - The signal "' + config[route] +
      '" for the route "' + route + '" does not exist. ' +
      'Make sure that ' + MODULE + ' loaded after all modules with routable signals.')
    }
    if (routableSignals[config[route]]) {
      throw new Error('Cerebral router - The signal "' + config[route] +
      '" has already been bound to route "' + route +
      '". Create a new signal and reuse actions instead if needed.')
    }
    routableSignals[config[route]] = {
      route: route,
      signal: signal
    }
  })

  return routableSignals
}

module.exports = {
  flattenConfig: flattenConfig,
  getRoutableSignals: getRoutableSignals,
  MODULE: MODULE
}
