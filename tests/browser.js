// MOCKING
global.window = {
  location: {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000/initial'
  }
}
global.history = {
  pushState: function (_, __, value) {
    window.location.href = window.location.origin + value
    window.location.lastChangedWith = 'pushState'
  },
  replaceState: function (_, __, value) {
    window.location.href = window.location.origin + value
    window.location.lastChangedWith = 'replaceState'
  }
}
global.addEventListener = function () {}
global.document = {}

// SETUP
var Controller = require('cerebral')
var Model = require('cerebral-model-baobab')
var addressbar = require('addressbar')
var Router = require('./../index.js')
var redirect = Router.redirect

function emit (url) {
  addressbar.emit('change', {
    preventDefault: function () {},
    target: {value: addressbar.origin + url}
  })
}

// TESTS
module.exports = {
  setUp: function (cb) {
    var controller = this.controller = Controller(Model({}))
    addressbar.value = '/'

    this.createRouteTest = function createRouteTest (options) {
      if (this.router) {
        throw new Error('Router instance must be detached by `tearDown` script. Do not call `createRouteTest` twice inside one test.')
      }

      var doesMatch = false
      var defaultPrevented = false
      var routerOptions = options.options

      controller.signals({
        match: [
          function setMatch () { doesMatch = true }
        ]
      })

      var routes = {}
      routes[options.route] = 'match'

      if (options.initialUrl) {
        addressbar.value = options.initialUrl
      } else {
        addressbar.value = '/'
      }

      controller.modules({
        devtools: function () {},
        router: Router(routes, routerOptions || {})
      })

      return {
        emit: function (url) {
          doesMatch = false
          defaultPrevented = false
          addressbar.emit('change', {
            preventDefault: function () {
              defaultPrevented = true
            },
            target: {value: addressbar.origin + url}
          })
          // secure preventing default link href navigation
          // matched and prevented => true
          // missed and not prevented => false
          // missed and prevente => 'prevented'
          return (doesMatch === defaultPrevented) ? doesMatch : 'prevented'
        },
        runSignal: function (payload) {
          controller.getSignals().match(payload)
        }
      }
    }

    this.warn = console.warn
    console.warn = function (message) {
      this.warnMessage = message
    }.bind(this)

    cb()
  },

  tearDown: function (cb) {
    var router = this.controller.getServices().router
    if (router) router.detach()
    delete window.location.lastChangedWith

    console.warn = this.warn

    cb()
  },

  'should run signal synchronously': function (test) {
    this.controller.signals({
      test: [
        function checkAction () { test.ok(true) }
      ]
    })

    // async run before wrapping
    this.controller.getSignals().test()

    this.controller.modules({
      devtools: function () {},
      router: Router({
        '/': 'test'
      })
    })
    // sync run on emit
    emit('/')

    // sync run after wrapping
    this.controller.getSignals().test()

    test.expect(2)
    test.done()
  },

  'should trigger on modulesLoaded': function (test) {
    this.controller.signals({
      test: [
        function checkAction () {
          test.done()
        }
      ]
    })

    this.controller.modules({
      devtools: function () {},
      router: Router({
        '/': 'test'
      })
    })
  },

  'should not trigger on modulesLoaded if url was remembered': function (test) {
    test.expect(1)
    var controller = this.controller

    this.controller.signals({
      foo: [
        function checkAction () { test.ok(true) }
      ],
      bar: [
        function checkAction () { test.ok(true) }
      ],
      baz: [
        function checkAction () { test.ok(true) }
      ]
    })

    this.controller.on('modulesLoaded', function () {
      setTimeout(function () {
        test.equals(addressbar.pathname, '/bar')
        test.done()
      })
    })

    this.controller.modules({
      router: Router({
        '/foo': 'foo',
        '/bar': 'bar'
      }),
      devtools: function () {
        controller.emit('predefinedSignal', { signal: { name: 'foo' } })
        controller.emit('predefinedSignal', { signal: { name: 'baz' } })
        controller.emit('predefinedSignal', { signal: { name: 'bar' } })
      }
    })
  },

  'should set isSync and isRouted flags on signal': function (test) {
    this.controller.signals({
      test: [ function () {} ]
    })

    this.controller.modules({
      devtools: function () {},
      router: Router({
        '/': 'test'
      })
    })

    this.controller.once('signalStart', function (args) {
      test.ok(args.signal.isSync)
      test.ok(args.signal.isRouted)
    })
    test.done()
  },

  'should run nested signal': function (test) {
    this.controller.signals({
      'test.test1.test2': [
        function checkAction () { test.ok(true) }
      ]
    })

    this.controller.modules({
      devtools: function () {},
      router: Router({
        '/': 'test.test1.test2'
      })
    })
    emit('/')

    test.expect(1)
    test.done()
  },

  'should support nested route definitions': function (test) {
    function checkAction () { test.ok(true) }

    this.controller.signals({
      'foo': [ checkAction ],
      'bar': [ checkAction ],
      'baz': [ checkAction ]
    })

    this.controller.modules({
      devtools: function () {},
      router: Router({
        '/foo': {
          '/': 'foo',
          '/bar': 'bar',
          '/baz': {
            '/': 'baz'
          }
        }
      })
    })

    emit('/foo')
    emit('/foo/bar')
    emit('/foo/baz')

    test.expect(3)
    test.done()
  },

  'should throw on missing routes': function (test) {
    test.throws(function () {
      Router()
    })

    test.done()
  },

  'should throw on missing signal': function (test) {
    var controller = this.controller

    test.throws(function () {
      controller.modules({
        devtools: function () {},
        router: Router({
          '/': 'test'
        })
      })
    })

    test.done()
  },

  'should throw on missing nested signal': function (test) {
    var controller = this.controller
    this.controller.signals({
      'test': [ function noop () {} ]
    })

    test.throws(function () {
      controller.modules({
        devtools: function () {},
        router: Router({
          '/': 'test.test'
        })
      })
    })

    test.throws(function () {
      controller.modules({
        devtools: function () {},
        router: Router({
          '/': 'test1.test'
        })
      })
    })

    test.done()
  },

  'should throw on duplicate signal': function (test) {
    var controller = this.controller
    this.controller.signals({
      'test': [ function noop () {} ]
    })

    test.throws(function () {
      controller.modules({
        devtools: function () {},
        router: Router({
          '/': 'test',
          '/:test': 'test'
        })
      })
    })

    test.done()
  },

  'should warn that `trigger` service method is deprecated': function (test) {
    this.createRouteTest({
      route: '/:param',
      options: {
        baseUrl: '/test',
        onlyHash: true
      }
    })

    this.controller.getServices().router.trigger()
    test.equal(this.warnMessage.indexOf('deprecated') >= 0, true)
    test.done()
  },

  'should expose `getUrl` method on router service': function (test) {
    this.createRouteTest({
      route: '/:param',
      options: {
        baseUrl: '/test',
        onlyHash: true
      }
    })

    this.controller.getSignals().match({ param: 'test' })

    test.equals(addressbar.value, 'http://localhost:3000/test#/test')
    test.equals(this.controller.getServices().router.getUrl(), '/test')
    test.done()
  },

  'should expose `getSignalUrl` method on router service': function (test) {
    this.createRouteTest({
      route: '/',
      options: {
        baseUrl: '/test',
        mapper: { query: true },
        onlyHash: true
      }
    })

    test.equals(this.controller.getServices().router.getSignalUrl('match'), '/test#/')
    test.equals(this.controller.getServices().router.getSignalUrl('match', { param: 'test' }), '/test#/?param=test')
    test.done()
  },

  'should `getSignalUrl` service method return false for unbound signal': function (test) {
    this.controller.signals({
      'test': [ function noop () {} ],
      'unbound': [ function noop () {} ]
    })

    this.controller.modules({
      devtools: function () {},
      router: Router({
        '/': 'test'
      })
    })

    test.equals(this.controller.getServices().router.getSignalUrl('unbound'), false)
    test.done()
  },

  'should warn `getUrl` method for wrapped signal is deprecated': function (test) {
    this.createRouteTest({
      route: '/',
      options: {
        baseUrl: '/test',
        mapper: { query: true },
        onlyHash: true
      }
    })

    test.equals(this.controller.getSignals().match.getUrl(), '/test#/')
    test.equals(this.controller.getSignals().match.getUrl({ param: 'test' }), '/test#/?param=test')
    test.equal(this.warnMessage.indexOf('deprecated') >= 0, true)
    test.done()
  },

  'should not change url for regular signal call': function (test) {
    this.controller.signals({
      'test': [
        function (arg) { arg.state.set(['foo'], 'bar') }
      ]
    })

    this.createRouteTest({
      route: '/test',
      initialUrl: '/initial'
    })

    this.controller.getSignals().test.sync()

    test.equals(addressbar.pathname, '/initial')
    test.done()
  },

  'should provide redirect action factory': function (test) {
    this.controller.signals({
      'existing': [
        function checkAction () { test.ok(true) }
      ],
      'missing': [
        redirect('/existing')
      ]
    })

    this.controller.modules({
      devtools: function () {},
      router: Router({
        '/existing': 'existing',
        '/*': 'missing'
      })
    })
    emit('/missing')

    test.equals(addressbar.pathname, '/existing')
    test.done()
  },

  'should replaceState on redirect by default': function (test) {
    this.controller.signals({
      'existing': [
        function checkAction () { test.ok(true) }
      ],
      'noop': []
    })

    this.controller.modules({
      devtools: function () {},
      router: Router({
        '/existing': 'existing',
        '/*': 'noop'
      })
    })

    this.controller.getServices().router.redirect('/existing')
    test.equals(addressbar.pathname, '/existing')
    test.equals(window.location.lastChangedWith, 'replaceState')
    test.done()
  },

  'should allow pushState on redirect': function (test) {
    this.controller.signals({
      'existing': [
        function checkAction () { test.ok(true) }
      ],
      'noop': []
    })

    this.controller.modules({
      devtools: function () {},
      router: Router({
        '/existing': 'existing',
        '/*': 'noop'
      })
    })

    this.controller.getServices().router.redirect('/existing', { replace: false })
    test.equals(addressbar.pathname, '/existing')
    test.equals(window.location.lastChangedWith, 'pushState')
    test.done()
  },

  'should run redirect async': function (test) {
    test.expect(0)
    this.controller.signals({
      'noop': [],
      'existing': [
        function checkAction () { test.ok(true) }
      ]
    })

    this.controller.modules({
      devtools: function () {},
      router: Router({
        '/existing': 'existing',
        '/*': 'noop'
      })
    })

    this.controller.getServices().router.redirect('/existing')
    test.done()
  },

  'should allow redirect to signal': function (test) {
    test.expect(2)
    this.controller.signals({
      'home': [],
      'createClicked': [
        function createEntity (args) {
          var entityId = 42
          args.services.router.redirectToSignal('detail', { id: entityId })
        }
      ],
      'detail': [
        function checkAction (args) {
          test.equal(args.input.id, 42)
          test.equal(addressbar.pathname, '/%3A42')
          test.done()
        }
      ]
    })

    this.controller.modules({
      devtools: function () {},
      router: Router({
        '/': 'home',
        '/:id': 'detail'
      })
    })

    this.controller.getSignals().createClicked()
  },

  'should warn if trying redirect to signal not bound to route': function (test) {
    test.expect(1)
    this.controller.signals({
      'home': [],
      'test': [ function () { test.ok(true) } ]
    })

    this.controller.modules({
      devtools: function () {},
      router: Router({
        '/': 'home'
      })
    })

    this.controller.getServices().router.redirectToSignal('test')
    test.equal(this.warnMessage.length >= 0, true)
    test.done()
  },

  'should run redirectToSignal async': function (test) {
    test.expect(0)
    this.controller.signals({
      'noop': [],
      'test': [
        function (args) {
          test.ok(true)
        }
      ]
    })

    this.controller.modules({
      devtools: function () {},
      router: Router({
        '/': 'noop',
        '/test': 'test'
      })
    })

    this.controller.getServices().router.redirectToSignal('test')
    test.done()
  },

  'should warn if navigation prevented': function (test) {
    var routeTest = this.createRouteTest({
      route: '/',
      options: {
        baseUrl: '/base'
      }
    })

    test.equal(routeTest.emit('/missing'), false)
    test.equal(this.warnMessage, undefined)

    test.equal(routeTest.emit('/base/missing'), 'prevented')
    test.equal(this.warnMessage.indexOf('prevented') >= 0, true)

    test.done()
  },

  matching: {
    'full url': {
      'root route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/'
        })

        test.equal(routeTest.emit('/'), true)
        test.equal(routeTest.emit('/?query'), true)
        test.equal(routeTest.emit('/#hash'), true)
        test.equal(routeTest.emit('/?query#hash'), true)

        test.doesNotThrow(function () {
          routeTest.runSignal({
            foo: 'bar'
          })
        })

        test.doesNotThrow(function () {
          routeTest.runSignal()
        })

        test.equal(routeTest.emit('/path'), 'prevented')
        test.equal(routeTest.emit('/path?query'), 'prevented')
        test.equal(routeTest.emit('/path/#/'), 'prevented')

        test.done()
      },

      'simple route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/foo'
        })

        test.equal(routeTest.emit('/foo'), true)
        test.equal(routeTest.emit('/foo?query'), true)
        test.equal(routeTest.emit('/foo#hash'), true)
        test.equal(routeTest.emit('/foo?query#hash'), true)

        test.doesNotThrow(function () {
          routeTest.runSignal({
            foo: 'bar'
          })
        })

        test.doesNotThrow(function () {
          routeTest.runSignal()
        })

        test.equal(routeTest.emit('/'), 'prevented')
        test.equal(routeTest.emit('/bar/foo'), 'prevented')
        test.equal(routeTest.emit('/bar#/foo'), 'prevented')

        test.done()
      },

      'deep route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/foo/bar/baz/42'
        })

        test.equal(routeTest.emit('/foo/bar/baz/42'), true)
        test.equal(routeTest.emit('/foo/bar/baz/42?query'), true)
        test.equal(routeTest.emit('/foo/bar/baz/42?#hash'), true)
        test.equal(routeTest.emit('/foo/bar/baz/42??query#hash'), true)

        test.doesNotThrow(function () {
          routeTest.runSignal({
            foo: 'bar'
          })
        })

        test.doesNotThrow(function () {
          routeTest.runSignal()
        })

        test.equal(routeTest.emit('/foo/bar/baz/'), 'prevented')
        test.equal(routeTest.emit('/foo/bar/baz/43'), 'prevented')
        test.equal(routeTest.emit('/foo/bar/baz/42/foo'), 'prevented')
        test.equal(routeTest.emit('/#/foo/bar/baz/42'), 'prevented')

        test.done()
      },

      'params route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/:param'
        })

        test.equal(routeTest.emit('/foo'), true)
        test.equal(routeTest.emit('/bar'), true)
        test.equal(routeTest.emit('/foo?query'), true)
        test.equal(routeTest.emit('/foo?#hash'), true)
        test.equal(routeTest.emit('/foo?query#hash'), true)

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo'
          })
        })
        test.throws(function () {
          routeTest.runSignal({})
        })

        test.equal(routeTest.emit('/foo/bar'), 'prevented')
        test.equal(routeTest.emit('/#/foo'), 'prevented')

        test.done()
      },

      'several params route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/:param/:param2'
        })

        test.equal(routeTest.emit('/foo/bar'), true)
        test.equal(routeTest.emit('/foo/bar?query'), true)
        test.equal(routeTest.emit('/foo/bar#hash'), true)
        test.equal(routeTest.emit('/foo/bar?query#hash'), true)

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo',
            param2: 'bar'
          })
        })
        test.throws(function () {
          routeTest.runSignal({})
        })
        test.throws(function () {
          routeTest.runSignal({
            param: 'foo'
          })
        })

        test.equal(routeTest.emit('/foo/bar/baz'), 'prevented')
        test.equal(routeTest.emit('/#/foo/bar'), 'prevented')

        test.done()
      },

      'regexp route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/:param([\\w+-?]+)-test/:param2(%3A\\d+)'
        })

        test.equal(routeTest.emit('/foo-test/%3A42'), true)
        test.equal(routeTest.emit('/foo-bar-test/%3A42'), true)
        test.equal(routeTest.emit('/foo-test/%3A42?query'), true)
        test.equal(routeTest.emit('/foo-test/%3A42#hash'), true)
        test.equal(routeTest.emit('/foo-test/%3A42?query#hash'), true)

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo',
            param2: 42
          })
        })
        test.throws(function () {
          routeTest.runSignal({})
        })
        test.throws(function () {
          routeTest.runSignal({
            param: 'foo',
            param2: 'bar'
          })
        })

        test.equal(routeTest.emit('/footest/%3A42'), 'prevented')
        test.equal(routeTest.emit('/foo-test/bar'), 'prevented')
        test.equal(routeTest.emit('/#/foo-test/%3A42'), 'prevented')

        test.done()
      },

      'catch all route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/*'
        })

        test.equal(routeTest.emit('/'), true)
        test.equal(routeTest.emit('/foo'), true)
        test.equal(routeTest.emit('/foo/bar/baz'), true)

        test.doesNotThrow(function () {
          routeTest.runSignal({
            0: 'bar'
          })
        })

        test.throws(function () {
          routeTest.runSignal()
        })

        test.done()
      }
    },

    'with baseUrl option': {
      'root route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/',
          options: {
            baseUrl: '/base'
          }
        })

        test.equal(routeTest.emit('/base'), true)
        test.equal(routeTest.emit('/base?query'), true)
        test.equal(routeTest.emit('/base#hash'), true)
        test.equal(routeTest.emit('/base?query#hash'), true)

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo'
          })
        })
        test.doesNotThrow(function () {
          routeTest.runSignal({})
        })

        test.equal(routeTest.emit('/'), false)
        test.equal(routeTest.emit('/base/foo'), 'prevented')
        test.equal(routeTest.emit('/#/'), false)
        test.equal(routeTest.emit('/#/base/'), false)

        test.done()
      }
    },

    'with onlyHash option': {
      'root route': function (test) {
        var routeTest = this.createRouteTest({
          route: '/',
          options: {
            onlyHash: true
          }
        })

        test.equal(routeTest.emit('/#/'), true)
        test.equal(routeTest.emit('/#/?query'), true)
        test.equal(routeTest.emit('/#/#hash'), true)
        test.equal(routeTest.emit('/#/?query#hash'), true)
        // treat hash absense as root route
        test.equal(routeTest.emit('/'), true)

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo'
          })
        })
        test.doesNotThrow(function () {
          routeTest.runSignal({})
        })

        test.equal(routeTest.emit('/#/foo'), 'prevented')
        test.equal(routeTest.emit('/foo#/'), false)

        test.done()
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
        })

        test.equal(routeTest.emit('/base#/'), true)
        test.equal(routeTest.emit('/base#/?query'), true)
        test.equal(routeTest.emit('/base#/#hash'), true)
        test.equal(routeTest.emit('/base#/?query#hash'), true)
        // treat hash absense as root route
        test.equal(routeTest.emit('/base'), true)

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo'
          })
        })
        test.doesNotThrow(function () {
          routeTest.runSignal({})
        })

        test.equal(routeTest.emit('/'), false)
        test.equal(routeTest.emit('/foo'), false)
        test.equal(routeTest.emit('/base#/foo'), 'prevented')
        test.equal(routeTest.emit('/base#/base#/'), 'prevented')

        test.done()
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
        })

        test.equal(routeTest.emit('/initial/#/'), true)
        test.equal(routeTest.emit('/initial/#/?query'), true)
        test.equal(routeTest.emit('/initial/#/#hash'), true)
        test.equal(routeTest.emit('/initial/#/?query#hash'), true)

        test.doesNotThrow(function () {
          routeTest.runSignal({
            param: 'foo'
          })
        })
        test.doesNotThrow(function () {
          routeTest.runSignal({})
        })

        test.equal(routeTest.emit('/'), false)
        test.equal(routeTest.emit('/#/'), false)
        test.equal(routeTest.emit('/#/initial/'), false)
        test.equal(routeTest.emit('/initial/#/foo'), 'prevented')
        test.equal(routeTest.emit('/initial/#/foo#/'), 'prevented')

        test.done()
      }
    }
  }
}
