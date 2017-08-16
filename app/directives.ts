import './templates/shortcuts-summary.html';
import './templates/bottomnav.html';

const appDirectives = angular.module('appDirectives', []);

interface INavScope extends ng.IScope {
    hideClearAll: boolean;
    hideUndo: boolean;
    queueSize: number;
    serviceProps;
    settingsVisible: boolean;
    state;

    enable(service: string);

    clearAll();
    logOut();
    settings(state: boolean);
    toggle(service: string);
    undo();
}

interface IMessageOptionsScope extends ng.IScope {
    hidden: boolean;
    publicId: string;
    clear();
}

interface IStatusBarScope extends ng.IScope {
    disconnected: boolean;
    message;
}

interface IAppcacheReloadScope extends ng.IScope {
    fullReload();
}

interface IShortcutScope extends ng.IScope {
    summaryVisible: boolean;
    shortcuts;
}

appDirectives.directive('notifierFocus', [() => {
    'use strict';

    return {
        link: (scope, element) => {
            scope.$watch('notifierFocus', (isFocused) => {
                if (isFocused === true) {
                    element[0].focus();
                }
            });
        },

        scope: {
            notifierFocus: '=notifierFocus',
        },
    };
}]);

appDirectives.directive('notifierShortcuts', ['MessageList', '$rootScope', '$window', '$document', (MessageList, $rootScope, $window, $document) => {
    'use strict';

    const shortcutMap = {
        67: {
            action() {
                if (MessageList.messages.length > 0) {
                    MessageList.purge();
                }
            },
            description: 'Clear all messages',
            key: 'C',
            label: '⇧  c',
            shiftKey: true,
        },

        83: {
            action() {
                $rootScope.$broadcast('settings:toggle');
            },
            description: 'Toggle settings',
            key: 'S',
            label: '⇧  s',
            shiftKey: true,
        },

        76: {
            action() {
                $rootScope.$broadcast('settings:logout');
            },
            description: 'Log out',
            key: 'L',
            label: '⇧  l',
            shiftKey: true,
        },

        74: {
            action() {
                MessageList.focusNext();
            },
            description: 'Move to next message',
            key: 'j',
            shiftKey: false,
        },

        75: {
            action() {
                MessageList.focusPrevious();
            },
            description: 'Move to previous message',
            key: 'k',
            shiftKey: false,
        },

        88: {
            action() {
                MessageList.clearFocused();
            },
            description: 'Clear active message',
            key: 'x',
            shiftKey: false,
        },

        90: {
            action() {
                if (MessageList.canUnclear()) {
                    MessageList.unclear();
                }
            },
            description: 'Undo',
            key: 'Z',
            label: '⇧  z',
            shiftKey: true,
        },

        79: {
            action() {
                MessageList.visitLink();
            },
            description: 'Visit the link of the active message',
            key: 'o',
            shiftKey: false,
        },

        191: {
            action() {
                $rootScope.$broadcast('shortcuts:toggle');
            },
            description: 'Toggle the shortcut list',
            key: '?',
            shiftKey: true,
        },

        27: {
            action() {
                MessageList.focusNone();
                $rootScope.$broadcast('shortcuts:hide');
            },
            description: 'Hide the shortcut list; unfocus all messages',
            key: 'esc',
        },
    };

    return {
        link: (scope: IShortcutScope) => {
            scope.summaryVisible = false;
            scope.$on('shortcuts:toggle', () => {
                scope.summaryVisible = !scope.summaryVisible;
            });

            scope.$on('shortcuts:hide', () => {
                scope.summaryVisible = false;
            });

            scope.shortcuts = shortcutMap;

            angular.element($document[0]).bind('keydown', (e) => {
                const charCode: number = e.which || e.keyCode;

                // Safari triggers a keyless keydown event during login autofill
                if (!charCode) {
                    return;
                }

                if (!shortcutMap.hasOwnProperty(charCode.toString())) {
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
    'use strict';

    return {
        link() {
            const callback = (event) => {
                $rootScope.$broadcast('connection:change', event.type);
            };

            $window.addEventListener('online', callback);
            $window.addEventListener('offline', callback);
        },

        restrict: 'A',
    };
}]);

appDirectives.directive('notifierAppcacheReload', ['$window', '$interval', '$rootScope', '$log', ($window, $interval, $rootScope, $log) => {
    'use strict';

    return {
        link(scope: IAppcacheReloadScope, element) {
            if (!$window.hasOwnProperty('applicationCache')) {
                element.addClass('appcache-nope');
                return;
            }

            $window.applicationCache.addEventListener('updateready', () => {
                $log.info('An appcache update is ready, requesting full reload');
                $window.location.reload();
                scope.fullReload();
            });

            $window.applicationCache.addEventListener('error', (e) => {
                const count = 5;

                $interval((iteration) => {
                    $rootScope.$broadcast('connection:change', 'disconnected', 'The server is unavailable, retrying in ' + (count - iteration));
                    if (iteration + 1 === count) {
                        //scope.fullReload();
                    }
                }, 1000, count, false);
            });
        },

        restrict: 'A',
    };
}]);

appDirectives.directive('notifierStatusBar', ['$log', '$timeout', 'MessageList', ($log, $timeout, MessageList) => {
    return {
        link(scope: IStatusBarScope) {
            scope.$on('connection:change', (e, state, message) => {
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
                const summary = [];
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
        template: '<div ng-class="{\'status-bar\': true, \'disconnected\': disconnected}">{{ message }}</div>',

    };
}]);


appDirectives.directive('notifierSetScope', () => {
    return {
        link(scope, element, attrs) {
            if (element[0].nodeName.toLowerCase() !== 'meta') {
                return;
            }
            scope[attrs.notifierSetScope] = attrs.content;
        },
        restrict: 'A',
    };
});

appDirectives.directive('notifierMessageOptions', ['MessageList', (MessageList) => {

    return {
        link(scope: IMessageOptionsScope) {
            scope.hidden = false;
            scope.$on('connection:change', (e, state) => {
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
        template: '<a ng-href="#" ng-click="clear()" ng-hide="hidden"><span><svg role="img" aria-label="Close icon" class="icon icon-close"><use xlink:href="#icon-close"></use></svg></span></a>',
    };
}]);


appDirectives.directive('notifierBottomnav', ['BrowserNotification', 'WebhookNotification', 'MessageList', 'User', '$window', '$document', (BrowserNotification, WebhookNotification, MessageList, User, $window, $document) => {

    return {
        link(scope: INavScope) {
            scope.queueSize = 0;

            scope.hideClearAll = true;
            scope.hideUndo = true;

            scope.clearAll = () => {
                MessageList.purge();
            };

            scope.undo = () => {
                MessageList.unclear();
            };

            scope.$on('connection:change', (e, state) => {
                scope.hideClearAll = scope.queueSize === 0 || state === 'offline' || state === 'disconnected';
            });

            scope.$on('queue:change', (e, size) => {
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

            scope.$on('settings:browserNotifications', (e, state) => {
                scope.state.bn = state;
            });

            scope.$on('settings:webhookNotifications', (e, state) => {
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
                    User.authorize(service, (url) => {
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

                User.getServices((services) => {
                    services.forEach((service) => {
                        scope.state[service.key] = 'active';
                        if (service.key === 'webhook') {
                            WebhookNotification.url = service.value;
                        }
                    });
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

export default appDirectives
