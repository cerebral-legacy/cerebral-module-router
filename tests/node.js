// CLEANUP
;['addressbar', '../index.js', '../lib/router.js'].forEach(function (module) {
  delete require.cache[require.resolve(module)]
})
delete global.window
delete global.document
delete global.history
delete global.addEventListener

// SETUP
var Controller = require('cerebral').Controller
var Model = require('cerebral/models/immutable')
var Router = require('./../index.js')

module.exports['should work in node.js'] = function (test) {
  var controller = Controller(Model({}))
  controller.addSignals({
    'test': {
      chain: [ function checkAction (input) { test.ok(true) } ],
      immediate: true
    }
  })

  controller.addModules({
    router: Router({
      '/test': 'test'
    })
  })

  var router = controller.getServices().router

  router.trigger()
  router.trigger('/test')
  router.trigger()
  router.detach()

  test.expect(2)
  test.done()
}
