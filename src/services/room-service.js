// src/services/room-service.js
// Handles interactions with the Supabase database for room and game state management.

import { ROLE_TEMPLATES, ROOM_BACKGROUNDS, ROLE_IMAGE_BASE_PATH } from '../config/constants.js';
import { showMessage, getRoleImagePath } from '../utils/helpers.js';

let supabase = null; // Will be set by main.js

/**
 * Initializes the Supabase client for this service.
 * @param {object} client - The Supabase client instance.
 */
export function setSupabaseClient(client) {
    supabase = client;
}

/**
 * Fetches the current data for a specific room.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room to fetch.
 * @returns {Promise<object|null>} The room data or null if not found/error.
 */
export async function fetchRoomData(supabase, roomId) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.fetchRoomData.");
        showMessage("Database connection error. Please refresh.", 'error');
        return null;
    }
    try {
        const { data, error } = await supabase
            .from('Rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
            throw error;
        }

        if (data) {
            // Ensure players and game_data are always objects/arrays
            data.players = data.players || [];
            data.game_data = data.game_data || {};
            console.log(`[DEBUG] Fetched room data for ${roomId}:`, data);
            return data;
        } else {
            console.log(`[DEBUG] Room ${roomId} not found.`);
            return null;
        }
    } catch (error) {
        console.error(`[ERROR] Error fetching room data for ${roomId}:`, error);
        showMessage(`Error fetching room: ${error.message}`, 'error');
        return null;
    }
}

/**
 * Creates a new room in the database.
 * @param {object} supabase - The Supabase client.
 * @param {string} userName - The name of the host.
 * @param {string} userId - The short ID of the host.
 * @param {string} localId - The full UUID of the host's browser instance.
 * @param {string} roomName - The desired name for the room.
 * @returns {Promise<string|null>} The new room's ID or null on failure.
 */
export async function createRoom(supabase, userName, userId, localId, roomName) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.createRoom.");
        showMessage("Database connection error. Please refresh.", 'error');
        return null;
    }
    try {
        const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const defaultBackground = ROOM_BACKGROUNDS[Math.floor(Math.random() * ROOM_BACKGROUNDS.length)];

        // Initialize role settings with default amounts and disabled status
        const initialRoleSettings = ROLE_TEMPLATES.map(role => ({
            role: role.name,
            amount: role["default-amount"] !== undefined ? role["default-amount"] : 0, // Default to 0 unless specified
            isDisabled: role.isPrimarilyDisabled || false
        }));

        // Initialize gem settings with default counts (e.g., 0 for all gems initially)
        const initialGemSettings = Object.keys(GEM_DATA).filter(gemName => gemName !== "None").map(gemName => ({
            gem: gemName,
            count: 0 // Default gem count to 0
        }));

        // Initialize role_image_map with default paths for all roles
        const initialRoleImageMap = {};
        ROLE_TEMPLATES.forEach(role => {
            initialRoleImageMap[role.name] = getRoleImagePath(role.name, null); // Pass null for currentRoomData initially
        });


        const { data, error } = await supabase
            .from('Rooms')
            .insert([
                {
                    id: newRoomId,
                    host_id: localId, // Use localId for host_id
                    players: [{ name: userName, uid: userId, "local-id": localId, status: "Alive", roles: [] }],
                    game_data: {
                        roomName: roomName || `${userName}'s Room`,
                        counter: 0,
                        randomValue: null,
                        background_image_url: defaultBackground,
                        role_settings: initialRoleSettings,
                        gem_included_settings: initialGemSettings,
                        center_role_pool: [],
                        game_state: "lobby", // Initial game state
                        current_day: 0,
                        current_phase: "day",
                        role_image_map: initialRoleImageMap // Initialize with default paths
                    }
                }
            ])
            .select();

        if (error) {
            throw error;
        }

        showMessage(`Room "${roomName}" created with ID: ${newRoomId}`, 'success');
        console.log("[DEBUG] Room created:", data);
        return newRoomId;
    } catch (error) {
        console.error("[ERROR] Error creating room:", error);
        showMessage(`Error creating room: ${error.message}`, 'error');
        return null;
    }
}

/**
 * Joins an existing room.
 * @param {object} supabase - The Supabase client.
 * @param {string} userName - The name of the joining player.
 * @param {string} userId - The short ID of the joining player.
 * @param {string} localId - The full UUID of the joining player's browser instance.
 * @param {string} roomId - The ID of the room to join.
 * @param {object} currentRoomData - The current local room data.
 * @returns {Promise<boolean>} True if joined successfully, false otherwise.
 */
