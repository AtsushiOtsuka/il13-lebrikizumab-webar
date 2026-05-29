import { AR_STATES } from "./states.js";

const FALLBACK_COPY = {
  insecure: {
    title: "HTTPS環境で開いてください",
    message:
      "スマートフォンのブラウザでカメラを使うには HTTPS 配信が必要です。Netlify、GitHub Pages、Vercel などに配置してからアクセスしてください。localhost での開発確認は例外的に許可されます。",
  },
  unsupported: {
    title: "このブラウザではカメラARを開始できません",
    message:
      "getUserMedia に対応した iOS Safari または Android Chrome で開いてください。アプリ内ブラウザではカメラ権限が制限される場合があります。",
  },
  denied: {
    title: "カメラ権限が許可されていません",
    message:
      "ブラウザの設定でこのページのカメラ利用を許可してから、ページを再読み込みしてください。医療教育用の表示のみを行い、画像や患者データは保存しません。",
  },
  runtime: {
    title: "ARの初期化に失敗しました",
    message:
      "通信状態、HTTPS 配信、カメラ権限を確認してください。改善しない場合は、iOS Safari または Android Chrome で開き直してください。",
  },
};

export function createUIController({ onStart, onStop, onStateChange, onAutoChange }) {
  const elements = {
    app: document.querySelector("#app"),
    startScreen: document.querySelector("#start-screen"),
    startButton: document.querySelector("#start-button"),
    stopButton: document.querySelector("#stop-button"),
    fallback: document.querySelector("#fallback"),
    fallbackTitle: document.querySelector("#fallback-title"),
    fallbackMessage: document.querySelector("#fallback-message"),
    runtimeUI: document.querySelector("#runtime-ui"),
    trackingStatus: document.querySelector("#tracking-status"),
    trackingHint: document.querySelector("#tracking-hint"),
    stateButtons: Array.from(document.querySelectorAll("[data-state]")),
    autoButton: document.querySelector("#auto-button"),
    captionKicker: document.querySelector("#caption-kicker"),
    captionTitle: document.querySelector("#caption-title"),
    captionBody: document.querySelector("#caption-body"),
  };

  elements.startButton.addEventListener("click", () => {
    onStart();
  });

  elements.stopButton.addEventListener("click", () => {
    onStop();
  });

  elements.stateButtons.forEach((button) => {
    button.addEventListener("click", () => {
      onStateChange(button.dataset.state);
    });
  });

  elements.autoButton.addEventListener("click", () => {
    const nextValue = !elements.autoButton.classList.contains("is-active");
    onAutoChange(nextValue);
  });

  function setLoading(isLoading) {
    elements.startButton.disabled = isLoading;
    elements.startButton.innerHTML = isLoading
      ? "<span aria-hidden=\"true\">…</span>ARを準備中"
      : "<span aria-hidden=\"true\">▶</span>ARを開始";
  }

  function showRuntime() {
    elements.startScreen.hidden = true;
    elements.fallback.hidden = true;
    elements.runtimeUI.hidden = false;
  }

  function showStart() {
    elements.startScreen.hidden = false;
    elements.runtimeUI.hidden = true;
    elements.fallback.hidden = true;
    setTracking(false);
    setLoading(false);
  }

  function showFallback(kind, detail = "") {
    const copy = FALLBACK_COPY[kind] ?? FALLBACK_COPY.runtime;
    elements.startScreen.hidden = true;
    elements.runtimeUI.hidden = true;
    elements.fallback.hidden = false;
    elements.fallbackTitle.textContent = copy.title;
    elements.fallbackMessage.textContent = detail ? `${copy.message}\n\n詳細: ${detail}` : copy.message;
    setLoading(false);
  }

  function setTracking(isFound) {
    elements.trackingStatus.textContent = isFound ? "検出中" : "未検出";
    elements.trackingStatus.classList.toggle("is-found", isFound);
    elements.trackingStatus.classList.toggle("is-lost", !isFound);
    elements.trackingHint.classList.toggle("is-hidden", isFound);
  }

  function setActiveState(stateKey, overrideBody = "") {
    const state = AR_STATES[stateKey];
    if (!state) {
      return;
    }

    elements.stateButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.state === stateKey);
      button.setAttribute("aria-pressed", String(button.dataset.state === stateKey));
    });
    elements.captionKicker.textContent = state.kicker;
    elements.captionTitle.textContent = state.title;
    elements.captionBody.textContent = overrideBody || state.body;
  }

  function setAutoMode(isAuto) {
    elements.autoButton.classList.toggle("is-active", isAuto);
    elements.autoButton.textContent = isAuto ? "解説停止" : "解説再生";
    elements.stateButtons.forEach((button) => {
      button.disabled = isAuto;
      button.setAttribute("aria-disabled", String(isAuto));
    });
  }

  function canUseCameraAR() {
    const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    if (!window.isSecureContext && !isLocalhost) {
      return { ok: false, reason: "insecure" };
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      return { ok: false, reason: "unsupported" };
    }
    return { ok: true, reason: "" };
  }

  return {
    elements,
    canUseCameraAR,
    setLoading,
    showRuntime,
    showStart,
    showFallback,
    setTracking,
    setActiveState,
    setAutoMode,
  };
}
