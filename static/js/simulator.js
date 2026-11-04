/**
 * Module 1 & 2: Interactive Turing Machine Simulator Controller
 */

let currentMachine = null;
let currentTapeCells = {};
let currentHead = 0;
let currentState = "q0";
let currentStep = 0;
let currentStatus = "INITIALIZED";
let isPlaying = false;
let playTimer = null;
let playSpeed = 400;

document.addEventListener("DOMContentLoaded", function () {
  initSimulator();
});

function showSimulatorNotice(msg, type = "error") {
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

function initSimulator() {
  const machineSelect = document.getElementById("machine-select");
  const btnLoad = document.getElementById("btn-load");
  const btnStep = document.getElementById("btn-step");
  const btnPlay = document.getElementById("btn-play");
  const btnRunAll = document.getElementById("btn-run-all");
  const btnReset = document.getElementById("btn-reset");
  const btnToggleEditor = document.getElementById("btn-toggle-editor");
  const btnApplyJson = document.getElementById("btn-apply-json");
  const btnResetJson = document.getElementById("btn-reset-json");
  const btnClearLog = document.getElementById("btn-clear-log");
  const speedSlider = document.getElementById("speed-slider");

  if (machineSelect) {
    machineSelect.addEventListener("change", function () {
      loadMachine(this.value);
    });
    // Load initial machine
    loadMachine(machineSelect.value);
  }

  if (btnLoad) {
    btnLoad.addEventListener("click", function () {
      resetMachineState();
    });
  }

  if (btnStep) {
    btnStep.addEventListener("click", function () {
      executeStep();
    });
  }

  if (btnPlay) {
    btnPlay.addEventListener("click", togglePlay);
  }

  if (btnRunAll) {
    btnRunAll.addEventListener("click", runToCompletion);
  }

  if (btnReset) {
    btnReset.addEventListener("click", resetMachineState);
  }

  if (btnClearLog) {
    btnClearLog.addEventListener("click", function () {
      document.getElementById("history-log").innerHTML = "";
    });
  }

  if (speedSlider) {
    speedSlider.addEventListener("input", function () {
      playSpeed = parseInt(this.value);
      document.getElementById("speed-val").innerText = playSpeed + "ms";
      if (isPlaying) {
        clearInterval(playTimer);
        playTimer = setInterval(executeStep, playSpeed);
      }
    });
  }

  if (btnToggleEditor) {
    btnToggleEditor.addEventListener("click", function () {
      const panel = document.getElementById("editor-panel");
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });
  }

  if (btnApplyJson) {
    btnApplyJson.addEventListener("click", function () {
      try {
        const text = document.getElementById("machine-json-area").value;
        const parsed = JSON.parse(text);
        currentMachine = parsed;
        setupMachineUI(currentMachine);
        resetMachineState();
        showSimulatorNotice("Custom machine configuration loaded.", "info");
      } catch (err) {
        showSimulatorNotice("Invalid JSON syntax in custom machine definition. Check brackets and quotes, then apply again.", "error");
      }
    });
  }

  if (btnResetJson) {
    btnResetJson.addEventListener("click", function () {
      const select = document.getElementById("machine-select");
      loadMachine(select.value);
    });
  }
}

async function loadMachine(machineId) {
  try {
    const res = await fetch(`/api/machines/${machineId}`);
    const data = await res.json();
    if (data.success && data.machine) {
      currentMachine = data.machine;
      if (currentMachine.default_input !== undefined) {
        document.getElementById("input-string").value = currentMachine.default_input;
      }
      document.getElementById("machine-json-area").value = JSON.stringify(currentMachine, null, 2);
      setupMachineUI(currentMachine);
      resetMachineState();
    }
  } catch (err) {
    console.error("Failed to load machine:", err);
    showSimulatorNotice("Failed to load machine configuration from server.", "error");
  }
}

function setupMachineUI(m) {
  const states = m.states || [];
  const inAlpha = m.input_alphabet || [];
  const tapeAlpha = m.tape_alphabet || [];
  const accStates = m.accept_states || [];
  const blank = m.blank_symbol || "B";
  const start = m.initial_state || (states.length ? states[0] : "q0");

  document.getElementById("machine-desc-box").innerHTML = `
    <div><strong style="color: var(--text-primary);">${m.name || "Turing Machine"}:</strong> <span style="color: var(--text-secondary);">${m.description || ""}</span></div>
    <div style="margin-top: var(--sp-50); font-family: var(--font-mono); color: var(--text-tertiary);">
      States Q = {${states.join(", ")}} | &Sigma; = {${inAlpha.join(", ")}} |
      &Gamma; = {${tapeAlpha.join(", ")}} | Blank = '${blank}' |
      Start = ${start} | Accept F = {${accStates.join(", ")}}
    </div>
  `;

  // Render transitions table
  const tbody = document.getElementById("transitions-tbody");
  tbody.innerHTML = "";
  if (m.transitions && m.transitions.length) {
    document.getElementById("rule-count-badge").innerText = `${m.transitions.length} Rules`;
    m.transitions.forEach((t) => {
      const row = document.createElement("tr");
      row.id = `rule-row-${t.current_state}-${t.read_symbol}`;
      row.innerHTML = `
        <td><strong style="color: var(--text-primary);">${t.current_state}</strong></td>
        <td><code>${t.read_symbol}</code></td>
        <td><strong style="color: var(--text-primary);">${t.next_state}</strong></td>
        <td><code>${t.write_symbol}</code></td>
        <td><code>${t.direction}</code></td>
      `;
      tbody.appendChild(row);
    });
  } else {
    document.getElementById("rule-count-badge").innerText = "0 Rules";
  }

  // Render Mermaid State Graph
  renderStateGraph(m);
}

function renderStateGraph(m) {
  const container = document.getElementById("mermaid-graph-container");
  const start = m.initial_state || "q0";
  let code = "stateDiagram-v2\n";
  code += `    [*] --> ${start}\n`;

  const edges = {};
  (m.transitions || []).forEach(t => {
    const key = `${t.current_state}->${t.next_state}`;
    if (!edges[key]) edges[key] = [];
    edges[key].push(`${t.read_symbol}/${t.write_symbol},${t.direction}`);
  });

  Object.entries(edges).forEach(([k, labels]) => {
    const [src, dst] = k.split("->");
    code += `    ${src} --> ${dst}: ${labels.join(";")}\n`;
  });

  (m.accept_states || []).forEach(acc => {
    code += `    ${acc} --> [*]: Accept\n`;
  });

  container.innerHTML = `<div class="mermaid" id="mermaid-graph-inner">${code}</div>`;
  if (window.mermaid) {
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          darkMode: true,
          background: '#1F1F1F',
          primaryColor: '#272727',
          primaryTextColor: '#F5F5F5',
          primaryBorderColor: '#313131',
          lineColor: '#82B1E1',
          secondaryColor: '#181818',
          tertiaryColor: '#1F1F1F'
        }
      });
      mermaid.run({ nodes: [document.getElementById("mermaid-graph-inner")] }).catch(err => {
        console.warn("Mermaid render error:", err);
      });
    } catch (err) {
      console.warn("Mermaid init error:", err);
    }
  }
}

