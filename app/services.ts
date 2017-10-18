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
        getServices(callback: app.ServiceCallback) {
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

        setWebhook(webhook: string, callback: app.WebhookSubmissionCallback) {
            $http({
                data: {
                    webhook,
                },
                method: 'POST',
                url: 'services',
            }).then(() => {
                callback(true);
            }).catch(() => {
                callback(false);
            });
        },

        authorize(service: app.Service, callback: app.ServiceCallback) {
            $http({
                method: 'GET',
                params: {
                    host: $window.location.host,
                    protocol: $window.location.protocol,
                },
                url: 'authorize/' + service + '/start',
            }).then((res: angular.IHttpResponse<app.AuthRedirect>) => {
                callback(res.data.url);
            });
        },

        deauthorize(service: app.Service, callback: app.ServiceCallback) {
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

appServices.factory('PushClient', ['$rootScope', '$log', '$filter', 'MessageList', ($rootScope: angular.IRootScopeService, $log: angular.ILogService, $filter: angular.IFilterService, MessageList: app.MessageList) => {

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

appServices.service('WebhookNotification', ['$window', '$rootScope', 'User', ($window: angular.IWindowService, $rootScope: angular.IRootScopeService, User: app.UserService) => {
    const enum States {
        active,
        inactive,
    }

    let state: States;

    return {
        enable(currentUrl: string|null) {
            let hookUrl: string|null = $window.prompt('URL:', currentUrl || '');

            if (hookUrl === null) {
                return;
            }

            hookUrl = hookUrl.trim();

            if (hookUrl.length > 0 && hookUrl.indexOf('http') !== 0) {
                $window.alert('Invalid URL. Please try again.');
                return;
            }

            User.setWebhook(hookUrl, (successful: boolean) => {
                state = (successful === true) ? States.active : States.inactive;
                $rootScope.$broadcast('settings:webhookNotifications', state);
            });
        },
    };
}]);

appServices.service('BrowserNotification', ['$window', '$rootScope', ($window: angular.IWindowService, $rootScope: angular.IRootScopeService) => {
    let state: string;

    function send(message: app.Message, ignoreFocus: boolean) {
        if ($window.document.hasFocus() && ignoreFocus !== true) {
            return;
        }

        if (message.age() > 5) {
            return;
        }

        return message.asBrowserNotification();
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

appServices.factory(
    'MessageList',
    ['$rootScope',
     '$http',
     '$log',
     '$window',
     '$location',
     'BrowserNotification', (
         $rootScope: angular.IRootScopeService,
         $http: angular.IHttpService,
         $log: angular.ILogService,
         $window: angular.IWindowService,
         $location: angular.ILocationService,
         BrowserNotification: app.BrowserNotificationService,
     ) => {

    const store = new Store();

    store.onAdd((id: string) => {
        const message = store.message(id);
        message.browserNotification = BrowserNotification.send(message);

        $rootScope.$evalAsync(() => {
            $rootScope.$broadcast('queue:change', store.size());
        });
    });

    store.onRefresh((_) => {
        $rootScope.$apply();
    });

    store.onRemove((_: string) => {
        $rootScope.$evalAsync(() => {
            $rootScope.$broadcast('queue:change', store.size());
        });
    });

    const removedIds: string[] = [];

    let lastFetched: Date = new Date(0);

    const clear = (messages: Message[]) => {
        for (const message of messages) {
            message.state = 'clearing';
        }

        const publicIds = messages.map((message) => message.publicId);

        if (publicIds.length === 0) {
            return;
        }

        $http({
            data: { publicId: publicIds },
            method: 'POST',
            url: 'message/clear',
        }).then(() => {
            removedIds.concat(publicIds);
        }).catch(() => {
            for (const message of messages) {
                message.state = 'stuck';
            }

            $rootScope.$broadcast('connection:change', 'error', 'The message could not be cleared.');
        });
    };

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

        add(message: app.RawMessage) {
            store.add(Message.fromRaw(message));
        },

        clearFocused() {
            const key = store.activeKey();
            if (!key) {
                return;
            }

            store.activateByStep(1);
            store.removeKey(key);
        },

        activateNone() {
            store.deactivate();
        },

        visitLink() {
            const activeMessage = store.active();

            if (activeMessage.url) {
                $window.open(activeMessage.url, '_blank');
            }
        },

        clear,

        clearAll() {
            this.clear(store.itemList());
        },

        clearById(publicId: string) {
            const message = store.message(publicId);
            this.clear([message]);
        },

        reset() {
            store.reset();
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

            $http({method: 'GET', url}).then((res: angular.IHttpResponse<app.ArchiveResponse>) => {
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
                    return Message.fromRaw(message);
                });

                staleMessages = store.allExcept(receivedMessages);

                staleMessages.forEach((message) => {
                    store.remove(message);
                });

                receivedMessages.forEach((message) => store.add(message));
            }).catch((res) => {
                if (res.status === 401) {
                    $location.path('login');
                }
            }).finally(() => lastFetched = now);
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
