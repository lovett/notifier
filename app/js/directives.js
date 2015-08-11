var appDirectives = angular.module('appDirectives', []);


appDirectives.directive('notifierFocus', [function () {
    'use strict';

    return {
        scope: {
            notifierFocus: '=notifierFocus'
        },
        link: function (scope, element) {
            scope.$watch('notifierFocus', function (isFocused) {
                if (isFocused === true) {
                    element[0].focus();
                }
            });
        }
    };
}]);

appDirectives.directive('notifierShortcuts', ['MessageList', '$rootScope', '$window', '$document', function (MessageList, $rootScope, $window, $document) {
        'use strict';

    var shortcutMap = {
        67: {
            key: 'C',
            label: '⇧  c',
            shiftKey: true,
            description: 'Clear all messages',
            action: function () {
                if (MessageList.messages.length > 0) {
                    MessageList.purge();
                }
            }
        },
        83: {
            key: 'S',
            label: '⇧  s',
            shiftKey: true,
            description: 'Toggle settings',
            action: function () {
                $rootScope.$broadcast('settings:toggle');
            }
        },
        76: {
            key: 'L',
            label: '⇧  l',
            shiftKey: true,
            description: 'Log out',
            action: function () {
                $rootScope.$broadcast('settings:logout');
            }
        },
        74: {
            key: 'j',
            shiftKey: false,
            description: 'Move to next message',
            action: function () {
                MessageList.focusNext();
            }
        },
        75: {
            key: 'k',
            shiftKey: false,
            description: 'Move to previous message',
            action: function () {
                MessageList.focusPrevious();
            }
        },
        88: {
            key: 'x',
            shiftKey: false,
            description: 'Clear active message',
            action: function () {
                MessageList.clearFocused();
            }
        },
        90: {
            key: 'Z',
            label: '⇧  z',
            shiftKey: true,
            description: 'Undo',
            action: function () {
                if (MessageList.canUnclear()) {
                    MessageList.unclear();
                }
            }
        },
        79: {
            key: 'o',
            shiftKey: false,
            description: 'Visit the link of the active message',
            action: function () {
                MessageList.visitLink();
            }
        },
        191: {
            key: '?',
            shiftKey: true,
            description: 'Toggle the shortcut list',
            action: function () {
                $rootScope.$broadcast('shortcuts:toggle');
            }
        },
        27: {
            key: 'esc',
            description: 'Hide the shortcut list; unfocus all messages',
            action: function () {
                MessageList.focusNone();
                $rootScope.$broadcast('shortcuts:hide');
            }
        }
    };

        return {
        templateUrl: '/views/shortcuts-summary.html',
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

                        angular.element($document[0]).bind('keyup', function (e) {
                var charCode = e.which || e.keyCode;

                if (!shortcutMap.hasOwnProperty(charCode)) {
                    return;
                }

                if (shortcutMap[charCode].shiftKey && !e.shiftKey) {
                    return;
                }

                shortcutMap[charCode].action();
                        });
                }
        };
}]);

appDirectives.directive('notifierOfflineEvent', ['$window', '$rootScope', function ($window, $rootScope) {
    'use strict';

    return {
        restrict: 'A',
        link: function () {
            var callback = function (event) {
                $rootScope.$broadcast('connection:change', event.type);
            };

            $window.addEventListener('online', callback);
            $window.addEventListener('offline', callback);
        }
    };
}]);

appDirectives.directive('notifierAppcacheReload', ['$window', '$rootScope', '$log', function ($window, $rootScope, $log) {
    'use strict';

    return {
        restrict: 'A',
        link: function (scope, element) {
            if (!$window.hasOwnProperty('applicationCache')) {
                element.addClass('appcache-nope');
                return;
            }

            scope.fullReload = function () {
                $window.location.reload();
            };

            $window.applicationCache.addEventListener('updateready', function() {
                $log.info('An appcache update is ready, requesting full reload');
                scope.fullReload();
            });
        }
    };
}]);