function resetMachineState() {
  if (isPlaying) togglePlay();

  const inputStr = document.getElementById("input-string").value || "";
  currentTapeCells = {};
  for (let i = 0; i < inputStr.length; i++) {
    currentTapeCells[i] = inputStr[i];
  }
  currentHead = 0;
  currentState = currentMachine ? currentMachine.initial_state : "q0";
  currentStep = 0;

  if (currentMachine && (currentMachine.accept_states || []).includes(currentState)) {
    currentStatus = "ACCEPTED";
  } else if (currentMachine && (currentMachine.reject_states || []).includes(currentState)) {
    currentStatus = "REJECTED";
  } else {
    currentStatus = "INITIALIZED";
  }

  updateMetrics();
  renderTape();
  highlightTransition(currentState, readCurrentSymbol());
  logStep(`Machine loaded with input '${inputStr}'. Initial state: ${currentState}.`, "INITIALIZED");
}

function readCurrentSymbol() {
  const blank = currentMachine ? currentMachine.blank_symbol : "B";
  return currentTapeCells[currentHead] !== undefined ? currentTapeCells[currentHead] : blank;
}

function renderTape() {
  const track = document.getElementById("tape-track");
  track.innerHTML = "";
  const blank = currentMachine ? currentMachine.blank_symbol : "B";

  // Display a window centered around head: head - 6 to head + 6
  const windowRadius = 6;
  const startIdx = currentHead - windowRadius;
  const endIdx = currentHead + windowRadius;

  for (let i = startIdx; i <= endIdx; i++) {
    const sym = currentTapeCells[i] !== undefined ? currentTapeCells[i] : blank;
    const isHead = (i === currentHead);

    const cellWrap = document.createElement("div");
    cellWrap.className = "tape-cell-wrap";

    const pointer = document.createElement("div");
    pointer.className = "tape-head-pointer" + (isHead ? " visible" : "");
    pointer.innerHTML = '<i class="ph ph-caret-down" aria-hidden="true"></i>';

    const cell = document.createElement("div");
    cell.className = "tape-cell" + (isHead ? " active-head" : "");
    cell.innerText = sym;

    const index = document.createElement("div");
    index.className = "tape-cell-index font-mono";
    index.innerText = i;

    cellWrap.appendChild(pointer);
    cellWrap.appendChild(cell);
    cellWrap.appendChild(index);
    track.appendChild(cellWrap);
  }
}

