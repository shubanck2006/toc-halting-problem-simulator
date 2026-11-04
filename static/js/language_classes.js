/**
 * Module 4: Recursive and recursively enumerable languages controller
 */

document.addEventListener("DOMContentLoaded", function () {
  initLanguageClasses();
});

const RUN_BOTH_LABEL =
  '<i class="ph ph-play" aria-hidden="true"></i><span>Run both machines</span>';
const RUN_BOTH_BUSY =
  '<i class="ph ph-spinner" aria-hidden="true"></i><span>Simulating</span>';

function initLanguageClasses() {
  const btnRun = document.getElementById("btn-run-comparison");
  const inputEl = document.getElementById("lang-input-string");
  const presetBtns = document.querySelectorAll(".btn-preset-str");

  presetBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (inputEl) {
        inputEl.value = this.getAttribute("data-val") || "";
      }
      runComparison();
    });
  });

  if (btnRun) {
    btnRun.addEventListener("click", runComparison);
    // Initial run
    runComparison();
  }
}

async function runComparison() {
  const inputEl = document.getElementById("lang-input-string");
  const btnRun = document.getElementById("btn-run-comparison");
  const inputStr = inputEl ? inputEl.value : "";

  if (btnRun) {
    btnRun.disabled = true;
    btnRun.innerHTML = RUN_BOTH_BUSY;
  }

  try {
    const res = await fetch("/api/language_classes/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input_string: inputStr, step_limit: 400 })
    });

    const data = await res.json();

    if (btnRun) {
      btnRun.disabled = false;
      btnRun.innerHTML = RUN_BOTH_LABEL;
    }

    if (!data.success) {
      notify(
        "The comparison could not run. Check that the input uses only 0 and 1, then try again. " +
          (data.error || "")
      );
      return;
    }

    renderComparisonResults(data.comparison);
  } catch (err) {
    if (btnRun) {
      btnRun.disabled = false;
      btnRun.innerHTML = RUN_BOTH_LABEL;
    }
    console.error("Comparison execution error:", err);
    notify("The comparison service did not respond. Confirm the server is running, then try again.");
  }
}

function notify(message) {
  if (window.showInlineNotice) {
    window.showInlineNotice(message, "error");
  }
}

function renderComparisonResults(comp) {
  // Decider
  const dBadge = document.getElementById("decider-status-badge");
  dBadge.className = `status-indicator status-${comp.decider.status} caption-3`;
  dBadge.innerText = comp.decider.status;
  document.getElementById("decider-steps").innerText = comp.decider.steps;
  document.getElementById("decider-tape").innerText = comp.decider.tape || "(blank)";
  document.getElementById("decider-explanation").innerText = comp.decider.explanation;

  // Recognizer
  const rBadge = document.getElementById("recognizer-status-badge");
  rBadge.className = `status-indicator status-${comp.recognizer.status} caption-3`;
  rBadge.innerText = comp.recognizer.status;
  document.getElementById("recognizer-steps").innerText = comp.recognizer.steps;
  document.getElementById("recognizer-tape").innerText = comp.recognizer.tape || "(blank)";
  document.getElementById("recognizer-explanation").innerText = comp.recognizer.explanation;
}
