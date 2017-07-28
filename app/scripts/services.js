"use strict";
var appServices = angular.module('appServices', []);
appServices.factory('User', ['$window', '$http', function ($window, $http) {
        function getTokenKey() {
            var value = $window.sessionStorage.getItem('tokenKey');
            if (!value) {
                value = $window.localStorage.getItem('tokenKey');
            }
            return value || false;
        }
        function getTokenValue() {
            var value = $window.sessionStorage.getItem('tokenValue');
            if (!value) {
                value = $window.localStorage.getItem('tokenValue');
            }
            return value || false;
        }
        function getChannel() {
            var value = $window.sessionStorage.getItem('channel');
            if (!value) {
                value = $window.localStorage.getItem('channel');
            }
            if (value) {
                // This is not a URL. It must be an absolute path.
                return '/messages/' + value;
            }
            return false;
        }
        function getAuthHeader() {
            return 'Basic ' + $window.btoa(getTokenKey() + ":" + getTokenValue());
        }
        return {
            getAuthHeader: getAuthHeader,
            getChannel: getChannel,
            getTokenKey: getTokenKey,
            getTokenValue: getTokenValue,
            replaceChannel: function (value) {
                if ($window.sessionStorage.getItem('channel')) {
                    $window.sessionStorage.setItem('channel', value);
                }
                else if ($window.localStorage.getItem('channel')) {
                    $window.localStorage.setItem('channel', value);
                }
            },
            getServices: function (callback) {
                var auth = getAuthHeader();
                $http({
                    headers: { Authorization: auth },
                    method: 'GET',
                    url: 'services',
                }).then(function (res) {
                    callback(res.data);
                }).catch(function () {
                    callback([]);
                });
            },
            setService: function (service, callback) {
                var auth = getAuthHeader();
                $http({
                    data: service,
                    headers: { Authorization: auth },
                    method: 'POST',
                    url: 'services',
                }).then(function (res) {
                    callback(true);
                }).catch(function () {
                    callback(false);
                });
            },
            authorize: function (service, callback) {
                var auth = getAuthHeader();
                $http({
                    headers: { Authorization: auth },
                    method: 'GET',
                    params: {
                        host: $window.location.host,
                        protocol: $window.location.protocol,
                    },
                    url: 'authorize/' + service + '/start',
                }).then(function (res) {
                    callback(res.data.url);
                });
            },
            deauthorize: function (service, callback) {
                var auth = getAuthHeader();
                $http({
                    data: { service: service },
                    headers: { Authorization: auth },
                    method: 'POST',
                    url: 'revoke',
                }).then(function () {
                    callback();
                });
            },
            logIn: function (form) {
                return $http({
                    data: {
                        password: form.password,
                        username: form.username,
                    },
                    method: 'POST',
                    transformResponse: function (res) {
                        var data;
                        try {
                            data = JSON.parse(res);
                        }
                        catch (e) {
                            data = {};
                        }
                        if (data.hasOwnProperty('value')) {
                            if (form.remember) {
                                $window.localStorage.setItem('tokenKey', data.key);
                                $window.localStorage.setItem('tokenValue', data.value);
                                $window.localStorage.setItem('channel', data.channel);
                                $window.sessionStorage.removeItem('tokenKey');
                                $window.sessionStorage.removeItem('tokenValue');
                                $window.sessionStorage.removeItem('channel');
                            }
                            else {
                                $window.sessionStorage.setItem('tokenKey', data.key);
                                $window.sessionStorage.setItem('tokenValue', data.value);
                                $window.sessionStorage.setItem('channel', data.channel);
                                $window.localStorage.removeItem('tokenKey');
                                $window.localStorage.removeItem('tokenValue');
                                $window.localStorage.removeItem('channel');
                            }
                        }
                    },
                    url: 'auth',
                });
            },
            logOut: function () {
                var auth = getAuthHeader();
                $window.localStorage.removeItem('tokenKey');
                $window.localStorage.removeItem('tokenValue');
                $window.localStorage.removeItem('channel');
                $window.sessionStorage.removeItem('tokenKey');
                $window.sessionStorage.removeItem('tokenValue');
                $window.sessionStorage.removeItem('channel');
                $http({
                    headers: { Authorization: auth },
                    method: 'POST',
                    url: 'deauth',
                });
            },
        };
    }]);