function updateMetrics() {
  document.getElementById("metric-step").innerText = currentStep;
  document.getElementById("metric-head").innerText = currentHead;
  document.getElementById("metric-state").innerText = currentState;
  document.getElementById("metric-symbol").innerText = readCurrentSymbol();

  const statusBadge = document.getElementById("status-badge");
  statusBadge.className = `status-indicator status-${currentStatus} caption-3`;
  statusBadge.innerText = currentStatus;

  // Instantaneous Description (ID)
  renderInstantaneousDescription();
}

function renderInstantaneousDescription() {
  const idBox = document.getElementById("id-display");
  const blank = currentMachine ? currentMachine.blank_symbol : "B";

  // Collect left string
  const indices = Object.keys(currentTapeCells).map(Number).filter(k => currentTapeCells[k] !== blank);
  indices.push(currentHead);
  const minIdx = Math.min(...indices);
  const maxIdx = Math.max(...indices);

  let leftStr = "";
  for (let i = minIdx; i < currentHead; i++) {
    leftStr += currentTapeCells[i] !== undefined ? currentTapeCells[i] : blank;
  }
  while (blank && leftStr.startsWith(blank)) {
    leftStr = leftStr.slice(blank.length);
  }

  let rightStr = "";
  for (let i = currentHead; i <= maxIdx; i++) {
    rightStr += currentTapeCells[i] !== undefined ? currentTapeCells[i] : blank;
  }
  while (blank && rightStr.endsWith(blank)) {
    rightStr = rightStr.slice(0, -blank.length);
  }
  if (!rightStr) rightStr = readCurrentSymbol();

  idBox.innerHTML = `<span>${leftStr}</span> <span class="state-token">${currentState}</span> <span>${rightStr}</span>`;
}

