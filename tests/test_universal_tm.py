import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.turing_machine import TuringMachine
from backend.universal_tm import UTMEncoder, UniversalTuringMachine


class TestUniversalTuringMachine(unittest.TestCase):

    def setUp(self):
        self.machines_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "machines"))
        tm_path = os.path.join(self.machines_dir, "machine_1_anbn.json")
        self.target_tm = TuringMachine.load_from_file(tm_path)

    def test_utm_encoder(self):
        encoder = UTMEncoder(self.target_tm)
        machine_code = encoder.encode_machine()
        self.assertIsInstance(machine_code, str)
        self.assertGreater(len(machine_code), 0)
        # Should contain transitions separated by 00
        self.assertIn("00", machine_code)

        input_code = encoder.encode_input("01")
        self.assertGreater(len(input_code), 0)

        full_pair = encoder.encode_full_pair("01")
        self.assertIn("000", full_pair)

    def test_utm_simulation_run(self):
        utm = UniversalTuringMachine(self.target_tm)
        result = utm.simulate("01", max_steps=100)

        self.assertEqual(result["final_status"], "ACCEPTED")
        self.assertGreater(result["total_sim_steps"], 0)
        self.assertIn("steps_log", result)
        self.assertGreater(len(result["steps_log"]), 1)
        # Final step must be HALTED
        self.assertEqual(result["steps_log"][-1]["phase"], "HALTED")

    def test_utm_decoder_roundtrip(self):
        encoder = UTMEncoder(self.target_tm)
        pair = encoder.encode_full_pair("0011")
        legend = encoder.get_code_legend()

        decoded_tm, decoded_input = UTMEncoder.decode_full_pair(pair, legend=legend)
        self.assertEqual(decoded_input, "0011")
        self.assertGreater(len(decoded_tm.transitions.all_transitions()), 0)

        # Decoded TM should accept 0011
        decoded_tm.load_input(decoded_input)
        res = decoded_tm.run()
        self.assertEqual(res["status"], "ACCEPTED")
        self.assertEqual(res["total_steps"], 13)


    def test_utm_decoder_reject_states_isolation(self):
        # Machine with explicit accept and reject states
        from backend.transition import Transition
        tm = TuringMachine(
            states=["q0", "q_accept", "q_reject"],
            initial_state="q0",
            accept_states=["q_accept"],
            reject_states=["q_reject"],
            transitions=[
                Transition("q0", "0", "q_accept", "0", "R"),
                Transition("q0", "1", "q_reject", "1", "R")
            ]
        )
        enc = UTMEncoder(tm)
        code = enc.encode_machine()
        leg = enc.get_code_legend()

        # Decoded with legend
        decoded_tm = UTMEncoder.decode_machine(code, legend=leg)
        self.assertIn("q_reject", decoded_tm.reject_states)
        self.assertNotIn("q_reject", decoded_tm.accept_states)
        self.assertIn("q_accept", decoded_tm.accept_states)

        # Running '1' must REJECT, not ACCEPT
        decoded_tm.load_input("1")
        res = decoded_tm.run()
        self.assertEqual(res["status"], "REJECTED")

        # Decoded without legend (raw string heuristic)
        decoded_raw = UTMEncoder.decode_machine(code, legend=None)
        self.assertIn("q1", decoded_raw.accept_states)
        self.assertIn("q2", decoded_raw.reject_states)
        self.assertNotIn("q2", decoded_raw.accept_states)

        # Running '1' on decoded_raw must REJECT
        decoded_raw.load_input("1")
        res_raw = decoded_raw.run()
        self.assertEqual(res_raw["status"], "REJECTED")

    def test_utm_decoder_two_symbol_machine(self):
        # 2 tape symbols: symbol 1 is '0', symbol 2 is 'B' (blank)
        # Transition: δ(q0, 0) = (q_accept, B, R)
        from backend.transition import Transition
        tm = TuringMachine(
            states=["q0", "q_accept"],
            input_alphabet=["0"],
            tape_alphabet=["0", "B"],
            initial_state="q0",
            blank_symbol="B",
            accept_states=["q_accept"],
            reject_states=[],
            transitions=[
                Transition("q0", "0", "q_accept", "B", "R")
            ]
        )
        enc = UTMEncoder(tm)
        code = enc.encode_machine()
        decoded_raw = UTMEncoder.decode_machine(code, legend=None)
        self.assertEqual(decoded_raw.blank_symbol, "B")

    def test_utm_simulation_step_zero_halt(self):
        # Machine that starts immediately in an accepting state
        tm = TuringMachine(
            states=["q0"],
            initial_state="q0",
            accept_states=["q0"]
        )
        utm = UniversalTuringMachine(tm)
        res = utm.simulate("")
        self.assertEqual(res["final_status"], "ACCEPTED")
        self.assertEqual(res["steps_log"][-1]["phase"], "HALTED")


if __name__ == "__main__":
    unittest.main()
