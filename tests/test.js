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
          addressbar.emit('change', {
            preventDefault: function() {},
            target: {value: addressbar.origin + url}
          });
          return doesMatch;
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

  'should replaceState on redirect by default':  function (test) {

    this.controller.signal('test', [
      function checkAction(input) { test.ok(true); }
    ]);
    this.controller.signal('missing', [
      Router.redirect('/existing')
    ]);

    this.router = Router(this.controller, {
      '/existing': 'test',
      '/*': 'missing'
    });
    this.router.trigger();

    test.equals(addressbar.pathname, '/existing');
    test.equals(window.location.lastChangedWith, 'replaceState');
    test.done();
  },

  'should allow pushState on redirect':  function (test) {

    this.controller.signal('test', [
      function checkAction(input) { test.ok(true); }
    ]);
    this.controller.signal('missing', [
      Router.redirect('/existing', false)
    ]);

    this.router = Router(this.controller, {
      '/existing': 'test',
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

  'should log out deprecation warnings': function(test) {

    this.controller.signal('test', [
      function noop() {}
    ]);
    this.controller.signal('test2', [
      function noop() {}
    ]);

    this.router = Router(this.controller, {
      '/': 'test',
      '*': 'test2'
    });

    test.equals(this.warnMessage.indexOf('deprecate') >= 0, true);
    delete this.warnMessage;

    this.router.start();
    test.equals(this.warnMessage.indexOf('deprecate') >= 0, true);

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
        test.equal(routeTest.emit('/?server-query#hash?client-query'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            foo: 'bar'
          })
        });

        test.doesNotThrow(function () {
          routeTest.runSignal();
        });

        test.equal(routeTest.emit('/path'), false);
        test.equal(routeTest.emit('/path?query'), false);
        test.equal(routeTest.emit('/path/#'), false);

        test.done();

      },

      'simple route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/test'
        });

        test.equal(routeTest.emit('/test'), true);
        test.equal(routeTest.emit('/test?query'), true);
        test.equal(routeTest.emit('/test?server-query#hash?client-query'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            foo: 'bar'
          })
        });

        test.doesNotThrow(function () {
          routeTest.runSignal();
        });

        test.equal(routeTest.emit('/test/path'), false);
        test.equal(routeTest.emit('/test/path/#'), false);

        test.done();
      },

      'deep route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/test/test/test/42'
        });

        test.equal(routeTest.emit('/test/test/test/42'), true);
        test.equal(routeTest.emit('/test/test/test/42?query'), true);
        test.equal(routeTest.emit('/test/test/test/42?server-query#hash?client-query'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            foo: 'bar'
          })
        });

        test.doesNotThrow(function () {
          routeTest.runSignal();
        });

        test.equal(routeTest.emit('/test/test/path'), false);
        test.equal(routeTest.emit('/test/test/path/#'), false);

        test.done();
      },

      'params route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/:param'
        });

        test.equal(routeTest.emit('/param'), true);
        test.equal(routeTest.emit('/param?query'), true);
        test.equal(routeTest.emit('/param?server-query#hash?client-query'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo'
          });
        });
        test.throws(function () {
          routeTest.runSignal({});
        });

        test.equal(routeTest.emit('/param/path'), false);
        test.equal(routeTest.emit('/param/path/#'), false);

        test.done();
      },

      'several params route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/:param/:param2'
        });

        test.equal(routeTest.emit('/param/param2'), true);
        test.equal(routeTest.emit('/param/param2?query'), true);
        test.equal(routeTest.emit('/param/param2?server-query#hash?client-query'), true);

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

        test.equal(routeTest.emit('/param/param2/path'), false);
        test.equal(routeTest.emit('/param/param2/path/#'), false);

        test.done();
      },

      'regexp route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/:param([\\w+-?]+)-test/:param2(\\d+)'
        });

        test.equal(routeTest.emit('/param-test/42'), true);
        test.equal(routeTest.emit('/param-param-test/42'), true);
        test.equal(routeTest.emit('/param-test/42?client-query'), true);
        test.equal(routeTest.emit('/param-test/42?server-query#hash?client-query'), true);

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

        test.equal(routeTest.emit('/paramtest/42'), false);
        test.equal(routeTest.emit('/param-test/foo'), false);

        test.done();
      },

      'catch all route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/*'
        });

        test.equal(routeTest.emit('/test/test/test'), true);

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

      'deprecated catch all route': function (test) {
        var routeTest = this.createRouteTest({
          route: '*'
        });

        test.equal(routeTest.emit('/test/test/test'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal();
        });

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo'
          });
        });

        test.done();
      }

    },

    'with baseUrl option': {

      'root route': function (test) {

        var routeTest = this.createRouteTest({
          route: '/',
          options: {
            baseUrl: '/base'
          }
        });

        test.equal(routeTest.emit('/base/'), true);
        test.equal(routeTest.emit('/base/?query'), true);
        test.equal(routeTest.emit('/base/?server-query#hash?client-query'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo'
          });
        });
        test.doesNotThrow(function () {
          routeTest.runSignal({});
        });

        test.equal(routeTest.emit('/'), false);
        test.equal(routeTest.emit('/base/foo'), false);
        test.equal(routeTest.emit('/#/'), false);
        test.equal(routeTest.emit('/#/base2'), false);

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
        test.equal(routeTest.emit('/#/?server-query#hash?client-query'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo'
          });
        });
        test.doesNotThrow(function () {
          routeTest.runSignal({});
        });

        test.equal(routeTest.emit('/'), false);
        test.equal(routeTest.emit('/#/path'), false);

        test.done();

      },

      'deprecated catch all route': function (test) {
        var routeTest = this.createRouteTest({
          route: '*',
          options: {
            onlyHash: true
          }
        });

        test.equal(routeTest.emit('/#/test/test/test'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal();
        });

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo'
          });
        });

        test.done();
      }

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
        test.equal(routeTest.emit('/base#/?client-query'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo'
          });
        });
        test.doesNotThrow(function () {
          routeTest.runSignal({});
        });

        test.equal(routeTest.emit('/'), false);
        test.equal(routeTest.emit('/path'), false);
        test.equal(routeTest.emit('/base/'), false);
        test.equal(routeTest.emit('/base/#/'), false);

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
        test.equal(routeTest.emit('/initial/#/?client-query'), true);

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
        test.equal(routeTest.emit('/#/initial'), false);

        test.done();

      },

      'root route': function (test) {

        var routeTest = this.createRouteTest({
          route: '/',
          initialUrl: '/initial/',
          options: {
            onlyHash: true
          }
        });

        test.equal(routeTest.emit('/initial/#/'), true);
        test.equal(routeTest.emit('/initial/#/?client-query'), true);

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
        test.equal(routeTest.emit('/#/initial'), false);

        test.done();

      }

    }

  }
};
