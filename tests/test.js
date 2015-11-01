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
    window.location.lastChangedWith = 'pushState';
  },
  replaceState: function(_, _, value) {
    window.location.href = window.location.origin + value;
    window.location.lastChangedWith = 'replaceState';
  }
};
global.addEventListener = function () {};
global.document = {};

// SETUP
var Controller = require('cerebral');
var Model = require('cerebral-baobab');
var addressbar = require('addressbar');
var Router = require('./../index.js');

// TESTS
module.exports = {

  setUp: function(cb){

    var controller = this.controller = Controller(Model({}));
    addressbar.value = '/';

    this.createRouteTest = function createRouteTest(options) {

      if (this.router) {
        throw new Error("Router instance must be detached by `tearDown` script. Do not call `createRouteTest` twice inside one test.");
      }

      var doesMatch = false;
      var defaultPrevented = false;
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

      var router = this.router = Router(controller, routes, options.options || {});

      return {
        emit: function (url) {
          doesMatch = false;
          defaultPrevented = false;
          addressbar.emit('change', {
            preventDefault: function() {
              defaultPrevented = true;
            },
            target: {value: addressbar.origin + url}
          });
          // secure preventing default link href navigation
          // matched and prevented => true
          // missed and not prevented => false
          // missed and prevente => 'prevented'
          return (doesMatch === defaultPrevented) ? doesMatch : 'prevented';
        },
        runSignal: function (payload) {
          controller.signals.match(payload);
        }
      }

    };

    this.warn = console.warn;
    console.warn = (function(message) {
      this.warnMessage = message;
    }).bind(this);

    cb();
  },

  tearDown: function(cb) {

    // test must expose router to this.router
    this.router && this.router.detach();
    delete window.location.lastChangedWith;

    console.warn = this.warn;

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

  'should match and pass route, params, hash and query to input': function(test) {

    addressbar.value ='/test?foo=bar&bar=baz#hash';
      this.controller.signal('test', [
        function checkAction(input) {
          test.deepEqual(input, {
            route: {
              url: '/test?foo=bar&bar=baz#hash',
              path: '/test',
              hash: 'hash',
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

  'should throw on missing routes': function(test) {

    var controller = this.controller;

    test.throws(function () {
      Router(controller);
    });

    test.done();
  },

  'should throw on missing signal': function(test) {

    var controller = this.controller;

    test.throws(function () {
      Router(controller, {
        '/': 'test'
      });
    });

    test.done();
  },

  'should throw on duplicate signal': function(test) {

    var controller = this.controller;
    this.controller.signal('test', [ function noop() {} ]);

    test.throws(function () {
      Router(controller, {
        '/': 'test',
        '/:test': 'test'
      });
    });

    test.done();
  },

  'should set url into store': function (test) {

    this.controller.signal('test', [ function noop() {} ]);

    this.router = Router(this.controller, {
      '/': 'test'
    });
    this.router.trigger();

    test.equals(this.controller.get(['url']), '/');
    test.done();
  },

  'should set url into store at custom path': function (test) {

    this.controller.signal('test', [ function noop() {} ]);

    this.router = Router(this.controller, {
      '/': 'test'
    }, {
      urlStorePath: ['nested', 'path', 'to', 'url']
    });
    this.router.trigger();

    test.equals(this.controller.get(['nested', 'path', 'to', 'url']), '/');
    test.done();
  },

  'should preserve sync method for wrapped signal': function (test) {

    var controller = this.controller;

    this.createRouteTest({
      route: '/:param'
    });

    test.doesNotThrow(function() {
      controller.signals.match.sync({ param: 'test' });
    });
    test.throws(function() {
      controller.signals.match.sync();
    });
    test.done();
  },

  'should expose `getUrl` method for wrapped signal': function (test) {

    this.createRouteTest({
      route: '/:param',
      options: {
        baseUrl: '/test',
        onlyHash: true
      }
    });

    test.equals(this.controller.signals.match.getUrl({ param: 'test' }), '/test#/test');
    test.done();
  },

  'should not change url for regular signal call': function (test) {

    this.controller.signal('test', [
      function (input, store) {
        store.set(['foo'], 'bar');
      }
    ]);

    this.createRouteTest({
      route: '/test',
      initialUrl: '/initial'
    });

    this.controller.signals.test.sync();

    test.equals(addressbar.pathname, '/initial');
    test.done();
  },

  'should replaceState on redirect by default':  function (test) {

    this.controller.signal('existing', [
      function checkAction(input) { test.ok(true); }
    ]);
    this.controller.signal('missing', [
      function checkAction(input, state, output, services) {
        services.router.redirect('/existing');
      }
    ]);

    this.router = Router(this.controller, {
      '/existing': 'existing',
      '/*': 'missing'
    });
    this.router.trigger();

    test.equals(addressbar.pathname, '/existing');
    test.equals(window.location.lastChangedWith, 'replaceState');
    test.done();
  },

  'should allow pushState on redirect':  function (test) {

    this.controller.signal('existing', [
      function checkAction(input) { test.ok(true); }
    ]);
    this.controller.signal('missing', [
      function checkAction(input, state, output, services) {
        services.router.redirect('/existing', {replace: false});
      }
    ]);

    this.router = Router(this.controller, {
      '/existing': 'existing',
      '/*': 'missing'
    });
    this.router.trigger();

    test.equals(addressbar.pathname, '/existing');
    test.equals(window.location.lastChangedWith, 'pushState');
    test.done();
  },

  'should remember while developing': function(test) {

    this.controller.signal('test', [
      function checkAction(input) { test.ok(true); }
    ]);

    this.router = Router(this.controller, {
      '/test': 'test'
    });

    this.controller.signals.test();
    addressbar.value = '/';

    this.router.trigger();
    test.equals(addressbar.pathname, '/test');

    test.done();
  },

  'should warn if navigation prevented': function(test) {

      var routeTest = this.createRouteTest({
        route: '/',
        options: {
          baseUrl: '/base'
        }
      });

      test.equal(routeTest.emit('/missing'), false);
      test.equal(this.warnMessage, undefined);

      test.equal(routeTest.emit('/base/missing'), 'prevented');
      test.equal(this.warnMessage.indexOf('prevented') >= 0, true);

      test.done();
  },

  matching: {

    'full url': {

      'root route': function (test) {

        var routeTest = this.createRouteTest({
          route: '/'
        });

        test.equal(routeTest.emit('/'), true);
        test.equal(routeTest.emit('/?query'), true);
        test.equal(routeTest.emit('/#hash'), true);
        test.equal(routeTest.emit('/?query#hash'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            foo: 'bar'
          })
        });

        test.doesNotThrow(function () {
          routeTest.runSignal();
        });

        test.equal(routeTest.emit('/path'), 'prevented');
        test.equal(routeTest.emit('/path?query'), 'prevented');
        test.equal(routeTest.emit('/path/#/'), 'prevented');

        test.done();

      },

      'simple route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/foo'
        });

        test.equal(routeTest.emit('/foo'), true);
        test.equal(routeTest.emit('/foo?query'), true);
        test.equal(routeTest.emit('/foo#hash'), true);
        test.equal(routeTest.emit('/foo?query#hash'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            foo: 'bar'
          })
        });

        test.doesNotThrow(function () {
          routeTest.runSignal();
        });

        test.equal(routeTest.emit('/'), 'prevented');
        test.equal(routeTest.emit('/bar/foo'), 'prevented');
        test.equal(routeTest.emit('/bar#/foo'), 'prevented');

        test.done();
      },

      'deep route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/foo/bar/baz/42'
        });

        test.equal(routeTest.emit('/foo/bar/baz/42'), true);
        test.equal(routeTest.emit('/foo/bar/baz/42?query'), true);
        test.equal(routeTest.emit('/foo/bar/baz/42?#hash'), true);
        test.equal(routeTest.emit('/foo/bar/baz/42??query#hash'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            foo: 'bar'
          })
        });

        test.doesNotThrow(function () {
          routeTest.runSignal();
        });

        test.equal(routeTest.emit('/foo/bar/baz/'), 'prevented');
        test.equal(routeTest.emit('/foo/bar/baz/43'), 'prevented');
        test.equal(routeTest.emit('/foo/bar/baz/42/foo'), 'prevented');
        test.equal(routeTest.emit('/#/foo/bar/baz/42'), 'prevented');

        test.done();
      },

      'params route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/:param'
        });

        test.equal(routeTest.emit('/foo'), true);
        test.equal(routeTest.emit('/bar'), true);
        test.equal(routeTest.emit('/foo?query'), true);
        test.equal(routeTest.emit('/foo?#hash'), true);
        test.equal(routeTest.emit('/foo?query#hash'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo'
          });
        });
        test.throws(function () {
          routeTest.runSignal({});
        });

        test.equal(routeTest.emit('/foo/bar'), 'prevented');
        test.equal(routeTest.emit('/#/foo'), 'prevented');

        test.done();
      },

      'several params route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/:param/:param2'
        });

        test.equal(routeTest.emit('/foo/bar'), true);
        test.equal(routeTest.emit('/foo/bar?query'), true);
        test.equal(routeTest.emit('/foo/bar#hash'), true);
        test.equal(routeTest.emit('/foo/bar?query#hash'), true);

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

        test.equal(routeTest.emit('/foo/bar/baz'), 'prevented');
        test.equal(routeTest.emit('/#/foo/bar'), 'prevented');

        test.done();
      },

      'regexp route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/:param([\\w+-?]+)-test/:param2(\\d+)'
        });

        test.equal(routeTest.emit('/foo-test/42'), true);
        test.equal(routeTest.emit('/foo-bar-test/42'), true);
        test.equal(routeTest.emit('/foo-test/42?query'), true);
        test.equal(routeTest.emit('/foo-test/42#hash'), true);
        test.equal(routeTest.emit('/foo-test/42?query#hash'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo',
            param2: 42
          })
        });
        test.throws(function () {
          routeTest.runSignal({});
        });
        test.throws(function () {
          routeTest.runSignal({
            param: 'foo',
            param2: 'bar'
          });
        });

        test.equal(routeTest.emit('/footest/42'), 'prevented');
        test.equal(routeTest.emit('/foo-test/bar'), 'prevented');
        test.equal(routeTest.emit('/#/foo-test/42'), 'prevented');

        test.done();
      },

      'catch all route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/*'
        });

        test.equal(routeTest.emit('/'), true);
        test.equal(routeTest.emit('/foo'), true);
        test.equal(routeTest.emit('/foo/bar/baz'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            '0': 'bar'
          });
        });

        test.throws(function () {
          routeTest.runSignal();
        });

        test.done();
      },

    },

    'with baseUrl option': {

      'root route': function (test) {

        var routeTest = this.createRouteTest({
          route: '/',
          options: {
            baseUrl: '/base'
          }
        });

        test.equal(routeTest.emit('/base'), true);
        test.equal(routeTest.emit('/base?query'), true);
        test.equal(routeTest.emit('/base#hash'), true);
        test.equal(routeTest.emit('/base?query#hash'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo'
          });
        });
        test.doesNotThrow(function () {
          routeTest.runSignal({});
        });

        test.equal(routeTest.emit('/'), false);
        test.equal(routeTest.emit('/base/foo'), 'prevented');
        test.equal(routeTest.emit('/#/'), false);
        test.equal(routeTest.emit('/#/base/'), false);

        test.done();

      }

    },

    'with onlyHash option': {

      'root route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/',
          options: {
            onlyHash: true
          }
        });

        test.equal(routeTest.emit('/#/'), true);
        test.equal(routeTest.emit('/#/?query'), true);
        test.equal(routeTest.emit('/#/#hash'), true);
        test.equal(routeTest.emit('/#/?query#hash'), true);
        // treat hash absense as root route
        test.equal(routeTest.emit('/'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo'
          });
        });
        test.doesNotThrow(function () {
          routeTest.runSignal({});
        });

        test.equal(routeTest.emit('/#/foo'), 'prevented');
        test.equal(routeTest.emit('/foo#/'), false);

        test.done();

      },

    },

    'with onlyHash option and baseUrl': {

      'root route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/',
          options: {
            onlyHash: true,
            baseUrl: '/base'
          }
        });

        test.equal(routeTest.emit('/base#/'), true);
        test.equal(routeTest.emit('/base#/?query'), true);
        test.equal(routeTest.emit('/base#/#hash'), true);
        test.equal(routeTest.emit('/base#/?query#hash'), true);
        // treat hash absense as root route
        test.equal(routeTest.emit('/base'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo'
          });
        });
        test.doesNotThrow(function () {
          routeTest.runSignal({});
        });

        test.equal(routeTest.emit('/'), false);
        test.equal(routeTest.emit('/foo'), false);
        test.equal(routeTest.emit('/base#/foo'), 'prevented');
        test.equal(routeTest.emit('/base#/base#/'), 'prevented');

        test.done();
      }

    },

    'with onlyHash option and autodetected baseUrl': {

      'root route': function (test) {

        var routeTest = this.createRouteTest({
          route: '/',
          initialUrl: '/initial/',
          options: {
            onlyHash: true
          }
        });

        test.equal(routeTest.emit('/initial/#/'), true);
        test.equal(routeTest.emit('/initial/#/?query'), true);
        test.equal(routeTest.emit('/initial/#/#hash'), true);
        test.equal(routeTest.emit('/initial/#/?query#hash'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo'
          });
        });
        test.doesNotThrow(function () {
          routeTest.runSignal({});
        });

        test.equal(routeTest.emit('/'), false);
        test.equal(routeTest.emit('/#/'), false);
        test.equal(routeTest.emit('/#/initial/'), false);
        test.equal(routeTest.emit('/initial/#/foo'), 'prevented');
        test.equal(routeTest.emit('/initial/#/foo#/'), 'prevented');

        test.done();

      }

    }

  }
};
