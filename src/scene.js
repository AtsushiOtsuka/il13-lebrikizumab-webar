import * as THREE from "three";
import { AR_STATES, COLORS } from "./states.js";

const LAYOUT = Object.freeze({
  upperLeafletY: 0.065,
  lowerLeafletY: -0.065,
  alpha1: [-0.23, 0, 0.02],
  il4raSignal: [0.18, 0, 0.02],
  decoy: [-0.72, 0, 0.02],
  ligand: [-0.23, 0.45, 0.1],
  decoyLigand: [-0.72, 0.42, 0.1],
  nucleus: [0.07, -0.67, 0.08],
  stat6Emitter: [-0.02, -0.2, 0.12],
});

const tmpVecA = new THREE.Vector3();
const tmpVecB = new THREE.Vector3();
const tmpVecC = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const yAxis = new THREE.Vector3(0, 1, 0);

export function createEducationScene() {
  const root = new THREE.Group();
  root.name = "IL13LebrikizumabEducationScene";
  root.visible = false;
  root.scale.setScalar(0.82);
  root.rotation.x = -0.2;

  const parts = {};
  const current = createMutableState(AR_STATES.signal);
  const target = createMutableState(AR_STATES.signal);
  let stat6Accumulator = 0;
  let nucleusPulse = 0;

  parts.shadow = createSoftShadow();
  parts.membrane = createLipidBilayer();
  parts.alpha1 = createReceptor("IL-13Rα1", COLORS.il13rAlpha1, {
    radius: 0.058,
    extracellularHeight: 0.34,
  });
  parts.il4ra = createReceptor("IL-4Rα", COLORS.il4rAlpha, {
    radius: 0.052,
    extracellularHeight: 0.31,
  });
  parts.decoy = createReceptor("IL-13Rα2", COLORS.decoy, {
    radius: 0.048,
    extracellularHeight: 0.29,
    decoy: true,
  });
  parts.ligand = createLigand("IL-13", COLORS.il13, 1);
  parts.decoyLigand = createLigand("IL-13", COLORS.il13, 0.82);
  parts.antibody = createAntibody();
  parts.blockade = createBlockade();
  parts.dimerBridge = createDimerBridge();
  parts.stat6 = createStat6Flow(22);
  parts.nucleus = createNucleus();
  parts.labels = createSceneLabels();

  parts.alpha1.position.set(...LAYOUT.alpha1);
  parts.il4ra.position.set(...LAYOUT.il4raSignal);
  parts.decoy.position.set(...LAYOUT.decoy);
  parts.ligand.position.set(...LAYOUT.ligand);
  parts.decoyLigand.position.set(...LAYOUT.decoyLigand);
  parts.antibody.position.set(...AR_STATES.signal.antibody.position);
  parts.blockade.position.set(-0.02, 0.43, 0.16);
  parts.nucleus.group.position.set(...LAYOUT.nucleus);

  root.add(
    parts.shadow,
    parts.membrane,
    parts.decoy,
    parts.alpha1,
    parts.il4ra,
    parts.dimerBridge,
    parts.ligand,
    parts.decoyLigand,
    parts.antibody,
    parts.blockade,
    parts.stat6.group,
    parts.nucleus.group,
    parts.labels.group,
  );

  applyState(1, 0, 0);

  return {
    root,
    setVisible(isVisible) {
      root.visible = isVisible;
    },
    setState(stateKey) {
      const next = AR_STATES[stateKey];
      if (!next) {
        return;
      }
      writeState(target, next);
    },
    update(deltaSeconds, elapsedSeconds) {
      const ease = 1 - Math.exp(-deltaSeconds * 4.6);
      applyState(ease, deltaSeconds, elapsedSeconds);
      animateIdle(elapsedSeconds);
    },
  };

  function applyState(ease, deltaSeconds, elapsedSeconds) {
    lerpVec(current.il4ra.position, target.il4ra.position, ease);
    current.il4ra.opacity = lerp(current.il4ra.opacity, target.il4ra.opacity, ease);
    current.il4ra.contact = lerp(current.il4ra.contact, target.il4ra.contact, ease);
    lerpVec(current.antibody.position, target.antibody.position, ease);
    current.antibody.opacity = lerp(current.antibody.opacity, target.antibody.opacity, ease);
    current.antibody.scale = lerp(current.antibody.scale, target.antibody.scale, ease);
    current.antibody.rotationZ = lerp(current.antibody.rotationZ, target.antibody.rotationZ, ease);
    current.dimer.opacity = lerp(current.dimer.opacity, target.dimer.opacity, ease);
    current.dimer.glow = lerp(current.dimer.glow, target.dimer.glow, ease);
    current.blockade.opacity = lerp(current.blockade.opacity, target.blockade.opacity, ease);
    current.blockade.scale = lerp(current.blockade.scale, target.blockade.scale, ease);
    current.stat6.generation = lerp(current.stat6.generation, target.stat6.generation, ease);
    current.stat6.opacity = lerp(current.stat6.opacity, target.stat6.opacity, ease);
    current.stat6.glow = lerp(current.stat6.glow, target.stat6.glow, ease);
    current.nucleus.glow = lerp(current.nucleus.glow, target.nucleus.glow, ease);
    current.decoy.ligandOpacity = lerp(
      current.decoy.ligandOpacity,
      target.decoy.ligandOpacity,
      ease,
    );
    current.decoy.haloOpacity = lerp(current.decoy.haloOpacity, target.decoy.haloOpacity, ease);

    parts.il4ra.position.copy(current.il4ra.position);
    setGroupOpacity(parts.il4ra, current.il4ra.opacity);
    parts.labels.il4ra.position.x = current.il4ra.position.x;
    setReceptorContact(parts.alpha1, 0.85 + current.dimer.glow * 0.45);
    setReceptorContact(parts.il4ra, 0.45 + current.dimer.glow * 0.45);
    updateDimerBridge(current.dimer, current.il4ra.contact);

    parts.antibody.position.copy(current.antibody.position);
    parts.antibody.scale.setScalar(current.antibody.scale);
    parts.antibody.rotation.z = current.antibody.rotationZ + Math.sin(elapsedSeconds * 0.9) * 0.04;
    parts.labels.antibody.position.x = current.antibody.position.x + 0.12;
    parts.labels.antibody.position.y = current.antibody.position.y + 0.24;
    setGroupOpacity(parts.antibody, current.antibody.opacity);
    setGroupOpacity(parts.labels.antibody, current.antibody.opacity);

    parts.blockade.scale.setScalar(current.blockade.scale);
    setGroupOpacity(parts.blockade, current.blockade.opacity);
    setGroupOpacity(parts.decoyLigand, current.decoy.ligandOpacity);
    setMaterialOpacity(parts.decoy.halo.material, current.decoy.haloOpacity);

    updateStat6Flow(deltaSeconds, elapsedSeconds);
    updateNucleus(deltaSeconds, elapsedSeconds);
  }

  function animateIdle(elapsedSeconds) {
    const ligandDrift = Math.sin(elapsedSeconds * 2.1) * 0.012;
    parts.ligand.position.y = LAYOUT.ligand[1] + ligandDrift;
    parts.ligand.rotation.y = elapsedSeconds * 0.32;
    parts.ligand.rotation.z = Math.sin(elapsedSeconds * 1.3) * 0.08;

    parts.decoyLigand.position.y = LAYOUT.decoyLigand[1] + Math.sin(elapsedSeconds * 1.7 + 0.9) * 0.008;
    parts.decoyLigand.rotation.y = -elapsedSeconds * 0.22;
    parts.decoy.halo.rotation.z = elapsedSeconds * 0.85;

    const receptorBreath = 1 + Math.sin(elapsedSeconds * 1.8) * 0.012;
    parts.alpha1.scale.setScalar(receptorBreath);
    parts.il4ra.scale.setScalar(1 + Math.sin(elapsedSeconds * 1.65 + 0.6) * 0.01);
    parts.decoy.scale.setScalar(1 + Math.sin(elapsedSeconds * 1.4 + 1.2) * 0.008);

    parts.antibody.rotation.y = Math.sin(elapsedSeconds * 0.72) * 0.18 * current.antibody.opacity;
    parts.blockade.rotation.z = Math.sin(elapsedSeconds * 1.15) * 0.08;
  }

  function updateDimerBridge(dimer, contact) {
    tmpVecA.set(LAYOUT.alpha1[0] + 0.09, 0.35, 0.1);
    tmpVecB.set(current.il4ra.position.x - 0.08, 0.34, 0.1);
    setCapsuleBetween(parts.dimerBridge.bridge, tmpVecA, tmpVecB);
    parts.dimerBridge.bridge.scale.x = 1 + contact * 0.3;
    parts.dimerBridge.bridge.scale.z = 1 + contact * 0.3;
    setMaterialOpacity(parts.dimerBridge.bridge.material, dimer.opacity * 0.9);
    parts.dimerBridge.bridge.material.emissiveIntensity = 0.2 + dimer.glow * 0.7;
    setMaterialOpacity(parts.dimerBridge.halo.material, dimer.opacity * 0.52);
    parts.dimerBridge.halo.position.lerpVectors(tmpVecA, tmpVecB, 0.5);
  }

  function updateStat6Flow(deltaSeconds, elapsedSeconds) {
    if (current.stat6.generation > 0.08) {
      stat6Accumulator += deltaSeconds * current.stat6.generation * 9.5;
      while (stat6Accumulator >= 1) {
        spawnStat6Particle(parts.stat6);
        stat6Accumulator -= 1;
      }
    } else {
      stat6Accumulator = Math.min(stat6Accumulator, 0.4);
    }

    parts.stat6.particles.forEach((particle) => {
      if (!particle.active) {
        return;
      }
      particle.age += deltaSeconds;
      const t = particle.age / particle.duration;
      if (t >= 1) {
        particle.active = false;
        particle.group.visible = false;
        return;
      }

      const eased = easeInOutCubic(t);
      const arc = Math.sin(Math.PI * eased);
      const x = lerpNumber(LAYOUT.stat6Emitter[0], LAYOUT.nucleus[0] + particle.offsetX, eased) + arc * 0.1;
      const y = lerpNumber(LAYOUT.stat6Emitter[1], LAYOUT.nucleus[1] + particle.offsetY, eased);
      const z =
        lerpNumber(LAYOUT.stat6Emitter[2], LAYOUT.nucleus[2] + particle.offsetZ, eased) +
        Math.sin(elapsedSeconds * 3.4 + particle.phase) * 0.012;

      particle.group.visible = true;
      particle.group.position.set(x, y, z);
      const edgeFade = Math.min(1, t * 8, (1 - t) * 5);
      const opacity = edgeFade * (0.16 + current.stat6.opacity * 0.84);
      setMaterialOpacity(particle.mesh.material, opacity);
      setMaterialOpacity(particle.halo.material, opacity * current.stat6.glow * 0.75);
      particle.mesh.material.emissiveIntensity = 0.35 + current.stat6.glow * 0.8;
      particle.group.scale.setScalar(0.8 + arc * 0.65);

      if (t > 0.88 && !particle.arrived) {
        particle.arrived = true;
        nucleusPulse = Math.min(1.45, nucleusPulse + 0.45 * current.stat6.glow);
      }
    });
  }

  function updateNucleus(deltaSeconds, elapsedSeconds) {
    nucleusPulse = Math.max(0, nucleusPulse - deltaSeconds * 1.9);
    const pulse = (0.64 + Math.sin(elapsedSeconds * 2.8) * 0.18 + nucleusPulse) * current.nucleus.glow;
    parts.nucleus.shell.material.emissiveIntensity = 0.05 + pulse * 0.85;
    parts.nucleus.core.material.emissiveIntensity = 0.08 + pulse * 1.2;
    setMaterialOpacity(parts.nucleus.halo.material, THREE.MathUtils.clamp(pulse * 0.36, 0.04, 0.62));
    parts.nucleus.halo.scale.setScalar(0.62 + pulse * 0.16);
  }
}

