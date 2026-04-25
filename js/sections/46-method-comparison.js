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

    // ===== Driven oscillator: x'' + x = cos(ωt) =====
    var omega08 = 0.8, om08sq = 0.64, den08 = 0.36;
    var omega02 = 0.2, om02sq = 0.04, den02 = 0.96;

    function fDriven08(y, t) { return [y[1], -y[0] + Math.cos(omega08 * t)]; }
    function exactX08(t) { return (Math.cos(omega08 * t) - om08sq * Math.cos(t)) / den08; }
    function exactV08(t) { return (-omega08 * Math.sin(omega08 * t) + om08sq * Math.sin(t)) / den08; }

    function fDriven02(y, t) { return [y[1], -y[0] + Math.cos(omega02 * t)]; }
    function exactX02(t) { return (Math.cos(omega02 * t) - om02sq * Math.cos(t)) / den02; }

    function fSHO(y, t) { return [y[1], -y[0]]; }
    function exactSHO(t) { return Math.cos(t); }

    // ===== Full-trajectory solvers (for Explorer 1 & 3 plots) =====
    function eulerSys(f, y0, T, N) {
        var h = T / N;
        var t = [0], Y = [y0.slice()];
        var y = y0.slice(), ti = 0;
        for (var i = 0; i < N; i++) {
            var dy = f(y, ti);
            y = [y[0] + h * dy[0], y[1] + h * dy[1]];
            ti += h;
            t.push(ti); Y.push(y.slice());
            if (Math.abs(y[0]) > 1e8) break;
        }
        return { t: t, Y: Y, h: h };
    }

    function rk2Sys(f, y0, T, N) {
        var h = T / N;
        var t = [0], Y = [y0.slice()];
        var y = y0.slice(), ti = 0;
        for (var i = 0; i < N; i++) {
            var k1 = f(y, ti);
            var yM = [y[0] + h / 2 * k1[0], y[1] + h / 2 * k1[1]];
            var k2 = f(yM, ti + h / 2);
            y = [y[0] + h * k2[0], y[1] + h * k2[1]];
            ti += h;
            t.push(ti); Y.push(y.slice());
            if (Math.abs(y[0]) > 1e8) break;
        }
        return { t: t, Y: Y, h: h };
    }

    function rk4Sys(f, y0, T, N) {
        var h = T / N;
        var t = [0], Y = [y0.slice()];
        var y = y0.slice(), ti = 0;
        for (var i = 0; i < N; i++) {
            var k1 = f(y, ti);
            var y2 = [y[0] + h / 2 * k1[0], y[1] + h / 2 * k1[1]];
            var k2 = f(y2, ti + h / 2);
            var y3 = [y[0] + h / 2 * k2[0], y[1] + h / 2 * k2[1]];
            var k3 = f(y3, ti + h / 2);
            var y4 = [y[0] + h * k3[0], y[1] + h * k3[1]];
            var k4 = f(y4, ti + h);
            y = [
                y[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
                y[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])
            ];
            ti += h;
            t.push(ti); Y.push(y.slice());
            if (Math.abs(y[0]) > 1e8) break;
        }
        return { t: t, Y: Y, h: h };
    }

    // ===== Endpoint-only solvers (for Explorer 2 scaling scans) =====
    function eulerEnd(f, y0, T, N) {
        var h = T / N, y = y0.slice(), ti = 0;
        for (var i = 0; i < N; i++) {
            var dy = f(y, ti);
            y = [y[0] + h * dy[0], y[1] + h * dy[1]];
            ti += h;
            if (Math.abs(y[0]) > 1e10) break;
        }
        return y;
    }

    function rk2End(f, y0, T, N) {
        var h = T / N, y = y0.slice(), ti = 0;
        for (var i = 0; i < N; i++) {
            var k1 = f(y, ti);
            var yM = [y[0] + h / 2 * k1[0], y[1] + h / 2 * k1[1]];
            var k2 = f(yM, ti + h / 2);
            y = [y[0] + h * k2[0], y[1] + h * k2[1]];
            ti += h;
            if (Math.abs(y[0]) > 1e10) break;
        }
        return y;
    }

    function rk4End(f, y0, T, N) {
        var h = T / N, y = y0.slice(), ti = 0;
        for (var i = 0; i < N; i++) {
            var k1 = f(y, ti);
            var y2 = [y[0] + h / 2 * k1[0], y[1] + h / 2 * k1[1]];
            var k2 = f(y2, ti + h / 2);
            var y3 = [y[0] + h / 2 * k2[0], y[1] + h / 2 * k2[1]];
            var k3 = f(y3, ti + h / 2);
            var y4 = [y[0] + h * k3[0], y[1] + h * k3[1]];
            var k4 = f(y4, ti + h);
            y = [
                y[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
                y[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])
            ];
            ti += h;
            if (Math.abs(y[0]) > 1e10) break;
        }
        return y;
    }

    // ===== Mean global error (using endpoint-only with sampled points) =====
    function meanError(f, y0, T, N, exactFn) {
        var h = T / N, y = y0.slice(), ti = 0;
        var sumErr = 0, count = 0;
        var sampleEvery = Math.max(1, Math.floor(N / 200));
        for (var i = 0; i < N; i++) {
            // Advance one step based on method encoded in f_step
            var dy = f(y, ti);
            y = [y[0] + h * dy[0], y[1] + h * dy[1]];
            ti += h;
            if (i % sampleEvery === 0) {
                sumErr += Math.abs(y[0] - exactFn(ti));
                count++;
            }
            if (Math.abs(y[0]) > 1e10) break;
        }
        return count > 0 ? sumErr / count : 1e10;
    }

    // Full mean-error computations for each method
    function meanErrEuler(f, y0, T, N, exactFn) {
        var h = T / N, y = y0.slice(), ti = 0;
        var sumErr = 0, count = 0, samp = Math.max(1, Math.floor(N / 200));
        for (var i = 0; i < N; i++) {
            var dy = f(y, ti);
            y = [y[0] + h * dy[0], y[1] + h * dy[1]]; ti += h;
            if (i % samp === 0) { sumErr += Math.abs(y[0] - exactFn(ti)); count++; }
            if (Math.abs(y[0]) > 1e10) break;
        }
        return count > 0 ? sumErr / count : 1e10;
    }

    function meanErrRK2(f, y0, T, N, exactFn) {
        var h = T / N, y = y0.slice(), ti = 0;
        var sumErr = 0, count = 0, samp = Math.max(1, Math.floor(N / 200));
        for (var i = 0; i < N; i++) {
            var k1 = f(y, ti);
            var yM = [y[0] + h / 2 * k1[0], y[1] + h / 2 * k1[1]];
            var k2 = f(yM, ti + h / 2);
            y = [y[0] + h * k2[0], y[1] + h * k2[1]]; ti += h;
            if (i % samp === 0) { sumErr += Math.abs(y[0] - exactFn(ti)); count++; }
            if (Math.abs(y[0]) > 1e10) break;
        }
        return count > 0 ? sumErr / count : 1e10;
    }

    function meanErrRK4(f, y0, T, N, exactFn) {
        var h = T / N, y = y0.slice(), ti = 0;
        var sumErr = 0, count = 0, samp = Math.max(1, Math.floor(N / 200));
        for (var i = 0; i < N; i++) {
            var k1 = f(y, ti);
            var y2 = [y[0] + h / 2 * k1[0], y[1] + h / 2 * k1[1]];
            var k2 = f(y2, ti + h / 2);
            var y3 = [y[0] + h / 2 * k2[0], y[1] + h / 2 * k2[1]];
            var k3 = f(y3, ti + h / 2);
            var y4 = [y[0] + h * k3[0], y[1] + h * k3[1]];
            var k4 = f(y4, ti + h);
            y = [
                y[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
                y[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])
            ]; ti += h;
            if (i % samp === 0) { sumErr += Math.abs(y[0] - exactFn(ti)); count++; }
            if (Math.abs(y[0]) > 1e10) break;
        }
        return count > 0 ? sumErr / count : 1e10;
    }

    function setText(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    // ===== Explorer 1: Same Budget, Different Accuracy =====
    function plotBudget() {
        var budget = parseInt(document.getElementById('mc-budget-slider').value);
        var T = parseFloat(document.getElementById('mc-T-slider').value);

        var nE = budget;          // Euler: budget steps × 1 eval
        var nR = Math.floor(budget / 2); // RK2: budget/2 steps × 2 evals
        var n4 = Math.floor(budget / 4); // RK4: budget/4 steps × 4 evals

        var solE = eulerSys(fDriven08, [1, 0], T, nE);
        var solR = rk2Sys(fDriven08, [1, 0], T, nR);
        var sol4 = rk4Sys(fDriven08, [1, 0], T, n4);

        // Exact
        var tEx = [];
        for (var i = 0; i <= 500; i++) tEx.push(T * i / 500);
        var xEx = tEx.map(exactX08);

        // Extract x arrays
        var xE = [], xR = [], x4 = [];
        for (var i = 0; i < solE.Y.length; i++) xE.push(solE.Y[i][0]);
        for (var i = 0; i < solR.Y.length; i++) xR.push(solR.Y[i][0]);
        for (var i = 0; i < sol4.Y.length; i++) x4.push(sol4.Y[i][0]);

        // Mean global errors
        var errE = meanErrEuler(fDriven08, [1, 0], T, nE, exactX08);
        var errR = meanErrRK2(fDriven08, [1, 0], T, nR, exactX08);
        var err4 = meanErrRK4(fDriven08, [1, 0], T, n4, exactX08);

        // Left: time series
        var yMax = Math.min(20, Math.max(4, Math.max.apply(null, xE.map(Math.abs)) * 1.1));
        Plotly.newPlot('mc-timePlot', [
            { x: tEx, y: xEx, type: 'scatter', mode: 'lines',
              name: 'Exact', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: solE.t, y: xE, type: 'scatter', mode: 'lines',
              name: 'Euler (' + nE + ' steps)', line: { color: '#00f3ff', width: 1.5 } },
            { x: solR.t, y: xR, type: 'scatter', mode: 'lines',
              name: 'RK2 (' + nR + ' steps)', line: { color: '#00ff9f', width: 1.5 } },
            { x: sol4.t, y: x4, type: 'scatter', mode: 'lines',
              name: 'RK4 (' + n4 + ' steps)', line: { color: '#ff00ff', width: 2 } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, T], 't'),
            yaxis: axStyle([-yMax, yMax], 'x(t)'),
            showlegend: true,
            legend: { x: 0.35, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: error bar chart (log scale)
        Plotly.newPlot('mc-errBarPlot', [{
            x: ['Euler', 'RK2', 'RK4'],
            y: [Math.max(errE, 1e-16), Math.max(errR, 1e-16), Math.max(err4, 1e-16)],
            type: 'bar',
            marker: { color: ['#00f3ff', '#00ff9f', '#ff00ff'] },
            text: [errE.toExponential(1), errR.toExponential(1), err4.toExponential(1)],
            textposition: 'outside',
            textfont: { color: '#ffffff', size: 11 }
        }], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Method'),
            yaxis: Object.assign(axStyle(null, 'Mean global error'), { type: 'log' }),
            title: { text: budget + ' evals each', font: { size: 13, color: '#ffffff' } },
            showlegend: false
        }), { responsive: true });

        var ratio = err4 > 0 ? (errE / err4) : Infinity;
        setText('mc-budget-eulerErr', errE.toExponential(2));
        setText('mc-budget-rk2Err', errR.toExponential(2));
        setText('mc-budget-rk4Err', err4.toExponential(2));
        setText('mc-budget-ratio', isFinite(ratio) ? ratio.toFixed(0) + '× better' : '∞');
    }

    // ===== Explorer 2: Scaling Laws =====
    function plotScaling() {
        var T = parseFloat(document.getElementById('mc-scale-T-slider').value);
        var eqKey = document.getElementById('mc-scale-eq-select').value;

        var fSys, exFn;
        if (eqKey === 'driven08') { fSys = fDriven08; exFn = exactX08; }
        else if (eqKey === 'driven02') { fSys = fDriven02; exFn = exactX02; }
        else { fSys = fSHO; exFn = exactSHO; }

        // Budget values from 100 to 50000 (log spaced, ~25 points)
        var budgets = [];
        for (var lb = 2; lb <= 4.7; lb += 0.12) budgets.push(Math.round(Math.pow(10, lb)));

        var eErrs = [], rErrs = [], r4Errs = [];
        for (var i = 0; i < budgets.length; i++) {
            var B = budgets[i];
            var nE = B, nR = Math.max(Math.floor(B / 2), 5), n4 = Math.max(Math.floor(B / 4), 3);
            eErrs.push(meanErrEuler(fSys, [1, 0], T, nE, exFn));
            rErrs.push(meanErrRK2(fSys, [1, 0], T, nR, exFn));
            r4Errs.push(meanErrRK4(fSys, [1, 0], T, n4, exFn));
        }

        // Compute slopes via linear regression on log-log
        function logSlope(xArr, yArr) {
            var sx = 0, sy = 0, sxy = 0, sx2 = 0, n = 0;
            for (var i = 0; i < xArr.length; i++) {
                if (yArr[i] > 1e-15 && yArr[i] < 1e5) {
                    var lx = Math.log10(xArr[i]), ly = Math.log10(yArr[i]);
                    sx += lx; sy += ly; sxy += lx * ly; sx2 += lx * lx; n++;
                }
            }
            return n > 2 ? (n * sxy - sx * sy) / (n * sx2 - sx * sx) : 0;
        }

        var sE = logSlope(budgets, eErrs);
        var sR = logSlope(budgets, rErrs);
        var s4 = logSlope(budgets, r4Errs);

        // Left: error vs budget
        Plotly.newPlot('mc-scalePlot', [
            { x: budgets, y: eErrs, type: 'scatter', mode: 'markers+lines',
              name: 'Euler', marker: { color: '#00f3ff', size: 4 },
              line: { color: '#00f3ff', width: 2 } },
            { x: budgets, y: rErrs, type: 'scatter', mode: 'markers+lines',
              name: 'RK2', marker: { color: '#00ff9f', size: 4 },
              line: { color: '#00ff9f', width: 2 } },
            { x: budgets, y: r4Errs, type: 'scatter', mode: 'markers+lines',
              name: 'RK4', marker: { color: '#ff00ff', size: 4 },
              line: { color: '#ff00ff', width: 2 } }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle(null, 'Total function evaluations'), { type: 'log' }),
            yaxis: Object.assign(axStyle(null, 'Mean global error'), { type: 'log' }),
            showlegend: true,
            legend: { x: 0.55, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: speedup ratio (how many fewer evals RK4/RK2 need vs Euler for same error)
        // Compute at matched error levels
        var targetErrs = [];
        for (var le = -1; le >= -10; le -= 0.5) targetErrs.push(Math.pow(10, le));

        function evalsForError(errs, target) {
            for (var i = 0; i < errs.length; i++) {
                if (errs[i] <= target) return budgets[i];
            }
            return null;
        }

        var speedRK2 = [], speedRK4 = [], targetLabels = [];
        for (var i = 0; i < targetErrs.length; i++) {
            var nEul = evalsForError(eErrs, targetErrs[i]);
            var nR2 = evalsForError(rErrs, targetErrs[i]);
            var nR4 = evalsForError(r4Errs, targetErrs[i]);
            if (nEul && nR4) {
                targetLabels.push(targetErrs[i].toExponential(0));
                speedRK2.push(nR2 ? nEul / nR2 : 1);
                speedRK4.push(nEul / nR4);
            }
        }

        Plotly.newPlot('mc-speedupPlot', [
            { x: targetLabels, y: speedRK2, type: 'bar', name: 'RK2 speedup',
              marker: { color: '#00ff9f' } },
            { x: targetLabels, y: speedRK4, type: 'bar', name: 'RK4 speedup',
              marker: { color: '#ff00ff' } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Target error'),
            yaxis: Object.assign(axStyle(null, 'Speedup vs Euler'), { type: 'log' }),
            barmode: 'group',
            showlegend: true,
            legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' },
            title: { text: 'How many times faster than Euler?', font: { size: 13, color: '#ffffff' } }
        }), { responsive: true });

        setText('mc-scale-eulerSlope', sE.toFixed(2));
        setText('mc-scale-rk2Slope', sR.toFixed(2));
        setText('mc-scale-rk4Slope', s4.toFixed(2));
    }

    // ===== Explorer 3: Decision Guide =====
    var scenarios = {
        explore: {
            title: 'Quick Exploration',
            method: 'Euler',
            color: '#00f3ff',
            hFactor: 0.1,      // h = T * hFactor (large steps)
            text: 'Use <strong>Euler</strong> with a moderate step size. You\'re checking qualitative behavior — signs, initial conditions, boundary effects. Speed matters more than accuracy. Once the setup looks right, switch to RK4 for the real run.',
            methodFn: eulerSys,
            evals: 1
        },
        homework: {
            title: 'Homework Quality',
            method: 'RK4',
            color: '#ff00ff',
            hFactor: 0.02,
            text: 'Use <strong>RK4</strong> with h ≈ 0.02 × T. This gives you 3–5 digits of accuracy with minimal effort. Always verify by halving h once — if the answer doesn\'t change visibly, you\'re done.',
            methodFn: rk4Sys,
            evals: 4
        },
        publish: {
            title: 'Publication Quality',
            method: 'RK4',
            color: '#ff00ff',
            hFactor: 0.002,
            text: 'Use <strong>RK4</strong> with h ≈ 0.002 × T (or smaller). Verify convergence rigorously: run at h, h/2, h/4 and confirm the answers converge. Report the estimated error. For adaptive step size, use scipy.integrate.solve_ivp.',
            methodFn: rk4Sys,
            evals: 4
        },
        longTime: {
            title: 'Long-Time Simulation',
            method: 'RK4 (consider symplectic)',
            color: '#ff00ff',
            hFactor: 0.005,
            text: 'Use <strong>RK4</strong> with small h and monitor energy conservation. If E(t)/E(0) drifts significantly over your simulation time, consider a <strong>symplectic integrator</strong> (Störmer-Verlet / leapfrog) that preserves the Hamiltonian structure. For most physics problems, RK4 with careful h selection is sufficient.',
            methodFn: rk4Sys,
            evals: 4
        }
    };

    function plotScenario() {
        var key = document.getElementById('mc-scenario-select').value;
        var T = parseFloat(document.getElementById('mc-scenario-T-slider').value);
        var sc = scenarios[key];

        var h = T * sc.hFactor;
        var N = Math.max(Math.round(T / h), 10);
        var sol = sc.methodFn(fDriven08, [1, 0], T, N);

        // Also run all three for comparison bar
        var nE = Math.round(T / 0.05), nR = Math.round(T / 0.05), n4 = Math.round(T / 0.05);
        var errE = meanErrEuler(fDriven08, [1, 0], T, nE, exactX08);
        var errR = meanErrRK2(fDriven08, [1, 0], T, nR, exactX08);
        var err4 = meanErrRK4(fDriven08, [1, 0], T, n4, exactX08);

        // Recommended method's error
        var recErr;
        if (sc.evals === 1) recErr = meanErrEuler(fDriven08, [1, 0], T, N, exactX08);
        else recErr = meanErrRK4(fDriven08, [1, 0], T, N, exactX08);

        // Exact
        var tEx = [];
        for (var i = 0; i <= 500; i++) tEx.push(T * i / 500);
        var xEx = tEx.map(exactX08);

        var xa = [];
        for (var i = 0; i < sol.Y.length; i++) xa.push(sol.Y[i][0]);

        // Left: recommended method vs exact
        var yMax = Math.min(15, Math.max(4, Math.max.apply(null, xa.map(Math.abs)) * 1.1));
        Plotly.newPlot('mc-scenarioPlot', [
            { x: tEx, y: xEx, type: 'scatter', mode: 'lines',
              name: 'Exact', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: sol.t, y: xa, type: 'scatter', mode: 'lines',
              name: sc.method, line: { color: sc.color, width: 2 } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, T], 't'),
            yaxis: axStyle([-yMax, yMax], 'x(t)'),
            showlegend: true,
            legend: { x: 0.5, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' },
            title: { text: sc.title, font: { size: 13, color: sc.color } }
        }), { responsive: true });

        // Right: comparison at h=0.05 for all three
        Plotly.newPlot('mc-scenarioCompare', [{
            x: ['Euler', 'RK2', 'RK4'],
            y: [Math.max(errE, 1e-16), Math.max(errR, 1e-16), Math.max(err4, 1e-16)],
            type: 'bar',
            marker: { color: ['#00f3ff', '#00ff9f', '#ff00ff'] },
            text: [errE.toExponential(1), errR.toExponential(1), err4.toExponential(1)],
            textposition: 'outside',
            textfont: { color: '#ffffff', size: 11 }
        }], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Method'),
            yaxis: Object.assign(axStyle(null, 'Mean error (h=0.05)'), { type: 'log' }),
            title: { text: 'All methods at h = 0.05', font: { size: 13, color: '#ffffff' } },
            showlegend: false
        }), { responsive: true });

        // Update recommendation text
        setText('mc-rec-title', 'Recommendation: ' + sc.title);
        document.getElementById('mc-rec-text').innerHTML = sc.text;
        setText('mc-rec-method', sc.method);
        setText('mc-rec-steps', N.toLocaleString());
        setText('mc-rec-error', recErr.toExponential(2));
        setText('mc-rec-evals', (N * sc.evals).toLocaleString());
    }

    // ===== Event handlers =====
    function attachHandlers() {
        // Explorer 1
        var bSlider = document.getElementById('mc-budget-slider');
        if (bSlider) bSlider.addEventListener('input', function() {
            setText('mc-budget-value', this.value);
            plotBudget();
        });
        var tSlider = document.getElementById('mc-T-slider');
        if (tSlider) tSlider.addEventListener('input', function() {
            setText('mc-T-value', this.value);
            plotBudget();
        });

        // Explorer 2
        var scaleT = document.getElementById('mc-scale-T-slider');
        if (scaleT) scaleT.addEventListener('input', function() {
            setText('mc-scale-T-value', this.value);
            plotScaling();
        });
        var scaleEq = document.getElementById('mc-scale-eq-select');
        if (scaleEq) scaleEq.addEventListener('change', plotScaling);

        // Explorer 3
        var scenSel = document.getElementById('mc-scenario-select');
        if (scenSel) scenSel.addEventListener('change', plotScenario);
        var scenT = document.getElementById('mc-scenario-T-slider');
        if (scenT) scenT.addEventListener('input', function() {
            setText('mc-scenario-T-value', this.value);
            plotScenario();
        });
    }

    // ===== Global resets =====
    window.mcBudgetReset = function() {
        document.getElementById('mc-budget-slider').value = 500;
        document.getElementById('mc-T-slider').value = 20;
        setText('mc-budget-value', '500');
        setText('mc-T-value', '20');
        plotBudget();
    };

    window.mcScaleReset = function() {
        document.getElementById('mc-scale-T-slider').value = 10;
        document.getElementById('mc-scale-eq-select').value = 'driven08';
        setText('mc-scale-T-value', '10');
        plotScaling();
    };

    window.mcScenarioReset = function() {
        document.getElementById('mc-scenario-select').value = 'explore';
        document.getElementById('mc-scenario-T-slider').value = 20;
        setText('mc-scenario-T-value', '20');
        plotScenario();
    };

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }
        var el = document.getElementById('mc-timePlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }
        plotBudget();
        plotScaling();
        plotScenario();
        attachHandlers();
    }

    initializePlots();
})();
