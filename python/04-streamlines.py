"""
Physics Through Computational Thinking
Section 1.4: Streamlines and Flow Visualization

This script demonstrates streamline visualization, fixed point classification,
and combined flow patterns.

Requirements:
    pip install numpy plotly
"""

import numpy as np
import plotly.graph_objects as go
import plotly.figure_factory as ff


# ============================================================
# Example 1: Basic Streamlines
# ============================================================

def trace_streamline(x0, y0, field_func, dt=0.02, steps=500, forward=True):
    """Trace a streamline using Euler integration."""
    x, y = [x0], [y0]
    sign = 1 if forward else -1

    for _ in range(steps):
        fx, fy = field_func(x[-1], y[-1])
        mag = np.sqrt(fx**2 + fy**2)

        if mag < 0.01:  # Stop at stagnation points
            break

        # Normalize and step
        x.append(x[-1] + sign * dt * fx / mag)
        y.append(y[-1] + sign * dt * fy / mag)

        # Stop if out of bounds
        if abs(x[-1]) > 5 or abs(y[-1]) > 5:
            break

    return x, y


def example_basic_streamlines():
    """Visualize streamlines for a uniform flow."""
    print("\n=== Example 1: Uniform Flow Streamlines ===")

    def uniform_flow(x, y):
        return 1.0, 0.0  # Constant rightward flow

    fig = go.Figure()

    # Trace streamlines from multiple starting points
    y_starts = np.linspace(-2, 2, 9)
    colors = ['#00f3ff', '#00f3ff', '#00f3ff', '#ff00ff', '#ff00ff',
              '#ff00ff', '#ffff00', '#ffff00', '#ffff00']

    for y0, color in zip(y_starts, colors):
        x, y = trace_streamline(-3, y0, uniform_flow, steps=300)
        fig.add_trace(go.Scatter(
            x=x, y=y,
            mode='lines',
            line=dict(color=color, width=2),
            showlegend=False
        ))

        # Add arrow at midpoint
        mid = len(x) // 2
        if mid > 0:
            fig.add_trace(go.Scatter(
                x=[x[mid]], y=[y[mid]],
                mode='markers',
                marker=dict(symbol='triangle-right', size=10, color=color),
                showlegend=False
            ))

    fig.update_layout(
        template='plotly_dark',
        title='Uniform Flow: Parallel Streamlines',
        xaxis=dict(
            range=[-4, 4],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080'
        ),
        yaxis=dict(
            range=[-3, 3],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            scaleanchor='x'
        )
    )

    fig.show()


# ============================================================
# Example 2: Source and Sink Flows
# ============================================================

def example_source_sink():
    """Visualize source and sink flow patterns."""
    print("\n=== Example 2: Source and Sink Flows ===")

    def source(x, y):
        r = np.sqrt(x**2 + y**2)
        if r < 0.1:
            return 0, 0
        return x / r, y / r

    def sink(x, y):
        r = np.sqrt(x**2 + y**2)
        if r < 0.1:
            return 0, 0
        return -x / r, -y / r

    # Create two subplots side by side
    fig = go.Figure()

    # Source streamlines
    angles = np.linspace(0, 2*np.pi, 12, endpoint=False)
    for angle in angles:
        x0 = 0.2 * np.cos(angle)
        y0 = 0.2 * np.sin(angle)
        x, y = trace_streamline(x0, y0, source, steps=200)
        fig.add_trace(go.Scatter(
            x=x, y=y,
            mode='lines',
            line=dict(color='#00f3ff', width=2),
            showlegend=False
        ))

    # Mark source point
    fig.add_trace(go.Scatter(
        x=[0], y=[0],
        mode='markers',
        marker=dict(color='#00ff9f', size=15, symbol='circle'),
        name='Source'
    ))

    fig.update_layout(
        template='plotly_dark',
        title='Source Flow: Radially Outward',
        xaxis=dict(
            range=[-3, 3],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080'
        ),
        yaxis=dict(
            range=[-3, 3],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            scaleanchor='x'
        )
    )

    fig.show()

    # Sink flow
    fig2 = go.Figure()

    for angle in angles:
        x0 = 2.5 * np.cos(angle)
        y0 = 2.5 * np.sin(angle)
        x, y = trace_streamline(x0, y0, sink, steps=200)
        fig2.add_trace(go.Scatter(
            x=x, y=y,
            mode='lines',
            line=dict(color='#ff00ff', width=2),
            showlegend=False
        ))

    # Mark sink point
    fig2.add_trace(go.Scatter(
        x=[0], y=[0],
        mode='markers',
        marker=dict(color='#ff6b6b', size=15, symbol='x'),
        name='Sink'
    ))

    fig2.update_layout(
        template='plotly_dark',
        title='Sink Flow: Radially Inward',
        xaxis=dict(
            range=[-3, 3],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080'
        ),
        yaxis=dict(
            range=[-3, 3],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            scaleanchor='x'
        )
    )

    fig2.show()