export async function joinRoom(supabase, userName, userId, localId, roomId, currentRoomData) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.joinRoom.");
        showMessage("Database connection error. Please refresh.", 'error');
        return false;
    }
    if (!roomId) {
        showMessage("Please enter a Room ID.", 'error');
        return false;
    }

    try {
        // Fetch the latest room data to ensure we have the most current player list
        const room = await fetchRoomData(supabase, roomId);

        if (!room) {
            showMessage(`Room with ID "${roomId}" not found.`, 'error');
            return false;
        }

        let players = room.players || [];

        // Check if the localId (browser instance) is already in the room
        const existingPlayerIndex = players.findIndex(p => p["local-id"] === localId);

        if (existingPlayerIndex !== -1) {
            // Player (this browser instance) is already in the room, update their short ID and name if changed
            players[existingPlayerIndex].name = userName;
            players[existingPlayerIndex].uid = userId; // Update short ID
            console.log(`[DEBUG] Player ${userName} (${userId}) [${localId}] already in room ${roomId}. Updating info.`);
        } else {
            // Add new player
            players.push({ name: userName, uid: userId, "local-id": localId, status: "Alive", roles: [] });
            console.log(`[DEBUG] Player ${userName} (${userId}) [${localId}] joining room ${roomId}.`);
        }

        const { error } = await supabase
            .from('Rooms')
            .update({ players: players })
            .eq('id', roomId);

        if (error) {
            throw error;
        }

        showMessage(`Joined room: ${room.game_data.roomName}`, 'success');
        return true;
    } catch (error) {
        console.error("[ERROR] Error joining room:", error);
        showMessage(`Error joining room: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Removes a player from a room.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {string} playerUid - The short ID of the player to remove.
 * @param {string} localId - The full UUID of the current user's browser instance.
 * @param {boolean} isHost - True if the current user is the host.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function leaveRoom(supabase, roomId, playerUid, localId, isHost) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.leaveRoom.");
        showMessage("Database connection error. Please refresh.", 'error');
        return false;
    }
    if (!roomId) {
        console.warn("[WARN] No room ID provided to leaveRoom.");
        return false;
    }

    try {
        const room = await fetchRoomData(supabase, roomId);
        if (!room) {
            showMessage("Room not found or already deleted.", 'info');
            return false;
        }

        let players = room.players || [];
        const initialPlayerCount = players.length;

        // Filter out the player to be removed
        players = players.filter(p => p.uid !== playerUid);
        console.log(`[DEBUG] Attempting to remove player ${playerUid}. New player list length: ${players.length}`);

        // If the host is leaving, and there are other players, assign a new host
        let newHostId = room.host_id;
        if (room.host_id === localId && players.length > 0) {
            // Assign the first remaining player as the new host
            newHostId = players[0]["local-id"];
            console.log(`[DEBUG] Host ${localId} is leaving. Assigning new host: ${newHostId}`);
        } else if (room.host_id === localId && players.length === 0) {
            // If host is leaving and no other players, delete the room
            console.log(`[DEBUG] Host ${localId} is leaving and no players remain. Deleting room ${roomId}.`);
            const { error: deleteError } = await supabase
                .from('Rooms')
                .delete()
                .eq('id', roomId);

            if (deleteError) {
                throw deleteError;
            }
            showMessage("Room deleted as host left and no players remained.", 'info');
            return true; // Room successfully deleted
        }

        const { error } = await supabase
            .from('Rooms')
            .update({ players: players, host_id: newHostId })
            .eq('id', roomId);

        if (error) {
            throw error;
        }

        if (playerUid === playerUid) { // If the current user is leaving
            showMessage(`Left room: ${room.game_data.roomName}`, 'info');
        } else {
            showMessage(`Player ${playerUid} removed from room.`, 'info');
        }
        return true;
    } catch (error) {
        console.error("[ERROR] Error leaving room:", error);
        showMessage(`Error leaving room: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Kicks a player from the room (only callable by host).
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {string} currentUserId - The short ID of the user initiating the kick.
 * @param {boolean} isHost - True if the current user is the host.
 * @param {string} playerUidToKick - The short ID of the player to kick.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function kickPlayer(supabase, roomId, currentUserId, isHost, playerUidToKick) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.kickPlayer.");
        showMessage("Database connection error. Please refresh.", 'error');
        return false;
    }
    if (!isHost) {
        showMessage("Only the host can kick players.", 'error');
        return false;
    }
    if (currentUserId === playerUidToKick) {
        showMessage("You cannot kick yourself.", 'warning');
        return false;
    }

    try {
        const room = await fetchRoomData(supabase, roomId);
        if (!room) {
            showMessage("Room not found.", 'error');
            return false;
        }

        let players = room.players || [];
        const updatedPlayers = players.filter(p => p.uid !== playerUidToKick);

        if (updatedPlayers.length === players.length) {
            showMessage("Player not found in room.", 'warning');
            return false;
        }

        const { error } = await supabase
            .from('Rooms')
            .update({ players: updatedPlayers })
            .eq('id', roomId);

        if (error) {
            throw error;
        }

        showMessage(`Player ${playerUidToKick} has been kicked.`, 'info');
        return true;
    } catch (error) {
        console.error("[ERROR] Error kicking player:", error);
        showMessage(`Error kicking player: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Renames the room title (only callable by host).
 * This function only prepares the UI, the actual update is in confirmRenameRoom.
 * @param {object} currentRoomData - The current room data.
 * @param {boolean} isHost - True if the current user is the host.
 * @returns {boolean} True if rename is allowed, false otherwise.
 */
export function renameRoomTitle(currentRoomData, isHost) {
    if (!isHost) {
        showMessage("Only the host can rename the room.", 'error');
        return false;
    }
    if (!currentRoomData) {
        showMessage("No room data available to rename.", 'error');
        return false;
    }
    return true; // Allow UI to proceed with rename
}

/**
 * Confirms and applies the room name change to the database.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {object} currentRoomData - The current room data.
 * @param {string} newRoomName - The new name for the room.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function confirmRenameRoom(supabase, roomId, currentRoomData, newRoomName) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.confirmRenameRoom.");
        showMessage("Database connection error. Please refresh.", 'error');
        return false;
    }
    if (!roomId || !currentRoomData) {
        showMessage("Cannot rename room: Room ID or data missing.", 'error');
        return false;
    }
    const trimmedName = newRoomName.trim();
    if (!trimmedName) {
        showMessage("Room name cannot be empty.", 'error');
        return false;
    }

    try {
        // Create a mutable copy of game_data
        const updatedGameData = { ...currentRoomData.game_data, roomName: trimmedName };

        const { error } = await supabase
            .from('Rooms')
            .update({ game_data: updatedGameData })
            .eq('id', roomId);

        if (error) {
            throw error;
        }

        showMessage(`Room renamed to: "${trimmedName}"`, 'success');
        return true;
    } catch (error) {
        console.error("[ERROR] Error renaming room:", error);
        showMessage(`Error renaming room: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Increments the shared counter in the room's game data.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {string} localId - The full UUID of the current user.
 * @param {string} userName - The name of the user.
 * @param {object} currentRoomData - The current room data.
 */
export async function incrementCounter(supabase, roomId, localId, userName, currentRoomData) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.incrementCounter.");
        showMessage("Database connection error. Please refresh.", 'error');
        return;
    }
    if (!roomId || !currentRoomData) {
        showMessage("Not in a room to increment counter.", 'error');
        return;
    }

    try {
        const currentCount = currentRoomData.game_data?.counter || 0;
        const updatedGameData = { ...currentRoomData.game_data, counter: currentCount + 1 };

        const { error } = await supabase
            .from('Rooms')
            .update({ game_data: updatedGameData })
            .eq('id', roomId);

        if (error) {
            throw error;
        }
        console.log(`[DEBUG] Counter incremented by ${userName}. New count: ${updatedGameData.counter}`);
    } catch (error) {
        console.error("[ERROR] Error incrementing counter:", error);
        showMessage(`Error incrementing counter: ${error.message}`, 'error');
    }
}

/**
 * Generates a new random value and updates it in the room's game data.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {string} localId - The full UUID of the current user.
 * @param {string} userName - The name of the user.
 * @param {object} currentRoomData - The current room data.
 */
export async function generateRandomValue(supabase, roomId, localId, userName, currentRoomData) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.generateRandomValue.");
        showMessage("Database connection error. Please refresh.", 'error');
        return;
    }
    if (!roomId || !currentRoomData) {
        showMessage("Not in a room to generate random value.", 'error');
        return;
    }

    try {
        const newRandomValue = Math.floor(Math.random() * 100) + 1; // Random number between 1 and 100
        const updatedGameData = { ...currentRoomData.game_data, randomValue: newRandomValue };

        const { error } = await supabase
            .from('Rooms')
            .update({ game_data: updatedGameData })
            .eq('id', roomId);

        if (error) {
            throw error;
        }
        console.log(`[DEBUG] Random value generated by ${userName}. New value: ${updatedGameData.randomValue}`);
    } catch (error) {
        console.error("[ERROR] Error generating random value:", error);
        showMessage(`Error generating random value: ${error.message}`, 'error');
    }
}

