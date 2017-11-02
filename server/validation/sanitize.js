"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sanitizeHtml = require("sanitize-html");
/**
 * Remove all markup from a value
 *
 */
function strictSanitize(value) {
    let config = {
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
/**
 * Filter markup from a value based on a whitelist
 *
 */
function tolerantSanitize(value) {
    let config = {
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
