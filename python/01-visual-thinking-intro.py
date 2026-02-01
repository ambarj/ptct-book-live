"""
Physics Through Computational Thinking
Section 1.1: Introduction to Visual Thinking

This script demonstrates basic plotting techniques in Python.
You can run this file to create the plots shown in Section 1.1.

Requirements:
- numpy
- matplotlib
- plotly (optional, for interactive plots)

Install with: pip install numpy matplotlib plotly
"""

import numpy as np
import matplotlib.pyplot as plt

# Set dark theme for matplotlib
plt.style.use('dark_background')

# ============================================================================
# Example 1: Linear Function
# ============================================================================

def plot_linear(m=2, b=-5):
    """Plot a linear function f(x) = mx + b"""
    x = np.linspace(-10, 10, 200)
    y = m * x + b

    plt.figure(figsize=(10, 6))
    plt.plot(x, y, color='cyan', linewidth=2, label=f'f(x) = {m}x + {b}')

    plt.grid(True, alpha=0.3)
    plt.axhline(y=0, color='white', linewidth=0.5, alpha=0.5)
    plt.axvline(x=0, color='white', linewidth=0.5, alpha=0.5)
    plt.xlabel('x', fontsize=12)
    plt.ylabel('f(x)', fontsize=12)
    plt.title('Linear Function', fontsize=14, color='cyan')
    plt.legend()
    plt.tight_layout()
    plt.show()


# ============================================================================
# Example 2: Quadratic Function
# ============================================================================

def plot_quadratic(a=1, b=0, c=0):
    """Plot a quadratic function f(x) = ax² + bx + c"""
    x = np.linspace(-10, 10, 200)
    y = a * x**2 + b * x + c

    # Calculate vertex
    if a != 0:
        x_vertex = -b / (2 * a)
        y_vertex = a * x_vertex**2 + b * x_vertex + c
    else:
        x_vertex, y_vertex = 0, c

    plt.figure(figsize=(10, 6))
    plt.plot(x, y, color='cyan', linewidth=2, label=f'f(x) = {a}x² + {b}x + {c}')
    plt.scatter([x_vertex], [y_vertex], color='magenta', s=100, zorder=5,
                label=f'Vertex: ({x_vertex:.2f}, {y_vertex:.2f})')

    plt.grid(True, alpha=0.3)
    plt.axhline(y=0, color='white', linewidth=0.5, alpha=0.5)
    plt.axvline(x=0, color='white', linewidth=0.5, alpha=0.5)
    plt.xlabel('x', fontsize=12)
    plt.ylabel('f(x)', fontsize=12)
    plt.title('Quadratic Function', fontsize=14, color='cyan')
    plt.legend()
    plt.tight_layout()
    plt.show()


# ============================================================================
# Example 3: Function Growth Comparison
# ============================================================================

def plot_growth_comparison(max_x=5):
    """Compare growth rates of different functions"""
    x = np.linspace(0.1, max_x, 200)

    functions = {
        '√x': np.sqrt(x),
        'x': x,
        'x²': x**2,
        'x³': x**3
    }

    colors = ['cyan', 'magenta', 'yellow', 'lime']

    plt.figure(figsize=(10, 6))
    for (name, y), color in zip(functions.items(), colors):
        plt.plot(x, y, label=name, color=color, linewidth=2)

    plt.grid(True, alpha=0.3)
    plt.xlabel('x', fontsize=12)
    plt.ylabel('f(x)', fontsize=12)
    plt.title('Function Growth Comparison', fontsize=14, color='cyan')
    plt.legend(fontsize=12)
    plt.tight_layout()
    plt.show()


# ============================================================================
# Example 4: Multiple Functions on One Plot
# ============================================================================

def plot_polynomial_family():
    """Plot a family of polynomials to see their behavior"""
    x = np.linspace(-2, 2, 200)

    plt.figure(figsize=(10, 6))

    # Plot x^n for n = 1, 2, 3, 4
    for n in range(1, 5):
        y = x**n
        plt.plot(x, y, linewidth=2, label=f'x^{n}')

    plt.grid(True, alpha=0.3)
    plt.axhline(y=0, color='white', linewidth=0.5, alpha=0.5)
    plt.axvline(x=0, color='white', linewidth=0.5, alpha=0.5)
    plt.xlabel('x', fontsize=12)
    plt.ylabel('f(x)', fontsize=12)
    plt.title('Polynomial Family: x^n', fontsize=14, color='cyan')
    plt.legend()
    plt.ylim(-10, 10)
    plt.tight_layout()
    plt.show()


# ============================================================================
# Interactive Plotting with Plotly (Optional)
# ============================================================================

def plot_interactive_quadratic(a=1, b=0, c=0):
    """
    Create an interactive quadratic plot using Plotly.
    Requires: pip install plotly
    """
    try:
        import plotly.graph_objects as go
    except ImportError:
        print("Plotly not installed. Install with: pip install plotly")
        return

    x = np.linspace(-10, 10, 200)
    y = a * x**2 + b * x + c

    # Vertex
    if a != 0:
        x_vertex = -b / (2 * a)
        y_vertex = a * x_vertex**2 + b * x_vertex + c
    else:
        x_vertex, y_vertex = 0, c

    fig = go.Figure()

    # Main curve
    fig.add_trace(go.Scatter(
        x=x, y=y,
        mode='lines',
        name=f'f(x) = {a}x² + {b}x + {c}',
        line=dict(color='cyan', width=2)
    ))

    # Vertex point
    fig.add_trace(go.Scatter(
        x=[x_vertex], y=[y_vertex],
        mode='markers',
        name=f'Vertex ({x_vertex:.2f}, {y_vertex:.2f})',
        marker=dict(color='magenta', size=10)
    ))

    fig.update_layout(
        template='plotly_dark',
        title='Interactive Quadratic Function',
        xaxis_title='x',
        yaxis_title='f(x)',
        hovermode='closest'
    )

    fig.show()


# ============================================================================
# Main Execution
# ============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("PTCT Section 1.1: Visual Thinking - Python Examples")
    print("=" * 60)
    print()

    print("Example 1: Linear Function")
    print("Plotting f(x) = 2x - 5...")
    plot_linear(m=2, b=-5)

    print("\nExample 2: Quadratic Function")
    print("Plotting f(x) = x² (parabola)...")
    plot_quadratic(a=1, b=0, c=0)

    print("\nExample 3: Function Growth Comparison")
    print("Comparing √x, x, x², and x³...")
    plot_growth_comparison(max_x=5)

    print("\nExample 4: Polynomial Family")
    print("Plotting x^n for n = 1, 2, 3, 4...")
    plot_polynomial_family()

    print("\nExample 5: Interactive Plot (Plotly)")
    print("Creating interactive quadratic plot...")
    plot_interactive_quadratic(a=1, b=0, c=-4)

    print("\n" + "=" * 60)
    print("All plots created successfully!")
    print("Try modifying the parameters and re-running the script.")
    print("=" * 60)
