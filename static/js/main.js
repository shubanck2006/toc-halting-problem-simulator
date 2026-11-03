/**
 * Common utilities for TOC Halting Problem Simulator
 */

function triggerMathJax() {
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise().catch(function (err) {
      console.warn("MathJax typeset error:", err);
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  triggerMathJax();
});
