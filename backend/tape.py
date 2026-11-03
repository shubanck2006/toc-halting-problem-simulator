"""
Tape module for Turing Machine Simulator.
Provides a doubly-infinite expandable tape abstraction with arbitrary head movements.
"""
from typing import Dict, List, Tuple, Optional, Any


class Tape:
    """
    Represents an infinite tape for a Turing Machine.
    Indices are integers: ..., -2, -1, 0, 1, 2, ...
    Unvisited or cleared cells default to the blank symbol (typically 'B' or '_').
    """

    def __init__(self, initial_content: str = "", blank_symbol: str = "B", initial_head: int = 0):
        self.blank_symbol: str = blank_symbol if blank_symbol else "B"
        self._cells: Dict[int, str] = {}
        self.head: int = initial_head

        # Populate initial content starting at index 0
        for i, char in enumerate(initial_content):
            self._cells[i] = char

    def read(self) -> str:
        """Read the symbol at the current head position."""
        return self._cells.get(self.head, self.blank_symbol)

    def write(self, symbol: str) -> None:
        """Write a symbol at the current head position."""
        if not symbol:
            symbol = self.blank_symbol
        self._cells[self.head] = symbol

    def move(self, direction: str) -> None:
        """
        Move the head left ('L'), right ('R'), or stay ('S'/'N').
        """
        dir_upper = direction.upper().strip()
        if dir_upper == "L":
            self.head -= 1
        elif dir_upper == "R":
            self.head += 1
        elif dir_upper in ("S", "N"):
            pass  # Stay in place
        else:
            raise ValueError(f"Invalid head movement direction: '{direction}'. Expected 'L', 'R', or 'S'.")

    def get_bounds(self) -> Tuple[int, int]:
        """
        Get minimum and maximum non-blank indices including the head position.
        """
        indices = [idx for idx, val in self._cells.items() if val != self.blank_symbol]
        indices.append(self.head)
        return min(indices), max(indices)

    def get_window(self, radius: int = 10) -> List[Dict[str, Any]]:
        """
        Returns a list of tape cell objects centered around the current head.
        Each element: {'index': int, 'symbol': str, 'is_head': bool}
        """
        start = self.head - radius
        end = self.head + radius

        cells = []
        for i in range(start, end + 1):
            cells.append({
                "index": i,
                "symbol": self._cells.get(i, self.blank_symbol),
                "is_head": (i == self.head)
            })
        return cells

    def to_string(self) -> str:
        """Returns the non-blank segment of the tape as a string."""
        non_blank_indices = [idx for idx, val in self._cells.items() if val != self.blank_symbol]
        if not non_blank_indices:
            return ""
        min_idx = min(non_blank_indices)
        max_idx = max(non_blank_indices)
        chars = [self._cells.get(i, self.blank_symbol) for i in range(min_idx, max_idx + 1)]
        return "".join(chars)

    def to_dict(self) -> dict:
        """Serialize tape state for API responses."""
        min_idx, max_idx = self.get_bounds()
        # Ensure at least a small window around head is shown
        display_min = min(min_idx - 2, self.head - 5)
        display_max = max(max_idx + 2, self.head + 5)

        # Include all non-blank cells plus a local window around the head
        cells_dict = {
            i: val for i, val in self._cells.items() if val != self.blank_symbol
        }
        for i in range(self.head - 7, self.head + 8):
            cells_dict[i] = self._cells.get(i, self.blank_symbol)

        return {
            "head": self.head,
            "blank_symbol": self.blank_symbol,
            "min_index": display_min,
            "max_index": display_max,
            "cells": cells_dict,
            "window": self.get_window(radius=7)
        }

    def clone(self) -> "Tape":
        """Create a deep copy of this tape."""
        copied = Tape(blank_symbol=self.blank_symbol, initial_head=self.head)
        copied._cells = dict(self._cells)
        return copied
