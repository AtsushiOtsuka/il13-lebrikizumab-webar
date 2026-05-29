import * as THREE from "three";

// マーカー上のモデル上空に「花火」を打ち上げるエフェクト。
//  - update() 内で一定間隔ごとに自動で打ち上げ
//  - burst() を呼ぶと（画面タップ等で）即時に打ち上げ
// 粒子はプール（点群1つ＝1ドローコール）で軽量。モバイル/トラッキングに優しい。

export function createFireworks({ poolSize = 800 } = {}) {
  const palette = [
    [1.0, 0.85, 0.3],  // 金
    [0.35, 0.9, 1.0],  // シアン
    [1.0, 0.45, 0.85], // マゼンタ
    [0.55, 1.0, 0.5],  // 緑
    [1.0, 0.55, 0.2],  // オレンジ
    [0.6, 0.7, 1.0],   // 青白
  ];

  const positions = new Float32Array(poolSize * 3);
  const colors = new Float32Array(poolSize * 3);
  const alphas = new Float32Array(poolSize);
  const sizes = new Float32Array(poolSize);
  // CPU側の物理状態
  const vel = new Float32Array(poolSize * 3);
  const age = new Float32Array(poolSize);
  const life = new Float32Array(poolSize);
  const active = new Uint8Array(poolSize);
  let cursor = 0;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aAlpha;
      attribute float aSize;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = aColor;
        vAlpha = aAlpha;
        gl_PointSize = aSize * uPixelRatio;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor, core * vAlpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.visible = false;
  points.frustumCulled = false;

  const GRAVITY = 0.95;      // 下向き重力（マーカー単位/秒^2）
  let autoAcc = 0;
  let nextAuto = 1.2;        // 最初の打ち上げまで

  /** 1発打ち上げる。origin省略時はモデル上空のランダム位置。 */
  function burst(origin) {
    const o = origin || {
      x: (Math.random() - 0.5) * 0.7,
      y: 0.95 + Math.random() * 0.5,
      z: (Math.random() - 0.5) * 0.35,
    };
    const baseCol = palette[(Math.random() * palette.length) | 0];
    const n = 70 + ((Math.random() * 50) | 0);
    const speed = 0.7 + Math.random() * 0.5;
    for (let k = 0; k < n; k++) {
      const i = cursor;
      cursor = (cursor + 1) % poolSize;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const sp = speed * (0.45 + 0.55 * Math.random());
      vel[i * 3 + 0] = sp * Math.sin(ph) * Math.cos(th);
      vel[i * 3 + 1] = sp * Math.cos(ph) + 0.12; // わずかに上向き
      vel[i * 3 + 2] = sp * Math.sin(ph) * Math.sin(th);
      positions[i * 3 + 0] = o.x;
      positions[i * 3 + 1] = o.y;
      positions[i * 3 + 2] = o.z;
      const c = Math.random() < 0.18 ? [1, 1, 1] : baseCol; // 一部は白できらめき
      colors[i * 3 + 0] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
      sizes[i] = 7 + Math.random() * 9;
      age[i] = 0;
      life[i] = 1.2 + Math.random() * 0.8;
      active[i] = 1;
      alphas[i] = 1;
    }
    geometry.attributes.aColor.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
  }

  function update(dt, _elapsed) {
    // 自動打ち上げ（表示中のみ）
    if (points.visible) {
      autoAcc += dt;
      if (autoAcc >= nextAuto) {
        autoAcc = 0;
        nextAuto = 2.0 + Math.random() * 2.6;
        burst();
      }
    }
    // 粒子の物理更新
    for (let i = 0; i < poolSize; i++) {
      if (!active[i]) continue;
      age[i] += dt;
      const t = age[i] / life[i];
      if (t >= 1) {
        active[i] = 0;
        alphas[i] = 0;
        continue;
      }
      vel[i * 3 + 1] -= GRAVITY * dt;
      const drag = 1 - 0.55 * dt; // 空気抵抗で失速
      vel[i * 3 + 0] *= drag;
      vel[i * 3 + 1] *= drag;
      vel[i * 3 + 2] *= drag;
      positions[i * 3 + 0] += vel[i * 3 + 0] * dt;
      positions[i * 3 + 1] += vel[i * 3 + 1] * dt;
      positions[i * 3 + 2] += vel[i * 3 + 2] * dt;
      alphas[i] = (1 - t) * (1 - t); // 後半でフェードアウト
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
  }

  return {
    object3D: points,
    burst,
    setVisible(v) {
      points.visible = v;
    },
    update,
  };
}
