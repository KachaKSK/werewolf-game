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
    showRolesOverlay as uiShowRolesOverlay, hideRolesOverlay as uiHideRolesOverlay,
    showDetailedRoleOverlay as uiShowDetailedRoleOverlay, hideDetailedRoleOverlay as uiHideDetailedRoleOverlay,
    showAddGemModal as uiShowAddGemModal, hideAddGemModal as uiHideAddGemModal,
    showRenameRoomModal as uiShowRenameRoomModal, hideRenameRoomModal as uiHideRenameRoomModal,
    prefillRenameRoomInput
} from './ui/modals.js';
import { ROLE_TEMPLATES, GEM_DATA } from './config/constants.js'; // Import ROLE_TEMPLATES and GEM_DATA

let supabase;
let currentRoomId = null;
let userId = null; // Short ID
let localId = null; // Full UUID for host check
let roomChannel = null;
let playerName = '';
let currentRoomData = null; // Store the latest room data


// --- Initialization ---
async function initializeApp() {
    console.log("[DEBUG] Initializing app...");
    supabase = initializeSupabaseClient();
    localId = localStorage.getItem('localId');
    if (!localId) {
        localId = generateUuidFallback();
        localStorage.setItem('localId', localId);
    }
    console.log(`[DEBUG] Local ID: ${localId}`);

    playerName = localStorage.getItem('playerName');
    console.log(`[DEBUG] Player name from localStorage: ${playerName}`);

    // Always show the player name input view first.
    // The player name input will be pre-filled if a name exists in localStorage.
    console.log("[DEBUG] Calling showView('player-name') at app initialization.");
    showView('player-name');
    if (playerName) {
        playerNameInput.value = playerName;
        console.log(`[DEBUG] Player name input pre-filled with: ${playerNameInput.value}`);
        // Do not automatically transition to room-selection here.
        // The transition will happen when the user clicks "Set Name" or "Join Room".
    } else {
        console.log("[DEBUG] No player name found in localStorage. Player name input remains empty.");
    }

    // Check for existing room ID in local storage or URL.
    // This logic will now run *after* the player name view is displayed.
    // If a room ID is found, the user will be prompted to join after setting their name.
    const urlParams = new URLSearchParams(window.location.search);
    const storedRoomId = localStorage.getItem('currentRoomId');
    const urlRoomId = urlParams.get('room');

    if (urlRoomId) {
        roomIdInput.value = urlRoomId;
        console.log(`[DEBUG] Room ID found in URL: ${urlRoomId}.`);
        // Do not automatically join here. The user will manually click "Join Room"
        // after seeing their name pre-filled or entering a new one.
        showMessage(`Room ID from URL: ${urlRoomId}. Please click 'Join Room' to enter.`, 'info');
    } else if (storedRoomId) {
        roomIdInput.value = storedRoomId;
        console.log(`[DEBUG] Previous room ID found in localStorage: ${storedRoomId}.`);
        // Do not automatically join here.
        showMessage(`Previous room ID found: ${storedRoomId}. Please click 'Join Room' to re-enter.`, 'info');
    } else {
        console.log("[DEBUG] No room ID found in URL or localStorage.");
    }

    setupEventListeners();
    console.log("[DEBUG] App initialized finished.");
}

// --- Event Handlers ---
async function handleSetPlayerName() {
    const name = playerNameInput.value.trim();
    if (name) {
        playerName = name;
        localStorage.setItem('playerName', playerName);
        showMessage(`Player name set to: ${playerName}`, 'success');
        console.log("[DEBUG] Player name set. Calling showView('room-selection').");
        showView('room-selection'); // Transition to room selection after name is set
        showTab('create-room'); // Default to create room tab
    } else {
        showMessage('Please enter a player name.', 'error');
        console.log("[DEBUG] Player name input was empty.");
    }
}

