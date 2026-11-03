"""
Turing Machine Module.
Implements the formal 7-tuple: M = (Q, Σ, Γ, δ, q0, B, F).
Supports step-by-step execution, history recording, instantaneous descriptions (IDs),
and rigorous status reporting respecting execution step limits.
"""
from typing import Dict, List, Set, Optional, Any, Union, Tuple
import json
from backend.tape import Tape
from backend.transition import Transition, TransitionTable


class TuringMachine:
    """
    Formal 7-tuple Turing Machine:
    Q: States
    Sigma: Input Alphabet
    Gamma: Tape Alphabet (Sigma subset Gamma, blank_symbol in Gamma)
    delta: Transition function
    q0: Initial state
    blank_symbol: Blank symbol (B)
    F: Set of accepting states
    """

    def __init__(
        self,
        name: str = "Turing Machine",
        description: str = "",
        states: Optional[List[str]] = None,
        input_alphabet: Optional[List[str]] = None,
        tape_alphabet: Optional[List[str]] = None,
        initial_state: str = "q0",
        blank_symbol: str = "B",
        accept_states: Optional[List[str]] = None,
        reject_states: Optional[List[str]] = None,
        transitions: Optional[List[Union[Transition, Dict[str, Any]]]] = None,
        max_step_limit: int = 1000
    ):
        self.name = name
        self.description = description
        self.states: List[str] = [str(s).strip() for s in states] if states is not None else ["q0"]
        self.input_alphabet: List[str] = [str(a) for a in input_alphabet] if input_alphabet is not None else ["0", "1"]
        self.blank_symbol: str = str(blank_symbol) if blank_symbol else "B"

        tape_alpha = list(tape_alphabet) if tape_alphabet is not None else list(self.input_alphabet)
        if self.blank_symbol not in tape_alpha:
            tape_alpha.append(self.blank_symbol)
        self.tape_alphabet: List[str] = tape_alpha

        self.initial_state: str = str(initial_state).strip()
        self.accept_states: Set[str] = set(str(s).strip() for s in accept_states) if accept_states is not None else {"q_accept"}
        self.reject_states: Set[str] = set(str(s).strip() for s in reject_states) if reject_states is not None else {"q_reject"}
        self.max_step_limit: int = max_step_limit

        self.transitions: TransitionTable = TransitionTable()
        if transitions:
            for t in transitions:
                if isinstance(t, Transition):
                    self.transitions.add(t)
                elif isinstance(t, dict):
                    self.transitions.add(Transition.from_dict(t))

        # Runtime state
        self.tape: Tape = Tape("", blank_symbol=self.blank_symbol)
        self.current_state: str = self.initial_state
        self.step_count: int = 0
        self.status: str = "INITIALIZED"  # INITIALIZED, RUNNING, ACCEPTED, REJECTED, HALTED, STEP_LIMIT_REACHED
        self.history: List[Dict[str, Any]] = []
        self.input_string: str = ""

    def load_input(self, input_string: str) -> None:
        """Initialize the TM with an input string on tape."""
        self.input_string = input_string
        self.tape = Tape(input_string, blank_symbol=self.blank_symbol)
        self.current_state = self.initial_state
        self.step_count = 0
        self.history = []

        if self.current_state in self.accept_states:
            self.status = "ACCEPTED"
        elif self.current_state in self.reject_states:
            self.status = "REJECTED"
        else:
            self.status = "INITIALIZED"

        # Record initial configuration (Step 0)
        self._record_history_step(transition=None, note="Initial Configuration")

    def get_instantaneous_description(self) -> str:
        """
        Calculates Instantaneous Description (ID) formatted as: u q v
        where u is tape content to left of head, q is state, v is symbol under head + right content.
        Example: '01q100' or 'q0B'
        """
        min_idx, max_idx = self.tape.get_bounds()
        head = self.tape.head

        # Left of head: from min(min_idx, head) up to head - 1
        left_chars = []
        for i in range(min(min_idx, head), head):
            left_chars.append(self.tape._cells.get(i, self.blank_symbol))
        u = "".join(left_chars).lstrip(self.blank_symbol)

        # Head symbol and right: from head up to max(max_idx, head)
        right_chars = []
        for i in range(head, max(max_idx, head) + 1):
            right_chars.append(self.tape._cells.get(i, self.blank_symbol))
        v = "".join(right_chars).rstrip(self.blank_symbol)
        if not v:
            v = self.tape.read()  # at least the head symbol

        return f"{u} [{self.current_state}] {v}".strip()

    def _record_history_step(self, transition: Optional[Transition], note: str = "") -> None:
        """Append snapshot of current machine state to history."""
        self.history.append({
            "step": self.step_count,
            "state": self.current_state,
            "head": self.tape.head,
            "read_symbol": self.tape.read(),
            "id": self.get_instantaneous_description(),
            "status": self.status,
            "tape_window": self.tape.get_window(radius=7),
            "tape_bounds": self.tape.get_bounds(),
            "transition_fired": transition.to_dict() if transition else None,
            "note": note
        })

    def step(self) -> Dict[str, Any]:
        """
        Execute a single computation step.
        Returns the snapshot of the step taken.
        """
        if self.status in ("ACCEPTED", "REJECTED", "HALTED", "STEP_LIMIT_REACHED"):
            return self.history[-1] if self.history else self.get_state_snapshot()

        if self.step_count >= self.max_step_limit:
            self.status = "STEP_LIMIT_REACHED"
            self._record_history_step(
                transition=None,
                note=f"Execution step limit ({self.max_step_limit}) reached. Cannot decide non-termination in finite steps."
            )
            return self.history[-1]

        self.status = "RUNNING"
        current_symbol = self.tape.read()
        transition = self.transitions.get(self.current_state, current_symbol)

        if transition is None:
            # No transition exists from (current_state, current_symbol)
            if self.current_state in self.accept_states:
                self.status = "ACCEPTED"
                note = f"Halted in accepting state '{self.current_state}'. Input accepted!"
            elif self.current_state in self.reject_states:
                self.status = "REJECTED"
                note = f"Halted in explicit rejecting state '{self.current_state}'. Input rejected."
            else:
                self.status = "REJECTED"
                note = f"No transition defined for δ({self.current_state}, {current_symbol}). Machine halts; input rejected."
            
            self._record_history_step(transition=None, note=note)
            return self.history[-1]

        # Apply transition: δ(q, a) = (p, b, D)
        self.tape.write(transition.write_symbol)
        self.tape.move(transition.direction)
        self.current_state = transition.next_state
        self.step_count += 1

        # Check if new state is terminal/accepting
        note = f"Executed {transition.to_formula()}"
        if self.current_state in self.accept_states:
            self.status = "ACCEPTED"
            note += f" -> Entered accepting state '{self.current_state}'!"
        elif self.current_state in self.reject_states:
            self.status = "REJECTED"
            note += f" -> Entered rejecting state '{self.current_state}'."

        self._record_history_step(transition=transition, note=note)
        return self.history[-1]

    def run(self, max_steps: Optional[int] = None) -> Dict[str, Any]:
        """
        Run until halting or until max_steps is reached.
        """
        limit = self.max_step_limit if max_steps is None else max_steps
        while self.status in ("INITIALIZED", "RUNNING") and self.step_count < limit:
            self.step()

        if self.status in ("INITIALIZED", "RUNNING") and self.step_count >= limit:
            self.status = "STEP_LIMIT_REACHED"
            self._record_history_step(
                transition=None,
                note=f"Execution limit of {limit} steps reached without halting. Non-termination is undecidable."
            )

        return self.get_summary()

    def get_state_snapshot(self) -> Dict[str, Any]:
        """Get immediate state snapshot."""
        return {
            "name": self.name,
            "step": self.step_count,
            "state": self.current_state,
            "head": self.tape.head,
            "read_symbol": self.tape.read(),
            "id": self.get_instantaneous_description(),
            "status": self.status,
            "tape": self.tape.to_dict(),
            "is_accepting": self.current_state in self.accept_states,
            "is_rejecting": self.current_state in self.reject_states
        }

    def get_summary(self) -> Dict[str, Any]:
        """Summary of execution result."""
        return {
            "name": self.name,
            "input": self.input_string,
            "total_steps": self.step_count,
            "final_state": self.current_state,
            "status": self.status,
            "accepted": (self.status == "ACCEPTED"),
            "tape_content": self.tape.to_string(),
            "history_count": len(self.history),
            "instantaneous_description": self.get_instantaneous_description()
        }

    def generate_mermaid_diagram(self) -> str:
        """Generate Mermaid state diagram string for the transition graph."""
        lines = ["stateDiagram-v2"]
        lines.append(f"    [*] --> {self.initial_state}")

        # Group transitions by (from_state, to_state)
        transitions_by_edge: Dict[Tuple[str, str], List[str]] = {}
        for t in self.transitions.all_transitions():
            edge = (t.current_state, t.next_state)
            label = f"{t.read_symbol}/{t.write_symbol},{t.direction}"
            transitions_by_edge.setdefault(edge, []).append(label)

        for (src, dst), labels in transitions_by_edge.items():
            combined_label = " ; ".join(labels)
            lines.append(f"    {src} --> {dst}: {combined_label}")

        for acc in self.accept_states:
            lines.append(f"    {acc} --> [*]: Accept")

        return "\n".join(lines)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize definition to JSON-compatible dictionary."""
        return {
            "name": self.name,
            "description": self.description,
            "states": self.states,
            "input_alphabet": self.input_alphabet,
            "tape_alphabet": self.tape_alphabet,
            "initial_state": self.initial_state,
            "blank_symbol": self.blank_symbol,
            "accept_states": list(self.accept_states),
            "reject_states": list(self.reject_states),
            "transitions": self.transitions.to_list(),
            "max_step_limit": self.max_step_limit
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TuringMachine":
        return cls(
            name=data.get("name", "Turing Machine"),
            description=data.get("description", ""),
            states=data.get("states"),
            input_alphabet=data.get("input_alphabet"),
            tape_alphabet=data.get("tape_alphabet"),
            initial_state=data.get("initial_state", "q0"),
            blank_symbol=data.get("blank_symbol", "B"),
            accept_states=data.get("accept_states"),
            reject_states=data.get("reject_states"),
            transitions=data.get("transitions", []),
            max_step_limit=data.get("max_step_limit", 1000)
        )

    @classmethod
    def load_from_file(cls, filepath: str) -> "TuringMachine":
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.from_dict(data)
