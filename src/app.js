var app = angular.module('App', [
    'ngRoute',
    'appControllers',
    'ngSanitize',
    'angularMoment'
]);

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/', {
        controller: 'MessageController',
        templateUrl: '/messages.html'
    });
}]);

app.config(['$locationProvider', function ($locationProvider) {
    $locationProvider.html5Mode(true);
}]);

app.factory('Faye', ['$location', '$rootScope', '$log', function ($location, $rootScope, $log) {
    var client, subscription;

    client = new Faye.Client($location.absUrl() + 'faye', {
        retry: 10
    });

    client.on('transport:down', function () {
        $log.info('The websocket connection went offline at ' + new Date());
        $rootScope.connection_status = 'disconnected';
        $rootScope.$apply();
    })

    client.on('transport:up', function () {
        $log.info('The websocket connection came online at ' + new Date());
        $rootScope.connection_status = 'connected';
        $rootScope.$apply();
    });

    return {
        subscribe: function (channel, callback) {
            subscription = client.subscribe(channel, function (message) {
                callback(message);
                $rootScope.$apply()
            });

            subscription.then(function () {
                $log.info('Subscribed to ' + channel);
                $rootScope.$apply();
            });
        },

        unsubscribe: function() {
            $log.info('Unsubscribed from ' + subscription._channels);
            subscription.cancel();
            $rootScope.$apply();
        }
    };
    return instance;
}]);
