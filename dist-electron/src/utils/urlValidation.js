"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quickAddSchema = void 0;
exports.isYouTubeUrl = isYouTubeUrl;
const zod_1 = require("zod");
exports.quickAddSchema = zod_1.z.object({
    url: zod_1.z
        .string()
        .trim()
        .min(1, "validation.emptyUrl")
        .url("validation.invalidUrl")
});
function isYouTubeUrl(url) {
    try {
        const parsed = new URL(url);
        return ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(parsed.hostname.toLowerCase());
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=urlValidation.js.map