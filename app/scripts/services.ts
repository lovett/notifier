const appServices = angular.module('appServices', []);

appServices.factory('User', ['$window', '$http', ($window, $http) => {

    function getTokenKey() {
        let value = $window.sessionStorage.getItem('tokenKey');

        if (!value) {
            value = $window.localStorage.getItem('tokenKey');
        }

        return value || false;
    }

    function getTokenValue() {
        let value = $window.sessionStorage.getItem('tokenValue');

        if (!value) {
            value = $window.localStorage.getItem('tokenValue');
        }

        return value || false;
    }

    function getChannel() {
        let value = $window.sessionStorage.getItem('channel');

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
        return 'Basic ' + $window.btoa(`${getTokenKey()}:${getTokenValue()}`);
    }

    return {
        getAuthHeader,

        getChannel,

        getTokenKey,

        getTokenValue,

        replaceChannel(value) {
            if ($window.sessionStorage.getItem('channel')) {
                $window.sessionStorage.setItem('channel', value);
            } else if ($window.localStorage.getItem('channel')) {
                $window.localStorage.setItem('channel', value);
            }
        },

        getServices(callback) {
            const auth = getAuthHeader();
            $http({
                headers: {Authorization: auth},
                method: 'GET',
                url: 'services',
            }).then((res) => {
                callback(res.data);
            }).catch(() => {
                callback([]);
            });
        },

        setService(service, callback) {
            const auth = getAuthHeader();
            $http({
                data: service,
                headers: {Authorization: auth},
                method: 'POST',
                url: 'services',
            }).then((res) => {
                callback(true);
            }).catch(() => {
                callback(false);
            });
        },

        authorize(service, callback) {
            const auth = getAuthHeader();

            $http({
                headers: {Authorization: auth},
                method: 'GET',
                params: {
                    host: $window.location.host,
                    protocol: $window.location.protocol,
                },
                url: 'authorize/' + service + '/start',
            }).then((res) => {
                callback(res.data.url);
            });
        },

        deauthorize(service, callback) {
            const auth = getAuthHeader();
            $http({
                data: {service},
                headers: {Authorization: auth},
                method: 'POST',
                url: 'revoke',
            }).then(() => {
                callback();
            });
        },

        logIn(form) {
            return $http({
                data: {
                    password: form.password,
                    username: form.username,
                },
                method: 'POST',
                transformResponse(res) {
                    let data;
                    try {
                        data = JSON.parse(res);
                    } catch (e) {
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
                        } else {
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

        logOut() {
            const auth = getAuthHeader();
            $window.localStorage.removeItem('tokenKey');
            $window.localStorage.removeItem('tokenValue');
            $window.localStorage.removeItem('channel');
            $window.sessionStorage.removeItem('tokenKey');
            $window.sessionStorage.removeItem('tokenValue');
            $window.sessionStorage.removeItem('channel');

            $http({
                headers: {Authorization: auth},
                method: 'POST',
                url: 'deauth',
            });
        },
    };
}]);

appServices.factory('Faye', ['$location', '$rootScope', '$log', '$filter', 'User', 'MessageList', ($location, $rootScope, $log, $filter, User, MessageList) => {

    const worker = new Worker('worker.min.js');

    return {

        init(port) {
            port = parseInt(port, 10) || 0;

            if (port === 0) {
                port = $location.port();
            }

            $log.info('Websocket port is ' + port);

            worker.onmessage = (e) => {
                let now;
                const reply = e.data;

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

            worker.postMessage({action: 'init', token: User.getTokenValue()});
        },

        subscribe() {
            const channel = User.getChannel();
            worker.postMessage({action: 'subscribe', channel});
        },

        unsubscribe(channel) {
            worker.postMessage({action: 'unsubscribe', channel});
        },

        disconnect() {
            worker.postMessage({action: 'disconnect'});
        },
    };
},
                            ],
                   );

appServices.service('WebhookNotification', ['$window', '$rootScope', 'User', ($window, $rootScope, User) => {
    let url: string;
    let state;

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
        }, (result) => {
            state = (url && result === true) ? 'active' : 'inactive';
            $rootScope.$broadcast('settings:webhookNotifications', state);
        });
    }

    return {url, enable};
}]);

appServices.service('BrowserNotification', ['$window', '$rootScope', ($window, $rootScope) => {
    let state;

    function send(message, ignoreFocus) {
        let messageBody;

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
            $window.alert(`Notifications are active.
They can be turned off from the browser's Notification settings`);
            return;
        }

        $window.Notification.requestPermission((permission) => {
            if (permission === 'denied') {
                $window.alert(`Notifications are inactive, but they can be turned on
via the browser's Notifications settings`);
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
    } else if ($window.Notification.permission === 'granted') {
        state = 'active';
    } else {
        state = 'inactive';
    }

    return {state, enable, send};
}]);

appServices.factory('MessageList', ['$rootScope', '$http', '$log', '$window', '$location', '$interval', 'User', 'BrowserNotification', ($rootScope, $http, $log, $window, $location, $interval, User, BrowserNotification) => {

    let messages = [];
    const methods = [];
    const removedIds = [];
    let lastFetched: Date;

    const refreshTimer = $interval(() => {
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        messages.forEach((message) => {
            const receivedDay = message.received;
            receivedDay.setHours(0, 0, 0, 0);
            message.days_ago = Math.floor((today.getTime() - receivedDay.getTime()) / 86400000);

            if (message.expired) {
                clear(message.publicId);
            } else if (message.expiresAt) {
                message.expired = new Date(message.expiresAt) < now;
            }

        });
    }, 1000 * 60);

    function focusOne(step) {
        let focusedIndex: number;

        if (messages.length < 1) {
            return;
        }

        messages.forEach((message, index) => {
            if (message.focused) {
                focusedIndex = index + step;
            }
        });

        if (!messages[focusedIndex]) {
            if (step < 0) {
                focusedIndex = messages.length - 1;
            } else {
                focusedIndex = 0;
            }
        }

        focusNone();
        messages[focusedIndex].focused = true;
        $rootScope.$apply();
    }

    function clearFocused() {
        messages.forEach((message, index) => {
            if (message.focused) {
                clear(message.publicId);
                focusNext();
            }
        });
    }

    function focusNone() {
        messages = messages.map((message) => {
            message.focused = false;
            return message;
        });
    }

    function focusFirst() {
        focusNone();
        messages[0].focused = true;
    }

    function visitLink() {
        messages.forEach((message, index) => {
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
            messages.forEach((message) => {
                if (ids.indexOf(message.publicId) > -1) {
                    message.state = 'stuck';
                }
            });
        }

        messages.forEach((message) => {
            if (ids.indexOf(message.publicId) > -1) {
                message.state = 'clearing';
            }
        });

        $http({
            data: { publicId: ids },
            headers: {Authorization: User.getAuthHeader()},
            method: 'POST',
            url: 'message/clear',
        }).then(success, failure);
    }

    function add(message, attitude) {
        let age: number;
        let messageExists = false;
        let messageHasChanged = false;
        let result;
        let tmp;
        let update;

        message.received = new Date(message.received || new Date());

        message.days_ago = (
            new Date().setHours(0, 0, 0, 0) - new Date(message.received).setHours(0, 0, 0, 0)
        ) / 86400000;

        message.expire_days = null;

        if (message.expiresAt) {
            message.expire_days = (
                new Date(message.expiresAt).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)
            ) / 86400000;
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
        update = messages.some((m) => {
            if (m.publicId === message.publicId) {
                messageExists = true;
                ['title', 'body', 'badge', 'domain'].forEach((property) => {
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

        result = messages.some((m, index) => {
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

        messages = messages.filter((message) => {
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
        const url = 'archive/25';
        const now = new Date();

        // prevent aggressive refetching
        if (lastFetched && now.getTime() - lastFetched.getTime() < 1000) {
            $log.debug('Ignoring too-soon refetch request');
            return;
        }

        $http({
            headers: {Authorization: User.getAuthHeader()},
            method: 'GET',
            url,
        }).then((res) => {
            let attitude;
            let currentIds;
            const staleIds = [];

            if (res.data.messages instanceof Array) {

                // We've just received the current list of
                // uncleared messages, but we might be holding
                // other messages that were cleared by another
                // client while we were offline. They should be
                // dropped.
                currentIds = res.data.messages.map((message) => {
                    return message.publicId;
                });

                messages.forEach((message) => {
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
                } else {
                    attitude = 'normal';
                }

                res.data.messages.forEach((message) => {
                    add(message, attitude);
                });

                $rootScope.$broadcast('queue:change', messages.length);

                lastFetched = now;
            }
        }).catch((data) => {
            lastFetched = now;
            if (data.status === 401) {
                $location.path('login');
            }
        });
    }

    return {
        add,
        canUnclear() {
            return removedIds.length > 0;
        },

        clear,

        clearFocused,

        drop,

        fetch,

        focusFirst,

        focusNext,

        focusNone,

        focusOne,

        focusPrevious,

        messages,

        visitLink,

        unclear() {
            $http({
                data: {publicId: removedIds.pop()},
                headers: {Authorization: User.getAuthHeader()},
                method: 'POST',
                url: 'message/unclear',
            }).then(() => {
                fetch();
            });
        },

        purge() {
            const ids = messages.map((message) => {
                return message.publicId;
            });

            clear(ids);
        },

        empty() {
            messages = [];
            $rootScope.$broadcast('queue:change', messages.length);
        },

    };
}]);
