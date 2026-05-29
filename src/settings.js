// モデルの向き・大きさ・自転の設定を保存/読込するモジュール。
// preview.html と index.html(AR) は同じオリジンなので localStorage を共有し、
// プレビューで合わせた向きが AR にもそのまま反映される。

const KEY = "il13ar.modelTransform";

// 既定値（rx/ry/rz は度、scale は倍率、spin は自転速度[度/秒]）
export const DEFAULT_TRANSFORM = Object.freeze({
  rx: 11,
  ry: -11,
  rz: 4,
  scale: 1.0,
  spin: 7,
});

const NUM_KEYS = ["rx", "ry", "rz", "scale", "spin"];

/**
 * 設定を読み込む。優先順位: URLパラメータ > localStorage > 既定値。
 * 例: ?rx=-90&ry=30&scale=1.2&spin=0 で一時的に上書き可能。
 */
export function loadTransform() {
  let t = { ...DEFAULT_TRANSFORM };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) t = { ...t, ...JSON.parse(raw) };
  } catch (_) {
    /* localStorage不可環境は既定値で続行 */
  }
  const params = new URLSearchParams(window.location.search);
  for (const k of NUM_KEYS) {
    const v = parseFloat(params.get(k));
    if (!Number.isNaN(v)) t[k] = v;
  }
  return t;
}

/** 設定を保存する。 */
export function saveTransform(t) {
  try {
    localStorage.setItem(KEY, JSON.stringify(t));
  } catch (_) {
    /* 保存不可でも致命ではない */
  }
}
