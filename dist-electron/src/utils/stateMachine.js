"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_DOWNLOAD_STATUSES = void 0;
exports.canTransition = canTransition;
exports.assertTransition = assertTransition;
exports.getAllowedTransitions = getAllowedTransitions;
const allowedTransitions = {
    queued: ["analyzing", "canceled"],
    analyzing: ["downloading", "failed", "canceled"],
    downloading: ["paused", "merging", "completed", "failed", "canceled"],
    paused: ["downloading", "canceled", "failed"],
    merging: ["converting", "failed", "canceled"],
    converting: ["completed", "failed", "canceled"],
    completed: [],
    failed: ["retrying"],
    canceled: ["retrying"],
    retrying: ["analyzing", "downloading"]
};
function canTransition(from, to) {
    return allowedTransitions[from].includes(to);
}
function assertTransition(from, to) {
    if (!canTransition(from, to)) {
        throw new Error(`Forbidden transition: ${from} -> ${to}`);
    }
}
function getAllowedTransitions(status) {
    return allowedTransitions[status];
}
exports.ALL_DOWNLOAD_STATUSES = [
    "queued",
    "analyzing",
    "downloading",
    "paused",
    "merging",
    "converting",
    "completed",
    "failed",
    "canceled",
    "retrying"
];
//# sourceMappingURL=stateMachine.js.map