# ============================================================
# Example 3: Vortex Flow
# ============================================================

def example_vortex_flow():
    """Visualize vortex (rotational) flow."""
    print("\n=== Example 3: Vortex Flow ===")

    def vortex(x, y):
        r = np.sqrt(x**2 + y**2)
        if r < 0.1:
            return 0, 0
        return -y / r, x / r

    fig = go.Figure()

    # Trace circular streamlines from different radii
    radii = [0.5, 1.0, 1.5, 2.0, 2.5]
    colors = ['#00f3ff', '#00ff9f', '#ffff00', '#ff00ff', '#ff6b6b']

    for radius, color in zip(radii, colors):
        x0, y0 = radius, 0
        x, y = trace_streamline(x0, y0, vortex, dt=0.03, steps=700)
        fig.add_trace(go.Scatter(
            x=x, y=y,
            mode='lines',
            line=dict(color=color, width=2),
            showlegend=False
        ))

    # Mark center
    fig.add_trace(go.Scatter(
        x=[0], y=[0],
        mode='markers',
        marker=dict(color='white', size=12, symbol='circle-open'),
        name='Center'
    ))

    fig.update_layout(
        template='plotly_dark',
        title='Vortex Flow: Circular Streamlines (CCW)',
        xaxis=dict(
            range=[-3, 3],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080'
        ),
        yaxis=dict(
            range=[-3, 3],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            scaleanchor='x'
        )
    )

    fig.show()


# ============================================================
# Example 4: Dipole Flow (Source + Sink)
# ============================================================

def example_dipole():
    """Visualize dipole flow pattern."""
    print("\n=== Example 4: Dipole Flow (Source + Sink) ===")

    def dipole(x, y):
        # Source at (-1, 0), sink at (1, 0)
        x1, y1 = x + 1, y
        x2, y2 = x - 1, y

        r1 = np.sqrt(x1**2 + y1**2)
        r2 = np.sqrt(x2**2 + y2**2)

        if r1 < 0.2 or r2 < 0.2:
            return 0, 0

        # Source contribution
        vx = x1 / r1
        vy = y1 / r1

        # Sink contribution (subtract)
        vx -= x2 / r2
        vy -= y2 / r2

        return vx, vy

    fig = go.Figure()

    # Trace streamlines from around the source
    angles = np.linspace(0, 2*np.pi, 16, endpoint=False)
    for angle in angles:
        x0 = -1 + 0.25 * np.cos(angle)
        y0 = 0.25 * np.sin(angle)
        x, y = trace_streamline(x0, y0, dipole, dt=0.02, steps=500)
        fig.add_trace(go.Scatter(
            x=x, y=y,
            mode='lines',
            line=dict(color='#00f3ff', width=2),
            showlegend=False
        ))

    # Mark source and sink
    fig.add_trace(go.Scatter(
        x=[-1], y=[0],
        mode='markers',
        marker=dict(color='#00ff9f', size=15, symbol='circle'),
        name='Source'
    ))

    fig.add_trace(go.Scatter(
        x=[1], y=[0],
        mode='markers',
        marker=dict(color='#ff6b6b', size=15, symbol='x'),
        name='Sink'
    ))

    fig.update_layout(
        template='plotly_dark',
        title='Dipole Flow: Source + Sink',
        xaxis=dict(
            range=[-3, 3],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080'
        ),
        yaxis=dict(
            range=[-3, 3],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            scaleanchor='x'
        )
    )

    fig.show()


# ============================================================
# Example 5: Fixed Point Classification
# ============================================================

