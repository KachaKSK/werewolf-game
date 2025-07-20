// src/services/room-service.js
// Contains functions for interacting with Supabase for room management.

import { showMessage, generateRoomId, getRoleTemplate, standardizeRoleName, getRoleImagePath, shuffleArray } from '../utils/helpers.js';
import { ROLE_TEMPLATES, ROOM_BACKGROUNDS, ROLE_IMAGE_BASE_PATH, GEM_DATA } from '../config/constants.js';

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
                    roleInstance["chosen-image-url"] = roleImageMap[roleTemplate.name] || getRoleImagePath(roleTemplate.name, { game_data: { role_image_map: roleImageMap } });
                    pool.push(roleInstance);
                }
            }
        }
    });
    // Shuffle the pool to randomize card order
    shuffleArray(pool);
    return pool;
}

/**
 * Fetches room data from Supabase.
 * @param {object} supabase - The Supabase client instance.
 * @param {string} roomId - The ID of the room to fetch.
 * @returns {Promise<object|null>} The room data or null if not found.
 */
export async function fetchRoomData(supabase, roomId) {
    console.log(`[DEBUG] [fetchRoomData] Fetching data for room: ${roomId}`);
    try {
        const { data, error } = await supabase
            .from('Rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        if (error && error.code === 'PGRST116') { // No rows found
            console.log(`[DEBUG] [fetchRoomData] Room ${roomId} not found.`);
            return null;
        }
        if (error) {
            throw error;
        }
        console.log(`[DEBUG] [fetchRoomData] Received data for room ${roomId}:`, data);
        return data;
    } catch (error) {
        console.error("[ERROR] [fetchRoomData] Error fetching room data:", error);
        showMessage(`Error fetching room data: ${error.message}`, 'error');
        return null;
    }
}

/**
 * Handles creating a new room.
 * @param {object} supabase - The Supabase client instance.
 * @param {string} userName - The name of the creating player.
 * @param {string} userId - The short ID of the creating player.
 * @param {string} localId - The full UUID of the creating player.
 * @param {string} newRoomNameInputVal - The desired name for the new room.
 * @returns {Promise<string|null>} The new room ID if successful, otherwise null.
 */
export async function createRoom(supabase, userName, userId, localId, newRoomNameInputVal) {
    console.log('[DEBUG] [createRoom] Attempting to create room.');
    if (!localId || !userName || !userId) {
        showMessage("Please set your name first.", 'error');
        return null;
    }

    const newRoomId = generateRoomId();
    const roomNameToCreate = newRoomNameInputVal.trim() || "WolfVille Village"; // Use placeholder if input is empty

    const initialRoleSettings = ROLE_TEMPLATES.map(role => ({
        role: role.name,
        amount: role["default-amount"] !== undefined ? role["default-amount"] : 1,
        isDisabled: role.isPrimarilyDisabled || false
    }));
    console.log('[DEBUG] [createRoom] Initial Role Settings:', initialRoleSettings);

    const initialGemIncludedSettings = [
        { gem: "Townfolks", count: 3 },
        { gem: "Specials", count: 1 },
        { gem: "Werewolfs", count: 2 }
    ];
    console.log('[DEBUG] [createRoom] Initial Gem Included Settings:', initialGemIncludedSettings);

    // NEW: Generate a consistent role_image_map for this room
    const roleImageMap = {};
    ROLE_TEMPLATES.forEach(role => {
        const standardizedName = standardizeRoleName(role.name);
        const count = role['variant-count'] || 1;
        const randomVariant = Math.floor(Math.random() * count) + 1;
        roleImageMap[role.name] = `${ROLE_IMAGE_BASE_PATH}${standardizedName}-v-${randomVariant}.jpeg`;
    });
    console.log('[DEBUG] [createRoom] Generated Role Image Map:', roleImageMap);

    // Generate initial center_role_pool based on these settings and the new roleImageMap
    const initialCenterRolePool = generateCenterRolePool(initialRoleSettings, roleImageMap);
    console.log('[DEBUG] [createRoom] Initial Center Role Pool:', initialCenterRolePool);

    const nobodyRoleTemplate = getRoleTemplate("Nobody");
    const initialPlayerRoles = nobodyRoleTemplate ? [{
        ...JSON.parse(JSON.stringify(nobodyRoleTemplate)),
        "chosen-image-url": roleImageMap[nobodyRoleTemplate.name] || getRoleImagePath(nobodyRoleTemplate.name, { game_data: { role_image_map: roleImageMap } })
    }] : [];

    const player = {
        name: userName,
        uid: userId,
        "local-id": localId,
        status: "Alive",
        "rendered-image": undefined,
        roles: initialPlayerRoles
    };
    const randomBackgroundUrl = ROOM_BACKGROUNDS[Math.floor(Math.random() * ROOM_BACKGROUNDS.length)];

    try {
        const existingRoom = await fetchRoomData(supabase, newRoomId);
        if (existingRoom) {
            showMessage(`Room ${newRoomId} already exists. Trying another ID.`, 'info');
            return createRoom(supabase, userName, userId, localId, newRoomNameInputVal); // Recursively try again
        }

        const { data, error } = await supabase
            .from('Rooms')
            .insert([
                {
                    id: newRoomId,
                    host_id: localId,
                    players: [player],
                    game_data: {
                        counter: 0,
                        randomValue: 'N/A',
                        lastUpdatedBy: userName,
                        background_image_url: randomBackgroundUrl,
                        roomName: roomNameToCreate,
                        role_settings: initialRoleSettings,
                        center_role_pool: initialCenterRolePool,
                        gem_included_settings: initialGemIncludedSettings,
                        role_image_map: roleImageMap
                    }
                }
            ]);

        if (error) {
            throw error;
        }

        showMessage(`Room ${newRoomId} created successfully!`, 'success');
        console.log(`[DEBUG] [createRoom] Room ${newRoomId} created.`);
        return newRoomId;
    } catch (error) {
        console.error("[ERROR] [createRoom] Error creating room:", error);
        showMessage(`Error creating room: ${error.message}`, 'error');
        return null;
    }
}

