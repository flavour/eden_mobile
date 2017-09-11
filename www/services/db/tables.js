/**
 * Sahana Eden Mobile - Database Tables
 *
 * Copyright (c) 2016-2017: Sahana Software Foundation
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

EdenMobile.factory('Table', [
    '$q', 'emDefaultSchema', 'emFiles', 'emSQL', 'Expression', 'Field',  'Set',
    function ($q, emDefaultSchema, emFiles, emSQL, Expression, Field, Set) {

        "use strict";

        // ====================================================================
        /**
         * Table constructor
         *
         * @param {Database} db - the database
         * @param {string} name - the tablename
         * @param {object} fields - the fields {fieldName: Field, ...}
         * @param {object} settings - the table settings {key: value}
         */
        function Table(db, tableName, fields, settings) {

            this._db = db;
            this.name = tableName;

            var field,
                fieldName,
                tableFields = {};

            for (fieldName in fields) {
                field = fields[fieldName];
                if (field.table) {
                    field = field.clone();
                }
                field.table = this;
                tableFields[fieldName] = field;
            }

            this.fields = tableFields;
            this.settings = settings;

            this.resources = {};
        }

        // --------------------------------------------------------------------
        /**
         * Shortcut for Table.fields["fieldName"]: Table.$("fieldName")
         *
         * @param {string} fieldName - the field name
         *
         * @returns {Field} - the Field, or undefined if no field with this
         *                    name is defined in the table
         */
        Table.prototype.$ = function(fieldName) {

            return this.fields[fieldName];
        };

        // --------------------------------------------------------------------
        /**
         * Construct a WHERE expression (assertion) from raw SQL
         *
         * @param {string} sqlStr - the SQL WHERE expression as string
         *
         * @returns {Expression} - an Expression with exprType 'assert'
         */
        Table.prototype.sqlAssert = function(sqlStr) {

            return new Expression('assert', sqlStr, 'sql');
        };

        // --------------------------------------------------------------------
        /**
         * Get a string representation for this table
         *
         * @returns {string} - a string representation for this table
         */
        Table.prototype.toString = function() {

            return this.name;
        };

        // --------------------------------------------------------------------
        /**
         * Get the SQL identifier of this table (for use in SQL statements)
         *
         * @returns {string} - the SQL identifier
         */
        Table.prototype.toSQL = function() {

            return this.name;
        };

        // --------------------------------------------------------------------
        /**
         * @todo: implement this
         * @todo: docstring
         */
        //Table.prototype.as = function() {
        //
        //};

        // --------------------------------------------------------------------
        /**
         * Create a join expression
         *
         * @param {Expression} expr - the assertion for the join
         *
         * @returns {Expression} - the join expression
         *
         * @example
         *  table.on(table.$('key').equals(otherTable.$('key')))
         */
        Table.prototype.on = function(expr) {

            if (expr.exprType != 'assert') {
                throw new Error('invalid join expression');
            }
            return new Expression('join', this, 'on', expr);
        };

        // --------------------------------------------------------------------
        /**
         * Create a Set from this table
         *
         * @param {Expression} expr - the filter query (WHERE) for the Set
         *
         * @returns {Set} - the Set
         *
         * @example
         *  table.where(query)
         *       .select([field1, field2], callback);
         */
        Table.prototype.where = function(expr) {

            return new Set(this).where(expr);
        };

        // --------------------------------------------------------------------
        /**
         * Create a Set with an inner join
         *
         * @param {Expression} expr - the join expression
         *
         * @returns {Set} - the Set
         *
         * @example
         *  table.join(otherTable.on(assertion))
         *       .where(query)
         *       .select([field1, field2], callback);
         */
        Table.prototype.join = function(expr) {

            return new Set(this).join(expr);
        };

        // --------------------------------------------------------------------
        /**
         * Create a Set with a left join
         *
         * @param {Expression} expr - the join expression
         *
         * @returns {Set} - the Set
         *
         * @example
         *  table.left(otherTable.on(assertion))
         *       .where(query)
         *       .select([field1, field2], callback);
         */
        Table.prototype.left = function(expr) {

            return new Set(this).left(expr);
        };

        // --------------------------------------------------------------------
        /**
         * Add the standard meta fields to this table (as defined in emDefaultSchema)
         */
        Table.prototype.addMetaFields = function() {

            var tableName = this.name,
                fields = this.fields;

            if (tableName != 'em_version' && !fields.hasOwnProperty('id')) {
                fields.id = new Field(this, 'id', {
                    type: 'id',
                    readable: false,
                    writable: false
                }, true);
            }

            var metaFields = emDefaultSchema.metaFields,
                field;
            if (metaFields && tableName.slice(0, 3) != 'em_') {
                for (var fieldName in metaFields) {
                    if (!fields.hasOwnProperty(fieldName)) {
                        field = new Field(this, fieldName, metaFields[fieldName], true);
                        fields[fieldName] = field;
                    }
                }
            }
        };

        // --------------------------------------------------------------------
        /**
         * Create this table in the database
         *
         * @param {Array} records - Array of records to populate the table with
         * @param {function} callback - callback function: function(tableName)
         */
        Table.prototype.create = function(records, callback) {

            var self = this;

            var sqlTable = emSQL.Table(self),
                sql = [sqlTable.drop(), sqlTable.create()];

            var db = self._db,
                adapter = db._adapter;

            adapter.sqlBatch(sql, function() {

                var tableName = self.name;

                db.tables[tableName] = self;

                if (tableName == 'em_schema') {
                    // Save all existing schemas
                    for (tableName in db.tables) {
                        db.tables[tableName].saveSchema();
                    }
                } else {
                    // Save this schema
                    self.saveSchema();
                }

                // Populate with records
                self.populate(records, callback);

            }, db.sqlError);
        };

        // --------------------------------------------------------------------
        /**
         * Populate this table with records
         *
         * @param {Array} records - Array of records to populate the table with
         * @param {function} callback - callback function: function(tableName)
         */
        Table.prototype.populate = function(records, callback) {

            var sqlTable = emSQL.Table(this),
                sql = [];

            if (records) {
                for (var i = 0, len = records.length; i < len; i++) {
                    var insertSQL = sqlTable.insert(records[i]);
                    if (insertSQL) {
                        sql.push(insertSQL);
                    }
                }
            }

            var tableName = this.name,
                db = this._db,
                adapter = db._adapter;

            if (sql.length) {
                adapter.sqlBatch(sql, function() {
                    if (callback) {
                        callback(tableName);
                    }
                }, db.sqlError);
            } else if (callback) {
                callback(tableName);
            }
        };

        // --------------------------------------------------------------------
        /**
         * Save the schema for this table in the schema table (em_schema)
         */
        Table.prototype.saveSchema = function() {

            var db = this._db;

            var schemaTable = db.tables.em_schema;
            if (schemaTable === undefined) {
                return;
            }

            var fields = this.fields,
                fieldName,
                field,
                fieldDef = {},
                settings = this.settings;

            for (fieldName in fields) {
                field = fields[fieldName];
                if (!field.meta) {
                    fieldDef[fieldName] = field.description();
                }
            }

            schemaTable.insert({
                name: this.name,
                fields: fieldDef,
                settings: settings
            });
        };

        // --------------------------------------------------------------------
        /**
         * Add field defaults to a record before write
         *
         * @param {object} fields - the Fields
         * @param {object} data - the data that are to be written
         * @param {boolean} visible - only add visible defaults (for forms)
         * @param {boolean} update - apply update-defaults rather than
         *                           create-defaults
         *
         * @returns {object} - a new data object including default values
         */
        Table.prototype._addDefaults = function(fields, data, visible, update) {

            var record = {},
                field,
                fieldName,
                defaultValue;

            for (fieldName in fields) {
                field = fields[fieldName];
                if (!data.hasOwnProperty(fieldName)) {
                    if (visible && !field.readable) {
                        continue;
                    }
                    if (update) {
                        defaultValue = field.updateValue;
                    } else {
                        defaultValue = field.defaultValue;
                    }
                    if (typeof defaultValue == 'function') {
                        defaultValue = defaultValue();
                    }
                    if (defaultValue !== undefined) {
                        record[fieldName] = defaultValue;
                    }
                }
            }
            return angular.extend(record, data);
        };

        // --------------------------------------------------------------------
        /**
         * Add field defaults to a record before write
         *
         * @param {object} data - the data that are to be written
         * @param {boolean} visible - only add visible defaults (for forms)
         * @param {boolean} update - apply update-defaults rather than
         *                           create-defaults
         *
         * @returns {object} - a new data object including default values
         */
        Table.prototype.addDefaults = function(data, visible, update) {

            return this._addDefaults(this.fields, data, visible, update);
        };

        // --------------------------------------------------------------------
        /**
         * Insert a new record into this table
         *
         * @param {object} data - the record data {fieldName: value}
         * @param {function} callback - callback function: function(insertId)
         */
        Table.prototype.insert = function(data, callback) {

            var record = this.addDefaults(data, false, false),
                sql = emSQL.Table(this).insert(record);

            var db = this._db,
                adapter = db._adapter;

            adapter.executeSql(sql[0], sql[1], function(result) {
                if (callback) {
                    callback(result.insertId);
                }
            }, db.sqlError);
        };

        // --------------------------------------------------------------------
        /**
         * Update records in this table
         *
         * @param {object} data - the data to update {fieldName: value}
         * @param {string} query - SQL WHERE expression
         * @param {function} callback - callback function: function(numRowsAffected)
         */
        Table.prototype.update = function(data, query, callback) {

            var record;
            if (data.hasOwnProperty('_noDefaults') && !!data._noDefaults) {
                record = data;
            } else {
                record = this.addDefaults(data, false, true);
            }

            var sqlTable = emSQL.Table(this),
                sql;

            switch(arguments.length) {
                case 2:
                    callback = query;
                    sql = sqlTable.update(record);
                    break;
                default:
                    sql = sqlTable.update(record, query);
                    break;
            }

            var db = this._db,
                adapter = db._adapter;

            adapter.executeSql(sql[0], sql[1], function(result) {
                if (callback) {
                    callback(result.rowsAffected);
                }
            }, db.sqlError);
        };

        // --------------------------------------------------------------------
        /**
         * Select records from this table (see Set.select)
         *
         * @param {Array} columns - array of column expressions, can be
         *                          omitted (defaults to all fields in the
         *                          table)
         * @param {object} options - an object with SELECT options (orderby,
         *                           limitby, etc), can be omitted
         * @param {function} onSuccess - success callback, required
         * @param {function} onError - error callback, optional
         */
        Table.prototype.select = function(fields, options, onSuccess, onError) {

           new Set(this).select(fields, options, onSuccess, onError);
        };

        // --------------------------------------------------------------------
        /**
         * Get all files linked to records in this table
         *
         * @param {Expression|string} query - the filter Expression
         *
         * @returns {promise} - a promise that resolves into an Array of
         *                      all file URIs linked to the selected records
         */
        Table.prototype.getFiles = function(query) {

            var deferred = $q.defer(),
                uploadFields = [],
                fields = Object.values(this.fields);

            fields.forEach(function(field) {
                if (field.type == 'upload') {
                    uploadFields.push(field);
                }
            });

            var files = [];

            if (uploadFields.length) {

                this.where(query).select(uploadFields, function(rows) {
                    rows.forEach(function(row) {
                        uploadFields.forEach(function(field) {
                            var fileURI = row.$(field);
                            if (fileURI) {
                                files.push(fileURI);
                            }
                        });
                    });

                    deferred.resolve(files);
                });
            } else {
                deferred.resolve(files);
            }

            return deferred.promise;
        };

        // --------------------------------------------------------------------
        /**
         * Identify a record from a data fragment
         *
         * @param {object} fragment - the available record data as object
         *                            with {fieldName: value} properties
         *
         * @example
         *  table.identify(fragment).then(function(record){ });
         *
         * @returns {promise} - a promise that resolves into the record,
         *                      including record ID, synchronized_on and
         *                      modified_on timestamps as well as all
         *                      upload fields
         */
        Table.prototype.identify = function(fragment) {

            var deferred = $q.defer(),
                uuid = fragment.uuid,
                uuidField = this.$('uuid');

            if (uuid && uuidField) {

                // Try looking up the record from the UUID

                var allFields = this.fields,
                    fields = ['id', 'synchronized_on', 'modified_on'];
                for (var fieldName in allFields) {
                    if (allFields[fieldName].type == "upload") {
                        fields.push(fieldName);
                    }
                }

                // Find the record
                this.where(uuidField.equals(uuid))
                    .select(fields, {limit: 1}, function(records) {
                    if (records.length) {
                        deferred.resolve(records[0]._());
                    } else {
                        deferred.resolve();
                    }
                });

            } else {
                // No way to identify the record (yet)
                // @todo: try unique fields
                deferred.resolve();
            }

            return deferred.promise;
        };

        // --------------------------------------------------------------------
        /**
         * Count records in this table
         *
         * @param {string} query - SQL WHERE expression
         * @param {function} callback - callback function: function(numOfRecords)
         */
        Table.prototype.count = function(query, callback) {

            var self = this,
                sqlTable = emSQL.Table(self),
                sql = null;

            if (arguments.length == 1) {
                callback = query;
                sql = sqlTable.count();
            } else {
                sql = sqlTable.count(query);
            }

            var db = self._db,
                adapter = db._adapter;
            adapter.executeSql(sql, [], function(result) {
                var number = result.rows.item(0).number;
                if (callback) {
                    callback(self.name, number);
                }
            }, db.sqlError);
        };

        // ====================================================================
        // Return prototype
        //
        return Table;
    }
]);

// END ========================================================================