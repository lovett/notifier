'use strict';

module.exports = {
    up: function(migration, DataTypes, done) {
        migration.changeColumn('Tokens', 'value', {
            type: DataTypes.TEXT,
            allowNull: false
        }).then(done);
    },

    down: function(migration, DataTypes, done) {
        done();
    }
};
