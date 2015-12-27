'use strict';

module.exports = {
    up: function(migration, DataTypes, done) {
        var field, table;
        table = 'Messages';
        field = 'deliveredAt';
        migration.describeTable(table).then(function (attributes) {
            if (attributes.hasOwnProperty(field)) {
                done();
                return;
            }

            migration.addColumn(table, field, {
                type: DataTypes.TIME,
                allowNull: true
            }).then(done);
        });
    },

    down: function(migration, DataTypes, done) {
        done();
    }
};
