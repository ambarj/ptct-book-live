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

    // ===== Scalar Euler solver (full trajectory, for Explorer 1 plots) =====
    function eulerScalar(f, y0, T, h) {
        var n = Math.round(T / h);
        var t = [0], y = [y0];
        var yi = y0, ti = 0;
        for (var i = 0; i < n; i++) {
            yi = yi + h * f(ti, yi);
            ti += h;
            t.push(ti);
            y.push(yi);
        }
        return { t: t, y: y };
    }

    // ===== Endpoint-only solvers (for convergence scans — no array storage) =====
    function eulerScalarEnd(f, y0, T, h) {
        var n = Math.round(T / h);
        var yi = y0, ti = 0;
        for (var i = 0; i < n; i++) {
            yi = yi + h * f(ti, yi);
            ti += h;
            if (!isFinite(yi)) return Infinity;
        }
        return yi;
    }

    function eulerSystemEnd(f, y0, T, h) {
        var n = Math.round(T / h);
        var y = y0.slice(), ti = 0;
        for (var i = 0; i < n; i++) {
            var dy = f(y, ti);
            y = [y[0] + h * dy[0], y[1] + h * dy[1]];
            ti += h;
            if (Math.abs(y[0]) > 1e10 || Math.abs(y[1]) > 1e10) break;
        }
        return y;
    }

    // ===== Test equations =====
    var equations = {
        decay: {
            f: function(t, y) { return -y; },
            exact: function(t) { return Math.exp(-t); },
            y0: 1.0,
            label: 'dy/dt = −y'
        },
        growth: {
            f: function(t, y) { return y; },
            exact: function(t) { return Math.exp(t); },
            y0: 1.0,
            label: 'dy/dt = y'
        },
        oscillator: {
            // System: dx/dt = v, dv/dt = -x  =>  exact x(t) = cos(t)
            fSys: function(y) { return [y[1], -y[0]]; },
            exact: function(t) { return Math.cos(t); },
            y0: [1, 0],
            label: 'ẍ = −x (SHO)'
        }
    };

    // ===== Damped oscillator for Explorer 3 =====
    // ẍ + ẋ + 4x = 0  =>  non-dim w = 4
    var dampedW = 4;
    function dampedF(y) { return [y[1], -dampedW * y[0] - y[1]]; }
    function dampedExact(t) {
        var beta = Math.sqrt(dampedW - 0.25);
        var env = Math.exp(-t / 2);
        return env * (Math.cos(beta * t) + Math.sin(beta * t) / (2 * beta));
    }

    // ===== Explorer 1: Error Dissection =====
    function plotDissect() {
        var logH = parseFloat(document.getElementById('practErr-h-slider').value);
        var h = Math.pow(10, logH);
        var T = parseFloat(document.getElementById('practErr-T-slider').value);

        var sol = eulerScalar(equations.decay.f, 1.0, T, h);
        var tArr = sol.t, yArr = sol.y;

        // Exact solution
        var yExact = [], errArr = [];
        var maxErr = 0;
        for (var i = 0; i < tArr.length; i++) {
            var ex = Math.exp(-tArr[i]);
            yExact.push(ex);
            var err = Math.abs(yArr[i] - ex);
            errArr.push(err);
            if (err > maxErr) maxErr = err;
        }

        var endErr = errArr[errArr.length - 1];

        // Left: solutions
        Plotly.newPlot('practErr-solPlot', [
            { x: tArr, y: yExact, type: 'scatter', mode: 'lines',
              name: 'Exact e⁻ᵗ', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: tArr, y: yArr, type: 'scatter', mode: 'lines',
              name: 'Euler', line: { color: '#00f3ff', width: 2 } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, T], 't'),
            yaxis: axStyle([-0.1, 1.1], 'y'),
            showlegend: true,
            legend: { x: 0.5, y: 0.95, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: error along trajectory
        Plotly.newPlot('practErr-errPlot', [
            { x: tArr, y: errArr, type: 'scatter', mode: 'lines',
              name: '|Error|', line: { color: '#ff6b6b', width: 2 } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, T], 't'),
            yaxis: axStyle(null, '|y_Euler − y_exact|'),
            showlegend: true,
            legend: { x: 0.05, y: 0.95, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Stats
        var nSteps = Math.round(T / h);
        setText('practErr-stat-h', h.toExponential(2));
        setText('practErr-stat-steps', nSteps.toLocaleString());
        setText('practErr-stat-maxErr', maxErr.toExponential(2));
        setText('practErr-stat-endErr', endErr.toExponential(2));
        setText('practErr-h-value', h.toExponential(1));
    }

    // ===== Explorer 2: Convergence Tester =====
    function plotConvergence() {
        var T = parseFloat(document.getElementById('practErr-conv-T-slider').value);
        var eqKey = document.getElementById('practErr-conv-eq-select').value;

        // Generate step sizes logarithmically from 1 to 1e-4
        var logHvals = [];
        for (var lh = 0; lh >= -4; lh -= 0.2) { logHvals.push(lh); }
        var hVals = logHvals.map(function(lh) { return Math.pow(10, lh); });

        var errors = [], richErrors = [];
        var isOsc = (eqKey === 'oscillator');

        for (var i = 0; i < hVals.length; i++) {
            var hv = hVals[i];
            var yEnd, yEndHalf, exactVal;

            if (isOsc) {
                yEnd = eulerSystemEnd(equations.oscillator.fSys, [1, 0], T, hv)[0];
                yEndHalf = eulerSystemEnd(equations.oscillator.fSys, [1, 0], T, hv / 2)[0];
                exactVal = Math.cos(T);
            } else {
                var eq = equations[eqKey];
                yEnd = eulerScalarEnd(eq.f, eq.y0, T, hv);
                yEndHalf = eulerScalarEnd(eq.f, eq.y0, T, hv / 2);
                exactVal = eq.exact(T);
            }

            var err = Math.abs(yEnd - exactVal);
            errors.push(err > 0 ? err : 1e-16);

            // Richardson extrapolation: p=1 for Euler
            var yRich = 2 * yEndHalf - yEnd;
            var richErr = Math.abs(yRich - exactVal);
            richErrors.push(richErr > 0 ? richErr : 1e-16);
        }

        // Find slope in the well-behaved region (h from 0.001 to 0.1)
        var slope = computeSlope(hVals, errors, 1e-3, 0.1);

        // Find optimal h (minimum error)
        var minIdx = 0, minErr = errors[0];
        for (var i = 1; i < errors.length; i++) {
            if (errors[i] < minErr) { minErr = errors[i]; minIdx = i; }
        }

        // Left: convergence plot
        var refLine = hVals.map(function(h) { return h * errors[5] / hVals[5]; });
        Plotly.newPlot('practErr-convPlot', [
            { x: hVals, y: errors, type: 'scatter', mode: 'markers+lines',
              name: 'Euler error', marker: { color: '#00f3ff', size: 6 },
              line: { color: '#00f3ff', width: 2 } },
            { x: hVals, y: refLine, type: 'scatter', mode: 'lines',
              name: 'O(h) reference', line: { color: '#808080', width: 1.5, dash: 'dash' } },
            { x: [hVals[minIdx]], y: [errors[minIdx]], type: 'scatter', mode: 'markers',
              name: 'Minimum', marker: { color: '#ffff00', size: 12, symbol: 'star' } }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle(null, 'Step size h'), { type: 'log' }),
            yaxis: Object.assign(axStyle(null, '|Error at t=T|'), { type: 'log' }),
            showlegend: true,
            legend: { x: 0.05, y: 0.95, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: Richardson improvement
        Plotly.newPlot('practErr-richPlot', [
            { x: hVals, y: errors, type: 'scatter', mode: 'markers+lines',
              name: 'Euler', marker: { color: '#00f3ff', size: 5 },
              line: { color: '#00f3ff', width: 1.5 } },
            { x: hVals, y: richErrors, type: 'scatter', mode: 'markers+lines',
              name: 'Richardson', marker: { color: '#00ff9f', size: 5 },
              line: { color: '#00ff9f', width: 2 } },
            { x: hVals, y: hVals.map(function(h) { return h * h * 0.5; }), type: 'scatter', mode: 'lines',
              name: 'O(h²) reference', line: { color: '#ff00ff', width: 1, dash: 'dot' } }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle(null, 'Step size h'), { type: 'log' }),
            yaxis: Object.assign(axStyle(null, '|Error|'), { type: 'log' }),
            showlegend: true,
            legend: { x: 0.05, y: 0.95, bgcolor: 'rgba(0,0,0,0.5)' },
            title: { text: 'Richardson Extrapolation', font: { size: 13, color: '#00ff9f' } }
        }), { responsive: true });

        // Stats
        setText('practErr-conv-slope', slope.toFixed(2));
        setText('practErr-conv-expected', '1 (Euler)');
        setText('practErr-conv-optH', hVals[minIdx].toExponential(1));
    }

    function computeSlope(hVals, errors, hMin, hMax) {
        // Compute log-log slope in the range [hMin, hMax]
        var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, n = 0;
        for (var i = 0; i < hVals.length; i++) {
            if (hVals[i] >= hMin && hVals[i] <= hMax && errors[i] > 0) {
                var lx = Math.log10(hVals[i]);
                var ly = Math.log10(errors[i]);
                sumX += lx; sumY += ly;
                sumXY += lx * ly; sumX2 += lx * lx;
                n++;
            }
        }
        if (n < 2) return 0;
        return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    // ===== Explorer 3: Step Size Advisor =====
    function plotAdvisor() {
        var targetDigits = parseInt(document.getElementById('practErr-adv-target-slider').value);
        var T = parseFloat(document.getElementById('practErr-adv-T-slider').value);
        var targetErr = Math.pow(10, -targetDigits);

        // Scan step sizes: 1 to 1e-4 (endpoint-only solver, no trajectory storage)
        var hScan = [];
        for (var lh = 0; lh >= -4; lh -= 0.1) { hScan.push(Math.pow(10, lh)); }

        var eulerErrors = [];
        var exVal = dampedExact(T);
        for (var i = 0; i < hScan.length; i++) {
            var yEnd = eulerSystemEnd(dampedF, [1, 0], T, hScan[i]);
            eulerErrors.push(Math.abs(yEnd[0] - exVal));
        }

        // Find h that achieves target for Euler (O(h))
        var eulerH = null, eulerSteps = null;
        for (var i = 0; i < hScan.length; i++) {
            if (eulerErrors[i] <= targetErr) {
                eulerH = hScan[i];
                eulerSteps = Math.round(T / eulerH);
                break;
            }
        }

        // Estimate Euler steps from slope if target not reached in scan
        if (!eulerH && eulerErrors.length > 2) {
            // Extrapolate: error ~ C*h, so h_needed ~ targetErr/C
            var C = eulerErrors[eulerErrors.length - 1] / hScan[hScan.length - 1];
            eulerH = targetErr / C;
            eulerSteps = Math.ceil(T / eulerH);
        }

        // Estimate RK4 needs: error ~ C * h^4
        var rk4H = Math.pow(targetErr, 0.25) * 0.5; // rough estimate with safety factor
        var rk4Steps = Math.ceil(T / rk4H);
        // Each RK4 step = 4 evaluations, but still far fewer total
        var rk4Evals = rk4Steps * 4;

        var speedup = eulerSteps ? Math.round(eulerSteps / rk4Evals) : '∞';

        // Left: error vs h with target line
        Plotly.newPlot('practErr-costPlot', [
            { x: hScan, y: eulerErrors, type: 'scatter', mode: 'lines',
              name: 'Euler error', line: { color: '#00f3ff', width: 2 } },
            { x: [hScan[hScan.length - 1], hScan[0]], y: [targetErr, targetErr],
              type: 'scatter', mode: 'lines',
              name: 'Target: 10⁻' + targetDigits, line: { color: '#ffff00', width: 1.5, dash: 'dash' } }
        ].concat(eulerH ? [{
            x: [eulerH], y: [targetErr], type: 'scatter', mode: 'markers',
            name: 'Euler meets target', marker: { color: '#00f3ff', size: 12, symbol: 'star' },
            showlegend: true
        }] : []).concat(rk4H ? [{
            x: [rk4H], y: [targetErr], type: 'scatter', mode: 'markers',
            name: 'RK4 meets target', marker: { color: '#ff00ff', size: 12, symbol: 'diamond' },
            showlegend: true
        }] : []), Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle(null, 'Step size h'), { type: 'log' }),
            yaxis: Object.assign(axStyle(null, '|Error|'), { type: 'log' }),
            showlegend: true,
            legend: { x: 0.05, y: 0.95, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: cost comparison bar chart
        var eulerEvals = eulerSteps || 1e8;
        var barColors = ['#00f3ff', '#ff00ff'];
        Plotly.newPlot('practErr-compPlot', [{
            x: ['Euler', 'RK4'],
            y: [eulerEvals, rk4Evals],
            type: 'bar',
            marker: { color: barColors },
            text: [eulerEvals.toLocaleString(), rk4Evals.toLocaleString()],
            textposition: 'outside',
            textfont: { color: '#ffffff', size: 12 }
        }], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Method'),
            yaxis: Object.assign(axStyle(null, 'Function evaluations'), { type: 'log' }),
            title: { text: 'Cost for ' + targetDigits + '-digit accuracy', font: { size: 13, color: '#ffffff' } },
            showlegend: false
        }), { responsive: true });

        // Stats
        setText('practErr-adv-eulerSteps', eulerSteps ? eulerSteps.toLocaleString() : '>10⁷');
        setText('practErr-adv-rk4Steps', rk4Steps.toLocaleString());
        setText('practErr-adv-speedup', speedup + '×');
    }

    // ===== Helper =====
    function setText(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    // ===== Event handlers =====
    function attachHandlers() {
        // Explorer 1
        var hSlider = document.getElementById('practErr-h-slider');
        if (hSlider) hSlider.addEventListener('input', function() {
            var h = Math.pow(10, parseFloat(this.value));
            setText('practErr-h-value', h.toExponential(1));
            plotDissect();
        });
        var tSlider = document.getElementById('practErr-T-slider');
        if (tSlider) tSlider.addEventListener('input', function() {
            setText('practErr-T-value', this.value);
            plotDissect();
        });

        // Explorer 2
        var convT = document.getElementById('practErr-conv-T-slider');
        if (convT) convT.addEventListener('input', function() {
            setText('practErr-conv-T-value', this.value);
            plotConvergence();
        });
        var convEq = document.getElementById('practErr-conv-eq-select');
        if (convEq) convEq.addEventListener('change', function() {
            plotConvergence();
        });

        // Explorer 3
        var advTarget = document.getElementById('practErr-adv-target-slider');
        if (advTarget) advTarget.addEventListener('input', function() {
            setText('practErr-adv-target-value', this.value);
            plotAdvisor();
        });
        var advT = document.getElementById('practErr-adv-T-slider');
        if (advT) advT.addEventListener('input', function() {
            setText('practErr-adv-T-value', this.value);
            plotAdvisor();
        });
    }

    // ===== Global reset functions =====
    window.practErrDissectReset = function() {
        document.getElementById('practErr-h-slider').value = -1;
        document.getElementById('practErr-T-slider').value = 5;
        setText('practErr-h-value', '0.100');
        setText('practErr-T-value', '5');
        plotDissect();
    };

    window.practErrConvReset = function() {
        document.getElementById('practErr-conv-T-slider').value = 5;
        document.getElementById('practErr-conv-eq-select').value = 'decay';
        setText('practErr-conv-T-value', '5');
        plotConvergence();
    };

    window.practErrAdvReset = function() {
        document.getElementById('practErr-adv-target-slider').value = 3;
        document.getElementById('practErr-adv-T-slider').value = 10;
        setText('practErr-adv-target-value', '3');
        setText('practErr-adv-T-value', '10');
        plotAdvisor();
    };

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }
        var el = document.getElementById('practErr-solPlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }
        plotDissect();
        plotConvergence();
        plotAdvisor();
        attachHandlers();
    }

    initializePlots();
})();
