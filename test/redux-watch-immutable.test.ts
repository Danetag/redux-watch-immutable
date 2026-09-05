import {Map as ImmutableMap} from 'immutable';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import type {StoreLike} from '../src/index';

type State = ImmutableMap<string, unknown>;
type Library = typeof import('../src/index');

const createStore = (initialState: State) => {
  let state = initialState;
  const listeners = new Set<() => void>();

  const store: StoreLike<State> & {
    setState(nextState: State): void;
    listenerCount(): number;
  } = {
    getState: () => state,
    subscribe: vi.fn((listener: () => void) => {
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

let library: Library;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  library = await import('../src/index');
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
    const compare = vi.fn((current, previous) =>
      String(current).toLowerCase() === String(previous).toLowerCase(),
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

  it('validates store and compare function arguments', () => {
    expect(() => library.setStore(null as never)).toThrow(TypeError);
    expect(() => library.setStore({getState: () => ImmutableMap()} as never)).toThrow(
      /getState and subscribe/,
    );
    expect(() => library.setCompareFn(null as never)).toThrow(/requires a function/);
  });

  it('validates watch arguments', () => {
    const callback = vi.fn();

    expect(() => library.watch('', callback)).toThrow(/non-empty string path/);
    expect(() => library.watch('   ', callback)).toThrow(/non-empty string path/);
    expect(() => library.watch(null as never, callback)).toThrow(/non-empty string path/);
    expect(() => library.watch('admin.name', null as never)).toThrow(/callback function/);
  });
});
