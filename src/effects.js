import * as THREE from "three";

// マーカー上のモデル周囲に「キラキラ点滅」する粒子を出すエフェクト。
// 軽量（点群1つ＝1ドローコール）なのでモバイル/トラッキングに優しい。
// createSparkles() -> { object3D, setVisible, update }

export function createSparkles({ count = 150, radius = 0.85 } = {}) {
  // キラキラの配色（金・シアン・マゼンタ・白）
  const palette = [
    [1.0, 0.85, 0.35],
    [0.35, 0.9, 1.0],
    [1.0, 0.45, 0.85],
    [1.0, 1.0, 1.0],
  ];

  const positions = new Float32Array(count * 3);
  const aPhase = new Float32Array(count);
  const aSize = new Float32Array(count);
  const aColor = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // 球状にやや上方へ分布（モデルを包むように）
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * (0.4 + 0.6 * Math.random());
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi) * 0.85 + 0.12; // 少し上寄り
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    aPhase[i] = Math.random() * Math.PI * 2;
    aSize[i] = 5 + Math.random() * 10;
    const c = palette[(Math.random() * palette.length) | 0];
    aColor[i * 3 + 0] = c[0];
    aColor[i * 3 + 1] = c[1];
    aColor[i * 3 + 2] = c[2];
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(aPhase, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(aColor, 3));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aPhase;
      attribute float aSize;
      attribute vec3 aColor;
      uniform float uTime;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vTw;
      void main() {
        vColor = aColor;
        // 各粒子ごとに位相をずらして点滅
        float tw = 0.5 + 0.5 * sin(uTime * 3.2 + aPhase);
        vTw = tw;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * (0.35 + 0.65 * tw);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;
      varying vec3 vColor;
      varying float vTw;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        // 十字のきらめき
        float glint = max(0.0, 1.0 - abs(uv.x) * 9.0) + max(0.0, 1.0 - abs(uv.y) * 9.0);
        float a = clamp(core + glint * 0.18 * core, 0.0, 1.0);
        gl_FragColor = vec4(vColor, a * vTw * 0.9);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.visible = false;
  points.frustumCulled = false;

  return {
    object3D: points,
    setVisible(v) {
      points.visible = v;
    },
    update(_dt, elapsed) {
      material.uniforms.uTime.value = elapsed;
      points.rotation.y = elapsed * 0.15; // ゆっくり回して生命感
    },
  };
}
