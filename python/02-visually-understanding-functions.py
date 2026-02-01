"""
Physics Through Computational Thinking
Section 1.2: Visually Understanding Functions

This script demonstrates how to identify and visualize the four key properties
of functions: zeros, divergences, extrema, and asymptotes.

Requirements:
    pip install numpy plotly scipy
"""

import numpy as np
import plotly.graph_objects as go
from scipy.optimize import minimize_scalar, brentq


# ============================================================
# Example 1: Finding Zeros
# ============================================================

def example_zeros():
    """Find and plot zeros of a polynomial."""
    print("\n=== Example 1: Finding Zeros ===")

    # Polynomial: x² - 3x + 2 = (x-1)(x-2)
    coefficients = [1, -3, 2]  # [a, b, c] for ax² + bx + c
    zeros = np.roots(coefficients)
    print(f"Zeros of x² - 3x + 2: {zeros}")

    # Plot
    x = np.linspace(-1, 4, 200)
    y = x**2 - 3*x + 2

    fig = go.Figure()

    # Plot the curve
    fig.add_trace(go.Scatter(
        x=x, y=y, mode='lines',
        name='f(x) = x² - 3x + 2',
        line=dict(color='#00f3ff', width=2)
    ))

    # Mark the zeros
    fig.add_trace(go.Scatter(
        x=zeros, y=[0, 0], mode='markers',
        name='Zeros',
        marker=dict(color='#ff00ff', size=12, symbol='circle')
    ))

    fig.update_layout(
        template='plotly_dark',
        title='Finding Zeros of a Polynomial',
        xaxis=dict(
            title='x',
            zeroline=True, zerolinecolor='#808080', zerolinewidth=2,
            gridcolor='#2a2f4a'
        ),
        yaxis=dict(
            title='f(x)',
            zeroline=True, zerolinecolor='#808080', zerolinewidth=2,
            gridcolor='#2a2f4a'
        )
    )

    fig.show()


# ============================================================
# Example 2: Visualizing Divergences
# ============================================================

def example_divergences():
    """Visualize divergences (poles) of a rational function."""
    print("\n=== Example 2: Visualizing Divergences ===")

    # Function: f(x) = 1/[(x-1)(x-2)]
    poles = [1, 2]
    print(f"Poles (divergences) at: x = {poles}")

    # Create x values, avoiding poles
    x = np.linspace(-1, 4, 500)

    def f(xi):
        denom = (xi - 1) * (xi - 2)
        if abs(denom) < 0.01:
            return np.nan
        return 1 / denom

    y = np.array([f(xi) for xi in x])
    # Clip extreme values
    y = np.where(np.abs(y) > 15, np.nan, y)

    fig = go.Figure()

    # Plot the function
    fig.add_trace(go.Scatter(
        x=x, y=y, mode='lines',
        name='f(x) = 1/[(x-1)(x-2)]',
        line=dict(color='#00f3ff', width=2),
        connectgaps=False
    ))

    # Add vertical asymptotes
    for pole in poles:
        fig.add_vline(
            x=pole,
            line=dict(color='#ff00ff', width=2, dash='dash'),
            annotation_text=f'x = {pole}'
        )

    fig.update_layout(
        template='plotly_dark',
        title='Visualizing Divergences (Poles)',
        xaxis=dict(
            title='x',
            zeroline=True, zerolinecolor='#808080', zerolinewidth=2,
            gridcolor='#2a2f4a'
        ),
        yaxis=dict(
            title='f(x)',
            range=[-15, 15],
            zeroline=True, zerolinecolor='#808080', zerolinewidth=2,
            gridcolor='#2a2f4a'
        )
    )

    fig.show()


# ============================================================
# Example 3: Finding Extrema
# ============================================================

