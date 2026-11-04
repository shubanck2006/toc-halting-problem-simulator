/**
 * Module 5: Halting Problem and Undecidability Proof Controller
 * Compliant with ElayaDesign ai-design-skills and DESIGN.md
 */

let proofSteps = [];
let currentStepIdx = 0;

document.addEventListener("DOMContentLoaded", function () {
  initHaltingProof();
});

async function initHaltingProof() {
  // Fetch structured proof sequence
  try {
    const res = await fetch("/api/halting_proof/steps");
    const data = await res.json();
    if (data.success && data.steps) {
      proofSteps = data.steps;
    }
  } catch (err) {
    console.error("Failed to fetch proof steps:", err);
    if (window.showInlineNotice) {
      window.showInlineNotice("Unable to load proof steps. Check that the local Flask server is running and try again.", "error");
    }
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
      const stepNum = parseInt(this.getAttribute("data-step"), 10);
      if (!isNaN(stepNum)) {
        goToStep(stepNum - 1);
      }
    });
  });

  // Adversary paradox buttons
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

  const numLabel = document.getElementById("step-number-label");
  if (numLabel) {
    numLabel.innerText = `Step ${s.step_number} of ${proofSteps.length}`;
  }

  const titleEl = document.getElementById("step-title");
  if (titleEl) {
    titleEl.innerText = s.title;
  }

  const subEl = document.getElementById("step-subtitle");
  if (subEl) {
    subEl.innerText = s.subtitle;
  }

  const mathBox = document.getElementById("step-math-box");
  if (mathBox) {
    mathBox.innerHTML = `$$ ${s.math} $$`;
  }

  const descEl = document.getElementById("step-description");
  if (descEl) {
    descEl.innerText = s.description;
  }

  // Update button navigation states
  const btnPrev = document.getElementById("btn-prev-step");
  if (btnPrev) {
    btnPrev.disabled = (idx === 0);
  }

  const btnNext = document.getElementById("btn-next-step");
  if (btnNext) {
    btnNext.disabled = (idx === proofSteps.length - 1);
  }

  // Update step bullets using clean design tokens
  document.querySelectorAll(".step-bullet").forEach((b, i) => {
    b.classList.remove("active", "completed");
    if (i === idx) {
      b.classList.add("active");
      b.style.background = "var(--action-primary, #4A85C5)";
      b.style.borderColor = "var(--border-action-primary, #6BA0D8)";
      b.style.color = "var(--text-primary, #FFFFFF)";
    } else if (i < idx) {
      b.classList.add("completed");
      b.style.background = "var(--surface-secondary, #272727)";
      b.style.borderColor = "var(--action-primary, #4A85C5)";
      b.style.color = "var(--text-info, #82B1E1)";
    } else {
      b.style.background = "var(--surface-primary-subtle, #1F1F1F)";
      b.style.borderColor = "var(--border-primary, #313131)";
      b.style.color = "var(--text-secondary, #9B9B9B)";
    }
  });

  if (window.triggerMathJax) {
    triggerMathJax();
  }
}

async function simulateAdversary(pred) {
  const btnPredictHalt = document.getElementById("btn-predict-halt");
  const btnPredictLoop = document.getElementById("btn-predict-loop");

  try {
    if (btnPredictHalt) btnPredictHalt.disabled = true;
    if (btnPredictLoop) btnPredictLoop.disabled = true;

    const res = await fetch("/api/halting_proof/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prediction: pred })
    });

    const data = await res.json();
    if (!data.success) {
      if (window.showInlineNotice) {
        window.showInlineNotice("Simulation request failed. Check that the local Flask server is running and try again.", "error");
      }
      return;
    }

    const r = data.result;
    const container = document.getElementById("paradox-output-container");
    if (container) {
      container.style.display = "block";
    }

    const codeTrace = document.getElementById("adversary-code-trace");
    if (codeTrace) {
      codeTrace.innerText = r.code_snippet;
    }

    const detailTrace = document.getElementById("adversary-detail-trace");
    if (detailTrace) {
      detailTrace.innerText = r.detail;
    }

    if (container) {
      container.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  } catch (err) {
    console.error("Paradox simulation error:", err);
    if (window.showInlineNotice) {
      window.showInlineNotice("Simulation request failed. Check that the local Flask server is running and try again.", "error");
    }
  } finally {
    if (btnPredictHalt) btnPredictHalt.disabled = false;
    if (btnPredictLoop) btnPredictLoop.disabled = false;
  }
}

async function loadSampleProgram(progId) {
  try {
    const res = await fetch(`/api/halting_proof/sample/${progId}`);
    const data = await res.json();
    if (data.success && data.sample) {
      const s = data.sample;
      const titleEl = document.getElementById("sample-title");
      if (titleEl) titleEl.innerText = s.name;

      const codeEl = document.getElementById("sample-code");
      if (codeEl) codeEl.innerText = s.code;

      const outcomeEl = document.getElementById("sample-outcome");
      if (outcomeEl) outcomeEl.innerText = s.actual_outcome;

      const descEl = document.getElementById("sample-desc");
      if (descEl) descEl.innerText = s.explanation;
    }
  } catch (err) {
    console.error("Sample program error:", err);
    if (window.showInlineNotice) {
      window.showInlineNotice("Failed to load sample program. Check that the local Flask server is running and try again.", "error");
    }
  }
}