export function createSceneLights() {
  const ambient = new THREE.HemisphereLight(0xdffbff, 0x122329, 1.45);
  const key = new THREE.DirectionalLight(0xffffff, 1.45);
  key.position.set(0.42, 1.18, 1.35);
  const rim = new THREE.PointLight(0x4f8cff, 0.95, 3.4);
  rim.position.set(-0.75, 0.62, 0.82);
  return [ambient, key, rim];
}

function createMutableState(state) {
  return {
    il4ra: {
      position: new THREE.Vector3(...state.il4ra.position),
      opacity: state.il4ra.opacity,
      contact: state.il4ra.contact,
    },
    antibody: {
      position: new THREE.Vector3(...state.antibody.position),
      opacity: state.antibody.opacity,
      scale: state.antibody.scale,
      rotationZ: state.antibody.rotationZ,
    },
    dimer: { ...state.dimer },
    blockade: { ...state.blockade },
    stat6: { ...state.stat6 },
    nucleus: { ...state.nucleus },
    decoy: { ...state.decoy },
  };
}

function writeState(destination, state) {
  destination.il4ra.position.set(...state.il4ra.position);
  destination.il4ra.opacity = state.il4ra.opacity;
  destination.il4ra.contact = state.il4ra.contact;
  destination.antibody.position.set(...state.antibody.position);
  destination.antibody.opacity = state.antibody.opacity;
  destination.antibody.scale = state.antibody.scale;
  destination.antibody.rotationZ = state.antibody.rotationZ;
  destination.dimer.opacity = state.dimer.opacity;
  destination.dimer.glow = state.dimer.glow;
  destination.blockade.opacity = state.blockade.opacity;
  destination.blockade.scale = state.blockade.scale;
  destination.stat6.generation = state.stat6.generation;
  destination.stat6.opacity = state.stat6.opacity;
  destination.stat6.glow = state.stat6.glow;
  destination.nucleus.glow = state.nucleus.glow;
  destination.decoy.ligandOpacity = state.decoy.ligandOpacity;
  destination.decoy.haloOpacity = state.decoy.haloOpacity;
}

