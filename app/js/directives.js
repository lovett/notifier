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
            
            $window.applicationCache.addEventListener('updateready', function() {
                $log.info('An appcache update is ready, reloading');
                $rootScope.$broadcast('fullreload');
            });
        }
    };
}]);


appDirectives.directive('notifierTitle', [function () {
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
                    element.html('1 Message');
                } else {
                    element.html(size + ' Messages');
                }
            });

            scope.$on('connection:change', function (e, state) {
                var title = element.html().replace(symbolPattern, '');
                if (state !== 'connected') {
                    element.html(attrs.offlineSymbol + ' ' + title);
                }
            });
        }
    };
}]);
