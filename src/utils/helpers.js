// src/utils/helpers.js
// Contains general utility functions.

import { ROLE_TEMPLATES, ROLE_IMAGE_BASE_PATH } from '../config/constants.js';
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
 * @returns {string} A UUID-like string.
 */
export function generateUuidFallback() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Generates a random 5-digit room ID.
 * @returns {string} The generated room ID.
 */
export function generateRoomId() {
    return Math.floor(10000 + Math.random() * 90000).toString();
}

/**
 * Finds a role object from ROLE_TEMPLATES by name.
 * @param {string} roleName - The name of the role.
 * @returns {object|undefined} The role object or undefined if not found.
 */
export function getRoleTemplate(roleName) {
    return ROLE_TEMPLATES.find(role => role.name === roleName);
}

/**
 * Generates a standardized role name from a given name.
 * Converts to lowercase and replaces spaces with hyphens.
 * @param {string} name - The original role name (e.g., "Spell Caster").
 * @returns {string} The standardized name (e.g., "spell-caster").
 */
export function standardizeRoleName(name) {
    return name.toLowerCase().replace(/\s/g, '-');
}

/**
 * Gets the image path for a given role.
 * It first tries to get the image from the room's `role_image_map` for consistency.
 * If not found (e.g., for "Nobody" or during initial setup before the map is fully populated),
 * it falls back to generating a random variant.
 * @param {string} roleName - The name of the role (e.g., "Villager").
 * @param {object|null} currentRoomData - The current room data, containing game_data and role_image_map. Can be null.
 * @returns {string} The full path to the selected image.
 */
export function getRoleImagePath(roleName, currentRoomData = null) { // Added default null
    const standardizedName = standardizeRoleName(roleName);

    // Try to get the image from the room's synchronized role_image_map
    if (currentRoomData && currentRoomData.game_data && currentRoomData.game_data.role_image_map) {
        const mappedPath = currentRoomData.game_data.role_image_map[roleName];
        if (mappedPath) {
            return mappedPath;
        }
    }

    // Fallback: If no synchronized map or role not in map, generate a random variant
    const roleTemplate = ROLE_TEMPLATES.find(role => standardizeRoleName(role.name) === standardizedName);

    let count = 1; // Default variant count
    let finalRoleNameForPath = roleName; // The role name to use for the path

    if (roleTemplate && typeof roleTemplate['variant-count'] === 'number' && roleTemplate['variant-count'] >= 1) {
        count = roleTemplate['variant-count'];
    } else {
        // Fallback to "Nobody" if role or variant-count is invalid/missing
        console.warn(`[WARNING] Invalid or missing variant-count for role: ${roleName}. Falling back to "nobody".`);
        const nobodyTemplate = ROLE_TEMPLATES.find(role => standardizeRoleName(role.name) === standardizeRoleName("Nobody"));
        if (nobodyTemplate && typeof nobodyTemplate['variant-count'] === 'number' && nobodyTemplate['variant-count'] >= 1) {
            count = nobodyTemplate['variant-count'];
            finalRoleNameForPath = "Nobody"; // Use nobody's name for image path
        } else {
            console.error('[ERROR] No valid variant-count found for "Nobody" role. Cannot generate image path.');
            // Emergency fallback to a generic error placeholder if "Nobody" also fails
            return `https://placehold.co/180x180/ff0000/ffffff?text=Image+Error`;
        }
    }

    // Generate a random variant number (1 to count)
    const randomVariant = Math.floor(Math.random() * count) + 1;

    // Construct the image file name using the standardized name and variant
    const fileName = `${standardizeRoleName(finalRoleNameForPath)}-v-${randomVariant}.jpeg`;

    // Return the full image path
    return `${ROLE_IMAGE_BASE_PATH}${fileName}`;
}

/**
 * Converts a hex color string to an RGBA string.
 * @param {string} hex - The hex color string (e.g., "#RRGGBB").
 * @param {number} alpha - The alpha transparency value (0.0 to 1.0).
 * @returns {string} The RGBA color string.
 */
export function hexToRgba(hex, alpha) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 7) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Fetches an image and converts it to a base64 data URL, caching the result.
 * @param {string} url - The URL of the image to fetch.
 * @returns {Promise<string>} A promise that resolves with the base64 data URL.
 */
export async function getBase64Image(url) {
    // If already in cache, return immediately
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