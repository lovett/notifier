/* global angular */
var appControllers = angular.module('appControllers', []);

appControllers.controller('MessageController', ['$rootScope', '$scope', '$window', 'Faye', 'BrowserNotification', 'Queue', '$cookies', '$location', function ($rootScope, $scope, $window, Faye, BrowserNotification, Queue, $cookies, $location) {
    'use strict';

    if (angular.isUndefined($cookies.u)) {
        $location.path('/login');
    }

    Faye.subscribe('/messages/browser/*', function (message) {
        message = Queue.add(message);
        if (message) {
            BrowserNotification.send(message);
        }
    });

    Queue.populate();

    $rootScope.queue = Queue;

    $scope.browserNotification = BrowserNotification;

    $scope.clearOne = function (id) {
        Queue.remove(id);
    };

    $scope.clearAll = function () {
        Queue.sinceNow();
    };

    $scope.showAll = function () {
        Queue.sinceEver();
        $window.location.reload();
    };

}]);

appControllers.controller('LoginController', ['$scope', '$location', 'AuthService', function ($scope, $location, AuthService) {
    'use strict';


    var loginSuccess, loginFail;

    loginSuccess = function () {
        $scope.message = null;
        $location.path('/');
    };

    loginFail = function () {
        $scope.message = 'Login failed';
    };

    $scope.login = function () {
        AuthService.login({}, {
            'username': $scope.login.username,
            'password': $scope.login.password
        }, loginSuccess, loginFail);
    };
    
}]);
