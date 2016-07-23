## cerebral-module-router

Go to official [README](https://github.com/cerebral/cerebral-view-router/blob/master/README.md) to read more technical details.

### Concept
The Cerebral router works a bit differently than traditional routers. Traditional routers are attached directly to you view layer and has APIs for handling data fetching, transitions etc. The Cerebral router just maps url changes to signals.

With the Cerebral router you can actually build your whole application without thinking about the router and later attach url to specific signals. It does not matter if it is a url change or the signal being triggered directly, the url will be kept in sync automatically.

### Instantiate the router
```javascript
...

import Router from 'cerebral-module-router'

...

controller.addModules({
  router: Router({
    // Define paths and signals
    '/': 'app.someSignal',
  }, {
    // use only hash part of url for matching
    onlyHash: true,
    // base part, that ignored on route match. detected automatically if `onlyHash` option set to true   
    baseUrl: '/',           
    // prevents automatic triggering after `modulesLoaded` event
    preventAutostart: true,
    // allow navigation to urls not matched to trigger normally
    allowEscape: true
  })
)
```

### Creating pages

Typically you use a router to open specific pages of your application. With the Cerebral router you can do a lot more than that, but it is a good place to start. Lets say we have two signals for opening the home page and the admin page, `menu.homeClicked` and `menu.adminClicked`. Let us first map the urls to these signals:

```javascript
...

import Router from 'cerebral-module-router'
import App from './modules/App'
import Menu from './modules/Menu'

...

controller.addModules({
  app: App(),
  menu: Menu(),

  router: Router({
    '/': 'menu.homeClicked',
    '/admin': 'menu.adminClicked'
  })
})
```

Our two signals fires of each of their action chains changing the state of the application. Specifically we want to tell the application which page we are on:

*modules/Menu/chains/openHome.js*
```javascript
import {set} from 'cerebral/operators'

export default [
  set('app.currentPage', 'home')  
]
```

Now we have the state we need to mount the correct component. A typical implementation of this would be, using React:

```javascript
import React from 'react'
import {connect} from 'cerebral-view-react'

import Home from '../Home'
import Admin from '../Admin'

const pages = {
  home: Home,
  admin: Admin
}

export default connect({
  currentPage: 'app.currentPage'
},
  function App(props) {
    const Page = pages[props.currentPage]

    return (
      <Page />
    )
  }
)
```

### Transitions
So what if we wanted to create a transition here? As you can see we are now free to create transitions like we create any other transitions in our view layer. One approach using [react transition groups](https://facebook.github.io/react/docs/animation.html) would look something like this:

```javascript
import React from 'react'
import {connect} from 'cerebral-view-react'
import ReactCSSTransitionGroup from 'react-addons-css-transition-group'

import Home from '../Home'
import Admin from '../Admin'

const pages = {
  home: Home,
  admin: Admin
}

export default connect({
  currentPage: 'app.currentPage'
},
  function App(props) {
    const Page = pages[props.currentPage]

    return (
      <ReactCSSTransitionGroup transitionName="example" transitionEnterTimeout={500} transitionLeaveTimeout={300}>
        <Page />
      </ReactCSSTransitionGroup>
    )
  }
)
```

But you can do whatever you want here. Maybe [react-motion](https://github.com/chenglou/react-motion) is more your thing. The point is that there is no router specific behaviour here. We just change the state of the app and our view takes care of its responsibility.

### Data fetching
Typically you want to fetch some data related to a route change. With Cerebral you handle that the same way as any other event in your application. Let us extend our **openHome** chain with some data-fetching:

```javascript
import {set} from 'cerebral/operators'
import getData from '../actions/getData'
import setData from '../actions/setData'
import notifyError from 'modules/App/factories/notifyError'

export default [
  set('app.isLoadingPage', true),
  set('app.currentPage', 'home'),
  getData, {
    success: [
      setData
    ],
    error: [
      notifyError('Could not fetch data for home')
    ]
  }
]
```

And our component can now display something else when things are loading:

```javascript
import React from 'react'
import {connect} from 'cerebral-view-react'

import LoadingPage from '../LoadingPage'
import Home from '../Home'
import Admin from '../Admin'

const pages = {
  home: Home,
  admin: Admin
}

export default connect({
  currentPage: 'app.currentPage',
  isLoadingPage: 'app.isLoadingPage'
},
  function App(props) {
    if (props.isLoadingPage) {
      return <LoadingPage />
    }

    const Page = pages[props.currentPage]

    return (
      <Page />
    )
  }
)
```

### Trigger urls and signals
When a route is mapped to a signal they become "the same thing". It does not matter if you fire the url directly or the signal directly, the url is kept in sync. So for example if you want to open a modal showing a post:

```javascript
...

controller.addModules({
  ...
  router: Router({
    '/': 'menu.homeClicked',
    '/posts': 'menu.postsClicked',
    '/posts/:id': 'posts.postClicked'
  })
})
```

We can go to url: `/posts/123` or we can trigger the signal: `signals.posts.postClicked({id: '123'})`. The same thing will happen. What you have to keep in mind though is that with urls you are able to point directly into your application, which means that when going to `/posts/123` you probably want the posts page to have been opened as well. This is where composition plays its part:

*modules/Posts/chains/openPost.js*
```javascript
import {set} from 'cerebral/operators'
import openPosts from 'modules/Menu/chains/openPosts'
import getPost from '../actions/getPost'
import setPost from '../actions/setPost'
import notifyError from 'modules/App/factories/notifyError'

export default [
  ...openPosts,
  set('posts.showPostModal', true),
  set('posts.isLoadingPost', true),
  getPost, { // Uses ID past into signal
    success: [
      setPost
    ],
    error: [
      notifyError('Could not grab post')
    ]
  },
  set('posts.isLoadingPost', false)
]
```

As you can see we can pretty much make anything happen when you go to a url. You are no longer constrained to think about what should happen in your view, you rather think "what state changes should occur?". Then your view layer will do its part based on this.

### Redirecting
Often you need to redirect. With Cerebral you are able to do this redirect inside the chains. Let us imagine a chain handling the login routine of your application:

```javascript
import redirect from 'cerebral-module-router/redirect'
import {copy} from 'cerebral/operators'

export default [
  authenticate, {
    success: [
      redirect('/home')
    ],
    error: [
      copy('input:error', 'state:auth.error')
    ]
  }
]
```

If you prefer redirecting to a signal bound to a route you can use `redirectToSignal` instead:

```javascript
import redirectToSignal from 'cerebral-module-router/redirectToSignal'

export default [
  redirectToSignal('app.homeClicked')
]
```

Sometimes you might want to dynamically redirect based on an input or state. The router service available in actions will help you do that:

```javascript
function redirectToUser({input, services}) {
  services.router.redirect(`/users/${input.userId}`)
}
```

Or redirect to signal:

```javascript
function redirectToUser({input, services}) {
  services.router.redirectToSignal('app.userClicked', {
    id: input.userId
  })
}
```
