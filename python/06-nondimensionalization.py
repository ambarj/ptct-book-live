"""
Physics Through Computational Thinking
Section 1.6: Non-Dimensionalization - Making Physics Universal

This script demonstrates non-dimensionalization techniques for
transforming physics problems into universal mathematical form.

Requirements:
    pip install numpy plotly
"""

import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots


# ============================================================
# Example 1: Pendulum Energy (Dimensional vs Dimensionless)
# ============================================================

def example_pendulum_energy():
    """Compare dimensional and dimensionless pendulum potential."""
    print("\n=== Example 1: Pendulum Energy ===")

    # Physical parameters (these will vary)
    m = 2.0   # mass (kg)
    g = 9.8   # gravity (m/s²)
    l = 1.5   # length (m)

    # Natural energy scale
    E_scale = m * g * l
    print(f"Energy scale mgℓ = {E_scale:.2f} J")

    # Angle array
    theta = np.linspace(-np.pi, np.pi, 200)
    theta_deg = theta * 180 / np.pi

    # Dimensional potential (Joules)
    V_dim = m * g * l * (1 - np.cos(theta))

    # Dimensionless potential (universal!)
    V_bar = 1 - np.cos(theta)

    # Create side-by-side comparison
    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=[
            f'Dimensional V(θ) [m={m}kg, g={g}m/s², ℓ={l}m]',
            'Dimensionless V̄(θ) = 1 - cos θ'
        ]
    )

    fig.add_trace(go.Scatter(
        x=theta_deg, y=V_dim,
        mode='lines', line=dict(color='#00f3ff', width=2),
        name='V (Joules)'
    ), row=1, col=1)

    fig.add_trace(go.Scatter(
        x=theta_deg, y=V_bar,
        mode='lines', line=dict(color='#ff00ff', width=2),
        name='V̄ (dimensionless)'
    ), row=1, col=2)

    fig.update_layout(
        template='plotly_dark',
        title='Pendulum Potential Energy: Dimensional vs Dimensionless',
        showlegend=False
    )

    fig.update_xaxes(title_text='θ (degrees)', gridcolor='#2a2f4a')
    fig.update_yaxes(gridcolor='#2a2f4a', zerolinecolor='#808080')

    fig.show()


# ============================================================
# Example 2: Projectile on Hill
# ============================================================

def projectile_on_hill(theta_deg, phi_deg, Gamma, n_points=100):
    """
    Compute dimensionless trajectory and find landing point.

    Parameters:
        theta_deg: Launch angle (degrees)
        phi_deg: Hill slope angle (degrees)
        Gamma: Dimensionless parameter gh/v²
        n_points: Number of trajectory points

    Returns:
        Dictionary with trajectory and landing data
    """
    theta = np.radians(theta_deg)
    phi = np.radians(phi_deg)

    # Trajectory: y = -Γx²/(2cos²θ) + x·tanθ + Γ
    # Hill: y = -x·tanφ + Γ
    # Intersection: solve for x

    A = -Gamma / (2 * np.cos(theta)**2)
    B = np.tan(theta) + np.tan(phi)

    if abs(A) < 1e-10:
        x_land = 0
    else:
        x_land = -B / A

    x_land = max(0, x_land)
    y_land = -np.tan(phi) * x_land + Gamma

    # Generate trajectory
    x_max = max(x_land * 1.2, 2)
    x_traj = np.linspace(0, x_max, n_points)
    y_traj = A * x_traj**2 + np.tan(theta) * x_traj + Gamma

    # Hill line
    x_hill = np.linspace(0, x_max * 1.1, 50)
    y_hill = -np.tan(phi) * x_hill + Gamma

    return {
        'x_traj': x_traj, 'y_traj': y_traj,
        'x_hill': x_hill, 'y_hill': y_hill,
        'x_land': x_land, 'y_land': y_land,
        'x_max': x_max
    }


