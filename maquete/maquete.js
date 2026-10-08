/* ───────────────────────────────────────────────────────────────
   ARCOR — Maquete 3D · Vila Doce de Natal · 200m²
   Three.js scene loading the real GLB model + shopping space
   ─────────────────────────────────────────────────────────────── */
import * as THREE from 'three';
import { OrbitControls } from '../assets/vendor/OrbitControls.js';
import { GLTFLoader }    from '../assets/vendor/GLTFLoader.js';
import { RoomEnvironment } from '../assets/vendor/RoomEnvironment.js';

// ── Dimensions (meters — 1 unit = 1 m) ─────────────────────────
const SPACE_W   = 22;   // width (x)
const SPACE_D   = 12;   // depth (z)
const WALL_H    = 5.5;  // wall height
const ENTRANCE_W = 6;   // entrance width

// Model from estatisticas.json — bounds ≈ [-11, 11] × [−5, 5]
const MODEL_URL = '../assets/models/exposicao-shopping.glb';

// ── Camera presets ──────────────────────────────────────────────
const VIEWS = {
  all:    { pos: [24, 16, 24],   target: [0, 1.5, 0] },
  pacoca: { pos: [1, 6, 10],    target: [0, 1.9, 0] },
  sete:   { pos: [-8, 5, 9],    target: [-6.8, 1.9, 0] },
  poosh:  { pos: [8.5, 5, -5],  target: [6.8, 1.9, 0] },
};

// ── Booth info ──────────────────────────────────────────────────
const BOOTH_DATA = {
  pacoca: {
    name: 'Paçoca do Amor',
    eyebrow: '01 — LOJA TEMÁTICA',
    color: '#d4a855',
    desc: 'A Paçoca do Amor ganha uma interpretação arquitetônica para transformar sua identidade em espaço. No centro, um grande coração formado por amendoins conecta o amor no nome ao ingrediente da paçoca. Arquitetura, iluminação e materiais criam um ambiente acolhedor e marcante.',
    area: '~65m²',
    formato: 'Circular',
    iluminacao: 'Quente / Dourada',
    material: 'Madeira / Ouro',
    features: [
      '♡  Coração central de amendoins (1.613 peças modeladas)',
      '🪵  Balcões curvos de madeira com iluminação',
      '✨  Estrutura dourada circular superior',
      '🎁  Expositor de produtos Paçoca',
      '📸  Ponto instagramável com o coração',
    ],
  },
  sete: {
    name: '7 Belo',
    eyebrow: '02 — EXPERIÊNCIA LÚDICA',
    color: '#ff6b9d',
    desc: 'O espaço da 7 Belo transporta o visitante para um universo de balas e doces. Cores vibrantes, iluminação marcante, formas divertidas e cenografia constroem uma atmosfera lúdica. O mascote em formato de carta é ponto central para fotos e interação.',
    area: '~65m²',
    formato: 'Retangular',
    iluminacao: 'Colorida / Rosa',
    material: 'Acrílico / Candy',
    features: [
      '7♦  Mascote gigante (carta de baralho 3D — modelo Tripo3D)',
      '🍭  Pirulitos e doces gigantes cenográficos',
      '🍩  Donut e gummy bears decorativos',
      '🎪  Portal de entrada com colunas candy-cane',
      '🎡  Prateleiras com produtos coloridos',
    ],
  },
  poosh: {
    name: 'Poosh!',
    eyebrow: '03 — EXPERIÊNCIA IMERSIVA',
    color: '#00e5ff',
    desc: 'O Quarto do Noel Radical transforma o universo Poosh! em experiência imersiva: Natal congelado, cenografia de gelo, neon e tecnologia. A cama cryo-pod, árvore de Natal radical e pista de snowboard criam uma atmosfera jovem e intensa.',
    area: '~50m²',
    formato: 'Cúbico / Sala',
    iluminacao: 'Neon Ciano + Magenta',
    material: 'Gelo / Acrílico',
    features: [
      '❄  Cenografia de gelo e paredes translúcidas',
      '🛏  Cama cryo-pod temática (modelo Tripo3D)',
      '🎄  Árvore de Natal com ornamentos luminosos',
      '📽  Projetor de neve digital no teto',
      '🎿  Snowboard e equipamento decorativo',
    ],
  },
};

// ── Globals ─────────────────────────────────────────────────────
let scene, camera, renderer, controls;
let raycaster, mouse;
let boothGroups = {};       // { pacoca: Group, sete: Group, poosh: Group }
let hoveredBooth = null;
let gridHelper, measureGroup;
let showLabels = true, showGrid = true, showMeasures = false;
let autoRotate = false;
let labelEls = [];          // { el, worldPos }
let tooltipEl;

