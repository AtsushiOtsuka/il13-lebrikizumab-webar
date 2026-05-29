import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { loadTransform } from "./settings.js";

// ============================================================
// Blenderで作った分子モデル(.glb)をマーカー上に表示するモジュール。
// 向き・大きさ・自転は settings.js（localStorage / URLパラメータ）で制御し、
// 調整パネル(tuner.js)からリアルタイムに applySettings() で更新できる。
//
// グループ構成:
//   root（アンカーに追加）
//    └ spinGroup（マーカー垂直軸まわりの自転）
//        └ poseGroup（向き rx/ry/rz と 大きさ scale）
//            └ model（中心を原点に寄せたglb）
// ============================================================

const MODEL_URL = "./assets/il13-practice.glb";

// モデルの最大辺をこの大きさ（マーカー基準の単位 ≒ 画像幅）に正規化。
// 実際の見かけサイズは settings.scale 倍率で調整する。
const NORM_SIZE = 1.0;

const deg = THREE.MathUtils.degToRad;

export async function loadMoleculeModel() {
  const root = new THREE.Group();
  root.name = "MoleculeGLBModel";
  root.visible = false;

  const spinGroup = new THREE.Group(); // 自転（垂直軸）
  const poseGroup = new THREE.Group();  // 向き＋大きさ
  root.add(spinGroup);
  spinGroup.add(poseGroup);

  const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
  const model = gltf.scene;

  // 中心合わせ＆正規化スケール
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  poseGroup.add(model);

  const baseScale = NORM_SIZE / (Math.max(size.x, size.y, size.z) || 1);

  let settings = loadTransform();

  /** 向き・大きさ設定を反映（調整パネルからも呼ばれる）。 */
  function applySettings(partial) {
    settings = { ...settings, ...partial };
    poseGroup.rotation.set(deg(settings.rx), deg(settings.ry), deg(settings.rz));
    poseGroup.scale.setScalar(baseScale * settings.scale);
  }
  applySettings(settings);

  return {
    root,
    getSettings: () => ({ ...settings }),
    applySettings,
    setVisible(isVisible) {
      root.visible = isVisible;
    },
    // glb単体表示では状態切替なし（UIボタン互換のためのno-op）
    setState() {},
    update(_deltaSeconds, elapsedSeconds) {
      // 自転（spin[度/秒]）。0なら停止。
      spinGroup.rotation.y = deg(settings.spin) * elapsedSeconds;
    },
  };
}
