export interface StoreLike<State = unknown> {
  getState(): State;
  subscribe(listener: () => void): (() => void) | void;
}

export type StateGetter<State = unknown> = (store: StoreLike<State>) => State;
export type CompareFunction = (currentValue: unknown, previousValue: unknown) => boolean;
export type WatchCallback<Value = unknown> = (
  currentValue: Value | undefined,
  previousValue: Value | undefined,
  path: readonly string[],
) => void;

type ImmutableState = {
  getIn(path: readonly string[]): unknown;
};

type Watcher = {
  path: string[];
  callbacks: Set<WatchCallback>;
};

let store: StoreLike | null = null;
let currentState: unknown;
let stateGetter: StateGetter = (configuredStore) => configuredStore.getState();
let compareValues: CompareFunction = (currentValue, previousValue) =>
  currentValue === previousValue;
let unsubscribeStore: (() => void) | undefined;

const watchers = new Map<string, Watcher>();

const getPathValue = (state: unknown, path: readonly string[]): unknown => {
  if (state == null) return undefined;

  if (typeof (state as Partial<ImmutableState>).getIn !== 'function') {
    throw new TypeError('Store state must provide an Immutable.js-compatible getIn method');
  }

  return (state as ImmutableState).getIn(path);
};

const handleStoreChange = (): void => {
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

export const setStore = <State>(
  nextStore: StoreLike<State>,
  customStateGetter?: StateGetter<State>,
): StoreLike<State> => {
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
  store = nextStore as StoreLike;
  stateGetter = (customStateGetter ?? ((configuredStore) => configuredStore.getState())) as StateGetter;
  currentState = stateGetter(store);

  const unsubscribe = store.subscribe(handleStoreChange);
  unsubscribeStore = typeof unsubscribe === 'function' ? unsubscribe : undefined;

  return nextStore;
};

export const setCompareFn = (compareFn: CompareFunction): void => {
  if (typeof compareFn !== 'function') {
    throw new TypeError('setCompareFn requires a function');
  }

  compareValues = compareFn;
};

export const watch = <Value = unknown>(
  objectPath: string,
  callback: WatchCallback<Value>,
): (() => void) => {
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

  const typedCallback = callback as WatchCallback;
  watcher.callbacks.add(typedCallback);

  return () => {
    const currentWatcher = watchers.get(objectPath);
    if (!currentWatcher) return;

    currentWatcher.callbacks.delete(typedCallback);
    if (currentWatcher.callbacks.size === 0) watchers.delete(objectPath);
  };
};