/**
 * Handles joining an existing room.
 * @param {object} supabase - The Supabase client instance.
 * @param {string} userName - The name of the joining player.
 * @param {string} userId - The short ID of the joining player.
 * @param {string} localId - The full UUID of the joining player.
 * @param {string} roomIdInputVal - The ID of the room to join.
 * @param {object} currentRoomData - The current room data (needed for role image path).
 * @returns {Promise<boolean>} True if joined successfully, false otherwise.
 */
export async function joinRoom(supabase, userName, userId, localId, roomIdInputVal, currentRoomData) {
    console.log('[DEBUG] [joinRoom] Attempting to join room.');
    if (!localId || !userName || !userId) {
        showMessage("Please set your name first.", 'error');
        return false;
    }

    const roomId = roomIdInputVal.trim();
    if (!roomId) {
        showMessage("Please enter a Room ID.", 'error');
        return false;
    }

    const nobodyRoleTemplate = getRoleTemplate("Nobody");
    const initialPlayerRoles = nobodyRoleTemplate ? [{
        ...JSON.parse(JSON.stringify(nobodyRoleTemplate)),
        "chosen-image-url": getRoleImagePath(nobodyRoleTemplate.name, currentRoomData)
    }] : [];

    const player = {
        name: userName,
        uid: userId,
        "local-id": localId,
        status: "Alive",
        "rendered-image": undefined,
        roles: initialPlayerRoles
    };

    try {
        const room = await fetchRoomData(supabase, roomId);
        if (room) {
            const { data, error } = await supabase.rpc('add_player_to_room', {
                p_room_id: roomId,
                p_player_data: player
            });

            if (error) {
                if (error.message.includes('already in room')) {
                    showMessage(`You are already in room ${roomId}.`, 'info');
                } else {
                    throw error;
                }
            } else {
                showMessage(`Joined room ${roomId} successfully!`, 'success');
            }
            console.log(`[DEBUG] [joinRoom] Room ${roomId} joined.`);
            return true;
        } else {
            showMessage(`Room ${roomId} does not exist.`, 'error');
            console.log(`[DEBUG] [joinRoom] Room ${roomId} does not exist.`);
            return false;
        }
    } catch (error) {
        console.error("[ERROR] [joinRoom] Error joining room:", error);
        showMessage(`Error joining room: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Handles leaving the current room.
 * @param {object} supabase - The Supabase client instance.
 * @param {string} currentRoomId - The ID of the room to leave.
 * @param {string} userId - The short ID of the leaving player.
 * @param {string} localId - The full UUID of the leaving player.
 * @param {boolean} isHost - True if the current user is the host.
 * @returns {Promise<void>}
 */
export async function leaveRoom(supabase, currentRoomId, userId, localId, isHost) {
    console.log('[DEBUG] [leaveRoom] Attempting to leave room.');
    if (!currentRoomId || !localId) {
        showMessage("You are not in a room.", 'info');
        return;
    }

    const roomIdToLeave = currentRoomId;

    try {
        const room = await fetchRoomData(supabase, roomIdToLeave);
        if (!room) {
            console.warn(`[DEBUG] [leaveRoom] Room ${roomIdToLeave} not found when trying to leave.`);
            return;
        }

        if (isHost && room.players && room.players.length > 1) {
            const remainingPlayers = room.players.filter(p => p["local-id"] !== localId);
            if (remainingPlayers.length > 0) {
                const newHost = remainingPlayers[0];
                console.log(`[DEBUG] [leaveRoom] Promoting new host: ${newHost.name} (Local ID: ${newHost["local-id"]})`);
                const { error: promoteError } = await supabase.rpc('promote_new_host', {
                    p_room_id: roomIdToLeave,
                    p_new_host_id: newHost["local-id"]
                });
                if (promoteError) {
                    console.error("[ERROR] [leaveRoom] Error promoting new host:", promoteError);
                    showMessage(`Error promoting new host: ${promoteError.message}`, 'error');
                } else {
                    showMessage(`You left the room. ${newHost.name} is the new host.`, 'info');
                }
            }
        } else if (isHost && room.players.length <= 1) {
            showMessage("You left the room. The room might be dissolved as you were the last player.", 'info');
        } else {
            showMessage(`You left room ${roomIdToLeave}.`, 'success');
        }

        const { data, error } = await supabase.rpc('remove_player_from_room', {
            p_room_id: roomIdToLeave,
            p_player_id: userId
        });

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error("[ERROR] [leaveRoom] Error leaving room:", error);
        showMessage(`Error leaving room: ${error.message}`, 'error');
    }
}

/**
 * Kicks a player from the current room.
 * Only callable by the host.
 * @param {object} supabase - The Supabase client instance.
 * @param {string} currentRoomId - The ID of the current room.
 * @param {string} userId - The short ID of the current user.
 * @param {boolean} isHost - True if the current user is the host.
 * @param {string} playerIdToKick - The ID of the player to kick (this is the 6-digit short ID).
 */
export async function kickPlayer(supabase, currentRoomId, userId, isHost, playerIdToKick) {
    if (!currentRoomId || !isHost) {
        showMessage("Only the host can kick players.", 'error');
        return;
    }
    if (playerIdToKick === userId) {
        showMessage("You cannot kick yourself.", 'error');
        return;
    }

    console.log(`[DEBUG] [kickPlayer] Attempting to kick player ${playerIdToKick} from room ${currentRoomId}`);
    try {
        const { data, error } = await supabase.rpc('remove_player_from_room', {
            p_room_id: currentRoomId,
            p_player_id: playerIdToKick
        });

        if (error) {
            throw error;
        }
        showMessage(`Player ${playerIdToKick}... kicked successfully.`, 'success');
    }
    catch (error) {
        console.error("[ERROR] [kickPlayer] Error kicking player:", error);
        showMessage(`Error kicking player: ${error.message}`, 'error');
    }
}

/**
 * Renames the current room's title.
 * @param {object} currentRoomData - The current room data.
 * @param {boolean} isHost - True if the current user is the host.
 * @returns {boolean} True if modal should be shown, false otherwise.
 */
export function renameRoomTitle(currentRoomData, isHost) {
    if (!currentRoomData || !isHost) {
        showMessage("Only the host can rename the room.", 'error');
        return false;
    }
    console.log('[DEBUG] [renameRoomTitle] Showing rename modal.');
    return true; // Indicate that the modal should be shown by the caller
}

/**
 * Confirms the room renaming from the modal.
 * @param {object} supabase - The Supabase client instance.
 * @param {string} currentRoomId - The ID of the current room.
 * @param {object} currentRoomData - The current room data.
 * @param {string} newRoomNameInputVal - The new room name from the input.
 * @returns {Promise<boolean>} True if renamed successfully, false otherwise.
 */
export async function confirmRenameRoom(supabase, currentRoomId, currentRoomData, newRoomNameInputVal) {
    const newRoomName = newRoomNameInputVal.trim();
    if (newRoomName === null || newRoomName === "") {
        showMessage("Room name cannot be empty.", 'info');
        return false;
    }

    try {
        if (!currentRoomData) {
            showMessage("Room not found for renaming.", 'error');
            return false;
        }

        const { data, error } = await supabase
            .from('Rooms')
            .update({ game_data: { ...currentRoomData.game_data, roomName: newRoomName } })
            .eq('id', currentRoomId);

        if (error) {
            throw error;
        }
        showMessage(`Room title updated to "${newRoomName}"!`, 'success');
        console.log(`[DEBUG] [confirmRenameRoom] Room renamed to: ${newRoomName}`);
        return true;
    } catch (error) {
        console.error("[ERROR] [confirmRenameRoom] Error renaming room title:", error);
        showMessage(`Error renaming room title: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Increments the shared counter in the current room.
 * @param {object} supabase - The Supabase client instance.
 * @param {string} currentRoomId - The ID of the current room.
 * @param {string} localId - The full UUID of the current user.
 * @param {string} userName - The name of the current user.
 * @param {object} currentRoomData - The current room data.
 * @returns {Promise<void>}
 */
export async function incrementCounter(supabase, currentRoomId, localId, userName, currentRoomData) {
    if (!currentRoomId || !localId) {
        showMessage("You must be in a room to interact with the game state.", 'error');
        return;
    }

    try {
        if (!currentRoomData) {
            showMessage("Room not found for counter update.", 'error');
            return;
        }

        const currentCounter = currentRoomData.game_data?.counter || 0;
        const newCounter = currentCounter + 1;

        const { data, error } = await supabase
            .from('Rooms')
            .update({ game_data: { ...currentRoomData.game_data, counter: newCounter, lastUpdatedBy: userName } })
            .eq('id', currentRoomId);

        if (error) {
            throw error;
        }
        showMessage("Counter incremented!", 'success');
        console.log(`[DEBUG] [incrementCounter] Counter incremented to: ${newCounter}`);
    } catch (error) {
        console.error("[ERROR] [incrementCounter] Error incrementing counter:", error);
        showMessage(`Error incrementing counter: ${error.message}`, 'error');
    }
}

/**
 * Generates and updates a random value in the current room.
 * @param {object} supabase - The Supabase client instance.
 * @param {string} currentRoomId - The ID of the current room.
 * @param {string} localId - The full UUID of the current user.
 * @param {string} userName - The name of the current user.
 * @param {object} currentRoomData - The current room data.
 * @returns {Promise<void>}
 */
export async function generateRandomValue(supabase, currentRoomId, localId, userName, currentRoomData) {
    if (!currentRoomId || !localId) {
        showMessage("You must be in a room to interact with the game state.", 'error');
        return;
    }

    try {
        if (!currentRoomData) {
            showMessage("Room not found for random value update.", 'error');
            return;
        }

        const newRandomValue = Math.floor(Math.random() * 10000);

        const { data, error } = await supabase
            .from('Rooms')
            .update({ game_data: { ...currentRoomData.game_data, randomValue: newRandomValue, lastUpdatedBy: userName } })
            .eq('id', currentRoomId);

        if (error) {
            throw error;
        }
        showMessage(`Random value generated: ${newRandomValue}!`, 'success');
        console.log(`[DEBUG] [generateRandomValue] Random value generated: ${newRandomValue}`);
    } catch (error) {
        console.error("[ERROR] [generateRandomValue] Error generating random value:", error);
        showMessage(`Error generating random value: ${error.message}`, 'error');
    }
}

/**
 * Updates the role settings and the center_role_pool in the database.
 * @param {object} supabase - The Supabase client instance.
 * @param {string} currentRoomId - The ID of the current room.
 * @param {object} currentRoomData - The current room data.
 * @param {Array<Object>} newRoleSettings - The updated array of role settings.
 * @param {Array<Object>} newGemIncludedSettings - The updated array of gem included settings.
 */
export async function updateGameDataInDB(supabase, currentRoomId, currentRoomData, newRoleSettings, newGemIncludedSettings) {
    if (!currentRoomId) {
        showMessage("Not in a room to update game data.", 'error');
        return;
    }
    try {
        if (!currentRoomData) {
            showMessage("Room not found for updating game data.", 'error');
            return;
        }

        const newCenterRolePool = generateCenterRolePool(newRoleSettings, currentRoomData.game_data?.role_image_map || {});

        const updatedGameData = {
            ...currentRoomData.game_data,
            role_settings: newRoleSettings,
            center_role_pool: newCenterRolePool,
            gem_included_settings: newGemIncludedSettings
        };

        console.log("[DEBUG] Sending updated game_data to DB:", updatedGameData);

        const { data, error } = await supabase
            .from('Rooms')
            .update({ game_data: updatedGameData })
            .eq('id', currentRoomId);

        if (error) {
            throw error;
        }
        console.log("[DEBUG] Game data (role settings, center_role_pool, gem_included_settings) updated in DB successfully.");
    } catch (error) {
        console.error("[ERROR] Error updating game data in DB:", error);
        showMessage(`Error updating game data: ${error.message}`, 'error');
    }
}

/**
 * Increments or decrements the amount for a specific role.
 * @param {object} supabase - The Supabase client instance.
 * @param {string} currentRoomId - The ID of the current room.
 * @param {object} currentRoomData - The current room data.
 * @param {string} roleName - The name of the role.
 * @param {number} change - The amount to change (e.g., 1 for increment, -1 for decrement).
 */
export async function updateRoleAmount(supabase, currentRoomId, currentRoomData, roleName, change) {
    if (!currentRoomData || !currentRoomData.game_data || !currentRoomData.game_data.role_settings) {
        showMessage("Room data not available to update role amount.", 'error');
        return;
    }

    const newRoleSettings = [...currentRoomData.game_data.role_settings];
    const roleSetting = newRoleSettings.find(s => s.role === roleName);

    if (roleSetting) {
        const newAmount = Math.max(0, roleSetting.amount + change);
        if (roleSetting.amount !== newAmount) {
            roleSetting.amount = newAmount;
            await updateGameDataInDB(supabase, currentRoomId, currentRoomData, newRoleSettings, currentRoomData.game_data.gem_included_settings);
            console.log(`[DEBUG] Role ${roleName} amount changed to ${newAmount}.`);
        }
    } else {
        showMessage(`Role setting for ${roleName} not found.`, 'error');
    }
}

/**
 * Toggles the isDisabled status for a specific role.
 * @param {object} supabase - The Supabase client instance.
 * @param {string} currentRoomId - The ID of the current room.
 * @param {object} currentRoomData - The current room data.
 * @param {string} roleName - The name of the role.
 */
export async function toggleRoleDisabled(supabase, currentRoomId, currentRoomData, roleName) {
    const roleTemplate = ROLE_TEMPLATES.find(r => r.name === roleName);
    if (roleTemplate && roleTemplate.gem === "None") {
        showMessage(`Roles with gem "None" cannot be disabled/enabled.`, 'info');
        return;
    }

    if (!currentRoomData || !currentRoomData.game_data || !currentRoomData.game_data.role_settings) {
        showMessage("Room data not available to toggle role disable status.", 'error');
        return;
    }

    const newRoleSettings = [...currentRoomData.game_data.role_settings];
    const roleSetting = newRoleSettings.find(s => s.role === roleName);

    if (roleSetting) {
        roleSetting.isDisabled = !roleSetting.isDisabled;
        await updateGameDataInDB(supabase, currentRoomId, currentRoomData, newRoleSettings, currentRoomData.game_data.gem_included_settings);
        console.log(`[DEBUG] Role ${roleName} disabled status toggled to ${roleSetting.isDisabled}.`);
    } else {
        showMessage(`Role setting for ${roleName} not found.`, 'error');
    }
}

/**
 * Updates the count for a specific gem category.
 * @param {object} supabase - The Supabase client instance.
 * @param {string} currentRoomId - The ID of the current room.
 * @param {object} currentRoomData - The current room data.
 * @param {string} gemName - The name of the gem category.
 * @param {number} change - The amount to change the count by (e.g., 1 or -1).
 */
export async function updateGemCount(supabase, currentRoomId, currentRoomData, gemName, change) {
    if (!currentRoomData || !currentRoomData.game_data || !currentRoomData.game_data.gem_included_settings) {
        showMessage("Room data not available to update gem count.", 'error');
        return;
    }

    const newGemIncludedSettings = [...currentRoomData.game_data.gem_included_settings];
    const gemSetting = newGemIncludedSettings.find(g => g.gem === gemName);

    if (gemSetting) {
        const newCount = Math.max(0, gemSetting.count + change);
        if (gemSetting.count !== newCount) {
            gemSetting.count = newCount;
            await updateGameDataInDB(supabase, currentRoomId, currentRoomData, currentRoomData.game_data.role_settings, newGemIncludedSettings);
            console.log(`[DEBUG] Gem ${gemName} count changed to ${newCount}.`);
        }
    } else {
        showMessage(`Gem setting for ${gemName} not found.`, 'error');
    }
}

/**
 * Removes a gem category from the included settings.
 * @param {object} supabase - The Supabase client instance.
 * @param {string} currentRoomId - The ID of the current room.
 * @param {object} currentRoomData - The current room data.
 * @param {string} gemName - The name of the gem category to remove.
 */
export async function removeGemFromSettings(supabase, currentRoomId, currentRoomData, gemName) {
    if (!currentRoomData || !currentRoomData.game_data || !currentRoomData.game_data.gem_included_settings) {
        showMessage("Room data not available to remove gem.", 'error');
        return;
    }

    const newGemIncludedSettings = currentRoomData.game_data.gem_included_settings.filter(g => g.gem !== gemName);
    if (newGemIncludedSettings.length !== currentRoomData.game_data.gem_included_settings.length) {
        await updateGameDataInDB(supabase, currentRoomId, currentRoomData, currentRoomData.game_data.role_settings, newGemIncludedSettings);
        showMessage(`Removed ${gemName} from roles.`, 'success');
        console.log(`[DEBUG] Gem ${gemName} removed from settings.`);
    } else {
        showMessage(`Gem ${gemName} not found in settings.`, 'info');
    }
}

/**
 * Adds a selected gem category to the included settings.
 * @param {object} supabase - The Supabase client instance.
 * @param {string} currentRoomId - The ID of the current room.
 * @param {object} currentRoomData - The current room data.
 * @param {string} gemName - The name of the gem category to add.
 */
export async function addGemToSettings(supabase, currentRoomId, currentRoomData, gemName) {
    if (!currentRoomData || !currentRoomData.game_data || !currentRoomData.game_data.gem_included_settings) {
        showMessage("Room data not available to add gem.", 'error');
        return;
    }

    const newGemIncludedSettings = [...currentRoomData.game_data.gem_included_settings];
    const existingGem = newGemIncludedSettings.find(g => g.gem === gemName);

    if (!existingGem) {
        newGemIncludedSettings.push({ gem: gemName, count: 1 });
        await updateGameDataInDB(supabase, currentRoomId, currentRoomData, currentRoomData.game_data.role_settings, newGemIncludedSettings);
        showMessage(`Added ${gemName} to roles.`, 'success');
        return true; // Indicate success for modal hiding
    } else {
        showMessage(`${gemName} is already in the list.`, 'info');
        return false;
    }
}

/**
 * Starts the game: assigns roles to players based on gem counts.
 * @param {object} supabase - The Supabase client instance.
 * @param {string} currentRoomId - The ID of the current room.
 * @param {boolean} isHost - True if the current user is the host.
 * @param {object} currentRoomData - The current room data.
 * @returns {Promise<void>}
 */
export async function startGame(supabase, currentRoomId, isHost, currentRoomData) {
    if (!currentRoomId || !isHost) {
        showMessage("Only the host can start the game.", 'error');
        return;
    }

    if (!currentRoomData || !currentRoomData.players || currentRoomData.players.length === 0) {
        showMessage("Cannot start game: No players in the room.", 'error');
        return;
    }

    const playersInRoom = [...currentRoomData.players];
    const gemIncludedSettings = currentRoomData.game_data?.gem_included_settings || [];
    const roleImageMap = currentRoomData.game_data?.role_image_map || {};

    let availableRolesForAssignment = [];

    gemIncludedSettings.forEach(gemSetting => {
        const gemName = gemSetting.gem;
        const count = gemSetting.count;

        const rolesOfThisGem = ROLE_TEMPLATES.filter(role =>
            role.gem === gemName &&
            !role.isPrimarilyDisabled
        );

        for (let i = 0; i < count; i++) {
            if (rolesOfThisGem.length > 0) {
                const randomIndex = Math.floor(Math.random() * rolesOfThisGem.length);
                const chosenRoleTemplate = rolesOfThisGem[randomIndex];

                const roleInstance = JSON.parse(JSON.stringify(chosenRoleTemplate));
                roleInstance["chosen-image-url"] = roleImageMap[chosenRoleTemplate.name] || getRoleImagePath(chosenRoleTemplate.name, currentRoomData);

                availableRolesForAssignment.push(roleInstance);
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