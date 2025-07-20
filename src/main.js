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
    showDetailedRoleOverlay, hideDetailedRoleOverlay,
    showAddGemModal as uiShowAddGemModal, hideAddGemModal,
    hideRenameRoomModal, cancelRenameRoom as uiCancelRenameRoom,
    prefillRenameRoomInput
} from './ui/modals.js';
import { GEM_DATA } from './config/constants.js'; // Import GEM_DATA

// Global State Variables
let supabase = null;
let userId = null; // This will now be the 6-digit short ID
let localId = null; // Stores the full UUID for this browser instance
let userName = null;
let currentRoomId = null;
let roomSubscription = null;
let isHost = false; // This will be updated by updateRoomUI
let currentRoomData = null; // Stores the latest room data from Supabase
let currentPlayerRoles = []; // To track current player's roles for animation logic

/**
 * Initializes Supabase client and generates a local user ID.
 * Each new window/tab/device will have a distinct, locally generated userId.
 */
async function initializeApp() {
    try {
        supabase = initializeSupabaseClient();
        localId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                  ? crypto.randomUUID()
                  : generateUuidFallback();
        userId = generateShortId();
        console.log("[DEBUG] App initialized. Local UUID (localId):", localId, "Short ID (userId):", userId);
        showMessage("Supabase initialized and ready.", 'success');

        // --- Realtime Connection Test ---
        const testChannel = supabase.channel('test_channel');
        testChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('[DEBUG] [Realtime Test] Successfully subscribed to test_channel. Realtime connection appears to be working.');
                testChannel.unsubscribe();
            } else if (status === 'CHANNEL_ERROR') {
                console.error('[DEBUG] [Realtime Test] Error subscribing to test_channel. Realtime connection might be problematic.');
            } else {
                console.log(`[DEBUG] [Realtime Test] Test channel status: ${status}`);
            }
        });
        // --------------------------------

        showView('player-name');
    } catch (error) {
        console.error("[ERROR] Error initializing app:", error);
        showMessage(`Error initializing app: ${error.message}`, 'error');
    }
}

/**
 * Sets up a real-time listener for a specific room using Supabase.
 * @param {string} roomId - The ID of the room to listen to.
 */
