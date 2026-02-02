"""
Physics Through Computational Thinking
Section 1.5: Contour Plots and Equipotentials

This script demonstrates contour plot visualization, equipotentials,
and the gradient-contour relationship.

Requirements:
    pip install numpy plotly
"""

import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots


# ============================================================
# Example 1: Basic Contour Plot
# ============================================================

def example_basic_contour():
    """Create a basic contour plot of a paraboloid."""
    print("\n=== Example 1: Basic Contour Plot ===")

    # Create grid
    x = np.linspace(-3, 3, 100)
    y = np.linspace(-3, 3, 100)
    X, Y = np.meshgrid(x, y)

    # Scalar field: paraboloid
    Z = X**2 + Y**2

    fig = go.Figure(data=go.Contour(
        x=x, y=y, z=Z,
        colorscale='Viridis',
        contours=dict(
            showlabels=True,
            labelfont=dict(size=10, color='white')
        ),
        colorbar=dict(title='f(x,y)')
    ))

    fig.update_layout(
        template='plotly_dark',
        title='Contour Plot: f(x,y) = x² + y²',
        xaxis=dict(
            title='x',
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            scaleanchor='y'
        ),
        yaxis=dict(
            title='y',
            gridcolor='#2a2f4a',
            zerolinecolor='#808080'
        )
    )

    fig.show()


# ============================================================
# Example 2: 3D Surface and Contour Comparison
# ============================================================

def example_3d_and_contour():
    """Show 3D surface side-by-side with its contour plot."""
    print("\n=== Example 2: 3D Surface vs Contour ===")

    x = np.linspace(-3, 3, 50)
    y = np.linspace(-3, 3, 50)
    X, Y = np.meshgrid(x, y)

    # Saddle function
    Z = X**2 - Y**2

    fig = make_subplots(
        rows=1, cols=2,
        specs=[[{'type': 'surface'}, {'type': 'xy'}]],
        subplot_titles=['3D Surface', 'Contour Plot']
    )

    # 3D Surface
    fig.add_trace(
        go.Surface(x=x, y=y, z=Z, colorscale='RdBu_r', showscale=False),
        row=1, col=1
    )

    # Contour
    fig.add_trace(
        go.Contour(
            x=x, y=y, z=Z,
            colorscale='RdBu_r',
            contours=dict(showlabels=True),
            showscale=False
        ),
        row=1, col=2
    )

    fig.update_layout(
        template='plotly_dark',
        title='Saddle Function: f(x,y) = x² - y²',
        scene=dict(
            xaxis=dict(title='x'),
            yaxis=dict(title='y'),
            zaxis=dict(title='f(x,y)')
        )
    )

    fig.show()


# ============================================================
# Example 3: Electric Dipole Equipotentials
# ============================================================

def example_dipole_equipotentials():
    """Visualize equipotential lines for an electric dipole."""
    print("\n=== Example 3: Electric Dipole Equipotentials ===")

    x = np.linspace(-4, 4, 200)
    y = np.linspace(-4, 4, 200)
    X, Y = np.meshgrid(x, y)

    # Dipole: positive charge at (1, 0), negative at (-1, 0)
    d = 1.0
    r1 = np.sqrt((X - d)**2 + Y**2)
    r2 = np.sqrt((X + d)**2 + Y**2)

    # Avoid singularities
    r1[r1 < 0.1] = 0.1
    r2[r2 < 0.1] = 0.1

    # Potential
    V = 1/r1 - 1/r2
    V = np.clip(V, -5, 5)

    fig = go.Figure()

    # Equipotentials
    fig.add_trace(go.Contour(
        x=x, y=y, z=V,
        colorscale='RdBu_r',
        contours=dict(
            start=-4, end=4, size=0.5,
            showlabels=True,
            labelfont=dict(size=9, color='white')
        ),
        colorbar=dict(title='V')
    ))

    # Charge markers
    fig.add_trace(go.Scatter(
        x=[d, -d], y=[0, 0],
        mode='markers+text',
        marker=dict(size=20, color=['red', 'blue']),
        text=['+', '−'],
        textposition='top center',
        textfont=dict(size=20, color='white'),
        showlegend=False
    ))

    fig.update_layout(
        template='plotly_dark',
        title='Electric Dipole Equipotentials',
        xaxis=dict(
            range=[-4, 4],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            scaleanchor='y'
        ),
        yaxis=dict(
            range=[-4, 4],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080'
        )
    )

    fig.show()


