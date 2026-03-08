import sys
sys.path.insert(0, "D:/AIforBharat/manim_lib")

from manim import *


class LinkedListAnimation(Scene):
    def construct(self):
        title = Text("Linked List — Insert & Traverse", font_size=42, color=GOLD).to_edge(UP)
        self.play(Write(title))

        # Build linked list: 10 -> 20 -> 30 -> 40
        values = [10, 20, 30, 40]
        nodes = VGroup()
        arrows = VGroup()

        for i, val in enumerate(values):
            # Node: data box + next pointer box
            data_box = Rectangle(width=1.2, height=0.8, color=BLUE, stroke_width=2)
            ptr_box = Rectangle(width=0.6, height=0.8, color=BLUE_D, stroke_width=2)
            ptr_box.next_to(data_box, RIGHT, buff=0)
            data_text = Text(str(val), font_size=24, color=WHITE).move_to(data_box)
            node = VGroup(data_box, ptr_box, data_text)
            nodes.add(node)

        nodes.arrange(RIGHT, buff=1.0).move_to(ORIGIN)

        # Arrows between nodes
        for i in range(len(values) - 1):
            arrow = Arrow(
                nodes[i][1].get_right(),
                nodes[i+1][0].get_left(),
                buff=0.1, color=WHITE, stroke_width=2
            )
            arrows.add(arrow)

        # NULL at the end
        null_text = Text("NULL", font_size=20, color=RED).next_to(nodes[-1][1], RIGHT, buff=0.3)

        # HEAD label
        head_label = Text("HEAD", font_size=20, color=YELLOW).next_to(nodes[0], UP, buff=0.3)
        head_arrow = Arrow(head_label.get_bottom(), nodes[0][0].get_top(), buff=0.1, color=YELLOW, stroke_width=2)

        # Animate creation
        self.play(FadeIn(head_label), FadeIn(head_arrow))
        for i in range(len(values)):
            self.play(FadeIn(nodes[i]), run_time=0.4)
            if i < len(arrows):
                self.play(FadeIn(arrows[i]), run_time=0.2)
        self.play(FadeIn(null_text))
        self.wait(0.5)

        # Traversal animation
        traverse_label = Text("Traversal: Visit each node", font_size=28, color=YELLOW).to_edge(DOWN)
        self.play(Write(traverse_label))

        highlight = SurroundingRectangle(nodes[0], color=YELLOW, buff=0.15)
        self.play(Create(highlight))
        for i in range(1, len(values)):
            self.play(highlight.animate.move_to(nodes[i]), run_time=0.5)
        self.play(FadeOut(highlight))
        self.wait(0.3)

        # Insert node 25 between 20 and 30
        self.play(FadeOut(traverse_label))
        insert_label = Text("Insert 25 after node 20", font_size=28, color=GREEN).to_edge(DOWN)
        self.play(Write(insert_label))

        # Highlight node 20
        self.play(nodes[1][0].animate.set_color(GREEN), run_time=0.3)

        # Create new node
        new_data = Rectangle(width=1.2, height=0.8, color=GREEN, stroke_width=2)
        new_ptr = Rectangle(width=0.6, height=0.8, color=GREEN_D, stroke_width=2)
        new_ptr.next_to(new_data, RIGHT, buff=0)
        new_text = Text("25", font_size=24, color=WHITE).move_to(new_data)
        new_node = VGroup(new_data, new_ptr, new_text)
        new_node.next_to(nodes[1], DOWN, buff=1.5)

        self.play(FadeIn(new_node), run_time=0.5)

        # Show pointer reassignment with arrows
        step1 = Text("1. new.next = node20.next", font_size=20, color=TEAL).shift(DOWN * 3)
        self.play(Write(step1), run_time=0.5)
        new_arrow = Arrow(new_node[1].get_right(), nodes[2][0].get_bottom(), buff=0.1, color=GREEN, stroke_width=2)
        self.play(FadeIn(new_arrow))

        step2 = Text("2. node20.next = new", font_size=20, color=TEAL).next_to(step1, DOWN, buff=0.2)
        self.play(Write(step2), run_time=0.5)

        self.wait(0.5)

        # Complexity
        self.play(FadeOut(step1), FadeOut(step2), FadeOut(insert_label))
        complexity = Text("Insert: O(1) after found | Search: O(n)", font_size=26, color=GOLD).to_edge(DOWN)
        self.play(Write(complexity))
        self.wait(1)


