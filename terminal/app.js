(function () {
    'use strict';

    /* ═══════════════════════════════════════
       DOM refs
    ═══════════════════════════════════════ */
    const output   = document.getElementById('output');
    const crtBody  = document.getElementById('crtBody');
    const form     = document.getElementById('promptForm');
    const input    = document.getElementById('cmdInput');
    const hudStamp = document.getElementById('hudStamp');

    /* ═══════════════════════════════════════
       HUD CLOCK
    ═══════════════════════════════════════ */
    function tickClock() {
        if (!hudStamp) return;
        const d = new Date();
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        hudStamp.textContent = hh + ':' + mm + ':' + ss;
    }
    tickClock();
    setInterval(tickClock, 1000);

    /* ═══════════════════════════════════════
       ASCII ART (from docs/terminal/ascii-art.md)
    ═══════════════════════════════════════ */
    const ART_BOOT_LOGO = String.raw`
   ██████╗ ██╗  ██╗███╗   ███╗██╗   ██╗██████╗ ██╗  ██╗ ██╗
   ██╔════╝██║  ██║████╗ ████║██║   ██║██╔══██╗██║  ██║███║
   ╚█████╗ ███████║██╔████╔██║██║   ██║██████╔╝███████║╚██║
    ╚═══██╗╚════██║██║╚██╔╝██║██║   ██║██╔══██╗╚════██║ ██║
   ██████╔╝     ██║██║ ╚═╝ ██║╚██████╔╝██║  ██║     ██║ ██║
   ╚═════╝      ╚═╝╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝     ╚═╝ ╚═╝
              D  A  E  M  O  N   ·   O  S    v 0 . 1`;

    const ART_NEON_ALLEY = String.raw`
    ░▒▓█  N E O N   A L L E Y  █▓▒░
    ┌──────────────────────────────────────────┐
    │  ▓▒░      ░▒▓  rain.dat streams      ▓▒░ │
    │  ██   ║   ░░   ║   ▒▒   ║   ██   ║   ▓▓  │
    │  ██   ║   ░░   ║   ▒▒   ║   ██   ║   ▓▓  │
    │  ──────────────────────────────────────  │
    │   [ datapad ]                            │
    └────────────────── n ─────────────────────┘`;

    const ART_SERVER_ROOM = String.raw`
    ░▒▓█  S E R V E R   R O O M  █▓▒░
    ┌──────────────────────────────────────────┐
    │  ▓▓▓ │░│ ▓▓▓ │░│ ▓▓▓ │░│ ▓▓▓ │░│ ▓▓▓ │░│  │
    │  ▓▓▓ │░│ ▓▓▓ │░│ ▓▓▓ │░│ ▓▓▓ │░│ ▓▓▓ │░│  │
    │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
    │   ╔════ ARASAKA / VAULT-03 ════╗   ● LED │
    │   ║  [locked]   [hack door]   ║          │
    │   ╚═══════════════════════════╝          │
    └────────────────── s ─────────────────────┘`;

    const ART_MAINFRAME = String.raw`
    ░▒▓█  M A I N F R A M E  █▓▒░
    ┌──────────────────────────────────────────┐
    │  ║░║  ║░║  ║░║  ║░║  ║░║  ║░║  ║░║  ║░║  │
    │  ║▓║  ║▓║  ║▓║  ║▓║  ║▓║  ║▓║  ║▓║  ║▓║  │
    │  ║▓║  ║▓║  ║▓║  ║▓║  ║▓║  ║▓║  ║▓║  ║▓║  │
    │           ╔═══════════════════╗           │
    │           ║  >  YOU MADE IT   ║           │
    │           ╚═══════════════════╝           │
    └────────────────── s ─────────────────────┘`;

    const ART_SIGNATURE = String.raw`
      ╔════════════════════════════════════════╗
      ║  // signed: S4MUR41DAEMON              ║
      ║  // aka: David Maicas Valero           ║
      ║  // Zaragoza · 2087 · ghost-in-wire    ║
      ║  // thanks for playing.                ║
      ╚════════════════════════════════════════╝`;

    /* ═══════════════════════════════════════
       STATE
    ═══════════════════════════════════════ */
    const state = {
        phase: 'boot',                    // 'boot' | 'identify' | 'stats' | 'playing'
        awaiting: null,                   // 'alias' while collecting character name
        identity: { alias: null, stats: null },
        room: 'neon_alley',
        inventory: [],
        flags: {},
        history: [],
        historyIdx: -1,
        bootDone: false,
        pool: []                          // remaining standard-array values during stats phase
    };

    const MAX_ALIAS_LEN = 16;
    const DEFAULT_ALIAS = 'S4MUR41DAEMON';

    /* ═══════════════════════════════════════
       CHARACTER STATS (D&D standard array)
    ═══════════════════════════════════════ */
    const STAT_ORDER = ['STR', 'DEX', 'INT', 'TECH', 'WIL', 'CHA'];
    const STATS_META = {
        STR:  { name: 'STRENGTH',  es: 'Fuerza',       desc: 'Brute force. Melee. Breaking cover.' },
        DEX:  { name: 'DEXTERITY', es: 'Destreza',     desc: 'Reflexes. Stealth. Trigger discipline.' },
        INT:  { name: 'INTELLECT', es: 'Inteligencia', desc: 'Reasoning. Memory. Deduction.' },
        TECH: { name: 'TECH',      es: 'Tech',         desc: 'Netrunning. Cyberware. Drone control.' },
        WIL:  { name: 'WILL',      es: 'Temple',       desc: 'Nerve. Composure. Black-ICE resistance.' },
        CHA:  { name: 'CHARISMA',  es: 'Carisma',      desc: 'Persuasion. Intimidation. Street cred.' }
    };
    const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
    const STAT_ALIASES = {
        // codes
        str: 'STR', dex: 'DEX', int: 'INT', tec: 'TECH', tech: 'TECH',
        wil: 'WIL', will: 'WIL', cha: 'CHA', chr: 'CHA',
        // english
        strength: 'STR', dexterity: 'DEX', intellect: 'INT', intelligence: 'INT',
        willpower: 'WIL', charisma: 'CHA',
        // spanish
        fuerza: 'STR', destreza: 'DEX', inteligencia: 'INT',
        temple: 'WIL', carisma: 'CHA'
    };

    function normalizeStat(raw) {
        if (!raw) return null;
        return STAT_ALIASES[raw.toLowerCase()] || null;
    }
    function emptyStats() {
        const s = {};
        STAT_ORDER.forEach(k => s[k] = null);
        return s;
    }

    /* ═══════════════════════════════════════
       ITEMS
    ═══════════════════════════════════════ */
    const ITEMS = {
        datapad: {
            name: 'Datapad',
            desc: 'Cracked screen, but the encryption key is still intact. Reads: "ARASAKA-V3-BYPASS".'
        }
    };

    /* ═══════════════════════════════════════
       ROOMS
    ═══════════════════════════════════════ */
    const ROOMS = {
        neon_alley: {
            name: 'Neon Alley',
            ascii: ART_NEON_ALLEY,
            asciiClass: '',
            desc: 'Rain. Purple signs blink across puddles. A discarded datapad lies by a fire escape. The alley ends in a rusted steel door to the north.',
            exits: { n: 'server_room' },
            items: ['datapad'],
            hackables: {},
            scanInfo: 'Wi-Fi nets: 3 hidden · surveillance: offline · trash density: high.'
        },
        server_room: {
            name: 'Abandoned Server Room',
            ascii: ART_SERVER_ROOM,
            asciiClass: '',
            desc: 'Racks hum in the dark. A red LED pulses on a locked door to the north. Dust coats every surface. The door reads: "ARASAKA / VAULT-03".',
            exits: { s: 'neon_alley' }, // norte se añade al hackear
            items: [],
            hackables: {
                door: {
                    requires: ['datapad'],
                    onSuccess() {
                        state.flags.door_open = true;
                        ROOMS.server_room.exits.n = 'mainframe';
                        println('[OK] Handshake accepted. Vault door slides open to the north.', 'line-ok');
                    },
                    onFail() {
                        println('[WARN] Encrypted handshake. You need valid credentials to bypass the ICE.', 'line-warn');
                    }
                }
            },
            scanInfo: 'Firewall: ARASAKA-ICE mk.III · door lock: V3 cipher · needs a datapad key.'
        },
        mainframe: {
            name: 'Corporate Mainframe',
            ascii: ART_MAINFRAME,
            asciiClass: 'cyan',
            desc: 'The vault opens into a cathedral of servers. At the center, a single terminal glows. Its screen spells: "YOU MADE IT".',
            exits: { s: 'server_room' },
            items: [],
            hackables: {},
            scanInfo: 'Core temperature: 18°C · uptime: 14 years · payload: a message, waiting.',
            onEnter() {
                if (state.flags.mainframe_seen) return;
                state.flags.mainframe_seen = true;
                setTimeout(() => {
                    printAscii(ART_SIGNATURE, 'green');
                    println('', '');
                    println('[SYSTEM] The mainframe recognizes you.', 'line-sys');
                    println('[SYSTEM] Your name is written in the logs. Forever.', 'line-sys');
                    println('', '');
                    println('> Type "exit" to return to the portfolio, or "look" to stay a while.', 'line-info');
                }, 250);
            }
        }
    };

    /* ═══════════════════════════════════════
       OUTPUT HELPERS
    ═══════════════════════════════════════ */
    function println(text, cls) {
        const div = document.createElement('div');
        div.className = 'line' + (cls ? ' ' + cls : '');
        div.textContent = text;
        output.appendChild(div);
        crtBody.scrollTop = crtBody.scrollHeight;
    }
    function printAscii(text, variant) {
        const pre = document.createElement('div');
        pre.className = 'ascii' + (variant ? ' ' + variant : '');
        pre.textContent = text;
        output.appendChild(pre);
        crtBody.scrollTop = crtBody.scrollHeight;
    }
    function echoCmd(raw) {
        const div = document.createElement('div');
        div.className = 'line line-echo';
        div.textContent = 'root@daemon:~$ ' + raw;
        output.appendChild(div);
    }
    function clearOutput() {
        output.innerHTML = '';
    }

    function sanitizeAlias(raw) {
        const trimmed = (raw || '').trim();
        if (!trimmed) return DEFAULT_ALIAS;
        // Only allow printable ASCII & limit length
        const clean = trimmed.replace(/[^\x20-\x7E]/g, '').slice(0, MAX_ALIAS_LEN);
        return clean || DEFAULT_ALIAS;
    }

    function updatePromptUser() {
        const userEl = document.querySelector('.prompt-label .user');
        if (!userEl || !state.identity.alias) return;
        userEl.textContent = state.identity.alias.toLowerCase().slice(0, 12);
    }

    function askForAlias() {
        println('', '');
        println('[SYSTEM] Neural handshake incomplete.', 'line-sys');
        println('[SYSTEM] Declare your identity before interfacing with the grid.', 'line-sys');
        println('', '');
        println('  > Enter your alias (press Enter for "' + DEFAULT_ALIAS + '"):', 'line-info');
        state.awaiting = 'alias';
    }

    function confirmIdentity() {
        println('', '');
        println('[OK] Handshake accepted. Welcome, ' + state.identity.alias + '.', 'line-ok');
        println('[SYSTEM] Uploading persona into the grid...', 'line-sys');
        updatePromptUser();
        setTimeout(() => {
            askForStats();
        }, 750);
    }

    /* ═══════════════════════════════════════
       STATS PHASE — wetware calibration
    ═══════════════════════════════════════ */
    function askForStats() {
        state.phase = 'stats';
        state.identity.stats = emptyStats();
        state.pool = STANDARD_ARRAY.slice();
        println('', '');
        println('[SYSTEM] Wetware calibration required.', 'line-sys');
        println('[SYSTEM] Distribute the standard array across 6 attributes.', 'line-sys');
        println('', '');
        println('  array: [ 15 · 14 · 13 · 12 · 10 · 8 ]', 'line-info');
        println('', '');
        renderStatsGuide();
        println('', '');
        println('> Usage: assign <stat> <value>   ·   e.g. "assign tech 15"', 'line-info');
        println('> Commands: sheet · pool · reset · confirm', 'line-muted');
    }

    function renderStatsGuide() {
        println('  STAT   NAME          DESC', 'line-muted');
        STAT_ORDER.forEach(code => {
            const m = STATS_META[code];
            const row = '  ' +
                code.padEnd(6, ' ') +
                (m.name + ' (' + m.es + ')').padEnd(22, ' ') +
                m.desc;
            println(row, 'line-muted');
        });
    }

    function renderSheet() {
        println('', '');
        println('  ┌── CHARACTER SHEET ──────────────────┐', 'line-info');
        STAT_ORDER.forEach(code => {
            const m = STATS_META[code];
            const val = state.identity.stats[code];
            const label = code.padEnd(4, ' ') + ' ' + (m.name + ' (' + m.es + ')').padEnd(22, ' ');
            if (val == null) {
                println('  │ ' + label + '  [ -- ]                │', 'line-muted');
            } else {
                println('  │ ' + label + '  [ ' + String(val).padStart(2, ' ') + ' ] <OK>           │', 'line-ok');
            }
        });
        println('  └─────────────────────────────────────┘', 'line-info');
        const remaining = state.pool.length;
        if (remaining > 0) {
            println('  pool: [ ' + state.pool.join(' · ') + ' ]   (' + remaining + ' left)', 'line-info');
        } else {
            println('  pool: [ empty ]   all values assigned — type "confirm" to lock in.', 'line-ok');
        }
    }

    function renderPool() {
        if (state.pool.length === 0) {
            println('[POOL] Empty. All values assigned. Type "confirm" to proceed.', 'line-ok');
            return;
        }
        println('[POOL] Remaining: [ ' + state.pool.join(' · ') + ' ]', 'line-info');
    }

    function assignStat(statCode, value) {
        const current = state.identity.stats[statCode];
        // If stat had a value, return it to pool
        if (current != null) {
            state.pool.push(current);
            state.pool.sort((a, b) => b - a);
        }
        // Remove new value from pool
        const idx = state.pool.indexOf(value);
        state.pool.splice(idx, 1);
        state.identity.stats[statCode] = value;
    }

    function allStatsAssigned() {
        return STAT_ORDER.every(code => state.identity.stats[code] != null);
    }

    function beginPlay() {
        state.phase = 'playing';
        println('', '');
        println('[OK] Persona locked in. Jacking into the grid...', 'line-ok');
        setTimeout(() => {
            println('', '');
            enterRoom('neon_alley');
        }, 700);
    }

    /* ═══════════════════════════════════════
       ROOM RENDERING
    ═══════════════════════════════════════ */
    function describeCurrentRoom() {
        const room = ROOMS[state.room];
        printAscii(room.ascii, room.asciiClass);
        println(room.desc, 'line-info');

        if (room.items && room.items.length > 0) {
            const names = room.items.map(id => ITEMS[id] ? ITEMS[id].name : id).join(', ');
            println('You see: ' + names + '.', 'line-muted');
        }
        const exits = Object.keys(room.exits);
        if (exits.length > 0) {
            println('Exits: ' + exits.join(', ') + '.', 'line-muted');
        } else {
            println('No visible exits.', 'line-muted');
        }
    }

    function enterRoom(id) {
        state.room = id;
        const room = ROOMS[id];
        println('', '');
        println('> You enter: ' + room.name, 'line-info');
        describeCurrentRoom();
        if (typeof room.onEnter === 'function') room.onEnter();
    }

    /* ═══════════════════════════════════════
       COMMANDS
    ═══════════════════════════════════════ */
    const COMMANDS = {
        help: {
            aliases: ['?'],
            help: 'help — list all commands',
            run(args) {
                println('', '');
                println('Available commands:', 'line-info');
                const entries = Object.keys(COMMANDS).sort();
                entries.forEach(name => {
                    const cmd = COMMANDS[name];
                    const aliases = cmd.aliases && cmd.aliases.length
                        ? '  [aliases: ' + cmd.aliases.join(', ') + ']' : '';
                    println('  ' + cmd.help + aliases, 'line-muted');
                });
                println('', '');
                println('Tip: "look" describes your surroundings. "scan" reveals extra info.', 'line-info');
            }
        },
        look: {
            aliases: ['l'],
            help: 'look [item] — describe the room or an item',
            run(args) {
                if (args.length === 0) {
                    describeCurrentRoom();
                    return;
                }
                const target = args[0].toLowerCase();
                const room = ROOMS[state.room];
                if (room.items.includes(target) && ITEMS[target]) {
                    println(ITEMS[target].desc, 'line-info');
                    return;
                }
                if (state.inventory.includes(target) && ITEMS[target]) {
                    println(ITEMS[target].desc, 'line-info');
                    return;
                }
                println('[ERR] Nothing like that here.', 'line-err');
            }
        },
        go: {
            aliases: ['move', 'walk'],
            help: 'go <n|s|e|w> — move in a direction',
            run(args) {
                if (args.length === 0) {
                    println('[ERR] Usage: go <n|s|e|w>', 'line-err');
                    return;
                }
                const dirMap = {
                    n: 'n', north: 'n',
                    s: 's', south: 's',
                    e: 'e', east:  'e',
                    w: 'w', west:  'w'
                };
                const dir = dirMap[args[0].toLowerCase()];
                if (!dir) {
                    println('[ERR] Unknown direction. Use n, s, e or w.', 'line-err');
                    return;
                }
                const room = ROOMS[state.room];
                const dest = room.exits[dir];
                if (!dest) {
                    println('[ERR] No exit that way.', 'line-err');
                    return;
                }
                enterRoom(dest);
            }
        },
        take: {
            aliases: ['get', 'pick'],
            help: 'take <item> — pick up an item',
            run(args) {
                if (args.length === 0) {
                    println('[ERR] Usage: take <item>', 'line-err');
                    return;
                }
                const target = args[0].toLowerCase();
                const room = ROOMS[state.room];
                const idx = room.items.indexOf(target);
                if (idx === -1) {
                    println('[ERR] Nothing like that here.', 'line-err');
                    return;
                }
                room.items.splice(idx, 1);
                state.inventory.push(target);
                const name = ITEMS[target] ? ITEMS[target].name : target;
                println('[OK] You take the ' + name + '.', 'line-ok');
            }
        },
        use: {
            aliases: [],
            help: 'use <item> [on <target>] — use an item from the inventory',
            run(args) {
                if (args.length === 0) {
                    println('[ERR] Usage: use <item> [on <target>]', 'line-err');
                    return;
                }
                const item = args[0].toLowerCase();
                if (!state.inventory.includes(item)) {
                    println("[ERR] You don't carry that.", 'line-err');
                    return;
                }
                // use <item> on <target>
                if (args.length >= 3 && args[1].toLowerCase() === 'on') {
                    const target = args[2].toLowerCase();
                    const room = ROOMS[state.room];
                    if (item === 'datapad' && target === 'door' && room.hackables.door) {
                        COMMANDS.hack.run([target]);
                        return;
                    }
                    println("[WARN] Nothing happens when you use " + item + " on " + target + ".", 'line-warn');
                    return;
                }
                println('[SYSTEM] You turn the ' + item + ' over in your hands. Nothing happens here.', 'line-sys');
            }
        },
        inventory: {
            aliases: ['inv', 'i'],
            help: 'inventory — list items you carry',
            run() {
                if (state.inventory.length === 0) {
                    println('[SYSTEM] Inventory empty.', 'line-sys');
                    return;
                }
                const lines = state.inventory.map(id => {
                    const it = ITEMS[id];
                    return '  - ' + (it ? it.name : id);
                });
                println('Inventory:', 'line-info');
                lines.forEach(l => println(l, 'line-muted'));
            }
        },
        scan: {
            aliases: [],
            help: 'scan — deep scan of the current room',
            run() {
                const room = ROOMS[state.room];
                println('[SCAN] ' + (room.scanInfo || 'No signal.'), 'line-info');
                const hackTargets = Object.keys(room.hackables);
                if (hackTargets.length > 0) {
                    println('[SCAN] Hackable: ' + hackTargets.join(', '), 'line-warn');
                }
            }
        },
        hack: {
            aliases: [],
            help: 'hack <target> — attempt to breach a system',
            run(args) {
                if (args.length === 0) {
                    println('[ERR] Usage: hack <target>', 'line-err');
                    return;
                }
                const target = args[0].toLowerCase();
                const room = ROOMS[state.room];
                const h = room.hackables[target];
                if (!h) {
                    println("[ERR] Nothing to hack called '" + target + "'.", 'line-err');
                    return;
                }
                println('[HACK] Attempting handshake with ' + target + '...', 'line-muted');
                const hasAll = h.requires.every(id => state.inventory.includes(id));
                setTimeout(() => {
                    if (hasAll) h.onSuccess();
                    else        h.onFail();
                }, 450);
            }
        },
        assign: {
            aliases: ['set'],
            help: 'assign <stat> <value> — place a pool value into a stat',
            run(args) {
                if (state.phase !== 'stats') {
                    println('[ERR] Stats are already locked.', 'line-err');
                    return;
                }
                if (args.length < 2) {
                    println('[ERR] Usage: assign <stat> <value>', 'line-err');
                    println('       stats: STR DEX INT TECH WIL CHA', 'line-muted');
                    return;
                }
                const statCode = normalizeStat(args[0]);
                if (!statCode) {
                    println("[ERR] Unknown stat '" + args[0] + "'. Valid: STR DEX INT TECH WIL CHA", 'line-err');
                    return;
                }
                const value = parseInt(args[1], 10);
                if (!Number.isFinite(value)) {
                    println('[ERR] Value must be a number from the pool.', 'line-err');
                    return;
                }
                const current = state.identity.stats[statCode];
                const poolHas = state.pool.indexOf(value) !== -1;
                // Allow no-op reassignment to same value
                if (current === value) {
                    println('[SYSTEM] ' + statCode + ' already set to ' + value + '.', 'line-sys');
                    return;
                }
                if (!poolHas) {
                    println('[ERR] Value ' + value + ' not in pool. Remaining: [ ' + state.pool.join(' · ') + ' ]', 'line-err');
                    return;
                }
                assignStat(statCode, value);
                println('[OK] ' + statCode + ' ← ' + value, 'line-ok');
                renderSheet();
                if (allStatsAssigned()) {
                    println('', '');
                    println('> All stats assigned. Type "confirm" to lock in, or "reset" to redistribute.', 'line-info');
                }
            }
        },
        reset: {
            aliases: [],
            help: 'reset — wipe stat sheet and refill the pool',
            run() {
                if (state.phase !== 'stats') {
                    println('[ERR] Stats are already locked.', 'line-err');
                    return;
                }
                state.identity.stats = emptyStats();
                state.pool = STANDARD_ARRAY.slice();
                println('[OK] Sheet wiped. Pool refilled: [ ' + state.pool.join(' · ') + ' ]', 'line-ok');
            }
        },
        confirm: {
            aliases: ['lock'],
            help: 'confirm — lock in stats and enter the grid',
            run() {
                if (state.phase !== 'stats') {
                    println('[ERR] Nothing to confirm.', 'line-err');
                    return;
                }
                if (!allStatsAssigned()) {
                    println('[ERR] Assign all 6 stats first. Type "sheet" to review.', 'line-err');
                    return;
                }
                beginPlay();
            }
        },
        sheet: {
            aliases: [],
            help: 'sheet — show character sheet and remaining pool',
            run() {
                if (!state.identity.stats) {
                    println('[ERR] No character created yet.', 'line-err');
                    return;
                }
                renderSheet();
            }
        },
        pool: {
            aliases: [],
            help: 'pool — show unassigned values from the standard array',
            run() {
                if (state.phase !== 'stats') {
                    println('[ERR] Stats are locked. Pool is empty.', 'line-err');
                    return;
                }
                renderPool();
            }
        },
        whoami: {
            aliases: [],
            help: 'whoami — declare or display current identity',
            run() {
                if (state.phase === 'identify') {
                    askForAlias();
                    return;
                }
                const alias = state.identity.alias || DEFAULT_ALIAS;
                println('id:      ' + alias,          'line-info');
                println('alias:   root',              'line-muted');
                println('origin:  Zaragoza.edge',     'line-muted');
                println('status:  ghost-in-the-wire', 'line-ok');
                if (state.identity.stats && allStatsAssigned()) {
                    println('', '');
                    println('stats:', 'line-info');
                    STAT_ORDER.forEach(code => {
                        const m = STATS_META[code];
                        const val = state.identity.stats[code];
                        println('  ' + code.padEnd(5, ' ') + (m.name + ' (' + m.es + ')').padEnd(22, ' ') + ' ' + val, 'line-muted');
                    });
                }
            }
        },
        clear: {
            aliases: ['cls'],
            help: 'clear — clear the screen',
            run() { clearOutput(); }
        },
        exit: {
            aliases: ['quit'],
            help: 'exit — return to the portfolio',
            run() {
                println('[SYSTEM] Dumping session... goodbye.', 'line-sys');
                input.disabled = true;
                setTimeout(() => { window.location.href = '../index.html'; }, 650);
            }
        }
    };

    /* ═══════════════════════════════════════
       PARSER
    ═══════════════════════════════════════ */
    function resolveCommand(name) {
        if (COMMANDS[name]) return COMMANDS[name];
        for (const key in COMMANDS) {
            if (COMMANDS[key].aliases && COMMANDS[key].aliases.includes(name)) {
                return COMMANDS[key];
            }
        }
        return null;
    }

    function runLine(raw) {
        const trimmed = raw.trim();
        if (!trimmed) return;
        echoCmd(trimmed);
        state.history.push(trimmed);
        state.historyIdx = state.history.length;

        const parts = trimmed.split(/\s+/);
        const name  = parts[0].toLowerCase();
        const args  = parts.slice(1);
        const cmd   = resolveCommand(name);
        if (!cmd) {
            println("[ERR] Unknown command '" + name + "'. Try 'help'.", 'line-err');
            return;
        }
        if (state.phase === 'identify') {
            const allowed = [COMMANDS.whoami, COMMANDS.help, COMMANDS.clear, COMMANDS.exit];
            if (!allowed.includes(cmd)) {
                println('[SYSTEM] Identify yourself first. Type "whoami".', 'line-sys');
                return;
            }
        }
        if (state.phase === 'stats') {
            const allowed = [
                COMMANDS.assign, COMMANDS.reset, COMMANDS.confirm,
                COMMANDS.sheet,  COMMANDS.pool,
                COMMANDS.help,   COMMANDS.clear, COMMANDS.exit
            ];
            if (!allowed.includes(cmd)) {
                println('[SYSTEM] Calibrate your stats first. Use "assign <stat> <value>" or "help".', 'line-sys');
                return;
            }
        }
        try { cmd.run(args); }
        catch (err) {
            println('[ERR] Internal error: ' + err.message, 'line-err');
        }
    }

    /* ═══════════════════════════════════════
       AUTOCOMPLETE (Tab)
    ═══════════════════════════════════════ */
    function autocomplete() {
        const value = input.value;
        if (value.includes(' ')) return;
        const prefix = value.toLowerCase();
        if (!prefix) return;
        const pool = new Set();
        Object.keys(COMMANDS).forEach(k => {
            pool.add(k);
            (COMMANDS[k].aliases || []).forEach(a => pool.add(a));
        });
        const matches = [...pool].filter(c => c.startsWith(prefix)).sort();
        if (matches.length === 0) return;
        if (matches.length === 1) {
            input.value = matches[0] + ' ';
            return;
        }
        println('  ' + matches.join('  '), 'line-muted');
    }

    /* ═══════════════════════════════════════
       INPUT EVENTS
    ═══════════════════════════════════════ */
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!state.bootDone) return;
        const raw = input.value;
        input.value = '';

        if (state.awaiting === 'alias') {
            const alias = sanitizeAlias(raw);
            echoCmd(raw.trim() ? raw.trim() : '(default)');
            state.identity.alias = alias;
            state.awaiting = null;
            confirmIdentity();
            return;
        }

        runLine(raw);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (state.history.length === 0) return;
            state.historyIdx = Math.max(0, state.historyIdx - 1);
            input.value = state.history[state.historyIdx] || '';
            setTimeout(() => input.setSelectionRange(input.value.length, input.value.length));
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (state.history.length === 0) return;
            state.historyIdx = Math.min(state.history.length, state.historyIdx + 1);
            input.value = state.history[state.historyIdx] || '';
        } else if (e.key === 'Tab') {
            e.preventDefault();
            autocomplete();
        } else if (e.key === 'l' && e.ctrlKey) {
            e.preventDefault();
            clearOutput();
        }
    });

    document.addEventListener('click', (e) => {
        if (!state.bootDone) return;
        if (e.target.closest('a')) return;
        input.focus();
    });

    /* ═══════════════════════════════════════
       BOOT SEQUENCE
    ═══════════════════════════════════════ */
    const bootLines = [
        { text: '[BIOS] POST check ............................ OK',     cls: 'line-ok',   delay: 250 },
        { text: '[BOOT] Loading kernel /dev/neural ............ OK',     cls: 'line-ok',   delay: 350 },
        { text: '[BOOT] Mounting /mnt/wetware ................. OK',     cls: 'line-ok',   delay: 280 },
        { text: '[INIT] Handshake with city grid .............. OK',     cls: 'line-ok',   delay: 320 },
        { text: '[INIT] Scanning for sentinels ................ clear',  cls: 'line-info', delay: 300 },
        { text: '',                                                       cls: '',         delay: 200 }
    ];

    function runBoot(idx) {
        if (idx >= bootLines.length) {
            printAscii(ART_BOOT_LOGO, '');
            setTimeout(() => {
                println('', '');
                println('S4MUR41DAEMON_OS v0.1 loaded.', 'line-info');
                println('Type "help" to see available commands.', 'line-muted');
                state.bootDone = true;
                state.phase = 'identify';
                askForAlias();
                input.disabled = false;
                input.focus();
            }, 400);
            return;
        }
        const line = bootLines[idx];
        if (line.text === '') {
            setTimeout(() => runBoot(idx + 1), line.delay);
            return;
        }
        println(line.text, line.cls);
        setTimeout(() => runBoot(idx + 1), line.delay);
    }

    runBoot(0);
})();