async function handleCreateRoom() {
    let roomName = newRoomNameInput.value.trim();
    // If roomName is empty, use the placeholder content as the room name
    if (!roomName) {
        roomName = newRoomNameInput.placeholder.trim();
        console.log(`[DEBUG] Room name input was empty, using placeholder: "${roomName}"`);
    }

    if (!roomName) { // Fallback if placeholder is also empty
        showMessage('Please enter a room name or ensure the placeholder has content.', 'error');
        return;
    }

    if (!playerName) {
        showMessage('Please set your player name first.', 'error');
        showView('player-name');
        return;
    }

    try {
        const newRoom = await createRoom(supabase, roomName, localId, playerName);
        if (newRoom) {
            currentRoomId = newRoom.id;
            userId = newRoom.players[0].player_id; // Host's short ID
            localStorage.setItem('currentRoomId', currentRoomId);
            localStorage.setItem('userId', userId); // Store short ID
            history.pushState(null, '', `?room=${currentRoomId}`); // Update URL
            subscribeToRoomChanges(currentRoomId);
            showMessage(`Room "${roomName}" created!`, 'success');
            console.log("[DEBUG] Room created. Calling showView('my-room').");
            showView('my-room');
        }
    } catch (error) {
        console.error("[ERROR] Error creating room:", error);
        showMessage(`Error creating room: ${error.message}`, 'error');
    }
}

async function handleJoinRoom() {
    const roomId = roomIdInput.value.trim();
    if (!roomId) {
        showMessage('Please enter a room ID.', 'error');
        return;
    }
    if (!playerName) {
        showMessage('Please set your player name first.', 'error');
        showView('player-name');
        return;
    }

    try {
        const joinResult = await joinRoom(supabase, roomId, localId, playerName);
        if (joinResult) {
            currentRoomId = roomId;
            userId = joinResult.player_id; // Get the short ID assigned by the room
            localStorage.setItem('currentRoomId', currentRoomId);
            localStorage.setItem('userId', userId); // Store short ID
            history.pushState(null, '', `?room=${currentRoomId}`); // Update URL
            subscribeToRoomChanges(currentRoomId);
            showMessage(`Joined room "${roomId}"!`, 'success');
            console.log("[DEBUG] Room joined. Calling showView('my-room').");
            showView('my-room');
        }
    } catch (error) {
        console.error("[ERROR] Error joining room:", error);
        showMessage(`Error joining room: ${error.message}`, 'error');
    }
}

async function handleLeaveRoom() {
    if (!currentRoomId || !userId) {
        showMessage('Not in a room to leave.', 'info');
        return;
    }

    try {
        await leaveRoom(supabase, currentRoomId, userId, localId);
        if (roomChannel) {
            await roomChannel.unsubscribe();
            supabase.removeChannel(roomChannel);
            roomChannel = null;
            console.log(`[DEBUG] Unsubscribed from room ${currentRoomId}`);
        }
        localStorage.removeItem('currentRoomId');
        localStorage.removeItem('userId');
        currentRoomId = null;
        userId = null;
        currentRoomData = null; // Clear room data
        history.pushState(null, '', window.location.pathname); // Clear URL param
        showMessage('Left the room.', 'info');
        console.log("[DEBUG] Left room. Calling showView('room-selection').");
        showView('room-selection');
        showTab('create-room'); // Default to create room tab
    } catch (error) {
        console.error("[ERROR] Error leaving room:", error);
        showMessage(`Error leaving room: ${error.message}`, 'error');
    }
}

async function handleIncrementCounter() {
    if (currentRoomId && currentRoomData) {
        await incrementCounter(supabase, currentRoomId, currentRoomData.game_data?.shared_counter || 0);
    } else {
        showMessage('Please join a room first.', 'error');
    }
}

async function handleGenerateRandom() {
    if (currentRoomId && currentRoomData) {
        await generateRandomValue(supabase, currentRoomId);
    } else {
        showMessage('Please join a room first.', 'error');
    }
}

