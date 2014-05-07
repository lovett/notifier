/* global angular, Faye, Notification, moment */
var app = angular.module('App', [
    'ngRoute',
    'appControllers',
    'ngSanitize',
    'angularMoment',
    'ngCookies',
    'ngResource'
]);

app.config(['$httpProvider', '$routeProvider', '$locationProvider', function ($httpProvider, $routeProvider, $locationProvider) {
    'use strict';

    $httpProvider.interceptors.push('HttpInterceptor');

    moment.lang('en', {
        calendar : {
            lastDay : '[Yesterday at] LT',
            sameDay : 'LT',
            nextDay : '[Tomorrow at] LT',
            lastWeek : '[last] dddd [at] LT',
            nextWeek : 'dddd [at] LT',
            sameElse : 'L'
        }
    });

    $routeProvider.when('/login', {
        controller: 'LoginController',
        templateUrl: '/login.html'
    });

    $routeProvider.when('/logout', {
        controller: 'LoginController',
        templateUrl: '/logout.html',
        appEvent: 'logout'
    });

    $routeProvider.when('/', {
        controller: 'MessageController',
        templateUrl: '/messages.html'
    });

    $routeProvider.otherwise('/', {
        redirectTo: '/'
    });

    $locationProvider.html5Mode(true);
}]);

app.factory('AuthService', ['$rootScope', '$resource', 'User', function ($rootScope, $resource, User) {
    'use strict';
    return $resource('/auth', {}, {
        'login': {
            method: 'POST',
            transformResponse: function (data) {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    data = {};
                }

                if (data.hasOwnProperty('token')) {
                    User.setToken(data.token);
                } else {
                    User.logOut();
                }
                return data;
            }
        }
    });
}]);

app.factory('User', ['$document', function ($document) {
    'use strict';
    var key = 'u';

    return {
        setToken: function (value) {
            var date = new Date();
            date.setTime(date.getTime()+(365*24*60*60*1000));
            $document[0].cookie = key + '=' + value + '; expires=' + date.toGMTString() + '; path=/';
        },

        logOut: function () {
            var date = new Date();
            date.setTime(date.getTime() - (365*24*60*60*1000));
            $document[0].cookie = key + '=' + '; expires=' + date.toGMTString() + '; path=/';
        },

        isLoggedIn: function () {
            var fields, i, segments;
            fields = $document[0].cookie.split(';');
            for (i=0; i < fields.length; i = i + 1) {
                segments = fields[i].split('=');
                if (segments[0] === 'u') {
                    return true;
                }
            }
            return false;
        }
    };
}]);
app.factory('HttpInterceptor', ['$q', '$location', function ($q, $location) {
    'use strict';
    return {
        'responseError': function (response) {
            if (response.status === 401) {
                $location.path('/login');
                return $q.reject(response);
            }
        }
    };
}]);

app.factory('Faye', ['$location', '$rootScope', '$log', 'Queue', function ($location, $rootScope, $log, Queue) {
    'use strict';
    var client, subscription, disconnected;


    client = new Faye.Client($location.absUrl() + 'faye', {
        retry: 10
    });

    client.on('transport:down', function () {
        Queue.add({
            group: 'internal',
            title: 'Disconnected'
        });
        disconnected = true;
        $rootScope.$apply();
    });

    client.on('transport:up', function () {
        if (disconnected) {
            Queue.add({
                group: 'internal',
                title: 'Reconnected'
            });
            disconnected = false;
        }
        $rootScope.$apply();
    });

    return {
        subscribe: function (channel, callback) {
            subscription = client.subscribe(channel, function (message) {
                if (callback) {
                    callback(message);
                }
                $rootScope.$apply();
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
}]);

app.factory('BrowserNotification', ['$window', 'Queue', function ($window, Queue) {
    'use strict';
    var enabled = $window.Notification.permission === 'granted' || false;

    return {
        supported: $window.Notification,

        enabled: enabled,

        enable: function () {
            $window.Notification.requestPermission(function (permission) {
                enabled = permission;
                if (permission === 'granted') {
                    Queue.add({
                        group: 'internal',
                        title: 'Browser notifications have been enabled'
                    });
                }
            });
        },

        send: function (message) {
            var notification;
            if (enabled === false) {
                return;
            }

            if ($window.document.hasFocus()) {
                return;
            }

            notification = new Notification(message.title, {
                'body': message.body || '',
                'tag' : +new Date()
            });
        }
    };
}]);

app.factory('Queue', ['$http', function ($http) {
    'use strict';
    var counter = 0;

    return {
        ready: false,

        asOf: parseInt(localStorage.asOf, 10),

        sinceNow: function () {
            this.asOf = +new Date();
            localStorage.asOf = this.asOf;
            this.members = [];
        },

        sinceEver: function () {
            this.asOf = 0;
            localStorage.asOf = this.asOf;
        },

        members: [],

        isEmpty: function () {
            return this.members.length === 0;
        },

        populate: function () {
            var self = this;
            $http({
                method: 'GET',
                url: '/archive/10'
            }).success(function(data) {
                self.ready = true;
                if (data instanceof Array) {
                    data.forEach(function (message) {
                        self.add(message);
                    });
                }
            }).error(function() {
                self.add({
                    group: 'internal',
                    title: 'Unable to get messages from archive'
                });

            });
        },

        add: function (message) {
            if (typeof message === 'string') {
                message = JSON.parse(message);
            }

            if (!message.received) {
                message.received = +new Date();
            }

            if (this.asOf > message.received) {
                return null;
            }

            if (message.hasOwnProperty('body')) {
                message.body = message.body.replace(/\n/g, '<br/>');
            }

            if (message.group) {
                message.badge = message.group.split('.').pop();
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
    };
}]);
