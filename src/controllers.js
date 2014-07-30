var appControllers = angular.module('appControllers', []);

appControllers.controller('MessageController', ['$rootScope', '$scope', '$window', '$document', '$location', 'Faye', 'BrowserNotification', 'Queue', 'User', '$log', function ($rootScope, $scope, $window, $document, $location, Faye, BrowserNotification, Queue, User, $log) {
    'use strict';

    if (User.getToken() === false) {
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
            if (message.hasOwnProperty('cleared')) {
                Queue.drop(message.cleared);
            } else {
                Queue.add(message);
            }
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
        Queue.clear(publicId);
    };

    $scope.clearAll = function () {
        Queue.purge();
    };

}]);

appControllers.controller('LoginController', ['$scope', '$location', 'User', function ($scope, $location, User) {
    'use strict';

    $scope.submitLogin = function (form) {
        if (form.$invalid) {
            $scope.message = 'All fields are required';
            return;
        }

        $scope.message = null;

        var promise = User.logIn(form);

        promise.success(function () {
            $location.path('/');
        });

        promise.error(function () {
            $scope.message = 'Please try again';
        });
    };

}]);

appControllers.controller('LogoutController', ['$scope', '$location', 'User', 'Faye', function ($scope, $location, User, Faye) {
    'use strict';

    User.logOut();
    Faye.unsubscribe();
    Faye.disconnect();

    $scope.visitLogin = function () {
        $location.path('/login');
    };

}]);
