var urlMapper = require('url-mapper');
var addressbar = require('addressbar');
var pathToRegexp = require('path-to-regexp');

var wrappedRoutes = null;

function router (controller, routes, options) {

  routes = routes || {};
  options = options || {};

  if (!options.baseUrl && options.onlyHash) {
    // autodetect baseUrl
    options.baseUrl = addressbar.pathname.replace(/\/$/, "");
  }
  options.baseUrl = (options.baseUrl || '') + (options.onlyHash ? '/#' : '');

  router.options = options;

  var urlStorePath = options.urlStorePath || 'url';

  // action to inject
  function setUrl (input, state, output) {
    state.set(urlStorePath, input.route.url);
  }

  // Create url based on direct signal input
  function getUrl (route, input) {
    if (route === '*') {
      console.warn('Cerebral router - `*` catch all route definition is deprecated. Use `/*` to define catch all route instead');
      return options.onlyHash ? addressbar.hash.splice(1) : addressbar.pathname;
    } else {
      return pathToRegexp.compile(route)(input);
    }
  }

  wrappedRoutes = Object.keys(routes).reduce(function (wrappedRoutes, route) {

    var signalPath = routes[route].split('.');
    var signalParent = controller.signals;
    var signal;
    while(signalPath.length - 1) {
      signalParent = signalParent[signalPath.shift()];
    }
    signal = signalParent[signalPath];
    if(!signal) {
      throw new Error('Cerebral router - The signal "' + routes[route] + '" for the route "' + route + '" does not exist.');
    }

    if (typeof signal.getUrl === "function") {
      throw new Error('Cerebral router - The signal "' + routes[route] + '" has already been bound to route. Create a new signal and reuse actions instead if needed.');
    } else {
      signal.chain = [setUrl].concat(signal.chain);
    }

    function wrappedSignal() {

      var hasSync = arguments[0] === true;
      var input = hasSync ? arguments[1] : arguments[0] || {};
      if (!input.route) {
        input.route = {
          url: getUrl(route, input)
        };
      } else {
        var params = pathToRegexp(route).keys;

        // If called from a url change, add params to input
        if (input.route && input.route.params) {
          input = params.reduce(function (input, param) {
            input[param.name] = input.route.params[param.name];
            return input;
          }, input);
        }
      }

      // Should always run sync
      signal.apply(null, hasSync ? [arguments[0], input, arguments[2]] : [true, input, arguments[1]]);
    }

    // callback for urlMapper
    wrappedRoutes[route] = function(payload) {
      wrappedSignal({ route: payload });
    };

    signalParent[signalPath[0]] = wrappedSignal;

    wrappedSignal.sync = function(payload){
      wrappedSignal(true, payload);
    };

    wrappedSignal.getUrl = function(payload){
      var url = getUrl(route, payload);
      return options.baseUrl + url;
    };

    return wrappedRoutes;

  }, {});

  function stripUrl (url){
    // return stripped url only if it should be routed
    if (url.indexOf(addressbar.origin + router.options.baseUrl) === 0) {
      return url.replace(addressbar.origin + router.options.baseUrl, '');
    }
  }

  addressbar.on('change', function (event) {

    if (controller.store.isRemembering()) {
      return;
    }

    var url = stripUrl(event.target.value);
    if (url) {
      event.preventDefault();
      urlMapper(url, wrappedRoutes);
    }

  });

  router.trigger = function () {

    // If developing, remember signals before
    // route trigger
    if (controller.store.getSignals().length) {
      controller.store.rememberInitial(controller.store.getSignals().length - 1);
    }

    var url = stripUrl(addressbar.value);
    if (url) urlMapper(url, wrappedRoutes);

  };

  router.start = function () {
    console.warn('Cerebral debugger - `start` method is deprecated. Use `trigger` method instead');
    router.trigger();
  };

  controller.on('change', function () {

    var url = controller.get(urlStorePath) || '/';
    addressbar.value = options.baseUrl + url;

  });

  return router;

}

router.redirect = function (url, replace) {
  replace = (typeof replace === "undefined") ? true : replace;

  return function redirect () {
    var options = router.options;

    addressbar.value = {
      value: options.baseUrl + url,
      replace: true
    };

    urlMapper(url, wrappedRoutes);
  };

};

module.exports = router;
