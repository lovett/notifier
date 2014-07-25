/* global angular, Faye, Notification, moment */
var app = angular.module('App', [
    'ngRoute',
    'appControllers',
    'ngSanitize',
    'angularMoment',
    'ngResource',
    'ngTouch',
    'ngAnimate'
]);

app.directive('notifierAppcacheReload', ['$window', '$log', function ($window, $log) {
    'use strict';

    return {
        restrict: 'A',
        link: function () {
            if ($window.applicationCache) {
                $window.applicationCache.addEventListener('updateready', function() {
                    $log.info('An appcache update is ready, reloading');
                    $window.location.reload();
                });
            }
        }
    };
}]);

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
        templateUrl: '/templates/login.html'
    });

    $routeProvider.when('/logout', {
        controller: 'LoginController',
        templateUrl: '/templates/logout.html',
        action: 'logout'
    });

    $routeProvider.when('/', {
        controller: 'MessageController',
        templateUrl: '/templates/messages.html'
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
        init: function (port) {
            port = parseInt(port, 10) || 0;
            if (port === 0) {
                port = $location.port();
            }

            var url = $location.protocol() + '://' + $location.host() + ':' + port + '/messages';
            client = new Faye.Client(url, {
                retry: 10
            });

            client.addExtension({
                incoming: function (message, callback) {
                    if (message.error) {
                        var segments = message.error.split('::');
                        var code = parseInt(segments[0], 10);
                        var value = segments[1];

                        if (code === 301) {
                            $rootScope.$broadcast('connection:resubscribe', value);
                        } else {
                            $log.error(message.error);
                        }
                    }
                    $rootScope.$apply();
                    return callback(message);
                },
                outgoing: function(message, callback) {
                    if (message.channel !== '/meta/subscribe') {
                        return callback(message);
                    }

                    if (!message.ext) {
                        message.ext = {};
                    }
                    message.ext.authToken = User.getToken();
                    $rootScope.$apply();

                    return callback(message);
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
            $log.info('Subscribing to ' + channel);
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
                client.unsubscribe();
                $log.info('Unsubscribed client');
            }
        },

        disconnect: function () {
            if (angular.isDefined(client)) {
                client.disconnect();
                $log.info('Disconnected client');
            }
        }

    };
}]);

app.service('BrowserNotification', ['$window', '$rootScope', function ($window, $rootScope) {
    'use strict';

    this.send = function (message, ignoreFocus) {
        if ($window.document.hasFocus() && ignoreFocus !== true) {
            return;
        }

        return new Notification(message.title, {
            'body': message.body || '',
            'tag' : +new Date()
        });

    };

    if (!$window.Notification) {
        this.state = 'unavailable';
    } else if ($window.Notification.permission === 'granted') {
        this.state = 'active';
    } else {
        this.state = 'inactive';
    }

    this.enable = function () {
        var self = this;

        if (self.state === 'active') {
            $window.alert('Notifications are active. They can be turned off from the browser\'s Notification settings.');
            return;
        }

        $window.Notification.requestPermission(function (permission) {
            if (permission === 'denied') {
                $window.alert('Notifications are inactive, but they can be turned on via the browser\'s Notifications settings');
                return;
            }

            if (permission === 'granted') {
                self.send({
                    group: 'internal',
                    title: 'Browser notifications enabled'
                }, true);
                self.state = 'active';
                $rootScope.$apply();
            }
        });
    };
}]);

app.factory('Queue', ['$http', '$log', 'User', 'BrowserNotification', function ($http, $log, User, BrowserNotification) {
    'use strict';

    return {
        messages: [],

        clear: function (ids) {
            if (!ids instanceof Array) {
                ids = [ids];
            }

            $http({
                method: 'POST',
                url: '/message/clear',
                headers: {
                    'X-Token': User.getToken()
                },
                data: {
                    publicId: ids
                }
            });
        },

        purge: function () {
            var ids = this.messages.map(function (message) {
                return message.publicId;
            });

            this.clear(ids);
        },

        drop: function (ids) {
            var self = this;
            if (!ids instanceof Array) {
                ids = [ids];
            }

            self.messages = self.messages.filter(function (message) {
                return ids.indexOf(message.publicId) === -1;
            });
        },

        fill: function () {
            var self = this;

            var url = '/archive/10';

            $http({
                method: 'GET',
                url: url,
                headers: {
                    'X-Token': User.getToken()
                }
            }).success(function(data) {

                // Empty the queue, but do not inform the server.
                // This avoids the need to check for dupliates following a reconnect.
                self.messages = [];

                if (data instanceof Array) {

                    // messages will be ordered newest first, but if they are added to the queue
                    // sequentially they will end up oldest first
                    data.reverse();

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

            this.messages.unshift(message);

            if (message.group !== 'internal') {
                BrowserNotification.send(message);
            }
        },
    };
}]);
