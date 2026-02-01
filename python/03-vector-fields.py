"""
Physics Through Computational Thinking
Section 1.3: Vector Fields and Field Lines

This script demonstrates how to visualize 2D vector fields and trace field lines.

Requirements:
    pip install numpy plotly
"""

import numpy as np
import plotly.graph_objects as go
import plotly.figure_factory as ff


# ============================================================
# Example 1: Basic Vector Field (Quiver Plot)
# ============================================================

def example_source_field():
    """Visualize a source (radially outward) vector field."""
    print("\n=== Example 1: Source Field ===")

    # Create grid
    x = np.linspace(-3, 3, 15)
    y = np.linspace(-3, 3, 15)
    X, Y = np.meshgrid(x, y)

    # Source field: F = (x, y) / r
    R = np.sqrt(X**2 + Y**2)
    R[R == 0] = 0.01  # Avoid division by zero

    U = X / R
    V = Y / R

    # Create quiver plot
    fig = ff.create_quiver(
        X, Y, U, V,
        scale=0.2,
        arrow_scale=0.3,
        line=dict(color='#00f3ff', width=1.5)
    )

    fig.update_layout(
        template='plotly_dark',
        title='Source Field: F(x,y) = (x, y) / r',
        xaxis=dict(
            range=[-4, 4],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            linecolor='#808080'
        ),
        yaxis=dict(
            range=[-4, 4],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            linecolor='#808080',
            scaleanchor='x'
        )
    )

    fig.show()


# ============================================================
# Example 2: Vortex Field
# ============================================================

def example_vortex_field():
    """Visualize a vortex (rotational) vector field."""
    print("\n=== Example 2: Vortex Field ===")

    x = np.linspace(-3, 3, 15)
    y = np.linspace(-3, 3, 15)
    X, Y = np.meshgrid(x, y)

    R = np.sqrt(X**2 + Y**2)
    R[R == 0] = 0.01

    # Vortex field: F = (-y, x) / r
    U = -Y / R
    V = X / R

    fig = ff.create_quiver(
        X, Y, U, V,
        scale=0.2,
        arrow_scale=0.3,
        line=dict(color='#ff00ff', width=1.5)
    )

    fig.update_layout(
        template='plotly_dark',
        title='Vortex Field: F(x,y) = (-y, x) / r',
        xaxis=dict(
            range=[-4, 4],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080'
        ),
        yaxis=dict(
            range=[-4, 4],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            scaleanchor='x'
        )
    )

    fig.show()


# ============================================================
# Example 3: Field Line Tracing
# ============================================================

def trace_field_line(x0, y0, field_func, dt=0.05, steps=200, forward=True):
    """Trace a field line using Euler integration."""
    x, y = [x0], [y0]
    sign = 1 if forward else -1

    for _ in range(steps):
        fx, fy = field_func(x[-1], y[-1])
        mag = np.sqrt(fx**2 + fy**2)

        if mag < 0.01:  # Stop at fixed points
            break

        # Normalize and step
        x.append(x[-1] + sign * dt * fx / mag)
        y.append(y[-1] + sign * dt * fy / mag)

        # Stop if out of bounds
        if abs(x[-1]) > 5 or abs(y[-1]) > 5:
            break

    return x, y


