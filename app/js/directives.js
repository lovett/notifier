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


