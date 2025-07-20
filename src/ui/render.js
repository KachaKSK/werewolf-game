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
 * @param {function} renderPlayerRoleCardsCallback - Callback to render player roles.
 */
export function updateRoomUI(roomData, localId, userId, kickPlayerCallback, currentPlayerRoles, renderPlayerRoleCardsCallback) {
    console.log('[DEBUG] [updateRoomUI] Received roomData:', roomData);

    // Determine if the current user is the host
    const isHost = (localId === roomData?.host_id);

    if (!roomData) {
        playerListDiv.innerHTML = '';
        sharedCounterDisplay.textContent = 'Counter: 0';
        sharedRandomDisplay.textContent = 'N/A';
        currentRoomIdSpan.textContent = '';
        roomBackgroundDiv.style.backgroundImage = 'none';
        roomNameDisplay.textContent = 'WolfVille Village';
        dynamicMainTitle.classList.remove('room-title-sign');
        renameRoomTitleBtn.classList.add('hidden');
        console.log('[DEBUG] [updateRoomUI] Room data is null, clearing UI.');
        currentPlayerRoles = []; // Clear player roles
        renderPlayerRoleCardsCallback([], []); // Clear player role cards UI
        rolePoolTabKnob.classList.add('hidden');
        rolePoolTab.classList.remove('active');
        isRolePoolTabOpen = false;
        myRoleTriggerArea.classList.add('hidden');
        gemCounterSection.classList.add('hidden'); // Still hide the section if no room data
        startGameBtn.classList.add('hidden');
        return;
    }

    roomInfoDiv.classList.remove('hidden');
    leaveRoomBtn.classList.remove('hidden');
    rolePoolTabKnob.classList.remove('hidden');
    myRoleTriggerArea.classList.remove('hidden');
    gemCounterSection.classList.remove('hidden'); // Always show gem counter section if room data exists

    console.log(`[DEBUG] [updateRoomUI] Current user (Local ID: ${localId}, Short ID: ${userId}) is host: ${isHost}`);

    if (roomData.game_data && roomData.game_data.roomName) {
        roomNameDisplay.textContent = roomData.game_data.roomName;
        console.log(`[DEBUG] [updateRoomUI] Setting room name display to: ${roomData.game_data.roomName}`);
    } else {
        roomNameDisplay.textContent = 'WolfVille Village';
        console.log('[DEBUG] [updateRoomUI] Setting room name display to default: WolfVille Village');
    }

    // Host-specific UI elements
    if (isHost) {
        renameRoomTitleBtn.classList.remove('hidden');
        console.log('[DEBUG] [updateRoomUI] Rename button shown (isHost).');
        startGameBtn.classList.remove('hidden'); // Show start game button for host
    } else {
        renameRoomTitleBtn.classList.add('hidden');
        console.log('[DEBUG] [updateRoomUI] Rename button hidden (not host).');
        startGameBtn.classList.add('hidden'); // Hide start game button for non-host
    }

    if (!dynamicMainTitle.contains(renameRoomTitleBtn)) {
        dynamicMainTitle.appendChild(renameRoomTitleBtn);
        console.log('[DEBUG] [updateRoomUI] Rename button appended to dynamicMainTitle.');
    }

    if (roomData.id) {
        currentRoomIdSpan.textContent = roomData.id;
        console.log('[DEBUG] [updateRoomUI] Displaying Room ID:', roomData.id);
    } else {
        currentRoomIdSpan.textContent = 'N/A';
        console.warn('[DEBUG] [updateRoomUI] roomData.id is missing or null. Cannot display Room ID.');
    }

    if (roomData.game_data && roomData.game_data.background_image_url) {
        roomBackgroundDiv.style.backgroundImage = `url('${roomData.game_data.background_image_url}')`;
        console.log('[DEBUG] [updateRoomUI] Setting background image:', roomData.game_data.background_image_url);
    } else {
        roomBackgroundDiv.style.backgroundImage = 'none';
        console.warn('[DEBUG] [updateRoomUI] No background image URL found in roomData.game_data.');
    }

    const playersInRoom = roomData.players || [];
    console.log('[DEBUG] [updateRoomUI] Players in room:', playersInRoom);

    playerListDiv.innerHTML = '';
    console.log('[DEBUG] [updateRoomUI] Player list cleared.');

    let localPlayer = null;
    if (playersInRoom.length > 0) {
        playersInRoom.forEach(player => {
            if (player["local-id"] === localId) {
                localPlayer = player;
            }

            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            if (player.uid === userId) {
                playerCard.classList.add('current-player');
                console.log(`[DEBUG] [updateRoomUI] Highlighting current player: ${player.name}`);
            }

            const roleTagClass = player["local-id"] === roomData.host_id ? 'host-tag' : 'player-tag';
            const roleText = player["local-id"] === roomData.host_id ? 'Host' : 'Player';

            playerCard.innerHTML = `
                <div class="player-card-name">${player.name}</div>
                <div class="player-tags-container">
                    <span class="player-role-tag ${roleTagClass}">${roleText}</span>
                    <span class="player-status-tag status-${player.status || 'Alive'}">${player.status || 'Alive'}</span>
                </div>
            `;

            if (isHost && player.uid !== userId) {
                const kickButton = document.createElement('button');
                kickButton.className = 'kick-player-btn';
                kickButton.textContent = 'x';
                kickButton.title = `Kick ${player.name} (${player.uid})`;
                kickButton.dataset.playerId = player.uid;
                kickButton.addEventListener('click', () => kickPlayerCallback(player.uid)); // Use callback
                playerCard.appendChild(kickButton);
                console.log(`[DEBUG] [updateRoomUI] Added kick button for ${player.name}.`);
            }
            playerListDiv.appendChild(playerCard);
            console.log(`[DEBUG] [updateRoomUI] Added player card for: ${player.name}`);
        });
    } else {
        const noPlayersMessage = document.createElement('div');
        noPlayersMessage.textContent = 'No players in this room yet.';
        noPlayersMessage.className = 'text-center text-gray-400 p-4';
        playerListDiv.appendChild(noPlayersMessage);
        console.log('[DEBUG] [updateRoomUI] No players found, displaying "No players" message.');
    }

    if (roomData.game_data && typeof roomData.game_data.counter === 'number') {
        sharedCounterDisplay.textContent = `Counter: ${roomData.game_data.counter}`;
        console.log(`[DEBUG] [updateRoomUI] Counter updated to: ${roomData.game_data.counter}`);
    } else {
        sharedCounterDisplay.textContent = 'Counter: 0';
        console.log('[DEBUG] [updateRoomUI] Counter reset to 0.');
    }
    if (roomData.game_data && typeof roomData.game_data.randomValue !== 'undefined') {
        sharedRandomDisplay.textContent = `Random Value: ${roomData.game_data.randomValue}`;
        console.log(`[DEBUG] [updateRoomUI] Random Value updated to: ${roomData.game_data.randomValue}`);
    } else {
        sharedRandomDisplay.textContent = 'N/A';
        console.log('[DEBUG] [updateRoomUI] Random Value reset to N/A.');
    }

    // Pass isHost and roomData to rendering functions
    renderRoleList(roomData.game_data?.role_settings || [], isHost, roomData);
    console.log('[DEBUG] [updateRoomUI] Called renderRoleList.');

    renderGemSettings(roomData.game_data?.gem_included_settings || [], isHost, roomData);
    console.log('[DEBUG] [updateRoomUI] Called renderGemSettings.');

    if (localPlayer) {
        const newRoles = localPlayer.roles || [];
        if (JSON.stringify(newRoles) !== JSON.stringify(currentPlayerRoles)) {
            console.log('[DEBUG] Player roles changed. Updating my role cards.');
            renderPlayerRoleCardsCallback(currentPlayerRoles, newRoles, roomData); // Pass roomData for image path
            currentPlayerRoles.splice(0, currentPlayerRoles.length, ...newRoles); // Update the original array
        }
    } else {
        if (currentPlayerRoles.length > 0) {
            console.log('[DEBUG] Current player not found in room. Clearing my role cards.');
            renderPlayerRoleCardsCallback([], [], roomData);
            currentPlayerRoles.length = 0; // Clear the original array
        }
    }

    renderCenterRolePool(roomData.game_data?.center_role_pool || [], roomData);
}

