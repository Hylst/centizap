import { useCallback, useEffect, useRef, useState } from "react";

const CELL = 24;
const COLS = 24;
const ROWS = 34;
const WIDTH = COLS * CELL;
const HEIGHT = ROWS * CELL;
const PLAYER_ZONE_START_ROW = ROWS - 8;
const PLAYER_ZONE_TOP = PLAYER_ZONE_START_ROW * CELL;
const MAX_BULLETS = 5;
const MAX_PARTICLES = 600;

type Direction = -1 | 1;

type InputState = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
};

type HudState = {
  score: number;
  lives: number;
  wave: number;
  level: number;
  levelName: string;
  status: string;
  paused: boolean;
  gameOver: boolean;
  segments: number;
  spiders: number;
  combo: number;
  fullscreen: boolean;
  muted: boolean;
  bestScore: number;
};

type CellPosition = {
  col: number;
  row: number;
};

type Star = {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
  depth: number;
  hue: number;
};

type Mushroom = {
  id: number;
  col: number;
  row: number;
  hp: number;
  pulse: number;
};

type Bullet = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  power: number;
  trail: { x: number; y: number; life: number }[];
};

type Centipede = {
  id: number;
  dirX: Direction;
  dirY: Direction;
  moveTimer: number;
  stepInterval: number;
  hue: number;
  segments: CellPosition[];
  bounceTimer: number;
};

type Spider = {
  id: number;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  wiggle: number;
  threat: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  shrink: number;
};

type FloatingText = {
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  color: string;
  size: number;
};

type PowerUpType = "spread" | "rapid" | "shield";

type PowerUp = {
  id: number;
  type: PowerUpType;
  x: number;
  y: number;
  vy: number;
  life: number;
  rotation: number;
};

type Player = {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  cooldown: number;
  invulnerable: number;
  shieldTime: number;
  rapidFireTime: number;
  spreadTime: number;
  engineGlow: number;
};

type LevelTheme = {
  name: string;
  bgTop: string;
  bgMid: string;
  bgBottom: string;
  accent: string;
  enemyHue: number;
  starHue: number;
  starSpeed: number;
  musicRoot: number;
  musicPattern: number[];
  ambientFilter: string;
  particles: "embers" | "bubbles" | "sand" | "snow" | "sparks" | "none";
};

type Game = {
  nextId: number;
  lastTimestamp: number;
  lastHudSync: number;
  elapsed: number;
  score: number;
  lives: number;
  wave: number;
  levelIndex: number;
  paused: boolean;
  gameOver: boolean;
  status: string;
  waveBanner: number;
  waveDelay: number;
  spiderSpawnTimer: number;
  combo: number;
  comboTimer: number;
  shake: number;
  shakeIntensity: number;
  flash: number;
  flashColor: string;
  player: Player;
  bullets: Bullet[];
  mushrooms: Record<string, Mushroom>;
  centipedes: Centipede[];
  spiders: Spider[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  powerUps: PowerUp[];
  stars: Star[];
  bestScore: number;
};

type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const LEVEL_THEMES: LevelTheme[] = [
  {
    name: "Néon",
    bgTop: "#020617",
    bgMid: "#042f4f",
    bgBottom: "#0f172a",
    accent: "#22d3ee",
    enemyHue: 175,
    starHue: 195,
    starSpeed: 1,
    musicRoot: 220,
    musicPattern: [0, 3, 5, 7, 10, 7, 5, 3],
    ambientFilter: "none",
    particles: "sparks",
  },
  {
    name: "Forêt Toxique",
    bgTop: "#022c22",
    bgMid: "#064e3b",
    bgBottom: "#052e2b",
    accent: "#4ade80",
    enemyHue: 130,
    starHue: 140,
    starSpeed: 1.3,
    musicRoot: 196,
    musicPattern: [0, 1, 4, 6, 8, 6, 4, 1],
    ambientFilter: "hue-rotate(60deg)",
    particles: "bubbles",
  },
  {
    name: "Désert Aride",
    bgTop: "#2a1408",
    bgMid: "#7c2d12",
    bgBottom: "#451a03",
    accent: "#fbbf24",
    enemyHue: 35,
    starHue: 30,
    starSpeed: 1.6,
    musicRoot: 246,
    musicPattern: [0, 2, 3, 5, 7, 5, 3, 2],
    ambientFilter: "hue-rotate(-25deg)",
    particles: "sand",
  },
  {
    name: "Abysses Glacés",
    bgTop: "#082f49",
    bgMid: "#0c4a6e",
    bgBottom: "#075985",
    accent: "#7dd3fc",
    enemyHue: 220,
    starHue: 215,
    starSpeed: 0.8,
    musicRoot: 174,
    musicPattern: [0, 4, 7, 11, 9, 7, 4, 0],
    ambientFilter: "hue-rotate(180deg) brightness(0.9)",
    particles: "snow",
  },
  {
    name: "Cœur Stellaire",
    bgTop: "#1a0428",
    bgMid: "#581c87",
    bgBottom: "#3b0764",
    accent: "#f0abfc",
    enemyHue: 295,
    starHue: 310,
    starSpeed: 2.1,
    musicRoot: 261,
    musicPattern: [0, 1, 3, 6, 7, 10, 6, 3],
    ambientFilter: "hue-rotate(280deg) saturate(1.2)",
    particles: "embers",
  },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const invertDirection = (dir: Direction): Direction => (dir === 1 ? -1 : 1);
const cellKey = (col: number, row: number) => `${col}:${row}`;

const pointInRect = (x: number, y: number, rect: Rect) =>
  x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;

const rectsOverlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const circleRectOverlap = (cx: number, cy: number, radius: number, rect: Rect) => {
  const nearestX = clamp(cx, rect.x, rect.x + rect.w);
  const nearestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= radius * radius;
};

const cellRect = (col: number, row: number, pad = 0): Rect => ({
  x: col * CELL + pad,
  y: row * CELL + pad,
  w: CELL - pad * 2,
  h: CELL - pad * 2,
});

const playerRect = (player: Player): Rect => ({
  x: player.x - player.width / 2,
  y: player.y - player.height / 2,
  w: player.width,
  h: player.height,
});

// ----- Audio system (procedural Web Audio API) -----
type SfxName = "shoot" | "hit" | "mushroom" | "explosion" | "spider" | "levelUp" | "gameOver" | "powerup" | "waveClear";

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicPattern: number[] = [];
  private musicRoot = 220;
  private musicBpm = 120;
  private muted = false;

  init() {
    if (this.ctx) return;
    const Context = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    this.ctx = new Context();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.18;
    this.musicGain.connect(this.masterGain);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.32;
    this.sfxGain.connect(this.masterGain);
  }

  resume() {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      const target = muted ? 0 : 0.7;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.15);
    }
  }

  startMusic(theme: LevelTheme) {
    this.init();
    if (!this.ctx || !this.musicGain || this.muted) return;
    this.stopMusic();
    this.musicPattern = theme.musicPattern.slice();
    this.musicRoot = theme.musicRoot;
    this.musicBpm = 110 + theme.musicPattern.length * 5;
    this.musicStep = 0;
    const stepMs = 60_000 / this.musicBpm / 2;
    const tick = () => {
      this.playMusicStep();
      this.musicTimer = window.setTimeout(tick, stepMs);
    };
    tick();
  }

  private playMusicStep() {
    if (!this.ctx || !this.musicGain) return;
    const note = this.musicPattern[this.musicStep % this.musicPattern.length];
    const frequency = this.musicRoot * Math.pow(2, note / 12);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.6, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.32);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);

    if (this.musicStep % 4 === 0) {
      const bass = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bass.type = "sine";
      bass.frequency.value = this.musicRoot / 2;
      bassGain.gain.setValueAtTime(0, this.ctx.currentTime);
      bassGain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.01);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6);
      bass.connect(bassGain);
      bassGain.connect(this.musicGain);
      bass.start();
      bass.stop(this.ctx.currentTime + 0.7);
    }

    this.musicStep += 1;
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  playSfx(name: SfxName) {
    this.init();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(this.sfxGain);

    switch (name) {
      case "shoot": {
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.setValueAtTime(620, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.14);
        break;
      }
      case "hit": {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);
        gain.gain.setValueAtTime(0.32, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.11);
        break;
      }
      case "mushroom": {
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 600;
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(filter);
        filter.connect(gain);
        osc.start(now);
        osc.stop(now + 0.22);
        break;
      }
      case "explosion": {
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) {
          const env = Math.pow(1 - i / data.length, 2.2);
          data[i] = (Math.random() * 2 - 1) * env;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 800;
        gain.gain.setValueAtTime(0.55, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        source.connect(filter);
        filter.connect(gain);
        source.start(now);
        break;
      }
      case "spider": {
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.34);
        break;
      }
      case "levelUp": {
        const notes = [440, 554, 659, 880];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = freq;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now + i * 0.08);
          g.gain.linearRampToValueAtTime(0.4, now + i * 0.08 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
          osc.connect(g);
          g.connect(this.sfxGain!);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.3);
        });
        return;
      }
      case "waveClear": {
        [523, 659, 784].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = "triangle";
          osc.frequency.value = freq;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now + i * 0.12);
          g.gain.linearRampToValueAtTime(0.32, now + i * 0.12 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
          osc.connect(g);
          g.connect(this.sfxGain!);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.45);
        });
        return;
      }
      case "gameOver": {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.9);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 1.05);
        break;
      }
      case "powerup": {
        [392, 523, 659, 784, 988].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = "square";
          osc.frequency.value = freq;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now + i * 0.05);
          g.gain.linearRampToValueAtTime(0.32, now + i * 0.05 + 0.01);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.25);
          osc.connect(g);
          g.connect(this.sfxGain!);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.3);
        });
        return;
      }
    }
  }
}

