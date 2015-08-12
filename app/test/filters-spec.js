describe('appFilters', function () {

    beforeEach(function () {
        angular.mock.module('appModule');
    });

    describe('reldate', function () {

        var reldate;

        beforeEach(angular.mock.inject(function ($filter) {
            reldate = $filter('reldate');
        }));

        it('should exist', function () {
            assert.isNotNull(reldate);
        });

        it('should not clobber its input', function () {
            var input, preResult, result;
            input = new Date();
            preResult = input.toString();
            result = reldate(input);
            assert.equal(input.toString(), preResult);
        });

        it('accepts a date object as input', function () {
            var input, result;
            input = new Date();
            result = reldate(input);
            assert.equal(result, 'today');
        });

        it('accepts a numeric unix timestamp as input', function () {
            var input, result;
            input = new Date().getTime();
            result = reldate(input);
            assert.equal(result, 'today');
        });

        it('accepts a string unix timestamp as input', function () {
            var input, result;
            input = new Date().getTime().toString();
            result = reldate(input);
            assert.equal(result, 'today');
        });

        it('correctly identifies yesterday', function () {
            var input, midnight, result;
            midnight = new Date();
            midnight.setHours(0, 0, 0, 0);

            // 11:59:59 PM of previous day
            input = midnight.getTime() - 1000;
            result = reldate(input);
            assert.equal(result, 'yesterday');

            // 11:00:00 PM of previous day
            input = midnight.getTime() - 60 * 60 * 1000;
            result = reldate(input);
            assert.equal(result, 'yesterday');

            // 11:59:59 PM of day before yesterday
            input = midnight.getTime() - 24 * 60 * 60 * 1000 - 1000;
            result = reldate(input);
            assert.equal(result, input);
        });

        it('correctly identifies tomorrow', function () {
            var input, midnight, result;
            midnight = new Date();
            midnight.setHours(0, 0, 0, 0);

            // 12:00:01 AM tomorrow
            input = midnight.getTime() + 24 * 60 * 60 * 1000 + 1000;
            result = reldate(input);
            assert.equal(result, 'tomorrow');

            // 12:00:01 AM of day after tomorrow
            input += 60 * 60 * 1000 * 24;
            result = reldate(input);
            assert.equal(result, input);
        });

        it('correctly identifies today', function () {
            var input, midnight, result;
            midnight = new Date();
            midnight.setHours(0, 0, 0, 0);

            // 12:00:00 AM
            input = midnight.getTime();
            result = reldate(input);
            assert.equal(result, 'today');

            // 11:59:59 PM
            input = midnight.getTime() + 60 * 60 * 1000 * 24 - 1000;
            result = reldate(input);
            assert.equal(result, 'today');

            // 12:00:00 AM tomorrow
            input = midnight.getTime() + 60 * 60 * 1000 * 24;
            result = reldate(input);
            assert.equal(result, 'tomorrow');
        });

        it('ignores invalid input', function () {
            var inputs = [false, 'test', 3.1459, null, undefined];
            inputs.forEach(function (input) {
                result = reldate(input);
                assert.equal(result, input);
            });
        });
    });
});
