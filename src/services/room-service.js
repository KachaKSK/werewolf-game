// src/services/room-service.js
// Handles interactions with the Supabase database for room and game state management.

import { ROLE_TEMPLATES, ROOM_BACKGROUNDS, ROLE_IMAGE_BASE_PATH, GEM_DATA } from '../config/constants.js';
import { showMessage, getRoleImagePath } from '../utils/helpers.js'; // Corrected import

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
            data.game_data.current_day = data.game_data.current_day || 0; // Default to 0
            data.game_data.game_state = data.game_data.game_state || 'lobby'; // Default to 'lobby'
            data.game_data.role_settings = data.game_data.role_settings || []; // Default role settings
            data.game_data.gem_settings = data.game_data.gem_settings || []; // Default gem settings
            data.game_data.role_image_map = data.game_data.role_image_map || {}; // Default role image map
            data.game_data.players_roles_assigned = data.game_data.players_roles_assigned || false; // Default to false
            data.game_data.center_role_pool = data.game_data.center_role_pool || []; // Default center role pool
            data.game_data.players_ready = data.game_data.players_ready || []; // Default players ready array

            // If gem_settings is empty, initialize it with all gems
            if (data.game_data.gem_settings.length === 0) {
                console.log("[DEBUG] Initializing gem settings as empty.");
                data.game_data.gem_settings = Object.keys(GEM_DATA).filter(gemName => gemName !== "None").map(gemName => ({
                    gem: gemName,
                    count: 0
                }));
            }

            // If role_settings is empty, initialize it from ROLE_TEMPLATES
            if (data.game_data.role_settings.length === 0) {
                console.log("[DEBUG] Initializing role settings as empty.");
                data.game_data.role_settings = ROLE_TEMPLATES.map(role => ({
                    role: role.name,
                    count: role["variant-count"] || 1, // Use variant-count from template or default to 1
                    disabled: role.isPrimarilyDisabled || false // Use isPrimarilyDisabled from template
                }));
            }

        }

        console.log("[DEBUG] Fetched room data:", data);
        return data;
    } catch (error) {
        console.error("[ERROR] Error fetching room data:", error);
        showMessage(`Error fetching room: ${error.message}`, 'error');
        return null;
    }
}

/**
 * Creates a new room in the database.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomName - The name of the room.
 * @param {string} hostId - The ID of the host player.
 * @returns {Promise<object|null>} The created room data or null on error.
 */
export async function createRoom(supabase, roomName, hostId) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.createRoom.");
        showMessage("Database connection error. Please refresh.", 'error');
        return null;
    }
    try {
        const shortRoomId = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6-char ID
        const initialPlayers = [{ id: hostId, name: 'Host', is_host: true, role: null, is_alive: true }];

        // Initialize gem settings with all gems, default count 0
        const initialGemSettings = Object.keys(GEM_DATA).filter(gemName => gemName !== "None").map(gemName => ({
            gem: gemName,
            count: 0 // Default gem count to 0
        }));

        // Initialize role settings from ROLE_TEMPLATES
        const initialRoleSettings = ROLE_TEMPLATES.map(role => ({
            role: role.name,
            count: role["variant-count"] || 1, // Use variant-count from template or default to 1
            disabled: role.isPrimarilyDisabled || false // Use isPrimarilyDisabled from template
        }));

        const { data, error } = await supabase
            .from('Rooms')
            .insert([
                {
                    id: shortRoomId,
                    name: roomName,
                    host_id: hostId,
                    players: initialPlayers,
                    room_background_url: ROOM_BACKGROUNDS[Math.floor(Math.random() * ROOM_BACKGROUNDS.length)], // Random background
                    game_data: {
                        current_day: 0, // 0 for lobby, 1+ for game days
                        game_state: "lobby", // lobby, night, day
                        shared_counter: 0,
                        shared_random: 0,
                        role_settings: initialRoleSettings, // Initialize from constants
                        gem_settings: initialGemSettings, // Initialize from constants
                        players_roles_assigned: false,
                        center_role_pool: [],
                        role_image_map: {}, // Will be populated with synchronized image URLs
                        players_ready: [] // Array of player IDs who are ready to start
                    }
                }
            ])
            .select()
            .single();

        if (error) {
            throw error;
        }

        showMessage(`Room '${roomName}' created with ID: ${data.id}`, 'success');
        console.log("[DEBUG] Room created:", data);
        return data;
    } catch (error) {
        console.error("[ERROR] Error creating room:", error);
        showMessage(`Error creating room: ${error.message}`, 'error');
        return null;
    }
}

