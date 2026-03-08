import sys
sys.path.insert(0, "D:/AIforBharat/manim_lib")

from manim import *


class BFSAnimation(Scene):
    def construct(self):
        title = Text("BFS — Breadth-First Search", font_size=42, color=GOLD).to_edge(UP)
        self.play(Write(title))

        # Create graph nodes
        positions = {
            "A": LEFT * 3 + UP * 1,
            "B": LEFT * 1 + UP * 2,
            "C": LEFT * 1 + DOWN * 0.5,
            "D": RIGHT * 1 + UP * 2,
            "E": RIGHT * 1 + DOWN * 0.5,
            "F": RIGHT * 3 + UP * 1,
        }

        edges = [("A", "B"), ("A", "C"), ("B", "D"), ("C", "E"), ("D", "F"), ("E", "F")]

        nodes = {}
        node_labels = {}
        for name, pos in positions.items():
            circle = Circle(radius=0.4, color=WHITE, stroke_width=2).move_to(pos)
            label = Text(name, font_size=28, color=WHITE).move_to(pos)
            nodes[name] = circle
            node_labels[name] = label

        edge_lines = {}
        for u, v in edges:
            line = Line(positions[u], positions[v], color=GREY, stroke_width=2)
            edge_lines[(u, v)] = line

        # Draw graph
        all_edges = VGroup(*edge_lines.values())
        all_nodes = VGroup(*nodes.values())
        all_labels = VGroup(*node_labels.values())
        self.play(FadeIn(all_edges), FadeIn(all_nodes), FadeIn(all_labels))
        self.wait(0.5)

        # BFS Queue visualization
        queue_label = Text("Queue:", font_size=22, color=BLUE).to_edge(DOWN).shift(UP * 1 + LEFT * 3)
        self.play(FadeIn(queue_label))

        # BFS from A
        bfs_order = ["A", "B", "C", "D", "E", "F"]
        bfs_edges = [("A", "B"), ("A", "C"), ("B", "D"), ("C", "E"), ("D", "F")]

        visited_label = Text("Visited:", font_size=22, color=GREEN).to_edge(DOWN).shift(LEFT * 3)
        self.play(FadeIn(visited_label))

        queue_items = VGroup()
        visited_items = VGroup()

        for i, node_name in enumerate(bfs_order):
            # Visit node
            self.play(
                nodes[node_name].animate.set_fill(YELLOW, opacity=0.6),
                nodes[node_name].animate.set_color(YELLOW),
                run_time=0.4
            )

            # Add to visited
            v_item = Text(node_name, font_size=20, color=GREEN)
            if len(visited_items) > 0:
                v_item.next_to(visited_items[-1], RIGHT, buff=0.3)
            else:
                v_item.next_to(visited_label, RIGHT, buff=0.3)
            visited_items.add(v_item)
            self.play(FadeIn(v_item), run_time=0.2)

            # Highlight edges from this node
            for u, v in bfs_edges:
                if u == node_name:
                    key = (u, v)
                    if key in edge_lines:
                        self.play(edge_lines[key].animate.set_color(YELLOW), run_time=0.2)

            # Mark as fully explored
            self.play(
                nodes[node_name].animate.set_fill(GREEN, opacity=0.6),
                nodes[node_name].animate.set_color(GREEN),
                run_time=0.3
            )

        # Final
        result = Text("BFS visits level by level — Time: O(V+E)", font_size=26, color=GOLD).to_edge(DOWN).shift(DOWN * 0.3)
        self.play(Write(result))
        self.wait(1)


