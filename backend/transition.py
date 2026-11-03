"""
Transition module for Turing Machine Simulator.
Defines transition rules in the formal format δ(q, a) = (p, b, D).
"""
from typing import Dict, Tuple, Optional, Any, List


class Transition:
    """
    Represents a single transition:
    δ(current_state, read_symbol) = (next_state, write_symbol, direction)
    """

    def __init__(
        self,
        current_state: str,
        read_symbol: str,
        next_state: str,
        write_symbol: str,
        direction: str
    ):
        self.current_state = str(current_state).strip()
        self.read_symbol = str(read_symbol)
        self.next_state = str(next_state).strip()
        self.write_symbol = str(write_symbol)
        self.direction = direction.upper().strip()

        if self.direction not in ("L", "R", "S", "N"):
            raise ValueError(f"Invalid direction '{direction}'. Must be 'L', 'R', or 'S'.")

    @property
    def to_state(self) -> str:
        return self.next_state

    def key(self) -> Tuple[str, str]:
        return (self.current_state, self.read_symbol)

    def result(self) -> Tuple[str, str, str]:
        return (self.next_state, self.write_symbol, self.direction)

    def to_formula(self) -> str:
        """Mathematical string notation: δ(q, a) = (p, b, D)"""
        return f"δ({self.current_state}, {self.read_symbol}) = ({self.next_state}, {self.write_symbol}, {self.direction})"

    def to_dict(self) -> Dict[str, str]:
        return {
            "current_state": self.current_state,
            "read_symbol": self.read_symbol,
            "next_state": self.next_state,
            "write_symbol": self.write_symbol,
            "direction": self.direction,
            "formula": self.to_formula()
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Transition":
        return cls(
            current_state=data["current_state"],
            read_symbol=data["read_symbol"],
            next_state=data["next_state"],
            write_symbol=data["write_symbol"],
            direction=data["direction"]
        )

    def __repr__(self) -> str:
        return self.to_formula()


class TransitionTable:
    """
    Lookup table for transitions in a Deterministic Turing Machine.
    """

    def __init__(self, transitions: Optional[List[Transition]] = None):
        self._table: Dict[Tuple[str, str], Transition] = {}
        if transitions:
            for t in transitions:
                self.add(t)

    def add(self, transition: Transition) -> None:
        self._table[transition.key()] = transition

    def get(self, state: str, symbol: str) -> Optional[Transition]:
        return self._table.get((state, symbol))

    def has(self, state: str, symbol: str) -> bool:
        return (state, symbol) in self._table

    def all_transitions(self) -> List[Transition]:
        return list(self._table.values())

    def to_list(self) -> List[Dict[str, str]]:
        return [t.to_dict() for t in self._table.values()]

    @classmethod
    def from_list(cls, items: List[Dict[str, Any]]) -> "TransitionTable":
        table = cls()
        for item in items:
            table.add(Transition.from_dict(item))
        return table