def example_projectile_on_hill():
    """Demonstrate projectile landing on sloped terrain."""
    print("\n=== Example 2: Projectile on Hill ===")

    # Parameters
    theta, phi, Gamma = 45, 20, 0.3
    print(f"Launch angle θ = {theta}°")
    print(f"Hill slope φ = {phi}°")
    print(f"Γ = gh/v² = {Gamma}")

    result = projectile_on_hill(theta, phi, Gamma)

    fig = go.Figure()

    # Trajectory
    fig.add_trace(go.Scatter(
        x=result['x_traj'], y=result['y_traj'],
        mode='lines', line=dict(color='#00f3ff', width=2),
        name='Trajectory'
    ))

    # Hill
    fig.add_trace(go.Scatter(
        x=result['x_hill'], y=result['y_hill'],
        mode='lines', line=dict(color='#ffff00', width=2),
        name='Hill'
    ))

    # Start point
    fig.add_trace(go.Scatter(
        x=[0], y=[Gamma],
        mode='markers', marker=dict(color='#00ff9f', size=10),
        name='Launch'
    ))

    # Landing point
    fig.add_trace(go.Scatter(
        x=[result['x_land']], y=[result['y_land']],
        mode='markers', marker=dict(color='#ff00ff', size=12),
        name='Landing'
    ))

    fig.update_layout(
        template='plotly_dark',
        title=f'Projectile on Hill: θ={theta}°, φ={phi}°, Γ={Gamma}',
        xaxis=dict(
            title='x̄ (dimensionless)',
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            scaleanchor='y',
            range=[-0.3, result['x_max'] * 1.1]
        ),
        yaxis=dict(
            title='ȳ (dimensionless)',
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            range=[-0.5, Gamma * 1.5]
        )
    )

    fig.show()

    print(f"Landing point: x̄ = {result['x_land']:.3f}, ȳ = {result['y_land']:.3f}")


# ============================================================
# Example 3: Finding Optimal Launch Angle
# ============================================================

def example_optimal_angle():
    """Find optimal launch angle for maximum range."""
    print("\n=== Example 3: Optimal Launch Angle ===")

    phi = 20  # Hill slope
    Gamma = 0.3  # Dimensionless height

    angles = np.linspace(10, 80, 50)
    ranges = []

    for theta in angles:
        result = projectile_on_hill(theta, phi, Gamma)
        ranges.append(result['x_land'])

    ranges = np.array(ranges)
    optimal_idx = np.argmax(ranges)
    optimal_angle = angles[optimal_idx]
    max_range = ranges[optimal_idx]

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=angles, y=ranges,
        mode='lines', line=dict(color='#00f3ff', width=2),
        name='Range'
    ))

    fig.add_trace(go.Scatter(
        x=[optimal_angle], y=[max_range],
        mode='markers', marker=dict(color='#ff00ff', size=12),
        name=f'Optimal: {optimal_angle:.1f}°'
    ))

    fig.update_layout(
        template='plotly_dark',
        title=f'Range vs Launch Angle (φ={phi}°, Γ={Gamma})',
        xaxis=dict(title='Launch angle θ (degrees)', gridcolor='#2a2f4a'),
        yaxis=dict(title='Dimensionless range x̄', gridcolor='#2a2f4a')
    )

    fig.show()

    print(f"Optimal launch angle: {optimal_angle:.1f}°")
    print(f"Maximum range: {max_range:.3f}")


# ============================================================
# Example 4: Damped Harmonic Oscillator
# ============================================================

def example_damped_oscillator():
    """Non-dimensionalize the damped harmonic oscillator."""
    print("\n=== Example 4: Damped Harmonic Oscillator ===")

    # Original equation: m*d²x/dt² = -k*x - b*dx/dt
    # Variables: m, k, b, x, t (5 variables, 3 dimensions MLT)
    # → 2 dimensionless parameters!

    print("Original equation: m·ẍ = -kx - b·ẋ")
    print("\nNatural scales:")
    print("  Time scale: 1/ω₀ = √(m/k)")
    print("  Length scale: x₀ (initial displacement)")
    print("\nDimensionless variables:")
    print("  τ = t·ω₀ = t·√(k/m)")
    print("  X = x/x₀")
    print("  ζ = b/(2√(km))  [damping ratio]")
    print("\nDimensionless equation: d²X/dτ² = -X - 2ζ·dX/dτ")

    # Solve for different damping ratios
    tau = np.linspace(0, 20, 500)

    fig = go.Figure()

    colors = ['#00f3ff', '#ff00ff', '#ffff00', '#00ff9f']
    zetas = [0.1, 0.3, 0.7, 1.0]

    for zeta, color in zip(zetas, colors):
        if zeta < 1:  # Underdamped
            omega_d = np.sqrt(1 - zeta**2)
            X = np.exp(-zeta * tau) * np.cos(omega_d * tau)
            label = f'ζ = {zeta} (underdamped)'
        elif zeta == 1:  # Critically damped
            X = (1 + tau) * np.exp(-tau)
            label = f'ζ = {zeta} (critical)'
        else:  # Overdamped
            r1 = -zeta + np.sqrt(zeta**2 - 1)
            r2 = -zeta - np.sqrt(zeta**2 - 1)
            X = 0.5 * (np.exp(r1 * tau) + np.exp(r2 * tau))
            label = f'ζ = {zeta} (overdamped)'

        fig.add_trace(go.Scatter(
            x=tau, y=X,
            mode='lines', line=dict(color=color, width=2),
            name=label
        ))

    fig.update_layout(
        template='plotly_dark',
        title='Damped Oscillator: Universal Dimensionless Solution',
        xaxis=dict(
            title='τ = t·√(k/m)',
            gridcolor='#2a2f4a',
            zerolinecolor='#808080'
        ),
        yaxis=dict(
            title='X = x/x₀',
            gridcolor='#2a2f4a',
            zerolinecolor='#808080',
            range=[-1.1, 1.1]
        ),
        legend=dict(x=0.7, y=0.95)
    )

    fig.show()