def example_extrema():
    """Find and plot extrema of a function."""
    print("\n=== Example 3: Finding Extrema ===")

    # Function: f(x) = x² - 6x + 5
    def f(x):
        return x**2 - 6*x + 5

    # Find minimum using optimization
    result = minimize_scalar(f, bounds=(-10, 10), method='bounded')
    x_min = result.x
    y_min = result.fun

    print(f"Minimum at x = {x_min:.4f}, f(x) = {y_min:.4f}")

    # Verify with formula: x = -b/(2a) = 6/2 = 3
    x_formula = 6 / 2
    y_formula = f(x_formula)
    print(f"Formula verification: x = {x_formula}, f(x) = {y_formula}")

    # Plot
    x = np.linspace(-2, 8, 200)
    y = f(x)

    # Derivative: f'(x) = 2x - 6
    y_prime = 2*x - 6

    fig = go.Figure()

    # Plot the function
    fig.add_trace(go.Scatter(
        x=x, y=y, mode='lines',
        name='f(x) = x² - 6x + 5',
        line=dict(color='#00f3ff', width=2)
    ))

    # Plot the derivative
    fig.add_trace(go.Scatter(
        x=x, y=y_prime, mode='lines',
        name="f'(x) = 2x - 6",
        line=dict(color='#ffff00', width=2, dash='dash')
    ))

    # Mark the minimum
    fig.add_trace(go.Scatter(
        x=[x_min], y=[y_min], mode='markers',
        name=f'Minimum ({x_min:.1f}, {y_min:.1f})',
        marker=dict(color='#00ff9f', size=14, symbol='triangle-down')
    ))

    # Mark where derivative = 0
    fig.add_trace(go.Scatter(
        x=[x_min], y=[0], mode='markers',
        name="f'(x) = 0",
        marker=dict(color='#ffff00', size=10, symbol='x')
    ))

    fig.update_layout(
        template='plotly_dark',
        title='Finding Extrema: Where the Derivative Equals Zero',
        xaxis=dict(
            title='x',
            zeroline=True, zerolinecolor='#808080', zerolinewidth=2,
            gridcolor='#2a2f4a'
        ),
        yaxis=dict(
            title='y',
            zeroline=True, zerolinecolor='#808080', zerolinewidth=2,
            gridcolor='#2a2f4a'
        )
    )

    fig.show()


# ============================================================
# Example 4: Asymptotes
# ============================================================

def example_asymptotes():
    """Visualize horizontal and vertical asymptotes."""
    print("\n=== Example 4: Asymptotes ===")

    # Function: f(x) = (2x + 1)/(x - 1)
    # Vertical asymptote at x = 1
    # Horizontal asymptote at y = 2 (ratio of leading coefficients)

    print("Function: f(x) = (2x + 1)/(x - 1)")
    print("Vertical asymptote: x = 1")
    print("Horizontal asymptote: y = 2")

    x = np.linspace(-10, 15, 500)

    def f(xi):
        if abs(xi - 1) < 0.05:
            return np.nan
        return (2*xi + 1) / (xi - 1)

    y = np.array([f(xi) for xi in x])
    y = np.where(np.abs(y) > 20, np.nan, y)

    fig = go.Figure()

    # Plot the function
    fig.add_trace(go.Scatter(
        x=x, y=y, mode='lines',
        name='f(x) = (2x + 1)/(x - 1)',
        line=dict(color='#00f3ff', width=2),
        connectgaps=False
    ))

    # Vertical asymptote
    fig.add_vline(
        x=1,
        line=dict(color='#ff00ff', width=2, dash='dash'),
        annotation_text='x = 1'
    )

    # Horizontal asymptote
    fig.add_hline(
        y=2,
        line=dict(color='#ffff00', width=2, dash='dash'),
        annotation_text='y = 2'
    )

    fig.update_layout(
        template='plotly_dark',
        title='Horizontal and Vertical Asymptotes',
        xaxis=dict(
            title='x',
            range=[-10, 15],
            zeroline=True, zerolinecolor='#808080', zerolinewidth=2,
            gridcolor='#2a2f4a'
        ),
        yaxis=dict(
            title='f(x)',
            range=[-15, 20],
            zeroline=True, zerolinecolor='#808080', zerolinewidth=2,
            gridcolor='#2a2f4a'
        )
    )

    fig.show()


# ============================================================
# Example 5: Complete Function Analysis
# ============================================================