# ============================================================
# Example 4: Contour with Gradient Vectors
# ============================================================

def example_contour_with_gradient():
    """Show contour plot with overlaid gradient vectors."""
    print("\n=== Example 4: Contours with Gradient Vectors ===")

    # Contour grid (fine)
    x = np.linspace(-3, 3, 100)
    y = np.linspace(-3, 3, 100)
    X, Y = np.meshgrid(x, y)
    Z = X**2 + Y**2

    # Gradient grid (coarse)
    x_grad = np.linspace(-2.5, 2.5, 10)
    y_grad = np.linspace(-2.5, 2.5, 10)
    X_grad, Y_grad = np.meshgrid(x_grad, y_grad)

    # Gradient: ∇f = (2x, 2y)
    U = 2 * X_grad
    V = 2 * Y_grad

    # Normalize for display
    mag = np.sqrt(U**2 + V**2)
    mag[mag == 0] = 1
    scale = 0.25
    U_norm = scale * U / mag
    V_norm = scale * V / mag

    fig = go.Figure()

    # Contours
    fig.add_trace(go.Contour(
        x=x, y=y, z=Z,
        colorscale='Viridis',
        contours=dict(showlabels=True),
        showscale=False
    ))

    # Gradient arrows as annotations
    for i in range(len(x_grad)):
        for j in range(len(y_grad)):
            if mag[j, i] > 0.1:
                fig.add_annotation(
                    x=X_grad[j, i],
                    y=Y_grad[j, i],
                    ax=X_grad[j, i] + U_norm[j, i],
                    ay=Y_grad[j, i] + V_norm[j, i],
                    xref='x', yref='y',
                    axref='x', ayref='y',
                    showarrow=True,
                    arrowhead=2,
                    arrowsize=1.5,
                    arrowcolor='#ff00ff'
                )

    fig.update_layout(
        template='plotly_dark',
        title='Paraboloid Contours with Gradient Vectors',
        xaxis=dict(
            range=[-3, 3],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            scaleanchor='y'
        ),
        yaxis=dict(
            range=[-3, 3],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080'
        )
    )

    fig.show()


# ============================================================
# Example 5: Multiple Scalar Fields
# ============================================================

def example_multiple_fields():
    """Compare different scalar field contour patterns."""
    print("\n=== Example 5: Comparing Scalar Fields ===")

    x = np.linspace(-3, 3, 80)
    y = np.linspace(-3, 3, 80)
    X, Y = np.meshgrid(x, y)

    fields = {
        'Paraboloid: x² + y²': X**2 + Y**2,
        'Saddle: x² - y²': X**2 - Y**2,
        'Gaussian: e^-(x²+y²)': np.exp(-(X**2 + Y**2)),
        'Wave: sin(x) + cos(y)': np.sin(X) + np.cos(Y)
    }

    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=list(fields.keys())
    )

    positions = [(1, 1), (1, 2), (2, 1), (2, 2)]

    for (title, Z), (row, col) in zip(fields.items(), positions):
        fig.add_trace(
            go.Contour(
                x=x, y=y, z=Z,
                colorscale='Viridis',
                showscale=False,
                contours=dict(coloring='lines')
            ),
            row=row, col=col
        )

    fig.update_layout(
        template='plotly_dark',
        title='Comparison of Scalar Field Contours',
        height=700
    )

    # Update all axes
    for i in range(1, 5):
        fig.update_xaxes(
            scaleanchor=f'y{i}' if i > 1 else 'y',
            gridcolor='#2a2f4a',
            row=(i-1)//2 + 1,
            col=(i-1)%2 + 1
        )
        fig.update_yaxes(
            gridcolor='#2a2f4a',
            row=(i-1)//2 + 1,
            col=(i-1)%2 + 1
        )

    fig.show()


