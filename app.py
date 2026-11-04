"""
Main Flask Web Application for Theory of Computation Halting Problem Simulator.
Integrates 5 core modules:
1. Turing Machine Simulator & Language Acceptance
2. Universal Turing Machine (UTM)
3. Recursive vs Recursively Enumerable Languages
4. Halting Problem and Undecidability Proof by Contradiction
5. TOC Theory Explorer (Church's Thesis, Countability, Variants, Rice's Theorem, PCP)
"""
import os
import json
from flask import Flask, render_template, request, jsonify, abort

from backend.tape import Tape
from backend.transition import Transition, TransitionTable
from backend.turing_machine import TuringMachine
from backend.universal_tm import UniversalTuringMachine, UTMEncoder
from backend.language_classes import compare_language_classes, build_decider_odd_ones, build_recognizer_odd_ones
from backend.halting_proof import HaltingProofSimulator
from backend.theory_topics import TheoryTopics

app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MACHINES_DIR = os.path.join(BASE_DIR, "machines")


def load_all_predefined_machines():
    machines = {}
    if os.path.exists(MACHINES_DIR):
        for filename in sorted(os.listdir(MACHINES_DIR)):
            if filename.endswith(".json"):
                filepath = os.path.join(MACHINES_DIR, filename)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        machine_id = os.path.splitext(filename)[0]
                        data["id"] = machine_id
                        machines[machine_id] = data
                except Exception as e:
                    print(f"Error loading {filename}: {e}")
    return machines


# -------------------------------------------------------------
# Frontend Page Routes
# -------------------------------------------------------------

@app.route("/api/health")
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/simulator")
def simulator():
    machines = load_all_predefined_machines()
    return render_template("simulator.html", machines=machines)


@app.route("/universal_tm")
def universal_tm():
    machines = load_all_predefined_machines()
    return render_template("universal_tm.html", machines=machines)


@app.route("/language_classes")
def language_classes():
    return render_template("language_classes.html")


@app.route("/halting_problem")
def halting_problem():
    proof_steps = HaltingProofSimulator.get_proof_steps()
    return render_template("halting_problem.html", proof_steps=proof_steps)


@app.route("/theory")
def theory():
    topics = TheoryTopics.get_all_topics()
    return render_template("theory.html", topics=topics)


@app.route("/privacy")
def privacy():
    return render_template("legal.html", mode="privacy")


@app.route("/terms")
def terms():
    return render_template("legal.html", mode="terms")


@app.errorhandler(404)
def not_found(error):
    if request.path.startswith("/api/"):
        return jsonify({"success": False, "error": "Resource not found"}), 404
    return render_template("404.html"), 404


# -------------------------------------------------------------
# API Endpoints
# -------------------------------------------------------------

@app.route("/api/machines", methods=["GET"])
def get_machines():
    """List all available predefined machines."""
    machines = load_all_predefined_machines()
    return jsonify({"success": True, "machines": list(machines.values())})


@app.route("/api/machines/<machine_id>", methods=["GET"])
def get_machine(machine_id):
    """Retrieve full configuration for a single predefined machine."""
    machines = load_all_predefined_machines()
    if machine_id not in machines:
        return jsonify({"success": False, "error": f"Machine '{machine_id}' not found"}), 404
    return jsonify({"success": True, "machine": machines[machine_id]})


