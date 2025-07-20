// src/main.js
// Main application logic, orchestrating imports and managing global state.

import { initializeSupabaseClient } from './config/supabase.js';
import {
    playerNameInput, setPlayerNameBtn, newRoomNameInput, createRoomBtn,
    roomIdInput, joinRoomBtn, leaveRoomBtn, incrementCounterBtn,
    generateRandomBtn, renameRoomTitleBtn, confirmRenameBtn, cancelRenameBtn,
    playerListDiv, roleListDiv, gemSettingsList, addGemButton,
    addGemModal, rolesOverlayCloseBtn, detailedOverlayCloseBtn,
    viewAllRolesBtn, myRoleTriggerArea, rolePoolTab, rolePoolTabKnob,
    rolePoolTabCloseBtn, createRoomTabBtn, joinRoomTabBtn // Added tab buttons
} from './config/dom-elements.js';
import {
    showMessage, generateShortId, generateUuidFallback
} from './utils/helpers.js';
import {
    fetchRoomData, createRoom, joinRoom, leaveRoom, kickPlayer,
    renameRoomTitle, confirmRenameRoom as serviceConfirmRenameRoom,
    incrementCounter, generateRandomValue, updateGameDataInDB,
    updateRoleAmount, toggleRoleDisabled, updateGemCount,
    removeGemFromSettings, addGemToSettings as serviceAddGemToSettings, startGame
} from './services/room-service.js';
import {
    updateRoomUI, renderAllRoleCardsToOverlay, renderPlayerRoleCards,
    togglePlayerCardsSpread, updatePlayerCardPositions, toggleRolePoolTabVisibility
} from './ui/render.js';
import {
    showView, showTab
} from './ui/views.js';
import {
    showRolesOverlay as uiShowRolesOverlay, hideRolesOverlay,
    hideDetailedRoleOverlay, showAddGemModal, hideAddGemModal,
    showRenameRoomModal, hideRenameRoomModal, cancelRenameRoom,
    prefillRenameRoomInput
} from './ui/modals.js';

// --- Global Variables ---
let supabase;
let currentRoomId = null;
let userId = null; // Short ID for display
let localId = null; // Full UUID for internal use
let currentRoomData = null; // Store the current room data
let currentPlayerRoles = []; // Store the current player's roles

// --- Initialization ---
/**
 * Initializes the application, sets up Supabase, and handles initial view.
 */
async function initializeApp() {
    console.log("[DEBUG] Initializing app...");
    try {
        supabase = initializeSupabaseClient();
        console.log("[DEBUG] Supabase client initialized.");

        // Check for existing player name in localStorage
        const storedPlayerName = localStorage.getItem('playerName');
        if (storedPlayerName) {
            playerNameInput.value = storedPlayerName;
            // Directly show room selection if name exists
            showView('room-selection');
            console.log("[DEBUG] Player name found in localStorage, showing room selection.");
        } else {
            showView('player-name');
            console.log("[DEBUG] No player name found, showing player name input.");
        }

        // Generate a unique local ID for the user if not already present
        localId = localStorage.getItem('localId');
        if (!localId) {
            localId = generateUuidFallback();
            localStorage.setItem('localId', localId);
            console.log(`[DEBUG] Generated new localId: ${localId}`);
        } else {
            console.log(`[DEBUG] Using existing localId: ${localId}`);
        }

        // Generate a short user ID for display
        userId = generateShortId();
        console.log(`[DEBUG] Generated short userId for display: ${userId}`);

        // Set up real-time listener for room data
        setupRoomRealtimeListener();

    } catch (error) {
        console.error("[ERROR] App initialization failed:", error);
        showMessage("Failed to initialize application. Please try again.", 'error');
    }
}

// --- Supabase Realtime Listener ---
/**
 * Sets up the Supabase real-time listener for room data changes.
 */
