/**
 * Sahana Eden Mobile - Component Registry
 *
 * Copyright (c) 2016-2019 Sahana Software Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

EdenMobile.factory('emComponents', [
    function () {

        "use strict";

        var hooks = {};

        // --------------------------------------------------------------------
        /**
         * Parse and register a component description
         *
         * @param {Table} table - the master table
         * @param {string} alias - the component alias
         * @param {object} description - the component description
         *                               (as received from S3Mobile)
         */
        var addComponent = function(table, alias, description) {

            var master = table.name,
                pkey = description.pkey || 'id';

            if (!table.fields.hasOwnProperty(pkey)) {
                master = table.getObjectType(pkey);
            }

            if (master) {

                var tableHooks = hooks[master] || {};

                if (!tableHooks.hasOwnProperty(alias)) {

                    var multiple = description.multiple;
                    if (multiple === undefined) {
                        // Default true
                        multiple = true;
                    } else {
                        // Enforce boolean
                        multiple = !!multiple;
                    }

                    var link = description.link,
                        hook = {
                            tableName: description.table,
                            pkey: pkey,
                            multiple: multiple
                        };

                    if (link) {
                        hook.link = link;
                        hook.lkey = description.joinby;
                        hook.rkey = description.key;
                        hook.fkey = description.fkey || 'id';
                    } else {
                        hook.fkey = description.joinby;
                    }
                    tableHooks[alias] = hook;
                }
                hooks[master] = tableHooks;
            }
        };

        // --------------------------------------------------------------------
        /**
         * Look up all component hooks for a table (including object hooks)
         *
         * @param {Table} table - the master table
         *
         * @returns {object} - the component hooks {alias: description}
         */
        var getHooks = function(table) {

            var allHooks = {},
                tableHooks = hooks[table.name],
                objectHooks,
                alias;

            for (var objectType in table.objectTypes) {
                objectHooks = hooks[objectType];
                if (objectHooks) {
                    for (alias in objectHooks) {
                        allHooks[alias] = angular.extend(
                            {},
                            objectHooks[alias],
                            {pkey: 'em_object_id'});
                    }
                }
            }

            if (tableHooks) {
                for (alias in tableHooks) {
                    allHooks[alias] = tableHooks[alias];
                }
            }

            return allHooks;
        };

        // --------------------------------------------------------------------
        /**
         * Look up a component description ("hook")
         *
         * @param {Table} table - the master table
         * @param {string} alias - the component alias
         *
         * @returns {object} - the component description
         */
        var getComponent = function(table, alias) {

            var hook,
                tableHooks = hooks[table.name];

            if (tableHooks) {
                hook = tableHooks[alias];
            }

            if (!hook) {
                var objectType,
                    objectHooks;
                for (objectType in table.objectTypes) {
                    objectHooks = hooks[objectType];
                    if (objectHooks) {
                        hook = objectHooks[alias];
                        if (hook) {
                            hook = angular.extend({}, hook, {pkey: 'em_object_id'});
                            break;
                        }
                    }
                }
            }

            return hook;
        };

        // --------------------------------------------------------------------
        /**
         * Check if a table can be a component
         *
         * @param {string} tableName - the table name
         *
         * @returns {boolean}
         */
        var hasParent = function(tableName) {

            for (var master in hooks) {
                for (var alias in hooks[master]) {
                    var hook = hooks[master][alias];
                    if (hook.tableName == tableName || hook.link == tableName) {
                        return true;
                    }
                }
            }
            return false;
        };

        // --------------------------------------------------------------------
        /**
         * Remove all component hooks for a table
         *
         * @param {Table} table - the table
         *
         * @returns {promise} - a promise that is resolved when the process
         *                      is complete
         */
        var removeHooks = function(table) {

            var tableName = table.name,
                db = table._db;

            return db.ready.then(function() {
                delete hooks[tableName];

                var db = table._db,
                    objectTypes = table.objectTypes;
                table.objectTypes = {};

                for (var objectType in objectTypes) {
                    if (db.getInstanceTables(objectType).length === 0) {
                        delete hooks[objectType];
                    }
                }
                table.objectTypes = objectTypes;
            });
        };

        // --------------------------------------------------------------------
        /**
         * Remove all component hooks involving user tables
         */
        var reset = function() {

            var isUserTable = function(tn) {
                return tn.slice(0, 3) != 'em_';
            };

            Object.keys(hooks).forEach(function(tableName) {

                if (isUserTable(tableName)) {
                    // Drop all hooks
                    delete hooks[tableName];
                    return;
                }

                var tableHooks = hooks[tableName];
                Object.keys(tableHooks).forEach(function(alias) {
                    var hook = tableHooks[alias];
                    // Drop the hook if the target table or the link are not system tables
                    if (isUserTable(hook.tableName) || isUserTable(hook.link)) {
                        delete tableHooks[alias];
                    }
                });
            });
        };

        // ====================================================================
        var api = {

            addComponent: addComponent,
            getHooks: getHooks,
            getComponent: getComponent,
            hasParent: hasParent,
            removeHooks: removeHooks,
            reset: reset
        };

        return api;
    }
]);

// END ========================================================================
