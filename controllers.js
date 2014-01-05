var appControllers = angular.module('appControllers', []);

appControllers.controller('MessageController', ['$rootScope', '$scope', '$http', 'Faye', function ($rootScope, $scope, $http, Faye) {
    var group_icon_map = {
        'sysdown': 'icon-fire',
        'sysup': 'icon-cool',
        'reminder': 'icon-pushpin',
        'email': 'icon-envelope',
        'phone': 'icon-phone',
        'web': 'icon-earth'
    }

    var acceptMessage = function (message) {

        var icon_groups = ['sysup', 'sysdown', 'reminder', 'email', 'phone', 'web'];
        if (Object.keys(group_icon_map).indexOf(message.group) !== -1) {
            message.has_icon = true;
        }

        $rootScope.messages.unshift(message);
    };

    $rootScope.messages = [];


    $http({
        method: 'GET',
        url: '/archive/10'
    }).success(function(data, status, headers, config) {
        if (data instanceof Array) {
            data.forEach(function (message) {
                message = JSON.parse(message);
                acceptMessage(message);
            });
        }
    }).error(function(data, status, headers, config) {
        alert(status);
    });

    Faye.subscribe("/messages", function (message) {
        try {
            message = JSON.parse(message);
            acceptMessage(message);

        } catch(e) {
            return;
        }
    });

    $scope.clearAll = function (e) {
        $rootScope.messages = [];
    };

    $scope.iconClassForGroup = function (group) {
            return group_icon_map[group] || '';
    }

}]);
