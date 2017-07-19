var appServices = angular.module('appServices', []);

appServices.factory('User', ['$window', '$http', function ($window, $http) {
    'use strict';

    return {

        getAuthHeader: function () {
            var tokenKey, tokenValue;
            tokenKey = this.getTokenKey();
            tokenValue = this.getTokenValue();
            return 'Basic ' + $window.btoa(tokenKey + ':' + tokenValue);
        },
        getTokenKey: function () {
            var value = sessionStorage.getItem('tokenKey');

            if (!value) {
                value = localStorage.getItem('tokenKey');
            }

            return value || false;
        },

        getTokenValue: function () {
            var value = sessionStorage.getItem('tokenValue');

            if (!value) {
                value = localStorage.getItem('tokenValue');
            }

            return value || false;
        },

        getChannel: function () {
            var value = sessionStorage.getItem('channel');

            if (!value) {
                value = localStorage.getItem('channel');
            }

            if (value) {
                // This is not a URL. It must be an absolute path.
                return '/messages/' + value;
            } else {
                return false;
            }
        },

        replaceChannel: function (value) {
            if (sessionStorage.getItem('channel')) {
                sessionStorage.setItem('channel', value);
            } else if (localStorage.getItem('channel')) {
                localStorage.setItem('channel', value);
            }
        },

        getServices: function (callback) {
            var auth = this.getAuthHeader();
            $http({
                method: 'GET',
                url: 'services',
                headers: {'Authorization': auth}
            }).then(function (res) {
                callback(res.data);
            }).catch(function () {
                callback([]);
            });
        },

        setService: function (service, callback) {
            var auth = this.getAuthHeader();
            $http({
                method: 'POST',
                url: 'services',
                headers: {'Authorization': auth},
                data: service
            }).then(function (res) {
                callback(true);
            }).catch(function () {
                callback(false);
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
                url: 'authorize/' + service + '/start',
                headers: {
                    'Authorization': auth
                }
            }).then(function (res) {
                callback(res.data.url);
            });
        },

        deauthorize: function (service, callback) {
            var auth = this.getAuthHeader();
            $http({
                method: 'POST',
                data: {
                    'service': service
                },
                url: 'revoke',
                headers: {
                    'Authorization': auth
                }
            }).then(function () {
                callback();
            });
        },

        logIn: function (form) {
            return $http({
                method: 'POST',
                url: 'auth',
                data: {
                    'username': form.username,
                    'password': form.password
                },
                transformResponse: function (res) {
                    var data;
                    try {
                        data = JSON.parse(res);
                    } catch (e) {
                        data = {};
                    }

                    if (data.hasOwnProperty('value')) {
                        if (form.remember) {
                            localStorage.setItem('tokenKey', data.key);
                            localStorage.setItem('tokenValue', data.value);
                            localStorage.setItem('channel', data.channel);
                            sessionStorage.removeItem('tokenKey');
                            sessionStorage.removeItem('tokenValue');
                            sessionStorage.removeItem('channel');
                        } else {
                            sessionStorage.setItem('tokenKey', data.key);
                            sessionStorage.setItem('tokenValue', data.value);
                            sessionStorage.setItem('channel', data.channel);
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
                url: 'deauth',
                headers: {
                    'Authorization': auth
                }
            });
        }
    };
}]);

appServices.factory('Faye', ['$location', '$rootScope', '$log', '$filter', 'User', 'MessageList', function ($location, $rootScope, $log, $filter, User, MessageList) {
    'use strict';
    var worker = new Worker('worker.min.js');

    return {

        init: function (port) {
            port = parseInt(port, 10) || 0;

            if (port === 0) {
                port = $location.port();
            }

            $log.info('Websocket port is ' + port);

            worker.onmessage = function (e) {
                var reply = e.data;

                if (reply.event === 'disconnected') {
                    var now = $filter('date')(new Date(), 'mediumTime');
                    $log.warn('Faye transport down at ' + now);
                    $rootScope.$broadcast('connection:change', 'disconnected');
                }

                if (reply.event === 'connected') {
                    var now = $filter('date')(new Date(), 'mediumTime');
                    $log.info('Faye transport up at ' + now);
                    $rootScope.$broadcast('connection:change', 'connected');
                }

                if (reply.event === 'resubscribe') {
                    $rootScope.$broadcast('connection:resubscribe', reply.channel);
                }

                if (reply.event === 'drop') {
                    MessageList.drop(reply.retractions);
                }

                if (reply.event === 'add') {
                    MessageList.add(reply.message);
                }

                $rootScope.$apply();
            };

            worker.postMessage({'action': 'init', 'token': User.getTokenValue()});
        },

        subscribe: function () {
            var channel = User.getChannel();
            worker.postMessage({'action': 'subscribe', 'channel': channel});
        },

        unsubscribe: function (channel) {
            worker.postMessage({'action': 'unsubscribe', 'channel': channel});
        },

        disconnect: function () {
            worker.postMessage({'action': 'disconnect'});
        }
    };

}]);

appServices.service('WebhookNotification', ['$window', '$rootScope', 'User', function ($window, $rootScope, User) {
    'use strict';

    var self = {
        url: null
    };

    self.enable = function () {
        var promptMessage = 'Url:';
        var url = $window.prompt(promptMessage, self.url || '');

        if (url === null) {
            return;
        }

        url = url.trim();

        if (url.length > 0 && url.indexOf('http') !== 0) {
            alert('Invalid URL. Please try again.');
            return;
        }

        self.url = url;

        User.setService({
            'webhook': self.url
        }, function (result) {
            self.state = (url && result === true) ? 'active' : 'inactive';
            $rootScope.$broadcast('settings:webhookNotifications', self.state);
        });

    };

    return self;
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
            'icon': 'favicon/favicon.png'
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

appServices.factory('MessageList', ['$rootScope', '$http', '$log', '$window', '$location', '$interval', 'User', 'BrowserNotification', function ($rootScope, $http, $log, $window, $location, $interval, User, BrowserNotification) {
    'use strict';

    var messages, methods, refreshTimer, removedIds;

    messages = [];
    removedIds = [];

    refreshTimer = $interval(function () {
        var now, today;
        now = new Date();
        today = new Date();
        today.setHours(0,0,0,0);

        messages.forEach(function (message) {
            var expires, receivedDay;
            receivedDay = message.received;
            receivedDay.setHours(0,0,0,0);
            message.days_ago = Math.floor((today - receivedDay) / 86400000);

            if (message.expired) {
                methods.clear(message.publicId);
            } else if (message.expiresAt) {
                expires = new Date(message.expiresAt);
                message.expired = (expires < now);
            }

        });
    }, 1000 * 60);

    methods = {
        messages: messages,
        removedIds: removedIds,

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
            var self = this;
            if (!(ids instanceof Array)) {
                ids = [ids];
            }

            function success () {
                self.removedIds.push(ids);
                $rootScope.$broadcast('queue:change', self.messages.length);
            }

            function failure () {
                $rootScope.$broadcast('connection:change', 'error', 'The message could not be cleared.');
                self.messages.forEach(function (message) {
                    if (ids.indexOf(message.publicId) > -1) {
                        message.state = 'stuck';
                    }
                });
            }

            this.messages.forEach(function (message) {
                if (ids.indexOf(message.publicId) > -1) {
                    message.state = 'clearing';
                }
            });

            $http({
                method: 'POST',
                url: 'message/clear',
                headers: {
                    'Authorization': User.getAuthHeader()
                },
                data: {
                    publicId: ids
                }
            }).then(success, failure);
        },

        canUnclear: function () {
            return removedIds.length > 0;
        },

        unclear: function () {
            var ids, self;
            self = this;
            ids = removedIds.pop();

            $http({
                method: 'POST',
                url: 'message/unclear',
                headers: {
                    'Authorization': User.getAuthHeader()
                },
                data: {
                    publicId: ids
                }
            }).then(function () {
                self.fetch();
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

        fetch: function () {
            var now, self, url;
            now = new Date();

            // prevent aggressive refetching
            if (this.lastFetched && now.getTime() - this.lastFetched.getTime() < 1000) {
                $log.debug('Ignoring too-soon refetch request');
                return;
            }

            self = this;
            url = 'archive/25';

            $http({
                method: 'GET',
                url: url,
                headers: {
                    'Authorization': User.getAuthHeader()
                }
            }).then(function(res) {
                var attitude, currentIds, staleIds;
                staleIds = [];
                if (res.data.messages instanceof Array) {

                    // We've just received the current list of
                    // uncleared messages, but we might be holding
                    // other messages that were cleared by another
                    // client while we were offline. They should be
                    // dropped.
                    currentIds = res.data.messages.map(function (message) {
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

                    // messages will be ordered newest first, but if they are added to the queue
                    // sequentially they will end up oldest first
                    res.data.messages.reverse();

                    if (!self.lastFetched) {
                        attitude = 'silent';
                    } else {
                        attitude = 'normal';
                    }

                    res.data.messages.forEach(function (message) {
                        self.add(message, attitude);
                    });

                    $rootScope.$broadcast('queue:change', self.messages.length);

                    self.lastFetched = now;

                }
            }).catch(function (data) {
                self.lastFetched = now;
                if (data.status === 401) {
                    $location.path('login');
                }
            });
        },

        add: function (message, attitude) {
            var age, messageExists, messageHasChanged, result, self, tmp, update;

            self = this;
            messageExists = false;
            messageHasChanged = false;

            message.received = new Date(message.received || new Date());
            message.days_ago = (new Date().setHours(0,0,0,0) - new Date(message.received).setHours(0,0,0,0)) / 86400000;

            message.expire_days = null;
            if (message.expiresAt) {
                message.expire_days = (new Date(message.expiresAt).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000;
            }

            if (typeof message.expiresAt === 'string') {
                message.expiresAt = new Date(message.expiresAt);
                message.expired = (message.expiresAt < new Date());
            }

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

            if (message.url) {
                tmp = angular.element('<a></a>');
                tmp.attr('href', message.url);
                message.domain = tmp[0].hostname;
            } else {
                message.domain = null;
            }

            // Update an existing message
            update = self.messages.some(function(m) {
                if (m.publicId === message.publicId) {
                    messageExists = true;
                    ['title', 'body', 'badge', 'domain'].forEach(function (property) {
                        if (message[property] !== m[property]) {
                            m[property] = message[property];
                            messageHasChanged = true;
                        }
                    });
                }
                return messageExists && messageHasChanged;
            });

            if (messageHasChanged) {
                $rootScope.$apply();
            }

            if (messageExists) {
                return;
            }

            result = this.messages.some(function (m, index) {
                if (m.received < message.received) {
                    self.messages.splice(index, 0, message);
                    return true;
                }
            });

            if (result === false) {
                this.messages.push(message);
            }

            $rootScope.$broadcast('queue:change', this.messages.length);

            age = (new Date() - new Date(message.received)) / 1000;

            if (attitude !== 'silent' && age < 120) {
                message.browserNotification = BrowserNotification.send(message);
            }
        }
    };
    return methods;

}]);
