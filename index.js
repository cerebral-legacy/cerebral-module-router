var urlMapper = require('url-mapper');
var addressbar = require('addressbar');

function setUrl (input, state) {
  state.set('url', input.url);
}

module.exports = function (controller, routes, options) {

  routes = routes || {};
  options = options || {};

  var wrappedRoutes = Object.keys(routes).reduce(function (wrappedRoutes, route) {

    var signal = controller.signals[routes[route]];

    if (signal.chain[0] !== setUrl) {
      signal.chain.unshift(setUrl);
    }

    controller.signals[routes[route]] = wrappedRoutes[route] = function (input) {

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

      url = options.onlyHash ? '/#' + url : url;
      addressbar.value = input.params ? location.href : location.origin + url;
      input.url = url;

      // If called from a url change, add params and query to input
      if (params && input.params) {
        input = params.reduce(function (input, param) {
          var key = param.substr(1, param.length);
          input[key] = input.params[key];
          return input;
        }, input);
      }
      signal(input);
    };

    return wrappedRoutes;

  }, {});

  addressbar.on('change', function (event) {
    if (!options.onlyHash || (options.onlyHash && event.target.value.indexOf('#') >= 0)) {
      event.preventDefault();
      urlMapper(event.target.value, wrappedRoutes);
    }
  });

  controller.on('change', function () {
    addressbar.value = controller.get('url');
  });

};
