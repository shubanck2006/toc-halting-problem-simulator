"""
Theory of Computation Halting Problem Simulator - Backend Package.
Contains core Turing Machine simulation engines, tape structures,
Universal Turing Machine, language class comparators, halting proof adversary,
and theory exploration logic.
"""

from .tape import Tape
from .transition import Transition, TransitionTable
from .turing_machine import TuringMachine
from .universal_tm import UniversalTuringMachine, UTMEncoder
from .language_classes import compare_language_classes
from .halting_proof import HaltingProofSimulator
from .theory_topics import TheoryTopics

__all__ = [
    "Tape",
    "Transition",
    "TransitionTable",
    "TuringMachine",
    "UniversalTuringMachine",
    "UTMEncoder",
    "compare_language_classes",
    "HaltingProofSimulator",
    "TheoryTopics",
]
