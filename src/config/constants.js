// src/config/constants.js
// Defines constants for roles, gems, and other game-related data.

export const ROOM_BACKGROUNDS = [
    'https://i.imgur.com/hvBtKgM.jpeg',
    'https://i.imgur.com/QIxZror.jpeg',
    'https://i.imgur.com/4wQ8gYe.jpeg'
];

// Base path for gem images
export const GEM_IMAGE_BASE_PATH = '/images/gems/'; // Added this line

// Gem Data with colors and images (Updated to use local paths with .jpg extension)
export const GEM_DATA = {
    "Townfolks": { color: "#2ecc71", image: `${GEM_IMAGE_BASE_PATH}townfolks.jpg` }, // Green
    "Werewolfs": { color: "#e74c3c", image: `${GEM_IMAGE_BASE_PATH}werewolves.jpg` }, // Red-crimson (corrected filename to match "werewolves.jpg")
    "Specials": { color: "#f39c12", image: `${GEM_IMAGE_BASE_PATH}specials.jpg` }, // Yellow-mild orange
    "Vampires": { color: "#9b59b6", image: `${GEM_IMAGE_BASE_PATH}vampires.jpg` }, // Violet-purple
    "Zombies": { color: "#55B4B4", image: `${GEM_IMAGE_BASE_PATH}zombies.jpg` }, // Mint-green
    "None": { color: "#95a5a6", image: `${GEM_IMAGE_BASE_PATH}none.jpg` } // Grey
};

// Base path for role images
export const ROLE_IMAGE_BASE_PATH = '/images/roles/'; // Corrected path
export const NOBODY_IMAGE_PATH = '/images/roles/nobody-v-1.jpeg'; // Added nobody image path