/**
 * Updates a specific field within the game_data JSONB column.
 * This is a generic function for updating game state.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {object} currentRoomData - The current room data.
 * @param {string} key - The key within game_data to update (e.g., 'counter', 'randomValue', 'role_settings').
 * @param {any} value - The new value for the specified key.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function updateGameDataInDB(supabase, roomId, currentRoomData, key, value) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.updateGameDataInDB.");
        showMessage("Database connection error. Please refresh.", 'error');
        return false;
    }
    if (!roomId || !currentRoomData) {
        console.warn("[WARN] No room ID or current room data to update game data.");
        return false;
    }

    try {
        const updatedGameData = { ...currentRoomData.game_data, [key]: value };

        const { error } = await supabase
            .from('Rooms')
            .update({ game_data: updatedGameData })
            .eq('id', roomId);

        if (error) {
            throw error;
        }
        console.log(`[DEBUG] Updated game_data.${key} to:`, value);
        return true;
    } catch (error) {
        console.error(`[ERROR] Error updating game_data.${key}:`, error);
        showMessage(`Error updating game data: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Updates the amount of a specific role in the role_settings.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {object} currentRoomData - The current room data.
 * @param {string} roleName - The name of the role to update.
 * @param {number} change - The amount to change (e.g., 1 for increment, -1 for decrement).
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function updateRoleAmount(supabase, roomId, currentRoomData, roleName, change) {
    if (!currentRoomData || !currentRoomData.game_data || !currentRoomData.game_data.role_settings) {
        console.warn("[WARN] No role settings found in room data.");
        showMessage("Cannot update role amount: Room data or role settings missing.", 'error');
        return false;
    }

    const updatedRoleSettings = currentRoomData.game_data.role_settings.map(setting => {
        if (setting.role === roleName) {
            const newAmount = Math.max(0, setting.amount + change); // Ensure amount doesn't go below 0
            return { ...setting, amount: newAmount };
        }
        return setting;
    });

    return updateGameDataInDB(supabase, roomId, currentRoomData, 'role_settings', updatedRoleSettings);
}

/**
 * Toggles the isDisabled status of a specific role in the role_settings.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {object} currentRoomData - The current room data.
 * @param {string} roleName - The name of the role to toggle.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function toggleRoleDisabled(supabase, roomId, currentRoomData, roleName) {
    if (!currentRoomData || !currentRoomData.game_data || !currentRoomData.game_data.role_settings) {
        console.warn("[WARN] No role settings found in room data.");
        showMessage("Cannot toggle role status: Room data or role settings missing.", 'error');
        return false;
    }

    const updatedRoleSettings = currentRoomData.game_data.role_settings.map(setting => {
        if (setting.role === roleName) {
            return { ...setting, isDisabled: !setting.isDisabled };
        }
        return setting;
    });

    return updateGameDataInDB(supabase, roomId, currentRoomData, 'role_settings', updatedRoleSettings);
}

/**
 * Updates the count of a specific gem category in gem_included_settings.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {object} currentRoomData - The current room data.
 * @param {string} gemName - The name of the gem category to update.
 * @param {number} change - The amount to change (e.g., 1 for increment, -1 for decrement).
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function updateGemCount(supabase, roomId, currentRoomData, gemName, change) {
    if (!currentRoomData || !currentRoomData.game_data || !currentRoomData.game_data.gem_included_settings) {
        console.warn("[WARN] No gem settings found in room data.");
        showMessage("Cannot update gem count: Room data or gem settings missing.", 'error');
        return false;
    }

    const updatedGemSettings = currentRoomData.game_data.gem_included_settings.map(setting => {
        if (setting.gem === gemName) {
            const newCount = Math.max(0, setting.count + change); // Ensure count doesn't go below 0
            return { ...setting, count: newCount };
        }
        return setting;
    });

    return updateGameDataInDB(supabase, roomId, currentRoomData, 'gem_included_settings', updatedGemSettings);
}

/**
 * Removes a gem category from gem_included_settings.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {object} currentRoomData - The current room data.
 * @param {string} gemName - The name of the gem category to remove.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function removeGemFromSettings(supabase, roomId, currentRoomData, gemName) {
    if (!currentRoomData || !currentRoomData.game_data || !currentRoomData.game_data.gem_included_settings) {
        console.warn("[WARN] No gem settings found in room data.");
        showMessage("Cannot remove gem: Room data or gem settings missing.", 'error');
        return false;
    }

    const updatedGemSettings = currentRoomData.game_data.gem_included_settings.filter(setting => setting.gem !== gemName);

    return updateGameDataInDB(supabase, roomId, currentRoomData, 'gem_included_settings', updatedGemSettings);
}

/**
 * Adds a new gem category to gem_included_settings.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {object} currentRoomData - The current room data.
 * @param {string} gemName - The name of the gem category to add.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function addGemToSettings(supabase, roomId, currentRoomData, gemName) {
    if (!currentRoomData || !currentRoomData.game_data || !currentRoomData.game_data.gem_included_settings) {
        console.warn("[WARN] No gem settings found in room data.");
        showMessage("Cannot add gem: Room data or gem settings missing.", 'error');
        return false;
    }

    const existingGem = currentRoomData.game_data.gem_included_settings.find(setting => setting.gem === gemName);
    if (existingGem) {
        showMessage(`Gem category "${gemName}" is already added.`, 'warning');
        return false;
    }

    const updatedGemSettings = [...currentRoomData.game_data.gem_included_settings, { gem: gemName, count: 0 }];

    return updateGameDataInDB(supabase, roomId, currentRoomData, 'gem_included_settings', updatedGemSettings);
}

/**
 * Starts the game: shuffles roles, assigns them to players, and updates game state.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {boolean} isHost - True if the current user is the host.
 * @param {object} currentRoomData - The current room data.
 */
