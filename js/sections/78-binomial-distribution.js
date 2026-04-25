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

    // Log-binomial coefficient using Stirling-ish approach for large N
    function logBinom(n, k) {
        if (k < 0 || k > n) return -Infinity;
        if (k === 0 || k === n) return 0;
        var result = 0;
        for (var i = 0; i < k; i++) result += Math.log(n - i) - Math.log(i + 1);
        return result;
    }

    function binomProb(N, nR, p) {
        if (p <= 0) return nR === 0 ? 1 : 0;
        if (p >= 1) return nR === N ? 1 : 0;
        var logP = logBinom(N, nR) + nR * Math.log(p) + (N - nR) * Math.log(1 - p);
        return Math.exp(logP);
    }

    // ===============================================================
    // EXPLORER 1: Binomial Visualizer
    // ===============================================================
    function drawBinomial() {
        var N = parseInt(document.getElementById('bd-N-slider').value);
        var p = parseFloat(document.getElementById('bd-p-slider').value);
        var q = 1 - p;

        var mVals = [], probs = [];
        for (var nR = 0; nR <= N; nR++) {
            mVals.push(2 * nR - N);
            probs.push(binomProb(N, nR, p));
        }

        // Gaussian overlay
        var mu = N * (2 * p - 1), sigma = 2 * Math.sqrt(N * p * q);
        var gx = [], gy = [];
        for (var i = 0; i <= 200; i++) {
            var x = mu - 4 * sigma + i * 8 * sigma / 200;
            gx.push(x);
            gy.push(Math.exp(-(x - mu) * (x - mu) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI)) * 2);
        }

        Plotly.react('bd-distPlot', [
            { x: mVals, y: probs, type: 'bar', marker: { color: '#00f3ff' }, opacity: 0.7, name: 'Binomial P(m)' },
            { x: gx, y: gy, type: 'scatter', mode: 'lines',
              line: { color: 'white', width: 2, dash: 'dash' }, name: 'Gaussian approx' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-(N + 2), N + 2], 'Position m'),
            yaxis: axStyle([0, Math.max.apply(null, probs) * 1.2], 'P(m)'),
            height: 420, legend: { x: 0.65, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('bd-stats1').innerHTML =
            '<span><strong>N = ' + N + ', p = ' + p.toFixed(2) + '</strong></span>' +
            '<span>Peak at m = ' + mu.toFixed(0) + '  |  σ = ' + sigma.toFixed(2) + '  |  N+1 = ' + (N + 1) + ' possible positions</span>';
    }

    window.bdReset = function() {
        document.getElementById('bd-N-slider').value = 20;
        document.getElementById('bd-p-slider').value = 0.5;
        document.getElementById('bd-N-value').textContent = '20';
        document.getElementById('bd-p-value').textContent = '0.50';
        drawBinomial();
    };

    // ===============================================================
    // EXPLORER 2: N Evolution
    // ===============================================================
    function drawEvolution() {
        var N = parseInt(document.getElementById('bd-evol-N-slider').value);
        var p = 0.5, q = 0.5;

        // Small N (left): exact bars
        var mVals = [], probs = [];
        for (var nR = 0; nR <= N; nR++) {
            mVals.push(2 * nR - N);
            probs.push(binomProb(N, nR, p));
        }

        var sigma = 2 * Math.sqrt(N * p * q);
        var gx = [], gy = [];
        for (var i = 0; i <= 200; i++) {
            var x = -4 * sigma + i * 8 * sigma / 200;
            gx.push(x);
            gy.push(Math.exp(-x * x / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI)) * 2);
        }

        Plotly.react('bd-evolSmallPlot', [
            { x: mVals, y: probs, type: 'bar', marker: { color: '#00f3ff' }, opacity: 0.7, name: 'Binomial' },
            { x: gx, y: gy, type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 2, dash: 'dash' }, name: 'Gaussian' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-(N + 2), N + 2], 'Position m'),
            yaxis: axStyle([0, Math.max.apply(null, probs) * 1.3], 'P(m)'),
            height: 400, legend: { x: 0.65, y: 0.98, font: { color: '#aaa', size: 10 } },
            annotations: [{ x: 0, y: Math.max.apply(null, probs) * 1.15, text: 'N = ' + N,
                font: { color: '#aaa', size: 14 }, showarrow: false }]
        }), { responsive: true });

        // Right: difference between binomial and Gaussian
        var diffs = [];
        for (var i = 0; i < mVals.length; i++) {
            var m = mVals[i];
            var gaussVal = Math.exp(-m * m / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI)) * 2;
            diffs.push(Math.abs(probs[i] - gaussVal));
        }

        Plotly.react('bd-evolLargePlot', [
            { x: mVals, y: diffs, type: 'bar', marker: { color: '#ff006e' }, opacity: 0.7, name: '|Binomial − Gaussian|' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-(N + 2), N + 2], 'Position m'),
            yaxis: axStyle(null, '|Error|'),
            height: 400,
            annotations: [{ x: 0, y: 0, text: 'Max error: ' + Math.max.apply(null, diffs).toExponential(2),
                font: { color: '#ff006e', size: 12 }, showarrow: false, yref: 'paper', y: 0.95 }]
        }), { responsive: true });

        document.getElementById('bd-stats2').innerHTML =
            '<span><strong>N = ' + N + '  |  σ = √N = ' + Math.sqrt(N).toFixed(1) + '</strong></span>' +
            '<span>Max |Binomial − Gaussian| = ' + Math.max.apply(null, diffs).toExponential(2) +
            (N >= 50 ? '  (excellent match!)' : '  (gets better with larger N)') + '</span>';
    }

    window.bdEvolReset = function() {
        document.getElementById('bd-evol-N-slider').value = 10;
        document.getElementById('bd-evol-N-value').textContent = '10';
        drawEvolution();
    };

    // ===============================================================
    // EXPLORER 3: Simulation vs Theory
    // ===============================================================
    window.bdSimRun = function() {
        var N = parseInt(document.getElementById('bd-sim-N-slider').value);
        var nW = parseInt(document.getElementById('bd-sim-nw-slider').value);
        var p = 0.5;

        // Simulation
        var finals = [];
        for (var w = 0; w < nW; w++) {
            var x = 0;
            for (var s = 0; s < N; s++) x += Math.random() < p ? 1 : -1;
            finals.push(x);
        }

        // Theory
        var mVals = [], probs = [];
        for (var nR = 0; nR <= N; nR++) {
            mVals.push(2 * nR - N);
            probs.push(binomProb(N, nR, p));
        }

        // Scale theory to match histogram counts
        var scaledProbs = probs.map(function(pr) { return pr * nW; });

        Plotly.react('bd-simPlot', [
            { x: finals, type: 'histogram', marker: { color: '#00f3ff' }, opacity: 0.6, name: 'Simulation (' + nW + ' walks)',
              xbins: { start: -N - 1, end: N + 1, size: 2 } },
            { x: mVals, y: scaledProbs, type: 'scatter', mode: 'lines+markers',
              marker: { color: '#ffbe0b', size: 4 }, line: { color: '#ffbe0b', width: 2 }, name: 'Exact binomial' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-(N + 2), N + 2], 'Position m'), yaxis: axStyle(null, 'Count'),
            height: 420, barmode: 'overlay',
            legend: { x: 0.55, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        var mean = finals.reduce(function(a, b) { return a + b; }, 0) / nW;
        var rms = Math.sqrt(finals.reduce(function(a, b) { return a + b * b; }, 0) / nW);
        document.getElementById('bd-stats3').innerHTML =
            '<span><strong>N = ' + N + ', ' + nW + ' walkers</strong></span>' +
            '<span>MC: ⟨x⟩ = ' + mean.toFixed(1) + ', RMS = ' + rms.toFixed(1) + '  |  Theory: ⟨x⟩ = 0, RMS = √' + N + ' = ' + Math.sqrt(N).toFixed(1) + '</span>';
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('bd-distPlot')) { setTimeout(initializePlots, 100); return; }

        drawBinomial();
        document.getElementById('bd-N-slider').addEventListener('input', function() {
            document.getElementById('bd-N-value').textContent = this.value; drawBinomial();
        });
        document.getElementById('bd-p-slider').addEventListener('input', function() {
            document.getElementById('bd-p-value').textContent = parseFloat(this.value).toFixed(2); drawBinomial();
        });

        drawEvolution();
        document.getElementById('bd-evol-N-slider').addEventListener('input', function() {
            document.getElementById('bd-evol-N-value').textContent = this.value; drawEvolution();
        });

        // Explorer 3 placeholder
        Plotly.react('bd-simPlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 420,
            annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run Comparison"', font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
        }), { responsive: true });

        document.getElementById('bd-sim-N-slider').addEventListener('input', function() {
            document.getElementById('bd-sim-N-value').textContent = this.value;
        });
        document.getElementById('bd-sim-nw-slider').addEventListener('input', function() {
            document.getElementById('bd-sim-nw-value').textContent = this.value;
        });
    }

    initializePlots();
})();
