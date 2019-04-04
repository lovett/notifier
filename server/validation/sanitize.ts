import * as sanitizeHtml from 'sanitize-html';

/**
 * Remove all markup from a value
 *
 */
export function strictSanitize(value: string) {
    const config = {
        allowedAttributes: {},
        allowedTags: [] as string[],
        textFilter(text: string) {
            return text.replace(/&quot;/g, '"');
        },
    };

    return sanitizeHtml(value, config);
}

/**
 * Filter markup from a value based on a whitelist
 *
 */
export function tolerantSanitize(value: string) {
    const config = {
        allowedAttributes: {
            a: ['href'],
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p'],
        textFilter(text: string) {
            return text.replace(/&quot;/g, '"');
        },
    };

    return sanitizeHtml(value, config);
}