def example_complete_analysis():
    """Analyze a function for all four properties."""
    print("\n=== Example 5: Complete Function Analysis ===")

    # Function: f(x) = (x² - 4)/(x - 3)
    print("Analyzing: f(x) = (x² - 4)/(x - 3)")

    # 1. Find zeros: numerator = 0
    zeros = np.roots([1, 0, -4])  # x² - 4 = 0
    print(f"\n1. ZEROS (numerator = 0): x = {zeros}")

    # 2. Find divergences: denominator = 0
    divergences = [3]
    print(f"2. DIVERGENCES (denominator = 0): x = {divergences}")

    # 3. Find extrema: f'(x) = 0
    # f(x) = (x² - 4)/(x - 3)
    # Using quotient rule: f'(x) = [(2x)(x-3) - (x²-4)(1)] / (x-3)²
    #                            = [2x² - 6x - x² + 4] / (x-3)²
    #                            = [x² - 6x + 4] / (x-3)²
    # f'(x) = 0 when x² - 6x + 4 = 0
    extrema_x = np.roots([1, -6, 4])
    print(f"3. EXTREMA (f'(x) = 0): x = {extrema_x}")

    # 4. Asymptotes
    # Vertical: x = 3
    # Since degree(num) > degree(denom), do polynomial division:
    # x² - 4 = (x - 3)(x + 3) + 5
    # So f(x) = x + 3 + 5/(x-3)
    # Oblique asymptote: y = x + 3
    print("4. ASYMPTOTES: Oblique y = x + 3, Vertical x = 3")

    # Plot
    x = np.linspace(-6, 10, 500)

    def f(xi):
        if abs(xi - 3) < 0.05:
            return np.nan
        return (xi**2 - 4) / (xi - 3)

    y = np.array([f(xi) for xi in x])
    y = np.where(np.abs(y) > 30, np.nan, y)

    fig = go.Figure()

    # Plot the function
    fig.add_trace(go.Scatter(
        x=x, y=y, mode='lines',
        name='f(x) = (x² - 4)/(x - 3)',
        line=dict(color='#00f3ff', width=2),
        connectgaps=False
    ))

    # Mark zeros
    fig.add_trace(go.Scatter(
        x=zeros, y=[0, 0], mode='markers',
        name='Zeros',
        marker=dict(color='#00f3ff', size=12, symbol='circle',
                   line=dict(color='white', width=2))
    ))

    # Mark extrema
    extrema_y = [f(ex) for ex in extrema_x]
    fig.add_trace(go.Scatter(
        x=extrema_x, y=extrema_y, mode='markers',
        name='Extrema',
        marker=dict(color='#00ff9f', size=12, symbol='diamond')
    ))

    # Vertical asymptote
    fig.add_vline(x=3, line=dict(color='#ff00ff', width=2, dash='dash'))

    # Oblique asymptote: y = x + 3
    x_asymp = np.array([-6, 10])
    y_asymp = x_asymp + 3
    fig.add_trace(go.Scatter(
        x=x_asymp, y=y_asymp, mode='lines',
        name='Oblique asymptote: y = x + 3',
        line=dict(color='#ffff00', width=2, dash='dash')
    ))

    fig.update_layout(
        template='plotly_dark',
        title='Complete Function Analysis: f(x) = (x² - 4)/(x - 3)',
        xaxis=dict(
            title='x',
            range=[-6, 10],
            zeroline=True, zerolinecolor='#808080', zerolinewidth=2,
            gridcolor='#2a2f4a'
        ),
        yaxis=dict(
            title='f(x)',
            range=[-20, 25],
            zeroline=True, zerolinecolor='#808080', zerolinewidth=2,
            gridcolor='#2a2f4a'
        )
    )

    fig.show()


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Section 1.2: Visually Understanding Functions")
    print("=" * 60)
    print("\nThis script demonstrates the four key properties of functions:")
    print("1. Zeros - where f(x) = 0")
    print("2. Divergences - where f(x) → ±∞")
    print("3. Extrema - where f'(x) = 0")
    print("4. Asymptotes - behavior as x → ±∞")

    # Run all examples
    example_zeros()
    example_divergences()
    example_extrema()
    example_asymptotes()
    example_complete_analysis()

    print("\n" + "=" * 60)
    print("All examples complete!")
    print("=" * 60)
