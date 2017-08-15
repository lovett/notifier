import * as sanitizeHtml from "sanitize-html"

/**
 * Remove all markup from a value
 *
 */
export function strictSanitize (value: string) {
    let config = {
        allowedTags: [] as string[],
        allowedAttributes: {},
        textFilter: function (text: string) {
            return text.replace(/&quot;/g, '"');
        }
    };

    return sanitizeHtml(value, config);
};

/**
 * Filter markup from a value based on a whitelist
 *
 */
export function tolerantSanitize (value: string) {
    let config = {
        allowedTags: [ 'b', 'i', 'em', 'strong', 'a', 'p' ],
        allowedAttributes: {
            'a': [ 'href' ]
        },
        textFilter: function (text: string) {
            return text.replace(/&quot;/g, '"');
        },
        allowedSchemes: [ 'http', 'https', 'mailto' ]
    };

    return sanitizeHtml(value, config);
}
