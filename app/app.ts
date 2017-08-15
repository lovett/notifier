import 'angular';
import 'angular-cookies';
import 'angular-sanitize';
import 'angular-resource';
import 'angular-route';
import 'angular-touch';
import 'angular-animate';
//import 'fastclick';
import './controllers';
import './directives';
import './filters';
import './services';

import './templates/login.html';
import './templates/logout.html';
import './templates/messages.html';

const app = angular.module('appModule', [
    'appControllers',
    'appDirectives',
    'appFilters',
    'appServices',
    'ngCookies',
    'ngSanitize',
    'ngResource',
    'ngRoute',
    'ngTouch',
    'ngAnimate',
]);

app.config(['$httpProvider', ($httpProvider) => {
    $httpProvider.defaults.withCredentials = true;
}]);

app.config(['$routeProvider', '$locationProvider', ($routeProvider, $locationProvider) => {
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

//app.run(() => FastClick.attach(document.body));