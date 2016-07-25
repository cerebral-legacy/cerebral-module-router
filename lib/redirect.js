var MODULE = require('./utils').MODULE
var get = require('lodash/get')

module.exports = function redirect (url, params) {
  function action (ctx) {
    var services = get(ctx.services, ctx[MODULE].path)

    return services.redirect(url, params)
  }

  action.displayName = 'redirect(' + url + ')'

  return action
}
