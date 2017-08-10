import * as types from './types';

declare var angular;

const appServices = angular.module('appServices', []);

appServices.factory('User', ['$window', '$http', '$cookies', ($window, $http, $cookies) => {
    const loginCookieName = 'token';

    function isLoggedIn() {
        return $cookies.get(loginCookieName) !== undefined;
    }

    return {
        getServices(callback) {
            $http({
                method: 'GET',
                url: 'services',
            }).then((res) => {
                callback(res.data);
            }).catch(() => {
                callback([]);
            });
        },

        isLoggedIn,

        setService(service, callback) {
            $http({
                data: service,
                method: 'POST',
                url: 'services',
            }).then((res) => {
                callback(true);
            }).catch(() => {
                callback(false);
            });
        },

        authorize(service, callback) {
            $http({
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
            $http({
                data: {service},
                method: 'POST',
                url: 'revoke',
            }).then(callback);
        },

        logIn(form) {
            return $http({
                data: {
                    password: form.password,
                    persist: form.remember,
                    username: form.username,
                },
                method: 'POST',
                url: 'auth',
            });
        },

        logOut() {
            $http({
                method: 'POST',
                url: 'deauth',
            });
        },
    };
}]);

appServices.factory('PushClient', ['$rootScope', '$log', '$filter', 'User', 'MessageList', ($rootScope, $log, $filter, User, MessageList) => {

    const worker = new Worker('worker.min.js');

    worker.addEventListener('message', (e: MessageEvent) => {
        const now = $filter('date')(new Date(), 'mediumTime');
        const reply = e.data;

        if (reply.event === types.WorkerEvent.DISCONNECTED) {
            $log.warn('Disconnected as of ' + now);
            $rootScope.$broadcast('connection:change', 'disconnected');
        }

        if (reply.event === types.WorkerEvent.CONNECTED) {
            $log.info('Connected as of ' + now);
            $rootScope.$broadcast('connection:change', 'connected');
        }

        if (reply.event === types.WorkerEvent.DROPPED) {
            MessageList.drop(reply.retractions);
        }

        if (reply.event === types.WorkerEvent.ADD) {
            MessageList.add(reply.message);
        }

        if (reply.event === types.WorkerEvent.PARSEFAIL) {
            $log.error('Failed to parse message');
        }
    });

    return {
        connect() {
            worker.postMessage({action: types.WorkerCommand.CONNECT});
        },

        disconnect() {
            worker.postMessage({action: types.WorkerCommand.DISCONNECT});
        },
    };
}]);

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

appServices.factory('MessageList', ['$rootScope', '$http', '$log', '$window', '$location', '$interval', '$timeout', 'User', 'BrowserNotification', ($rootScope, $http, $log, $window, $location, $interval, $timeout, User, BrowserNotification) => {

    const messages = {};
    const oneDayMilliseconds = 86400000;
    const removedIds = [];

    let lastFetched: Date;

    const refreshTimer = $interval(() => {
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const key of messageKeys()) {
            const message = messages[key];
            const receivedDay = message.received;
            receivedDay.setHours(0, 0, 0, 0);
            message.days_ago = Math.floor((today.getTime() - receivedDay.getTime()) / oneDayMilliseconds);

            if (message.expired) {
                clear(message.publicId);
            } else if (message.expiresAt) {
                message.expired = new Date(message.expiresAt) < now;
            }

        }
    }, 1000 * 60);

    function count() {
        const keys = messageKeys();
        return keys.length;
    }

    function find(publicId: string) {
        if (messages.hasOwnProperty(publicId)) {
            return messages[publicId];
        }

        return false;
    }


    function messageKeys() {
        return Object.keys(messages);
    }

    function focusOne(step) {
        const keys = messageKeys();
        const maxIndex = keys.length - 1;

        let focusIndex = 0;

        if (keys.length === 0) {
            return;
        }

        keys.forEach((key, index) => {
            const message = messages[key];
            if (message.focused) {
                focusIndex = index + step;
            }
        });

        if (focusIndex > maxIndex) {
            focusIndex %= keys.length;
        }

        if (focusIndex < 0) {
            focusIndex = keys.length - maxIndex;
        }

        focusNone();
        messages[keys[focusIndex]].focused = true;
        $rootScope.$apply();
    }

    function filterKeysByMessage(callback: (message) => boolean) {
        return messageKeys().filter((key: string) => {
            return callback(messages[key]);
        });
    }

    function map(callback: (message) => any) {
        return messageKeys().forEach((key) => {
            const message = messages[key];
            return callback(message);
        });
    }

    function focusedKey(): string {
        const focusedKeys = filterKeysByMessage((message) => message.focused);
        if (focusedKeys.length === 0) {
            return null;
        }

        return focusedKeys[0];
    }

    function focusedMessage() {
        const key = focusedKey();
        return messages[key];
    }

    function clearFocused() {
        focusNext();
        clear(focusedKey());
    }

    function focusNone() {
        map((message) => message.focused = false);
    }

    /**
     * If the currently-focused message has a URL, open it in a new window
     */
    function visitLink() {
        const targetMessage = focusedMessage();

        if (targetMessage && targetMessage.url ) {
            $window.open(targetMessage.url, '_blank');
        }
    }

    function clear(publicIds: string | string[]) {
        if (typeof publicIds === 'string') {
            publicIds = [publicIds];
        }

        for (const publicId of publicIds) {
            messages[publicId].state = 'clearing';
        }

        $http({
            data: { publicId: publicIds },
            method: 'POST',
            url: 'message/clear',
        }).then(() => {
            removedIds.push(publicIds);
            $rootScope.$broadcast('queue:change', count());
        }).catch(() => {
            for (const publicId of publicIds) {
                messages[publicId].state = 'stuck';
            }
            $rootScope.$broadcast('connection:change', 'error', 'The message could not be cleared.');
        });
    }

    function add(message) {
        const startOfToday: number = (new Date()).setHours(0, 0, 0, 0);
        const now = new Date();

        message.domain = null;
        if (message.url) {
            const el = angular.element('<a></a>');
            el.attr('href', message.url);
            message.domain = el[0].hostname;
        }

        message.expire_days = null;
        message.expired = false;
        if (message.expiresAt) {
            message.expiresAt = new Date(message.expiresAt);

            message.expired = (message.expiresAt < now);

            message.expire_days = (new Date(message.expiresAt)).setHours(0, 0, 0, 0);
            message.expire_days -= startOfToday;
            message.expire_days /= oneDayMilliseconds;
        }

        message.received = new Date(message.received);
        if (isNaN(message.received)) {
            message.received = now;
        }

        message.days_ago = startOfToday;
        message.days_ago -= (new Date(message.received)).setHours(0, 0, 0, 0);
        message.days_ago /= oneDayMilliseconds;

        if (message.body) {
            message.body = message.body.replace(/\n/g, '<br/>');
        }

        message.badge = null;
        if (message.group) {
            message.badge = message.group.split('.').pop();
        }

        if (message.group === 'phone' && message.body) {
            // Format US phone numbers, dropping optional country code
            message.body = message.body.replace(/(\+?1?)(\d\d\d)(\d\d\d)(\d\d\d\d)/g, '($2) $3-$4');
        }

        message.browserNotification = BrowserNotification.send(message);

        $rootScope.$evalAsync(() => {
            messages[message.publicId] = message;
            $rootScope.$broadcast('queue:change', Object.keys(messages).length);
        });
    }

    function focusNext() {
        focusOne(1);
    }

    function focusPrevious() {
        focusOne(-1);
    }

    function drop(publicIds: string | string[]) {
        if (typeof publicIds === 'string') {
            publicIds = [publicIds];
        }

        for (const publicId of publicIds) {
            const message = find(publicId);

            if (message === false) {
                continue;
            }

            if (message.browserNotification) {
                message.browserNotification.close();
            }

            delete messages[publicId];
        }

        $rootScope.$broadcast('queue:change', count());
    }

    function fetch() {
        console.log('fetching the archive');
        const url = 'archive/25';
        const now = new Date();

        // prevent aggressive refetching
        if (lastFetched && now.getTime() - lastFetched.getTime() < 1000) {
            $log.info('Ignoring too-soon refetch request');
            return;
        }

        $http({
            method: 'GET',
            url,
        }).then((res) => {
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

                messageKeys().forEach((publicId) => {
                    const message = messages[publicId];
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

                res.data.messages.forEach((message) => {
                    add(message);
                });

                lastFetched = now;

                $timeout(() => $rootScope.$broadcast('queue:change', count()));

            }
        }).catch((data) => {
            lastFetched = now;
            if (data.status === 401) {
                $location.path('login');
            }
        });
    }

    function purge() {
        clear(messageKeys());
    }

    function empty() {
        messageKeys().forEach((key) => {
            delete messages[key];
        });

        $rootScope.$broadcast('queue:change', count());
    }


    function tallyByGroup() {
        return messageKeys().reduce((accumulator, key) => {
            const message = messages[key];

            if (accumulator.hasOwnProperty(message.group) === false) {
                accumulator[message.group] = 0;
            }

            accumulator[message.group]++;

            return accumulator;
        }, {});
    }

    function canUnclear() {
        return removedIds.length > 0;
    }

    function unclear() {
        $http({
            data: {publicId: removedIds.pop()},
            method: 'POST',
            url: 'message/unclear',
        }).then(() => {
            fetch();
        });
    }

    return {
        add,

        canUnclear,

        clear,

        clearFocused,

        drop,

        empty,

        fetch,

        focusNext,

        focusNone,

        focusOne,

        focusPrevious,

        messages,

        purge,

        tallyByGroup,

        unclear,

        visitLink,
    };
}]);