/**
 * Joins an existing room.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room to join.
 * @param {object} player - The player object { id, name }.
 * @returns {Promise<object|null>} The joined room data or null on error.
 */
export async function joinRoom(supabase, roomId, player) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.joinRoom.");
        showMessage("Database connection error. Please refresh.", 'error');
        return null;
    }
    try {
        // Fetch current room data to get existing players
        const { data: roomData, error: fetchError } = await supabase
            .from('Rooms')
            .select('players')
            .eq('id', roomId)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        const existingPlayers = roomData.players || [];

        // Check if player already in room
        if (existingPlayers.some(p => p.id === player.id)) {
            showMessage("You are already in this room.", 'info');
            return roomData; // Return existing room data
        }

        const updatedPlayers = [...existingPlayers, { ...player, is_host: false, role: null, is_alive: true }];

        const { data, error } = await supabase
            .from('Rooms')
            .update({ players: updatedPlayers })
            .eq('id', roomId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        showMessage(`${player.name} joined room ${roomId}`, 'success');
        console.log("[DEBUG] Player joined room:", data);
        return data;
    } catch (error) {
        console.error("[ERROR] Error joining room:", error);
        showMessage(`Error joining room: ${error.message}`, 'error');
        return null;
    }
}

/**
 * Leaves the current room.
 * @param {object} supabase - The Supabase client.
 * @param {string} roomId - The ID of the room to leave.
 * @param {string} playerId - The ID of the player leaving.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function leaveRoom(supabase, roomId, playerId) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.leaveRoom.");
        showMessage("Database connection error. Please refresh.", 'error');
        return false;
    }
    try {
        const { data: roomData, error: fetchError } = await supabase
            .from('Rooms')
            .select('players, host_id')
            .eq('id', roomId)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        let players = roomData.players || [];
        const isHostLeaving = roomData.host_id === playerId;

        // Filter out the leaving player
        let updatedPlayers = players.filter(p => p.id !== playerId);

        // If host is leaving, assign new host if other players exist
        if (isHostLeaving && updatedPlayers.length > 0) {
            updatedPlayers[0].is_host = true;
            console.log(`[DEBUG] New host assigned: ${updatedPlayers[0].id}`);
        }

        const { error } = await supabase
            .from('Rooms')
            .update({
                players: updatedPlayers,
                host_id: isHostLeaving && updatedPlayers.length > 0 ? updatedPlayers[0].id : (isHostLeaving && updatedPlayers.length === 0 ? null : roomData.host_id)
            })
            .eq('id', roomId);

        if (error) {
            throw error;
        }

        // If no players left, delete the room
        if (updatedPlayers.length === 0) {
            const { error: deleteError } = await supabase
                .from('Rooms')
                .delete()
                .eq('id', roomId);
            if (deleteError) {
                console.error("[ERROR] Error deleting empty room:", deleteError);
                showMessage(`Error cleaning up room: ${deleteError.message}`, 'error');
            } else {
                console.log(`[DEBUG] Room ${roomId} deleted as it is now empty.`);
            }
        }

        showMessage("Left room.", 'info');
        console.log("[DEBUG] Player left room.");
        return true;
    }
    catch (error) {
        console.error("[ERROR] Error leaving room:", error);
        showMessage(`Error leaving room: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Kicks a player from the room.
 * @param {string} roomId - The ID of the room.
 * @param {string} playerIdToKick - The ID of the player to kick.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function kickPlayer(roomId, playerIdToKick) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.kickPlayer.");
        showMessage("Database connection error. Please refresh.", 'error');
        return false;
    }
    try {
        const { data: roomData, error: fetchError } = await supabase
            .from('Rooms')
            .select('players, host_id')
            .eq('id', roomId)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        let players = roomData.players || [];
        const updatedPlayers = players.filter(p => p.id !== playerIdToKick);

        const { error } = await supabase
            .from('Rooms')
            .update({ players: updatedPlayers })
            .eq('id', roomId);

        if (error) {
            throw error;
        }

        showMessage("Player kicked.", 'info');
        console.log(`[DEBUG] Player ${playerIdToKick} kicked from room ${roomId}.`);
        return true;
    } catch (error) {
        console.error("[ERROR] Error kicking player:", error);
        showMessage(`Error kicking player: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Renames the room title.
 * @param {string} roomId - The ID of the room.
 * @param {string} newName - The new name for the room.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function renameRoomTitle(roomId, newName) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.renameRoomTitle.");
        showMessage("Database connection error. Please refresh.", 'error');
        return false;
    }
    try {
        const { error } = await supabase
            .from('Rooms')
            .update({ name: newName })
            .eq('id', roomId);

        if (error) {
            throw error;
        }

        showMessage(`Room renamed to '${newName}'.`, 'success');
        console.log(`[DEBUG] Room ${roomId} renamed to ${newName}.`);
        return true;
    } catch (error) {
        console.error("[ERROR] Error renaming room:", error);
        showMessage(`Error renaming room: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Confirms room renaming (this function mostly serves as a wrapper for renameRoomTitle now).
 * @param {string} roomId - The ID of the room.
 * @param {string} newName - The new name for the room.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function confirmRenameRoom(roomId, newName) {
    console.log(`[DEBUG] [confirmRenameRoom] Attempting to rename room ${roomId} to ${newName}`);
    return await renameRoomTitle(roomId, newName);
}

/**
 * Increments the shared counter in the room's game data.
 * @param {string} roomId - The ID of the room.
 * @param {number} incrementBy - The amount to increment the counter by.
 */
