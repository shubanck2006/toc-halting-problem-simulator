/**
 * Module 3: Universal Turing Machine (UTM) Controller
 */

let utmStepsLog = [];
let currentCycleIdx = 0;
let isUTMPlaying = false;
let utmPlayTimer = null;
let utmCurrentMode = "preset"; // "preset" or "custom"

document.addEventListener("DOMContentLoaded", function () {
  initUTM();
});

function showUTMNotice(msg, type = "error") {
  if (typeof window.showInlineNotice === "function") {
    window.showInlineNotice(msg, type, "page-notice");
    return;
  }
  const noticeEl = document.getElementById("page-notice");
  if (noticeEl) {
    noticeEl.textContent = msg;
    noticeEl.className = `inline-notice inline-notice-${type}`;
    noticeEl.hidden = false;
    noticeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
  } else {
    console.warn(`[${type}] ${msg}`);
  }
}

function initUTM() {
  const btnSimulate = document.getElementById("btn-utm-simulate");
  const btnSimulateCustom = document.getElementById("btn-utm-simulate-custom");
  const machineSelect = document.getElementById("utm-machine-select");
  const btnModePreset = document.getElementById("btn-mode-preset");
  const btnModeCustom = document.getElementById("btn-mode-custom-code");
  const btnLoadSample = document.getElementById("btn-utm-load-sample-code");

  // Mode toggles
  if (btnModePreset && btnModeCustom) {
    btnModePreset.addEventListener("click", () => switchUTMMode("preset"));
    btnModeCustom.addEventListener("click", () => switchUTMMode("custom"));
  }

  if (btnLoadSample) {
    btnLoadSample.addEventListener("click", function () {
      // Sample TOC encoding for machine_1_anbn on input '01'
      const samplePair = "10101101110110010111101111011110110011010110101100110111101101111011001101101110111101001110101110101001110111101110111101001110111010111011001111011110111101111011001111011111011111101111101110001011";
      document.getElementById("utm-custom-encoded-input").value = samplePair;
    });
  }

  if (btnSimulate) {
    btnSimulate.addEventListener("click", () => runUTMSimulation("preset"));
  }

  if (btnSimulateCustom) {
    btnSimulateCustom.addEventListener("click", () => runUTMSimulation("custom"));
  }

  if (machineSelect) {
    machineSelect.addEventListener("change", function () {
      document.getElementById("utm-encoded-string").innerText = "Click 'Run universal simulation' to generate encoding for " + this.options[this.selectedIndex].text;
    });
  }

  // Navigation controls
  const btnFirst = document.getElementById("btn-utm-first");
  const btnPrev = document.getElementById("btn-utm-prev");
  const btnPlay = document.getElementById("btn-utm-play");
  const btnNext = document.getElementById("btn-utm-next");
  const btnLast = document.getElementById("btn-utm-last");
  const scrubber = document.getElementById("utm-scrubber");

  if (btnFirst) btnFirst.addEventListener("click", () => goToUTMCycle(0));
  if (btnPrev) btnPrev.addEventListener("click", () => goToUTMCycle(currentCycleIdx - 1));
  if (btnNext) btnNext.addEventListener("click", () => goToUTMCycle(currentCycleIdx + 1));
  if (btnLast) btnLast.addEventListener("click", () => goToUTMCycle(utmStepsLog.length - 1));
  if (btnPlay) btnPlay.addEventListener("click", toggleUTMPlay);
  if (scrubber) {
    scrubber.addEventListener("input", function () {
      goToUTMCycle(parseInt(this.value));
    });
  }
}

function switchUTMMode(mode) {
  utmCurrentMode = mode;
  const panelPreset = document.getElementById("utm-panel-preset");
  const panelCustom = document.getElementById("utm-panel-custom-code");
  const btnModePreset = document.getElementById("btn-mode-preset");
  const btnModeCustom = document.getElementById("btn-mode-custom-code");

  if (mode === "preset") {
    panelPreset.style.display = "flex";
    panelCustom.style.display = "none";
    btnModePreset.className = "btn btn-primary button-sm";
    btnModeCustom.className = "btn btn-secondary button-sm";
  } else {
    panelPreset.style.display = "none";
    panelCustom.style.display = "block";
    btnModePreset.className = "btn btn-secondary button-sm";
    btnModeCustom.className = "btn btn-primary button-sm";
  }
}

