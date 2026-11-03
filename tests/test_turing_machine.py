import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.turing_machine import TuringMachine
from backend.transition import Transition


class TestTuringMachine(unittest.TestCase):

    def setUp(self):
        self.machines_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "machines"))

    def test_anbn_acceptance(self):
        tm_path = os.path.join(self.machines_dir, "machine_1_anbn.json")
        tm = TuringMachine.load_from_file(tm_path)

        valid_strings = ["01", "0011", "000111"]
        for s in valid_strings:
            tm.load_input(s)
            res = tm.run(max_steps=500)
            self.assertEqual(res["status"], "ACCEPTED", f"Failed on valid string '{s}'")
            self.assertTrue(res["accepted"])

    def test_anbn_rejection(self):
        tm_path = os.path.join(self.machines_dir, "machine_1_anbn.json")
        tm = TuringMachine.load_from_file(tm_path)

        invalid_strings = ["0", "1", "001", "011", "10", "0101"]
        for s in invalid_strings:
            tm.load_input(s)
            res = tm.run(max_steps=500)
            self.assertEqual(res["status"], "REJECTED", f"Should reject invalid string '{s}'")
            self.assertFalse(res["accepted"])

    def test_palindrome_machine(self):
        tm_path = os.path.join(self.machines_dir, "machine_2_palindrome.json")
        tm = TuringMachine.load_from_file(tm_path)

        palindromes = ["", "0", "1", "00", "11", "101", "0110", "1001001"]
        for s in palindromes:
            tm.load_input(s)
            res = tm.run(max_steps=500)
            self.assertEqual(res["status"], "ACCEPTED", f"Failed to accept palindrome '{s}'")

        non_palindromes = ["10", "011", "100", "1101"]
        for s in non_palindromes:
            tm.load_input(s)
            res = tm.run(max_steps=500)
            self.assertEqual(res["status"], "REJECTED", f"Failed to reject non-palindrome '{s}'")

    def test_binary_incrementer(self):
        tm_path = os.path.join(self.machines_dir, "machine_3_binary_incrementer.json")
        tm = TuringMachine.load_from_file(tm_path)

        # 1011 + 1 = 1100
        tm.load_input("1011")
        res = tm.run(max_steps=100)
        self.assertEqual(res["status"], "ACCEPTED")
        self.assertEqual(tm.tape.to_string(), "1100")

        # 111 + 1 = 1000
        tm.load_input("111")
        res = tm.run(max_steps=100)
        self.assertEqual(res["status"], "ACCEPTED")
        self.assertEqual(tm.tape.to_string(), "1000")

    def test_step_safety_limit_enforcement(self):
        """
        Verify implementation consideration 2:
        'If a machine exceeds 1,000 execution steps, your application should report
        that the execution limit was reached, not that the machine definitely never halts.'
        """
        tm_path = os.path.join(self.machines_dir, "machine_4_infinite_looper.json")
        tm = TuringMachine.load_from_file(tm_path)
        tm.max_step_limit = 50
        tm.load_input("01")
        res = tm.run(max_steps=50)

        self.assertEqual(res["status"], "STEP_LIMIT_REACHED")
        self.assertEqual(tm.status, "STEP_LIMIT_REACHED")
        self.assertFalse(res["accepted"])
        # Ensure message clearly clarifies limit, not definitive non-termination
        last_note = tm.history[-1]["note"]
        self.assertIn("limit", last_note.lower())

    def test_instantaneous_description(self):
        tm = TuringMachine()
        tm.load_input("010")
        id_str = tm.get_instantaneous_description()
        self.assertIn("[q0]", id_str)
        self.assertEqual(id_str, "[q0] 010")

    def test_mermaid_diagram_generation(self):
        tm_path = os.path.join(self.machines_dir, "machine_1_anbn.json")
        tm = TuringMachine.load_from_file(tm_path)
        mermaid_code = tm.generate_mermaid_diagram()
        self.assertIn("stateDiagram-v2", mermaid_code)
        self.assertIn("[*] --> q0", mermaid_code)
        self.assertIn("q_accept --> [*]: Accept", mermaid_code)

    def test_tape_to_string_with_head_movement(self):
        tm_path = os.path.join(self.machines_dir, "machine_3_binary_incrementer.json")
        tm = TuringMachine.load_from_file(tm_path)
        tm.load_input("1011")
        tm.run()
        # Move head 20 spaces into blank territory
        for _ in range(20):
            tm.tape.move("R")
        # to_string should still return clean "1100" without 20 trailing blanks
        self.assertEqual(tm.tape.to_string(), "1100")

    def test_empty_accept_and_reject_states(self):
        # Explicit empty accept and reject states should be empty sets
        tm = TuringMachine(
            states=["q0"],
            initial_state="q0",
            accept_states=[],
            reject_states=[]
        )
        self.assertEqual(tm.accept_states, set())
        self.assertEqual(tm.reject_states, set())

        # Infinite looper machine from file has empty accept_states and reject_states
        looper_path = os.path.join(self.machines_dir, "machine_4_infinite_looper.json")
        looper = TuringMachine.load_from_file(looper_path)
        self.assertEqual(looper.accept_states, set())
        self.assertEqual(looper.reject_states, set())


if __name__ == "__main__":
    unittest.main()