const audioEngine = new AudioEngine();

// ----- Game creation helpers -----
const createInputState = (): InputState => ({
  left: false,
  right: false,
  up: false,
  down: false,
  fire: false,
});

const createStars = (): Star[] =>
  Array.from({ length: 110 }, () => ({
    x: rand(0, WIDTH),
    y: rand(0, HEIGHT),
    size: rand(0.6, 2.8),
    speed: rand(0.6, 3),
    phase: rand(0, Math.PI * 2),
    depth: rand(0.4, 1),
    hue: 195,
  }));

const createPlayer = (): Player => ({
  x: WIDTH / 2,
  y: HEIGHT - CELL * 1.4,
  width: CELL * 0.95,
  height: CELL * 1.05,
  speed: 296,
  cooldown: 0,
  invulnerable: 1.4,
  shieldTime: 0,
  rapidFireTime: 0,
  spreadTime: 0,
  engineGlow: 0,
});

const sumSegments = (groups: Centipede[]) =>
  groups.reduce((total, group) => total + group.segments.length, 0);

const addMushroom = (game: Game, col: number, row: number, hp = 4) => {
  if (col < 0 || col >= COLS || row < 1 || row >= ROWS - 1) return;
  const key = cellKey(col, row);
  const current = game.mushrooms[key];
  if (current) {
    current.hp = clamp(Math.max(current.hp, hp), 1, 4);
    return;
  }
  game.mushrooms[key] = {
    id: game.nextId++,
    col,
    row,
    hp: clamp(hp, 1, 4),
    pulse: rand(0, Math.PI * 2),
  };
};

const createCentipede = (
  game: Game,
  length: number,
  dirX: Direction,
  startRow: number,
  stepInterval: number,
): Centipede => {
  const safeLength = clamp(length, 4, 18);
  const segments: CellPosition[] = [];
  const themeHue = LEVEL_THEMES[game.levelIndex % LEVEL_THEMES.length].enemyHue;

  if (dirX === 1) {
    for (let index = 0; index < safeLength; index += 1) {
      segments.push({ col: safeLength - 1 - index, row: startRow });
    }
  } else {
    const startCol = COLS - safeLength;
    for (let index = 0; index < safeLength; index += 1) {
      segments.push({ col: startCol + index, row: startRow });
    }
  }

  return {
    id: game.nextId++,
    dirX,
    dirY: 1,
    moveTimer: 0,
    stepInterval,
    hue: (themeHue + randInt(-12, 12) + 360) % 360,
    segments,
    bounceTimer: 0,
  };
};

const spawnExplosion = (
  game: Game,
  x: number,
  y: number,
  count: number,
  color: string,
  speed = 220,
  gravity = 220,
) => {
  for (let i = 0; i < count; i += 1) {
    if (game.particles.length >= MAX_PARTICLES) break;
    const angle = rand(0, Math.PI * 2);
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * rand(speed * 0.4, speed),
      vy: Math.sin(angle) * rand(speed * 0.4, speed),
      life: rand(0.45, 0.95),
      maxLife: 0.95,
      size: rand(2, 4.2),
      color,
      gravity,
      shrink: 1,
    });
  }
};

const spawnFloatingText = (game: Game, x: number, y: number, text: string, color = "#fde68a") => {
  game.floatingTexts.push({
    x,
    y,
    vy: -50,
    life: 1.2,
    text,
    color,
    size: 16,
  });
};

const createMushroomField = (game: Game) => {
  const field: Record<string, Mushroom> = {};
  game.mushrooms = field;
  const levelFactor = game.levelIndex + 1;
  const count = Math.min(82, 30 + game.wave * 6 + levelFactor * 4);
  const maxRow = PLAYER_ZONE_START_ROW + 1;
  let attempts = 0;
  let placed = 0;

  while (placed < count && attempts < count * 28) {
    attempts += 1;
    const col = randInt(0, COLS - 1);
    const row = randInt(2, maxRow);
    if (row >= PLAYER_ZONE_START_ROW && Math.abs(col - Math.floor(COLS / 2)) <= 2) continue;
    const key = cellKey(col, row);
    if (field[key]) continue;
    field[key] = {
      id: game.nextId++,
      col,
      row,
      hp: randInt(2, 4),
      pulse: rand(0, Math.PI * 2),
    };
    placed += 1;
  }
};

const respawnPlayer = (game: Game, invulnerability = 1.8) => {
  game.player.x = WIDTH / 2;
  game.player.y = HEIGHT - CELL * 1.4;
  game.player.cooldown = 0;
  game.player.invulnerable = invulnerability;
  game.player.engineGlow = 0;
};

const spawnSpider = (game: Game) => {
  const fromLeft = Math.random() > 0.5;
  const lowerTop = PLAYER_ZONE_TOP - CELL * 1.8;
  game.spiders.push({
    id: game.nextId++,
    x: fromLeft ? -28 : WIDTH + 28,
    y: rand(lowerTop, HEIGHT - 36),
    radius: 13,
    vx: (fromLeft ? 1 : -1) * rand(140 + game.wave * 14 + game.levelIndex * 18, 200 + game.wave * 18 + game.levelIndex * 22),
    vy: rand(-52, 52),
    wiggle: rand(0, Math.PI * 2),
    threat: 1 + game.levelIndex * 0.25,
  });
};

const spawnPowerUp = (game: Game, x: number, y: number) => {
  const types: PowerUpType[] = ["spread", "rapid", "shield"];
  const type = types[randInt(0, types.length - 1)];
  game.powerUps.push({
    id: game.nextId++,
    type,
    x,
    y,
    vy: 38,
    life: 9,
    rotation: 0,
  });
};

const getCentipedeInterval = (game: Game, centipede: Centipede) => {
  const shortGroupBoost = Math.max(0, 8 - centipede.segments.length) * 0.006;
  const waveBoost = game.wave * 0.0008;
  const levelBoost = game.levelIndex * 0.012;
  return Math.max(0.038, centipede.stepInterval - shortGroupBoost - waveBoost - levelBoost);
};