/**
 * Displays a static image for a role item.
 * @param {HTMLImageElement} imgElement - The <img> element to update.
 * @param {object} role - The role object (can be a template or an instance).
 * @param {object} currentRoomData - The current room data (for synchronized image map).
 * @param {boolean} isOverlayImage - True if this is an image in the overlay, false otherwise.
 */
export async function displayRoleImageStatic(imgElement, role, currentRoomData, isOverlayImage = false) {
    // Determine the primary image URL
    const primaryImageUrl = role["chosen-image-url"] || getRoleImagePath(role.name, currentRoomData);
    const nobodyRole = ROLE_TEMPLATES.find(t => t.name === "Nobody");
    const nobodyImageUrl = nobodyRole ? getRoleImagePath(nobodyRole.name, currentRoomData) : 'https://placehold.co/100x100/cccccc/000000?text=No+Image'; // Fallback if Nobody role not found

    console.log(`[DEBUG] Attempting to load primary image for ${role.name}: ${primaryImageUrl}`); // Added debug log

    try {
        const base64Image = await getBase64Image(primaryImageUrl);
        imgElement.src = base64Image;
        imgElement.alt = `Image for ${role.name}`;
        console.log(`[DEBUG] Displaying static image for ${role.name}: ${primaryImageUrl}`);
    } catch (error) {
        console.error(`[ERROR] Failed to load primary image for ${role.name} from ${primaryImageUrl}. Attempting fallback to Nobody image.`, error);
        try {
            const fallbackBase64Image = await getBase64Image(nobodyImageUrl);
            imgElement.src = fallbackBase64Image;
            imgElement.alt = `Fallback image for ${role.name} (Nobody)`;
            console.log(`[DEBUG] Displaying fallback image for ${role.name}: ${nobodyImageUrl}`);
        } catch (fallbackError) {
            console.error(`[ERROR] Failed to load Nobody fallback image from ${nobodyImageUrl}:`, fallbackError);
            imgElement.src = isOverlayImage ? 'https://placehold.co/180x180/ff0000/ffffff?text=Error' : 'https://placehold.co/100x100/ff0000/ffffff?text=Error';
            imgElement.alt = `Error loading image for ${role.name}`;
        }
    }
}