async function runUTMSimulation(mode = "preset") {
  if (isUTMPlaying) toggleUTMPlay();

  let payload = {};
  let triggerBtn = null;

  if (mode === "preset") {
    triggerBtn = document.getElementById("btn-utm-simulate");
    payload = {
      machine_id: document.getElementById("utm-machine-select").value,
      input_string: document.getElementById("utm-input-string").value || "",
      max_steps: parseInt(document.getElementById("utm-max-steps").value) || 100
    };
  } else {
    triggerBtn = document.getElementById("btn-utm-simulate-custom");
    const encodedStr = document.getElementById("utm-custom-encoded-input").value.trim();
    if (!encodedStr) {
      showUTMNotice("Please provide a valid binary encoded machine string <M>000<w>.", "error");
      return;
    }
    payload = {
      encoded_string: encodedStr,
      max_steps: 150
    };
  }

  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = '<span>Simulating on UTM...</span>';
  }

  try {
    const res = await fetch("/api/utm/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.innerHTML = mode === "preset"
        ? '<i class="ph ph-play" aria-hidden="true"></i><span>Run universal simulation</span>'
        : '<i class="ph ph-play" aria-hidden="true"></i><span>Decode and simulate UTM</span>';
    }

    if (!data.success) {
      showUTMNotice("Universal simulation failed: " + (data.error || "unknown server error"), "error");
      return;
    }

    renderUTMResults(data.result);
  } catch (err) {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.innerHTML = mode === "preset"
        ? '<i class="ph ph-play" aria-hidden="true"></i><span>Run universal simulation</span>'
        : '<i class="ph ph-play" aria-hidden="true"></i><span>Decode and simulate UTM</span>';
    }
    console.error("UTM simulation error:", err);
    showUTMNotice("Network communication error during universal simulation.", "error");
  }
}

function renderUTMResults(res) {
  // 1. Render Encoded Representation
  const encBox = document.getElementById("utm-encoded-string");
  encBox.innerHTML = `
    <div style="margin-bottom: var(--sp-50); color: var(--text-primary);"><strong class="font-mono">&lang;M, w&rang; = </strong></div>
    <div style="color: var(--text-info);">${res.encoded_pair}</div>
  `;

  // 2. Render Code Legend
  const legendDiv = document.getElementById("utm-legend-content");
  if (res.legend) {
    let statesHtml = "<div><strong style='color: var(--text-info);'>State encodings</strong><ul style='list-style: none; margin-top: var(--sp-50); padding: 0;'>";
    Object.entries(res.legend.states).forEach(([s, code]) => {
      statesHtml += `<li style="margin-bottom: var(--sp-25);"><code>${s}</code> &rarr; <code>${code}</code></li>`;
    });
    statesHtml += "</ul></div>";

    let symsHtml = "<div><strong style='color: var(--text-secondary);'>Symbol encodings</strong><ul style='list-style: none; margin-top: var(--sp-50); padding: 0;'>";
    Object.entries(res.legend.symbols).forEach(([sym, code]) => {
      symsHtml += `<li style="margin-bottom: var(--sp-25);"><code>${sym}</code> &rarr; <code>${code}</code></li>`;
    });
    symsHtml += "</ul></div>";

    let dirsHtml = "<div><strong style='color: var(--text-primary);'>Head directions</strong><ul style='list-style: none; margin-top: var(--sp-50); padding: 0;'>";
    Object.entries(res.legend.directions).forEach(([d, code]) => {
      dirsHtml += `<li style="margin-bottom: var(--sp-25);"><code>${d}</code> &rarr; <code>${code}</code></li>`;
    });
    dirsHtml += "</ul></div>";

    legendDiv.innerHTML = statesHtml + symsHtml + dirsHtml;
  }

  // 3. Status Badge and Steps
  const statusBadge = document.getElementById("utm-status-badge");
  statusBadge.className = `status-indicator status-${res.final_status} caption-3`;
  statusBadge.innerText = res.final_status;
  document.getElementById("utm-sim-steps").innerText = res.total_sim_steps;

  // 4. Populate steps log array and configure scrubber
  utmStepsLog = res.steps_log || [];
  const scrubber = document.getElementById("utm-scrubber");
  if (scrubber) {
    scrubber.min = 0;
    scrubber.max = Math.max(0, utmStepsLog.length - 1);
    scrubber.value = 0;
  }

  // 5. Render Cycles Log list
  const logBox = document.getElementById("utm-cycles-log");
  logBox.innerHTML = "";
  utmStepsLog.forEach((s, idx) => {
    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.id = `utm-log-row-${idx}`;
    entry.style.cursor = "pointer";
    entry.title = "Click to inspect this cycle state";
    entry.innerHTML = `
      <span class="badge badge-purple caption-3 font-mono" style="min-width: 65px; text-align: center;">Cycle ${s.utm_cycle}</span>
      <span class="badge badge-blue caption-3 font-mono" style="min-width: 60px; text-align: center;">${s.phase}</span>
      <span style="color: var(--text-primary); flex: 1;">${s.action_description}</span>
    `;
    entry.addEventListener("click", () => goToUTMCycle(idx));
    logBox.appendChild(entry);
  });

  // Jump to first cycle
  goToUTMCycle(0);
}

