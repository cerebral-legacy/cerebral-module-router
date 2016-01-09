var Mapper = require('url-mapper');
var addressbar;
try {
  addressbar = require('addressbar');
} catch(e) {
  addressbar = {
    pathname: '/',
    value: '',
    origin: '',
    on: function(){},
    removeListener: function(){}
  };
}

function router (controller, routesConfig, options) {

  options = options || {};

  if(!routesConfig) {
    throw new Error('Cerebral router - Routes configuration wasn\'t provided.');
  }

  if (!options.baseUrl && options.onlyHash) {
    // autodetect baseUrl
    options.baseUrl = addressbar.pathname;
  }
  options.baseUrl = (options.baseUrl || '') + (options.onlyHash ? '#' : '');

  var urlMapper = Mapper(options.mapper);

  // prepare routes for url-mapper
  // flatten routes and use actual signal for match
  var routes = Object.keys(routesConfig)
    .map(function(route){
      return {
        route: route,
        signalName: routesConfig[route]
      };
    })
    .reduce(function wrapRoutes(routes, route) {

      // recursive call for nested definition
      if (typeof route.signalName === 'object') {
        Object.keys(route.signalName).reduce(function(routes, nestedRoute) {
          nestedRoute = {
            route: route.route + nestedRoute,
            signalName: route.signalName[nestedRoute]
          };

          return wrapRoutes(routes, nestedRoute);
        }, routes);

        return routes;
      }

      // retrieve actual signal by name
      var signalPath = route.signalName.split('.');
      var signalParent = controller.getSignals();
      var signal;
      while(signalPath.length - 1) {
        signalParent = signalParent[signalPath.shift()] || {};
      }
      signal = signalParent[signalPath];
      if(typeof signal !== "function") {
        throw new Error('Cerebral router - The signal "' + route.signalName + '" for the route "' + route.route + '" does not exist.');
      }

      if (typeof signal.getUrl === "function") {
        throw new Error('Cerebral router - The signal "' + route.signalName + '" has already been bound to route. Create a new signal and reuse actions instead if needed.');
      }

      // Create url based on direct signal input
      function getUrl (input) {
        return options.baseUrl + urlMapper.stringify(route.route, input || {});
      }

      function wrappedSignal(payload, signalOptions) {
        addressbar.value = getUrl(payload);

        signalOptions = signalOptions || {};

        // Should always run sync
        signalOptions.isSync = true;
        signal(payload, signalOptions);
      }

      // expose method for restoring url from params
      wrappedSignal.getUrl = getUrl;

      // pass wrapped signal to url-mapper routes
      routes[route.route] = wrappedSignal;

      // replace signal on wrapped one in controller
      signalParent[signalPath[0]] = wrappedSignal.sync = wrappedSignal;

      return routes;

  }, {});

  function onUrlChange(event) {

    var matchedRoute;
    var url = event ? event.target.value : addressbar.value;
    url = url.replace(addressbar.origin, '');

    if (options.onlyHash && !~url.indexOf('#')) {
      // treat hash absense as root route
      url = url + '#/';
    }

    if (controller.getStore().isRemembering()) {
      return;
    }

    // check if url should be routed
    if (url.indexOf(options.baseUrl) === 0) {
      event && event.preventDefault();
      matchedRoute = urlMapper.map(url.replace(options.baseUrl, ''), routes);

      if (matchedRoute) {
        matchedRoute.match(matchedRoute.values);
      } else {
        console.warn('Cerebral router - No route matched "' + url + '" url, navigation was prevented. ' +
                     'Please verify url or catch unmatched routes with a "/*" route.');
      }
    }

  }

  addressbar.on('change', onUrlChange);

  // auto expose router instance to services
  return controller.getServices().router = {
    trigger: function (url) {

      // If developing, remember signals before
      // route trigger
      if (controller.getStore().getSignals().length) {
        controller.getStore().rememberInitial(controller.getStore().getSignals().length - 1);
      }

      addressbar.value = url || addressbar.value;
      onUrlChange();

    },

    redirect: function(url, params) {

      params = params || {};
      params.replace = (typeof params.replace === "undefined") ? true : params.replace;

      addressbar.value = {
        value: options.baseUrl + url,
        replace: params.replace
      };

      onUrlChange();

    },

    getUrl: function() {
      return addressbar.value.replace(addressbar.origin + options.baseUrl, '');
    },

    detach: function(){
      addressbar.removeListener('change', onUrlChange);
    }
  };

}

router.redirect = function(url, params) {

  function action(arg) {
    return arg.services.router.redirect(url, params);
  }

  action.displayName = 'redirect(' + url + ')';

  return action;
};

module.exports = router;
