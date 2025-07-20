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
        "variant-count": 1, // Default to 1
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
                name: "Healing",
                action: "-night -c1 -select-status-dead -send-revive -this-remove-ability-harming -o",
            },
            {
                name: "Harming",
                action: "-night -c1 -select-any -send-kill -this-remove-ability-healing -o",
            }
        ],
        conditions: undefined,
    },
    {
        name: "Spellcaster",
        "thai-name": "ผู้ร่ายมนต์",
        description: "At night, chooses a player who cannot speak during the following day phase.",
        "variant-count": 4, // Based on previous image-template count
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "Speakless",
                action: "-night -late -select-any -send-unspokable-l1 -o",
            }
        ],
        conditions: undefined,
    },
    {
        name: "Bodybuilder",
        "thai-name": "นักกล้าม",
        description: "Survives one additional night attack from Werewolves.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: [
            {
                condition: "-receive-kill -by-gem-werewolfs",
                result: "-cancel -c1",
            }
        ],
    },
    {
        name: "Martyr",
        "thai-name": "ผู้เห็นเหตุการณ์/มรณสักขี",
        description: "If someone is nominated for lynching, they can choose to die in their place to save the nominated player.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: [
            {
                name: "Die For You",
                action: "-select-<event> -cancel -o -this-send-kill",
            }
        ],
        conditions: [
            {
                condition: "-event-lynched",
                result: "-this -trigger-ability-die_for_you<event: -event>",
            }
        ],
        isPrimarilyDisabled: true,
    },
    {
        name: "Beholder",
        "thai-name": "ผู้สังเกตการณ์",
        description: "Wakes up at night with seers to learn who the Seers are.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: [
            {
                condition: "-event-wake-seer",
                result: "-this -send-wake -select-role-seer -select-role-restricted_seer -select-role-prophet -select-role-apprentice_seer -select-role-aure_seer -show-role-this",
            }
        ],
    },
    {
        name: "Defender",
        "thai-name": "ผู้ปกป้อง",
        description: "Can protect a player from Werewolf attacks, but typically cannot protect the same person two nights in a row.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Sheriff",
        "thai-name": "นายอำเภอ",
        description: "During daytime, can force a vote on a player. The Sheriff can choose a Deputy.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Deputy",
        "thai-name": "ปลัดอำเภอ",
        description: "The Deputy gains the Sheriff's abilities if the Sheriff dies.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: [
            {
                condition: "-none-sheriff",
                result: "-gain-role-sheriff",
            }
        ],
    },
    {
        name: "Apothecary",
        "thai-name": "เภสัชกร",
        description: "Is informed of who will be killed each night and has one potion to save and one potion to intensify the kill.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Cursed",
        "thai-name": "ผู้ต้องสาป",
        description: "If targeted by a Werewolf for killing, they transform into a Werewolf instead of dying.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolfs",
        abilities: undefined,
        conditions: undefined,
        isPrimarilyDisabled: true,
    },
    {
        name: "Diseased",
        "thai-name": "ผู้ติดเชื้อ",
        description: "If a Werewolf kills the Diseased player, the Werewolves cannot kill on the following night.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Spirit Medium",
        "thai-name": "ผู้สื่อวิญญาณ",
        description: "Dead players can write notes to the Spirit Medium, providing clues to the living players.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Undertaker",
        "thai-name": "สัปเหร่อ",
        description: "One time per game, the undertaker can dig a grave to see the role of a dead player.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Old Hag",
        "thai-name": "มนุษย์ยายแก่",
        description: "At night, chooses a player who must leave the village the next day.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Old Man",
        "thai-name": "ผู้สูงอายุ",
        description: "Will die within 3 days.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Necromancer",
        "thai-name": "ผู้คืนชีพคนตาย",
        description: "Two times per game, copy an ability from a player, cannot copy from a player two times in row.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Werewolfs",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Dodger",
        "thai-name": "ผู้หลบหลีก",
        description: "One time per game, can send the effect received toward a player at night.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Sponge",
        "thai-name": "ฟองน้ำ",
        description: "During voting, if the Sponge receives the most points, the person with the next highest vote count is lynched.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Spellbinder",
        "thai-name": "ผู้ลงมนต์",
        description: "Wakes up first and touches one player; that player does not wake up or use their ability during that night.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Vigilante",
        "thai-name": "ศาลเตี้ย",
        description: "Have one time ability to kill a player during the night, if killed a townfolk, the vigilante will die afterward from guilt",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    //Wolves
    {
        name: "Werewolf",
        "thai-name": "มนุษย์หมาป่า",
        description: "Each night, collectively choose one player to eliminate.",
        "variant-count": 1, // Default to 1
        gem: "Werewolfs",
        "rough-gem": "Werewolfs",
        abilities: undefined,
        conditions: undefined,
        "default-amount": 2 // Set default amount for Werewolf to 2
    },
    {
        name: "Alpha Werewolf",
        "thai-name": "มนุษย์หมาป่าอัลฟ่า",
        description: "Each night, collectively choose one player to eliminate. Can turn a player who's not being a werewolf, to be one",
        "variant-count": 1, // Default to 1
        gem: "Werewolfs",
        "rough-gem": "Werewolfs",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Dire Wolf",
        "thai-name": "หมาป่าโลกันตร์",
        description: "Each night, along with the wolves, choose a player to eliminate. During the first night, choose a player to be your companion. You are eliminated if the player is eliminated.",
        "variant-count": 1, // Default to 1
        gem: "Werewolfs",
        "rough-gem": "Werewolfs",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Guardian Wolf",
        "thai-name": "หมาป่าผู้พิทักษ์",
        description: "One time per game, a guardian wolf can choose a fellow werewolf to be protected from dying.",
        "variant-count": 1, // Default to 1
        gem: "Werewolfs",
        "rough-gem": "Werewolfs",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Minion",
        "thai-name": "ลูกสมุน",
        description: "Wins with the Werewolves. Knows who the Werewolves are, but the Werewolves do not know the Minion.",
        "variant-count": 1, // Default to 1
        gem: "Werewolfs",
        "rough-gem": "Werewolfs",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Mystic Wolf",
        "thai-name": "หมาป่าลึกลับ",
        description: "A Werewolf with a limited 2 times investigative ability, can tell the role of a non-werewolf characters.",
        "variant-count": 1, // Default to 1
        gem: "Werewolfs",
        "rough-gem": "Werewolfs",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Wolf Cub",
        "thai-name": "ลูกหมาป่า",
        description: "A Werewolf with a limited 2 times investigative ability, can tell the role of a non-werewolf characters. The wolf cub cannot do killing votes, but in 3 days or all the wolves are killed, will become a werewolf",
        "variant-count": 1, // Default to 1
        gem: "Werewolfs",
        "rough-gem": "Werewolfs",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Nightmare Werewolf",
        "thai-name": "หมาป่าแห่งฝันร้าย",
        description: "Can impose a \"nightmare\" on a player, affecting their abilities to be affected on a random player instead",
        "variant-count": 1, // Default to 1
        gem: "Werewolfs",
        "rough-gem": "Werewolfs",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Dream Wolf",
        "thai-name": "หมาป่าผู้หลับฝัน",
        description: "A Werewolf who does not know the other Werewolves, but the other Werewolves know them.",
        "variant-count": 1, // Default to 1
        gem: "Werewolfs",
        "rough-gem": "Werewolfs",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Squire",
        "thai-name": "คหบดีชนบท",
        description: "Know who the Werewolves are, win if the werewolves win.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Werewolfs",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Voodoo Lady",
        "thai-name": "หญิงสาวผู้ถือตุ๊กตาต้องสาป",
        description: "The Voodoo Lady curses a player; if that player nominates anyone for lynching, the cursed player dies.",
        "variant-count": 1, // Default to 1
        gem: "Townfolks",
        "rough-gem": "Werewolfs",
        abilities: undefined,
        conditions: undefined,
    },
    //Neutrals
    {
        name: "Tanner",
        "thai-name": "ผู้สิ้นหวัง",
        description: "Wins only if they are lynched by the villagers.",
        "variant-count": 1, // Default to 1
        gem: "Specials",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    { // Duplicate Tanner, keeping as per provided data
        name: "Tanner",
        "thai-name": "ผู้สิ้นหวัง",
        description: "Wins only if they are lynched by the villagers.",
        "variant-count": 1, // Default to 1
        gem: "Specials",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Doppelgänger",
        "thai-name": "ตัวแทน",
        description: "On the first night, chooses another player. If that player dies, the Doppelgänger takes on their role and abilities.",
        "variant-count": 1, // Default to 1
        gem: "Specials",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "The Fool",
        "thai-name": "คนบ้า",
        description: "Wins only if they can manipulating the other villagers to be lynched to death.",
        "variant-count": 1, // Default to 1
        gem: "Specials",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Bookie",
        "thai-name": "เจ้ามือแทงพนัน",
        description: "At night, guess who will be lynched on the next day, Wins by correctly betting on who will be lynched.",
        "variant-count": 1, // Default to 1
        gem: "Specials",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Sleuth",
        "thai-name": "นักสืบ",
        description: "Can reveal themselves to guess roles; if successful, they win alone.",
        "variant-count": 1, // Default to 1
        gem: "Specials",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Pacifist",
        "thai-name": "ผู้รักสันติ",
        description: "Can make another player's vote count as two, or prevent their own vote from counting.",
        "variant-count": 1, // Default to 1
        gem: "Specials",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Nostradamus",
        "thai-name": "นอสตราดามุส",
        description: "One time per game, wakes up and can look at a set number of cards; the last card they look at determines their winning team.",
        "variant-count": 1, // Default to 1
        gem: "Specials",
        "rough-gem": "Townfolks",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Reaper",
        "thai-name": "ยมทูต",
        description: "A standalone killer who wins if they are one of the last two players alive.",
        "variant-count": 1, // Default to 1
        gem: "Specials",
        "rough-gem": "Werewolfs",
        abilities: undefined,
        conditions: undefined,
    },
    {
        name: "Cult Leader",
        "thai-name": "ผู้นำลัทธิ",
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
    }
];
