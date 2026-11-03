import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.language_classes import compare_language_classes, build_decider_odd_ones, build_recognizer_odd_ones
from backend.halting_proof import HaltingProofSimulator
from backend.theory_topics import TheoryTopics


class TestTheoryAndProof(unittest.TestCase):

    def test_language_classes_comparison(self):
        # Odd count of 1s: "10101" (3 ones) -> Both should accept!
        res_valid = compare_language_classes("10101", step_limit=100)
        self.assertTrue(res_valid["is_in_language"])
        self.assertEqual(res_valid["decider"]["status"], "ACCEPTED")
        self.assertEqual(res_valid["recognizer"]["status"], "ACCEPTED")

        # Even count of 1s: "101" (2 ones) -> Decider rejects, Recognizer reaches step limit (loops)!
        res_invalid = compare_language_classes("101", step_limit=100)
        self.assertFalse(res_invalid["is_in_language"])
        self.assertEqual(res_invalid["decider"]["status"], "REJECTED")
        self.assertEqual(res_invalid["recognizer"]["status"], "STEP_LIMIT_REACHED")

    def test_halting_proof_paradox_cases(self):
        # Case A: Prediction HALT -> OPPOSITE loops -> contradiction
        case_a = HaltingProofSimulator.simulate_adversary_run("HALT")
        self.assertEqual(case_a["actual_behavior"], "LOOPS_FOREVER")
        self.assertTrue(case_a["is_contradiction"])

        # Case B: Prediction LOOP -> OPPOSITE halts -> contradiction
        case_b = HaltingProofSimulator.simulate_adversary_run("LOOP")
        self.assertEqual(case_b["actual_behavior"], "HALTS_IMMEDIATELY")
        self.assertTrue(case_b["is_contradiction"])

    def test_theory_topics_structure(self):
        topics = TheoryTopics.get_all_topics()
        self.assertIn("church_thesis", topics)
        self.assertIn("countability", topics)
        self.assertIn("tm_variants", topics)
        self.assertIn("rice_theorem", topics)
        self.assertIn("pcp", topics)
        self.assertIn("undecidable_problems", topics)

    def test_pcp_verification_and_solver(self):
        tiles = [
            {"id": 1, "top": "a", "bottom": "baa"},
            {"id": 2, "top": "ab", "bottom": "aa"},
            {"id": 3, "top": "bba", "bottom": "bb"}
        ]
        # Valid sequence: [3, 2, 3, 1]
        verify_match = TheoryTopics.verify_pcp_solution(tiles, [3, 2, 3, 1])
        self.assertTrue(verify_match["match"])
        self.assertEqual(verify_match["top_string"], verify_match["bottom_string"])
        self.assertEqual(verify_match["top_string"], "bbaabbbaa")

        # Invalid sequence: [1, 2]
        verify_fail = TheoryTopics.verify_pcp_solution(tiles, [1, 2])
        self.assertFalse(verify_fail["match"])

        # Bounded solver should find solution
        solve_res = TheoryTopics.solve_pcp_bounded(tiles, max_depth=6)
        self.assertTrue(solve_res["found"])
        self.assertEqual(solve_res["sequence"], [3, 2, 3, 1])

    def test_pcp_instance_simple(self):
        topics = TheoryTopics.get_all_topics()
        simple_inst = next(i for i in topics["pcp"]["preset_instances"] if i["id"] == "instance_simple")
        tiles = simple_inst["tiles"]
        known_seq = simple_inst["known_solution"]

        # Solution should be valid and match
        res = TheoryTopics.verify_pcp_solution(tiles, known_seq)
        self.assertTrue(res["match"])
        self.assertEqual(res["top_string"], "abcaaabc")
        self.assertEqual(res["bottom_string"], "abcaaabc")

        # Solver should also find solution
        solve_res = TheoryTopics.solve_pcp_bounded(tiles, max_depth=8)
        self.assertTrue(solve_res["found"])
        self.assertEqual(solve_res["sequence"], known_seq)


if __name__ == "__main__":
    unittest.main()
