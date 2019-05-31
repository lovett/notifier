import Message from './message';
import Store from './store';
import { Command } from '../worker/command';
import { ReplyEvent } from '../worker/events';

const appServices = angular.module('appServices', []);

appServices.factory('User', ['$http', '$cookies', ($http: angular.IHttpService, $cookies: angular.cookies.ICookiesService) => {
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

        if (reply.event === ReplyEvent.disconnected) {
            $log.warn('Disconnected as of ' + now);
            $rootScope.$broadcast('connection:change', 'disconnected');
        }

        if (reply.event === ReplyEvent.connected) {
            $log.info('Connected as of ' + now);
            $rootScope.$broadcast('connection:change', 'connected');
        }

        if (reply.event === ReplyEvent.dropped) {
            MessageList.drop(reply.retractions);
        }

        if (reply.event === ReplyEvent.add) {
            MessageList.add(reply.message);
        }

        if (reply.event === ReplyEvent.parsefail) {
            $log.error('Failed to parse message');
        }
    });

    return {
        connect() {
            // There is a problem with EventSource on Firefox for Android.
            // The browser will crash if the page is reloaded or unloaded
            // after the EventSource connection has been made. The exact
            // nature of the problem is unknown; this is a
            // workaround. Pretending the connection was successful allows
            // the initial message fetch to continue working. Real-time
            // updates are lost, but on a mobile screen this is not
            // entirely terrible because usage is probably short-lived
            // anyway. A long-running connection isn't happening on mobile
            // the way it is on desktop.
            const agent = window.navigator.userAgent;
            const isAndroid = agent.indexOf('Android') > -1;
            const isFirefox = agent.indexOf('Firefox') > -1;

            let action = Command.connect;
            if (isAndroid && isFirefox) {
                action = Command.fauxconnect;
            }

            pushWorker.postMessage(action);
        },

        disconnect() {
            pushWorker.postMessage(Command.disconnect);
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
        enable(currentUrl: string | null) {
            let hookUrl: string | null = $window.prompt('URL:', currentUrl || '');

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

    return { state, enable, send };
}]);

appServices.factory('MessageList', ['$rootScope', '$http', '$window', '$location', 'BrowserNotification', ($rootScope: angular.IRootScopeService, $http: angular.IHttpService, $window: angular.IWindowService, $location: angular.ILocationService, BrowserNotification: app.BrowserNotificationService) => {

    const store = new Store();

    store.onAdd((id?: string) => {
        if (!id) {
            return;
        }
        const message = store.message(id);
        message.browserNotification = BrowserNotification.send(message);

        $rootScope.$evalAsync(() => {
            $rootScope.$broadcast('queue:change', store.size());
        });
    });

    store.onRefresh((_?: string) => {
        $rootScope.$apply();
    });

    store.onRemove((_?: string) => {
        $rootScope.$evalAsync(() => {
            $rootScope.$broadcast('queue:change', store.size());
        });
    });

    let removedIds: string[] = [];

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
            removedIds = removedIds.concat(publicIds);
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
            const activeMessage = store.active();

            if (!activeMessage) {
                return;
            }

            clear([activeMessage]);
        },

        activateNone() {
            store.deactivate();
        },

        visitLink() {
            const activeMessage = store.active();

            if (!activeMessage) {
                return;
            }

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

        activateByIndex(index: number) {
            store.activateByIndex(index);
            $rootScope.$apply();
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
            $http<app.ArchiveResponse>({
                method: 'GET',
                url: 'archive',
            }).then((res) => {
                let receivedMessages: Message[] = [];
                let staleMessages: Message[] = [];

                // We've just received the current list of
                // uncleared messages, but we might be holding
                // other messages that were cleared by another
                // client while we were offline. They should be
                // dropped.

                if (!res.data || !res.data.messages) {
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
            }).catch((res: angular.IHttpResponse<app.ArchiveResponse>) => {
                if (res.status === 401) {
                    $location.path('login');
                }
            });
        },

        canUnclear() {
            return removedIds.length > 0;
        },

        unclear() {
            $http({
                data: { publicId: removedIds.pop() },
                method: 'POST',
                url: 'message/unclear',
            }).then(() => {
                this.fetch();
            });
        },
    };
}]);

export default appServices;
