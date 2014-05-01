/* global angular */
var appControllers = angular.module('appControllers', []);

appControllers.controller('MessageController', ['$rootScope', '$scope', '$window', 'Faye', 'BrowserNotification', 'Queue', function ($rootScope, $scope, $window, Faye, BrowserNotification, Queue) {
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

}]);