function highlightTransition(state, symbol) {
  document.querySelectorAll(".table-custom tr").forEach(r => r.classList.remove("active-transition"));
  const row = document.getElementById(`rule-row-${state}-${symbol}`);
  if (row) {
    row.classList.add("active-transition");
    row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

async function executeStep() {
  if (currentStatus === "ACCEPTED" || currentStatus === "REJECTED" || currentStatus === "STEP_LIMIT_REACHED") {
    if (isPlaying) togglePlay();
    return;
  }

  const stepLimit = parseInt(document.getElementById("step-limit").value) || 1000;
  if (currentStep >= stepLimit) {
    currentStatus = "STEP_LIMIT_REACHED";
    updateMetrics();
    logStep(`Safety limit of ${stepLimit} steps reached. Execution paused. Nonterminating computation is undecidable.`, "STEP_LIMIT_REACHED");
    if (isPlaying) togglePlay();
    return;
  }

  try {
    const payload = {
      machine: currentMachine,
      current_state: currentState,
      head: currentHead,
      cells: currentTapeCells,
      step_count: currentStep,
      blank_symbol: currentMachine.blank_symbol,
      step_limit: stepLimit,
      status: currentStatus
    };

    const res = await fetch("/api/simulator/step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.success) {
      showSimulatorNotice("Step execution failed: " + (data.error || "unknown server error"), "error");
      if (isPlaying) togglePlay();
      return;
    }

    const snap = data.snapshot;
    currentState = snap.state;
    currentHead = snap.head;
    currentStep = snap.step;
    currentStatus = snap.status;
    currentTapeCells = snap.tape.cells;

    renderTape();
    updateMetrics();
    highlightTransition(currentState, snap.read_symbol);

    const stepResult = data.step_result;
    if (stepResult && stepResult.note) {
      logStep(stepResult.note, currentStatus);
    }

    if (currentStatus === "ACCEPTED" || currentStatus === "REJECTED" || currentStatus === "STEP_LIMIT_REACHED") {
      if (isPlaying) togglePlay();
    }
  } catch (err) {
    console.error("Step execution failed:", err);
    showSimulatorNotice("Network communication error during step execution.", "error");
    if (isPlaying) togglePlay();
  }
}

function togglePlay() {
  const btn = document.getElementById("btn-play");
  if (isPlaying) {
    isPlaying = false;
    clearInterval(playTimer);
    btn.innerHTML = '<i class="ph ph-play" aria-hidden="true"></i><span>Play</span>';
    btn.className = "btn btn-success button-sm";
  } else {
    if (currentStatus === "ACCEPTED" || currentStatus === "REJECTED" || currentStatus === "STEP_LIMIT_REACHED") {
      resetMachineState();
    }
    isPlaying = true;
    btn.innerHTML = '<i class="ph ph-pause" aria-hidden="true"></i><span>Pause</span>';
    btn.className = "btn btn-danger button-sm";
    playTimer = setInterval(executeStep, playSpeed);
  }
}

async function runToCompletion() {
  if (isPlaying) togglePlay();

  const inputStr = document.getElementById("input-string").value || "";
  const stepLimit = parseInt(document.getElementById("step-limit").value) || 1000;

  try {
    const payload = {
      machine: currentMachine,
      input_string: inputStr,
      step_limit: stepLimit
    };

    const res = await fetch("/api/simulator/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.success) {
      showSimulatorNotice("Simulation run failed: " + (data.error || "unknown server error"), "error");
      return;
    }

    const summary = data.summary;
    const history = data.history;

    if (history && history.length) {
      const last = history[history.length - 1];
      currentState = summary.final_state || last.state;
      currentHead = last.head;
      currentStep = summary.total_steps || last.step;
      currentStatus = summary.status || last.status;

      // Update tape cells with the actual final tape from server
      if (data.tape && data.tape.cells) {
        currentTapeCells = {};
        Object.entries(data.tape.cells).forEach(([k, v]) => {
          currentTapeCells[parseInt(k)] = v;
        });
      }

      // Populate history log
      const box = document.getElementById("history-log");
      box.innerHTML = "";
      history.forEach(h => {
        if (h.note) {
          const entry = document.createElement("div");
          entry.className = "log-entry";
          const badgeClass = h.status === 'ACCEPTED' ? 'badge-green' : h.status === 'REJECTED' ? 'badge-red' : 'badge-blue';
          entry.innerHTML = `
            <span class="badge ${badgeClass} caption-3 font-mono">
              Step ${h.step}
            </span>
            <span style="color: var(--text-primary);">${h.note}</span>
          `;
          box.prepend(entry);
        }
      });

      renderTape();
      updateMetrics();
      highlightTransition(currentState, readCurrentSymbol());
    }
  } catch (err) {
    console.error("Run all failed:", err);
    showSimulatorNotice("Network communication error during simulation run.", "error");
  }
}

function logStep(msg, status) {
  const box = document.getElementById("history-log");
  const entry = document.createElement("div");
  entry.className = "log-entry";
  const badgeClass = status === 'ACCEPTED' ? 'badge-green' : status === 'REJECTED' ? 'badge-red' : 'badge-blue';
  entry.innerHTML = `
    <span class="badge ${badgeClass} caption-3 font-mono">
      Step ${currentStep}
    </span>
    <span style="color: var(--text-primary);">${msg}</span>
  `;
  box.prepend(entry);
}
