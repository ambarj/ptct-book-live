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

    // ===== ODE library =====
    // Each entry: { f, exact (or null), x0, tMax, label, yRange }
    var odes = [
        {
            f: function(x) { return -2 * x; },
            exact: function(t) { return Math.exp(-2 * t); },
            x0: 1, tMax: 3,
            label: 'dx/dt = -2x',
            yRange: [-0.5, 1.2]
        },
        {
            f: function(x, t) { return t * t; },
            exact: function(t) { return t * t * t / 3; },
            x0: 0, tMax: 3,
            label: 'dx/dt = t²',
            yRange: [-1, 10]
        },
        {
            f: function(x) { return -Math.sin(x); },
            exact: null,  // no closed form — compute reference
            x0: 2, tMax: 6,
            label: 'dx/dt = -sin(x)',
            yRange: [-0.5, 2.5]
        }
    ];

    // Reference solution for nonlinear ODE (tiny h)
    function computeReference(ode) {
        var h = 0.002;
        var n = Math.round(ode.tMax / h);
        var t = [0], x = [ode.x0];
        var xi = ode.x0, ti = 0;
        for (var i = 0; i < n; i++) {
            xi = xi + h * ode.f(xi, ti);
            ti += h;
            t.push(ti);
            x.push(xi);
        }
        return { t: t, x: x };
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
        }
        return { t: t, x: x };
    }

    // ===== Explorer 1: Tangent-to-formula =====
    var tangentState = { step: 0, maxSteps: 0, data: [] };

    function computeTangentData() {
        var h = parseFloat(document.getElementById('euler-h-slider').value);
        var ode = odes[0]; // dx/dt = -2x
        var n = Math.round(ode.tMax / h);
        tangentState.maxSteps = n;
        tangentState.step = 0;
        tangentState.data = [];

        var xi = ode.x0, ti = 0;
        for (var i = 0; i <= n; i++) {
            var fi = ode.f(xi, ti);
            var xNext = xi + h * fi;
            tangentState.data.push({
                t: ti, x: xi, f: fi, xNext: xNext
            });
            xi = xNext;
            ti += h;
        }
    }

    function plotTangent() {
        var ode = odes[0];
        var h = parseFloat(document.getElementById('euler-h-slider').value);
        var step = tangentState.step;

        // Exact curve
        var tEx = [], xEx = [];
        for (var i = 0; i <= 300; i++) {
            var t = ode.tMax * i / 300;
            tEx.push(t);
            xEx.push(ode.exact(t));
        }

        var traces = [{
            x: tEx, y: xEx,
            type: 'scatter', mode: 'lines',
            name: 'Exact: exp(-2t)',
            line: { color: '#808080', width: 2, dash: 'dash' }
        }];

        // Euler path up to current step
        if (step > 0) {
            var pathT = [], pathX = [];
            for (var i = 0; i <= step; i++) {
                pathT.push(tangentState.data[i].t);
                pathX.push(tangentState.data[i].x);
            }
            traces.push({
                x: pathT, y: pathX,
                type: 'scatter', mode: 'lines+markers',
                name: 'Euler path',
                line: { color: '#00f3ff', width: 2.5 },
                marker: { color: '#00f3ff', size: 7 }
            });
        } else {
            // Just the initial point
            traces.push({
                x: [0], y: [ode.x0],
                type: 'scatter', mode: 'markers',
                name: 'Start',
                marker: { color: '#00f3ff', size: 8 }
            });
        }

        // Current tangent line (if not at the end)
        if (step < tangentState.maxSteps) {
            var d = tangentState.data[step];
            // Extend tangent beyond the step for visual context
            var tStart = d.t - 0.1;
            var tEnd = d.t + h + 0.1;
            traces.push({
                x: [tStart, tEnd],
                y: [d.x + d.f * (tStart - d.t), d.x + d.f * (tEnd - d.t)],
                type: 'scatter', mode: 'lines',
                name: 'Tangent line',
                line: { color: '#ffff00', width: 1.5, dash: 'dot' }
            });
        }

        var layout = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, ode.tMax], 't'),
            yaxis: axStyle(ode.yRange, 'x(t)'),
            showlegend: true,
            legend: { x: 0.5, y: 0.99, bgcolor: 'rgba(0,0,0,0.5)' }
        });

        Plotly.newPlot('euler-tangent-plot', traces, layout, { responsive: true });
        updateTable();
        updateTangentButtons();
    }

    function updateTable() {
        var step = tangentState.step;
        var tbody = document.getElementById('euler-table-body');
        if (!tbody) return;
        var rows = '';
        for (var i = 0; i <= Math.min(step, tangentState.maxSteps - 1); i++) {
            var d = tangentState.data[i];
            var highlight = (i === step - 1) ? ' style="background: rgba(0,243,255,0.12);"' : '';
            rows += '<tr' + highlight + '>' +
                '<td style="padding:0.3rem;text-align:center;">' + i + '</td>' +
                '<td style="padding:0.3rem;text-align:center;">' + d.t.toFixed(2) + '</td>' +
                '<td style="padding:0.3rem;text-align:center;">' + d.x.toFixed(4) + '</td>' +
                '<td style="padding:0.3rem;text-align:center;">' + d.f.toFixed(4) + '</td>' +
                '<td style="padding:0.3rem;text-align:center;">' + d.xNext.toFixed(4) + '</td>' +
                '</tr>';
        }
        // Show current row (waiting to step)
        if (step <= tangentState.maxSteps && step < tangentState.data.length) {
            var d = tangentState.data[step];
            if (step > 0 || rows === '') {
                var isCurrent = (step > 0);
                rows += '<tr style="color: #ffff00;">' +
                    '<td style="padding:0.3rem;text-align:center;">' + step + '</td>' +
                    '<td style="padding:0.3rem;text-align:center;">' + d.t.toFixed(2) + '</td>' +
                    '<td style="padding:0.3rem;text-align:center;">' + d.x.toFixed(4) + '</td>' +
                    '<td style="padding:0.3rem;text-align:center;">' + d.f.toFixed(4) + '</td>' +
                    '<td style="padding:0.3rem;text-align:center;">?</td>' +
                    '</tr>';
            }
        }
        tbody.innerHTML = rows;
    }

    function updateTangentButtons() {
        var prev = document.getElementById('euler-prev-btn');
        var next = document.getElementById('euler-next-btn');
        if (prev) prev.disabled = (tangentState.step === 0);
        if (next) next.disabled = (tangentState.step >= tangentState.maxSteps);
    }

    // ===== Explorer 2: Step Size Showdown =====
    function plotShowdown() {
        var ode = odes[0];
        var hValues = [1.0, 0.5, 0.2, 0.05];
        var colors = ['#ff6b6b', '#ffff00', '#ff00ff', '#00f3ff'];

        // Exact
        var tEx = [], xEx = [];
        for (var i = 0; i <= 300; i++) {
            var t = ode.tMax * i / 300;
            tEx.push(t);
            xEx.push(ode.exact(t));
        }

        var traces = [{
            x: tEx, y: xEx,
            type: 'scatter', mode: 'lines',
            name: 'Exact',
            line: { color: '#808080', width: 2, dash: 'dash' }
        }];

        for (var j = 0; j < hValues.length; j++) {
            var sol = eulerSolve(ode.f, ode.x0, ode.tMax, hValues[j]);
            var finalErr = Math.abs(sol.x[sol.x.length - 1] - ode.exact(sol.t[sol.t.length - 1]));

            traces.push({
                x: sol.t, y: sol.x,
                type: 'scatter', mode: 'lines+markers',
                name: 'h=' + hValues[j],
                line: { color: colors[j], width: 2 },
                marker: { size: hValues[j] > 0.1 ? 5 : 2 }
            });

            var errEl = document.getElementById('euler-err-' + (j + 1));
            if (errEl) errEl.textContent = finalErr.toFixed(4);
        }

        var layout = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, ode.tMax], 't'),
            yaxis: axStyle(ode.yRange, 'x(t)'),
            showlegend: true,
            legend: { x: 0.5, y: 0.99, bgcolor: 'rgba(0,0,0,0.5)' }
        });

        Plotly.newPlot('euler-showdown-plot', traces, layout, { responsive: true });
    }

    // ===== Explorer 3: Euler Lab =====
    var sinRef = null; // cached reference for nonlinear ODE

    function plotLab() {
        var idx = parseInt(document.getElementById('euler-lab-ode').value);
        var h = parseFloat(document.getElementById('euler-lab-h').value);
        var ode = odes[idx];

        var sol = eulerSolve(ode.f, ode.x0, ode.tMax, h);

        // Reference / exact
        var refT = [], refX = [];
        if (ode.exact) {
            for (var i = 0; i <= 500; i++) {
                var t = ode.tMax * i / 500;
                refT.push(t);
                refX.push(ode.exact(t));
            }
        } else {
            // Use cached reference
            if (!sinRef) sinRef = computeReference(ode);
            refT = sinRef.t;
            refX = sinRef.x;
        }

        // Final error
        var refFinal;
        if (ode.exact) {
            refFinal = ode.exact(sol.t[sol.t.length - 1]);
        } else {
            // Interpolate from reference
            var tF = sol.t[sol.t.length - 1];
            refFinal = interpRef(sinRef, tF);
        }
        var finalErr = Math.abs(sol.x[sol.x.length - 1] - refFinal);

        var traces = [
            {
                x: refT, y: refX,
                type: 'scatter', mode: 'lines',
                name: 'Exact / Reference',
                line: { color: '#808080', width: 2, dash: 'dash' }
            },
            {
                x: sol.t, y: sol.x,
                type: 'scatter', mode: 'lines+markers',
                name: 'Euler (h=' + h.toFixed(2) + ')',
                line: { color: '#00f3ff', width: 2 },
                marker: { size: h > 0.1 ? 5 : 2 }
            }
        ];

        var layout = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, ode.tMax], 't'),
            yaxis: axStyle(ode.yRange, 'x(t)'),
            showlegend: true,
            legend: { x: 0.4, y: 0.99, bgcolor: 'rgba(0,0,0,0.5)' }
        });

        Plotly.newPlot('euler-lab-plot', traces, layout, { responsive: true });

        var errEl = document.getElementById('euler-lab-error');
        if (errEl) errEl.textContent = finalErr.toFixed(5);
        var stepsEl = document.getElementById('euler-lab-steps');
        if (stepsEl) stepsEl.textContent = (sol.t.length - 1);
    }

    function interpRef(ref, tTarget) {
        for (var i = 0; i < ref.t.length - 1; i++) {
            if (ref.t[i] <= tTarget && ref.t[i + 1] >= tTarget) {
                var frac = (tTarget - ref.t[i]) / (ref.t[i + 1] - ref.t[i]);
                return ref.x[i] + frac * (ref.x[i + 1] - ref.x[i]);
            }
        }
        return ref.x[ref.x.length - 1];
    }

    // ===== Event handlers =====
    function attachHandlers() {
        var hSlider = document.getElementById('euler-h-slider');
        if (hSlider) {
            hSlider.addEventListener('input', function() {
                document.getElementById('euler-h-value').textContent =
                    parseFloat(this.value).toFixed(2);
                computeTangentData();
                plotTangent();
            });
        }

        var labOde = document.getElementById('euler-lab-ode');
        if (labOde) {
            labOde.addEventListener('change', plotLab);
        }

        var labH = document.getElementById('euler-lab-h');
        if (labH) {
            labH.addEventListener('input', function() {
                document.getElementById('euler-lab-h-value').textContent =
                    parseFloat(this.value).toFixed(2);
                plotLab();
            });
        }
    }

    // ===== Global functions (onclick) =====
    window.eulerFormulaNext = function() {
        if (tangentState.step < tangentState.maxSteps) {
            tangentState.step++;
            plotTangent();
        }
    };

    window.eulerFormulaBack = function() {
        if (tangentState.step > 0) {
            tangentState.step--;
            plotTangent();
        }
    };

    window.eulerFormulaReset = function() {
        computeTangentData();
        plotTangent();
    };

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }

        var el = document.getElementById('euler-tangent-plot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        computeTangentData();
        plotTangent();
        plotShowdown();
        plotLab();
        attachHandlers();
    }

    initializePlots();
})();
