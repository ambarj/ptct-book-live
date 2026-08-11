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

    // ===== Function definitions =====
    var funcs = {
        inv:   { f: function(x){return 1/(1+x);}, a: 0, b: 1, fMax: 1, trueVal: Math.log(2), label: '1/(1+x)', trueLabel: 'ln 2' },
        sin:   { f: function(x){return Math.sin(x);}, a: 0, b: Math.PI, fMax: 1, trueVal: 2, label: 'sin(x)', trueLabel: '2' },
        gauss: { f: function(x){return Math.exp(-x*x);}, a: 0, b: 2, fMax: 1, trueVal: 0.8821, label: 'e^(-x²)', trueLabel: '0.882' },
        poly:  { f: function(x){return x*x;}, a: 0, b: 1, fMax: 1, trueVal: 1/3, label: 'x²', trueLabel: '1/3' }
    };

    // ===============================================================
    // EXPLORER 1: Visual MC Integrator
    // ===============================================================
    var visState = { hmXin:[], hmYin:[], hmXout:[], hmYout:[], smSum:0, smSumSq:0, n:0, hmHits:0 };

    function drawVisual() {
        var key = document.getElementById('mi-func-select').value;
        var fn = funcs[key];

        // Hit-or-miss scatter
        var curveX = [], curveY = [];
        for (var i = 0; i <= 200; i++) {
            var xi = fn.a + i * (fn.b - fn.a) / 200;
            curveX.push(xi); curveY.push(fn.f(xi));
        }

        var hmTraces = [
            { x: curveX, y: curveY, type: 'scatter', mode: 'lines',
              line: { color: 'white', width: 2 }, name: fn.label, hoverinfo: 'none' },
            { x: visState.hmXin, y: visState.hmYin, type: 'scatter', mode: 'markers',
              marker: { color: '#00f3ff', size: 2, opacity: 0.5 }, name: 'Under', hoverinfo: 'none' },
            { x: visState.hmXout, y: visState.hmYout, type: 'scatter', mode: 'markers',
              marker: { color: '#ff006e', size: 2, opacity: 0.3 }, name: 'Above', hoverinfo: 'none' }
        ];

        Plotly.react('mi-hitMissPlot', hmTraces, Object.assign({}, darkLayout, {
            xaxis: axStyle([fn.a - 0.1, fn.b + 0.1], 'x'),
            yaxis: axStyle([-0.05, fn.fMax + 0.1], 'y'),
            height: 400,
            annotations: [{ x: (fn.a+fn.b)/2, y: fn.fMax + 0.05, text: 'Hit-or-Miss',
                font: { color: '#aaa', size: 11 }, showarrow: false }]
        }), { responsive: true });

        // Sample mean convergence
        if (visState.n > 0) {
            var mean = visState.smSum / visState.n;
            var est = (fn.b - fn.a) * mean;
            var variance = visState.n > 1 ? (visState.smSumSq / visState.n - mean * mean) * visState.n / (visState.n - 1) : 0;
            var se = (fn.b - fn.a) * Math.sqrt(variance / visState.n);

            // We store history for the plot
            var smTraces = [
                { x: visState.smHistory.map(function(h){return h.n;}),
                  y: visState.smHistory.map(function(h){return h.est;}),
                  type: 'scatter', mode: 'lines',
                  line: { color: '#00f3ff', width: 2 }, name: 'Sample mean' },
                { x: [1, visState.n], y: [fn.trueVal, fn.trueVal],
                  type: 'scatter', mode: 'lines',
                  line: { color: 'white', width: 2, dash: 'dash' }, name: 'True: ' + fn.trueLabel }
            ];

            var yPad = Math.max(Math.abs(est - fn.trueVal) * 3, 0.15);
            Plotly.react('mi-sampleMeanPlot', smTraces, Object.assign({}, darkLayout, {
                xaxis: axStyle(null, 'N'),
                yaxis: axStyle([fn.trueVal - yPad, fn.trueVal + yPad], 'Estimate'),
                height: 400,
                legend: { x: 0.55, y: 0.98, font: { color: '#aaa', size: 10 } }
            }), { responsive: true });

            var hmEst = visState.n > 0 ? (fn.b - fn.a) * fn.fMax * visState.hmHits / visState.n : 0;
            document.getElementById('mi-stats1').innerHTML =
                '<span><strong>N = ' + visState.n + '</strong>  |  True: ' + fn.trueVal.toFixed(5) + '</span>' +
                '<span>Hit-or-miss: ' + hmEst.toFixed(5) + ' (|err| ' + Math.abs(hmEst - fn.trueVal).toFixed(5) + ')</span>' +
                '<span>Sample mean: ' + est.toFixed(5) + ' (|err| ' + Math.abs(est - fn.trueVal).toFixed(5) + ', expected ±' + se.toFixed(5) + ')</span>';
        } else {
            Plotly.react('mi-sampleMeanPlot', [], Object.assign({}, darkLayout, {
                xaxis: axStyle([0, 100], 'N'), yaxis: axStyle([0, 1], 'Estimate'),
                height: 400,
                annotations: [{ x: 50, y: 0.5, text: 'Click "Sample" to start',
                    font: { color: '#aaa', size: 14 }, showarrow: false }]
            }), { responsive: true });
            document.getElementById('mi-stats1').innerHTML = '<span>Click "Sample" to begin</span>';
        }
    }

    window.miSample = function() {
        var key = document.getElementById('mi-func-select').value;
        var fn = funcs[key];
        var batch = parseInt(document.getElementById('mi-batch-select').value);

        if (!visState.smHistory) visState.smHistory = [];

        for (var i = 0; i < batch; i++) {
            var x = fn.a + Math.random() * (fn.b - fn.a);
            var fval = fn.f(x);
            visState.n++;
            visState.smSum += fval;
            visState.smSumSq += fval * fval;

            // Hit-or-miss
            var y = Math.random() * fn.fMax;
            if (y <= fval) {
                visState.hmHits++;
                visState.hmXin.push(x); visState.hmYin.push(y);
            } else {
                visState.hmXout.push(x); visState.hmYout.push(y);
            }

            // Record history at intervals
            if (visState.n <= 30 || visState.n % Math.max(1, Math.floor(batch / 50)) === 0) {
                var mean = visState.smSum / visState.n;
                visState.smHistory.push({ n: visState.n, est: (fn.b - fn.a) * mean });
            }
        }
        // Always record final
        var mean = visState.smSum / visState.n;
        visState.smHistory.push({ n: visState.n, est: (fn.b - fn.a) * mean });

        drawVisual();
    };

    window.miReset = function() {
        visState = { hmXin:[], hmYin:[], hmXout:[], hmYout:[], smSum:0, smSumSq:0, n:0, hmHits:0, smHistory:[] };
        drawVisual();
    };

    // ===============================================================
    // EXPLORER 2: Method Comparison
    // ===============================================================
    window.miCompareRun = function() {
        var key = document.getElementById('mi-cmp-func').value;
        var fn = funcs[key];
        var maxN = parseInt(document.getElementById('mi-cmp-N-slider').value);

        // Run both methods and record running estimates
        var smSum = 0, hmHits = 0;
        var smNs = [], smEsts = [], hmEsts = [];

        for (var i = 1; i <= maxN; i++) {
            var x = fn.a + Math.random() * (fn.b - fn.a);
            smSum += fn.f(x);

            var xh = fn.a + Math.random() * (fn.b - fn.a);
            var yh = Math.random() * fn.fMax;
            if (yh <= fn.f(xh)) hmHits++;

            if (i <= 50 || i % Math.max(1, Math.floor(maxN / 400)) === 0) {
                smNs.push(i);
                smEsts.push((fn.b - fn.a) * smSum / i);
                hmEsts.push((fn.b - fn.a) * fn.fMax * hmHits / i);
            }
        }

        // Compute |error|
        var smErr = smEsts.map(function(e) { return Math.abs(e - fn.trueVal); });
        var hmErr = hmEsts.map(function(e) { return Math.abs(e - fn.trueVal); });

        Plotly.react('mi-comparisonPlot', [
            { x: smNs, y: smErr, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2 }, name: 'Sample mean |error|' },
            { x: smNs, y: hmErr, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2 }, name: 'Hit-or-miss |error|' },
            // 1/√N reference
            { x: smNs, y: smNs.map(function(n) { return 0.5 / Math.sqrt(n); }),
              type: 'scatter', mode: 'lines',
              line: { color: 'rgba(255,255,255,0.3)', width: 1.5, dash: 'dot' },
              name: '1/√N reference' }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle(null, 'N (samples, log scale)'), { type: 'log' }),
            yaxis: Object.assign(axStyle(null, '|Error| (log scale)'), { type: 'log' }),
            height: 420,
            legend: { x: 0.55, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        var smFinal = smEsts[smEsts.length - 1];
        var hmFinal = hmEsts[hmEsts.length - 1];
        document.getElementById('mi-stats2').innerHTML =
            '<span><strong>N = ' + maxN + '</strong>  |  True: ' + fn.trueVal.toFixed(5) + '</span>' +
            '<span>Sample mean: ' + smFinal.toFixed(5) + ' (err: ' + Math.abs(smFinal - fn.trueVal).toFixed(5) + ')</span>' +
            '<span>Hit-or-miss: ' + hmFinal.toFixed(5) + ' (err: ' + Math.abs(hmFinal - fn.trueVal).toFixed(5) + ')</span>';
    };

    window.miCompareReset = function() {
        Plotly.react('mi-comparisonPlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 100], 'N'), yaxis: axStyle([0, 1], '|Error|'),
            height: 420,
            annotations: [{ x: 50, y: 0.5, text: 'Click "Run Comparison"',
                font: { color: '#aaa', size: 14 }, showarrow: false }]
        }), { responsive: true });
        document.getElementById('mi-stats2').innerHTML = '';
    };

    // ===============================================================
    // EXPLORER 3: Multi-Function Integrator
    // ===============================================================
    window.miMultiRun = function() {
        var N = parseInt(document.getElementById('mi-multi-N-slider').value);
        var keys = ['inv', 'sin', 'gauss', 'poly'];
        var estimates = [], errors = [], labels = [], trueVals = [];

        for (var k = 0; k < keys.length; k++) {
            var fn = funcs[keys[k]];
            var sum = 0, sumSq = 0;
            for (var i = 0; i < N; i++) {
                var x = fn.a + Math.random() * (fn.b - fn.a);
                var fv = fn.f(x);
                sum += fv; sumSq += fv * fv;
            }
            var mean = sum / N;
            var est = (fn.b - fn.a) * mean;
            var variance = (sumSq / N - mean * mean) * N / (N - 1);
            var se = (fn.b - fn.a) * Math.sqrt(variance / N);
            estimates.push(est);
            errors.push(se);
            labels.push(fn.label);
            trueVals.push(fn.trueVal);
        }

        // Left: function curves
        var curveTraces = [];
        var colors = ['#00f3ff', '#ff006e', '#ffbe0b', '#00ff88'];
        for (var k = 0; k < keys.length; k++) {
            var fn = funcs[keys[k]];
            var cx = [], cy = [];
            for (var i = 0; i <= 100; i++) {
                var xi = fn.a + i * (fn.b - fn.a) / 100;
                cx.push(xi); cy.push(fn.f(xi));
            }
            curveTraces.push({ x: cx, y: cy, type: 'scatter', mode: 'lines',
                line: { color: colors[k], width: 2 }, name: fn.label });
        }
        Plotly.react('mi-multiCurvePlot', curveTraces, Object.assign({}, darkLayout, {
            xaxis: axStyle([-0.1, 3.5], 'x'),
            yaxis: axStyle([-0.1, 1.2], 'f(x)'),
            height: 400,
            legend: { x: 0.6, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // Right: bar chart of estimates vs true
        Plotly.react('mi-multiBarPlot', [
            { x: labels, y: trueVals, type: 'bar', marker: { color: 'rgba(255,255,255,0.3)' }, name: 'True' },
            { x: labels, y: estimates, type: 'bar',
              error_y: { type: 'data', array: errors, visible: true, color: '#00f3ff' },
              marker: { color: '#00f3ff' }, name: 'MC estimate ± 1σ' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''),
            yaxis: axStyle([-0.1, 2.5], 'Integral value'),
            height: 400, barmode: 'group',
            legend: { x: 0.55, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        var summary = labels.map(function(l, i) {
            return l + ': ' + estimates[i].toFixed(4) + ' ± ' + errors[i].toFixed(4) + ' (true: ' + trueVals[i].toFixed(4) + ')';
        }).join('  |  ');
        document.getElementById('mi-stats3').innerHTML =
            '<span><strong>N = ' + N + '</strong></span><span>' + summary + '</span>';
    };

    window.miMultiReset = function() {
        document.getElementById('mi-multi-N-slider').value = 2000;
        document.getElementById('mi-multi-N-value').textContent = '2000';
        Plotly.react('mi-multiCurvePlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 3.5], 'x'), yaxis: axStyle([0, 1.2], 'f(x)'), height: 400
        }), { responsive: true });
        Plotly.react('mi-multiBarPlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''), yaxis: axStyle([0, 2.5], ''), height: 400,
            annotations: [{ x: 0.5, y: 1.2, text: 'Click "Run All"',
                font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper' }]
        }), { responsive: true });
        document.getElementById('mi-stats3').innerHTML = '';
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('mi-hitMissPlot')) { setTimeout(initializePlots, 100); return; }

        visState.smHistory = [];
        drawVisual();

        document.getElementById('mi-func-select').addEventListener('change', function() {
            window.miReset();
        });

        // Explorer 2 placeholder
        Plotly.react('mi-comparisonPlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 100], 'N'), yaxis: axStyle([0, 1], '|Error|'),
            height: 420,
            annotations: [{ x: 50, y: 0.5, text: 'Click "Run Comparison"',
                font: { color: '#aaa', size: 14 }, showarrow: false }]
        }), { responsive: true });

        document.getElementById('mi-cmp-N-slider').addEventListener('input', function() {
            document.getElementById('mi-cmp-N-value').textContent = this.value;
        });

        // Explorer 3 placeholder
        Plotly.react('mi-multiCurvePlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 3.5], 'x'), yaxis: axStyle([0, 1.2], 'f(x)'), height: 400
        }), { responsive: true });
        Plotly.react('mi-multiBarPlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''), yaxis: axStyle([0, 2.5], ''), height: 400,
            annotations: [{ x: 0.5, y: 1.2, text: 'Click "Run All"',
                font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper' }]
        }), { responsive: true });

        document.getElementById('mi-multi-N-slider').addEventListener('input', function() {
            document.getElementById('mi-multi-N-value').textContent = this.value;
        });
    }

    initializePlots();
})();
