var appControllers = angular.module('appControllers', []);

appControllers.controller('MessageController', ['$rootScope', '$scope', '$http', '$window', 'Faye', '$filter', function ($rootScope, $scope, $http, $window, Faye, $filter) {
    var displayMessage = function (message) {

        if ($scope.asOf > message.received) {
            return;
        }

        if (message.hasOwnProperty('body')) {
            message.body = message.body.replace(/\n/g, "<br/>");
        }

        $rootScope.messages.unshift(message);

    };

    var sendNotification = function (message) {
        var notification;
        if (!'Notification' in window) {
            return;
        }

        if (Notification.permission === 'denied') {
            return;
        }

        if (Notification.permission === 'default') {
            Notification.requestPermission(function () {
                sendNotification(message);
            });
            return;
        }

        if (Notification.permission === 'granted' || Notification.permission === undefined) {
            notification = new Notification(message.title, {
                'body': message.body,
                'tag' : +new Date(),
                'icon': '/newspaper.svg'
            });

            notification.onclick = function () {
                this.close();
            };
        }
    };

    $rootScope.messages = [];
    $rootScope.connection_status = 'disconnected';

    $scope.asOf = parseInt(localStorage['asOf'], 10);

    $http({
        method: 'GET',
        url: '/archive/10'
    }).success(function(data, status, headers, config) {
        if (data instanceof Array) {
            data.forEach(function (message) {
                message = JSON.parse(message);
                displayMessage(message);
            });
        }
    }).error(function(data, status, headers, config) {
    });

    Faye.subscribe("/messages/*", function (message) {
        try {
            message = JSON.parse(message);
            displayMessage(message);
            sendNotification(message);
        } catch(e) {
            return;
        }
    });

    $scope.clearOne = function (received) {
        $rootScope.messages = $filter('filter')($rootScope.messages, {received: '!' +received});
    };

    $scope.clearAll = function (e) {
        $rootScope.messages = [];
        $scope.asOf = localStorage['asOf'] = +new Date();
    };

    $scope.resetAsOf = function () {
        localStorage.removeItem('asOf');
        $scope.asOf = null;
        $window.location.reload();
    };


}]);
