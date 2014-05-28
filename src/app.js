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
            lastDay : '[yesterday at] LT',
            sameDay : 'LT',
            nextDay : '[yomorrow at] LT',
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

app.factory('Faye', ['$location', '$rootScope', '$log', function ($location, $rootScope, $log) {
    'use strict';
    var client, subscription;


    client = new Faye.Client($location.absUrl() + 'faye', {
        retry: 10
    });

    client.on('transport:down', function () {
        $rootScope.$broadcast('connection:changed', 'disconnected');
        $rootScope.$apply();
    });

    client.on('transport:up', function () {
        $rootScope.$broadcast('connection:changed', 'connected');
        $rootScope.$apply();
    });

    return {
        subscribe: function (channel, callback) {
            subscription = client.subscribe(channel, function (message) {
                if (callback) {
                    if (typeof message === 'string') {
                        try {
                            message = JSON.parse(message);
                        } catch (e) {
                            $log.error('Unable to parse message: ', e);
                        }
                    }

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

app.factory('BrowserNotification', ['$window', function ($window) {
    'use strict';

    var enabled = $window.Notification.permission === 'granted' || false;

    var send = function (message, ignoreFocus) {
        if (enabled === false) {
            return false;
        }

        if ($window.document.hasFocus() && ignoreFocus !== true) {
            return;
        }

        return new Notification(message.title, {
            'body': message.body || '',
            'tag' : +new Date()
        });

    };

    return {
        supported: $window.Notification,

        enabled: enabled,

        enable: function () {
            $window.Notification.requestPermission(function (permission) {
                enabled = permission;
                if (permission === 'granted') {
                    send({
                        group: 'internal',
                        title: 'Browser notifications enabled',
                        body: 'They can be turned off by editing your browser settings.'
                    }, true);
                }
            });
        },

        send: send
    };
}]);

app.factory('Queue', ['$http', 'BrowserNotification', function ($http, BrowserNotification) {
    'use strict';

    return {
        ready: false,

        getAsOfDate: function () {
            return new Date(localStorage.asOf || new Date());
        },

        setAsOfDate: function (date) {
            date = new Date(date || new Date());

            localStorage.asOf = date;
        },

        sinceNow: function () {
            this.setAsOfDate();
            this.messages = {};
        },

        messages: {},

        isEmpty: function () {
            return Object.keys(this.messages).length === 0;
        },

        populate: function () {
            var self = this;
            $http({
                method: 'GET',
                url: '/archive/10?since=' + (+self.getAsOfDate())
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
            message.received = new Date(message.received || new Date());

            if (message.body) {
                message.body = message.body.replace(/\n/g, '<br/>');
            }

            if (message.group) {
                message.badge = message.group.split('.').pop();
            }

            this.messages[message.publicId] = message;

            if (message.received > this.getAsOfDate()) {
                this.setAsOfDate(message.received);
            }

            if (message.group !== 'internal') {
                BrowserNotification.send(message);
            }
        },

        remove: function (publicId) {
            delete this.messages[publicId];
        }
    };
}]);