// ── Loading helpers ─────────────────────────────────────────────
function setLoading(pct, msg) {
  const bar = document.getElementById('loading-bar');
  const txt = document.getElementById('loading-text');
  if (bar) bar.style.width = pct + '%';
  if (txt) txt.textContent = msg;
}
function finishLoading() {
  setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    ls.classList.add('fade-out');
    document.getElementById('app').classList.remove('hidden');
    setTimeout(() => { ls.style.display = 'none'; }, 700);
  }, 400);
}

// ────────────────────────────────────────────────────────────────
//  INIT
// ────────────────────────────────────────────────────────────────
async function init() {
  const container = document.getElementById('canvas-container');
  setLoading(5, 'Inicializando Three.js…');

  // ── Renderer ────────────────────────────────────────────────
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // ── Scene ───────────────────────────────────────────────────
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0c1e);
  scene.fog = new THREE.FogExp2(0x0c0c1e, 0.008);

  // Environment map (for realistic PBR reflections on the GLB)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  const envMap = pmrem.fromScene(envScene, 0.04);
  scene.environment = envMap.texture;
  scene.environmentIntensity = 0.25;
  envScene.dispose();
  pmrem.dispose();

  // ── Camera ──────────────────────────────────────────────────
  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(...VIEWS.all.pos);

  // ── Controls ────────────────────────────────────────────────
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...VIEWS.all.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 50;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.autoRotateSpeed = 1.2;
  controls.enablePan = true;
  controls.zoomSpeed = 0.8;
  controls.update();

  // ── Raycaster ───────────────────────────────────────────────
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'tooltip-3d';
  document.body.appendChild(tooltipEl);

  setLoading(10, 'Construindo espaço do shopping…');

  // ── Build shopping space ────────────────────────────────────
  buildFloor();
  buildWalls();
  buildCeiling();
  buildEntrance();
  buildExit();
  buildCorridorElements();
  buildGrid();
  buildMeasureLines();
  buildLights();

  setLoading(30, 'Carregando modelo 3D (12.8 MB)…');

  // ── Load GLB ────────────────────────────────────────────────
  try {
    await loadGLBModel();
  } catch (e) {
    console.error('Erro ao carregar GLB:', e);
    setLoading(100, 'Erro ao carregar modelo. Recarregue a página.');
    return;
  }

  setLoading(95, 'Criando etiquetas…');
  createLabels();
  setupUI();
  setupInteraction();

  setLoading(100, 'Pronto!');
  finishLoading();

  // ── Resize ──────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}

// ────────────────────────────────────────────────────────────────
//  GLB LOADER
// ────────────────────────────────────────────────────────────────
function loadGLBModel() {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => {
        const model = gltf.scene;

        // Enable shadows on all meshes
        model.traverse(o => {
          if (o.isMesh) {
            o.castShadow = !o.material?.transparent;
            o.receiveShadow = true;
          }
        });

        // Position model at center of our space
        // Model bounds: [-11,11] x [-5,5], our space center is at (0,0,0)
        model.position.set(0, 0, 0);
        scene.add(model);

        // Create invisible click-zones for each booth area
        createBoothZones();

        setLoading(90, 'Modelo carregado com sucesso!');
        resolve();
      },
      (xhr) => {
        if (xhr.total > 0) {
          const pct = 30 + (xhr.loaded / xhr.total) * 55;
          setLoading(pct, `Carregando modelo 3D… ${Math.round(xhr.loaded / xhr.total * 100)}%`);
        }
      },
      (error) => reject(error)
    );
  });
}

// ────────────────────────────────────────────────────────────────
//  BOOTH CLICK ZONES (invisible boxes to detect clicks per booth)
// ────────────────────────────────────────────────────────────────
function createBoothZones() {
  const zoneMat = new THREE.MeshBasicMaterial({ visible: false });

  // 7 Belo — left side (x ≈ −6.8)
  const seteZone = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 8), zoneMat);
  seteZone.position.set(-6.8, 2.5, 0);
  seteZone.userData = { boothId: 'sete', name: '7 Belo' };
  scene.add(seteZone);
  boothGroups.sete = seteZone;

  // Paçoca do Amor — center (x ≈ 0)
  const pacocaZone = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 8), zoneMat);
  pacocaZone.position.set(0, 2.5, 0);
  pacocaZone.userData = { boothId: 'pacoca', name: 'Paçoca do Amor' };
  scene.add(pacocaZone);
  boothGroups.pacoca = pacocaZone;

  // Poosh! — right side (x ≈ 6.8)
  const pooshZone = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 8), zoneMat);
  pooshZone.position.set(6.8, 2.5, 0);
  pooshZone.userData = { boothId: 'poosh', name: 'Poosh!' };
  scene.add(pooshZone);
  boothGroups.poosh = pooshZone;
}

