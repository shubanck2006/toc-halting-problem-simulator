/**
 * Module 6: Theory of computation explorer controller
 */

let pcpCurrentTiles = [];
let pcpChosenSequence = [];

const SOLVE_LABEL =
  '<i class="ph ph-magnifying-glass" aria-hidden="true"></i><span>Bounded BFS auto solver</span>';
const SOLVE_BUSY =
  '<i class="ph ph-spinner" aria-hidden="true"></i><span>Searching</span>';

const RICE_PROPERTIES = {
  empty_lang: {
    question: "Is $L(M)$ empty?",
    semantic: true,
    non_trivial: true,
    decidable: false,
    verdict: "Undecidable",
    explanation:
      "Whether $L(M)$ is empty depends only on the recognized language, not on the machine syntax. Some machines recognize the empty language and others do not, so Rice's theorem applies."
  },
  accepts_epsilon: {
    question: "Does $M$ accept the empty string $\\varepsilon$?",
    semantic: true,
    non_trivial: true,
    decidable: false,
    verdict: "Undecidable",
    explanation:
      "Whether the empty string belongs to $L(M)$ is a nontrivial semantic property of the language. It is undecidable by reduction from the halting problem."
  },
  is_finite: {
    question: "Is $L(M)$ finite?",
    semantic: true,
    non_trivial: true,
    decidable: false,
    verdict: "Undecidable",
    explanation:
      "Finiteness is a property of the language itself. Some machines accept finite languages and others accept infinite ones, so Rice's theorem applies."
  },
  is_regular: {
    question: "Is $L(M)$ regular?",
    semantic: true,
    non_trivial: true,
    decidable: false,
    verdict: "Undecidable",
    explanation:
      "Whether a recursively enumerable language happens to be regular is a nontrivial semantic property of the language, so it is undecidable."
  },
  state_count: {
    question: "Does $M$ have more than five states?",
    semantic: false,
    non_trivial: true,
    decidable: true,
    verdict: "Decidable",
    explanation:
      "The number of states is a syntactic property of the machine description, not a property of $L(M)$. Two machines with different state counts can recognize the same language, so you can decide this by counting the states in the definition."
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
    hint: "Unsolvable instance: no finite sequence can match both length and prefixes"
  }
};

document.addEventListener("DOMContentLoaded", function () {
  initTheory();
});

function initTheory() {
  // Tab switching
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      tabBtns.forEach(function (b) {
        b.classList.remove("active");
        b.classList.remove("btn-primary");
        b.classList.add("btn-secondary");
        b.setAttribute("aria-selected", "false");
      });
      this.classList.add("active");
      this.classList.remove("btn-secondary");
      this.classList.add("btn-primary");
      this.setAttribute("aria-selected", "true");

      const targetId = this.getAttribute("data-tab");
      document.querySelectorAll(".theory-tab-content").forEach(function (c) {
        c.style.display = "none";
      });
      const target = document.getElementById(targetId);
      if (target) {
        target.style.display = "block";
      }

      if (window.triggerMathJax) window.triggerMathJax();
    });
  });

  // Rice's theorem buttons
  const riceBtns = document.querySelectorAll(".btn-rice-prop");
  riceBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      riceBtns.forEach(function (b) {
        b.classList.remove("active");
        b.classList.remove("btn-primary");
        b.classList.add("btn-secondary");
      });
      this.classList.add("active");
      this.classList.remove("btn-secondary");
      this.classList.add("btn-primary");
      showRiceVerdict(this.getAttribute("data-prop"));
    });
  });
  showRiceVerdict("empty_lang");

  // PCP presets
  const pcpPresetBtns = document.querySelectorAll(".btn-pcp-preset");
  pcpPresetBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      pcpPresetBtns.forEach(function (b) {
        b.classList.remove("active");
        b.classList.remove("btn-primary");
        b.classList.add("btn-secondary");
      });
      this.classList.add("active");
      this.classList.remove("btn-secondary");
      this.classList.add("btn-primary");
      loadPCPPreset(this.getAttribute("data-preset"));
    });
  });

  // PCP buttons
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
        notify("Enter a nonempty top string and a nonempty bottom string for the new domino.");
        return;
      }

      const nextId = pcpCurrentTiles.length
        ? Math.max.apply(null, pcpCurrentTiles.map(function (t) { return t.id; })) + 1
        : 1;
      pcpCurrentTiles.push({ id: nextId, top: topVal, bottom: bottomVal });
      topInput.value = "";
      bottomInput.value = "";
      renderAvailableTiles();
    });
  }

  if (btnResetTiles) {
    btnResetTiles.addEventListener("click", function () {
      const activePresetBtn = document.querySelector(".btn-pcp-preset.active");
      const presetKey = activePresetBtn
        ? activePresetBtn.getAttribute("data-preset")
        : "instance_solvable";
      loadPCPPreset(presetKey);
    });
  }

  // Load default PCP instance
  loadPCPPreset("instance_solvable");
}

