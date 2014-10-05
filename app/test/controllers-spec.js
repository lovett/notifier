describe('appControllers', function () {

    beforeEach(function () {
        angular.mock.module('App');
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