// ────────────────────────────────────────────────────────────────
//  FLOOR
// ────────────────────────────────────────────────────────────────
function buildFloor() {
  // Main event floor — polished dark
  const floorGeo = new THREE.PlaneGeometry(SPACE_W, SPACE_D, 1, 1);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x18182e,
    roughness: 0.4,
    metalness: 0.15,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.32;
  floor.receiveShadow = true;
  scene.add(floor);

  // Extended surroundings (shopping corridor)
  const surroundGeo = new THREE.PlaneGeometry(80, 80);
  const surroundMat = new THREE.MeshStandardMaterial({ color: 0x0d0d1a, roughness: 1 });
  const surround = new THREE.Mesh(surroundGeo, surroundMat);
  surround.rotation.x = -Math.PI / 2;
  surround.position.y = -0.33;
  surround.receiveShadow = true;
  scene.add(surround);

  // Floor border glow strip
  const stripGeo = new THREE.PlaneGeometry(SPACE_W + 0.1, SPACE_D + 0.1);
  const stripMat = new THREE.MeshBasicMaterial({ color: 0x2233aa, transparent: true, opacity: 0.12 });
  const strip = new THREE.Mesh(stripGeo, stripMat);
  strip.rotation.x = -Math.PI / 2;
  strip.position.y = -0.31;
  scene.add(strip);

  // Zone color overlays on floor (subtle colored areas for each booth)
  const zoneAlpha = 0.08;
  // 7 Belo zone (left)
  addFloorZone(-6.8, 0, 7, 8, 0xff6b9d, zoneAlpha);
  // Paçoca zone (center)
  addFloorZone(0, 0, 7, 8, 0xd4a855, zoneAlpha);
  // Poosh zone (right)
  addFloorZone(6.8, 0, 7, 8, 0x00e5ff, zoneAlpha);

  // Walkway center line
  const walkGeo = new THREE.PlaneGeometry(SPACE_W + 6, 1.5);
  const walkMat = new THREE.MeshBasicMaterial({ color: 0x222244, transparent: true, opacity: 0.15 });
  const walk = new THREE.Mesh(walkGeo, walkMat);
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(0, -0.305, 0);
  scene.add(walk);
}

function addFloorZone(x, z, w, d, color, opacity) {
  const geo = new THREE.PlaneGeometry(w, d);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, -0.3, z);
  scene.add(mesh);
}

// ────────────────────────────────────────────────────────────────
//  WALLS
// ────────────────────────────────────────────────────────────────
function buildWalls() {
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x14142a,
    roughness: 0.85,
    metalness: 0.05,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });

  // Back wall (z = -SPACE_D/2)
  addWall(SPACE_W, WALL_H, 0, WALL_H / 2 - 0.32, -SPACE_D / 2, 0, wallMat);
  // Left wall (x = -SPACE_W/2)
  addWall(SPACE_D, WALL_H, -SPACE_W / 2, WALL_H / 2 - 0.32, 0, Math.PI / 2, wallMat);
  // Right wall (x = SPACE_W/2)
  addWall(SPACE_D, WALL_H, SPACE_W / 2, WALL_H / 2 - 0.32, 0, -Math.PI / 2, wallMat);

  // Front wall with entrance opening (two panels)
  const frontPanelW = (SPACE_W - ENTRANCE_W) / 2;
  // Left panel
  addWall(frontPanelW, WALL_H, -SPACE_W / 2 + frontPanelW / 2, WALL_H / 2 - 0.32, SPACE_D / 2, Math.PI, wallMat);
  // Right panel
  addWall(frontPanelW, WALL_H, SPACE_W / 2 - frontPanelW / 2, WALL_H / 2 - 0.32, SPACE_D / 2, Math.PI, wallMat);
  // Lintel above entrance
  addWall(ENTRANCE_W, 1, 0, WALL_H - 0.82, SPACE_D / 2, Math.PI, wallMat);

  // Wall edge glow strips (neon at floor level)
  const neonMat = new THREE.MeshBasicMaterial({ color: 0x4455cc, transparent: true, opacity: 0.4 });
  // Back
  scene.add(makeBar(SPACE_W, 0.03, 0.03, 0, -0.28, -SPACE_D / 2 + 0.02, neonMat));
  // Left
  scene.add(makeBar(0.03, 0.03, SPACE_D, -SPACE_W / 2 + 0.02, -0.28, 0, neonMat));
  // Right
  scene.add(makeBar(0.03, 0.03, SPACE_D, SPACE_W / 2 - 0.02, -0.28, 0, neonMat));
}

