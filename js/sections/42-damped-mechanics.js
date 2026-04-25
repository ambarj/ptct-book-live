(function() {
    'use strict';

    // ===== Shared layout =====
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

    // ===== Vector Euler solver =====
    function eulerSystem(f, y0, tMax, h) {
        var n = Math.round(tMax / h);
        var t = [0], Y = [y0.slice()];
        var y = y0.slice(), ti = 0;
        for (var i = 0; i < n; i++) {
            var dy = f(y, ti);
            y = [y[0] + h * dy[0], y[1] + h * dy[1]];
            ti += h;
            t.push(ti); Y.push(y.slice());
            if (Math.abs(y[0]) > 1e6 || Math.abs(y[1]) > 1e6) break;
        }
        return { t: t, Y: Y };
    }

    // ===== Exact solution (same as LCR section) =====
    function exactSolution(w, tArr) {
        var Q = [], I = [];
        if (w > 0.25) {
            var beta = Math.sqrt(w - 0.25);
            for (var i = 0; i < tArr.length; i++) {
                var t = tArr[i], env = Math.exp(-t / 2);
                Q.push(env * (Math.cos(beta * t) + Math.sin(beta * t) / (2 * beta)));
                I.push(-(w / beta) * env * Math.sin(beta * t));
            }
        } else if (Math.abs(w - 0.25) < 0.005) {
            for (var i = 0; i < tArr.length; i++) {
                var t = tArr[i], env = Math.exp(-t / 2);
                Q.push((1 + t / 2) * env);
                I.push(-t / 4 * env);
            }
        } else {
            var alpha = Math.sqrt(0.25 - w);
            var lam1 = -0.5 + alpha, lam2 = -0.5 - alpha;
            var A = 0.5 + 1 / (4 * alpha), B = 0.5 - 1 / (4 * alpha);
            for (var i = 0; i < tArr.length; i++) {
                var t = tArr[i];
                Q.push(A * Math.exp(lam1 * t) + B * Math.exp(lam2 * t));
                I.push(A * lam1 * Math.exp(lam1 * t) + B * lam2 * Math.exp(lam2 * t));
            }
        }
        return { Q: Q, I: I };
    }

    function getRegime(w) {
        if (w > 0.26) return 'Underdamped';
        if (w >= 0.24) return 'Critical';
        return 'Overdamped';
    }

    // ===== Explorer 1: Damped Spring Simulator =====
    function plotSim() {
        var m = parseFloat(document.getElementById('dampMech-m-slider').value);
        var k = parseFloat(document.getElementById('dampMech-k-slider').value);
        var b = parseFloat(document.getElementById('dampMech-b-slider').value);
        var h = parseFloat(document.getElementById('dampMech-h-slider').value);
        var w = k * m / (b * b);
        var tMax = 15;

        var f = function(y) { return [y[1], -w * y[0] - y[1]]; };
        var sol = eulerSystem(f, [1, 0], tMax, h);

        var tArr = sol.t;
        var xa = [], va = [];
        for (var i = 0; i < sol.Y.length; i++) {
            xa.push(sol.Y[i][0]); va.push(sol.Y[i][1]);
        }

        var exact = exactSolution(w, tArr);
        var maxErr = 0;
        for (var i = 0; i < tArr.length; i++) {
            var e = Math.abs(xa[i] - exact.Q[i]);
            if (e > maxErr) maxErr = e;
        }

        // Left: time series
        Plotly.newPlot('dampMech-timePlot', [
            { x: tArr, y: exact.Q, type: 'scatter', mode: 'lines',
              name: 'Exact', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: tArr, y: xa, type: 'scatter', mode: 'lines',
              name: 'Euler x(t)', line: { color: '#00f3ff', width: 2 } },
            { x: tArr, y: va, type: 'scatter', mode: 'lines',
              name: 'Euler v(t)', line: { color: '#ff6b6b', width: 1.5 } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, tMax], 'τ (dimensionless)'),
            yaxis: axStyle([-1.5, 1.5], 'x, v'),
            showlegend: true,
            legend: { x: 0.5, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: phase portrait
        Plotly.newPlot('dampMech-phasePlot', [
            { x: exact.Q, y: exact.I, type: 'scatter', mode: 'lines',
              name: 'Exact', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: xa, y: va, type: 'scatter', mode: 'lines',
              name: 'Euler', line: { color: '#00ff9f', width: 2 } },
            { x: [1], y: [0], type: 'scatter', mode: 'markers',
              name: 'Start', marker: { color: '#ffff00', size: 10, symbol: 'star' } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-1.5, 1.5], 'x'),
            yaxis: axStyle([-4, 4], 'v'),
            showlegend: true,
            legend: { x: 0.6, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Stats
        var regime = getRegime(w);
        var period = w > 0.25 ? (2 * Math.PI / Math.sqrt(w - 0.25)).toFixed(2) : 'N/A';
        var el;
        el = document.getElementById('dampMech-w');
        if (el) el.textContent = w.toFixed(2);
        el = document.getElementById('dampMech-regime');
        if (el) el.textContent = regime;
        el = document.getElementById('dampMech-period');
        if (el) el.textContent = period;
        el = document.getElementById('dampMech-maxErr');
        if (el) el.textContent = maxErr.toExponential(2);
    }

    // ===== Explorer 2: Cross-Domain Mapper =====
    function plotCross() {
        var w = parseFloat(document.getElementById('dampMech-cross-w-slider').value);
        var tMax = 15;

        var f = function(y) { return [y[1], -w * y[0] - y[1]]; };
        var sol = eulerSystem(f, [1, 0], tMax, 0.01);

        var tArr = sol.t;
        var ya = [];
        for (var i = 0; i < sol.Y.length; i++) {
            ya.push(sol.Y[i][0]);
        }

        var exact = exactSolution(w, tArr);

        // Left: Mechanical
        Plotly.newPlot('dampMech-mechPlot', [
            { x: tArr, y: exact.Q, type: 'scatter', mode: 'lines',
              name: 'Exact x(t)', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: tArr, y: ya, type: 'scatter', mode: 'lines',
              name: 'Euler x(t)', line: { color: '#00f3ff', width: 2 } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, tMax], 'τ (mechanical)'),
            yaxis: axStyle([-1.2, 1.2], 'Displacement x'),
            showlegend: true,
            legend: { x: 0.4, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' },
            title: { text: 'Mechanical (w=' + w.toFixed(1) + ')', font: { size: 13, color: '#00f3ff' } }
        }), { responsive: true });

        // Right: Electrical (identical data, different labels)
        Plotly.newPlot('dampMech-elecPlot', [
            { x: tArr, y: exact.Q, type: 'scatter', mode: 'lines',
              name: 'Exact Q(t)', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: tArr, y: ya, type: 'scatter', mode: 'lines',
              name: 'Euler Q(t)', line: { color: '#ff00ff', width: 2 } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, tMax], 'τ (electrical)'),
            yaxis: axStyle([-1.2, 1.2], 'Charge Q'),
            showlegend: true,
            legend: { x: 0.4, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' },
            title: { text: 'Electrical (w=' + w.toFixed(1) + ')', font: { size: 13, color: '#ff00ff' } }
        }), { responsive: true });

        // Stats
        var maxDiff = 0;
        // Both use same solver so diff is 0 — that's the point!
        var el;
        el = document.getElementById('dampMech-cross-w');
        if (el) el.textContent = w.toFixed(2);
        el = document.getElementById('dampMech-cross-diff');
        if (el) el.textContent = '0.000 (identical!)';
    }

    // ===== Explorer 3: Euler's Limits =====
    function plotEulerLimits() {
        var w = parseFloat(document.getElementById('dampMech-euler-w-slider').value);
        var h = parseFloat(document.getElementById('dampMech-euler-h-slider').value);
        var tMax = 15;

        var f = function(y) { return [y[1], -w * y[0] - y[1]]; };
        var sol = eulerSystem(f, [1, 0], tMax, h);

        var tArr = sol.t;
        var xa = [];
        for (var i = 0; i < sol.Y.length; i++) {
            xa.push(sol.Y[i][0]);
        }

        var exact = exactSolution(w, tArr);

        // Compute energy ratio E(t)/E(0)
        var E0 = 0.5 * w; // initial energy = 0.5*w*Q0^2
        var eRatio = [], eExact = [];
        var maxErr = 0;
        for (var i = 0; i < sol.Y.length; i++) {
            var Q = sol.Y[i][0], I = sol.Y[i][1];
            var E = 0.5 * w * Q * Q + 0.5 * I * I;
            eRatio.push(E / E0);

            var Qex = exact.Q[i], Iex = exact.I[i];
            var Eex = 0.5 * w * Qex * Qex + 0.5 * Iex * Iex;
            eExact.push(Eex / E0);

            var err = Math.abs(xa[i] - exact.Q[i]);
            if (err > maxErr) maxErr = err;
        }

        // Left: phase portrait (Euler vs exact)
        var exQ = exact.Q, exI = exact.I;
        Plotly.newPlot('dampMech-eulerErrPlot', [
            { x: exQ, y: exI, type: 'scatter', mode: 'lines',
              name: 'Exact', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: xa, y: sol.Y.map(function(r) { return r[1]; }), type: 'scatter', mode: 'lines',
              name: 'Euler (h=' + h.toFixed(2) + ')', line: { color: '#00f3ff', width: 2 } },
            { x: [1], y: [0], type: 'scatter', mode: 'markers',
              name: 'Start', marker: { color: '#ffff00', size: 10, symbol: 'star' } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-2, 2], 'x'),
            yaxis: axStyle([-6, 6], 'v'),
            showlegend: true,
            legend: { x: 0.55, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: energy ratio
        Plotly.newPlot('dampMech-energyDriftPlot', [
            { x: tArr, y: eExact, type: 'scatter', mode: 'lines',
              name: 'Exact E/E₀', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: tArr, y: eRatio, type: 'scatter', mode: 'lines',
              name: 'Euler E/E₀', line: { color: '#ff6b6b', width: 2 } },
            { x: [0, tMax], y: [1, 1], type: 'scatter', mode: 'lines',
              name: 'Initial', line: { color: '#ffff00', width: 1, dash: 'dot' },
              showlegend: false }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, tMax], 'τ'),
            yaxis: axStyle([0, Math.max(2, Math.max.apply(null, eRatio) * 1.1)], 'E(t)/E(0)'),
            showlegend: true,
            legend: { x: 0.4, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Compute energy drift at t=10
        var idxT10 = Math.min(Math.round(10 / h), sol.t.length - 1);
        var drift = eRatio[idxT10] - eExact[idxT10];
        var driftPct = (drift / eExact[Math.max(0, idxT10)] * 100);

        var el;
        el = document.getElementById('dampMech-euler-h');
        if (el) el.textContent = h.toFixed(2);
        el = document.getElementById('dampMech-euler-maxErr');
        if (el) el.textContent = maxErr.toExponential(2);
        el = document.getElementById('dampMech-euler-drift');
        if (el) el.textContent = (isFinite(driftPct) ? driftPct.toFixed(1) : '>999') + '%';
    }

    // ===== Event handlers =====
    function attachHandlers() {
        // Explorer 1
        var ids1 = ['dampMech-m-slider', 'dampMech-k-slider', 'dampMech-b-slider', 'dampMech-h-slider'];
        var labs1 = ['dampMech-m-value', 'dampMech-k-value', 'dampMech-b-value', 'dampMech-h-value'];
        var decs1 = [1, 1, 1, 3];
        for (var i = 0; i < ids1.length; i++) {
            (function(sid, lid, dec) {
                var el = document.getElementById(sid);
                if (el) el.addEventListener('input', function() {
                    document.getElementById(lid).textContent = parseFloat(this.value).toFixed(dec);
                    plotSim();
                });
            })(ids1[i], labs1[i], decs1[i]);
        }

        // Explorer 2
        var crossS = document.getElementById('dampMech-cross-w-slider');
        if (crossS) crossS.addEventListener('input', function() {
            document.getElementById('dampMech-cross-w-value').textContent = parseFloat(this.value).toFixed(1);
            plotCross();
        });

        // Explorer 3
        var ids3 = ['dampMech-euler-w-slider', 'dampMech-euler-h-slider'];
        var labs3 = ['dampMech-euler-w-value', 'dampMech-euler-h-value'];
        var decs3 = [1, 2];
        for (var i = 0; i < ids3.length; i++) {
            (function(sid, lid, dec) {
                var el = document.getElementById(sid);
                if (el) el.addEventListener('input', function() {
                    document.getElementById(lid).textContent = parseFloat(this.value).toFixed(dec);
                    plotEulerLimits();
                });
            })(ids3[i], labs3[i], decs3[i]);
        }
    }

    // ===== Global reset functions =====
    window.dampMechSimReset = function() {
        var defs = { 'dampMech-m-slider': 1.0, 'dampMech-k-slider': 4.0,
                     'dampMech-b-slider': 1.0, 'dampMech-h-slider': 0.02 };
        var labs = { 'dampMech-m-slider': 'dampMech-m-value', 'dampMech-k-slider': 'dampMech-k-value',
                     'dampMech-b-slider': 'dampMech-b-value', 'dampMech-h-slider': 'dampMech-h-value' };
        var decs = { 'dampMech-m-slider': 1, 'dampMech-k-slider': 1,
                     'dampMech-b-slider': 1, 'dampMech-h-slider': 3 };
        for (var id in defs) {
            document.getElementById(id).value = defs[id];
            document.getElementById(labs[id]).textContent = defs[id].toFixed(decs[id]);
        }
        plotSim();
    };

    window.dampMechCrossReset = function() {
        document.getElementById('dampMech-cross-w-slider').value = 5.0;
        document.getElementById('dampMech-cross-w-value').textContent = '5.0';
        plotCross();
    };

    window.dampMechEulerReset = function() {
        document.getElementById('dampMech-euler-w-slider').value = 10.0;
        document.getElementById('dampMech-euler-h-slider').value = 0.10;
        document.getElementById('dampMech-euler-w-value').textContent = '10.0';
        document.getElementById('dampMech-euler-h-value').textContent = '0.10';
        plotEulerLimits();
    };

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }
        var el = document.getElementById('dampMech-timePlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }
        plotSim();
        plotCross();
        plotEulerLimits();
        attachHandlers();
    }

    initializePlots();
})();
