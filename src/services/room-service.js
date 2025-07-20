// src/services/room-service.js
// Contains functions for interacting with Supabase for room management.

import { showMessage, generateRoomId, generateShortId, getRoleTemplate, standardizeRoleName, getRoleImagePath, shuffleArray } from '../utils/helpers.js';
import { ROLE_TEMPLATES, ROOM_BACKGROUNDS, ROLE_IMAGE_BASE_PATH } from '../config/constants.js'; // Import ROLE_TEMPLATES here

/**
 * Generates the center_role_pool array based on current role settings.
 * Each role object in the pool will have a 'chosen-image-url' derived from the synchronized map.
 * @param {Array<Object>} roleSettings - The current role settings from game_data.
 * @param {Object} roleImageMap - The synchronized map of role names to their chosen image URLs.
 * @returns {Array<Object>} The generated center_role_pool.
 */
export function generateCenterRolePool(roleSettings, roleImageMap) {
    const pool = [];
    roleSettings.forEach(setting => {
        if (!setting.isDisabled) { // Only add if not disabled
            const roleTemplate = getRoleTemplate(setting.role);
            if (roleTemplate) {
                for (let i = 0; i < setting.amount; i++) {
                    // Deep copy the role template
                    const roleInstance = JSON.parse(JSON.stringify(roleTemplate));
                    // Assign a chosen image URL using the provided roleImageMap
                    // Fallback to getRoleImagePath if not found in map (should ideally be in map)
                    roleInstance["chosen-image-url"] = roleImageMap[roleTemplate.name] || getRoleImagePath(roleTemplate.name);
                    pool.push(roleInstance);
                }
            }
        }
    });
    return pool;
}

// Removed module-level supabase, currentRoomData, currentRoomId, and setServiceDependencies
// These will now be passed as arguments to the functions that need them for better reliability.

/**
 * Fetches room data by ID.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room to fetch.
 * @returns {Promise<object|null>} The room data or null if not found.
 */
export async function fetchRoomData(supabase, roomId) {
    console.log(`[DEBUG] Fetching room data for ID: ${roomId}`);
    try {
        const { data, error } = await supabase
            .from('Rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        if (error && error.code === 'PGRST116') { // No rows found
            console.log(`[DEBUG] Room ${roomId} not found.`);
            return null;
        } else if (error) {
            throw error;
        }
        console.log('[DEBUG] Room data fetched:', data);
        return data;
    } catch (error) {
        console.error("[ERROR] Error fetching room data:", error);
        showMessage(`Error fetching room: ${error.message}`, 'error');
        return null;
    }
}

/**
 * Creates a new room.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomName - The name of the new room.
 * @param {string} localId - The full UUID of the host.
 * @param {string} playerName - The name of the host player.
 * @returns {Promise<object|null>} The created room data or null on error.
 */
export async function createRoom(supabase, roomName, localId, playerName) {
    console.log(`[DEBUG] Creating room "${roomName}" with host ${playerName} (localId: ${localId})...`);
    const roomId = generateRoomId();
    const playerId = generateShortId(); // Short ID for display
    const initialPlayer = {
        player_id: playerId,
        player_name: playerName,
        local_id: localId, // Store host's full UUID
        roles: [], // Initialize with empty roles
    };

    // Initialize role_image_map with default images for all roles
    const initialRoleImageMap = {};
    ROLE_TEMPLATES.forEach(role => {
        initialRoleImageMap[role.name] = getRoleImagePath(role.name);
    });

    const { data, error } = await supabase
        .from('Rooms')
        .insert([
            {
                id: roomId,
                name: roomName,
                host_id: localId, // Host's full UUID
                players: [initialPlayer],
                game_data: {
                    shared_counter: 0,
                    shared_random_value: null,
                    role_settings: [], // Initialize with empty role settings
                    center_role_pool: [], // Initialize empty center pool
                    role_image_map: initialRoleImageMap, // Store the initial map
                }
            }
        ])
        .select()
        .single();

    if (error) {
        console.error("[ERROR] Error creating room:", error);
        showMessage(`Error creating room: ${error.message}`, 'error');
        throw error;
    }
    console.log('[DEBUG] Room created:', data);
    return data;
}

