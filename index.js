var MODULE = 'cerebral-module-router'
var isObject = require('lodash.isobject')
var get = require('lodash.get')

var Mapper = require('url-mapper')
var addressbar
try {
  addressbar = require('addressbar')
} catch (e) {
  addressbar = {
    pathname: '/',
    value: '',
    origin: '',
    on: function () {},
    removeListener: function () {}
  }
}

module.exports = Router

function Router (routesConfig, options) {
  options = options || {}

  if (!routesConfig) {
    throw new Error('Cerebral router - Routes configuration wasn\'t provided.')
  } else {
    routesConfig = flattenConfig(routesConfig)
  }

  if (options.autoTrigger) console.warn('Cerebral router - autoTrigger option can be safely removed.')

  if (!options.baseUrl && options.onlyHash) {
    // autodetect baseUrl
    options.baseUrl = addressbar.pathname
  }
  options.baseUrl = (options.baseUrl || '') + (options.onlyHash ? '#' : '')
  var urlMapper = Mapper(options.mapper)

  function _getUrl (route, input) {
    console.warn('Cerebral router - signal.getUrl() method is deprecated. Use service method getSignalUrl() instead')
    return options.baseUrl + urlMapper.stringify(route, input || {})
  }

  return function init (module, controller) {
    var signals = getRoutableSignals(routesConfig, controller.getSignals(), _getUrl)
    var rememberedUrl
    var initialSignals = []

    function setRememberedUrl () {
      addressbar.value = rememberedUrl
      rememberedUrl = null
    }

    function onUrlChange (event) {
      var url = event ? event.target.value : addressbar.value
      url = url.replace(addressbar.origin, '')

      if (options.onlyHash && !~url.indexOf('#')) {
        // treat hash absense as root route
        url = url + '#/'
      }

      // check if url should be routed
      if (url.indexOf(options.baseUrl) === 0) {
        event && event.preventDefault()
        var map = urlMapper.map(url.replace(options.baseUrl, ''), routesConfig)

        if (map) {
          signals[map.match].signal(map.values)
        } else {
          console.warn('Cerebral router - No route matched "' + url + '" url, navigation was prevented. ' +
            'Please verify url or catch unmatched routes with a "/*" route.')
        }
      }
    }

    function onPredefinedSignal (event) {
      var signal = signals[event.signal.name]
      if (signal) {
        if (!rememberedUrl) setTimeout(setRememberedUrl)

        var route = signal.route
        var input = event.signal.input || {}
        rememberedUrl = options.baseUrl + urlMapper.stringify(route, input)
      }
    }

    function onSignalTrigger (event) {
      var signal = signals[event.signal.name]
      if (signal) {
        event.signal.isSync = true
        event.signal.isRouted = true
      }
    }

    function onSignalStart (event) {
      if (Array.isArray(initialSignals)) {
        initialSignals.push(event.signal)
      }

      var signal = signals[event.signal.name]
      if (signal) {
        var route = signal.route
        var input = event.signal.input || {}
        addressbar.value = options.baseUrl + urlMapper.stringify(route, input)
      }
    }

    function onSignalEnd (event) {
      if (Array.isArray(initialSignals)) {
        initialSignals.splice(initialSignals.indexOf(event.signal), 1)

        if (initialSignals.length === 0) {
          controller.removeListener('signalEnd', onSignalEnd)
          initialSignals = null
          if (typeof rememberedUrl === 'undefined') setTimeout(onUrlChange)
        }
      }
    }

    function onModulesLoaded (event) {
      if (rememberedUrl) return
      if (Array.isArray(initialSignals) && initialSignals.length === 0) {
        setTimeout(onUrlChange)
        initialSignals = null
      }
    }

    var services = {
      trigger: function trigger (url) {
        addressbar.value = url || addressbar.value
        onUrlChange()
      },

      detach: function detach () {
        addressbar.removeListener('change', onUrlChange)
      },

      getUrl: function getUrl () {
        return addressbar.value.replace(addressbar.origin + options.baseUrl, '')
      },

      getSignalUrl: function getSignalUrl (signalName, input) {
        if (signals[signalName]) {
          var route = signals[signalName].route
          return options.baseUrl + urlMapper.stringify(route, input || {})
        } else {
          return false
        }
      },

      redirect: function redirect (url, params) {
        params = params || {}
        params.replace = (typeof params.replace === 'undefined') ? true : params.replace

        addressbar.value = {
          value: options.baseUrl + url,
          replace: params.replace
        }

        setTimeout(onUrlChange)
      },

      redirectToSignal: function redirectToSignal (signalName, payload) {
        var signal = get(signals, signalName)
        if (signal) {
          setTimeout(signal.signal.bind(null, payload))
        } else {
          console.warn('Cerebral router - signal ' + signalName + ' is not bound to route. Redirect wouldn\'t happen.')
        }
      }
    }

    module.alias(MODULE)
    module.services(services)
    addressbar.on('change', onUrlChange)
    controller.on('predefinedSignal', onPredefinedSignal)
    controller.on('signalTrigger', onSignalTrigger)
    controller.on('signalStart', onSignalStart)
    controller.on('signalEnd', onSignalEnd)
    if (!options.preventAutostart) controller.on('modulesLoaded', onModulesLoaded)
  }
}

Router.redirect = function (url, params) {
  function action (args) {
    var module = args.modules[MODULE]
    return module.services.redirect(url, params)
  }

  action.displayName = 'redirect(' + url + ')'

  return action
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

function getRoutableSignals (config, signals, getUrl) {
  var routableSignals = {}

  Object.keys(config).forEach(function (route) {
    var signal = get(signals, config[route])
    if (!signal) {
      throw new Error('Cerebral router - The signal "' + config[route] +
      '" for the route "' + route + '" does not exist. ' +
      'Make sure that ' + MODULE + 'loaded after all modules with routable signals.')
    }
    if (routableSignals[config[route]]) {
      throw new Error('Cerebral router - The signal "' + config[route] +
      '" has already been bound to route "' + route +
      '". Create a new signal and reuse actions instead if needed.')
    }
    signal.getUrl = getUrl.bind(null, route)
    routableSignals[config[route]] = {
      route: route,
      signal: signal
    }
  })

  return routableSignals
}
