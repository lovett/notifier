"use strict";
var appFilters = angular.module('appFilters', []);
appFilters.filter('symbolize', function () {
    var map = {
        active: '✓',
    };
    return function (value) {
        return map[value] || '';
    };
});
