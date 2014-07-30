/* global angular, moment */
var app = angular.module('App', [
    'ngRoute',
    'appControllers',
    'appServices',
    'ngSanitize',
    'angularMoment',
    'ngResource',
    'ngTouch',
    'ngAnimate'
]);

app.directive('notifierAppcacheReload', ['$window', '$log', function ($window, $log) {
    'use strict';

    return {
        restrict: 'A',
        link: function () {
            if ($window.applicationCache) {
                $window.applicationCache.addEventListener('updateready', function() {
                    $log.info('An appcache update is ready, reloading');
                    $window.location.reload();
                });
            }
        }
    };
}]);

app.config(['$httpProvider', '$routeProvider', '$locationProvider', function ($httpProvider, $routeProvider, $locationProvider) {
    'use strict';

    $httpProvider.interceptors.push('HttpInterceptor');

    moment.lang('en', {
        calendar : {
            lastDay : '[yesterday at] LT',
            sameDay : 'LT',
            nextDay : '[yomorrow at] LT',
            lastWeek : '[last] dddd [at] LT',
            nextWeek : 'dddd [at] LT',
            sameElse : 'L'
        }
    });

    $routeProvider.when('/login', {
        controller: 'LoginController',
        templateUrl: '/templates/login.html'
    });

    $routeProvider.when('/logout', {
        controller: 'LogoutController',
        templateUrl: '/templates/logout.html',
    });

    $routeProvider.when('/', {
        controller: 'MessageController',
        templateUrl: '/templates/messages.html'
    });

    $routeProvider.otherwise('/', {
        redirectTo: '/'
    });

    $locationProvider.html5Mode(true);
}]);
