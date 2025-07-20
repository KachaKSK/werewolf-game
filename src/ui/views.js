// src/ui/views.js
// Contains functions for switching between main views and tabs.

import {
    playerNamelSection, roomSelectionCard, myRoomViewDiv, createRoomTabBtn,
    joinRoomTabBtn, createRoomTabContent, joinRoomTabContent, roomIdInput,
    rolePoolTab, rolePoolTabKnob, myRoleTriggerArea, playerRolePileContainer,
    gemCounterSection, startGameBtn, dynamicMainTitle, roomNameDisplay,
    renameRoomTitleBtn
} from '../config/dom-elements.js';
import { updatePlayerCardPositions } from './render.js'; // Import for card positioning

let arePlayerCardsSpread = false; // Local state for card spread/pile
let isRolePoolTabOpen = false; // Local state for role pool tab

/**
 * Switches between different main views of the application.
 * @param {string} view - 'player-name', 'room-selection', or 'my-room'.
 */
export function showView(view) {
    console.log(`[DEBUG] [showView] Called with: ${view}`);

    // Hide all main view sections first
    playerNamelSection.classList.add('hidden');
    roomSelectionCard.classList.add('hidden');
    myRoomViewDiv.classList.add('hidden');

    // Reset tab states
    createRoomTabBtn.classList.remove('active');
    joinRoomTabBtn.classList.remove('active');
    createRoomTabContent.classList.add('hidden');
    joinRoomTabContent.classList.add('hidden');

    roomIdInput.value = '';

    rolePoolTab.classList.remove('active');
    rolePoolTabKnob.classList.add('hidden');
    isRolePoolTabOpen = false;

    playerRolePileContainer.innerHTML = '';
    arePlayerCardsSpread = false;
    playerRolePileContainer.classList.remove('active');
    myRoleTriggerArea.classList.add('hidden');

    // gemCounterSection and startGameBtn visibility is now handled by updateRoomUI based on isHost
    // No need to explicitly hide them here, as updateRoomUI will be called after view change.
    // However, for initial state when no room is joined, they should be hidden.
    gemCounterSection.classList.add('hidden');
    startGameBtn.classList.add('hidden');


    if (view === 'player-name') {
        dynamicMainTitle.classList.add('hidden');
        playerNamelSection.classList.remove('hidden');
        renameRoomTitleBtn.classList.add('hidden');
    } else if (view === 'room-selection') {
        dynamicMainTitle.classList.remove('hidden');
        roomNameDisplay.textContent = 'WolfVille Village';
        dynamicMainTitle.classList.remove('room-title-sign');
        if (dynamicMainTitle.contains(renameRoomTitleBtn)) {
            dynamicMainTitle.removeChild(renameRoomTitleBtn);
        }
        renameRoomTitleBtn.classList.add('hidden');
        roomSelectionCard.classList.remove('hidden');
        // Ensure the create room tab is shown by default when entering room selection
        showTab('create-room');
    } else if (view === 'my-room') {
        dynamicMainTitle.classList.remove('hidden');
        dynamicMainTitle.classList.add('room-title-sign');
        if (!dynamicMainTitle.contains(renameRoomTitleBtn)) {
            dynamicMainTitle.appendChild(renameRoomTitleBtn);
        }
        myRoomViewDiv.classList.remove('hidden');
        rolePoolTabKnob.classList.remove('hidden');
        myRoleTriggerArea.classList.remove('hidden');
    } else {
        console.warn(`[DEBUG] [showView] Unknown view requested: ${view}`);
    }
    console.log(`[DEBUG] [showView] Displaying: ${view}`);
}

/**
 * Switches between the 'Create Room' and 'Join Room' tabs.
 * @param {string} tab - 'create-room' or 'join-room'.
 */
export function showTab(tab) {
    console.log(`[DEBUG] [showTab] Called with: ${tab}`);

    // Deactivate all tab buttons
    createRoomTabBtn.classList.remove('active');
    joinRoomTabBtn.classList.remove('active');

    // Hide all tab contents
    createRoomTabContent.classList.add('hidden');
    joinRoomTabContent.classList.add('hidden');

    roomIdInput.value = ''; // Clear input when switching tabs

    if (tab === 'create-room') {
        createRoomTabBtn.classList.add('active');
        createRoomTabContent.classList.remove('hidden');
        console.log('[DEBUG] [showTab] Create Room Tab content shown.');
    } else if (tab === 'join-room') {
        joinRoomTabBtn.classList.add('active');
        joinRoomTabContent.classList.remove('hidden');
        console.log('[DEBUG] [showTab] Join Room Tab content shown.');
    } else {
        console.warn(`[DEBUG] [showTab] Unknown tab requested: ${tab}`);
    }
}

// Export for drag functionality
export { arePlayerCardsSpread, isRolePoolTabOpen };
