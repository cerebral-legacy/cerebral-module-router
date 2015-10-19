// MOCKING
global.window = {};
global.window.location = {
  href: '/'
};
global.addEventListener = function () {};
global.document = {};

var url = 'http://localhost:3000/';
var proxyquire = require('proxyquire');
var addressbarStub = {
  value: url,
  pathname: '/',
  origin: 'http://localhost:3000',
  set: function () {

  },
  on: function () {

  }
};
proxyquire('./../index.js', { 'addressbar': addressbarStub });

// SETUP
var Controller = require('cerebral');
var Model = require('cerebral-baobab');
var Router = require('./../index.js');

function createController() {
  return Controller(Model({}));
}

function resetAddresbar() {
  addressbarStub.value = url;
  addressbarStub.pathname = '/';
  addressbarStub.origin = 'http://localhost:3000';
}

// TESTS

exports['should match route with signal'] = function (test) {

  resetAddresbar();

  var controller = createController();
  controller.signal('test', [
    function () {
      test.ok(true);
    }
  ]);

  Router(controller, {
    '/': 'test'
  }).trigger();

  test.expect(1);
  test.done();
};


exports['should run signal synchronously'] = function (test) {

  resetAddresbar();

  var controller = createController();
  controller.signal('test', [
    function () {
      test.ok(true);
    }
  ]);

  // async run before wrapping
  controller.signals.test();

  // sync run on trigger
  Router(controller, {
    '/': 'test'
  }).trigger();

  // sync run after wrapping
  controller.signals.test();

  test.expect(2);
  test.done();
};

exports['should run nested signal'] = function (test) {

  resetAddresbar();

  var controller = createController();
  controller.signal('test.test1.test2', [
    function () {
      test.ok(true);
    }
  ]);

  Router(controller, {
    '/': 'test.test1.test2'
  }).trigger();

  test.expect(1);
  test.done();
};

