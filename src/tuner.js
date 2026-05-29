import { DEFAULT_TRANSFORM, saveTransform } from "./settings.js";

// 画面に浮かぶ「向き調整パネル」。スライダーで回転X/Y/Z・大きさ・自転速度を変え、
// 変更のたびに onChange(設定) を呼び、localStorageへ保存する（AR側と共有）。

const FIELDS = [
  { key: "rx", label: "回転X（前後の傾き）", min: -180, max: 180, step: 1, unit: "°" },
  { key: "ry", label: "回転Y（左右まわり）", min: -180, max: 180, step: 1, unit: "°" },
  { key: "rz", label: "回転Z（画面内の回転）", min: -180, max: 180, step: 1, unit: "°" },
  { key: "scale", label: "大きさ", min: 0.2, max: 2.5, step: 0.05, unit: "×" },
  { key: "spin", label: "自転速度（0で停止）", min: 0, max: 90, step: 1, unit: "°/s" },
];

export function createTuner({ initial, onChange }) {
  const state = { ...DEFAULT_TRANSFORM, ...initial };

  const wrap = document.createElement("div");
  wrap.style.cssText = [
    "position:fixed", "right:10px", "bottom:10px", "z-index:99999",
    "width:240px", "max-width:78vw",
    "font-family:system-ui,'Zen Kaku Gothic New',sans-serif",
    "color:#eaf2f8",
    "background:rgba(12,18,24,0.86)", "backdrop-filter:blur(6px)",
    "border:1px solid rgba(255,255,255,0.14)", "border-radius:12px",
    "box-shadow:0 6px 20px rgba(0,0,0,0.4)", "overflow:hidden",
  ].join(";");

  // ヘッダ（タイトル＋開閉）
  const header = document.createElement("button");
  header.type = "button";
  header.textContent = "⚙ 向き調整";
  header.style.cssText = [
    "all:unset", "box-sizing:border-box", "display:block", "width:100%",
    "padding:10px 12px", "cursor:pointer", "font-weight:700", "font-size:13px",
    "background:rgba(255,255,255,0.06)",
  ].join(";");

  const body = document.createElement("div");
  body.style.cssText = "padding:8px 12px 12px;display:grid;gap:8px;";

  let open = true;
  header.addEventListener("click", () => {
    open = !open;
    body.style.display = open ? "grid" : "none";
    header.textContent = (open ? "⚙ 向き調整 ▲" : "⚙ 向き調整 ▼");
  });
  header.textContent = "⚙ 向き調整 ▲";

  const valueLabels = {};
  function makeRow(field) {
    const row = document.createElement("label");
    row.style.cssText = "display:grid;gap:2px;font-size:11px;";

    const top = document.createElement("div");
    top.style.cssText = "display:flex;justify-content:space-between;";
    const name = document.createElement("span");
    name.textContent = field.label;
    const val = document.createElement("span");
    val.style.cssText = "opacity:.85;font-variant-numeric:tabular-nums;";
    valueLabels[field.key] = (v) => (val.textContent = `${v}${field.unit}`);
    valueLabels[field.key](state[field.key]);
    top.append(name, val);

    const input = document.createElement("input");
    input.type = "range";
    input.min = field.min; input.max = field.max; input.step = field.step;
    input.value = state[field.key];
    input.style.cssText = "width:100%;accent-color:#4f8cff;";
    input.addEventListener("input", () => {
      state[field.key] = parseFloat(input.value);
      valueLabels[field.key](state[field.key]);
      emit();
    });
    row._input = input;
    row.append(top, input);
    return row;
  }

  const rows = FIELDS.map(makeRow);

  // ボタン列（リセット）
  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:flex;gap:6px;margin-top:2px;";
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.textContent = "リセット";
  resetBtn.style.cssText = btnStyle();
  resetBtn.addEventListener("click", () => {
    Object.assign(state, DEFAULT_TRANSFORM);
    syncInputs();
    emit();
  });
  btnRow.append(resetBtn);

  body.append(...rows, btnRow);
  wrap.append(header, body);
  document.body.appendChild(wrap);

  function syncInputs() {
    FIELDS.forEach((f, i) => {
      rows[i]._input.value = state[f.key];
      valueLabels[f.key](state[f.key]);
    });
  }

  function emit() {
    saveTransform(state);
    onChange({ ...state });
  }

  // 初期反映
  emit();

  return {
    element: wrap,
    getState: () => ({ ...state }),
    destroy: () => wrap.remove(),
  };
}

function btnStyle() {
  return [
    "flex:1", "padding:7px 8px", "font-size:12px", "font-weight:700",
    "color:#eaf2f8", "background:rgba(255,255,255,0.10)",
    "border:1px solid rgba(255,255,255,0.18)", "border-radius:8px", "cursor:pointer",
  ].join(";");
}
