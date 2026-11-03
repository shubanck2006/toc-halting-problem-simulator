/**
 * Module 4: Recursive vs Recursively Enumerable Languages Controller
 */

document.addEventListener("DOMContentLoaded", function () {
  initLanguageClasses();
});

function initLanguageClasses() {
  const btnRun = document.getElementById("btn-run-comparison");
  const inputEl = document.getElementById("lang-input-string");
  const presetBtns = document.querySelectorAll(".btn-preset-str");

  presetBtns.forEach(btn => {
    btn.addEventListener("click", function () {
      inputEl.value = this.getAttribute("data-val");
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
  const inputStr = document.getElementById("lang-input-string").value || "";
  const btnRun = document.getElementById("btn-run-comparison");
  btnRun.disabled = true;
  btnRun.innerText = "Simulating...";

  try {
    const res = await fetch("/api/language_classes/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input_string: inputStr, step_limit: 400 })
    });

    const data = await res.json();
    btnRun.disabled = false;
    btnRun.innerHTML = "<span>⚡ Run Both Machines</span>";

    if (!data.success) {
      alert("Error: " + data.error);
      return;
    }

    renderComparisonResults(data.comparison);
  } catch (err) {
    btnRun.disabled = false;
    btnRun.innerHTML = "<span>⚡ Run Both Machines</span>";
    console.error("Comparison execution error:", err);
  }
}

function renderComparisonResults(comp) {
  // Decider
  const dBadge = document.getElementById("decider-status-badge");
  dBadge.className = `status-indicator status-${comp.decider.status}`;
  dBadge.innerText = comp.decider.status;
  document.getElementById("decider-steps").innerText = comp.decider.steps;
  document.getElementById("decider-tape").innerText = comp.decider.tape || "(blank)";
  document.getElementById("decider-explanation").innerText = comp.decider.explanation;

  // Recognizer
  const rBadge = document.getElementById("recognizer-status-badge");
  rBadge.className = `status-indicator status-${comp.recognizer.status}`;
  rBadge.innerText = comp.recognizer.status;
  document.getElementById("recognizer-steps").innerText = comp.recognizer.steps;
  document.getElementById("recognizer-tape").innerText = comp.recognizer.tape || "(blank)";
  document.getElementById("recognizer-explanation").innerText = comp.recognizer.explanation;
}