function createPhysicalMaterial(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: options.roughness ?? 0.38,
    metalness: options.metalness ?? 0.03,
    clearcoat: options.clearcoat ?? 0.35,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.32,
    transparent: true,
    opacity: options.opacity ?? 1,
    transmission: options.transmission ?? 0,
    thickness: options.thickness ?? 0.02,
    ior: options.ior ?? 1.35,
    emissive: options.emissive ?? color,
    emissiveIntensity: options.emissiveIntensity ?? 0.08,
    depthWrite: options.depthWrite ?? (options.opacity ?? 1) > 0.85,
  });
}

function createSoftShadow() {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.86, 56),
    new THREE.MeshBasicMaterial({
      color: "#020607",
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  mesh.position.set(0, -0.08, -0.08);
  mesh.scale.set(1.18, 0.48, 1);
  return mesh;
}

function createLipidBilayer() {
  const group = new THREE.Group();
  group.name = "lipid-bilayer";

  const columns = 24;
  const lanes = [-0.07, 0.07];
  const totalHeads = columns * lanes.length * 2;
  const totalTails = columns * lanes.length * 2;
  const dummy = new THREE.Object3D();

  const headMaterial = createPhysicalMaterial(COLORS.membraneHead, {
    opacity: 0.62,
    roughness: 0.24,
    clearcoat: 0.72,
    transmission: 0.24,
    emissiveIntensity: 0.03,
    depthWrite: false,
  });
  const tailMaterial = createPhysicalMaterial(COLORS.membraneTail, {
    opacity: 0.72,
    roughness: 0.5,
    clearcoat: 0.14,
    emissiveIntensity: 0.02,
    depthWrite: false,
  });
  const coreMaterial = createPhysicalMaterial(COLORS.membraneCore, {
    opacity: 0.34,
    roughness: 0.48,
    clearcoat: 0.18,
    emissiveIntensity: 0.03,
    depthWrite: false,
  });

  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.024, 16, 10), headMaterial, totalHeads);
  const tails = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.005, 0.005, 0.072, 8), tailMaterial, totalTails);

  let headIndex = 0;
  let tailIndex = 0;
  for (let column = 0; column < columns; column += 1) {
    const x = -0.86 + (1.72 * column) / (columns - 1);
    lanes.forEach((z, laneIndex) => {
      const stagger = Math.sin(column * 0.72 + laneIndex) * 0.006;
      [LAYOUT.upperLeafletY, LAYOUT.lowerLeafletY].forEach((y) => {
        dummy.position.set(x, y + stagger, z);
        dummy.scale.setScalar(1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        heads.setMatrixAt(headIndex, dummy.matrix);
        headIndex += 1;
      });

      dummy.position.set(x, 0.028 + stagger * 0.3, z);
      dummy.rotation.set(0.1, 0, Math.sin(column) * 0.08);
      dummy.updateMatrix();
      tails.setMatrixAt(tailIndex, dummy.matrix);
      tailIndex += 1;

      dummy.position.set(x, -0.028 + stagger * 0.3, z);
      dummy.rotation.set(-0.1, 0, -Math.sin(column) * 0.08);
      dummy.updateMatrix();
      tails.setMatrixAt(tailIndex, dummy.matrix);
      tailIndex += 1;
    });
  }

  heads.instanceMatrix.needsUpdate = true;
  tails.instanceMatrix.needsUpdate = true;

  const core = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.086, 0.19), coreMaterial);
  const topLine = createMembraneLine(0.102);
  const bottomLine = createMembraneLine(-0.102);
  group.add(core, tails, heads, topLine, bottomLine);
  return group;
}

