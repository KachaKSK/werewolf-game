// src/ui/render.js
// Contains functions responsible for rendering UI elements.

import {
    playerListDiv, sharedCounterDisplay, sharedRandomDisplay, currentRoomIdSpan,
    roomBackgroundDiv, roomInfoDiv, leaveRoomBtn, roomNameDisplay, dynamicMainTitle,
    renameRoomTitleBtn, rolePoolTabKnob, rolePoolTab, myRoleTriggerArea,
    gemCounterSection, startGameBtn, roleListDiv, rolesGridContainerOverlay,
    playerRolePileContainer, centerRolePoolDisplay, detailedOverlayImage,
    detailedOverlayRoleName, detailedOverlayThaiName, detailedOverlayDescription,
    detailedOverlayGemsContainer, addGemButton, gemSettingsList
} from '../config/dom-elements.js';
// ROLE_TEMPLATES and GEM_DATA are imported here as they are used by other rendering functions.
import { GEM_DATA, ROLE_TEMPLATES } from '../config/constants.js';
import { getBase64Image, hexToRgba, getRoleImagePath, getRoleTemplate } from '../utils/helpers.js';
import { showDetailedRoleOverlay } from './modals.js'; // Import showDetailedRoleOverlay

let arePlayerCardsSpread = false; // State for card spread/pile
let isRolePoolTabOpen = false; // State for role pool tab

/**
 * Updates the UI with the current room data.
 * @param {object} roomData - The data of the current room.
 * @param {string} localId - The full UUID of the current user.
 * @param {string} userId - The short ID of the current user.
 * @param {function} kickPlayerCallback - Callback function for kicking players.
 * @param {Array<Object>} currentPlayerRoles - Array of current player's roles.
 * @param {function} renderPlayerRoleCardsCallback - Callback to render player role cards.
 * @param {function} updateRoleAmountCallback - Callback to update role amount. (No longer directly used for rendering counters, but kept for consistency if other parts still pass it)
 * @param {function} toggleRoleDisabledCallback - Callback to toggle role disabled status. (No longer directly used for rendering counters, but kept for consistency if other parts still pass it)
 * @param {function} removeGemFromSettingsCallback - Callback to remove gem from settings. (No longer directly used for rendering counters, but kept for consistency if other parts still pass it)
 */
export function updateRoomUI(roomData, localId, userId, kickPlayerCallback, currentPlayerRoles, renderPlayerRoleCardsCallback, updateRoleAmountCallback, toggleRoleDisabledCallback, removeGemFromSettingsCallback) {
    console.log('[DEBUG] [updateRoomUI] Updating UI with room data:', roomData);

    // Set room background
    const backgroundUrl = roomData.background_url || 'https://i.imgur.com/hvBtKgM.jpeg';
    roomBackgroundDiv.style.backgroundImage = `url('${backgroundUrl}')`;

    // Update room info
    currentRoomIdSpan.textContent = roomData.id;
    roomNameDisplay.textContent = roomData.name;

    // Determine if the current user is the host
    const isHost = roomData.host_id === localId;
    console.log(`[DEBUG] [updateRoomUI] Current user ID: ${localId}, Host ID: ${roomData.host_id}, Is Host: ${isHost}`);

    // Update player list
    playerListDiv.innerHTML = '';
    if (roomData.players && Array.isArray(roomData.players)) {
        roomData.players.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = 'player-item flex justify-between items-center bg-gray-100 p-2 rounded-md shadow-sm mb-2';
            playerElement.innerHTML = `
                <span class="font-semibold">${player.player_name} (${player.player_id})</span>
                ${isHost && player.player_id !== userId ? `<button class="kick-player-btn bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md text-sm" data-player-id="${player.player_id}">Kick</button>` : ''}
            `;
            playerListDiv.appendChild(playerElement);
        });

        // Add event listeners for kick buttons if host
        if (isHost) {
            playerListDiv.querySelectorAll('.kick-player-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const playerIdToKick = event.target.dataset.playerId;
                    console.log(`[DEBUG] Kicking player: ${playerIdToKick}`);
                    kickPlayerCallback(roomData.id, playerIdToKick);
                });
            });
        }
    }

    // Update shared counter
    sharedCounterDisplay.textContent = roomData.game_data?.shared_counter || 0;

    // Update shared random value
    sharedRandomDisplay.textContent = roomData.game_data?.shared_random_value || 'N/A';

    // Removed the role counter rendering logic and related addGemButton visibility.
    // The gemSettingsList will now remain empty or display its default content if no other logic populates it.
    gemSettingsList.innerHTML = '<p class="text-center text-gray-500">Role settings are managed elsewhere.</p>';
    addGemButton.classList.add('hidden'); // Ensure add gem button is hidden as its functionality is removed from UI

    // Render player's roles
    renderPlayerRoleCardsCallback(currentPlayerRoles, roomData.game_data?.role_image_map || {});

    // Render center role pool
    renderCenterRolePool(roomData.game_data?.center_role_pool || [], roomData.game_data?.role_image_map || {});

    // Show/hide start game button based on host status
    if (isHost) {
        startGameBtn.classList.remove('hidden');
    } else {
        startGameBtn.classList.add('hidden');
    }
}