# ============================================================
# Example 6: Equipotentials with Field Lines
# ============================================================

def trace_field_line(x0, y0, charges, dt=0.03, steps=300, forward=True):
    """Trace electric field line from starting point."""
    path_x, path_y = [x0], [y0]
    x, y = x0, y0
    sign = 1 if forward else -1

    for _ in range(steps):
        Ex, Ey = 0, 0
        for cx, cy, q in charges:
            dx, dy = x - cx, y - cy
            r2 = dx**2 + dy**2
            if r2 < 0.04:
                return path_x, path_y
            r3 = r2**1.5
            Ex += q * dx / r3
            Ey += q * dy / r3

        mag = np.sqrt(Ex**2 + Ey**2)
        if mag < 0.01 or mag > 100:
            break

        x += sign * dt * Ex / mag
        y += sign * dt * Ey / mag

        if abs(x) > 4 or abs(y) > 4:
            break

        path_x.append(x)
        path_y.append(y)

    return path_x, path_y


def example_equipotentials_with_field():
    """Show equipotentials and field lines together."""
    print("\n=== Example 6: Equipotentials + Field Lines ===")

    x = np.linspace(-4, 4, 150)
    y = np.linspace(-4, 4, 150)
    X, Y = np.meshgrid(x, y)

    # Dipole charges
    charges = [(1, 0, 1), (-1, 0, -1)]

    # Compute potential
    V = np.zeros_like(X)
    for cx, cy, q in charges:
        r = np.sqrt((X - cx)**2 + (Y - cy)**2)
        r[r < 0.1] = 0.1
        V += q / r

    V = np.clip(V, -5, 5)

    fig = go.Figure()

    # Equipotentials
    fig.add_trace(go.Contour(
        x=x, y=y, z=V,
        colorscale='RdBu_r',
        contours=dict(start=-3, end=3, size=0.4, coloring='lines'),
        line=dict(width=1),
        showscale=False,
        name='Equipotentials'
    ))

    # Field lines from positive charge
    angles = np.linspace(0, 2*np.pi, 12, endpoint=False)
    for angle in angles:
        sx = 1 + 0.15 * np.cos(angle)
        sy = 0.15 * np.sin(angle)
        px, py = trace_field_line(sx, sy, charges, forward=True)
        if len(px) > 5:
            fig.add_trace(go.Scatter(
                x=px, y=py,
                mode='lines',
                line=dict(color='#00f3ff', width=1.5),
                showlegend=False,
                hoverinfo='skip'
            ))

    # Charge markers
    fig.add_trace(go.Scatter(
        x=[1, -1], y=[0, 0],
        mode='markers+text',
        marker=dict(size=18, color=['red', 'blue']),
        text=['+', '−'],
        textposition='top center',
        textfont=dict(size=18, color='white'),
        showlegend=False
    ))

    fig.update_layout(
        template='plotly_dark',
        title='Dipole: Equipotentials (contours) + Field Lines (cyan)',
        xaxis=dict(
            range=[-4, 4],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            scaleanchor='y'
        ),
        yaxis=dict(
            range=[-4, 4],
            gridcolor='#2a2f4a',
            zerolinecolor='#808080'
        )
    )

    fig.show()


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Section 1.5: Contour Plots and Equipotentials")
    print("=" * 60)
    print("\nThis script demonstrates:")
    print("1. Basic contour plots")
    print("2. 3D surface vs contour comparison")
    print("3. Electric dipole equipotentials")
    print("4. Contours with gradient vectors")
    print("5. Comparing multiple scalar fields")
    print("6. Equipotentials with field lines")

    example_basic_contour()
    example_3d_and_contour()
    example_dipole_equipotentials()
    example_contour_with_gradient()
    example_multiple_fields()
    example_equipotentials_with_field()

    print("\n" + "=" * 60)
    print("All examples complete!")
    print("=" * 60)
