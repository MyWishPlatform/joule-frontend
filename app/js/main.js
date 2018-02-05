'use strict';
angular.module('Directives', []);
angular.module('Services', []);
angular.module('Filters', []);
angular.module('Constants', []);

var module = angular.module('app', ['Constants', 'ui.router', 'Directives', 'Services', 'Filters', 'templates', 'datePicker']);


module.controller('mainMenuController', function($scope) {

}).controller('baseController', function($scope, $rootScope) {

}).run(function($rootScope, $state, $location, APP_CONSTANTS) {

    $rootScope.bigNumber = function(val) {
        return new BigNumber(val);
    };
    $rootScope.state = $state;
    $rootScope.location = $location;
    $rootScope.web3Utils = Web3.utils;
    $rootScope.getTemplate = function(template) {
        return APP_CONSTANTS.TEMPLATES.PATH + '/' + template + '.html';
    };

    var offset = moment().utcOffset() / 60;
    $rootScope.currentTimezone = (offset > 0 ? '+' : '') + offset;

}).config(function($httpProvider, $qProvider) {

}).filter('separateNumber', function() {
    return function(val) {
        val = (val || '') + '';
        var values = val.split('.');
        while (/(\d+)(\d{3})/.test(values[0].toString())){
            values[0] = values[0].toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
        }
        return values.join('.');
    }
}).directive('commaseparator', function($filter, $timeout) {
    'use strict';
    var commaSeparateNumber = $filter('separateNumber');
    return {
        require: 'ngModel',
        scope: {
            commaseparator: '='
        },
        link: function(scope, elem, attrs, ctrl) {
            if (!ctrl) {
                return;
            }
            var oldValue;
            ctrl.$formatters.unshift(function(value) {
                oldValue = value;
                return commaSeparateNumber(ctrl.$modelValue);
            });
            ctrl.$parsers.unshift(function(viewValue) {
                var plainNumber = viewValue.replace(/[\,\-\+]/g, '');
                var valid = new RegExp(scope.commaseparator.regexp).test(plainNumber);
                if (!valid) {
                    if (viewValue) {
                        ctrl.$setViewValue(oldValue);
                    }
                }

                var minValid = true;
                var maxValid = true;
                if (plainNumber && !isNaN(plainNumber) && ((scope.commaseparator.min !== undefined) || (scope.commaseparator.max !== undefined))) {
                    var val = new BigNumber(plainNumber);

                    var rate = scope.commaseparator.rate || {};
                    rate.min = rate.min || 1;
                    rate.max = rate.max || 1;

                    var minValue = scope.commaseparator.min ? new BigNumber(scope.commaseparator.min).div(rate.min) : false;
                    var maxValue = scope.commaseparator.max ? new BigNumber(scope.commaseparator.max).div(rate.max) : false;

                    minValid = minValue ? val.minus(minValue) >= 0 : true;
                    maxValid = maxValue ? val.minus(maxValue) <= 0 : true;

                    ctrl.$setValidity('min', minValid);
                    ctrl.$setValidity('max', maxValid);

                }

                if (valid || !plainNumber) {
                    oldValue = plainNumber;
                    if (valid) {
                        elem.val(commaSeparateNumber(plainNumber));
                    } else {
                        elem.val('');
                    }
                    if (!(minValid && maxValid)) {
                        return false;
                    }
                    return plainNumber;
                } else {
                    if (oldValue) {
                        elem.val(commaSeparateNumber(oldValue));
                    } else {
                        elem.val('');
                    }

                    if (!(minValid && maxValid)) {
                        return false;
                    }
                    return oldValue;
                }
            });

            if ((scope.commaseparator.min !== undefined) || (scope.commaseparator.max !== undefined)) {
                scope.$watchGroup(['commaseparator.max', 'commaseparator.min', 'commaseparator.rate'], function(newValue, oldValue) {
                    if (newValue === oldValue) return;
                    $timeout(function() {
                        ctrl.$$parseAndValidate();
                    });
                });
            }

            if (scope.commaseparator.notNull) {
                ctrl.$parsers.unshift(function(value) {
                    if (!value) return;
                    var plainNumber = value.replace(/[\,\.\-\+]/g, '') * 1;
                    ctrl.$setValidity('null-value', !!plainNumber);
                    return value;
                });
            }
            if (scope.commaseparator.checkWith) {
                ctrl.$parsers.push(function(value) {
                    if (!value) return;
                    var plainNumber = new BigNumber(value.replace(/[\,\.\-\+]/g, ''));
                    var checkModelValue = new BigNumber(scope.commaseparator.fullModel[scope.commaseparator.checkWith] || 0);
                    var rangeValues = plainNumber.minus(checkModelValue);
                    var valid = !scope.commaseparator.notEqual ? rangeValues <= 0 : rangeValues < 0;
                    ctrl.$setValidity('check-value', valid);
                    return value;
                });

                ctrl.$formatters.unshift(function(value) {
                    return commaSeparateNumber(ctrl.$modelValue);
                });

                scope.$watch('commaseparator.fullModel.' + scope.commaseparator.checkWith, function() {
                    ctrl.$$parseAndValidate();
                });
            }

            if (scope.commaseparator.autoCheck) {
                $timeout(function() {
                    ctrl.$$parseAndValidate();
                    ctrl.$setTouched();
                });
            }
        }
    };
});