async function handleRenameRoomTitle() {
    if (currentRoomId && currentRoomData && currentRoomData.host_id === localId) {
        uiShowRenameRoomModal();
        prefillRenameRoomInput();
    } else {
        showMessage('Only the host can rename the room.', 'error');
    }
}

async function handleConfirmRenameRoom() {
    const newName = document.getElementById('renameRoomInput').value.trim();
    if (newName && currentRoomId) {
        try {
            await serviceConfirmRenameRoom(supabase, currentRoomId, newName);
            uiHideRenameRoomModal();
            showMessage('Room renamed successfully!', 'success');
        } catch (error) {
            console.error("[ERROR] Error confirming room rename:", error);
            showMessage(`Error renaming room: ${error.message}`, 'error');
        }
    } else {
        showMessage('Please enter a valid new room name.', 'error');
    }
}

async function handleAddGem() {
    if (currentRoomId && currentRoomData && currentRoomData.host_id === localId) {
        // Filter out gems already in role_settings
        const existingGemNames = new Set(currentRoomData.game_data?.role_settings.map(s => s.gem) || []);
        const availableGems = Object.keys(GEM_DATA).filter(gemName => !existingGemNames.has(gemName));

        uiShowAddGemModal(availableGems, GEM_DATA, async (gemName) => {
            try {
                // Find a role template that belongs to this gem
                const roleToAdd = ROLE_TEMPLATES.find(role => role.gem === gemName);
                if (!roleToAdd) {
                    showMessage(`No default role found for gem category: ${gemName}`, 'error');
                    return false;
                }
                const success = await serviceAddGemToSettings(supabase, currentRoomId, roleToAdd.name);
                if (success) {
                    showMessage(`Added ${gemName} category with ${roleToAdd.name}.`, 'success');
                    return true;
                }
                return false;
            } catch (error) {
                console.error("[ERROR] Error adding gem to settings:", error);
                showMessage(`Error adding gem: ${error.message}`, 'error');
                return false;
            }
        });
    } else {
        showMessage('Only the host can add role categories.', 'error');
    }
}

async function handleStartGame() {
    if (currentRoomId && currentRoomData && currentRoomData.host_id === localId) {
        await startGame(supabase, currentRoomId, currentRoomData);
    } else {
        showMessage('Only the host can start the game.', 'error');
    }
}

