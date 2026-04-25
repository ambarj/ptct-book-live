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

    // ===============================================================
    // EXPLORER 1: Ensemble Statistics
    // ===============================================================
    window.wsEnsembleRun = function() {
        var N = parseInt(document.getElementById('ws-N-slider').value);
        var nW = parseInt(document.getElementById('ws-nw-slider').value);
        var p = parseFloat(document.getElementById('ws-p-slider').value);

        var finals = [];
        for (var w = 0; w < nW; w++) {
            var x = 0;
            for (var s = 0; s < N; s++) x += Math.random() < p ? 1 : -1;
            finals.push(x);
        }

        var sumX = 0, sumX2 = 0;
        for (var i = 0; i < nW; i++) { sumX += finals[i]; sumX2 += finals[i] * finals[i]; }
        var meanX = sumX / nW, meanX2 = sumX2 / nW;
        var thMean = N * (2 * p - 1), thVar = 4 * N * p * (1 - p);

        // Running mean convergence
        var ns = [], runMeans = [], runX2s = [];
        var cSum = 0, cSum2 = 0;
        for (var i = 0; i < nW; i++) {
            cSum += finals[i]; cSum2 += finals[i] * finals[i];
            if ((i + 1) % Math.max(1, Math.floor(nW / 200)) === 0) {
                ns.push(i + 1); runMeans.push(cSum / (i + 1)); runX2s.push(cSum2 / (i + 1));
            }
        }

        Plotly.react('ws-meanPlot', [
            { x: ns, y: runMeans, type: 'scatter', mode: 'lines', line: { color: '#00f3ff', width: 2 }, name: 'Running ⟨x⟩' },
            { x: [0, nW], y: [thMean, thMean], type: 'scatter', mode: 'lines',
              line: { color: 'white', width: 1.5, dash: 'dash' }, name: 'Theory: ' + thMean.toFixed(1) }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, nW], 'Walkers'), yaxis: axStyle(null, '⟨x⟩'),
            height: 400, legend: { x: 0.5, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        Plotly.react('ws-varPlot', [
            { x: ns, y: runX2s, type: 'scatter', mode: 'lines', line: { color: '#ff006e', width: 2 }, name: 'Running ⟨x²⟩' },
            { x: [0, nW], y: [thMean * thMean + thVar, thMean * thMean + thVar], type: 'scatter', mode: 'lines',
              line: { color: 'white', width: 1.5, dash: 'dash' }, name: 'Theory: ' + (thMean * thMean + thVar).toFixed(0) }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, nW], 'Walkers'), yaxis: axStyle(null, '⟨x²⟩'),
            height: 400, legend: { x: 0.5, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('ws-stats1').innerHTML =
            '<span><strong>N = ' + N + ', ' + nW + ' walkers, p = ' + p.toFixed(2) + '</strong></span>' +
            '<span>MC: ⟨x⟩ = ' + meanX.toFixed(1) + ' (theory: ' + thMean.toFixed(1) + ')  |  ⟨x²⟩ = ' + meanX2.toFixed(0) + ' (theory: ' + (thMean * thMean + thVar).toFixed(0) + ')</span>';
    };

    // ===============================================================
    // EXPLORER 2: Variance Growth
    // ===============================================================
    window.wsGrowthRun = function() {
        var nW = parseInt(document.getElementById('ws-growth-nw-value').textContent);
        var Ns = [10, 25, 50, 100, 200, 400, 700, 1000, 1500, 2000];
        var x2Vals = [], rmsVals = [];

        for (var ni = 0; ni < Ns.length; ni++) {
            var N = Ns[ni], sumX2 = 0;
            for (var w = 0; w < nW; w++) {
                var x = 0;
                for (var s = 0; s < N; s++) x += Math.random() < 0.5 ? 1 : -1;
                sumX2 += x * x;
            }
            x2Vals.push(sumX2 / nW);
            rmsVals.push(Math.sqrt(sumX2 / nW));
        }

        Plotly.react('ws-growthPlot', [
            { x: Ns, y: x2Vals, type: 'scatter', mode: 'markers+lines',
              marker: { color: '#00f3ff', size: 10 }, line: { color: '#00f3ff', width: 2 }, name: 'MC ⟨x²⟩' },
            { x: [0, 2000], y: [0, 2000], type: 'scatter', mode: 'lines',
              line: { color: 'white', width: 2, dash: 'dash' }, name: '⟨x²⟩ = N' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 2200], 'Steps N'), yaxis: axStyle([0, 2200], '⟨x²⟩'),
            height: 400, legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        var sqrtN = Ns.map(function(n) { return Math.sqrt(n); });
        Plotly.react('ws-rmsPlot', [
            { x: Ns, y: rmsVals, type: 'scatter', mode: 'markers+lines',
              marker: { color: '#ff006e', size: 10 }, line: { color: '#ff006e', width: 2 }, name: 'MC RMS' },
            { x: Ns, y: sqrtN, type: 'scatter', mode: 'lines',
              line: { color: 'white', width: 2, dash: 'dash' }, name: '√N' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 2200], 'Steps N'), yaxis: axStyle([0, 50], 'RMS = √⟨x²⟩'),
            height: 400, legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('ws-stats2').innerHTML =
            '<span><strong>' + nW + ' walkers per N, ' + Ns.length + ' data points</strong></span>' +
            '<span>⟨x²⟩ grows linearly with N (slope ≈ 1)  |  RMS grows as √N</span>';
    };

    // ===============================================================
    // EXPLORER 3: √N vs N Comparison
    // ===============================================================
    window.wsCompareRun = function() {
        var maxN = parseInt(document.getElementById('ws-maxN-slider').value);

        var ns = [], sqrtN = [], linearN = [], ratio = [];
        for (var n = 1; n <= maxN; n += Math.max(1, Math.floor(maxN / 500))) {
            ns.push(n); sqrtN.push(Math.sqrt(n)); linearN.push(n); ratio.push(Math.sqrt(n) / n);
        }

        // Also show a few actual random walks
        var walkTraces = [];
        for (var w = 0; w < 5; w++) {
            var pos = [0], x = 0;
            for (var s = 0; s < maxN; s++) { x += Math.random() < 0.5 ? 1 : -1; pos.push(Math.abs(x)); }
            walkTraces.push({ y: pos, type: 'scatter', mode: 'lines',
                line: { color: 'rgba(0,243,255,0.3)', width: 1 }, showlegend: false });
        }

        walkTraces.push({ x: ns, y: sqrtN, type: 'scatter', mode: 'lines',
            line: { color: '#ffbe0b', width: 3 }, name: 'Diffusion: √N' });
        walkTraces.push({ x: ns, y: linearN, type: 'scatter', mode: 'lines',
            line: { color: '#ff006e', width: 3, dash: 'dash' }, name: 'Ballistic: N' });

        Plotly.react('ws-comparePlot', walkTraces, Object.assign({}, darkLayout, {
            xaxis: axStyle([0, maxN], 'Steps N'),
            yaxis: axStyle([0, maxN * 1.05], 'Distance from origin'),
            height: 420, legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('ws-stats3').innerHTML =
            '<span><strong>At N = ' + maxN + ': Ballistic = ' + maxN + '  |  Diffusion = ' + Math.sqrt(maxN).toFixed(0) + ' (' + (100 * Math.sqrt(maxN) / maxN).toFixed(1) + '% of ballistic)</strong></span>';
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('ws-meanPlot')) { setTimeout(initializePlots, 100); return; }

        var ph = function(ids, text) {
            ids.forEach(function(id) {
                Plotly.react(id, [], Object.assign({}, darkLayout, {
                    xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: id === 'ws-comparePlot' ? 420 : 400,
                    annotations: [{ x: 0.5, y: 0.5, text: text, font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
                }), { responsive: true });
            });
        };

        ph(['ws-meanPlot', 'ws-varPlot'], 'Click "Run Ensemble"');
        ph(['ws-growthPlot', 'ws-rmsPlot'], 'Click "Compute Growth"');
        ph(['ws-comparePlot'], 'Click "Compare"');

        ['ws-N-slider', 'ws-nw-slider'].forEach(function(id) {
            document.getElementById(id).addEventListener('input', function() {
                document.getElementById(id.replace('slider', 'value')).textContent = this.value;
            });
        });
        document.getElementById('ws-p-slider').addEventListener('input', function() {
            document.getElementById('ws-p-value').textContent = parseFloat(this.value).toFixed(2);
        });
        document.getElementById('ws-growth-nw-slider').addEventListener('input', function() {
            document.getElementById('ws-growth-nw-value').textContent = this.value;
        });
        document.getElementById('ws-maxN-slider').addEventListener('input', function() {
            document.getElementById('ws-maxN-value').textContent = this.value;
        });
    }

    initializePlots();
})();
