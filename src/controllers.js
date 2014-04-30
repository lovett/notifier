var appControllers = angular.module('appControllers', []);

appControllers.controller('MessageController', ['$scope', '$window', 'Faye', 'Notifications', 'Queue', function ($scope, $window, Faye, Notifications, Queue) {

    Faye.subscribe("/messages/*", function (message) {
        try {
            Queue.add(message);
            Notifications.send(message);
        } catch(e) {
            return;
        }
    });

    Queue.populate();

    $scope.queue = Queue;

    $scope.notifications_supported = Notifications.supported;

    $scope.notifications_enabled = Notifications.enabled;

    $scope.changeNotificationPermissions = Notifications.enable;

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
