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

appDirectives.directive('notifierAppcacheReload', ['$window', '$log', function ($window, $log) {
    'use strict';

    return {
        restrict: 'A',
        link: function () {
            if ($window.applicationCache) {
                $window.applicationCache.addEventListener('updateready', function() {
                    $log.info('An appcache update is ready, reloading');
                    $window.location.reload();
                });
            }
        }
    };
}]);


