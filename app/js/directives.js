var appDirectives = angular.module('appDirectives', []);

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


appDirectives.directive('notifierTitle', function () {
    'use strict';
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var symbolPattern = new RegExp('^(' + attrs.offlineSymbol + ' )?');
            var defaultTitle = element.html();

            scope.$on('queue:change', function (e, size) {
                if (size === 0) {
                    element.html(defaultTitle);
                } else if (size === 1) {
                    element.html('1 message');
                } else {
                    element.html(size + ' messages');
                }
            });

            scope.$on('connection:change', function (e, state) {
                var title = element.html().replace(symbolPattern, '');
                if (state === 'disconnected') {
                    element.html(attrs.offlineSymbol + ' ' + title);
                } else {
                    element.html(title);
                }
            });
        }
    };
});

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

appDirectives.directive('notifierConnectionStatus', ['$log', '$filter', function ($log, $filter) {
    'use strict';
    return {
        restrict: 'E',
        template: '<span></span>',
        link: function (scope, element) {
            var children = element.children();
            var label = angular.element(children[0]);

            scope.$on('connection:change', function (e, state) {
                var now = $filter('date')(new Date(), 'shortTime');
                $log.info(state + ' at ' + now);

                if (state === 'offline' || state === 'disconnected') {
                    label.text('Offline since ' + now);
                    label.attr('class', 'state disconnected');
                } else {
                    label.text('');
                    label.attr('class', 'state connected');
                }
            });

            scope.$on('queue:change', function (e, size) {
                if (size > 3) {
                    label.text(size + ' messages');
                } else {
                    label.text('');
                }
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

appDirectives.directive('notifierMessageOptions', ['Queue', function (Queue) {
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
                Queue.clear(scope.publicId);
            };
        }
    };
}]);

appDirectives.directive('notifierBottomnav', ['BrowserNotification', 'Queue', 'User', '$window', '$document', function (BrowserNotification, Queue, User, $window, $document) {
    'use strict';

    return {
        restrict: 'A',
        templateUrl: '/views/bottomnav.html',
        scope: {},
        link: function (scope) {
            scope.queueSize = 0;

            scope.hideClearAll = true;

            scope.clearAll = function () {
                Queue.purge();
            };

            scope.$on('connection:change', function (e, state) {
                scope.hideClearAll = scope.queueSize === 0 || state === 'offline' || state === 'disconnected';
            });

            scope.$on('queue:change', function (e, size) {
                scope.queueSize = size;
                scope.hideClearAll = (size === 0);
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

            scope.settings = function () {
                scope.settingsVisible = !scope.settingsVisible;

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

            scope.$on('settings:browserNotifications', function (e, state) {
                scope.state.bn = state;
            });
        }
    };
}]);