appDirectives.directive('notifierConnectionIcon', [function () {
    'use strict';
    return {
        restrict: 'A',
        link: function (scope, element) {
            scope.$on('connection:change', function () {
                element.addClass('hidden');
            });
        }
    };
}]);

appDirectives.directive('notifierStatusBar', ['$log', 'MessageList', function ($log, MessageList) {
    'use strict';
    return {
        restrict: 'E',
        template: '<div ng-class="{\'status-bar\': true, \'disconnected\': disconnected}">{{ message }}</div>',
        link: function (scope) {
            scope.$on('connection:change', function (e, state) {
                if (state === 'offline' || state === 'disconnected') {
                    scope.message = state;
                    scope.disconnected = true;
                } else {
                    scope.disconnected = false;
                    scope.message = '';
                }
                scope.$apply();
            });

            scope.$on('queue:change', function () {
                var tallys, summary;

                tallys = MessageList.messages.reduce(function (accumulator, message) {
                    if (!accumulator.hasOwnProperty(message.group)) {
                        accumulator[message.group] = 1;
                    } else {
                        accumulator[message.group] += 1;
                    }
                    return accumulator;
                }, {});

                summary = [];
                Object.keys(tallys).forEach(function (group) {
                    var displayName = (group === 'default') ? 'ungrouped' : group;
                    summary.push(tallys[group] + ' ' + displayName);
                });

                if (summary.length > 1) {
                    scope.message = summary.sort().join(', ');
                } else {
                    scope.message = '';
                }
                scope.$apply();
            });
        }
    };
}]);


appDirectives.directive('notifierSetScope', function () {
    'use strict';
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            if (element[0].nodeName.toLowerCase() !== 'meta') {
                return;
            }
            scope[attrs.notifierSetScope] = attrs.content;
        }
    };
});

appDirectives.directive('notifierMessageOptions', ['MessageList', function (MessageList) {
    'use strict';

    return {
        restrict: 'A',
        template: '<a ng-href="#" ng-click="clear()" ng-hide="hidden"><span><svg role="img" aria-label="Close icon" class="icon icon-close"><use xlink:href="#icon-close"></use></svg></span></a>',
        scope: {
            'publicId': '@'
        },
        link: function (scope) {
            scope.hidden = false;
            scope.$on('connection:change', function (e, state) {
                scope.hidden = (state === 'offline' || state === 'disconnected');
            });

            scope.clear = function () {
                MessageList.clear(scope.publicId);
            };
        }
    };
}]);

appDirectives.directive('notifierBottomnav', ['BrowserNotification', 'MessageList', 'User', '$window', '$document', function (BrowserNotification, MessageList, User, $window, $document) {
    'use strict';

    return {
        restrict: 'A',
        templateUrl: '/views/bottomnav.html',
        scope: {},
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
                $window.location = '/logout';
            });

            scope.$on('settings:browserNotifications', function (e, state) {
                scope.state.bn = state;
            });

            scope.state = {
                bn: BrowserNotification.state
            };

            scope.settingsVisible = false;


            scope.enable = function (service) {
                if (service === 'bn') {
                    BrowserNotification.enable();
                }
            };

            scope.toggle = function (service) {
                if (scope.state[service] === 'active') {
                    User.deauthorize(service, function () {
                        delete scope.state[service];
                    });
                } else {
                    User.authorize(service, function (url) {
                        $window.location.href = url;
                    });
                }
            };

            scope.settings = function (state) {
                if (state !== undefined) {
                    scope.settingsVisible = state;
                } else {
                    scope.settingsVisible = !scope.settingsVisible;
                }

                if (scope.settingsVisible === false) {
                    return;
                }

                User.getServices(function (services) {
                    services.forEach(function (service) {
                        scope.state[service] = 'active';
                    });
                    $window.scrollTo(0, $document[0].body.clientHeight);
                });
            };

            scope.logOut = function () {
                scope.$broadcast('settings:logout');
            };
        }
    };
}]);