/* ---------- Helpers ---------- */

function notify(message) {
  if (window.showInlineNotice) {
    window.showInlineNotice(message, "error");
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- Rice's theorem ---------- */

function showRiceVerdict(propKey) {
  const p = RICE_PROPERTIES[propKey];
  if (!p) return;

  const box = document.getElementById("rice-verdict-box");
  if (!box) return;

  const tone = p.decidable ? "var(--text-success)" : "var(--text-error)";
  const icon = p.decidable ? "ph-check-circle" : "ph-prohibit";

  box.innerHTML = `
    <div class="title-2" style="display: flex; align-items: center; gap: var(--sp-75); color: ${tone}; margin-bottom: var(--sp-100);">
      <i class="ph ${icon}" aria-hidden="true"></i>
      <span>Verdict: ${escapeHtml(p.verdict)}</span>
    </div>
    <div class="body-5 font-mono" style="color: var(--text-primary); margin-bottom: var(--sp-50);">
      ${escapeHtml(p.question)}
    </div>
    <div class="caption-2" style="color: var(--text-secondary); margin-bottom: var(--sp-100);">
      Semantic: <strong>${p.semantic ? "yes" : "no"}</strong> · Nontrivial: <strong>${p.non_trivial ? "yes" : "no"}</strong>
    </div>
    <p class="body-5" style="color: var(--text-secondary); max-width: 65ch;">${p.explanation}</p>
  `;

  if (window.triggerMathJax) window.triggerMathJax();
}

/* ---------- PCP presets and workspace ---------- */

function loadPCPPreset(presetKey) {
  const preset = PCP_PRESETS[presetKey];
  if (!preset) return;

  pcpCurrentTiles = preset.tiles.map(function (t) { return { ...t }; });
  pcpChosenSequence = [];
  renderAvailableTiles();
  updatePCPWorkspace();
  const box = document.getElementById("pcp-result-box");
  if (box) box.style.display = "none";
}

function renderAvailableTiles() {
  const container = document.getElementById("pcp-available-tiles");
  if (!container) return;
  container.innerHTML = "";

  pcpCurrentTiles.forEach(function (tile) {
    const domino = document.createElement("div");
    domino.className = "pcp-domino";
    domino.setAttribute("role", "button");
    domino.setAttribute("tabindex", "0");
    domino.innerHTML = `
      <div class="caption-3" style="color: var(--text-tertiary);">Tile ${tile.id}</div>
      <div class="domino-top">${escapeHtml(tile.top)}</div>
      <div class="domino-bottom">${escapeHtml(tile.bottom)}</div>
    `;
    domino.addEventListener("click", function () {
      pcpChosenSequence.push(tile.id);
      updatePCPWorkspace();
    });
    domino.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        pcpChosenSequence.push(tile.id);
        updatePCPWorkspace();
      }
    });
    container.appendChild(domino);
  });
}

