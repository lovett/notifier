var appControllers = angular.module('appControllers', []);

appControllers.controller('MessageController', ['$rootScope', '$scope', '$location', 'User', 'Faye', 'MessageList', function ($rootScope, $scope, $location, User, Faye, MessageList) {
    'use strict';

    if (User.getTokenKey() === false) {
        $location.path('login');
        return;
    }


    // When the shortcut summary is show, hide the message list so
    // that the height of the body stays true to the visible content.
    $scope.messageListVisible = true;
    $scope.$on('shortcuts:toggle', function () {
        $scope.messageListVisible = !$scope.messageListVisible;
        $scope.$apply();
    });

    $scope.$on('shortcuts:hide', function () {
        $scope.messageListVisible = true;
        $scope.$apply();
    });

    $scope.$on('queue:change', function (e, size) {
        if (size === 0) {
            $scope.appMessage = 'No new messages.';
        } else {
            $scope.appMessage = undefined;
        }
    });

    $scope.queue = MessageList;
    $scope.queue.fetch();
    Faye.init($scope.websocketPort);
    Faye.subscribe();

    $scope.$on('connection:resubscribe', function (e, channel) {
        Faye.unsubscribe(User.getChannel());
        User.replaceChannel(channel);
        Faye.subscribe();
    });

    $scope.$on('connection:change', function (e, state) {
        $scope.connectionState = state;
        if (state === 'online') {
            Faye.init($scope.websocketPort);
            Faye.subscribe();
        }

        if (state === 'connected' || state === 'online') {
            $scope.queue.fetch();
        }

    });


}]);

appControllers.controller('LoginController', ['$rootScope', '$scope', '$location', 'User', function ($rootScope, $scope, $location, User) {
    'use strict';

    $rootScope.$broadcast('connection:change', 'inactive');

    if (User.getTokenKey()) {
        User.logOut();
    }

    $scope.submitLogin = function (form) {
        var errorCallback, promise, successCallback;
        if (form.$invalid) {
            $scope.message = 'All fields are required';
            return;
        }

        $scope.message = null;
        $scope.progress = 'Logging in...';

        promise = User.logIn(form);

        successCallback = function () {
            $location.path('/');
        };

        errorCallback = function () {
            $scope.message = 'Please try again';
            $scope.progress = null;
        };

        promise.then(successCallback, errorCallback);
    };

}]);

appControllers.controller('LogoutController', ['$rootScope', '$scope', '$location', 'User', 'MessageList', 'Faye', function ($rootScope, $scope, $location, User, MessageList, Faye) {
    'use strict';

    $rootScope.$broadcast('connection:change', 'inactive');

    if (User.getTokenKey()) {
        Faye.disconnect();
        User.logOut();
        MessageList.empty();
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