export async function incrementCounter(roomId, incrementBy) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.incrementCounter.");
        showMessage("Database connection error. Please refresh.", 'error');
        return;
    }
    try {
        const { data: roomData, error: fetchError } = await supabase
            .from('Rooms')
            .select('game_data')
            .eq('id', roomId)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        const currentCounter = roomData.game_data.shared_counter || 0;
        const updatedGameData = {
            ...roomData.game_data,
            shared_counter: currentCounter + incrementBy
        };

        const { error } = await supabase
            .from('Rooms')
            .update({ game_data: updatedGameData })
            .eq('id', roomId);

        if (error) {
            throw error;
        }
        console.log(`[DEBUG] Shared counter incremented to ${updatedGameData.shared_counter}.`);
    } catch (error) {
        console.error("[ERROR] Error incrementing counter:", error);
        showMessage(`Error updating counter: ${error.message}`, 'error');
    }
}

/**
 * Generates a new random value and updates it in the room's game data.
 * @param {string} roomId - The ID of the room.
 */
export async function generateRandomValue(roomId) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.generateRandomValue.");
        showMessage("Database connection error. Please refresh.", 'error');
        return;
    }
    try {
        const { data: roomData, error: fetchError } = await supabase
            .from('Rooms')
            .select('game_data')
            .eq('id', roomId)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        const newRandom = Math.floor(Math.random() * 100) + 1; // Random number between 1 and 100
        const updatedGameData = {
            ...roomData.game_data,
            shared_random: newRandom
        };

        const { error } = await supabase
            .from('Rooms')
            .update({ game_data: updatedGameData })
            .eq('id', roomId);

        if (error) {
            throw error;
        }
        console.log(`[DEBUG] Shared random value updated to ${newRandom}.`);
    } catch (error) {
        console.error("[ERROR] Error generating random value:", error);
        showMessage(`Error updating random value: ${error.message}`, 'error');
    }
}

