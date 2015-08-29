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

    wrappedRoutes[route] = function (input) {

      var params = route.match(/:.[^\/]*/g);
      var url = route;

      // Create url based on direct signal input or
      // params passed from addressbar
      if (params) {
        url = params.reduce(function (url, param) {
          return url.replace(param, (input.params || input)[param.substr(1, param.length)]);
        }, url);
      }
      
      addressbar.value = url;
      input.url = url;

      // If called from a url change, add params to input
      if (params && input.params) {
        input = params.reduce(function (input, param) {
          input[param] = input.params[param];
          return input;
        }, input);
      }
      signal(input);
    };

    return wrappedRoutes;

  }, {});

  addressbar.on('change', function (event) {
    if (!options.onlyHash || options.onlyHash && event.target.value.indexOf('#') >= 0) {
      event.preventDefault();
      urlMapper(event.target.value, wrappedRoutes);
    }
  });

  controller.on('change', function () {
    addressbar.value = controller.get('url');
  });

};
