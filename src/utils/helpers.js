// src/utils/helpers.js
// Contains general utility functions.

// Removed direct import of ROLE_TEMPLATES from here.
// It will now be passed as an argument to getRoleTemplate.
import { ROLE_IMAGE_BASE_PATH } from '../config/constants.js';
import { messageBox } from '../config/dom-elements.js';

let imageCache = new Map(); // Global image cache for this module

/**
 * Displays a message in the message box.
 * @param {string} message - The message to display.
 * @param {string} type - 'success', 'error', or 'info' for styling.
 */
export function showMessage(message, type = 'info') {
    messageBox.textContent = message;
    messageBox.className = 'message-box'; // Reset classes
    if (type === 'success') {
        messageBox.classList.add('bg-green-600', 'text-white');
    } else if (type === 'error') {
        messageBox.classList.add('error'); /* Use custom class for error */
    } else {
        messageBox.classList.add('info'); /* Use custom class for info */
    }
    messageBox.classList.remove('hidden');
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 5000); // Hide after 5 seconds
}

/**
 * Generates a random 6-digit number string.
 * @returns {string} A 6-digit string.
 */
export function generateShortId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Fallback for UUID generation if crypto.randomUUID is not available.
 * @returns {string} A UUID string.
 */
export function generateUuidFallback() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
}

/**
 * Gets a role template by name from a provided array of role templates.
 * @param {string} roleName - The name of the role.
 * @param {Array<Object>} allRoleTemplates - The array of all role templates to search within.
 * @returns {object|undefined} The role template object, or undefined if not found.
 */
export function getRoleTemplate(roleName, allRoleTemplates) {
    console.log('[DEBUG] [getRoleTemplate] allRoleTemplates received:', allRoleTemplates); // Added debug log
    if (!allRoleTemplates || !Array.isArray(allRoleTemplates)) {
        console.error('[ERROR] Invalid or undefined allRoleTemplates array provided to getRoleTemplate.');
        return undefined;
    }
    return allRoleTemplates.find(role => role.name === roleName);
}

/**
 * Converts a hex color to rgba.
 * @param {string} hex - The hex color string (e.g., "#RRGGBB").
 * @param {number} alpha - The alpha transparency (0-1).
 * @returns {string} The rgba color string.
 */
export function hexToRgba(hex, alpha) {
    let r = 0, g = 0, b = 0;
    // Handle #RGB format
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Standardizes a role name (e.g., removes spaces and converts to lowercase).
 * @param {string} name - The role name to standardize.
 * @returns {string} The standardized role name.
 */
export function standardizeRoleName(name) {
    return name.toLowerCase().replace(/\s/g, '');
}

/**
 * Gets the image path for a given role.
 * @param {string} roleName - The name of the role.
 * @returns {string} The path to the role's image.
 */
export function getRoleImagePath(roleName) {
    const standardizedName = standardizeRoleName(roleName);
    // Assuming role images are in /images/roles/ and named after standardized role names
    return `${ROLE_IMAGE_BASE_PATH}${standardizedName}.jpg`;
}

/**
 * Fetches an image and converts it to a Base64 string, with caching.
 * @param {string} url - The URL of the image.
 * @returns {Promise<string>} A promise that resolves with the Base64 image string or a fallback.
 */
export async function getBase64Image(url) {
    if (imageCache.has(url)) {
        return imageCache.get(url);
    }
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`[WARNING] Failed to fetch image from ${url}. Status: ${response.status}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result;
                imageCache.set(url, base64data); // Cache the base64 data
                resolve(base64data);
            };
            reader.onerror = (e) => {
                console.error(`[ERROR] FileReader error for ${url}:`, e);
                reject(new Error(`FileReader error: ${e.message}`));
            };
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error(`[ERROR] Error fetching or converting image ${url}:`, error);
        // Fallback to a generic "broken image" placeholder
        const fallbackImage = `https://placehold.co/180x180/ff0000/ffffff?text=Image+Error`;
        imageCache.set(url, fallbackImage); // Cache the fallback to avoid repeated errors
        return fallbackImage;
    }
}

/**
 * Shuffles an array in place.
 * @param {Array} array - The array to shuffle.
 */
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
