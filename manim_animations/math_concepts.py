import sys
sys.path.insert(0, "D:/AIforBharat/manim_lib")

from manim import *
import numpy as np


class PythagoreanTheoremAnimation(Scene):
    def construct(self):
        title = Text("Pythagorean Theorem: a² + b² = c²", font_size=38, color=GOLD).to_edge(UP)
        self.play(Write(title))

        # Draw right triangle
        A = ORIGIN + LEFT * 2 + DOWN * 1
        B = A + RIGHT * 3
        C = A + UP * 2.25

        triangle = Polygon(A, B, C, color=WHITE, stroke_width=3)
        self.play(Create(triangle), run_time=1)

        # Right angle marker
        right_angle = Square(side_length=0.25, color=YELLOW, stroke_width=2)
        right_angle.move_to(A + RIGHT * 0.125 + UP * 0.125)
        self.play(Create(right_angle), run_time=0.3)

        # Side labels
        a_label = Text("a = 3", font_size=28, color=BLUE).next_to(
            Line(A, B), DOWN, buff=0.3
        )
        b_label = Text("b = 4", font_size=28, color=GREEN).next_to(
            Line(A, C), LEFT, buff=0.3
        )
        c_label = Text("c = ?", font_size=28, color=RED).next_to(
            Line(B, C).get_center(), RIGHT + UP, buff=0.3
        )
        self.play(Write(a_label), Write(b_label), Write(c_label), run_time=0.8)

        self.wait(0.5)

        # Show squares on each side
        a_sq = Square(side_length=3, color=BLUE, fill_opacity=0.3, stroke_width=2)
        a_sq.next_to(Line(A, B), DOWN, buff=0)
        a_sq_label = Text("a² = 9", font_size=24, color=BLUE).move_to(a_sq)

        b_sq = Square(side_length=2.25, color=GREEN, fill_opacity=0.3, stroke_width=2)
        b_sq.next_to(Line(A, C), LEFT, buff=0)
        b_sq_label = Text("b² = 16", font_size=24, color=GREEN).move_to(b_sq)

        self.play(FadeIn(a_sq), Write(a_sq_label), run_time=0.6)
        self.play(FadeIn(b_sq), Write(b_sq_label), run_time=0.6)

        self.wait(0.5)

        # Formula derivation
        step1 = Text("a² + b² = c²", font_size=36, color=YELLOW).shift(RIGHT * 3.5 + UP * 0.5)
        step2 = Text("9 + 16 = c²", font_size=36, color=YELLOW).next_to(step1, DOWN, buff=0.4)
        step3 = Text("25 = c²", font_size=36, color=YELLOW).next_to(step2, DOWN, buff=0.4)
        step4 = Text("c = 5", font_size=40, color=RED).next_to(step3, DOWN, buff=0.4)

        self.play(Write(step1), run_time=0.5)
        self.play(Write(step2), run_time=0.5)
        self.play(Write(step3), run_time=0.5)

        box = SurroundingRectangle(step4, color=RED, buff=0.15, stroke_width=3)
        self.play(Write(step4), Create(box), run_time=0.6)

        c_answer = Text("c = 5", font_size=28, color=RED).move_to(c_label)
        self.play(Transform(c_label, c_answer), run_time=0.4)

        note = Text("Works for ALL right triangles!", font_size=24, color=TEAL).to_edge(DOWN)
        self.play(Write(note))
        self.wait(1)


class QuadraticGraphAnimation(Scene):
    def construct(self):
        title = Text("Quadratic Functions: y = ax² + bx + c", font_size=34, color=GOLD).to_edge(UP)
        self.play(Write(title))

        axes = Axes(
            x_range=[-4, 6, 1],
            y_range=[-5, 10, 2],
            x_length=8,
            y_length=5,
            axis_config={"color": GREY, "include_numbers": False},
        ).shift(DOWN * 0.5)

        x_ax_label = Text("x", font_size=20, color=GREY).next_to(axes.x_axis, RIGHT, buff=0.1)
        y_ax_label = Text("y", font_size=20, color=GREY).next_to(axes.y_axis, UP, buff=0.1)
        self.play(Create(axes), Write(x_ax_label), Write(y_ax_label), run_time=0.8)

        # Plot y = x² - 2x - 3
        parabola = axes.plot(lambda x: x**2 - 2*x - 3, x_range=[-2, 4.5], color=BLUE, stroke_width=3)
        eq_label = Text("y = x² - 2x - 3", font_size=28, color=BLUE).shift(UP * 2.5 + LEFT * 3)

        self.play(Create(parabola), Write(eq_label), run_time=1)

        # Mark roots
        root1 = Dot(axes.c2p(-1, 0), color=RED, radius=0.1)
        root2 = Dot(axes.c2p(3, 0), color=RED, radius=0.1)
        r1_label = Text("x = -1", font_size=20, color=RED).next_to(root1, DOWN + LEFT, buff=0.2)
        r2_label = Text("x = 3", font_size=20, color=RED).next_to(root2, DOWN + RIGHT, buff=0.2)

        self.play(FadeIn(root1), FadeIn(root2), Write(r1_label), Write(r2_label), run_time=0.6)

        roots_text = Text("Roots: where y = 0", font_size=20, color=RED).shift(DOWN * 3.3 + LEFT * 3)
        self.play(Write(roots_text), run_time=0.4)

        # Mark vertex
        vertex = Dot(axes.c2p(1, -4), color=GREEN, radius=0.1)
        v_label = Text("Vertex (1, -4)", font_size=20, color=GREEN).next_to(vertex, DOWN, buff=0.3)
        self.play(FadeIn(vertex), Write(v_label), run_time=0.5)

        # Axis of symmetry
        sym_line = DashedLine(
            axes.c2p(1, -5), axes.c2p(1, 10),
            color=YELLOW, stroke_width=1.5, dash_length=0.1
        )
        sym_label = Text("x = 1", font_size=18, color=YELLOW).next_to(axes.c2p(1, 8), RIGHT, buff=0.2)
        self.play(Create(sym_line), Write(sym_label), run_time=0.5)

        # Factored form
        factored = Text("y = (x + 1)(x - 3)", font_size=28, color=PURPLE).shift(UP * 2.5 + RIGHT * 3)
        self.play(Write(factored), run_time=0.5)

        info = Text("a > 0: opens UP  |  a < 0: opens DOWN", font_size=18, color=TEAL).to_edge(DOWN)
        self.play(Write(info))
        self.wait(1)


