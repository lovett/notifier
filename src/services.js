var appServices = angular.module('appServices', []);

appServices.factory('User', ['$http', function ($http) {
    'use strict';

    var persist = false;

    return {
        getToken: function () {
            if (localStorage.token) {
                return localStorage.token;
            } else if (sessionStorage.token) {
                return sessionStorage.token;
            } else {
                return false;
            }
        },

        getChannel: function () {
            if (localStorage.channel) {
                return '/messages/' + localStorage.channel;
            } else if (sessionStorage.channel) {
                return '/messages/' + sessionStorage.channel;
            } else {
                return false;
            }
        },

        replaceChannel: function (value) {
            if (localStorage.channel) {
                localStorage.channel = value;
            } else if (sessionStorage.channel) {
                sessionStorage.channel = value;
            }
        },

        logIn: function (form) {
            persist = form.remember;

            return $http({
                method: 'POST',
                url: '/auth',
                data: {
                    'username': form.username,
                    'password': form.password
                },
                transformResponse: function (data) {
                    try {
                        data = JSON.parse(data);
                    } catch (e) {
                        data = {};
                    }

                    if (data.hasOwnProperty('token')) {
                        if (persist === true) {
                            localStorage.token = data.token;
                            localStorage.channel = data.channel;
                        } else {
                            sessionStorage.token = data.token;
                            sessionStorage.channel = data.channel;
                        }
                    }
                }
            });
        },

        logOut: function () {
            localStorage.removeItem('token');
            localStorage.removeItem('channel');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('channel');
        },
    };
}]);

appServices.factory('HttpInterceptor', ['$q', '$location', function ($q, $location) {
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

appServices.factory('Faye', ['$location', '$rootScope', '$log', 'User', 'Queue', function ($location, $rootScope, $log, User) {
    'use strict';
    var client, subscription, subscriptionCallback;

    return {
        init: function (port) {
            port = parseInt(port, 10) || 0;
            if (port === 0) {
                port = $location.port();
            }

            $log.info('Websocket port is ' + port);

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
                $rootScope.$broadcast('connection:change', 'disconnected');
                $rootScope.$apply();
            });

            client.on('transport:up', function () {
                $log.info('Faye transport is up');
                $rootScope.$broadcast('connection:change', 'connected');
                $rootScope.$apply();
            });
        },

        subscribe: function (callback) {
            var channel = User.getChannel();

            if (callback) {
                subscriptionCallback = callback;
            }

            $log.info('Subscribing to ' + channel);

            if (angular.isDefined(client)) {
                client.unsubscribe();
            }

            subscription = client.subscribe(channel, function (message) {
                if (!subscriptionCallback) {
                    return;
                }

                if (typeof message === 'string') {
                    try {
                        message = JSON.parse(message);
                    } catch (e) {
                        $log.error('Unable to parse message: ', e);
                    }
                }

                callback(message);
                $rootScope.$apply();
            });

            subscription.then(function () {
                $log.info('Subscription successful');
            });
        },

        disconnect: function () {
            if (angular.isDefined(client)) {
                client.unsubscribe();
                client.disconnect();
                $log.info('Disconnected client');
            }
        }

    };
}]);

appServices.service('BrowserNotification', ['$window', '$rootScope', function ($window, $rootScope) {
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

appServices.factory('Queue', ['$rootScope', '$http', '$log', 'User', 'BrowserNotification', function ($rootScope, $http, $log, User, BrowserNotification) {
    'use strict';

    return {
        pristine: true,

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
                self.pristine = false;
            }).error(function() {
                self.messages = [];
            });
        },

        add: function (message) {
            this.pristine = false;

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
