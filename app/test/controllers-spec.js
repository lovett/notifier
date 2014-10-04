describe('appControllers', function () {

    beforeEach(function () {
        angular.mock.module('App');
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
