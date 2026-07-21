/**
 * Section 1.6: Non-Dimensionalization - Making Physics Universal
 *
 * Interactive explorers:
 * 1. Pendulum Energy (dimensional vs dimensionless comparison)
 * 2. Projectile on Hill (3 dimensionless parameters)
 * 3. Scale Identifier (practice finding natural scales)
 */

(function() {
    'use strict';

    // ========================================
    // Initialization
    // ========================================

    function initializePlots() {
        // Check dependencies
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }

        // Check DOM elements exist
        const pendulumDim = document.getElementById('nondim-pendulum-dimensional');
        const pendulumNondim = document.getElementById('nondim-pendulum-dimensionless');
        const projectilePlot = document.getElementById('nondim-projectile-plot');
        const scalesPlot = document.getElementById('nondim-scales-plot');

        if (!pendulumDim || !pendulumNondim || !projectilePlot || !scalesPlot) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Initialize all explorers
        initPendulumExplorer();
        initProjectileExplorer();
        initScalesExplorer();
        attachEventHandlers();
    }

    // ========================================
    // Explorer 1: Pendulum Energy
    // ========================================

    function initPendulumExplorer() {
        updatePendulumPlots();
    }

    function updatePendulumPlots() {
        const m = parseFloat(document.getElementById('nondim-mass-slider').value);
        const l = parseFloat(document.getElementById('nondim-length-slider').value);
        const g = parseFloat(document.getElementById('nondim-gravity-slider').value);

        // Update displayed values
        document.getElementById('nondim-mass-value').textContent = m.toFixed(1);
        document.getElementById('nondim-length-value').textContent = l.toFixed(1);
        document.getElementById('nondim-gravity-value').textContent = g.toFixed(1);

        // Energy scale (displayed as the dimensional plot's title)
        const E_scale = m * g * l;

        // Generate data
        const theta = [];
        const V_dim = [];
        const V_nondim = [];
        const n = 200;

        for (let i = 0; i < n; i++) {
            const t = -Math.PI + (2 * Math.PI * i / (n - 1));
            theta.push(t * 180 / Math.PI); // Convert to degrees for display
            V_dim.push(m * g * l * (1 - Math.cos(t)));
            V_nondim.push(1 - Math.cos(t));
        }

        // Dimensional plot
        const traceDim = {
            x: theta,
            y: V_dim,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#00f3ff', width: 2.5 },
            name: 'V(θ)'
        };

        const layoutDim = {
            template: 'plotly_dark',
            paper_bgcolor: '#0a0e27',
            plot_bgcolor: '#151934',
            margin: { l: 60, r: 30, t: 30, b: 50 },
            title: {
                text: 'energy scale mgℓ = ' + E_scale.toFixed(1) + ' J',
                font: { size: 12, color: '#a0a8d0' }
            },
            xaxis: {
                title: 'θ (degrees)',
                range: [-180, 180],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080'
            },
            yaxis: {
                title: 'V (Joules)',
                // FIXED range: if this axis rescaled with mgℓ the dimensional
                // curve would always fill the same fraction of the plot and
                // look identical to the dimensionless one — hiding the whole
                // point. With fixed axes, changing m, ℓ, or g visibly grows or
                // shrinks V(θ) while the dimensionless panel never moves.
                range: [0, 100],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080'
            },
            showlegend: false
        };

        Plotly.react('nondim-pendulum-dimensional', [traceDim], layoutDim, { responsive: true });

        // Dimensionless plot
        const traceNondim = {
            x: theta,
            y: V_nondim,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#ff00ff', width: 2.5 },
            name: 'V̄(θ)'
        };

        const layoutNondim = {
            template: 'plotly_dark',
            paper_bgcolor: '#0a0e27',
            plot_bgcolor: '#151934',
            margin: { l: 60, r: 30, t: 30, b: 50 },
            xaxis: {
                title: 'θ (degrees)',
                range: [-180, 180],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080'
            },
            yaxis: {
                title: 'V̄ = V/(mgℓ)',
                range: [0, 2.2],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080'
            },
            showlegend: false
        };

        Plotly.react('nondim-pendulum-dimensionless', [traceNondim], layoutNondim, { responsive: true });
    }

    // ========================================
    // Explorer 2: Projectile on Hill
    // ========================================

    function initProjectileExplorer() {
        updateProjectilePlot();
    }

    function updateProjectilePlot() {
        const thetaDeg = parseFloat(document.getElementById('nondim-theta-slider').value);
        const phiDeg = parseFloat(document.getElementById('nondim-phi-slider').value);
        const Gamma = parseFloat(document.getElementById('nondim-gamma-slider').value);

        // Update displayed values
        document.getElementById('nondim-theta-value').textContent = thetaDeg;
        document.getElementById('nondim-phi-value').textContent = phiDeg;
        document.getElementById('nondim-gamma-value').textContent = Gamma.toFixed(2);

        // Convert to radians
        const theta = thetaDeg * Math.PI / 180;
        const phi = phiDeg * Math.PI / 180;

        // Non-dimensionalized with the HILL HEIGHT h as the length scale
        // (x̄ = x/h, ȳ = y/h), so the terrain is anchored: launch always at
        // (0, 1), hill base always at (cot φ, 0), flat ground ȳ = 0 beyond.
        // Γ = gh/v² enters only through the trajectory's curvature:
        //   Trajectory: ȳ = 1 + x̄·tanθ − Γ x̄²/(2cos²θ)
        //   Hill face:  ȳ = 1 − x̄·tanφ   (0 ≤ x̄ ≤ cot φ), then ground ȳ = 0
        const tanT = Math.tan(theta);
        const tanP = Math.tan(phi);
        const cos2 = Math.cos(theta) * Math.cos(theta);
        const xBase = tanP > 1e-10 ? 1 / tanP : Infinity;

        // Landing: try the hill face first, else the flat ground
        let xLand = 2 * cos2 * (tanT + tanP) / Gamma;
        let yLand, regime;
        if (xLand <= xBase) {
            yLand = 1 - xLand * tanP;
            regime = 'hill face';
        } else {
            xLand = (cos2 / Gamma) * (tanT + Math.sqrt(tanT * tanT + 2 * Gamma / cos2));
            yLand = 0;
            regime = 'flat ground';
        }

        // Fixed axes: with the terrain anchored and Γ ≥ 0.2 every
        // trajectory (apex ≤ 1 + 1/(2Γ) ≤ 3.5, landing ≤ ~6) stays in frame
        const xAxisMax = 6.5;
        const yAxisMax = 3.6;

        // Trajectory drawn from launch to the landing point
        const xTraj = [];
        const yTraj = [];
        const nPoints = 120;
        for (let i = 0; i < nPoints; i++) {
            const x = xLand * i / (nPoints - 1);
            yTraj.push(1 + tanT * x - Gamma * x * x / (2 * cos2));
            xTraj.push(x);
        }

        // Terrain polyline: hill face down to its base, then flat ground —
        // one continuous yellow line
        const xTerr = [0];
        const yTerr = [1];
        if (xBase < xAxisMax) {
            xTerr.push(xBase, xAxisMax);
            yTerr.push(0, 0);
        } else {
            xTerr.push(xAxisMax);
            yTerr.push(1 - xAxisMax * tanP);
        }

        const traceTrajectory = {
            x: xTraj,
            y: yTraj,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#00f3ff', width: 2.5 },
            name: 'Trajectory'
        };

        const traceTerrain = {
            x: xTerr,
            y: yTerr,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#ffff00', width: 2 },
            name: 'Hill & ground'
        };

        const traceLanding = {
            x: [xLand],
            y: [yLand],
            type: 'scatter',
            mode: 'markers',
            marker: { color: '#ff00ff', size: 12, symbol: 'circle' },
            name: 'Landing'
        };

        // Launch is anchored at (0, 1) = the hilltop, one hill-height up
        const traceStart = {
            x: [0],
            y: [1],
            type: 'scatter',
            mode: 'markers',
            marker: { color: '#00ff9f', size: 10, symbol: 'circle' },
            name: 'Launch'
        };

        const layout = {
            template: 'plotly_dark',
            paper_bgcolor: '#0a0e27',
            plot_bgcolor: '#151934',
            margin: { l: 60, r: 30, t: 30, b: 50 },
            xaxis: {
                title: 'x̄ = x/h',
                range: [-0.2, xAxisMax],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080'
            },
            yaxis: {
                title: 'ȳ = y/h',
                range: [-0.15, yAxisMax],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080'
            },
            showlegend: true,
            legend: {
                x: 0.98,
                xanchor: 'right',
                y: 0.98,
                bgcolor: 'rgba(10, 14, 39, 0.8)'
            }
        };

        Plotly.react('nondim-projectile-plot',
            [traceTrajectory, traceTerrain, traceStart, traceLanding],
            layout,
            { responsive: true }
        );

        const statsDiv = document.getElementById('nondim-projectile-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>landing x̄ = <strong>' + xLand.toFixed(3) + '</strong></span>' +
                '<span>lands on: <strong>' + regime + '</strong></span>' +
                '<span>launch speed V = v/√(gh) = 1/√Γ = <strong>' + (1 / Math.sqrt(Gamma)).toFixed(2) + '</strong></span>';
        }
    }

    // ========================================
    // Explorer 3: Scale Identifier
    // ========================================

    const scaleProblems = {
        pendulum: {
            title: 'Simple Pendulum',
            equation: 'θ̈ = -(g/ℓ) sin θ',
            variables: ['m (mass)', 'g (gravity)', 'ℓ (length)', 'θ (angle)'],
            scales: {
                'Length': 'ℓ',
                'Time': '√(ℓ/g)',
                'Energy': 'mgℓ',
                'Angular freq.': '√(g/ℓ)'
            },
            dimensionless: 'θ̈ = -sin θ  (using τ = t√(g/ℓ))',
            plotData: function() {
                const tau = [];
                const thetaData = [];
                for (let i = 0; i < 200; i++) {
                    const t = 4 * Math.PI * i / 199;
                    tau.push(t);
                    thetaData.push(0.3 * Math.cos(t)); // small angle approx
                }
                return { x: tau, y: thetaData, xlabel: 'τ = t√(g/ℓ)', ylabel: 'θ (rad)' };
            }
        },
        spring: {
            title: 'Spring-Mass Oscillator',
            equation: 'mẍ = -kx',
            variables: ['m (mass)', 'k (spring constant)', 'x (displacement)'],
            scales: {
                'Length': 'x₀ (initial displacement)',
                'Time': '√(m/k)',
                'Energy': '½kx₀²',
                'Angular freq.': '√(k/m)'
            },
            dimensionless: 'Ẍ = -X  (using τ = t√(k/m), X = x/x₀)',
            plotData: function() {
                const tau = [];
                const X = [];
                for (let i = 0; i < 200; i++) {
                    const t = 4 * Math.PI * i / 199;
                    tau.push(t);
                    X.push(Math.cos(t));
                }
                return { x: tau, y: X, xlabel: 'τ = t√(k/m)', ylabel: 'X = x/x₀' };
            }
        },
        projectile: {
            title: 'Projectile Motion',
            equation: 'ẍ = 0, ÿ = -g',
            variables: ['v (initial speed)', 'g (gravity)', 'θ (launch angle)'],
            scales: {
                'Length': 'v²/g',
                'Time': 'v/g',
                'Velocity': 'v'
            },
            dimensionless: 'x̄″ = 0, ȳ″ = -1  (using τ = tg/v, x̄ = x/(v²/g))',
            plotData: function() {
                const x = [];
                const y = [];
                const theta = 45 * Math.PI / 180;
                for (let i = 0; i < 100; i++) {
                    const tau = 2 * Math.sin(theta) * i / 99;
                    x.push(tau * Math.cos(theta));
                    y.push(tau * Math.sin(theta) - 0.5 * tau * tau);
                }
                return { x: x, y: y, xlabel: 'x̄ = x/(v²/g)', ylabel: 'ȳ = y/(v²/g)' };
            }
        },
        falling: {
            title: 'Falling with Linear Drag',
            equation: 'mv̇ = mg - bv',
            variables: ['m (mass)', 'g (gravity)', 'b (drag coefficient)'],
            scales: {
                'Velocity': 'v_term = mg/b',
                'Time': 'm/b',
                'Length': 'm²g/b² = v_term · (m/b)'
            },
            dimensionless: 'V̇ = 1 - V  (using τ = bt/m, V = v/v_term)',
            plotData: function() {
                const tau = [];
                const V = [];
                for (let i = 0; i < 200; i++) {
                    const t = 5 * i / 199;
                    tau.push(t);
                    V.push(1 - Math.exp(-t)); // solution: V = 1 - e^(-τ)
                }
                return { x: tau, y: V, xlabel: 'τ = bt/m', ylabel: 'V = v/v_term' };
            }
        }
    };

    function initScalesExplorer() {
        updateScalesDisplay();
    }

    function updateScalesDisplay() {
        const problemKey = document.getElementById('nondim-problem-select').value;
        const problem = scaleProblems[problemKey];

        // Update info display
        const display = document.getElementById('nondim-scales-display');
        let html = `
            <div class="info-box-title">${problem.title}</div>
            <p><strong>Equation:</strong> ${problem.equation}</p>
            <p><strong>Variables:</strong> ${problem.variables.join(', ')}</p>
            <table style="width: 100%; margin: var(--spacing-sm) 0;">
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <th style="text-align: left; padding: 4px;">Quantity</th>
                    <th style="text-align: left; padding: 4px;">Natural Scale</th>
                </tr>
        `;
        for (const [qty, scale] of Object.entries(problem.scales)) {
            html += `<tr><td style="padding: 4px;">${qty}</td><td style="padding: 4px; color: var(--neon-cyan);">${scale}</td></tr>`;
        }
        html += `</table>
            <p><strong>Dimensionless form:</strong> <code style="color: var(--neon-magenta);">${problem.dimensionless}</code></p>
        `;
        display.innerHTML = html;

        // Update plot
        const plotData = problem.plotData();

        const trace = {
            x: plotData.x,
            y: plotData.y,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#00f3ff', width: 2.5 }
        };

        const layout = {
            template: 'plotly_dark',
            paper_bgcolor: '#0a0e27',
            plot_bgcolor: '#151934',
            margin: { l: 70, r: 30, t: 30, b: 50 },
            xaxis: {
                title: plotData.xlabel,
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080'
            },
            yaxis: {
                title: plotData.ylabel,
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080'
            },
            showlegend: false
        };

        Plotly.react('nondim-scales-plot', [trace], layout, { responsive: true });
    }

    // ========================================
    // Event Handlers
    // ========================================

    function attachEventHandlers() {
        // Pendulum sliders
        ['mass', 'length', 'gravity'].forEach(param => {
            const slider = document.getElementById(`nondim-${param}-slider`);
            if (slider) {
                slider.addEventListener('input', updatePendulumPlots);
            }
        });

        // Projectile sliders
        ['theta', 'phi', 'gamma'].forEach(param => {
            const slider = document.getElementById(`nondim-${param}-slider`);
            if (slider) {
                slider.addEventListener('input', updateProjectilePlot);
            }
        });

        // Scales dropdown
        const problemSelect = document.getElementById('nondim-problem-select');
        if (problemSelect) {
            problemSelect.addEventListener('change', updateScalesDisplay);
        }
    }

    // ========================================
    // Global Reset Functions
    // ========================================

    window.resetPendulumExplorer = function() {
        document.getElementById('nondim-mass-slider').value = 1;
        document.getElementById('nondim-length-slider').value = 1;
        document.getElementById('nondim-gravity-slider').value = 9.8;
        updatePendulumPlots();
    };

    window.resetProjectileExplorer = function() {
        document.getElementById('nondim-theta-slider').value = 45;
        document.getElementById('nondim-phi-slider').value = 20;
        document.getElementById('nondim-gamma-slider').value = 0.3;
        updateProjectilePlot();
    };

    // ========================================
    // Auto-initialize
    // ========================================

    initializePlots();

})();