@app.route("/api/simulator/run", methods=["POST"])
def run_simulation():
    """
    Run a Turing Machine to completion or until step limit.
    Accepts full machine definition JSON or machine_id, along with input string and step limit.
    """
    data = request.get_json() or {}
    machine_def = data.get("machine")
    machine_id = data.get("machine_id")
    input_str = data.get("input_string", "")
    step_limit = int(data.get("step_limit", 1000))

    if not machine_def and machine_id:
        machines = load_all_predefined_machines()
        machine_def = machines.get(machine_id)

    if not machine_def:
        return jsonify({"success": False, "error": "No machine definition provided."}), 400

    try:
        tm = TuringMachine.from_dict(machine_def)
        tm.max_step_limit = min(step_limit, 5000)  # Bound to prevent server resource starvation
        tm.load_input(input_str)
        summary = tm.run(max_steps=tm.max_step_limit)

        return jsonify({
            "success": True,
            "summary": summary,
            "tape": tm.tape.to_dict(),
            "snapshot": tm.get_state_snapshot(),
            "history": tm.history,
            "mermaid": tm.generate_mermaid_diagram()
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route("/api/simulator/step", methods=["POST"])
def step_simulation():
    """
    Execute a single transition step given the current runtime state.
    """
    data = request.get_json() or {}
    machine_def = data.get("machine")
    current_state = data.get("current_state", "q0")
    head = int(data.get("head", 0))
    cells_data = data.get("cells", {})
    step_count = int(data.get("step_count", 0))
    blank_symbol = data.get("blank_symbol", "B")
    step_limit = int(data.get("step_limit", 1000))
    status = data.get("status", "RUNNING")

    if not machine_def:
        return jsonify({"success": False, "error": "Missing machine definition."}), 400

    try:
        tm = TuringMachine.from_dict(machine_def)
        tm.max_step_limit = min(step_limit, 5000)
        tm.blank_symbol = blank_symbol
        tm.tape = Tape("", blank_symbol=blank_symbol, initial_head=head)
        for idx_str, sym in cells_data.items():
            tm.tape._cells[int(idx_str)] = str(sym)

        tm.current_state = current_state
        tm.step_count = step_count
        if status in ("ACCEPTED", "REJECTED", "STEP_LIMIT_REACHED"):
            tm.status = status

        step_result = tm.step()
        return jsonify({
            "success": True,
            "step_result": step_result,
            "snapshot": tm.get_state_snapshot()
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route("/api/utm/simulate", methods=["POST"])
def utm_simulate():
    """
    Execute Universal Turing Machine simulation on an encoded TM and input.
    Supports either:
    1) machine_def / machine_id + input_string
    2) encoded_string (<M>000<w>) with optional legend
    """
    data = request.get_json() or {}
    encoded_string = data.get("encoded_string")
    legend = data.get("legend")
    machine_def = data.get("machine")
    machine_id = data.get("machine_id")
    input_str = data.get("input_string", "")
    max_steps = int(data.get("max_steps", 150))

    try:
        if encoded_string:
            tm, decoded_input = UTMEncoder.decode_full_pair(encoded_string, legend=legend)
            if not input_str and decoded_input:
                input_str = decoded_input
        else:
            if not machine_def and machine_id:
                machines = load_all_predefined_machines()
                machine_def = machines.get(machine_id)
            if not machine_def:
                return jsonify({"success": False, "error": "No machine definition or encoded string provided."}), 400
            tm = TuringMachine.from_dict(machine_def)

        utm = UniversalTuringMachine(tm)
        res = utm.simulate(input_str, max_steps=min(max_steps, 500))
        return jsonify({"success": True, "result": res})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route("/api/language_classes/compare", methods=["POST"])
def language_compare():
    """
    Simultaneously runs a Decider and a Recognizer on an input string.
    """
    data = request.get_json() or {}
    input_str = data.get("input_string", "101")
    step_limit = int(data.get("step_limit", 300))

    try:
        comparison = compare_language_classes(input_str, step_limit=min(step_limit, 1000))
        return jsonify({"success": True, "comparison": comparison})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route("/api/halting_proof/steps", methods=["GET"])
def halting_steps():
    """Return the sequential pedagogical proof steps."""
    return jsonify({"success": True, "steps": HaltingProofSimulator.get_proof_steps()})


@app.route("/api/halting_proof/simulate", methods=["POST"])
def halting_simulate():
    """
    Simulate the behavioral paradox when OPPOSITE is executed on <OPPOSITE>.
    """
    data = request.get_json() or {}
    prediction = data.get("prediction", "HALT")
    try:
        result = HaltingProofSimulator.simulate_adversary_run(prediction)
        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route("/api/halting_proof/sample/<program_id>", methods=["GET"])
def halting_sample(program_id):
    """Retrieve explanation of sample programs for halting analysis."""
    sample = HaltingProofSimulator.analyze_sample_program(program_id)
    return jsonify({"success": True, "sample": sample})


@app.route("/api/theory/topics", methods=["GET"])
def theory_topics():
    """Return syllabus topics for Theory Explorer."""
    return jsonify({"success": True, "topics": TheoryTopics.get_all_topics()})


@app.route("/api/theory/pcp/verify", methods=["POST"])
def pcp_verify():
    """Verify a sequence of tiles in Post Correspondence Problem."""
    data = request.get_json() or {}
    tiles = data.get("tiles", [])
    sequence = data.get("sequence", [])
    result = TheoryTopics.verify_pcp_solution(tiles, sequence)
    return jsonify({"success": True, "result": result})


@app.route("/api/theory/pcp/solve", methods=["POST"])
def pcp_solve():
    """Attempt bounded BFS solution on PCP tiles."""
    data = request.get_json() or {}
    tiles = data.get("tiles", [])
    max_depth = int(data.get("max_depth", 6))
    result = TheoryTopics.solve_pcp_bounded(tiles, max_depth=min(max_depth, 10))
    return jsonify({"success": True, "result": result})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
