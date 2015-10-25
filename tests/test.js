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

var createRouteTest = function (options) {

  var doesMatch = false;
  var controller = Controller(Model({}));
  var routerOptions = options.options;

  controller.signal('match', [function () {
    doesMatch = true;
  }]);

  var routes = {};
  routes[options.route] = 'match';

  if (options.initialUrl) {
    addressbar.value = options.initialUrl;
  } else {
    addressbar.value = '/';
  }

  var router = Router(controller, routes, options.options || {});

  return {
    matchUrl: function (match) {
      doesMatch = false;
      addressbar.emit('change', {
        preventDefault: function() {},
        target: {value: addressbar.origin + match}
      });
      return doesMatch;
    },
    runSignal: function (payload) {
      controller.signals.match.sync(payload);
    }
  }

};

// TESTS

module.exports = {

  setUp: function(cb){
    this.controller = Controller(Model({}));
    addressbar.value = '/';

    cb();
  },

  tearDown: function(cb) {
    // test must expose router to this.router
    this.router && this.router.detach();

    cb();
  },

  'should run signal synchronously': function(test) {
    this.controller.signal('test', [
      function checkAction() {
        test.ok(true);
      }
    ]);

    // async run before wrapping
    this.controller.signals.test();

    // sync run on trigger
    this.router = Router(this.controller, {
      '/': 'test'
    });
    this.router.trigger();

    // sync run after wrapping
    this.controller.signals.test();

    test.expect(2);
    test.done();
  },

  'should run nested signal': function(test) {
    this.controller.signal('test.test1.test2', [
      function checkAction() {
        test.ok(true);
      }
    ]);

    this.router = Router(this.controller, {
      '/': 'test.test1.test2'
    });
    this.router.trigger();

    test.expect(1);
    test.done();
  },

  'should match and pass route, params and query to input': function(test) {
    addressbar.value ='/test?foo=bar&bar=baz';
      this.controller.signal('test', [
        function checkAction(input) {
          test.deepEqual(input, {
            route: {
              url: '/test?foo=bar&bar=baz',
              path: '/test',
              params: { param: 'test' },
              query: { foo: "bar", bar: "baz" }
            },
            param: 'test'
          });
        }
      ]);

      this.router = Router(this.controller, {
        '/:param': 'test'
      });
      this.router.trigger();

      test.expect(1);
      test.done();
  },

  'should throw on missing signal': function(test) {
    test.throws(function () {
      Router(this.controller, {
        '/': 'test'
      });
    });

    test.done();
  },

  'should throw on duplicate signal': function(test) {
    this.controller.signal('test', [ function noop() {} ]);

    test.throws(function () {
      Router(this.controller, {
        '/': 'test',
        '/:test': 'test'
      });
    });

    test.done();
  },

  matching: {

    'full url': {

      '"/" route': function (test) {

        var routeTest = createRouteTest({
          route: '/'
        });

        test.equal(routeTest.matchUrl('/'), true);
        test.equal(routeTest.matchUrl('/?query'), true);
        test.equal(routeTest.matchUrl('/?server-query#hash?client-query'), true);

        test.equal(routeTest.matchUrl('/path'), false);
        test.equal(routeTest.matchUrl('/path?query'), false);
        test.equal(routeTest.matchUrl('/path/#'), false);

        test.done();

      },

      '"/test" route': function (test) {
        var routeTest = createRouteTest({
          route: '/test'
        });

        test.equal(routeTest.matchUrl('/test'), true);
        test.equal(routeTest.matchUrl('/test?query'), true);
        test.equal(routeTest.matchUrl('/test?server-query#hash?client-query'), true);

        test.equal(routeTest.matchUrl('/test/path'), false);
        test.equal(routeTest.matchUrl('/test/path/#'), false);

        test.done();
      },

      '"/test/test" route': function (test) {
        var routeTest = createRouteTest({
          route: '/test/test'
        });

        test.equal(routeTest.matchUrl('/test/test'), true);
        test.equal(routeTest.matchUrl('/test/test?query'), true);
        test.equal(routeTest.matchUrl('/test/test?server-query#hash?client-query'), true);

        test.equal(routeTest.matchUrl('/test/test/path'), false);
        test.equal(routeTest.matchUrl('/test/test/path/#'), false);

        test.done();
      },

      '"/:param" route': function (test) {
        var routeTest = createRouteTest({
          route: '/:param'
        });

        test.equal(routeTest.matchUrl('/param'), true);
        test.equal(routeTest.matchUrl('/param?query'), true);
        test.equal(routeTest.matchUrl('/param?server-query#hash?client-query'), true);

        test.equal(routeTest.matchUrl('/param/path'), false);
        test.equal(routeTest.matchUrl('/param/path/#'), false);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo'
          });
        });
        test.throws(function () {
          routeTest.runSignal({});
        });

        test.done();
      },

      '"/:param/:param2" route': function (test) {
        var routeTest = createRouteTest({
          route: '/:param/:param2'
        });

        test.equal(routeTest.matchUrl('/param/param2'), true);
        test.equal(routeTest.matchUrl('/param/param2?query'), true);
        test.equal(routeTest.matchUrl('/param/param2?server-query#hash?client-query'), true);

        test.equal(routeTest.matchUrl('/param/param2/path'), false);
        test.equal(routeTest.matchUrl('/param/param2/path/#'), false);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo',
            param2: 'bar'
          })
        });
        test.throws(function () {
          routeTest.runSignal({});
        });
        test.throws(function () {
          routeTest.runSignal({
            param: 'foo'
          });
        });

        test.done();
      },

      '"/*" route': function (test) {
        var routeTest = createRouteTest({
          route: '/*'
        });

        test.equal(routeTest.matchUrl('/test/test/test'), true);

        test.done();
      }

    },

    'with baseUrl option': {

      '"/" route': function (test) {

        var routeTest = createRouteTest({
          route: '/',
          options: {
            baseUrl: '/base'
          }
        });

        test.equal(routeTest.matchUrl('/base/'), true);
        test.equal(routeTest.matchUrl('/base/?query'), true);
        test.equal(routeTest.matchUrl('/base/?server-query#hash?client-query'), true);

        test.equal(routeTest.matchUrl('/'), false);
        test.equal(routeTest.matchUrl('/base/foo'), false);
        test.equal(routeTest.matchUrl('/#/'), false);
        test.equal(routeTest.matchUrl('/#/base2'), false);

        test.done();

      }

    },

    'with onlyHash option': {

      '"/" route': function (test) {
        var routeTest = createRouteTest({
          route: '/',
          options: {
            onlyHash: true
          }
        });

        test.equal(routeTest.matchUrl('/#/'), true);
        test.equal(routeTest.matchUrl('/#/?query'), true);
        test.equal(routeTest.matchUrl('/#/?server-query#hash?client-query'), true);

        test.equal(routeTest.matchUrl('/'), false);
        test.equal(routeTest.matchUrl('/#/path'), false);

        test.done();

      }

    },

    'with onlyHash option and baseUrl': {

      '"/" route': function (test) {
        var routeTest = createRouteTest({
          route: '/',
          options: {
            onlyHash: true,
            baseUrl: '/base'
          }
        });

        test.equal(routeTest.matchUrl('/base#/'), true);
        test.equal(routeTest.matchUrl('/base#/?client-query'), true);

        test.equal(routeTest.matchUrl('/'), false);
        test.equal(routeTest.matchUrl('/path'), false);
        test.equal(routeTest.matchUrl('/base/'), false);
        test.equal(routeTest.matchUrl('/base/#/'), false);

        test.done();
      }

    },

    'with onlyHash option and autodetected baseUrl': {

      '"/" route': function (test) {

        var routeTest = createRouteTest({
          route: '/',
          initialUrl: '/initial/',
          options: {
            onlyHash: true
          }
        });

        test.equal(routeTest.matchUrl('/initial/#/'), true);
        test.equal(routeTest.matchUrl('/initial/#/?client-query'), true);

        test.equal(routeTest.matchUrl('/'), false);
        test.equal(routeTest.matchUrl('/#/'), false);
        test.equal(routeTest.matchUrl('/#/initial'), false);

        test.done();

      }

    }

  }
};
