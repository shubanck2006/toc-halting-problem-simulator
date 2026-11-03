"""
Language Classes Module: Recursive (R) vs Recursively Enumerable (RE).
Demonstrates the fundamental theoretical distinction between Deciders and Recognizers:
- Deciders halt on ALL inputs (Accept or Reject in finite steps).
- Recognizers halt and accept valid strings, but may run indefinitely (loop) on non-members.
"""
from typing import Dict, Any, List
from backend.turing_machine import TuringMachine
from backend.transition import Transition


def build_decider_odd_ones() -> TuringMachine:
    """
    Decider for Language L = { w in {0,1}* | w contains an odd number of 1s }.
    Always halts for all inputs w.
    - If odd number of 1s: halts in q_accept
    - If even number of 1s: halts in q_reject
    """
    states = ["q_even", "q_odd", "q_accept", "q_reject"]
    transitions = [
        # In q_even (even 1s seen so far):
        Transition("q_even", "0", "q_even", "0", "R"),
        Transition("q_even", "1", "q_odd", "1", "R"),
        Transition("q_even", "B", "q_reject", "B", "S"),  # End of tape with even 1s -> REJECT

        # In q_odd (odd 1s seen so far):
        Transition("q_odd", "0", "q_odd", "0", "R"),
        Transition("q_odd", "1", "q_even", "1", "R"),
        Transition("q_odd", "B", "q_accept", "B", "S"),   # End of tape with odd 1s -> ACCEPT
    ]

    return TuringMachine(
        name="Decider (Recursive Language)",
        description="Decides L = {w in {0,1}* | w has odd number of '1's}. Always halts in finite steps on EVERY input.",
        states=states,
        input_alphabet=["0", "1"],
        tape_alphabet=["0", "1", "B"],
        initial_state="q_even",
        blank_symbol="B",
        accept_states=["q_accept"],
        reject_states=["q_reject"],
        transitions=transitions,
        max_step_limit=500
    )


def build_recognizer_odd_ones() -> TuringMachine:
    """
    Recognizer for Language L = { w in {0,1}* | w contains an odd number of 1s }.
    Accepts valid strings (odd 1s) by halting in q_accept.
    For invalid strings (even 1s), it enters an infinite loop (loops forever)!
    """
    states = ["q_scan_even", "q_scan_odd", "q_accept", "q_loop_left", "q_loop_right"]
    transitions = [
        # Scan phase:
        Transition("q_scan_even", "0", "q_scan_even", "0", "R"),
        Transition("q_scan_even", "1", "q_scan_odd", "1", "R"),
        # End of tape reached with even 1s: DO NOT REJECT, ENTER INFINITE LOOP!
        Transition("q_scan_even", "B", "q_loop_right", "B", "R"),

        Transition("q_scan_odd", "0", "q_scan_odd", "0", "R"),
        Transition("q_scan_odd", "1", "q_scan_even", "1", "R"),
        # End of tape reached with odd 1s: ACCEPT and HALT
        Transition("q_scan_odd", "B", "q_accept", "B", "S"),

        # Infinite loop behavior: oscillates back and forth endlessly
        Transition("q_loop_right", "B", "q_loop_left", "X", "L"),
        Transition("q_loop_right", "0", "q_loop_left", "0", "L"),
        Transition("q_loop_right", "1", "q_loop_left", "1", "L"),
        Transition("q_loop_right", "X", "q_loop_left", "X", "L"),

        Transition("q_loop_left", "B", "q_loop_right", "B", "R"),
        Transition("q_loop_left", "0", "q_loop_right", "0", "R"),
        Transition("q_loop_left", "1", "q_loop_right", "1", "R"),
        Transition("q_loop_left", "X", "q_loop_right", "X", "R"),
    ]

    return TuringMachine(
        name="Recognizer (Recursively Enumerable)",
        description="Recognizes L = {w in {0,1}* | w has odd number of '1's}. Halts and accepts if w in L; loops indefinitely if w not in L.",
        states=states,
        input_alphabet=["0", "1"],
        tape_alphabet=["0", "1", "B", "X"],
        initial_state="q_scan_even",
        blank_symbol="B",
        accept_states=["q_accept"],
        reject_states=[],  # No explicit reject state - non-members loop!
        transitions=transitions,
        max_step_limit=500
    )


def compare_language_classes(input_string: str, step_limit: int = 500) -> Dict[str, Any]:
    """
    Run both Decider and Recognizer simultaneously on the given input string
    and compare their termination behavior.
    """
    decider = build_decider_odd_ones()
    decider.max_step_limit = step_limit
    decider.load_input(input_string)
    decider_res = decider.run(max_steps=step_limit)

    recognizer = build_recognizer_odd_ones()
    recognizer.max_step_limit = step_limit
    recognizer.load_input(input_string)
    recognizer_res = recognizer.run(max_steps=step_limit)

    ones_count = input_string.count("1")
    is_in_language = (ones_count % 2 == 1)

    return {
        "input_string": input_string,
        "is_in_language": is_in_language,
        "ones_count": ones_count,
        "decider": {
            "status": decider.status,
            "steps": decider.step_count,
            "tape": decider.tape.to_string(),
            "history": decider.history[:100],  # sample history for UI
            "explanation": (
                f"Decider halted in {decider.step_count} steps with status '{decider.status}'. "
                f"As a true Decider, it guarantees a definitive answer in finite time."
            )
        },
        "recognizer": {
            "status": recognizer.status,
            "steps": recognizer.step_count,
            "tape": recognizer.tape.to_string(),
            "history": recognizer.history[:100],
            "explanation": (
                f"Recognizer halted with '{recognizer.status}' in {recognizer.step_count} steps."
                if recognizer.status == "ACCEPTED"
                else (
                    f"Recognizer hit step limit ({step_limit}) while in state '{recognizer.current_state}'. "
                    f"Because it is a recognizer on an invalid input (even count of 1s), it loops indefinitely! "
                    f"An observer cannot distinguish between 'still running' and 'infinite loop' without a decider."
                )
            )
        },
        "comparison_table": [
            {
                "property": "Definition",
                "recursive": "A language for which a Turing Machine exists that halts on every input (Decider).",
                "recursively_enumerable": "A language for which a TM exists that halts and accepts if w ∈ L, but may loop if w ∉ L (Recognizer)."
            },
            {
                "property": "Behavior on w ∈ L",
                "recursive": "Halts in accepting state (YES)",
                "recursively_enumerable": "Halts in accepting state (YES)"
            },
            {
                "property": "Behavior on w ∉ L",
                "recursive": "Halts in rejecting state (NO) in finite time",
                "recursively_enumerable": "May loop forever without halting; never returns definitive NO"
            },
            {
                "property": "Decidability",
                "recursive": "Decidable (membership problem is computable)",
                "recursively_enumerable": "Partially Decidable / Semi-decidable"
            },
            {
                "property": "Closure under Complement",
                "recursive": "Closed (if L is recursive, complement L̄ is also recursive)",
                "recursively_enumerable": "NOT closed (L and L̄ are both RE iff L is Recursive)"
            },
            {
                "property": "Chomsky Hierarchy",
                "recursive": "Decidable languages (between Context-Sensitive and Type 0)",
                "recursively_enumerable": "Type-0 Languages (Unrestricted Grammars)"
            }
        ]
    }