/**
 * Renders the list of available roles in the right column (quick view).
 * @param {Array<Object>} currentRoleSettings - The current role settings from game_data.
 * @param {boolean} isHost - True if the current user is the host.
 * @param {object} currentRoomData - The current room data (for synchronized image map).
 */
export function renderRoleList(currentRoleSettings, isHost, currentRoomData) {
    console.log('[DEBUG] [renderRoleList] Starting role list rendering.');
    roleListDiv.innerHTML = '';
    console.log('[DEBUG] [renderRoleList] Cleared roleListDiv content.');

    ROLE_TEMPLATES.forEach(role => {
        const roleSetting = currentRoleSettings.find(s => s.role === role.name) || {
            role: role.name,
            amount: role["default-amount"] !== undefined ? role["default-amount"] : 1,
            isDisabled: role.isPrimarilyDisabled || false
        };

        const roleItem = document.createElement('div');
        roleItem.className = `role-item gem-${role.gem.replace(/\s/g, '')}`;
        if (roleSetting.isDisabled) {
            roleItem.classList.add('disabled');
        }
        roleItem.dataset.roleName = role.name;

        const roleTextContent = document.createElement('div');
        roleTextContent.className = 'role-text-content';

        const roleName = document.createElement('div');
        roleName.className = 'role-name';
        roleName.textContent = role.name;

        const roleThaiName = document.createElement('div');
        roleThaiName.className = 'role-thai-name';
        roleThaiName.textContent = role["thai-name"];

        const description = document.createElement('div');
        description.className = 'role-description';

        const descriptionText = document.createElement('p');
        descriptionText.className = 'description-text';
        descriptionText.textContent = role.description;
        description.appendChild(descriptionText);

        roleTextContent.appendChild(roleName);
        roleTextContent.appendChild(roleThaiName);
        roleTextContent.appendChild(description);
        roleItem.appendChild(roleTextContent);

        const roleItemCapsulesContainer = document.createElement('div');
        roleItemCapsulesContainer.className = 'role-item-capsules-container';

        const roughGemTag = document.createElement('span');
        roughGemTag.className = 'capsule-tag rough-gem-tag';
        roughGemTag.textContent = role["rough-gem"];
        roleItemCapsulesContainer.appendChild(roughGemTag);

        const gemTag = document.createElement('span');
        gemTag.className = `capsule-tag gem-tag gem-${role.gem.replace(/\s/g, '')}`;
        gemTag.textContent = role.gem;
        roleItemCapsulesContainer.appendChild(gemTag);

        roleItem.appendChild(roleItemCapsulesContainer);

        const roleControls = document.createElement('div');
        roleControls.className = 'role-controls';

        // Role controls are now editable by all players
        const disableButton = document.createElement('button');
        disableButton.className = `disable-role-button`;
        disableButton.textContent = roleSetting.isDisabled ? '✖' : '✔';
        disableButton.title = roleSetting.isDisabled ? 'Enable Role' : 'Disable Role';
        disableButton.dataset.roleName = role.name;
        disableButton.dataset.action = 'toggleDisable';
        disableButton.style.backgroundColor = '#756d7a';
        // Only disable if "None" gem, not by host status
        disableButton.disabled = role.gem === "None";
        roleControls.appendChild(disableButton);

        const minusButton = document.createElement('button');
        minusButton.className = 'role-control-button minus';
        minusButton.textContent = '-';
        minusButton.dataset.roleName = role.name;
        minusButton.dataset.action = 'decrement';
        // Only disable if amount is 0, not by host status
        minusButton.disabled = roleSetting.amount === 0;
        minusButton.style.backgroundColor = '#756d7a';
        roleControls.appendChild(minusButton);

        const countSpan = document.createElement('span');
        countSpan.className = 'role-pooling-count';
        countSpan.textContent = roleSetting.amount;
        countSpan.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        countSpan.style.border = '1px solid rgba(0, 0, 0, 0.1)';
        countSpan.style.borderRadius = '0.5rem';
        countSpan.style.padding = '0 0.25rem';
        countSpan.style.backdropFilter = 'blur(2px)';
        countSpan.style.webkitBackdropFilter = 'blur(2px)';
        roleControls.appendChild(countSpan);

        const plusButton = document.createElement('button');
        plusButton.className = 'role-control-button plus';
        plusButton.textContent = '+';
        plusButton.dataset.roleName = role.name;
        plusButton.dataset.action = 'increment';
        // Not disabled by host status
        plusButton.style.backgroundColor = '#756d7a';
        roleControls.appendChild(plusButton);

        roleItem.appendChild(roleControls);

        roleListDiv.appendChild(roleItem);
        console.log(`[DEBUG] [renderRoleList] Added role item for: ${role.name}`);
    });
    console.log('[DEBUG] [renderRoleList] Finished role list rendering.');
}

