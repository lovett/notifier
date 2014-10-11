describe('appControllers', function () {

    beforeEach(function () {
        angular.mock.module('App');
    });

    describe('MessageController', function () {
        var controller, scope, rootScope, tokenKeyStub, pathStub, fayeInitStub, fayeSubscribeStub, userReplaceChannelStub, fayeUnsubscribeStub, fayeDisconnectStub;

        describe('when accessed with a login', function () {
            beforeEach(angular.mock.inject(function($controller, $rootScope, $location, $log, User, Faye) {
                scope = $rootScope.$new();
                rootScope = $rootScope;
                tokenKeyStub = sinon.stub(User, 'getTokenKey').returns(true);
                pathStub = sinon.stub($location, 'path');
                fayeInitStub = sinon.stub(Faye, 'init');
                fayeSubscribeStub = sinon.stub(Faye, 'subscribe');
                fayeUnsubscribeStub = sinon.stub(Faye, 'unsubscribe');
                userReplaceChannelStub = sinon.stub(User, 'replaceChannel');
                fayeDisconnectStub = sinon.stub(Faye, 'disconnect');
                
                controller = $controller('MessageController', {
                    $scope: scope,
                    $rootScope: $rootScope,
                    $location: $location,
                    $log: $log,
                    User: User,
                    Faye: Faye
                });
            }));

            it('does not redirect to login', function () {
                assert.isFalse(pathStub.called);
            });

            it('sets application message', function () {
                assert.isString(rootScope.appMessage);
            });

            it('updates application message when queue is empty', function () {
                var channel = 'test';
                scope.$broadcast('queue:change', 0);
                assert.equal(scope.appMessage, 'No new messages.');
            });

            it('clears application message when queue is populated', function () {
                var channel = 'test';
                scope.$broadcast('queue:change', 1);
                assert.isUndefined(scope.appMessage);
            });

            it('opens Faye connection and subscribes', function () {
                assert.isTrue(fayeInitStub.calledOnce);
                assert.isTrue(fayeSubscribeStub.calledOnce);
            });

            it('listens for connection resubscribe events', function () {
                var channel = 'test';
                scope.$broadcast('connection:resubscribe', channel);
                assert.isTrue(fayeUnsubscribeStub.calledOnce);
                assert.isTrue(userReplaceChannelStub.calledWith(channel));
                assert.isTrue(userReplaceChannelStub.calledOnce);
            });

            it('listens for offline connection change event', function () {
                scope.$broadcast('connection:change', 'offline');
                assert.isTrue(fayeDisconnectStub.calledOnce);
            });

            it('listens for online connection change event', function () {
                scope.$broadcast('connection:change', 'online');
                assert.isTrue(fayeInitStub.calledTwice);
                assert.isTrue(fayeSubscribeStub.calledTwice);
            });
            
        });
        
        describe('when accessed without a login', function () {
            beforeEach(angular.mock.inject(function($controller, $rootScope, $location, $log, User, Faye) {
                scope = $rootScope.$new();
                rootScope = $rootScope;
                tokenKeyStub = sinon.stub(User, 'getTokenKey').returns(false);
                pathStub = sinon.stub($location, 'path');
                controller = $controller('MessageController', {
                    $scope: scope,
                    $rootScope: $rootScope,
                    $location: $location,
                    $log: $log,
                    User: User,
                    Faye: Faye
                });
            }));
            
            it('redirects to login', function () {
                assert.isTrue(pathStub.called);                    
            });

            it('does not set an application message', function () {
                assert.isUndefined(rootScope.appMessage);
            });

            it('does not listen for connection resubscribe events', function () {
                var spy = sinon.spy(scope, '$broadcast');
                var event = new Event('connection:resubscribe');
                window.dispatchEvent(event);
                assert(spy.notCalled);
            });

            it('does not listen for connection change events', function () {
                var spy = sinon.spy(scope, '$broadcast');
                var event = new Event('connection:change');
                window.dispatchEvent(event);
                assert(spy.notCalled);
            });
        });
    });

    describe('LoginController', function () {
        var controller, scope, loginStub, loginPromise;

        beforeEach(angular.mock.inject(function ($q, $controller, $rootScope, $location, User) {
            scope = $rootScope.$new();
            loginPromise = $q.defer();
            loginStub = sinon.stub(User, 'logIn').returns(loginPromise.promise);
            pathStub = sinon.stub($location, 'path');
            controller = $controller('LoginController', {
                $scope: scope,
                $location: $location,
                User: User
            });
        }));

        it('defines submit handler', function () {
            assert.isDefined(scope.submitLogin);
        });

        describe('submit handler', function () {
            it('sets error message', function () {
                var form = {};
                form.$invalid = true;
                scope.submitLogin(form);
                assert.isString(scope.message);
            });

            it('sets progress message', function () {
                var form = {};
                scope.submitLogin(form);
                assert.isNull(scope.message);
                assert.isString(scope.progress);
            });

            it('redirects on successful login', function () {
                loginPromise.resolve();
                scope.submitLogin({});
                scope.$digest();
                assert.isTrue(pathStub.called);
                assert.isNull(scope.message);
            });

            it('sets error message on failed login', function () {
                loginPromise.reject();
                scope.submitLogin({});
                scope.$digest();
                assert.isFalse(pathStub.called);
                assert.isString(scope.message);
                assert.isNull(scope.progress);
            });
        });
    });

    describe('LogoutController', function () {
        var controller, scope, tokenKeyStub, logoutStub, disconnectStub, emptyStub, pathStub;
        
        describe('when accessed as a logged out user', function () {
            
            beforeEach(angular.mock.inject(function ($controller, $rootScope, $location, User, Faye, Queue) {
                scope = $rootScope.$new();
                tokenKeyStub = sinon.stub(User, 'getTokenKey').returns(false);
                logoutStub = sinon.stub(User, 'logOut');
                disconnectStub = sinon.stub(Faye, 'disconnect');
                emptyStub = sinon.stub(Queue, 'empty');
                pathStub = sinon.stub($location, 'path');

                controller = $controller('LogoutController', {
                    $scope: scope,
                    $location: $location,
                    User: User,
                    Faye: Faye,
                    Queue: Queue
                });
            }));

            it('does not perform logout steps', function () {
                assert.isFalse(logoutStub.called);
                assert.isFalse(disconnectStub.called);
                assert.isFalse(emptyStub.called);
                assert.isDefined(scope.visitLogin);
                scope.visitLogin();
                assert.isTrue(pathStub.called);
            });

        });

        describe('when access as a logged in user', function () {
            beforeEach(angular.mock.inject(function ($controller, $rootScope, $location, User, Faye, Queue) {
                scope = $rootScope.$new();
                tokenKeyStub = sinon.stub(User, 'getTokenKey').returns(true);
                logoutStub = sinon.stub(User, 'logOut');
                disconnectStub = sinon.stub(Faye, 'disconnect');
                emptyStub = sinon.stub(Queue, 'empty');
                pathStub = sinon.stub($location, 'path');

                controller = $controller('LogoutController', {
                    $scope: scope,
                    $location: $location,
                    User: User,
                    Faye: Faye,
                    Queue: Queue
                });
            }));

            it('performs logout steps', function () {
                assert.isTrue(logoutStub.called);
                assert.isTrue(disconnectStub.called);
                assert.isTrue(emptyStub.called);
                assert.isDefined(scope.visitLogin);
                scope.visitLogin();
            });
        });
    });
});
