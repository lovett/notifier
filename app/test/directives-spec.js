describe('appFilters', function () {

    beforeEach(function () {
        angular.mock.module('App');
    });

    describe('notifierOfflineEvent', function () {
        var window, scope, element;
        beforeEach(angular.mock.inject(function ($window, $compile, $rootScope) {
            window = $window;
            scope = $rootScope;
            element = angular.element('<div notifier-offline-event></div>');
            $compile(element)(scope);
            scope.$apply();
        }));

        it('fires a connection:change event when an offline event is fired', function () {
            var spy = sinon.spy(scope, '$broadcast');
            var event = new Event('offline');
            window.dispatchEvent(event);
            assert(spy.calledOnce);
            assert.equal(spy.args[0][0], 'connection:change');
            assert.equal(spy.args[0][1], event.type);
        });

        it('fires a connection:change event when an online event is fired', function () {
            var spy = sinon.spy(scope, '$broadcast');
            var event = new Event('online');
            window.dispatchEvent(event);
            assert(spy.calledOnce);
            assert.equal(spy.args[0][0], 'connection:change');
            assert.equal(spy.args[0][1], event.type);
        });
        
    });

    describe('notifierAppcacheReload', function () {
        var window, scope, element;
        beforeEach(angular.mock.inject(function ($window, $compile, $rootScope) {
            window = $window;
            scope = $rootScope;
            element = angular.element('<div notifier-appcache-reload></div>');
            $compile(element)(scope);
            scope.$apply();
        }));

        it('triggers a full page reload when the appcache is stale', function () {
            var spy = sinon.spy(scope, '$broadcast');
            var event = new Event('updateready');
            window.applicationCache.dispatchEvent(event);
            assert(spy.calledOnce);
            assert(spy.args[0][0], 'fullreload');
        });

        it('does nothing if applicationcache is not supported', angular.mock.inject(function ($window, $compile, $rootScope) {
            delete $window.applicationCache;
            scope = $rootScope;
            element = angular.element('<div notifier-appcache-reload></div>');
            $compile(element)(scope);
            scope.$apply();
            assert(element.hasClass('appcache-nope'));
        }));
        
        
    });
});
