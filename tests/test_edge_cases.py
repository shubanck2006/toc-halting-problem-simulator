import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.tape import Tape
from backend.turing_machine import TuringMachine
from backend.universal_tm import UTMEncoder, UniversalTuringMachine
from backend.theory_topics import TheoryTopics
from backend.halting_proof import HaltingProofSimulator


class TestEdgeCases(unittest.TestCase):

    def test_tape_deep_left_and_right_expansion(self):
        tape = Tape("X", blank_symbol="B")
        # Move 100 steps left
        for _ in range(100):
            tape.move("L")
        tape.write("L_100")
        self.assertEqual(tape.head, -100)
        self.assertEqual(tape.read(), "L_100")

        # Move 200 steps right
        for _ in range(200):
            tape.move("R")
        tape.write("R_100")
        self.assertEqual(tape.head, 100)
        self.assertEqual(tape.read(), "R_100")

        # Bounds should correctly capture both extremes
        min_idx, max_idx = tape.get_bounds()
        self.assertEqual(min_idx, -100)
        self.assertEqual(max_idx, 100)

    def test_empty_string_input(self):
        machines_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "machines"))
        # Palindrome machine accepts empty string (epsilon is a palindrome)
        tm_path = os.path.join(machines_dir, "machine_2_palindrome.json")
        tm = TuringMachine.load_from_file(tm_path)
        tm.load_input("")
        res = tm.run()
        self.assertEqual(res["status"], "ACCEPTED")

        # anbn machine rejects empty string (requires n >= 1)
        tm_anbn = TuringMachine.load_from_file(os.path.join(machines_dir, "machine_1_anbn.json"))
        tm_anbn.load_input("")
        res_anbn = tm_anbn.run()
        self.assertEqual(res_anbn["status"], "REJECTED")

    def test_single_character_inputs(self):
        machines_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "machines"))
        tm_pal = TuringMachine.load_from_file(os.path.join(machines_dir, "machine_2_palindrome.json"))

        # Single "0" is palindrome
        tm_pal.load_input("0")
        self.assertEqual(tm_pal.run()["status"], "ACCEPTED")

        # Single "1" is palindrome
        tm_pal.load_input("1")
        self.assertEqual(tm_pal.run()["status"], "ACCEPTED")

    def test_utm_with_empty_and_single_char_input(self):
        machines_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "machines"))
        tm = TuringMachine.load_from_file(os.path.join(machines_dir, "machine_2_palindrome.json"))
        utm = UniversalTuringMachine(tm)

        res_empty = utm.simulate("", max_steps=20)
        self.assertEqual(res_empty["final_status"], "ACCEPTED")

    def test_step_limit_boundary_zero_and_one(self):
        machines_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "machines"))
        tm = TuringMachine.load_from_file(os.path.join(machines_dir, "machine_4_infinite_looper.json"))

        # Limit 0 steps -> immediately reports limit reached with 0 steps executed
        tm.load_input("0")
        res0 = tm.run(max_steps=0)
        self.assertEqual(res0["status"], "STEP_LIMIT_REACHED")
        self.assertEqual(res0["total_steps"], 0)

        # Limit 1 step -> executes 1 step and reports limit reached
        tm.load_input("0")
        res1 = tm.run(max_steps=1)
        self.assertEqual(res1["status"], "STEP_LIMIT_REACHED")
        self.assertEqual(res1["total_steps"], 1)

    def test_pcp_empty_and_invalid_sequences(self):
        tiles = [{"id": 1, "top": "a", "bottom": "b"}]
        # Empty sequence
        res_empty = TheoryTopics.verify_pcp_solution(tiles, [])
        self.assertFalse(res_empty["match"])

        # Nonexistent tile ID
        res_invalid = TheoryTopics.verify_pcp_solution(tiles, [99])
        self.assertFalse(res_invalid["valid"])

    def test_halting_proof_invalid_inputs(self):
        with self.assertRaises(ValueError):
            HaltingProofSimulator.simulate_adversary_run("MAYBE")

    def test_special_character_blank_symbol(self):
        # Machines with regex metacharacters as blank symbols
        for blank in ["*", "+", "?", ".", "["]:
            tape = Tape("abc", blank_symbol=blank)
            self.assertEqual(tape.read(), "a")
            self.assertEqual(tape.blank_symbol, blank)
            tm = TuringMachine(blank_symbol=blank)
            tm.load_input("10")
            id_desc = tm.get_instantaneous_description()
            self.assertIn("[q0]", id_desc)

    def test_utm_decoder_invalid_strings(self):
        with self.assertRaises(ValueError):
            UTMEncoder.decode_machine("")
        with self.assertRaises(ValueError):
            UTMEncoder.decode_machine("00000")

    def test_tape_to_dict_sparse_window(self):
        tape = Tape("X", blank_symbol="B")
        # Head moves 100 cells away
        for _ in range(100):
            tape.move("R")
        tape.write("Y")
        t_dict = tape.to_dict()
        cells = t_dict["cells"]
        # Non-blank 'X' at 0 and 'Y' at 100 must be in cells
        self.assertIn(0, cells)
        self.assertEqual(cells[0], "X")
        self.assertIn(100, cells)
        self.assertEqual(cells[100], "Y")
        # Should not densely contain 100 keys
        self.assertLess(len(cells), 40)


if __name__ == "__main__":
    unittest.main()
