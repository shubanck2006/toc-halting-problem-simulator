"""
Universal Turing Machine (UTM) Module.
Demonstrates how a single general-purpose computational machine simulates any
encoded Turing Machine <M> on input w, formalizing Turing's seminal 1936 discovery.
"""
from typing import Dict, List, Tuple, Any, Optional
from backend.turing_machine import TuringMachine
from backend.transition import Transition


class UTMEncoder:
    """
    Standard binary and symbolic encoding for Turing Machines and inputs:
    Standard TOC encoding:
      - State qi -> 1^(i+1)
      - Symbol Xj -> 1^j (where 0->1, 1->11, B->111, etc.)
      - Directions L->1, R->11, S->111
      - Transition -> 1^(i+1) 0 1^j 0 1^(k+1) 0 1^l 0 1^m
      - Transitions separated by '00'
      - Machine and input separated by '000'
    """

    def __init__(self, tm: TuringMachine):
        self.tm = tm
        # Assign indexed numbers to states, starting with initial_state at index 0
        ordered_states = [tm.initial_state] + [s for s in tm.states if s != tm.initial_state]
        self.state_to_idx: Dict[str, int] = {s: i for i, s in enumerate(ordered_states)}
        self.idx_to_state: Dict[int, str] = {i: s for s, i in self.state_to_idx.items()}

        # Assign indices to symbols (1-based: 0 -> 1, 1 -> 2, B -> 3, etc.)
        ordered_symbols = [s for s in tm.tape_alphabet if s != tm.blank_symbol] + [tm.blank_symbol]
        self.symbol_to_idx: Dict[str, int] = {s: i + 1 for i, s in enumerate(ordered_symbols)}
        self.idx_to_symbol: Dict[int, str] = {i: s for s, i in self.symbol_to_idx.items()}

        self.dir_to_idx: Dict[str, int] = {"L": 1, "R": 2, "S": 3, "N": 3}
        self.idx_to_dir: Dict[int, str] = {1: "L", 2: "R", 3: "S"}

    def encode_transition(self, t: Transition) -> str:
        q_idx = self.state_to_idx.get(t.current_state, 0) + 1
        s_idx = self.symbol_to_idx.get(t.read_symbol, len(self.symbol_to_idx))
        next_q_idx = self.state_to_idx.get(t.next_state, 0) + 1
        next_s_idx = self.symbol_to_idx.get(t.write_symbol, len(self.symbol_to_idx))
        dir_idx = self.dir_to_idx.get(t.direction, 2)

        return f"{'1'*q_idx}0{'1'*s_idx}0{'1'*next_q_idx}0{'1'*next_s_idx}0{'1'*dir_idx}"

    def encode_machine(self) -> str:
        """Encode all transitions separated by '00'."""
        encoded_transitions = [
            self.encode_transition(t)
            for t in self.tm.transitions.all_transitions()
        ]
        return "00".join(encoded_transitions)

    def encode_input(self, input_str: str) -> str:
        """Encode input string w using symbol codes separated by '0'."""
        if not input_str:
            return ""
        tokens = [
            "1" * self.symbol_to_idx.get(char, 1)
            for char in input_str
        ]
        return "0".join(tokens)

    def encode_full_pair(self, input_str: str) -> str:
        """Return full UTM tape content: <M, w> = <M> 000 <w>."""
        m_code = self.encode_machine()
        w_code = self.encode_input(input_str)
        return f"{m_code}000{w_code}"

    def get_code_legend(self) -> Dict[str, Any]:
        """Provides human-readable mapping of unary binary codes to machine symbols."""
        return {
            "states": {s: f"1^{idx+1} ({'1'*(idx+1)})" for s, idx in self.state_to_idx.items()},
            "symbols": {s: f"1^{idx} ({'1'*idx})" for s, idx in self.symbol_to_idx.items()},
            "directions": {"L": "1", "R": "11", "S": "111"},
            "accept_states": list(self.tm.accept_states),
            "reject_states": list(self.tm.reject_states),
            "blank_symbol": self.tm.blank_symbol
        }

    @classmethod
    def decode_machine(
        cls,
        encoded_machine: str,
        legend: Optional[Dict[str, Any]] = None,
        machine_name: str = "Decoded UTM Machine"
    ) -> TuringMachine:
        """
        Decodes a binary machine string <M> into a TuringMachine instance.
        Transitions are separated by '00', each transition having 5 tokens of 1s separated by '0':
        1^(i+1) 0 1^j 0 1^(k+1) 0 1^l 0 1^m
        """
        clean = encoded_machine.strip()
        if not clean:
            raise ValueError("Encoded machine string is empty.")

        t_strings = clean.split("00")
        raw_transitions = []
        max_sym_idx = 0

        for t_str in t_strings:
            if not t_str:
                continue
            parts = t_str.split("0")
            if len(parts) != 5:
                continue
            q_idx = len(parts[0]) - 1
            a_idx = len(parts[1])
            p_idx = len(parts[2]) - 1
            b_idx = len(parts[3])
            d_idx = len(parts[4])
            raw_transitions.append((q_idx, a_idx, p_idx, b_idx, d_idx))
            max_sym_idx = max(max_sym_idx, a_idx, b_idx)

        if not raw_transitions:
            raise ValueError("No valid transitions found in encoded machine string.")

        # Determine mappings from legend if provided
        state_map: Dict[int, str] = {}
        sym_map: Dict[int, str] = {}
        if legend:
            for s, code in legend.get("states", {}).items():
                if "^" in code:
                    ones_count = int(code.split("^")[1].split()[0])
                else:
                    ones_count = code.count("1")
                state_map[ones_count - 1] = s

            for sym, code in legend.get("symbols", {}).items():
                if "^" in code:
                    ones_count = int(code.split("^")[1].split()[0])
                else:
                    ones_count = code.count("1")
                sym_map[ones_count] = sym

        dir_map = {1: "L", 2: "R", 3: "S"}

        def resolve_sym(idx: int) -> str:
            if idx in sym_map:
                return sym_map[idx]
            if idx == max_sym_idx:
                return legend.get("blank_symbol", "B") if legend else "B"
            if idx == 1:
                return "0"
            if idx == 2:
                return "1"
            return f"X{idx}"

        transitions = []
        states_seen = set()
        tape_symbols_seen = set()

        for q_idx, a_idx, p_idx, b_idx, d_idx in raw_transitions:
            src_state = state_map.get(q_idx, f"q{q_idx}")
            read_sym = resolve_sym(a_idx)
            dst_state = state_map.get(p_idx, f"q{p_idx}")
            write_sym = resolve_sym(b_idx)
            direction = dir_map.get(d_idx, "R")

            states_seen.add(src_state)
            states_seen.add(dst_state)
            tape_symbols_seen.add(read_sym)
            tape_symbols_seen.add(write_sym)

            transitions.append(Transition(src_state, read_sym, dst_state, write_sym, direction))

        initial_state = state_map.get(0, "q0")
        if initial_state not in states_seen:
            initial_state = transitions[0].current_state

        if legend and legend.get("blank_symbol"):
            blank_symbol = str(legend["blank_symbol"])
        else:
            blank_symbol = resolve_sym(max_sym_idx)
        tape_symbols_seen.add(blank_symbol)

        if legend and "accept_states" in legend and legend["accept_states"] is not None:
            accept_states = [str(s) for s in legend["accept_states"]]
        else:
            accept_candidates = [s for s in states_seen if ("accept" in s.lower() or "halt" in s.lower()) and "reject" not in s.lower()]
            if accept_candidates:
                accept_states = accept_candidates
            else:
                outgoing_states = {t.current_state for t in transitions}
                terminal_states = sorted(
                    [s for s in states_seen if s not in outgoing_states and "reject" not in s.lower()],
                    key=lambda s: int(s[1:]) if s.startswith("q") and s[1:].isdigit() else 999
                )
                accept_states = [terminal_states[0]] if terminal_states else ["q_accept"]

        if legend and "reject_states" in legend and legend["reject_states"] is not None:
            reject_states = [str(s) for s in legend["reject_states"]]
        else:
            reject_candidates = [s for s in states_seen if "reject" in s.lower()]
            if reject_candidates:
                reject_states = reject_candidates
            else:
                outgoing_states = {t.current_state for t in transitions}
                terminal_states = sorted(
                    [s for s in states_seen if s not in outgoing_states and "reject" not in s.lower()],
                    key=lambda s: int(s[1:]) if s.startswith("q") and s[1:].isdigit() else 999
                )
                reject_states = terminal_states[1:] if len(terminal_states) > 1 else []

        return TuringMachine(
            name=machine_name,
            description=f"Decoded from binary UTM encoding: {clean[:25]}...",
            states=sorted(list(states_seen)),
            input_alphabet=[s for s in sorted(list(tape_symbols_seen)) if s != blank_symbol],
            tape_alphabet=sorted(list(tape_symbols_seen)),
            initial_state=initial_state,
            blank_symbol=blank_symbol,
            accept_states=accept_states,
            reject_states=reject_states,
            transitions=transitions
        )

    @classmethod
    def decode_full_pair(
        cls,
        encoded_pair: str,
        legend: Optional[Dict[str, Any]] = None
    ) -> Tuple[TuringMachine, str]:
        """
        Decodes <M, w> = <M> 000 <w> into a TuringMachine and input string w.
        """
        clean = encoded_pair.strip()
        if "000" in clean:
            m_code, w_code = clean.split("000", 1)
        else:
            m_code = clean
            w_code = ""

        tm = cls.decode_machine(m_code, legend=legend)

        input_str = ""
        if w_code:
            sym_map: Dict[int, str] = {}
            if legend:
                for sym, code in legend.get("symbols", {}).items():
                    if "^" in code:
                        ones_count = int(code.split("^")[1].split()[0])
                    else:
                        ones_count = code.count("1")
                    sym_map[ones_count] = sym

            # Find max symbol in m_code
            max_sym_idx = 0
            for t_str in m_code.split("00"):
                parts = t_str.split("0")
                if len(parts) == 5:
                    max_sym_idx = max(max_sym_idx, len(parts[1]), len(parts[3]))

            def resolve_input_sym(idx: int) -> str:
                if idx in sym_map:
                    return sym_map[idx]
                if idx == max_sym_idx:
                    return legend.get("blank_symbol", "B") if legend else "B"
                if idx == 1:
                    return "0"
                if idx == 2:
                    return "1"
                return f"X{idx}"

            tokens = [tok for tok in w_code.split("0") if tok]
            chars = [resolve_input_sym(len(t)) for t in tokens]
            input_str = "".join(chars)

        return tm, input_str


