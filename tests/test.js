
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
var Router = require('./../index.js');
var createSignal = function (cb) {
  var signal = function () { cb.apply(null, arguments); };
  signal.chain = [];
  return signal;
};
var createController = function () {
  var controller = {
    signals: {},
    signal: function (name, cb) {
      var path = name.split('.');
      var parent = controller.signals;
      while (path.length - 1) {
        parent = parent[path.shift()] = {};
      }
      parent[path[0]] = createSignal(cb);
    },
    store: {
      getSignals: function () {
        return [];
      }
    },
    on: function () {}
  };
  return controller;
};

// TESTS
exports['should match route with signal'] = function (test) {

  global.location.href = '/';

  var controller = createController();
  controller.signal('test', function () {
    test.ok(true);
  });

  Router(controller, {
    '/': 'test'
  }).trigger();

  test.expect(1);
  test.done();
};

exports['should run signal synchronously'] = function (test) {

  global.location.href = '/';

  var controller = createController();
  controller.signal('test', function (isSync) {
    test.equal(isSync, true);
  });

  Router(controller, {
    '/': 'test'
  }).trigger();

  test.expect(1);
  test.done();
};

exports['should run nested signal'] = function (test) {

  global.location.href = '/';

  var controller = createController();
  controller.signal('test.test1.test2', function () {
    test.ok(true);
  });

  Router(controller, {
    '/': 'test.test1.test2'
  }).trigger();

  test.expect(1);
  test.done();
};

exports['should match and pass params'] = function (test) {

  global.location.href = '/test';

  var controller = createController();
  var signal = controller.signal('test', function (isSync, input) {
    test.deepEqual(input.route.params, {
      param: 'test'
    });
  });

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
  var signal = controller.signal('test', function (isSync, input) {

  });

  Router(controller, {
    '/:param': 'test'
  });

  test.throws(function () {
    controller.signals.test();
  });

  test.done();

};

exports['should NOT throw if passing param manually to a bound signal'] = function (test) {

  global.location.href = '/';

  var controller = createController();
  var signal = controller.signal('test', function (isSync, input) {

  });

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
