/** code example extracted from a Node module **/
'use strict';

// Export FSWatcher class
export const FSWatcher = FSWatcher;

/**
 * Instantiates watcher with paths to be tracked.
 * @param {String|Array<String>} paths file/directory paths and/or globs
 * @param {Object=} options chokidar opts
 * @returns an instance of FSWatcher for chaining.
 */
export const watch  = (paths, options) => {
    const watcher = new FSWatcher(options);
    watcher.add(paths);
    return watcher;
};