const canPlacePlayer = (game: Game, x: number, y: number) => {
  const w = game.player.width;
  const h = game.player.height;
  const rect: Rect = {
    x: x - w / 2,
    y: y - h / 2,
    w,
    h,
  };

  if (rect.x < 0 || rect.x + rect.w > WIDTH || rect.y < PLAYER_ZONE_TOP || rect.y + rect.h > HEIGHT) {
    return false;
  }

  const startCol = clamp(Math.floor(rect.x / CELL), 0, COLS - 1);
  const endCol = clamp(Math.floor((rect.x + rect.w) / CELL), 0, COLS - 1);
  const startRow = clamp(Math.floor(rect.y / CELL), 0, ROWS - 1);
  const endRow = clamp(Math.floor((rect.y + rect.h) / CELL), 0, ROWS - 1);

  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const mushroom = game.mushrooms[cellKey(col, row)];
      if (!mushroom) continue;
      if (rectsOverlap(rect, cellRect(col, row, 3))) return false;
    }
  }
  return true;
};

const hitMushroom = (game: Game, bullet: Bullet) => {
  const col = Math.floor(bullet.x / CELL);
  const row = Math.floor(bullet.y / CELL);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  const key = cellKey(col, row);
  const mushroom = game.mushrooms[key];
  if (!mushroom || !pointInRect(bullet.x, bullet.y, cellRect(col, row, 3))) return false;

  mushroom.hp -= 1;
  spawnExplosion(game, bullet.x, bullet.y, 6, "#fde68a", 180, 80);
  if (mushroom.hp <= 0) {
    delete game.mushrooms[key];
    spawnExplosion(game, bullet.x, bullet.y, 22, "#4ade80", 260, 120);
    spawnFloatingText(game, bullet.x, bullet.y, "+1", "#4ade80");
    game.score += 1;
    if (Math.random() < 0.07) spawnPowerUp(game, bullet.x, bullet.y);
  }
  audioEngine.playSfx("mushroom");
  return true;
};

const splitCentipedeAt = (game: Game, groupIndex: number, segmentIndex: number) => {
  const centipede = game.centipedes[groupIndex];
  const hitSegment = centipede.segments[segmentIndex];
  const before = centipede.segments.slice(0, segmentIndex);
  const after = centipede.segments.slice(segmentIndex + 1);
  addMushroom(game, hitSegment.col, hitSegment.row, 4);

  const replacements: Centipede[] = [];
  const cx = hitSegment.col * CELL + CELL / 2;
  const cy = hitSegment.row * CELL + CELL / 2;
  spawnExplosion(game, cx, cy, 14, "#a7f3d0", 240, 90);
  spawnFloatingText(game, cx, cy, `+${game.combo * 6}`, "#a7f3d0");

  if (before.length > 0) {
    replacements.push({
      ...centipede,
      id: game.nextId++,
      moveTimer: 0,
      segments: before.map((segment) => ({ ...segment })),
      hue: centipede.hue,
    });
  }
  if (after.length > 0) {
    replacements.push({
      ...centipede,
      id: game.nextId++,
      moveTimer: 0,
      segments: after.map((segment) => ({ ...segment })),
      hue: (centipede.hue + 22) % 360,
    });
  }
  game.centipedes.splice(groupIndex, 1, ...replacements);
  game.combo += 1;
  game.comboTimer = 2.4;
  game.score += 6 * game.combo;
  audioEngine.playSfx("hit");
};

const hitCentipede = (game: Game, bullet: Bullet) => {
  const col = Math.floor(bullet.x / CELL);
  const row = Math.floor(bullet.y / CELL);
  for (let groupIndex = 0; groupIndex < game.centipedes.length; groupIndex += 1) {
    const centipede = game.centipedes[groupIndex];
    for (let segmentIndex = 0; segmentIndex < centipede.segments.length; segmentIndex += 1) {
      const segment = centipede.segments[segmentIndex];
      if (segment.col !== col || segment.row !== row) continue;
      if (!pointInRect(bullet.x, bullet.y, cellRect(segment.col, segment.row, 2))) continue;
      splitCentipedeAt(game, groupIndex, segmentIndex);
      return true;
    }
  }
  return false;
};

const hitSpider = (game: Game, bullet: Bullet) => {
  for (let i = game.spiders.length - 1; i >= 0; i -= 1) {
    const spider = game.spiders[i];
    const dx = bullet.x - spider.x;
    const dy = bullet.y - spider.y;
    if (dx * dx + dy * dy > (spider.radius + 5) ** 2) continue;
    spawnExplosion(game, spider.x, spider.y, 24, "#fb7185", 320, 220);
    game.shake = 0.4;
    game.shakeIntensity = 6;
    spawnFloatingText(game, spider.x, spider.y, `+${35 + game.levelIndex * 5}`, "#fb7185");
    game.spiders.splice(i, 1);
    game.combo += 1;
    game.comboTimer = 2.4;
    game.score += 35 + game.levelIndex * 5;
    if (Math.random() < 0.16) spawnPowerUp(game, spider.x, spider.y);
    audioEngine.playSfx("spider");
    return true;
  }
  return false;
};

const loseLife = (game: Game) => {
  if (game.player.invulnerable > 0 || game.gameOver) return;

  if (game.player.shieldTime > 0) {
    game.player.shieldTime = 0;
    game.player.invulnerable = 1.6;
    spawnExplosion(game, game.player.x, game.player.y, 24, "#7dd3fc", 280, 40);
    game.shake = 0.35;
    game.shakeIntensity = 5;
    game.status = "Bouclier détruit, attention !";
    audioEngine.playSfx("explosion");
    return;
  }

  game.lives -= 1;
  game.bullets = [];
  game.spiders = [];
  game.combo = 0;
  spawnExplosion(game, game.player.x, game.player.y, 60, "#fde68a", 360, 220);
  game.flash = 0.6;
  game.flashColor = "#f8fafc";
  game.shake = 0.6;
  game.shakeIntensity = 14;

  if (game.lives <= 0) {
    game.gameOver = true;
    game.status = "Partie terminée, appuie sur R ou Nouvelle partie";
    game.player.invulnerable = 0;
    audioEngine.playSfx("gameOver");
    audioEngine.stopMusic();
    return;
  }
  game.status = "Vaisseau détruit, prépare-toi à redécoller";
  respawnPlayer(game, 2.2);
  audioEngine.playSfx("explosion");
};

const shouldAdvanceLevel = (game: Game) => game.wave > 0 && game.wave % 3 === 0 && sumSegments(game.centipedes) === 0;

const advanceLevel = (game: Game) => {
  game.levelIndex += 1;
  audioEngine.playSfx("levelUp");
  audioEngine.startMusic(LEVEL_THEMES[game.levelIndex % LEVEL_THEMES.length]);
  game.flash = 0.9;
  game.flashColor = LEVEL_THEMES[game.levelIndex % LEVEL_THEMES.length].accent;
  spawnFloatingText(game, WIDTH / 2, HEIGHT * 0.35, LEVEL_THEMES[game.levelIndex % LEVEL_THEMES.length].name, LEVEL_THEMES[game.levelIndex % LEVEL_THEMES.length].accent);
  spawnFloatingText(game, WIDTH / 2, HEIGHT * 0.42, "NOUVEAU NIVEAU", "#f8fafc");
  game.stars = createStars();
};

const spawnWave = (game: Game) => {
  createMushroomField(game);
  game.bullets = [];
  game.spiders = [];
  game.centipedes = [];
  game.waveBanner = 2.5;
  game.waveDelay = 0;
  game.spiderSpawnTimer = Math.max(3.2 - game.wave * 0.18 - game.levelIndex * 0.2, 1);

  const groupCount = 1 + Math.floor((game.wave - 1) / 2) + Math.floor(game.levelIndex / 2);
  const baseInterval = Math.max(0.07, 0.22 - game.wave * 0.012 - game.levelIndex * 0.015);

  for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
    const length = Math.min(8 + game.wave * 1.4 + groupIndex * 2 + game.levelIndex * 2, 18);
    const dirX: Direction = groupIndex % 2 === 0 ? 1 : -1;
    const startRow = Math.min(groupIndex * 2, 5);
    game.centipedes.push(
      createCentipede(game, length, dirX, startRow, Math.max(0.05, baseInterval - groupIndex * 0.012)),
    );
  }

  game.status =
    groupCount > 1
      ? `Vague ${game.wave} : essaim divisé en approche`
      : `Vague ${game.wave} : nettoyez le mille-pattes`;
  respawnPlayer(game, Math.max(game.player.invulnerable, 0.8));
};

