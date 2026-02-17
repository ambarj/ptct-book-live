(function() {
    'use strict';

    // ============================================
    // Distribution definitions
    // ============================================

    var distributions = {
        uniform: {
            label: 'Uniform [0, 10]',
            sample: function() { return Math.random() * 10; },
            mean: 5,
            variance: 100 / 12,
            sigma: Math.sqrt(100 / 12),
            pdf: function(x) { return (x >= 0 && x <= 10) ? 0.1 : 0; },
            pdfRange: [-1, 11]
        },
        gaussian: {
            label: 'Gaussian (\u03BC=5, \u03C3=2)',
            mean: 5,
            variance: 4,
            sigma: 2,
            sample: function() { return boxMuller(5, 2); },
            pdf: function(x) { return gaussianPDF(x, 5, 2); },
            pdfRange: [-2, 12]
        },
        exponential: {
            label: 'Exponential (\u03BB=0.5)',
            mean: 2,
            variance: 4,
            sigma: 2,
            sample: function() { return -Math.log(Math.random()) / 0.5; },
            pdf: function(x) { return x >= 0 ? 0.5 * Math.exp(-0.5 * x) : 0; },
            pdfRange: [-0.5, 14]
        }
    };

    // ============================================
    // Math helpers
    // ============================================

    function boxMuller(mu, sigma) {
        var u1 = Math.random();
        var u2 = Math.random();
        // Avoid log(0)
        if (u1 < 1e-10) u1 = 1e-10;
        var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mu + sigma * z;
    }

    function gaussianPDF(x, mu, sigma) {
        var z = (x - mu) / sigma;
        return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
    }

    function generateSamples(distKey, n) {
        var dist = distributions[distKey];
        var samples = [];
        for (var i = 0; i < n; i++) {
            samples.push(dist.sample());
        }
        return samples;
    }

    function computeStats(arr) {
        var n = arr.length;
        if (n === 0) return { mean: 0, variance: 0, sigma: 0 };
        var sum = 0;
        for (var i = 0; i < n; i++) sum += arr[i];
        var mean = sum / n;
        var varSum = 0;
        for (var i = 0; i < n; i++) {
            var d = arr[i] - mean;
            varSum += d * d;
        }
        var variance = varSum / n;
        return { mean: mean, variance: variance, sigma: Math.sqrt(variance) };
    }

    // ============================================
    // Explorer 1: Random Variable Sampler
    // ============================================

    function plotSampler() {
        var distKey = document.getElementById('rv-dist-select').value;
        var nSamples = parseInt(document.getElementById('rv-nsamples-slider').value);
        var dist = distributions[distKey];

        var samples = generateSamples(distKey, nSamples);
        var stats = computeStats(samples);

        // Number of bins: scale with sample count
        var nBins = Math.min(Math.max(Math.floor(nSamples / 5), 8), 40);

        // Histogram trace
        var histTrace = {
            x: samples,
            type: 'histogram',
            histnorm: 'probability density',
            name: 'Samples (' + nSamples + ')',
            marker: { color: 'rgba(0, 243, 255, 0.55)', line: { color: '#00f3ff', width: 1 } },
            nbinsx: nBins
        };

        // PDF overlay
        var xPdf = [], yPdf = [];
        var lo = dist.pdfRange[0], hi = dist.pdfRange[1];
        for (var i = 0; i <= 200; i++) {
            var x = lo + (hi - lo) * i / 200;
            xPdf.push(x);
            yPdf.push(dist.pdf(x));
        }
        var pdfTrace = {
            x: xPdf, y: yPdf, mode: 'lines',
            name: 'Theoretical PDF',
            line: { color: '#ff00ff', width: 2.5 }
        };

        // Mean line
        var yMax = 0;
        for (var j = 0; j < yPdf.length; j++) {
            if (yPdf[j] > yMax) yMax = yPdf[j];
        }
        var meanTrace = {
            x: [stats.mean, stats.mean],
            y: [0, yMax * 1.2],
            mode: 'lines',
            name: 'Sample mean',
            line: { color: '#ffff00', width: 2, dash: 'dash' },
            hoverinfo: 'skip'
        };

        var layout = {
            title: { text: dist.label + ' \u2014 ' + nSamples + ' samples', font: { size: 14 } },
            xaxis: {
                title: 'Value',
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            yaxis: {
                title: 'Probability Density',
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            showlegend: true,
            legend: { x: 0.60, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)' },
            bargap: 0.05
        };

        createPlot('rv-sampler-plot', [histTrace, pdfTrace, meanTrace], layout);

        // Update stats readout
        var statsDiv = document.getElementById('rv-sampler-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>Sample Mean: <strong>' + stats.mean.toFixed(3) +
                '</strong> (true: ' + dist.mean.toFixed(1) + ')</span>' +
                '<span>Sample \u03C3: <strong>' + stats.sigma.toFixed(3) +
                '</strong> (true: ' + dist.sigma.toFixed(3) + ')</span>';
        }
    }

    // ============================================
    // Explorer 2: Sum of N Random Variables
    // ============================================

    var nSumTrials = 1000;

    function plotSum() {
        var distKey = document.getElementById('rv-sum-dist-select').value;
        var N = parseInt(document.getElementById('rv-sum-n-slider').value);
        var dist = distributions[distKey];

        // Generate nSumTrials sums of N samples each
        var sums = [];
        for (var t = 0; t < nSumTrials; t++) {
            var s = 0;
            for (var i = 0; i < N; i++) {
                s += dist.sample();
            }
            sums.push(s);
        }

        var stats = computeStats(sums);

        // Theoretical values
        var theoryMean = N * dist.mean;
        var theorySigma = dist.sigma * Math.sqrt(N);

        // Histogram
        var histTrace = {
            x: sums,
            type: 'histogram',
            histnorm: 'probability density',
            name: '1000 sums (N=' + N + ')',
            marker: { color: 'rgba(255, 0, 255, 0.5)', line: { color: '#ff00ff', width: 1 } },
            nbinsx: 30
        };

        // CLT Gaussian overlay
        var xTheory = [], yTheory = [];
        var lo = theoryMean - 4 * theorySigma;
        var hi = theoryMean + 4 * theorySigma;
        for (var j = 0; j <= 200; j++) {
            var x = lo + (hi - lo) * j / 200;
            xTheory.push(x);
            yTheory.push(gaussianPDF(x, theoryMean, theorySigma));
        }
        var cltTrace = {
            x: xTheory, y: yTheory, mode: 'lines',
            name: 'CLT: N(' + theoryMean.toFixed(1) + ', ' + theorySigma.toFixed(2) + '\u00B2)',
            line: { color: '#00f3ff', width: 2.5 }
        };

        var layout = {
            title: { text: 'Sum of ' + N + ' ' + dist.label + ' variables', font: { size: 14 } },
            xaxis: {
                title: 'Sum S',
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            yaxis: {
                title: 'Probability Density',
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            showlegend: true,
            legend: { x: 0.60, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)' },
            bargap: 0.05
        };

        createPlot('rv-sum-plot', [histTrace, cltTrace], layout);

        // Stats readout
        var statsDiv = document.getElementById('rv-sum-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>Observed E(S): <strong>' + stats.mean.toFixed(2) +
                '</strong></span>' +
                '<span>Theory N\u03BC: <strong>' + theoryMean.toFixed(2) +
                '</strong></span>' +
                '<span>Observed \u03C3<sub>S</sub>: <strong>' + stats.sigma.toFixed(2) +
                '</strong></span>' +
                '<span>Theory \u03C3\u221AN: <strong>' + theorySigma.toFixed(2) +
                '</strong></span>';
        }
    }

    // ============================================
    // Explorer 3: Sample Mean Explorer
    // ============================================

    var nMeanExperiments = 500;

    function plotMean() {
        var distKey = document.getElementById('rv-mean-dist-select').value;
        var N = parseInt(document.getElementById('rv-mean-n-slider').value);
        var dist = distributions[distKey];

        // Generate nMeanExperiments sample means
        var means = [];
        for (var t = 0; t < nMeanExperiments; t++) {
            var s = 0;
            for (var i = 0; i < N; i++) {
                s += dist.sample();
            }
            means.push(s / N);
        }

        var stats = computeStats(means);

        // Theoretical values
        var theoryMean = dist.mean;
        var theorySigma = dist.sigma / Math.sqrt(N);

        // Histogram
        var histTrace = {
            x: means,
            type: 'histogram',
            histnorm: 'probability density',
            name: '500 experiments (N=' + N + ')',
            marker: { color: 'rgba(0, 255, 159, 0.5)', line: { color: '#00ff9f', width: 1 } },
            nbinsx: 25
        };

        // Theoretical Gaussian overlay (use full x-range so spike is visible)
        var xTheory = [], yTheory = [];
        var lo = dist.pdfRange[0];
        var hi = dist.pdfRange[1];
        for (var j = 0; j <= 200; j++) {
            var x = lo + (hi - lo) * j / 200;
            xTheory.push(x);
            yTheory.push(gaussianPDF(x, theoryMean, theorySigma));
        }
        var theoryTrace = {
            x: xTheory, y: yTheory, mode: 'lines',
            name: '\u03C3/\u221AN = ' + theorySigma.toFixed(3),
            line: { color: '#ffff00', width: 2.5 }
        };

        // X-axis range: FIXED to original distribution range so user sees shrinking
        var xRange = [dist.pdfRange[0], dist.pdfRange[1]];

        var layout = {
            title: { text: 'Sample Mean (\u0304X) \u2014 N=' + N + ', 500 experiments', font: { size: 14 } },
            xaxis: {
                title: 'Sample Mean \u0304X',
                range: xRange,
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            yaxis: {
                title: 'Probability Density',
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            showlegend: true,
            legend: { x: 0.60, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)' },
            bargap: 0.05
        };

        createPlot('rv-mean-plot', [histTrace, theoryTrace], layout);

        // Stats readout
        var statsDiv = document.getElementById('rv-mean-stats');
        if (statsDiv) {
            var ratio = (theorySigma > 0.001) ? (stats.sigma / theorySigma).toFixed(3) : '\u2014';
            statsDiv.innerHTML =
                '<span>Observed \u03C3<sub>\u0304X</sub>: <strong>' + stats.sigma.toFixed(4) +
                '</strong></span>' +
                '<span>Theory \u03C3/\u221AN: <strong>' + theorySigma.toFixed(4) +
                '</strong></span>' +
                '<span>Ratio: <strong>' + ratio +
                '</strong></span>';
        }
    }

    // ============================================
    // Event handlers
    // ============================================

    function attachEventHandlers() {
        // Explorer 1
        var distSelect = document.getElementById('rv-dist-select');
        var nsamplesSlider = document.getElementById('rv-nsamples-slider');
        if (distSelect) distSelect.addEventListener('change', plotSampler);
        if (nsamplesSlider) nsamplesSlider.addEventListener('input', plotSampler);

        // Explorer 2
        var sumDistSelect = document.getElementById('rv-sum-dist-select');
        var sumNSlider = document.getElementById('rv-sum-n-slider');
        if (sumDistSelect) sumDistSelect.addEventListener('change', plotSum);
        if (sumNSlider) sumNSlider.addEventListener('input', plotSum);

        // Explorer 3
        var meanDistSelect = document.getElementById('rv-mean-dist-select');
        var meanNSlider = document.getElementById('rv-mean-n-slider');
        if (meanDistSelect) meanDistSelect.addEventListener('change', plotMean);
        if (meanNSlider) meanNSlider.addEventListener('input', plotMean);
    }

    // ============================================
    // Initialization
    // ============================================

    function initializePlots() {
        // Check dependencies
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100);
            return;
        }

        // Check DOM elements exist
        var plot1 = document.getElementById('rv-sampler-plot');
        var plot2 = document.getElementById('rv-sum-plot');
        var plot3 = document.getElementById('rv-mean-plot');

        if (!plot1 || !plot2 || !plot3) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Draw all plots
        plotSampler();
        plotSum();
        plotMean();

        // Attach handlers
        attachEventHandlers();
    }

    // ============================================
    // Global functions (for onclick attributes)
    // ============================================

    window.newSamplerDraw = function() {
        plotSampler();
    };

    window.resetSamplerExplorer = function() {
        var distSelect = document.getElementById('rv-dist-select');
        var nsamplesSlider = document.getElementById('rv-nsamples-slider');
        if (distSelect) distSelect.value = 'uniform';
        if (nsamplesSlider) {
            nsamplesSlider.value = 100;
            var label = nsamplesSlider.closest('.control-group');
            if (label) {
                var valSpan = label.querySelector('.control-label-value');
                if (valSpan) valSpan.textContent = '100';
            }
        }
        plotSampler();
    };

    window.newSumDraw = function() {
        plotSum();
    };

    window.resetSumExplorer = function() {
        var distSelect = document.getElementById('rv-sum-dist-select');
        var nSlider = document.getElementById('rv-sum-n-slider');
        if (distSelect) distSelect.value = 'uniform';
        if (nSlider) {
            nSlider.value = 5;
            var label = nSlider.closest('.control-group');
            if (label) {
                var valSpan = label.querySelector('.control-label-value');
                if (valSpan) valSpan.textContent = '5';
            }
        }
        plotSum();
    };

    window.newMeanDraw = function() {
        plotMean();
    };

    window.resetMeanExplorer = function() {
        var distSelect = document.getElementById('rv-mean-dist-select');
        var nSlider = document.getElementById('rv-mean-n-slider');
        if (distSelect) distSelect.value = 'uniform';
        if (nSlider) {
            nSlider.value = 10;
            var label = nSlider.closest('.control-group');
            if (label) {
                var valSpan = label.querySelector('.control-label-value');
                if (valSpan) valSpan.textContent = '10';
            }
        }
        plotMean();
    };

    // Auto-initialize
    initializePlots();
})();
