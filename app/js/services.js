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
            if (sessionStorage.tokenKey) {
                return sessionStorage.tokenKey;
            } else if (localStorage.tokenKey) {
                return localStorage.tokenKey;
            } else {
                return false;
            }
        },

        getTokenValue: function () {
            if (sessionStorage.tokenValue) {
                return sessionStorage.tokenValue;
            } else if (localStorage.tokenValue) {
                return localStorage.tokenValue;
            } else {
                return false;
            }
        },

        getChannel: function () {
            if (sessionStorage.channel) {
                return '/messages/' + sessionStorage.channel;
            } else if (localStorage.channel) {
                return '/messages/' + localStorage.channel;
            } else {
                return false;
            }
        },

        replaceChannel: function (value) {
            if (sessionStorage.channel) {
                sessionStorage.channel = value;
            } else if (localStorage.channel) {
                localStorage.channel = value;
            }
        },

        getServices: function (callback) {
            var auth = this.getAuthHeader();
            $http({
                method: 'GET',
                url: '/services',
                headers: {'Authorization': auth}
            }).success(function (data) {
                callback(data);
            }).error(function () {
                callback([]);
            });

        },

        authorize: function (service, callback) {
            var auth = this.getAuthHeader();

            $http({
                method: 'GET',
                params: {
                    'protocol': $window.location.protocol,
                    'host': $window.location.host
                },
                url: '/authorize/' + service + '/start',
                headers: {
                    'Authorization': auth
                }
            }).success(function (data) {
                callback(data.url);
            });
        },

        deauthorize: function (service, callback) {
            var auth = this.getAuthHeader();
            $http({
                method: 'POST',
                data: {
                    'service': service
                },
                url: '/revoke',
                headers: {
                    'Authorization': auth
                }
            }).success(function () {
                callback();
            });
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
                            sessionStorage.removeItem('tokenKey');
                            sessionStorage.removeItem('tokenValue');
                            sessionStorage.removeItem('channel');
                        } else {
                            sessionStorage.tokenKey = data.key;
                            sessionStorage.tokenValue = data.value;
                            sessionStorage.channel = data.channel;
                            localStorage.removeItem('tokenKey');
                            localStorage.removeItem('tokenValue');
                            localStorage.removeItem('channel');
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

            if (client) {
                client.disconnect();
                client = undefined;
                $log.info('Destroyed Faye client');
            }

            port = parseInt(port, 10) || 0;
            if (port === 0) {
                port = $location.port();
            }

            $log.info('Websocket port is ' + port);

            var url = $location.protocol() + '://' + $location.host() + ':' + port + '/messages';
            client = new Faye.Client(url);

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
            if (client) {
                client.disconnect();
            }
        }

    };
}]);

appServices.service('BrowserNotification', ['$window', '$rootScope', function ($window, $rootScope) {
    'use strict';

    var self = {};


    self.send = function (message, ignoreFocus) {
        var messageBody;

        if ($window.document.hasFocus() && ignoreFocus !== true) {
            return;
        }

        // Truncating the message body avoids unwanted whitespace in Chrome
        messageBody = message.body || '';

        if (messageBody.length > 75) {
            messageBody = messageBody.substring(0, 75) + '…';
        }

        return new Notification(message.title, {
            'body': messageBody,
            'tag' : message.publicId,
            'icon': '/favicon/favicon-48.png'
        });

    };

    if (!$window.Notification) {
        self.state = 'unavailable';
    } else if ($window.Notification.permission === 'granted') {
        self.state = 'active';
    } else {
        self.state = 'inactive';
    }

    self.enable = function () {
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
                $rootScope.$broadcast('settings:browserNotifications', self.state);
                $rootScope.$apply();
            }
        });
    };

    return self;
}]);