const createGame = (bestScore: number): Game => {
  const game: Game = {
    nextId: 1,
    lastTimestamp: 0,
    lastHudSync: 0,
    elapsed: 0,
    score: 0,
    lives: 3,
    wave: 1,
    levelIndex: 0,
    paused: false,
    gameOver: false,
    status: "Vague 1 : nettoyez le mille-pattes",
    waveBanner: 0,
    waveDelay: 0,
    spiderSpawnTimer: 3,
    combo: 0,
    comboTimer: 0,
    shake: 0,
    shakeIntensity: 0,
    flash: 0,
    flashColor: "#ffffff",
    player: createPlayer(),
    bullets: [],
    mushrooms: {},
    centipedes: [],
    spiders: [],
    particles: [],
    floatingTexts: [],
    powerUps: [],
    stars: createStars(),
    bestScore,
  };
  spawnWave(game);
  audioEngine.startMusic(LEVEL_THEMES[0]);
  return game;
};

const stepCentipede = (game: Game, centipede: Centipede) => {
  if (centipede.segments.length === 0) return;
  const head = centipede.segments[0];
  const candidateCol = head.col + centipede.dirX;
  const horizontalBlocked =
    candidateCol < 0 ||
    candidateCol >= COLS ||
    Boolean(game.mushrooms[cellKey(candidateCol, head.row)]);

  const previous = centipede.segments.map((segment) => ({ ...segment }));
  let nextHead: CellPosition;

  if (horizontalBlocked) {
    let nextRow = head.row + centipede.dirY;
    if (nextRow >= ROWS - 4) {
      nextRow = ROWS - 4;
      centipede.dirY = -1;
    } else if (nextRow <= 1) {
      nextRow = 1;
      centipede.dirY = 1;
    }
    centipede.dirX = invertDirection(centipede.dirX);
    nextHead = { col: clamp(head.col, 0, COLS - 1), row: nextRow };
    centipede.bounceTimer = 0.18;
  } else {
    nextHead = { col: candidateCol, row: head.row };
  }
  centipede.segments[0] = nextHead;
  for (let index = 1; index < centipede.segments.length; index += 1) {
    centipede.segments[index] = previous[index - 1];
  }
};

const updateGame = (game: Game, input: InputState, dt: number) => {
  game.elapsed += dt;
  game.waveBanner = Math.max(0, game.waveBanner - dt);
  game.shake = Math.max(0, game.shake - dt);
  game.flash = Math.max(0, game.flash - dt);
  game.comboTimer = Math.max(0, game.comboTimer - dt);
  if (game.comboTimer === 0) game.combo = 0;

  if (game.paused || game.gameOver) return;

  const player = game.player;
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.shieldTime = Math.max(0, player.shieldTime - dt);
  player.rapidFireTime = Math.max(0, player.rapidFireTime - dt);
  player.spreadTime = Math.max(0, player.spreadTime - dt);
  player.engineGlow = Math.min(1, player.engineGlow + dt * 4);

  let moveX = 0;
  let moveY = 0;
  if (input.left) moveX -= 1;
  if (input.right) moveX += 1;
  if (input.up) moveY -= 1;
  if (input.down) moveY += 1;

  if (moveX !== 0 || moveY !== 0) {
    const mag = Math.hypot(moveX, moveY) || 1;
    const speedX = (moveX / mag) * player.speed * dt;
    const speedY = (moveY / mag) * player.speed * dt;
    const tryX = player.x + speedX;
    if (canPlacePlayer(game, tryX, player.y)) player.x = tryX;
    const tryY = player.y + speedY;
    if (canPlacePlayer(game, player.x, tryY)) player.y = tryY;
    if (Math.random() < 0.6) {
      game.particles.push({
        x: player.x - (moveX / mag) * 6,
        y: player.y + player.height * 0.35,
        vx: rand(-12, 12) - (moveX / mag) * 30,
        vy: rand(20, 60),
        life: 0.35,
        maxLife: 0.35,
        size: rand(1.6, 2.6),
        color: "#22d3ee",
        gravity: 0,
        shrink: 1,
      });
    }
  }

  const baseCooldown = player.rapidFireTime > 0 ? 0.07 : 0.18;
  const canFire =
    input.fire && player.cooldown <= 0 && game.bullets.length < MAX_BULLETS;
  if (canFire) {
    const muzzle = player.y - player.height / 2 - 6;
    if (player.spreadTime > 0) {
      const angles = [-0.18, 0, 0.18];
      angles.forEach((angle) => {
        const vx = Math.sin(angle) * 660;
        const vy = -Math.cos(angle) * 660;
        game.bullets.push({
          id: game.nextId++,
          x: player.x,
          y: muzzle,
          vx,
          vy,
          power: 1,
          trail: [],
        });
      });
    } else {
      game.bullets.push({
        id: game.nextId++,
        x: player.x,
        y: muzzle,
        vx: 0,
        vy: -660,
        power: 1,
        trail: [],
      });
    }
    player.cooldown = baseCooldown;
    audioEngine.playSfx("shoot");
  }

  for (let i = game.bullets.length - 1; i >= 0; i -= 1) {
    const b = game.bullets[i];
    b.trail.unshift({ x: b.x, y: b.y, life: 0.18 });
    b.trail = b.trail.slice(0, 6);
    b.y += b.vy * dt;
    if (b.vx) b.x += b.vx * dt;
    if (b.y < -16 || b.x < -16 || b.x > WIDTH + 16) {
      game.bullets.splice(i, 1);
      continue;
    }
    b.trail.forEach((p) => (p.life -= dt));
    if (hitSpider(game, b) || hitCentipede(game, b) || hitMushroom(game, b)) {
      game.bullets.splice(i, 1);
    }
  }

  for (const centipede of game.centipedes) {
    centipede.moveTimer += dt;
    const interval = getCentipedeInterval(game, centipede);
    while (centipede.moveTimer >= interval) {
      centipede.moveTimer -= interval;
      stepCentipede(game, centipede);
    }
    centipede.bounceTimer = Math.max(0, centipede.bounceTimer - dt);
  }

  game.spiderSpawnTimer -= dt;
  if (game.spiderSpawnTimer <= 0) {
    spawnSpider(game);
    game.spiderSpawnTimer = rand(
      Math.max(1, 4.2 - game.wave * 0.28 - game.levelIndex * 0.32),
      Math.max(1.6, 6 - game.wave * 0.2 - game.levelIndex * 0.28),
    );
  }

  const spiderZoneTop = PLAYER_ZONE_TOP - CELL * 1.8;
  for (let i = game.spiders.length - 1; i >= 0; i -= 1) {
    const spider = game.spiders[i];
    spider.wiggle += dt * (4 + game.wave * 0.2 + game.levelIndex * 0.4);
    spider.x += spider.vx * dt;
    spider.y += spider.vy * dt + Math.sin(spider.wiggle) * 28 * dt;
    if (spider.y < spiderZoneTop) {
      spider.y = spiderZoneTop;
      spider.vy = Math.abs(spider.vy) || rand(20, 48);
    }
    if (spider.y > HEIGHT - 28) {
      spider.y = HEIGHT - 28;
      spider.vy = -Math.abs(spider.vy) || -rand(20, 48);
    }
    if (spider.x < -64 || spider.x > WIDTH + 64) {
      game.spiders.splice(i, 1);
      continue;
    }
    const centerCol = clamp(Math.floor(spider.x / CELL), 0, COLS - 1);
    const centerRow = clamp(Math.floor(spider.y / CELL), 0, ROWS - 1);
    for (let row = centerRow - 1; row <= centerRow + 1; row += 1) {
      for (let col = centerCol - 1; col <= centerCol + 1; col += 1) {
        if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue;
        const mushroom = game.mushrooms[cellKey(col, row)];
        if (!mushroom) continue;
        if (circleRectOverlap(spider.x, spider.y, spider.radius, cellRect(col, row, 2))) {
          delete game.mushrooms[cellKey(col, row)];
          spawnExplosion(game, col * CELL + CELL / 2, row * CELL + CELL / 2, 6, "#fde68a", 160, 80);
        }
      }
    }
  }

  for (let i = game.powerUps.length - 1; i >= 0; i -= 1) {
    const p = game.powerUps[i];
    p.life -= dt;
    p.y += p.vy * dt;
    p.rotation += dt * 4;
    if (p.life <= 0 || p.y > HEIGHT + 30) {
      game.powerUps.splice(i, 1);
      continue;
    }
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    if (dx * dx + dy * dy < (player.width / 2 + 14) ** 2) {
      if (p.type === "spread") {
        player.spreadTime = 8;
        game.status = "Tir en éventail activé !";
      } else if (p.type === "rapid") {
        player.rapidFireTime = 8;
        game.status = "Tir rapide activé !";
      } else if (p.type === "shield") {
        player.shieldTime = 12;
        game.status = "Bouclier énergétique activé !";
      }
      spawnExplosion(game, p.x, p.y, 22, "#a5f3fc", 260, 60);
      spawnFloatingText(game, p.x, p.y - 8, p.type === "spread" ? "ÉVENTAIL" : p.type === "rapid" ? "RAPIDE" : "BOUCLIER", "#a5f3fc");
      game.powerUps.splice(i, 1);
      audioEngine.playSfx("powerup");
    }
  }

  if (player.invulnerable <= 0) {
    const shipRect = playerRect(player);
    for (const centipede of game.centipedes) {
      for (const segment of centipede.segments) {
        if (rectsOverlap(shipRect, cellRect(segment.col, segment.row, 3))) {
          loseLife(game);
          break;
        }
      }
      if (game.player.invulnerable > 0 || game.gameOver) break;
    }
    if (!game.gameOver && player.invulnerable <= 0) {
      for (const spider of game.spiders) {
        if (circleRectOverlap(spider.x, spider.y, spider.radius, shipRect)) {
          loseLife(game);
          break;
        }
      }
    }
  }

  if (game.centipedes.length === 0 && !game.gameOver) {
    if (game.waveDelay === 0) {
      game.waveDelay = 1.8;
      game.status = `Vague ${game.wave} terminée, prépare la suivante`;
      audioEngine.playSfx("waveClear");
      game.shake = 0.4;
      game.shakeIntensity = 6;
    }
    game.waveDelay = Math.max(0, game.waveDelay - dt);
    if (game.waveDelay === 0) {
      if (shouldAdvanceLevel(game)) {
        advanceLevel(game);
      }
      game.wave += 1;
      spawnWave(game);
    }
  } else {
    game.waveDelay = 0;
  }

  for (let i = game.particles.length - 1; i >= 0; i -= 1) {
    const p = game.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
    p.size *= 0.985;
    if (p.life <= 0) game.particles.splice(i, 1);
  }

  for (let i = game.floatingTexts.length - 1; i >= 0; i -= 1) {
    const ft = game.floatingTexts[i];
    ft.life -= dt;
    ft.y += ft.vy * dt;
    ft.vy += 18 * dt;
    if (ft.life <= 0) game.floatingTexts.splice(i, 1);
  }

  // Starfield animation
  const theme = LEVEL_THEMES[game.levelIndex % LEVEL_THEMES.length];
  for (const star of game.stars) {
    star.x -= star.speed * theme.starSpeed * dt * 8 * star.depth;
    star.phase += dt * star.speed;
    if (star.x < -4) {
      star.x = WIDTH + 4;
      star.y = rand(0, HEIGHT);
    }
  }
};

