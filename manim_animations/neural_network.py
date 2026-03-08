import sys
sys.path.insert(0, "D:/AIforBharat/manim_lib")

from manim import *
import random


class NeuralNetworkAnimation(Scene):
    def construct(self):
        title = Text("Neural Network — Forward Pass", font_size=42, color=GOLD).to_edge(UP)
        self.play(Write(title))

        # Network architecture: 3-4-4-2
        layers = [3, 4, 4, 2]
        layer_names = ["Input", "Hidden 1", "Hidden 2", "Output"]
        layer_colors = [BLUE, PURPLE, PURPLE, GREEN]

        all_neurons = []
        all_circles = []

        x_positions = [-4.5, -1.5, 1.5, 4.5]

        for l, (count, x_pos) in enumerate(zip(layers, x_positions)):
            layer_neurons = []
            layer_circles = []
            y_start = (count - 1) * 0.8 / 2

            for i in range(count):
                y = y_start - i * 0.8
                circle = Circle(radius=0.3, color=layer_colors[l], stroke_width=2)
                circle.move_to(RIGHT * x_pos + UP * y)
                layer_neurons.append(circle)
                layer_circles.append(circle)

            all_neurons.append(layer_neurons)
            all_circles.append(layer_circles)

        # Draw neurons
        for layer in all_neurons:
            for neuron in layer:
                self.play(FadeIn(neuron), run_time=0.05)

        # Layer labels
        for l, (name, x_pos) in enumerate(zip(layer_names, x_positions)):
            label = Text(name, font_size=18, color=GREY).move_to(RIGHT * x_pos + DOWN * 2.5)
            self.play(FadeIn(label), run_time=0.1)

        # Draw connections
        all_weights = []
        for l in range(len(layers) - 1):
            layer_weights = []
            for n1 in all_neurons[l]:
                for n2 in all_neurons[l + 1]:
                    weight = Line(
                        n1.get_right(), n2.get_left(),
                        color=WHITE, stroke_width=0.5, stroke_opacity=0.3
                    )
                    layer_weights.append(weight)
                    self.add(weight)
            all_weights.append(layer_weights)

        self.wait(0.5)

        # Forward pass animation
        fwd_label = Text("Forward Pass →", font_size=28, color=YELLOW).shift(DOWN * 3)
        self.play(Write(fwd_label))

        # Input values
        input_vals = [0.8, 0.3, 0.6]
        for i, (neuron, val) in enumerate(zip(all_neurons[0], input_vals)):
            val_text = Text(f"{val}", font_size=16, color=YELLOW).next_to(neuron, LEFT, buff=0.2)
            self.play(
                neuron.animate.set_fill(BLUE, opacity=val),
                FadeIn(val_text),
                run_time=0.2
            )

        # Animate signal flowing through each layer
        for l in range(len(layers) - 1):
            # Light up connections
            for weight in all_weights[l]:
                self.play(
                    weight.animate.set_stroke(YELLOW, width=1.5, opacity=0.8),
                    run_time=0.02
                )

            # Activate next layer neurons
            for neuron in all_neurons[l + 1]:
                activation = random.uniform(0.2, 0.9)
                self.play(
                    neuron.animate.set_fill(layer_colors[l + 1], opacity=activation),
                    run_time=0.1
                )

            # Fade connections back
            for weight in all_weights[l]:
                self.play(
                    weight.animate.set_stroke(WHITE, width=0.5, opacity=0.3),
                    run_time=0.01
                )

        # Show output
        output_labels = ["Cat: 0.85", "Dog: 0.15"]
        for i, (neuron, label) in enumerate(zip(all_neurons[-1], output_labels)):
            out_text = Text(label, font_size=18, color=GREEN).next_to(neuron, RIGHT, buff=0.3)
            self.play(FadeIn(out_text), run_time=0.3)

        # Backprop hint
        self.play(FadeOut(fwd_label))
        backprop = Text("Backpropagation adjusts weights to minimize error", font_size=24, color=TEAL).shift(DOWN * 3)
        self.play(Write(backprop))
        self.wait(1)
