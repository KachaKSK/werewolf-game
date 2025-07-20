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
    console.log(`[DEBUG] Showing detailed overlay for role: ${role.name}`);

    // Pass currentRoomData to getRoleImagePath
    const imageUrl = role["chosen-image-url"] || getRoleImagePath(role.name, currentRoomData);
    detailedOverlayImage.src = await getBase64Image(imageUrl);
    detailedOverlayImage.alt = `Image for ${role.name}`;

    detailedOverlayRoleName.textContent = role.name;
    detailedOverlayThaiName.textContent = role["thai-name"];
    detailedOverlayDescription.textContent = role.description;

    detailedOverlayGemsContainer.innerHTML = '';
    const roughGemTag = document.createElement('span');
    roughGemTag.className = 'capsule-tag rough-gem-tag';
    roughGemTag.textContent = role["rough-gem"];
    detailedOverlayGemsContainer.appendChild(roughGemTag);

    const gemTag = document.createElement('span');
    gemTag.className = `capsule-tag gem-tag gem-${role.gem.replace(/\s/g, '')}`;
    gemTag.textContent = role.gem;
    detailedOverlayGemsContainer.appendChild(gemTag);

    detailedRoleOverlay.classList.add('active');
    console.log('[DEBUG] Detailed overlay activated.');
}

/**
 * Hides the detailed role information overlay.
 */
export function hideDetailedRoleOverlay() {
    detailedRoleOverlay.classList.remove('active');
    console.log('[DEBUG] Detailed overlay hidden.');
}

/**
 * Shows the modal for adding new gem categories.
 * @param {object} currentRoomData - The current room data.
 * @param {function} addGemToSettingsCallback - Callback to add gem to settings.
 */
export function showAddGemModal(currentRoomData, addGemToSettingsCallback) {
    if (!currentRoomData || !currentRoomData.game_data || !currentRoomData.game_data.gem_included_settings) {
        // showMessage is handled in the calling context, just return
        return;
    }

    availableGemsList.innerHTML = '';

    const includedGems = currentRoomData.game_data.gem_included_settings.map(g => g.gem);
    // Filter out "None" gem from the list of available gems to add
    const allGemNames = Object.keys(GEM_DATA).filter(gemName => gemName !== "None");

    const nonIncludedGems = allGemNames.filter(gemName =>
        !includedGems.includes(gemName)
    );

    if (nonIncludedGems.length === 0) {
        availableGemsList.innerHTML = '<p class="text-center text-gray-600">All available categories are already added.</p>';
    } else {
        nonIncludedGems.forEach(gemName => {
            const gemData = GEM_DATA[gemName];
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
 * Hides the rename room modal.
 */
export function hideRenameRoomModal() {
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
