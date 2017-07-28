const appControllers = angular.module('appControllers', []);

appControllers.controller('MessageController', ['$rootScope', '$scope', '$location', 'User', 'Faye', 'MessageList', ($rootScope, $scope, $location, User, Faye, MessageList) => {
    'use strict';

    if (User.getTokenKey() === false) {
        $location.path('login');
        return;
    }


    // When the shortcut summary is show, hide the message list so
    // that the height of the body stays true to the visible content.
    $scope.messageListVisible = true;
    $scope.$on('shortcuts:toggle', () => {
        $scope.messageListVisible = !$scope.messageListVisible;
        $scope.$apply();
    });

    $scope.$on('shortcuts:hide', () => {
        $scope.messageListVisible = true;
        $scope.$apply();
    });

    $scope.$on('queue:change', (e, size) => {
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

    $scope.$on('connection:resubscribe', (e, channel) => {
        Faye.unsubscribe(User.getChannel());
        User.replaceChannel(channel);
        Faye.subscribe();
    });

    $scope.$on('connection:change', (e, state) => {
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

appControllers.controller('LoginController', ['$rootScope', '$scope', '$location', 'User', ($rootScope, $scope, $location, User) => {

    $rootScope.$broadcast('connection:change', 'inactive');

    if (User.getTokenKey()) {
        User.logOut();
    }

    $scope.submitLogin = (form) => {
        let errorCallback;
        let promise;
        let successCallback;

        if (form.$invalid) {
            $scope.message = 'All fields are required';
            return;
        }

        $scope.message = null;
        $scope.progress = 'Logging in...';

        promise = User.logIn(form);

        successCallback = () => {
            $location.path('/');
        };

        errorCallback = () => {
            $scope.message = 'Please try again';
            $scope.progress = null;
        };

        promise.then(successCallback, errorCallback);
    };

}]);

appControllers.controller('LogoutController', ['$rootScope', '$scope', '$location', 'User', 'MessageList', 'Faye',  ($rootScope, $scope, $location, User, MessageList, Faye) => {

    $rootScope.$broadcast('connection:change', 'inactive');

    if (User.getTokenKey()) {
        Faye.disconnect();
        User.logOut();
        MessageList.empty();
    }

    $scope.visitLogin = () => {
        $location.path('/login');
    };

}]);


appControllers.controller('OnedriveController', ['$scope', '$window', '$location', 'User', ($scope, $window, $location, User) => {

    if (User.getTokenKey() === false) {
        $location.path('/login');
        return;
    }

    User.authorize('onedrive', (url) => {
        $window.location.href = url;
    });
}]);
