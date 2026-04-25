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

    // ===== Euler solver =====
    function eulerSolve(f, x0, tMax, h) {
        var t = [0], x = [x0];
        var xi = x0, ti = 0;
        var n = Math.round(tMax / h);
        for (var i = 0; i < n; i++) {
            xi = xi + h * f(xi, ti);
            ti += h;
            t.push(ti);
            x.push(xi);
            if (Math.abs(xi) > 1e8) break;
        }
        return { t: t, x: x };
    }

    // ===== Test ODEs with exact solutions =====
    var testOdes = [
        {
            f: function(x) { return -2 * x; },
            exact: function(t) { return Math.exp(-2 * t); },
            x0: 1, tMax: 3,
            label: 'dx/dt = -2x',
            yRange: [-0.3, 1.3],
            errRange: null
        },
        {
            f: function(x) { return x; },
            exact: function(t) { return Math.exp(t); },
            x0: 1, tMax: 3,
            label: 'dx/dt = x',
            yRange: [-1, 22],
            errRange: null
        },
        {
            f: function(x, t) { return Math.cos(t); },
            exact: function(t) { return Math.sin(t); },
            x0: 0, tMax: 6,
            label: 'dx/dt = cos(t)',
            yRange: [-1.5, 1.5],
            errRange: null
        }
    ];

    // ===== Explorer 1: Solution Comparator =====
    function plotCompare() {
        var idx = parseInt(document.getElementById('eulerVal-compare-ode').value);
        var h = parseFloat(document.getElementById('eulerVal-compare-h-slider').value);
        var ode = testOdes[idx];

        var sol = eulerSolve(ode.f, ode.x0, ode.tMax, h);

        // Exact
        var tEx = [], xEx = [];
        for (var i = 0; i <= 500; i++) {
            var t = ode.tMax * i / 500;
            tEx.push(t); xEx.push(ode.exact(t));
        }

        // Error at each step
        var errT = [], errY = [];
        var maxErr = 0;
        for (var i = 0; i < sol.t.length; i++) {
            var e = Math.abs(sol.x[i] - ode.exact(sol.t[i]));
            errT.push(sol.t[i]);
            errY.push(e);
            if (e > maxErr) maxErr = e;
        }
        var finalErr = errY[errY.length - 1];

        // Left: solution comparison
        Plotly.newPlot('eulerVal-comparePlot', [
            { x: tEx, y: xEx, type: 'scatter', mode: 'lines', name: 'Exact', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: sol.t, y: sol.x, type: 'scatter', mode: 'lines+markers', name: 'Euler (h=' + h.toFixed(2) + ')', line: { color: '#00f3ff', width: 2 }, marker: { size: sol.t.length > 50 ? 2 : 5 } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, ode.tMax], 't'),
            yaxis: axStyle(ode.yRange, 'x(t)'),
            showlegend: true,
            legend: { x: 0.4, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: residual
        Plotly.newPlot('eulerVal-residualPlot', [{
            x: errT, y: errY,
            type: 'scatter', mode: 'lines',
            name: '|Error|',
            line: { color: '#ff6b6b', width: 2 },
            fill: 'tozeroy',
            fillcolor: 'rgba(255,107,107,0.15)'
        }], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, ode.tMax], 't'),
            yaxis: axStyle([0, maxErr * 1.3], '|Error|'),
            showlegend: false
        }), { responsive: true });

        // Stats
        var el1 = document.getElementById('eulerVal-maxErr');
        var el2 = document.getElementById('eulerVal-finalErr');
        var el3 = document.getElementById('eulerVal-steps');
        if (el1) el1.textContent = maxErr.toExponential(2);
        if (el2) el2.textContent = finalErr.toExponential(2);
        if (el3) el3.textContent = sol.t.length - 1;
    }

    // ===== Explorer 2: Error Analyzer (4 h values) =====
    function plotMulti() {
        var idx = parseInt(document.getElementById('eulerVal-multi-ode').value);
        var ode = testOdes[idx];
        var hValues = [0.50, 0.25, 0.10, 0.05];
        var colors = ['#ff6b6b', '#ffff00', '#ff00ff', '#00f3ff'];

        // Exact
        var tEx = [], xEx = [];
        for (var i = 0; i <= 500; i++) {
            var t = ode.tMax * i / 500;
            tEx.push(t); xEx.push(ode.exact(t));
        }

        var traces1 = [{ x: tEx, y: xEx, type: 'scatter', mode: 'lines', name: 'Exact', line: { color: '#808080', width: 2, dash: 'dash' } }];
        var traces2 = [];
        var maxErrAll = 0;

        for (var j = 0; j < hValues.length; j++) {
            var sol = eulerSolve(ode.f, ode.x0, ode.tMax, hValues[j]);

            traces1.push({
                x: sol.t, y: sol.x,
                type: 'scatter', mode: 'lines+markers',
                name: 'h=' + hValues[j].toFixed(2),
                line: { color: colors[j], width: 1.5 },
                marker: { size: hValues[j] > 0.15 ? 4 : 2 }
            });

            // Error trace
            var errT = [], errY = [];
            for (var i = 0; i < sol.t.length; i++) {
                var e = Math.abs(sol.x[i] - ode.exact(sol.t[i]));
                errT.push(sol.t[i]); errY.push(e);
                if (e > maxErrAll) maxErrAll = e;
            }

            traces2.push({
                x: errT, y: errY,
                type: 'scatter', mode: 'lines',
                name: 'h=' + hValues[j].toFixed(2),
                line: { color: colors[j], width: 2 }
            });

            // Final error stat
            var errEl = document.getElementById('eulerVal-err' + (j + 1));
            if (errEl) errEl.textContent = errY[errY.length - 1].toExponential(2);
        }

        Plotly.newPlot('eulerVal-multiPlot', traces1, Object.assign({}, darkLayout, {
            xaxis: axStyle([0, ode.tMax], 't'),
            yaxis: axStyle(ode.yRange, 'x(t)'),
            showlegend: true,
            legend: { x: 0.5, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        Plotly.newPlot('eulerVal-multiErrPlot', traces2, Object.assign({}, darkLayout, {
            xaxis: axStyle([0, ode.tMax], 't'),
            yaxis: axStyle([0, maxErrAll * 1.2], '|Error|'),
            showlegend: true,
            legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });
    }

    // ===== Explorer 3: Convergence Tester =====
    function plotConverge() {
        var idx = parseInt(document.getElementById('eulerVal-converge-ode').value);
        var tEval = parseFloat(document.getElementById('eulerVal-converge-t-slider').value);
        var ode = testOdes[idx];

        // Clamp tEval to tMax
        if (tEval > ode.tMax) tEval = ode.tMax;

        var hValues = [0.5, 0.25, 0.125, 0.0625, 0.03125, 0.015625];
        var errors = [];
        var exactVal = ode.exact(tEval);

        for (var j = 0; j < hValues.length; j++) {
            var sol = eulerSolve(ode.f, ode.x0, tEval, hValues[j]);
            // Find value closest to tEval
            var lastX = sol.x[sol.x.length - 1];
            errors.push(Math.abs(lastX - exactVal));
        }

        // Left: log-log convergence
        // Reference O(h) line through first point
        var refLine = [];
        for (var j = 0; j < hValues.length; j++) {
            refLine.push(errors[0] * hValues[j] / hValues[0]);
        }

        Plotly.newPlot('eulerVal-convergePlot', [
            {
                x: hValues, y: errors,
                type: 'scatter', mode: 'lines+markers',
                name: 'Euler error',
                line: { color: '#00f3ff', width: 2.5 },
                marker: { size: 8 }
            },
            {
                x: hValues, y: refLine,
                type: 'scatter', mode: 'lines',
                name: 'O(h) reference',
                line: { color: '#ffff00', width: 1.5, dash: 'dash' }
            }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle(null, 'h (step size)'), { type: 'log' }),
            yaxis: Object.assign(axStyle(null, '|Error at t=' + tEval.toFixed(1) + '|'), { type: 'log' }),
            showlegend: true,
            legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: measured slope (bar chart of local slopes)
        var slopes = [];
        var slopeLabels = [];
        for (var j = 1; j < hValues.length; j++) {
            var s = Math.log(errors[j] / errors[j - 1]) / Math.log(hValues[j] / hValues[j - 1]);
            slopes.push(s);
            slopeLabels.push(hValues[j - 1].toFixed(3) + '→' + hValues[j].toFixed(3));
        }

        Plotly.newPlot('eulerVal-slopePlot', [
            {
                x: slopeLabels, y: slopes,
                type: 'bar',
                marker: { color: slopes.map(function(s) { return Math.abs(s - 1) < 0.2 ? '#00ff9f' : '#ff6b6b'; }) }
            },
            {
                x: [slopeLabels[0], slopeLabels[slopeLabels.length - 1]],
                y: [1, 1],
                type: 'scatter', mode: 'lines',
                name: 'Expected (p=1)',
                line: { color: '#ffff00', width: 2, dash: 'dash' }
            }
        ], Object.assign({}, darkLayout, {
            xaxis: { gridcolor: '#2a2f4a', linecolor: '#808080', title: 'h range', tickangle: -30, tickfont: { size: 10 } },
            yaxis: axStyle([0, 2], 'Measured slope p'),
            showlegend: false,
            bargap: 0.3
        }), { responsive: true });
    }

    // ===== Event handlers =====
    function attachHandlers() {
        // Explorer 1
        var compareOde = document.getElementById('eulerVal-compare-ode');
        if (compareOde) compareOde.addEventListener('change', plotCompare);

        var compareH = document.getElementById('eulerVal-compare-h-slider');
        if (compareH) compareH.addEventListener('input', function() {
            document.getElementById('eulerVal-compare-h-value').textContent = parseFloat(this.value).toFixed(2);
            plotCompare();
        });

        // Explorer 2
        var multiOde = document.getElementById('eulerVal-multi-ode');
        if (multiOde) multiOde.addEventListener('change', plotMulti);

        // Explorer 3
        var convergeOde = document.getElementById('eulerVal-converge-ode');
        if (convergeOde) convergeOde.addEventListener('change', plotConverge);

        var convergeT = document.getElementById('eulerVal-converge-t-slider');
        if (convergeT) convergeT.addEventListener('input', function() {
            document.getElementById('eulerVal-converge-t-value').textContent = parseFloat(this.value).toFixed(1);
            plotConverge();
        });
    }

    // ===== Global functions =====
    window.eulerValCompareReset = function() {
        var ode = document.getElementById('eulerVal-compare-ode');
        var hS = document.getElementById('eulerVal-compare-h-slider');
        if (ode) ode.value = '0';
        if (hS) { hS.value = 0.2; document.getElementById('eulerVal-compare-h-value').textContent = '0.20'; }
        plotCompare();
    };

    window.eulerValMultiReset = function() {
        var ode = document.getElementById('eulerVal-multi-ode');
        if (ode) ode.value = '0';
        plotMulti();
    };

    window.eulerValConvergeReset = function() {
        var ode = document.getElementById('eulerVal-converge-ode');
        var tS = document.getElementById('eulerVal-converge-t-slider');
        if (ode) ode.value = '0';
        if (tS) { tS.value = 2.0; document.getElementById('eulerVal-converge-t-value').textContent = '2.0'; }
        plotConverge();
    };

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }

        var el = document.getElementById('eulerVal-comparePlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        plotCompare();
        plotMulti();
        plotConverge();
        attachHandlers();
    }

    initializePlots();
})();
