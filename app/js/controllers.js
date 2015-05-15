var appControllers = angular.module('appControllers', []);

appControllers.controller('MessageController', ['$rootScope', '$scope', '$location', 'User', 'Faye', 'Queue', function ($rootScope, $scope, $location, User, Faye, Queue) {
    'use strict';

    if (User.getTokenKey() === false) {
        $location.path('/login');
        return;
    }

    $scope.$on('queue:change', function (e, size) {
        if (size === 0) {
            $scope.appMessage = 'No new messages.';
        } else {
            $scope.appMessage = undefined;
        }
    });


    Faye.init($scope.websocketPort);
    Faye.subscribe();

    $scope.$on('connection:resubscribe', function (e, channel) {
        Faye.unsubscribe(User.getChannel());
        User.replaceChannel(channel);
        Faye.subscribe();
    });

    $scope.queue = Queue;

    $scope.$on('connection:change', function (e, state) {
        if (state === 'online') {
            Faye.init($scope.websocketPort);
            Faye.subscribe();
        }

        if (state === 'connected' || state === 'online') {
            $scope.queue.fill();
        }

    });


}]);

appControllers.controller('LoginController', ['$scope', '$location', 'User', function ($scope, $location, User) {
    'use strict';

    if (User.getTokenKey()) {
        User.logOut();
    }

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


appControllers.controller('OnedriveController', ['$scope', '$window', '$location', 'User', function ($scope, $window, $location, User) {
    'use strict';

    if (User.getTokenKey() === false) {
        $location.path('/login');
        return;
    }

    User.authorize('onedrive', function (url) {
        $window.location.href = url;
    });
}]);