/**
 * Renders all role cards into the main overlay grid.
 * @param {object} currentRoomData - The current room data (for synchronized image map).
 */
export function renderAllRoleCardsToOverlay(currentRoomData) {
    console.log('[DEBUG] [renderAllRoleCardsToOverlay] Starting overlay role card rendering.');
    rolesGridContainerOverlay.innerHTML = '';
    console.log('[DEBUG] [renderAllRoleCardsToOverlay] Cleared rolesGridContainerOverlay content.');

    ROLE_TEMPLATES.forEach(role => {
        const card = document.createElement('div');
        card.className = 'role-card-overlay';
        card.dataset.roleName = role.name;

        const gemData = GEM_DATA[role.gem] || GEM_DATA["None"];

        const headerBand = document.createElement('div');
        headerBand.className = 'role-header-band-overlay';
        headerBand.textContent = role.name.toUpperCase();
        card.appendChild(headerBand);

        const gemIcon = document.createElement('img');
        gemIcon.className = 'gem-icon-overlay';
        gemIcon.src = gemData.image;
        gemIcon.alt = `${gemData.name} icon`; // Fixed alt text
        card.appendChild(gemIcon);

        const nameBand = document.createElement('div');
        nameBand.className = 'role-name-band-overlay';
        nameBand.style.backgroundColor = hexToRgba(gemData.color, 0.7);

        const bandTextWrapper = document.createElement('div');
        bandTextWrapper.className = 'band-text-wrapper';

        const englishNameSpan = document.createElement('span');
        englishNameSpan.className = 'band-english-name';
        englishNameSpan.textContent = role.name.toUpperCase();
        bandTextWrapper.appendChild(englishNameSpan);

        const thaiNameSpan = document.createElement('span');
        thaiNameSpan.className = 'band-thai-name';
        thaiNameSpan.textContent = role["thai-name"];
        bandTextWrapper.appendChild(thaiNameSpan);

        nameBand.appendChild(bandTextWrapper);
        card.appendChild(nameBand);

        const newCapsulesContainer = document.createElement('div');
        newCapsulesContainer.className = 'new-capsules-container-overlay';

        const roughGemTag = document.createElement('span');
        roughGemTag.className = 'capsule-tag rough-gem-tag';
        roughGemTag.textContent = role["rough-gem"];
        newCapsulesContainer.appendChild(roughGemTag);

        const gemTag = document.createElement('span');
        gemTag.className = `capsule-tag gem-tag gem-${role.gem.replace(/\s/g, '')}`;
        gemTag.textContent = role.gem;
        newCapsulesContainer.appendChild(gemTag);
        card.appendChild(newCapsulesContainer);

        const imageContainer = document.createElement('div');
        imageContainer.className = 'role-image-container-overlay';
        const img = document.createElement('img');
        img.className = 'role-image-overlay';
        // Pass currentRoomData to displayRoleImageStatic
        displayRoleImageStatic(img, role, currentRoomData, true);
        imageContainer.appendChild(img);
        card.appendChild(imageContainer);

        const contentArea = document.createElement('div');
        contentArea.className = 'role-content-area-overlay';

        const description = document.createElement('div');
        description.className = 'role-description-overlay';

        const descriptionText = document.createElement('p');
        descriptionText.className = 'description-text-overlay';
        descriptionText.textContent = role.description;
        description.appendChild(descriptionText);

        contentArea.appendChild(description);

        card.appendChild(contentArea);

        card.addEventListener('click', () => showDetailedRoleOverlay(role, currentRoomData)); // Pass currentRoomData
        rolesGridContainerOverlay.appendChild(card);
        console.log(`[DEBUG] [renderAllRoleCardsToOverlay] Added overlay role card for: ${role.name}`);
    });
    console.log('[DEBUG] [renderAllRoleCardsToOverlay] Finished overlay role card rendering.');
}

