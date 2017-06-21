let store = null;
let currentState = null;

const aPath = [];
const aPathExisting = [];

let compareValues = (a, b) => {
    return a === b;
};

const compareStates = (a, b) => {
  return a.equals(b);
};

const watch = () => {
    const prev = currentState;
    currentState = store.getState();

    if (!compareStates(prev, currentState)) {
        aPath.forEach((o, i) => {
            const splitPath = o.path.split('.');
            if (!compareValues(currentState.getIn(splitPath), prev.getIn(splitPath))) {
                o.aCallback.forEach((cb) => {
                    // setTimeout: to make sure the stack is free
                    setTimeout(() => cb(currentState.getIn(splitPath), prev.getIn(splitPath), o.path), 0);
                });
            }
        });
    }
};

/* API */

export const setStore = (store_ = null) => {
    if (!store_) {
        console.error('You haven\'t provided a store');
        return false;
    }
    store = store_;
    currentState = store.getState();
    store.subscribe(watch);
    return store;
};

export const setCompareMethod = (compare_ = null) => {
    if (!compare_) compareValues = compare_;
};

export const addWatcher = (objectPath = '', callback = null) => {
    const idx = aPathExisting.indexOf(objectPath);

    // New path
    if (idx > -1) {
        // if new callback, add it
        let check = true;
        aPath[idx].aCallback.forEach((cb) => {
          if (cb === callback) check = false;
        });

        if (check) {
          // add the callback yo an existing path
          aPath[idx].aCallback.push(callback);
        }
    } else {
        aPath.push({
            path: objectPath,
            aCallback: [callback]
        });

        aPathExisting.push(objectPath);
    }

    // return the dispose function
    return () => {
        if (idx > -1) {
            // delete only the callback. If last callback, delete the path
            let idxCb = 0;
            aPath[idx].aCallback.forEach((cb, i) => {
                if (cb === this.callback) idxCb = i;
            });

            aPath[idx].aCallback.splice(idxCb, 1);

            if (!aPath[idx].aCallback.length) {
                aPath.splice(idx, 1);
                aPathExisting.splice(idx, 1);
            }
        }
    };
};
