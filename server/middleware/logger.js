"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var morgan = require("morgan");
function default_1(log_path) {
    var stream = fs.createWriteStream(log_path, { flags: 'a' });
    return morgan('combined', { stream: stream });
}
exports.default = default_1;
//# sourceMappingURL=logger.js.map