function setupRoomRealtimeListener() {
    supabase
        .channel('room_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Rooms' }, payload => {
            console.log('[DEBUG] Realtime change received!', payload);
            if (payload.eventType === 'UPDATE' && payload.new.id === currentRoomId) {
                currentRoomData = payload.new; // Update global room data
                updateRoomUI(currentRoomData, localId, userId, kickPlayerWrapper, currentPlayerRoles, renderPlayerRoleCards);
                console.log('[DEBUG] Room data updated via real-time:', currentRoomData);
            } else if (payload.eventType === 'DELETE' && payload.old.id === currentRoomId) {
                showMessage("The room you were in has been deleted by the host.", 'info');
                leaveRoomWrapper(); // Automatically leave the room if it's deleted
                console.log('[DEBUG] Room deleted via real-time. Leaving room.');
            }
        })
        .subscribe();
    console.log('[DEBUG] Subscribed to room_changes channel.');
}

// --- Wrapper Functions for UI Interaction ---
// These wrappers ensure consistent state management and UI updates

/**
 * Wrapper for setting player name.
 */
async function setPlayerNameWrapper() {
    const playerName = playerNameInput.value.trim();
    if (playerName) {
        localStorage.setItem('playerName', playerName);
        showMessage(`Player name set to: ${playerName}`, 'success');
        showView('room-selection');
        console.log(`[DEBUG] Player name set: ${playerName}`);
    } else {
        showMessage('Please enter your player name.', 'error');
        console.warn('[DEBUG] Player name input is empty.');
    }
}

/**
 * Wrapper for creating a room.
 */
async function createRoomWrapper() {
    const roomName = newRoomNameInput.value.trim();
    const playerName = localStorage.getItem('playerName');
    if (!roomName || !playerName) {
        showMessage('Please enter a room name and ensure your player name is set.', 'error');
        console.warn('[DEBUG] Room name or player name missing for room creation.');
        return;
    }
    try {
        const room = await createRoom(roomName, localId, userId, playerName, supabase);
        if (room) {
            currentRoomId = room.id;
            currentRoomData = room; // Set initial room data
            updateRoomUI(room, localId, userId, kickPlayerWrapper, currentPlayerRoles, renderPlayerRoleCards);
            showView('my-room');
            showMessage(`Room '${roomName}' created! Room ID: ${room.id}`, 'success');
            console.log(`[DEBUG] Room created with ID: ${room.id}`);
        }
    } catch (error) {
        console.error("[ERROR] Error creating room:", error);
        showMessage(`Error creating room: ${error.message}`, 'error');
    }
}

/**
 * Wrapper for joining a room.
 */
async function joinRoomWrapper() {
    const roomId = roomIdInput.value.trim();
    const playerName = localStorage.getItem('playerName');
    if (!roomId || !playerName) {
        showMessage('Please enter a Room ID and ensure your player name is set.', 'error');
        console.warn('[DEBUG] Room ID or player name missing for joining room.');
        return;
    }
    try {
        const room = await joinRoom(roomId, localId, userId, playerName, supabase);
        if (room) {
            currentRoomId = room.id;
            currentRoomData = room; // Set initial room data
            updateRoomUI(room, localId, userId, kickPlayerWrapper, currentPlayerRoles, renderPlayerRoleCards);
            showView('my-room');
            showMessage(`Joined room: ${room.game_data.roomName || room.id}`, 'success');
            console.log(`[DEBUG] Joined room with ID: ${room.id}`);
        }
    } catch (error) {
        console.error("[ERROR] Error joining room:", error);
        showMessage(`Error joining room: ${error.message}`, 'error');
    }
}

/**
 * Wrapper for leaving a room.
 */
async function leaveRoomWrapper() {
    if (currentRoomId && localId) {
        try {
            await leaveRoom(currentRoomId, localId, supabase);
            currentRoomId = null;
            currentRoomData = null; // Clear room data
            currentPlayerRoles = []; // Clear player roles on leaving
            updateRoomUI(null, localId, userId, kickPlayerWrapper, currentPlayerRoles, renderPlayerRoleCards); // Clear UI
            showView('room-selection');
            showMessage('Left the room.', 'info');
            console.log('[DEBUG] Left the room.');
        } catch (error) {
            console.error("[ERROR] Error leaving room:", error);
            showMessage(`Error leaving room: ${error.message}`, 'error');
        }
    }
}

