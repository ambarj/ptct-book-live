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

    // ===== Euler solver (system) =====
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

    // ===== RK2 solver (midpoint method, system) =====
    function rk2Sys(f, y0, T, h) {
        var n = Math.round(T / h);
        var t = [0], Y = [y0.slice()];
        var y = y0.slice(), ti = 0;
        for (var i = 0; i < n; i++) {
            var k1 = f(y, ti);
            var yMid = [y[0] + h / 2 * k1[0], y[1] + h / 2 * k1[1]];
            var k2 = f(yMid, ti + h / 2);
            y = [y[0] + h * k2[0], y[1] + h * k2[1]];
            ti += h;
            t.push(ti); Y.push(y.slice());
            if (Math.abs(y[0]) > 1e8 || Math.abs(y[1]) > 1e8) break;
        }
        return { t: t, Y: Y };
    }

    // ===== Scalar solvers (for convergence tests) =====
    function eulerScalar(f, y0, T, h) {
        var n = Math.round(T / h);
        var t = [0], y = [y0];
        var yi = y0, ti = 0;
        for (var i = 0; i < n; i++) {
            yi += h * f(ti, yi);
            ti += h;
            t.push(ti); y.push(yi);
        }
        return { t: t, y: y };
    }

    function rk2Scalar(f, y0, T, h) {
        var n = Math.round(T / h);
        var t = [0], y = [y0];
        var yi = y0, ti = 0;
        for (var i = 0; i < n; i++) {
            var k1 = f(ti, yi);
            var k2 = f(ti + h / 2, yi + h / 2 * k1);
            yi += h * k2;
            ti += h;
            t.push(ti); y.push(yi);
        }
        return { t: t, y: y };
    }

    // ===== SHO system: dx/dt = v, dv/dt = -x =====
    var fSHO = function(y) { return [y[1], -y[0]]; };

    // ===== Damped system: w=4 =====
    var fDamped = function(y) { return [y[1], -4 * y[0] - y[1]]; };
    function dampedExact(t) {
        var beta = Math.sqrt(3.75);
        var env = Math.exp(-t / 2);
        return env * (Math.cos(beta * t) + Math.sin(beta * t) / (2 * beta));
    }

    // ===== Explorer 1: Algorithm Race =====
    function plotRace() {
        var h = parseFloat(document.getElementById('impEuler-race-h-slider').value);
        var T = parseFloat(document.getElementById('impEuler-race-T-slider').value);

        var solE = eulerSys(fSHO, [1, 0], T, h);
        var solR = rk2Sys(fSHO, [1, 0], T, h);

        // Exact solution
        var tExact = [];
        for (var i = 0; i <= 500; i++) tExact.push(T * i / 500);
        var xExact = tExact.map(function(t) { return Math.cos(t); });

        // Extract arrays
        var tE = solE.t, xE = [], vE = [];
        for (var i = 0; i < solE.Y.length; i++) { xE.push(solE.Y[i][0]); vE.push(solE.Y[i][1]); }
        var tR = solR.t, xR = [], vR = [];
        for (var i = 0; i < solR.Y.length; i++) { xR.push(solR.Y[i][0]); vR.push(solR.Y[i][1]); }

        // Compute max error at endpoint
        var errE = Math.abs(xE[xE.length - 1] - Math.cos(T));
        var errR = Math.abs(xR[xR.length - 1] - Math.cos(T));
        var ratio = errR > 0 ? (errE / errR) : Infinity;

        // Left: time series
        var yMax = Math.max(2, Math.max.apply(null, xE.map(Math.abs)) * 1.1);
        Plotly.newPlot('impEuler-timePlot', [
            { x: tExact, y: xExact, type: 'scatter', mode: 'lines',
              name: 'Exact', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: tE, y: xE, type: 'scatter', mode: 'lines',
              name: 'Euler', line: { color: '#00f3ff', width: 2 } },
            { x: tR, y: xR, type: 'scatter', mode: 'lines',
              name: 'RK2', line: { color: '#00ff9f', width: 2 } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, T], 't'),
            yaxis: axStyle([-yMax, yMax], 'x(t)'),
            showlegend: true,
            legend: { x: 0.5, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: phase portrait
        var vExact = tExact.map(function(t) { return -Math.sin(t); });
        var phMax = Math.max(2, Math.max.apply(null, vE.map(Math.abs)) * 1.1);
        Plotly.newPlot('impEuler-phasePlot', [
            { x: xExact, y: vExact, type: 'scatter', mode: 'lines',
              name: 'Exact', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: xE, y: vE, type: 'scatter', mode: 'lines',
              name: 'Euler', line: { color: '#00f3ff', width: 2 } },
            { x: xR, y: vR, type: 'scatter', mode: 'lines',
              name: 'RK2', line: { color: '#00ff9f', width: 2 } },
            { x: [1], y: [0], type: 'scatter', mode: 'markers',
              name: 'Start', marker: { color: '#ffff00', size: 10, symbol: 'star' } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-phMax, phMax], 'x'),
            yaxis: axStyle([-phMax, phMax], 'v'),
            showlegend: true,
            legend: { x: 0.55, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Stats
        setText('impEuler-race-eulerErr', errE.toExponential(2));
        setText('impEuler-race-rk2Err', errR.toExponential(2));
        setText('impEuler-race-ratio', isFinite(ratio) ? ratio.toFixed(1) + '×' : '∞');
    }

    // ===== Explorer 2: Convergence Rate =====
    function plotConv() {
        var T = parseFloat(document.getElementById('impEuler-conv-T-slider').value);
        var eqKey = document.getElementById('impEuler-conv-eq-select').value;

        // Step sizes
        var logH = [];
        for (var lh = 0; lh >= -4; lh -= 0.2) logH.push(lh);
        var hVals = logH.map(function(lh) { return Math.pow(10, lh); });

        var eulerErrs = [], rk2Errs = [];

        for (var i = 0; i < hVals.length; i++) {
            var hv = hVals[i];
            var errE, errR;

            if (eqKey === 'sho') {
                var sE = eulerSys(fSHO, [1, 0], T, hv);
                var sR = rk2Sys(fSHO, [1, 0], T, hv);
                errE = Math.abs(sE.Y[sE.Y.length - 1][0] - Math.cos(T));
                errR = Math.abs(sR.Y[sR.Y.length - 1][0] - Math.cos(T));
            } else if (eqKey === 'decay') {
                var sE = eulerScalar(function(t, y) { return -y; }, 1, T, hv);
                var sR = rk2Scalar(function(t, y) { return -y; }, 1, T, hv);
                errE = Math.abs(sE.y[sE.y.length - 1] - Math.exp(-T));
                errR = Math.abs(sR.y[sR.y.length - 1] - Math.exp(-T));
            } else {
                var sE = eulerSys(fDamped, [1, 0], T, hv);
                var sR = rk2Sys(fDamped, [1, 0], T, hv);
                errE = Math.abs(sE.Y[sE.Y.length - 1][0] - dampedExact(T));
                errR = Math.abs(sR.Y[sR.Y.length - 1][0] - dampedExact(T));
            }
            eulerErrs.push(errE > 0 ? errE : 1e-16);
            rk2Errs.push(errR > 0 ? errR : 1e-16);
        }

        // Compute slopes
        var eulerSlope = computeSlope(hVals, eulerErrs, 1e-3, 0.1);
        var rk2Slope = computeSlope(hVals, rk2Errs, 1e-3, 0.1);

        // Ratio at h=0.01
        var idx01 = 0;
        for (var i = 0; i < hVals.length; i++) {
            if (Math.abs(hVals[i] - 0.01) < 0.005) { idx01 = i; break; }
        }
        var ratioAt01 = eulerErrs[idx01] / rk2Errs[idx01];

        // Left: convergence plot
        Plotly.newPlot('impEuler-convPlot', [
            { x: hVals, y: eulerErrs, type: 'scatter', mode: 'markers+lines',
              name: 'Euler', marker: { color: '#00f3ff', size: 5 },
              line: { color: '#00f3ff', width: 2 } },
            { x: hVals, y: rk2Errs, type: 'scatter', mode: 'markers+lines',
              name: 'RK2', marker: { color: '#00ff9f', size: 5 },
              line: { color: '#00ff9f', width: 2 } },
            { x: [1e-4, 1], y: [1e-4, 1], type: 'scatter', mode: 'lines',
              name: 'O(h)', line: { color: '#808080', width: 1, dash: 'dot' } },
            { x: [1e-4, 1], y: [1e-8, 1], type: 'scatter', mode: 'lines',
              name: 'O(h²)', line: { color: '#ff00ff', width: 1, dash: 'dot' } }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle(null, 'Step size h'), { type: 'log' }),
            yaxis: Object.assign(axStyle(null, '|Error at t=T|'), { type: 'log' }),
            showlegend: true,
            legend: { x: 0.05, y: 0.95, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: halving-h improvement bars
        var halvingH = [], eulerRatios = [], rk2Ratios = [];
        for (var i = 1; i < hVals.length; i++) {
            if (Math.abs(hVals[i] / hVals[i - 1] - 0.5) < 0.2) {
                halvingH.push(hVals[i - 1].toExponential(1));
                eulerRatios.push(eulerErrs[i - 1] / eulerErrs[i]);
                rk2Ratios.push(rk2Errs[i - 1] / rk2Errs[i]);
            }
        }
        // Take last 8 for readability
        var nShow = Math.min(8, halvingH.length);
        halvingH = halvingH.slice(-nShow);
        eulerRatios = eulerRatios.slice(-nShow);
        rk2Ratios = rk2Ratios.slice(-nShow);

        Plotly.newPlot('impEuler-halvingPlot', [
            { x: halvingH, y: eulerRatios, type: 'bar', name: 'Euler ratio',
              marker: { color: '#00f3ff' } },
            { x: halvingH, y: rk2Ratios, type: 'bar', name: 'RK2 ratio',
              marker: { color: '#00ff9f' } },
            { x: [halvingH[0], halvingH[halvingH.length - 1]], y: [2, 2],
              type: 'scatter', mode: 'lines', name: '2× (Euler target)',
              line: { color: '#00f3ff', width: 1, dash: 'dash' } },
            { x: [halvingH[0], halvingH[halvingH.length - 1]], y: [4, 4],
              type: 'scatter', mode: 'lines', name: '4× (RK2 target)',
              line: { color: '#00ff9f', width: 1, dash: 'dash' } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'h value'),
            yaxis: axStyle([0, 6], 'Error ratio (halving h)'),
            barmode: 'group',
            showlegend: true,
            legend: { x: 0.3, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' },
            title: { text: 'Improvement when halving h', font: { size: 13, color: '#ffffff' } }
        }), { responsive: true });

        // Stats
        setText('impEuler-conv-eulerSlope', eulerSlope.toFixed(2));
        setText('impEuler-conv-rk2Slope', rk2Slope.toFixed(2));
        setText('impEuler-conv-ratio', ratioAt01.toFixed(0) + '× better');
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

    // ===== Explorer 3: Energy Conservation =====
    function plotEnergy() {
        var h = parseFloat(document.getElementById('impEuler-energy-h-slider').value);
        var T = parseFloat(document.getElementById('impEuler-energy-T-slider').value);

        var solE = eulerSys(fSHO, [1, 0], T, h);
        var solR = rk2Sys(fSHO, [1, 0], T, h);

        var E0 = 0.5; // initial energy = 0.5*x²+0.5*v² = 0.5
        var tArr = solE.t;

        var eEuler = [], eRK2 = [];
        for (var i = 0; i < solE.Y.length; i++) {
            var x = solE.Y[i][0], v = solE.Y[i][1];
            eEuler.push((0.5 * x * x + 0.5 * v * v) / E0);
        }
        for (var i = 0; i < solR.Y.length; i++) {
            var x = solR.Y[i][0], v = solR.Y[i][1];
            eRK2.push((0.5 * x * x + 0.5 * v * v) / E0);
        }

        var eulerFinal = eEuler[eEuler.length - 1];
        var rk2Final = eRK2[eRK2.length - 1];

        // Left: energy ratio vs time
        var eMax = Math.max(2, Math.max.apply(null, eEuler) * 1.1);
        Plotly.newPlot('impEuler-energyPlot', [
            { x: [0, T], y: [1, 1], type: 'scatter', mode: 'lines',
              name: 'Exact (E=const)', line: { color: '#ffff00', width: 1, dash: 'dash' } },
            { x: tArr, y: eEuler, type: 'scatter', mode: 'lines',
              name: 'Euler', line: { color: '#00f3ff', width: 2 } },
            { x: solR.t, y: eRK2, type: 'scatter', mode: 'lines',
              name: 'RK2', line: { color: '#00ff9f', width: 2 } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, T], 't'),
            yaxis: axStyle([0.5, eMax], 'E(t)/E(0)'),
            showlegend: true,
            legend: { x: 0.05, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: trajectories
        var xE = [], vE = [], xR = [], vR = [];
        for (var i = 0; i < solE.Y.length; i++) { xE.push(solE.Y[i][0]); vE.push(solE.Y[i][1]); }
        for (var i = 0; i < solR.Y.length; i++) { xR.push(solR.Y[i][0]); vR.push(solR.Y[i][1]); }

        var phMax = Math.max(2, Math.max.apply(null, xE.map(Math.abs)) * 1.1);
        Plotly.newPlot('impEuler-trajPlot', [
            { x: xE, y: vE, type: 'scatter', mode: 'lines',
              name: 'Euler', line: { color: '#00f3ff', width: 1.5 } },
            { x: xR, y: vR, type: 'scatter', mode: 'lines',
              name: 'RK2', line: { color: '#00ff9f', width: 2 } },
            { x: [1], y: [0], type: 'scatter', mode: 'markers',
              name: 'Start', marker: { color: '#ffff00', size: 10, symbol: 'star' } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-phMax, phMax], 'x'),
            yaxis: axStyle([-phMax, phMax], 'v'),
            showlegend: true,
            legend: { x: 0.55, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Stats
        setText('impEuler-energy-eulerRatio', eulerFinal.toFixed(3));
        setText('impEuler-energy-rk2Ratio', rk2Final.toFixed(3));
        var eulerDriftPct = ((eulerFinal - 1) * 100);
        var rk2DriftPct = ((rk2Final - 1) * 100);
        setText('impEuler-energy-eulerDrift', (eulerDriftPct > 0 ? '+' : '') + eulerDriftPct.toFixed(1) + '%');
        setText('impEuler-energy-rk2Drift', (rk2DriftPct > 0 ? '+' : '') + rk2DriftPct.toFixed(1) + '%');
    }

    // ===== Helper =====
    function setText(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    // ===== Event handlers =====
    function attachHandlers() {
        // Explorer 1
        var raceIds = ['impEuler-race-h-slider', 'impEuler-race-T-slider'];
        var raceLabs = ['impEuler-race-h-value', 'impEuler-race-T-value'];
        var raceDecs = [2, 0];
        for (var i = 0; i < raceIds.length; i++) {
            (function(sid, lid, dec) {
                var el = document.getElementById(sid);
                if (el) el.addEventListener('input', function() {
                    document.getElementById(lid).textContent = parseFloat(this.value).toFixed(dec);
                    plotRace();
                });
            })(raceIds[i], raceLabs[i], raceDecs[i]);
        }

        // Explorer 2
        var convT = document.getElementById('impEuler-conv-T-slider');
        if (convT) convT.addEventListener('input', function() {
            setText('impEuler-conv-T-value', this.value);
            plotConv();
        });
        var convEq = document.getElementById('impEuler-conv-eq-select');
        if (convEq) convEq.addEventListener('change', plotConv);

        // Explorer 3
        var ids3 = ['impEuler-energy-h-slider', 'impEuler-energy-T-slider'];
        var labs3 = ['impEuler-energy-h-value', 'impEuler-energy-T-value'];
        var decs3 = [2, 0];
        for (var i = 0; i < ids3.length; i++) {
            (function(sid, lid, dec) {
                var el = document.getElementById(sid);
                if (el) el.addEventListener('input', function() {
                    document.getElementById(lid).textContent = parseFloat(this.value).toFixed(dec);
                    plotEnergy();
                });
            })(ids3[i], labs3[i], decs3[i]);
        }
    }

    // ===== Global reset functions =====
    window.impEulerRaceReset = function() {
        document.getElementById('impEuler-race-h-slider').value = 0.15;
        document.getElementById('impEuler-race-T-slider').value = 30;
        setText('impEuler-race-h-value', '0.15');
        setText('impEuler-race-T-value', '30');
        plotRace();
    };

    window.impEulerConvReset = function() {
        document.getElementById('impEuler-conv-T-slider').value = 5;
        document.getElementById('impEuler-conv-eq-select').value = 'sho';
        setText('impEuler-conv-T-value', '5');
        plotConv();
    };

    window.impEulerEnergyReset = function() {
        document.getElementById('impEuler-energy-h-slider').value = 0.10;
        document.getElementById('impEuler-energy-T-slider').value = 50;
        setText('impEuler-energy-h-value', '0.10');
        setText('impEuler-energy-T-value', '50');
        plotEnergy();
    };

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }
        var el = document.getElementById('impEuler-timePlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }
        plotRace();
        plotConv();
        plotEnergy();
        attachHandlers();
    }

    initializePlots();
})();
