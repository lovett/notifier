var appControllers = angular.module('appControllers', []);

appControllers.controller('AppController', ['$window', '$scope', '$document', '$log', 'Queue', 'BrowserNotification', function ($window, $scope, $document, $log, Queue, BrowserNotification) {
    'use strict';

    var offlineSymbol = '⚠ ';

    $scope.queue = Queue;
    $scope.browserNotification = BrowserNotification;

    $scope.windowTitle = 'Notifier';

    angular.forEach($document.find('META'), function (tag) {
        if (tag.name === 'websocket port') {
            $scope.websocketPort = tag.content;
        }
    });

    $scope.fullReload = function () {
        $log.info('Reloading the page');
        $window.location.reload();
    };

    $scope.$on('fullreload', $scope.fullReload);

    $scope.$on('connection:change', function (e, state) {

        if (state === 'offline') {
            state = 'disconnected';
        }

        if (state === 'online') {
            state = 'connected';
        }

        $scope.connectionStatus = state;
        $scope.connectionChangedAt = new Date();

        $log.info(state + ' at ' + $scope.connectionChangedAt);

        if (state === 'connected') {
            $scope.queue.fill();
            $scope.windowTitle = $scope.windowTitle.replace(offlineSymbol, '');
        } else {
            $scope.windowTitle = offlineSymbol + $scope.windowTitle;
        }
        $scope.$apply();
    });

    $scope.$on('queue:change', function (e, size) {
        if (size === 0) {
            $scope.windowTitle = 'Notifier';
            $scope.appMessage = 'No new messages.';
        } else if (size === 1) {
            $scope.windowTitle = '1 Message';
            $scope.appMessage = undefined;
        } else {
            $scope.windowTitle = size + ' Messages';
            $scope.appMessage = undefined;
        }
    });

}]);

appControllers.controller('MessageController', ['$rootScope', '$scope', '$location', 'User', 'Faye', function ($rootScope, $scope, $location, User, Faye) {
    'use strict';

    if (User.getTokenKey() === false) {
        $location.path('/login');
        return;
    }

    $rootScope.appMessage = 'Checking for messages...';
    

    Faye.init($scope.websocketPort);
    Faye.subscribe();

    $scope.$on('connection:resubscribe', function (e, channel) {
        Faye.unsubscribe(User.getChannel());
        User.replaceChannel(channel);
        Faye.subscribe();
    });

    $scope.$on('connection:change', function (e, state) {
        if (state === 'offline') {
            Faye.disconnect();
        }

        if (state === 'online') {
            Faye.init($scope.websocketPort);
            Faye.subscribe();
        }
    });

}]);

appControllers.controller('LoginController', ['$scope', '$location', 'User', function ($scope, $location, User) {
    'use strict';

    $scope.submitLogin = function (form) {

        if (form.$invalid) {
            $scope.message = 'All fields are required';
            return;
        }

        $scope.message = null;
        $scope.progress = 'Logging in...';

        var promise = User.logIn(form);

        var successCallback = function () {
            $location.path('/');
        };
        
        var errorCallback = function () {
            $scope.message = 'Please try again';
            $scope.progress = null;
        };

        promise.then(successCallback, errorCallback);
    };

}]);

appControllers.controller('LogoutController', ['$scope', '$location', 'User', 'Faye', 'Queue', function ($scope, $location, User, Faye, Queue) {
    'use strict';

    if (User.getTokenKey()) {
        User.logOut();
        Faye.disconnect();
        Queue.empty();
    }

    $scope.visitLogin = function () {
        $location.path('/login');
    };

}]);
