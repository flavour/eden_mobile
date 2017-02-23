/**
 * Sahana Eden Mobile - Standard Form Widgets
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

(function() {

    // ========================================================================
    /**
     * Copy directive attributes to a generated element, using the
     * attribute map of the directive to map camelCase notation to
     * dash notation, e.g. ngModel becomes ng-model.
     *
     * @param {object} ngAttr - the directive's DOM attributes
     * @param {DOMNode} element - the target element
     * @param {Array} validAttr - the attributes to copy in camelCase
     *                            notation
     */
    function copyAttr(ngAttr, element, validAttr) {

        var attrMap = ngAttr.$attr,
            attribute,
            name,
            value;

        for (var i=validAttr.length; i--;) {
            attribute = validAttr[i];

            name = attrMap[attribute];
            value = ngAttr[attribute];
            if (name && value !== undefined) {
                element.attr(name, value);
            }
        }
    }

    // ========================================================================
    /**
     * Text input widget (directive)
     *
     * @class emTextWidget
     * @memberof EdenMobile
     *
     * @param {string} type - the input type ('text'|'password'), default 'text'
     *
     * @returns {string} - the text entered (or null if empty)
     *
     * @example <em-text-widget type='password'>
     */
    EdenMobile.directive('emTextWidget', [
        '$compile',
        function($compile) {

            /**
            * Widget renderer
            *
            * @param {object} $scope - reference to the current scope
            * @param {DOMNode} elem - the angular-enhanced DOM node for
            *                         the element applying the directive
            * @param {object} attr - object containing the attributes of
            *                        the element
            */
            var renderWidget = function($scope, elem, attr) {

                // Create the label
                var label = angular.element('<span>')
                                   .addClass('input-label')
                                   .html(attr.label || '');

                // Create the input
                var input = angular.element('<input>')
                                   .attr('type', attr.type || 'text');

                // Input attributes
                copyAttr(attr, input, [
                    'ngModel',
                    'disabled',
                    'placeholder'
                ]);

                // Build the widget
                var widget = angular.element('<label>')
                                    .addClass('item item-input item-stacked-label')
                                    .append(label)
                                    .append(input);

                // Compile the widget against the scope, then
                // render it in place of the directive
                var compiled = $compile(widget)($scope);
                elem.replaceWith(compiled);
            };

            return {
                link: renderWidget
            };
        }
    ]);

    // ========================================================================
    /**
     * Numeric input widget (directive)
     *
     * @class emNumberWidget
     * @memberof EdenMobile
     *
     * @returns {string} - the text entered (or null if empty)
     *
     * @example <em-number-widget>
     */
    EdenMobile.directive('emNumberWidget', [
        '$compile',
        function($compile) {

            /**
            * Widget renderer
            *
            * @param {object} $scope - reference to the current scope
            * @param {DOMNode} elem - the angular-enhanced DOM node for
            *                         the element applying the directive
            * @param {object} attr - object containing the attributes of
            *                        the element
            */
            var renderWidget = function($scope, elem, attr) {

                // Create the label
                var label = angular.element('<span>')
                                   .addClass('input-label')
                                   .html(attr.label || '');

                // Create the input
                var input = angular.element('<input type="number">');

                // Input attributes
                copyAttr(attr, input, [
                    'ngModel',
                    'disabled',
                    'placeholder'
                ]);

                // Build the widget
                var widget = angular.element('<label>')
                                    .addClass('item item-input item-stacked-label')
                                    .append(label)
                                    .append(input);

                // Compile the widget against the scope, then
                // render it in place of the directive
                var compiled = $compile(widget)($scope);
                elem.replaceWith(compiled);
            };

            return {
                link: renderWidget
            };
        }
    ]);

    // ========================================================================
    /**
     * Date picker widget (directive)
     *
     * @class emDateWidget
     * @memberof EdenMobile
     *
     * @returns {Date} - the selected date
     *
     * @example <em-date-widget>
     */
    EdenMobile.directive('emDateWidget', [
        '$compile',
        function($compile) {

            /**
            * Widget renderer
            *
            * @param {object} $scope - reference to the current scope
            * @param {DOMNode} elem - the angular-enhanced DOM node for
            *                         the element applying the directive
            * @param {object} attr - object containing the attributes of
            *                        the element
            */
            var renderWidget = function($scope, elem, attr) {

                // Create the label
                var label = angular.element('<span>')
                                   .addClass('input-label')
                                   .html(attr.label || '');

                // Create the input
                var input = angular.element('<input>')
                                   .attr('type', 'date');

                // Input attributes
                copyAttr(attr, input, [
                    'ngModel',
                    'disabled'
                ]);

                // Build the widget
                var widget = angular.element('<label>')
                                    .addClass('item item-input item-stacked-label')
                                    .append(label)
                                    .append(input);

                // Compile the widget against the scope, then
                // render it in place of the directive
                var compiled = $compile(widget)($scope);
                elem.replaceWith(compiled);
            };

            return {
                link: renderWidget
            };
        }
    ]);

    // ========================================================================
    /**
     * Checkbox (=toggle) widget (directive)
     *
     * @class emBooleanWidget
     * @memberof EdenMobile
     *
     * @returns {boolean} - true|false
     *
     * @example <em-boolean-widget>
     */
    EdenMobile.directive('emBooleanWidget', [
        '$compile',
        function($compile) {

            /**
            * Widget renderer
            *
            * @param {object} $scope - reference to the current scope
            * @param {DOMNode} elem - the angular-enhanced DOM node for
            *                         the element applying the directive
            * @param {object} attr - object containing the attributes of
            *                        the element
            */
            var renderWidget = function($scope, elem, attr) {

                // Build the widget
                var widget = angular.element('<ion-toggle>')
                                    .addClass('item item-toggle')
                                    .attr('toggle-class', 'toggle-positive')
                                    .html(attr.label || '');

                // Input attributes
                copyAttr(attr, widget, [
                    'ngModel',
                    'disabled'
                ]);

                // Compile the widget against the scope, then
                // render it in place of the directive
                var compiled = $compile(widget)($scope);
                elem.replaceWith(compiled);
            };

            return {
                link: renderWidget
            };
        }
    ]);

    // ========================================================================
    /**
     * Single-SELECT options widget (directive)
     *
     * @class emOptionsWidget
     * @memberof EdenMobile
     *
     * @param options - a JSON dict of options
     *
     * @returns {integer} - the selected option
     *
     * @example <em-options-widget options='{1: "first", 2: "second"}'>
     */
    EdenMobile.directive('emOptionsWidget', [
        '$compile',
        function($compile) {

            /**
            * Widget renderer
            *
            * @param {object} $scope - reference to the current scope
            * @param {DOMNode} elem - the angular-enhanced DOM node for
            *                         the element applying the directive
            * @param {object} attr - object containing the attributes of
            *                        the element
            */
            var renderWidget = function($scope, elem, attr) {

                // Create the label
                var label = angular.element('<span>')
                                   .addClass('input-label')
                                   .html(attr.label || '');

                // Build the base widget
                var widget = angular.element('<label>')
                                    .addClass('item item-input item-stacked-label')
                                    .append(label);

                // Add the options
                var opts = attr.options,
                    opt,
                    input;

                if (opts) {
                    opts = JSON.parse(opts);
                } else {
                    opts = {};
                }

                for (opt in opts) {

                    // Create the input
                    input = angular.element('<ion-radio>')
                                   .attr('value', opt)
                                   .html(opts[opt] || '');

                    // Input attributes
                    copyAttr(attr, input, [
                        'ngModel',
                        'disabled'
                    ]);

                    widget.append(input);

                }

                // Compile the widget against the scope, then
                // render it in place of the directive
                var compiled = $compile(widget)($scope);
                elem.replaceWith(compiled);
            };

            return {
                link: renderWidget
            };
        }
    ]);

    // ========================================================================
    /**
     * Config form section (directive)
     *
     * @class emConfigSection
     * @memberof EdenMobile
     *
     * @param {string} section-name - the section name
     *
     * @example <em-config-section section-name='server'>
     */
    EdenMobile.directive('emConfigSection', [
        '$compile', 'emSettings',
        function($compile, emSettings) {

            /**
            * Form renderer
            *
            * @param {object} $scope - reference to the current scope
            * @param {DOMNode} elem - the angular-enhanced DOM node for
            *                         the element applying the directive
            * @param {object} attr - object containing the attributes of
            *                        the element
            */
            var renderForm = function($scope, elem, attr) {

                var sectionName = attr.sectionName,
                    section = emSettings[sectionName],
                    empty = true;

                if (section === undefined) {
                    return;
                }

                // Generate the section header
                var sectionHeader = angular.element('<h3 class="item item-divider">'),
                    sectionTitle = section._title;
                if (!sectionTitle) {
                    // Fall back to section name
                    sectionTitle = sectionName;
                }
                sectionHeader.html(sectionTitle);

                // Generate the section subform
                var form = angular.element('<section>')
                                  .append(sectionHeader);

                // Generate a config widget for each entry in the section
                for (var key in section) {
                    if (key[0] == '_') {
                        continue;
                    }
                    var setting = section[key];
                    var widget = angular.element('<em-config-widget>')
                                        .attr('section-name', sectionName)
                                        .attr('setting-name', key);
                    form.append(widget);
                }

                // Compile the subform HTML against the scope,
                // then render it in place of the directive
                var compiled = $compile(form)($scope);
                elem.replaceWith(compiled);

            };

            return {
                link: renderForm
            };
        }
    ]);

    // ========================================================================
    /**
     * A widget for a configuration setting (directive). Boolean settings
     * have toggles to change them, while string-type settings provide
     * popup dialogs.
     *
     * @class emConfigWidget
     * @memberof EdenMobile
     *
     * @param {string} section-name - the section name
     * @param {string} setting-name - the setting name (key)
     *
     * @example <em-config-widget section-name='server' setting-name='url'>
     */
    EdenMobile.directive('emConfigWidget', [
        '$compile', 'emDialogs', 'emSettings',
        function($compile, emDialogs, emSettings) {

            var renderWidget = function(scope, elem, attr) {

                var sectionName = attr.sectionName,
                    settingName = attr.settingName;
                if (!sectionName || !settingName) {
                    return;
                }

                // Get the spec for the setting
                var section = emSettings[sectionName];
                if (!section.hasOwnProperty(settingName)) {
                    return;
                }

                var setting = section[settingName],
                    writable = true;
                if (setting === undefined || setting.readable === false) {
                    return;
                }
                if (setting.writable === false) {
                    writable = false;
                }

                var scopeName = 'settings.' + sectionName + '.' + settingName,
                    labelText = setting.label || settingName,
                    label = angular.element('<h3>')
                                   .attr('translate', labelText),
                    onValidation = setting.onValidation,
                    placeholder = setting.placeholder,
                    empty = setting.empty || 'not configured',
                    inputType = 'text',
                    widget = null,
                    listItem,
                    popup = false;

                // Construct label and input
                var dataType = setting.type || 'text';
                switch(dataType) {
                    case 'text':
                    case 'url':
                    case 'string':
                    case 'password':
                        if (dataType == 'password') {
                            inputType = 'password';
                        }
                        widget = angular.element('<input>')
                                        .attr('type', inputType)
                                        .attr('disabled', 'disabled')
                                        .attr('ng-model', scopeName);
                        if (empty) {
                            widget.attr('placeholder', empty);
                        }
                        if (!writable) {
                            widget.addClass('readonly');
                        }
                        listItem = angular.element('<div class="item">')
                                          .append(label)
                                          .append(widget);
                        popup = true;
                        break;
                    case 'boolean':
                        widget = angular.element('<ion-toggle>')
                                        .addClass('item item-toggle')
                                        .attr('toggle-class', 'toggle-positive')
                                        .append(label)
                                        .attr('ng-model', scopeName);
                        if (!writable) {
                            widget.attr('ng-disabled', 'true');
                        }
                        if (scope.update !== undefined) {
                            widget.attr('ng-change', 'update()');
                        }
                        listItem = widget;
                        break;
                    default:
                        break;
                }


                // Attach popup
                if (popup && writable) {
                    listItem.on('click', function(event) {

                        var sectionData = scope.settings[sectionName],
                            value;
                        if (sectionData) {
                            value = sectionData[settingName];
                        }

                        var dialogOptions = {
                            'inputType': inputType,
                            'defaultText': value,
                            'inputPlaceholder': placeholder,
                            'onValidation': onValidation
                        };
                        emDialogs.stringInput(
                            labelText,
                            setting.help,
                            dialogOptions,
                            function(inputValue) {
                                sectionData[settingName] = inputValue;
                                var update = scope.update;
                                if (update !== undefined) {
                                    update();
                                }
                            }
                        );
                    });
                }

                // Compile the widget against the scope, then
                // render it in place of the directive
                var compiled = $compile(listItem)(scope);
                elem.replaceWith(compiled);
            };

            return {
                link: renderWidget
            };
        }
    ]);
}());

// END ========================================================================
