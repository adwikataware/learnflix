import sys
sys.path.insert(0, "D:/AIforBharat/manim_lib")

from manim import *
import numpy as np


class ProjectileMotionAnimation(Scene):
    def construct(self):
        title = Text("Projectile Motion", font_size=40, color=GOLD).to_edge(UP)
        self.play(Write(title))

        # Ground line
        ground = Line(LEFT * 6, RIGHT * 6, color=GREY, stroke_width=2).shift(DOWN * 2.5)
        self.play(Create(ground), run_time=0.3)

        # Parameters
        v0 = 5
        angle_deg = 45
        angle_rad = np.radians(angle_deg)
        g = 9.8

        origin = LEFT * 5 + DOWN * 2.5
        vx = v0 * np.cos(angle_rad)
        vy = v0 * np.sin(angle_rad)

        # Initial velocity arrow
        v_arrow = Arrow(
            origin, origin + RIGHT * vx * 0.5 + UP * vy * 0.5,
            color=YELLOW, stroke_width=3, buff=0
        )
        v_label = Text("v0 = 50 m/s", font_size=20, color=YELLOW).next_to(v_arrow, UP + RIGHT, buff=0.1)

        # Angle arc
        angle_arc = Arc(radius=0.8, angle=angle_rad, arc_center=origin, color=GREEN, stroke_width=2)
        angle_label = Text("45 deg", font_size=18, color=GREEN).next_to(angle_arc, RIGHT, buff=0.1).shift(UP * 0.1)

        self.play(Create(v_arrow), Write(v_label), Create(angle_arc), Write(angle_label), run_time=0.6)

        # Component arrows
        vx_arrow = Arrow(origin, origin + RIGHT * vx * 0.5, color=BLUE, stroke_width=2, buff=0)
        vy_arrow = Arrow(origin, origin + UP * vy * 0.5, color=RED, stroke_width=2, buff=0)
        vx_label = Text("vx = v0 cos(t)", font_size=16, color=BLUE).next_to(vx_arrow, DOWN, buff=0.15)
        vy_label = Text("vy = v0 sin(t)", font_size=16, color=RED).next_to(vy_arrow, LEFT, buff=0.15)

        self.play(Create(vx_arrow), Create(vy_arrow), Write(vx_label), Write(vy_label), run_time=0.6)

        self.wait(0.3)
        self.play(
            FadeOut(vx_arrow), FadeOut(vy_arrow), FadeOut(vx_label), FadeOut(vy_label),
            FadeOut(v_arrow), FadeOut(v_label), FadeOut(angle_arc), FadeOut(angle_label),
            run_time=0.3
        )

        # Animate projectile
        t_flight = 2 * v0 * np.sin(angle_rad) / g * 2
        num_points = 60

        path_points = []
        ball = Dot(origin, color=YELLOW, radius=0.12)
        self.add(ball)

        trail_dots = VGroup()
        for i in range(num_points + 1):
            t = (i / num_points) * t_flight
            x = origin[0] + vx * t * 0.7
            y = origin[1] + vy * t * 0.7 - 0.5 * g * (t * 0.7) ** 2 * 0.1
            if y < origin[1] - 0.01 and i > 5:
                break
            path_points.append([x, y, 0])
            dot = Dot([x, y, 0], color=ORANGE, radius=0.03, fill_opacity=0.5)
            trail_dots.add(dot)

        for i, pt in enumerate(path_points):
            self.play(
                ball.animate.move_to(pt),
                FadeIn(trail_dots[i]) if i < len(trail_dots) else Wait(0),
                run_time=0.04
            )

        # Draw path curve
        path_curve = VMobject(color=ORANGE, stroke_width=2, stroke_opacity=0.6)
        path_curve.set_points_smoothly([np.array(p) for p in path_points])
        self.add(path_curve)

        # Mark max height
        max_idx = max(range(len(path_points)), key=lambda i: path_points[i][1])
        max_pt = path_points[max_idx]
        h_line = DashedLine(
            [max_pt[0], origin[1], 0], max_pt,
            color=GREEN, stroke_width=1.5, dash_length=0.1
        )
        h_label = Text("H max", font_size=18, color=GREEN).next_to(h_line, LEFT, buff=0.15)
        self.play(Create(h_line), Write(h_label), run_time=0.4)

        # Mark range
        end_pt = path_points[-1]
        r_line = DashedLine(
            origin, [end_pt[0], origin[1], 0],
            color=PURPLE, stroke_width=1.5, dash_length=0.1
        )
        r_label = Text("Range R", font_size=18, color=PURPLE).next_to(r_line, DOWN, buff=0.2)
        self.play(Create(r_line), Write(r_label), run_time=0.5)

        # Key formulas
        formulas = VGroup(
            Text("H = v0² sin²(t) / 2g", font_size=18, color=GREEN),
            Text("R = v0² sin(2t) / g", font_size=18, color=PURPLE),
            Text("T = 2 v0 sin(t) / g", font_size=18, color=TEAL),
        ).arrange(DOWN, buff=0.2).shift(RIGHT * 4 + UP * 1)
        self.play(Write(formulas), run_time=0.6)

        note = Text("At 45 deg, range is maximum!", font_size=20, color=TEAL).to_edge(DOWN)
        self.play(Write(note))
        self.wait(1)


