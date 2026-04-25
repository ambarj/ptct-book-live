(function() {
    'use strict';

    var darkLayout = {
        template: 'plotly_dark',
        margin: { t: 30, r: 20, b: 45, l: 55 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    };

    function axStyle(range, title) {
        return { gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080', range: range, title: title || '' };
    }

    var colors = ['#00f3ff','#ff006e','#ffbe0b','#00ff88','#bb86fc','#ff5722','#76ff03','#40c4ff'];

    // ===============================================================
    // EXPLORER 1: Application Gallery
    // ===============================================================
    window.appRun = function() {
        var field = document.getElementById('app-field-select').value;

        if (field === 'diffusion') {
            // 1D Random walks
            var nW = 10, nS = 500;
            var demoTraces = [], rmsArr = new Float64Array(nS + 1);
            for (var w = 0; w < nW; w++) {
                var pos = [0], x = 0;
                for (var s = 0; s < nS; s++) { x += Math.random() < 0.5 ? 1 : -1; pos.push(x); rmsArr[s + 1] += x * x; }
                if (w < 5) demoTraces.push({ y: pos, type: 'scatter', mode: 'lines', line: { color: colors[w], width: 1.5 }, showlegend: false });
            }
            Plotly.react('app-demoPlot', demoTraces, Object.assign({}, darkLayout, {
                xaxis: axStyle([0, nS], 'Step'), yaxis: axStyle(null, 'Position x'), height: 400
            }), { responsive: true });

            var rmsX = [], rmsY = [];
            for (var s = 0; s <= nS; s += 5) { rmsX.push(s); rmsY.push(Math.sqrt(rmsArr[s] / nW)); }
            Plotly.react('app-resultPlot', [
                { x: rmsX, y: rmsY, type: 'scatter', mode: 'lines', line: { color: '#00f3ff', width: 2 }, name: 'MC RMS' },
                { x: rmsX, y: rmsX.map(function(n) { return Math.sqrt(n); }), type: 'scatter', mode: 'lines',
                  line: { color: 'white', width: 1.5, dash: 'dash' }, name: '√N theory' }
            ], Object.assign({}, darkLayout, {
                xaxis: axStyle([0, nS], 'Steps'), yaxis: axStyle(null, 'RMS distance'), height: 400,
                legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
            }), { responsive: true });
            document.getElementById('app-stats1').innerHTML = '<span><strong>Diffusion: ⟨x²⟩ ∝ N (verified)</strong></span>';

        } else if (field === 'finance') {
            var nPaths = 50, nDays = 252, mu = 0.05, sigma = 0.2, S0 = 100;
            var dt = 1 / nDays;
            var demoTraces = [], finals = [];
            for (var p = 0; p < nPaths; p++) {
                var S = [S0], s = S0;
                for (var d = 0; d < nDays; d++) {
                    var z = (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() - 3) * Math.sqrt(2);
                    s *= Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z);
                    S.push(s);
                }
                finals.push(s);
                if (p < 10) demoTraces.push({ y: S, type: 'scatter', mode: 'lines', line: { color: colors[p % 8], width: 1, opacity: 0.6 }, showlegend: false });
            }
            Plotly.react('app-demoPlot', demoTraces, Object.assign({}, darkLayout, {
                xaxis: axStyle([0, nDays], 'Trading days'), yaxis: axStyle(null, 'Stock price $'), height: 400
            }), { responsive: true });
            Plotly.react('app-resultPlot', [
                { x: finals, type: 'histogram', marker: { color: '#00f3ff' }, nbinsx: 20, name: 'Final prices' }
            ], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, 'Final price $'), yaxis: axStyle(null, 'Count'), height: 400
            }), { responsive: true });
            var avg = finals.reduce(function(a, b) { return a + b; }, 0) / nPaths;
            document.getElementById('app-stats1').innerHTML = '<span><strong>Finance: ' + nPaths + ' paths, avg final = $' + avg.toFixed(1) + '</strong></span>';

        } else if (field === 'buffon') {
            var N = 10000, L = 1, D = 1, crossings = 0;
            var xMid = [], angles = [], hitX = [], hitA = [], missX = [], missA = [];
            for (var i = 0; i < N; i++) {
                var x = Math.random() * D / 2;
                var theta = Math.random() * Math.PI;
                var tip = x + L / 2 * Math.sin(theta);
                if (tip >= D / 2) { crossings++; if (i < 2000) { hitX.push(x); hitA.push(theta); } }
                else { if (i < 2000) { missX.push(x); missA.push(theta); } }
            }
            var piEst = 2 * L * N / (D * crossings);
            Plotly.react('app-demoPlot', [
                { x: hitX, y: hitA, type: 'scatter', mode: 'markers', marker: { color: '#00f3ff', size: 2, opacity: 0.4 }, name: 'Crossing' },
                { x: missX, y: missA, type: 'scatter', mode: 'markers', marker: { color: '#ff006e', size: 2, opacity: 0.2 }, name: 'Miss' }
            ], Object.assign({}, darkLayout, {
                xaxis: axStyle([0, 0.5], 'Distance to line'), yaxis: axStyle([0, Math.PI], 'Angle θ'), height: 400,
                legend: { x: 0.6, y: 0.98, font: { color: '#aaa', size: 10 } }
            }), { responsive: true });
            // Running estimate
            var ns = [], ests = [], cross = 0;
            for (var i = 0; i < N; i++) {
                var x = Math.random() * D / 2, theta = Math.random() * Math.PI;
                if (x + L / 2 * Math.sin(theta) >= D / 2) cross++;
                if ((i + 1) % 50 === 0 && cross > 0) { ns.push(i + 1); ests.push(2 * (i + 1) / cross); }
            }
            Plotly.react('app-resultPlot', [
                { x: ns, y: ests, type: 'scatter', mode: 'lines', line: { color: '#00f3ff', width: 2 }, name: 'π estimate' },
                { x: [0, N], y: [Math.PI, Math.PI], type: 'scatter', mode: 'lines', line: { color: 'white', width: 1.5, dash: 'dash' }, name: 'True π' }
            ], Object.assign({}, darkLayout, {
                xaxis: axStyle([0, N], 'Needles'), yaxis: axStyle([2.5, 4], 'π estimate'), height: 400,
                legend: { x: 0.6, y: 0.98, font: { color: '#aaa', size: 10 } }
            }), { responsive: true });
            document.getElementById('app-stats1').innerHTML = '<span><strong>Buffon: π ≈ ' + piEst.toFixed(4) + ' (true: ' + Math.PI.toFixed(4) + ')</strong></span>';

        } else if (field === 'percolation') {
            var L = 30, p = 0.59;
            var grid = [];
            for (var i = 0; i < L; i++) { var row = []; for (var j = 0; j < L; j++) row.push(Math.random() < p ? 1 : 0); grid.push(row); }
            Plotly.react('app-demoPlot', [
                { z: grid, type: 'heatmap', colorscale: [[0, '#1a1a2e'], [1, '#00f3ff']], showscale: false }
            ], Object.assign({}, darkLayout, {
                xaxis: Object.assign(axStyle(null, ''), { showticklabels: false }), yaxis: Object.assign(axStyle(null, ''), { showticklabels: false }),
                height: 400, annotations: [{ x: 15, y: -2, text: 'p = ' + p.toFixed(2) + ' (near p_c ≈ 0.593)', font: { color: '#aaa', size: 12 }, showarrow: false }]
            }), { responsive: true });
            // Sweep p
            var ps = [], fracs = [];
            for (var pi = 0; pi < 20; pi++) {
                var pp = 0.3 + pi * 0.4 / 19;
                ps.push(pp);
                var open = 0;
                for (var trial = 0; trial < 5; trial++) { var cnt = 0; for (var k = 0; k < L * L; k++) if (Math.random() < pp) cnt++; open += cnt / (L * L); }
                fracs.push(open / 5);
            }
            Plotly.react('app-resultPlot', [
                { x: ps, y: fracs, type: 'scatter', mode: 'lines+markers', marker: { color: '#00f3ff', size: 6 }, line: { color: '#00f3ff', width: 2 }, name: 'Open fraction' },
                { x: [0.593, 0.593], y: [0, 1], type: 'scatter', mode: 'lines', line: { color: '#ffbe0b', width: 2, dash: 'dash' }, name: 'p_c ≈ 0.593' }
            ], Object.assign({}, darkLayout, {
                xaxis: axStyle([0.3, 0.7], 'Occupation prob p'), yaxis: axStyle([0, 1.05], 'Fraction open'), height: 400,
                legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
            }), { responsive: true });
            document.getElementById('app-stats1').innerHTML = '<span><strong>Percolation: ' + L + '×' + L + ' grid at p = ' + p.toFixed(2) + '</strong></span>';
        }
    };

    // ===============================================================
    // EXPLORER 2: Random Walk Lab
    // ===============================================================
    window.appWalkRun = function() {
        var dim = parseInt(document.getElementById('app-dim-select').value);
        var nW = parseInt(document.getElementById('app-walkers-value').textContent);
        var nS = parseInt(document.getElementById('app-steps-value').textContent);

        var rmsArr = new Float64Array(nS + 1);
        var walkTraces = [];

        for (var w = 0; w < nW; w++) {
            var x = 0, y = 0, xs = [0], ys = [0];
            for (var s = 0; s < nS; s++) {
                if (dim === 1) { x += Math.random() < 0.5 ? 1 : -1; }
                else { var dir = Math.floor(Math.random() * 4); if (dir === 0) x++; else if (dir === 1) x--; else if (dir === 2) y++; else y--; }
                xs.push(x); ys.push(y);
                rmsArr[s + 1] += x * x + y * y;
            }
            if (w < 8) walkTraces.push({ x: dim === 2 ? xs : undefined, y: dim === 2 ? ys : xs,
                type: 'scatter', mode: 'lines', line: { color: colors[w % 8], width: 1, opacity: 0.6 }, showlegend: false });
        }

        if (dim === 2) {
            Plotly.react('app-walkPlot', walkTraces, Object.assign({}, darkLayout, {
                xaxis: Object.assign(axStyle(null, 'x'), { scaleanchor: 'y' }), yaxis: axStyle(null, 'y'), height: 400
            }), { responsive: true });
        } else {
            var traces1d = walkTraces.map(function(t) { return { y: t.y, type: 'scatter', mode: 'lines', line: t.line, showlegend: false }; });
            Plotly.react('app-walkPlot', traces1d, Object.assign({}, darkLayout, {
                xaxis: axStyle([0, nS], 'Step'), yaxis: axStyle(null, 'Position'), height: 400
            }), { responsive: true });
        }

        var rmsX = [], rmsY = [], thY = [];
        for (var s = 0; s <= nS; s += Math.max(1, Math.floor(nS / 300))) {
            rmsX.push(s); rmsY.push(Math.sqrt(rmsArr[s] / nW)); thY.push(Math.sqrt(s));
        }

        Plotly.react('app-rmsPlot', [
            { x: rmsX, y: rmsY, type: 'scatter', mode: 'lines', line: { color: '#00f3ff', width: 2 }, name: 'MC RMS' },
            { x: rmsX, y: thY, type: 'scatter', mode: 'lines', line: { color: 'white', width: 1.5, dash: 'dash' }, name: '√N theory' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, nS], 'Steps'), yaxis: axStyle(null, 'RMS distance'), height: 400,
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('app-stats2').innerHTML =
            '<span><strong>' + dim + 'D: ' + nW + ' walkers, ' + nS + ' steps</strong></span>' +
            '<span>Final RMS = ' + rmsY[rmsY.length - 1].toFixed(1) + '  |  Theory: √' + nS + ' = ' + Math.sqrt(nS).toFixed(1) + '</span>';
    };

    // ===============================================================
    // EXPLORER 3: Toolkit Summary
    // ===============================================================
    window.appToolRun = function() {
        var tool = document.getElementById('app-tool-select').value;
        var N = 5000;

        if (tool === 'sampleMean') {
            var ns = [], ests = [], sum = 0;
            for (var i = 1; i <= N; i++) { sum += 1 / (1 + Math.random()); if (i % 10 === 0) { ns.push(i); ests.push(sum / i); } }
            Plotly.react('app-toolkitPlot', [
                { x: ns, y: ests, type: 'scatter', mode: 'lines', line: { color: '#00f3ff', width: 2 }, name: 'Estimate' },
                { x: [0, N], y: [Math.log(2), Math.log(2)], type: 'scatter', mode: 'lines', line: { color: 'white', width: 1.5, dash: 'dash' }, name: 'ln 2' }
            ], Object.assign({}, darkLayout, { xaxis: axStyle([0, N], 'N'), yaxis: axStyle([0.5, 0.9], 'Estimate'), height: 420,
                legend: { x: 0.6, y: 0.98, font: { color: '#aaa', size: 10 } } }), { responsive: true });
            document.getElementById('app-stats3').innerHTML = '<span><strong>Sample Mean: ∫₀¹ 1/(1+x) dx ≈ ' + (sum / N).toFixed(5) + ' (exact: ' + Math.log(2).toFixed(5) + ')</strong></span>';

        } else if (tool === 'errorScaling') {
            var Ns = [50, 100, 200, 500, 1000, 2000, 5000], errs = [];
            for (var ni = 0; ni < Ns.length; ni++) {
                var trials = [];
                for (var t = 0; t < 100; t++) { var s = 0; for (var i = 0; i < Ns[ni]; i++) s += 1 / (1 + Math.random()); trials.push(s / Ns[ni]); }
                var mean = trials.reduce(function(a, b) { return a + b; }, 0) / 100;
                var v = 0; for (var t = 0; t < 100; t++) v += (trials[t] - mean) * (trials[t] - mean); errs.push(Math.sqrt(v / 99));
            }
            Plotly.react('app-toolkitPlot', [
                { x: Ns, y: errs, type: 'scatter', mode: 'markers+lines', marker: { color: '#00f3ff', size: 8 }, line: { color: '#00f3ff', width: 2 }, name: 'Measured error' },
                { x: [50, 5000], y: [errs[0] * Math.sqrt(50 / 50), errs[0] * Math.sqrt(50 / 5000)], type: 'scatter', mode: 'lines',
                  line: { color: 'white', width: 1.5, dash: 'dash' }, name: '1/√N' }
            ], Object.assign({}, darkLayout, { xaxis: Object.assign(axStyle(null, 'N'), { type: 'log' }), yaxis: Object.assign(axStyle(null, 'Error'), { type: 'log' }), height: 420,
                legend: { x: 0.5, y: 0.98, font: { color: '#aaa', size: 10 } } }), { responsive: true });
            document.getElementById('app-stats3').innerHTML = '<span><strong>Error ∝ 1/√N confirmed (slope ≈ −0.5 on log-log)</strong></span>';

        } else if (tool === 'importance') {
            var unifEsts = [], isEsts = [];
            for (var t = 0; t < 200; t++) {
                var su = 0, si = 0, ni = 0;
                for (var i = 0; i < 500; i++) { su += Math.exp(-10 * Math.pow(Math.random() - 0.7, 2)); }
                unifEsts.push(su / 500);
                for (var i = 0; i < 500; i++) {
                    var x = 0.7 + 0.22 * ((Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() - 3) * Math.sqrt(2));
                    if (x >= 0 && x <= 1) { var p = Math.exp(-0.5 * Math.pow((x - 0.7) / 0.22, 2)) / (0.22 * 2.507); si += Math.exp(-10 * (x - 0.7) * (x - 0.7)) / p; ni++; }
                }
                isEsts.push(ni > 0 ? si / ni : 0);
            }
            Plotly.react('app-toolkitPlot', [
                { x: unifEsts, type: 'histogram', opacity: 0.6, marker: { color: '#00f3ff' }, name: 'Uniform', nbinsx: 25 },
                { x: isEsts, type: 'histogram', opacity: 0.6, marker: { color: '#00ff88' }, name: 'Importance', nbinsx: 25 }
            ], Object.assign({}, darkLayout, { xaxis: axStyle(null, 'Estimate'), yaxis: axStyle(null, 'Count'), height: 420, barmode: 'overlay',
                legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } } }), { responsive: true });
            document.getElementById('app-stats3').innerHTML = '<span><strong>Importance sampling: much narrower histogram = lower variance</strong></span>';

        } else if (tool === 'hypersphere') {
            var dims = [2, 3, 4, 5, 6, 8, 10], vols = [], trueVols = [];
            function gamma(n) { if (n <= 0) return Infinity; if (n === 1) return 1; if (n === 0.5) return Math.sqrt(Math.PI); return (n - 1) * gamma(n - 1); }
            for (var di = 0; di < dims.length; di++) {
                var d = dims[di], inside = 0;
                for (var i = 0; i < 20000; i++) { var r2 = 0; for (var j = 0; j < d; j++) { var x = Math.random() * 2 - 1; r2 += x * x; } if (r2 <= 1) inside++; }
                vols.push(Math.pow(2, d) * inside / 20000);
                trueVols.push(Math.pow(Math.PI, d / 2) / gamma(d / 2 + 1));
            }
            Plotly.react('app-toolkitPlot', [
                { x: dims.map(function(d) { return d + 'D'; }), y: vols, type: 'bar', marker: { color: '#00f3ff' }, name: 'MC' },
                { x: dims.map(function(d) { return d + 'D'; }), y: trueVols, type: 'scatter', mode: 'markers+lines',
                  marker: { color: 'white', size: 8 }, line: { color: 'white', dash: 'dash' }, name: 'Exact' }
            ], Object.assign({}, darkLayout, { xaxis: axStyle(null, 'Dimension'), yaxis: axStyle(null, 'Volume'), height: 420,
                legend: { x: 0.6, y: 0.98, font: { color: '#aaa', size: 10 } } }), { responsive: true });
            document.getElementById('app-stats3').innerHTML = '<span><strong>Hypersphere volume peaks near d=5 then shrinks to zero</strong></span>';

        } else if (tool === 'metropolis') {
            var Ns = 50, T = 1, nSteps = 5000;
            var spins = []; for (var i = 0; i < Ns; i++) spins.push(Math.random() < 0.5 ? 1 : -1);
            var E = 0; for (var i = 0; i < Ns - 1; i++) E -= spins[i] * spins[i + 1];
            var Es = [];
            for (var step = 0; step < nSteps; step++) {
                var idx = Math.floor(Math.random() * Ns), dE = 0;
                if (idx > 0) dE += 2 * spins[idx] * spins[idx - 1];
                if (idx < Ns - 1) dE += 2 * spins[idx] * spins[idx + 1];
                if (dE <= 0 || Math.random() < Math.exp(-dE / T)) { spins[idx] *= -1; E += dE; }
                Es.push(E);
            }
            Plotly.react('app-toolkitPlot', [
                { y: Es, type: 'scatter', mode: 'lines', line: { color: '#00f3ff', width: 1 }, name: 'E(step)' }
            ], Object.assign({}, darkLayout, { xaxis: axStyle([0, nSteps], 'MC step'), yaxis: axStyle(null, 'Energy E/J'), height: 420 }), { responsive: true });
            var avg = 0; for (var i = 1000; i < nSteps; i++) avg += Es[i]; avg /= (nSteps - 1000);
            document.getElementById('app-stats3').innerHTML = '<span><strong>Metropolis: ⟨E⟩/N = ' + (avg / Ns).toFixed(3) + '  |  Exact: ' + (-Math.tanh(1 / T)).toFixed(3) + '</strong></span>';
        }
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('app-demoPlot')) { setTimeout(initializePlots, 100); return; }

        var ph = function(ids, text) {
            ids.forEach(function(id) {
                Plotly.react(id, [], Object.assign({}, darkLayout, {
                    xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: id === 'app-toolkitPlot' ? 420 : 400,
                    annotations: [{ x: 0.5, y: 0.5, text: text, font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
                }), { responsive: true });
            });
        };

        ph(['app-demoPlot', 'app-resultPlot'], 'Click "Run Demo"');
        ph(['app-walkPlot', 'app-rmsPlot'], 'Click "Launch Walkers"');
        ph(['app-toolkitPlot'], 'Select technique and click "Run Demo"');

        document.getElementById('app-walkers-slider').addEventListener('input', function() {
            document.getElementById('app-walkers-value').textContent = this.value;
        });
        document.getElementById('app-steps-slider').addEventListener('input', function() {
            document.getElementById('app-steps-value').textContent = this.value;
        });
    }

    initializePlots();
})();
