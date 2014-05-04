/* global angular */
var appControllers = angular.module('appControllers', []);

appControllers.controller('MessageController', ['$rootScope', '$scope', '$window', 'Faye', 'BrowserNotification', 'Queue', 'User', function ($rootScope, $scope, $window, Faye, BrowserNotification, Queue, User) {
    'use strict';

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

    $scope.isLoggedIn = User.isLoggedIn();

}]);

appControllers.controller('LoginController', ['$scope', '$route', '$location', 'AuthService', 'User', function ($scope, $route, $location, AuthService, User) {
    'use strict';

    var loginSuccess, loginFailure;

    loginSuccess = function () {
        $scope.message = null;
        $location.path('/');
    };

    loginFailure = function () {
        $scope.message = 'Login failed';
    };

    $scope.login = function () {
        AuthService.login({}, {
            'username': $scope.login.username,
            'password': $scope.login.password
        }, loginSuccess, loginFailure);
    };

    $scope.gotoLogin = function () {
        $location.path('/login');
    };

    if ($route.current.appEvent === 'logout') {
        User.logOut();
    }
}]);