exports['should match and pass route, params and query to input'] = function (test) {

  resetAddresbar();
  addressbarStub.value = url + 'test?foo=bar&bar=baz';

  var controller = createController();
  controller.signal('test', [
    function (input) {
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

  Router(controller, {
    '/:param': 'test'
  }).trigger();

  test.expect(1);
  test.done();
};

exports['should throw on missing signal'] = function (test) {

  resetAddresbar();

  var controller = createController();

  test.throws(function () {
    Router(controller, {
      '/': 'test'
    });
  });

  test.done();
};

exports['should throw on duplicate signal'] = function (test) {

  resetAddresbar();

  var controller = createController();
  controller.signal('test', [
    function () {
    }
  ]);

  test.throws(function () {
    Router(controller, {
      '/': 'test',
      '/:test': 'test'
    });
  });

  test.done();
};

exports['should throw if missing param manually running a bound signal'] = function (test) {

  resetAddresbar();

  var controller = createController();
  controller.signal('test', [
    function () {
    }
  ]);

  Router(controller, {
    '/:param': 'test'
  });

  test.throws(function () {
    controller.signals.test();
  });

  test.done();

};

exports['should throw if resulted url didn\'t matches a route'] = function (test) {

  resetAddresbar();

  var controller = createController();
  controller.signal('test', [
    function (input) {
    }
  ]);

  Router(controller, {
    '/:param': 'test'
  });

  test.throws(function () {
    controller.signals.test({ param: '' });
  });

  test.done();

};

exports['should NOT throw if passing param manually to a bound signal'] = function (test) {

  resetAddresbar();

  var controller = createController();
  controller.signal('test', [
    function (input) {
    }
  ]);

  Router(controller, {
    '/:param': 'test'
  });

  test.doesNotThrow(function () {
    controller.signals.test({
      param: 'test2'
    });
  });

  test.done();

};

exports['should match `*` route and set correct url'] = function (test) {

  resetAddresbar();
  addressbarStub.value = url + 'test';
  addressbarStub.pathname = '/test';

  var controller = createController();
  controller.signal('test', [
    function (input) {
      test.equal(input.route.url, '/test');
    }
  ]);

  Router(controller, {
    '*': 'test'
  }).trigger();

  test.expect(1);
  test.done();
};

exports['should match `/*` route and set correct url'] = function (test) {

  resetAddresbar();
  addressbarStub.value = url + 'test';
  addressbarStub.pathname = '/test';

  var controller = createController();
  controller.signal('test', [
    function (input) {
      test.equal(input.route.url, '/test');
    }
  ]);

  Router(controller, {
    '/*': 'test'
  }).trigger();

  test.expect(1);
  test.done();
};

exports['should match and set correct url with onlyHash option'] = function (test) {

  resetAddresbar();
  addressbarStub.value = url + '#/test';
  addressbarStub.hash = '#/test';

  var controller = createController();
  controller.signal('test', [
    function (input) {
      test.equal(input.route.url, '/test');
    }
  ]);

  Router(controller, {
    '/test': 'test'
  }, {
    onlyHash: true
  }).trigger();

  test.expect(1);
  test.done();
};

exports['should match and set correct url with baseUrl option'] = function (test) {

  resetAddresbar();
  addressbarStub.value = url + 'base/test';
  addressbarStub.pathname = '/base/test';

  var controller = createController();
  controller.signal('test', [
    function (input) {
      test.equal(input.route.url, '/test');
    }
  ]);

  Router(controller, {
    '/test': 'test'
  }, {
    baseUrl: '/base'
  }).trigger();

  test.expect(1);
  test.done();

};

exports['should set url into store'] = function (test) {

  resetAddresbar();

  var controller = createController();
  controller.signal('test', [
    function () {
    }
  ]);

  Router(controller, {
    '/': 'test'
  }).trigger();

  test.equals(controller.get(['url']), '/');
  test.done();

};

exports['should set url into store at custom path'] = function (test) {

  resetAddresbar();

  var controller = createController();
  controller.signal('test', [
    function () {
    }
  ]);

  Router(controller, {
    '/': 'test'
  }, {
    urlStorePath: ['nested', 'url']
  }).trigger();

  test.equals(controller.get(['nested', 'url']), '/');
  test.done();

};

exports['should preserve sync method for wrapped signal'] = function (test) {

  resetAddresbar();

  var controller = createController();
  controller.signal('test', [
    function () {
    }
  ]);

  Router(controller, {
    '/': 'test'
  });

  test.equals(typeof controller.signals.test.sync, 'function');
  test.done();

};

exports['should expose `getUrl` method for wrapped signal'] = function (test) {

  resetAddresbar();

  var controller = createController();
  controller.signal('test', [
    function () {
    }
  ]);

  Router(controller, {
    '/:param': 'test'
  }, {
    baseUrl: '/test'
  });

  test.equals(controller.signals.test.getUrl({ param: 'test' }), '/test/test');
  test.done();

};

exports['should match regexp param'] = function (test) {

  resetAddresbar();
  addressbarStub.value = url + 'test-test-01';
  addressbarStub.pathname = '/test-test-01';

  var controller = createController();
  controller.signal('test', [
    function (input) {
      test.deepEqual(input.route.params, { param: 'test', '0': '-01' });
    }
  ]);

  Router(controller, {
    '/:param(\\w+)-test(.*)': 'test'
  }).trigger();

  test.done();

};

exports['should redirect'] = function (test) {

  resetAddresbar();
  addressbarStub.value = url + 'missing';
  addressbarStub.pathname = '/missing';

  var controller = createController();
  controller.signal('test', [
    function (input) {
      test.ok(true);
    }
  ]);
  controller.signal('missing', [
    Router.redirect('/existing')
  ]);

  Router(controller, {
    '/existing': 'test',
    '/*': 'missing'
  }).trigger();

  test.expect(1);
  test.done();
};
