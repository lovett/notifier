var appControllers = angular.module('appControllers', []);

appControllers.controller('MessageController', ['$rootScope', '$scope', '$http', '$window', 'Faye', function ($rootScope, $scope, $http, $window, Faye) {
    var group_icon_map = {
        'sysdown': 'icon-fire',
        'sysup': 'icon-cool',
        'reminder': 'icon-pushpin',
        'email': 'icon-envelope',
        'phone': 'icon-phone',
        'web': 'icon-earth',
        'git': 'icon-github'
    }

    var displayMessage = function (message) {

        if ($scope.asOf > message.received) {
            return;
        }

        var icon_groups = ['sysup', 'sysdown', 'reminder', 'email', 'phone', 'web', 'git'];
        if (Object.keys(group_icon_map).indexOf(message.group) !== -1) {
            message.has_icon = true;
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
        alert(status);
    });

    Faye.subscribe("/messages", function (message) {
        try {
            message = JSON.parse(message);
            displayMessage(message);
            sendNotification(message);
        } catch(e) {
            return;
        }
    });

    $scope.clearAll = function (e) {
        $rootScope.messages = [];
        $scope.asOf = localStorage['asOf'] = +new Date();
    };

    $scope.iconClassForGroup = function (group) {
        return group_icon_map[group] || '';
    };

    $scope.resetAsOf = function () {
        localStorage.removeItem('asOf');
        $scope.asOf = null;
        $window.location.reload();
    };


}]);