/**
 * Updates the game_data object in the database.
 * This is a generic function to update any part of game_data.
 * @param {string} roomId - The ID of the room.
 * @param {object} updatedGameData - The new game_data object (or partial object to merge).
 */
export async function updateGameDataInDB(roomId, updatedGameData) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.updateGameDataInDB.");
        showMessage("Database connection error. Please refresh.", 'error');
        return;
    }
    try {
        const { data: roomData, error: fetchError } = await supabase
            .from('Rooms')
            .select('game_data')
            .eq('id', roomId)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        const currentGameData = roomData.game_data || {};
        const mergedGameData = { ...currentGameData, ...updatedGameData };

        const { error } = await supabase
            .from('Rooms')
            .update({ game_data: mergedGameData })
            .eq('id', roomId);

        if (error) {
            throw error;
        }
        console.log("[DEBUG] Game data updated successfully.", mergedGameData);
    } catch (error) {
        console.error("[ERROR] Error updating game data in DB:", error);
        showMessage(`Error updating game data: ${error.message}`, 'error');
    }
}

/**
 * Updates the count for a specific role in the role_settings.
 * @param {string} roomId - The ID of the room.
 * @param {string} roleName - The name of the role to update.
 * @param {number} newCount - The new count for the role.
 */
export async function updateRoleAmount(roomId, roleName, newCount) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.updateRoleAmount.");
        showMessage("Database connection error. Please refresh.", 'error');
        return;
    }
    try {
        const { data: roomData, error: fetchError } = await supabase
            .from('Rooms')
            .select('game_data')
            .eq('id', roomId)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        const currentRoleSettings = roomData.game_data.role_settings || [];
        const updatedRoleSettings = currentRoleSettings.map(setting => {
            if (setting.role === roleName) {
                return { ...setting, count: Math.max(0, newCount) }; // Ensure count is not negative
            }
            return setting;
        });

        await updateGameDataInDB(roomId, { role_settings: updatedRoleSettings });
        console.log(`[DEBUG] Role ${roleName} count updated to ${newCount}.`);
    } catch (error) {
        console.error("[ERROR] Error updating role amount:", error);
        showMessage(`Error updating role amount: ${error.message}`, 'error');
    }
}

/**
 * Toggles the disabled status of a specific role in the role_settings.
 * @param {string} roomId - The ID of the room.
 * @param {string} roleName - The name of the role to toggle.
 * @param {boolean} isDisabled - The new disabled status.
 */
export async function toggleRoleDisabled(roomId, roleName, isDisabled) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.toggleRoleDisabled.");
        showMessage("Database connection error. Please refresh.", 'error');
        return;
    }
    try {
        const { data: roomData, error: fetchError } = await supabase
            .from('Rooms')
            .select('game_data')
            .eq('id', roomId)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        const currentRoleSettings = roomData.game_data.role_settings || [];
        const updatedRoleSettings = currentRoleSettings.map(setting => {
            if (setting.role === roleName) {
                return { ...setting, disabled: isDisabled };
            }
            return setting;
        });

        await updateGameDataInDB(roomId, { role_settings: updatedRoleSettings });
        console.log(`[DEBUG] Role ${roleName} disabled status set to ${isDisabled}.`);
    } catch (error) {
        console.error("[ERROR] Error toggling role disabled status:", error);
        showMessage(`Error toggling role status: ${error.message}`, 'error');
    }
}

/**
 * Updates the count for a specific gem in the gem_settings.
 * @param {string} roomId - The ID of the room.
 * @param {string} gemName - The name of the gem to update.
 * @param {number} newCount - The new count for the gem.
 */
