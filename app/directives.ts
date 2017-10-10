import './templates/bottomnav.html';
import './templates/messageoptions.html';
import './templates/shortcuts-summary.html';
import './templates/statusbar.html';

const appDirectives = angular.module('appDirectives', []);

appDirectives.directive('notifierFocus', [() => {
    return {
        link: (scope, element) => {
            scope.$watch('notifierFocus', (isFocused) => {
                if (isFocused === true) {
                    element[0].focus();
                } else {
                    element[0].blur();
                }
            });
        },

        scope: {
            notifierFocus: '=notifierFocus',
        },
    };
}]);

appDirectives.directive('notifierShortcuts', ['MessageList', '$rootScope', '$document', (MessageList, $rootScope, $document) => {
    const shortcutMap: ShortcutMap = [];

    shortcutMap[67] = {
        action() {
            if (MessageList.messages.length > 0) {
                MessageList.purge();
            }
        },
        description: 'Clear all messages',
        key: 'C',
        shiftKey: true,
    };

    shortcutMap[83] = {
        action() {
            $rootScope.$broadcast('settings:toggle');
        },
        description: 'Toggle settings',
        key: 'S',
        shiftKey: true,
    };

    shortcutMap[76] = {
        action() {
            $rootScope.$broadcast('settings:logout');
        },
        description: 'Log out',
        key: 'L',
        shiftKey: true,
    };

    shortcutMap[74] = {
        action() {
            MessageList.activateNext();
        },
        description: 'Move to next message',
        key: 'j',
        shiftKey: false,
    };

    shortcutMap[75] = {
        action() {
            MessageList.activatePrevious();
        },
        description: 'Move to previous message',
        key: 'k',
        shiftKey: false,
    };

    shortcutMap[88] = {
        action() {
            MessageList.clearFocused();
        },
        description: 'Clear active message',
        key: 'x',
        shiftKey: false,
    };

    shortcutMap[90] = {
        action() {
            if (MessageList.canUnclear()) {
                MessageList.unclear();
            }
        },
        description: 'Undo',
        key: 'Z',
        shiftKey: true,
    };

    shortcutMap[79] = {
        action() {
            MessageList.visitLink();
        },
        description: 'Visit the link of the active message',
        key: 'o',
        shiftKey: false,
    };

    shortcutMap[191] = {
        action() {
            $rootScope.$broadcast('shortcuts', true);
        },
        description: 'Show the shortcut list',
        key: '?',
        shiftKey: true,
    };

    shortcutMap[27] = {
        action() {
            MessageList.activateNone();
            $rootScope.$broadcast('shortcuts', false);
        },
        description: 'Hide the shortcut list; unfocus all messages',
        key: 'esc',
        shiftKey: false,
    };

    return {
        link: (scope: ShortcutScope) => {
            scope.summaryVisible = false;
            scope.$on('shortcuts', (_: ng.IAngularEvent, visibility) => {
                scope.summaryVisible = visibility as boolean;
            });

            scope.shortcuts = shortcutMap;

            angular.element($document[0]).bind('keydown', (e) => {
                const charCode: number = e.which || e.keyCode;

                // Safari triggers a keyless keydown event during login autofill
                if (!charCode) {
                    return;
                }

                if (!shortcutMap[charCode]) {
                    return;
                }

                if (shortcutMap[charCode].shiftKey && !e.shiftKey) {
                    return;
                }

                shortcutMap[charCode].action();
            });
        },
        templateUrl: 'templates/shortcuts-summary.html',
    };
}]);

appDirectives.directive('notifierOfflineEvent', ['$window', '$rootScope', ($window, $rootScope) => {
    return {
        link() {
            const callback = (event: Event) => {
                $rootScope.$broadcast('connection:change', event.type);
            };

            $window.addEventListener('online', callback);
            $window.addEventListener('offline', callback);
        },

        restrict: 'A',
    };
}]);

appDirectives.directive('notifierAppcacheReload', ['$window', ($window) => {
    return {
        link(_: ng.IScope, element) {
            if (!$window.hasOwnProperty('applicationCache')) {
                element.addClass('appcache-nope');
                return;
            }

            $window.applicationCache.addEventListener('updateready', () => {
                $window.location.reload();
            });
        },

        restrict: 'A',
    };
}]);

