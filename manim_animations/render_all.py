"""Render all Manim animations using the custom manim_lib path."""
import sys
import os
import subprocess

MANIM_LIB = "D:/AIforBharat/manim_lib"
ANIM_DIR = "D:/AIforBharat/PrimeLearn_Review/manim_animations"

# All scenes to render: (script_file, scene_class)
SCENES = [
    ("math_concepts.py", "PythagoreanTheoremAnimation"),
    ("math_concepts.py", "QuadraticGraphAnimation"),
    ("math_concepts.py", "MatrixMultiplicationAnimation"),
    ("physics_concepts.py", "ProjectileMotionAnimation"),
    ("physics_concepts.py", "WaveInterferenceAnimation"),
    ("stats_economics.py", "NormalDistributionAnimation"),
    ("stats_economics.py", "SupplyDemandAnimation"),
]

os.chdir(ANIM_DIR)

for script, scene in SCENES:
    print(f"\n{'='*50}")
    print(f"  Rendering: {scene} from {script}")
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
    if result.returncode == 0:
        print(f"  [OK] {scene}")
    else:
        print(f"  [FAIL] {scene} (exit code {result.returncode})")

print("\n\nAll renders complete!")
