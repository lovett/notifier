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

app.run(() => FastClick.attach(document.body));
