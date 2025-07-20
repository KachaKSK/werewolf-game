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
    myRoleTriggerArea.classList.add('hidden'); // Hide player role trigger area by default
    playerRolePileContainer.innerHTML = ''; // Clear player cards when switching views
    playerRolePileContainer.classList.remove('spread'); // Ensure not spread

    // Hide gem counter section and start game button by default
    gemCounterSection.classList.add('hidden');
    startGameBtn.classList.add('hidden');


    if (view === 'player-name') {
        playerNamelSection.classList.remove('hidden');
        dynamicMainTitle.textContent = 'WolfVille Village Host';
        console.log('[DEBUG] [showView] Player Name Section shown.');
    } else if (view === 'room-selection') {
        roomSelectionCard.classList.remove('hidden');
        dynamicMainTitle.textContent = 'Join or Create Room';
        console.log('[DEBUG] [showView] Room Selection Card shown.');
    } else if (view === 'my-room') {
        dynamicMainTitle.textContent = `Room: ${roomNameDisplay.textContent}`; // Update title dynamically
        // Only add rename button if it's not already there
        if (!roomNameDisplay.querySelector('#renameRoomTitleBtn')) {
            roomNameDisplay.appendChild(renameRoomTitleBtn);
        }
        myRoomViewDiv.classList.remove('hidden');
        rolePoolTabKnob.classList.remove('hidden');
        myRoleTriggerArea.classList.remove('hidden');
        gemCounterSection.classList.remove('hidden'); // Show gem counter section in my-room view
        startGameBtn.classList.remove('hidden'); // Show start game button in my-room view
        console.log('[DEBUG] [showView] My Room View shown.');
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
    console.log(`[DEBUG] [showTab] Displaying tab: ${tab}`);
}