def classify_fixed_point(a, b, c, d):
    """
    Classify fixed point of linear system:
    dx/dt = ax + by
    dy/dt = cx + dy

    Returns: (type, stability, eigenvalues)
    """
    # Trace and determinant
    tau = a + d
    delta = a * d - b * c

    # Eigenvalues
    discriminant = tau**2 - 4*delta

    if discriminant >= 0:
        lambda1 = (tau + np.sqrt(discriminant)) / 2
        lambda2 = (tau - np.sqrt(discriminant)) / 2
        eigenvalues = (lambda1, lambda2)
    else:
        real_part = tau / 2
        imag_part = np.sqrt(-discriminant) / 2
        eigenvalues = (complex(real_part, imag_part), complex(real_part, -imag_part))

    # Classification
    if delta < 0:
        return "Saddle", "Unstable", eigenvalues
    elif delta == 0:
        return "Degenerate", "Marginal", eigenvalues
    elif tau**2 - 4*delta > 0:
        if tau < 0:
            return "Stable Node", "Stable", eigenvalues
        elif tau > 0:
            return "Unstable Node", "Unstable", eigenvalues
        else:
            return "Degenerate", "Marginal", eigenvalues
    else:  # Complex eigenvalues
        if tau < 0:
            return "Stable Spiral", "Stable", eigenvalues
        elif tau > 0:
            return "Unstable Spiral", "Unstable", eigenvalues
        else:
            return "Center", "Neutrally Stable", eigenvalues


def example_fixed_points():
    """Demonstrate fixed point classification."""
    print("\n=== Example 5: Fixed Point Classification ===")

    # Define test systems
    systems = [
        ("Center (Vortex)", 0, 1, -1, 0),
        ("Stable Node (Sink)", -1, 0, 0, -2),
        ("Unstable Node (Source)", 1, 0, 0, 2),
        ("Saddle Point", 1, 0, 0, -1),
        ("Stable Spiral", -0.5, 1, -1, -0.5),
        ("Unstable Spiral", 0.5, 1, -1, 0.5),
    ]

    print("\n" + "-" * 60)
    print(f"{'System':<25} {'Type':<18} {'Stability':<15}")
    print("-" * 60)

    for name, a, b, c, d in systems:
        fp_type, stability, eigenvalues = classify_fixed_point(a, b, c, d)
        print(f"{name:<25} {fp_type:<18} {stability:<15}")

        # Print eigenvalues
        if isinstance(eigenvalues[0], complex):
            print(f"  Eigenvalues: {eigenvalues[0]:.3f}")
        else:
            print(f"  Eigenvalues: {eigenvalues[0]:.3f}, {eigenvalues[1]:.3f}")

    print("-" * 60)

    # Visualize one example: Stable Spiral
    print("\nVisualizing Stable Spiral...")

    def stable_spiral(x, y):
        return -0.5*x + y, -x - 0.5*y

    fig = go.Figure()

    # Trace from multiple starting points
    angles = np.linspace(0, 2*np.pi, 8, endpoint=False)
    radius = 2.5

    for angle in angles:
        x0 = radius * np.cos(angle)
        y0 = radius * np.sin(angle)
        x, y = trace_streamline(x0, y0, stable_spiral, dt=0.02, steps=1000)
        fig.add_trace(go.Scatter(
            x=x, y=y,
            mode='lines',
            line=dict(color='#00f3ff', width=2),
            showlegend=False
        ))

    # Mark fixed point
    fig.add_trace(go.Scatter(
        x=[0], y=[0],
        mode='markers',
        marker=dict(color='#00ff9f', size=15, symbol='circle'),
        name='Stable Spiral'
    ))

    fig.update_layout(
        template='plotly_dark',
        title='Stable Spiral: Trajectories Spiral Inward',
        xaxis=dict(
            range=[-3, 3],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080'
        ),
        yaxis=dict(
            range=[-3, 3],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            scaleanchor='x'
        )
    )

    fig.show()


# ============================================================
# Example 6: Stagnation Points
# ============================================================