function createMembraneLine(y) {
  const line = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 0.006, 0.2),
    createPhysicalMaterial(COLORS.membraneHead, {
      opacity: 0.26,
      roughness: 0.45,
      clearcoat: 0.35,
      depthWrite: false,
    }),
  );
  line.position.y = y;
  return line;
}

function createReceptor(label, color, options = {}) {
  const group = new THREE.Group();
  group.name = label;

  const receptorMaterial = createPhysicalMaterial(color, {
    roughness: 0.34,
    clearcoat: 0.48,
    emissiveIntensity: options.decoy ? 0.06 : 0.13,
  });
  const pocketMaterial = createPhysicalMaterial(color, {
    opacity: options.decoy ? 0.28 : 0.38,
    roughness: 0.24,
    clearcoat: 0.68,
    emissiveIntensity: options.decoy ? 0.08 : 0.24,
    depthWrite: false,
  });
  const radius = options.radius ?? 0.052;
  const extracellularHeight = options.extracellularHeight ?? 0.32;

  const extracellular = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, extracellularHeight - radius * 2, 6, 20),
    receptorMaterial.clone(),
  );
  extracellular.name = `${label}-extracellular`;
  extracellular.position.y = 0.1 + extracellularHeight / 2;
  extracellular.scale.set(1.04, 1, 0.82);

  const pocket = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.32, radius * 0.1, 10, 32),
    pocketMaterial,
  );
  pocket.name = `${label}-binding-pocket`;
  pocket.position.set(0, 0.1 + extracellularHeight + radius * 0.12, 0.078);
  pocket.rotation.x = Math.PI / 2;

  const transmembrane = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius * 0.5, 0.13, 4, 14),
    receptorMaterial.clone(),
  );
  transmembrane.name = `${label}-transmembrane`;
  transmembrane.position.y = 0;
  transmembrane.scale.set(0.78, 1, 0.78);

  const tail = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius * 0.32, 0.16, 4, 12),
    receptorMaterial.clone(),
  );
  tail.name = `${label}-intracellular-tail`;
  tail.position.y = -0.19;
  tail.scale.set(0.72, 1, 0.72);

  const hub = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.46, 16, 10),
    receptorMaterial.clone(),
  );
  hub.position.y = -0.29;

  const halo = createHaloSprite(color, options.decoy ? 0.18 : 0.22, options.decoy ? 0.12 : 0.22);
  halo.position.set(0, 0.38, 0.09);

  group.add(extracellular, pocket, transmembrane, tail, hub, halo);
  group.userData.halo = halo;
  group.userData.receptorMeshes = [extracellular, pocket, transmembrane, tail, hub];
  group.halo = halo;
  return group;
}

