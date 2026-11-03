/**
 * Module 6: Theory of Computation Explorer Controller
 */

let pcpCurrentTiles = [];
let pcpChosenSequence = [];

const RICE_PROPERTIES = {
  empty_lang: {
    question: "Is L(M) empty (L(M) = ∅)?",
    semantic: true,
    non_trivial: true,
    verdict: "UNDECIDABLE",
    explanation: "This property depends only on the language recognized, not on machine syntax. Some TMs recognize the empty language, while others do not. By Rice's Theorem, this is UNDECIDABLE."
  },
  accepts_epsilon: {
    question: "Does M accept the empty string ε?",
    semantic: true,
    non_trivial: true,
    verdict: "UNDECIDABLE",
    explanation: "Whether ε ∈ L(M) is a non-trivial semantic property of the language. Proved undecidable directly by reduction from the Halting Problem."
  },
  is_finite: {
    question: "Is the language L(M) finite?",
    semantic: true,
    non_trivial: true,
    verdict: "UNDECIDABLE",
    explanation: "Finiteness is a property of the language. Some TMs accept finite languages, others accept infinite ones. By Rice's Theorem, UNDECIDABLE."
  },
  is_regular: {
    question: "Is the language L(M) regular?",
    semantic: true,
    non_trivial: true,
    verdict: "UNDECIDABLE",
    explanation: "Whether an RE language happens to be regular (can be accepted by a DFA) is a non-trivial semantic property. UNDECIDABLE."
  },
  state_count: {
    question: "Does M have more than 5 states?",
    semantic: false,
    non_trivial: true,
    verdict: "DECIDABLE (Rice's Theorem DOES NOT apply!)",
    explanation: "This is a SYNTACTIC property of the machine description, NOT a property of the language L(M)! (Two machines with different numbers of states can recognize the same language). You can decide this simply by counting the states in the definition!"
  }
};

const PCP_PRESETS = {
  instance_solvable: {
    id: "instance_solvable",
    tiles: [
      { id: 1, top: "a", bottom: "baa" },
      { id: 2, top: "ab", bottom: "aa" },
      { id: 3, top: "bba", bottom: "bb" }
    ],
    hint: "Known match sequence: [3, 2, 3, 1]"
  },
  instance_simple: {
    id: "instance_simple",
    tiles: [
      { id: 1, top: "b", bottom: "ca" },
      { id: 2, top: "a", bottom: "ab" },
      { id: 3, top: "ca", bottom: "a" },
      { id: 4, top: "abc", bottom: "c" }
    ],
    hint: "Known match sequence: [2, 1, 3, 2, 4]"
  },
  instance_unsolvable: {
    id: "instance_unsolvable",
    tiles: [
      { id: 1, top: "001", bottom: "0" },
      { id: 2, top: "01", bottom: "011" },
      { id: 3, top: "11", bottom: "111" }
    ],
    hint: "Unsolvable instance (No finite sequence can match length and prefixes)"
  }
};

document.addEventListener("DOMContentLoaded", function () {
  initTheory();
});