// Role Templates Data (Corrected and parsed from user input)
export const ROLE_TEMPLATES = [
    //Villagers
    {
        name: "Nobody",
        "thai-name": "ไม่มีบทบาท",
        description: "Cannot be capable to do things",
        "variant-count": 5, // Based on previous image-template count
        gem: "None",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
        isPrimarilyDisabled: true, // Always disabled
    },
    {
        name: "Narrator",
        "thai-name": "ผู้บรรยาย",
        description: "Moderate the game",
        "variant-count": 1, // Default to 1
        gem: "None",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
        isPrimarilyDisabled: true, // Always disabled
    },
    {
        name: "Villager",
        "thai-name": "ชาวบ้าน",
        description: "Has no special night ability. Wins by accurately identifying and lynching Werewolves.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Seer",
        "thai-name": "ผู้พยากรณ์",
        description: "Each night, chooses a player to learn their alignment which is Townfolks/Werewolfs.",
        "variant-count": 4, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "See through",
                action: "-select-any -show-rough-gem -o -night",
            }
        ],
        conditions: undefined,
    },
    {
        name: "Aura Seer",
        "thai-name": "ผู้หยั่งรู้",
        description: "Each night, chooses a player to learn their role type which is Wolves/Townfolks/Specials.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "See through",
                action: "-select-any -show-gem -o -night",
            }
        ],
        conditions: undefined,
    },
    {
        name: "Apprentice Seer",
        "thai-name": "ผู้พยากรณ์ฝึกหัด",
        description: "Apprentice Seer may be less powerful or gain power if the primary Seer dies.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: [
            {
                condition: "-none-role-seer -none-role-restricted_seer -none-role-aura_seer",
                result: "-gain-role-seer"
            }
        ],
    },
    {
        name: "Restricted Seer",
        "thai-name": "ผู้พยากรณ์ต้องพันธนาการ",
        description: "Two times per game, at night, chooses a player to learn their alignment which is Townfolks/Werewolfs.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "See through",
                action: "-select-any -show-rough-gem -o -c2 -night",
            }
        ],
        conditions: undefined,
    },
    {
        name: "Prophet",
        "thai-name": "ผู้เผยพระวจนะ",
        description: "Each night, chooses a player to learn their alignment which is Townfolks/Werewolfs. Have 1 time ability to reveal the role of a player.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "See through",
                action: "select-any -show-rough-gem -o -night",
            },
            {
                name: "Enlightened",
                action: "select-any -show-role -o -night -c1",
            }
        ],
        conditions: undefined,
    },
    {
        name: "Doctor",
        "thai-name": "แพทย์",
        description: "One time per each game, chooses one player to revive from death.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "Medication Effectiveness",
                action: "-select-status-dead -revive -c1 -o -night -before-gem-werewolfs",
            }
        ],
        conditions: undefined,
    },
    {
        name: "Nurse",
        "thai-name": "นางพยาบาล",
        description: "The Nurse specifically gains the Doctor's ability if the Doctor dies.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: [
            {
                condition: "-none-doctor",
                result: "-gain-role-doctor",
            }
        ],
    },
    {
        name: "Bodyguard",
        "thai-name": "บอดี้การ์ด",
        description: "Each night, chooses one player to protect; if that player is attacked, the Bodyguard may die in their place.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "Full Protection",
                action: "-select-any -send-condition-being_protected<name: -this-name> -c1 -o -night -before-gem-werewolfs",
            }
        ],
        conditions: [
            {
                condition: "-receive-kill",
                result: "-cancel -select-name-<name> -send-kill -c1",
            }
        ],
    },
    {
        name: "Mason",
        "thai-name": "ช่างก่ออิฐ",
        description: "Knows all other Masons, confirming their good alignment to each other.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
        isPrimarilyDisabled: true,
    },
    {
        name: "Hunter",
        "thai-name": "นายพราน",
        description: "If eliminated (lynched or killed by Werewolves), immediately chooses another player to eliminate.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "Avenged",
                action: "-unusable -select-any -send-kill -c1",
            }
        ],
        conditions: [
            {
                condition: "-receive-kill",
                result: "-trigger-ability-avenged",
            }
        ],
    },
    {
        name: "Troublemaker",
        "thai-name": "ตัวป่วน",
        description: "One time per game, at night, swaps the roles of two other players.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "Troublemaker",
                action: "select-any-a2 -swap-role -o -c1 -night -late",
            }
        ],
        conditions: undefined,
    },
    {
        name: "Robber",
        "thai-name": "โจร",
        description: "One time per game, at night, swaps their own role card with another player's role card and then views their new role.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "Robbing",
                action: "-select-any -o -this -c1 -night -swap-role"
            }
        ],
        conditions: undefined,
    },
    {
        name: "Drunk",
        "thai-name": "ขี้เมา",
        description: "Swaps a role card with a card from the center. The Drunk swaps their own without looking.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: [
            {
                condition: "-night-d1",
                result: "-center -swap-role",
            }
        ],
    },
    {
        name: "Bartender",
        "thai-name": "บาร์เทนเดอร์",
        description: "One time per game, the Bartender swaps a central card with another player's.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "Shaking",
                action: "-select-any -o -select-center-a1 -swap-role",
            }
        ],
        conditions: undefined,
    },
    {
        name: "Cupid",
        "thai-name": "คิวปิด",
        description: "On the first night, chooses two players to be \"lovers.\" If one lover dies, the other immediately dies as well.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "Love Knot",
                action: "-night-d1 -c1 -select-any-a2 -send-condition-love_knot<lover_name: -another-name>",
            }
        ],
        conditions: [
            {
                name: "Love Knot",
                condition: "-receive-kill",
                result: "-select-name-lover_name -send-kill",
            }
        ],
    },
    {
        name: "Witch",
        "thai-name": "แม่มด",
        description: "Possesses two single-use potions: one to save a player from death, and one to kill any player.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "Healing Potion",
                action: "-select-status-dead -c1 -night -late -o -send-revive",
            },
            {
                name: "Harming Potion",
                action: "-select-any -c1 -night -o -send-kill",
            }
        ],
        conditions: undefined,
    },
    {
        name: "Jailer",
        "thai-name": "พัศดี",
        description: "Each night, chooses a player to \"jail,\" preventing them from using their night ability and protecting them from nighttime attacks.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "Jails",
                action: "-select-any -night -o -send-condition-jailed<name>",
            }
        ],
        conditions: [
            {
                name: "Jailed",
                condition: "-recieve-kill -night",
                result: "-cancel -c1 -t1",
            }
        ],
    },
    {
        name: "Prince",
        "thai-name": "เจ้าชาย",
        description: "If nominated for lynching, can reveal their role to automatically survive that lynching.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: [
            {
                condition: "-receive-lynched",
                result: "-select-all -declare-role -cancel -c1 -o",
            }
        ],
    },
    {
        name: "Mayor",
        "thai-name": "นายกเทศบาล",
        description: "Their vote counts as two during the day.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: [
            {
                condition: "-day",
                result: "-increased-vote_count-1",
            }
        ],
        isPrimarilyDisabled: true,
    },
    {
        name: "Ghost",
        "thai-name": "ผี",
        description: "Dies on the first night, then can communicate limited clues (e.g., one letter per night) from beyond the grave.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "Clue",
                action: "-unusable -this -write-max-1 -show-all -c1",
            }
        ],
        conditions: [
            {
                condition: "-night-d1 -c1",
                result: "-this -send-kill",
            },
            {
                condition: "-night-d2",
                result: "-this -trigger-ability-clue",
            }
        ],
    },
    {
        name: "Lycanthrope",
        "thai-name": "ไลแคน",
        description: "Appears as a Werewolf to the Seer but is actually a loyal Village team member.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Werewolfs",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Magician",
        "thai-name": "นักมายากล",
        description: "Has one-time abilities to kill or revive a player at night.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "Healing Potion",
                action: "-select-status-dead -c1 -night -late -o -send-revive",
            },
            {
                name: "Harming Potion",
                action: "-select-any -c1 -night -o -send-kill",
            }
        ],
        conditions: undefined,
    },
    {
        name: "Detective",
        "thai-name": "นักสืบ",
        description: "Can investigate a player to learn if they have a night ability or not.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "Investigate",
                action: "-select-any -show-has-ability -c1 -o",
            }
        ],
        conditions: undefined,
    },
    {
        name: "Guardian Angel",
        "thai-name": "นางฟ้าผู้พิทักษ์",
        description: "Each night, chooses one player to protect; if that player is attacked, the Guardian Angel may sacrifice themselves to save the protected player.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "Divine Protection",
                action: "-select-any -send-condition-being_protected<name: -this-name> -c1 -o -night -before-gem-werewolfs",
            }
        ],
        conditions: [
            {
                condition: "-receive-kill",
                result: "-cancel -select-name-<name> -send-kill -c1",
            }
        ],
    },
    {
        name: "Mayor's Assistant",
        "thai-name": "ผู้ช่วยนายกเทศมนตรี",
        description: "If the Mayor dies, they become the new Mayor.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: [
            {
                condition: "-none-mayor",
                result: "-gain-role-mayor",
            }
        ],
    },
    {
        name: "Paranormal Investigator",
        "thai-name": "นักสืบสวนคดีเหนือธรรมชาติ",
        description: "Each night, chooses a player to learn if they are a Ghost or not.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "Spectral Sight",
                action: "-select-any -show-ghost -c1 -o",
            }
        ],
        conditions: undefined,
    },
    {
        name: "Mortician",
        "thai-name": "สัปเหร่อ",
        description: "Each night, chooses a dead player to learn their role.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "Post-mortem Analysis",
                action: "-select-status-dead -show-role -c1 -o",
            }
        ],
        conditions: undefined,
    },
    //Werewolves
    {
        name: "Werewolf",
        "thai-name": "มนุษย์หมาป่า",
        description: "Each night, all Werewolves collectively choose one player to kill. They win if the number of Werewolves equals the number of Villagers.",
        "variant-count": 4, // Default to 1
        gem: "Werewolfs",
        "rough-gem": "Werewolfs",
        abilities: [
            {
                name: "Devour",
                action: "-select-any -send-kill -c1 -o -night -gem-werewolfs -unusable -end-turn",
            }
        ],
        conditions: undefined,
    },
    {
        name: "Alpha Werewolf",
        "thai-name": "หัวหน้ามนุษย์หมาป่า",
        description: "Leads the Werewolf faction. Their vote counts as two during the night.",
        "variant-count": 1, // Default to 1
        gem: "Werewolfs",
        "rough-gem": "Werewolfs",
        abilities: [
            {
                name: "Devour",
                action: "-select-any -send-kill -c1 -o -night -gem-werewolfs -unusable -end-turn",
            }
        ],
        conditions: [
            {
                condition: "-night",
                result: "-increased-vote_count-1",
            }
        ],
    },
    {
        name: "Wolf Cub",
        "thai-name": "ลูกหมาป่า",
        description: "If the Wolf Cub dies, the Werewolves get an extra kill the following night.",
        "variant-count": 1, // Default to 1
        gem: "Werewolfs",
        "rough-gem": "Werewolfs",
        abilities: undefined,
        conditions: [
            {
                condition: "-receive-kill",
                result: "-gain-ability-extra_kill",
            }
        ],
    },
    {
        name: "Mystic Wolf",
        "thai-name": "หมาป่าพยากรณ์",
        description: "One time per game, at night, chooses a player to learn their exact role.",
        "variant-count": 1, // Default to 1
        gem: "Werewolfs",
        "rough-gem": "Werewolfs",
        abilities: [
            {
                name: "Mystic Sight",
                action: "-select-any -show-role -c1 -o -night",
            }
        ],
        conditions: undefined,
    },
    {
        name: "Diseased",
        "thai-name": "ผู้ติดโรค",
        description: "If they are killed by Werewolves, the Werewolves cannot kill the following night.",
        "variant-count": 1, // Default to 1
        gem: "Werewolfs",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: [
            {
                condition: "-receive-kill -gem-werewolfs",
                result: "-cancel-next-turn-ability-devour",
            }
        ],
    },
    {
        name: "Tanner",
        "thai-name": "คนฟอกหนัง",
        description: "Wins if they are lynched by the villagers.",
        "variant-count": 1, // Default to 1
        gem: "Specials",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: [
            {
                condition: "-receive-lynched",
                result: "-win-this",
            }
        ],
    },
    {
        name: "Cult Leader",
        "thai-name": "หัวหน้าลัทธิ",
        description: "Each night, can add a player to their cult. Wins if all remaining players are part of their cult.",
        "variant-count": 1, // Default to 1
        gem: "Specials",
        "rough-gem": "Werewolfs",
        abilities: undefined,
        conditions: undefined,
    },
    //Other distinct roles
    {
        name: "Vampire",
        "thai-name": "แวมไพร์",
        description: "Belonging to a separate Vampire faction, during the night, can collectively vote a player to be cut and being converted within 1 days. Wins only if all the players are vampires",
        "variant-count": 1, // Default to 1
        gem: "Vampires",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Zombie",
        "thai-name": "ซอมบี้",
        description: "Collectively vote a player to turn them into a new zombie. Wins only if all the players are zombies",
        "variant-count": 1, // Default to 1
        gem: "Zombies",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
        isPrimarilyDisabled: true,
    },
    {
        name: "Infected",
        "thai-name": "ผู้ติดเชื้อ",
        description: "Starting as a villager, when died will transform into a zombie.",
        "variant-count": 1, // Default to 1
        gem: "Zombies",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
        isPrimarilyDisabled: true,
    },
];