def example_field_lines():
    """Trace field lines in a vortex field."""
    print("\n=== Example 3: Field Lines (Vortex) ===")

    def vortex(x, y):
        r = np.sqrt(x**2 + y**2)
        if r < 0.01:
            return 0, 0
        return -y / r, x / r

    fig = go.Figure()

    # Trace from multiple starting points
    starting_points = [
        (1, 0), (2, 0), (0, 1), (0, 2),
        (-1, 0), (-2, 0), (0, -1), (0, -2)
    ]

    colors = ['#00f3ff', '#ff00ff', '#ffff00', '#00ff9f',
              '#00f3ff', '#ff00ff', '#ffff00', '#00ff9f']

    for (x0, y0), color in zip(starting_points, colors):
        x, y = trace_field_line(x0, y0, vortex, steps=500)
        fig.add_trace(go.Scatter(
            x=x, y=y,
            mode='lines',
            line=dict(color=color, width=2),
            showlegend=False
        ))

        # Starting point marker
        fig.add_trace(go.Scatter(
            x=[x0], y=[y0],
            mode='markers',
            marker=dict(color=color, size=10),
            showlegend=False
        ))

    fig.update_layout(
        template='plotly_dark',
        title='Vortex Field Lines (Circular Orbits)',
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
# Example 4: Saddle Point
# ============================================================

def example_saddle():
    """Visualize a saddle point field and its field lines."""
    print("\n=== Example 4: Saddle Point ===")

    def saddle(x, y):
        return x, -y

    fig = go.Figure()

    # Trace field lines
    starting_points = [
        (2, 0.1), (2, -0.1), (-2, 0.1), (-2, -0.1),
        (0.1, 2), (-0.1, 2), (0.1, -2), (-0.1, -2)
    ]

    colors = ['#00f3ff', '#00f3ff', '#ff00ff', '#ff00ff',
              '#ffff00', '#ffff00', '#00ff9f', '#00ff9f']

    for (x0, y0), color in zip(starting_points, colors):
        # Trace both directions
        x_fwd, y_fwd = trace_field_line(x0, y0, saddle, steps=100, forward=True)
        x_bwd, y_bwd = trace_field_line(x0, y0, saddle, steps=100, forward=False)

        # Combine
        x = x_bwd[::-1] + x_fwd[1:]
        y = y_bwd[::-1] + y_fwd[1:]

        fig.add_trace(go.Scatter(
            x=x, y=y,
            mode='lines',
            line=dict(color=color, width=2),
            showlegend=False
        ))

    # Mark the saddle point
    fig.add_trace(go.Scatter(
        x=[0], y=[0],
        mode='markers',
        marker=dict(color='white', size=12, symbol='x'),
        name='Saddle Point'
    ))

    fig.update_layout(
        template='plotly_dark',
        title='Saddle Point: F(x,y) = (x, -y)',
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
# Example 5: Combined Fields (Spiral)
# ============================================================

def example_spiral():
    """Combine sink and vortex to create spiral field."""
    print("\n=== Example 5: Spiral Field (Sink + Vortex) ===")

    x = np.linspace(-3, 3, 15)
    y = np.linspace(-3, 3, 15)
    X, Y = np.meshgrid(x, y)

    R = np.sqrt(X**2 + Y**2)
    R[R == 0] = 0.01

    # Combined: Sink + Vortex
    sink_strength = 1.0
    vortex_strength = 1.0

    U = -sink_strength * X / R - vortex_strength * Y / R
    V = -sink_strength * Y / R + vortex_strength * X / R

    fig = ff.create_quiver(
        X, Y, U, V,
        scale=0.2,
        arrow_scale=0.3,
        line=dict(color='#ff00ff', width=1.5)
    )

    fig.update_layout(
        template='plotly_dark',
        title='Spiral Field: Sink + Vortex',
        xaxis=dict(
            range=[-4, 4],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080'
        ),
        yaxis=dict(
            range=[-4, 4],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            scaleanchor='x'
        )
    )

    fig.show()

    # Also trace spiral field lines
    print("Tracing spiral field lines...")

    def spiral(x, y):
        r = np.sqrt(x**2 + y**2)
        if r < 0.01:
            return 0, 0
        return (-x - y) / r, (-y + x) / r

    fig2 = go.Figure()

    angles = np.linspace(0, 2*np.pi, 8, endpoint=False)
    radius = 2.5
    colors = ['#00f3ff', '#ff00ff', '#ffff00', '#00ff9f',
              '#00f3ff', '#ff00ff', '#ffff00', '#00ff9f']

    for angle, color in zip(angles, colors):
        x0, y0 = radius * np.cos(angle), radius * np.sin(angle)
        x, y = trace_field_line(x0, y0, spiral, dt=0.02, steps=1000)

        fig2.add_trace(go.Scatter(
            x=x, y=y,
            mode='lines',
            line=dict(color=color, width=2),
            showlegend=False
        ))

    fig2.update_layout(
        template='plotly_dark',
        title='Spiral Field Lines (Inward Spiral)',
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
# Main
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Section 1.3: Vector Fields and Field Lines")
    print("=" * 60)
    print("\nThis script demonstrates:")
    print("1. Source field (radially outward)")
    print("2. Vortex field (rotational)")
    print("3. Field line tracing")
    print("4. Saddle point")
    print("5. Combined fields (spiral)")

    example_source_field()
    example_vortex_field()
    example_field_lines()
    example_saddle()
    example_spiral()

    print("\n" + "=" * 60)
    print("All examples complete!")
    print("=" * 60)