class MatrixMultiplicationAnimation(Scene):
    def construct(self):
        title = Text("Matrix Multiplication", font_size=40, color=GOLD).to_edge(UP)
        self.play(Write(title))

        # Matrix A header
        a_header = Text("A (2x3)", font_size=22, color=BLUE).shift(LEFT * 4.5 + UP * 1.5)

        # Draw Matrix A as grid
        a_vals = [[1, 2, 3], [4, 5, 6]]
        a_group = VGroup()
        a_entries = []
        for r in range(2):
            for c in range(3):
                cell = Square(side_length=0.6, color=BLUE, stroke_width=1.5)
                cell.move_to(LEFT * 4.5 + RIGHT * c * 0.65 + DOWN * r * 0.65 + UP * 0.5)
                val = Text(str(a_vals[r][c]), font_size=20, color=WHITE).move_to(cell)
                a_group.add(cell, val)
                a_entries.append(val)

        # Matrix B header
        b_header = Text("B (3x2)", font_size=22, color=GREEN).shift(LEFT * 0.5 + UP * 1.5)

        b_vals = [[7, 8], [9, 10], [11, 12]]
        b_group = VGroup()
        b_entries = []
        for r in range(3):
            for c in range(2):
                cell = Square(side_length=0.6, color=GREEN, stroke_width=1.5)
                cell.move_to(LEFT * 0.5 + RIGHT * c * 0.65 + DOWN * r * 0.65 + UP * 0.8)
                val = Text(str(b_vals[r][c]), font_size=20, color=WHITE).move_to(cell)
                b_group.add(cell, val)
                b_entries.append(val)

        # Equals and Result
        eq_sign = Text("=", font_size=36, color=WHITE).shift(RIGHT * 2)

        c_header = Text("C (2x2)", font_size=22, color=YELLOW).shift(RIGHT * 4 + UP * 1.5)
        c_group = VGroup()
        c_entries = []
        for r in range(2):
            for c in range(2):
                cell = Square(side_length=0.6, color=YELLOW, stroke_width=1.5)
                cell.move_to(RIGHT * 4 + RIGHT * c * 0.65 + DOWN * r * 0.65 + UP * 0.5)
                val = Text("?", font_size=20, color=GREY).move_to(cell)
                c_group.add(cell, val)
                c_entries.append(val)

        self.play(
            Write(a_header), Write(a_group),
            Write(b_header), Write(b_group),
            Write(eq_sign),
            Write(c_header), Write(c_group),
            run_time=1
        )

        # Rule
        rule = Text("Row of A x Column of B = Element of C", font_size=20, color=TEAL).shift(DOWN * 2)
        self.play(Write(rule), run_time=0.5)

        self.wait(0.3)

        # Calculate C[0][0] = 1*7 + 2*9 + 3*11 = 58
        calc = Text("C[1,1] = 1x7 + 2x9 + 3x11 = 58", font_size=22, color=YELLOW).shift(DOWN * 2.8)
        self.play(Write(calc), run_time=0.6)

        new_val = Text("58", font_size=20, color=YELLOW).move_to(c_entries[0])
        self.play(Transform(c_entries[0], new_val), run_time=0.4)

        # Fill remaining
        results = ["64", "139", "154"]
        calcs = [
            "C[1,2] = 1x8 + 2x10 + 3x12 = 64",
            "C[2,1] = 4x7 + 5x9 + 6x11 = 139",
            "C[2,2] = 4x8 + 5x10 + 6x12 = 154",
        ]
        for i, (res, c_text) in enumerate(zip(results, calcs)):
            new_calc = Text(c_text, font_size=22, color=YELLOW).shift(DOWN * 2.8)
            self.play(Transform(calc, new_calc), run_time=0.3)
            new_v = Text(res, font_size=20, color=YELLOW).move_to(c_entries[i + 1])
            self.play(Transform(c_entries[i + 1], new_v), run_time=0.3)

        self.play(FadeOut(calc), run_time=0.2)

        insight = Text("A(mxn) x B(nxp) = C(mxp) -- inner dims must match!", font_size=18, color=TEAL).shift(DOWN * 3)
        self.play(Write(insight))
        self.wait(1)
