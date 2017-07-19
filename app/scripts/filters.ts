var appFilters = angular.module('appFilters', []);

appFilters.filter('symbolize', function () {
    'use strict';
    var map = {
        'active': '✓'
    };

    return function (value) {
        return map[value] || '';
    };
});