class StackAnimation(Scene):
    def construct(self):
        title = Text("Stack — LIFO (Last In, First Out)", font_size=42, color=GOLD).to_edge(UP)
        self.play(Write(title))

        # Draw stack container
        left_wall = Line(DOWN * 2.5, UP * 2, color=WHITE, stroke_width=3).shift(LEFT * 1.2)
        right_wall = Line(DOWN * 2.5, UP * 2, color=WHITE, stroke_width=3).shift(RIGHT * 1.2)
        bottom = Line(LEFT * 1.2 + DOWN * 2.5, RIGHT * 1.2 + DOWN * 2.5, color=WHITE, stroke_width=3)
        container = VGroup(left_wall, right_wall, bottom)
        self.play(Create(container))

        stack_label = Text("STACK", font_size=20, color=GREY).next_to(bottom, DOWN, buff=0.3)
        self.play(FadeIn(stack_label))

        # Push operations
        values = [10, 20, 30, 40]
        elements = []
        operations = Text("", font_size=24).to_edge(RIGHT)

        for i, val in enumerate(values):
            op_text = Text(f"push({val})", font_size=24, color=GREEN).to_edge(RIGHT).shift(DOWN * (i - 1.5))
            self.play(FadeIn(op_text), run_time=0.3)

            elem = VGroup(
                Rectangle(width=2.0, height=0.7, color=BLUE, fill_opacity=0.6, stroke_width=2),
                Text(str(val), font_size=26, color=WHITE)
            )
            elem[1].move_to(elem[0])

            # Start above, drop into stack
            target_y = -2.5 + 0.35 + i * 0.75
            elem.move_to(UP * 3)
            self.play(elem.animate.move_to(RIGHT * 0 + UP * (target_y - 0.5)), run_time=0.5)
            elements.append(elem)

        # TOP pointer
        top_arrow = Arrow(LEFT * 2.5, elements[-1][0].get_left(), buff=0.1, color=YELLOW, stroke_width=2)
        top_label = Text("TOP", font_size=22, color=YELLOW).next_to(top_arrow, LEFT, buff=0.2)
        self.play(FadeIn(top_arrow), FadeIn(top_label))
        self.wait(0.5)

        # Pop operations
        pop_text = Text("pop() → 40", font_size=24, color=RED).to_edge(LEFT).shift(UP * 0.5)
        self.play(FadeIn(pop_text), run_time=0.3)
        self.play(elements[-1].animate.shift(UP * 3), FadeOut(top_arrow), FadeOut(top_label), run_time=0.5)
        elements.pop()

        # Update TOP
        top_arrow2 = Arrow(LEFT * 2.5, elements[-1][0].get_left(), buff=0.1, color=YELLOW, stroke_width=2)
        top_label2 = Text("TOP", font_size=22, color=YELLOW).next_to(top_arrow2, LEFT, buff=0.2)
        self.play(FadeIn(top_arrow2), FadeIn(top_label2))

        pop_text2 = Text("pop() → 30", font_size=24, color=RED).to_edge(LEFT).shift(DOWN * 0.2)
        self.play(FadeIn(pop_text2), run_time=0.3)
        self.play(elements[-1].animate.shift(UP * 3), FadeOut(top_arrow2), FadeOut(top_label2), run_time=0.5)
        elements.pop()

        self.wait(0.5)

        complexity = Text("Push: O(1) | Pop: O(1) | Peek: O(1)", font_size=26, color=GOLD).to_edge(DOWN)
        self.play(Write(complexity))
        self.wait(1)
