"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var sanitizeHtml = require("sanitize-html");
function strictSanitize(value) {
    var config = {
        allowedTags: [],
        allowedAttributes: {},
        textFilter: function (text) {
            return text.replace(/&quot;/g, '"');
        }
    };
    return sanitizeHtml(value, config);
}
exports.strictSanitize = strictSanitize;
;
function tolerantSanitize(value) {
    var config = {
        allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p'],
        allowedAttributes: {
            'a': ['href']
        },
        textFilter: function (text) {
            return text.replace(/&quot;/g, '"');
        },
        allowedSchemes: ['http', 'https', 'mailto']
    };
    return sanitizeHtml(value, config);
}
exports.tolerantSanitize = tolerantSanitize;
//# sourceMappingURL=sanitize.js.map