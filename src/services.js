var appServices = angular.module('appServices', []);

appServices.factory('User', ['$window', '$http', function ($window, $http) {
    'use strict';

    var persist = false;

    return {

        getAuthHeader: function () {
            var tokenKey = this.getTokenKey();
            var tokenValue = this.getTokenValue();
            return 'Basic ' + $window.btoa(tokenKey + ':' + tokenValue);
        },

        getTokenKey: function () {
            if (localStorage.tokenKey) {
                return localStorage.tokenKey;
            } else if (sessionStorage.tokenKey) {
                return sessionStorage.tokenKey;
            } else {
                return false;
            }
        },

        getTokenValue: function () {
            if (localStorage.tokenValue) {
                return localStorage.tokenValue;
            } else if (sessionStorage.tokenValue) {
                return sessionStorage.tokenValue;
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

                    if (data.hasOwnProperty('value')) {
                        if (persist === true) {
                            localStorage.tokenKey = data.key;
                            localStorage.tokenValue = data.value;
                            localStorage.channel = data.channel;
                        } else {
                            sessionStorage.tokenKey = data.key;
                            sessionStorage.tokenValue = data.value;
                            sessionStorage.channel = data.channel;
                        }
                    }
                }
            });
        },

        logOut: function () {
            var auth = this.getAuthHeader();
            localStorage.removeItem('tokenKey');
            localStorage.removeItem('tokenValue');
            localStorage.removeItem('channel');
            sessionStorage.removeItem('tokenKey');
            sessionStorage.removeItem('tokenValue');
            sessionStorage.removeItem('channel');

            $http({
                method: 'POST',
                url: '/deauth',
                headers: {
                    'Authorization': auth
                }
            });
        }
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

appServices.factory('Faye', ['$location', '$rootScope', '$log', 'User', 'Queue', function ($location, $rootScope, $log, User, Queue) {
    'use strict';
    var client, subscription;

    return {
        init: function (port) {
            port = parseInt(port, 10) || 0;
            if (port === 0) {
                port = $location.port();
            }

            $log.info('Websocket port is ' + port);

            var url = $location.protocol() + '://' + $location.host() + ':' + port + '/messages';
            client = new Faye.Client(url, {
                timeout: 45,
                retry: 5
            });

            client.addExtension({
                incoming: function (message, callback) {
                    $log.debug('faye incoming', message);
                    if (message.error) {
                        var segments = message.error.split('::');
                        var code = parseInt(segments[0], 10);
                        var value = segments[1];

                        if (code === 301) {
                            $rootScope.$broadcast('connection:resubscribe', value);
                        }
                    }
                    $rootScope.$apply();
                    return callback(message);
                },
                outgoing: function(message, callback) {
                    $log.debug('faye outgoing', message);
                    if (message.channel !== '/meta/subscribe') {
                        return callback(message);
                    }

                    if (!message.ext) {
                        message.ext = {};
                    }
                    message.ext.authToken = User.getTokenValue();
                    $rootScope.$apply();

                    return callback(message);
                }
            });

            client.on('transport:down', function () {
                $log.warn('Faye transport is down');
                $rootScope.$broadcast('connection:change', 'disconnected');
                $rootScope.$apply();
            });

            client.on('transport:up', function () {
                $log.info('Faye transport is up');
                $rootScope.$broadcast('connection:change', 'connected');
                $rootScope.$apply();
            });
        },

        subscribe: function () {
            var channel = User.getChannel();

            subscription = client.subscribe(channel, function (message) {
                if (typeof message === 'string') {
                    try {
                        message = JSON.parse(message);
                    } catch (e) {
                        $log.error('Unable to parse message: ', e);
                    }
                }

                if (message.hasOwnProperty('retracted')) {
                    Queue.drop(message.retracted);
                } else {
                    Queue.add(message);
                }

                $rootScope.$apply();
            });
        },

        unsubscribe: function (channel) {
            client.unsubscribe(channel);
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

appServices.factory('Queue', ['$rootScope', '$http', '$log', '$window', 'User', 'BrowserNotification', function ($rootScope, $http, $log, $window, User, BrowserNotification) {
    'use strict';

    return {
        messages: [],

        clear: function (ids) {
            if (!ids instanceof Array) {
                ids = [ids];
            }

            this.messages.forEach(function (message) {
                if (ids.indexOf(message.publicId) > -1) {
                    message.state = 'clearing';
                }
            });

            $http({
                method: 'POST',
                url: '/message/clear',
                headers: {
                    'Authorization': User.getAuthHeader()
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

            $rootScope.$broadcast('queue:change', self.messages.length);
        },

        empty: function () {
            this.messages = [];
            $rootScope.$broadcast('queue:change', this.messages.length);
        },

        fill: function () {
            var self = this;

            var url = '/archive/10';

            $http({
                method: 'GET',
                url: url,
                headers: {
                    'Authorization': User.getAuthHeader()
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
                $rootScope.$broadcast('queue:change', self.messages.length);

            }).error(function() {
                self.messages = [];
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

            $rootScope.$broadcast('queue:change', this.messages.length);

            if (message.group !== 'internal') {
                BrowserNotification.send(message);
            }
        },
    };
}]);