/**
 * Renders the center role pool cards in the Role Pool tab.
 * @param {Array<Object>} centerRolePool - The array of role objects in the center pool.
 * @param {object} currentRoomData - The current room data (for synchronized image map).
 */
export function renderCenterRolePool(centerRolePool, currentRoomData) {
    console.log('[DEBUG] [renderCenterRolePool] Starting center role pool rendering.');
    centerRolePoolDisplay.innerHTML = '';
    if (centerRolePool.length === 0) {
        centerRolePoolDisplay.textContent = 'No role cards in the center pool.';
        return;
    }

    centerRolePool.forEach((role) => {
        const card = document.createElement('div');
        card.className = 'center-pool-card';
        card.style.margin = '0.5rem';
        card.style.transform = `rotate(${Math.random() * 6 - 3}deg)`;

        const gemData = GEM_DATA[role.gem] || GEM_DATA["None"];

        const headerBand = document.createElement('div');
        headerBand.className = 'role-header-band-overlay';
        headerBand.textContent = role.name.toUpperCase();
        card.appendChild(headerBand);

        const gemIcon = document.createElement('img');
        gemIcon.className = 'gem-icon-overlay';
        gemIcon.src = gemData.image;
        gemIcon.alt = `${gemData.name} icon`; // Fixed alt text
        card.appendChild(gemIcon);

        const nameBand = document.createElement('div');
        nameBand.className = 'role-name-band-overlay';
        nameBand.style.backgroundColor = hexToRgba(gemData.color, 0.7);
        const bandTextWrapper = document.createElement('div');
        bandTextWrapper.className = 'band-text-wrapper';
        const englishNameSpan = document.createElement('span');
        englishNameSpan.className = 'band-english-name';
        englishNameSpan.textContent = role.name.toUpperCase();
        const thaiNameSpan = document.createElement('span');
        thaiNameSpan.className = 'band-thai-name';
        thaiNameSpan.textContent = role["thai-name"];
        bandTextWrapper.appendChild(englishNameSpan);
        bandTextWrapper.appendChild(thaiNameSpan);
        nameBand.appendChild(bandTextWrapper);
        card.appendChild(nameBand);

        const newCapsulesContainer = document.createElement('div');
        newCapsulesContainer.className = 'new-capsules-container-overlay';
        const roughGemTag = document.createElement('span');
        roughGemTag.className = 'capsule-tag rough-gem-tag';
        roughGemTag.textContent = role["rough-gem"];
        newCapsulesContainer.appendChild(roughGemTag);
        const gemTag = document.createElement('span');
        gemTag.className = `capsule-tag gem-tag gem-${role.gem.replace(/\s/g, '')}`;
        gemTag.textContent = role.gem;
        newCapsulesContainer.appendChild(gemTag);
        card.appendChild(newCapsulesContainer);

        const imageContainer = document.createElement('div');
        imageContainer.className = 'role-image-container-overlay';
        const img = document.createElement('img');
        img.className = 'role-image-overlay';
        // Pass currentRoomData to displayRoleImageStatic
        displayRoleImageStatic(img, role, currentRoomData, true);
        imageContainer.appendChild(img);
        card.appendChild(imageContainer);

        const contentArea = document.createElement('div');
        contentArea.className = 'role-content-area-overlay';
        const description = document.createElement('div');
        description.className = 'role-description-overlay';
        const descriptionText = document.createElement('p');
        descriptionText.className = 'description-text-overlay';
        descriptionText.textContent = role.description;
        description.appendChild(descriptionText);
        contentArea.appendChild(description);
        card.appendChild(contentArea);

        centerRolePoolDisplay.appendChild(card);
    });
    console.log('[DEBUG] [renderCenterRolePool] Finished center role pool rendering.');
}

