// @ts-check

/**
 * A minimal Redux-compatible store.
 *
 * @template [State=unknown]
 * @typedef {object} StoreLike
 * @property {() => State} getState Returns the current store state.
 * @property {(listener: () => void) => (() => void) | void} subscribe Registers a change listener and may return an unsubscribe function.
 */

/**
 * Selects the Immutable.js state to watch from a configured store.
 *
 * @template [State=unknown]
 * @callback StateGetter
 * @param {StoreLike<State>} store
 * @returns {State}
 */

/**
 * Compares watched values. Return `true` when the values are equal.
 *
 * @callback CompareFunction
 * @param {unknown} currentValue
 * @param {unknown} previousValue
 * @returns {boolean}
 */

/**
 * Receives a watched value after it changes.
 *
 * @template [Value=unknown]
 * @callback WatchCallback
 * @param {Value | undefined} currentValue
 * @param {Value | undefined} previousValue
 * @param {readonly string[]} path
 * @returns {void}
 */

/** @typedef {{getIn(path: readonly string[]): unknown}} ImmutableState */
/** @typedef {{path: string[], callbacks: Set<WatchCallback<any>>}} Watcher */

/** @type {StoreLike<any> | null} */
let store = null;
/** @type {unknown} */
let currentState;
/** @type {StateGetter<any>} */
let stateGetter = (configuredStore) => configuredStore.getState();
/** @type {CompareFunction} */
let compareValues = (currentValue, previousValue) => currentValue === previousValue;
/** @type {(() => void) | undefined} */
let unsubscribeStore;

/** @type {Map<string, Watcher>} */
const watchers = new Map();

/**
 * @param {unknown} state
 * @param {readonly string[]} path
 * @returns {unknown}
 */
const getPathValue = (state, path) => {
  if (state == null) return undefined;

  const immutableState = /** @type {Partial<ImmutableState>} */ (state);
  if (typeof immutableState.getIn !== 'function') {
    throw new TypeError('Store state must provide an Immutable.js-compatible getIn method');
  }

  return immutableState.getIn(path);
};

const handleStoreChange = () => {
  if (!store) return;

  const previousState = currentState;
  currentState = stateGetter(store);

  watchers.forEach(({path, callbacks}) => {
    const currentValue = getPathValue(currentState, path);
    const previousValue = getPathValue(previousState, path);

    if (!compareValues(currentValue, previousValue)) {
      callbacks.forEach((callback) => {
        // Keep callbacks asynchronous so dispatch can finish before observers run.
        setTimeout(() => callback(currentValue, previousValue, path), 0);
      });
    }
  });
};

/**
 * Configures the Redux-compatible store whose Immutable.js state should be watched.
 * Reconfiguring the module unsubscribes from the previous store when possible.
 *
 * @template State
 * @param {StoreLike<State>} nextStore
 * @param {StateGetter<State>} [customStateGetter]
 * @returns {StoreLike<State>}
 */
export const setStore = (nextStore, customStateGetter) => {
  if (
    !nextStore ||
    typeof nextStore.getState !== 'function' ||
    typeof nextStore.subscribe !== 'function'
  ) {
    throw new TypeError('setStore requires a store with getState and subscribe methods');
  }

  if (customStateGetter !== undefined && typeof customStateGetter !== 'function') {
    throw new TypeError('customStateGetter must be a function');
  }

  unsubscribeStore?.();
  store = nextStore;
  stateGetter = customStateGetter ?? ((configuredStore) => configuredStore.getState());
  currentState = stateGetter(store);

  const unsubscribe = store.subscribe(handleStoreChange);
  unsubscribeStore = typeof unsubscribe === 'function' ? unsubscribe : undefined;

  return nextStore;
};

/**
 * Replaces the equality function used by every watcher.
 *
 * @param {CompareFunction} compareFn
 * @returns {void}
 */
export const setCompareFn = (compareFn) => {
  if (typeof compareFn !== 'function') {
    throw new TypeError('setCompareFn requires a function');
  }

  compareValues = compareFn;
};

/**
 * Watches a dot-separated path and returns a function that removes the callback.
 * Registering the same callback on the same path more than once is idempotent.
 *
 * @template [Value=unknown]
 * @param {string} objectPath
 * @param {WatchCallback<Value>} callback
 * @returns {() => void}
 */
export const watch = (objectPath, callback) => {
  if (typeof objectPath !== 'string' || objectPath.trim() === '') {
    throw new TypeError('watch requires a non-empty string path');
  }

  if (typeof callback !== 'function') {
    throw new TypeError('watch requires a callback function');
  }

  let watcher = watchers.get(objectPath);
  if (!watcher) {
    watcher = {path: objectPath.split('.'), callbacks: new Set()};
    watchers.set(objectPath, watcher);
  }

  watcher.callbacks.add(callback);

  return () => {
    const currentWatcher = watchers.get(objectPath);
    if (!currentWatcher) return;

    currentWatcher.callbacks.delete(callback);
    if (currentWatcher.callbacks.size === 0) watchers.delete(objectPath);
  };
};
