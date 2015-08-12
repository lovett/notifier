describe('appDirectives', function () {

    beforeEach(function () {
        angular.mock.module('appModule');
        angular.mock.module('templates');
    });

    describe('notifierOfflineEvent', function () {
        var element, scope, window;
        beforeEach(angular.mock.inject(function ($window, $compile, $rootScope) {
            window = $window;
            scope = $rootScope;
            element = angular.element('<div notifier-offline-event></div>');
            $compile(element)(scope);
            scope.$apply();
        }));

        it('fires a connection:change event when an offline event is fired', function () {
            var event, spy;
            spy = sinon.spy(scope, '$broadcast');
            event = new Event('offline');
            window.dispatchEvent(event);
            assert(spy.calledOnce);
            assert.equal(spy.args[0][0], 'connection:change');
            assert.equal(spy.args[0][1], event.type);
        });

        it('fires a connection:change event when an online event is fired', function () {
            var event, spy;
            spy = sinon.spy(scope, '$broadcast');
            event = new Event('online');
            window.dispatchEvent(event);
            assert(spy.calledOnce);
            assert.equal(spy.args[0][0], 'connection:change');
            assert.equal(spy.args[0][1], event.type);
        });

    });

    describe('notifierAppcacheReload', function () {
        var element, scope, window;
        beforeEach(angular.mock.inject(function ($window, $compile, $rootScope) {
            window = $window;
            scope = $rootScope;
            element = angular.element('<div notifier-appcache-reload></div>');
            $compile(element)(scope);
            scope.$apply();
        }));

        it('triggers a full page reload when the appcache is stale', function () {
            var event, stub;
            stub = sinon.stub(scope, 'fullReload');
            event = new Event('updateready');
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

    describe('notifierStatusBar', function () {
        var element, messageList, scope;

        beforeEach(angular.mock.inject(function ($compile, $rootScope, $log, $filter, MessageList) {
            scope = $rootScope;
            filter = $filter;
            element = angular.element('<notifier-status-bar></notifier-status-bar>');
            $compile(element)(scope);
            scope.$apply();
            messageList = MessageList;
        }));

        it('renders blank by default', function () {
            assert.equal(element.text(), '');
        });

        it('returns to default state following a reconnect', function () {
            scope.$emit('connection:change', 'offline');
            scope.$emit('connection:change', 'connected');
            assert.equal(element.text(), '');
        });

        it('returns to default state after coming back online', function () {
            scope.$emit('connection:change', 'offline');
            scope.$emit('connection:change', 'online');
            assert.equal(element.text(), '');
        });

        it('displays disconnected message when offline', function () {
            scope.$emit('connection:change', 'offline');
            assert.include(element.text(), 'offline');
        });

        it('displays disconnected message when disconnected', function () {
            scope.$emit('connection:change', 'disconnected');
            assert.include(element.text(), 'disconnected');
        });

        it('displays message tally if more than one group is present', function () {
            messageList.messages = [
                {title: 'test1', group: 'group1'},
                {title: 'test2', group: 'group2'}
            ];
            scope.$emit('queue:change');
            assert.equal(element.text(), '1 group1, 1 group2');
        });

        it('skips message tally if only one group is present', function () {
            messageList.messages = [
                {title: 'test1', group: 'group1'},
                {title: 'test2', group: 'group1'}
            ];
            scope.$emit('queue:change');
            assert.equal(element.text(), '');
        });

        it('identifies default messages as ungrouped', function () {
            messageList.messages = [
                {title: 'test1', group: 'default'},
                {title: 'test2', group: 'group1'}
            ];
            scope.$emit('queue:change');
            assert.equal(element.text(), '1 group1, 1 ungrouped');
        });

        it('alphabetizes groups when displaying message tally', function () {
            messageList.messages = [
                {title: 'test1', group: 'default'},
                {title: 'test2', group: 'agroup'},
                {title: 'test3', group: 'zgroup'}
            ];
            scope.$emit('queue:change');
            assert.equal(element.text(), '1 agroup, 1 ungrouped, 1 zgroup');
        });
    });

    describe('notifierSetScope', function () {
        var element, scope;

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
        var clearStub, element, isolateScope, scope;

        beforeEach(angular.mock.inject(function ($compile, $rootScope, MessageList) {
            scope = $rootScope;
            element = angular.element('<div notifier-message-options public-id="1"></div>');
            $compile(element)(scope);
            scope.$apply();
            isolateScope = element.isolateScope();
            clearStub = sinon.stub(MessageList, 'clear');
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
            scope.$broadcast('connection:change', 'offline');
            assert.isTrue(isolateScope.hidden);
        });

        it('renders hidden when disconnected', function () {
            scope.$broadcast('connection:change', 'disconnected');
            assert.isTrue(isolateScope.hidden);
        });

        it('removes a message from the queue when clear link is clicked', function () {
            isolateScope.clear();
            assert.isTrue(clearStub.calledWith('1'));
        });

    });

    describe('notifierBottomnav', function () {
        var element, isolateScope, purgeStub, scope;

        beforeEach(angular.mock.inject(function ($compile, $rootScope, MessageList, BrowserNotification) {
            BrowserNotification.state = 'unavailable';
            scope = $rootScope;
            element = angular.element('<footer notifier-bottomnav></footer>');
            $compile(element)(scope);
            scope.$apply();
            isolateScope = element.isolateScope();
            browserNotification = BrowserNotification;
            purgeStub = sinon.stub(MessageList, 'purge');
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
            scope.$broadcast('connection:change', 'disconnected');
            assert.isTrue(isolateScope.hideClearAll);
        });

        it('hides clear all link when offline', function () {
            scope.$broadcast('connection:change', 'offline');
            assert.isTrue(isolateScope.hideClearAll);
        });

        it('shows clear all link when not offline or disconnected and queue is not empty', function () {
            scope.$broadcast('queue:change', 1);
            scope.$broadcast('connection:change', 'foo');
            assert.isFalse(isolateScope.hideClearAll);
        });

        it('hides clear all link when queue is empty', function () {
            scope.$broadcast('queue:change', 0);
            assert.isTrue(isolateScope.hideClearAll);
        });

        it('shows clear all link when queue is not empty', function () {
            scope.$broadcast('queue:change', 1);
            assert.isFalse(isolateScope.hideClearAll);
        });
    });
});
