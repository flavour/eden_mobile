/**
 * Sahana Eden Mobile - S3JSON Codec
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

/**
 * Service to convert S3JSON <=> Internal Data Format
 *
 * @class emS3JSON
 * @memberof EdenMobile.Services
 */
EdenMobile.factory('emS3JSON', [
    '$q', 'emDB', 'emUtils',
    function ($q, emDB, emUtils) {

        "use strict";

        // ====================================================================
        /**
         * Parse a datetime string: prevent inconsistent interpretations of
         * ISO format strings without explicit time zone indicator (some JS
         * implementations treat those as UTC, others as local time)
         *
         * @param {string} dtStr - the datetime string
         */
        var parseUTCDateTime = function(dtStr) {

            if (dtStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/g)) {
                // ISO DateTime string without time zone indicator
                // => append a trailing Z to indicate UTC
                dtStr += 'Z';
            }
            return new Date(dtStr);
        };

        // ====================================================================
        /**
         * Helper class to locate import items in an S3JSON object tree
         *
         * @param {object} jsonData - the S3JSON recevied from the server
         */
        function SourceMap(jsonData) {

            this.records = {};

            this.map(jsonData);
        }

        // --------------------------------------------------------------------
        /**
         * Produce a map of {tableName: {uuid: item}} from an S3JSON object
         * tree, which can then be used to locate particular import items;
         * stores the map as this.records
         *
         * @param {object} tree - the S3JSON object tree
         */
        SourceMap.prototype.map = function(tree) {

            var records = this.records,
                key,
                tableName,
                recordMap,
                self = this;

            // Helper to add an item to the map
            var addItem = function(item) {
                var uuid = item['@uuid'];
                if (uuid) {
                    this[uuid] = item; // this = recordMap
                    self.map(item);
                }
            };

            for (key in tree) {

                if (key.slice(0, 2) == '$_') {

                    tableName = key.slice(2);
                    recordMap = records[tableName] || {};

                    tree[key].forEach(addItem, recordMap);

                    records[tableName] = recordMap;
                }
            }
        };

        // --------------------------------------------------------------------
        /**
         * Look up an item in the source tree
         *
         * @param {string} tableName - the table name of the item sought
         *                             (can be omitted for type-less uuid search)
         * @param {string} uuid - the UUID of the item sought
         */
        SourceMap.prototype.get = function(tableName, uuid) {

            var records = this.records,
                item;

            if (arguments.length < 2) {
                // Type-less search
                uuid = tableName;
                for (var name in records) {
                    item = records[name][uuid];
                    if (item) {
                        break;
                    }
                }
            } else {
                // Type-bound look-up
                var recordMap = records[tableName];
                if (recordMap) {
                    item = recordMap[uuid];
                }
            }

            return item;
        };

        // ====================================================================
        /**
         * Helper class to decode S3JSON record representations
         *
         * @param {Table} table - the emDB Table
         * @param {object} jsonData - the S3JSON representation of the record
         */
        function Record(table, jsonData) {

            this.data = {};         // {fieldName: value}
            this.references = {};   // {fieldName: [tableName, uuid]}
            this.files = {};        // {fieldName: downloadURL}

            this.tableName = table.name;
            this.uuid = null;

            var key,
                value;

            for (key in jsonData) {

                value = jsonData[key];

                if (key.slice(0, 2) == '$_') {

                    // Component record => skip
                    // @todo: handle component records
                    continue;
                }

                if (key.slice(0, 3) == '$k_') {

                    // Foreign key
                    this.decode(table, key.slice(3), value);

                } else if (key[0] == '@') {

                    // Meta-field
                    var fieldName = key.slice(1);
                    switch(fieldName) {
                        case 'uuid':
                            this.data[fieldName] = this.uuid = value;
                            break;
                        case 'created_on':
                        case 'modified_on':
                            this.data[fieldName] = parseUTCDateTime(value);
                            break;
                        default:
                            break;
                    }

                } else {

                    // Other field
                    this.decode(table, key, value);
                }
            }

            // If no UUID in the source => generate one now
            if (!this.uuid) {
                this.uuid = emUtils.uuid();
                this.data.uuid = this.uuid;
            }
        }

        // --------------------------------------------------------------------
        /**
         * Convert a field value to internal format, and update
         * this.data|references|files according to field type
         *
         * @param {Table} table - the emDB Table instance
         * @param {string} fieldName - the field name
         * @param {mixed} value - the S3JSON value for the field
         */
        Record.prototype.decode = function(table, fieldName, value) {

            if (value === null) {
                return;
            }

            // Get the field, and fieldType
            var field = table.fields[fieldName];
            if (field === undefined) {
                return;
            }

            var fieldType = field.type;

            // Handle upload fields
            if (fieldType == 'upload') {
                var downloadURL = value['@url'];
                if (downloadURL) {
                    this.files[fieldName] = downloadURL;
                }
                return;
            }

            // Handle references
            var reference = emUtils.getReference(fieldType);
            if (reference) {
                var lookupTable = reference[1],
                    uuid;
                if (lookupTable) {
                    uuid = value['@uuid'];
                    if (uuid) {
                        this.references[fieldName] = [lookupTable, uuid];
                    }
                }
                return;
            }

            // Decode @value|$ attributes if present
            if (value) {
                if (value.hasOwnProperty('@value')) {
                    value = value['@value'];
                } else if (value.hasOwnProperty('$')) {
                    value = value.$;
                }
            }

            // Handle all other field types
            switch(fieldType) {
                case 'boolean':
                    // Investigate
                    if (typeof value == 'string') {
                        value = (value.toLowerCase() == 'true');
                    } else {
                        value = !!value;
                    }
                    this.data[fieldName] = value;
                    break;
                case 'integer':
                    value = parseInt(value);
                    if (!isNaN(value)) {
                        this.data[fieldName] = value;
                    }
                    break;
                case 'double':
                    value = parseFloat(value);
                    if (!isNaN(value)) {
                        this.data[fieldName] = value;
                    }
                    break;
                case 'date':
                    // S3JSON format: YYYY-MM-DD
                    // => date-only in ISO format is assumed to be UTC
                    this.data[fieldName] = new Date(value);
                    break;
                case 'datetime':
                    // S3JSON format: YYYY-MM-DDThh:mm:ss
                    // => must convert to UTC explicitly
                    this.data[fieldName] = parseUTCDateTime(value);
                    break;
                case 'string':
                case 'text':
                    this.data[fieldName] = value + '';
                    break;
                default:
                    break;
            }
        };

        // ====================================================================
        /**
         * Map new dependencies of a Record
         *
         * @param {object} map - array of known Records, format:
         *                       {tableName: {uuid: Record}}
         * @param {array} dependencies - array of known dependencies,
         *                               format: [[tableName, uuid], ...]
         * @param {object} references - the reference map of the record,
         *                              format: {fieldName: [tableName, uuid]}
         */
        var mapDependencies = function(map, dependencies, references) {

            var dependency,
                tableName,
                uuid;

            for (var fieldName in references) {

                dependency = references[fieldName];

                tableName = dependency[0];
                uuid = dependency[1];

                if (map.hasOwnProperty(tableName)) {
                    if (map[tableName].hasOwnProperty(uuid)) {
                        continue;
                    }
                }
                dependencies.push(dependency);
            }
        };

        // --------------------------------------------------------------------
        /**
         * Resolve a dependency
         *
         * @param {object} data - the S3JSON data
         * @param {object} map - array of known Records, format:
         *                       {tableName: {uuid: Record}}
         * @param {array} dependencies - array of known dependencies,
         *                               format: [[tableName, uuid], ...]
         * @param {object} unknown - map of records known to /not/ be in the data
         *                           source, format: {tableName {uuid: true}}
         * @param {array} dependency - the dependency to resolve, format:
         *                             [tableName, uuid]
         */
        var resolveDependency = function(tables, data, map, dependencies, unknown, dependency) {

            var tableName = dependency[0],
                table = tables[tableName],
                uuid = dependency[1];

            if (unknown.hasOwnProperty(tableName)) {
                if (unknown[tableName].hasOwnProperty(uuid)) {
                    return;
                }
            }

            // Search through the S3JSON for the record
            var tableKey = '$_' + tableName;
            if (data.hasOwnProperty(tableKey)) {

                var items = data[tableKey],
                    item,
                    record;

                for (var i = items.length; i--;) {

                    item = items[i];
                    if (item['@uuid'] == uuid) {

                        // Generate a Record, add it to the map
                        record = new Record(table, item);
                        if (!map.hasOwnProperty(tableName)) {
                            map[tableName] = {};
                        }
                        map[tableName][record.uuid] = record;
                        mapDependencies(map, dependencies, record.references);
                        return;
                    }
                }
            }

            if (!unknown.hasOwnProperty(tableName)) {
                unknown[tableName] = {};
            }
            unknown[tableName][uuid] = true;
        };

        // --------------------------------------------------------------------
        /**
         * Decode an S3JSON resource representation and produce a map of
         * Record objects for import
         *
         * @param {object} tables - array of all known tables, format:
         *                          {tableName: Table}
         * @param {string} tableName - the name of the target table
         * @param {object} data - the S3JSON resource representation
         *
         * @returns {object} - a map of records, format:
         *                     {tableName: {uuid: Record, ...}, ...}
         */
        var decode = function(tables, tableName, data) {

            var map = {},
                unknown = {},
                dependencies = [];

            var key = '$_' + tableName,
                items = data[key],
                table = tables[tableName];

            if (items) {

                map[tableName] = {};

                items.forEach(function(item) {

                    var record = new Record(table, item);
                    map[tableName][record.uuid] = record;
                    mapDependencies(map, dependencies, record.references);
                });
            }

            while(dependencies.length) {
                resolveDependency(tables, data, map, dependencies, unknown, dependencies.shift());
            }

            return map;
        };

        // ====================================================================
        /**
         * Encode a record as S3JSON object
         *
         * @param {Table} table - the Table
         * @param {object} record - the record data
         *
         * @returns {object} - the S3JSON data and its references, format:
         *                          {data: {key: value},
         *                           references: {fieldName: [tableName, recordID]},
         *                           files: {fieldName: fileURI}
         *                           }
         */
        var encodeRecord = function(table, record) {

            var data = {},
                references = {},
                files = {},
                field,
                fieldType,
                value;

            for (var fieldName in record) {

                field = table.fields[fieldName];
                if (!field) {
                    continue;
                }

                // Handle null-values
                value = record[fieldName];
                if (value === null) {
                    continue;
                }

                // Handle meta-fields
                if (field.meta) {
                    switch(fieldName) {
                        case 'uuid':
                            data['@uuid'] = value;
                            break;
                        case 'created_on':
                        case 'modified_on':
                            data['@' + fieldName] = field.format(value);
                            break;
                        default:
                            // Skip all other meta-fields
                            break;
                    }
                    continue;
                }

                fieldType = field.type;

                // Handle upload-fields
                if (fieldType == 'upload') {
                    files[fieldName] = value;
                    continue;
                }

                // Handle references
                var reference = emUtils.getReference(fieldType);
                if (reference) {
                    var lookupTable = reference[1];
                    references[fieldName] = [lookupTable, value];
                    continue;
                }

                // Handle all other field types
                switch(fieldType) {
                    case 'boolean':
                        if (!!value) {
                            data[fieldName] = {'@value': 'true'};
                        } else {
                            data[fieldName] = {'@value': 'false'};
                        }
                        break;
                    case 'integer':
                    case 'double':
                        data[fieldName] = {'@value': value + ''};
                        break;
                    case 'date':
                    case 'datetime':
                        data[fieldName] = field.format(value);
                        break;
                    case 'string':
                    case 'text':
                        data[fieldName] = value;
                        break;
                    default:
                        // Ignore
                        break;
                }
            }

            return {
                data: data,
                references: references,
                files: files
            };
        };

        // ====================================================================
        /**
         * Add a reference to an S3JSON object
         *
         * @param {object} data - the S3JSON object
         * @param {string} fieldName - the field name
         * @param {string} tableName - the look-up table name
         * @param {string} uuid - the uuid of the referenced record
         */
        var addReference = function(data, fieldName, tableName, uuid) {

            if (uuid) {
                data['$k_' + fieldName] = {
                    '@resource': tableName,
                    '@uuid': uuid
                };
            }
        };

        // ====================================================================
        /**
         * Add a file reference to an S3JSON object
         *
         * @param {object} data - the S3JSON object
         * @param {string} fieldName - the field name
         * @param {string} fileName - the file name
         */
        var addFile = function(data, fieldName, fileName) {

            if (fileName) {
                data[fieldName] = {
                    '@filename': fileName
                };
            }
        };

        // ====================================================================
        /**
         * Encode resource data as S3JSON
         *
         * @param {string} tableName - the table name
         * @param {object} data - the S3JSON records for this table
         */
        var encode = function(tableName, data) {

            var jsonData = {};

            jsonData['$_' + tableName] = data;

            return jsonData;
        };

        // ====================================================================
        /**
         * Service API
         */
        return {

            // S3JSON decoder
            decode: decode,

            // S3JSON encoder
            encode: encode,
            encodeRecord: encodeRecord,
            addReference: addReference,
            addFile: addFile
        };
    }
]);