/**
 * Renders the player's current role cards and animates changes.
 * @param {Array<Object>} oldRoles - The previous array of role objects for the current player.
 * @param {Array<Object>} newRoles - The new array of role objects for the current player.
 * @param {object} currentRoomData - The current room data (for synchronized image map).
 */
export async function renderPlayerRoleCards(oldRoles, newRoles, currentRoomData) {
    console.log('[DEBUG] [renderPlayerRoleCards] Old Roles:', oldRoles, 'New Roles:', newRoles);

    playerRolePileContainer.style.pointerEvents = 'none';

    const newRoleObjects = newRoles.filter(newRole => !oldRoles.some(oldRole => JSON.stringify(oldRole) === JSON.stringify(newRole)));

    playerRolePileContainer.innerHTML = '';

    if (newRoles.length === 0) {
        playerRolePileContainer.innerHTML = '<p class="text-center text-gray-400 p-4">No roles assigned yet.</p>';
        playerRolePileContainer.style.pointerEvents = 'none';
        return;
    }

    for (const role of newRoles) {
        // Pass currentRoomData to createPlayerRoleCardElement
        const card = await createPlayerRoleCardElement(role, currentRoomData);
        playerRolePileContainer.appendChild(card);

        if (newRoleObjects.some(newR => JSON.stringify(newR) === JSON.stringify(role))) {
            card.classList.add('new-role-animation');
            setTimeout(() => {
                card.classList.remove('new-role-animation');
                updatePlayerCardPositions();
            }, 500);
        }
    }

    updatePlayerCardPositions();

    setTimeout(() => {
        playerRolePileContainer.style.pointerEvents = arePlayerCardsSpread ? 'auto' : 'none';
    }, 600);
}

/**
 * Creates a single player role card DOM element.
 * @param {object} role - The role object.
 * @param {object} currentRoomData - The current room data (for synchronized image map).
 * @returns {HTMLElement} The created card element.
 */
