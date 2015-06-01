describe('appDirectives', function () {

    beforeEach(function () {
        angular.mock.module('appModule');
        angular.mock.module('templates');
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
            var stub = sinon.stub(scope, 'fullReload');
            var event = new Event('updateready');
            window.applicationCache.dispatchEvent(event);
            assert(stub.calledOnce);
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

    describe('notifierConnectionStatus', function () {
        var scope, element;

        beforeEach(angular.mock.inject(function ($compile, $rootScope, $log, $filter) {
            scope = $rootScope;
            filter = $filter;
            element = angular.element('<notifier-connection-status></div>');
            $compile(element)(scope);
            scope.$apply();
        }));

        it('renders blank by default', function () {
            assert.equal(element.html(), '<span></span>');
        });

        it('clears app message when connected', function () {
            scope.$emit('connection:change', 'connected');
            assert.equal(element.html(), '<span class="state connected"></span>');
        });

        it('clears app message when online', function () {
            scope.$emit('connection:change', 'online');
            assert.equal(element.html(), '<span class="state connected"></span>');
        });

        it('displays disconnected message when offline', function () {
            var now = filter('date')(new Date(), 'shortTime');
            scope.$emit('connection:change', 'offline');
            assert.include(element.html(), 'Offline since');
            assert.include(element.html(), now);
        });

        it('displays disconnected message when disconnected', function () {
            var now = filter('date')(new Date(), 'shortTime');
            scope.$emit('connection:change', 'disconnected');
            assert.include(element.html(), 'Offline since');
            assert.include(element.html(), now);
        });
    });

    describe('notifierSetScope', function () {
        var scope, element;

        beforeEach(angular.mock.inject(function ($compile, $rootScope) {
            scope = $rootScope;
            element = angular.element('<meta content="123" notifier-set-scope="test"></meta>');
            $compile(element)(scope);
            scope.$apply();
        }));

        it('populates the scope with the value of the content attribute', function () {
            assert.equal(scope.test, '123');
        });

        it('only works on meta tags', angular.mock.inject(function ($compile, $rootScope) {
            scope = $rootScope;
            element = angular.element('<div content="456" notifier-set-scope="foo"></div>');
            $compile(element)(scope);
            scope.$apply();
            assert.isUndefined(scope.foo);
        }));
    });

    describe('notifierMessageOptions', function () {
        var scope, isolateScope, element, clearStub;

        beforeEach(angular.mock.inject(function ($compile, $rootScope, Queue) {
            scope = $rootScope;
            element = angular.element('<div notifier-message-options public-id="1"></div>');
            $compile(element)(scope);
            scope.$apply();
            isolateScope = element.isolateScope();
            clearStub = sinon.stub(Queue, 'clear');
        }));

        it('renders visible by default', function () {
            assert.isUndefined(scope.hidden);
            assert.isFalse(isolateScope.hidden);
        });

        it('receives public id via attribute', function () {
            assert.equal(isolateScope.publicId, '1');
        });

        it('adds a clear icon to container', function () {
            var children, icon;
            icon = element.find('SPAN').children()[0];
            assert.equal(icon.nodeName, 'svg');
            assert.equal(icon.getAttribute('class'), 'icon icon-close');
        });

        it('renders hidden when offline', function () {
            scope.$broadcast('connection:change', 'offline')
            assert.isTrue(isolateScope.hidden);
        });

        it('renders hidden when disconnected', function () {
            scope.$broadcast('connection:change', 'disconnected')
            assert.isTrue(isolateScope.hidden);
        });

        it('removes a message from the queue when clear link is clicked', function () {
            isolateScope.clear();
            assert.isTrue(clearStub.calledWith('1'));
        });

    });

    describe('notifierBottomnav', function () {
        var scope, isolateScope, element, purgeStub;

        beforeEach(angular.mock.inject(function ($compile, $rootScope, Queue, BrowserNotification) {
            BrowserNotification.state = 'unavailable';
            scope = $rootScope;
            element = angular.element('<footer notifier-bottomnav></footer>');
            $compile(element)(scope);
            scope.$apply();
            isolateScope = element.isolateScope();
            browserNotification = BrowserNotification;
            purgeStub = sinon.stub(Queue, 'purge');
        }));

        it('hides settings pane by default', function () {
            assert.isFalse(isolateScope.settingsVisible);
        });

        it('toggles the visibility of the settings pane', function () {
            isolateScope.settingsVisible = true;
            isolateScope.settings();
            assert.isFalse(isolateScope.settingsVisible);
            isolateScope.settings();
            assert.isTrue(isolateScope.settingsVisible);
        });

        it('hides clear all link by default', function () {
            assert.isTrue(isolateScope.hideClearAll);
        });

        it('purges the queue when the clear all link is clicked', function () {
            isolateScope.clearAll();
            assert.isTrue(purgeStub.called);
        });

        it('hides clear all link when disconnected', function () {
            scope.$broadcast('connection:change', 'disconnected')
            assert.isTrue(isolateScope.hideClearAll);
        });

        it('hides clear all link when offline', function () {
            scope.$broadcast('connection:change', 'offline')
            assert.isTrue(isolateScope.hideClearAll);
        });

        it('shows clear all link when not offline or disconnected and queue is not empty', function () {
            scope.$broadcast('queue:change', 1)
            scope.$broadcast('connection:change', 'foo')
            assert.isFalse(isolateScope.hideClearAll);
        });

        it('hides clear all link when queue is empty', function () {
            scope.$broadcast('queue:change', 0)
            assert.isTrue(isolateScope.hideClearAll);
        });

        it('shows clear all link when queue is not empty', function () {
            scope.$broadcast('queue:change', 1)
            assert.isFalse(isolateScope.hideClearAll);
        });
    });
});
