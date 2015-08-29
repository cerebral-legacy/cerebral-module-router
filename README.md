# cerebral-router
An opinionated URL change handler for Cerebral

The Cerebral Router as a concept allows you to create your application without thinking about routing and URLs at all. You just create signals as if you would trigger all of them manually. The router can then be hooked on and urls are routed to these already existing signals. So a URL change or manual signal trigger is transparent, it does not matter how you do it. The url will keep in sync.

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
<a href="/">home</a>

// By signal
controller.signals.homeOpened();
```

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
Often you want routes with subroutes, like the example above. Lets say when I open a message I want the `messages` page to be opened also. That way if I go directly to the URL or trigger the signal from some other part of my application I am always sure that I first go to the messages page, then the message will be opened. This is something you handle in the signal definition. So if you would trigger `messageOpened` and want `messagesOpened` to also run, you would handle it like this:

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

### Hash
By default the Cerebral router just takes control of the addressbar and all url changes are handled as normal urls, even hash urls are converted to normal urls. So any route changes you do, being hash or normal will be "captured". If you set the `onlyHash` option to true, only hash urls will be captured and they will also be display in the addressbar as hash routes. That also means you have to define all urls in hyperlinks as: `<a href="/#/">home</a>`, using `/#` in front of the actual url.

Some libraries allows you to still use normal links even though you are using hashes. I think it causes confusion. Either you use hashes all over or you do not.

### Queries
If the url has any queries those are available on the `input` of the signal chain, if it was triggered by a URL, or you manually passed a query object when triggering the signal.
