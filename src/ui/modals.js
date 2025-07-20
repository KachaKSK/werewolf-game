// src/ui/modals.js
// Contains functions for showing/hiding modals.

import {
    rolesOverlay, rolesGridContainerOverlay, detailedRoleOverlay,
    detailedOverlayImage, detailedOverlayRoleName, detailedOverlayThaiName,
    detailedOverlayDescription, detailedOverlayGemsContainer, addGemModal,
    availableGemsList, renameRoomModal, renameRoomInput, roomNameDisplay
} from '../config/dom-elements.js';
import { GEM_DATA, ROLE_TEMPLATES } from '../config/constants.js';
import { hexToRgba, getBase64Image, getRoleImagePath } from '../utils/helpers.js';

/**
 * Displays the main roles overlay.
 * @param {object} currentRoomData - The current room data (for synchronized image map).
 * @param {function} renderAllRoleCardsToOverlayCallback - Callback to render all role cards.
 */
export function showRolesOverlay(currentRoomData, renderAllRoleCardsToOverlayCallback) {
    rolesOverlay.classList.add('active');
    renderAllRoleCardsToOverlayCallback(currentRoomData); // Render all cards when opening the overlay
    console.log('[DEBUG] Showing roles overlay.');
}

/**
 * Hides the main roles overlay.
 */
export function hideRolesOverlay() {
    rolesOverlay.classList.remove('active');
    console.log('[DEBUG] Hiding roles overlay.');
}

/**
 * Displays the detailed role information overlay.
 * @param {object} role - The role object to display.
 * @param {object} currentRoomData - The current room data (for synchronized image map).
 */
export async function showDetailedRoleOverlay(role, currentRoomData) {
    console.log('[DEBUG] Showing detailed role overlay for:', role);
    detailedRoleOverlay.classList.add('active');

    detailedOverlayRoleName.textContent = role.name;
    detailedOverlayThaiName.textContent = role['thai-name'] || '';
    detailedOverlayDescription.textContent = role.description;

    // Determine the image URL (prioritize chosen-image-url from role object, then map, then default)
    const roleImageMap = currentRoomData.game_data?.role_image_map || {};
    const imageUrl = role['chosen-image-url'] || roleImageMap[role.name] || getRoleImagePath(role.name);
    detailedOverlayImage.src = await getBase64Image(imageUrl);
    detailedOverlayImage.alt = role.name;

    // Render gems
    detailedOverlayGemsContainer.innerHTML = '';
    if (role.gem) {
        const gemData = GEM_DATA[role.gem];
        if (gemData) {
            const gemElement = document.createElement('div');
            gemElement.className = 'flex items-center space-x-2 text-sm';
            gemElement.innerHTML = `
                <span class="px-2 py-1 rounded-full text-white" style="background-color: ${gemData.color};">${role.gem}</span>
            `;
            detailedOverlayGemsContainer.appendChild(gemElement);
        }
    }
    if (role['rough-gem']) {
        const roughGemData = GEM_DATA[role['rough-gem']];
        if (roughGemData) {
            const roughGemElement = document.createElement('div');
            roughGemElement.className = 'flex items-center space-x-2 text-sm';
            roughGemElement.innerHTML = `
                <span class="px-2 py-1 rounded-full text-white" style="background-color: ${roughGemData.color};">Rough: ${role['rough-gem']}</span>
            `;
            detailedOverlayGemsContainer.appendChild(roughGemElement);
        }
    }
}

/**
 * Hides the detailed role information overlay.
 */
export function hideDetailedRoleOverlay() {
    detailedRoleOverlay.classList.remove('active');
    console.log('[DEBUG] Hiding detailed role overlay.');
}

/**
 * Displays the add gem modal.
 * @param {Array<string>} availableGems - Array of gem names that can be added.
 * @param {object} GEM_DATA - The global GEM_DATA object for image and color info.
 * @param {function} addGemToSettingsCallback - Callback function to add the selected gem.
 */
export function showAddGemModal(availableGems, GEM_DATA, addGemToSettingsCallback) {
    availableGemsList.innerHTML = ''; // Clear previous list
    if (availableGems.length === 0) {
        availableGemsList.innerHTML = '<p class="text-center text-gray-500">No more gem categories to add.</p>';
    } else {
        availableGems.forEach(gemName => {
            const gemData = GEM_DATA[gemName];
            if (!gemData) return; // Skip if gem data is missing

            const item = document.createElement('div');
            item.className = 'available-gem-item';
            item.dataset.gemName = gemName;
            item.innerHTML = `
                <img src="${gemData.image}" alt="${gemName}" class="available-gem-item-image">
                <span class="available-gem-item-name">${gemName}</span>
            `;
            item.addEventListener('click', async () => {
                const success = await addGemToSettingsCallback(gemName);
                if (success) hideAddGemModal();
            });
            availableGemsList.appendChild(item);
        });
    }
    addGemModal.classList.add('active');
    console.log('[DEBUG] Showing add gem modal.');
}

/**
 * Hides the add gem modal.
 */
export function hideAddGemModal() {
    addGemModal.classList.remove('active');
    console.log('[DEBUG] Hiding add gem modal.');
}

/**
 * Displays the rename room modal.
 */
export function showRenameRoomModal() { // Exported this function
    renameRoomModal.classList.add('active');
    console.log('[DEBUG] [showRenameRoomModal] Rename modal shown.');
}

/**
 * Hides the rename room modal.
 */
export function hideRenameRoomModal() { // Exported this function
    renameRoomModal.classList.remove('active');
    renameRoomInput.value = '';
    console.log('[DEBUG] [hideRenameRoomModal] Rename modal hidden.');
}

/**
 * Cancels the room renaming from the modal.
 */
export function cancelRenameRoom() {
    hideRenameRoomModal();
    console.log('[DEBUG] [cancelRenameRoom] Rename modal cancelled.');
}

/**
 * Pre-fills the rename room input with the current room name.
 */
export function prefillRenameRoomInput() {
    renameRoomInput.value = roomNameDisplay.textContent;
    renameRoomInput.focus();
}
