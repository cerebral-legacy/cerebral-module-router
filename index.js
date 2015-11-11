var urlMapper = require('url-mapper');
var addressbar = require('addressbar');
var pathToRegexp = require('path-to-regexp');

function router (controller, routes, options) {

  options = options || {};

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

  var wrappedRoutes = Object.keys(routes)
    .map(function(route){
      return {
        path: route,
        signal: routes[route]
      };
    })
    .reduce(function wrapRoutes(wrappedRoutes, route) {

      if (typeof route.signal === 'object') {
        Object.keys(route.signal).reduce(function(wrappedRoutes, nestedRoute) {
          nestedRoute = {
            path: route.path + nestedRoute,
            signal: route.signal[nestedRoute]
          };

          return wrapRoutes(wrappedRoutes, nestedRoute);
        }, wrappedRoutes);

        return wrappedRoutes;
      }

      var signalPath = route.signal.split('.');
      var signalParent = controller.signals;
      var signal;
      while(signalPath.length - 1) {
        signalParent = signalParent[signalPath.shift()] || {};
      }
      signal = signalParent[signalPath];
      if(typeof signal !== "function") {
        throw new Error('Cerebral router - The signal "' + route.signal + '" for the route "' + route.path + '" does not exist.');
      }

      if (typeof signal.getUrl === "function") {
        throw new Error('Cerebral router - The signal "' + route.signal + '" has already been bound to route. Create a new signal and reuse actions instead if needed.');
      } else {
        signal.chain = [setUrl].concat(signal.chain);
      }

      function wrappedSignal(payload, options) {

        var input = payload || {};
        options = options || {};
        options.isSync = true;

        if (!input.route) {
          input.route = {
            url: getUrl(route.path, input)
          };
        } else {
          // If called from a url change, add params to input
          var params = pathToRegexp(route.path).keys;

          input = params.reduce(function (input, param) {
            input[param.name] = input.route.params[param.name];
            return input;
          }, input);
        }

        // Should always run sync
        signal(input, options);
      }

      // callback for urlMapper
      wrappedRoutes[route.path] = function(payload) {
        wrappedSignal({ route: payload });
      };

      signalParent[signalPath[0]] = wrappedSignal;

      wrappedSignal.sync = function(payload){
        wrappedSignal(payload, {isSync: true});
      };

      wrappedSignal.getUrl = function(payload){
        var url = getUrl(route.path, payload);
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

  addressbar.on('change', onAddressbarChange);
  controller.on('change', onControllerChange);

  return controller.services.router = {
    trigger: function () {

      // If developing, remember signals before
      // route trigger
      if (controller.store.getSignals().length) {
        controller.store.rememberInitial(controller.store.getSignals().length - 1);
      }

      onAddressbarChange({
        preventDefault: function () {},
        target: {value: addressbar.value}
      });

    },

    redirect: function(url, params) {

      params = params || {};
      params.replace = (typeof params.replace === "undefined") ? true : params.replace;

      addressbar.value = {
        value: options.baseUrl + url,
        replace: params.replace
      };

      urlMapper(url, wrappedRoutes);

    },

    getUrl: function() {
      return controller.get(urlStorePath);
    },

    detach: function(){
      addressbar.removeListener('change', onAddressbarChange);
      controller.removeListener('change', onControllerChange);
    }
  };

}

router.redirect = function(url, params) {

  function action(input, state, output, services) {
    return services.router.redirect(url, params);
  }

  action.displayName = 'redirect(' + url + ')';

  return action;
};

module.exports = router;
