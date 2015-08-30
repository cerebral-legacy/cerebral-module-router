var urlMapper = require('url-mapper');
var addressbar = require('addressbar');

var wrappedRoutes = null;

var router = function (controller, routes, options) {

  routes = routes || {};
  options = options || {};

  var urlStorePath = options.urlStorePath || 'url';

  function setUrl (input, state, output) {
    state.set(urlStorePath, input.url);
  }

  wrappedRoutes = Object.keys(routes).reduce(function (wrappedRoutes, route) {


    var signal = controller.signals[routes[route]];

    // In case already wrapped
    if (signal.signal) {
      signal = signal.signal;
    }

    // Might already be wrapped
    if (signal.chain[0] !== setUrl) {
      signal.chain = [setUrl].concat(signal.chain);
    }

    controller.signals[routes[route]] = wrappedRoutes[route] = function () {

      var isSync = arguments[0] === true;
      var input = isSync ? arguments[1] : arguments[0] || {};
      var params = route.match(/:.[^\/]*/g);
      var url = route;

      // Create url based on direct signal input or
      // params passed from addressbar
      if (params) {
        url = params.reduce(function (url, param) {
          var key = param.substr(1, param.length);
          return url.replace(param, (input.params || input)[key]);
        }, url);
      }

      url = url === '.*' ? location.href : url;
      url = options.onlyHash && url.indexOf('#') === -1 ? '/#' + url : url;
      input.url = url;

      // If called from a url change, add params and query to input
      if (params && input.params) {
        input = params.reduce(function (input, param) {
          var key = param.substr(1, param.length);
          input[key] = input.params[key];
          return input;
        }, input);
      }
      // TODO: Should run sync on first route
      signal.apply(null, isSync ? [arguments[0], input, arguments[2]] : [input, arguments[1]]);
    };

    // Keep the signal reference in case more routes uses same signal
    controller.signals[routes[route]].signal = signal;

    return wrappedRoutes;

  }, {});

  addressbar.on('change', function (event) {

    if (controller.store.isRemembering()) {
      return;
    }

    if (!options.onlyHash || (options.onlyHash && event.target.value.indexOf('#') >= 0)) {
      event.preventDefault();
      urlMapper(event.target.value, wrappedRoutes);
    }

  });

  controller.on('change', function () {
    addressbar.value = controller.get(urlStorePath);
  });

  return router;

};

router.start = function () {

  urlMapper(location.href, wrappedRoutes);

};

module.exports = router;
