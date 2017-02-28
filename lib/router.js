var utils = require('./utils')

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

  if (!options.mapper || typeof options.mapper.map !== 'function') {
    throw new Error('Cerebral router - mapper option must be provided.')
  }

  if (!routesConfig) {
    console.warn('Cerebral router - Routes configuration wasn\'t provided.')
    return function () {}
  } else {
    routesConfig = utils.flattenConfig(routesConfig)
  }

  if (!options.baseUrl && options.onlyHash) {
    // autodetect baseUrl
    options.baseUrl = addressbar.pathname
  }
  options.baseUrl = (options.baseUrl || '') + (options.onlyHash ? '#' : '')

  return function init (module, controller) {
    var signals = utils.getRoutableSignals(routesConfig, controller.getSignals())
    var rememberedUrl
    var initialSignals

    function setRememberedUrl () {
      addressbar.value = rememberedUrl
      rememberedUrl = null
    }

    function onUrlChange (event, forceImmediate) {
      var url = event ? event.target.value : addressbar.value
      url = url.replace(addressbar.origin, '')

      if (options.onlyHash && !~url.indexOf('#')) {
        // treat hash absense as root route
        url = url + '#/'
      }

      // check if url should be routed
      if (url.indexOf(options.baseUrl) === 0) {
        var map = options.mapper.map(url.replace(options.baseUrl, ''), routesConfig)

        if (map) {
          event && event.preventDefault()
          addressbar.value = url

          if (forceImmediate === true) {
            signals[map.match].signal(map.values, {
              isRouted: true,
              immediate: true
            })
          } else {
            signals[map.match].signal(map.values, {
              isRouted: true
            })
          }
        } else {
          if (options.allowEscape) return

          event && event.preventDefault()
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
        var input = event.signal.input || event.payload || {}
        rememberedUrl = options.baseUrl + options.mapper.stringify(route, input)
      }
    }

    function onSignalStart (event) {
      if (Array.isArray(initialSignals)) {
        initialSignals.push(event.signal)
      }

      var signal = signals[event.signal.name]
      if (signal && (!event.signal.isRouted && !(event.options && event.options.isRouted))) {
        var route = signal.route
        var input = event.signal.input || event.payload || {}
        addressbar.value = options.baseUrl + options.mapper.stringify(route, input)
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
        initialSignals = null
        onUrlChange(null, true)
      }
    }

    var services = {
      trigger: function trigger (url) {
        if (url) addressbar.value = url
        onUrlChange()
      },

      detach: function detach () {
        addressbar.removeListener('change', onUrlChange)
      },

      getUrl: function getUrl () {
        return addressbar.value.replace(addressbar.origin + options.baseUrl, '')
      },

      getMatchedRoute: function getMatchedRoute () {
        var map = options.mapper.map(addressbar.value.replace(addressbar.origin + options.baseUrl, ''), routesConfig)
        return {
          route: map.route,
          signal: map.match,
          params: map.values
        }
      },

      getSignalUrl: function getSignalUrl (signalName, input) {
        if (signals[signalName]) {
          var route = signals[signalName].route
          return options.baseUrl + options.mapper.stringify(route, input || {})
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
        var signal = signals[signalName]
        if (signal) {
          setTimeout(signal.signal.bind(null, payload))
        } else {
          console.warn('Cerebral router - signal ' + signalName + ' is not bound to route. Redirect wouldn\'t happen.')
        }
      }
    }

    module.alias(utils.MODULE)
    module.addServices(services)
    addressbar.on('change', onUrlChange)
    controller.on('predefinedSignal', onPredefinedSignal)
    controller.on('signalStart', onSignalStart)

    if (!options.preventAutostart) {
      initialSignals = []
      controller.on('signalEnd', onSignalEnd)
      controller.on('modulesLoaded', onModulesLoaded)
    }

    var context = {}
    context[utils.MODULE] = {
      path: module.path
    }
    controller.addContextProvider(context)
  }
}
