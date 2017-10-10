import * as worker from '../types/worker';
import Message from './message';
import Store from './store';

const appServices = angular.module('appServices', []);

appServices.factory('User', ['$window', '$http', '$cookies', ($window: angular.IWindowService, $http: angular.IHttpService, $cookies: angular.cookies.ICookiesService) => {
    const loginCookieName = 'token';

    function isLoggedIn() {
        return $cookies.get(loginCookieName) !== undefined;
    }

    return {
        getServices(callback: IServiceCallback) {
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

        setService(service: IService, callback: IServiceCallback) {
            $http({
                data: service,
                method: 'POST',
                url: 'services',
            }).then(() => {
                callback(true);
            }).catch(() => {
                callback(false);
            });
        },

        authorize(service: IService, callback: IServiceCallback) {
            $http({
                method: 'GET',
                params: {
                    host: $window.location.host,
                    protocol: $window.location.protocol,
                },
                url: 'authorize/' + service + '/start',
            }).then((res: angular.IHttpResponse<IService>) => {
                callback(res.data.url);
            });
        },

        deauthorize(service: IService, callback: IServiceCallback) {
            $http({
                data: {service},
                method: 'POST',
                url: 'revoke',
            }).then(callback);
        },

        logIn(form: angular.IFormController) {
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

appServices.factory('PushClient', ['$rootScope', '$log', '$filter', 'MessageList', ($rootScope: angular.IRootScopeService, $log: angular.ILogService, $filter: angular.IFilterService, MessageList: IMessageList) => {

    const pushWorker = new Worker('worker.js');

    pushWorker.addEventListener('message', (e: MessageEvent) => {
        const now = $filter('date')(new Date(), 'mediumTime');
        const reply = e.data;

        if (reply.event === worker.WorkerEvent.DISCONNECTED) {
            $log.warn('Disconnected as of ' + now);
            $rootScope.$broadcast('connection:change', 'disconnected');
        }

        if (reply.event === worker.WorkerEvent.CONNECTED) {
            $log.info('Connected as of ' + now);
            $rootScope.$broadcast('connection:change', 'connected');
        }

        if (reply.event === worker.WorkerEvent.DROPPED) {
            MessageList.drop(reply.retractions);
        }

        if (reply.event === worker.WorkerEvent.ADD) {
            MessageList.add(reply.message);
        }

        if (reply.event === worker.WorkerEvent.PARSEFAIL) {
            $log.error('Failed to parse message');
        }
    });

    return {
        connect() {
            pushWorker.postMessage({action: worker.WorkerCommand.CONNECT});
        },

        disconnect() {
            pushWorker.postMessage({action: worker.WorkerCommand.DISCONNECT});
        },
    };
}]);

appServices.service('WebhookNotification', ['$window', '$rootScope', 'User', ($window: angular.IWindowService, $rootScope: angular.IRootScopeService, User: IUserService) => {
    const enum States {
        active,
        inactive,
    }

    let url: string;
    let state: States;

    return {
        enable() {
            let hookUrl: string|null = $window.prompt('URL:', url || '');

            if (hookUrl === null) {
                return;
            }

            hookUrl = hookUrl.trim();

            if (hookUrl.length > 0 && hookUrl.indexOf('http') !== 0) {
                $window.alert('Invalid URL. Please try again.');
                return;
            }

            const webhookService: IService = {webhook: hookUrl};

            User.setService(webhookService, (result) => {
                state = (url && result === true) ? States.active : States.inactive;
                $rootScope.$broadcast('settings:webhookNotifications', state);
            });
        },
    };
}]);

appServices.service('BrowserNotification', ['$window', '$rootScope', ($window: angular.IWindowService, $rootScope: angular.IRootScopeService) => {
    let state: string;

    function send(message: IMessage, ignoreFocus: boolean) {
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

        $window.Notification.requestPermission((permission: string) => {
            if (permission === 'denied') {
                $window.alert(`Notifications are inactive, but they can be turned on
via the browser's Notifications settings`);
                return;
            }

            if (permission === 'granted') {
                const message = new Message();
                message.publicId = 'notification-enabled';
                message.group = 'internal';
                message.title = 'Browser notifications enabled';

                // send(message, true);
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

appServices.factory('MessageList', ['$rootScope', '$http', '$log', '$window', '$interval', '$location', 'BrowserNotification', ($rootScope: angular.IRootScopeService, $http: angular.IHttpService, $log: angular.ILogService, $window: angular.IWindowService, $interval: angular.IIntervalService, $location: angular.ILocationService, BrowserNotification: IBrowserNotificationService) => {

    const store = new Store();

    store.onAdd((id: string) => {
        const message = store.message(id);
        message.browserNotification = BrowserNotification.send(message);

        $rootScope.$evalAsync(() => {
            $rootScope.$broadcast('queue:change', store.size());
        });
    });

    store.onRemove((_: string) => {
        $rootScope.$broadcast('queue:change', store.size());
    });

    const removedIds: string[] = [];

    let lastFetched: Date = new Date(0);

    $interval(() => {

        // const now = new Date();
        // const today = new Date();
        // today.setHours(0, 0, 0, 0);

        // for (let message of store.itemList()) {
        //     const oneDayMilliseconds = 86400000;
        //     const message = messages[key];
        //     const receivedDay = message.received;
        //     receivedDay.setHours(0, 0, 0, 0);
        //     message.days_ago = Math.floor((today.getTime() - receivedDay.getTime()) / oneDayMilliseconds);

        //     if (message.expired) {
        //         clear(message.publicId);
        //     } else if (message.expiresAt) {
        //         message.expired = new Date(message.expiresAt) < now;
        //     }

        // }
    }, 1000 * 60);

    return {
        count() {
            return store.size();
        },

        find(publicId: string) {
            return store.message(publicId);
        },

        messageKeys() {
            return store.keys();
        },

        add(message: IMessage) {
            store.add(Message.fromJson(message));
        },



    //     filterKeysByMessage(callback: (message: IMessage) => boolean) {
    //         return messageKeys().filter((key: string) => {
    //             return callback(messages[key]);
    //         });
    //     },


    //     map(callback: (message: IMessage) => any) {
    //         return messageKeys().forEach((key) => {
    //             const message = messages[key];
    //             return callback(message);
    //         });
    //     },


    //     focusedKey(): string|null {
    //         const focusedKeys = filterKeysByMessage((message) => message.focused);
    //         if (focusedKeys.length === 0) {
    //             return null;
    //         }

    //         return focusedKeys[0];
    //     },

    //     focusedMessage(): IMessage|null {
    //         const key = focusedKey();
    //         if (key) {
    //             return messages[key];
    //         }
    //         return null;
    //     },

        clearFocused() {
            const key = store.activeKey();
            store.activateByStep(1);
            store.removeKey(key);
        },

        activateNone() {
            store.deactivate();
            console.log(store.items);
        },

        visitLink() {
            const activeMessage = store.active();

            if (activeMessage.url) {
                $window.open(activeMessage.url, '_blank');
            }
        },

        clear(publicIds: string | string[]) {
            let idList: string[] = [];

            if (typeof publicIds === 'string') {
                idList = [publicIds];
            } else {
                idList = publicIds;
            }

            for (const publicId of idList) {
                store.items[publicId].state = 'clearing';
            }

            $http({
                data: { publicId: publicIds },
                method: 'POST',
                url: 'message/clear',
            }).then(() => {
                removedIds.concat(idList);
            }).catch(() => {
                for (const publicId of publicIds) {
                    store.items[publicId].state = 'stuck';
                }
                $rootScope.$broadcast('connection:change', 'error', 'The message could not be cleared.');
            });
        },

        activateNext() {
            store.activateByStep(1);
            $rootScope.$apply();
        },

        activatePrevious() {
            store.activateByStep(-1);
            $rootScope.$apply();
        },

        messages: store.items,

        drop(publicIds: string | string[]) {
            let idList: string[] = [];

            if (typeof publicIds === 'string') {
                idList = [publicIds];
            } else {
                idList = publicIds;
            }

            for (const publicId of idList) {
                store.removeKey(publicId);
            }
        },


        fetch() {
            const url = 'archive/25';
            const now = new Date();

            // prevent aggressive re-fetching
            if (now.getTime() - lastFetched.getTime() < 1000) {
                $log.info('Ignoring too-soon re-fetch');
                return;
            }

            $http({method: 'GET', url}).then((res: angular.IHttpResponse<IArchiveResponse>) => {
                let receivedMessages: Message[] = [];
                let staleMessages: Message[] = [];

                // We've just received the current list of
                // uncleared messages, but we might be holding
                // other messages that were cleared by another
                // client while we were offline. They should be
                // dropped.

                if (!res.data) {
                    return;
                }

                receivedMessages = res.data.messages.map((message) => {
                    return Message.fromJson(message);
                });

                staleMessages = store.allExcept(receivedMessages);

                staleMessages.forEach((message) => {
                    store.remove(message);
                });

                receivedMessages.forEach((message) => store.add(message));

                //$timeout(() => $rootScope.$broadcast('queue:change', store.size()));
            }).catch((res) => {
                if (res.status === 401) {
                    $location.path('login');
                }
            }).finally(() => lastFetched = now);
        },

        purge() {
            store.clear();
        },

        empty() {
            store.clear();
        },

        tallyByGroup() {
            return store.tallyByGroup();
        },

        canUnclear() {
            return removedIds.length > 0;
        },

        unclear() {
            $http({
                data: {publicId: removedIds.pop()},
                method: 'POST',
                url: 'message/unclear',
            }).then(() => {
                this.fetch();
            });
        },
    };
}]);

export default appServices;