export async function updateGemCount(roomId, gemName, newCount) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.updateGemCount.");
        showMessage("Database connection error. Please refresh.", 'error');
        return;
    }
    try {
        const { data: roomData, error: fetchError } = await supabase
            .from('Rooms')
            .select('game_data')
            .eq('id', roomId)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        const currentGemSettings = roomData.game_data.gem_settings || [];
        const updatedGemSettings = currentGemSettings.map(setting => {
            if (setting.gem === gemName) {
                return { ...setting, count: Math.max(0, newCount) }; // Ensure count is not negative
            }
            return setting;
        });

        await updateGameDataInDB(roomId, { gem_settings: updatedGemSettings });
        console.log(`[DEBUG] Gem ${gemName} count updated to ${newCount}.`);
    } catch (error) {
        console.error("[ERROR] Error updating gem count:", error);
        showMessage(`Error updating gem count: ${error.message}`, 'error');
    }
}

/**
 * Adds a gem to the gem_settings.
 * @param {string} roomId - The ID of the room.
 * @param {string} gemName - The name of the gem to add.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function addGemToSettings(roomId, gemName) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.addGemToSettings.");
        showMessage("Database connection error. Please refresh.", 'error');
        return false;
    }
    try {
        const { data: roomData, error: fetchError } = await supabase
            .from('Rooms')
            .select('game_data')
            .eq('id', roomId)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        const currentGemSettings = roomData.game_data.gem_settings || [];

        // Check if gem already exists in settings
        if (currentGemSettings.some(setting => setting.gem === gemName)) {
            showMessage(`Gem '${gemName}' is already in the settings.`, 'warning');
            return false;
        }

        const newGemSetting = {
            gem: gemName,
            count: 0 // Default count when added
        };

        const updatedGemSettings = [...currentGemSettings, newGemSetting];

        await updateGameDataInDB(roomId, { gem_settings: updatedGemSettings });
        showMessage(`Gem '${gemName}' added to settings.`, 'success');
        console.log(`[DEBUG] Gem ${gemName} added to settings.`);
        return true;
    } catch (error) {
        console.error("[ERROR] Error adding gem to settings:", error);
        showMessage(`Error adding gem: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Removes a gem from the gem_settings.
 * @param {string} roomId - The ID of the room.
 * @param {string} gemName - The name of the gem to remove.
 */
export async function removeGemFromSettings(roomId, gemName) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.removeGemFromSettings.");
        showMessage("Database connection error. Please refresh.", 'error');
        return;
    }
    try {
        const { data: roomData, error: fetchError } = await supabase
            .from('Rooms')
            .select('game_data')
            .eq('id', roomId)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        const currentGemSettings = roomData.game_data.gem_settings || [];
        const updatedGemSettings = currentGemSettings.filter(setting => setting.gem !== gemName);

        await updateGameDataInDB(roomId, { gem_settings: updatedGemSettings });
        console.log(`[DEBUG] Gem ${gemName} removed from settings.`);
    } catch (error) {
        console.error("[ERROR] Error removing gem from settings:", error);
        showMessage(`Error removing gem: ${error.message}`, 'error');
    }
}

/**
 * Starts the game, assigns roles, and updates game state.
 * @param {string} roomId - The ID of the room.
 * @param {string} currentHostId - The ID of the current host initiating the game start.
 * @returns {Promise<void>}
 */