// --- Supabase Realtime Subscription ---
async function subscribeToRoomChanges(roomId) {
    if (roomChannel) {
        await roomChannel.unsubscribe();
        supabase.removeChannel(roomChannel);
        console.log(`[DEBUG] Unsubscribed from previous channel: ${roomId}`);
    }

    roomChannel = supabase
        .channel(`room:${roomId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Rooms', filter: `id=eq.${roomId}` }, payload => {
            console.log('[DEBUG] Change received!', payload);
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                currentRoomData = payload.new;
                // Get player's roles from the updated room data
                const currentPlayer = currentRoomData.players.find(p => p.player_id === userId);
                const currentPlayerRoles = currentPlayer ? currentPlayer.roles : [];

                updateRoomUI(
                    currentRoomData,
                    localId,
                    userId,
                    (roomId, playerId) => kickPlayer(supabase, roomId, playerId),
                    currentPlayerRoles,
                    renderPlayerRoleCards, // Pass the rendering function
                    updateRoleAmount, // Pass updateRoleAmount to render
                    toggleRoleDisabled, // Pass toggleRoleDisabled
                    removeGemFromSettings // Pass removeGemFromSettings
                );
            } else if (payload.eventType === 'DELETE') {
                showMessage('The room was deleted by the host.', 'info');
                handleLeaveRoom(); // Automatically leave if room is deleted
            }
        })
        .subscribe();

    console.log(`[DEBUG] Subscribed to room ${roomId}`);

    // Fetch initial data immediately after subscribing
    try {
        const data = await fetchRoomData(supabase, roomId);
        if (data) {
            currentRoomData = data;
            const currentPlayer = currentRoomData.players.find(p => p.player_id === userId);
            const currentPlayerRoles = currentPlayer ? currentPlayer.roles : [];
            updateRoomUI(
                currentRoomData,
                localId,
                userId,
                (roomId, playerId) => kickPlayer(supabase, roomId, playerId),
                currentPlayerRoles,
                renderPlayerRoleCards,
                updateRoleAmount,
                toggleRoleDisabled,
                removeGemFromSettings
            );
        } else {
            showMessage('Room not found or inaccessible.', 'error');
            handleLeaveRoom();
        }
    } catch (error) {
        console.error("[ERROR] Error fetching initial room data:", error);
        showMessage(`Error fetching room data: ${error.message}`, 'error');
        handleLeaveRoom();
    }
}

// --- Event Listener Setup ---
function setupEventListeners() {
    setPlayerNameBtn.addEventListener('click', handleSetPlayerName);
    createRoomBtn.addEventListener('click', handleCreateRoom);
    joinRoomBtn.addEventListener('click', handleJoinRoom);
    leaveRoomBtn.addEventListener('click', handleLeaveRoom);
    incrementCounterBtn.addEventListener('click', handleIncrementCounter);
    generateRandomBtn.addEventListener('click', handleGenerateRandom);
    renameRoomTitleBtn.addEventListener('click', handleRenameRoomTitle);
    confirmRenameBtn.addEventListener('click', handleConfirmRenameRoom);
    cancelRenameBtn.addEventListener('click', uiHideRenameRoomModal); // Use modal's hide function directly
    viewAllRolesBtn.addEventListener('click', () => uiShowRolesOverlay(currentRoomData, renderAllRoleCardsToOverlay));
    rolesOverlayCloseBtn.addEventListener('click', uiHideRolesOverlay);
    detailedOverlayCloseBtn.addEventListener('click', uiHideDetailedRoleOverlay);
    addGemButton.addEventListener('click', handleAddGem);
    cancelAddGemBtn.addEventListener('click', uiHideAddGemModal);
    startGameBtn.addEventListener('click', handleStartGame);

    // Tab switching
    createRoomTabBtn.addEventListener('click', () => showTab('create-room'));
    joinRoomTabBtn.addEventListener('click', () => showTab('join-room'));

    // Role Pool Tab Drag functionality
    let isDragging = false;
    let startX;
    let initialLeft;

    rolePoolTabKnob.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        initialLeft = rolePoolTab.getBoundingClientRect().left;
        rolePoolTab.style.transition = 'none'; // Disable transition during drag
        document.body.style.userSelect = 'none'; // Prevent text selection during drag
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        // Restrict movement to within the tab's width to the left
        const newLeft = Math.min(0, initialLeft + dx);
        rolePoolTab.style.transform = `translateX(${newLeft}px)`;
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

    // Player Role Card System Event Listener
    myRoleTriggerArea.addEventListener('click', togglePlayerCardsSpread);
    window.addEventListener('resize', updatePlayerCardPositions);

    // --- Online Status Detection (beforeunload) ---
    window.addEventListener('beforeunload', async (event) => {
        console.log('[DEBUG] [beforeunload] Page is about to unload. Attempting to leave room...');
        if (currentRoomId && userId && supabase) {
            try {
                // This RPC call is a fire-and-forget, as beforeunload is not guaranteed to complete async operations
                supabase.rpc('remove_player_from_room', {
                    p_room_id: currentRoomId,
                    p_player_id: userId
                }).then(() => {
                    console.log('[DEBUG] [beforeunload] Sent leave room request successfully.');
                }).catch(error => {
                    console.error('[ERROR] [beforeunload] Error sending leave room request:', error);
                });
            } catch (error) {
                console.error('[ERROR] [beforeunload] Error preparing leave room request:', error);
            }
        }
    });
    // ----------------------------------------------
}

// Initialize the application when the window loads
window.onload = initializeApp;

console.log("Script fully loaded and executed.");