/**
 * Renders the center role pool cards.
 * @param {Array<Object>} centerRolePool - Array of role objects in the center pool.
 * @param {Object} roleImageMap - Map of role names to their chosen image URLs.
 */
export async function renderCenterRolePool(centerRolePool, roleImageMap) {
    console.log('[DEBUG] [renderCenterRolePool] Rendering center role pool:', centerRolePool);
    centerRolePoolDisplay.innerHTML = ''; // Clear existing cards

    if (centerRolePool.length === 0) {
        centerRolePoolDisplay.innerHTML = '<p class="text-center text-gray-500 w-full">No roles in the center pool.</p>';
        return;
    }

    for (const role of centerRolePool) {
        const roleCard = document.createElement('div');
        roleCard.className = 'role-card-small bg-white p-2 rounded-lg shadow-md text-center cursor-pointer transform transition-transform duration-200 hover:scale-105';
        roleCard.dataset.roleName = role.name;

        // getRoleImagePath and getBase64Image are from helpers.js
        const imageUrl = role['chosen-image-url'] || roleImageMap[role.name] || getRoleImagePath(role.name);
        const base64Image = await getBase64Image(imageUrl);

        roleCard.innerHTML = `
            <img src="${base64Image}" alt="${role.name}" class="w-16 h-16 mx-auto mb-2 rounded-full object-cover border-2 border-gray-300">
            <h4 class="text-sm font-semibold text-gray-800">${role.name}</h4>
        `;
        roleCard.addEventListener('click', () => showDetailedRoleOverlay(role, { game_data: { role_image_map: roleImageMap } }));
        centerRolePoolDisplay.appendChild(roleCard);
    }
}


/**
 * Renders all available role cards to the roles overlay.
 * @param {object} currentRoomData - The current room data (for synchronized image map).
 */
export async function renderAllRoleCardsToOverlay(currentRoomData) {
    console.log('[DEBUG] [renderAllRoleCardsToOverlay] Rendering all role cards to overlay.');
    rolesGridContainerOverlay.innerHTML = ''; // Clear existing cards

    const roleImageMap = currentRoomData.game_data?.role_image_map || {};

    // ROLE_TEMPLATES is imported at the top of this file and should be available here.
    for (const role of ROLE_TEMPLATES) {
        const roleCard = document.createElement('div');
        roleCard.className = 'role-card bg-white p-4 rounded-lg shadow-md text-center cursor-pointer transform transition-transform duration-200 hover:scale-105';
        roleCard.dataset.roleName = role.name;

        const imageUrl = roleImageMap[role.name] || getRoleImagePath(role.name);
        const base64Image = await getBase64Image(imageUrl);

        roleCard.innerHTML = `
            <img src="${base64Image}" alt="${role.name}" class="w-24 h-24 mx-auto mb-4 rounded-full object-cover border-4 border-gray-300">
            <h3 class="text-lg font-bold text-gray-900">${role.name}</h3>
            <p class="text-sm text-gray-600">${role['thai-name'] || ''}</p>
        `;
        roleCard.addEventListener('click', () => showDetailedRoleOverlay(role, currentRoomData));
        rolesGridContainerOverlay.appendChild(roleCard);
    }
}