# ============================================================
# Example 5: Scale Identification Practice
# ============================================================

def example_scale_identification():
    """Practice identifying natural scales for various problems."""
    print("\n=== Example 5: Scale Identification ===")

    problems = {
        'Pendulum': {
            'equation': 'θ̈ = -(g/ℓ)·sin θ',
            'variables': ['m', 'g', 'ℓ', 'θ'],
            'scales': {
                'Length': 'ℓ',
                'Time': '√(ℓ/g)',
                'Energy': 'mgℓ'
            }
        },
        'Spring-Mass': {
            'equation': 'mẍ = -kx',
            'variables': ['m', 'k', 'x'],
            'scales': {
                'Time': '√(m/k)',
                'Length': 'x₀',
                'Energy': '½kx₀²'
            }
        },
        'Projectile': {
            'equation': 'ÿ = -g',
            'variables': ['v', 'g', 'θ'],
            'scales': {
                'Length': 'v²/g',
                'Time': 'v/g',
                'Velocity': 'v'
            }
        },
        'Falling with drag': {
            'equation': 'mv̇ = mg - bv',
            'variables': ['m', 'g', 'b'],
            'scales': {
                'Velocity': 'mg/b (terminal)',
                'Time': 'm/b',
                'Length': 'm²g/b²'
            }
        }
    }

    for name, data in problems.items():
        print(f"\n{name}:")
        print(f"  Equation: {data['equation']}")
        print(f"  Variables: {', '.join(data['variables'])}")
        print("  Natural scales:")
        for qty, scale in data['scales'].items():
            print(f"    {qty}: {scale}")


# ============================================================
# Example 6: Buckingham Pi Theorem
# ============================================================

def example_buckingham_pi():
    """Demonstrate the Buckingham Pi theorem."""
    print("\n=== Example 6: Buckingham Pi Theorem ===")

    print("The Buckingham Pi theorem:")
    print("  If a problem has N variables and M fundamental dimensions,")
    print("  then there are (N - M) independent dimensionless groups.")
    print()

    examples = [
        {
            'name': 'Pendulum period',
            'variables': ['T', 'm', 'g', 'ℓ'],
            'N': 4,
            'dimensions': ['M', 'L', 'T'],
            'M': 3,
            'result': 'T/√(ℓ/g) = f(nothing) = constant = 2π'
        },
        {
            'name': 'Projectile range',
            'variables': ['R', 'v', 'g', 'θ'],
            'N': 4,
            'dimensions': ['L', 'T'],
            'M': 2,
            'result': 'Rg/v² = f(θ) → R = (v²/g)·sin(2θ)'
        },
        {
            'name': 'Drag force',
            'variables': ['F', 'ρ', 'v', 'D'],
            'N': 4,
            'dimensions': ['M', 'L', 'T'],
            'M': 3,
            'result': 'F/(ρv²D²) = C_D (drag coefficient)'
        }
    ]

    for ex in examples:
        print(f"{ex['name']}:")
        print(f"  Variables: {', '.join(ex['variables'])} (N = {ex['N']})")
        print(f"  Dimensions: {', '.join(ex['dimensions'])} (M = {ex['M']})")
        print(f"  Dimensionless groups: N - M = {ex['N'] - ex['M']}")
        print(f"  Result: {ex['result']}")
        print()


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Section 1.6: Non-Dimensionalization - Making Physics Universal")
    print("=" * 60)
    print("\nThis script demonstrates:")
    print("1. Pendulum: dimensional vs dimensionless energy")
    print("2. Projectile on a hill with dimensionless parameters")
    print("3. Finding optimal launch angles")
    print("4. Damped harmonic oscillator")
    print("5. Scale identification for various problems")
    print("6. Buckingham Pi theorem")

    example_pendulum_energy()
    example_projectile_on_hill()
    example_optimal_angle()
    example_damped_oscillator()
    example_scale_identification()
    example_buckingham_pi()

    print("\n" + "=" * 60)
    print("All examples complete!")
    print("=" * 60)
