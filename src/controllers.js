/* global angular */
var appControllers = angular.module('appControllers', []);

appControllers.controller('MessageController', ['$rootScope', '$scope', '$window', '$location', 'Faye', 'BrowserNotification', 'Queue', 'User', function ($rootScope, $scope, $window, $location, Faye, BrowserNotification, Queue, User) {
    'use strict';

    $scope.isLoggedIn = User.isLoggedIn();

    $rootScope.queue = Queue;

    if ($scope.isLoggedIn === false) {
        $location.path('/login');
        return;
    }

    Faye.subscribe('/messages/browser/*', function (message) {
        message = Queue.add(message);
        if (message) {
            BrowserNotification.send(message);
        }
    });

    Queue.populate();


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

appControllers.controller('LoginController', ['$scope', '$rootScope', '$route', '$location', 'Queue', 'AuthService', 'User', function ($scope, $rootScope, $route, $location, Queue, AuthService, User) {
    'use strict';

    var loginSuccess, loginFailure;

    $rootScope.queue = Queue;

    loginSuccess = function () {
        $location.path('/');
    };

    loginFailure = function () {
        $scope.message = 'Please try again';
    };

    $scope.login = function () {
        if ($scope.loginForm.$invalid) {
            $scope.message = 'All fields are required';
            return;
        }

        $scope.message = null;

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
