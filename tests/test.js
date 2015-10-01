
// MOCKING
global.location = {
  href: '/'
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

// TESTING
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
      controller.signals[name] = createSignal(cb);
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
