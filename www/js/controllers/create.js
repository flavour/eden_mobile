/**
 * Sahana Eden Mobile - Create-Form Controller
 *
 * Copyright (c) 2016: Sahana Software Foundation
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

/**
 * Create-Form Controller
 */
EdenMobile.controller('EdenMobileDataCreate', [
    '$scope', '$state', '$stateParams', '$emdb', '$emDialog',
    function($scope, $state, $stateParams, $emdb, $emDialog) {

        $scope.formName = $stateParams.formName;

        // Start with empty master (populated asynchronously)
        $scope.master = {};

        // Read default values from schema
        $emdb.table('person').then(function(table) {

            var schema = table.schema,
                master = $scope.master,
                form = $scope.form,
                defaultValue,
                currentValue;

            for (var fieldName in schema) {
                if (fieldName[0] == '_') {
                    continue;
                }
                defaultValue = schema[fieldName].default;
                if (defaultValue !== undefined) {
                    // Store in master
                    if (master[fieldName] === undefined) {
                        master[fieldName] = defaultValue;
                    }
                    // Copy into form
                    currentValue = form[fieldName];
                    if (currentValue === undefined) {
                        form[fieldName] = defaultValue;
                    }
                }
            }

            // Update scope
            $scope.$apply();
        });

        var confirmCreate = function(recordID) {
            // Show confirmation popup and go back to list
            $emDialog.confirmation('Record created', function() {
                $state.go('data.list',
                    {formName: $scope.formName},
                    {location: 'replace'}
                );
            });
        };

        $scope.submit = function(form) {

            // @todo: validate

            // Copy to master (only useful if not changing state)
            //$scope.master = angular.copy(form);

            // Commit to database and confirm
            $emdb.table('person').then(function(table) {
                table.insert(form, confirmCreate);
            });
        };

        // @todo: expose reset in UI
        $scope.reset = function() {
            $scope.form = angular.copy($scope.master);
        };

        // Initial reset
        $scope.reset();
    }
]);