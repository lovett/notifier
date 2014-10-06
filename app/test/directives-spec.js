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

    describe('notifierTitle', function () {
        var scope, element, title, symbol;

        title = 'Test';
        symbol = '~';
        
        beforeEach(angular.mock.inject(function ($compile, $rootScope) {
            scope = $rootScope;
            element = angular.element('<div notifier-title offline-symbol="' + symbol + '">' + title + '</div>');
            $compile(element)(scope);
            scope.$apply();
        }));

        it('sets a default title', function () {
            assert.equal(element.html(), 'Test');
        });

        it('displays default title when queue is empty', function () {
            scope.$emit('queue:change', 0);
            assert.equal(element.html(), title);
        });

        it('displays queue size when there are unread messages', function () {
            scope.$emit('queue:change', 1);
            assert.equal(element.html(), '1 Message');
            scope.$emit('queue:change', 2);
            assert.equal(element.html(), '2 Messages');
        });

        it('displays offline symbol when disconnected', function () {
            scope.$emit('connection:change', 'connected');
            assert.equal(element.html(), title);
            
            scope.$emit('connection:change', 'disconnected');
            assert.equal(element.html(), symbol + ' ' + title);
        });

        it('preserves existing title when displaying offline symbol', function () {
            element.html('foo');
            scope.$emit('connection:change', 'disconnected');
            assert.equal(element.html(), symbol + ' foo');
            element.html(title);
        });
        
        it('does not display offline symbol multiple times', function () {
            scope.$emit('connection:change', 'disconnected');
            scope.$emit('connection:change', 'disconnected');
            scope.$emit('connection:change', 'disconnected');
            assert.equal(element.html(), symbol + ' ' + title);
        });
        
    });
});
