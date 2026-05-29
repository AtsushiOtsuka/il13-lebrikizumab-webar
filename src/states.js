export const COLORS = Object.freeze({
  il13: "#ff3bd2",
  il13rAlpha1: "#20d8d2",
  il4rAlpha: "#ffb02e",
  lebrikizumab: "#3f86ff",
  stat6: "#55f58a",
  decoy: "#aeb7c2",
  membraneHead: "#9ce9f2",
  membraneTail: "#244c56",
  membraneCore: "#15343b",
  nucleus: "#20394a",
  text: "#eef8f7",
});

export const STATE_KEYS = Object.freeze(["signal", "blocked"]);

export const AR_STATES = Object.freeze({
  signal: {
    key: "signal",
    kicker: "通常のIL-13シグナル",
    title: "IL-13Rα1 と IL-4Rα が膜上で複合体を形成",
    body:
      "IL-13 が膜上の IL-13Rα1 細胞外ポケットに着座し、IL-4Rα が横から接近してヘテロ二量体を形成します。膜下のテール根本から STAT6 が連続的に核へ流れ、炎症・かゆみ・皮膚バリア障害に関わる転写を示します。",
    il4ra: {
      position: [0.18, 0, 0.02],
      opacity: 1,
      contact: 1,
    },
    antibody: {
      position: [-0.2, 0.66, 0.2],
      opacity: 0,
      scale: 0.68,
      rotationZ: -0.35,
    },
    dimer: {
      opacity: 1,
      glow: 0.95,
    },
    blockade: {
      opacity: 0,
      scale: 0.72,
    },
    stat6: {
      generation: 1,
      opacity: 1,
      glow: 1,
    },
    nucleus: {
      glow: 1,
    },
    decoy: {
      ligandOpacity: 0.96,
      haloOpacity: 0.55,
    },
  },
  blocked: {
    key: "blocked",
    kicker: "レブリキズマブ阻害",
    title: "IL-13Rα1結合は維持し、IL-4Rαのリクルートを阻止",
    body:
      "レブリキズマブは IL-13 をクランプします。IL-13 は IL-13Rα1 に残りますが、IL-4Rα は二量体界面に接触できず離脱します。STAT6 粒子の生成は止まり、核の発光は減衰します。IL-13Rα2 デコイは別の IL-13 を保持したままです。",
    il4ra: {
      position: [0.58, 0, 0.02],
      opacity: 0.82,
      contact: 0,
    },
    antibody: {
      position: [-0.19, 0.5, 0.18],
      opacity: 1,
      scale: 1,
      rotationZ: 0.08,
    },
    dimer: {
      opacity: 0,
      glow: 0,
    },
    blockade: {
      opacity: 1,
      scale: 1,
    },
    stat6: {
      generation: 0,
      opacity: 0,
      glow: 0,
    },
    nucleus: {
      glow: 0.08,
    },
    decoy: {
      ligandOpacity: 1,
      haloOpacity: 0.82,
    },
  },
});

export const AUTO_SCRIPT = Object.freeze([
  {
    state: "signal",
    durationMs: 5600,
    caption:
      "IL-13 が IL-13Rα1 に着座し、IL-4Rα が膜上で接触すると STAT6 粒子が核へ流れ続けます。",
  },
  {
    state: "blocked",
    durationMs: 6800,
    caption:
      "レブリキズマブが IL-13 をクランプしても IL-13Rα1 結合は残りますが、IL-4Rα の接触は外れます。",
  },
  {
    state: "blocked",
    durationMs: 4400,
    caption:
      "STAT6 生成は止まり、核発光は減衰します。IL-13Rα2 デコイは別の IL-13 を保持したままです。",
  },
]);
