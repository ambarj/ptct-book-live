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

    // ===== Gaussian sampling (Box-Muller) =====
    function randNormal(mu, sigma) {
        var u1 = Math.random(), u2 = Math.random();
        return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }

    function gaussPdf(x, mu, sigma) {
        var z = (x - mu) / sigma;
        return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
    }

    // ===== Integrand definitions =====
    var integrands = {
        peaked: {
            f: function(x) { return Math.exp(-10 * (x - 0.7) * (x - 0.7)); },
            a: 0, b: 1, trueVal: 0.280, label: 'e^(-10(x-0.7)²)',
            pMu: 0.7, pSigma: 0.22
        },
        exponential: {
            f: function(x) { return Math.exp(-3 * x); },
            a: 0, b: 5, trueVal: (1 - Math.exp(-15)) / 3, label: 'e^(-3x)',
            pMu: 0.5, pSigma: 1.0
        },
        oscillatory: {
            f: function(x) { var c = Math.cos(50 * x); return c * c * Math.exp(-x); },
            a: 0, b: 3, trueVal: 0.488, label: 'cos²(50x)·e^(-x)',
            pMu: 0.5, pSigma: 0.8
        }
    };

    // ===== Sample from truncated Gaussian =====
    function sampleTruncGauss(mu, sigma, a, b, N) {
        var samples = [];
        while (samples.length < N) {
            var x = randNormal(mu, sigma);
            if (x >= a && x <= b) samples.push(x);
        }
        return samples;
    }

    function truncGaussPdf(x, mu, sigma, a, b) {
        // Approximate normalization
        var raw = gaussPdf(x, mu, sigma);
        // Simple normalization by numerical integration
        var sum = 0, n = 200;
        for (var i = 0; i <= n; i++) {
            var xi = a + i * (b - a) / n;
            sum += gaussPdf(xi, mu, sigma);
        }
        sum *= (b - a) / n;
        return raw / sum;
    }

    // ===============================================================
    // EXPLORER 1: Uniform vs Importance
    // ===============================================================
    window.isCompareRun = function() {
        var key = document.getElementById('is-func-select').value;
        var N = parseInt(document.getElementById('is-N-slider').value);
        var intg = integrands[key];

        // Uniform sampling
        var unifSum = 0, unifHistory = [];
        for (var i = 0; i < N; i++) {
            var x = intg.a + Math.random() * (intg.b - intg.a);
            unifSum += intg.f(x);
            if (i < 50 || i % Math.max(1, Math.floor(N / 300)) === 0)
                unifHistory.push({ n: i + 1, est: (intg.b - intg.a) * unifSum / (i + 1) });
        }

        // Importance sampling
        var isSamples = sampleTruncGauss(intg.pMu, intg.pSigma, intg.a, intg.b, N);
        var isSum = 0, isHistory = [];
        for (var i = 0; i < isSamples.length; i++) {
            var x = isSamples[i];
            var p = truncGaussPdf(x, intg.pMu, intg.pSigma, intg.a, intg.b);
            isSum += intg.f(x) / p;
            if (i < 50 || i % Math.max(1, Math.floor(N / 300)) === 0)
                isHistory.push({ n: i + 1, est: isSum / (i + 1) });
        }

        // Left: sample locations
        var curveX = [], curveY = [], propY = [];
        for (var i = 0; i <= 200; i++) {
            var xi = intg.a + i * (intg.b - intg.a) / 200;
            curveX.push(xi); curveY.push(intg.f(xi));
            propY.push(truncGaussPdf(xi, intg.pMu, intg.pSigma, intg.a, intg.b) * (intg.b - intg.a));
        }

        // Show uniform samples as rug on bottom, IS samples on top
        var unifX = []; for (var i = 0; i < Math.min(N, 500); i++) unifX.push(intg.a + Math.random() * (intg.b - intg.a));
        var isX = isSamples.slice(0, 500);

        Plotly.react('is-samplePlot', [
            { x: curveX, y: curveY, type: 'scatter', mode: 'lines', line: { color: 'white', width: 2 }, name: 'f(x)' },
            { x: curveX, y: propY, type: 'scatter', mode: 'lines', line: { color: '#00ff88', width: 2, dash: 'dash' }, name: 'p(x) (scaled)' },
            { x: unifX, y: unifX.map(function() { return -0.08; }), type: 'scatter', mode: 'markers',
              marker: { color: '#00f3ff', size: 3, opacity: 0.4 }, name: 'Uniform samples' },
            { x: isX, y: isX.map(function() { return -0.15; }), type: 'scatter', mode: 'markers',
              marker: { color: '#00ff88', size: 3, opacity: 0.4 }, name: 'Importance samples' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([intg.a - 0.1, intg.b + 0.1], 'x'),
            yaxis: axStyle([-0.2, 1.2], 'f(x) / p(x)'),
            height: 400, legend: { x: 0.5, y: 0.98, font: { color: '#aaa', size: 9 } }
        }), { responsive: true });

        // Right: convergence
        Plotly.react('is-convergePlot', [
            { x: unifHistory.map(function(h){return h.n;}), y: unifHistory.map(function(h){return h.est;}),
              type: 'scatter', mode: 'lines', line: { color: '#00f3ff', width: 2 }, name: 'Uniform' },
            { x: isHistory.map(function(h){return h.n;}), y: isHistory.map(function(h){return h.est;}),
              type: 'scatter', mode: 'lines', line: { color: '#00ff88', width: 2 }, name: 'Importance' },
            { x: [1, N], y: [intg.trueVal, intg.trueVal], type: 'scatter', mode: 'lines',
              line: { color: 'white', width: 1.5, dash: 'dash' }, name: 'True' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'N'), yaxis: axStyle(null, 'Estimate'),
            height: 400, legend: { x: 0.55, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        var unifFinal = (intg.b - intg.a) * unifSum / N;
        var isFinal = isSum / isSamples.length;
        document.getElementById('is-stats1').innerHTML =
            '<span><strong>N = ' + N + '</strong></span>' +
            '<span>Uniform: ' + unifFinal.toFixed(5) + '  |  Importance: ' + isFinal.toFixed(5) + '  |  True: ' + intg.trueVal.toFixed(5) + '</span>';
    };

    window.isCompareReset = function() {
        ['is-samplePlot', 'is-convergePlot'].forEach(function(id) {
            Plotly.react(id, [], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
                annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run"', font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
            }), { responsive: true });
        });
        document.getElementById('is-stats1').innerHTML = '';
    };

    // ===============================================================
    // EXPLORER 2: Variance Reduction
    // ===============================================================
    window.isVarianceRun = function() {
        var N = parseInt(document.getElementById('is-vr-N-slider').value);
        var nTrials = 300;
        var intg = integrands.peaked;

        var unifEsts = [], isEsts = [];
        for (var t = 0; t < nTrials; t++) {
            var uSum = 0;
            for (var i = 0; i < N; i++) uSum += intg.f(Math.random());
            unifEsts.push(uSum / N);

            var samples = sampleTruncGauss(0.7, 0.22, 0, 1, N);
            var iSum = 0;
            for (var i = 0; i < samples.length; i++) {
                iSum += intg.f(samples[i]) / truncGaussPdf(samples[i], 0.7, 0.22, 0, 1);
            }
            isEsts.push(iSum / samples.length);
        }

        // Histograms
        Plotly.react('is-histPlot', [
            { x: unifEsts, type: 'histogram', opacity: 0.6, marker: { color: '#00f3ff' }, name: 'Uniform', nbinsx: 30 },
            { x: isEsts, type: 'histogram', opacity: 0.6, marker: { color: '#00ff88' }, name: 'Importance', nbinsx: 30 },
            { x: [intg.trueVal, intg.trueVal], y: [0, nTrials * 0.2], type: 'scatter', mode: 'lines',
              line: { color: 'white', width: 2, dash: 'dash' }, name: 'True' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Estimate'), yaxis: axStyle(null, 'Count'),
            height: 400, barmode: 'overlay',
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // Variance reduction bar
        var uVar = 0, iVar = 0, uMean = 0, iMean = 0;
        for (var t = 0; t < nTrials; t++) { uMean += unifEsts[t]; iMean += isEsts[t]; }
        uMean /= nTrials; iMean /= nTrials;
        for (var t = 0; t < nTrials; t++) { uVar += (unifEsts[t] - uMean) * (unifEsts[t] - uMean); iVar += (isEsts[t] - iMean) * (isEsts[t] - iMean); }
        uVar /= (nTrials - 1); iVar /= (nTrials - 1);
        var ratio = uVar / Math.max(iVar, 1e-20);

        Plotly.react('is-reductionPlot', [
            { x: ['Uniform', 'Importance'], y: [Math.sqrt(uVar), Math.sqrt(iVar)], type: 'bar',
              marker: { color: ['#00f3ff', '#00ff88'] }, showlegend: false }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''), yaxis: axStyle(null, 'Std. Dev. of Estimate'),
            height: 400,
            annotations: [{ x: 0.5, y: Math.sqrt(uVar) * 0.8, text: 'Reduction: ' + ratio.toFixed(0) + '×',
                font: { color: '#ffbe0b', size: 16 }, showarrow: false, xref: 'paper' }]
        }), { responsive: true });

        document.getElementById('is-stats2').innerHTML =
            '<span><strong>Variance reduction: ' + ratio.toFixed(0) + '×</strong></span>' +
            '<span>σ_uniform = ' + Math.sqrt(uVar).toFixed(5) + '  |  σ_importance = ' + Math.sqrt(iVar).toFixed(5) + '</span>' +
            '<span>' + nTrials + ' trials, N = ' + N + ' each</span>';
    };

    window.isVarianceReset = function() {
        ['is-histPlot', 'is-reductionPlot'].forEach(function(id) {
            Plotly.react(id, [], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
                annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run 300 Trials"', font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
            }), { responsive: true });
        });
        document.getElementById('is-stats2').innerHTML = '';
    };

    // ===============================================================
    // EXPLORER 3: Design Your Own p(x)
    // ===============================================================
    function drawDesign() {
        var mu = parseFloat(document.getElementById('is-mu-slider').value);
        var sigma = parseFloat(document.getElementById('is-sigma-slider').value);
        var intg = integrands.peaked;

        // Plot f(x) and p(x)
        var curveX = [], fY = [], pY = [];
        for (var i = 0; i <= 200; i++) {
            var x = i / 200;
            curveX.push(x); fY.push(intg.f(x));
            pY.push(truncGaussPdf(x, mu, sigma, 0, 1));
        }

        Plotly.react('is-designPlot', [
            { x: curveX, y: fY, type: 'scatter', mode: 'lines', line: { color: 'white', width: 2 }, name: 'f(x)' },
            { x: curveX, y: pY, type: 'scatter', mode: 'lines', line: { color: '#00ff88', width: 2, dash: 'dash' }, name: 'p(x)' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-0.05, 1.05], 'x'), yaxis: axStyle([-0.1, Math.max(3, Math.max.apply(null, pY) * 1.1)], 'Density'),
            height: 400, legend: { x: 0.7, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // Run quick MC to estimate variance
        var N = 2000;
        var unifVals = [], isVals = [];
        for (var i = 0; i < N; i++) {
            unifVals.push(intg.f(Math.random()));
        }
        var isSamples = sampleTruncGauss(mu, sigma, 0, 1, N);
        for (var i = 0; i < isSamples.length; i++) {
            isVals.push(intg.f(isSamples[i]) / truncGaussPdf(isSamples[i], mu, sigma, 0, 1));
        }

        var uMean = 0, iMean = 0;
        for (var i = 0; i < N; i++) { uMean += unifVals[i]; iMean += isVals[i]; }
        uMean /= N; iMean /= N;
        var uVar = 0, iVar = 0;
        for (var i = 0; i < N; i++) { uVar += (unifVals[i] - uMean) * (unifVals[i] - uMean); iVar += (isVals[i] - iMean) * (isVals[i] - iMean); }
        uVar /= (N - 1); iVar /= (N - 1);
        var ratio = uVar / Math.max(iVar, 1e-20);

        Plotly.react('is-designVarPlot', [
            { x: ['Uniform', 'Importance'], y: [uVar, iVar], type: 'bar',
              marker: { color: ['#00f3ff', '#00ff88'] }, showlegend: false }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''), yaxis: Object.assign(axStyle(null, 'Variance'), { type: 'log' }),
            height: 400,
            annotations: [{ x: 0.5, y: 0.5, text: (ratio > 1 ? ratio.toFixed(0) + '× reduction' : (1/ratio).toFixed(0) + '× WORSE'),
                font: { color: ratio > 1 ? '#00ff88' : '#ff006e', size: 16 }, showarrow: false, xref: 'paper', yref: 'paper' }]
        }), { responsive: true });

        document.getElementById('is-stats3').innerHTML =
            '<span><strong>μ = ' + mu.toFixed(2) + ', σ = ' + sigma.toFixed(2) + '</strong></span>' +
            '<span>Variance ratio: ' + (ratio > 1 ? ratio.toFixed(1) + '× better' : (1/ratio).toFixed(1) + '× WORSE than uniform') + '</span>';
    }

    window.isDesignReset = function() {
        document.getElementById('is-mu-slider').value = 0.7;
        document.getElementById('is-sigma-slider').value = 0.25;
        document.getElementById('is-mu-value').textContent = '0.70';
        document.getElementById('is-sigma-value').textContent = '0.25';
        drawDesign();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('is-samplePlot')) { setTimeout(initializePlots, 100); return; }

        // Explorer 1 placeholder
        ['is-samplePlot', 'is-convergePlot'].forEach(function(id) {
            Plotly.react(id, [], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
                annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run"', font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
            }), { responsive: true });
        });

        document.getElementById('is-N-slider').addEventListener('input', function() {
            document.getElementById('is-N-value').textContent = this.value;
        });

        // Explorer 2 placeholder
        ['is-histPlot', 'is-reductionPlot'].forEach(function(id) {
            Plotly.react(id, [], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
                annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run 300 Trials"', font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
            }), { responsive: true });
        });

        document.getElementById('is-vr-N-slider').addEventListener('input', function() {
            document.getElementById('is-vr-N-value').textContent = this.value;
        });

        // Explorer 3
        drawDesign();
        document.getElementById('is-mu-slider').addEventListener('input', function() {
            document.getElementById('is-mu-value').textContent = parseFloat(this.value).toFixed(2);
            drawDesign();
        });
        document.getElementById('is-sigma-slider').addEventListener('input', function() {
            document.getElementById('is-sigma-value').textContent = parseFloat(this.value).toFixed(2);
            drawDesign();
        });
    }

    initializePlots();
})();