/**
 * Joins an existing room.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room to join.
 * @param {string} localId - The full UUID of the joining player.
 * @param {string} playerName - The name of the joining player.
 * @returns {Promise<object|null>} The updated room data or null on error.
 */
export async function joinRoom(supabase, roomId, localId, playerName) {
    console.log(`[DEBUG] Attempting to join room ${roomId} as ${playerName} (localId: ${localId})...`);
    // First, check if the player with this localId is already in the room
    const { data: existingRoom, error: fetchError } = await supabase
        .from('Rooms')
        .select('players')
        .eq('id', roomId)
        .single();

    if (fetchError) {
        console.error("[ERROR] Error fetching room for join check:", fetchError);
        showMessage(`Error joining room: ${fetchError.message}`, 'error');
        throw fetchError;
    }

    const existingPlayer = existingRoom.players.find(p => p.local_id === localId);

    if (existingPlayer) {
        showMessage(`You are already in room ${roomId} as ${existingPlayer.player_name}.`, 'info');
        console.log(`[DEBUG] Player with localId ${localId} already in room. Returning existing player data.`);
        return existingPlayer; // Return existing player info
    }

    // If not existing, add new player
    const newPlayerId = generateShortId();
    const newPlayer = {
        player_id: newPlayerId,
        player_name: playerName,
        local_id: localId,
        roles: [], // Initialize with empty roles
    };

    try {
        const { data, error } = await supabase.rpc('add_player_to_room', {
            p_room_id: roomId,
            p_player_id: newPlayer.player_id,
            p_player_name: newPlayer.player_name,
            p_local_id: newPlayer.local_id
        });

        if (error) {
            throw error;
        }
        console.log('[DEBUG] Player added to room:', newPlayer);
        return newPlayer; // Return the new player's data
    } catch (error) {
        console.error("[ERROR] Error adding player to room:", error);
        showMessage(`Error joining room: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Leaves a room.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room to leave.
 * @param {string} userId - The short ID of the player leaving.
 * @param {string} localId - The full UUID of the player leaving.
 * @returns {Promise<void>}
 */
export async function leaveRoom(supabase, roomId, userId, localId) {
    console.log(`[DEBUG] Player ${userId} (localId: ${localId}) attempting to leave room ${roomId}...`);
    try {
        const { data, error } = await supabase.rpc('remove_player_from_room', {
            p_room_id: roomId,
            p_player_id: userId // Use the short ID for removal
        });

        if (error) {
            throw error;
        }
        console.log('[DEBUG] Player removed from room:', data);
    } catch (error) {
        console.error("[ERROR] Error leaving room:", error);
        showMessage(`Error leaving room: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Kicks a player from a room (host only).
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {string} playerIdToKick - The short ID of the player to kick.
 * @returns {Promise<void>}
 */
export async function kickPlayer(supabase, roomId, playerIdToKick) {
    console.log(`[DEBUG] Kicking player ${playerIdToKick} from room ${roomId}...`);
    try {
        const { data, error } = await supabase.rpc('remove_player_from_room', {
            p_room_id: roomId,
            p_player_id: playerIdToKick
        });

        if (error) {
            throw error;
        }
        showMessage(`Player ${playerIdToKick} kicked.`, 'info');
        console.log('[DEBUG] Player kicked:', data);
    } catch (error) {
        console.error("[ERROR] Error kicking player:", error);
        showMessage(`Error kicking player: ${error.message}`, 'error');
    }
}

/**
 * Renames the room title.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {string} newRoomName - The new name for the room.
 * @returns {Promise<void>}
 */
export async function renameRoomTitle(supabase, roomId, newRoomName) {
    console.log(`[DEBUG] Renaming room ${roomId} to "${newRoomName}"...`);
    try {
        const { data, error } = await supabase
            .from('Rooms')
            .update({ name: newRoomName })
            .eq('id', roomId);

        if (error) {
            throw error;
        }
        console.log('[DEBUG] Room renamed successfully.');
    } catch (error) {
        console.error("[ERROR] Error renaming room:", error);
        showMessage(`Error renaming room: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Confirms room rename (same as renameRoomTitle, kept for clarity with modal flow).
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {string} newRoomName - The new name for the room.
 * @returns {Promise<void>}
 */
export async function confirmRenameRoom(supabase, roomId, newRoomName) {
    return renameRoomTitle(supabase, roomId, newRoomName);
}

/**
 * Increments the shared counter in game_data.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {number} currentCounterValue - The current value of the counter.
 * @param {object} currentRoomData - The current room's data.
 * @returns {Promise<void>}
 */
export async function incrementCounter(supabase, roomId, currentCounterValue, currentRoomData) {
    console.log(`[DEBUG] Incrementing counter for room ${roomId}...`);
    try {
        const newCounterValue = currentCounterValue + 1;
        const { data, error } = await supabase
            .from('Rooms')
            .update({
                game_data: {
                    ...currentRoomData.game_data, // Preserve other game_data properties
                    shared_counter: newCounterValue
                }
            })
            .eq('id', roomId);

        if (error) {
            throw error;
        }
        console.log('[DEBUG] Counter incremented to:', newCounterValue);
    } catch (error) {
        console.error("[ERROR] Error incrementing counter:", error);
        showMessage(`Error updating counter: ${error.message}`, 'error');
    }
}

/**
 * Generates a new random value in game_data.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {object} currentRoomData - The current room's data.
 * @returns {Promise<void>}
 */
export async function generateRandomValue(supabase, roomId, currentRoomData) {
    console.log(`[DEBUG] Generating random value for room ${roomId}...`);
    try {
        const newRandomValue = Math.floor(Math.random() * 100) + 1; // Random number between 1 and 100
        const { data, error } = await supabase
            .from('Rooms')
            .update({
                game_data: {
                    ...currentRoomData.game_data, // Preserve other game_data properties
                    shared_random_value: newRandomValue
                }
            })
            .eq('id', roomId);

        if (error) {
            throw error;
        }
        console.log('[DEBUG] Random value generated:', newRandomValue);
    } catch (error) {
        console.error("[ERROR] Error generating random value:", error);
        showMessage(`Error generating random value: ${error.message}`, 'error');
    }
}

/**
 * Updates the game_data object in the database.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {object} newGameData - The new game_data object to save.
 * @returns {Promise<void>}
 */
export async function updateGameDataInDB(supabase, roomId, newGameData) {
    console.log(`[DEBUG] Updating game_data for room ${roomId}:`, newGameData);
    try {
        const { data, error } = await supabase
            .from('Rooms')
            .update({ game_data: newGameData })
            .eq('id', roomId);

        if (error) {
            throw error;
        }
        console.log('[DEBUG] Game data updated successfully.');
    } catch (error) {
        console.error("[ERROR] Error updating game data:", error);
        showMessage(`Error updating game data: ${error.message}`, 'error');
    }
}

/**
 * Updates the amount of a specific role in role_settings.
 * @param {object} supabase - The Supabase client.
 * @param {string} currentRoomId - The ID of the current room.
 * @param {object} currentRoomData - The current room's data.
 * @param {string} roleName - The name of the role to update.
 * @param {number} change - The amount to change by (+1 or -1).
 * @returns {Promise<void>}
 */
export async function updateRoleAmount(supabase, currentRoomId, currentRoomData, roleName, change) {
    console.log(`[DEBUG] [updateRoleAmount] Attempting to change amount for role: ${roleName} by ${change}`);
    // Removed the internal check as parameters are now expected to be provided.

    const currentRoleSettings = [...(currentRoomData.game_data?.role_settings || [])];
    const roleIndex = currentRoleSettings.findIndex(setting => setting.role === roleName);

    if (roleIndex !== -1) {
        const newAmount = currentRoleSettings[roleIndex].amount + change;
        if (newAmount >= 0) { // Ensure amount doesn't go below zero
            currentRoleSettings[roleIndex].amount = newAmount;
            const updatedGameData = {
                ...currentRoomData.game_data,
                role_settings: currentRoleSettings
            };
            await updateGameDataInDB(supabase, currentRoomId, updatedGameData);
            console.log(`[DEBUG] [updateRoleAmount] Successfully updated ${roleName} amount to ${newAmount}.`);
        } else {
            showMessage('Role amount cannot be negative.', 'info');
            console.log('[DEBUG] [updateRoleAmount] Attempted to set negative amount, prevented.');
        }
    } else {
        showMessage(`Role setting for ${roleName} not found.`, 'error');
        console.warn(`[WARNING] [updateRoleAmount] Role setting for ${roleName} not found.`);
    }
}

/**
 * Toggles the disabled status of a role in role_settings.
 * @param {object} supabase - The Supabase client.
 * @param {string} currentRoomId - The ID of the current room.
 * @param {object} currentRoomData - The current room's data.
 * @param {string} roleName - The name of the role to toggle.
 * @returns {Promise<void>}
 */
export async function toggleRoleDisabled(supabase, currentRoomId, currentRoomData, roleName) {
    console.log(`[DEBUG] [toggleRoleDisabled] Toggling disabled status for role: ${roleName}`);
    // Removed the internal check as parameters are now expected to be provided.

    const currentRoleSettings = [...(currentRoomData.game_data?.role_settings || [])];
    const roleIndex = currentRoleSettings.findIndex(setting => setting.role === roleName);

    if (roleIndex !== -1) {
        currentRoleSettings[roleIndex].isDisabled = !currentRoleSettings[roleIndex].isDisabled;
        const updatedGameData = {
            ...currentRoomData.game_data,
            role_settings: currentRoleSettings
        };
        await updateGameDataInDB(supabase, currentRoomId, updatedGameData);
        console.log(`[DEBUG] [toggleRoleDisabled] Successfully toggled ${roleName} disabled status.`);
    } else {
        showMessage(`Role setting for ${roleName} not found.`, 'error');
        console.warn(`[WARNING] [toggleRoleDisabled] Role setting for ${roleName} not found.`);
    }
}

/**
 * Updates the count for a specific gem category.
 * @param {object} supabase - The Supabase client.
 * @param {string} currentRoomId - The ID of the current room.
 * @param {object} currentRoomData - The current room's data.
 * @param {string} gemName - The name of the gem category.
 * @param {number} newCount - The new count for the gem.
 * @returns {Promise<void>}
 */
export async function updateGemCount(supabase, currentRoomId, currentRoomData, gemName, newCount) {
    console.log(`[DEBUG] Updating gem count for ${gemName} to ${newCount}...`);
    // Removed the internal check as parameters are now expected to be provided.

    const currentRoleSettings = [...(currentRoomData.game_data?.role_settings || [])];
    const updatedRoleSettings = currentRoleSettings.map(setting => {
        if (setting.gem === gemName) {
            return { ...setting, amount: newCount };
        }
        return setting;
    });

    const updatedGameData = {
        ...currentRoomData.game_data,
        role_settings: updatedRoleSettings
    };
    await updateGameDataInDB(supabase, currentRoomId, updatedGameData);
}

/**
 * Removes a gem (role setting) from the game_data.
 * @param {object} supabase - The Supabase client.
 * @param {string} currentRoomId - The ID of the current room.
 * @param {object} currentRoomData - The current room's data.
 * @param {string} roleName - The name of the role to remove from settings.
 * @returns {Promise<void>}
 */
export async function removeGemFromSettings(supabase, currentRoomId, currentRoomData, roleName) {
    console.log(`[DEBUG] [removeGemFromSettings] Removing role setting for: ${roleName}`);
    // Removed the internal check as parameters are now expected to be provided.

    const currentRoleSettings = [...(currentRoomData.game_data?.role_settings || [])];
    const updatedRoleSettings = currentRoleSettings.filter(setting => setting.role !== roleName);

    const updatedGameData = {
        ...currentRoomData.game_data,
        role_settings: updatedRoleSettings
    };
    await updateGameDataInDB(supabase, currentRoomId, updatedGameData);
    showMessage(`Removed ${roleName} from settings.`, 'info');
    console.log(`[DEBUG] [removeGemFromSettings] Successfully removed ${roleName}.`);
}


/**
 * Adds a new gem (role setting) to the game_data.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room.
 * @param {object} currentRoomData - The current room's data.
 * @param {string} roleName - The name of the role to add to settings.
 * @returns {Promise<boolean>} True if added successfully, false otherwise.
 */
export async function addGemToSettings(supabase, roomId, currentRoomData, roleName) {
    console.log(`[DEBUG] [addGemToSettings] Adding role setting for: ${roleName}`);
    // Removed the internal check as parameters are now expected to be provided.

    const currentRoleSettings = [...(currentRoomData.game_data?.role_settings || [])];

    // Check if role already exists in settings
    if (currentRoleSettings.some(setting => setting.role === roleName)) {
        showMessage(`${roleName} is already in the settings.`, 'info');
        console.warn(`[WARNING] [addGemToSettings] ${roleName} already exists.`);
        return false;
    }

    const roleTemplate = getRoleTemplate(roleName);
    if (!roleTemplate) {
        showMessage(`Role template for ${roleName} not found.`, 'error');
        console.error(`[ERROR] [addGemToSettings] Role template for ${roleName} not found.`);
        return false;
    }

    const newRoleSetting = {
        role: roleName,
        gem: roleTemplate.gem, // Use gem from template
        amount: roleTemplate["variant-count"] || 1, // Default to 1 or variant-count
        isDisabled: roleTemplate.isPrimarilyDisabled || false, // Default to false or isPrimarilyDisabled
    };

    currentRoleSettings.push(newRoleSetting);

    const updatedGameData = {
        ...currentRoomData.game_data,
        role_settings: currentRoleSettings
    };

    try {
        await updateGameDataInDB(supabase, roomId, updatedGameData);
        console.log(`[DEBUG] [addGemToSettings] Successfully added ${roleName} to settings.`);
        return true;
    } catch (error) {
        console.error("[ERROR] Error adding gem to settings:", error);
        showMessage(`Error adding gem: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Starts the game by assigning roles to players.
 * @param {object} supabase - The Supabase client.
 * @param {string} currentRoomId - The ID of the current room.
 * @param {object} currentRoomData - The current room data.
 * @returns {Promise<void>}
 */
export async function startGame(supabase, currentRoomId, currentRoomData) {
    console.log('[DEBUG] Attempting to start game...');
    if (!currentRoomData || !currentRoomData.players || currentRoomData.players.length === 0) {
        showMessage('No players in the room to start the game.', 'error');
        return;
    }

    if (!currentRoomData.game_data || !currentRoomData.game_data.role_settings || currentRoomData.game_data.role_settings.length === 0) {
        showMessage('No roles configured. Please add roles in settings.', 'error');
        return;
    }

    const playersInRoom = [...currentRoomData.players];
    let availableRolesForAssignment = [];

    // Populate available roles based on role settings and their amounts
    currentRoomData.game_data.role_settings.forEach(setting => {
        if (!setting.isDisabled) {
            const roleTemplate = getRoleTemplate(setting.role);
            if (roleTemplate) {
                for (let i = 0; i < setting.amount; i++) {
                    // Deep copy the role template for assignment
                    const roleInstance = JSON.parse(JSON.stringify(roleTemplate));
                    // Assign a chosen image URL from the current map
                    roleInstance["chosen-image-url"] = currentRoomData.game_data.role_image_map[roleTemplate.name] || getRoleImagePath(roleTemplate.name);
                    availableRolesForAssignment.push(roleInstance);
                }
            }
        }
    });

    if (availableRolesForAssignment.length < playersInRoom.length) {
        showMessage(`Not enough roles configured! Need ${playersInRoom.length} roles, but only have ${availableRolesForAssignment.length}. Adjust gem counts.`, 'error');
        return;
    }

    if (availableRolesForAssignment.length > playersInRoom.length) {
        shuffleArray(availableRolesForAssignment);
        availableRolesForAssignment = availableRolesForAssignment.slice(0, playersInRoom.length);
    }

    shuffleArray(availableRolesForAssignment);
    shuffleArray(playersInRoom);

    const updatedPlayers = playersInRoom.map((player, index) => {
        const assignedRole = availableRolesForAssignment[index];
        if (assignedRole) {
            return { ...player, roles: [assignedRole] };
        }
        return player;
    });

    const updatedCenterRolePool = [];

    try {
        const { data, error } = await supabase
            .from('Rooms')
            .update({
                players: updatedPlayers,
                game_data: {
                    ...currentRoomData.game_data,
                    center_role_pool: updatedCenterRolePool
                }
            })
            .eq('id', currentRoomId);

        if (error) {
            throw error;
        }
        showMessage("Game started! Roles assigned.", 'success');
        console.log('[DEBUG] Game started, roles assigned and center pool cleared.');
    } catch (error) {
        console.error("[ERROR] Error starting game:", error);
        showMessage(`Error starting game: ${error.message}`, 'error');
    }
}
