"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var serveFavicon = require("serve-favicon");
function default_1(public_dir) {
    return serveFavicon(public_dir + '/favicon/favicon.ico');
}
exports.default = default_1;
//# sourceMappingURL=favicon.js.map