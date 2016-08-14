var MODULE = require('./utils').MODULE
var getByPath = require('cerebral').getByPath

module.exports = function redirect (url, params) {
  function action (ctx) {
    var services = getByPath(ctx.services, ctx[MODULE].path)

    return services.redirect(url, params)
  }

  action.displayName = 'redirect(' + url + ')'

  return action
}