function initTheory() {
  // Tab switching
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", function () {
      tabBtns.forEach(b => {
        b.classList.remove("active");
        b.classList.remove("btn-primary");
        b.classList.add("btn-secondary");
      });
      this.classList.add("active");
      this.classList.remove("btn-secondary");
      this.classList.add("btn-primary");

      const targetId = this.getAttribute("data-tab");
      document.querySelectorAll(".theory-tab-content").forEach(c => {
        c.style.display = "none";
      });
      const target = document.getElementById(targetId);
      if (target) {
        target.style.display = "block";
      }

      if (window.triggerMathJax) triggerMathJax();
    });
  });

  // Rice's theorem buttons
  const riceBtns = document.querySelectorAll(".btn-rice-prop");
  riceBtns.forEach(btn => {
    btn.addEventListener("click", function () {
      riceBtns.forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      showRiceVerdict(this.getAttribute("data-prop"));
    });
  });
  showRiceVerdict("empty_lang");

  // PCP Presets
  const pcpPresetBtns = document.querySelectorAll(".btn-pcp-preset");
  pcpPresetBtns.forEach(btn => {
    btn.addEventListener("click", function () {
      pcpPresetBtns.forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      loadPCPPreset(this.getAttribute("data-preset"));
    });
  });

  // PCP Buttons
  const btnUndo = document.getElementById("btn-pcp-undo");
  const btnClear = document.getElementById("btn-pcp-clear");
  const btnVerify = document.getElementById("btn-pcp-verify");
  const btnSolve = document.getElementById("btn-pcp-solve");

  if (btnUndo) {
    btnUndo.addEventListener("click", function () {
      if (pcpChosenSequence.length) {
        pcpChosenSequence.pop();
        updatePCPWorkspace();
      }
    });
  }

  if (btnClear) {
    btnClear.addEventListener("click", function () {
      pcpChosenSequence = [];
      updatePCPWorkspace();
    });
  }

  if (btnVerify) {
    btnVerify.addEventListener("click", verifyPCPSolution);
  }

  if (btnSolve) {
    btnSolve.addEventListener("click", solvePCPBounded);
  }

  // Custom tile handlers
  const btnAddTile = document.getElementById("btn-pcp-add-tile");
  const btnResetTiles = document.getElementById("btn-pcp-reset-tiles");

  if (btnAddTile) {
    btnAddTile.addEventListener("click", function () {
      const topInput = document.getElementById("pcp-custom-top");
      const bottomInput = document.getElementById("pcp-custom-bottom");
      const topVal = (topInput.value || "").trim();
      const bottomVal = (bottomInput.value || "").trim();

      if (!topVal || !bottomVal) {
        alert("Please enter non-empty strings for both Top and Bottom.");
        return;
      }

      const nextId = pcpCurrentTiles.length ? Math.max(...pcpCurrentTiles.map(t => t.id)) + 1 : 1;
      pcpCurrentTiles.push({ id: nextId, top: topVal, bottom: bottomVal });
      topInput.value = "";
      bottomInput.value = "";
      renderAvailableTiles();
    });
  }

  if (btnResetTiles) {
    btnResetTiles.addEventListener("click", function () {
      const activePresetBtn = document.querySelector(".btn-pcp-preset.active");
      const presetKey = activePresetBtn ? activePresetBtn.getAttribute("data-preset") : "instance_solvable";
      loadPCPPreset(presetKey);
    });
  }

  // Load default PCP instance
  loadPCPPreset("instance_solvable");
}

function showRiceVerdict(propKey) {
  const p = RICE_PROPERTIES[propKey];
  if (!p) return;

  const box = document.getElementById("rice-verdict-box");
  const isDecidable = p.verdict.startsWith("DECIDABLE");

  box.style.borderLeftColor = isDecidable ? "var(--accent-green)" : "var(--accent-red)";
  box.innerHTML = `
    <div style="font-size: 1.1rem; font-weight: 700; color: ${isDecidable ? '#6ee7b7' : '#fca5a5'}; margin-bottom: 0.5rem;">
      Verdict: ${p.verdict}
    </div>
    <div style="font-size: 0.88rem; color: #cbd5e1; margin-bottom: 0.5rem;">
      <strong>Property Tested:</strong> <code>${p.question}</code>
    </div>
    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">
      Semantic (Behavioral): <strong>${p.semantic ? 'YES' : 'NO'}</strong> | Non-Trivial: <strong>${p.non_trivial ? 'YES' : 'NO'}</strong>
    </div>
    <p style="font-size: 0.88rem; color: #e2e8f0; line-height: 1.6;">${p.explanation}</p>
  `;
}

function loadPCPPreset(presetKey) {
  const preset = PCP_PRESETS[presetKey];
  if (!preset) return;

  pcpCurrentTiles = preset.tiles.map(t => ({ ...t }));
  pcpChosenSequence = [];
  renderAvailableTiles();
  updatePCPWorkspace();
  document.getElementById("pcp-result-box").style.display = "none";
}

function renderAvailableTiles() {
  const container = document.getElementById("pcp-available-tiles");
  container.innerHTML = "";

  pcpCurrentTiles.forEach(tile => {
    const domino = document.createElement("div");
    domino.className = "pcp-domino";
    domino.innerHTML = `
      <div style="font-size: 0.72rem; color: var(--text-dim);">Tile ${tile.id}</div>
      <div class="domino-top">${tile.top}</div>
      <div class="domino-bottom">${tile.bottom}</div>
    `;
    domino.addEventListener("click", function () {
      pcpChosenSequence.push(tile.id);
      updatePCPWorkspace();
    });
    container.appendChild(domino);
  });
}

