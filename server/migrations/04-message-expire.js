'use strict';

module.exports = {
    up: function(migration, DataTypes, done) {
        migration.addColumn('Messages', 'expiresAt', {
            type: DataTypes.DATE,
            allowNull: true
        }).then(function (err) {
            if (err) {
                console.log(err);
            }
            done();
        });

    },

    down: function(migration, DataTypes, done) {
        migration.removeColumn('Messages', 'expiresAt', {
            type: DataTypes.DATE,
            allowNull: true
        }).then(function (err) {
            if (err) {
                console.log(err);
            }
            done();
        });

    }
};
