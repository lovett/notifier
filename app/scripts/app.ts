const app = angular.module('appModule', [
    'appControllers',
    'appDirectives',
    'appFilters',
    'appServices',
    'ngSanitize',
    'ngResource',
    'ngRoute',
    'ngTouch',
    'ngAnimate',
]);

app.config(['$routeProvider', '$locationProvider', ($routeProvider, $locationProvider) => {
    'use strict';

    $routeProvider.when('/login', {
        controller: 'LoginController',
        templateUrl: 'templates/login.html',
    });

    $routeProvider.when('/logout', {
        controller: 'LogoutController',
        templateUrl: 'templates/logout.html',
    });

    $routeProvider.when('/onedrive', {
        controller: 'OnedriveController',
        template: '',
    });

    $routeProvider.when('/', {
        controller: 'MessageController',
        templateUrl: 'templates/messages.html',
    });

    $routeProvider.otherwise('/', {
        redirectTo: '/',
    });

    $locationProvider.html5Mode({
        enabled: true,
    });
}]);

app.config(['$provide', ($provide) => {
    'use strict';
    $provide.decorator('$log', ['$window', '$delegate', ($window, $delegate) => {

        const original = $delegate.debug;

        $delegate.debug = (...args) => {
            const argsArray = Array.prototype.slice.call(args);
            let fayeMessage;

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

app.run(() => FastClick.attach(document.body));
