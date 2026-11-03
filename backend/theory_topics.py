"""
Theory Explorer Module.
Contains comprehensive Theory of Computation Module 5 syllabus material:
1. Church-Turing Thesis
2. Countability & Cantor's Diagonalization
3. Variants of Turing Machines (Multi-tape, Nondeterministic, Multi-track)
4. Rice's Theorem
5. Post Correspondence Problem (PCP with interactive puzzle verifier and bounded solver)
6. Undecidable Problems about Turing Machines
"""
from typing import Dict, List, Any, Optional, Tuple
from collections import deque


class TheoryTopics:
    """Provides structured content and interactive algorithms for syllabus theory topics."""

    @staticmethod
    def get_all_topics() -> Dict[str, Any]:
        return {
            "church_thesis": {
                "id": "church_thesis",
                "title": "Church-Turing Thesis",
                "subtitle": "The Equation of Intuitive Algorithms and Turing Machines",
                "summary": "Every effectively calculable function or algorithm can be computed by a Turing Machine.",
                "details": (
                    "Formulated independently by Alonzo Church (using Lambda Calculus) and Alan Turing (using Turing Machines) in 1936. "
                    "It is a thesis or hypothesis—not a mathematical theorem—because 'effective calculability' or 'algorithm' is an intuitive notion. "
                    "To date, every proposed formal model of computation (Lambda Calculus, RAM machines, Markov algorithms, cellular automata, quantum computers) "
                    "has been proven computationally equivalent to or subsumed by Turing machines in terms of decidability."
                ),
                "key_implications": [
                    "A problem is unsolvable by an algorithm if and only if it cannot be solved by a Turing Machine.",
                    "Modern supercomputers, quantum computers, and smartphones cannot decide any problem that a Turing Machine cannot decide.",
                    "Allows theoretical computer science to prove universal limits of computation using simple 7-tuple machines."
                ]
            },
            "countability": {
                "id": "countability",
                "title": "Countability & Cantor's Diagonalization",
                "subtitle": "Why There Are Infinitely More Problems Than Programs",
                "summary": "The set of all Turing Machines is countably infinite, but the set of all languages is uncountably infinite.",
                "details": (
                    "Georg Cantor showed in 1891 that infinities come in different sizes. "
                    "A set is countable if its elements can be put in 1-to-1 correspondence with the natural numbers {0, 1, 2, ...}.\n\n"
                    "• Every Turing Machine has a finite description string over a finite alphabet. Therefore, the set of all possible Turing Machines is countable: |{TMs}| = ℵ₀.\n\n"
                    "• A language is an arbitrary subset of Σ*. The set of all languages is the power set P(Σ*).\n\n"
                    "• By Cantor's Theorem, |P(Σ*)| = 2^ℵ₀ > ℵ₀ (uncountably infinite)!\n\n"
                    "Conclusion: Because 2^ℵ₀ > ℵ₀, the number of languages vastly exceeds the number of Turing Machines. "
                    "Thus, the overwhelming majority of languages are not recognizable by any Turing Machine!"
                ),
                "cantor_diagonal_demo": {
                    "sample_rows": [
                        {"index": 1, "string": "0 1 0 1 0 1 ..."},
                        {"index": 2, "string": "1 1 0 0 1 1 ..."},
                        {"index": 3, "string": "0 0 0 1 1 0 ..."},
                        {"index": 4, "string": "1 0 1 0 0 1 ..."},
                        {"index": 5, "string": "0 1 1 1 0 0 ..."}
                    ],
                    "diagonal": "0 1 0 0 0",
                    "inverted_diagonal": "1 0 1 1 1",
                    "explanation": "By flipping the i-th bit of the i-th string, the constructed string differs from every string in the list at index i. Hence, no enumeration can cover all real numbers or languages!"
                }
            },
            "tm_variants": {
                "id": "tm_variants",
                "title": "Variants of Turing Machines",
                "subtitle": "Computational Equivalence Across Architectural Enhancements",
                "summary": "Multi-tape, Multi-track, Non-deterministic, and Two-way infinite TMs have the exact same computational power as a standard 1-tape TM.",
                "variants": [
                    {
                        "name": "Multi-Tape Turing Machine",
                        "description": "Has k separate tapes, each with its own independent read/write head.",
                        "equivalence_result": "Equivalent to Single-Tape TM. A single-tape TM can simulate t steps of a k-tape TM in O(t²) time by interleaving tracks with head markers."
                    },
                    {
                        "name": "Non-Deterministic Turing Machine (NTM)",
                        "description": "δ maps (state, symbol) to a set of possible transitions, branching into a computation tree.",
                        "equivalence_result": "Equivalent to Deterministic TM (DTM). A DTM simulates an NTM using Breadth-First Search (BFS) over the computation tree (though time complexity increases exponentially from t to 2^(O(t)))."
                    },
                    {
                        "name": "Two-Way Infinite Tape TM",
                        "description": "Tape extends infinitely to both the left and right.",
                        "equivalence_result": "Equivalent to standard semi-infinite tape. A semi-infinite tape TM simulates a 2-way tape by splitting cells into positive and negative tracks (folding at index 0)."
                    },
                    {
                        "name": "Multi-Track Turing Machine",
                        "description": "Single tape divided into k parallel tracks with one shared read/write head.",
                        "equivalence_result": "Equivalent to standard TM. Each cell stores a k-tuple of symbols, which is simply a larger finite tape alphabet Γ' = Γ^k."
                    }
                ]
            },
            "rice_theorem": {
                "id": "rice_theorem",
                "title": "Rice's Theorem",
                "subtitle": "Every Non-Trivial Semantic Property of Turing Machines is Undecidable",
                "summary": "If P is a property of the language recognized by Turing Machines, and P is non-trivial, then deciding whether L(M) satisfies P is undecidable.",
                "details": (
                    "Proved by Henry Gordon Rice in 1953. It formalizes why static code analysis can never perfectly answer any interesting question "
                    "about program behavior without false positives or false negatives.\n\n"
                    "A property P of RE languages is:\n"
                    "1. Semantic: Depends only on the language recognized L(M), not on the syntactic structure or number of states in M.\n"
                    "2. Non-Trivial: There exists at least one RE language that satisfies P, and at least one that does not.\n\n"
                    "If both conditions hold, the language L_P = { <M> | L(M) has property P } is UNDECIDABLE."
                ),
                "examples": [
                    {"question": "Does TM M accept the empty string ε?", "property_type": "Semantic, Non-trivial", "verdict": "UNDECIDABLE"},
                    {"question": "Is the language L(M) empty (L(M) = ∅)?", "property_type": "Semantic, Non-trivial", "verdict": "UNDECIDABLE"},
                    {"question": "Is the language L(M) finite?", "property_type": "Semantic, Non-trivial", "verdict": "UNDECIDABLE"},
                    {"question": "Is the language L(M) regular?", "property_type": "Semantic, Non-trivial", "verdict": "UNDECIDABLE"},
                    {"question": "Does TM M have more than 5 states?", "property_type": "Syntactic (NOT semantic)", "verdict": "DECIDABLE (just count states!)"}
                ]
            },
            "pcp": {
                "id": "pcp",
                "title": "Post Correspondence Problem (PCP)",
                "subtitle": "An Undecidable String Domino Matching Problem",
                "summary": "Given pairs of string tiles (top_i, bottom_i), can we find a sequence of tiles such that the concatenated tops equal the concatenated bottoms?",
                "details": (
                    "Introduced by Emil Post in 1946. Unlike Turing Machine problems that explicitly mention states or tapes, "
                    "PCP is a purely combinatorial puzzle about string concatenation. Yet, it was proven undecidable by reducing "
                    "the Halting Problem / TM valid computation histories to a PCP instance."
                ),
                "preset_instances": [
                    {
                        "id": "instance_solvable",
                        "title": "Solvable Instance (Match Exists)",
                        "tiles": [
                            {"id": 1, "top": "a", "bottom": "baa"},
                            {"id": 2, "top": "ab", "bottom": "aa"},
                            {"id": 3, "top": "bba", "bottom": "bb"}
                        ],
                        "known_solution": [3, 2, 3, 1],
                        "explanation": "Sequence (3, 2, 3, 1): Top = 'bba' + 'ab' + 'bba' + 'a' = 'bbaabbbaa'; Bottom = 'bb' + 'aa' + 'bb' + 'baa' = 'bbaabbbaa'. Match!"
                    },
                    {
                        "id": "instance_simple",
                        "title": "Simple Solvable Instance",
                        "tiles": [
                            {"id": 1, "top": "b", "bottom": "ca"},
                            {"id": 2, "top": "a", "bottom": "ab"},
                            {"id": 3, "top": "ca", "bottom": "a"},
                            {"id": 4, "top": "abc", "bottom": "c"}
                        ],
                        "known_solution": [2, 1, 3, 2, 4],
                        "explanation": "Sequence (2, 1, 3, 2, 4): Top = 'a' + 'b' + 'ca' + 'a' + 'abc' = 'abcaaabc'; Bottom = 'ab' + 'ca' + 'a' + 'ab' + 'c' = 'abcaaabc'. Match!"
                    },
                    {
                        "id": "instance_unsolvable",
                        "title": "Unsolvable Instance (Length/Prefix Mismatch)",
                        "tiles": [
                            {"id": 1, "top": "001", "bottom": "0"},
                            {"id": 2, "top": "01", "bottom": "011"},
                            {"id": 3, "top": "11", "bottom": "111"}
                        ],
                        "known_solution": None,
                        "explanation": "No sequence of tiles can ever equalize the top and bottom strings. In general, determining if a solution exists for any arbitrary PCP instance is undecidable!"
                    }
                ]
            },
            "undecidable_problems": {
                "id": "undecidable_problems",
                "title": "Catalog of Undecidable Problems",
                "subtitle": "Key Undecidable Decision Problems in Automata Theory",
                "summary": "A reference guide to famous undecidable problems and reduction techniques.",
                "catalog": [
                    {
                        "name": "Halting Problem (Halt_TM)",
                        "formulation": "{ <M, w> | TM M halts on input w }",
                        "status": "Undecidable (Recursively Enumerable, not Recursive)",
                        "proof_method": "Cantor diagonalization / self-referential paradox."
                    },
                    {
                        "name": "State-Entry Problem",
                        "formulation": "{ <M, w, q> | TM M reaches state q during execution on input w }",
                        "status": "Undecidable",
                        "proof_method": "Reduction from Halting Problem: modify M so all halting states transition to state q."
                    },
                    {
                        "name": "Blank Tape Halting Problem",
                        "formulation": "{ <M> | TM M halts when started on an empty (blank) tape }",
                        "status": "Undecidable",
                        "proof_method": "Reduction: construct M' that writes w onto the tape first, then executes M."
                    },
                    {
                        "name": "Emptiness Problem (E_TM)",
                        "formulation": "{ <M> | L(M) = ∅ }",
                        "status": "Undecidable (neither RE nor co-RE)",
                        "proof_method": "Reduction from Halt_TM."
                    },
                    {
                        "name": "Equivalence Problem (EQ_TM)",
                        "formulation": "{ <M1, M2> | L(M1) = L(M2) }",
                        "status": "Undecidable",
                        "proof_method": "Reduction from E_TM: let M2 be a machine that rejects everything."
                    },
                    {
                        "name": "CFG Ambiguity Problem",
                        "formulation": "{ <G> | Context-Free Grammar G is ambiguous }",
                        "status": "Undecidable",
                        "proof_method": "Reduction from Post Correspondence Problem (PCP)."
                    }
                ]
            }
        }

    @staticmethod
    def verify_pcp_solution(tiles: List[Dict[str, str]], sequence: List[int]) -> Dict[str, Any]:
        """
        Verifies if a given sequence of 1-based tile indices matches top and bottom strings.
        """
        if not sequence:
            return {
                "valid": False,
                "top_string": "",
                "bottom_string": "",
                "match": False,
                "message": "Sequence of tiles is empty."
            }

        tile_map = {t["id"]: t for t in tiles}
        top_parts = []
        bottom_parts = []

        for idx in sequence:
            if idx not in tile_map:
                return {
                    "valid": False,
                    "top_string": "",
                    "bottom_string": "",
                    "match": False,
                    "message": f"Tile ID {idx} does not exist."
                }
            top_parts.append(tile_map[idx]["top"])
            bottom_parts.append(tile_map[idx]["bottom"])

        top_str = "".join(top_parts)
        bottom_str = "".join(bottom_parts)
        is_match = (top_str == bottom_str) and len(top_str) > 0

        return {
            "valid": True,
            "sequence": sequence,
            "top_string": top_str,
            "bottom_string": bottom_str,
            "top_parts": top_parts,
            "bottom_parts": bottom_parts,
            "match": is_match,
            "message": (
                f"MATCH FOUND! Both top and bottom concatenate to: '{top_str}'"
                if is_match else
                f"No match. Top: '{top_str}' != Bottom: '{bottom_str}'."
            )
        }

    @staticmethod
    def solve_pcp_bounded(tiles: List[Dict[str, str]], max_depth: int = 6) -> Dict[str, Any]:
        """
        Bounded breadth-first search for PCP solutions up to max_depth tile combinations.
        """
        # BFS queue elements: (sequence_of_ids, top_accum, bottom_accum)
        queue = deque()
        for t in tiles:
            queue.append(([t["id"]], t["top"], t["bottom"]))

        visited_prefixes = set()

        while queue:
            seq, top, bottom = queue.popleft()

            if top == bottom:
                return {
                    "found": True,
                    "sequence": seq,
                    "matched_string": top,
                    "depth": len(seq),
                    "message": f"Solution found at depth {len(seq)}: Sequence {seq}"
                }

            # Pruning: one must be a prefix of the other, otherwise no future append can fix the mismatch
            if not (top.startswith(bottom) or bottom.startswith(top)):
                continue

            if len(seq) < max_depth:
                diff = ("T", top[len(bottom):]) if len(top) > len(bottom) else ("B", bottom[len(top):])
                if diff in visited_prefixes:
                    continue
                visited_prefixes.add(diff)

                for t in tiles:
                    queue.append((seq + [t["id"]], top + t["top"], bottom + t["bottom"]))

        return {
            "found": False,
            "sequence": [],
            "matched_string": "",
            "depth": max_depth,
            "message": f"No solution found within search depth of {max_depth} tiles."
        }
