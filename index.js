var urlMapper = require('url-mapper');
var addressbar = require('addressbar');
var location = window.history.location || window.location;

if (!location.origin) {
  location.origin = location.protocol + "//" + location.hostname + (location.port ? ':' + location.port: '');
}

var wrappedRoutes = null;

function router (controller, routes, options) {

  routes = routes || {};
  options = options || {};
  router.controller = controller;
  router.options = options;

  var urlStorePath = options.urlStorePath || 'url';

  function setUrl (input, state, output) {
    state.set(urlStorePath, input.route.url);
  }

  wrappedRoutes = Object.keys(routes).reduce(function (wrappedRoutes, route) {

    var signalPath = routes[route].split('.');
    var signal = controller.signals;
    while(signalPath.length) {
      signal = signal[signalPath.shift()];
      if(!signal) {
        throw new Error('Cerebral router - The signal "' + routes[route] + '" for the route "' + route + '" does not exist.');
      }
    }

    if (signal.name === 'wrappedSignal') {
      throw new Error('Cerebral router - The signal "' + routes[route] + '" has already been bound to route. Create a new signal and reuse actions instead if needed.');
    } else {
      signal.chain = [setUrl].concat(signal.chain);
    }

    controller.signals[routes[route]] = wrappedRoutes[route] = function wrappedSignal() {

      var hasSync = arguments[0] === true;
      var payload = hasSync ? arguments[1] : arguments[0] || {};

      var input = payload;
      input.route = {
        url: payload.url,
        path: payload.path,
        params: payload.params,
        query: payload.query
      };
      delete input.url;
      delete input.path;
      delete input.params;
      delete input.query;

      var params = route.match(/:.[^\/]*/g);
      var url = route;

      if (params) {
        // If called from a url change, add params and query to input
        if (input.route.params) {
          input = params.reduce(function (input, param) {
            var key = param.substr(1, param.length);
            input[key] = input.route.params[key];
            return input;
          }, input);
        }

        // Create url based on direct signal input or
        // params passed from addressbar
        url = params.reduce(function (url, param) {
          var key = param.substr(1, param.length);
          if (!(key in input)) {
            throw new Error('Cerebral router - The signal "' + routes[route] + '" is bound to "' + route + '" route, but required param "' + key + '" wasn\'t provided.');
          }
          return url.replace(param, input[key] || '');
        }, url);

        // Check resulted url still matches given route
        var urlMatched = false;
        var checkRoute = {};

        checkRoute[route] = function () {
          urlMatched = true;
        };

        urlMapper(url, checkRoute);

        if (!urlMatched) {
          throw new Error('Cerebral router - Computed url for signal "' + routes[route] +'" can\'t match given route "' + route + '".\n' +
                          'Check required params provided to signal is not falsy.');
        }
      }

      url = url === '*' ? location.pathname : url;
      url = options.onlyHash && url.indexOf('#') === -1 ? '/#' + url : url;
      input.route.url = options.baseUrl && url.substr(0, options.baseUrl.length) === options.baseUrl ? url.replace(options.baseUrl, '') : url;

      // Should always run sync
      signal.apply(null, hasSync ? [arguments[0], input, arguments[2]] : [true, input, arguments[1]]);
    };

    return wrappedRoutes;

  }, {});

  addressbar.on('change', function (event) {

    if (controller.store.isRemembering()) {
      return;
    }

    if (!options.onlyHash || event.target.value === location.origin + '/' || (options.onlyHash && event.target.value.indexOf('#') >= 0)) {
      event.preventDefault();
      var url = event.target.value.replace(location.origin, '');
      url = options.baseUrl && url.substr(0, options.baseUrl.length) === options.baseUrl ? url.replace(options.baseUrl, '') : url;
      urlMapper(url, wrappedRoutes);
    }

  });

  controller.on('change', function () {
    var url = controller.get(urlStorePath) || (options.onlyHash ? '/#/' : '/');
    addressbar.value = options.baseUrl ? options.baseUrl + url : url;
  });

  return router;

};

router.start = router.trigger = function () {

  var controller = router.controller;
  var options = router.options;

  // If developing, remember signals before
  // route trigger
  if (controller.store.getSignals().length) {
    controller.store.rememberInitial(controller.store.getSignals().length - 1);
  }

  var url = location.href.replace(location.origin, '');
  url = options.baseUrl && url.substr(0, options.baseUrl.length) === options.baseUrl ? url.replace(options.baseUrl, '') : url;
  urlMapper(url, wrappedRoutes);

};

router.redirect = function (route) {
  return function redirect () {
    urlMapper(route, wrappedRoutes);
  }
};

module.exports = router;