function updatePCPWorkspace() {
  const workspace = document.getElementById("pcp-chosen-tiles");
  if (!workspace) return;
  workspace.innerHTML = "";

  const topConcat = document.getElementById("pcp-top-concat");
  const bottomConcat = document.getElementById("pcp-bottom-concat");

  if (!pcpChosenSequence.length) {
    workspace.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--sp-50); width: 100%; text-align: center; padding: var(--sp-200);">
        <i class="ph ph-squares-four" aria-hidden="true" style="color: var(--text-tertiary);"></i>
        <span class="body-4" style="color: var(--text-secondary);">No tiles selected</span>
        <span class="caption-2" style="color: var(--text-tertiary); max-width: 44ch;">Choose a domino above to build a candidate sequence, then verify the match.</span>
      </div>
    `;
    if (topConcat) topConcat.innerText = "(empty)";
    if (bottomConcat) bottomConcat.innerText = "(empty)";
    return;
  }

  const tileMap = {};
  pcpCurrentTiles.forEach(function (t) { tileMap[t.id] = t; });

  let topAcc = "";
  let bottomAcc = "";

  pcpChosenSequence.forEach(function (id, idx) {
    const tile = tileMap[id];
    if (!tile) return;

    topAcc += tile.top;
    bottomAcc += tile.bottom;

    const d = document.createElement("div");
    d.className = "pcp-domino";
    d.style.transform = "scale(0.85)";
    d.style.cursor = "default";
    d.innerHTML = `
      <div class="caption-3" style="color: var(--text-tertiary);">#${idx + 1} (T${tile.id})</div>
      <div class="domino-top">${escapeHtml(tile.top)}</div>
      <div class="domino-bottom">${escapeHtml(tile.bottom)}</div>
    `;
    workspace.appendChild(d);
  });

  if (topConcat) topConcat.innerText = topAcc;
  if (bottomConcat) bottomConcat.innerText = bottomAcc;
}

/* ---------- PCP actions ---------- */

function renderResultBox(box, tone, icon, title, bodyHtml) {
  const border = tone === "success"
    ? "var(--border-success)"
    : tone === "warning"
      ? "var(--border-warning)"
      : "var(--border-error)";
  const surface = tone === "success"
    ? "var(--surface-success-subtle)"
    : tone === "warning"
      ? "var(--surface-warning-subtle)"
      : "var(--surface-error-subtle)";
  const text = tone === "success"
    ? "var(--text-success)"
    : tone === "warning"
      ? "var(--text-warning)"
      : "var(--text-error)";

  box.className = "card";
  box.style.display = "block";
  box.style.background = surface;
  box.style.border = "1px solid " + border;
  box.innerHTML = `
    <div class="title-3" style="display: flex; align-items: center; gap: var(--sp-75); color: ${text}; margin-bottom: var(--sp-75);">
      <i class="ph ${icon}" aria-hidden="true"></i>
      <span>${title}</span>
    </div>
    ${bodyHtml}
  `;
  if (window.triggerMathJax) window.triggerMathJax();
}

async function verifyPCPSolution() {
  if (!pcpChosenSequence.length) {
    notify("Select at least one domino tile before verifying a match.");
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
      notify(
        "The match could not be verified. Check the selected tiles and try again. " +
          (data.error || "")
      );
      return;
    }

    const r = data.result;
    const box = document.getElementById("pcp-result-box");
    if (!box) return;

    if (r.match) {
      renderResultBox(
        box,
        "success",
        "ph-check-circle",
        "Match found",
        `
          <p class="body-5" style="color: var(--text-secondary); max-width: 65ch;">
            The sequence <strong class="font-mono">[${r.sequence.join(", ")}]</strong> produces identical top and bottom strings.
          </p>
          <div class="font-mono body-4" style="color: var(--text-success); margin-top: var(--sp-50); font-variant-numeric: tabular-nums;">'${escapeHtml(r.top_string)}'</div>
        `
      );
    } else {
      renderResultBox(
        box,
        "error",
        "ph-x-circle",
        "No match",
        `
          <p class="body-5" style="color: var(--text-secondary); max-width: 65ch;">
            The top string <span class="font-mono">'${escapeHtml(r.top_string)}'</span> does not equal the bottom string
            <span class="font-mono">'${escapeHtml(r.bottom_string)}'</span>. Adjust the sequence and verify again.
          </p>
        `
      );
    }
  } catch (err) {
    console.error("Verification error:", err);
    notify("The verification service did not respond. Confirm the server is running, then try again.");
  }
}

async function solvePCPBounded() {
  const btn = document.getElementById("btn-pcp-solve");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = SOLVE_BUSY;
  }

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

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = SOLVE_LABEL;
    }

    if (!data.success) {
      notify(
        "The bounded search could not run. Check the tile set and try again. " +
          (data.error || "")
      );
      return;
    }

    const r = data.result;
    const box = document.getElementById("pcp-result-box");
    if (!box) return;

    if (r.found) {
      pcpChosenSequence = r.sequence;
      updatePCPWorkspace();

      renderResultBox(
        box,
        "success",
        "ph-check-circle",
        "Solution found by bounded breadth first search",
        `
          <p class="body-5" style="color: var(--text-secondary); max-width: 65ch;">
            Sequence of tiles: <strong class="font-mono">[${r.sequence.join(", ")}]</strong>
          </p>
          <div class="font-mono body-4" style="color: var(--text-success); margin-top: var(--sp-50);">Matched string: '${escapeHtml(r.matched_string)}'</div>
        `
      );
    } else {
      renderResultBox(
        box,
        "warning",
        "ph-warning-circle",
        "No solution within the search bound",
        `
          <p class="body-5" style="color: var(--text-secondary); max-width: 65ch;">${escapeHtml(r.message)}</p>
          <p class="caption-2" style="color: var(--text-tertiary); max-width: 65ch; margin-top: var(--sp-50);">
            By Post's theorem, PCP is undecidable in general, so no algorithm can guarantee termination on every instance.
          </p>
        `
      );
    }
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = SOLVE_LABEL;
    }
    console.error("Solver error:", err);
    notify("The solver service did not respond. Confirm the server is running, then try again.");
  }
}