/**
 * Wrapper for kicking a player.
 * @param {string} playerIdToKick - The short ID of the player to kick.
 */
async function kickPlayerWrapper(playerIdToKick) {
    if (currentRoomId && localId && currentRoomData && localId === currentRoomData.host_id) {
        try {
            await kickPlayer(currentRoomId, playerIdToKick, supabase);
            showMessage(`Player ${playerIdToKick} kicked.`, 'info');
            console.log(`[DEBUG] Kicked player: ${playerIdToKick}`);
        } catch (error) {
            console.error("[ERROR] Error kicking player:", error);
            showMessage(`Error kicking player: ${error.message}`, 'error');
        }
    } else {
        showMessage('You are not authorized to kick players.', 'error');
        console.warn('[DEBUG] Attempted to kick player without host authorization.');
    }
}

/**
 * Wrapper for confirming room rename.
 */
async function confirmRenameRoomWrapper() {
    const newName = renameRoomInput.value.trim();
    if (newName && currentRoomId && localId && currentRoomData && localId === currentRoomData.host_id) {
        try {
            await serviceConfirmRenameRoom(currentRoomId, newName, supabase);
            hideRenameRoomModal();
            showMessage(`Room renamed to '${newName}'.`, 'success');
            console.log(`[DEBUG] Room renamed to: ${newName}`);
        } catch (error) {
            console.error("[ERROR] Error renaming room:", error);
            showMessage(`Error renaming room: ${error.message}`, 'error');
        }
    } else if (!newName) {
        showMessage('Please enter a new room name.', 'error');
        console.warn('[DEBUG] New room name input is empty.');
    } else {
        showMessage('You are not authorized to rename the room.', 'error');
        console.warn('[DEBUG] Attempted to rename room without host authorization.');
    }
}

/**
 * Wrapper for adding a gem to settings.
 * @param {string} gemName - The name of the gem to add.
 * @returns {boolean} True if successful, false otherwise.
 */
