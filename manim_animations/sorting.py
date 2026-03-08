import sys
sys.path.insert(0, "D:/AIforBharat/manim_lib")

from manim import *

class BubbleSortAnimation(Scene):
    def construct(self):
        title = Text("Bubble Sort", font_size=48, color=GOLD).to_edge(UP)
        self.play(Write(title))

        arr = [64, 34, 25, 12, 22, 11, 90]
        n = len(arr)

        # Create array boxes
        boxes = VGroup()
        nums = VGroup()
        for i, val in enumerate(arr):
            box = Square(side_length=0.9, color=WHITE, stroke_width=2)
            num = Text(str(val), font_size=28, color=WHITE)
            num.move_to(box)
            boxes.add(box)
            nums.add(num)

        boxes.arrange(RIGHT, buff=0.15).move_to(ORIGIN)
        for i, num in enumerate(nums):
            num.move_to(boxes[i])

        # Index labels
        idx_labels = VGroup()
        for i in range(n):
            lbl = Text(str(i), font_size=18, color=GREY)
            lbl.next_to(boxes[i], DOWN, buff=0.3)
            idx_labels.add(lbl)

        self.play(FadeIn(boxes), FadeIn(nums), FadeIn(idx_labels))
        self.wait(0.5)

        # Comparison counter
        comp_label = Text("Comparisons: 0", font_size=24, color=BLUE_C).to_edge(DOWN)
        self.play(FadeIn(comp_label))
        comp_count = 0

        # Bubble sort passes
        for i in range(n - 1):
            pass_label = Text(f"Pass {i+1}", font_size=28, color=YELLOW).next_to(title, DOWN, buff=0.3)
            self.play(FadeIn(pass_label), run_time=0.3)

            for j in range(n - i - 1):
                # Highlight comparing pair
                self.play(
                    boxes[j].animate.set_color(YELLOW),
                    boxes[j+1].animate.set_color(YELLOW),
                    run_time=0.2
                )

                comp_count += 1
                new_comp = Text(f"Comparisons: {comp_count}", font_size=24, color=BLUE_C).to_edge(DOWN)
                self.play(Transform(comp_label, new_comp), run_time=0.1)

                if arr[j] > arr[j+1]:
                    # Swap animation
                    self.play(
                        boxes[j].animate.set_color(RED),
                        boxes[j+1].animate.set_color(RED),
                        run_time=0.15
                    )
                    # Swap the number texts
                    pos_j = nums[j].get_center()
                    pos_j1 = nums[j+1].get_center()
                    self.play(
                        nums[j].animate.move_to(pos_j1),
                        nums[j+1].animate.move_to(pos_j),
                        run_time=0.3
                    )
                    # Swap in data
                    arr[j], arr[j+1] = arr[j+1], arr[j]
                    nums[j], nums[j+1] = nums[j+1], nums[j]

                # Reset color
                self.play(
                    boxes[j].animate.set_color(WHITE),
                    boxes[j+1].animate.set_color(WHITE),
                    run_time=0.1
                )

            # Mark sorted element
            self.play(boxes[n-i-1].animate.set_color(GREEN), run_time=0.2)
            self.play(FadeOut(pass_label), run_time=0.2)

        # Mark first element as sorted
        self.play(boxes[0].animate.set_color(GREEN), run_time=0.2)

        # Final label
        sorted_label = Text("Sorted! O(n²) worst case", font_size=32, color=GREEN).next_to(boxes, DOWN, buff=0.8)
        self.play(Write(sorted_label))
        self.wait(1)


class MergeSortAnimation(Scene):
    def construct(self):
        title = Text("Merge Sort — Divide & Conquer", font_size=42, color=GOLD).to_edge(UP)
        self.play(Write(title))

        arr = [38, 27, 43, 3, 9, 82, 10]

        # Show original array
        boxes = VGroup()
        for val in arr:
            box = VGroup(
                Square(side_length=0.8, color=WHITE, stroke_width=2),
                Text(str(val), font_size=24, color=WHITE)
            )
            box[1].move_to(box[0])
            boxes.add(box)
        boxes.arrange(RIGHT, buff=0.1).shift(UP * 1.5)
        self.play(FadeIn(boxes))

        # Step 1: Show divide
        divide_label = Text("Step 1: Divide", font_size=30, color=YELLOW).next_to(title, DOWN, buff=0.3)
        self.play(Write(divide_label))

        left_half = boxes[:4].copy()
        right_half = boxes[4:].copy()
        self.play(
            left_half.animate.shift(LEFT * 1.5 + DOWN * 1.5).set_color(BLUE),
            right_half.animate.shift(RIGHT * 1.5 + DOWN * 1.5).set_color(RED),
            run_time=0.8
        )
        self.wait(0.5)

        # Step 2: Show further divide
        ll = left_half[:2].copy()
        lr = left_half[2:].copy()
        rl = right_half[:2].copy()
        rr = right_half[2:].copy()
        self.play(
            ll.animate.shift(LEFT * 1 + DOWN * 1.5),
            lr.animate.shift(RIGHT * 0.5 + DOWN * 1.5),
            rl.animate.shift(LEFT * 0.5 + DOWN * 1.5),
            rr.animate.shift(RIGHT * 1 + DOWN * 1.5),
            run_time=0.8
        )

        # Step 3: Conquer
        self.play(FadeOut(divide_label))
        conquer_label = Text("Step 2: Merge back in order", font_size=30, color=GREEN).next_to(title, DOWN, buff=0.3)
        self.play(Write(conquer_label))
        self.wait(0.5)

        # Show final sorted
        sorted_arr = sorted(arr)
        final_boxes = VGroup()
        for val in sorted_arr:
            box = VGroup(
                Square(side_length=0.8, color=GREEN, stroke_width=2),
                Text(str(val), font_size=24, color=WHITE)
            )
            box[1].move_to(box[0])
            final_boxes.add(box)
        final_boxes.arrange(RIGHT, buff=0.1).shift(DOWN * 2)

        self.play(FadeIn(final_boxes), run_time=1)

        complexity = Text("Time: O(n log n) | Space: O(n)", font_size=28, color=GOLD).to_edge(DOWN)
        self.play(Write(complexity))
        self.wait(1)
