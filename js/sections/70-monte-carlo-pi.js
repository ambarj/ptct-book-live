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

    // Gamma function approximation (Stirling for integers/half-integers)
    function gammaFunc(n) {
        if (n <= 0) return Infinity;
        if (n === 1) return 1;
        if (n === 0.5) return Math.sqrt(Math.PI);
        // Use recursive: Γ(n) = (n-1)·Γ(n-1)
        if (n > 1) return (n - 1) * gammaFunc(n - 1);
        // For n < 1, use Γ(n) = Γ(n+1)/n
        return gammaFunc(n + 1) / n;
    }

    function sphereVolume(d) {
        return Math.pow(Math.PI, d / 2) / gammaFunc(d / 2 + 1);
    }

    // ===============================================================
    // EXPLORER 1: Large-Scale π
    // ===============================================================
    window.gpRunLarge = function() {
        var N = parseInt(document.getElementById('gp-N-select').value);

        var inside = 0;
        var showX_in = [], showY_in = [], showX_out = [], showY_out = [];
        var maxShow = 5000; // limit scatter to 5000 points for performance
        var showRate = Math.max(1, Math.floor(N / maxShow));

        // Running history
        var histN = [], histPi = [];

        for (var i = 0; i < N; i++) {
            var x = Math.random() * 2 - 1, y = Math.random() * 2 - 1;
            if (x * x + y * y <= 1) {
                inside++;
                if (i % showRate === 0) { showX_in.push(x); showY_in.push(y); }
            } else {
                if (i % showRate === 0) { showX_out.push(x); showY_out.push(y); }
            }
            if (i < 100 || (i + 1) % Math.max(1, Math.floor(N / 200)) === 0) {
                histN.push(i + 1);
                histPi.push(4 * inside / (i + 1));
            }
        }

        var piEst = 4 * inside / N;

        // Scatter
        var circX = [], circY = [];
        for (var i = 0; i <= 100; i++) { var a = i * 2 * Math.PI / 100; circX.push(Math.cos(a)); circY.push(Math.sin(a)); }

        Plotly.react('gp-scatterPlot', [
            { x: circX, y: circY, type: 'scatter', mode: 'lines', line: { color: 'rgba(255,255,255,0.4)', width: 2 }, hoverinfo: 'none', showlegend: false },
            { x: showX_in, y: showY_in, type: 'scatter', mode: 'markers', marker: { color: '#00f3ff', size: 1.5, opacity: 0.5 }, name: 'Inside', hoverinfo: 'none' },
            { x: showX_out, y: showY_out, type: 'scatter', mode: 'markers', marker: { color: '#ff006e', size: 1.5, opacity: 0.3 }, name: 'Outside', hoverinfo: 'none' }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-1.1, 1.1], ''), { scaleanchor: 'y' }),
            yaxis: axStyle([-1.1, 1.1], ''), height: 400
        }), { responsive: true });

        // Accuracy plot
        var errHist = histPi.map(function(p) { return Math.abs(p - Math.PI); });
        var refN = [10, N];
        var refErr = [1 / Math.sqrt(10), 1 / Math.sqrt(N)];

        Plotly.react('gp-accuracyPlot', [
            { x: histN, y: errHist, type: 'scatter', mode: 'lines', line: { color: '#00f3ff', width: 1.5 }, name: '|Error|' },
            { x: refN, y: refErr.map(function(e) { return e * 1.6; }), type: 'scatter', mode: 'lines',
              line: { color: 'rgba(255,255,255,0.4)', width: 1.5, dash: 'dash' }, name: '~1/√N' }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle(null, 'N'), { type: 'log' }),
            yaxis: Object.assign(axStyle(null, '|π_est − π|'), { type: 'log' }),
            height: 400, legend: { x: 0.6, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('gp-stats1').innerHTML =
            '<span><strong>π ≈ ' + piEst.toFixed(6) + '</strong>  |  True: ' + Math.PI.toFixed(6) + '</span>' +
            '<span>N = ' + N.toLocaleString() + '  |  Inside: ' + inside.toLocaleString() +
            '  |  Error: ' + Math.abs(piEst - Math.PI).toFixed(6) + '</span>';
    };

    // ===============================================================
    // EXPLORER 2: Distribution of Estimates
    // ===============================================================
    window.gpDistRun = function() {
        var N = parseInt(document.getElementById('gp-trial-N-slider').value);
        var nTrials = parseInt(document.getElementById('gp-ntrials-slider').value);

        var estimates = [];
        for (var t = 0; t < nTrials; t++) {
            var ins = 0;
            for (var i = 0; i < N; i++) {
                var x = Math.random() * 2 - 1, y = Math.random() * 2 - 1;
                if (x * x + y * y <= 1) ins++;
            }
            estimates.push(4 * ins / N);
        }

        // Histogram
        var mean = 0, variance = 0;
        for (var t = 0; t < nTrials; t++) mean += estimates[t];
        mean /= nTrials;
        for (var t = 0; t < nTrials; t++) variance += (estimates[t] - mean) * (estimates[t] - mean);
        variance /= (nTrials - 1);
        var se = Math.sqrt(variance);

        // Gaussian overlay
        var gx = [], gy = [];
        for (var i = 0; i <= 100; i++) {
            var xi = mean - 4 * se + i * 8 * se / 100;
            gx.push(xi);
            gy.push(nTrials * (8 * se / 30) * Math.exp(-0.5 * Math.pow((xi - mean) / se, 2)) / (se * Math.sqrt(2 * Math.PI)));
        }

        Plotly.react('gp-histPlot', [
            { x: estimates, type: 'histogram', marker: { color: '#00f3ff' }, opacity: 0.7, nbinsx: 30, name: 'Estimates' },
            { x: gx, y: gy, type: 'scatter', mode: 'lines', line: { color: '#ffbe0b', width: 2 }, name: 'Gaussian fit' },
            { x: [Math.PI, Math.PI], y: [0, nTrials * 0.15], type: 'scatter', mode: 'lines',
              line: { color: 'white', width: 2, dash: 'dash' }, name: 'True π' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Estimate of π'), yaxis: axStyle(null, 'Count'),
            height: 400, legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // Sorted estimates for QQ-ish plot (sorted estimates vs expected quantiles)
        var sorted = estimates.slice().sort(function(a, b) { return a - b; });
        var expected = [];
        for (var i = 0; i < nTrials; i++) {
            // Normal quantile approximation
            var p = (i + 0.5) / nTrials;
            var z = 0;
            // Simple approximation of inverse normal
            var t2 = Math.sqrt(-2 * Math.log(p < 0.5 ? p : 1 - p));
            z = t2 - (2.515517 + 0.802853 * t2 + 0.010328 * t2 * t2) / (1 + 1.432788 * t2 + 0.189269 * t2 * t2 + 0.001308 * t2 * t2 * t2);
            if (p < 0.5) z = -z;
            expected.push(mean + se * z);
        }

        Plotly.react('gp-qqPlot', [
            { x: expected, y: sorted, type: 'scatter', mode: 'markers',
              marker: { color: '#00f3ff', size: 3, opacity: 0.5 }, name: 'QQ plot' },
            { x: [mean - 3 * se, mean + 3 * se], y: [mean - 3 * se, mean + 3 * se],
              type: 'scatter', mode: 'lines', line: { color: 'white', width: 1.5, dash: 'dash' }, name: 'Perfect Gaussian' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Expected (Gaussian)'), yaxis: axStyle(null, 'Observed'),
            height: 400, legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('gp-stats2').innerHTML =
            '<span><strong>' + nTrials + ' trials, N = ' + N + ' each</strong></span>' +
            '<span>Mean: ' + mean.toFixed(5) + '  |  Std: ' + se.toFixed(5) +
            '  |  Expected std: ' + (1.6 / Math.sqrt(N)).toFixed(5) + '</span>';
    };

    window.gpDistReset = function() {
        ['gp-histPlot', 'gp-qqPlot'].forEach(function(id) {
            Plotly.react(id, [], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
                annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run Trials"', font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
            }), { responsive: true });
        });
        document.getElementById('gp-stats2').innerHTML = '';
    };

    // ===============================================================
    // EXPLORER 3: Hypersphere Volumes
    // ===============================================================
    window.gpHyperRun = function() {
        var N = parseInt(document.getElementById('gp-hyper-N-slider').value);
        var dims = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15];
        var mcVols = [], trueVols = [], fracs = [];

        for (var di = 0; di < dims.length; di++) {
            var d = dims[di];
            var inside = 0;
            for (var i = 0; i < N; i++) {
                var r2 = 0;
                for (var j = 0; j < d; j++) {
                    var x = Math.random() * 2 - 1;
                    r2 += x * x;
                }
                if (r2 <= 1) inside++;
            }
            var frac = inside / N;
            mcVols.push(Math.pow(2, d) * frac);
            trueVols.push(sphereVolume(d));
            fracs.push(frac * 100);
        }

        var labels = dims.map(function(d) { return d + 'D'; });

        Plotly.react('gp-hyperBarPlot', [
            { x: labels, y: mcVols, type: 'bar', marker: { color: '#00f3ff' }, name: 'MC estimate' },
            { x: labels, y: trueVols, type: 'scatter', mode: 'markers+lines',
              marker: { color: 'white', size: 8 }, line: { color: 'white', width: 2, dash: 'dash' }, name: 'Exact' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Dimension'), yaxis: axStyle(null, 'Volume'),
            height: 400, legend: { x: 0.6, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        Plotly.react('gp-hyperFracPlot', [
            { x: labels, y: fracs, type: 'bar', marker: { color: '#ffbe0b' }, name: 'Hit rate (%)' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Dimension'),
            yaxis: Object.assign(axStyle(null, 'Fraction inside sphere (%)'), { type: 'log' }),
            height: 400
        }), { responsive: true });

        var summary = dims.map(function(d, i) {
            return d + 'D: ' + mcVols[i].toFixed(2) + ' (true: ' + trueVols[i].toFixed(2) + ', hit: ' + fracs[i].toFixed(1) + '%)';
        }).join('  |  ');
        document.getElementById('gp-stats3').innerHTML =
            '<span><strong>N = ' + N.toLocaleString() + ' samples per dimension</strong></span>' +
            '<span>' + summary.substring(0, 200) + '...</span>';
    };

    window.gpHyperReset = function() {
        document.getElementById('gp-hyper-N-slider').value = 50000;
        document.getElementById('gp-hyper-N-value').textContent = '50000';
        ['gp-hyperBarPlot', 'gp-hyperFracPlot'].forEach(function(id) {
            Plotly.react(id, [], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
                annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run"', font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
            }), { responsive: true });
        });
        document.getElementById('gp-stats3').innerHTML = '';
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('gp-scatterPlot')) { setTimeout(initializePlots, 100); return; }

        // Placeholders
        ['gp-scatterPlot', 'gp-accuracyPlot'].forEach(function(id) {
            Plotly.react(id, [], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
                annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run"', font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
            }), { responsive: true });
        });

        ['gp-histPlot', 'gp-qqPlot'].forEach(function(id) {
            Plotly.react(id, [], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
                annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run Trials"', font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
            }), { responsive: true });
        });

        ['gp-hyperBarPlot', 'gp-hyperFracPlot'].forEach(function(id) {
            Plotly.react(id, [], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
                annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run"', font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
            }), { responsive: true });
        });

        // Slider listeners
        document.getElementById('gp-trial-N-slider').addEventListener('input', function() {
            document.getElementById('gp-trial-N-value').textContent = this.value;
        });
        document.getElementById('gp-ntrials-slider').addEventListener('input', function() {
            document.getElementById('gp-ntrials-value').textContent = this.value;
        });
        document.getElementById('gp-hyper-N-slider').addEventListener('input', function() {
            document.getElementById('gp-hyper-N-value').textContent = this.value;
        });
    }

    initializePlots();
})();
