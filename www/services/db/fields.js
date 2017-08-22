/**
 * Sahana Eden Mobile - Database Fields
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

"use strict";

EdenMobile.factory('Field', [
    '$q', 'Expression',
    function ($q, Expression) {

        // ====================================================================
        /**
         * Field constructor
         *
         * @param {string} name - the field name
         * @param {object} description - the field description
         * @param {boolean} meta - meta field flag
         */
        function Field(table, name, description, meta) {

            // Link to table
            this.table = table;

            // Field name and type
            this.name = name;
            this.type = description.type || 'string';

            // Expression type
            Object.defineProperty(this, 'exprType', {
                value: 'field',
                writable: false
            });

            // Field description
            this._description = description || {};

            // Meta-field?
            this.meta = !!meta;

            // Readable/writable options
            this.readable = true;
            this.writable = true;
            if (description.readable === false) {
                this.readable = false;
            }
            if (description.writable === false) {
                this.writable = false;
            }

            // Defaults
            this.defaultValue = description.defaultValue;
            this.updateValue = description.updateValue;
        }

        // --------------------------------------------------------------------
        /**
         * Inherit prototype methods from Expression
         */
        Field.prototype = Object.create(Expression.prototype);
        Field.prototype.constructor = Field;

        // --------------------------------------------------------------------
        /**
         * Override the Expression.toString method
         *
         * @returns {string} - an SQL identifier for the field,
         *                     format: 'tableName.fieldName'
         */
        Field.prototype.toString = function() {

            return (this.table || '<no table>') + '.' + this.name;
        };

        // --------------------------------------------------------------------
        /**
         * Override the Expression.toSQL method
         *
         * @returns {string} - an SQL identifier for the field,
         *                     format: 'tableName.fieldName'
         */
        Field.prototype.toSQL = function() {

            return this.toString();
        };

        // --------------------------------------------------------------------
        /**
         * Convert a value into an SQL expression that is suitable to query
         * this type of field (falls back to quoted string)
         *
         * @param {mixed} value - the value to convert
         *
         * @returns {string} - the SQL expression as string
         */
        Field.prototype.sqlEncode = function(value) {

            if (value === 'undefined' || value === null) {
                return 'NULL';
            }

            var quoted = function(arg) {
                return "'" + ('' + arg).replace(/'/g, "''") + "'";
            };

            var sqlEncoded;
            switch (this.type) {

                case 'id':
                case 'reference':
                    // Try to convert into positive integer
                    var numeric = value + 0;
                    if (!isNaN(numeric)) {
                        sqlEncoded = '' + Math.abs(numeric);
                    }
                    break;

                case 'boolean':
                    // Convert to 0|1
                    if (!value) {
                        sqlEncoded = '0';
                    } else {
                        sqlEncoded = '1';
                    }
                    break;

                case 'date':
                    // Try to convert into ISO date string
                    if (value.constructor === Date) {
                        var month = '' + (value.getMonth() + 1),
                            day = '' + value.getDate(),
                            year = value.getFullYear();
                        if (month.length < 2) {
                            month = '0' + month;
                        }
                        if (day.length < 2) {
                            day = '0' + day;
                        }
                        sqlEncoded = quoted([year, month, day].join('-'));
                    }
                    break;

                case 'datetime':
                    // Try to convert into ISO date/time string
                    if (value.constructor === Date) {
                        value.setMilliseconds(0);
                        sqlEncoded = quoted(value.toISOString());
                    }
                    break;

                case 'integer':
                case 'double':
                    // Try to convert into number
                    numeric = value + 0;
                    if (!isNaN(numeric)) {
                        sqlEncoded = '' + numeric;
                    }
                    break;

                case 'json':
                    // JSON-encode everything that isn't a string
                    if (value.constructor !== String) {
                        value = JSON.stringify(value);
                    }
                    break;

                default:
                    // Just use the fallback
                    break;
            }

            // Universal fallback
            if (sqlEncoded === undefined) {
                sqlEncoded = quoted(value);
            }

            return sqlEncoded;
        };

        // --------------------------------------------------------------------
        /**
         * Get the selectable options for this field
         *
         * @returns {promise} - promise that resolves into the options
         *                      array [[opt, repr], ...], or undefined
         *                      if no options are available
         */
        Field.prototype.getOptions = function() {

            var optionsLoaded = $q.defer();

            if (this.type.split(' ')[0] == 'reference') {

                // Determine look-up table
                var foreignKey = this.getForeignKey();
                if (!foreignKey) {
                    optionsLoaded.resolve();
                }

                // Instantiate resource
                var self = this,
                    emResources = $injector.get('emResources');
                emResources.open(foreignKey.table).then(function(resource) {

                    if (!resource) {
                        // Look-up table doesn't exist
                        optionsLoaded.resolve();
                        return;
                    }

                    // Fields to extract
                    // => assumes description.represent is an Array of field names
                    //    @todo: support string templates
                    var key = foreignKey.key,
                        represent = angular.copy(self._description.represent) || [];
                    if (!represent.length) {
                        if (resource.fields.hasOwnProperty('name')) {
                            represent.push('name');
                        } else {
                            represent.push(foreignKey.key);
                        }
                    }

                    // Make sure the key is loaded
                    var fields = angular.copy(represent);
                    if (fields.indexOf(key) == -1) {
                        fields.push(key);
                    }

                    // Select records
                    resource.select(fields, function(records, result) {

                        // Build options array
                        var options = [],
                            values = [],
                            value;

                        records.forEach(function(record) {

                            values = [];

                            represent.forEach(function(fieldName) {
                                value = record[fieldName];
                                if (value) {
                                    values.push(value);
                                }
                            });
                            if (!values) {
                                values = [record[key]];
                            }
                            options.push([record[key], values.join(' ')]);
                        });

                        // Resolve promise
                        optionsLoaded.resolve(options);
                    });
                });

            } else {

                var options = this._description.options;

                if (options.constructor !== Array) {
                    // Convert into array of tuples
                    options = Object.keys(options).map(function(k) {
                        return [k, options[k]]
                    });
                } else {
                    // Copy original array (to allow the caller to modify)
                    options = angular.copy(options);
                }
                optionsLoaded.resolve(options);
            }

            return optionsLoaded.promise;
        };

        // --------------------------------------------------------------------
        /**
         * Resolve a reference into table name and key name
         *
         * @returns {object} - an object holding the table name ('table')
         *                     and the key name ('key') referenced by this
         *                     field
         */
        Field.prototype.getForeignKey = function() {

            var fieldTypeOpts = this.type.split(' '),
                fieldType = fieldTypeOpts[0],
                foreignKey;

            if (fieldType == 'reference') {
                if (fieldTypeOpts.length > 1) {

                    foreignKey = {};
                    var lookup = fieldTypeOpts[1].split('.');
                    if (lookup.length == 1) {
                        foreignKey = {
                            table: lookup[0],
                            key: 'id'
                        };
                    } else {
                        foreignKey = {
                            table: lookup[0],
                            key: lookup[1]
                        };
                    }
                }
            }
            return foreignKey;
        };

        // --------------------------------------------------------------------
        /**
         * Check if this field has selectable options
         *
         * @returns {boolean} - whether the field has selectable options
         */
        Field.prototype.hasOptions = function() {

            if (this.type.split(' ')[0] == 'reference') {
                return true;
            } else {
                return !!this._description.options;
            }
        };

        // --------------------------------------------------------------------
        /**
         * Get the description for this field
         *
         * @returns {object} - the field description
         */
        Field.prototype.description = function() {

            var description = angular.extend({}, this._description);

            description.type = this.type;

            if (typeof description.defaultValue == 'function') {
                delete description.defaultValue;
            }
            if (typeof description.updateValue == 'function') {
                delete description.updateValue;
            }

            return description;
        };

        // --------------------------------------------------------------------
        /**
         * Inherit options and attributes from another field
         *
         * @param {Field} field - the field to inherit from
         */
        Field.prototype.inherit = function(field) {

            // Attributes with mandatory inheritance
            this.name = field.name;
            this.type = field.type;
            this.meta = field.meta;

            var description = this._description;

            // Optional overrides
            this.readable = field.readable;
            this.writable = field.writable;
            if (description.readable !== undefined) {
                this.readable = !!description.readable;
            }
            if (description.writable !== undefined) {
                this.writable = !!description.writable;
            }

            // Inherit defaults
            description = angular.extend({}, field.description, description);
            this._description = description;

            if (this.defaultValue === undefined) {
                this.defaultValue = field.defaultValue;
            }
            if (this.updateValue === undefined) {
                this.updateValue = field.updateValue;
            }
        };

        // --------------------------------------------------------------------
        /**
         * Clone this field
         *
         * @returns {Field} - the Field clone
         */
        Field.prototype.clone = function() {

            var description = angular.extend({}, this._description),
                field = new Field(null, this.name, description, this.meta);

            field.type = this.type;

            field.readable = this.readable;
            field.writable = this.writable;

            return field;
        };

        // --------------------------------------------------------------------
        /**
         * Format a field value for JSON export to Sahana server
         *
         * @param {mixed} value - the JS field value
         *
         * @returns {mixed} - the formatted field value
         */
        Field.prototype.format = function(jsValue) {

            var formatted = jsValue;

            if (jsValue !== null) {
                switch(this.type) {
                    case 'date':
                        var month = '' + (jsValue.getMonth() + 1),
                            day = '' + jsValue.getDate(),
                            year = jsValue.getFullYear();
                        if (month.length < 2) {
                            month = '0' + month;
                        }
                        if (day.length < 2) {
                            day = '0' + day;
                        }
                        formatted = [year, month, day].join('-');
                        break;
                    case 'datetime':
                        if (jsValue) {
                            jsValue.setMilliseconds(0);
                            formatted = jsValue.toISOString();
                        }
                        break;
                    case 'json':
                        formatted = JSON.stringify(jsValue);
                        break;
                    default:
                        break;
                }
            }

            return formatted;
        };

        // --------------------------------------------------------------------
        /**
         * Convert a JSON value from Sahana server to internal format
         *
         * @param {mixed} value - the raw value from import JSON
         *
         * @returns {mixed} - the JS field value
         */

        Field.prototype.parse = function(value) {

            var parsed = value;

            if (value !== null) {
                switch(this.type) {
                    case 'date':
                    case 'datetime':
                        // Comes in as ISO string => convert to date
                        parsed = new Date(value);
                        break;
                    default:
                        break;
                }
            }
            return parsed;
        };

        // ====================================================================
        // Return prototype
        //
        return Field;
    }
]);