function createLigand(label, color, scale = 1) {
  const group = new THREE.Group();
  group.name = label;
  const material = createPhysicalMaterial(color, {
    roughness: 0.32,
    clearcoat: 0.55,
    emissiveIntensity: 0.22,
  });

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.072 * scale, 24, 16), material.clone());
  core.scale.set(1.15, 0.88, 0.95);
  const lobeA = new THREE.Mesh(new THREE.SphereGeometry(0.038 * scale, 18, 12), material.clone());
  lobeA.position.set(0.062 * scale, 0.032 * scale, 0.018);
  const lobeB = new THREE.Mesh(new THREE.SphereGeometry(0.032 * scale, 18, 12), material.clone());
  lobeB.position.set(-0.052 * scale, -0.02 * scale, 0.024);
  const halo = createHaloSprite(color, 0.22 * scale, 0.28);
  halo.position.set(0, 0, -0.015);
  group.add(halo, core, lobeA, lobeB);
  return group;
}

function createAntibody() {
  const group = new THREE.Group();
  group.name = "lebrikizumab-antibody";
  const material = createPhysicalMaterial(COLORS.lebrikizumab, {
    opacity: 0,
    roughness: 0.34,
    clearcoat: 0.58,
    emissiveIntensity: 0.24,
  });

  const stem = createCapsuleSegment(0.018, 0.18, material.clone());
  stem.position.set(0, -0.07, 0);
  const armA = createCapsuleSegment(0.018, 0.22, material.clone());
  armA.position.set(-0.065, 0.06, 0);
  armA.rotation.z = -0.66;
  const armB = createCapsuleSegment(0.018, 0.22, material.clone());
  armB.position.set(0.065, 0.06, 0);
  armB.rotation.z = 0.66;
  const hinge = new THREE.Mesh(new THREE.SphereGeometry(0.032, 18, 12), material.clone());
  hinge.position.y = 0.005;
  const clampA = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 10), material.clone());
  clampA.position.set(-0.125, 0.14, 0.012);
  const clampB = clampA.clone();
  clampB.position.x = 0.125;
  const halo = createHaloSprite(COLORS.lebrikizumab, 0.34, 0.34);
  halo.position.set(0, 0.05, -0.02);
  const labelAnchor = new THREE.Group();
  labelAnchor.name = "lebrikizumab-label-anchor";
  group.add(halo, stem, armA, armB, hinge, clampA, clampB, labelAnchor);
  return group;
}