export async function startGame(roomId, currentHostId) {
    if (!supabase) {
        console.error("[ERROR] Supabase client not initialized in room-service.startGame.");
        showMessage("Database connection error. Please refresh.", 'error');
        return;
    }
    try {
        console.log("[DEBUG] [startGame] Attempting to start game...");

        const { data: currentRoomData, error: fetchError } = await supabase
            .from('Rooms')
            .select('players, game_data')
            .eq('id', roomId)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        const players = currentRoomData.players || [];
        const roleSettings = currentRoomData.game_data.role_settings || [];
        const gemSettings = currentRoomData.game_data.gem_settings || [];

        if (players.length === 0) {
            showMessage("Cannot start game: No players in the room.", 'warning');
            return;
        }
        if (currentRoomData.game_data.game_state !== 'lobby') {
            showMessage("Game already in progress or not in lobby state.", 'warning');
            return;
        }

        // 1. Calculate total roles needed and available roles
        let totalRolesToAssign = 0;
        const availableRoles = [];
        roleSettings.forEach(setting => {
            if (!setting.disabled && setting.count > 0) {
                totalRolesToAssign += setting.count;
                for (let i = 0; i < setting.count; i++) {
                    availableRoles.push(setting.role);
                }
            }
        });

        // Sum up required roles from enabled gem categories
        let totalRolesRequiredByGems = 0;
        const rolesFromEnabledGems = [];
        const usedGemNames = new Set(); // To track gems that have active counts

        gemSettings.forEach(gemSetting => {
            if (gemSetting.count > 0) {
                const template = GEM_DATA[gemSetting.gem];
                if (template) {
                    totalRolesRequiredByGems += gemSetting.count;
                    usedGemNames.add(gemSetting.gem);
                    // Add roles corresponding to this gem up to its count
                    ROLE_TEMPLATES.forEach(roleTemplate => {
                        if (roleTemplate.gem === gemSetting.gem) {
                            for (let i = 0; i < gemSetting.count; i++) { // Add 'count' number of roles from this gem
                                rolesFromEnabledGems.push(roleTemplate.name);
                            }
                        }
                    });
                }
            }
        });


        // Distribute available roles to players
        const shuffledPlayers = [...players].sort(() => 0.5 - Math.random());
        let updatedPlayers = [...players]; // Create a mutable copy
        const centerRolePool = [];
        let assignedRoleNames = {}; // To track counts of assigned roles

        // Ensure each player gets one role first
        for (let i = 0; i < shuffledPlayers.length; i++) {
            if (availableRoles.length > 0) {
                const randomIndex = Math.floor(Math.random() * availableRoles.length);
                const roleName = availableRoles.splice(randomIndex, 1)[0];
                const playerIndex = updatedPlayers.findIndex(p => p.id === shuffledPlayers[i].id);
                if (playerIndex !== -1) {
                    updatedPlayers[playerIndex].role = roleName;
                    updatedPlayers[playerIndex]["chosen-image-url"] = await getRoleImagePath(roleName, currentRoomData); // Assign role image
                    assignedRoleNames[roleName] = (assignedRoleNames[roleName] || 0) + 1;
                }
            } else {
                // Handle case where not enough roles for all players (e.g., assign a default "Villager" or "No Role")
                const playerIndex = updatedPlayers.findIndex(p => p.id === shuffledPlayers[i].id);
                if (playerIndex !== -1) {
                    updatedPlayers[playerIndex].role = "Villager"; // Default if no roles left
                    updatedPlayers[playerIndex]["chosen-image-url"] = await getRoleImagePath("Villager", currentRoomData);
                }
                showMessage("Not enough roles to assign to all players. Some players received a default role.", 'warning');
                break;
            }
        }

        // Any remaining roles go into the center pool
        for (const roleName of availableRoles) { // Use for...of for async inside loop
            centerRolePool.push({
                role: roleName,
                "chosen-image-url": await getRoleImagePath(roleName, currentRoomData) // Assign image path for center roles
            });
        }


        // Filter out roles that were assigned or put into center pool from role_settings
        // And update the counts in role_settings based on what's left over for future games
        const finalRoleSettings = roleSettings.map(setting => {
            const assignedCount = assignedRoleNames[setting.role] || 0;
            const remainingCount = Math.max(0, setting.count - assignedCount); // Subtract assigned roles
            return { ...setting, count: remainingCount };
        });

        // Ensure all assigned player roles have their image paths resolved and stored
        updatedPlayers = await Promise.all(updatedPlayers.map(async player => {
            // Ensure player's own role has correct image path
            player["chosen-image-url"] = await getRoleImagePath(player.role, currentRoomData);
            return player;
        }));

        // Ensure center roles also have correct image paths
        for (const role of centerRolePool) {
            role["chosen-image-url"] = await getRoleImagePath(role.role, currentRoomData);
        }


        // Update the role_image_map with all roles that will be displayed
        const newRoleImageMap = { ...currentRoomData.game_data.role_image_map };
        for (const template of ROLE_TEMPLATES) {
            newRoleImageMap[template.name] = await getRoleImagePath(template.name, currentRoomData);
        }


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