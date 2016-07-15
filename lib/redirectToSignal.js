var MODULE = require('./utils').MODULE
var get = require('lodash/get')

module.exports = function redirectToSignal (signalName, payload) {
  function action (ctx) {
    var services = get(ctx.services, ctx[MODULE].path)

    return services.redirectToSignal(signalName, payload)
  }

  action.displayName = 'redirect(' + [signalName, payload].join(', ') + ')'

  return action
}