/**
 * Renders the player's role cards.
 * @param {Array<Object>} roles - Array of role objects assigned to the player.
 * @param {Object} roleImageMap - Map of role names to their chosen image URLs.
 */
export async function renderPlayerRoleCards(roles, roleImageMap) {
    console.log('[DEBUG] [renderPlayerRoleCards] Rendering player role cards:', roles);
    playerRolePileContainer.innerHTML = ''; // Clear existing cards

    if (!roles || roles.length === 0) {
        playerRolePileContainer.innerHTML = '<p class="text-center text-gray-500">No roles assigned yet.</p>';
        return;
    }

    for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        const roleCard = document.createElement('div');
        roleCard.className = 'player-role-card absolute bg-white p-4 rounded-lg shadow-lg text-center cursor-pointer transition-all duration-300 ease-in-out transform';
        roleCard.dataset.roleName = role.name;

        const imageUrl = role['chosen-image-url'] || roleImageMap[role.name] || getRoleImagePath(role.name);
        const base64Image = await getBase64Image(imageUrl);

        roleCard.innerHTML = `
            <img src="${base64Image}" alt="${role.name}" class="w-24 h-24 mx-auto mb-4 rounded-full object-cover border-4 border-gray-300">
            <h3 class="text-lg font-bold text-gray-900">${role.name}</h3>
            <p class="text-sm text-gray-600">${role['thai-name'] || ''}</p>
        `;
        roleCard.addEventListener('click', () => showDetailedRoleOverlay(role, { game_data: { role_image_map: roleImageMap } }));
        playerRolePileContainer.appendChild(roleCard);
    }
    updatePlayerCardPositions(); // Position cards after rendering
}

/**
 * Toggles the spread/pile state of player cards.
 */
export function togglePlayerCardsSpread() {
    arePlayerCardsSpread = !arePlayerCardsSpread;
    updatePlayerCardPositions();
}

/**
 * Updates the position of player cards based on spread state.
 */
export function updatePlayerCardPositions() {
    const cards = Array.from(playerRolePileContainer.children);
    const numCards = cards.length;

    if (numCards === 0) return;

    if (arePlayerCardsSpread) {
        // Spread out cards
        const totalWidth = playerRolePileContainer.offsetWidth;
        const cardWidth = cards[0].offsetWidth;
        const spacing = 20; // Pixels between cards
        const spreadWidth = (numCards * cardWidth) + ((numCards - 1) * spacing);

        cards.forEach((card, index) => {
            const offset = (index - (numCards - 1) / 2) * (cardWidth + spacing);
            card.style.left = `calc(50% + ${offset}px - ${cardWidth / 2}px)`;
            card.style.transform = 'translateY(-50%) rotate(0deg)';
            card.style.zIndex = numCards - index; // Ensure correct overlap
        });
    } else {
        // Pile cards
        cards.forEach((card, index) => {
            const offset = index * 5; // Small offset for pile effect
            card.style.left = `calc(50% + ${offset}px)`;
            card.style.transform = `translateY(-50%) rotate(${index * 2}deg)`; // Slight rotation for pile effect
            card.style.zIndex = index; // Ensure correct overlap
        });
    }
}

// The renderGemSettings function has been removed as requested.

/**
 * Toggles the visibility of the role pool tab.
 */
export function toggleRolePoolTabVisibility() {
    isRolePoolTabOpen = !isRolePoolTabOpen;
    if (isRolePoolTabOpen) {
        rolePoolTab.classList.add('active');
        rolePoolTab.style.transform = 'translateX(0)';
    } else {
        rolePoolTab.classList.remove('active');
        rolePoolTab.style.transform = 'translateX(-100%)';
    }
}

// Export for drag functionality
export { isRolePoolTabOpen };
