"use strict";
var appDirectives = angular.module('appDirectives', []);
appDirectives.directive('notifierFocus', [function () {
        'use strict';
        return {
            link: function (scope, element) {
                scope.$watch('notifierFocus', function (isFocused) {
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
appDirectives.directive('notifierShortcuts', ['MessageList', '$rootScope', '$window', '$document', function (MessageList, $rootScope, $window, $document) {
        'use strict';
        var shortcutMap = {
            67: {
                action: function () {
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
                action: function () {
                    $rootScope.$broadcast('settings:toggle');
                },
                description: 'Toggle settings',
                key: 'S',
                label: '⇧  s',
                shiftKey: true,
            },
            76: {
                action: function () {
                    $rootScope.$broadcast('settings:logout');
                },
                description: 'Log out',
                key: 'L',
                label: '⇧  l',
                shiftKey: true,
            },
            74: {
                action: function () {
                    MessageList.focusNext();
                },
                description: 'Move to next message',
                key: 'j',
                shiftKey: false,
            },
            75: {
                action: function () {
                    MessageList.focusPrevious();
                },
                description: 'Move to previous message',
                key: 'k',
                shiftKey: false,
            },
            88: {
                action: function () {
                    MessageList.clearFocused();
                },
                description: 'Clear active message',
                key: 'x',
                shiftKey: false,
            },
            90: {
                action: function () {
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
                action: function () {
                    MessageList.visitLink();
                },
                description: 'Visit the link of the active message',
                key: 'o',
                shiftKey: false,
            },
            191: {
                action: function () {
                    $rootScope.$broadcast('shortcuts:toggle');
                },
                description: 'Toggle the shortcut list',
                key: '?',
                shiftKey: true,
            },
            27: {
                action: function () {
                    MessageList.focusNone();
                    $rootScope.$broadcast('shortcuts:hide');
                },
                description: 'Hide the shortcut list; unfocus all messages',
                key: 'esc',
            },
        };
        return {
            link: function (scope) {
                scope.summaryVisible = false;
                scope.$on('shortcuts:toggle', function () {
                    scope.summaryVisible = !scope.summaryVisible;
                    scope.$apply();
                });
                scope.$on('shortcuts:hide', function () {
                    scope.summaryVisible = false;
                    scope.$apply();
                });
                scope.shortcuts = shortcutMap;
                angular.element($document[0]).bind('keydown', function (e) {
                    var charCode = e.which || e.keyCode;
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
appDirectives.directive('notifierOfflineEvent', ['$window', '$rootScope', function ($window, $rootScope) {
        'use strict';
        return {
            link: function () {
                var callback = function (event) {
                    $rootScope.$broadcast('connection:change', event.type);
                };
                $window.addEventListener('online', callback);
                $window.addEventListener('offline', callback);
            },
            restrict: 'A',
        };
    }]);
appDirectives.directive('notifierAppcacheReload', ['$window', '$interval', '$rootScope', '$log', function ($window, $interval, $rootScope, $log) {
        'use strict';
        return {
            link: function (scope, element) {
                if (!$window.hasOwnProperty('applicationCache')) {
                    element.addClass('appcache-nope');
                    return;
                }
                scope.fullReload = function () {
                    $window.location.reload();
                };
                $window.applicationCache.addEventListener('updateready', function () {
                    $log.info('An appcache update is ready, requesting full reload');
                    scope.fullReload();
                });
                $window.applicationCache.addEventListener('error', function (e) {
                    var count = 5;
                    $interval(function (iteration) {
                        $rootScope.$broadcast('connection:change', 'disconnected', 'The server is unavailable, retrying in ' + (count - iteration));
                        if (iteration + 1 === count) {
                            scope.fullReload();
                        }
                    }, 1000, count, false);
                });
            },
            restrict: 'A',
        };
    }]);
appDirectives.directive('notifierStatusBar', ['$log', '$timeout', 'MessageList', function ($log, $timeout, MessageList) {
        return {
            link: function (scope) {
                scope.$on('connection:change', function (e, state, message) {
                    if (state === 'offline' || state === 'disconnected' || state === 'error') {
                        scope.message = message || state;
                        scope.disconnected = true;
                    }
                    else {
                        scope.disconnected = false;
                    }
                    scope.$apply();
                });
                scope.$on('queue:change', function () {
                    var summary = [];
                    var tallys = MessageList.messages.reduce(function (accumulator, message) {
                        if (!accumulator.hasOwnProperty(message.group)) {
                            accumulator[message.group] = 1;
                        }
                        else {
                            accumulator[message.group] += 1;
                        }
                        return accumulator;
                    }, {});
                    Object.keys(tallys).forEach(function (group) {
                        var displayName = (group === 'default') ? 'ungrouped' : group;
                        summary.push(tallys[group] + " " + displayName);
                    });
                    if (summary.length > 3) {
                        scope.message = MessageList.messages.length;
                        scope.message += (MessageList.messages.length === 1) ? ' message' : ' messages';
                        scope.message += ' in ';
                        scope.message += ' ' + summary.length;
                        scope.message += (summary.length === 1) ? ' group' : ' groups';
                    }
                    else {
                        scope.message = summary.sort().join(', ');
                    }
                    scope.disconnected = false;
                });
            },
            restrict: 'E',
            template: '<div ng-class="{\'status-bar\': true, \'disconnected\': disconnected}">{{ message }}</div>',
        };
    }]);
appDirectives.directive('notifierSetScope', function () {
    return {
        link: function (scope, element, attrs) {
            if (element[0].nodeName.toLowerCase() !== 'meta') {
                return;
            }
            scope[attrs.notifierSetScope] = attrs.content;
        },
        restrict: 'A',
    };
});
appDirectives.directive('notifierMessageOptions', ['MessageList', function (MessageList) {
        return {
            link: function (scope) {
                scope.hidden = false;
                scope.$on('connection:change', function (e, state) {
                    scope.hidden = (state === 'offline' || state === 'disconnected');
                });
                scope.clear = function () {
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
appDirectives.directive('notifierBottomnav', ['BrowserNotification', 'WebhookNotification', 'MessageList', 'User', '$window', '$document', function (BrowserNotification, WebhookNotification, MessageList, User, $window, $document) {
        return {
            link: function (scope) {
                scope.queueSize = 0;
                scope.hideClearAll = true;
                scope.hideUndo = true;
                scope.clearAll = function () {
                    MessageList.purge();
                };
                scope.undo = function () {
                    MessageList.unclear();
                };
                scope.$on('connection:change', function (e, state) {
                    scope.hideClearAll = scope.queueSize === 0 || state === 'offline' || state === 'disconnected';
                });
                scope.$on('queue:change', function (e, size) {
                    scope.queueSize = size;
                    scope.hideClearAll = (size === 0);
                    scope.hideUndo = (MessageList.canUnclear() === false);
                });
                scope.$on('settings:toggle', function () {
                    scope.settings(!scope.settingsVisible);
                    scope.$apply();
                });
                scope.$on('settings:logout', function () {
                    $window.location = 'logout';
                });
                scope.$on('settings:browserNotifications', function (e, state) {
                    scope.state.bn = state;
                });
                scope.$on('settings:webhookNotifications', function (e, state) {
                    scope.state.webhook = state;
                });
                scope.state = {
                    bn: BrowserNotification.state,
                    webhook: WebhookNotification.state,
                };
                scope.serviceProps = {};
                scope.enable = function (service) {
                    if (service === 'bn') {
                        BrowserNotification.enable();
                    }
                    if (service === 'webhook') {
                        WebhookNotification.enable();
                    }
                };
                scope.toggle = function (service) {
                    if (scope.state[service] === 'active') {
                        User.deauthorize(service, function () {
                            delete scope.state[service];
                        });
                    }
                    else {
                        User.authorize(service, function (url) {
                            $window.location.href = url;
                        });
                    }
                };
                scope.settings = function (state) {
                    if (state !== undefined) {
                        scope.settingsVisible = state;
                    }
                    else {
                        scope.settingsVisible = !scope.settingsVisible;
                    }
                    if (scope.settingsVisible === false) {
                        return;
                    }
                    User.getServices(function (services) {
                        services.forEach(function (service) {
                            scope.state[service.key] = 'active';
                            if (service.key === 'webhook') {
                                WebhookNotification.url = service.value;
                            }
                        });
                        $window.scrollTo(0, $document[0].body.clientHeight);
                    });
                };
                scope.logOut = function () {
                    scope.$broadcast('settings:logout');
                };
            },
            restrict: 'A',
            scope: {},
            templateUrl: 'templates/bottomnav.html',
        };
    }]);
