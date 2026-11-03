import unittest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.tape import Tape


class TestTape(unittest.TestCase):

    def test_tape_initialization(self):
        tape = Tape("1011", blank_symbol="B")
        self.assertEqual(tape.read(), "1")
        self.assertEqual(tape.head, 0)
        self.assertEqual(tape.blank_symbol, "B")

    def test_tape_read_write(self):
        tape = Tape("0", blank_symbol="B")
        tape.write("X")
        self.assertEqual(tape.read(), "X")

    def test_tape_negative_movement(self):
        tape = Tape("1", blank_symbol="B")
        tape.move("L")
        self.assertEqual(tape.head, -1)
        self.assertEqual(tape.read(), "B")
        tape.write("Y")
        self.assertEqual(tape.read(), "Y")
        tape.move("R")
        self.assertEqual(tape.head, 0)
        self.assertEqual(tape.read(), "1")

    def test_tape_stay_movement(self):
        tape = Tape("1", blank_symbol="B")
        tape.move("S")
        self.assertEqual(tape.head, 0)

    def test_invalid_direction(self):
        tape = Tape("1")
        with self.assertRaises(ValueError):
            tape.move("UP")

    def test_tape_window(self):
        tape = Tape("abc", blank_symbol="_")
        win = tape.get_window(radius=3)
        self.assertGreater(len(win), 0)
        # Check active head cell marked
        head_cell = [c for c in win if c["is_head"]]
        self.assertEqual(len(head_cell), 1)
        self.assertEqual(head_cell[0]["symbol"], "a")

    def test_tape_cloning(self):
        tape = Tape("101", blank_symbol="B")
        tape.move("R")
        tape.write("X")
        cloned = tape.clone()
        self.assertEqual(cloned.head, 1)
        self.assertEqual(cloned.read(), "X")
        cloned.write("Z")
        self.assertEqual(cloned.read(), "Z")
        self.assertEqual(tape.read(), "X")  # original unchanged


if __name__ == "__main__":
    unittest.main()
