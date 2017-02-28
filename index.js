var Router = require('./lib/router')
var urlMapper = require('url-mapper')

module.exports = function DefaultRouter (routesConfig, options) {
  options = options || {}
  options.mapper = urlMapper({ query: options.query })
  return Router(routesConfig, options)
}
