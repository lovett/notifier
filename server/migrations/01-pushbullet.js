'use strict';

module.exports = {
    up: function(migration, DataTypes, done) {
        migration.describeTable('Messages').then(function (attributes) {
            if (attributes.hasOwnProperty('pushbulletId')) {
                done();
            }

            migration.addColumn('Messages', 'pushbulletId', DataTypes.STRING).then(done);
        });
    },

    down: function(migration, DataTypes, done) {
        done();
    }
};