appServices.factory('Faye', ['$location', '$rootScope', '$log', '$filter', 'User', 'MessageList', function ($location, $rootScope, $log, $filter, User, MessageList) {
        var worker = new Worker('worker.min.js');
        return {
            init: function (port) {
                port = parseInt(port, 10) || 0;
                if (port === 0) {
                    port = $location.port();
                }
                $log.info('Websocket port is ' + port);
                worker.onmessage = function (e) {
                    var now;
                    var reply = e.data;
                    if (reply.event === 'disconnected') {
                        now = $filter('date')(new Date(), 'mediumTime');
                        $log.warn('Faye transport down at ' + now);
                        $rootScope.$broadcast('connection:change', 'disconnected');
                    }
                    if (reply.event === 'connected') {
                        now = $filter('date')(new Date(), 'mediumTime');
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
                worker.postMessage({ action: 'init', token: User.getTokenValue() });
            },
            subscribe: function () {
                var channel = User.getChannel();
                worker.postMessage({ action: 'subscribe', channel: channel });
            },
            unsubscribe: function (channel) {
                worker.postMessage({ action: 'unsubscribe', channel: channel });
            },
            disconnect: function () {
                worker.postMessage({ action: 'disconnect' });
            },
        };
    },
]);
appServices.service('WebhookNotification', ['$window', '$rootScope', 'User', function ($window, $rootScope, User) {
        var url;
        var state;
        function enable() {
            url = $window.prompt('Url:', url || '');
            if (url === null) {
                return;
            }
            url = url.trim();
            if (url.length > 0 && url.indexOf('http') !== 0) {
                $window.alert('Invalid URL. Please try again.');
                return;
            }
            User.setService({
                webhook: url,
            }, function (result) {
                state = (url && result === true) ? 'active' : 'inactive';
                $rootScope.$broadcast('settings:webhookNotifications', state);
            });
        }
        return { url: url, enable: enable };
    }]);
appServices.service('BrowserNotification', ['$window', '$rootScope', function ($window, $rootScope) {
        var state;
        function send(message, ignoreFocus) {
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
                body: messageBody,
                icon: 'favicon/favicon.png',
                tag: message.publicId,
            });
        }
        function enable() {
            if (state === 'active') {
                $window.alert("Notifications are active.\nThey can be turned off from the browser's Notification settings");
                return;
            }
            $window.Notification.requestPermission(function (permission) {
                if (permission === 'denied') {
                    $window.alert("Notifications are inactive, but they can be turned on\nvia the browser's Notifications settings");
                    return;
                }
                if (permission === 'granted') {
                    send({
                        group: 'internal',
                        title: 'Browser notifications enabled',
                    }, true);
                    state = 'active';
                    $rootScope.$broadcast('settings:browserNotifications', state);
                    $rootScope.$apply();
                }
            });
        }
        if (!$window.Notification) {
            state = 'unavailable';
        }
        else if ($window.Notification.permission === 'granted') {
            state = 'active';
        }
        else {
            state = 'inactive';
        }
        return { state: state, enable: enable, send: send };
    }]);
