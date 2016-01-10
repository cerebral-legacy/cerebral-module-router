# cerebral-module-router
An opinionated URL change handler for Cerebral

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![bitHound Score][bithound-image]][bithound-url]

### Install

`npm install cerebral-module-router`

### How to use

When you build your Cerebral application you do not have to think about routing at all.
You only trigger signals that brings your application into the correct state.
Let us imagine an application that can open a messages page, and also open specific messages.

```javascript

import controller from './controller.js';
import homeOpened from './signals/homeOpened';
import messagesOpened from './signals/messagesOpened';
import messageOpened from './signals/messageOpened';

controller.signal('messagesOpened', messagesOpened);
controller.signal('messageOpened', messageOpened);
```

When we want to open the messages we call the signal:

```javascript

onMessagesClick() {
  this.props.signals.messagesOpened();
}
```

When we want to open a single message we call the signal and pass a payload:

```javascript

onMessageClick(id) {
  this.props.signals.messageOpened({
    id: id
  });
}
```

The signature of a state change is the signal and the payload passed. We can bind this signature to a route. Lets imagine we have implemented our whole application and it works great, we just need to update the addressbar with a url representing the current state of the application.

So let us also add a `homeOpened` signal so that we handle the root url as well.

```javascript

import Router from 'cerebral-module-router';
import controller from './controller.js';
import homeOpened from './signals/homeOpened';
import messagesOpened from './signals/messagesOpened';
import messageOpened from './signals/messageOpened';

controller.signal('homeOpened', homeOpened);
controller.signal('messagesOpened', messagesOpened);
controller.signal('messageOpened', messageOpened);

Router(controller, {
  '/': 'homeOpened',
  '/messages': 'messagesOpened',
  '/messages/:id': 'messageOpened'
}, {
  mapper: { query: true } // Read about this below
});
```

Initial url would be handled automatically during application bootstrap if you are using `cerebral-react` (in container's `componentDidMount` method) or `cerebral-angular` (module's `run` section) packages.
Otherwise you should call `trigger` method to ensure that initial url is handled.

The router checks the url and fires the signal related to the url. The url will be parsed and any payload will be passed on the signal. That means if you go to `example.com/messages/123` it will trigger the `messageOpened` signal with the payload `{id: '123'}`.

But if you click a message in the list it will also trigger the `messageOpened` signal with the payload `{id: '456'}` and now the url will also update to `example.com/messages/456`.

So it works both ways!

The important thing to understand here is that your application does not trigger urls to change its state.
It triggers signals. Then you bind a route to a signal to allow a url to trigger the signal as well.

That means:

```javascript

// Going to url
"example.com/messages/456"

// Is exactly the same as
this.props.signals.messageOpened({
  id: '456'
});
```

### Diving into the app from a url
In the example above, when navigating in the app, you have to go to `/messages` before you can go to `/messages/456`.
But when you expose urls you could go directly to `/messages/456`. So how do you handle that?

```javascript

...
controller.signal('messageOpened', [...messagesOpened, ...messageOpened]);

Router(controller, {
  '/': 'homeOpened',
  '/messages': 'messagesOpened',
  '/messages/:id': 'messageOpened'
});
```

With Cerebral you are already used to composing chains and actions together and this is also effective when creating routes.
Now you might say, "I do not want to load my messages every time I open a message!".
There are multiple ways to handle this. It depends on when you want to load the messages.

But lets say you want to load them whenever you actually go to `/messages`.
Inside your `messagesOpened` signal you can just check if there is an ID on the input.
If there is an ID it means you are about to open a message, if not it means you are just opening the messages.

### What about queries?
With Cerebral you get a very powerful way to use queries.
But first we have to make a statement: "Queries are produced by your application, not by users".
With this perspective we can do some wonderful things. Lets get back to opening our message.
Inside the component opening the message we want to pass more than the ID of the message.
We want to pass: `{withComments: true}`. So that when we load the message, we load it with comments.

```javascript

onMessageClick(id) {
  this.props.signals.messageOpened({
    id: id,
    withComments: true
  });
}
```

Since this signal is bound to a url Cerebral router will automatically make this part of the query, turning your url into `example.com/messages/123?withComments:true`.
That means if you refresh or pass the url to somebody else it will pass `{id: '123', withComments: true}` as the payload to the signal, opening the message in the exact same way, with the comments.

Notice here that we have `withComments:true`, not `withComment=true`.
This is because Cerebral router uses the [`URLON`](https://github.com/vjeux/URLON) project to create serializable queries.
As you can see it is very powerful.

### Tell me more about how routes matched

`cerebral-module-router` relies on [`url-mapper`](https://github.com/cerebral/url-mapper) default behavior:

* [`path-to-regexp`](https://github.com/pillarjs/path-to-regexp) library is used to define routes and payload parameters.
It tweaked to preserve payload parameters with `Number` and `Boolean` types, prepending it with colon.
* Payload parameters not defined in route part is mapped to query using `URLON` notation if `mapper: { query: true }` option was passed to router.

Routable part of url is extracted based on `onlyHash` and `baseUrl` options provided to router.

```javascript
Router(controller, {
  '/': 'homeOpened',
  '/messages': 'messagesOpened',
  '/messages/:id': 'messageOpened'
}, {
  onlyHash: true,
  baseUrl: '/path',
  mapper: { query: true }
});
```

With given config and `https://example.com/path#/messages/123?withComments:true` url `/messages/123?withComments:true` is routable part.
Then `url-mapper` matches it to route `/messages/:id` and extracts payload `{id: '123', withComments: true}`.

### I want my own scheme for routes as well as queries

Feel free to implement [`compileFn`](https://github.com/cerebral/url-mapper/#matcher) which return your own `parse` and `stringify` methods for given route.
The only recommendation is: parse method for previously stringified payload should result the same payload. Just like `JSON.parse(JSON.stringify(object))`.
[Create an issue](https://github.com/cerebral/cerebral-module-router/issues/new) if you need this now since `cerebral-module-router` had to be patched to support custom mapper.

[npm-image]: https://img.shields.io/npm/v/cerebral-module-router.svg?style=flat
[npm-url]: https://npmjs.org/package/cerebral-module-router
[travis-image]: https://img.shields.io/travis/cerebral/cerebral-module-router.svg?style=flat
[travis-url]: https://travis-ci.org/cerebral/cerebral-module-router
[coveralls-image]: https://img.shields.io/coveralls/cerebral/cerebral-module-router.svg?style=flat
[coveralls-url]: https://coveralls.io/r/cerebral/cerebral-module-router?branch=master
[bithound-image]: https://www.bithound.io/github/cerebral/cerebral-module-router/badges/score.svg
[bithound-url]: https://www.bithound.io/github/cerebral/cerebral-module-router
