var appControllers = angular.module('appControllers', []);

appControllers.controller('AppController', ['$scope', '$document', '$log', 'Queue', 'BrowserNotification', function ($scope, $document, $log, Queue, BrowserNotification) {
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

appControllers.controller('MessageController', ['$rootScope', '$scope', '$location', '$log', 'User', 'Faye', function ($rootScope, $scope, $location, $log, User, Faye) {
    'use strict';

    if (User.getToken() === false) {
        $log.info('Not logged in');
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

        promise.success(function () {
            $location.path('/');
        });

        promise.error(function () {
            $scope.message = 'Please try again';
            $scope.progress = null;
        });
    };

}]);

appControllers.controller('LogoutController', ['$scope', '$location', 'User', 'Faye', function ($scope, $location, User, Faye) {
    'use strict';

    User.logOut();
    Faye.disconnect();

    $scope.visitLogin = function () {
        $location.path('/login');
    };

}]);
