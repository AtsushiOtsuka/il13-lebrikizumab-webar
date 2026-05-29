import * as THREE from "three";
import { MindARThree } from "mindar-image-three";
import { AUTO_SCRIPT, AR_STATES } from "./states.js";
import { createSceneLights } from "./scene.js";
import { loadMoleculeModel } from "./model.js";
import { createTuner } from "./tuner.js";
import { createUIController } from "./ui.js";

// 既定マーカー: 自前のフォトリアル版(marker-il13-v2)。検出テスト合格済み。
// 対応するマーカー画像は assets/marker-il13-v2.png（印刷/表示してカメラを向ける）。
// ?target=... のURLパラメータで一時的に別マーカーへ切替も可能。
const DEFAULT_IMAGE_TARGET = "./assets/marker-il13-v2.mind";

const params = new URLSearchParams(window.location.search);
const imageTargetSrc = params.get("target") || DEFAULT_IMAGE_TARGET;

let mindarThree = null;
let renderer = null;
let educationScene = null;
let tuner = null;
let animationClock = null;
let autoTimer = null;
let autoStepIndex = 0;
let isStarted = false;

const ui = createUIController({
  onStart: startAR,
  onStop: stopAR,
  onStateChange: setManualState,
  onAutoChange: setAutoMode,
});

ui.setActiveState("signal");

async function startAR() {
  const support = ui.canUseCameraAR();
  if (!support.ok) {
    ui.showFallback(support.reason);
    return;
  }

  ui.setLoading(true);

  try {
    const container = ui.elements.app.querySelector("#ar-container");
    mindarThree = new MindARThree({
      container,
      imageTargetSrc,
      filterMinCF: 0.0001,
      filterBeta: 0.001,
    });

    // Blenderで作ったglbモデルを読み込んでマーカー上に表示する
    const sceneObjects = await loadMoleculeModel();
    educationScene = sceneObjects;

    // 向き調整パネル（スライダーでrx/ry/rz・大きさ・自転を微調整。設定は保存される）
    tuner = createTuner({
      initial: sceneObjects.getSettings(),
      onChange: (s) => sceneObjects.applySettings(s),
    });

    const { scene, camera } = mindarThree;
    createSceneLights().forEach((light) => scene.add(light));

    const anchor = mindarThree.addAnchor(0);
    anchor.group.add(sceneObjects.root);
    anchor.onTargetFound = () => {
      sceneObjects.setVisible(true);
      ui.setTracking(true);
    };
    anchor.onTargetLost = () => {
      sceneObjects.setVisible(false);
      ui.setTracking(false);
    };

    await mindarThree.start();

    renderer = mindarThree.renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    animationClock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const delta = Math.min(animationClock.getDelta(), 0.05);
      const elapsed = animationClock.elapsedTime;
      sceneObjects.update(delta, elapsed);
      renderer.render(scene, camera);
    });

    isStarted = true;
    ui.showRuntime();
    ui.setLoading(false);
  } catch (error) {
    const fallbackKind = error?.name === "NotAllowedError" ? "denied" : "runtime";
    ui.showFallback(fallbackKind, getReadableError(error));
    await stopAR({ showStart: false });
  }
}

async function stopAR(options = { showStart: true }) {
  clearAutoTimer();
  ui.setAutoMode(false);

  if (renderer) {
    renderer.setAnimationLoop(null);
  }

  if (tuner) {
    tuner.destroy();
    tuner = null;
  }

  if (mindarThree) {
    try {
      await mindarThree.stop();
    } catch (error) {
      console.warn("MindAR stop failed", error);
    }
  }

  const container = ui.elements.app.querySelector("#ar-container");
  container.replaceChildren();
  mindarThree = null;
  renderer = null;
  educationScene = null;
  animationClock = null;
  isStarted = false;

  if (options.showStart) {
    ui.showStart();
  }
}

function setManualState(stateKey) {
  if (!AR_STATES[stateKey]) {
    return;
  }
  clearAutoTimer();
  ui.setAutoMode(false);
  applyState(stateKey);
}

function applyState(stateKey, captionOverride = "") {
  educationScene?.setState(stateKey);
  ui.setActiveState(stateKey, captionOverride);
}

function setAutoMode(isAuto) {
  clearAutoTimer();
  ui.setAutoMode(isAuto);
  if (!isAuto) {
    return;
  }
  autoStepIndex = 0;
  runAutoStep();
}

function runAutoStep() {
  const step = AUTO_SCRIPT[autoStepIndex % AUTO_SCRIPT.length];
  applyState(step.state, step.caption);
  autoStepIndex += 1;
  autoTimer = window.setTimeout(runAutoStep, step.durationMs);
}

function clearAutoTimer() {
  if (autoTimer) {
    window.clearTimeout(autoTimer);
    autoTimer = null;
  }
}

function getReadableError(error) {
  if (!error) {
    return "";
  }
  if (typeof error === "string") {
    return error;
  }
  return error.message || error.name || "";
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && isStarted) {
    clearAutoTimer();
  }
});

window.addEventListener("pagehide", () => {
  if (isStarted) {
    stopAR({ showStart: false });
  }
});
