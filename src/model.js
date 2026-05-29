import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ============================================================
// Blenderで作った分子モデル(.glb)をマーカー上に表示するモジュール。
// main.js から loadMoleculeModel() を呼び、返り値を MindAR のアンカーに add する。
// 見え方の微調整は下の3つの定数で行えます。
// ============================================================

// 表示するglbのパス（リポジトリ直下の assets/ を配信している前提）
const MODEL_URL = "./assets/il13-practice.glb";

// モデルの最大辺をこの大きさ（マーカー基準の単位 ≒ マーカー画像幅）に正規化。
// 大きすぎ/小さすぎる場合はここを調整（例: 0.9〜1.6）。
const TARGET_SIZE = 1.2;

// 全体の傾き（ラジアン）。マーカーを机に平置きするか立てるかで見え方が変わるので調整用。
//   0          … モデルの上下(+Y)がマーカー画像の上方向に一致
//   -Math.PI/2 … 平置きマーカーで「立ち上がって」見せたいとき など
const TILT_X = -0.2;

// マーカー面からの浮かせ量（プラスでマーカーから少し浮く）
const LIFT_Y = 0.0;

/**
 * glbを読み込み、{ root, setVisible, setState, update } を返す。
 * main.js 側の既存インターフェース（educationScene）と互換。
 */
export async function loadMoleculeModel() {
  const root = new THREE.Group();
  root.name = "MoleculeGLBModel";
  root.visible = false;

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(MODEL_URL);
  const model = gltf.scene;

  // --- バウンディングボックスで中心合わせ＆スケール正規化 ---
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = TARGET_SIZE / maxDim;

  // モデルの中心を原点へ寄せる
  model.position.sub(center);

  // 回転用ピボット（自転はこのピボットで行う）
  const pivot = new THREE.Group();
  pivot.add(model);
  pivot.scale.setScalar(scale);
  pivot.position.y = LIFT_Y;
  root.add(pivot);

  root.rotation.x = TILT_X;

  return {
    root,
    setVisible(isVisible) {
      root.visible = isVisible;
    },
    // glb単体表示では「通常/阻害」の状態切替は無し（UIボタンを押してもエラーにしないためのno-op）
    setState() {},
    update(deltaSeconds, elapsedSeconds) {
      // ゆっくり自転させて全方位から観察できるように
      pivot.rotation.y = elapsedSeconds * 0.5;
    },
  };
}