function listenToRoom(roomId) {
    console.log(`[DEBUG] [listenToRoom] Attempting to listen to room: ${roomId}`);
    if (roomSubscription) {
        supabase.removeChannel(roomSubscription);
        roomSubscription = null;
        console.log('[DEBUG] [listenToRoom] Existing room subscription removed.');
    }

    roomSubscription = supabase
        .channel(`room:${roomId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Rooms', filter: `id=eq.${roomId}` },
            async (payload) => { // Made async to await fetchRoomData
                console.log(`[DEBUG] [Realtime Event Received] Type: ${payload.eventType}, New:`, payload.new, 'Old:', payload.old);

                if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                    // Always refetch the full room data to ensure consistency
                    const updatedRoomData = await fetchRoomData(supabase, roomId);
                    if (updatedRoomData) {
                        const playersArray = updatedRoomData.players || [];
                        const isCurrentUserStillInRoom = playersArray.some(player => player["local-id"] === localId);

                        if (!isCurrentUserStillInRoom) {
                            console.log(`[DEBUG] [KICKED_DETECTION] Current user ${localId} no longer in room ${currentRoomId}. Forcing exit.`);
                            showMessage("You have been removed from the room!", 'error');
                            if (roomSubscription) {
                                supabase.removeChannel(roomSubscription);
                                roomSubscription = null;
                            }
                            updateRoomUI(null, localId, userId, (id) => kickPlayer(supabase, currentRoomId, userId, isHost, id), currentPlayerRoles, renderPlayerRoleCards);
                            currentRoomId = null;
                            isHost = false; // Reset host status
                            showView('room-selection');
                            return;
                        }
                        currentRoomData = updatedRoomData; // Update global room data with full data
                        isHost = (localId === currentRoomData.host_id); // Update global isHost status
                        console.log("[DEBUG] [listenToRoom] Realtime update (refetched) - FULL currentRoomData:", JSON.stringify(currentRoomData, null, 2)); // Added detailed logging
                        updateRoomUI(currentRoomData, localId, userId, (id) => kickPlayer(supabase, currentRoomId, userId, isHost, id), currentPlayerRoles, renderPlayerRoleCards);
                    } else {
                        console.warn(`[WARN] [listenToRoom] Refetch of room ${roomId} returned null after update event.`);
                        // If refetch fails, treat as if room was deleted or became inaccessible
                        showMessage("Room data could not be fetched. You may have been disconnected.", 'error');
                        if (roomSubscription) {
                            supabase.removeChannel(roomSubscription);
                            roomSubscription = null;
                        }
                        updateRoomUI(null, localId, userId, (id) => kickPlayer(supabase, currentRoomId, userId, isHost, id), currentPlayerRoles, renderPlayerRoleCards);
                        currentRoomId = null;
                        isHost = false;
                        showView('room-selection');
                    }
                } else if (payload.eventType === 'DELETE') {
                    console.log("[DEBUG] [listenToRoom] Room does not exist or was deleted.");
                    showMessage("Room does not exist or was deleted. You have been disconnected from this room.", 'error');
                    // Pass current localId and userId to updateRoomUI for correct state reset
                    updateRoomUI(null, localId, userId, (id) => kickPlayer(supabase, currentRoomId, userId, isHost, id), currentPlayerRoles, renderPlayerRoleCards);
                    currentRoomId = null;
                    isHost = false; // Reset host status
                    showView('room-selection');
                    return;
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log(`[DEBUG] [listenToRoom] Subscribed to room ${roomId} changes.`);
            } else if (status === 'CHANNEL_ERROR') {
                console.error(`[ERROR] [listenToRoom] Error subscribing to room ${roomId}.`);
                showMessage(`Error subscribing to room ${roomId}.`, 'error');
            }
        });

    currentRoomId = roomId;
    roomIdInput.value = roomId;
    console.log(`[DEBUG] [listenToRoom] currentRoomId set to: ${currentRoomId}`);

    // Always fetch initial data for the room immediately
    fetchRoomData(supabase, roomId).then(data => {
        currentRoomData = data; // Update global room data
        isHost = (localId === currentRoomData?.host_id); // Update global isHost status
        console.log("[DEBUG] [listenToRoom] Initial fetch - FULL currentRoomData:", JSON.stringify(currentRoomData, null, 2)); // Added detailed logging
        updateRoomUI(currentRoomData, localId, userId, (id) => kickPlayer(supabase, currentRoomId, userId, isHost, id), currentPlayerRoles, renderPlayerRoleCards);
    });
}

// Event Listeners
setPlayerNameBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (name) {
        userName = name;
        userId = generateShortId();
        playerNameInput.disabled = true;
        setPlayerNameBtn.disabled = true;
        showMessage(`Your name is set to: ${userName} (ID: ${userId})`, 'info');
        showView('room-selection');
    } else {
        showMessage("Please enter a valid name.", 'error');
    }
});

// Fixed tab switching event listeners
createRoomTabBtn.addEventListener('click', () => showTab('create-room'));
joinRoomTabBtn.addEventListener('click', () => showTab('join-room'));


createRoomBtn.addEventListener('click', async () => {
    const newRoom = await createRoom(supabase, newRoomNameInput.value, userId);
    if (newRoom) {
        listenToRoom(newRoom.id); // Pass the ID from the new room object
        showView('my-room');
    }
});

joinRoomBtn.addEventListener('click', async () => {
    const joined = await joinRoom(supabase, roomIdInput.value, { id: userId, name: userName, "local-id": localId });
    if (joined) {
        listenToRoom(roomIdInput.value);
        showView('my-room');
    }
});

leaveRoomBtn.addEventListener('click', async () => {
    await leaveRoom(supabase, currentRoomId, userId);
    // State reset and view change handled within leaveRoom and updateRoomUI
});

incrementCounterBtn.addEventListener('click', () => {
    console.log("[DEBUG] Increment Counter button clicked.");
    incrementCounter(currentRoomId, 1);
});
generateRandomBtn.addEventListener('click', () => {
    console.log("[DEBUG] Generate Random button clicked.");
    generateRandomValue(currentRoomId);
});

renameRoomTitleBtn.addEventListener('click', () => {
    if (isHost) { // Only host can rename
        prefillRenameRoomInput(currentRoomData.name); // Pass current room name
        renameRoomModal.classList.add('active');
    } else {
        showMessage("Only the host can rename the room.", 'error');
    }
});

confirmRenameBtn.addEventListener('click', async () => {
    const success = await serviceConfirmRenameRoom(currentRoomId, renameRoomInput.value);
    if (success) {
        hideRenameRoomModal();
    }
});
cancelRenameBtn.addEventListener('click', uiCancelRenameRoom);
renameRoomModal.addEventListener('click', (event) => {
    if (event.target === renameRoomModal) {
        hideRenameRoomModal();
    }
});

playerListDiv.addEventListener('click', (event) => {
    if (event.target.classList.contains('kick-player-btn')) {
        const playerIdToKick = event.target.dataset.playerId;
        if (playerIdToKick) {
            kickPlayer(currentRoomId, playerIdToKick);
        }
    }
});

roleListDiv.addEventListener('click', (event) => {
    const target = event.target;
    const isControlButton = target.classList.contains('role-control-button') || target.classList.contains('disable-role-button');
    const parentRoleControls = target.closest('.role-controls');

    // Only allow interaction if currentRoomData is available and it's a control button
    if (isControlButton && parentRoleControls && currentRoomData) {
        const roleName = target.dataset.roleName;
        const action = target.dataset.action;
        console.log(`[DEBUG] Role control clicked: Role: ${roleName}, Action: ${action}`);

        if (roleName && action) {
            const roleTemplate = GEM_DATA.ROLE_TEMPLATES.find(r => r.name === roleName); // Use GEM_DATA.ROLE_TEMPLATES
            if (roleTemplate && roleTemplate.gem === "None" && action === 'toggleDisable') {
                showMessage(`Roles with gem "None" cannot be disabled/enabled.`, 'info');
                return;
            }

            // Role counter buttons are now editable by all players, so no !isHost check here
            if (action === 'increment') {
                updateRoleAmount(currentRoomId, roleName, 1);
            } else if (action === 'decrement') {
                updateRoleAmount(currentRoomId, roleName, -1);
            } else if (action === 'toggleDisable') {
                toggleRoleDisabled(currentRoomId, roleName, !roleTemplate.disabled);
            }
        }
    } else if (!currentRoomData) {
        console.warn("[WARN] Role control clicked but currentRoomData is not available.");
        showMessage("Room data not loaded yet. Please wait.", 'info');
    }
});

gemSettingsList.addEventListener('click', (event) => {
    const target = event.target;
    const gemName = target.dataset.gemName;
    const action = target.dataset.action;
    console.log(`[DEBUG] Gem control clicked: Gem: ${gemName}, Action: ${action}, IsHost: ${isHost}`);

    // Only allow interaction if currentRoomData is available AND current user is host
    if (currentRoomData && isHost && gemName && action) {
        if (action === 'incrementGem') {
            updateGemCount(currentRoomId, gemName, 1);
        } else if (action === 'decrementGem') {
            updateGemCount(currentRoomId, gemName, -1);
        } else if (action === 'removeGem') {
            removeGemFromSettings(currentRoomId, gemName);
        }
    } else if (currentRoomData && !isHost && (action === 'incrementGem' || action === 'decrementGem' || action === 'removeGem' || action === 'removeGem')) {
        // Inform non-hosts that they cannot edit this section
        showMessage("Only the host can edit gem settings.", 'error');
    } else if (!currentRoomData) {
        console.warn("[WARN] Gem control clicked but currentRoomData is not available.");
        showMessage("Room data not loaded yet. Please wait.", 'info');
    }
});

addGemButton.addEventListener('click', () => {
    console.log("[DEBUG] Add Gem button clicked. IsHost:", isHost);
    // Only allow host to open add gem modal
    if (currentRoomData && isHost) {
        uiShowAddGemModal(currentRoomData, (gemName) => serviceAddGemToSettings(currentRoomId, gemName));
    } else if (currentRoomData && !isHost) {
        showMessage("Only the host can add new gem categories.", 'error');
    } else {
        console.warn("[WARN] Add Gem button clicked but currentRoomData is not available.");
        showMessage("Room data not loaded yet. Please wait.", 'info');
    }
});
cancelAddGemBtn.addEventListener('click', hideAddGemModal);
addGemModal.addEventListener('click', (event) => {
    if (event.target === addGemModal) {
        hideAddGemModal();
    }
});

startGameBtn.addEventListener('click', () => {
    console.log("[DEBUG] Start Game button clicked. IsHost:", isHost);
    if (isHost) { // Only host can start the game
        startGame(currentRoomId, userId);
    } else {
        showMessage("Only the host can start the game.", 'error');
    }
});

viewAllRolesBtn.addEventListener('click', () => uiShowRolesOverlay(currentRoomData, renderAllRoleCardsToOverlay));
rolesOverlayCloseBtn.addEventListener('click', hideRolesOverlay);
detailedOverlayCloseBtn.addEventListener('click', hideDetailedRoleOverlay);

rolesOverlay.addEventListener('click', (event) => {
    if (event.target === rolesOverlay) {
        hideRolesOverlay();
    }
});

detailedRoleOverlay.addEventListener('click', (event) => {
    if (event.target === detailedOverlay) {
        hideDetailedRoleOverlay();
    }
});

// Role Pool Tab functionality
rolePoolTabKnob.addEventListener('click', toggleRolePoolTabVisibility);
rolePoolTabCloseBtn.addEventListener('click', toggleRolePoolTabVisibility);

// Drag functionality for the Role Pool tab
let rolePoolStartX = 0;
let rolePoolInitialLeft = 0;
let isRolePoolDragging = false; // Local state for dragging

rolePoolTab.addEventListener('mousedown', (e) => {
    isRolePoolDragging = true;
    rolePoolStartX = e.clientX;
    rolePoolInitialLeft = rolePoolTab.getBoundingClientRect().left;
    rolePoolTab.style.transition = 'none';
    document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
    if (!isRolePoolDragging) return;

    const dx = e.clientX - rolePoolStartX;
    let newLeft = rolePoolInitialLeft + dx;

    const maxHiddenLeft = -rolePoolTab.offsetWidth;
    newLeft = Math.min(0, Math.max(maxHiddenLeft, newLeft));

    rolePoolTab.style.transform = `translateX(${newLeft}px)`;
});

document.addEventListener('mouseup', () => {
    if (!isRolePoolDragging) return;
    isRolePoolDragging = false;
    rolePoolTab.style.transition = 'transform 0.5s ease-in-out';

    const currentLeft = rolePoolTab.getBoundingClientRect().left;
    const threshold = -rolePoolTab.offsetWidth / 2;

    if (currentLeft > threshold) {
        rolePoolTab.classList.add('active');
        // isRolePoolTabOpen is managed by toggleRolePoolTabVisibility, no need to set here
        rolePoolTab.style.transform = 'translateX(0)';
    } else {
        rolePoolTab.classList.remove('active');
        // isRolePoolTabOpen is managed by toggleRolePoolTabVisibility, no need to set here
        rolePoolTab.style.transform = 'translateX(-100%)';
    }
    document.body.style.userSelect = '';
});

// Touch events for Role Pool tab
rolePoolTab.addEventListener('touchstart', (e) => {
    isRolePoolDragging = true;
    rolePoolStartX = e.touches[0].clientX;
    rolePoolInitialLeft = rolePoolTab.getBoundingClientRect().left;
    rolePoolTab.style.transition = 'none';
    document.body.style.userSelect = 'none';
});

document.addEventListener('touchmove', (e) => {
    if (!isRolePoolDragging) return;
    const dx = e.touches[0].clientX - rolePoolStartX;
    const maxHiddenLeft = -rolePoolTab.offsetWidth;
    let newLeft = rolePoolInitialLeft + dx;
    newLeft = Math.min(0, Math.max(maxHiddenLeft, newLeft));
    rolePoolTab.style.transform = `translateX(${newLeft}px)`;
});

document.addEventListener('touchend', () => {
    if (!isRolePoolDragging) return;
    isRolePoolDragging = false;
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

// Player Role Card System Event Listener
myRoleTriggerArea.addEventListener('click', togglePlayerCardsSpread);
window.addEventListener('resize', updatePlayerCardPositions);

// --- Online Status Detection (beforeunload) ---
window.addEventListener('beforeunload', async (event) => {
    console.log('[DEBUG] [beforeunload] Page is about to unload. Attempting to leave room...');
    if (currentRoomId && userId && supabase) {
        try {
            supabase.rpc('remove_player_from_room', {
                p_room_id: currentRoomId,
                p_player_id: userId
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
