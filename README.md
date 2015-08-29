# cerebral-router
An opinionated URL change handler for Cerebral

```js
import controller from './controller.js';
import Router from 'cerebral-router';

controller.signal('homeOpened', setTitle('home'));
controller.signal('adminOpened', setTitle('admin'));

Router(controller, {
  '/': 'homeOpened',
  '/admin': 'adminOpened'
}, {
  onlyHash: true // Default is false
});
```

The Cerebral router allows you to trigger signals directly or with a url. It has the exact same effect. So:

```js
// By hyperlink or addressbar change
<a href="/#/home">home</a>

// If onlyHash is not true
<a href="/home">home</a>

// By signal
controller.signals.homeOpened();
```
Even when triggering the signal directly the URL will be reflected.

### Dynamic routes
```js
Router(controller, {
  '/messages': 'messagesOpened',
  '/messages/:id': 'messageOpened'
});
```

Again, Cerebral lets you trigger the signals however you like. It being an actual url change or just call the signal directly. The url will be correctly reflected:

```js
// By url change
<a href="/messages/abc-123">home</a>

// By signal
controller.signals.messageOpened({
  id: 'abc-123'
});
```


### Composing route signals
Often you want routes with subroutes, like the example above. This is something you handle in the signal definition. So if you would trigger `messageOpened` and want `messagesOpened` to also run, you would handle it like this:

```js
import controller from './controller.js';
import messagesOpened from './chains/messagesOpened.js';
import messageOpened from './chains/messageOpened.js';

controller.signal('messagesOpened', ...messagesOpened);
controller.signal('messageOpened', ...messagesOpened, ...messageOpened);
```

This gives you complete flexibility in how you want to handle route changes.

### setUrl
Cerebral router will inject an action into the chains that can be triggered by the router. This action is called `setUrl` and just sets the current url in the state store. This keeps the addressbar in sync with the signal triggered and time travel debugging also works as expected.
