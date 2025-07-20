// src/utils/helpers.js
// Contains various helper functions used throughout the application.

import { ROLE_IMAGE_BASE_PATH, GEM_DATA, ROLE_TEMPLATES } from '../config/constants.js';

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
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
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
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Converts an image from a URL to a Base64 string.
 * Uses a global cache to avoid re-fetching images.
 * @param {string} url - The URL of the image.
 * @returns {Promise<string>} A promise that resolves with the Base64 data URL.
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
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                imageCache.set(url, reader.result); // Cache the result
                resolve(reader.result);
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
 * @returns {string} The full path to the role image.
 */
export function getRoleImagePath(roleName, currentRoomData) {
    // Ensure roleName is formatted for filename (e.g., "Wolf Cub" -> "wolf-cub")
    const formattedRoleName = roleName.toLowerCase().replace(/\s/g, '-');

    // Attempt to get the chosen image URL from currentRoomData's synchronized image map
    if (currentRoomData && currentRoomData.game_data && currentRoomData.game_data.role_image_map) {
        const chosenUrl = currentRoomData.game_data.role_image_map[roleName];
        if (chosenUrl) {
            return chosenUrl;
        }
    }

    // Fallback to default path if not found in map or no room data
    // Using .jpeg extension based on user's clarification and error logs
    return `${ROLE_IMAGE_BASE_PATH}${formattedRoleName}-v-1.jpeg`; // Changed to .jpeg
}

/**
 * Finds a role template by its name.
 * @param {string} roleName - The name of the role to find.
 * @returns {object|undefined} The role template object, or undefined if not found.
 */
export function getRoleTemplate(roleName) {
    return ROLE_TEMPLATES.find(template => template.name === roleName);
}