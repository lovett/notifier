var appControllers = angular.module('appControllers', []);

appControllers.controller('AppController', ['$scope', '$document', 'Queue', 'BrowserNotification', function ($scope, $document, Queue, BrowserNotification) {
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
        $scope.connectionStatus = state;
        $scope.connectionChangedAt = new Date();
        if (state === 'connected') {
            $scope.queue.fill();
            $scope.windowTitle = $scope.windowTitle.replace(offlineSymbol, '');
        } else {
            $scope.windowTitle = offlineSymbol + $scope.windowTitle;
        }
    });

    $scope.$on('queue:change', function (e, size) {
        if (size === 0) {
            $scope.windowTitle = 'Notifier';
        } else if (size === 1) {
            $scope.windowTitle = '1 Message';
        } else {
            $scope.windowTitle = size + ' Messages';
        }
    });

}]);

appControllers.controller('MessageController', ['$scope', '$location', '$log', 'User', 'Faye', function ($scope, $location, $log, User, Faye) {
    'use strict';

    if (User.getToken() === false) {
        $log.info('Not logged in');
        $location.path('/login');
        return;
    }

    Faye.init($scope.websocketPort);

    Faye.subscribe();

    $scope.$on('connection:resubscribe', function (e, channel) {
        Faye.unsubscribe(User.getChannel());
        User.replaceChannel(channel);
        Faye.subscribe();
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