export async function startGame(supabase, roomId, isHost, currentRoomData) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.startGame.");
        showMessage("Database connection error. Please refresh.", 'error');
        return;
    }
    if (!isHost) {
        showMessage("Only the host can start the game.", 'error');
        return;
    }
    if (!currentRoomData || !currentRoomData.players || currentRoomData.players.length === 0) {
        showMessage("Cannot start game: No players in the room.", 'error');
        return;
    }
    if (!currentRoomData.game_data || !currentRoomData.game_data.role_settings) {
        showMessage("Cannot start game: Role settings are missing.", 'error');
        return;
    }

    try {
        const players = currentRoomData.players;
        const roleSettings = currentRoomData.game_data.role_settings;
        const totalPlayers = players.length;

        let availableRoles = [];
        roleSettings.forEach(setting => {
            if (!setting.isDisabled) {
                for (let i = 0; i < setting.amount; i++) {
                    const roleTemplate = ROLE_TEMPLATES.find(r => r.name === setting.role);
                    if (roleTemplate) {
                        availableRoles.push({ ...roleTemplate }); // Deep copy to avoid modifying template
                    }
                }
            }
        });

        // Shuffle roles
        for (let i = availableRoles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableRoles[i], availableRoles[j]] = [availableRoles[j], availableRoles[i]];
        }

        // Check if there are enough roles for all players
        if (availableRoles.length < totalPlayers) {
            showMessage(`Not enough roles for all ${totalPlayers} players. Need ${totalPlayers - availableRoles.length} more roles.`, 'error');
            return;
        }

        // Assign roles to players
        const updatedPlayers = players.map((player, index) => {
            const assignedRole = availableRoles[index];
            // Ensure the assigned role has the correct image path
            assignedRole["chosen-image-url"] = getRoleImagePath(assignedRole.name, currentRoomData);
            return { ...player, roles: [assignedRole] }; // Assign the role
        });

        // Determine center role pool (remaining roles)
        const centerRolePool = availableRoles.slice(totalPlayers).map(role => {
            // Ensure center roles also have correct image paths
            role["chosen-image-url"] = getRoleImagePath(role.name, currentRoomData);
            return role;
        });

        // Update the role_image_map with all roles that will be displayed
        const newRoleImageMap = { ...currentRoomData.game_data.role_image_map };
        ROLE_TEMPLATES.forEach(template => {
            newRoleImageMap[template.name] = getRoleImagePath(template.name, currentRoomData);
        });


        const updatedGameData = {
            ...currentRoomData.game_data,
            players_roles_assigned: true, // Indicate roles are assigned
            game_state: "night", // Transition to night phase after role assignment
            current_day: 1, // Start on Day 1
            center_role_pool: centerRolePool,
            role_image_map: newRoleImageMap // Update the map with correct paths
        };

        const { error } = await supabase
            .from('Rooms')
            .update({ players: updatedPlayers, game_data: updatedGameData })
            .eq('id', roomId);

        if (error) {
            throw error;
        }

        showMessage("Game started! Roles have been assigned.", 'success');
        console.log("[DEBUG] Game started. Updated players:", updatedPlayers, "Center pool:", centerRolePool);

    } catch (error) {
        console.error("[ERROR] Error starting game:", error);
        showMessage(`Error starting game: ${error.message}`, 'error');
    }
}