export async function createPlayerRoleCardElement(role, currentRoomData) {
    const card = document.createElement('div');
    card.className = 'player-role-card';
    card.dataset.roleName = role.name;

    const gemData = GEM_DATA[role.gem] || GEM_DATA["None"];

    const headerBand = document.createElement('div');
    headerBand.className = 'role-header-band-overlay';
    headerBand.textContent = role.name.toUpperCase();
    card.appendChild(headerBand);

    const gemIcon = document.createElement('img');
    gemIcon.className = 'gem-icon-overlay';
    gemIcon.src = gemData.image;
    gemIcon.alt = `${gemData.name} icon`; // Fixed alt text
    card.appendChild(gemIcon);

    const nameBand = document.createElement('div');
    nameBand.className = 'role-name-band-overlay';
    nameBand.style.backgroundColor = hexToRgba(gemData.color, 0.7);
    const bandTextWrapper = document.createElement('div');
    bandTextWrapper.className = 'band-text-wrapper';
    const englishNameSpan = document.createElement('span');
    englishNameSpan.className = 'band-english-name';
    englishNameSpan.textContent = role.name.toUpperCase();
    const thaiNameSpan = document.createElement('span');
    thaiNameSpan.className = 'band-thai-name';
    thaiNameSpan.textContent = role["thai-name"];
    bandTextWrapper.appendChild(englishNameSpan);
    bandTextWrapper.appendChild(thaiNameSpan);
    nameBand.appendChild(bandTextWrapper);
    card.appendChild(nameBand);

    const newCapsulesContainer = document.createElement('div');
    newCapsulesContainer.className = 'new-capsules-container-overlay';
    const roughGemTag = document.createElement('span');
    roughGemTag.className = 'capsule-tag rough-gem-tag';
    roughGemTag.textContent = role["rough-gem"];
    newCapsulesContainer.appendChild(roughGemTag);
    const gemTag = document.createElement('span');
    gemTag.className = `capsule-tag gem-tag gem-${role.gem.replace(/\s/g, '')}`;
    gemTag.textContent = role.gem;
    newCapsulesContainer.appendChild(gemTag);
    card.appendChild(newCapsulesContainer);

    const imageContainer = document.createElement('div');
    imageContainer.className = 'role-image-container-overlay';
    const img = document.createElement('img');
    img.className = 'role-image-overlay';
    // Pass currentRoomData to displayRoleImageStatic
    await displayRoleImageStatic(img, role, currentRoomData, true);
    imageContainer.appendChild(img);
    card.appendChild(imageContainer);

    const contentArea = document.createElement('div');
    contentArea.className = 'role-content-area-overlay';
    const description = document.createElement('div');
    description.className = 'role-description-overlay';
    const descriptionText = document.createElement('p');
    descriptionText.className = 'description-text-overlay';
    descriptionText.textContent = role.description;
    description.appendChild(descriptionText);
    contentArea.appendChild(description);
    card.appendChild(contentArea);

    card.addEventListener('click', (event) => {
        if (arePlayerCardsSpread) {
            event.stopPropagation();
            // Pass currentRoomData to showDetailedRoleOverlay
            showDetailedRoleOverlay(role, currentRoomData);
        }
    });
    return card;
}

/**
 * Positions player role cards either stacked at the bottom or spread in the center.
 */
export function updatePlayerCardPositions() {
    const cards = Array.from(playerRolePileContainer.children);
    const cardWidth = 220;
    const cardHeight = 320;
    const peekHeight = 50;

    const totalWidth = window.innerWidth;
    const totalHeight = window.innerHeight;

    cards.forEach((card, index) => {
        card.style.transition = 'transform 0.5s ease-out, top 0.5s ease-out, left 0.5s ease-out, opacity 0.5s ease-out';

        if (!arePlayerCardsSpread) {
            card.style.top = `${totalHeight - peekHeight + (index * 2)}px`;
            card.style.left = `${(totalWidth / 2) - (cardWidth / 2) + (index * 2)}px`;
            card.style.transform = `rotate(${Math.random() * 6 - 3}deg) scale(1)`;
            card.style.opacity = '1';
            card.style.zIndex = 950 + index;
        } else {
            const numCards = cards.length;
            const maxSpreadWidth = totalWidth * 0.8;
            const minCardSpacing = 30;
            const maxCardSpacing = cardWidth * 0.7;

            let cardSpacing = (maxSpreadWidth - cardWidth) / Math.max(1, numCards - 1);
            cardSpacing = Math.max(minCardSpacing, Math.min(maxCardSpacing, cardSpacing));

            const spreadWidth = (numCards - 1) * cardSpacing + cardWidth;
            const startX = (totalWidth / 2) - (spreadWidth / 2);

            const baseTop = (totalHeight / 2) - (cardHeight / 2);
            const verticalOffset = 20;

            const maxRotation = 15;
            const rotationStep = numCards > 1 ? (maxRotation * 2) / (numCards - 1) : 0;
            const startRotation = numCards > 1 ? -maxRotation : 0;

            card.style.left = `${startX + index * cardSpacing}px`;
            card.style.top = `${baseTop + (index % 2 === 0 ? 0 : verticalOffset)}px`;
            card.style.transform = `rotate(${startRotation + index * rotationStep}deg) scale(1)`;
            card.style.opacity = '1';
            card.style.zIndex = 970 + index;
        }
    });
}