function addWall(w, h, x, y, z, rotY, mat) {
  const geo = new THREE.PlaneGeometry(w, h);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  scene.add(mesh);
}

function makeBar(w, h, d, x, y, z, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  return mesh;
}

// ────────────────────────────────────────────────────────────────
//  CEILING (semi-transparent)
// ────────────────────────────────────────────────────────────────
function buildCeiling() {
  // Main ceiling (partially transparent for light)
  const ceilGeo = new THREE.PlaneGeometry(SPACE_W, SPACE_D);
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x111125,
    roughness: 0.9,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
  });
  const ceil = new THREE.Mesh(ceilGeo, ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = WALL_H - 0.32;
  scene.add(ceil);

  // Ceiling beams (structural)
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x222240, roughness: 0.7, metalness: 0.3 });
  for (let i = -2; i <= 2; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, SPACE_D), beamMat);
    beam.position.set(i * (SPACE_W / 5), WALL_H - 0.5, 0);
    beam.castShadow = true;
    scene.add(beam);
  }
  // Cross beams
  for (let j = -1; j <= 1; j++) {
    const cBeam = new THREE.Mesh(new THREE.BoxGeometry(SPACE_W, 0.2, 0.2), beamMat);
    cBeam.position.set(0, WALL_H - 0.55, j * (SPACE_D / 3));
    scene.add(cBeam);
  }

  // Skylight (glass panels in ceiling center)
  const skyGeo = new THREE.PlaneGeometry(6, 4);
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.15 });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.rotation.x = Math.PI / 2;
  sky.position.y = WALL_H - 0.28;
  scene.add(sky);
}

// ────────────────────────────────────────────────────────────────
//  ENTRANCE (front — decorated arch)
// ────────────────────────────────────────────────────────────────
function buildEntrance() {
  const archMat = new THREE.MeshStandardMaterial({ color: 0x2a2a50, roughness: 0.5, metalness: 0.3 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xc8ff32, roughness: 0.3, metalness: 0.5, emissive: 0xc8ff32, emissiveIntensity: 0.2 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a855, roughness: 0.25, metalness: 0.7 });

  const ez = SPACE_D / 2;

  // ── Pillar left ──
  const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.5, WALL_H, 0.5), archMat);
  pillarL.position.set(-ENTRANCE_W / 2, WALL_H / 2 - 0.32, ez);
  pillarL.castShadow = true;
  scene.add(pillarL);

  // ── Pillar right ──
  const pillarR = pillarL.clone();
  pillarR.position.x = ENTRANCE_W / 2;
  scene.add(pillarR);

  // ── Top beam ──
  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(ENTRANCE_W + 0.5, 0.4, 0.5), archMat);
  topBeam.position.set(0, WALL_H - 0.52, ez);
  topBeam.castShadow = true;
  scene.add(topBeam);

  // ── ARCOR sign (3D extruded text replacement — glowing box) ──
  const signMat = new THREE.MeshStandardMaterial({ color: 0xc8ff32, roughness: 0.3, metalness: 0.5, emissive: 0xc8ff32, emissiveIntensity: 0.15, transparent: true, opacity: 0.85, side: THREE.FrontSide });
  const signBody = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.04), signMat);
  signBody.position.set(0, WALL_H - 0.95, ez + 0.35);
  scene.add(signBody);

  // ── Decorative arch (half torus) ──
  const archGeo = new THREE.TorusGeometry(ENTRANCE_W / 2 + 0.1, 0.1, 8, 24, Math.PI);
  const arch = new THREE.Mesh(archGeo, goldMat);
  arch.position.set(0, WALL_H - 0.72, ez + 0.1);
  arch.rotation.z = Math.PI;
  scene.add(arch);

  // ── Decorative columns on pillars (ornamental cylinders) ──
  for (const side of [-1, 1]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, WALL_H - 0.5, 12), goldMat);
    col.position.set(side * (ENTRANCE_W / 2 + 0.35), WALL_H / 2 - 0.32, ez + 0.1);
    scene.add(col);

    // Column caps
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), goldMat);
    cap.position.set(side * (ENTRANCE_W / 2 + 0.35), WALL_H - 0.62, ez + 0.1);
    scene.add(cap);

    // Column base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.2, 12), goldMat);
    base.position.set(side * (ENTRANCE_W / 2 + 0.35), -0.22, ez + 0.1);
    scene.add(base);
  }

  // ── Velvet rope stanchions at entrance ──
  const stanchionMat = new THREE.MeshStandardMaterial({ color: 0xaa8833, roughness: 0.3, metalness: 0.7 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xcc0033, roughness: 0.7 });
  for (const side of [-1, 1]) {
    // Stanchion post
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1, 8), stanchionMat);
    post.position.set(side * 1.8, 0.18, ez + 1.5);
    post.castShadow = true;
    scene.add(post);
    // Top ball
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), stanchionMat);
    ball.position.set(side * 1.8, 0.73, ez + 1.5);
    scene.add(ball);
    // Base disk
    const baseDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12), stanchionMat);
    baseDisk.position.set(side * 1.8, -0.3, ez + 1.5);
    scene.add(baseDisk);
  }
  // Rope between stanchions
  const ropePath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.8, 0.6, ez + 1.5),
    new THREE.Vector3(0, 0.4, ez + 1.5),
    new THREE.Vector3(1.8, 0.6, ez + 1.5),
  ]);
  const ropeGeo = new THREE.TubeGeometry(ropePath, 20, 0.025, 6, false);
  const rope = new THREE.Mesh(ropeGeo, ropeMat);
  scene.add(rope);

  // ── Floor mat / carpet at entrance ──
  const carpetGeo = new THREE.BoxGeometry(ENTRANCE_W - 0.5, 0.02, 2);
  const carpetMat = new THREE.MeshStandardMaterial({ color: 0x991122, roughness: 0.8 });
  const carpet = new THREE.Mesh(carpetGeo, carpetMat);
  carpet.position.set(0, -0.3, ez + 0.5);
  scene.add(carpet);

  // ── Spotlights illuminating entrance ──
  const spot1 = new THREE.SpotLight(0xffffff, 2, 15, Math.PI / 8, 0.5, 1);
  spot1.position.set(-2, WALL_H, ez + 1);
  spot1.target.position.set(0, 0, ez);
  scene.add(spot1);
  scene.add(spot1.target);

  const spot2 = new THREE.SpotLight(0xffffff, 2, 15, Math.PI / 8, 0.5, 1);
  spot2.position.set(2, WALL_H, ez + 1);
  spot2.target.position.set(0, 0, ez);
  scene.add(spot2);
  scene.add(spot2.target);

  // ── Welcome sign / banner above entrance ──
  const bannerMat = new THREE.MeshStandardMaterial({ color: 0x1a1a35, roughness: 0.6, metalness: 0.2 });
  const banner = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 0.06), bannerMat);
  banner.position.set(0, WALL_H + 0.3, ez + 0.1);
  scene.add(banner);

  // Star decorations on the banner
  for (let i = -2; i <= 2; i++) {
    const star = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.1, 0),
      new THREE.MeshStandardMaterial({ color: 0xc8ff32, emissive: 0xc8ff32, emissiveIntensity: 0.5 })
    );
    star.position.set(i * 1, WALL_H + 0.3, ez + 0.15);
    scene.add(star);
  }
}

