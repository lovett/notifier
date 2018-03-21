const appControllers = angular.module('appControllers', []);

appControllers.controller('MessageController', ['$scope', '$location', 'User', 'PushClient', 'MessageList', ($scope, $location, User, PushClient, MessageList) => {

    const noMessages = 'No new messages';

    $scope.appMessage = noMessages;

    if (!User.isLoggedIn()) {
        $location.path('login');
        return;
    }

    // When the shortcut summary is shown, hide the message list so
    // that the height of the body stays true to the visible content.
    $scope.messageListVisible = true;

    $scope.$on('shortcuts', (visibility: boolean) => {
        $scope.$apply(() => $scope.messageListVisible = visibility);
    });

    $scope.$on('queue:change', (_: angular.IAngularEvent, size: number) => {
        $scope.appMessage = (size === 0) ? noMessages : null;
    });

    $scope.$on('connection:change', (_: angular.IAngularEvent, state: string) => {
        $scope.connectionState = state;

        if (state === 'connected') {
            $scope.queue.fetch();
        }
    });

    $scope.queue = MessageList;

    PushClient.connect();

}]);

appControllers.controller('LoginController', ['$scope', '$location', 'User', ($scope, $location, User) => {

    if (User.isLoggedIn()) {
        User.logOut();
    }

    $scope.submitLogin = (form: angular.IFormController) => {
        if (form.$invalid) {
            $scope.message = 'All fields are required';
            return;
        }

        $scope.message = null;
        $scope.progress = 'Logging in...';

        User.logIn(form).then(
            () => $location.path('/'),
            () => {
                $scope.message = 'Please try again';
                $scope.progress = null;
            },
        );
    };

}]);

appControllers.controller('LogoutController', ['$scope', '$location', 'User',  ($scope, $location, User) => {

    if (User.isLoggedIn()) {
        User.logOut();
    }

    $scope.visitLogin = () => {
        $location.path('/login');
    };

}]);

export default appControllers;