function createBlockade() {
  const group = new THREE.Group();
  const material = createPhysicalMaterial(COLORS.lebrikizumab, {
    opacity: 0,
    roughness: 0.28,
    clearcoat: 0.64,
    emissiveIntensity: 0.42,
    depthWrite: false,
  });
  const shield = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 12, 58), material.clone());
  shield.rotation.x = Math.PI / 2;
  const slash = createCapsuleSegment(0.01, 0.34, material.clone());
  slash.rotation.z = -0.68;
  const halo = createHaloSprite(COLORS.lebrikizumab, 0.36, 0.38);
  group.add(halo, shield, slash);
  return group;
}

function createDimerBridge() {
  const group = new THREE.Group();
  const material = createPhysicalMaterial(COLORS.stat6, {
    opacity: 0.8,
    roughness: 0.25,
    clearcoat: 0.35,
    emissive: COLORS.stat6,
    emissiveIntensity: 0.7,
    depthWrite: false,
  });
  const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 1, 4, 12), material);
  const halo = createHaloSprite(COLORS.stat6, 0.34, 0.32);
  group.add(halo, bridge);
  group.bridge = bridge;
  group.halo = halo;
  return group;
}

function createStat6Flow(count) {
  const group = new THREE.Group();
  group.name = "stat6-flow";
  const particles = [];
  for (let index = 0; index < count; index += 1) {
    const particleGroup = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 16, 10),
      createPhysicalMaterial(COLORS.stat6, {
        opacity: 0,
        roughness: 0.28,
        clearcoat: 0.4,
        emissive: COLORS.stat6,
        emissiveIntensity: 0.8,
        depthWrite: false,
      }),
    );
    const halo = createHaloSprite(COLORS.stat6, 0.12, 0);
    particleGroup.visible = false;
    particleGroup.add(halo, mesh);
    group.add(particleGroup);
    particles.push({
      group: particleGroup,
      mesh,
      halo,
      active: false,
      arrived: false,
      age: 0,
      duration: 1.7,
      phase: index * 1.31,
      offsetX: (index % 5 - 2) * 0.025,
      offsetY: (index % 3 - 1) * 0.016,
      offsetZ: (index % 4 - 1.5) * 0.012,
    });
  }
  return { group, particles, cursor: 0 };
}

