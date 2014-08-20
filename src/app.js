/* global angular */
var app = angular.module('App', [
    'ngRoute',
    'appControllers',
    'appServices',
    'ngSanitize',
    'ngResource',
    'ngTouch',
    'ngAnimate'
]);

app.filter('reldate', function () {
    'use strict';
    return function (when) {
        var d;

        if (when instanceof Date) {
            // this avoids clobbering the original value
            d = new Date(when.getTime());
        } else {
            d = new Date(parseInt(d, 10));
        }

        var now = new Date();

        // roll back to midnight
        d.setHours(0,0,0,0);
        now.setHours(0,0,0,0);

        var delta = (now - d) / 86400 / 1000;

        if (delta === -1) {
            return 'tomorrow';
        } else if (delta === 0) {
            return 'today';
        } else if (delta === 1) {
            return 'yesterday';
        } else {
            return when;
        }
    };
});

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
