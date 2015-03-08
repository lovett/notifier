"use strict";

module.exports = {
    up: function(migration, DataTypes, done) {
        migration.addColumn('Messages', 'pushbulletId', DataTypes.STRING);
        done();
    },

    down: function(migration, DataTypes, done) {
        //migration.removeColumn('Messages', 'pushbulletId');
        done();
    }
};
