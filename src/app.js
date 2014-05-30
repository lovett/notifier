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
        action: 'logout'
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
                    User.setChannel(data.channel);
                } else {
                    User.logOut();
                }
                return data;
            }
        }
    });
}]);

app.factory('User', [function () {
    'use strict';

    var getToken = function () {
        return sessionStorage.token || false;
    };

    var getChannel = function () {
        return '/messages/' + sessionStorage.channel || false;
    };

    return {
        getToken: getToken,

        setToken: function (value) {
            sessionStorage.token = value;
        },

        getChannel: getChannel,
        
        setChannel: function (value) {
            sessionStorage.channel = value;
        },

        logOut: function () {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('channel');
        },

        isLoggedIn: function () {
            return (getToken() !== false);
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

app.factory('Faye', ['$location', '$rootScope', '$log', 'User', function ($location, $rootScope, $log, User) {
    'use strict';
    var client, subscription;


    return {
        init: function () {
            client = new Faye.Client($location.absUrl() + 'faye', {
                retry: 10
            });

            client.addExtension({
                outgoing: function(message, callback) {
                    if (message.channel !== '/meta/subscribe') {
                        return callback(message);
                    }

                    if (!message.ext) {
                        message.ext = {};
                    }
                    message.ext.authToken = User.getToken();

                    callback(message);
                }
            });

            client.on('transport:down', function () {
                $log.info('Faye transport is down');
                $rootScope.$broadcast('connection:changed', 'disconnected');
                $rootScope.$apply();
            });

            client.on('transport:up', function () {
                $log.info('Faye transport is up');
                $rootScope.$broadcast('connection:changed', 'connected');
                $rootScope.$apply();
            });
        },
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
                    $rootScope.$apply();
                }
            });

            subscription.then(function () {
                $log.info('Subscription successful');
            }, function (err) {
                $log.warn('Suscription error: ' + err.message);
            });
        },

        unsubscribe: function() {
            if (angular.isDefined(client)) {
                client.disconnect();
                $log.info('Disconnected');
            }
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

        populate: function (token) {
            var self = this;
            $http({
                method: 'GET',
                url: '/archive/10?since=' + (+self.getAsOfDate()),
                headers: {
                    'X-Token': token
                }
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
