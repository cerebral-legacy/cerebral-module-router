// MOCKING
global.location = {
  href: '/'
};
global.window = {
  history: {
    location: global.location
  }
};
global.addEventListener = function () {};
global.document = {};

var proxyquire = require('proxyquire');
var addressbarStub = {
  value: '/',
  set: function () {

  },
  on: function () {

  }
};
proxyquire('./../index.js', { 'addressbar': addressbarStub });

// SETUP
global.location.origin = '';
var Controller = require('cerebral');
var Model = require('cerebral-baobab');
var Router = require('./../index.js');

function createController() {
  return Controller(Model({}));
}

// TESTS
exports['should match route with signal'] = function (test) {

  global.location.href = '/';

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

  global.location.href = '/';

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

  global.location.href = '/';

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

  global.location.href = '/test?foo=bar&bar=baz';

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

  global.location.href = '/';

  var controller = createController();

  test.throws(function () {
    Router(controller, {
      '/': 'test'
    });
  });

  test.done();
};

exports['should throw on duplicate signal'] = function (test) {

  global.location.href = '/';

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

  global.location.href = '/';

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

  global.location.href = '/';

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

  global.location.href = '/';

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

  global.location.href = '/test';
  global.location.pathname = '/test';

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

  global.location.href = '/test';
  global.location.pathname = '/test';

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
  global.location.pathname = '';
  test.done();
};


exports['should match and set correct url with onlyHash option'] = function (test) {

  global.location.href = '/#/test';

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

  global.location.href = '/base/test';

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

  global.location.href = '/';

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

  global.location.href = '/';

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

  global.location.href = '/';

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

  global.location.href = '/';

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

  global.location.href = '/test-test-01';

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

  global.location.href = '/missing';

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