// ────────────────────────────────────────────────────────────────
//  EXIT (back wall — simpler but still decorated)
// ────────────────────────────────────────────────────────────────
function buildExit() {
  const exitMat = new THREE.MeshStandardMaterial({ color: 0x222240, roughness: 0.6, metalness: 0.2 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff4466, transparent: true, opacity: 0.6 });

  // Exit door frame (center of back wall)
  const exitW = 3;
  const exitH = 3;
  const ez = -SPACE_D / 2;

  // Frame
  const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.2, exitH, 0.2), exitMat);
  frameL.position.set(-exitW / 2, exitH / 2 - 0.32, ez - 0.1);
  scene.add(frameL);

  const frameR = frameL.clone();
  frameR.position.x = exitW / 2;
  scene.add(frameR);

  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(exitW + 0.2, 0.2, 0.2), exitMat);
  frameTop.position.set(0, exitH - 0.22, ez - 0.1);
  scene.add(frameTop);

  // EXIT sign (glowing)
  const exitSign = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.05), glowMat);
  exitSign.position.set(0, exitH + 0.1, ez - 0.15);
  scene.add(exitSign);

  // Arrow on floor pointing to exit
  for (let i = 0; i < 3; i++) {
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.4, 3),
      new THREE.MeshBasicMaterial({ color: 0xff4466, transparent: true, opacity: 0.3 })
    );
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(0, -0.28, ez + 1 + i * 1.2);
    scene.add(arrow);
  }
}

