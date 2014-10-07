var appFilters = angular.module('appFilters', []);

appFilters.filter('reldate', function () {
    'use strict';
    return function (when) {
        var d;

        if (when instanceof Date) {
            // this avoids clobbering the original value
            d = new Date(when.getTime());
        } else if (typeof when === 'number') {
            d = new Date(when);
        } else {
            d = new Date(parseInt(when, 10));
        }

        var now = new Date();

        // roll back to midnight
        d.setHours(0,0,0,0);
        now.setHours(0,0,0,0);

        // time difference as an integer number of days, accounting
        // for milliseconds
        var delta = (now - d) / 86400 / 1000;

        if (delta === 1) {
            return 'yesterday';
        } else if (delta === 0) {
            return 'today';
        } else if (delta === -1) {
            return 'tomorrow';
        } else {
            return when;
        }
    };
});