appDirectives.directive('notifierStatusBar', ['MessageList', ( MessageList) => {
    return {
        link(scope: StatusBarScope) {
            scope.$on('connection:change', (_, state, message) => {
                scope.$evalAsync(() => {
                    scope.message = message || state;

                    if (state === 'offline' || state === 'disconnected' || state === 'error') {
                        scope.disconnected = true;
                    } else {
                        scope.disconnected = false;
                    }
                });
            });

            scope.$on('queue:change', () => {
                const summary: string[] = [];
                const tallys = MessageList.tallyByGroup();

                let message: string;

                Object.keys(tallys).forEach((group) => {
                    const displayName = (group === 'default') ? 'ungrouped' : group;
                    summary.push(`${tallys[group]} ${displayName}`);
                });

                if (summary.length > 3) {
                    message = `${MessageList.count()} messages in ${summary.length} groups`;
                } else {
                    message = summary.sort().join(', ');
                }

                scope.$evalAsync(() => {
                    scope.message = message;
                });
            });
        },

        restrict: 'E',
        templateUrl: 'templates/statusbar.html',
    };
}]);

appDirectives.directive('notifierMessageOptions', ['MessageList', (MessageList) => {

    return {
        link(scope: MessageOptionsScope) {
            scope.hidden = false;
            scope.$on('connection:change', (_, state) => {
                scope.hidden = (state === 'offline' || state === 'disconnected');
            });

            scope.clear = () => {
                MessageList.clear(scope.publicId);
            };
        },
        restrict: 'A',
        scope: {
            publicId: '@',
        },
        templateUrl: 'templates/messageoptions.html',
    };
}]);


appDirectives.directive('notifierBottomnav', ['BrowserNotification', 'WebhookNotification', 'MessageList', 'User', '$window', '$document', (BrowserNotification, WebhookNotification, MessageList, User, $window, $document) => {

    return {
        link(scope: NavScope) {
            scope.queueSize = 0;

            scope.hideClearAll = true;
            scope.hideUndo = true;

            scope.clearAll = () => {
                MessageList.purge();
            };

            scope.undo = () => {
                MessageList.unclear();
            };

            scope.$on('connection:change', (_, state) => {
                const hideConditions = [
                    scope.queueSize === 0,
                    state === 'offline',
                    state === 'disconnected',
                ];

                scope.hideClearAll = hideConditions.indexOf(true) > -1;
            });

            scope.$on('queue:change', (_, size) => {
                scope.queueSize = size;
                scope.hideClearAll = (size === 0);
                scope.hideUndo = (MessageList.canUnclear() === false);
            });

            scope.$on('settings:toggle', () => {
                scope.settings(!scope.settingsVisible);
                scope.$apply();
            });

            scope.$on('settings:logout', () => {
                $window.location = 'logout';
            });

            scope.$on('settings:browserNotifications', (_, state) => {
                scope.state.bn = state;
            });

            scope.$on('settings:webhookNotifications', (_, state) => {
                scope.state.webhook = state;
            });

            scope.state = {
                bn: BrowserNotification.state,
                webhook: WebhookNotification.state,
            };

            scope.serviceProps = {};

            scope.enable = (service) => {
                if (service === 'bn') {
                    BrowserNotification.enable();
                }

                if (service === 'webhook') {
                    WebhookNotification.enable();
                }
            };

            scope.toggle = (service) => {
                if (scope.state[service] === 'active') {
                    User.deauthorize(service, () => {
                        delete scope.state[service];
                    });
                } else {
                    User.authorize(service, (url: string) => {
                        $window.location.href = url;
                    });
                }
            };

            scope.settings = (state) => {
                if (state !== undefined) {
                    scope.settingsVisible = state;
                } else {
                    scope.settingsVisible = !scope.settingsVisible;
                }

                if (scope.settingsVisible === false) {
                    return;
                }

                User.getServices((services: Service[]) => {
                    for (const service of services) {
                        scope.state[service.key] = 'active';
                        if (service.key === 'webhook') {
                            WebhookNotification.url = service.value;
                        }
                    }
                    $window.scrollTo(0, $document[0].body.clientHeight);
                });
            };

            scope.logOut = () => {
                scope.$broadcast('settings:logout');
            };
        },
        restrict: 'A',
        scope: {},
        templateUrl: 'templates/bottomnav.html',
    };
}]);

export default appDirectives;
