# cerebral-module-router
An opinionated URL change handler for Cerebral

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![bitHound Score][bithound-image]][bithound-url]
[![Commitizen friendly][commitizen-image]][commitizen-url]
[![Semantic Release][semantic-release-image]][semantic-release-url]
[![js-standard-style][standard-image]][standard-url]
[![Discord][discord-image]][discord-url]

### Install

`npm install cerebral-module-router`

### Quickstart

```js
import Cerebral from 'cerebral';
import Model from 'cerebral-model-baobab'
import Router from 'cerebral-module-router';
import App from './modules/app';

controller.addModules({
  app: App,
  router: Router({
    '/': 'app.homeOpened',
    '/messages': 'app.messagesOpened',
    '/messages/:id': 'app.messageOpened',
    '/*': 'app.notFoundOpened'
  }, {
    onlyHash: true,            // use only hash part of url for matching
    // baseUrl: '/',           // base part, that ignored on route match. detected automatically if `onlyHash` option set to true
    // preventAutostart: true, // prevents automatic triggering after `modulesLoaded` event
    mapper: { query: true }    // options passed to url-mapper
  })
);
```

### [API documentation](http://cerebral.github.io/cerebral-module-router/index.html#_index_d_.router)

### How it works

The Cerebral Router is one of the least invasive routers out there.
You can attach the router module to already written cerebral application and it will just work.
And you will be able to disable router completely in environments where you do not need it at all(eg, React Native app).

Though we are making few considerations:
* Signal bound to route should be treated as potential entry point. Make sure that your signal would be able to run on app start.
* Your app will prepare initial state either during server side rendering or within signals ran in sync with `modulesLoaded` event.

#### Addressbar updates while navigating an app

Router listens to `signalTrigger` and `signalStart` events.
Addressbar will be updated if signal is bound to route in config.
Router uses [url-mapper's](https://github.com/cerebral/url-mapper) [`stringify` method](https://github.com/cerebral/url-mapper#stringify-method) to get url from given route and signal payload.

#### Trigger correspondent signal with payload while normal app startup

Router listens to `modulesLoaded` event and schedules correspondent signal trigger if there was no predefined signal execution (see below).
Router uses url-mapper's [`map` method](https://github.com/cerebral/url-mapper#map-method) to get matched signal and payload to pass.
Matched signal trigger would be delayed until signals started by other modules on `modulesLoaded` event is finished, if any.

#### Trigger correspondent signal on history traversal (back and forward navigation)

Router listens history traversal events using [addressbar](https://github.com/cerebral/addressbar) library.
It would trigger matched signal if url has changed.

#### Just works with `devtools` time traveling and `recorder`

Both [`devtools`](https://github.com/cerebral/cerebral-module-devtools) and [`recorder`](https://github.com/cerebral/cerebral-module-recorder) uses internal `cerebral` mechanism of predefined signal run.
Router will update `addressbar` if any predefined signal was bound to route.
So your `addressbar` will be kept in sync even using recordings and time travel debugging.

### Routes config

Routes config is object passed as first argument.
Use [`path-to-regexp`](https://github.com/pillarjs/path-to-regexp) format routes as keys and signal name to bound as value.
Use `'/*'` as key to make a catch all route definition.
You can nest config object. Route will be concatenation of keys:

```js
Router({
  '/foo': 'foo',   // `/foo` <==> `foo`
  '/bar': {
    '': 'bar',     // `/bar` <==> `bar`
    '/baz': 'baz'  // `/bar/baz` <==> `baz`
  }
})
```

### Application startup

As said before router will autodetect any signal ran in sync with `modulesLoaded` event.
Router will not trigger if there was remembering of state occured before `modulesLoaded` event.
We strongly recommend not to run your initial signals in that case too.

You can set some `isLoaded` flag in state store within initial signal and chech it before run.
Or remove `modulesLoaded` event listener if there was `predefinedSignal` emitted.
```js
import NewTodo from './modules/NewTodo';
import List from './modules/List';
import Footer from './modules/Footer';

import appStarted from './signals/appStarted';

export default (options = {}) => {
  return (module, controller) => {

    module.modules({
      new: NewTodo(),
      list: List(),
      footer: Footer()
    });

    module.signals({
      appStarted
    })

    function init () {
      controller.getSignals().app.appStarted({}, { isSync: true });
    }

    controller.once('predefinedSignal', function () {
      controller.removeListener('modulesLoaded', init)
    })

    controller.once('modulesLoaded', init)
  };
}
```

### Preserving payload type

We suppose that router usage should be safe.
We can't be sure that nothing will break if we pass `String` instead of `Number` or `Boolean` to signal payload when triggering signal from url.
Thats why router will preserve types when stringifying payload to url.
But it can cause "unexpected" appear of `%3A` entries in url.
Cast your payload param that appears in url path part to string if you do not want to `%3A` to appear in url.
It is your responsibility to make sure that your action deal with `String` as you expected.

Given that you still be able to disable router at any time.

### Queries powered with urlon

Path-to-regexp is pretty powerfull, but sometimes you want your url would hold more information to pass your app.
Usually it is done through queries. Using the same considerations as in previous point we decided that types should be preserved.
We can enable query support with [`urlon`](https://github.com/vjeux/URLON) super powers of stringify/pasrse any JSON compatible object (any payload can be passed to signal, as fact).
Just pass `mapper: { query: true }` to router options and any payload not defined in path part would be stringified to query part.
It is not easy to construct `urlon` queries by hands, but you never had to. Just keep reading.

### Create links

Most times you need to have a links in app. It enables sharing url, opening url in new tab, etc.
You can use [`getSignalUrl`](http://cerebral.github.io/cerebral-module-router/index.html#_index_d_.routerservice.getsignalurl) method exposed by router to avoid hardcoding urls within app.
Please follow your view package documentation to see if it already have component to make a links.
Fell free to create an issue on that package otherwise.

Link component will fallback to `onClick` event handler if router is absent.
So you can disable router at any time even if you are using links.

[npm-image]: https://img.shields.io/npm/v/cerebral-module-router.svg?style=flat
[npm-url]: https://npmjs.org/package/cerebral-module-router
[travis-image]: https://img.shields.io/travis/cerebral/cerebral-module-router.svg?style=flat
[travis-url]: https://travis-ci.org/cerebral/cerebral-module-router
[coveralls-image]: https://img.shields.io/coveralls/cerebral/cerebral-module-router.svg?style=flat
[coveralls-url]: https://coveralls.io/r/cerebral/cerebral-module-router?branch=master
[bithound-image]: https://www.bithound.io/github/cerebral/cerebral-module-router/badges/score.svg
[bithound-url]: https://www.bithound.io/github/cerebral/cerebral-module-router
[commitizen-image]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[commitizen-url]: http://commitizen.github.io/cz-cli/
[semantic-release-image]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square
[semantic-release-url]: https://github.com/semantic-release/semantic-release
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg
[standard-url]: http://standardjs.com/
[discord-image]: https://img.shields.io/badge/discord-join%20chat-blue.svg
[discord-url]: https://discord.gg/0kIweV4bd2bwwsvH