def example_stagnation_points():
    """Demonstrate stagnation points in uniform + source flow."""
    print("\n=== Example 6: Stagnation Points ===")

    # Uniform flow + source creates a stagnation point
    def flow_with_stagnation(x, y):
        # Uniform flow (rightward)
        uniform_strength = 1.0
        vx = uniform_strength

        # Source at origin
        r = np.sqrt(x**2 + y**2)
        if r > 0.1:
            source_strength = 1.0
            vx += source_strength * x / r
            vy = source_strength * y / r
        else:
            vy = 0

        return vx, vy

    # Find stagnation point (where v = 0)
    # For this flow: stagnation at x = -source_strength/uniform_strength, y = 0
    stag_x = -1.0

    fig = go.Figure()

    # Trace streamlines
    y_starts = np.linspace(-2.5, 2.5, 11)
    for y0 in y_starts:
        # Start from left
        x, y = trace_streamline(-3, y0, flow_with_stagnation, steps=400)
        fig.add_trace(go.Scatter(
            x=x, y=y,
            mode='lines',
            line=dict(color='#00f3ff', width=2),
            showlegend=False
        ))

    # Mark stagnation point
    fig.add_trace(go.Scatter(
        x=[stag_x], y=[0],
        mode='markers',
        marker=dict(color='#ffff00', size=15, symbol='star'),
        name='Stagnation Point'
    ))

    # Mark source
    fig.add_trace(go.Scatter(
        x=[0], y=[0],
        mode='markers',
        marker=dict(color='#00ff9f', size=12, symbol='circle'),
        name='Source'
    ))

    fig.update_layout(
        template='plotly_dark',
        title='Uniform Flow + Source: Stagnation Point at x = -1',
        xaxis=dict(
            range=[-4, 4],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080'
        ),
        yaxis=dict(
            range=[-3, 3],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            scaleanchor='x'
        ),
        annotations=[
            dict(
                x=stag_x - 0.3, y=0.5,
                text='Velocity = 0',
                showarrow=True,
                arrowhead=2,
                ax=0, ay=-30,
                font=dict(color='#ffff00')
            )
        ]
    )

    fig.show()


# ============================================================
# Example 7: Combined Patterns (Quadrupole)
# ============================================================

def example_quadrupole():
    """Visualize quadrupole flow pattern."""
    print("\n=== Example 7: Quadrupole Flow ===")

    def quadrupole(x, y):
        # Two sources at (1, 0) and (-1, 0)
        # Two sinks at (0, 1) and (0, -1)
        vx, vy = 0, 0

        points = [
            (1, 0, 1),    # source
            (-1, 0, 1),   # source
            (0, 1, -1),   # sink
            (0, -1, -1),  # sink
        ]

        for px, py, strength in points:
            dx, dy = x - px, y - py
            r = np.sqrt(dx**2 + dy**2)
            if r > 0.2:
                vx += strength * dx / r
                vy += strength * dy / r

        return vx, vy

    fig = go.Figure()

    # Trace streamlines from sources
    angles = np.linspace(0, 2*np.pi, 12, endpoint=False)
    for angle in angles:
        # From source at (1, 0)
        x0 = 1 + 0.25 * np.cos(angle)
        y0 = 0.25 * np.sin(angle)
        x, y = trace_streamline(x0, y0, quadrupole, dt=0.02, steps=400)
        fig.add_trace(go.Scatter(
            x=x, y=y,
            mode='lines',
            line=dict(color='#00f3ff', width=2),
            showlegend=False
        ))

        # From source at (-1, 0)
        x0 = -1 + 0.25 * np.cos(angle)
        y0 = 0.25 * np.sin(angle)
        x, y = trace_streamline(x0, y0, quadrupole, dt=0.02, steps=400)
        fig.add_trace(go.Scatter(
            x=x, y=y,
            mode='lines',
            line=dict(color='#00f3ff', width=2),
            showlegend=False
        ))

    # Mark sources and sinks
    fig.add_trace(go.Scatter(
        x=[1, -1], y=[0, 0],
        mode='markers',
        marker=dict(color='#00ff9f', size=12, symbol='circle'),
        name='Sources'
    ))

    fig.add_trace(go.Scatter(
        x=[0, 0], y=[1, -1],
        mode='markers',
        marker=dict(color='#ff6b6b', size=12, symbol='x'),
        name='Sinks'
    ))

    fig.update_layout(
        template='plotly_dark',
        title='Quadrupole: 2 Sources + 2 Sinks',
        xaxis=dict(
            range=[-3, 3],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080'
        ),
        yaxis=dict(
            range=[-3, 3],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            scaleanchor='x'
        )
    )

    fig.show()


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Section 1.4: Streamlines and Flow Visualization")
    print("=" * 60)
    print("\nThis script demonstrates:")
    print("1. Basic streamlines (uniform flow)")
    print("2. Source and sink flows")
    print("3. Vortex flow (rotational)")
    print("4. Dipole flow (source + sink)")
    print("5. Fixed point classification")
    print("6. Stagnation points")
    print("7. Quadrupole flow")

    example_basic_streamlines()
    example_source_sink()
    example_vortex_flow()
    example_dipole()
    example_fixed_points()
    example_stagnation_points()
    example_quadrupole()

    print("\n" + "=" * 60)
    print("All examples complete!")
    print("=" * 60)