function goToUTMCycle(idx) {
  if (!utmStepsLog || !utmStepsLog.length) return;
  if (idx < 0) idx = 0;
  if (idx >= utmStepsLog.length) idx = utmStepsLog.length - 1;

  currentCycleIdx = idx;
  const step = utmStepsLog[idx];

  // Update Track 3: State Register
  document.getElementById("utm-track-3-state").innerText = step.sim_state;
  document.getElementById("utm-sim-steps").innerText = step.sim_step;

  // Update Track 2: Simulated Work Tape
  renderUTMTrack2(step.sim_tape_window);

  // Update Scrubber and indicator
  const scrubber = document.getElementById("utm-scrubber");
  if (scrubber) scrubber.value = idx;
  document.getElementById("utm-step-indicator").innerText = `Cycle ${step.utm_cycle} / ${utmStepsLog[utmStepsLog.length - 1].utm_cycle} (Step ${step.sim_step})`;

  // Highlight active row in log
  document.querySelectorAll("#utm-cycles-log .log-entry").forEach(row => {
    row.style.background = "transparent";
  });
  const activeRow = document.getElementById(`utm-log-row-${idx}`);
  if (activeRow) {
    activeRow.style.background = "var(--surface-secondary-subtle)";
    activeRow.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // If reached end during autoplay, stop
  if (idx === utmStepsLog.length - 1 && isUTMPlaying) {
    toggleUTMPlay();
  }
}

function toggleUTMPlay() {
  const btn = document.getElementById("btn-utm-play");
  if (isUTMPlaying) {
    isUTMPlaying = false;
    clearInterval(utmPlayTimer);
    btn.innerHTML = '<i class="ph ph-play" aria-hidden="true"></i><span>Play</span>';
    btn.className = "btn btn-success button-sm";
  } else {
    if (!utmStepsLog || !utmStepsLog.length) return;
    if (currentCycleIdx >= utmStepsLog.length - 1) {
      currentCycleIdx = 0;
    }
    isUTMPlaying = true;
    btn.innerHTML = '<i class="ph ph-pause" aria-hidden="true"></i><span>Pause</span>';
    btn.className = "btn btn-danger button-sm";
    utmPlayTimer = setInterval(function () {
      if (currentCycleIdx < utmStepsLog.length - 1) {
        goToUTMCycle(currentCycleIdx + 1);
      } else {
        toggleUTMPlay();
      }
    }, 600);
  }
}

function renderUTMTrack2(tapeWindow) {
  const container = document.getElementById("utm-track-2-tape");
  container.innerHTML = "";
  if (!tapeWindow || !tapeWindow.length) return;

  tapeWindow.forEach(cell => {
    const wrap = document.createElement("div");
    wrap.className = "tape-cell-wrap";

    const pointer = document.createElement("div");
    pointer.className = "tape-head-pointer" + (cell.is_head ? " visible" : "");
    pointer.innerHTML = '<i class="ph ph-caret-down" aria-hidden="true"></i>';

    const div = document.createElement("div");
    div.className = "tape-cell" + (cell.is_head ? " active-head" : "");
    div.innerText = cell.symbol;

    const idx = document.createElement("div");
    idx.className = "tape-cell-index font-mono";
    idx.innerText = cell.index;

    wrap.appendChild(pointer);
    wrap.appendChild(div);
    wrap.appendChild(idx);
    container.appendChild(wrap);
  });
}
