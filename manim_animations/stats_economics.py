import sys
sys.path.insert(0, "D:/AIforBharat/manim_lib")

from manim import *
import numpy as np


class NormalDistributionAnimation(Scene):
    def construct(self):
        title = Text("Normal Distribution (Bell Curve)", font_size=36, color=GOLD).to_edge(UP)
        self.play(Write(title))

        axes = Axes(
            x_range=[-4, 4, 1],
            y_range=[0, 0.5, 0.1],
            x_length=10,
            y_length=5,
            axis_config={"color": GREY, "include_numbers": False},
        ).shift(DOWN * 0.5)

        x_label = Text("Standard Deviations", font_size=18, color=GREY).next_to(axes.x_axis, DOWN, buff=0.5)
        # Manual axis numbers
        for val in [-3, -2, -1, 0, 1, 2, 3]:
            num = Text(str(val), font_size=14, color=GREY).next_to(axes.c2p(val, 0), DOWN, buff=0.15)
            self.add(num)
        self.play(Create(axes), Write(x_label), run_time=0.8)

        def normal_pdf(x, mu=0, sigma=1):
            return (1 / (sigma * np.sqrt(2 * np.pi))) * np.exp(-0.5 * ((x - mu) / sigma) ** 2)

        curve = axes.plot(lambda x: normal_pdf(x), x_range=[-3.8, 3.8], color=BLUE, stroke_width=3)
        self.play(Create(curve), run_time=1)

        # Mean line
        mean_line = DashedLine(
            axes.c2p(0, 0), axes.c2p(0, 0.45),
            color=YELLOW, stroke_width=2, dash_length=0.1
        )
        mean_label = Text("Mean", font_size=20, color=YELLOW).next_to(axes.c2p(0, 0.45), UP, buff=0.15)
        self.play(Create(mean_line), Write(mean_label), run_time=0.4)

        # 1 sigma (68%)
        area_1 = axes.get_area(curve, x_range=[-1, 1], color=BLUE, opacity=0.4)
        pct_1 = Text("68.2%", font_size=22, color=WHITE).move_to(axes.c2p(0, 0.15))
        self.play(FadeIn(area_1), Write(pct_1), run_time=0.6)

        for s in [-1, 1]:
            marker = DashedLine(
                axes.c2p(s, 0), axes.c2p(s, normal_pdf(s)),
                color=GREEN, stroke_width=1.5, dash_length=0.08
            )
            self.play(Create(marker), run_time=0.2)

        s1l = Text("-1s", font_size=16, color=GREEN).next_to(axes.c2p(-1, 0), DOWN, buff=0.1)
        s1r = Text("+1s", font_size=16, color=GREEN).next_to(axes.c2p(1, 0), DOWN, buff=0.1)
        self.play(Write(s1l), Write(s1r), run_time=0.3)

        self.wait(0.3)

        # 2 sigma (95%)
        area_2 = axes.get_area(curve, x_range=[-2, 2], color=PURPLE, opacity=0.25)
        pct_2 = Text("95.4%", font_size=18, color=PURPLE_A).move_to(axes.c2p(1.5, 0.05))
        self.play(FadeIn(area_2), Write(pct_2), run_time=0.5)

        s2l = Text("-2s", font_size=16, color=PURPLE).next_to(axes.c2p(-2, 0), DOWN, buff=0.2)
        s2r = Text("+2s", font_size=16, color=PURPLE).next_to(axes.c2p(2, 0), DOWN, buff=0.2)
        self.play(Write(s2l), Write(s2r), run_time=0.3)

        # 3 sigma (99.7%)
        area_3 = axes.get_area(curve, x_range=[-3, 3], color=RED, opacity=0.12)
        pct_3 = Text("99.7%", font_size=16, color=RED_A).move_to(axes.c2p(-2.5, 0.03))
        self.play(FadeIn(area_3), Write(pct_3), run_time=0.5)

        # Rule box
        rule_title = Text("The 68-95-99.7 Rule", font_size=20, color=GOLD)
        rule_detail = Text("68% in 1s  |  95% in 2s  |  99.7% in 3s", font_size=16, color=TEAL)
        rule_box = VGroup(rule_title, rule_detail).arrange(DOWN, buff=0.1).to_edge(DOWN)
        bg = SurroundingRectangle(rule_box, color=GREY, fill_color=BLACK, fill_opacity=0.8, buff=0.2)
        self.play(FadeIn(bg), Write(rule_box), run_time=0.5)
        self.wait(1)


