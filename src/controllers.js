/* global angular */
var appControllers = angular.module('appControllers', []);

appControllers.controller('MessageController', ['$rootScope', '$scope', '$window', '$document', '$location', 'Faye', 'BrowserNotification', 'Queue', 'User', '$log', function ($rootScope, $scope, $window, $document, $location, Faye, BrowserNotification, Queue, User, $log) {
    'use strict';

    $scope.isLoggedIn = User.isLoggedIn();

    if ($scope.isLoggedIn === false) {
        $log.info('Not logged in');
        $location.path('/login');
        return;
    }

    $log.info('Logged in');

    $rootScope.queue = Queue;

    var websocketPort;

    $scope.showOptions = function (message) {
        message.extended = true;
    };

    $scope.hideOptions = function (message) {
        message.extended = false;
    };

    angular.forEach($document.find('META'), function (tag) {
        if (!tag.name || !tag.content) {
            return;
        }
        if (tag.name === 'websocket port') {
            websocketPort = parseInt(tag.content, 10) || 0;
        }
    });

    Faye.init(websocketPort);

    var subscribe = function () {
        Faye.subscribe(User.getChannel(), function (message) {
            Queue.add(message);
        });
    };

    subscribe();

    $scope.$on('connection:changed', function (e, state) {
        $rootScope.connectionStatus = state;
        $rootScope.connectionChangedAt = new Date();
        if (state === 'connected') {
            Queue.fill();
        }
    });

    $scope.$on('connection:resubscribe', function (e, channel) {
        $log.info('Redirected to a new channel, resubscribing');
        $log.info('Old channel: ' + User.getChannel());
        User.setChannel(channel);
        $log.info('New channel: ' + User.getChannel());
        Faye.unsubscribe();
        subscribe();
    });

    $scope.browserNotification = BrowserNotification;

    $scope.clearOne = function (publicId) {
        Queue.drop(publicId);
    };

    $scope.clearAll = function () {
        Queue.drain();
    };

}]);

appControllers.controller('LoginController', ['$scope', '$rootScope', '$route', '$location', 'Faye', 'Queue', 'AuthService', 'User', function ($scope, $rootScope, $route, $location, Faye, Queue, AuthService, User) {
    'use strict';

    var loginSuccess, loginFailure;

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

    if ($route.current.action === 'logout') {
        User.logOut();
        Faye.unsubscribe();
        Faye.disconnect();
    }
}]);