class UniversalTuringMachine:
    """
    Universal Turing Machine simulator.
    Simulates any TM M on input w using a 3-track computational model:
      Track 1: Encoded machine transition rules <M>
      Track 2: Simulated machine's tape content and head position
      Track 3: Simulated machine's active state register
    """

    def __init__(self, target_tm: TuringMachine):
        self.target_tm = target_tm
        self.encoder = UTMEncoder(target_tm)
        self.simulated_steps: int = 0
        self.utm_cycles: int = 0
        self.history: List[Dict[str, Any]] = []

    def simulate(self, input_string: str, max_steps: int = 200) -> Dict[str, Any]:
        """
        Run the universal simulation, capturing detailed UTM operational steps.
        """
        # Initialize target TM
        self.target_tm.load_input(input_string)
        encoded_pair = self.encoder.encode_full_pair(input_string)
        legend = self.encoder.get_code_legend()

        steps_log = []
        sim_step = 0

        # Initial state log
        steps_log.append({
            "utm_cycle": 0,
            "sim_step": 0,
            "phase": "FETCH_INIT",
            "sim_state": self.target_tm.current_state,
            "sim_head": self.target_tm.tape.head,
            "sim_read_symbol": self.target_tm.tape.read(),
            "sim_tape_window": self.target_tm.tape.get_window(radius=6),
            "action_description": f"UTM loaded machine <{self.target_tm.name}> and input string '{input_string}'. Track 3 state initialized to '{self.target_tm.current_state}'."
        })

        # Check if target machine is already in terminal state (step 0 halt)
        if self.target_tm.status in ("ACCEPTED", "REJECTED"):
            steps_log.append({
                "utm_cycle": 1,
                "sim_step": 0,
                "phase": "HALTED",
                "sim_state": self.target_tm.current_state,
                "sim_head": self.target_tm.tape.head,
                "sim_read_symbol": self.target_tm.tape.read(),
                "sim_tape_window": self.target_tm.tape.get_window(radius=6),
                "action_description": f"Initial state '{self.target_tm.current_state}' is already an {self.target_tm.status} state. UTM halts with {self.target_tm.status}."
            })

        while self.target_tm.status in ("INITIALIZED", "RUNNING") and sim_step < max_steps:
            sim_step += 1
            curr_state = self.target_tm.current_state
            curr_sym = self.target_tm.tape.read()

            # UTM Phase 1: Search Track 1 (Transition Table)
            transition = self.target_tm.transitions.get(curr_state, curr_sym)
            if not transition:
                # Halt handling
                if curr_state in self.target_tm.accept_states:
                    status = "ACCEPTED"
                    desc = f"UTM found no rule for ({curr_state}, {curr_sym}), but '{curr_state}' is an ACCEPTING state. UTM halts with ACCEPT."
                elif curr_state in self.target_tm.reject_states:
                    status = "REJECTED"
                    desc = f"UTM found no rule for ({curr_state}, {curr_sym}), and '{curr_state}' is a REJECTING state. UTM halts with REJECT."
                else:
                    status = "REJECTED"
                    desc = f"UTM found no matching rule for ({curr_state}, {curr_sym}) on Track 1. UTM halts with REJECT."

                self.target_tm.status = status
                steps_log.append({
                    "utm_cycle": sim_step * 3,
                    "sim_step": sim_step,
                    "phase": "HALTED",
                    "sim_state": curr_state,
                    "sim_head": self.target_tm.tape.head,
                    "sim_read_symbol": curr_sym,
                    "sim_tape_window": self.target_tm.tape.get_window(radius=6),
                    "action_description": desc
                })
                break

            # UTM Phase 2: MATCH FOUND -> DECODE & EXECUTE ON TRACK 2
            rule_encoded = self.encoder.encode_transition(transition)
            self.target_tm.step()

            steps_log.append({
                "utm_cycle": sim_step * 3,
                "sim_step": sim_step,
                "phase": "DECODE_EXECUTE",
                "matched_rule": transition.to_formula(),
                "encoded_rule": rule_encoded,
                "sim_state": self.target_tm.current_state,
                "sim_head": self.target_tm.tape.head,
                "sim_read_symbol": self.target_tm.tape.read(),
                "sim_tape_window": self.target_tm.tape.get_window(radius=6),
                "action_description": f"UTM matched rule δ({curr_state}, {curr_sym}) = ({transition.next_state}, {transition.write_symbol}, {transition.direction}). Wrote '{transition.write_symbol}', shifted head {transition.direction}, updated state register to '{transition.next_state}'."
            })

            if self.target_tm.status in ("ACCEPTED", "REJECTED"):
                steps_log.append({
                    "utm_cycle": sim_step * 3 + 1,
                    "sim_step": sim_step,
                    "phase": "HALTED",
                    "sim_state": self.target_tm.current_state,
                    "sim_head": self.target_tm.tape.head,
                    "sim_read_symbol": self.target_tm.tape.read(),
                    "sim_tape_window": self.target_tm.tape.get_window(radius=6),
                    "action_description": f"Target machine entered {self.target_tm.status} state '{self.target_tm.current_state}'. UTM halts with {self.target_tm.status}."
                })
                break

        if self.target_tm.status in ("INITIALIZED", "RUNNING") and sim_step >= max_steps:
            self.target_tm.status = "STEP_LIMIT_REACHED"
            steps_log.append({
                "utm_cycle": sim_step * 3,
                "sim_step": sim_step,
                "phase": "LIMIT_REACHED",
                "sim_state": self.target_tm.current_state,
                "sim_head": self.target_tm.tape.head,
                "sim_read_symbol": self.target_tm.tape.read(),
                "sim_tape_window": self.target_tm.tape.get_window(radius=6),
                "action_description": f"Simulation reached maximum step limit of {max_steps}. The UTM terminates simulation; non-termination remains undecidable."
            })

        return {
            "machine_name": self.target_tm.name,
            "input_string": input_string,
            "encoded_pair": encoded_pair,
            "legend": legend,
            "final_status": self.target_tm.status,
            "total_sim_steps": sim_step,
            "tape_content": self.target_tm.tape.to_string(),
            "steps_log": steps_log
        }
