'use strict';

module.exports = {
    up: function(migration, DataTypes, done) {
        migration.addColumn('Messages', 'expiresAt', {
            type: DataTypes.TIME,
            allowNull: true
        }).then(done).catch(function (err) {
            console.log(err);
        });
    },

    down: function(migration, DataTypes, done) {
        migration.removeColumn('Messages', 'expiresAt').then(done).catch(function (err) {
            console.log(err);
        });
    }
};
