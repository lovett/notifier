'use strict';

module.exports = {
    up: function(migration, DataTypes, done) {
        migration.changeColumn('Tokens', 'value', {
            type: DataTypes.TEXT,
            allowNull: false
        }).complete(function (err) {
            if (err) {
                console.log(err);
            }
            done();
        });

    },

    down: function(migration, DataTypes, done) {
        migration.changeColumn('Tokens', 'value', {
            type: DataTypes.STRING(88),
            allowNull: false
        }).conplete(function (err) {
            if (err) {
                console.log(err);
            }
            done();
        });

    }
};
