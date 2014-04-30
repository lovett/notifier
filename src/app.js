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

app.factory('Faye', ['$location', '$rootScope', '$log', 'Queue', function ($location, $rootScope, $log, Queue) {
    var client, subscription;

    client = new Faye.Client($location.absUrl() + 'faye', {
        retry: 10
    });

    client.on('transport:down', function () {
        Queue.add({
            group: 'internal',
            title: 'Disconnected'
        });
        $rootScope.$apply();
    })

    client.on('transport:up', function () {
        Queue.add({
            group: 'internal',
            title: 'Connected'
        });
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

app.factory('BrowserNotification', ['$window', function ($window) {

    var enabled = $window.Notification.permission == 'granted' || false;

    return {
        supported: $window.Notification,

        enabled: enabled,

        enable: function () {
            $window.Notification.requestPermission(function (permission) {
                enabled = permission;
                if (permission == 'granted') {
                    alert('Browser notifications have been enabled.');
                }
            });
        },

        send: function (message) {
            if (enabled === false) return;

            if ($window.document.hasFocus()) return;

            notification = new Notification(message.title, {
                'body': message.body || '',
                'tag' : +new Date()
            });
        }
    }
}]);

app.factory('Queue', ['$http', function ($http) {
    var counter = 0;

    return {
        ready: false,

        as_of: parseInt(localStorage['asOf'], 10),

        sinceNow: function () {
            this.as_of = +new Date();
            localStorage['asOf'] = this.as_of;
            this.members = [];
        },

        sinceEver: function () {
            this.as_of = 0;
            localStorage['asOf'] = this.as_of;
        },

        members: [],

        isEmpty: function () {
            return this.members.length == 0;
        },

        populate: function () {
            var self = this;
            $http({
                method: 'GET',
                url: '/archive/10'
            }).success(function(data, status, headers, config) {
                self.ready = true;
                if (data instanceof Array) {
                    data.forEach(function (message) {
                        self.add(message);
                    });
                }
            }).error(function(data, status, headers, config) {
            });
        },

        add: function (message) {
            if (typeof message === 'string') {
                message = JSON.parse(message);
            }

            if (!message.received) {
                message.received = +new Date();
            }

            if (this.as_of > message.received) {
                return null;
            }

            if (message.hasOwnProperty('body')) {
                message.body = message.body.replace(/\n/g, "<br/>");
            }

            if (message.hasOwnProperty('group')) {
                message.badge = message.group.split(',').pop();
            }

            counter = counter + 1;
            message.id = counter;

            this.members.unshift(message);
            return message;
        },

        remove: function (id) {
            this.members = this.members.filter(function (element) {
                return element.id !== id;
            });
        }
    }
}]);
