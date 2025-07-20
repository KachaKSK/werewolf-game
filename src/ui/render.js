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
// ROLE_TEMPLATES is imported here and should be available throughout this module.
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
 * @param {function} updateRoleAmountCallback - Callback to update role amount.
 * @param {function} toggleRoleDisabledCallback - Callback to toggle role disabled status.
 * @param {function} removeGemFromSettingsCallback - Callback to remove gem from settings.
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

    // Update role list (if game_data and role_settings exist)
    if (roomData.game_data && roomData.game_data.role_settings) {
        renderGemSettings(roomData.game_data.role_settings, isHost, updateRoleAmountCallback, toggleRoleDisabledCallback, removeGemFromSettingsCallback);
    } else {
        gemSettingsList.innerHTML = '<p class="text-center text-gray-500">No role settings configured.</p>';
        addGemButton.classList.add('hidden'); // Hide if no game data
    }

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

/**
 * Renders the gem settings (role counters) in the UI.
 * @param {Array<Object>} roleSettings - The array of role settings from game_data.
 * @param {boolean} isHost - True if the current user is the host, false otherwise.
 * @param {function} updateRoleAmountCallback - Callback to update role amount in DB.
 * @param {function} toggleRoleDisabledCallback - Callback to toggle role disabled status in DB.
 * @param {function} removeGemFromSettingsCallback - Callback to remove gem from settings in DB.
 */
export async function renderGemSettings(roleSettings, isHost, updateRoleAmountCallback, toggleRoleDisabledCallback, removeGemFromSettingsCallback) {
    console.log('[DEBUG] [renderGemSettings] Rendering gem settings:', roleSettings);
    // Confirm ROLE_TEMPLATES is available in this scope
    console.log('[DEBUG] [renderGemSettings] ROLE_TEMPLATES (in render.js scope):', ROLE_TEMPLATES);
    console.log('[DEBUG] [renderGemSettings] getRoleTemplate (function reference):', getRoleTemplate);

    gemSettingsList.innerHTML = ''; // Clear existing settings

    if (!roleSettings || roleSettings.length === 0) {
        gemSettingsList.innerHTML = '<p class="text-center text-gray-500">No role categories added yet.</p>';
    } else {
        // Sort role settings by gem name for consistent display
        roleSettings.sort((a, b) => a.gem.localeCompare(b.gem));

        for (const setting of roleSettings) {
            const gemName = setting.gem;
            const roleName = setting.role;
            const amount = setting.amount;
            const isDisabled = setting.isDisabled;
            const gemData = GEM_DATA[gemName];
            // Call getRoleTemplate without passing ROLE_TEMPLATES, as it's imported in helpers.js
            const roleTemplate = getRoleTemplate(roleName);

            if (!gemData || !roleTemplate) {
                console.warn(`[WARNING] Missing gem data for ${gemName} or role template for ${roleName}. Skipping.`);
                continue;
            }

            const gemItem = document.createElement('div');
            gemItem.className = `gem-setting-item flex items-center p-2 rounded-lg shadow-sm mb-2 relative ${isDisabled ? 'bg-gray-300 opacity-60' : 'bg-white'}`;
            gemItem.style.borderColor = gemData.color; // Use gem color for border
            gemItem.style.borderWidth = '2px';
            gemItem.style.borderStyle = 'solid';

            // Role Image
            const roleImage = document.createElement('img');
            const imageUrl = roleTemplate['chosen-image-url'] || getRoleImagePath(roleName); // Use chosen-image-url if available
            roleImage.src = await getBase64Image(imageUrl);
            roleImage.alt = roleName;
            roleImage.className = 'w-10 h-10 rounded-full object-cover mr-3 border-2';
            roleImage.style.borderColor = gemData.color;
            gemItem.appendChild(roleImage);

            // Role Name and Gem Name
            const textContainer = document.createElement('div');
            textContainer.className = 'flex-grow';
            textContainer.innerHTML = `
                <h4 class="font-semibold text-gray-800">${roleName}</h4>
                <p class="text-xs text-gray-600">${gemName}</p>
            `;
            gemItem.appendChild(textContainer);

            // Counter Area
            const counterArea = document.createElement('div');
            counterArea.className = 'flex items-center space-x-2 ml-4';

            // Minus button
            const minusButton = document.createElement('button');
            minusButton.className = 'gem-setting-button bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-lg font-bold';
            minusButton.textContent = '-';
            minusButton.dataset.gemName = gemName;
            minusButton.dataset.roleName = roleName;
            minusButton.dataset.action = 'decrementGem';
            minusButton.style.pointerEvents = 'auto'; // Ensure it's clickable
            minusButton.addEventListener('click', () => {
                console.log(`[DEBUG] Minus button clicked for role: ${roleName}`);
                updateRoleAmountCallback(roleName, -1);
            });
            counterArea.appendChild(minusButton);

            // Amount display
            const amountSpan = document.createElement('span');
            amountSpan.className = 'text-lg font-bold text-gray-900 min-w-[20px] text-center';
            amountSpan.textContent = amount;
            amountSpan.style.pointerEvents = 'none'; // Amount display should not be clickable
            counterArea.appendChild(amountSpan);

            // Plus button
            const plusButton = document.createElement('button');
            plusButton.className = 'gem-setting-button bg-green-500 hover:bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-lg font-bold';
            plusButton.textContent = '+';
            plusButton.dataset.gemName = gemName;
            plusButton.dataset.roleName = roleName;
            plusButton.dataset.action = 'incrementGem';
            plusButton.style.pointerEvents = 'auto'; // Ensure it's clickable
            plusButton.addEventListener('click', () => {
                console.log(`[DEBUG] Plus button clicked for role: ${roleName}`);
                updateRoleAmountCallback(roleName, 1);
            });
            counterArea.appendChild(plusButton);

            gemItem.appendChild(counterArea);

            // Toggle Disabled Button (only for host)
            if (isHost) {
                const toggleDisableButton = document.createElement('button');
                toggleDisableButton.className = `ml-2 px-2 py-1 rounded-md text-sm ${isDisabled ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`;
                toggleDisableButton.textContent = isDisabled ? 'Enable' : 'Disable';
                toggleDisableButton.style.pointerEvents = 'auto'; // Ensure clickable
                toggleDisableButton.addEventListener('click', () => toggleRoleDisabledCallback(roleName));
                gemItem.appendChild(toggleDisableButton);

                // Remove Button (only for host)
                const removeButton = document.createElement('button');
                removeButton.className = 'ml-2 px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm';
                removeButton.textContent = 'Remove';
                removeButton.style.pointerEvents = 'auto'; // Ensure clickable
                removeButton.addEventListener('click', () => removeGemFromSettingsCallback(roleName));
                gemItem.appendChild(removeButton);
            }

            gemSettingsList.appendChild(gemItem);
        }
    }

    // Hide/show add gem button based on host status
    if (isHost) {
        addGemButton.classList.remove('hidden');
    } else {
        addGemButton.classList.add('hidden');
    }
    // Ensure addGemButton is always appended to gemSettingsList, its visibility is controlled by its class
    if (!gemSettingsList.contains(addGemButton)) {
        gemSettingsList.appendChild(addGemButton);
    }
    console.log('[DEBUG] [renderGemSettings] Finished gem settings rendering.');
}

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
