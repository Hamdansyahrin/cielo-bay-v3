// Cielo Bay - config.js: world constants, palette, districts, street names.
// Every tunable of the game lives here so the other files stay logic-only.
(function () {
  'use strict';
  var CB = window.CB || (window.CB = {});
  var CFG = {
    WORLD_W: 3040,
    WORLD_H: 2280,
    VIEW_W: 1280,
    VIEW_H: 720,
    // Road centre-lines. Vertical roads run the height of the city,
    // horizontal roads stop at the beach strip.
    ROADS_X: [320, 920, 1520, 2120, 2720],
    ROADS_Y: [320, 920, 1520],
    ROAD_W: 124,
    BEACH_ROAD_Y: 1980,
    WATER_Y: 2140,
    PIER: { x: 2830, y: 860, w: 210, h: 300 },
    CHOP_SHOP: { x: 2450, y: 1060 },
    PLAYER_START: { x: 920, y: 1250 },
    MARKED_CAR_POS: { x: 986, y: 640 },
    VAN_POS: { x: 2320, y: 1596 },
    // Wanted / police tuning.
    SEEN_RADIUS: 240,
    DECAY_SECONDS: 5,
    GIVE_UP_SECONDS: 8,
    POLICE_SPAWN_MIN: 650,
    POLICE_SPAWN_MAX: 1000,
    // Combat tuning.
    BULLET_SPEED: 950,
    BULLET_DAMAGE: 12,
    RIVAL_HP: 30,
    PISTOL_COOLDOWN: 0.28,
    PLAYER_HP: 100,
    SAVE_KEY: 'cielo-bay-save-v1',
  };
  CFG.STREETS_X = ['Palmera Avenue', 'Cielo Boulevard', 'Marina Drive', 'Foundry Street', 'Dockside Way'];
  CFG.STREETS_Y = ['Sunset Row', 'Coral Avenue', 'Harbor Line'];
  CFG.DISTRICTS = [
    { name: 'DOWNTOWN', x: 0, y: 0, w: 1820, h: 1820 },
    { name: 'BEACHFRONT', x: 0, y: 1820, w: 3040, h: 460 },
    { name: 'PORT OF CIELO', x: 1820, y: 0, w: 1220, h: 1820 },
  ];
  CFG.PALETTE = {
    sky: '#2b1a2e',
    groundDowntown: '#4a4048',
    groundBeach: '#6b5a49',
    groundPort: '#454144',
    sidewalk: '#8d8578',
    road: '#333036',
    roadEdge: '#c9a86a',
    lane: '#e8d9a0',
    sand: '#e6c98a',
    water: '#1d5f74',
    waterLight: '#2e86a0',
    grass: '#4d7a4a',
    buildingRoof: ['#7a5a68', '#8a6a58', '#6a6a7a', '#96705a', '#5f6e7e', '#a07a5c'],
    buildingWall: '#3a3238',
    windowLit: '#ffd98a',
    windowDark: '#2c3440',
    palmTrunk: '#6a4a30',
    palmLeaf: '#3f8a4f',
    player: '#ffd23e',
    playerSkin: '#c98a5e',
    ped: ['#c95e5e', '#5e8ac9', '#5ec97a', '#c9b45e', '#9a5ec9', '#5ec9c0'],
    car: ['#c9403d', '#3d7ac9', '#e0a32e', '#3fae6a', '#d8d8d8', '#703d8a', '#e06a2e', '#2e9aa8'],
    police: '#e8ecf2',
    policeTrim: '#20304a',
    rival: '#8a2030',
    van: '#5a6068',
    marked: '#ffb400',
  };
  CFG.CHECKPOINTS = [
    { x: 1520, y: 320, name: 'Sunset Row & Marina Drive' },
    { x: 2720, y: 920, name: 'Coral Avenue & Dockside Way' },
    { x: 1520, y: 1520, name: 'Harbor Line & Marina Drive' },
    { x: 320, y: 920, name: 'Coral Avenue & Palmera Avenue' },
  ];
  CB.CFG = CFG;
})();