// ────────────────────────────────────────────────────────────────
//  CORRIDOR ELEMENTS (shopping context)
// ────────────────────────────────────────────────────────────────
function buildCorridorElements() {
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x252545, roughness: 0.5, metalness: 0.3 });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x333355, roughness: 0.6 });

  // ── Shopping pillars along the sides ──
  for (let i = -1; i <= 1; i += 2) {
    for (let j = -1; j <= 1; j++) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, WALL_H, 12), pillarMat);
      pillar.position.set(i * (SPACE_W / 2 - 0.3), WALL_H / 2 - 0.32, j * (SPACE_D / 3));
      pillar.castShadow = true;
      scene.add(pillar);
    }
  }

  // ── Benches outside entrance ──
  for (const side of [-1, 1]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.15, 0.6), benchMat);
    seat.position.set(side * 5, 0.1, SPACE_D / 2 + 2.5);
    scene.add(seat);
    // Legs
    for (const lx of [-0.8, 0.8]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.5), benchMat);
      leg.position.set(side * 5 + lx, -0.1, SPACE_D / 2 + 2.5);
      scene.add(leg);
    }
  }

  // ── Planters / decorative vases ──
  const potMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.7 });
  const plantMat = new THREE.MeshStandardMaterial({ color: 0x228833, roughness: 0.6 });
  for (const pos of [[-SPACE_W / 2 + 1, SPACE_D / 2 + 1], [SPACE_W / 2 - 1, SPACE_D / 2 + 1]]) {
    // Pot
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.5, 8), potMat);
    pot.position.set(pos[0], -0.05, pos[1]);
    scene.add(pot);
    // Plant (sphere + cone)
    const plant = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), plantMat);
    plant.position.set(pos[0], 0.45, pos[1]);
    scene.add(plant);
  }

  // ── Info kiosk at center entrance ──
  const kioskMat = new THREE.MeshStandardMaterial({ color: 0x2a2a4a, roughness: 0.5, metalness: 0.3 });
  const kiosk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1, 12), kioskMat);
  kiosk.position.set(0, 0.18, SPACE_D / 2 + 2);
  kiosk.castShadow = true;
  scene.add(kiosk);

  // Screen on kiosk
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x00ccff,
    emissive: 0x00aacc,
    emissiveIntensity: 0.4,
    roughness: 0.2,
  });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.04), screenMat);
  screen.position.set(0, 0.9, SPACE_D / 2 + 2.15);
  screen.rotation.x = -0.25;
  scene.add(screen);

  // ── Waste bins ──
  const binMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.6 });
  for (const bx of [-4, 4]) {
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.5, 8), binMat);
    bin.position.set(bx, -0.05, SPACE_D / 2 + 1.5);
    scene.add(bin);
  }
}

// ────────────────────────────────────────────────────────────────
//  GRID + MEASURE LINES
// ────────────────────────────────────────────────────────────────
function buildGrid() {
  gridHelper = new THREE.GridHelper(40, 40, 0x222244, 0x181830);
  gridHelper.position.y = -0.31;
  scene.add(gridHelper);
}

function buildMeasureLines() {
  measureGroup = new THREE.Group();
  measureGroup.visible = showMeasures;

  const lineMat = new THREE.LineBasicMaterial({ color: 0xc8ff32, transparent: true, opacity: 0.6 });
  const tickMat = new THREE.MeshBasicMaterial({ color: 0xc8ff32, transparent: true, opacity: 0.6 });

  // Width measurement (20m along x at front)
  const wPoints = [
    new THREE.Vector3(-SPACE_W / 2, 0, SPACE_D / 2 + 0.5),
    new THREE.Vector3(SPACE_W / 2, 0, SPACE_D / 2 + 0.5),
  ];
  measureGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wPoints), lineMat));

  // Depth measurement (10m along z at right)
  const dPoints = [
    new THREE.Vector3(SPACE_W / 2 + 0.5, 0, -SPACE_D / 2),
    new THREE.Vector3(SPACE_W / 2 + 0.5, 0, SPACE_D / 2),
  ];
  measureGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(dPoints), lineMat));

  // Tick marks every meter
  for (let i = 0; i <= SPACE_W; i++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.02), tickMat);
    tick.position.set(-SPACE_W / 2 + i, 0, SPACE_D / 2 + 0.5);
    measureGroup.add(tick);
  }
  for (let i = 0; i <= SPACE_D; i++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.02), tickMat);
    tick.position.set(SPACE_W / 2 + 0.5, 0, -SPACE_D / 2 + i);
    measureGroup.add(tick);
  }

  scene.add(measureGroup);
}