class SupplyDemandAnimation(Scene):
    def construct(self):
        title = Text("Supply & Demand", font_size=40, color=GOLD).to_edge(UP)
        self.play(Write(title))

        axes = Axes(
            x_range=[0, 10, 2],
            y_range=[0, 10, 2],
            x_length=7,
            y_length=5,
            axis_config={"color": GREY, "include_numbers": False},
        ).shift(LEFT * 1 + DOWN * 0.5)

        x_label = Text("Quantity (Q)", font_size=18, color=GREY).next_to(axes.x_axis, RIGHT, buff=0.2)
        y_label = Text("Price (Rs)", font_size=18, color=GREY).next_to(axes.y_axis, UP, buff=0.2)
        self.play(Create(axes), Write(x_label), Write(y_label), run_time=0.8)

        # Demand curve (downward)
        demand = axes.plot(lambda x: 9 - 0.8 * x, x_range=[0.5, 9.5], color=RED, stroke_width=3)
        d_label = Text("Demand (D)", font_size=16, color=RED).next_to(axes.c2p(9, 1.8), RIGHT, buff=0.2)
        self.play(Create(demand), Write(d_label), run_time=0.6)

        # Supply curve (upward)
        supply = axes.plot(lambda x: 1 + 0.7 * x, x_range=[0.5, 9.5], color=GREEN, stroke_width=3)
        s_label = Text("Supply (S)", font_size=16, color=GREEN).next_to(axes.c2p(9, 7.3), RIGHT, buff=0.2)
        self.play(Create(supply), Write(s_label), run_time=0.6)

        # Equilibrium
        eq_x, eq_y = 5.33, 4.73
        eq_dot = Dot(axes.c2p(eq_x, eq_y), color=YELLOW, radius=0.12)
        eq_label = Text("Equilibrium", font_size=16, color=YELLOW).next_to(eq_dot, UP + RIGHT, buff=0.2)

        h_dash = DashedLine(axes.c2p(0, eq_y), axes.c2p(eq_x, eq_y), color=YELLOW, stroke_width=1.5, dash_length=0.1)
        v_dash = DashedLine(axes.c2p(eq_x, 0), axes.c2p(eq_x, eq_y), color=YELLOW, stroke_width=1.5, dash_length=0.1)

        pe_label = Text("Pe", font_size=18, color=YELLOW).next_to(axes.c2p(0, eq_y), LEFT, buff=0.15)
        qe_label = Text("Qe", font_size=18, color=YELLOW).next_to(axes.c2p(eq_x, 0), DOWN, buff=0.15)

        self.play(
            FadeIn(eq_dot), Write(eq_label),
            Create(h_dash), Create(v_dash),
            Write(pe_label), Write(qe_label),
            run_time=0.8
        )

        self.wait(0.5)

        # Surplus (price too high)
        surplus_line = DashedLine(axes.c2p(0, 7), axes.c2p(10, 7), color=ORANGE, stroke_width=1.5, dash_length=0.1)
        surplus_label = Text("Price HIGH ->", font_size=14, color=ORANGE).next_to(axes.c2p(0, 7), LEFT + UP, buff=0.1)

        surplus_bracket = BraceBetweenPoints(axes.c2p(2.5, 7.2), axes.c2p(8.57, 7.2), color=ORANGE)
        surplus_text = Text("SURPLUS", font_size=16, color=ORANGE).next_to(surplus_bracket, UP, buff=0.1)

        self.play(Create(surplus_line), Write(surplus_label), run_time=0.4)
        self.play(Create(surplus_bracket), Write(surplus_text), run_time=0.4)
        self.wait(0.5)

        # Shortage (price too low)
        self.play(FadeOut(surplus_line), FadeOut(surplus_label), FadeOut(surplus_bracket), FadeOut(surplus_text), run_time=0.3)

        shortage_line = DashedLine(axes.c2p(0, 2.5), axes.c2p(10, 2.5), color=PURPLE, stroke_width=1.5, dash_length=0.1)
        shortage_label = Text("Price LOW ->", font_size=14, color=PURPLE).next_to(axes.c2p(0, 2.5), LEFT + DOWN, buff=0.1)

        shortage_bracket = BraceBetweenPoints(axes.c2p(2.14, 2.3), axes.c2p(8.125, 2.3), direction=DOWN, color=PURPLE)
        shortage_text = Text("SHORTAGE", font_size=16, color=PURPLE).next_to(shortage_bracket, DOWN, buff=0.1)

        self.play(Create(shortage_line), Write(shortage_label), run_time=0.4)
        self.play(Create(shortage_bracket), Write(shortage_text), run_time=0.4)

        self.wait(0.5)
        self.play(FadeOut(shortage_line), FadeOut(shortage_label), FadeOut(shortage_bracket), FadeOut(shortage_text), run_time=0.3)

        # India context
        insight_1 = Text("Example: UPI transactions", font_size=16, color=TEAL)
        insight_2 = Text("More users (demand up) -> More merchants (supply up)", font_size=14, color=GREY)
        insight = VGroup(insight_1, insight_2).arrange(DOWN, buff=0.1).to_edge(DOWN)
        self.play(Write(insight))
        self.wait(1)
