/**
 * Module 5: Halting Problem & Undecidability Proof Controller
 */

let proofSteps = [];
let currentStepIdx = 0;

document.addEventListener("DOMContentLoaded", function () {
  initHaltingProof();
});

async function initHaltingProof() {
  // Fetch proof steps
  try {
    const res = await fetch("/api/halting_proof/steps");
    const data = await res.json();
    if (data.success && data.steps) {
      proofSteps = data.steps;
    }
  } catch (err) {
    console.error("Failed to fetch proof steps:", err);
  }

  const btnPrev = document.getElementById("btn-prev-step");
  const btnNext = document.getElementById("btn-next-step");
  const bullets = document.querySelectorAll(".step-bullet");

  if (btnPrev) {
    btnPrev.addEventListener("click", function () {
      if (currentStepIdx > 0) {
        goToStep(currentStepIdx - 1);
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener("click", function () {
      if (currentStepIdx < proofSteps.length - 1) {
        goToStep(currentStepIdx + 1);
      }
    });
  }

  bullets.forEach(b => {
    b.addEventListener("click", function () {
      const stepNum = parseInt(this.getAttribute("data-step"));
      goToStep(stepNum - 1);
    });
  });

  // Paradox buttons
  const btnPredictHalt = document.getElementById("btn-predict-halt");
  const btnPredictLoop = document.getElementById("btn-predict-loop");

  if (btnPredictHalt) {
    btnPredictHalt.addEventListener("click", () => simulateAdversary("HALT"));
  }
  if (btnPredictLoop) {
    btnPredictLoop.addEventListener("click", () => simulateAdversary("LOOP"));
  }

  // Sample program buttons
  const sampleBtns = document.querySelectorAll(".btn-sample-prog");
  sampleBtns.forEach(btn => {
    btn.addEventListener("click", function () {
      sampleBtns.forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      loadSampleProgram(this.getAttribute("data-id"));
    });
  });

  // Load initial sample
  loadSampleProgram("simple_terminating");
}

function goToStep(idx) {
  if (!proofSteps || !proofSteps[idx]) return;
  currentStepIdx = idx;
  const s = proofSteps[idx];

  document.getElementById("step-number-label").innerText = `Step ${s.step_number} of ${proofSteps.length}`;
  document.getElementById("step-title").innerText = s.title;
  document.getElementById("step-subtitle").innerText = s.subtitle;
  document.getElementById("step-math-box").innerHTML = `$$ ${s.math} $$`;
  document.getElementById("step-description").innerText = s.description;

  // Update button states
  document.getElementById("btn-prev-step").disabled = (idx === 0);
  document.getElementById("btn-next-step").disabled = (idx === proofSteps.length - 1);

  // Update bullets
  document.querySelectorAll(".step-bullet").forEach((b, i) => {
    if (i === idx) {
      b.style.background = "var(--accent-blue)";
      b.style.borderColor = "#93c5fd";
      b.style.color = "#fff";
    } else if (i < idx) {
      b.style.background = "#1e3a8a";
      b.style.borderColor = "#3b82f6";
      b.style.color = "#93c5fd";
    } else {
      b.style.background = "var(--bg-secondary)";
      b.style.borderColor = "var(--border-color)";
      b.style.color = "var(--text-muted)";
    }
  });

  if (window.triggerMathJax) {
    triggerMathJax();
  }
}

async function simulateAdversary(pred) {
  try {
    const res = await fetch("/api/halting_proof/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prediction: pred })
    });

    const data = await res.json();
    if (!data.success) {
      alert("Error simulating paradox: " + data.error);
      return;
    }

    const r = data.result;
    const container = document.getElementById("paradox-output-container");
    container.style.display = "block";
    document.getElementById("adversary-code-trace").innerText = r.code_snippet;
    document.getElementById("adversary-detail-trace").innerText = r.detail;

    container.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    console.error("Paradox simulation error:", err);
  }
}

async function loadSampleProgram(progId) {
  try {
    const res = await fetch(`/api/halting_proof/sample/${progId}`);
    const data = await res.json();
    if (data.success && data.sample) {
      const s = data.sample;
      document.getElementById("sample-title").innerText = s.name;
      document.getElementById("sample-code").innerText = s.code;
      document.getElementById("sample-outcome").innerText = s.actual_outcome;
      document.getElementById("sample-desc").innerText = s.explanation;
    }
  } catch (err) {
    console.error("Sample program error:", err);
  }
}