// ────────────────────────────────────────────────────────────────
//  LIGHTS
// ────────────────────────────────────────────────────────────────
function buildLights() {
  // Hemisphere (sky + ground bounce)
  const hemi = new THREE.HemisphereLight(0x9999cc, 0x222233, 0.6);
  scene.add(hemi);

  // Key directional light (warm from above-front)
  const keyLight = new THREE.DirectionalLight(0xfff1d4, 2);
  keyLight.position.set(-3, 14, 10);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  Object.assign(keyLight.shadow.camera, { left: -15, right: 15, top: 12, bottom: -12, near: 1, far: 40 });
  keyLight.shadow.normalBias = 0.025;
  keyLight.shadow.bias = -0.0001;
  keyLight.shadow.radius = 2;
  scene.add(keyLight);

  // Fill lights
  const fill1 = new THREE.DirectionalLight(0xb8dfff, 0.8);
  fill1.position.set(8, 7, -6);
  scene.add(fill1);

  const fill2 = new THREE.DirectionalLight(0xffffff, 0.5);
  fill2.position.set(-12, 4, 2);
  scene.add(fill2);

  // Ambient for dark areas
  const ambient = new THREE.AmbientLight(0x303050, 0.3);
  scene.add(ambient);

  // Entrance point light
  const entPt = new THREE.PointLight(0xffffff, 1, 15);
  entPt.position.set(0, 4, SPACE_D / 2 + 1);
  scene.add(entPt);

  // Booth accent lights (colored)
  const pacLight = new THREE.PointLight(0xffd700, 0.8, 10);
  pacLight.position.set(0, 4, 0);
  scene.add(pacLight);

  const seteLight = new THREE.PointLight(0xff6b9d, 0.6, 10);
  seteLight.position.set(-7, 4, 0);
  scene.add(seteLight);

  const pooshLight = new THREE.PointLight(0x00e5ff, 0.6, 10);
  pooshLight.position.set(7, 4, 0);
  scene.add(pooshLight);
}

// ────────────────────────────────────────────────────────────────
//  LABELS (HTML overlay positioned from 3D coords)
// ────────────────────────────────────────────────────────────────
function createLabels() {
  const overlay = document.getElementById('labels-overlay');
  const labels = [
    { text: 'PAÇOCA DO AMOR', pos: new THREE.Vector3(0, 4.5, 0), cls: 'pacoca' },
    { text: '7 BELO', pos: new THREE.Vector3(-6.8, 4.5, 0), cls: 'sete-belo' },
    { text: 'POOSH!', pos: new THREE.Vector3(6.8, 4.5, 0), cls: 'poosh' },
    { text: 'ENTRADA', pos: new THREE.Vector3(0, WALL_H + 0.8, SPACE_D / 2 + 0.5), cls: 'entrada' },
    { text: 'SAÍDA', pos: new THREE.Vector3(0, 3.5, -SPACE_D / 2 - 0.3), cls: 'saida' },
    { text: '20m (largura)', pos: new THREE.Vector3(0, 0, SPACE_D / 2 + 1.2), cls: 'dim' },
    { text: '10m (prof.)', pos: new THREE.Vector3(SPACE_W / 2 + 1.2, 0, 0), cls: 'dim' },
  ];

  labels.forEach(l => {
    const el = document.createElement('div');
    el.className = 'label-3d ' + l.cls;
    el.textContent = l.text;
    overlay.appendChild(el);
    labelEls.push({ el, pos: l.pos });
  });
}

function updateLabels() {
  const w2 = window.innerWidth / 2;
  const h2 = window.innerHeight / 2;
  for (const { el, pos } of labelEls) {
    if (!showLabels) { el.style.opacity = '0'; continue; }
    const v = pos.clone().project(camera);
    if (v.z > 1) { el.style.opacity = '0'; continue; }
    el.style.left = (v.x * w2 + w2) + 'px';
    el.style.top = (-v.y * h2 + h2) + 'px';
    el.style.opacity = '1';
  }
}

