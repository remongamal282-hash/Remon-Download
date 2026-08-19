"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setFileSystemOperations = setFileSystemOperations;
exports.setAppPathProvider = setAppPathProvider;
exports.resetToRealImplementations = resetToRealImplementations;
exports.getStoragePath = getStoragePath;
exports.ensureStorageDirectory = ensureStorageDirectory;
exports.readJsonFile = readJsonFile;
exports.writeJsonFile = writeJsonFile;
const fs_1 = require("fs");
const path_1 = require("path");
const electron_1 = require("electron");
/**
 * Real file system operations
 */
const realFs = {
    mkdir: (path, options) => fs_1.promises.mkdir(path, options).then(() => undefined),
    readFile: (path, encoding) => fs_1.promises.readFile(path, encoding),
    writeFile: (path, data, encoding) => fs_1.promises.writeFile(path, data, encoding),
};
/**
 * Real app path provider
 */
const realApp = {
    getUserDataPath: () => electron_1.app.getPath('userData'),
};
/**
 * Storage configuration
 */
let fsOps = realFs;
let appPath = realApp;
/**
 * Set custom file system operations (for testing)
 */
function setFileSystemOperations(ops) {
    fsOps = ops;
}
/**
 * Set custom app path provider (for testing)
 */
function setAppPathProvider(provider) {
    appPath = provider;
}
/**
 * Reset to real implementations (for testing cleanup)
 */
function resetToRealImplementations() {
    fsOps = realFs;
    appPath = realApp;
}
/**
 * Get the full path for a storage file in the app's userData directory
 * @param filename - Name of the file (e.g., 'history.json')
 * @returns Full path to the file
 */
function getStoragePath(filename) {
    const userDataPath = appPath.getUserDataPath();
    return (0, path_1.join)(userDataPath, 'remon-download', filename);
}
/**
 * Ensure the storage directory exists
 * Creates the directory recursively if it doesn't exist
 */
async function ensureStorageDirectory() {
    const userDataPath = appPath.getUserDataPath();
    const storageDir = (0, path_1.join)(userDataPath, 'remon-download');
    await fsOps.mkdir(storageDir, { recursive: true });
}
/**
 * Read and parse a JSON file from storage
 * @param filename - Name of the file (e.g., 'history.json')
 * @param fallback - Fallback value if file doesn't exist or is invalid
 * @returns Parsed JSON data or fallback
 */
async function readJsonFile(filename, fallback) {
    try {
        const filePath = getStoragePath(filename);
        const fileContent = await fsOps.readFile(filePath, 'utf-8');
        // Return fallback if file is empty
        if (!fileContent || fileContent.trim() === '') {
            return fallback;
        }
        const parsed = JSON.parse(fileContent);
        return parsed;
    }
    catch (error) {
        // Return fallback if file doesn't exist
        if (error.code === 'ENOENT') {
            return fallback;
        }
        // Return fallback if JSON is invalid
        if (error instanceof SyntaxError) {
            console.warn(`[fileStorage] Invalid JSON in ${filename}, using fallback:`, error.message);
            return fallback;
        }
        // Propagate other errors (permission denied, disk errors, etc.)
        throw error;
    }
}
/**
 * Write data to a JSON file in storage
 * @param filename - Name of the file (e.g., 'history.json')
 * @param data - Data to write (will be JSON.stringified)
 */
async function writeJsonFile(filename, data) {
    // Ensure directory exists before writing
    await ensureStorageDirectory();
    const filePath = getStoragePath(filename);
    const jsonString = JSON.stringify(data, null, 2);
    await fsOps.writeFile(filePath, jsonString, 'utf-8');
}
//# sourceMappingURL=fileStorage.js.map