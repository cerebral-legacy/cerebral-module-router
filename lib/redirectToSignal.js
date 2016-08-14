var MODULE = require('./utils').MODULE
var getByPath = require('cerebral').getByPath

module.exports = function redirectToSignal (signalName, payload) {
  function action (ctx) {
    var services = getByPath(ctx.services, ctx[MODULE].path)

    return services.redirectToSignal(signalName, payload)
  }

  action.displayName = 'redirect(' + [signalName, payload].join(', ') + ')'

  return action
}