// ----- Rendering -----
const drawCentipedeSegment = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  hue: number,
  isHead: boolean,
  dirX: Direction,
  pulse: number,
) => {
  const baseRadius = CELL * (isHead ? 0.34 : 0.3);
  ctx.save();
  ctx.shadowBlur = isHead ? 22 : 14;
  ctx.shadowColor = `hsla(${hue}, 92%, 65%, 0.9)`;
  const grad = ctx.createRadialGradient(cx, cy, baseRadius * 0.2, cx, cy, baseRadius * 1.6);
  grad.addColorStop(0, `hsl(${hue}, 95%, 78%)`);
  grad.addColorStop(0.55, `hsl(${hue}, 86%, 56%)`);
  grad.addColorStop(1, `hsl(${hue}, 70%, 26%)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  // Animated legs
  const legWave = Math.sin(pulse * 8) * 3;
  ctx.strokeStyle = `hsl(${hue}, 70%, 30%)`;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  for (let leg = -1; leg <= 1; leg += 2) {
    ctx.beginPath();
    ctx.moveTo(cx + leg * 4, cy - baseRadius * 0.6);
    ctx.quadraticCurveTo(cx + leg * 10, cy - 2 + legWave, cx + leg * 13, cy - baseRadius * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + leg * 4, cy + baseRadius * 0.6);
    ctx.quadraticCurveTo(cx + leg * 10, cy + 2 - legWave, cx + leg * 13, cy + baseRadius * 0.9);
    ctx.stroke();
  }

  // Inner highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = `hsla(${hue}, 100%, 92%, 0.55)`;
  ctx.beginPath();
  ctx.arc(cx - baseRadius * 0.35, cy - baseRadius * 0.4, baseRadius * 0.32, 0, Math.PI * 2);
  ctx.fill();

  if (isHead) {
    const eyeOffset = dirX === 1 ? 3 : -3;
    ctx.strokeStyle = `hsl(${hue}, 90%, 60%)`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx + eyeOffset, cy - 5);
    ctx.lineTo(cx + eyeOffset + dirX * 7, cy - 12);
    ctx.moveTo(cx + eyeOffset, cy + 5);
    ctx.lineTo(cx + eyeOffset + dirX * 7, cy + 12);
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(cx + dirX * 5, cy - 3, 2.4, 0, Math.PI * 2);
    ctx.arc(cx + dirX * 5, cy + 3, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const drawMushroom = (
  ctx: CanvasRenderingContext2D,
  mushroom: Mushroom,
) => {
  const x = mushroom.col * CELL;
  const y = mushroom.row * CELL;
  const pulse = Math.sin(mushroom.pulse) * 0.5 + 0.5;
  const capColor =
    mushroom.hp >= 4
      ? "#34d399"
      : mushroom.hp === 3
        ? "#86efac"
        : mushroom.hp === 2
          ? "#fbbf24"
          : "#fb7185";

  // Shadow
  ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
  ctx.beginPath();
  ctx.ellipse(x + CELL / 2, y + CELL * 0.92, CELL * 0.36, CELL * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stem
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = capColor;
  ctx.fillStyle = "#d6d3d1";
  ctx.fillRect(x + CELL * 0.43, y + CELL * 0.42, CELL * 0.14, CELL * 0.42);

  // Cap
  const capGrad = ctx.createRadialGradient(x + CELL / 2, y + CELL * 0.36, 2, x + CELL / 2, y + CELL * 0.4, CELL * 0.5);
  capGrad.addColorStop(0, "#ffffff");
  capGrad.addColorStop(0.2, capColor);
  capGrad.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = capGrad;
  ctx.beginPath();
  ctx.arc(x + CELL / 2, y + CELL * 0.42, CELL * 0.36, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  // Spots
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.beginPath();
  ctx.arc(x + CELL * 0.43, y + CELL * 0.31, CELL * 0.05, 0, Math.PI * 2);
  ctx.arc(x + CELL * 0.58, y + CELL * 0.28, CELL * 0.045, 0, Math.PI * 2);
  ctx.arc(x + CELL * 0.52, y + CELL * 0.38, CELL * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Damage indicator pulse
  if (mushroom.hp <= 2) {
    ctx.strokeStyle = `rgba(251, 113, 133, ${0.35 + pulse * 0.35})`;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
  }
};

const drawSpider = (ctx: CanvasRenderingContext2D, spider: Spider) => {
  ctx.save();
  ctx.translate(spider.x, spider.y);
  const walkCycle = Math.sin(spider.wiggle * 3) * 1;
  ctx.strokeStyle = "rgba(248, 113, 113, 0.85)";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";

  // Legs - waving animation
  for (let i = 0; i < 4; i += 1) {
    const yOff = (i - 1.5) * 4;
    const jitter = Math.sin(spider.wiggle * 2 + i) * 2;
    ctx.beginPath();
    ctx.moveTo(-8, yOff);
    ctx.quadraticCurveTo(-16 + jitter, yOff - 6 + walkCycle, -22, yOff - 10 - walkCycle);
    ctx.moveTo(8, yOff);
    ctx.quadraticCurveTo(16 - jitter, yOff - 6 + walkCycle, 22, yOff - 10 - walkCycle);
    ctx.stroke();
  }

  // Body glow
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#f43f5e";
  const grad = ctx.createRadialGradient(-2, 0, 2, 0, 0, 14);
  grad.addColorStop(0, "#fda4af");
  grad.addColorStop(0.4, "#ef4444");
  grad.addColorStop(1, "#7f1d1d");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 8;
  ctx.fillStyle = "#fda4af";
  ctx.beginPath();
  ctx.arc(13, 0, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(15, -2, 1.8, 0, Math.PI * 2);
  ctx.arc(15, 2, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player, time: number) => {
  if (player.invulnerable > 0 && Math.floor(time * 14) % 2 === 0) return;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Engine flame
  const flameH = 12 + Math.sin(time * 24) * 4 + player.engineGlow * 6;
  const flameGrad = ctx.createLinearGradient(0, player.height / 2, 0, player.height / 2 + flameH);
  flameGrad.addColorStop(0, "#fde68a");
  flameGrad.addColorStop(0.5, "#f97316");
  flameGrad.addColorStop(1, "rgba(249, 115, 22, 0)");
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(-6, player.height / 2);
  ctx.lineTo(0, player.height / 2 + flameH);
  ctx.lineTo(6, player.height / 2);
  ctx.closePath();
  ctx.fill();

  // Ship body glow
  ctx.shadowBlur = 22;
  ctx.shadowColor = "#22d3ee";

  // Ship body gradient
  const shipGrad = ctx.createLinearGradient(0, -player.height / 2, 0, player.height / 2);
  shipGrad.addColorStop(0, "#67e8f9");
  shipGrad.addColorStop(0.55, "#38bdf8");
  shipGrad.addColorStop(1, "#0c4a6e");
  ctx.fillStyle = shipGrad;
  ctx.beginPath();
  ctx.moveTo(0, -player.height / 2);
  ctx.lineTo(player.width / 2, player.height / 2 - 2);
  ctx.lineTo(0, player.height / 2 - 6);
  ctx.lineTo(-player.width / 2, player.height / 2 - 2);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = "#a5f3fc";
  ctx.beginPath();
  ctx.arc(0, -2, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.moveTo(-2, -player.height / 2);
  ctx.lineTo(2, -player.height / 2);
  ctx.lineTo(0, -player.height / 2 + 6);
  ctx.closePath();
  ctx.fill();

  // Cannon
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#fde68a";
  ctx.fillStyle = "#fde68a";
  ctx.fillRect(-2.5, -player.height / 2 - 6, 5, 10);

  // Shield
  if (player.shieldTime > 0) {
    ctx.strokeStyle = `rgba(125, 211, 252, ${0.55 + Math.sin(time * 6) * 0.25})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, player.width * 0.82, 0, Math.PI * 2);
    ctx.stroke();
  } else if (player.invulnerable > 0) {
    ctx.strokeStyle = "rgba(125, 211, 252, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, player.width * 0.82, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
};