function spawnStat6Particle(pool) {
  const particle = pool.particles[pool.cursor];
  pool.cursor = (pool.cursor + 1) % pool.particles.length;
  particle.active = true;
  particle.arrived = false;
  particle.age = 0;
  particle.duration = 1.55 + (particle.phase % 0.7);
  particle.group.visible = true;
  particle.group.position.set(...LAYOUT.stat6Emitter);
}

function createNucleus() {
  const group = new THREE.Group();
  const halo = createHaloSprite(COLORS.stat6, 0.72, 0.22);
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 28, 18),
    createPhysicalMaterial(COLORS.nucleus, {
      opacity: 0.88,
      roughness: 0.4,
      clearcoat: 0.26,
      emissive: COLORS.stat6,
      emissiveIntensity: 0.55,
    }),
  );
  shell.scale.set(1.18, 0.78, 0.36);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 20, 12),
    createPhysicalMaterial("#2b4a60", {
      opacity: 0.74,
      roughness: 0.35,
      clearcoat: 0.3,
      emissive: COLORS.stat6,
      emissiveIntensity: 0.55,
      depthWrite: false,
    }),
  );
  const ringA = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.006, 8, 46),
    createPhysicalMaterial(COLORS.stat6, {
      opacity: 0.34,
      roughness: 0.34,
      clearcoat: 0.3,
      emissive: COLORS.stat6,
      emissiveIntensity: 0.45,
      depthWrite: false,
    }),
  );
  ringA.scale.set(1.2, 0.68, 1);
  ringA.rotation.z = 0.14;
  group.add(halo, shell, core, ringA);
  return { group, halo, shell, core, ringA };
}

