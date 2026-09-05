import {Map as ImmutableMap} from 'immutable';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const createStore = (initialState) => {
  let state = initialState;
  const listeners = new Set();

  const store = {
    getState: () => state,
    subscribe: vi.fn((listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    setState: (nextState) => {
      state = nextState;
      listeners.forEach((listener) => listener());
    },
    listenerCount: () => listeners.size,
  };

  return store;
};

let library;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  library = await import('../src/index.js');
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('redux-watch-immutable', () => {
  it('setStore subscribes and initializes the current state', () => {
    const initialState = ImmutableMap({admin: ImmutableMap({name: 'Ada'})});
    const store = createStore(initialState);
    const callback = vi.fn();

    expect(library.setStore(store)).toBe(store);
    expect(store.subscribe).toHaveBeenCalledOnce();
    expect(store.listenerCount()).toBe(1);

    library.watch('admin.name', callback);
    store.setState(initialState.setIn(['admin', 'name'], 'Grace'));
    vi.runAllTimers();

    expect(callback).toHaveBeenCalledWith('Grace', 'Ada', ['admin', 'name']);
  });

  it('fires asynchronously when an Immutable path changes', () => {
    const store = createStore(ImmutableMap({admin: ImmutableMap({name: 'Ada'})}));
    const callback = vi.fn();
    library.setStore(store);
    library.watch('admin.name', callback);

    store.setState(store.getState().setIn(['admin', 'name'], 'Grace'));

    expect(callback).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(callback).toHaveBeenCalledWith('Grace', 'Ada', ['admin', 'name']);
  });

  it('does not fire when the watched value is unchanged', () => {
    const store = createStore(ImmutableMap({admin: ImmutableMap({name: 'Ada'})}));
    const callback = vi.fn();
    library.setStore(store);
    library.watch('admin.name', callback);

    store.setState(store.getState().set('other', true));
    vi.runAllTimers();

    expect(callback).not.toHaveBeenCalled();
  });

  it('uses a custom compare function', () => {
    const store = createStore(ImmutableMap({admin: ImmutableMap({name: 'Ada'})}));
    const callback = vi.fn();
    const compare = vi.fn(
      (current, previous) => String(current).toLowerCase() === String(previous).toLowerCase(),
    );
    library.setStore(store);
    library.setCompareFn(compare);
    library.watch('admin.name', callback);

    store.setState(store.getState().setIn(['admin', 'name'], 'ADA'));
    vi.runAllTimers();

    expect(compare).toHaveBeenCalledWith('ADA', 'Ada');
    expect(callback).not.toHaveBeenCalled();
  });

  it('supports multiple callbacks on one path and deduplicates the same callback', () => {
    const store = createStore(ImmutableMap({count: 0}));
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    library.setStore(store);

    library.watch('count', firstCallback);
    library.watch('count', firstCallback);
    library.watch('count', secondCallback);
    store.setState(store.getState().set('count', 1));
    vi.runAllTimers();

    expect(firstCallback).toHaveBeenCalledOnce();
    expect(secondCallback).toHaveBeenCalledOnce();
  });

  it('unsubscribe removes callbacks and removes an empty path', () => {
    const store = createStore(ImmutableMap({count: 0}));
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    library.setStore(store);

    const unsubscribeFirst = library.watch('count', firstCallback);
    const unsubscribeSecond = library.watch('count', secondCallback);
    unsubscribeFirst();
    store.setState(store.getState().set('count', 1));
    vi.runAllTimers();

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledOnce();

    unsubscribeSecond();
    store.setState(store.getState().set('count', 2));
    vi.runAllTimers();
    expect(secondCallback).toHaveBeenCalledOnce();
  });

  it('treats a missing Immutable path as undefined', () => {
    const store = createStore(ImmutableMap({other: true}));
    const callback = vi.fn();
    library.setStore(store);
    library.watch('missing.value', callback);

    expect(() => {
      store.setState(store.getState().set('other', false));
      vi.runAllTimers();
    }).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
  });

  it('unsubscribes from the previous store when setStore is called again', () => {
    const firstStore = createStore(ImmutableMap({count: 0}));
    const secondStore = createStore(ImmutableMap({count: 0}));

    library.setStore(firstStore);
    expect(firstStore.listenerCount()).toBe(1);

    library.setStore(secondStore);
    expect(firstStore.listenerCount()).toBe(0);
    expect(secondStore.listenerCount()).toBe(1);
  });

  it('validates store and compare function arguments', () => {
    expect(() => library.setStore(null)).toThrow(TypeError);
    expect(() => library.setStore({getState: () => ImmutableMap()})).toThrow(
      /getState and subscribe/,
    );
    expect(() => library.setStore(createStore(ImmutableMap()), null)).toThrow(
      /customStateGetter must be a function/,
    );
    expect(() => library.setCompareFn(null)).toThrow(/requires a function/);
  });

  it('validates watch arguments', () => {
    const callback = vi.fn();

    expect(() => library.watch('', callback)).toThrow(/non-empty string path/);
    expect(() => library.watch('   ', callback)).toThrow(/non-empty string path/);
    expect(() => library.watch(null, callback)).toThrow(/non-empty string path/);
    expect(() => library.watch('admin.name', null)).toThrow(/callback function/);
  });
});
