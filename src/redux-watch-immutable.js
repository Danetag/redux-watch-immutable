let store = null;
let currentState = null;
let stateGetter = null;

const aPath = [];
const aPathExisting = [];

let compareValues = (a, b) => {
    return a === b;
};

let defaultStateGetter = (store) => {
    return store.getState();
};

const watch_ = () => {
    const prev = currentState;
    currentState = stateGetter(store);

    aPath.forEach((o, i) => {
        const currentValue = currentState.getIn(o.path);
        const prevValue = prev.getIn(o.path);
        if (!compareValues(currentValue, prevValue)) {
            o.aCallback.forEach((cb) => {
                // setTimeout: to make sure the stack is free
                setTimeout(() => cb(currentValue, prevValue, aPath[i]), 0);
            });
        }
    });
};

/* API */

export const setStore = (store_ = null, customStateGetter) => {
    if (!store_) {
        console.error('You haven\'t provided a store');
        return false;
    }
    store = store_;
    stateGetter = customStateGetter || defaultStateGetter;
    currentState = stateGetter(store);
    store.subscribe(watch_);
    return store;
};


export const setCompareFn = (compare_ = null) => {
    if (!compare_) compareValues = compare_;
};

export const watch = (objectPath = '', callback = null) => {
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
            path: objectPath.split('.'),
            aCallback: [callback]
        });

        aPathExisting.push(objectPath);
    }

    // return the dispose function
    return () => {
        const idxPath = aPathExisting.indexOf(objectPath);

        if (idxPath > -1) {
            // delete only the callback. If last callback, delete the path
            let idxCb = -1;
            aPath[idxPath].aCallback.forEach((cb, i) => {
                if (cb === callback) idxCb = i;
            });

            if (idxCb > -1) aPath[idxPath].aCallback.splice(idxCb, 1);

            if (!aPath[idxPath].aCallback.length) {
                aPath.splice(idxPath, 1);
                aPathExisting.splice(idxPath, 1);
            }
        }
    };
};
