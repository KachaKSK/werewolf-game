// src/utils/helpers.js
// Contains various helper functions used throughout the application.

import { ROLE_IMAGE_BASE_PATH, GEM_DATA, ROLE_TEMPLATES, NOBODY_IMAGE_PATH } from '../config/constants.js';

let imageCache = new Map(); // Global image cache

/**
 * Displays a message to the user in the message box.
 * @param {string} message - The message to display.
 * @param {string} type - The type of message ('info', 'success', 'warning', 'error').
 */
export function showMessage(message, type = 'info') {
    const messageBox = document.getElementById('messageBox');
    if (!messageBox) {
        console.error('Message box element not found!');
        return;
    }

    messageBox.textContent = message;
    messageBox.className = `message-box ${type} active`; // Set class for styling and show

    // Automatically hide after a few seconds
    setTimeout(() => {
        messageBox.classList.remove('active');
    }, 3000);
}

/**
 * Generates a short, human-readable ID (e.g., 6 characters).
 * @returns {string} A 6-character alphanumeric ID.
 */
export function generateShortId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Fallback for crypto.randomUUID for older browsers/environments.
 * @returns {string} A UUID-like string.
 */
export function generateUuidFallback() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Converts a hex color to an RGBA string.
 * @param {string} hex - The hex color string (e.g., "#RRGGBB").
 * @param {number} alpha - The alpha transparency value (0-1).
 * @returns {string} The RGBA color string.
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
 * Converts an image URL to a Base64 string for embedding.
 * Caches images to avoid repeated fetches.
 * @param {string} url - The URL of the image.
 * @returns {Promise<string>} A promise that resolves with the Base64 image string.
 */
export async function getBase64Image(url) {
    if (imageCache.has(url)) {
        return imageCache.get(url);
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onloadend = () => {
                const base64String = reader.result;
                imageCache.set(url, base64String); // Cache the image
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error(`[ERROR] Error fetching or converting image ${url}:`, error);
        throw error; // Re-throw to allow calling function to handle fallback
    }
}

/**
 * Gets the image path for a given role name, considering variants.
 * @param {string} roleName - The name of the role.
 * @param {object} currentRoomData - The current room data, used to get the synchronized image map.
 * @returns {Promise<string>} The full path to the role image, or the Nobody image path if not found.
 */
export async function getRoleImagePath(roleName, currentRoomData) {
    const formattedRoleName = roleName.toLowerCase().replace(/\s/g, '-');
    let imageUrl = `${ROLE_IMAGE_BASE_PATH}${formattedRoleName}-v-1.jpeg`; // Default to variant 1

    // 1. Try to get the chosen image URL from currentRoomData's synchronized image map
    if (currentRoomData && currentRoomData.game_data && currentRoomData.game_data.role_image_map) {
        const chosenUrl = currentRoomData.game_data.role_image_map[roleName];
        if (chosenUrl) {
            try {
                // Attempt to fetch the chosen image
                await getBase64Image(chosenUrl); // Just try to load to check existence
                return chosenUrl; // If successful, use this URL
            } catch (error) {
                console.warn(`[WARNING] Failed to fetch chosen image from ${chosenUrl}. Falling back to default variant or Nobody.`, error);
                // Fall through to try default variant
            }
        }
    }

    // 2. If no chosen URL or fetch failed, try the default variant for the role
    try {
        await getBase64Image(imageUrl); // Attempt to fetch the default role image
        console.log(`[DEBUG] Displaying static image for ${roleName}: ${imageUrl}`);
        return imageUrl; // If successful, use the default variant URL
    } catch (error) {
        console.warn(`[WARNING] Failed to fetch default image for ${roleName} from ${imageUrl}. Falling back to Nobody.`, error);
        // Fall through to Nobody image
    }

    // 3. If all attempts fail, use the Nobody image
    console.log(`[DEBUG] Displaying Nobody image for ${roleName}: ${NOBODY_IMAGE_PATH}`);
    return NOBODY_IMAGE_PATH;
}

/**
 * Finds a role template by its name.
 * @param {string} roleName - The name of the role to find.
 * @returns {object|undefined} The role template object, or undefined if not found.
 */
export function getRoleTemplate(roleName) {
    return ROLE_TEMPLATES.find(role => role.name === roleName);
}