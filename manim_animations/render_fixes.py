"""Render only the 3 fixed animations."""
import sys
import os
import subprocess

MANIM_LIB = "D:/AIforBharat/manim_lib"
ANIM_DIR = "D:/AIforBharat/PrimeLearn_Review/manim_animations"

SCENES = [
    ("math_concepts.py", "QuadraticGraphAnimation"),
    ("stats_economics.py", "NormalDistributionAnimation"),
    ("stats_economics.py", "SupplyDemandAnimation"),
]

os.chdir(ANIM_DIR)

for script, scene in SCENES:
    print(f"\n{'='*50}")
    print(f"  Rendering: {scene}")
    print(f"{'='*50}")

    cmd = [
        sys.executable, "-c",
        f"""
import sys, os
sys.path.insert(0, r'{MANIM_LIB}')
os.chdir(r'{ANIM_DIR}')
sys.argv = ['manim', '-ql', '{script}', '{scene}', '-o', '{scene}.mp4']
from manim.__main__ import main
main()
"""
    ]
    result = subprocess.run(cmd, capture_output=False, timeout=300)
    print(f"  [{'OK' if result.returncode == 0 else 'FAIL'}] {scene}")
