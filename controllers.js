var appControllers = angular.module('appControllers', []);

appControllers.controller('MessageController', ['$rootScope', '$scope', '$http', 'Faye', function ($rootScope, $scope, $http, Faye) {
    $rootScope.messages = [];

    $http({
        method: 'GET',
        url: '/archive/10'
    }).success(function(data, status, headers, config) {
        if (data instanceof Array) {
            data.forEach(function (message) {
                $scope.messages.unshift(JSON.parse(message));
            });
        }
    }).error(function(data, status, headers, config) {
        alert(status);
    });

    Faye.subscribe("/messages", function (message) {
        try {
            message = JSON.parse(message);
            $rootScope.messages.unshift(message);
        } catch(e) {
            return;
        }
    });

    $scope.clearAll = function (e) {
        $rootScope.messages = [];
    };

}]);