function createSceneLabels() {
  const group = new THREE.Group();
  const labels = {
    extracellular: createBillboardLabel("細胞外", "#dffbff", 0.24, 0.08),
    intracellular: createBillboardLabel("細胞内", "#dffbff", 0.24, 0.08),
    alpha1: createBillboardLabel("IL-13Rα1", "#ccfffb", 0.32, 0.075),
    il4ra: createBillboardLabel("IL-4Rα", "#fff0bf", 0.27, 0.075),
    decoy: createBillboardLabel("IL-13Rα2\nデコイ", "#f0f3f7", 0.32, 0.12),
    antibody: createBillboardLabel("レブリキズマブ", "#dce8ff", 0.36, 0.075),
  };

  labels.extracellular.position.set(-0.94, 0.48, 0.18);
  labels.intracellular.position.set(-0.94, -0.43, 0.18);
  labels.alpha1.position.set(LAYOUT.alpha1[0], 0.64, 0.2);
  labels.il4ra.position.set(0.22, 0.58, 0.2);
  labels.decoy.position.set(LAYOUT.decoy[0], 0.58, 0.2);
  labels.antibody.position.set(-0.05, 0.76, 0.22);

  Object.values(labels).forEach((label) => group.add(label));
  group.antibody = labels.antibody;
  return { group, ...labels };
}

function createCapsuleSegment(radius, length, material) {
  return new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 12), material);
}

function setReceptorContact(receptor, intensity) {
  receptor.userData.receptorMeshes.forEach((mesh) => {
    if ("emissiveIntensity" in mesh.material) {
      mesh.material.emissiveIntensity = intensity * 0.12;
    }
  });
  setMaterialOpacity(receptor.halo.material, THREE.MathUtils.clamp(intensity * 0.22, 0.06, 0.34));
}

function createHaloSprite(color, size, opacity) {
  const material = new THREE.SpriteMaterial({
    map: getHaloTexture(),
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size, size, 1);
  return sprite;
}

let haloTexture = null;
function getHaloTexture() {
  if (haloTexture) {
    return haloTexture;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.28, "rgba(255,255,255,0.42)");
  gradient.addColorStop(0.62, "rgba(255,255,255,0.1)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  haloTexture = new THREE.CanvasTexture(canvas);
  haloTexture.colorSpace = THREE.SRGBColorSpace;
  return haloTexture;
}

function createBillboardLabel(text, color, width, height) {
  const texture = createTextTexture(text, color);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width, height, 1);
  return sprite;
}

function createTextTexture(text, color) {
  const lines = text.split("\n");
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = Math.max(160, 110 * lines.length);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "900 58px 'Zen Kaku Gothic New', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, index) => {
    const y = canvas.height / 2 + (index - (lines.length - 1) / 2) * 62;
    ctx.lineWidth = 13;
    ctx.strokeStyle = "rgba(3, 11, 13, 0.82)";
    ctx.strokeText(line, canvas.width / 2, y);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
    ctx.strokeText(line, canvas.width / 2, y);
    ctx.fillStyle = color;
    ctx.fillText(line, canvas.width / 2, y);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function setGroupOpacity(group, opacity) {
  group.traverse((object) => {
    if (!object.material) {
      return;
    }
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => setMaterialOpacity(material, opacity));
      return;
    }
    setMaterialOpacity(object.material, opacity);
  });
}

function setMaterialOpacity(material, opacity) {
  material.transparent = true;
  material.opacity = THREE.MathUtils.clamp(opacity, 0, 1);
  material.visible = material.opacity > 0.012;
}

function setCapsuleBetween(mesh, start, end) {
  tmpVecC.subVectors(end, start);
  const length = tmpVecC.length();
  mesh.position.copy(tmpVecA.copy(start).add(end).multiplyScalar(0.5));
  mesh.scale.set(1, Math.max(0.01, length), 1);
  tmpQuat.setFromUnitVectors(yAxis, tmpVecC.normalize());
  mesh.quaternion.copy(tmpQuat);
}

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function lerp(current, next, ease) {
  return THREE.MathUtils.lerp(current, next, ease);
}

function lerpNumber(current, next, alpha) {
  return current + (next - current) * alpha;
}

function lerpVec(current, next, ease) {
  current.lerp(next, ease);
}
