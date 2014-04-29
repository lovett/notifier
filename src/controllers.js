var appControllers = angular.module('appControllers', []);

appControllers.controller('MessageController', ['$rootScope', '$scope', '$http', '$window', 'Faye', '$filter', 'Notifications', function ($rootScope, $scope, $http, $window, Faye, $filter, Notifications) {
    var displayMessage = function (message) {

        if ($scope.asOf > message.received) {
            return;
        }

        if (message.hasOwnProperty('body')) {
            message.body = message.body.replace(/\n/g, "<br/>");
        }

        if (message.hasOwnProperty('group')) {
            message.badge = message.group.split(',').pop();
        }

        console.log(message.badge);
        $rootScope.messages.unshift(message);

    };

    $rootScope.messages = [];
    $rootScope.connection_status = 'disconnected';

    $rootScope.notifications_supported = Notifications.supported;
    $rootScope.notifications_enabled = Notifications.enabled;
    $rootScope.changeNotificationPermissions = Notifications.enable;


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
            Notifications.send(message);
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
