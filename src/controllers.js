var appControllers = angular.module('appControllers', []);

appControllers.controller('AppController', ['$scope', '$document', 'Queue', 'BrowserNotification', function ($scope, $document, Queue, BrowserNotification) {
    'use strict';

    $scope.queue = Queue;
    $scope.browserNotification = BrowserNotification;

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
    Faye.disconnect();

    $scope.visitLogin = function () {
        $location.path('/login');
    };

}]);
