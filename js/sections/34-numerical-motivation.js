(function() {
    'use strict';

    // ===== State =====
    var revealed = [false, false, false, false, false, false];
    var revealedCount = 0;
    var solvable = [true, true, true, false, false, false];

    var periodData = { angles: [], ratios: [], periods: [] };

    var stepperState = { t: 0, x: 1, path_t: [0], path_x: [1] };
    var runInterval = null;
    var trueSolution = { t: [], x: [] };

    // ===== Shared layout pieces =====
    var darkLayout = {
        template: 'plotly_dark',
        margin: { t: 30, r: 20, b: 45, l: 55 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    };

    function axisStyle(range, title) {
        return {
            gridcolor: '#2a2f4a',
            zerolinecolor: '#808080',
            linecolor: '#808080',
            range: range,
            title: title || ''
        };
    }

    // ===== RK4 Solver =====
    function pendulumDeriv(s) {
        return [s[1], -Math.sin(s[0])];
    }

    function rk4Step(s, h, derivFn) {
        var k1 = derivFn(s);
        var s1 = [s[0] + 0.5 * h * k1[0], s[1] + 0.5 * h * k1[1]];
        var k2 = derivFn(s1);
        var s2 = [s[0] + 0.5 * h * k2[0], s[1] + 0.5 * h * k2[1]];
        var k3 = derivFn(s2);
        var s3 = [s[0] + h * k3[0], s[1] + h * k3[1]];
        var k4 = derivFn(s3);
        return [
            s[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
            s[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])
        ];
    }

    function solvePendulum(theta0, tMax, h) {
        var t = [0], theta = [theta0];
        var s = [theta0, 0];
        var n = Math.round(tMax / h);
        for (var i = 0; i < n; i++) {
            s = rk4Step(s, h, pendulumDeriv);
            t.push((i + 1) * h);
            theta.push(s[0]);
        }
        return { t: t, theta: theta };
    }

    // Find period by detecting first downward zero crossing (= quarter-period)
    function findPeriod(theta0) {
        var h = 0.002;
        var s = [theta0, 0];
        var prevTheta = theta0;
        for (var i = 1; i < 25000; i++) {
            s = rk4Step(s, h, pendulumDeriv);
            if (prevTheta > 0 && s[0] <= 0) {
                var tCross = (i - 1) * h + h * prevTheta / (prevTheta - s[0]);
                return 4 * tCross;
            }
            prevTheta = s[0];
        }
        return Infinity;
    }

    function precomputePeriods() {
        var T_SHO = 2 * Math.PI;
        for (var deg = 5; deg <= 175; deg += 2) {
            var theta0 = deg * Math.PI / 180;
            var T = findPeriod(theta0);
            periodData.angles.push(deg);
            periodData.periods.push(T);
            periodData.ratios.push(T / T_SHO);
        }
    }

    // ===== Slope field ODE =====
    function slopeODE(x, t) {
        return Math.sin(x + t);
    }

    function computeTrueSolution() {
        var h = 0.005;
        var t = 0, x = 1;
        trueSolution.t = [0];
        trueSolution.x = [1];
        while (t < 8) {
            x = x + h * slopeODE(x, t);
            t += h;
            trueSolution.t.push(t);
            trueSolution.x.push(x);
        }
    }

    function computeSlopeFieldData() {
        var slopeX = [], slopeY = [];
        var L = 0.18;
        for (var ti = 0; ti <= 8; ti += 0.5) {
            for (var xi = -4; xi <= 4; xi += 0.5) {
                var m = slopeODE(xi, ti);
                var norm = Math.sqrt(1 + m * m);
                var dt = L / norm;
                var dx = L * m / norm;
                slopeX.push(ti - dt, ti + dt, null);
                slopeY.push(xi - dx, xi + dx, null);
            }
        }
        return { x: slopeX, y: slopeY };
    }

    // ===== Plot: Pendulum (Explorer 2 left panel) =====
    function plotPendulum() {
        var theta0Deg = parseFloat(document.getElementById('numMotiv-theta0-slider').value);
        var theta0 = theta0Deg * Math.PI / 180;
        var tMax = 20;

        // Exact (numerical) solution
        var sol = solvePendulum(theta0, tMax, 0.02);
        var thetaDeg = sol.theta.map(function(v) { return v * 180 / Math.PI; });

        // Small-angle approximation: theta(t) = theta0 * cos(t)
        var tSHO = [], thetaSHO = [];
        for (var i = 0; i <= 1000; i++) {
            var t = tMax * i / 1000;
            tSHO.push(t);
            thetaSHO.push(theta0Deg * Math.cos(t));
        }

        var traces = [
            {
                x: sol.t, y: thetaDeg,
                type: 'scatter', mode: 'lines',
                name: 'Exact (numerical)',
                line: { color: '#00f3ff', width: 2 }
            },
            {
                x: tSHO, y: thetaSHO,
                type: 'scatter', mode: 'lines',
                name: 'Small-angle approx',
                line: { color: '#ff00ff', width: 2, dash: 'dash' }
            }
        ];

        var layout = Object.assign({}, darkLayout, {
            xaxis: axisStyle([0, tMax], 'Time (τ)'),
            yaxis: axisStyle([-200, 200], 'Angle (degrees)'),
            showlegend: true,
            legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(0,0,0,0.5)' }
        });

        Plotly.newPlot('numMotiv-pendulum-plot', traces, layout, { responsive: true });
        updatePendulumStats(theta0Deg);
    }

    // ===== Plot: Period curve (Explorer 2 right panel) =====
    function plotPeriodCurve() {
        var theta0Deg = parseFloat(document.getElementById('numMotiv-theta0-slider').value);

        // Find current ratio by interpolation
        var currentRatio = interpolateRatio(theta0Deg);

        var traces = [
            {
                x: periodData.angles, y: periodData.ratios,
                type: 'scatter', mode: 'lines',
                name: 'T / T_SHO',
                line: { color: '#ffff00', width: 2 }
            },
            {
                x: [5, 175], y: [1.05, 1.05],
                type: 'scatter', mode: 'lines',
                name: '5% error',
                line: { color: '#ff6b6b', width: 1, dash: 'dot' }
            },
            {
                x: [theta0Deg], y: [currentRatio],
                type: 'scatter', mode: 'markers',
                name: 'Current θ₀',
                marker: { color: '#00f3ff', size: 12, symbol: 'star' }
            }
        ];

        var layout = Object.assign({}, darkLayout, {
            xaxis: axisStyle([0, 180], 'Initial angle θ₀ (degrees)'),
            yaxis: axisStyle([0.95, 5], 'T / T_SHO'),
            showlegend: true,
            legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(0,0,0,0.5)' }
        });

        Plotly.newPlot('numMotiv-period-plot', traces, layout, { responsive: true });
    }

    function interpolateRatio(deg) {
        for (var i = 0; i < periodData.angles.length - 1; i++) {
            if (periodData.angles[i] <= deg && periodData.angles[i + 1] >= deg) {
                var frac = (deg - periodData.angles[i]) / (periodData.angles[i + 1] - periodData.angles[i]);
                return periodData.ratios[i] + frac * (periodData.ratios[i + 1] - periodData.ratios[i]);
            }
        }
        return periodData.ratios[periodData.ratios.length - 1];
    }

    function interpolatePeriod(deg) {
        for (var i = 0; i < periodData.angles.length - 1; i++) {
            if (periodData.angles[i] <= deg && periodData.angles[i + 1] >= deg) {
                var frac = (deg - periodData.angles[i]) / (periodData.angles[i + 1] - periodData.angles[i]);
                return periodData.periods[i] + frac * (periodData.periods[i + 1] - periodData.periods[i]);
            }
        }
        return periodData.periods[periodData.periods.length - 1];
    }

    function updatePendulumStats(theta0Deg) {
        var T_exact = interpolatePeriod(theta0Deg);
        var T_SHO = 2 * Math.PI;
        var errorPct = ((T_exact - T_SHO) / T_SHO * 100);

        document.getElementById('numMotiv-theta0-display').textContent = theta0Deg + '\u00B0';
        document.getElementById('numMotiv-t-exact').textContent = T_exact.toFixed(2);
        var errorEl = document.getElementById('numMotiv-period-error');
        errorEl.textContent = errorPct.toFixed(1) + '%';
        errorEl.style.color = errorPct > 5 ? '#ff00ff' : '#00ff9f';
    }

    function updatePendulum() {
        var theta0Deg = parseFloat(document.getElementById('numMotiv-theta0-slider').value);
        document.getElementById('numMotiv-theta0-value').textContent = theta0Deg + '\u00B0';

        var theta0 = theta0Deg * Math.PI / 180;
        var tMax = 20;

        // Exact solution
        var sol = solvePendulum(theta0, tMax, 0.02);
        var thetaDeg = sol.theta.map(function(v) { return v * 180 / Math.PI; });

        // Small-angle
        var tSHO = [], thetaSHO = [];
        for (var i = 0; i <= 1000; i++) {
            var t = tMax * i / 1000;
            tSHO.push(t);
            thetaSHO.push(theta0Deg * Math.cos(t));
        }

        Plotly.react('numMotiv-pendulum-plot', [
            {
                x: sol.t, y: thetaDeg,
                type: 'scatter', mode: 'lines',
                name: 'Exact (numerical)',
                line: { color: '#00f3ff', width: 2 }
            },
            {
                x: tSHO, y: thetaSHO,
                type: 'scatter', mode: 'lines',
                name: 'Small-angle approx',
                line: { color: '#ff00ff', width: 2, dash: 'dash' }
            }
        ]);

        // Update period curve marker
        var currentRatio = interpolateRatio(theta0Deg);
        Plotly.react('numMotiv-period-plot', [
            {
                x: periodData.angles, y: periodData.ratios,
                type: 'scatter', mode: 'lines',
                name: 'T / T_SHO',
                line: { color: '#ffff00', width: 2 }
            },
            {
                x: [5, 175], y: [1.05, 1.05],
                type: 'scatter', mode: 'lines',
                name: '5% error',
                line: { color: '#ff6b6b', width: 1, dash: 'dot' }
            },
            {
                x: [theta0Deg], y: [currentRatio],
                type: 'scatter', mode: 'markers',
                name: 'Current θ₀',
                marker: { color: '#00f3ff', size: 12, symbol: 'star' }
            }
        ]);

        updatePendulumStats(theta0Deg);
    }

    // ===== Plot: Slope Field (Explorer 3) =====
    function plotSlopeField() {
        var slopeData = computeSlopeFieldData();

        var traces = [
            {
                x: slopeData.x, y: slopeData.y,
                type: 'scatter', mode: 'lines',
                line: { color: '#555', width: 1 },
                hoverinfo: 'skip',
                showlegend: false
            },
            {
                x: trueSolution.t, y: trueSolution.x,
                type: 'scatter', mode: 'lines',
                name: 'True solution',
                line: { color: '#00ff9f', width: 1.5, dash: 'dot' }
            },
            {
                x: [0], y: [1],
                type: 'scatter', mode: 'lines+markers',
                name: 'Euler steps',
                line: { color: '#00f3ff', width: 2.5 },
                marker: { color: '#00f3ff', size: 6 }
            }
        ];

        var layout = Object.assign({}, darkLayout, {
            xaxis: axisStyle([0, 8], 't'),
            yaxis: axisStyle([-4, 4], 'x'),
            showlegend: true,
            legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(0,0,0,0.5)' }
        });

        Plotly.newPlot('numMotiv-slope-plot', traces, layout, { responsive: true });
    }

    function updateStepperPlot() {
        Plotly.restyle('numMotiv-slope-plot', {
            x: [stepperState.path_t],
            y: [stepperState.path_x]
        }, [2]);  // trace index 2 = Euler steps

        document.getElementById('numMotiv-step-count').textContent = stepperState.path_t.length - 1;
        document.getElementById('numMotiv-current-t').textContent = stepperState.t.toFixed(2);
        document.getElementById('numMotiv-current-x').textContent = stepperState.x.toFixed(2);
    }

    function doOneStep() {
        if (stepperState.t >= 8) return false;
        var h = parseFloat(document.getElementById('numMotiv-h-slider').value);
        var newX = stepperState.x + h * slopeODE(stepperState.x, stepperState.t);
        var newT = stepperState.t + h;
        stepperState.t = newT;
        stepperState.x = newX;
        stepperState.path_t.push(newT);
        stepperState.path_x.push(newX);
        updateStepperPlot();
        return true;
    }

    // ===== Equation Sorter =====
    function revealCard(idx) {
        if (revealed[idx]) return;
        revealed[idx] = true;
        revealedCount++;

        var reveal = document.getElementById('numMotiv-reveal-' + idx);
        var btn = document.getElementById('numMotiv-btn-' + idx);
        var card = document.getElementById('numMotiv-card-' + idx);

        reveal.style.display = 'block';
        btn.style.display = 'none';
        card.style.borderColor = solvable[idx] ? '#00ff9f' : '#ff00ff';
        card.style.cursor = 'default';

        document.getElementById('numMotiv-tally-count').textContent = revealedCount;

        // Re-render MathJax in the revealed section if available
        if (typeof MathJax !== 'undefined' && MathJax.typeset) {
            MathJax.typeset([reveal]);
        } else if (typeof MathJax !== 'undefined' && MathJax.Hub) {
            MathJax.Hub.Queue(['Typeset', MathJax.Hub, reveal]);
        }

        if (revealedCount === 6) {
            document.getElementById('numMotiv-summary').style.display = 'block';
        }
    }

    // ===== Event Handlers =====
    function attachHandlers() {
        var pendSlider = document.getElementById('numMotiv-theta0-slider');
        if (pendSlider) {
            pendSlider.addEventListener('input', updatePendulum);
        }

        var hSlider = document.getElementById('numMotiv-h-slider');
        if (hSlider) {
            hSlider.addEventListener('input', function() {
                document.getElementById('numMotiv-h-value').textContent =
                    parseFloat(this.value).toFixed(2);
            });
        }
    }

    // ===== Global Functions (for onclick) =====
    window.revealEquation = function(idx) {
        revealCard(idx);
    };

    window.numMotivStep = function() {
        doOneStep();
    };

    window.numMotivRun = function() {
        if (runInterval) {
            clearInterval(runInterval);
            runInterval = null;
            document.getElementById('numMotiv-run-btn').innerHTML = '&#9654; Auto-Run';
            return;
        }
        document.getElementById('numMotiv-run-btn').innerHTML = '&#9646;&#9646; Pause';
        runInterval = setInterval(function() {
            if (!doOneStep()) {
                clearInterval(runInterval);
                runInterval = null;
                document.getElementById('numMotiv-run-btn').innerHTML = '&#9654; Auto-Run';
            }
        }, 80);
    };

    window.numMotivReset = function() {
        if (runInterval) {
            clearInterval(runInterval);
            runInterval = null;
            document.getElementById('numMotiv-run-btn').innerHTML = '&#9654; Auto-Run';
        }
        stepperState = { t: 0, x: 1, path_t: [0], path_x: [1] };
        updateStepperPlot();
    };

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }

        var el = document.getElementById('numMotiv-pendulum-plot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Pre-compute period data (runs once)
        precomputePeriods();
        computeTrueSolution();

        // Draw all plots
        plotPendulum();
        plotPeriodCurve();
        plotSlopeField();

        // Attach slider handlers
        attachHandlers();
    }

    initializePlots();
})();
