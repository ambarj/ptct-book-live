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
    var Tfinal = 10;

    // ===== Dimensionless gravity ODE: dX/dT = V, dV/dT = -1/X² =====
    function f(y) { return [y[1], -1 / (y[0] * y[0])]; }

    // RK4 full trajectory solver
    function rk4Solve(V0, N) {
        var h = Tfinal / N;
        var t = [0], X = [1], V = [V0];
        var y = [1, V0];
        for (var i = 0; i < N; i++) {
            var k1 = f(y);
            var y2 = [y[0] + h / 2 * k1[0], y[1] + h / 2 * k1[1]];
            var k2 = f(y2);
            var y3 = [y[0] + h / 2 * k2[0], y[1] + h / 2 * k2[1]];
            var k3 = f(y3);
            var y4 = [y[0] + h * k3[0], y[1] + h * k3[1]];
            var k4 = f(y4);
            y = [
                y[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
                y[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])
            ];
            var ti = (i + 1) * h;
            t.push(ti);
            X.push(y[0]);
            V.push(y[1]);
            if (y[0] < 0.01) break;  // crashed
            if (y[0] > 100) break;   // clearly escaped
        }
        return { t: t, X: X, V: V };
    }

    // RK4 endpoint-only (for bisection — no array storage)
    function rk4End(V0, N, Tmax, Xthresh) {
        var h = Tmax / N;
        var y = [1, V0];
        for (var i = 0; i < N; i++) {
            var k1 = f(y);
            var y2 = [y[0] + h / 2 * k1[0], y[1] + h / 2 * k1[1]];
            var k2 = f(y2);
            var y3 = [y[0] + h / 2 * k2[0], y[1] + h / 2 * k2[1]];
            var k3 = f(y3);
            var y4 = [y[0] + h * k3[0], y[1] + h * k3[1]];
            var k4 = f(y4);
            y = [
                y[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
                y[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])
            ];
            if (y[0] > Xthresh) return true;   // escaped
            if (y[0] < 0.01) return false;      // crashed
        }
        return false;
    }

    // Exact critical solution
    function exactX(T) { return Math.pow(1 + 1.5 * sqrt2 * T, 2 / 3); }

    // ============================================================
    // EXPLORER 1: Rocket Launcher
    // ============================================================
    function updateLauncher() {
        var V0 = parseFloat(document.getElementById('rk-v0-slider').value);
        var N = parseInt(document.getElementById('rk-N-slider').value);
        document.getElementById('rk-v0-value').textContent = V0.toFixed(2);
        document.getElementById('rk-N-value').textContent = N;

        var sol = rk4Solve(V0, N);
        var nPts = sol.t.length;

        // Classification
        var cls, clsColor;
        if (Math.abs(V0 - sqrt2) < 0.03) {
            cls = 'Critical'; clsColor = '#ffff00';
        } else if (V0 < sqrt2) {
            cls = 'Bound'; clsColor = '#ff6b6b';
        } else {
            cls = 'Unbound'; clsColor = '#00ff9f';
        }

        // Energy drift
        var E0 = 0.5 * V0 * V0 - 1;
        var Xf = sol.X[nPts - 1], Vf = sol.V[nPts - 1];
        var Ef = 0.5 * Vf * Vf - 1 / Xf;
        var drift = Math.abs(Ef - E0);

        document.getElementById('rk-class').textContent = cls;
        document.getElementById('rk-class').style.color = clsColor;
        document.getElementById('rk-xfinal').textContent = Xf.toFixed(2);
        document.getElementById('rk-vfinal').textContent = Vf.toFixed(3);
        document.getElementById('rk-edrift').textContent = drift.toExponential(1);

        // --- Left plot: X(T) ---
        var traces1 = [{
            x: sol.t, y: sol.X, mode: 'lines',
            name: 'RK4 (V₀=' + V0.toFixed(2) + ')',
            line: { color: clsColor, width: 2 }
        }];

        // Exact solution at critical speed
        if (Math.abs(V0 - sqrt2) < 0.1) {
            var tEx = [], xEx = [];
            for (var i = 0; i < 200; i++) {
                var ti = i * Tfinal / 199;
                tEx.push(ti);
                xEx.push(exactX(ti));
            }
            traces1.push({
                x: tEx, y: xEx, mode: 'lines', name: 'Exact',
                line: { color: '#ffff00', width: 1, dash: 'dash' }
            });
        }

        var xMax = Math.max.apply(null, sol.X);
        var layout1 = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, Tfinal], 'T (dimensionless time)'),
            yaxis: axStyle([0, Math.max(xMax * 1.1, 3)], 'X (planet radii)'),
            legend: { x: 0.05, y: 0.95, font: { size: 11 } },
            showlegend: true
        });

        Plotly.react('rk-xtPlot', traces1, layout1, { responsive: true });

        // --- Right plot: V(T) ---
        var traces2 = [{
            x: sol.t, y: sol.V, mode: 'lines',
            name: 'V(T)',
            line: { color: clsColor, width: 2 }
        }];

        // Zero reference line
        traces2.push({
            x: [0, Tfinal], y: [0, 0], mode: 'lines',
            line: { color: '#808080', width: 1, dash: 'dot' }, showlegend: false
        });

        var vMin = Math.min.apply(null, sol.V);
        var vMax = Math.max.apply(null, sol.V);

        var layout2 = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, Tfinal], 'T (dimensionless time)'),
            yaxis: axStyle([Math.min(vMin - 0.2, -0.5), vMax + 0.2], 'V (dimensionless speed)'),
            legend: { x: 0.05, y: 0.95, font: { size: 11 } },
            showlegend: true
        });

        Plotly.react('rk-vtPlot', traces2, layout2, { responsive: true });
    }

    // ============================================================
    // EXPLORER 2: Escape Threshold Finder (Bisection)
    // ============================================================
    var bisectState = { lo: 1.0, hi: 2.0, step: 0, history: [] };

    function resetBisectState() {
        bisectState = { lo: 1.0, hi: 2.0, step: 0, history: [] };
        bisectState.history.push({ step: 0, lo: 1.0, hi: 2.0, mid: 1.5 });
    }

    function doBisectStep() {
        var mid = (bisectState.lo + bisectState.hi) / 2;
        var escaped = rk4End(mid, 1000, 20, 10);
        if (escaped) {
            bisectState.hi = mid;
        } else {
            bisectState.lo = mid;
        }
        bisectState.step++;
        var newMid = (bisectState.lo + bisectState.hi) / 2;
        bisectState.history.push({
            step: bisectState.step, lo: bisectState.lo,
            hi: bisectState.hi, mid: newMid
        });
    }

    function updateBisectDisplay() {
        var mid = (bisectState.lo + bisectState.hi) / 2;
        var err = Math.abs(mid - sqrt2);

        document.getElementById('rk-bracket').textContent =
            '[' + bisectState.lo.toFixed(6) + ', ' + bisectState.hi.toFixed(6) + ']';
        document.getElementById('rk-midV0').textContent = mid.toFixed(6);
        document.getElementById('rk-bisectStep').textContent = bisectState.step;
        document.getElementById('rk-bisectErr').textContent = err.toExponential(2);

        // Left plot: bracket convergence
        var steps = [], loArr = [], hiArr = [], midArr = [];
        for (var i = 0; i < bisectState.history.length; i++) {
            var h = bisectState.history[i];
            steps.push(h.step);
            loArr.push(h.lo);
            hiArr.push(h.hi);
            midArr.push(h.mid);
        }

        var traces1 = [
            { x: steps, y: loArr, mode: 'lines+markers', name: 'Lower bound',
              line: { color: '#ff6b6b', width: 2 }, marker: { size: 4 } },
            { x: steps, y: hiArr, mode: 'lines+markers', name: 'Upper bound',
              line: { color: '#00ff9f', width: 2 }, marker: { size: 4 } },
            { x: steps, y: midArr, mode: 'lines+markers', name: 'Midpoint',
              line: { color: '#00f3ff', width: 2 }, marker: { size: 5 } },
            { x: [0, Math.max(bisectState.step, 1)], y: [sqrt2, sqrt2],
              mode: 'lines', name: '√2 (exact)',
              line: { color: '#ffff00', width: 1, dash: 'dash' } }
        ];

        var maxStep = Math.max(bisectState.step + 1, 5);
        var layout1 = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, maxStep], 'Bisection step'),
            yaxis: axStyle([1.0, 2.0], 'V₀'),
            legend: { x: 0.55, y: 0.95, font: { size: 11 } },
            showlegend: true
        });

        Plotly.react('rk-bisectPlot', traces1, layout1, { responsive: true });

        // Right plot: trajectory at current midpoint
        var sol = rk4Solve(mid, 500);
        var traces2 = [{
            x: sol.t, y: sol.X, mode: 'lines', name: 'X(T) at V₀=' + mid.toFixed(4),
            line: { color: '#00f3ff', width: 2 }
        }];

        // Exact critical
        var tEx = [], xEx = [];
        for (var j = 0; j < 200; j++) {
            var tj = j * Tfinal / 199;
            tEx.push(tj);
            xEx.push(exactX(tj));
        }
        traces2.push({
            x: tEx, y: xEx, mode: 'lines', name: 'Exact (V₀=√2)',
            line: { color: '#ffff00', width: 1, dash: 'dash' }
        });

        var xMax = Math.max.apply(null, sol.X);
        var layout2 = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, Tfinal], 'T'),
            yaxis: axStyle([0, Math.max(xMax * 1.1, 8)], 'X'),
            legend: { x: 0.05, y: 0.95, font: { size: 11 } },
            showlegend: true
        });

        Plotly.react('rk-bisectTrajPlot', traces2, layout2, { responsive: true });
    }

    // ============================================================
    // EXPLORER 3: Energy Conservation Validator
    // ============================================================
    function updateEnergyValidator() {
        var V0 = parseFloat(document.getElementById('rk-ev0-slider').value);
        var N = parseInt(document.getElementById('rk-eN-slider').value);
        document.getElementById('rk-ev0-value').textContent = V0.toFixed(2);
        document.getElementById('rk-eN-value').textContent = N;

        var sol = rk4Solve(V0, N);
        var nPts = sol.t.length;

        var E0 = 0.5 * V0 * V0 - 1;
        var eArr = [], deArr = [], maxDE = 0;
        for (var i = 0; i < nPts; i++) {
            var Ei = 0.5 * sol.V[i] * sol.V[i] - 1 / sol.X[i];
            eArr.push(Ei);
            var de = Ei - E0;
            deArr.push(de);
            if (Math.abs(de) > maxDE) maxDE = Math.abs(de);
        }

        var Ef = eArr[nPts - 1];
        var h = Tfinal / N;

        document.getElementById('rk-E0').textContent = E0.toFixed(4);
        document.getElementById('rk-Ef').textContent = Ef.toFixed(6);
        document.getElementById('rk-maxDE').textContent = maxDE.toExponential(2);
        document.getElementById('rk-hval').textContent = h.toFixed(4);

        // Left plot: E(T)
        var traces1 = [{
            x: sol.t, y: eArr, mode: 'lines', name: 'E(T)',
            line: { color: '#00f3ff', width: 2 }
        }, {
            x: [0, Tfinal], y: [E0, E0], mode: 'lines', name: 'E(0) = ' + E0.toFixed(4),
            line: { color: '#ffff00', width: 1, dash: 'dash' }
        }];

        // Auto-range y around E0
        var eSpread = Math.max(maxDE * 2, 0.001);
        var layout1 = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, Tfinal], 'T'),
            yaxis: axStyle([E0 - eSpread, E0 + eSpread], 'E = ½V² − 1/X'),
            legend: { x: 0.45, y: 0.95, font: { size: 11 } },
            showlegend: true
        });

        Plotly.react('rk-energyPlot', traces1, layout1, { responsive: true });

        // Right plot: ΔE(T) = E(T) - E(0)
        var traces2 = [{
            x: sol.t, y: deArr, mode: 'lines', name: 'ΔE = E(T) − E(0)',
            line: { color: '#ff6b6b', width: 2 }
        }, {
            x: [0, Tfinal], y: [0, 0], mode: 'lines',
            line: { color: '#808080', width: 1, dash: 'dot' }, showlegend: false
        }];

        var deSpread = Math.max(maxDE * 1.5, 1e-10);
        var layout2 = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, Tfinal], 'T'),
            yaxis: axStyle([-deSpread, deSpread], 'ΔE (energy drift)'),
            legend: { x: 0.05, y: 0.95, font: { size: 11 } },
            showlegend: true
        });

        Plotly.react('rk-edriftPlot', traces2, layout2, { responsive: true });
    }

    // ============================================================
    // Initialization
    // ============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }

        var el1 = document.getElementById('rk-xtPlot');
        var el2 = document.getElementById('rk-bisectPlot');
        var el3 = document.getElementById('rk-energyPlot');
        if (!el1 || !el2 || !el3) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Attach handlers
        var v0Slider = document.getElementById('rk-v0-slider');
        if (v0Slider) v0Slider.addEventListener('input', updateLauncher);

        var nSlider = document.getElementById('rk-N-slider');
        if (nSlider) nSlider.addEventListener('input', updateLauncher);

        var ev0Slider = document.getElementById('rk-ev0-slider');
        if (ev0Slider) ev0Slider.addEventListener('input', updateEnergyValidator);

        var eNslider = document.getElementById('rk-eN-slider');
        if (eNslider) eNslider.addEventListener('input', updateEnergyValidator);

        // Initial draws
        resetBisectState();
        updateLauncher();
        updateBisectDisplay();
        updateEnergyValidator();
    }

    // ============================================================
    // Global functions
    // ============================================================
    window.rkLaunchReset = function() {
        var s1 = document.getElementById('rk-v0-slider');
        var s2 = document.getElementById('rk-N-slider');
        if (s1) s1.value = 1.41;
        if (s2) s2.value = 500;
        updateLauncher();
    };

    window.rkBisectStep = function() {
        doBisectStep();
        updateBisectDisplay();
    };

    window.rkBisectAuto = function() {
        for (var i = 0; i < 20; i++) doBisectStep();
        updateBisectDisplay();
    };

    window.rkBisectReset = function() {
        resetBisectState();
        updateBisectDisplay();
    };

    window.rkEnergyReset = function() {
        var s1 = document.getElementById('rk-ev0-slider');
        var s2 = document.getElementById('rk-eN-slider');
        if (s1) s1.value = 1.41;
        if (s2) s2.value = 200;
        updateEnergyValidator();
    };

    initializePlots();
})();
