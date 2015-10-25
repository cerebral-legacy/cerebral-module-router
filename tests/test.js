// MOCKING
global.window = {
  location: {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000/initial'
  }
};
global.history = {
  pushState: function(_, _, value) {
    window.location.href = window.location.origin + value;
  },
  replaceState: function(_, _, value) {
    window.location.href = window.location.origin + value;
  }
};
global.addEventListener = function () {};
global.document = {};

// SETUP
var Controller = require('cerebral');
var Model = require('cerebral-baobab');
var addressbar = require('addressbar');
var Router = require('./../index.js');

function triggerTestFactory(matchRoute, url, shouldMatch) {
  return function(test){
    // define signals for each route
    Object.keys(this.routes).forEach(function(route){
      this.controller.signal(this.routes[route], [
        function checkAction() {
          test.ok(shouldMatch?
            (matchRoute === route) :
            (matchRoute !== route)
          );
        }
      ]);
    }, this);

    this.router = Router(
      this.controller,
      this.routes,
      this.routerOptions
    );

    addressbar.value = url;
    this.router.trigger();

    test.done();
  }
}

function eventTestFactory(matchRoute, url, shouldMatch) {
  return function(test){
    // define signals for each route
    Object.keys(this.routes).forEach(function(route){
      this.controller.signal(this.routes[route], [
        function checkAction() {
          test.ok(shouldMatch?
            (matchRoute === route) :
            (matchRoute !== route)
          );
        }
      ]);
    }, this);

    this.router = Router(
      this.controller,
      this.routes,
      this.routerOptions
    );

    addressbar.emit('change', {
      preventDefault: function() {},
      target: { value: addressbar.origin + url }
    });

    test.done();
  }
}

function matchRouteTestFactory(matchRoute, shouldMatch, shouldMiss) {
  var tests = shouldMatch.reduce(function(tests, url){
    tests['should match ' + url + ' url by trigger call'] = triggerTestFactory(matchRoute, url, true);
    tests['should match ' + url + ' url by addressbar event'] = eventTestFactory(matchRoute, url, true);

    return tests;
  }, {});

  tests = shouldMiss.reduce(function(tests, url){
    tests['should miss ' + url + ' url by trigger call'] = triggerTestFactory(matchRoute, url, false);
    tests['should miss ' + url + ' url by addressbar event'] = eventTestFactory(matchRoute, url, false);

    return tests;
  }, tests);

  return tests;
}

// TESTS

module.exports = {
  setUp: function(cb){
    this.controller = Controller(Model({}));
    this.routes = {
      '/': 'root',
      '/test': 'test',
      '/test/test': 'testTest',
      '/:param': 'param',
      '/:param/:param2': 'param2',
      '/:regexp(\\w+)-test(-.*)': 'regexp',
      '/*': 'catchAll'
    }

    addressbar.value = '/';

    cb();
  },

  tearDown: function(cb) {
    this.router && this.router.detach();

    cb();
  },

  'full url': {
    setUp: function(cb) {
      this.routerOptions = {};

      cb();
    },

    '"/" route': matchRouteTestFactory(
      '/',
      [
        '/',
        '/?query',
        // '/#hash',
        // '/#hash?client-query',
        '/?server-query#hash?client-query'
      ],
      [
        '/path',
        '/path/#'
      ]
    ),

    '"/test" route': matchRouteTestFactory(
      '/test',
      [
        '/test',
        '/test?query',
        // '/test#hash',
        // '/test#hash?client-query',
        '/test?server-query#hash?client-query'
      ],
      [
        '/test/path',
        '/test/path/#'
      ]
    ),

    '"/test/test" route': matchRouteTestFactory(
      '/test/test',
      [
        '/test/test',
        '/test/test?query',
        // '/test/test#hash',
        // '/test/test#hash?client-query',
        '/test/test?server-query#hash?client-query'
      ],
      [
        '/test/test/path',
        '/test/test/path/#'
      ]
    ),

    '"/:param" route': matchRouteTestFactory(
      '/:param',
      [
        '/param',
        '/param?query',
        // '/param#hash',
        // '/param#hash?client-query',
        '/param?server-query#hash?client-query'
      ],
      [
        '/param/path',
        '/param/path/#'
      ]
    ),

    '"/:param/:param2" route': matchRouteTestFactory(
      '/:param/:param2',
      [
        '/param/param2',
        '/param/param2?query',
        // '/param/param2#hash',
        // '/param/param2#hash?client-query',
        '/param/param2?server-query#hash?client-query'
      ],
      [
        '/param/param2/path',
        '/param/param2/path/#'
      ]
    ),

    '"/*" route': matchRouteTestFactory(
      '/*',
      [
        '/test/test/test'
      ],
      []
    )
  },

  'with baseUrl option': {
    setUp: function(cb) {
      this.routerOptions = {
        baseUrl: '/base'
      };

      cb();
    },

    '"/" route': matchRouteTestFactory(
      '/',
      [
        '/base/',
        '/base/?query',
        // '/base/#hash',
        // '/base/#hash?client-query',
        '/base/?server-query#hash?client-query'
      ],
      [
        '/',
        '/base/foo',
        '/#/',
        '/#/base'
      ]
    )

  },

  'with onlyHash option': {
    setUp: function(cb) {
      this.routerOptions = {
        onlyHash: true
      };

      cb();
    },

    '"/" route': matchRouteTestFactory(
      '/',
      [
        '/#/',
        '/#/?client-query'
      ],
      [
        '/',
        '/#/path'
      ]
    )

  },

  'with onlyHash option and baseUrl': {
    setUp: function(cb) {
      this.routerOptions = {
        onlyHash: true,
        baseUrl: '/base'
      };

      cb();
    },

    '"/" route': matchRouteTestFactory(
      '/',
      [
        '/base#/',
        '/base#/?client-query'
      ],
      [
        '/',
        '/path',
        '/base/',
        '/base/#/'
      ]
    )

  },

  'with onlyHash option and autodetected baseUrl': {
    setUp: function(cb) {
      this.routerOptions = {
        onlyHash: true
      };

      addressbar.value = '/initial/';
      cb();
    },

    '"/" route': matchRouteTestFactory(
      '/',
      [
        '/initial/#/',
        '/initial/#/?client-query'
      ],
      [
        '/',
        '/#/',
        '/#/initial'
      ]
    )

  }
};

module.exports['api'] = function(test){
  test.expect(0);
  test.ok(true);
  test.expect(1);
  test.done();
}
