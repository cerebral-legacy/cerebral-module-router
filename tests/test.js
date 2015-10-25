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
    trigger: function (url) {
      doesMatch = false;
      addressbar.value = url;
      router.trigger();
      return doesMatch;
    },
    emit: function (url) {
      doesMatch = false;
      addressbar.emit('change', {
        preventDefault: function() {},
        target: {value: addressbar.origin + url}
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

        test.equal(routeTest.trigger('/'), true);
        test.equal(routeTest.trigger('/?query'), true);
        test.equal(routeTest.trigger('/?server-query#hash?client-query'), true);
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

        test.equal(routeTest.trigger('/path'), false);
        test.equal(routeTest.trigger('/path?query'), false);
        test.equal(routeTest.trigger('/path/#'), false);

        test.equal(routeTest.emit('/path'), false);
        test.equal(routeTest.emit('/path?query'), false);
        test.equal(routeTest.emit('/path/#'), false);

        test.done();

      },

      '"/test" route': function (test) {
        var routeTest = createRouteTest({
          route: '/test'
        });

        test.equal(routeTest.trigger('/test'), true);
        test.equal(routeTest.trigger('/test?query'), true);
        test.equal(routeTest.trigger('/test?server-query#hash?client-query'), true);
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

        test.equal(routeTest.trigger('/test/path'), false);
        test.equal(routeTest.trigger('/test/path/#'), false);
        test.equal(routeTest.emit('/test/path'), false);
        test.equal(routeTest.emit('/test/path/#'), false);

        test.done();
      },

      '"/test/test" route': function (test) {
        var routeTest = createRouteTest({
          route: '/test/test'
        });

        test.equal(routeTest.trigger('/test/test'), true);
        test.equal(routeTest.trigger('/test/test?query'), true);
        test.equal(routeTest.trigger('/test/test?server-query#hash?client-query'), true);
        test.equal(routeTest.emit('/test/test'), true);
        test.equal(routeTest.emit('/test/test?query'), true);
        test.equal(routeTest.emit('/test/test?server-query#hash?client-query'), true);

        test.doesNotThrow(function () {
          routeTest.runSignal({
            foo: 'bar'
          })
        });

        test.doesNotThrow(function () {
          routeTest.runSignal();
        });

        test.equal(routeTest.trigger('/test/test/path'), false);
        test.equal(routeTest.trigger('/test/test/path/#'), false);
        test.equal(routeTest.emit('/test/test/path'), false);
        test.equal(routeTest.emit('/test/test/path/#'), false);

        test.done();
      },

      '"/:param" route': function (test) {
        var routeTest = createRouteTest({
          route: '/:param'
        });

        test.equal(routeTest.trigger('/param'), true);
        test.equal(routeTest.trigger('/param?query'), true);
        test.equal(routeTest.trigger('/param?server-query#hash?client-query'), true);
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

        test.equal(routeTest.trigger('/param/path'), false);
        test.equal(routeTest.trigger('/param/path/#'), false);
        test.equal(routeTest.emit('/param/path'), false);
        test.equal(routeTest.emit('/param/path/#'), false);

        test.done();
      },

      '"/:param/:param2" route': function (test) {
        var routeTest = createRouteTest({
          route: '/:param/:param2'
        });

        test.equal(routeTest.trigger('/param/param2'), true);
        test.equal(routeTest.trigger('/param/param2?query'), true);
        test.equal(routeTest.trigger('/param/param2?server-query#hash?client-query'), true);
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

        test.equal(routeTest.trigger('/param/param2/path'), false);
        test.equal(routeTest.trigger('/param/param2/path/#'), false);
        test.equal(routeTest.emit('/param/param2/path'), false);
        test.equal(routeTest.emit('/param/param2/path/#'), false);

        test.done();
      },

      '"/*" route': function (test) {
        var routeTest = createRouteTest({
          route: '/*'
        });

        test.equal(routeTest.trigger('/test/test/test'), true);
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

        test.equal(routeTest.trigger('/base/'), true);
        test.equal(routeTest.trigger('/base/?query'), true);
        test.equal(routeTest.trigger('/base/?server-query#hash?client-query'), true);
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

        test.equal(routeTest.trigger('/'), false);
        test.equal(routeTest.trigger('/base/foo'), false);
        test.equal(routeTest.trigger('/#/'), false);
        test.equal(routeTest.trigger('/#/base2'), false);
        test.equal(routeTest.emit('/'), false);
        test.equal(routeTest.emit('/base/foo'), false);
        test.equal(routeTest.emit('/#/'), false);
        test.equal(routeTest.emit('/#/base2'), false);

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

        test.equal(routeTest.trigger('/#/'), true);
        test.equal(routeTest.trigger('/#/?query'), true);
        test.equal(routeTest.trigger('/#/?server-query#hash?client-query'), true);
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

        test.equal(routeTest.trigger('/'), false);
        test.equal(routeTest.trigger('/#/path'), false);
        test.equal(routeTest.emit('/'), false);
        test.equal(routeTest.emit('/#/path'), false);

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

        test.equal(routeTest.trigger('/base#/'), true);
        test.equal(routeTest.trigger('/base#/?client-query'), true);
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

        test.equal(routeTest.trigger('/'), false);
        test.equal(routeTest.trigger('/path'), false);
        test.equal(routeTest.trigger('/base/'), false);
        test.equal(routeTest.trigger('/base/#/'), false);
        test.equal(routeTest.emit('/'), false);
        test.equal(routeTest.emit('/path'), false);
        test.equal(routeTest.emit('/base/'), false);
        test.equal(routeTest.emit('/base/#/'), false);

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

        test.equal(routeTest.trigger('/initial/#/'), true);
        test.equal(routeTest.trigger('/initial/#/?client-query'), true);
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

        test.equal(routeTest.trigger('/'), false);
        test.equal(routeTest.trigger('/#/'), false);
        test.equal(routeTest.trigger('/#/initial'), false);
        test.equal(routeTest.emit('/'), false);
        test.equal(routeTest.emit('/#/'), false);
        test.equal(routeTest.emit('/#/initial'), false);

        test.done();

      }

    }

  }
};
