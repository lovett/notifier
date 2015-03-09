"use strict";

module.exports = {
    up: function(migration, DataTypes, done) {
        migration.describeTable('Messages').then(function (attributes) {
            if (!attributes.hasOwnProperty('pushbulletId')) {
                migration.addColumn('Messages', 'pushbulletId', DataTypes.STRING);
            }
            done();
        });
    },

    down: function(migration, DataTypes, done) {
        //migration.removeColumn('Messages', 'pushbulletId');
        done();
    }
};