appServices.factory('MessageList', ['$rootScope', '$http', '$log', '$window', '$location', '$interval', 'User', 'BrowserNotification', function ($rootScope, $http, $log, $window, $location, $interval, User, BrowserNotification) {
        var messages = [];
        var methods = [];
        var removedIds = [];
        var lastFetched;
        var refreshTimer = $interval(function () {
            var now = new Date();
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            messages.forEach(function (message) {
                var receivedDay = message.received;
                receivedDay.setHours(0, 0, 0, 0);
                message.days_ago = Math.floor((today.getTime() - receivedDay.getTime()) / 86400000);
                if (message.expired) {
                    clear(message.publicId);
                }
                else if (message.expiresAt) {
                    message.expired = new Date(message.expiresAt) < now;
                }
            });
        }, 1000 * 60);
        function focusOne(step) {
            var focusedIndex;
            if (messages.length < 1) {
                return;
            }
            messages.forEach(function (message, index) {
                if (message.focused) {
                    focusedIndex = index + step;
                }
            });
            if (!messages[focusedIndex]) {
                if (step < 0) {
                    focusedIndex = messages.length - 1;
                }
                else {
                    focusedIndex = 0;
                }
            }
            focusNone();
            messages[focusedIndex].focused = true;
            $rootScope.$apply();
        }
        function clearFocused() {
            messages.forEach(function (message, index) {
                if (message.focused) {
                    clear(message.publicId);
                    focusNext();
                }
            });
        }
        function focusNone() {
            messages = messages.map(function (message) {
                message.focused = false;
                return message;
            });
        }
        function focusFirst() {
            focusNone();
            messages[0].focused = true;
        }
        function visitLink() {
            messages.forEach(function (message, index) {
                if (message.focused && message.url) {
                    $window.open(message.url, '_blank');
                }
            });
        }
        function clear(ids) {
            if (!(ids instanceof Array)) {
                ids = [ids];
            }
            function success() {
                removedIds.push(ids);
                $rootScope.$broadcast('queue:change', messages.length);
            }
            function failure() {
                $rootScope.$broadcast('connection:change', 'error', 'The message could not be cleared.');
                messages.forEach(function (message) {
                    if (ids.indexOf(message.publicId) > -1) {
                        message.state = 'stuck';
                    }
                });
            }
            messages.forEach(function (message) {
                if (ids.indexOf(message.publicId) > -1) {
                    message.state = 'clearing';
                }
            });
            $http({
                data: { publicId: ids },
                headers: { Authorization: User.getAuthHeader() },
                method: 'POST',
                url: 'message/clear',
            }).then(success, failure);
        }
        function add(message, attitude) {
            var age;
            var messageExists = false;
            var messageHasChanged = false;
            var result;
            var tmp;
            var update;
            message.received = new Date(message.received || new Date());
            message.days_ago = (new Date().setHours(0, 0, 0, 0) - new Date(message.received).setHours(0, 0, 0, 0)) / 86400000;
            message.expire_days = null;
            if (message.expiresAt) {
                message.expire_days = (new Date(message.expiresAt).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000;
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
            }
            else {
                message.domain = null;
            }
            // Update an existing message
            update = messages.some(function (m) {
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
            result = messages.some(function (m, index) {
                if (m.received < message.received) {
                    messages.splice(index, 0, message);
                    return true;
                }
            });
            if (result === false) {
                messages.push(message);
            }
            $rootScope.$broadcast('queue:change', messages.length);
            age = ((new Date()).getTime() - message.received.getTime()) / 1000;
            if (attitude !== 'silent' && age < 120) {
                message.browserNotification = BrowserNotification.send(message);
            }
        }
        function focusNext() {
            focusOne(1);
        }
        function focusPrevious() {
            focusOne(-1);
        }
        function drop(ids) {
            if (!(ids instanceof Array)) {
                ids = [ids];
            }
            messages = messages.filter(function (message) {
                if (ids.indexOf(message.publicId) === -1) {
                    return true;
                }
                if (message.browserNotification) {
                    message.browserNotification.close();
                }
                return false;
            });
            $rootScope.$broadcast('queue:change', messages.length);
        }
        function fetch() {
            var url = 'archive/25';
            var now = new Date();
            // prevent aggressive refetching
            if (lastFetched && now.getTime() - lastFetched.getTime() < 1000) {
                $log.debug('Ignoring too-soon refetch request');
                return;
            }
            $http({
                headers: { Authorization: User.getAuthHeader() },
                method: 'GET',
                url: url,
            }).then(function (res) {
                var attitude;
                var currentIds;
                var staleIds = [];
                if (res.data.messages instanceof Array) {
                    // We've just received the current list of
                    // uncleared messages, but we might be holding
                    // other messages that were cleared by another
                    // client while we were offline. They should be
                    // dropped.
                    currentIds = res.data.messages.map(function (message) {
                        return message.publicId;
                    });
                    messages.forEach(function (message) {
                        if (currentIds.indexOf(message.publicId) === -1) {
                            staleIds.push(message.publicId);
                        }
                    });
                    if (staleIds.length > 0) {
                        drop(staleIds);
                    }
                    // messages will be ordered newest first, but if they are added to the queue
                    // sequentially they will end up oldest first
                    res.data.messages.reverse();
                    if (!lastFetched) {
                        attitude = 'silent';
                    }
                    else {
                        attitude = 'normal';
                    }
                    res.data.messages.forEach(function (message) {
                        add(message, attitude);
                    });
                    $rootScope.$broadcast('queue:change', messages.length);
                    lastFetched = now;
                }
            }).catch(function (data) {
                lastFetched = now;
                if (data.status === 401) {
                    $location.path('login');
                }
            });
        }
        return {
            add: add,
            canUnclear: function () {
                return removedIds.length > 0;
            },
            clear: clear,
            clearFocused: clearFocused,
            drop: drop,
            fetch: fetch,
            focusFirst: focusFirst,
            focusNext: focusNext,
            focusNone: focusNone,
            focusOne: focusOne,
            focusPrevious: focusPrevious,
            messages: messages,
            visitLink: visitLink,
            unclear: function () {
                $http({
                    data: { publicId: removedIds.pop() },
                    headers: { Authorization: User.getAuthHeader() },
                    method: 'POST',
                    url: 'message/unclear',
                }).then(function () {
                    fetch();
                });
            },
            purge: function () {
                var ids = messages.map(function (message) {
                    return message.publicId;
                });
                clear(ids);
            },
            empty: function () {
                messages = [];
                $rootScope.$broadcast('queue:change', messages.length);
            },
        };
    }]);