class BinarySearchAnimation(Scene):
    def construct(self):
        title = Text("Binary Search", font_size=48, color=GOLD).to_edge(UP)
        self.play(Write(title))

        arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
        target = 23
        n = len(arr)

        target_label = Text(f"Target: {target}", font_size=28, color=YELLOW).next_to(title, DOWN, buff=0.3)
        self.play(Write(target_label))

        # Create array
        boxes = VGroup()
        nums = VGroup()
        idx_labels = VGroup()
        for i, val in enumerate(arr):
            box = Square(side_length=0.8, color=WHITE, stroke_width=2)
            num = Text(str(val), font_size=22, color=WHITE)
            idx = Text(str(i), font_size=16, color=GREY)
            boxes.add(box)
            nums.add(num)
            idx_labels.add(idx)

        boxes.arrange(RIGHT, buff=0.08).move_to(ORIGIN)
        for i in range(n):
            nums[i].move_to(boxes[i])
            idx_labels[i].next_to(boxes[i], DOWN, buff=0.25)

        self.play(FadeIn(boxes), FadeIn(nums), FadeIn(idx_labels))
        self.wait(0.5)

        # Binary search
        low, high = 0, n - 1
        step = 0

        low_ptr = Triangle(color=BLUE, fill_opacity=0.8).scale(0.2).rotate(PI)
        low_label = Text("L", font_size=18, color=BLUE)
        high_ptr = Triangle(color=RED, fill_opacity=0.8).scale(0.2).rotate(PI)
        high_label = Text("H", font_size=18, color=RED)
        mid_ptr = Triangle(color=YELLOW, fill_opacity=0.8).scale(0.25).rotate(PI)
        mid_label = Text("M", font_size=18, color=YELLOW)

        def update_pointers(l, h, m):
            low_ptr.next_to(boxes[l], UP, buff=0.4)
            low_label.next_to(low_ptr, UP, buff=0.1)
            high_ptr.next_to(boxes[h], UP, buff=0.4)
            high_label.next_to(high_ptr, UP, buff=0.1)
            mid_ptr.next_to(boxes[m], UP, buff=0.7)
            mid_label.next_to(mid_ptr, UP, buff=0.1)

        while low <= high:
            mid = (low + high) // 2
            step += 1
            update_pointers(low, high, mid)

            step_label = Text(f"Step {step}: mid={mid}, arr[{mid}]={arr[mid]}", font_size=24, color=TEAL)
            step_label.to_edge(DOWN).shift(UP * 0.5)

            if step == 1:
                self.play(
                    FadeIn(low_ptr), FadeIn(low_label),
                    FadeIn(high_ptr), FadeIn(high_label),
                    FadeIn(mid_ptr), FadeIn(mid_label),
                    FadeIn(step_label),
                    run_time=0.5
                )
            else:
                self.play(
                    low_ptr.animate.next_to(boxes[low], UP, buff=0.4),
                    low_label.animate.next_to(boxes[low], UP, buff=0.7),
                    high_ptr.animate.next_to(boxes[high], UP, buff=0.4),
                    high_label.animate.next_to(boxes[high], UP, buff=0.7),
                    mid_ptr.animate.next_to(boxes[mid], UP, buff=0.7),
                    mid_label.animate.next_to(boxes[mid], UP, buff=1.0),
                    FadeIn(step_label),
                    run_time=0.5
                )

            # Highlight mid
            self.play(boxes[mid].animate.set_color(YELLOW), run_time=0.3)

            if arr[mid] == target:
                # Found!
                self.play(boxes[mid].animate.set_fill(GREEN, opacity=0.6), run_time=0.3)
                found = Text(f"Found {target} at index {mid}!", font_size=32, color=GREEN)
                found.to_edge(DOWN)
                self.play(Transform(step_label, found))
                break
            elif arr[mid] < target:
                # Grey out left half
                result_text = Text(f"{arr[mid]} < {target} → search right", font_size=22, color=ORANGE)
                result_text.to_edge(DOWN)
                self.play(Transform(step_label, result_text), run_time=0.3)
                for k in range(low, mid + 1):
                    self.play(boxes[k].animate.set_fill(GREY, opacity=0.3), run_time=0.1)
                low = mid + 1
            else:
                result_text = Text(f"{arr[mid]} > {target} → search left", font_size=22, color=ORANGE)
                result_text.to_edge(DOWN)
                self.play(Transform(step_label, result_text), run_time=0.3)
                for k in range(mid, high + 1):
                    self.play(boxes[k].animate.set_fill(GREY, opacity=0.3), run_time=0.1)
                high = mid - 1

            self.wait(0.3)

        complexity = Text("Time: O(log n) — Eliminated half each step!", font_size=26, color=GOLD)
        complexity.to_edge(DOWN).shift(DOWN * 0.3)
        self.play(Write(complexity))
        self.wait(1)
