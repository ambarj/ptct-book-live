(function() {
    'use strict';

    var darkLayout = {
        template: 'plotly_dark',
        margin: { t: 30, r: 20, b: 45, l: 55 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    };

    function axStyle(range, title) {
        return {
            gridcolor: '#2a2f4a',
            zerolinecolor: '#808080',
            linecolor: '#808080',
            range: range,
            title: title || ''
        };
    }

    var sqrt2 = Math.sqrt(2);

    // ===== ODE: dX/dT = V, dV/dT = -1/X² - α·exp(-β(X-1))·V =====

    // Full-trajectory RK4 solver
    function rk4Solve(V0, alpha, beta, Tmax, N) {
        var h = Tmax / N;
        var t = [0], X = [1], V = [V0];
        var y = [1, V0];
        for (var i = 0; i < N; i++) {
            var ti = i * h;
            y = rk4Step(y, ti, h, alpha, beta);
            t.push((i + 1) * h);
            X.push(y[0]);
            V.push(y[1]);
            if (y[0] < 0.01 || y[0] > 80) break;
        }
        return { t: t, X: X, V: V };
    }

    // Single RK4 step
    function rk4Step(y, ti, h, alpha, beta) {
        var k1 = fDrag(y, alpha, beta);
        var y2 = [y[0] + h / 2 * k1[0], y[1] + h / 2 * k1[1]];
        var k2 = fDrag(y2, alpha, beta);
        var y3 = [y[0] + h / 2 * k2[0], y[1] + h / 2 * k2[1]];
        var k3 = fDrag(y3, alpha, beta);
        var y4 = [y[0] + h * k3[0], y[1] + h * k3[1]];
        var k4 = fDrag(y4, alpha, beta);
        return [
            y[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
            y[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])
        ];
    }

    function fDrag(y, alpha, beta) {
        var X = y[0], V = y[1];
        var grav = -1 / (X * X);
        var drag = -alpha * Math.exp(-beta * (X - 1)) * V;
        return [V, grav + drag];
    }

    // Endpoint-only solver (for bisection — no arrays)
    function rk4Escapes(V0, alpha, beta, Tmax, N, Xthresh) {
        var h = Tmax / N;
        var y = [1, V0];
        for (var i = 0; i < N; i++) {
            y = rk4Step(y, i * h, h, alpha, beta);
            if (y[0] > Xthresh) return true;
            if (y[0] < 0.01) return false;
        }
        return false;
    }

    // Bisection to find escape velocity
    function findVesc(alpha, beta, steps) {
        var lo = sqrt2 * 0.9, hi = 5.0;
        for (var i = 0; i < steps; i++) {
            var mid = (lo + hi) / 2;
            if (rk4Escapes(mid, alpha, beta, 30, 800, 10)) {
                hi = mid;
            } else {
                lo = mid;
            }
        }
        return (lo + hi) / 2;
    }

    // ============================================================
    // EXPLORER 1: Drag Force Visualizer
    // ============================================================
    function updateDragExplorer() {
        var V0 = parseFloat(document.getElementById('ar-v0-slider').value);
        var alpha = parseFloat(document.getElementById('ar-alpha-slider').value);
        var beta = parseFloat(document.getElementById('ar-beta-slider').value);
        document.getElementById('ar-v0-value').textContent = V0.toFixed(2);
        document.getElementById('ar-alpha-value').textContent = alpha.toFixed(2);
        document.getElementById('ar-beta-value').textContent = beta.toFixed(1);

        document.getElementById('ar-dragSurf').textContent = 'α V₀ = ' + (alpha * V0).toFixed(2);
        document.getElementById('ar-scaleH').textContent = '1/β = ' + (1 / beta).toFixed(2) + ' R';

        // Classify without drag
        var clsNd = V0 >= sqrt2 ? 'Unbound' : 'Bound';
        document.getElementById('ar-classNoDrag').textContent = clsNd;
        document.getElementById('ar-classNoDrag').style.color = V0 >= sqrt2 ? '#00ff9f' : '#ff6b6b';

        // Solve with and without drag
        var Tmax = 15, N = 600;
        var solNoDrag = rk4Solve(V0, 0, 1, Tmax, N);
        var solDrag = rk4Solve(V0, alpha, beta, Tmax, N);

        // Classify with drag (check if X keeps growing)
        var lastX = solDrag.X[solDrag.X.length - 1];
        var prevX = solDrag.X.length > 10 ? solDrag.X[solDrag.X.length - 10] : 1;
        var clsD = (lastX > 8 && lastX > prevX) ? 'Unbound' : 'Bound';
        document.getElementById('ar-classDrag').textContent = clsD;
        document.getElementById('ar-classDrag').style.color = clsD === 'Unbound' ? '#00ff9f' : '#ff6b6b';

        // Left plot: drag coefficient profile
        var nPts = 150;
        var altArr = [], dragArr = [];
        for (var i = 0; i < nPts; i++) {
            var Xi = 1 + i * 9 / (nPts - 1);
            altArr.push(Xi);
            dragArr.push(alpha * Math.exp(-beta * (Xi - 1)));
        }

        var traces1 = [{
            x: altArr, y: dragArr, mode: 'lines', name: 'Drag coeff',
            line: { color: '#ff6b6b', width: 2 },
            fill: 'tozeroy', fillcolor: 'rgba(255,107,107,0.15)'
        }];

        var layout1 = Object.assign({}, darkLayout, {
            xaxis: axStyle([1, 10], 'X (planet radii)'),
            yaxis: axStyle([0, Math.max(alpha * 1.2, 0.5)], 'α·e^{−β(X−1)}'),
            showlegend: false,
            title: { text: 'Drag coefficient vs altitude', font: { size: 13, color: '#e0e0e0' } }
        });

        Plotly.react('ar-dragPlot', traces1, layout1, { responsive: true });

        // Right plot: trajectory comparison
        var traces2 = [
            { x: solNoDrag.t, y: solNoDrag.X, mode: 'lines', name: 'No drag',
              line: { color: '#00f3ff', width: 2 } },
            { x: solDrag.t, y: solDrag.X, mode: 'lines', name: 'With drag',
              line: { color: '#ff6b6b', width: 2 } }
        ];

        var xMax = Math.max.apply(null, solNoDrag.X.concat(solDrag.X));
        var layout2 = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, Tmax], 'T'),
            yaxis: axStyle([0, Math.max(xMax * 1.1, 3)], 'X (planet radii)'),
            legend: { x: 0.05, y: 0.95, font: { size: 11 } },
            showlegend: true,
            title: { text: 'X(T) trajectories', font: { size: 13, color: '#e0e0e0' } }
        });

        Plotly.react('ar-trajPlot', traces2, layout2, { responsive: true });
    }

    // ============================================================
    // EXPLORER 2: Escape Threshold with Drag (Bisection)
    // ============================================================
    var bisState = { lo: 1.0, hi: 4.0, step: 0, history: [], alpha: 1.0, beta: 1.0 };

    function resetBisState() {
        var alpha = parseFloat(document.getElementById('ar-alpha2-slider').value);
        var beta = parseFloat(document.getElementById('ar-beta2-slider').value);
        bisState = { lo: 1.0, hi: 4.0, step: 0, history: [], alpha: alpha, beta: beta };
        bisState.history.push({ step: 0, lo: 1.0, hi: 4.0, mid: 2.5 });
    }

    function doBisStep() {
        var mid = (bisState.lo + bisState.hi) / 2;
        if (rk4Escapes(mid, bisState.alpha, bisState.beta, 30, 800, 10)) {
            bisState.hi = mid;
        } else {
            bisState.lo = mid;
        }
        bisState.step++;
        bisState.history.push({
            step: bisState.step, lo: bisState.lo,
            hi: bisState.hi, mid: (bisState.lo + bisState.hi) / 2
        });
    }

    function updateBisDisplay() {
        var alpha = parseFloat(document.getElementById('ar-alpha2-slider').value);
        var beta = parseFloat(document.getElementById('ar-beta2-slider').value);
        document.getElementById('ar-alpha2-value').textContent = alpha.toFixed(1);
        document.getElementById('ar-beta2-value').textContent = beta.toFixed(1);

        // Reset if params changed
        if (alpha !== bisState.alpha || beta !== bisState.beta) {
            resetBisState();
        }

        var mid = (bisState.lo + bisState.hi) / 2;
        document.getElementById('ar-bracket2').textContent =
            '[' + bisState.lo.toFixed(4) + ', ' + bisState.hi.toFixed(4) + ']';
        document.getElementById('ar-midV02').textContent = mid.toFixed(4);
        document.getElementById('ar-bisectStep2').textContent = bisState.step;
        document.getElementById('ar-vescRatio').textContent =
            bisState.step > 0 ? (mid / sqrt2).toFixed(3) : '—';

        // Left plot: bracket convergence
        var steps = [], loA = [], hiA = [], midA = [];
        for (var i = 0; i < bisState.history.length; i++) {
            var h = bisState.history[i];
            steps.push(h.step);
            loA.push(h.lo);
            hiA.push(h.hi);
            midA.push(h.mid);
        }

        var traces1 = [
            { x: steps, y: loA, mode: 'lines+markers', name: 'Lower',
              line: { color: '#ff6b6b', width: 2 }, marker: { size: 4 } },
            { x: steps, y: hiA, mode: 'lines+markers', name: 'Upper',
              line: { color: '#00ff9f', width: 2 }, marker: { size: 4 } },
            { x: steps, y: midA, mode: 'lines+markers', name: 'Midpoint',
              line: { color: '#00f3ff', width: 2 }, marker: { size: 5 } },
            { x: [0, Math.max(bisState.step, 1)], y: [sqrt2, sqrt2],
              mode: 'lines', name: '√2 (no drag)',
              line: { color: '#ffff00', width: 1, dash: 'dash' } }
        ];

        var maxStep = Math.max(bisState.step + 1, 5);
        var layout1 = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, maxStep], 'Step'),
            yaxis: axStyle([1.0, 4.0], 'V₀'),
            legend: { x: 0.55, y: 0.95, font: { size: 11 } },
            showlegend: true
        });

        Plotly.react('ar-bisectPlot2', traces1, layout1, { responsive: true });

        // Right plot: trajectory at midpoint
        var sol = rk4Solve(mid, bisState.alpha, bisState.beta, 15, 500);
        var traces2 = [{
            x: sol.t, y: sol.X, mode: 'lines',
            name: 'V₀=' + mid.toFixed(3),
            line: { color: '#00f3ff', width: 2 }
        }];

        var xMax = Math.max.apply(null, sol.X);
        var layout2 = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 15], 'T'),
            yaxis: axStyle([0, Math.max(xMax * 1.1, 5)], 'X'),
            legend: { x: 0.05, y: 0.95, font: { size: 11 } },
            showlegend: true
        });

        Plotly.react('ar-bisectTrajPlot2', traces2, layout2, { responsive: true });
    }

    // ============================================================
    // EXPLORER 3: Parameter Space Sweep
    // ============================================================
    function updateSweepExplorer() {
        var alphaFixed = parseFloat(document.getElementById('ar-alpha3-slider').value);
        var betaFixed = parseFloat(document.getElementById('ar-beta3-slider').value);
        document.getElementById('ar-alpha3-value').textContent = alphaFixed.toFixed(1);
        document.getElementById('ar-beta3-value').textContent = betaFixed.toFixed(1);

        // Current point
        var vescCur = findVesc(alphaFixed, betaFixed, 15);
        document.getElementById('ar-vescCurrent').textContent = vescCur.toFixed(3);
        document.getElementById('ar-ratCurrent').textContent = (vescCur / sqrt2).toFixed(3);
        document.getElementById('ar-pctIncrease').textContent =
            ((vescCur / sqrt2 - 1) * 100).toFixed(1) + '%';

        // Left plot: v_esc vs α at fixed β
        var nSweep = 16;
        var alphaArr = [], vescAlpha = [];
        for (var i = 0; i < nSweep; i++) {
            var ai = i * 3.0 / (nSweep - 1);
            alphaArr.push(ai);
            vescAlpha.push(ai < 0.01 ? sqrt2 : findVesc(ai, betaFixed, 14));
        }

        var traces1 = [
            { x: alphaArr, y: vescAlpha, mode: 'lines+markers', name: 'v_esc(α)',
              line: { color: '#00f3ff', width: 2 }, marker: { size: 5 } },
            { x: [0, 3], y: [sqrt2, sqrt2], mode: 'lines', name: '√2 (vacuum)',
              line: { color: '#ffff00', width: 1, dash: 'dash' } },
            { x: [alphaFixed], y: [vescCur], mode: 'markers', name: 'Current',
              marker: { color: '#ff00ff', size: 12, symbol: 'star' }, showlegend: false }
        ];

        var maxVa = Math.max.apply(null, vescAlpha);
        var layout1 = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 3], 'α (drag strength)'),
            yaxis: axStyle([1.2, Math.max(maxVa * 1.1, 2.5)], 'v_esc'),
            legend: { x: 0.05, y: 0.95, font: { size: 11 } },
            showlegend: true,
            title: { text: 'Fixed β = ' + betaFixed.toFixed(1), font: { size: 13, color: '#e0e0e0' } }
        });

        Plotly.react('ar-alphaSweepPlot', traces1, layout1, { responsive: true });

        // Right plot: v_esc vs β at fixed α
        var betaArr = [], vescBeta = [];
        for (var j = 0; j < nSweep; j++) {
            var bj = 0.5 + j * 4.5 / (nSweep - 1);
            betaArr.push(bj);
            vescBeta.push(findVesc(alphaFixed, bj, 14));
        }

        var traces2 = [
            { x: betaArr, y: vescBeta, mode: 'lines+markers', name: 'v_esc(β)',
              line: { color: '#ff6b6b', width: 2 }, marker: { size: 5 } },
            { x: [0.5, 5], y: [sqrt2, sqrt2], mode: 'lines', name: '√2 (vacuum)',
              line: { color: '#ffff00', width: 1, dash: 'dash' } },
            { x: [betaFixed], y: [vescCur], mode: 'markers', name: 'Current',
              marker: { color: '#ff00ff', size: 12, symbol: 'star' }, showlegend: false }
        ];

        var maxVb = Math.max.apply(null, vescBeta);
        var layout2 = Object.assign({}, darkLayout, {
            xaxis: axStyle([0.5, 5], 'β (atm. thickness)'),
            yaxis: axStyle([1.2, Math.max(maxVb * 1.1, 2.5)], 'v_esc'),
            legend: { x: 0.55, y: 0.95, font: { size: 11 } },
            showlegend: true,
            title: { text: 'Fixed α = ' + alphaFixed.toFixed(1), font: { size: 13, color: '#e0e0e0' } }
        });

        Plotly.react('ar-betaSweepPlot', traces2, layout2, { responsive: true });
    }

    // ============================================================
    // Initialization
    // ============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }

        var el1 = document.getElementById('ar-dragPlot');
        var el2 = document.getElementById('ar-bisectPlot2');
        var el3 = document.getElementById('ar-alphaSweepPlot');
        if (!el1 || !el2 || !el3) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Explorer 1 handlers
        var v0s = document.getElementById('ar-v0-slider');
        var als = document.getElementById('ar-alpha-slider');
        var bts = document.getElementById('ar-beta-slider');
        if (v0s) v0s.addEventListener('input', updateDragExplorer);
        if (als) als.addEventListener('input', updateDragExplorer);
        if (bts) bts.addEventListener('input', updateDragExplorer);

        // Explorer 2 handlers (params auto-reset bisection)
        var al2 = document.getElementById('ar-alpha2-slider');
        var bt2 = document.getElementById('ar-beta2-slider');
        if (al2) al2.addEventListener('input', updateBisDisplay);
        if (bt2) bt2.addEventListener('input', updateBisDisplay);

        // Explorer 3 handlers
        var al3 = document.getElementById('ar-alpha3-slider');
        var bt3 = document.getElementById('ar-beta3-slider');
        if (al3) al3.addEventListener('input', updateSweepExplorer);
        if (bt3) bt3.addEventListener('input', updateSweepExplorer);

        // Initial draws
        resetBisState();
        updateDragExplorer();
        updateBisDisplay();
        updateSweepExplorer();
    }

    // ============================================================
    // Global functions
    // ============================================================
    window.arDragReset = function() {
        var s1 = document.getElementById('ar-v0-slider');
        var s2 = document.getElementById('ar-alpha-slider');
        var s3 = document.getElementById('ar-beta-slider');
        if (s1) s1.value = 1.80;
        if (s2) s2.value = 1.0;
        if (s3) s3.value = 1.0;
        updateDragExplorer();
    };

    window.arBisectStep = function() {
        doBisStep();
        updateBisDisplay();
    };

    window.arBisectAuto = function() {
        for (var i = 0; i < 20; i++) doBisStep();
        updateBisDisplay();
    };

    window.arBisectReset = function() {
        resetBisState();
        updateBisDisplay();
    };

    window.arSweepReset = function() {
        var s1 = document.getElementById('ar-alpha3-slider');
        var s2 = document.getElementById('ar-beta3-slider');
        if (s1) s1.value = 1.0;
        if (s2) s2.value = 1.0;
        updateSweepExplorer();
    };

    initializePlots();
})();
