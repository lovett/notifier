'use strict';

module.exports = {
    up: function(migration, DataTypes, done) {
        migration.addColumn('Messages', 'deliveredAt', {
            type: DataTypes.DATE,
            allowNull: true
        }).complete(function (err) {
            if (err) {
                console.log(err);
            }
            done();
        });

    },

    down: function(migration, DataTypes, done) {
        migration.removeColumn('Messages', 'deliveredAt', {
            type: DataTypes.DATE,
            allowNull: true
        }).conplete(function (err) {
            if (err) {
                console.log(err);
            }
            done();
        });

    }
};
