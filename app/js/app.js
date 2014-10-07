/* global angular */
var app = angular.module('App', [
    'appControllers',
    'appDirectives',
    'appFilters',
    'appServices',
    'ngSanitize',
    'ngResource',
    'ngRoute',
    'ngTouch',
    'ngAnimate'
]);

app.config(['$httpProvider', '$routeProvider', '$locationProvider', function ($httpProvider, $routeProvider, $locationProvider) {
    'use strict';

    $httpProvider.interceptors.push('HttpInterceptor');

    $routeProvider.when('/login', {
        controller: 'LoginController',
        templateUrl: '/views/login.html'
    });

    $routeProvider.when('/logout', {
        controller: 'LogoutController',
        templateUrl: '/views/logout.html',
    });

    $routeProvider.when('/', {
        controller: 'MessageController',
        templateUrl: '/views/messages.html'
    });

    $routeProvider.otherwise('/', {
        redirectTo: '/'
    });

    $locationProvider.html5Mode(true);
}]);

app.config(['$provide', function ($provide) {
    'use strict';
    $provide.decorator('$log', ['$window', '$delegate', function ($window, $delegate) {

        var original = $delegate.debug;

        $delegate.debug = function () {
            var argsArray = Array.prototype.slice.call(arguments);
            var fayeMessage;

            if (!$window.DEBUG) {
                return;
            }

            if (argsArray[0].indexOf('faye') === 0) {
                fayeMessage = argsArray.pop();
                argsArray.push(fayeMessage.channel);

                if (fayeMessage.hasOwnProperty('connectionType')) {
                    argsArray.push(fayeMessage.connectionType);
                }

                if (fayeMessage.hasOwnProperty('successful')) {
                    if (fayeMessage.successful === true) {
                        argsArray.push('success');
                    }
                }

            }

            argsArray.unshift(new Date().toTimeString());
            original.apply(null, argsArray);
            original.call(null, fayeMessage);
        };

        return $delegate;
    }]);
}]);