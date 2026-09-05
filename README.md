# Redux Watch Immutable

Watch values in an Immutable.js Redux state tree. Version 1 modernizes the original package as standards-based ESM JavaScript while preserving the classic `setStore`, `setCompareFn`, and `watch` API.

The package ships its source directly: there is no build step. Invalid arguments throw `TypeError` instead of being silently accepted or logged.

## Install

```sh
npm install redux-watch-immutable immutable redux
```

`immutable` and `redux` are peer dependencies. Supported versions are Immutable.js 4 or 5 and Redux 3 or newer. Node.js 20 or newer is required.

## Usage

```js
import {setCompareFn, setStore, watch} from 'redux-watch-immutable';
import {is} from 'immutable';
import store from './store.js';

setStore(store);
setCompareFn(is);

const removeWatcher = watch('admin.name', (name, previousName, path) => {
  console.log('new name', name, {previousName, path});
});

// Later:
removeWatcher();
```

Version 1 is ESM-only. CommonJS `require()` is not supported.

The source uses `// @ts-check` and documented JSDoc types, which provide type information and editor feedback in JavaScript projects. The package does not bundle TypeScript declaration (`.d.ts`) files.

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

Registering the same callback more than once for the same path does not duplicate notifications. Calling the returned function removes that callback. Missing Immutable.js paths resolve to `undefined` safely.

## Upgrading from v0

- Version 1 is ESM-only; CommonJS `require()` is not supported.
- Node.js 20 or newer is required.
- Invalid arguments now throw `TypeError`.
- `setCompareFn` now correctly applies the comparator passed to it.
- Malformed paths with leading, trailing, or consecutive dots now throw `TypeError`.

## Development

```sh
npm install
npm test
npm run typecheck
npm pack --dry-run
```

## License

MIT

Copyright (c) [Arnaud Tanielian](https://github.com/danetag), [Abhaya Rawal](https://github.com/abhayarawal)