const drawPowerUp = (ctx: CanvasRenderingContext2D, powerUp: PowerUp) => {
  ctx.save();
  ctx.translate(powerUp.x, powerUp.y);
  ctx.rotate(powerUp.rotation);
  ctx.shadowBlur = 18;
  let color = "#22d3ee";
  let label = "S";
  if (powerUp.type === "spread") {
    color = "#fb7185";
    label = "★";
  } else if (powerUp.type === "rapid") {
    color = "#fbbf24";
    label = "⚡";
  } else if (powerUp.type === "shield") {
    color = "#a5f3fc";
    label = "◯";
  }
  ctx.shadowColor = color;
  const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.4, color);
  grad.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 0, 1);
  ctx.restore();
};

const drawParticle = (ctx: CanvasRenderingContext2D, p: Particle) => {
  const alpha = clamp(p.life / p.maxLife, 0, 1);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, Math.max(0.4, p.size), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
};

const renderGame = (ctx: CanvasRenderingContext2D, game: Game) => {
  const theme = LEVEL_THEMES[game.levelIndex % LEVEL_THEMES.length];

  ctx.save();
  if (game.shake > 0) {
    const s = game.shakeIntensity * game.shake * 6;
    const ox = (Math.random() - 0.5) * s;
    const oy = (Math.random() - 0.5) * s;
    ctx.translate(ox, oy);
  }

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, theme.bgTop);
  gradient.addColorStop(0.55, theme.bgMid);
  gradient.addColorStop(1, theme.bgBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle star/bg field
  for (const star of game.stars) {
    const alpha = 0.18 + ((Math.sin(game.elapsed * star.speed + star.phase) + 1) / 2) * 0.7;
    ctx.fillStyle = `hsla(${theme.starHue}, 90%, 78%, ${alpha.toFixed(3)})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);
    if (star.depth > 0.7 && star.size > 1.4) {
      ctx.fillStyle = `hsla(${theme.starHue}, 90%, 88%, ${(alpha * 0.5).toFixed(3)})`;
      ctx.fillRect(star.x - 1, star.y, star.size + 2, star.size);
    }
  }

  // Player zone
  ctx.fillStyle = "rgba(56, 189, 248, 0.045)";
  ctx.fillRect(0, PLAYER_ZONE_TOP, WIDTH, HEIGHT - PLAYER_ZONE_TOP);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, PLAYER_ZONE_TOP);
  ctx.lineTo(WIDTH, PLAYER_ZONE_TOP);
  ctx.stroke();

  // Grid (subtle)
  ctx.strokeStyle = "rgba(148, 163, 184, 0.045)";
  ctx.lineWidth = 1;
  for (let col = 0; col <= COLS; col += 1) {
    const x = col * CELL + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let row = 0; row <= ROWS; row += 1) {
    const y = row * CELL + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  // Mushrooms
  for (const mushroom of Object.values(game.mushrooms)) {
    mushroom.pulse += 0.04;
    drawMushroom(ctx, mushroom);
  }

  // Centipedes
  for (const centipede of game.centipedes) {
    centipede.segments.forEach((segment, index) => {
      drawCentipedeSegment(
        ctx,
        segment.col * CELL + CELL / 2,
        segment.row * CELL + CELL / 2,
        centipede.hue,
        index === 0,
        centipede.dirX,
        game.elapsed + index * 0.18,
      );
    });
  }

  // Spiders
  for (const spider of game.spiders) {
    drawSpider(ctx, spider);
  }

  // Power-ups
  for (const powerUp of game.powerUps) {
    drawPowerUp(ctx, powerUp);
  }

  // Bullets + trails
  for (const bullet of game.bullets) {
    bullet.trail.forEach((p, i) => {
      ctx.fillStyle = `rgba(253, 230, 138, ${p.life * (0.1 + (1 - i / bullet.trail.length) * 0.4)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2 - i * 0.25, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#fde68a";
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.ellipse(bullet.x, bullet.y, 2.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Particles
  for (const p of game.particles) drawParticle(ctx, p);

  // Player
  drawPlayer(ctx, game.player, game.elapsed);

  // Floating texts
  ctx.save();
  ctx.textAlign = "center";
  for (const ft of game.floatingTexts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, ft.life));
    ctx.fillStyle = ft.color;
    ctx.font = `700 ${ft.size}px system-ui, sans-serif`;
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#0f172a";
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.shadowBlur = 0;
  }
  ctx.restore();

  // Wave banner
  if (game.waveBanner > 0) {
    const alpha = Math.min(1, game.waveBanner / 1.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.fillStyle = theme.accent;
    ctx.font = "800 46px system-ui, sans-serif";
    ctx.shadowBlur = 18;
    ctx.shadowColor = theme.accent;
    ctx.fillText(`VAGUE ${game.wave}`, WIDTH / 2, HEIGHT * 0.18);
    ctx.shadowBlur = 0;
    ctx.font = "600 18px system-ui, sans-serif";
    ctx.fillStyle = "rgba(248, 250, 252, 0.92)";
    ctx.fillText(theme.name.toUpperCase(), WIDTH / 2, HEIGHT * 0.18 + 32);
    ctx.restore();
  }

  // Flash
  if (game.flash > 0) {
    ctx.fillStyle = game.flashColor
      .replace(")", `, ${0.42 * (game.flash / 0.9)})`)
      .replace("rgb", "rgba");
    if (!game.flashColor.startsWith("rgb")) {
      ctx.fillStyle = game.flashColor + "66";
    }
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  ctx.restore();
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const inputRef = useRef<InputState>(createInputState());
  const [hud, setHud] = useState<HudState>({
    score: 0,
    lives: 3,
    wave: 1,
    level: 1,
    levelName: LEVEL_THEMES[0].name,
    status: "Chargement…",
    paused: false,
    gameOver: false,
    segments: 0,
    spiders: 0,
    combo: 0,
    fullscreen: false,
    muted: false,
    bestScore: 0,
  });
  const [showInfo, setShowInfo] = useState(false);

  const syncHud = useCallback((game: Game) => {
    setHud({
      score: game.score,
      lives: game.lives,
      wave: game.wave,
      level: game.levelIndex + 1,
      levelName: LEVEL_THEMES[game.levelIndex % LEVEL_THEMES.length].name,
      status: game.status,
      paused: game.paused,
      gameOver: game.gameOver,
      segments: sumSegments(game.centipedes),
      spiders: game.spiders.length,
      combo: game.combo,
      fullscreen: Boolean(document.fullscreenElement),
      muted: false,
      bestScore: game.bestScore,
    });
  }, []);

  const clearInput = useCallback(() => {
    inputRef.current = createInputState();
  }, []);

  const initializeGame = useCallback(() => {
    audioEngine.resume();
    clearInput();
    const stored = Number(window.localStorage.getItem("centipede.best"));
    const best = Number.isFinite(stored) && stored > 0 ? stored : 0;
    const game = createGame(best);
    gameRef.current = game;
    syncHud(game);
  }, [clearInput, syncHud]);

  const togglePause = useCallback(() => {
    const game = gameRef.current;
    if (!game || game.gameOver) return;
    game.paused = !game.paused;
    game.status = game.paused ? "Pause" : `Vague ${game.wave} : retour au combat`;
    if (game.paused) audioEngine.stopMusic();
    else audioEngine.startMusic(LEVEL_THEMES[game.levelIndex % LEVEL_THEMES.length]);
    syncHud(game);
  }, [syncHud]);

  const toggleMute = useCallback(() => {
    const muted = audioEngine["muted"]; // reflect engine state
    const next = !muted;
    audioEngine.setMuted(next);
    setHud((prev) => ({ ...prev, muted: next }));
  }, []);

  const setInput = useCallback((key: keyof InputState, value: boolean) => {
    inputRef.current[key] = value;
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setHud((prev) => ({ ...prev, fullscreen: Boolean(document.fullscreenElement) }));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) return;

    initializeGame();

    let frameId = 0;

    const handleKeyDown = (event: KeyboardEvent) => {
      audioEngine.resume();
      switch (event.code) {
        case "ArrowLeft":
        case "KeyA":
          inputRef.current.left = true;
          event.preventDefault();
          break;
        case "ArrowRight":
        case "KeyD":
          inputRef.current.right = true;
          event.preventDefault();
          break;
        case "ArrowUp":
        case "KeyW":
          inputRef.current.up = true;
          event.preventDefault();
          break;
        case "ArrowDown":
        case "KeyS":
          inputRef.current.down = true;
          event.preventDefault();
          break;
        case "Space":
        case "KeyJ":
          inputRef.current.fire = true;
          event.preventDefault();
          break;
        case "KeyP":
          if (!event.repeat) togglePause();
          break;
        case "KeyR":
          if (!event.repeat) initializeGame();
          break;
        case "KeyF":
          if (!event.repeat) toggleFullscreen();
          break;
        case "KeyM":
          if (!event.repeat) toggleMute();
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case "ArrowLeft":
        case "KeyA":
          inputRef.current.left = false;
          break;
        case "ArrowRight":
        case "KeyD":
          inputRef.current.right = false;
          break;
        case "ArrowUp":
        case "KeyW":
          inputRef.current.up = false;
          break;
        case "ArrowDown":
        case "KeyS":
          inputRef.current.down = false;
          break;
        case "Space":
        case "KeyJ":
          inputRef.current.fire = false;
          break;
        default:
          break;
      }
    };

    const handleBlur = () => clearInput();

    const frame = (timestamp: number) => {
      const game = gameRef.current;
      if (!game) {
        frameId = window.requestAnimationFrame(frame);
        return;
      }
      if (game.lastTimestamp === 0) game.lastTimestamp = timestamp;
      const dt = Math.min((timestamp - game.lastTimestamp) / 1000, 0.033);
      game.lastTimestamp = timestamp;

      updateGame(game, inputRef.current, dt);
      renderGame(context, game);

      if (game.score > game.bestScore) {
        game.bestScore = game.score;
        window.localStorage.setItem("centipede.best", String(game.bestScore));
      }

      if (timestamp - game.lastHudSync > 100) {
        syncHud(game);
        game.lastHudSync = timestamp;
      }

      frameId = window.requestAnimationFrame(frame);
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    frameId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [clearInput, initializeGame, syncHud, togglePause, toggleFullscreen, toggleMute]);

  const controlButtonClass =
    "inline-flex min-h-12 min-w-12 items-center justify-center rounded-2xl border border-cyan-400/25 bg-slate-900/85 px-4 py-3 text-sm font-semibold text-slate-100 shadow-lg shadow-cyan-950/25 transition hover:border-cyan-300/50 hover:bg-slate-800 active:scale-[0.98]";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.18),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#020617_36%,_#0f172a_100%)] text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-fuchsia-200">
              Jeu d&apos;arcade neuronal
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Centizap</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300 sm:text-base">
                Pulvérise un mille-pattes segmenté qui se divise à chaque tir, fraye dans un champ de
                champignons vivants et résiste aux araignées voraces sur des niveaux de plus en plus
                déchaînés.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-fuchsia-400 animate-pulse" />
                Conçu par <strong className="text-slate-100">Hylst, Geoffroy</strong>
              </span>
              <span className="hidden h-4 w-px bg-slate-700 sm:block" />
              <span>Réalisé avec l&apos;aide d&apos;une IA</span>
              <span className="hidden h-4 w-px bg-slate-700 sm:block" />
              <span>Amuse-toi bien !</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              ZQSD / Flèches pour bouger
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              Espace / J pour tirer
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              P pause • R relancer
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              F plein écran • M muet
            </span>
          </div>
        </header>

        <main className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-[28px] border border-white/10 bg-slate-900/55 p-4 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Score</p>
                <p className="mt-2 text-2xl font-black text-cyan-300">{hud.score}</p>
                <p className="text-xs text-slate-400">Meilleur {hud.bestScore}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Vies</p>
                <p className="mt-2 text-2xl font-black text-emerald-300">{hud.lives}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Vague</p>
                <p className="mt-2 text-2xl font-black text-amber-300">{hud.wave}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Niveau</p>
                <p className="mt-2 text-2xl font-black text-fuchsia-300">{hud.level}</p>
                <p className="text-xs text-slate-300">{hud.levelName}</p>
              </div>
              <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 sm:col-span-2 lg:col-span-1">
                <p className="text-xs uppercase tracking-[0.22em] text-amber-200">Combo</p>
                <p className="mt-2 text-2xl font-black text-amber-200">x{hud.combo}</p>
                <p className="text-xs text-amber-100/80">Enchaîne les tirs</p>
              </div>
            </div>

            <div className="mt-4 rounded-[28px] border border-cyan-400/20 bg-slate-950/85 p-3 shadow-inner shadow-black/30 sm:p-4">
              <canvas
                ref={canvasRef}
                className="mx-auto block h-auto w-full max-w-[576px] rounded-2xl border border-white/10 bg-slate-950"
                aria-label="Plateau de jeu Centizap"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={togglePause}
                className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-5 py-2.5 text-sm font-semibold text-cyan-200 transition hover:border-cyan-200/50 hover:bg-cyan-400/15"
              >
                {hud.paused ? "Reprendre" : "Pause"}
              </button>
              <button
                type="button"
                onClick={initializeGame}
                className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-5 py-2.5 text-sm font-semibold text-emerald-200 transition hover:border-emerald-200/50 hover:bg-emerald-400/15"
              >
                Nouvelle partie
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-5 py-2.5 text-sm font-semibold text-fuchsia-200 transition hover:border-fuchsia-200/50 hover:bg-fuchsia-400/15"
              >
                {hud.fullscreen ? "Quitter le plein écran" : "Plein écran"}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className="rounded-full border border-amber-300/30 bg-amber-400/10 px-5 py-2.5 text-sm font-semibold text-amber-200 transition hover:border-amber-200/50 hover:bg-amber-400/15"
              >
                {hud.muted ? "Réactiver le son" : "Couper le son"}
              </button>
              <button
                type="button"
                onClick={() => setShowInfo(true)}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/10"
              >
                ℹ️ Infos
              </button>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                {hud.status}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <h2 className="text-lg font-bold text-white">Briefing mission</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                  <li>· Tire sur n&apos;importe quel segment pour diviser le mille-pattes en créatures plus rapides.</li>
                  <li>· Les champignons bloquent ta course ET celle des ennemis en redessinant l&apos;aire de jeu.</li>
                  <li>· Les araignées rôdent en bas, dévorent les champignons et t&apos;encerclent sans pitié.</li>
                  <li>· Vide l&apos;écran pour déclencher la vague suivante avec champignons et vitesse accrus.</li>
                  <li>· Tous les 3 vagues, tu changes de niveau : thème visuel, musique et adversaires nouveaux.</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <h2 className="text-lg font-bold text-white">Commandes tactiles</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className={controlButtonClass} onPointerDown={() => setInput("left", true)} onPointerUp={() => setInput("left", false)} onPointerLeave={() => setInput("left", false)} onPointerCancel={() => setInput("left", false)}>◀</button>
                  <button type="button" className={controlButtonClass} onPointerDown={() => setInput("up", true)} onPointerUp={() => setInput("up", false)} onPointerLeave={() => setInput("up", false)} onPointerCancel={() => setInput("up", false)}>▲</button>
                  <button type="button" className={controlButtonClass} onPointerDown={() => setInput("down", true)} onPointerUp={() => setInput("down", false)} onPointerLeave={() => setInput("down", false)} onPointerCancel={() => setInput("down", false)}>▼</button>
                  <button type="button" className={controlButtonClass} onPointerDown={() => setInput("right", true)} onPointerUp={() => setInput("right", false)} onPointerLeave={() => setInput("right", false)} onPointerCancel={() => setInput("right", false)}>▶</button>
                  <button type="button" className={`${controlButtonClass} min-w-[112px] border-amber-300/30 bg-amber-400/10 text-amber-100 hover:border-amber-200/50 hover:bg-amber-400/15`} onPointerDown={() => setInput("fire", true)} onPointerUp={() => setInput("fire", false)} onPointerLeave={() => setInput("fire", false)} onPointerCancel={() => setInput("fire", false)}>Tirer</button>
                </div>
              </div>
            </div>
          </section>

          <aside className="grid gap-4">
            <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5 backdrop-blur">
              <h2 className="text-xl font-bold text-white">Niveaux prévus</h2>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                {LEVEL_THEMES.map((theme, index) => (
                  <div
                    key={theme.name}
                    className={`rounded-2xl border p-3 transition ${
                      hud.level === index + 1
                        ? "border-cyan-300/40 bg-cyan-300/5"
                        : "border-white/10 bg-white/5"
                    }`}
                    style={{ boxShadow: hud.level === index + 1 ? `inset 0 0 0 1px ${theme.accent}55` : undefined }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-white">
                        Niveau {index + 1} : {theme.name}
                      </p>
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ background: theme.accent, boxShadow: `0 0 12px ${theme.accent}` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {index === 0 && "Vitesse classique · centipèdes faciles · musique électro."}
                      {index === 1 && "Araignées rapides · toxines phosphorescentes · rythme tendu."}
                      {index === 2 && "Sable abrasif · champignons denses · musique sèche."}
                      {index === 3 && "Glace spectrale · centipèdes glissants · mélodie planante."}
                      {index === 4 && "Cœur stellaire · tout accélère · dernier palier imminent."}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5 backdrop-blur">
              <h2 className="text-xl font-bold text-white">Bonus à récupérer</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-400/15 text-rose-300 ring-1 ring-rose-300/40">★</span>
                  <div><strong className="text-rose-200">Tir en éventail</strong> : trois projectiles en éventail pendant 8&nbsp;s.</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/15 text-amber-300 ring-1 ring-amber-300/40">⚡</span>
                  <div><strong className="text-amber-200">Tir rapide</strong> : cadence doublée pendant 8&nbsp;s.</div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/40">◯</span>
                  <div><strong className="text-cyan-200">Bouclier</strong> : protège ton vaisseau d&apos;une collision pendant 12&nbsp;s.</div>
                </li>
              </ul>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5 backdrop-blur">
              <h2 className="text-xl font-bold text-white">Astuces de survie</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <li>· Évite de tirer au centre d&apos;un long mille-pattes sauf si tu peux gérer plusieurs têtes.</li>
                <li>· Conserve des couloirs de fuite entre les champignons pour esquiver les araignées.</li>
                <li>· Profite de l&apos;invulnérabilité de respawn pour te repositionner au centre.</li>
                <li>· Enchaîne les tirs pour faire grimper ton combo et multiplier les points.</li>
              </ul>
            </div>
          </aside>
        </main>

        <footer className="rounded-[28px] border border-white/10 bg-slate-900/55 p-5 text-center text-sm text-slate-400 backdrop-blur">
          Une création signée <span className="font-semibold text-slate-100">Hylst, Geoffroy</span>, réalisée avec
          l&apos;aide d&apos;une IA. Amuse-toi bien dans l&apos;arène néon&nbsp;!
        </footer>
      </div>

      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={() => setShowInfo(false)}>
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[28px] border border-white/10 bg-slate-900/95 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-3.5 text-sm leading-relaxed text-slate-300">
              <h3 className="text-xl font-black text-white">Comment ce jeu a été fait</h3>
              <p><strong className="text-white">Stack :</strong> React 19, TypeScript 5.9, Tailwind CSS 4, Vite 7, compilé en un seul fichier HTML, aucune dépendance chargée depuis l'extérieur.</p>
              <p><strong className="text-white">Graphismes :</strong> tout est dessiné en Canvas 2D à chaque image (vaisseau, mille-pattes, champignons, araignées, particules), aucun sprite ni image externe.</p>
              <p><strong className="text-white">Musique &amp; sons :</strong> synthétisés en direct avec l'API Web Audio, une thématique musicale différente par niveau.</p>
              <p><strong className="text-white">Interactions :</strong> ZQSD ou flèches pour se déplacer, espace ou J pour tirer, avec des power-ups temporaires (tir en éventail, tir rapide, bouclier).</p>
              <p><strong className="text-white">Architecture :</strong> l'état du jeu vit dans une référence mise à jour à chaque frame de la boucle Canvas, synchronisée vers le state React uniquement pour l'affichage du HUD.</p>
              <p><strong className="text-white">Algorithmes notables :</strong> le mille-pattes est une chaîne de segments qui se divise en deux groupes indépendants dès qu'un segment du milieu est touché, chacun continuant sa progression dans le champ de champignons qui dévie sa trajectoire.</p>
            </div>
            <div className="border-t border-white/10 p-4 text-center">
              <button onClick={() => setShowInfo(false)} className="rounded-full border border-white/10 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