class WaveInterferenceAnimation(Scene):
    def construct(self):
        title = Text("Wave Interference", font_size=40, color=GOLD).to_edge(UP)
        self.play(Write(title))

        ax1 = Axes(
            x_range=[0, 4 * PI, PI / 2], y_range=[-2, 2, 1],
            x_length=10, y_length=1.8,
            axis_config={"color": GREY, "include_numbers": False},
        ).shift(UP * 1.5)

        ax2 = Axes(
            x_range=[0, 4 * PI, PI / 2], y_range=[-2, 2, 1],
            x_length=10, y_length=1.8,
            axis_config={"color": GREY, "include_numbers": False},
        )

        ax3 = Axes(
            x_range=[0, 4 * PI, PI / 2], y_range=[-3, 3, 1],
            x_length=10, y_length=1.8,
            axis_config={"color": GREY, "include_numbers": False},
        ).shift(DOWN * 1.8)

        l1 = Text("Wave 1", font_size=16, color=BLUE).next_to(ax1, LEFT, buff=0.3)
        l2 = Text("Wave 2", font_size=16, color=RED).next_to(ax2, LEFT, buff=0.3)
        l3 = Text("Result", font_size=16, color=GREEN).next_to(ax3, LEFT, buff=0.3)

        self.play(Create(ax1), Create(ax2), Create(ax3), Write(l1), Write(l2), Write(l3), run_time=0.8)

        # CONSTRUCTIVE
        phase_label = Text("Constructive Interference (in phase)", font_size=22, color=YELLOW).shift(UP * 3)
        self.play(Write(phase_label), run_time=0.4)

        wave1 = ax1.plot(lambda x: np.sin(x), color=BLUE, stroke_width=2)
        wave2 = ax2.plot(lambda x: np.sin(x), color=RED, stroke_width=2)
        resultant = ax3.plot(lambda x: 2 * np.sin(x), color=GREEN, stroke_width=3)

        self.play(Create(wave1), Create(wave2), run_time=0.6)
        self.wait(0.3)

        plus = Text("+", font_size=30, color=WHITE).shift(LEFT * 5.5 + DOWN * 0.7)
        eq_sign = Text("=", font_size=30, color=WHITE).shift(LEFT * 5.5 + DOWN * 1.5)
        self.play(Write(plus), Write(eq_sign), run_time=0.3)
        self.play(Create(resultant), run_time=0.6)

        amp_text = Text("Amplitude DOUBLES!", font_size=20, color=GREEN).shift(DOWN * 3)
        self.play(Write(amp_text), run_time=0.4)

        self.wait(0.8)

        # DESTRUCTIVE
        self.play(
            FadeOut(wave1), FadeOut(wave2), FadeOut(resultant),
            FadeOut(phase_label), FadeOut(amp_text),
            run_time=0.3
        )

        phase_label2 = Text("Destructive Interference (180 deg out of phase)", font_size=22, color=YELLOW).shift(UP * 3)
        self.play(Write(phase_label2), run_time=0.4)

        wave1b = ax1.plot(lambda x: np.sin(x), color=BLUE, stroke_width=2)
        wave2b = ax2.plot(lambda x: np.sin(x + PI), color=RED, stroke_width=2)
        resultant_b = ax3.plot(lambda x: 0, color=GREEN, stroke_width=3)

        self.play(Create(wave1b), Create(wave2b), run_time=0.6)
        self.play(Create(resultant_b), run_time=0.6)

        cancel_text = Text("Waves CANCEL out!", font_size=20, color=RED).shift(DOWN * 3)
        self.play(Write(cancel_text), run_time=0.4)

        self.wait(0.5)

        principle = Text("Superposition: resultant = wave1 + wave2", font_size=18, color=TEAL).to_edge(DOWN)
        self.play(FadeOut(cancel_text), Write(principle))
        self.wait(1)