function updatePCPWorkspace() {
  const workspace = document.getElementById("pcp-chosen-tiles");
  workspace.innerHTML = "";

  if (!pcpChosenSequence.length) {
    workspace.innerHTML = `<span style="color: var(--text-dim); font-size: 0.85rem;">Click domino tiles above to assemble your solution.</span>`;
    document.getElementById("pcp-top-concat").innerText = "(empty)";
    document.getElementById("pcp-bottom-concat").innerText = "(empty)";
    return;
  }

  const tileMap = {};
  pcpCurrentTiles.forEach(t => tileMap[t.id] = t);

  let topAcc = "";
  let bottomAcc = "";

  pcpChosenSequence.forEach((id, idx) => {
    const tile = tileMap[id];
    if (tile) {
      topAcc += tile.top;
      bottomAcc += tile.bottom;

      const d = document.createElement("div");
      d.className = "pcp-domino";
      d.style.transform = "scale(0.85)";
      d.style.cursor = "default";
      d.innerHTML = `
        <div style="font-size: 0.68rem; color: var(--text-dim);">#${idx + 1} (T${tile.id})</div>
        <div class="domino-top">${tile.top}</div>
        <div class="domino-bottom">${tile.bottom}</div>
      `;
      workspace.appendChild(d);
    }
  });

  document.getElementById("pcp-top-concat").innerText = topAcc;
  document.getElementById("pcp-bottom-concat").innerText = bottomAcc;
}

async function verifyPCPSolution() {
  if (!pcpChosenSequence.length) {
    alert("Please select at least one domino tile before verifying!");
    return;
  }

  try {
    const res = await fetch("/api/theory/pcp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tiles: pcpCurrentTiles,
        sequence: pcpChosenSequence
      })
    });

    const data = await res.json();
    if (!data.success) {
      alert("Error: " + data.error);
      return;
    }

    const r = data.result;
    const box = document.getElementById("pcp-result-box");
    box.style.display = "block";

    if (r.match) {
      box.className = "card";
      box.style.background = "rgba(16, 185, 129, 0.15)";
      box.style.border = "2px solid var(--accent-green)";
      box.innerHTML = `
        <h4 style="color: #6ee7b7; margin-bottom: 0.3rem;">🎉 MATCH SUCCESSFUL!</h4>
        <p style="font-size: 0.9rem; color: #fff;">Sequence: <strong>[${r.sequence.join(", ")}]</strong> produces identical top and bottom strings:</p>
        <div style="font-family: var(--font-mono); font-size: 1.1rem; color: #6ee7b7; margin-top: 0.4rem;">'${r.top_string}'</div>
      `;
    } else {
      box.className = "card";
      box.style.background = "rgba(239, 68, 68, 0.15)";
      box.style.border = "2px solid var(--accent-red)";
      box.innerHTML = `
        <h4 style="color: #fca5a5; margin-bottom: 0.3rem;">❌ NO MATCH</h4>
        <p style="font-size: 0.88rem; color: #fecaca;">Top string ('${r.top_string}') does not equal bottom string ('${r.bottom_string}').</p>
      `;
    }
  } catch (err) {
    console.error("Verification error:", err);
  }
}

async function solvePCPBounded() {
  const btn = document.getElementById("btn-pcp-solve");
  btn.disabled = true;
  btn.innerText = "Searching with BFS...";

  try {
    const res = await fetch("/api/theory/pcp/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tiles: pcpCurrentTiles,
        max_depth: 8
      })
    });

    const data = await res.json();
    btn.disabled = false;
    btn.innerHTML = "<span>🔍 Bounded BFS Auto-Solver</span>";

    if (!data.success) {
      alert("Solve error: " + data.error);
      return;
    }

    const r = data.result;
    const box = document.getElementById("pcp-result-box");
    box.style.display = "block";

    if (r.found) {
      pcpChosenSequence = r.sequence;
      updatePCPWorkspace();

      box.className = "card";
      box.style.background = "rgba(16, 185, 129, 0.15)";
      box.style.border = "2px solid var(--accent-green)";
      box.innerHTML = `
        <h4 style="color: #6ee7b7; margin-bottom: 0.3rem;">✓ Solution Discovered by Bounded BFS!</h4>
        <p style="font-size: 0.9rem; color: #fff;">Sequence of tiles: <strong>[${r.sequence.join(", ")}]</strong></p>
        <div style="font-family: var(--font-mono); font-size: 1.05rem; color: #6ee7b7; margin-top: 0.4rem;">Matched String: '${r.matched_string}'</div>
      `;
    } else {
      box.className = "card";
      box.style.background = "rgba(245, 158, 11, 0.15)";
      box.style.border = "2px solid var(--accent-amber)";
      box.innerHTML = `
        <h4 style="color: #fcd34d; margin-bottom: 0.3rem;">⚠️ No Solution Within Search Bound</h4>
        <p style="font-size: 0.88rem; color: #fde68a;">${r.message}</p>
        <p style="font-size: 0.8rem; color: var(--text-dim); margin-top: 0.2rem;">Remember: By Post's theorem, PCP is undecidable in general, meaning no algorithm can ever guarantee terminating with an answer for all instances!</p>
      `;
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = "<span>🔍 Bounded BFS Auto-Solver</span>";
    console.error("Solver error:", err);
  }
}
