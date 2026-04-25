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

    function classify(tau, delta) {
        if (delta < 0) return 'Saddle';
        var disc = tau * tau - 4 * delta;
        if (disc > 0) return tau < 0 ? 'Stable Node' : 'Unstable Node';
        if (Math.abs(tau) < 0.01) return 'Center';
        return tau < 0 ? 'Stable Spiral' : 'Unstable Spiral';
    }

    var typeColors = {
        'Saddle': '#ff5722', 'Stable Node': '#00f3ff', 'Unstable Node': '#ff006e',
        'Stable Spiral': '#00ff88', 'Unstable Spiral': '#bb86fc', 'Center': '#ffbe0b'
    };
    var typeOrder = ['Saddle', 'Stable Node', 'Unstable Node', 'Stable Spiral', 'Unstable Spiral'];

    // ===== Accumulator state =====
    var accum = { taus: [], deltas: [], counts: {}, total: 0 };
    function resetAccum() {
        accum = { taus: [], deltas: [], counts: {}, total: 0 };
        for (var i = 0; i < typeOrder.length; i++) accum.counts[typeOrder[i]] = 0;
    }
    resetAccum();

    // ===============================================================
    // EXPLORER 1: Random Matrix Generator
    // ===============================================================
    function drawExplorer1() {
        // Scatter (show last 5000 points max)
        var showMax = 5000;
        var startIdx = Math.max(0, accum.taus.length - showMax);
        var showTau = accum.taus.slice(startIdx);
        var showDelta = accum.deltas.slice(startIdx);

        // Color by type
        var colors = [];
        for (var i = 0; i < showTau.length; i++) {
            var tp = classify(showTau[i], showDelta[i]);
            colors.push(typeColors[tp] || '#aaa');
        }

        // Parabola
        var pT = [], pD = [];
        for (var t = -4; t <= 4; t += 0.05) { pT.push(t); pD.push(t * t / 4); }

        Plotly.react('rm-scatterPlot', [
            { x: showTau, y: showDelta, type: 'scatter', mode: 'markers',
              marker: { color: colors, size: 2, opacity: 0.4 }, hoverinfo: 'none', showlegend: false },
            { x: pT, y: pD, type: 'scatter', mode: 'lines',
              line: { color: 'rgba(255,255,255,0.4)', width: 1.5 }, hoverinfo: 'skip', showlegend: false },
            { x: [-4.5, 4.5], y: [0, 0], type: 'scatter', mode: 'lines',
              line: { color: 'rgba(255,190,11,0.3)', width: 1, dash: 'dash' }, hoverinfo: 'skip', showlegend: false }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-4.5, 4.5], 'τ'), yaxis: axStyle([-3, 5], 'Δ'), height: 400
        }), { responsive: true });

        // Bar chart
        var labels = typeOrder.slice();
        var vals = labels.map(function(tp) { return accum.total > 0 ? (accum.counts[tp] || 0) / accum.total * 100 : 0; });
        var barColors = labels.map(function(tp) { return typeColors[tp]; });

        Plotly.react('rm-barPlot', [
            { x: labels, y: vals, type: 'bar', marker: { color: barColors }, showlegend: false }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''), yaxis: axStyle([0, 60], 'Percentage (%)'), height: 400
        }), { responsive: true });

        document.getElementById('rm-stats1').innerHTML =
            '<span><strong>Total: ' + accum.total.toLocaleString() + ' matrices</strong></span>' +
            '<span>' + typeOrder.map(function(tp) { return tp + ': ' + ((accum.counts[tp] || 0) / Math.max(accum.total, 1) * 100).toFixed(1) + '%'; }).join('  |  ') + '</span>';
    }

    window.rmGenerate = function() {
        var R = parseFloat(document.getElementById('rm-R-slider').value);
        var batch = parseInt(document.getElementById('rm-batch-select').value);

        for (var i = 0; i < batch; i++) {
            var a = (Math.random() * 2 - 1) * R;
            var b = (Math.random() * 2 - 1) * R;
            var c = (Math.random() * 2 - 1) * R;
            var d = (Math.random() * 2 - 1) * R;
            var tau = a + d, delta = a * d - b * c;
            accum.taus.push(tau);
            accum.deltas.push(delta);
            accum.total++;
            var tp = classify(tau, delta);
            accum.counts[tp] = (accum.counts[tp] || 0) + 1;
        }
        drawExplorer1();
    };

    window.rmReset = function() {
        resetAccum();
        drawExplorer1();
    };

    // ===============================================================
    // EXPLORER 2: τ-Δ Density Map
    // ===============================================================
    window.rmDensityRun = function() {
        var R = parseFloat(document.getElementById('rm-density-R-slider').value);
        var N = parseInt(document.getElementById('rm-density-N-slider').value);

        var taus = [], deltas = [];
        for (var i = 0; i < N; i++) {
            var a = (Math.random() * 2 - 1) * R;
            var b = (Math.random() * 2 - 1) * R;
            var c = (Math.random() * 2 - 1) * R;
            var d = (Math.random() * 2 - 1) * R;
            taus.push(a + d);
            deltas.push(a * d - b * c);
        }

        var tRange = 3 * R, dRange = 2 * R * R;
        var pT = [], pD = [];
        for (var t = -tRange; t <= tRange; t += 0.05) { pT.push(t); pD.push(t * t / 4); }

        Plotly.react('rm-densityPlot', [
            { x: taus, y: deltas, type: 'histogram2d', nbinsx: 60, nbinsy: 60,
              colorscale: 'Viridis', showscale: true, hoverinfo: 'skip' },
            { x: pT, y: pD, type: 'scatter', mode: 'lines',
              line: { color: 'white', width: 2 }, name: 'τ²=4Δ', hoverinfo: 'skip' },
            { x: [-tRange, tRange], y: [0, 0], type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 1.5, dash: 'dash' }, name: 'Δ=0', hoverinfo: 'skip' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-tRange, tRange], 'τ (trace)'),
            yaxis: axStyle([-dRange, dRange * 1.5], 'Δ (determinant)'),
            height: 440, legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // Count saddles
        var nSaddle = 0;
        for (var i = 0; i < N; i++) if (deltas[i] < 0) nSaddle++;
        document.getElementById('rm-stats2').innerHTML =
            '<span><strong>N = ' + N.toLocaleString() + ', R = ' + R.toFixed(1) + '</strong></span>' +
            '<span>Saddle fraction: ' + (nSaddle / N * 100).toFixed(1) + '%</span>';
    };

    // ===============================================================
    // EXPLORER 3: Probability Calculator
    // ===============================================================
    window.rmProbRun = function() {
        var N = parseInt(document.getElementById('rm-prob-N-select').value);
        var counts = {};
        for (var i = 0; i < typeOrder.length; i++) counts[typeOrder[i]] = 0;

        var saddleHistory = [];
        for (var i = 0; i < N; i++) {
            var a = Math.random() * 2 - 1;
            var b = Math.random() * 2 - 1;
            var c = Math.random() * 2 - 1;
            var d = Math.random() * 2 - 1;
            var tau = a + d, delta = a * d - b * c;
            var tp = classify(tau, delta);
            counts[tp] = (counts[tp] || 0) + 1;

            if (i < 100 || (i + 1) % Math.max(1, Math.floor(N / 300)) === 0) {
                saddleHistory.push({ n: i + 1, frac: counts['Saddle'] / (i + 1) * 100 });
            }
        }

        // Bar chart
        var labels = typeOrder.slice();
        var vals = labels.map(function(tp) { return counts[tp] / N * 100; });
        var barColors = labels.map(function(tp) { return typeColors[tp]; });

        Plotly.react('rm-probBarPlot', [
            { x: labels, y: vals, type: 'bar', marker: { color: barColors }, showlegend: false,
              text: vals.map(function(v) { return v.toFixed(1) + '%'; }), textposition: 'outside',
              textfont: { color: '#aaa', size: 11 } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''), yaxis: axStyle([0, 60], 'Probability (%)'), height: 400
        }), { responsive: true });

        // Convergence of saddle fraction
        Plotly.react('rm-probConvergePlot', [
            { x: saddleHistory.map(function(h) { return h.n; }),
              y: saddleHistory.map(function(h) { return h.frac; }),
              type: 'scatter', mode: 'lines', line: { color: '#ff5722', width: 2 }, name: 'P(Saddle) %' },
            { x: [1, N], y: [50, 50], type: 'scatter', mode: 'lines',
              line: { color: 'rgba(255,255,255,0.4)', width: 1.5, dash: 'dash' }, name: '50% reference' }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle(null, 'N'), { type: 'log' }),
            yaxis: axStyle([40, 60], 'Saddle fraction (%)'),
            height: 400, legend: { x: 0.55, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('rm-stats3').innerHTML =
            '<span><strong>N = ' + N.toLocaleString() + '</strong></span>' +
            '<span>' + typeOrder.map(function(tp) { return tp + ': ' + (counts[tp] / N * 100).toFixed(1) + '%'; }).join('  |  ') + '</span>';
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('rm-scatterPlot')) { setTimeout(initializePlots, 100); return; }

        drawExplorer1();

        document.getElementById('rm-R-slider').addEventListener('input', function() {
            document.getElementById('rm-R-value').textContent = parseFloat(this.value).toFixed(1);
        });

        // Explorer 2 placeholder
        Plotly.react('rm-densityPlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle([-3, 3], 'τ'), yaxis: axStyle([-2, 3], 'Δ'), height: 440,
            annotations: [{ x: 0, y: 0.5, text: 'Click "Generate Map"', font: { color: '#aaa', size: 14 }, showarrow: false }]
        }), { responsive: true });

        document.getElementById('rm-density-R-slider').addEventListener('input', function() {
            document.getElementById('rm-density-R-value').textContent = parseFloat(this.value).toFixed(1);
        });
        document.getElementById('rm-density-N-slider').addEventListener('input', function() {
            document.getElementById('rm-density-N-value').textContent = this.value;
        });

        // Explorer 3 placeholders
        ['rm-probBarPlot', 'rm-probConvergePlot'].forEach(function(id) {
            Plotly.react(id, [], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
                annotations: [{ x: 0.5, y: 0.5, text: 'Click "Compute Probabilities"', font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
            }), { responsive: true });
        });
    }

    initializePlots();
})();