// ────────────────────────────────────────────────────────────────
//  CAMERA ANIMATION
// ────────────────────────────────────────────────────────────────
function animateCamera(view) {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const endPos = new THREE.Vector3(...view.pos);
  const endTarget = new THREE.Vector3(...view.target);
  const dur = 1200;
  const t0 = performance.now();

  function step(now) {
    const t = Math.min((now - t0) / dur, 1);
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    camera.position.lerpVectors(startPos, endPos, e);
    controls.target.lerpVectors(startTarget, endTarget, e);
    controls.update();
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ────────────────────────────────────────────────────────────────
//  INFO PANEL
// ────────────────────────────────────────────────────────────────
function openInfoPanel(id) {
  const d = BOOTH_DATA[id];
  if (!d) return;
  const panel = document.getElementById('info-panel');
  const content = document.getElementById('info-content');
  panel.setAttribute('data-brand', id);
  content.innerHTML = `
    <div class="info-body">
      <p class="info-eyebrow">${d.eyebrow}</p>
      <h3 class="info-title" style="color:${d.color}">${d.name}</h3>
      <p class="info-desc">${d.desc}</p>
      <div class="info-stats">
        <div class="info-stat"><div class="info-stat-value" style="color:${d.color}">${d.area}</div><div class="info-stat-label">Área</div></div>
        <div class="info-stat"><div class="info-stat-value" style="color:${d.color}">${d.formato}</div><div class="info-stat-label">Formato</div></div>
        <div class="info-stat"><div class="info-stat-value" style="color:${d.color}">${d.iluminacao}</div><div class="info-stat-label">Iluminação</div></div>
        <div class="info-stat"><div class="info-stat-value" style="color:${d.color}">${d.material}</div><div class="info-stat-label">Material</div></div>
      </div>
      <ul class="info-features">
        ${d.features.map(f => `<li>${f}</li>`).join('')}
      </ul>
    </div>
  `;
  panel.classList.remove('hidden');
  requestAnimationFrame(() => panel.classList.add('visible'));
}

function closeInfoPanel() {
  const panel = document.getElementById('info-panel');
  panel.classList.remove('visible');
  setTimeout(() => panel.classList.add('hidden'), 400);
}

// ────────────────────────────────────────────────────────────────
//  INTERACTION (raycast on booth zones)
// ────────────────────────────────────────────────────────────────
function setupInteraction() {
  const canvas = renderer.domElement;
  const boothMeshes = Object.values(boothGroups);

  canvas.addEventListener('mousemove', e => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(boothMeshes, false);
    if (hits.length > 0) {
      const obj = hits[0].object;
      if (hoveredBooth !== obj) {
        hoveredBooth = obj;
        canvas.style.cursor = 'pointer';
        tooltipEl.textContent = obj.userData.name + ' — clique para detalhes';
        tooltipEl.classList.add('visible');
      }
      tooltipEl.style.left = e.clientX + 'px';
      tooltipEl.style.top = e.clientY + 'px';
    } else if (hoveredBooth) {
      hoveredBooth = null;
      canvas.style.cursor = 'default';
      tooltipEl.classList.remove('visible');
    }
  });

  canvas.addEventListener('click', e => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(boothMeshes, false);
    if (hits.length > 0) {
      const id = hits[0].object.userData.boothId;
      selectBooth(id);
    }
  });

  // Touch support
  canvas.addEventListener('touchend', e => {
    if (e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    mouse.x = (t.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(t.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(boothMeshes, false);
    if (hits.length > 0) {
      const id = hits[0].object.userData.boothId;
      selectBooth(id);
    }
  }, { passive: true });
}

function selectBooth(id) {
  if (!VIEWS[id]) return;
  animateCamera(VIEWS[id]);
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`[data-view="${id}"]`);
  if (btn) btn.classList.add('active');
  openInfoPanel(id);
}

// ────────────────────────────────────────────────────────────────
//  UI SETUP
// ────────────────────────────────────────────────────────────────
function setupUI() {
  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      animateCamera(VIEWS[view]);
      if (view !== 'all') openInfoPanel(view); else closeInfoPanel();
    });
  });

  // Zoom
  document.getElementById('zoom-in').addEventListener('click', () => {
    const dir = new THREE.Vector3().subVectors(controls.target, camera.position).normalize();
    camera.position.addScaledVector(dir, 2);
    controls.update();
  });
  document.getElementById('zoom-out').addEventListener('click', () => {
    const dir = new THREE.Vector3().subVectors(controls.target, camera.position).normalize();
    camera.position.addScaledVector(dir, -2);
    controls.update();
  });
  document.getElementById('zoom-reset').addEventListener('click', () => {
    animateCamera(VIEWS.all);
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-overview').classList.add('active');
    closeInfoPanel();
  });

  // Auto-rotate
  document.getElementById('btn-rotate').addEventListener('click', function () {
    autoRotate = !autoRotate;
    controls.autoRotate = autoRotate;
    this.classList.toggle('active', autoRotate);
  });

  // Grid
  document.getElementById('btn-grid').addEventListener('click', function () {
    showGrid = !showGrid;
    if (gridHelper) gridHelper.visible = showGrid;
    this.classList.toggle('active', showGrid);
  });

  // Labels
  document.getElementById('btn-labels').addEventListener('click', function () {
    showLabels = !showLabels;
    this.classList.toggle('active', showLabels);
  });

  // Measures
  document.getElementById('btn-measure').addEventListener('click', function () {
    showMeasures = !showMeasures;
    if (measureGroup) measureGroup.visible = showMeasures;
    this.classList.toggle('active', showMeasures);
  });

  // Close info panel
  document.getElementById('info-close').addEventListener('click', closeInfoPanel);
}

// ────────────────────────────────────────────────────────────────
//  ANIMATION LOOP
// ────────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateLabels();
  renderer.render(scene, camera);
}

// ────────────────────────────────────────────────────────────────
//  START
// ────────────────────────────────────────────────────────────────
init();
