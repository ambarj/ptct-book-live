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

    // ===== Driven oscillator: x'' + x = cos(ωt), ω = 0.8 =====
    var omega = 0.8;
    var omSq = omega * omega;
    var denom = 1 - omSq; // 0.36

    function fDriven(y, t) {
        return [y[1], -y[0] + Math.cos(omega * t)];
    }

    function exactX(t) {
        return (Math.cos(omega * t) - omSq * Math.cos(t)) / denom;
    }

    function exactV(t) {
        return (-omega * Math.sin(omega * t) + omSq * Math.sin(t)) / denom;
    }

    // ===== SHO: x'' = -x =====
    function fSHO(y, t) { return [y[1], -y[0]]; }

    // ===== Full-trajectory solvers (for Explorer 1 plots) =====
    function eulerSys(f, y0, T, h) {
        var n = Math.round(T / h);
        var t = [0], Y = [y0.slice()];
        var y = y0.slice(), ti = 0;
        for (var i = 0; i < n; i++) {
            var dy = f(y, ti);
            y = [y[0] + h * dy[0], y[1] + h * dy[1]];
            ti += h;
            t.push(ti); Y.push(y.slice());
            if (Math.abs(y[0]) > 1e8 || Math.abs(y[1]) > 1e8) break;
        }
        return { t: t, Y: Y };
    }

    function rk2Sys(f, y0, T, h) {
        var n = Math.round(T / h);
        var t = [0], Y = [y0.slice()];
        var y = y0.slice(), ti = 0;
        for (var i = 0; i < n; i++) {
            var k1 = f(y, ti);
            var yM = [y[0] + h / 2 * k1[0], y[1] + h / 2 * k1[1]];
            var k2 = f(yM, ti + h / 2);
            y = [y[0] + h * k2[0], y[1] + h * k2[1]];
            ti += h;
            t.push(ti); Y.push(y.slice());
            if (Math.abs(y[0]) > 1e8 || Math.abs(y[1]) > 1e8) break;
        }
        return { t: t, Y: Y };
    }

    function rk4Sys(f, y0, T, h) {
        var n = Math.round(T / h);
        var t = [0], Y = [y0.slice()];
        var y = y0.slice(), ti = 0;
        for (var i = 0; i < n; i++) {
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
            if (Math.abs(y[0]) > 1e8 || Math.abs(y[1]) > 1e8) break;
        }
        return { t: t, Y: Y };
    }

    // ===== Endpoint-only solvers (for convergence scans — no array storage) =====
    function eulerEnd(f, y0, T, h) {
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

    function rk2End(f, y0, T, h) {
        var n = Math.round(T / h);
        var y = y0.slice(), ti = 0;
        for (var i = 0; i < n; i++) {
            var k1 = f(y, ti);
            var yM = [y[0] + h / 2 * k1[0], y[1] + h / 2 * k1[1]];
            var k2 = f(yM, ti + h / 2);
            y = [y[0] + h * k2[0], y[1] + h * k2[1]];
            ti += h;
            if (Math.abs(y[0]) > 1e10 || Math.abs(y[1]) > 1e10) break;
        }
        return y;
    }

    function rk4End(f, y0, T, h) {
        var n = Math.round(T / h);
        var y = y0.slice(), ti = 0;
        for (var i = 0; i < n; i++) {
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
            if (Math.abs(y[0]) > 1e10 || Math.abs(y[1]) > 1e10) break;
        }
        return y;
    }

    // Scalar endpoint-only (for decay equation)
    function eulerScalarEnd(f, y0, T, h) {
        var n = Math.round(T / h);
        var y = y0, ti = 0;
        for (var i = 0; i < n; i++) {
            y += h * f(ti, y);
            ti += h;
            if (!isFinite(y)) return Infinity;
        }
        return y;
    }

    function rk2ScalarEnd(f, y0, T, h) {
        var n = Math.round(T / h);
        var y = y0, ti = 0;
        for (var i = 0; i < n; i++) {
            var k1 = f(ti, y);
            var k2 = f(ti + h / 2, y + h / 2 * k1);
            y += h * k2;
            ti += h;
            if (!isFinite(y)) return Infinity;
        }
        return y;
    }

    function rk4ScalarEnd(f, y0, T, h) {
        var n = Math.round(T / h);
        var y = y0, ti = 0;
        for (var i = 0; i < n; i++) {
            var k1 = f(ti, y);
            var k2 = f(ti + h / 2, y + h / 2 * k1);
            var k3 = f(ti + h / 2, y + h / 2 * k2);
            var k4 = f(ti + h, y + h * k3);
            y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
            ti += h;
            if (!isFinite(y)) return Infinity;
        }
        return y;
    }

    // ===== Helper =====
    function setText(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function computeSlope(hVals, errors, hMin, hMax) {
        var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, n = 0;
        for (var i = 0; i < hVals.length; i++) {
            if (hVals[i] >= hMin && hVals[i] <= hMax && errors[i] > 1e-15) {
                var lx = Math.log10(hVals[i]);
                var ly = Math.log10(errors[i]);
                sumX += lx; sumY += ly; sumXY += lx * ly; sumX2 += lx * lx;
                n++;
            }
        }
        if (n < 2) return 0;
        return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    // ===== Explorer 1: Three-Way Algorithm Race =====
    function plotRace() {
        var h = parseFloat(document.getElementById('rk4-race-h-slider').value);
        var T = parseFloat(document.getElementById('rk4-race-T-slider').value);

        var solE = eulerSys(fDriven, [1, 0], T, h);
        var solR = rk2Sys(fDriven, [1, 0], T, h);
        var sol4 = rk4Sys(fDriven, [1, 0], T, h);

        // Exact
        var tEx = [];
        for (var i = 0; i <= 500; i++) tEx.push(T * i / 500);
        var xEx = tEx.map(exactX);
        var vEx = tEx.map(exactV);

        // Extract arrays
        var tE = solE.t, xE = [], vE = [];
        for (var i = 0; i < solE.Y.length; i++) { xE.push(solE.Y[i][0]); vE.push(solE.Y[i][1]); }
        var tR = solR.t, xR = [], vR = [];
        for (var i = 0; i < solR.Y.length; i++) { xR.push(solR.Y[i][0]); vR.push(solR.Y[i][1]); }
        var t4 = sol4.t, x4 = [], v4 = [];
        for (var i = 0; i < sol4.Y.length; i++) { x4.push(sol4.Y[i][0]); v4.push(sol4.Y[i][1]); }

        // Errors at endpoint
        var exEnd = exactX(T);
        var errE = Math.abs(xE[xE.length - 1] - exEnd);
        var errR = Math.abs(xR[xR.length - 1] - exEnd);
        var err4 = Math.abs(x4[x4.length - 1] - exEnd);

        // Left: time series
        var yMax = Math.max(3, Math.max.apply(null, xE.map(Math.abs)) * 1.1);
        yMax = Math.min(yMax, 20); // cap for display
        Plotly.newPlot('rk4-timePlot', [
            { x: tEx, y: xEx, type: 'scatter', mode: 'lines',
              name: 'Exact', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: tE, y: xE, type: 'scatter', mode: 'lines',
              name: 'Euler', line: { color: '#00f3ff', width: 1.5 } },
            { x: tR, y: xR, type: 'scatter', mode: 'lines',
              name: 'RK2', line: { color: '#00ff9f', width: 1.5 } },
            { x: t4, y: x4, type: 'scatter', mode: 'lines',
              name: 'RK4', line: { color: '#ff00ff', width: 2 } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, T], 't'),
            yaxis: axStyle([-yMax, yMax], 'x(t)'),
            showlegend: true,
            legend: { x: 0.5, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: phase portrait
        var phMax = Math.max(4, Math.max.apply(null, vE.map(Math.abs)) * 1.1);
        phMax = Math.min(phMax, 30);
        Plotly.newPlot('rk4-phasePlot', [
            { x: xEx, y: vEx, type: 'scatter', mode: 'lines',
              name: 'Exact', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: xE, y: vE, type: 'scatter', mode: 'lines',
              name: 'Euler', line: { color: '#00f3ff', width: 1 } },
            { x: xR, y: vR, type: 'scatter', mode: 'lines',
              name: 'RK2', line: { color: '#00ff9f', width: 1.5 } },
            { x: x4, y: v4, type: 'scatter', mode: 'lines',
              name: 'RK4', line: { color: '#ff00ff', width: 2 } },
            { x: [1], y: [0], type: 'scatter', mode: 'markers',
              name: 'Start', marker: { color: '#ffff00', size: 10, symbol: 'star' } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-phMax, phMax], 'x'),
            yaxis: axStyle([-phMax, phMax], 'v'),
            showlegend: true,
            legend: { x: 0.55, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Stats
        setText('rk4-race-eulerErr', errE.toExponential(2));
        setText('rk4-race-rk2Err', errR.toExponential(2));
        setText('rk4-race-rk4Err', err4.toExponential(2));
    }

    // ===== Explorer 2: Convergence Rate =====
    function plotConv() {
        var T = parseFloat(document.getElementById('rk4-conv-T-slider').value);
        var eqKey = document.getElementById('rk4-conv-eq-select').value;

        // Step sizes: 1 to 1e-3
        var logH = [];
        for (var lh = 0; lh >= -3; lh -= 0.15) logH.push(lh);
        var hVals = logH.map(function(lh) { return Math.pow(10, lh); });

        var eErrs = [], rErrs = [], r4Errs = [];

        for (var i = 0; i < hVals.length; i++) {
            var hv = hVals[i];
            var errE, errR, err4;

            if (eqKey === 'decay') {
                var fDecay = function(t, y) { return -y; };
                var ex = Math.exp(-T);
                errE = Math.abs(eulerScalarEnd(fDecay, 1, T, hv) - ex);
                errR = Math.abs(rk2ScalarEnd(fDecay, 1, T, hv) - ex);
                err4 = Math.abs(rk4ScalarEnd(fDecay, 1, T, hv) - ex);
            } else {
                var fSys = (eqKey === 'driven') ? fDriven : fSHO;
                var exFn = (eqKey === 'driven') ? exactX : function(t) { return Math.cos(t); };
                var ex = exFn(T);
                errE = Math.abs(eulerEnd(fSys, [1, 0], T, hv)[0] - ex);
                errR = Math.abs(rk2End(fSys, [1, 0], T, hv)[0] - ex);
                err4 = Math.abs(rk4End(fSys, [1, 0], T, hv)[0] - ex);
            }
            eErrs.push(errE > 0 ? errE : 1e-16);
            rErrs.push(errR > 0 ? errR : 1e-16);
            r4Errs.push(err4 > 0 ? err4 : 1e-16);
        }

        // Slopes
        var sE = computeSlope(hVals, eErrs, 1e-3, 0.1);
        var sR = computeSlope(hVals, rErrs, 1e-3, 0.1);
        var s4 = computeSlope(hVals, r4Errs, 1e-3, 0.1);

        // Left: convergence plot
        Plotly.newPlot('rk4-convPlot', [
            { x: hVals, y: eErrs, type: 'scatter', mode: 'markers+lines',
              name: 'Euler', marker: { color: '#00f3ff', size: 5 },
              line: { color: '#00f3ff', width: 2 } },
            { x: hVals, y: rErrs, type: 'scatter', mode: 'markers+lines',
              name: 'RK2', marker: { color: '#00ff9f', size: 5 },
              line: { color: '#00ff9f', width: 2 } },
            { x: hVals, y: r4Errs, type: 'scatter', mode: 'markers+lines',
              name: 'RK4', marker: { color: '#ff00ff', size: 5 },
              line: { color: '#ff00ff', width: 2 } },
            { x: [1e-3, 1], y: [1e-3, 1], type: 'scatter', mode: 'lines',
              name: 'O(h)', line: { color: '#808080', width: 1, dash: 'dot' } },
            { x: [1e-3, 1], y: [1e-6, 1], type: 'scatter', mode: 'lines',
              name: 'O(h²)', line: { color: '#808080', width: 1, dash: 'dot' } },
            { x: [1e-3, 1], y: [1e-12, 1], type: 'scatter', mode: 'lines',
              name: 'O(h⁴)', line: { color: '#808080', width: 1, dash: 'dot' } }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle(null, 'Step size h'), { type: 'log' }),
            yaxis: Object.assign(axStyle(null, '|Error at t=T|'), { type: 'log' }),
            showlegend: true,
            legend: { x: 0.05, y: 0.95, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: halving-h improvement bars
        var halvingH = [], eulerR = [], rk2R = [], rk4R = [];
        for (var i = 1; i < hVals.length; i++) {
            if (Math.abs(hVals[i] / hVals[i - 1] - 0.5) < 0.3) {
                halvingH.push(hVals[i - 1].toExponential(1));
                eulerR.push(eErrs[i - 1] / eErrs[i]);
                rk2R.push(rErrs[i - 1] / rErrs[i]);
                rk4R.push(r4Errs[i - 1] / r4Errs[i]);
            }
        }
        var nShow = Math.min(6, halvingH.length);
        halvingH = halvingH.slice(-nShow);
        eulerR = eulerR.slice(-nShow);
        rk2R = rk2R.slice(-nShow);
        rk4R = rk4R.slice(-nShow);

        Plotly.newPlot('rk4-halvingPlot', [
            { x: halvingH, y: eulerR, type: 'bar', name: 'Euler',
              marker: { color: '#00f3ff' } },
            { x: halvingH, y: rk2R, type: 'bar', name: 'RK2',
              marker: { color: '#00ff9f' } },
            { x: halvingH, y: rk4R, type: 'bar', name: 'RK4',
              marker: { color: '#ff00ff' } },
            { x: [halvingH[0], halvingH[halvingH.length - 1]], y: [2, 2],
              type: 'scatter', mode: 'lines', name: '2× target',
              line: { color: '#00f3ff', width: 1, dash: 'dash' }, showlegend: false },
            { x: [halvingH[0], halvingH[halvingH.length - 1]], y: [4, 4],
              type: 'scatter', mode: 'lines', name: '4× target',
              line: { color: '#00ff9f', width: 1, dash: 'dash' }, showlegend: false },
            { x: [halvingH[0], halvingH[halvingH.length - 1]], y: [16, 16],
              type: 'scatter', mode: 'lines', name: '16× target',
              line: { color: '#ff00ff', width: 1, dash: 'dash' }, showlegend: false }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'h value'),
            yaxis: axStyle([0, Math.max(20, Math.max.apply(null, rk4R) * 1.2)], 'Error ratio (halving h)'),
            barmode: 'group',
            showlegend: true,
            legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' },
            title: { text: 'Improvement when halving h', font: { size: 13, color: '#ffffff' } }
        }), { responsive: true });

        // Stats
        setText('rk4-conv-eulerSlope', sE.toFixed(2));
        setText('rk4-conv-rk2Slope', sR.toFixed(2));
        setText('rk4-conv-rk4Slope', s4.toFixed(2));
    }

    // ===== Explorer 3: Efficiency Calculator =====
    function plotEfficiency() {
        var targetDigits = parseInt(document.getElementById('rk4-eff-target-slider').value);
        var T = parseFloat(document.getElementById('rk4-eff-T-slider').value);
        var targetErr = Math.pow(10, -targetDigits);

        // Scan h from 1 to 1e-4 with endpoint solvers
        var hScan = [];
        for (var lh = 0; lh >= -4; lh -= 0.1) hScan.push(Math.pow(10, lh));

        var eErrs = [], rErrs = [], r4Errs = [];
        var exVal = exactX(T);
        for (var i = 0; i < hScan.length; i++) {
            eErrs.push(Math.abs(eulerEnd(fDriven, [1, 0], T, hScan[i])[0] - exVal));
            rErrs.push(Math.abs(rk2End(fDriven, [1, 0], T, hScan[i])[0] - exVal));
            r4Errs.push(Math.abs(rk4End(fDriven, [1, 0], T, hScan[i])[0] - exVal));
        }

        // Find h that meets target for each method
        function findH(errors) {
            for (var i = 0; i < hScan.length; i++) {
                if (errors[i] <= targetErr) return { h: hScan[i], idx: i };
            }
            return null;
        }

        var eulerResult = findH(eErrs);
        var rk2Result = findH(rErrs);
        var rk4Result = findH(r4Errs);

        // Extrapolate if not found in scan
        function extrapolate(errors, order) {
            if (errors.length < 2) return 1e8;
            var lastH = hScan[hScan.length - 1];
            var lastErr = errors[errors.length - 1];
            if (lastErr <= 0) return 1e8;
            // err ~ C * h^p  =>  h_need = lastH * (targetErr / lastErr)^(1/p)
            var hNeed = lastH * Math.pow(targetErr / lastErr, 1.0 / order);
            return Math.ceil(T / hNeed);
        }

        var eulerSteps = eulerResult ? Math.round(T / eulerResult.h) : extrapolate(eErrs, 1);
        var rk2Steps = rk2Result ? Math.round(T / rk2Result.h) : extrapolate(rErrs, 2);
        var rk4Steps = rk4Result ? Math.round(T / rk4Result.h) : extrapolate(r4Errs, 4);

        var eulerEvals = eulerSteps * 1;
        var rk2Evals = rk2Steps * 2;
        var rk4Evals = rk4Steps * 4;

        var speedup = rk4Evals > 0 ? Math.round(eulerEvals / rk4Evals) : '∞';

        // Left: error vs h for all three
        Plotly.newPlot('rk4-errScanPlot', [
            { x: hScan, y: eErrs, type: 'scatter', mode: 'lines',
              name: 'Euler', line: { color: '#00f3ff', width: 2 } },
            { x: hScan, y: rErrs, type: 'scatter', mode: 'lines',
              name: 'RK2', line: { color: '#00ff9f', width: 2 } },
            { x: hScan, y: r4Errs, type: 'scatter', mode: 'lines',
              name: 'RK4', line: { color: '#ff00ff', width: 2 } },
            { x: [hScan[hScan.length - 1], hScan[0]], y: [targetErr, targetErr],
              type: 'scatter', mode: 'lines',
              name: 'Target: 10⁻' + targetDigits, line: { color: '#ffff00', width: 1.5, dash: 'dash' } }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle(null, 'Step size h'), { type: 'log' }),
            yaxis: Object.assign(axStyle(null, '|Error|'), { type: 'log' }),
            showlegend: true,
            legend: { x: 0.05, y: 0.95, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: cost bar chart
        Plotly.newPlot('rk4-costPlot', [{
            x: ['Euler', 'RK2', 'RK4'],
            y: [eulerEvals, rk2Evals, rk4Evals],
            type: 'bar',
            marker: { color: ['#00f3ff', '#00ff9f', '#ff00ff'] },
            text: [eulerEvals.toLocaleString(), rk2Evals.toLocaleString(), rk4Evals.toLocaleString()],
            textposition: 'outside',
            textfont: { color: '#ffffff', size: 11 }
        }], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Method'),
            yaxis: Object.assign(axStyle(null, 'Function evaluations'), { type: 'log' }),
            title: { text: 'Cost for ' + targetDigits + '-digit accuracy', font: { size: 13, color: '#ffffff' } },
            showlegend: false
        }), { responsive: true });

        // Stats
        setText('rk4-eff-eulerEvals', eulerEvals.toLocaleString());
        setText('rk4-eff-rk2Evals', rk2Evals.toLocaleString());
        setText('rk4-eff-rk4Evals', rk4Evals.toLocaleString());
        setText('rk4-eff-speedup', speedup + '× vs Euler');
    }

    // ===== Event handlers =====
    function attachHandlers() {
        // Explorer 1
        var rIds = ['rk4-race-h-slider', 'rk4-race-T-slider'];
        var rLabs = ['rk4-race-h-value', 'rk4-race-T-value'];
        var rDecs = [2, 0];
        for (var i = 0; i < rIds.length; i++) {
            (function(sid, lid, dec) {
                var el = document.getElementById(sid);
                if (el) el.addEventListener('input', function() {
                    document.getElementById(lid).textContent = parseFloat(this.value).toFixed(dec);
                    plotRace();
                });
            })(rIds[i], rLabs[i], rDecs[i]);
        }

        // Explorer 2
        var convT = document.getElementById('rk4-conv-T-slider');
        if (convT) convT.addEventListener('input', function() {
            setText('rk4-conv-T-value', this.value);
            plotConv();
        });
        var convEq = document.getElementById('rk4-conv-eq-select');
        if (convEq) convEq.addEventListener('change', plotConv);

        // Explorer 3
        var effTarget = document.getElementById('rk4-eff-target-slider');
        if (effTarget) effTarget.addEventListener('input', function() {
            setText('rk4-eff-target-value', this.value);
            plotEfficiency();
        });
        var effT = document.getElementById('rk4-eff-T-slider');
        if (effT) effT.addEventListener('input', function() {
            setText('rk4-eff-T-value', this.value);
            plotEfficiency();
        });
    }

    // ===== Global reset functions =====
    window.rk4RaceReset = function() {
        document.getElementById('rk4-race-h-slider').value = 0.20;
        document.getElementById('rk4-race-T-slider').value = 50;
        setText('rk4-race-h-value', '0.20');
        setText('rk4-race-T-value', '50');
        plotRace();
    };

    window.rk4ConvReset = function() {
        document.getElementById('rk4-conv-T-slider').value = 5;
        document.getElementById('rk4-conv-eq-select').value = 'sho';
        setText('rk4-conv-T-value', '5');
        plotConv();
    };

    window.rk4EffReset = function() {
        document.getElementById('rk4-eff-target-slider').value = 3;
        document.getElementById('rk4-eff-T-slider').value = 10;
        setText('rk4-eff-target-value', '3');
        setText('rk4-eff-T-value', '10');
        plotEfficiency();
    };

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }
        var el = document.getElementById('rk4-timePlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }
        plotRace();
        plotConv();
        plotEfficiency();
        attachHandlers();
    }

    initializePlots();
})();
