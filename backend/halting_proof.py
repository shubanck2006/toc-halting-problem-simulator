"""
Halting Proof Module.
Implements the interactive proof by contradiction of Alan Turing's 1936 theorem:
The Halting Problem is undecidable.
Demonstrates the hypothetical halting detector, the adversarial OPPOSITE machine,
and the inescapable self-referential paradox.
"""
from typing import Dict, Any, List, Optional


class HaltingProofSimulator:
    """
    Simulates and visualizes Turing's Diagonalization proof by contradiction.
    """

    @staticmethod
    def get_proof_steps() -> List[Dict[str, Any]]:
        """Return the structured 5-step proof sequence."""
        return [
            {
                "step_number": 1,
                "title": "Hypothesis: The Universal Halting Detector Exists",
                "subtitle": "Assume there is an algorithm HALT(P, I)",
                "math": "HALT(P, I) = \\begin{cases} \\text{HALT} & \\text{if } P(I) \\text{ halts} \\\\ \\text{LOOP} & \\text{if } P(I) \\text{ runs forever} \\end{cases}",
                "description": (
                    "Suppose computer scientists discover a universal program `HALT(P, I)` that takes any program description "
                    "P and any input I, and always returns HALT or LOOP in finite time without getting stuck."
                ),
                "visual_type": "detector_box",
                "detector_state": "idle"
            },
            {
                "step_number": 2,
                "title": "Self-Reference: Programs Taking Themselves as Input",
                "subtitle": "Can a program process its own code?",
                "math": "P(\\langle P \\rangle)",
                "description": (
                    "Every computer program is stored as text or binary digits. Therefore, a program can receive its own "
                    "source code as an input string! Compilers regularly do this (a compiler compiles its own source code). "
                    "Thus, we can query `HALT(P, <P>)` to ask: 'Does program P halt when run on its own description?'"
                ),
                "visual_type": "self_reference_feed",
                "detector_state": "query_self"
            },
            {
                "step_number": 3,
                "title": "Construction: Turing's Adversary Machine (OPPOSITE)",
                "subtitle": "Building a machine that defies the detector",
                "math": "\\text{OPPOSITE}(\\langle P \\rangle) = \\begin{cases} \\text{LOOP FOREVER} & \\text{if } \\text{HALT}(P, \\langle P \\rangle) = \\text{HALT} \\\\ \\text{HALT & ACCEPT} & \\text{if } \\text{HALT}(P, \\langle P \\rangle) = \\text{LOOP} \\end{cases}",
                "description": (
                    "Using the hypothetical `HALT` detector as a subroutine, we build a new machine called `OPPOSITE` (or `D` for Diagonalizer). "
                    "`OPPOSITE` asks `HALT(P, <P>)` what P will do on itself. If `HALT` predicts 'HALT', `OPPOSITE` deliberately enters an "
                    "infinite loop! If `HALT` predicts 'LOOP', `OPPOSITE` immediately halts."
                ),
                "visual_type": "adversary_diagram",
                "detector_state": "adversary_ready"
            },
            {
                "step_number": 4,
                "title": "The Paradox: Running OPPOSITE on <OPPOSITE>",
                "subtitle": "Feeding the adversary machine its own code",
                "math": "\\text{What does } \\text{OPPOSITE}(\\langle \\text{OPPOSITE} \\rangle) \\text{ do}?",
                "description": (
                    "We feed `OPPOSITE` into itself. To determine its behavior, `OPPOSITE` consults `HALT(OPPOSITE, <OPPOSITE>)`.\n\n"
                    "• Case A: HALT predicts 'HALT' ➔ OPPOSITE executes its `if` branch and LOOPS FOREVER! (HALT was wrong!)\n\n"
                    "• Case B: HALT predicts 'LOOP' ➔ OPPOSITE executes its `else` branch and HALTS IMMEDIATELY! (HALT was wrong!)"
                ),
                "visual_type": "contradiction_split",
                "detector_state": "paradox_trigger"
            },
            {
                "step_number": 5,
                "title": "Conclusion: Proof by Contradiction (Reductio ad Absurdum)",
                "subtitle": "A universal halting algorithm is mathematically impossible",
                "math": "\\nexists \\text{ HALT}(P, I) \\quad \\Longrightarrow \\quad \\text{The Halting Problem is Undecidable}",
                "description": (
                    "Neither output ('HALT' nor 'LOOP') can be correct. Whatever `HALT` predicts, `OPPOSITE` does the exact opposite. "
                    "Because our logical deductions were completely sound, our initial assumption must be false: "
                    "No algorithm HALT(P, I) can exist! The Halting Problem is fundamentally UNDECIDABLE."
                ),
                "visual_type": "proof_conclusion",
                "detector_state": "undecidable"
            }
        ]

    @staticmethod
    def simulate_adversary_run(detector_prediction: str) -> Dict[str, Any]:
        """
        Simulate the exact behavioral reaction when the hypothetical detector
        predicts either 'HALT' or 'LOOP' for OPPOSITE(<OPPOSITE>).
        """
        pred = detector_prediction.upper().strip()
        if pred == "HALT":
            actual_behavior = "LOOPS_FOREVER"
            contradiction_detail = (
                "Detector predicted: HALT.\n"
                "Opposite machine reaction: Because the detector said 'HALT', OPPOSITE intentionally entered an infinite loop (while True: pass).\n"
                "Actual outcome: LOOPS FOREVER.\n"
                "CONTRADICTION: The detector said it would halt, but it ran forever!"
            )
        elif pred == "LOOP":
            actual_behavior = "HALTS_IMMEDIATELY"
            contradiction_detail = (
                "Detector predicted: LOOP.\n"
                "Opposite machine reaction: Because the detector said 'LOOP', OPPOSITE took the else branch and halted immediately.\n"
                "Actual outcome: HALTED.\n"
                "CONTRADICTION: The detector said it would loop forever, but it halted!"
            )
        else:
            raise ValueError(f"Invalid detector prediction: '{detector_prediction}'. Expected 'HALT' or 'LOOP'.")

        return {
            "prediction": pred,
            "actual_behavior": actual_behavior,
            "is_contradiction": True,
            "detail": contradiction_detail,
            "code_snippet": (
                "def OPPOSITE(program_code):\n"
                "    prediction = HALT(program_code, program_code)\n"
                f"    # Detector returned: '{pred}'\n"
                "    if prediction == 'HALT':\n"
                f"        while True: pass  # {'[EXECUTED]' if pred == 'HALT' else '[SKIPPED]'}\n"
                "    else:\n"
                f"        return 'HALTED'   # {'[EXECUTED]' if pred == 'LOOP' else '[SKIPPED]'}\n\n"
                f"# Result of OPPOSITE(<OPPOSITE>): {actual_behavior}\n"
                f"# Prediction was: {pred} -> CONTRADICTION!"
            )
        }

    @staticmethod
    def analyze_sample_program(program_id: str) -> Dict[str, Any]:
        """
        Demonstrates various sample programs and explains why static halting
        analysis cannot solve all programs in general.
        """
        samples = {
            "simple_terminating": {
                "name": "Simple Counter (Guaranteed Halt)",
                "code": "def countdown(n=10):\n    while n > 0:\n        n -= 1\n    return 'Done'",
                "actual_outcome": "HALTS",
                "explanation": "Strictly monotonic decreasing loop counter that reaches 0 in finite steps. Trivial to verify."
            },
            "infinite_loop": {
                "name": "Unconditional While-True (Definite Loop)",
                "code": "def forever():\n    while True:\n        pass",
                "actual_outcome": "LOOPS",
                "explanation": "No loop exit conditions. Trivial to detect for this exact pattern."
            },
            "collatz": {
                "name": "Collatz Conjecture Explorer (Open Math Problem)",
                "code": "def collatz(n):\n    while n > 1:\n        if n % 2 == 0:\n            n = n // 2\n        else:\n            n = 3 * n + 1\n    return True",
                "actual_outcome": "UNKNOWN_GENERAL",
                "explanation": (
                    "Whether collatz(n) halts for EVERY natural number n is one of mathematics' most famous unsolved problems! "
                    "If a general halting detector existed, it could solve the Collatz Conjecture instantly by checking collatz_searcher()."
                )
            },
            "goldbach": {
                "name": "Goldbach Conjecture Verifier",
                "code": "def find_goldbach_counterexample():\n    n = 4\n    while True:\n        if not is_sum_of_two_primes(n):\n            return n  # Halts only if counterexample exists!\n        n += 2",
                "actual_outcome": "UNKNOWN_GENERAL",
                "explanation": (
                    "This program halts if and only if Goldbach's conjecture is false. "
                    "A halting detector would solve unsolved mathematical conjectures simply by looking at their verification loops!"
                )
            }
        }
        return samples.get(program_id, samples["simple_terminating"])
