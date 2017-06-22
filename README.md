## Redux Watch Immutable

Watch/observe Redux store state changes using Immutable.js.

### Why?

[Redux-watch](https://github.com/jprichardson/redux-watch) is a small but helpful library that associate a `callback()` to a `path-to-the-store`.
Unfortunalety, it's not optimized/made to work with Immutable.js. So we took the main concept and made it work :wink:

### Install

```
npm i --save redux-watch-immutable
```

### Usage

`setStore(store)` -> `store`

Set your store. *This is a mandatory step!*


`setCompareFn(function)`

By default, `redux-watch-immutable` uses `===` (strict equal) operator to check for changes. This may not be want you want. Sometimes you may want to do a deep inspection. You should use either [deep-equal](https://www.npmjs.com/package/deep-equal) ([substack/node-deep-equal](https://github.com/substack/node-deep-equal)) or [is-equal](https://www.npmjs.com/package/is-equal) ([ljharb/is-equal](https://github.com/ljharb/is-equal)). `is-equal` is better since it supports ES6 types like Maps/Sets.

```js
import isEqual from 'is-equal'
import {setCompareFn} from 'redux-watch-immutable'

setCompareFn(isEqual);
```


`watch(objectPath , callback)` -> `function`

Add a watcher on a specific path of the store and a callback for when the value changes. 
It returns a function to call when you want to unsubscribe.

The callback returns the new value, the previous one, and the current path.

### Example

```js
import {setStore, setCompareFn, watch} from 'redux-watch-immutable';
import isEqual from 'is-equal'
import store from 'store';

// First, set the store
setStore(store);

// We want to use isEqual to compare values
setCompareFn(isEqual);


// Then, add as many watchers as you need
const watcher = watch('admin.name', ::_onAdminNameChanged);

const _onAdminNameChanged = (name, prevName, path) {
	// console.log('new name!', name);
};


// Somewhere else, admin reducer handles ADMIN_UPDATE
store.dispatch({ type: 'ADMIN_UPDATE', payload: { name: 'JOE' }})


// Remove a watcher
watcher();

```

## License

MIT

Copyright (c) [Arnaud Tanielian](https://github.com/danetag), [Abhaya Rawal](https://github.com/abhayarawal)