/**
 * Toggles the spread/pile state of player role cards.
 */
export function togglePlayerCardsSpread() {
    arePlayerCardsSpread = !arePlayerCardsSpread;
    playerRolePileContainer.classList.toggle('active', arePlayerCardsSpread);
    updatePlayerCardPositions();
}

/**
 * Renders the gem settings list in the "Roles" section.
 * @param {Array<Object>} gemIncludedSettings - The array of gem settings from game_data.
 * @param {boolean} isHost - True if the current user is the host.
 * @param {object} currentRoomData - The current room data (for synchronized image map).
 */
export function renderGemSettings(gemIncludedSettings, isHost, currentRoomData) {
    console.log('[DEBUG] [renderGemSettings] Starting gem settings rendering. Received settings:', gemIncludedSettings);
    gemSettingsList.innerHTML = ''; // Clear the list before re-rendering

    // If gemIncludedSettings is empty, display a message
    if (gemIncludedSettings.length === 0) {
        const noGemsMessage = document.createElement('p');
        noGemsMessage.className = 'text-center text-gray-400 p-4';
        noGemsMessage.textContent = 'No gem categories added yet.';
        gemSettingsList.appendChild(noGemsMessage);
    } else {
        gemIncludedSettings.forEach(gemSetting => {
            const gemName = gemSetting.gem;
            const gemCount = gemSetting.count;
            const gemData = GEM_DATA[gemName];

            if (!gemData) {
                console.warn(`[WARNING] Gem data not found for ${gemName}. Skipping.`);
                return;
            }

            const gemItem = document.createElement('div');
            gemItem.className = 'gem-setting-item';
            gemItem.dataset.gemName = gemName;

            const imageArea = document.createElement('div');
            imageArea.className = 'gem-setting-image-area';
            imageArea.style.backgroundColor = hexToRgba(gemData.color, 0.4);
            const gemImage = document.createElement('img');
            gemImage.className = 'gem-setting-image';
            gemImage.src = gemData.image;
            gemImage.alt = `${gemName} icon`;
            imageArea.appendChild(gemImage);
            gemItem.appendChild(imageArea);

            // Close button (only for host)
            const closeButton = document.createElement('button');
            closeButton.className = 'gem-setting-close-btn';
            closeButton.textContent = '✖';
            closeButton.title = `Remove ${gemName}`;
            closeButton.dataset.gemName = gemName;
            closeButton.dataset.action = 'removeGem';
            closeButton.disabled = !isHost; // Disable if not host
            gemItem.appendChild(closeButton);

            const separator = document.createElement('div');
            separator.className = 'gem-setting-separator';
            gemItem.appendChild(separator);

            const counterArea = document.createElement('div');
            counterArea.className = 'gem-setting-counter-area';
            counterArea.style.backgroundColor = hexToRgba(gemData.color, 0.3);

            // Minus button (only for host)
            const minusButton = document.createElement('button');
            minusButton.className = 'gem-setting-button';
            minusButton.textContent = '-';
            minusButton.dataset.gemName = gemName;
            minusButton.dataset.action = 'decrementGem';
            minusButton.disabled = gemCount === 0 || !isHost; // Disable if count is 0 or not host
            counterArea.appendChild(minusButton);

            const countSpan = document.createElement('span');
            countSpan.className = 'gem-setting-count';
            countSpan.textContent = gemCount;
            counterArea.appendChild(countSpan);

            // Plus button (only for host)
            const plusButton = document.createElement('button');
            plusButton.className = 'gem-setting-button';
            plusButton.textContent = '+';
            plusButton.dataset.gemName = gemName;
            plusButton.dataset.action = 'incrementGem';
            plusButton.disabled = !isHost; // Disable if not host
            counterArea.appendChild(plusButton);

            gemItem.appendChild(counterArea);
            gemSettingsList.appendChild(gemItem);
        });
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
