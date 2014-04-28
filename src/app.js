var app = angular.module('App', [
    'ngRoute',
    'appControllers',
    'ngSanitize',
    'faye'
]);

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/', {
        controller: 'MessageController',
        templateUrl: '/messages.html'
    });
}]);

app.config(['$locationProvider', function ($locationProvider) {
    $locationProvider.html5Mode(true);
}]);

app.factory('Faye', ['$location', '$faye', function ($location, $faye) {
    return $faye($location.absUrl() + 'faye');
}]);