appServices.factory('Queue', ['$rootScope', '$http', '$log', '$window', 'User', 'BrowserNotification', function ($rootScope, $http, $log, $window, User, BrowserNotification) {
    'use strict';

    var unfilled = true;

    return {
        messages: [],

        visitLink: function () {
            var focusedIndex;
            this.messages.some(function (message, index) {
                if (message.focused) {
                    focusedIndex = index;
                }
            });

            if (focusedIndex !== undefined && this.messages[focusedIndex].url) {
                $window.open(this.messages[focusedIndex].url, '_blank');
            }
        },

        focusNone: function () {
            this.messages = this.messages.map(function (message) {
                message.focused = false;
                return message;
            });
        },

        focusFirst: function () {
            this.focusNone();
            this.messages[0].focused = true;
        },

        focusOne: function (step) {
            var focusedIndex;

            if (this.messages.length < 1) {
                return;
            }

            this.messages.some(function (message, index) {
                if (message.focused) {
                    focusedIndex = index + step;
                }
            });

            if (!this.messages[focusedIndex]) {
                if (step < 0) {
                    focusedIndex = this.messages.length - 1;
                } else {
                    focusedIndex = 0;
                }
            }

            this.focusNone();
            this.messages[focusedIndex].focused = true;
            $rootScope.$apply();
        },

        focusNext: function () {
            this.focusOne(1);
        },

        focusPrevious: function () {
            this.focusOne(-1);
        },

        clearFocused: function () {
            var focusedIndex = -1;
            this.messages.some(function (message, index) {
                if (message.focused) {
                    focusedIndex = index;
                }
            });

            if (focusedIndex === -1) {
                return;
            }

            this.clear(this.messages[focusedIndex].publicId);
            this.focusNext();
        },

        clear: function (ids) {
            if (!(ids instanceof Array)) {
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
            if (!(ids instanceof Array)) {
                ids = [ids];
            }

            self.messages = self.messages.filter(function (message) {
                if (ids.indexOf(message.publicId) === -1) {
                    return true;
                }

                if (message.browserNotification) {
                    message.browserNotification.close();
                }
                return false;
            });

            $rootScope.$broadcast('queue:change', self.messages.length);
        },

        empty: function () {
            this.messages = [];
            $rootScope.$broadcast('queue:change', this.messages.length);
        },

        filledOn: undefined,
        
        fill: function () {
            var now, self, url;
            now = new Date().getTime();

            // prevent aggressive refilling
            if (this.filledOn && now - this.filledOn < 1000) {
                $log.debug('Ignoring too-soon refill request');
            }
            this.filledOn = now;
            
            self = this;
            url = '/archive/25';

            $http({
                method: 'GET',
                url: url,
                headers: {
                    'Authorization': User.getAuthHeader()
                }
            }).success(function(data) {
                var currentIds, staleIds, attitude;
                staleIds = [];
                if (data instanceof Array) {

                    // We've just received the current list of
                    // uncleared messages, but we might be holding
                    // other messages that were cleared by another
                    // client while we were offline. They should be
                    // dropped.
                    currentIds = data.map(function (message) {
                        return message.publicId;
                    });

                    self.messages.forEach(function (message) {
                        if (currentIds.indexOf(message.publicId) === -1) {
                            staleIds.push(message.publicId);
                        }
                    });

                    if (staleIds.length > 0) {
                        self.drop(staleIds);
                    }

                    if (data.length === 0) {
                        // This gets the app message to change from "Connecting" to
                        // "No new messages"
                        $rootScope.$broadcast('queue:change', self.messages.length);
                        return;
                    }

                    // messages will be ordered newest first, but if they are added to the queue
                    // sequentially they will end up oldest first
                    data.reverse();

                    if (unfilled) {
                        attitude = 'silent';
                    } else {
                        attitude = 'normal';
                    }

                    data.forEach(function (message) {
                        self.add(message, attitude);
                    });

                    unfilled = false;                    
                }
            });
        },

        add: function (message, attitude) {
            var exists, age;

            // don't add a message that has already been added
            exists = this.messages.some(function(m) {
                return m.publicId === message.publicId;
            });

            if (exists === true) {
                return;
            }

            message.received = new Date(message.received || new Date());

            if (message.body) {
                message.body = message.body.replace(/\n/g, '<br/>');
            }

            if (message.group) {
                message.badge = message.group.split('.').pop();
            }

            if (message.group === 'phone' && message.body) {
                // Format US phone numbers, dropping optional country code
                message.body = message.body.replace(/(\+?1?)(\d\d\d)(\d\d\d)(\d\d\d\d)/g, '($2) $3-$4');
            }

            this.messages.unshift(message);

            $rootScope.$broadcast('queue:change', this.messages.length);


            age = (new Date() - new Date(message.received)) / 1000;

            if (attitude !== 'silent' && age < 120) {
                message.browserNotification = BrowserNotification.send(message);
            }
        },
    };
}]);
