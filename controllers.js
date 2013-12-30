var appControllers = angular.module('appControllers', []);

appControllers.controller('MessageController', ['$scope', '$http', 'Faye', function ($scope, $http, Faye) {
    $scope.messages = [];

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
        alert(data);
    });

    Faye.subscribe("/messages", function (message) {
        try {
            message = JSON.parse(message);
            $scope.messages.unshift(message);
            console.log(message);
        } catch(e) {
            return;
        }
    });

}]);
