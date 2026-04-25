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
    // EXPLORER 1: Dart Board π Estimator
    // ===============================================================
    var dartState = { xIn: [], yIn: [], xOut: [], yOut: [], total: 0, inside: 0, history: [] };

    function drawDartBoard() {
        // Circle outline
        var circX = [], circY = [];
        for (var i = 0; i <= 100; i++) {
            var a = i * 2 * Math.PI / 100;
            circX.push(Math.cos(a)); circY.push(Math.sin(a));
        }

        var traces = [
            { x: circX, y: circY, type: 'scatter', mode: 'lines',
              line: { color: 'rgba(255,255,255,0.4)', width: 2 },
              hoverinfo: 'none', showlegend: false },
            { x: dartState.xIn, y: dartState.yIn, type: 'scatter', mode: 'markers',
              marker: { color: '#00f3ff', size: 2.5, opacity: 0.6 },
              hoverinfo: 'none', name: 'Inside' },
            { x: dartState.xOut, y: dartState.yOut, type: 'scatter', mode: 'markers',
              marker: { color: '#ff006e', size: 2.5, opacity: 0.6 },
              hoverinfo: 'none', name: 'Outside' }
        ];

        Plotly.react('mc-dartPlot', traces, Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-1.1, 1.1], ''), { scaleanchor: 'y' }),
            yaxis: axStyle([-1.1, 1.1], ''),
            height: 400
        }), { responsive: true });

        // Convergence plot
        if (dartState.history.length > 0) {
            var ns = [], ests = [];
            for (var i = 0; i < dartState.history.length; i++) {
                ns.push(dartState.history[i].n);
                ests.push(dartState.history[i].pi);
            }
            Plotly.react('mc-piEstPlot', [
                { x: ns, y: ests, type: 'scatter', mode: 'lines',
                  line: { color: '#00f3ff', width: 2 }, name: 'Estimate' },
                { x: [1, Math.max(dartState.total, 100)],
                  y: [Math.PI, Math.PI], type: 'scatter', mode: 'lines',
                  line: { color: 'white', width: 2, dash: 'dash' }, name: 'True π' }
            ], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, 'N (samples)'),
                yaxis: axStyle([2.5, 3.9], 'Estimate of π'),
                height: 400,
                legend: { x: 0.6, y: 0.98, font: { color: '#aaa', size: 10 } }
            }), { responsive: true });
        } else {
            Plotly.react('mc-piEstPlot', [], Object.assign({}, darkLayout, {
                xaxis: axStyle([0, 100], 'N (samples)'),
                yaxis: axStyle([2.5, 3.9], 'Estimate of π'),
                height: 400,
                annotations: [{ x: 50, y: 3.2, text: 'Click "Throw" to start',
                    font: { color: '#aaa', size: 14 }, showarrow: false }]
            }), { responsive: true });
        }

        var piEst = dartState.total > 0 ? (4 * dartState.inside / dartState.total) : 0;
        var err = dartState.total > 0 ? Math.abs(piEst - Math.PI) : 0;
        document.getElementById('mc-stats1').innerHTML =
            '<span><strong>π ≈ ' + (dartState.total > 0 ? piEst.toFixed(5) : '—') + '</strong></span>' +
            '<span>Darts: ' + dartState.total + '  |  Inside: ' + dartState.inside + '</span>' +
            '<span>Error: ' + (dartState.total > 0 ? err.toFixed(5) : '—') + '</span>';
    }

    window.mcThrowDarts = function() {
        var batch = parseInt(document.getElementById('mc-batch-select').value);
        for (var i = 0; i < batch; i++) {
            var x = Math.random() * 2 - 1;
            var y = Math.random() * 2 - 1;
            dartState.total++;
            if (x * x + y * y <= 1) {
                dartState.inside++;
                dartState.xIn.push(x); dartState.yIn.push(y);
            } else {
                dartState.xOut.push(x); dartState.yOut.push(y);
            }
            // Record history at logarithmic intervals
            if (dartState.total <= 20 || dartState.total % Math.max(1, Math.floor(dartState.total / 200)) === 0) {
                dartState.history.push({ n: dartState.total, pi: 4 * dartState.inside / dartState.total });
            }
        }
        // Always record final
        dartState.history.push({ n: dartState.total, pi: 4 * dartState.inside / dartState.total });
        drawDartBoard();
    };

    window.mcDartReset = function() {
        dartState = { xIn: [], yIn: [], xOut: [], yOut: [], total: 0, inside: 0, history: [] };
        drawDartBoard();
    };

    // ===============================================================
    // EXPLORER 2: Curse of Dimensionality
    // ===============================================================
    function drawCurse() {
        var n = parseInt(document.getElementById('mc-grid-n-slider').value);
        var mcN = parseInt(document.getElementById('mc-mc-n-slider').value);

        // Grid points vs dimension
        var dims = [1, 2, 3, 4, 5, 6, 8, 10];
        var gridPts = dims.map(function(d) { return Math.pow(n, d); });
        var mcPts = dims.map(function() { return mcN; });

        // Left: log-scale comparison
        Plotly.react('mc-cursePlot', [
            { x: dims, y: gridPts, type: 'scatter', mode: 'lines+markers',
              line: { color: '#ff006e', width: 2 },
              marker: { color: '#ff006e', size: 8 },
              name: 'Grid (n^d)' },
            { x: dims, y: mcPts, type: 'scatter', mode: 'lines+markers',
              line: { color: '#00f3ff', width: 2 },
              marker: { color: '#00f3ff', size: 8 },
              name: 'Monte Carlo' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 11], 'Dimension d'),
            yaxis: Object.assign(axStyle(null, 'Number of points'), { type: 'log' }),
            height: 400,
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // Right: bar chart for select dimensions
        var selDims = [2, 4, 6, 8, 10];
        var gPts = selDims.map(function(d) { return Math.pow(n, d); });
        var mPts = selDims.map(function() { return mcN; });
        var labels = selDims.map(function(d) { return d + 'D'; });

        Plotly.react('mc-curseBarPlot', [
            { x: labels, y: gPts, type: 'bar', marker: { color: '#ff006e' }, name: 'Grid' },
            { x: labels, y: mPts, type: 'bar', marker: { color: '#00f3ff' }, name: 'MC' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Dimension'),
            yaxis: Object.assign(axStyle(null, 'Points needed'), { type: 'log' }),
            height: 400, barmode: 'group',
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('mc-stats2').innerHTML =
            '<span><strong>Grid: n = ' + n + ' per axis</strong>  |  <strong>MC: N = ' + mcN + ' total</strong></span>' +
            '<span>In 10D: Grid needs ' + Math.pow(n, 10).toExponential(1) + ' points  |  MC needs ' + mcN + '</span>';
    }

    window.mcCurseReset = function() {
        document.getElementById('mc-grid-n-slider').value = 10;
        document.getElementById('mc-mc-n-slider').value = 1000;
        document.getElementById('mc-grid-n-value').textContent = '10';
        document.getElementById('mc-mc-n-value').textContent = '1000';
        drawCurse();
    };

    // ===============================================================
    // EXPLORER 3: Convergence Watcher
    // ===============================================================
    var integrals = {
        pi: {
            sample: function() {
                var x = Math.random() * 2 - 1, y = Math.random() * 2 - 1;
                return (x * x + y * y <= 1) ? 4.0 : 0.0;
            },
            trueVal: Math.PI, label: 'π ≈ 3.14159'
        },
        ln2: {
            sample: function() {
                var x = Math.random();
                return 1 / (1 + x);
            },
            trueVal: Math.log(2), label: 'ln(2) ≈ 0.6931'
        },
        gaussian: {
            sample: function() {
                var x = Math.random() * 3; // [0, 3]
                return 3 * Math.exp(-x * x); // scale by interval length
            },
            trueVal: 0.8862, label: '∫₀³ e^(-x²) dx ≈ 0.886'
        }
    };

    window.mcConvergeRun = function() {
        var key = document.getElementById('mc-integral-select').value;
        var maxN = parseInt(document.getElementById('mc-maxN-slider').value);
        var intg = integrals[key];

        var ns = [], ests = [], upper = [], lower = [];
        var sum = 0, sumSq = 0;

        for (var i = 1; i <= maxN; i++) {
            var val = intg.sample();
            sum += val;
            sumSq += val * val;
            var mean = sum / i;
            if (i >= 2) {
                var variance = (sumSq / i - mean * mean) * i / (i - 1);
                var se = Math.sqrt(variance / i);
                if (i % Math.max(1, Math.floor(maxN / 500)) === 0 || i <= 50) {
                    ns.push(i); ests.push(mean);
                    upper.push(mean + se); lower.push(mean - se);
                }
            } else if (i === 1) {
                ns.push(1); ests.push(mean); upper.push(mean); lower.push(mean);
            }
        }

        var traces = [
            { x: ns, y: ests, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2 }, name: 'MC estimate' },
            { x: ns, y: upper, type: 'scatter', mode: 'lines',
              line: { width: 0 }, showlegend: false, hoverinfo: 'skip' },
            { x: ns, y: lower, type: 'scatter', mode: 'lines',
              line: { width: 0 }, fill: 'tonexty',
              fillcolor: 'rgba(0,243,255,0.15)', name: '±1σ band', hoverinfo: 'skip' },
            { x: [1, maxN], y: [intg.trueVal, intg.trueVal], type: 'scatter', mode: 'lines',
              line: { color: 'white', width: 2, dash: 'dash' }, name: 'True: ' + intg.label }
        ];

        var finalEst = ests[ests.length - 1];
        var yPad = Math.max(Math.abs(finalEst - intg.trueVal) * 5, 0.5);

        Plotly.react('mc-convergePlot', traces, Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle(null, 'N (samples)'), { type: 'log' }),
            yaxis: axStyle([intg.trueVal - yPad, intg.trueVal + yPad], 'Estimate'),
            height: 420,
            legend: { x: 0.55, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('mc-stats3').innerHTML =
            '<span><strong>Final estimate: ' + finalEst.toFixed(5) + '</strong>  |  True: ' + intg.trueVal.toFixed(5) + '</span>' +
            '<span>Error: ' + Math.abs(finalEst - intg.trueVal).toFixed(5) + '  |  N = ' + maxN + '</span>';
    };

    window.mcConvergeReset = function() {
        document.getElementById('mc-integral-select').value = 'pi';
        document.getElementById('mc-maxN-slider').value = 5000;
        document.getElementById('mc-maxN-value').textContent = '5000';
        Plotly.react('mc-convergePlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 100], 'N'), yaxis: axStyle([2.5, 3.9], 'Estimate'),
            height: 420,
            annotations: [{ x: 50, y: 3.2, text: 'Click "Run" to start',
                font: { color: '#aaa', size: 14 }, showarrow: false }]
        }), { responsive: true });
        document.getElementById('mc-stats3').innerHTML = '';
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('mc-dartPlot')) { setTimeout(initializePlots, 100); return; }

        // Explorer 1
        drawDartBoard();

        // Explorer 2
        drawCurse();
        document.getElementById('mc-grid-n-slider').addEventListener('input', function() {
            document.getElementById('mc-grid-n-value').textContent = this.value;
            drawCurse();
        });
        document.getElementById('mc-mc-n-slider').addEventListener('input', function() {
            document.getElementById('mc-mc-n-value').textContent = this.value;
            drawCurse();
        });

        // Explorer 3 — show placeholder
        Plotly.react('mc-convergePlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 100], 'N'), yaxis: axStyle([2.5, 3.9], 'Estimate'),
            height: 420,
            annotations: [{ x: 50, y: 3.2, text: 'Click "Run" to start',
                font: { color: '#aaa', size: 14 }, showarrow: false }]
        }), { responsive: true });

        document.getElementById('mc-maxN-slider').addEventListener('input', function() {
            document.getElementById('mc-maxN-value').textContent = this.value;
        });
    }

    initializePlots();
})();
