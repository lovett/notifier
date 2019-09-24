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

appDirectives.directive('notifierShortcuts', ['MessageList', '$rootScope', '$document', '$timeout', (MessageList, $rootScope, $document, $timeout) => {
    const shortcutMap: app.ShortcutMap = [];
    let messageNumber = 0;

    shortcutMap[49] = {
        action(charCode) {
            const index = charCode - 49;
            MessageList.activateByIndex(index);
        },
        description: 'Select a message by index',
        key: '1..9',
        shiftKey: false,
    };

    shortcutMap[67] = {
        action() {
            MessageList.clearAll();
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
            messageNumber = 0;
            MessageList.activateNone();
            $rootScope.$broadcast('shortcuts', false);
        },
        description: 'Hide the shortcut list; unfocus all messages',
        key: 'esc',
        shiftKey: false,
    };

    function isAlias(shortcut: app.Shortcut | app.ShortcutAlias): shortcut is app.ShortcutAlias {
        return (shortcut as app.ShortcutAlias).charCode !== undefined;
    }

    return {
        link: (scope: app.ShortcutScope) => {
            scope.summaryVisible = false;
            scope.$on('shortcuts', (_: ng.IAngularEvent, visibility) => {
                scope.summaryVisible = visibility as boolean;
            });

            scope.shortcuts = shortcutMap;

            angular.element($document[0]).bind('keydown', (e) => {
                const charCode: number = e.which || e.keyCode;



                let mapValue = shortcutMap[charCode];

                if (!mapValue) {
                    return;
                }

                if (isAlias(mapValue)) {
                    mapValue = shortcutMap[mapValue.charCode] as app.Shortcut;
                }

                if (mapValue.shiftKey !== e.shiftKey) {
                    return;
                }

                mapValue.action(charCode);
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

appDirectives.directive('notifierStatusBar', ['MessageList', (MessageList) => {
    function messageCount() {
        const count = MessageList.count();

        if (count === 0) {
            return '';
        }

        const label = (count === 1) ? 'message' : 'messages';
        return `${count} ${label}`;
    }

    return {
        link(scope: app.StatusBarScope) {
            scope.$on('connection:change', (_, state, message) => {
                scope.$evalAsync(() => {
                    if (state === 'offline' || state === 'disconnected' || state === 'error') {
                        scope.message = message || state;
                        scope.disconnected = true;
                    } else {
                        scope.message = messageCount();
                        scope.disconnected = false;
                    }
                });
            });

            scope.$on('queue:change', () => {
                scope.$evalAsync(() => {
                    scope.message = messageCount();
                });
            });
        },

        restrict: 'E',
        templateUrl: 'templates/statusbar.html',
    };
}]);

appDirectives.directive('notifierMessageOptions', ['MessageList', (MessageList) => {

    return {
        link(scope: app.MessageOptionsScope) {
            scope.hidden = false;
            scope.$on('connection:change', (_, state) => {
                scope.hidden = (state === 'offline' || state === 'disconnected');
            });

            scope.clear = () => {
                MessageList.clearById(scope.publicId);
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
        link(scope: app.NavScope) {
            scope.queueSize = 0;

            scope.hideClearAll = true;
            scope.hideUndo = true;

            scope.clearAll = () => {
                MessageList.clearAll();
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
                    WebhookNotification.enable(scope.webhookUrl);
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

                User.getServices((services: app.Service[]) => {
                    for (const service of services) {
                        scope.state[service.key] = 'active';
                        if (service.key === 'webhook') {
                            scope.webhookUrl = service.value;
                        }
                    }
                    $window.scrollTo(0, $document[0].body.clientHeight);
                });
            };

            scope.webhookUrl = '';

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
