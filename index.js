var Router = require('./lib/router')
var redirect = require('./lib/redirect')
var urlMapper = require('url-mapper')

function DefaultRouter (routesConfig, options) {
  options = options || {}
  options.mapper = urlMapper({ query: options.query })

  return Router(routesConfig, options)
}

module.exports = DefaultRouter
DefaultRouter.redirect = redirect