async function addGemToSettingsWrapper(gemName) {
    if (currentRoomId && localId && currentRoomData && localId === currentRoomData.host_id) {
        try {
            const success = await serviceAddGemToSettings(currentRoomId, gemName, supabase, currentRoomData.game_data?.gem_included_settings || []);
            if (success) {
                showMessage(`Added ${gemName} to gem settings.`, 'success');
                console.log(`[DEBUG] Added gem to settings: ${gemName}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error("[ERROR] Error adding gem to settings:", error);
            showMessage(`Error adding gem: ${error.message}`, 'error');
            return false;
        }
    } else {
        showMessage('You are not authorized to modify gem settings.', 'error');
        console.warn('[DEBUG] Attempted to add gem without host authorization.');
        return false;
    }
}

/**
 * Wrapper for starting the game.
 */
async function startGameWrapper() {
    if (currentRoomId && localId && currentRoomData && localId === currentRoomData.host_id) {
        try {
            await startGame(currentRoomId, supabase, currentRoomData);
            console.log('[DEBUG] Game start initiated.');
        } catch (error) {
            console.error("[ERROR] Error starting game:", error);
            showMessage(`Error starting game: ${error.message}`, 'error');
        }
    } else {
        showMessage('You are not authorized to start the game.', 'error');
        console.warn('[DEBUG] Attempted to start game without host authorization.');
    }
}

// --- Event Listeners ---

// Player Name Section
setPlayerNameBtn.addEventListener('click', setPlayerNameWrapper);
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        setPlayerNameWrapper();
    }
});

// Room Selection Tabs
createRoomTabBtn.addEventListener('click', () => showTab('create-room'));
joinRoomTabBtn.addEventListener('click', () => showTab('join-room'));

// Create/Join Room Section
createRoomBtn.addEventListener('click', createRoomWrapper);
newRoomNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        createRoomWrapper();
    }
});

joinRoomBtn.addEventListener('click', joinRoomWrapper);
roomIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinRoomWrapper();
    }
});

// My Room View
leaveRoomBtn.addEventListener('click', leaveRoomWrapper);
renameRoomTitleBtn.addEventListener('click', () => {
    prefillRenameRoomInput();
    showRenameRoomModal();
});
confirmRenameBtn.addEventListener('click', confirmRenameRoomWrapper);
cancelRenameBtn.addEventListener('click', cancelRenameRoom);

// Roles Overlay
viewAllRolesBtn.addEventListener('click', () => uiShowRolesOverlay(currentRoomData, renderAllRoleCardsToOverlay));
rolesOverlayCloseBtn.addEventListener('click', hideRolesOverlay);
detailedOverlayCloseBtn.addEventListener('click', hideDetailedRoleOverlay);

// Gem Settings List (Delegated Events for dynamic buttons)
gemSettingsList.addEventListener('click', async (event) => {
    const target = event.target;
    const action = target.dataset.action;
    const gemName = target.dataset.gemName;

    if (!currentRoomId || !localId || !currentRoomData || localId !== currentRoomData.host_id) {
        showMessage('You are not authorized to modify gem settings.', 'error');
        return;
    }

    if (gemName && action) {
        try {
            if (action === 'incrementGem') {
                await updateGemCount(currentRoomId, gemName, 1, supabase, currentRoomData.game_data?.gem_included_settings || []);
                console.log(`[DEBUG] Incremented gem: ${gemName}`);
            } else if (action === 'decrementGem') {
                await updateGemCount(currentRoomId, gemName, -1, supabase, currentRoomData.game_data?.gem_included_settings || []);
                console.log(`[DEBUG] Decremented gem: ${gemName}`);
            } else if (action === 'removeGem') {
                await removeGemFromSettings(currentRoomId, gemName, supabase, currentRoomData.game_data?.gem_included_settings || []);
                console.log(`[DEBUG] Removed gem: ${gemName}`);
            }
        } catch (error) {
            console.error(`[ERROR] Error updating gem count for ${gemName}:`, error);
            showMessage(`Error updating gem count: ${error.message}`, 'error');
        }
    }
});

// Add Gem Modal
addGemButton.addEventListener('click', () => showAddGemModal(addGemToSettingsWrapper));
cancelAddGemBtn.addEventListener('click', hideAddGemModal);

// Start Game Button
startGameBtn.addEventListener('click', startGameWrapper);

// Role List (Delegated Events for dynamic buttons)
roleListDiv.addEventListener('click', async (event) => {
    const target = event.target;
    const action = target.dataset.action;
    const roleName = target.dataset.roleName;

    if (!currentRoomId || !localId || !currentRoomData) {
        showMessage('Please join a room first.', 'error');
        return;
    }

    if (roleName && action) {
        try {
            if (action === 'increment') {
                await updateRoleAmount(currentRoomId, roleName, 1, supabase, currentRoomData.game_data?.role_settings || []);
                console.log(`[DEBUG] Incremented role amount for: ${roleName}`);
            } else if (action === 'decrement') {
                await updateRoleAmount(currentRoomId, roleName, -1, supabase, currentRoomData.game_data?.role_settings || []);
                console.log(`[DEBUG] Decremented role amount for: ${roleName}`);
            } else if (action === 'toggleDisable') {
                await toggleRoleDisabled(currentRoomId, roleName, supabase, currentRoomData.game_data?.role_settings || []);
                console.log(`[DEBUG] Toggled disable status for role: ${roleName}`);
            }
        } catch (error) {
            console.error(`[ERROR] Error updating role amount for ${roleName}:`, error);
            showMessage(`Error updating role: ${error.message}`, 'error');
        }
    }
});


// Role Pool Tab Drag Functionality
let isDragging = false;
let startX;
let initialTransformX;

rolePoolTabKnob.addEventListener('mousedown', (e) => {
    if (rolePoolTab.classList.contains('active')) {
        isDragging = true;
        startX = e.clientX;
        initialTransformX = rolePoolTab.getBoundingClientRect().left;
        rolePoolTab.style.transition = 'none'; // Disable transition during drag
        document.body.style.userSelect = 'none'; // Prevent text selection during drag
    }
});

rolePoolTabKnob.addEventListener('touchstart', (e) => {
    if (rolePoolTab.classList.contains('active')) {
        isDragging = true;
        startX = e.touches[0].clientX;
        initialTransformX = rolePoolTab.getBoundingClientRect().left;
        rolePoolTab.style.transition = 'none'; // Disable transition during drag
        document.body.style.userSelect = 'none'; // Prevent text selection during drag
    }
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    let newX = initialTransformX + dx;

    // Constrain movement to within the tab's width (left edge of screen to its full width)
    newX = Math.max(-rolePoolTab.offsetWidth, Math.min(0, newX));
    rolePoolTab.style.transform = `translateX(${newX}px)`;
});

document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - startX;
    let newX = initialTransformX + dx;

    // Constrain movement to within the tab's width (left edge of screen to its full width)
    newX = Math.max(-rolePoolTab.offsetWidth, Math.min(0, newX));
    rolePoolTab.style.transform = `translateX(${newX}px)`;
});

document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    rolePoolTab.style.transition = 'transform 0.5s ease-in-out';

    const currentLeft = rolePoolTab.getBoundingClientRect().left;
    const threshold = -rolePoolTab.offsetWidth / 2;

    if (currentLeft > threshold) {
        rolePoolTab.classList.add('active');
        rolePoolTab.style.transform = 'translateX(0)';
    } else {
        rolePoolTab.classList.remove('active');
        rolePoolTab.style.transform = 'translateX(-100%)';
    }
    document.body.style.userSelect = '';
});

document.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    rolePoolTab.style.transition = 'transform 0.5s ease-in-out';

    const currentLeft = rolePoolTab.getBoundingClientRect().left;
    const threshold = -rolePoolTab.offsetWidth / 2;

    if (currentLeft > threshold) {
        rolePoolTab.classList.add('active');
        rolePoolTab.style.transform = 'translateX(0)';
    } else {
        rolePoolTab.classList.remove('active');
        rolePoolTab.style.transform = 'translateX(-100%)';
    }
    document.body.style.userSelect = '';
});


// Role Pool Tab Visibility Toggle
rolePoolTabKnob.addEventListener('click', toggleRolePoolTabVisibility);
rolePoolTabCloseBtn.addEventListener('click', toggleRolePoolTabVisibility);

// Player Role Card System Event Listener
myRoleTriggerArea.addEventListener('click', togglePlayerCardsSpread);
window.addEventListener('resize', updatePlayerCardPositions);

// --- Online Status Detection (beforeunload) ---
window.addEventListener('beforeunload', async (event) => {
    console.log('[DEBUG] [beforeunload] Page is about to unload. Attempting to leave room...');
    if (currentRoomId && userId && supabase) {
        try {
            // Using RPC for direct function call as a workaround for potential issues
            // with delete from table on unload, as it might be too late for RLS.
            // This assumes you have a Supabase function 'remove_player_from_room'
            // that handles player removal based on room_id and player_id.
            supabase.rpc('remove_player_from_room', {
                p_room_id: currentRoomId,
                p_player_id: localId // Use localId (UUID) for consistency with player object
            });
            console.log('[DEBUG] [beforeunload] Sent leave room request.');
        } catch (error) {
            console.error('[ERROR] [beforeunload] Error sending leave room request:', error);
        }
    }
});
// ----------------------------------------------

// Initialize the application when the window loads
window.onload = initializeApp;

console.log("Script fully loaded and executed.");
