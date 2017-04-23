let sanitizeHtml = require('sanitize-html');

/**
 * Remove all markup from a value
 *
 */
exports.strictSanitize = (value) => {
    let config = {
        allowedTags: [],
        allowedAttributes: {},
        textFilter: function (text) {
            return text.replace(/&quot;/g, '"');
        }
    };

    return sanitizeHtml(value, config);
};

exports.tolerantSanitize = (value) => {
    let config = {
        allowedTags: [ 'b', 'i', 'em', 'strong', 'a', 'p' ],
        allowedAttributes: {
            'a': [ 'href' ]
        },
        textFilter: function (text) {
            return text.replace(/&quot;/g, '"');
        },
        allowedSchemes: [ 'http', 'https', 'mailto' ]
    };

    return sanitizeHtml(value, config);
};


module.exports = exports;
