var urlMapper = require('url-mapper');
var addressbar = require('addressbar');
var pathToRegexp = require('path-to-regexp');

var wrappedRoutes = null;

function router (controller, routes, options) {

  options = options || {};
  controller.services.router = router;

  if(!routes) {
    throw new Error('Cerebral router - Routes configuration wasn\'t provided.');
  }

  if (!options.baseUrl && options.onlyHash) {
    // autodetect baseUrl
    options.baseUrl = addressbar.pathname;
  }
  options.baseUrl = (options.baseUrl || '') + (options.onlyHash ? '#' : '');

  var urlStorePath = options.urlStorePath || 'url';

  // action to inject
  function setUrl (input, state, output) {
    state.set(urlStorePath, input.route.url);
  }

  // Create url based on direct signal input
  function getUrl (route, input) {
    return pathToRegexp.compile(route)(input);
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
      var input = hasSync ? arguments[1] || {} : arguments[0] || {};

      if (!input.route) {
        input.route = {
          url: getUrl(route, input)
        };
      } else {
        // If called from a url change, add params to input
        var params = pathToRegexp(route).keys;

        input = params.reduce(function (input, param) {
          input[param.name] = input.route.params[param.name];
          return input;
        }, input);
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

  function onAddressbarChange(event) {

    var matchedRoute;
    var url = event.target.value.replace(addressbar.origin, '');

    if (options.onlyHash && !~url.indexOf('#')) {
      // treat hash absense as root route
      url = url + '#/';
    }

    if (controller.store.isRemembering()) {
      return;
    }

    // check if url should be routed
    if (url.indexOf(options.baseUrl) === 0) {
      event.preventDefault();
      matchedRoute = urlMapper(url.replace(options.baseUrl, ''), wrappedRoutes);

      if (!matchedRoute) {
        console.warn('Cerebral router - No route matched "' + url + '" url, navigation was prevented. ' +
                     'Please verify url or catch unmatched routes with a "/*" route.');
      }
    }

  }

  function onControllerChange() {

    var url = controller.get(urlStorePath);
    if (url) addressbar.value = options.baseUrl + url;

  }

  router.trigger = function () {

    // If developing, remember signals before
    // route trigger
    if (controller.store.getSignals().length) {
      controller.store.rememberInitial(controller.store.getSignals().length - 1);
    }

    onAddressbarChange({
      preventDefault: function () {},
      target: {value: addressbar.value}
    });

  };

  router.detach = function(){
    addressbar.removeListener('change', onAddressbarChange);
    controller.removeListener('change', onControllerChange);
  };

  router.redirect = function(url, params) {

    params = params || {};
    params.replace = (typeof params.replace === "undefined") ? true : params.replace;

    addressbar.value = {
      value: options.baseUrl + url,
      replace: params.replace
    };

    urlMapper(url, wrappedRoutes);

  };

  addressbar.on('change', onAddressbarChange);
  controller.on('change', onControllerChange);

  return router;

}

module.exports = router;
