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

    // ===== Exact solutions =====
    function exactSolution(w, tArr) {
        var Q = [], I = [];
        if (w > 0.25) {
            // Underdamped
            var beta = Math.sqrt(w - 0.25);
            for (var i = 0; i < tArr.length; i++) {
                var t = tArr[i];
                var env = Math.exp(-t / 2);
                var cb = Math.cos(beta * t);
                var sb = Math.sin(beta * t);
                Q.push(env * (cb + sb / (2 * beta)));
                I.push(-(w / beta) * env * sb);
            }
        } else if (Math.abs(w - 0.25) < 0.005) {
            // Critical damping
            for (var i = 0; i < tArr.length; i++) {
                var t = tArr[i];
                var env = Math.exp(-t / 2);
                Q.push((1 + t / 2) * env);
                I.push(-t / 4 * env);
            }
        } else {
            // Overdamped
            var alpha = Math.sqrt(0.25 - w);
            var lam1 = -0.5 + alpha;
            var lam2 = -0.5 - alpha;
            var A = 0.5 + 1 / (4 * alpha);
            var B = 0.5 - 1 / (4 * alpha);
            for (var i = 0; i < tArr.length; i++) {
                var t = tArr[i];
                var e1 = Math.exp(lam1 * t);
                var e2 = Math.exp(lam2 * t);
                Q.push(A * e1 + B * e2);
                I.push(A * lam1 * e1 + B * lam2 * e2);
            }
        }
        return { Q: Q, I: I };
    }

    function getRegime(w) {
        if (w > 0.26) return 'Underdamped';
        if (w >= 0.24) return 'Critical';
        return 'Overdamped';
    }

    // ===== Explorer 1: LCR Simulator =====
    function plotSim() {
        var w = parseFloat(document.getElementById('lcr-w-slider').value);
        var h = parseFloat(document.getElementById('lcr-h-slider').value);
        var tMax = 15;

        var f = function(y) { return [y[1], -w * y[0] - y[1]]; };
        var sol = eulerSystem(f, [1, 0], tMax, h);

        var tArr = sol.t;
        var Qa = [], Ia = [];
        for (var i = 0; i < sol.Y.length; i++) {
            Qa.push(sol.Y[i][0]);
            Ia.push(sol.Y[i][1]);
        }

        // Exact solution
        var exact = exactSolution(w, tArr);

        // Max error
        var maxErr = 0;
        for (var i = 0; i < tArr.length; i++) {
            var e = Math.abs(Qa[i] - exact.Q[i]);
            if (e > maxErr) maxErr = e;
        }

        // Left: time series
        Plotly.newPlot('lcr-timePlot', [
            { x: tArr, y: exact.Q, type: 'scatter', mode: 'lines',
              name: 'Exact Q', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: tArr, y: Qa, type: 'scatter', mode: 'lines',
              name: 'Euler Q', line: { color: '#00f3ff', width: 2 } },
            { x: tArr, y: Ia, type: 'scatter', mode: 'lines',
              name: 'Euler I', line: { color: '#ff6b6b', width: 1.5 } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, tMax], 't (dimensionless)'),
            yaxis: axStyle([-1.2, 1.2], 'Q, I'),
            showlegend: true,
            legend: { x: 0.5, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: phase portrait
        Plotly.newPlot('lcr-phasePlot', [
            { x: exact.Q, y: exact.I, type: 'scatter', mode: 'lines',
              name: 'Exact', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: Qa, y: Ia, type: 'scatter', mode: 'lines',
              name: 'Euler', line: { color: '#00ff9f', width: 2 } },
            { x: [1], y: [0], type: 'scatter', mode: 'markers',
              name: 'Start', marker: { color: '#ffff00', size: 10, symbol: 'star' } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-1.5, 1.5], 'Q'),
            yaxis: axStyle([-4, 4], 'I'),
            showlegend: true,
            legend: { x: 0.6, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Stats
        var regime = getRegime(w);
        var period = w > 0.25 ? (2 * Math.PI / Math.sqrt(w - 0.25)).toFixed(2) : 'N/A';
        var decay = '2.00'; // decay time is always 2 (envelope e^(-t/2))

        var el;
        el = document.getElementById('lcr-regime');
        if (el) el.textContent = regime;
        el = document.getElementById('lcr-period');
        if (el) el.textContent = period;
        el = document.getElementById('lcr-decay');
        if (el) el.textContent = decay;
        el = document.getElementById('lcr-maxErr');
        if (el) el.textContent = maxErr.toExponential(2);
    }

    // ===== Explorer 2: Regime Explorer =====
    function plotRegime() {
        var w = parseFloat(document.getElementById('lcr-regime-w-slider').value);
        var tMax = 15;

        var f = function(y) { return [y[1], -w * y[0] - y[1]]; };
        var sol = eulerSystem(f, [1, 0], tMax, 0.01);

        var tArr = sol.t;
        var Qa = [];
        for (var i = 0; i < sol.Y.length; i++) {
            Qa.push(sol.Y[i][0]);
        }

        // Color based on regime
        var color = '#00f3ff';
        var regime = getRegime(w);
        if (regime === 'Overdamped') color = '#ff6b6b';
        else if (regime === 'Critical') color = '#ffff00';

        // Also plot critical reference
        var exactCrit = exactSolution(0.25, tArr);

        // Left: Q(t)
        Plotly.newPlot('lcr-regimePlot', [
            { x: tArr, y: exactCrit.Q, type: 'scatter', mode: 'lines',
              name: 'Critical (w=0.25)', line: { color: '#ffff00', width: 1.5, dash: 'dot' } },
            { x: tArr, y: Qa, type: 'scatter', mode: 'lines',
              name: regime + ' (w=' + w.toFixed(2) + ')',
              line: { color: color, width: 2.5 } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, tMax], 't'),
            yaxis: axStyle([-0.6, 1.1], 'Q(t)'),
            showlegend: true,
            legend: { x: 0.4, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: bar chart comparing settling times for 3 regimes
        var wVals = [0.10, 0.25, w > 0.26 ? w : 2.0];
        var names = ['Overdamped', 'Critical', 'Underdamped'];
        var colors = ['#ff6b6b', '#ffff00', '#00f3ff'];
        var settleVals = [];

        for (var j = 0; j < wVals.length; j++) {
            var fj = function(y) { return [y[1], -wVals[j] * y[0] - y[1]]; };
            // Use closure properly
            var solJ = eulerSystem(
                (function(ww) { return function(y) { return [y[1], -ww * y[0] - y[1]]; }; })(wVals[j]),
                [1, 0], tMax, 0.01
            );
            // Find settling time (|Q| < 0.01)
            var settleT = tMax;
            for (var k = solJ.t.length - 1; k >= 0; k--) {
                if (Math.abs(solJ.Y[k][0]) > 0.01) {
                    settleT = solJ.t[Math.min(k + 1, solJ.t.length - 1)];
                    break;
                }
            }
            settleVals.push(settleT);
        }

        // If current w is underdamped, update the third bar
        if (w > 0.26) {
            names[2] = 'w=' + w.toFixed(2);
        }

        Plotly.newPlot('lcr-regimeBarPlot', [{
            x: names, y: settleVals,
            type: 'bar',
            marker: { color: colors },
            text: settleVals.map(function(v) { return v.toFixed(1); }),
            textposition: 'outside',
            textfont: { color: '#ccc' }
        }], Object.assign({}, darkLayout, {
            xaxis: { gridcolor: '#2a2f4a', linecolor: '#808080' },
            yaxis: axStyle([0, tMax], 'Settling time'),
            showlegend: false
        }), { responsive: true });

        // Stats
        var el;
        el = document.getElementById('lcr-regime-w');
        if (el) el.textContent = w.toFixed(2);
        el = document.getElementById('lcr-regime-type');
        if (el) el.textContent = regime;

        // Settling time for current w
        var settleW = settleVals[regime === 'Overdamped' ? 0 : (regime === 'Critical' ? 1 : 2)];
        el = document.getElementById('lcr-regime-settle');
        if (el) el.textContent = settleW.toFixed(1);
    }

    // ===== Explorer 3: Energy Tracker =====
    function plotEnergy() {
        var w = parseFloat(document.getElementById('lcr-energy-w-slider').value);
        var tMax = 15;
        var h = 0.01;

        var f = function(y) { return [y[1], -w * y[0] - y[1]]; };
        var sol = eulerSystem(f, [1, 0], tMax, h);

        var tArr = sol.t;
        var eC = [], eL = [], eTotal = [], eDiss = [];
        var cumDiss = 0;
        var peakL = 0;

        for (var i = 0; i < sol.Y.length; i++) {
            var Q = sol.Y[i][0], I = sol.Y[i][1];
            var ec = 0.5 * w * Q * Q;
            var el = 0.5 * I * I;
            eC.push(ec);
            eL.push(el);
            eTotal.push(ec + el);
            if (i > 0) cumDiss += I * I * h;
            eDiss.push(cumDiss);
            if (el > peakL) peakL = el;
        }

        var initE = 0.5 * w;

        // Left: energy components
        Plotly.newPlot('lcr-energyPlot', [
            { x: tArr, y: eC, type: 'scatter', mode: 'lines', name: 'Capacitor',
              line: { color: '#00f3ff', width: 2 }, fill: 'tozeroy',
              fillcolor: 'rgba(0,243,255,0.15)' },
            { x: tArr, y: eL, type: 'scatter', mode: 'lines', name: 'Inductor',
              line: { color: '#ff00ff', width: 2 }, fill: 'tozeroy',
              fillcolor: 'rgba(255,0,255,0.15)' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, tMax], 't'),
            yaxis: axStyle([0, initE * 1.1], 'Energy'),
            showlegend: true,
            legend: { x: 0.5, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: total stored + dissipated
        Plotly.newPlot('lcr-energyTotalPlot', [
            { x: tArr, y: eTotal, type: 'scatter', mode: 'lines',
              name: 'Stored (C+L)', line: { color: '#ffff00', width: 2 } },
            { x: tArr, y: eDiss, type: 'scatter', mode: 'lines',
              name: 'Dissipated (R)', line: { color: '#ff6b6b', width: 2, dash: 'dash' } },
            { x: [0, tMax], y: [initE, initE], type: 'scatter', mode: 'lines',
              name: 'Initial E', line: { color: '#808080', width: 1, dash: 'dot' } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, tMax], 't'),
            yaxis: axStyle([0, initE * 1.1], 'Energy'),
            showlegend: true,
            legend: { x: 0.3, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Stats
        var elStat;
        elStat = document.getElementById('lcr-energy-init');
        if (elStat) elStat.textContent = initE.toFixed(2);
        elStat = document.getElementById('lcr-energy-peakL');
        if (elStat) elStat.textContent = peakL.toFixed(3);
        elStat = document.getElementById('lcr-energy-dissipated');
        if (elStat) elStat.textContent = eDiss[eDiss.length - 1].toFixed(2);
    }

    // ===== Event handlers =====
    function attachHandlers() {
        // Explorer 1
        var wSlider = document.getElementById('lcr-w-slider');
        if (wSlider) wSlider.addEventListener('input', function() {
            document.getElementById('lcr-w-value').textContent = parseFloat(this.value).toFixed(1);
            plotSim();
        });
        var hSlider = document.getElementById('lcr-h-slider');
        if (hSlider) hSlider.addEventListener('input', function() {
            document.getElementById('lcr-h-value').textContent = parseFloat(this.value).toFixed(3);
            plotSim();
        });

        // Explorer 2
        var regSlider = document.getElementById('lcr-regime-w-slider');
        if (regSlider) regSlider.addEventListener('input', function() {
            document.getElementById('lcr-regime-w-value').textContent = parseFloat(this.value).toFixed(2);
            plotRegime();
        });

        // Explorer 3
        var enSlider = document.getElementById('lcr-energy-w-slider');
        if (enSlider) enSlider.addEventListener('input', function() {
            document.getElementById('lcr-energy-w-value').textContent = parseFloat(this.value).toFixed(1);
            plotEnergy();
        });
    }

    // ===== Global reset functions =====
    window.lcrSimReset = function() {
        document.getElementById('lcr-w-slider').value = 10;
        document.getElementById('lcr-h-slider').value = 0.02;
        document.getElementById('lcr-w-value').textContent = '10.0';
        document.getElementById('lcr-h-value').textContent = '0.020';
        plotSim();
    };

    window.lcrRegimeReset = function() {
        document.getElementById('lcr-regime-w-slider').value = 5.0;
        document.getElementById('lcr-regime-w-value').textContent = '5.00';
        plotRegime();
    };

    window.lcrEnergyReset = function() {
        document.getElementById('lcr-energy-w-slider').value = 5.0;
        document.getElementById('lcr-energy-w-value').textContent = '5.0';
        plotEnergy();
    };

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }

        var el = document.getElementById('lcr-timePlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        plotSim();
        plotRegime();
        plotEnergy();
        attachHandlers();
    }

    initializePlots();
})();
