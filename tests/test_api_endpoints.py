import unittest
import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app


class TestAppEndpoints(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_pages_get_200(self):
        routes = [
            "/",
            "/simulator",
            "/universal_tm",
            "/language_classes",
            "/halting_problem",
            "/theory",
            "/privacy",
            "/terms",
        ]
        for r in routes:
            res = self.app.get(r)
            self.assertEqual(res.status_code, 200, f"Route {r} failed with status {res.status_code}")

    def test_custom_404_and_favicon(self):
        res_404 = self.app.get("/this-route-does-not-exist-404")
        self.assertEqual(res_404.status_code, 404)
        html_404 = res_404.data.decode("utf-8")
        self.assertIn("404", html_404)

        res_fav = self.app.get("/static/images/favicon.svg")
        self.assertEqual(res_fav.status_code, 200)
        res_fav.close()

    def test_ui_design_system_and_dom_contracts(self):
        res_home = self.app.get("/")
        html_home = res_home.data.decode("utf-8")
        self.assertIn("Geist", html_home)
        self.assertIn("phosphor-icons", html_home)
        self.assertIn("skip-link", html_home)
        self.assertIn("data-tagline-reveal", html_home)

        dom_checks = {
            "/simulator": ["machine-select", "btn-load", "btn-step", "btn-play", "tape-track", "transitions-tbody"],
            "/universal_tm": ["btn-utm-simulate", "utm-machine-select", "utm-scrubber", "utm-track-2-tape"],
            "/language_classes": ["btn-run-comparison", "lang-input-string", "decider-tape", "recognizer-tape"],
            "/halting_problem": ["btn-prev-step", "btn-next-step", "btn-predict-halt", "btn-predict-loop"],
            "/theory": ["rice-verdict-box", "pcp-available-tiles", "pcp-chosen-tiles", "btn-pcp-solve"],
        }
        for route, required_ids in dom_checks.items():
            html = self.app.get(route).data.decode("utf-8")
            for dom_id in required_ids:
                self.assertIn(f'id="{dom_id}"', html, f'Missing id="{dom_id}" on {route}')

    def test_api_machines_get(self):
        res = self.app.get("/api/machines")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data["success"])
        self.assertGreater(len(data["machines"]), 0)

    def test_api_simulator_run(self):
        payload = {
            "machine_id": "machine_1_anbn",
            "input_string": "0011",
            "step_limit": 500
        }
        res = self.app.post("/api/simulator/run", json=payload)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data["success"])
        self.assertEqual(data["summary"]["status"], "ACCEPTED")
        self.assertIn("tape", data)
        self.assertIn("cells", data["tape"])

    def test_api_utm_simulate(self):
        payload = {
            "machine_id": "machine_1_anbn",
            "input_string": "01",
            "max_steps": 50
        }
        res = self.app.post("/api/utm/simulate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data["success"])
        self.assertEqual(data["result"]["final_status"], "ACCEPTED")

    def test_api_utm_simulate_encoded_string(self):
        # Accurate encoding for machine_1_anbn on input '01'
        sample_code = "10101101110110010111101111011110110011010110101100110111101101111011001101101110111101001110101110101001110111101110111101001110111010111011001111011110111101111011001111011111011111101111101110001011"
        payload = {
            "encoded_string": sample_code,
            "max_steps": 50
        }
        res = self.app.post("/api/utm/simulate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data["success"])
        self.assertEqual(data["result"]["final_status"], "ACCEPTED")

    def test_api_language_classes_compare(self):
        payload = {"input_string": "101", "step_limit": 100}
        res = self.app.post("/api/language_classes/compare", json=payload)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data["success"])

    def test_api_halting_proof_steps_and_simulate(self):
        res = self.app.get("/api/halting_proof/steps")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data["success"])
        self.assertEqual(len(data["steps"]), 5)

        res_sim = self.app.post("/api/halting_proof/simulate", json={"prediction": "HALT"})
        self.assertEqual(res_sim.status_code, 200)
        sim_data = json.loads(res_sim.data)
        self.assertTrue(sim_data["success"])
        self.assertEqual(sim_data["result"]["actual_behavior"], "LOOPS_FOREVER")

    def test_api_theory_pcp(self):
        tiles = [
            {"id": 1, "top": "a", "bottom": "baa"},
            {"id": 2, "top": "ab", "bottom": "aa"},
            {"id": 3, "top": "bba", "bottom": "bb"}
        ]
        res = self.app.post("/api/theory/pcp/verify", json={"tiles": tiles, "sequence": [3, 2, 3, 1]})
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data["result"]["match"])


if __name__ == "__main__":
    unittest.main()
