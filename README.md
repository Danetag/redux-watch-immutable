# Redux Watch Immutable

Watch values in an Immutable.js Redux state tree. This release modernizes the package with TypeScript and ESM/CommonJS builds while preserving the classic `setStore`, `setCompareFn`, and `watch` API.

> **Version 1:** Packaging and runtime support are modernized. Invalid arguments now throw `TypeError` instead of being silently accepted or logged.

## Install

```sh
npm install redux-watch-immutable immutable redux
```

`immutable` and `redux` are peer dependencies. Supported versions are Immutable.js 4 or 5 and Redux 3 or newer.

## Usage

### ESM / TypeScript

```ts
import {setCompareFn, setStore, watch} from 'redux-watch-immutable';
import store from './store';

const onAdminNameChanged = (
  name: unknown,
  previousName: unknown,
  path: readonly string[],
) => {
  console.log('new name', name, {previousName, path});
};

setStore(store);
setCompareFn((current, previous) => current === previous);

const removeWatcher = watch('admin.name', onAdminNameChanged);

// Later:
removeWatcher();
```

Type declarations are included in the package.

### CommonJS

```js
const {setStore, setCompareFn, watch} = require('redux-watch-immutable');
```

## API

### `setStore(store, customStateGetter?)`

Configures the Redux-compatible store and initializes the current state. The store must provide `getState()` and `subscribe()` methods. State values are read through Immutable.js `getIn(path)`.

An optional state getter can select the Immutable state when it is nested inside another value:

```js
setStore(store, (configuredStore) => configuredStore.getState().immutableState);
```

Calling `setStore` again unsubscribes from the previously configured store when its subscription provides an unsubscribe function.

### `setCompareFn(compareFn)`

Sets the equality function used by all watchers. It receives the current and previous values and must return `true` when they should be considered equal. Strict equality (`===`) is used by default.

```js
import {is} from 'immutable';

setCompareFn(is);
```

### `watch(objectPath, callback)`

Watches a non-empty dot-separated path such as `admin.name`. The callback runs asynchronously after the store subscription fires and receives:

1. the new value;
2. the previous value;
3. the path as an array of strings.

```js
const unsubscribe = watch('admin.name', (name, previousName, path) => {
  console.log({name, previousName, path});
});

unsubscribe();
```

Registering the same callback more than once for the same path does not duplicate notifications. Calling the returned function removes that callback.

## Development

```sh
npm install
npm test
npm run build
npm run typecheck
```

## License

MIT

Copyright (c) [Arnaud Tanielian](https://github.com/danetag), [Abhaya Rawal](https://github.com/abhayarawal)