angular.module("datePicker").run(["$templateCache", function($templateCache) {
    $templateCache.put("templates/datepicker.html",
        '<div ng-switch="view"> <div ng-switch-when="date"> <table> <thead> <tr> <th ng-click="prev()">&lsaquo;</th> <th colspan="5" class="switch" ng-click="setView(\'month\')" ng-bind="date|mFormat:\'YYYY MMMM\':tz"></th> <th ng-click="next()">&rsaquo;</i></th> </tr> <tr> <th ng-repeat="day in weekdays" style="overflow: hidden" ng-bind="day|mFormat:\'ddd\':tz"></th> </tr> </thead> <tbody> <tr ng-repeat="week in weeks" ng-init="$index2 = $index"> <td ng-repeat="day in week"> <span ng-class="classes[$index2][$index]" ng-click="selectDate(day)" ng-bind="day|mFormat:\'DD\':tz"></span> </td> </tr> </tbody> </table> </div> <div ng-switch-when="year"> <table> <thead> <tr> <th ng-click="prev(10)">&lsaquo;</th> <th colspan="5" class="switch"ng-bind="years[0].year()+\' - \'+years[years.length-1].year()"></th> <th ng-click="next(10)">&rsaquo;</i></th> </tr> </thead> <tbody> <tr> <td colspan="7"> <span ng-class="classes[$index]" ng-repeat="year in years" ng-click="selectDate(year)" ng-bind="year.year()"></span> </td> </tr> </tbody> </table> </div> <div ng-switch-when="month"> <table> <thead> <tr> <th ng-click="prev()">&lsaquo;</th> <th colspan="5" class="switch" ng-click="setView(\'year\')" ng-bind="date|mFormat:\'YYYY\':tz"></th> <th ng-click="next()">&rsaquo;</i></th> </tr> </thead> <tbody> <tr> <td colspan="7"> <span ng-repeat="month in months" ng-class="classes[$index]" ng-click="selectDate(month)" ng-bind="month|mFormat:\'MMM\':tz"></span> </td> </tr> </tbody> </table> </div> <div ng-switch-when="hours"> <table> <thead> <tr> <th ng-click="prev(24)">&lsaquo;</th> <th colspan="5" class="switch" ng-click="setView(\'date\')" ng-bind="date|mFormat:\'DD MMMM YYYY\':tz"></th> <th ng-click="next(24)">&rsaquo;</i></th> </tr> </thead> <tbody> <tr> <td colspan="7"> <span ng-repeat="hour in hours" ng-class="classes[$index]" ng-click="selectDate(hour)" ng-bind="hour|mFormat:\'HH:mm\':tz"></span> </td> </tr> </tbody> </table> </div> <div ng-switch-when="minutes"> <table> <thead> <tr> <th ng-click="prev()">&lsaquo;</th> <th colspan="5" class="switch" ng-click="setView(\'hours\')" ng-bind="date|mFormat:\'DD MMMM YYYY\':tz"></th> <th ng-click="next()">&rsaquo;</i></th> </tr> </thead> <tbody> <tr> <td colspan="7"> <span ng-repeat="minute in minutes" ng-class="classes[$index]" ng-click="selectDate(minute)" ng-bind="minute|mFormat:\'HH:mm\':tz"></span> </td> </tr> </tbody> </table> </div> </div>'
    );
}]);
