(function() {
    'use strict';

    // ============================================
    // Constants
    // ============================================

    var TRUE_G = 9.8;
    var BESSEL_MU = 10;
    var BESSEL_SIGMA = 2;
    var BESSEL_TRUE_VAR = 4;
    var N_BESSEL_EXPERIMENTS = 500;
    var COMP_MU_A = 10;

    // ============================================
    // Math helpers
    // ============================================

    function boxMuller(mu, sigma) {
        var u1 = Math.random();
        var u2 = Math.random();
        if (u1 < 1e-10) u1 = 1e-10;
        var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mu + sigma * z;
    }

    function computeStats(arr) {
        var n = arr.length;
        if (n === 0) return { mean: 0, s: 0, varBiased: 0, varUnbiased: 0 };
        var sum = 0;
        for (var i = 0; i < n; i++) sum += arr[i];
        var mean = sum / n;
        var ss = 0;
        for (var i = 0; i < n; i++) {
            var d = arr[i] - mean;
            ss += d * d;
        }
        var varBiased = ss / n;
        var varUnbiased = n > 1 ? ss / (n - 1) : 0;
        return {
            mean: mean,
            s: Math.sqrt(varBiased),
            varBiased: varBiased,
            varUnbiased: varUnbiased
        };
    }

    // ============================================
    // Explorer 1: Error Bar Builder
    // ============================================

    function plotBuilder() {
        var N = parseInt(document.getElementById('eb-n-slider').value);
        var sigma = parseFloat(document.getElementById('eb-sigma-slider').value);

        // Generate N measurements of g
        var measurements = [];
        for (var i = 0; i < N; i++) {
            measurements.push(boxMuller(TRUE_G, sigma));
        }

        var stats = computeStats(measurements);
        var xbar = stats.mean;
        var error = N > 1 ? stats.s / Math.sqrt(N - 1) : 0;

        // Measurement indices
        var indices = [];
        for (var j = 0; j < N; j++) indices.push(j + 1);

        // Scatter trace
        var scatterTrace = {
            x: indices, y: measurements, mode: 'markers',
            name: 'Measurements',
            marker: { color: '#00f3ff', size: 7 }
        };

        // Mean line
        var meanTrace = {
            x: [0.5, N + 0.5], y: [xbar, xbar], mode: 'lines',
            name: '\u0304X = ' + xbar.toFixed(3),
            line: { color: '#ffff00', width: 2, dash: 'dash' },
            hoverinfo: 'skip'
        };

        // Error band
        var bandTrace = {
            x: [0.5, N + 0.5, N + 0.5, 0.5],
            y: [xbar - error, xbar - error, xbar + error, xbar + error],
            fill: 'toself',
            fillcolor: 'rgba(255, 255, 0, 0.12)',
            line: { width: 0 },
            name: '\u0304X \u00B1 s/\u221A(N-1)',
            hoverinfo: 'skip'
        };

        // True value line
        var trueTrace = {
            x: [0.5, N + 0.5], y: [TRUE_G, TRUE_G], mode: 'lines',
            name: 'True g = ' + TRUE_G,
            line: { color: '#ff00ff', width: 2, dash: 'dot' },
            hoverinfo: 'skip'
        };

        // Y-axis range based on sigma
        var halfRange = Math.max(3.5 * sigma, 0.5);
        var yRange = [TRUE_G - halfRange, TRUE_G + halfRange];

        var layout = {
            title: { text: 'g = ' + xbar.toFixed(2) + ' \u00B1 ' + error.toFixed(3) + ' m/s\u00B2', font: { size: 14 } },
            xaxis: {
                title: 'Measurement #', range: [0, N + 1],
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            yaxis: {
                title: 'g (m/s\u00B2)', range: yRange,
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            showlegend: true,
            legend: { x: 0.60, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)' }
        };

        createPlot('eb-builder-plot', [bandTrace, scatterTrace, meanTrace, trueTrace], layout);

        // Stats readout
        var captured = (TRUE_G >= xbar - error && TRUE_G <= xbar + error);
        var statsDiv = document.getElementById('eb-builder-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>\u0304X = <strong>' + xbar.toFixed(3) + '</strong></span>' +
                '<span>s = <strong>' + stats.s.toFixed(3) + '</strong></span>' +
                '<span>s/\u221A(N-1) = <strong>' + error.toFixed(3) + '</strong></span>' +
                '<span>True in bar: <strong style="color:' +
                (captured ? '#00ff9f' : '#ff4444') + '">' +
                (captured ? 'Yes' : 'No') + '</strong></span>';
        }
    }

    // ============================================
    // Explorer 2: Bessel's Correction
    // ============================================

    function plotBessel() {
        var N = parseInt(document.getElementById('eb-bessel-n-slider').value);

        var biasedVars = [];
        var unbiasedVars = [];

        for (var t = 0; t < N_BESSEL_EXPERIMENTS; t++) {
            var samples = [];
            for (var i = 0; i < N; i++) {
                samples.push(boxMuller(BESSEL_MU, BESSEL_SIGMA));
            }
            var st = computeStats(samples);
            biasedVars.push(st.varBiased);
            unbiasedVars.push(st.varUnbiased);
        }

        // Compute means of estimates
        var meanBiased = 0, meanUnbiased = 0;
        for (var k = 0; k < N_BESSEL_EXPERIMENTS; k++) {
            meanBiased += biasedVars[k];
            meanUnbiased += unbiasedVars[k];
        }
        meanBiased /= N_BESSEL_EXPERIMENTS;
        meanUnbiased /= N_BESSEL_EXPERIMENTS;

        // Histogram traces
        var biasedTrace = {
            x: biasedVars, type: 'histogram',
            name: 'Biased (\u00F7N)',
            marker: { color: 'rgba(0, 243, 255, 0.45)', line: { color: '#00f3ff', width: 1 } },
            nbinsx: 30, opacity: 0.7
        };

        var unbiasedTrace = {
            x: unbiasedVars, type: 'histogram',
            name: 'Unbiased (\u00F7(N-1))',
            marker: { color: 'rgba(0, 255, 159, 0.45)', line: { color: '#00ff9f', width: 1 } },
            nbinsx: 30, opacity: 0.7
        };

        // True variance reference line
        var maxCount = N_BESSEL_EXPERIMENTS / 5;
        var refTrace = {
            x: [BESSEL_TRUE_VAR, BESSEL_TRUE_VAR],
            y: [0, maxCount],
            mode: 'lines',
            name: 'True \u03C3\u00B2 = ' + BESSEL_TRUE_VAR,
            line: { color: '#ff00ff', width: 2.5, dash: 'dash' },
            hoverinfo: 'skip'
        };

        var layout = {
            title: { text: 'Variance estimates from ' + N_BESSEL_EXPERIMENTS + ' experiments (N=' + N + ')', font: { size: 14 } },
            xaxis: {
                title: 'Estimated Variance',
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            yaxis: {
                title: 'Count',
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            barmode: 'overlay',
            showlegend: true,
            legend: { x: 0.60, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)' }
        };

        createPlot('eb-bessel-plot', [biasedTrace, unbiasedTrace, refTrace], layout);

        // Stats readout
        var statsDiv = document.getElementById('eb-bessel-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>Mean biased (\u00F7N): <strong>' + meanBiased.toFixed(3) + '</strong></span>' +
                '<span>Mean unbiased (\u00F7(N-1)): <strong>' + meanUnbiased.toFixed(3) + '</strong></span>' +
                '<span>True \u03C3\u00B2: <strong>' + BESSEL_TRUE_VAR.toFixed(1) + '</strong></span>';
        }
    }

    // ============================================
    // Explorer 3: Measurement Comparison
    // ============================================

    function plotComparison() {
        var N1 = parseInt(document.getElementById('eb-comp-n1-slider').value);
        var N2 = parseInt(document.getElementById('eb-comp-n2-slider').value);
        var sigma = parseFloat(document.getElementById('eb-comp-sigma-slider').value);
        var offset = parseFloat(document.getElementById('eb-comp-offset-slider').value);

        var muA = COMP_MU_A;
        var muB = COMP_MU_A + offset;

        // Lab A measurements
        var samplesA = [];
        for (var i = 0; i < N1; i++) samplesA.push(boxMuller(muA, sigma));
        var statsA = computeStats(samplesA);
        var errA = N1 > 1 ? statsA.s / Math.sqrt(N1 - 1) : 0;

        // Lab B measurements
        var samplesB = [];
        for (var j = 0; j < N2; j++) samplesB.push(boxMuller(muB, sigma));
        var statsB = computeStats(samplesB);
        var errB = N2 > 1 ? statsB.s / Math.sqrt(N2 - 1) : 0;

        // Error bar trace
        var dataTrace = {
            x: [0, 1], y: [statsA.mean, statsB.mean],
            error_y: {
                type: 'data',
                array: [errA, errB],
                visible: true,
                color: '#00f3ff',
                thickness: 2.5,
                width: 12
            },
            mode: 'markers',
            marker: { size: 14, color: '#00f3ff' },
            name: 'Measurements',
            hoverinfo: 'y'
        };

        // True value markers
        var trueTraceA = {
            x: [-0.25, 0.25], y: [muA, muA], mode: 'lines',
            line: { color: '#ff00ff', width: 2, dash: 'dash' },
            name: 'True \u03BC_A = ' + muA.toFixed(1),
            hoverinfo: 'skip'
        };
        var trueTraceB = {
            x: [0.75, 1.25], y: [muB, muB], mode: 'lines',
            line: { color: '#ffff00', width: 2, dash: 'dash' },
            name: 'True \u03BC_B = ' + muB.toFixed(1),
            hoverinfo: 'skip'
        };

        // Check overlap
        var upperA = statsA.mean + errA;
        var lowerA = statsA.mean - errA;
        var upperB = statsB.mean + errB;
        var lowerB = statsB.mean - errB;
        var overlap = (upperA >= lowerB) && (upperB >= lowerA);

        // Y-axis range
        var yLo = Math.min(muA, muB) - 3.5 * sigma;
        var yHi = Math.max(muA, muB) + 3.5 * sigma;

        var layout = {
            title: { text: 'Lab A vs Lab B' + (overlap ? ' \u2014 Overlap' : ' \u2014 No Overlap'), font: { size: 14 } },
            xaxis: {
                tickvals: [0, 1],
                ticktext: ['Lab A (N=' + N1 + ')', 'Lab B (N=' + N2 + ')'],
                range: [-0.5, 1.5],
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            yaxis: {
                title: 'Measured Value',
                range: [yLo, yHi],
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            showlegend: true,
            legend: { x: 0.60, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)' }
        };

        createPlot('eb-comp-plot', [dataTrace, trueTraceA, trueTraceB], layout);

        // Stats readout
        var diff = Math.abs(statsA.mean - statsB.mean);
        var combinedErr = Math.sqrt(errA * errA + errB * errB);
        var nSigma = combinedErr > 0.001 ? (diff / combinedErr) : 0;

        var statsDiv = document.getElementById('eb-comp-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>Lab A: <strong>' + statsA.mean.toFixed(2) + ' \u00B1 ' + errA.toFixed(3) + '</strong></span>' +
                '<span>Lab B: <strong>' + statsB.mean.toFixed(2) + ' \u00B1 ' + errB.toFixed(3) + '</strong></span>' +
                '<span>|\u0394| = <strong>' + diff.toFixed(3) + '</strong></span>' +
                '<span>' + nSigma.toFixed(1) + '\u03C3 apart</span>' +
                '<span style="color:' + (overlap ? '#00ff9f' : '#ff4444') + '"><strong>' +
                (overlap ? 'Overlap' : 'No Overlap') + '</strong></span>';
        }
    }

    // ============================================
    // Event handlers
    // ============================================

    function attachEventHandlers() {
        // Explorer 1
        var nSlider = document.getElementById('eb-n-slider');
        var sigmaSlider = document.getElementById('eb-sigma-slider');
        if (nSlider) nSlider.addEventListener('input', plotBuilder);
        if (sigmaSlider) sigmaSlider.addEventListener('input', plotBuilder);

        // Explorer 2
        var besselSlider = document.getElementById('eb-bessel-n-slider');
        if (besselSlider) besselSlider.addEventListener('input', plotBessel);

        // Explorer 3
        var compN1 = document.getElementById('eb-comp-n1-slider');
        var compN2 = document.getElementById('eb-comp-n2-slider');
        var compSigma = document.getElementById('eb-comp-sigma-slider');
        var compOffset = document.getElementById('eb-comp-offset-slider');
        if (compN1) compN1.addEventListener('input', plotComparison);
        if (compN2) compN2.addEventListener('input', plotComparison);
        if (compSigma) compSigma.addEventListener('input', plotComparison);
        if (compOffset) compOffset.addEventListener('input', plotComparison);
    }

    // ============================================
    // Initialization
    // ============================================

    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100);
            return;
        }

        var plot1 = document.getElementById('eb-builder-plot');
        var plot2 = document.getElementById('eb-bessel-plot');
        var plot3 = document.getElementById('eb-comp-plot');

        if (!plot1 || !plot2 || !plot3) {
            setTimeout(initializePlots, 100);
            return;
        }

        plotBuilder();
        plotBessel();
        plotComparison();
        attachEventHandlers();
    }

    // ============================================
    // Global functions (for onclick attributes)
    // ============================================

    window.newBuilderDraw = function() {
        plotBuilder();
    };

    window.resetBuilderExplorer = function() {
        var nSlider = document.getElementById('eb-n-slider');
        var sigmaSlider = document.getElementById('eb-sigma-slider');
        if (nSlider) {
            nSlider.value = 10;
            var label = nSlider.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = '10'; }
        }
        if (sigmaSlider) {
            sigmaSlider.value = 1.0;
            var label2 = sigmaSlider.closest('.control-group');
            if (label2) { var v2 = label2.querySelector('.control-label-value'); if (v2) v2.textContent = '1.00'; }
        }
        plotBuilder();
    };

    window.newBesselDraw = function() {
        plotBessel();
    };

    window.resetBesselExplorer = function() {
        var slider = document.getElementById('eb-bessel-n-slider');
        if (slider) {
            slider.value = 5;
            var label = slider.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = '5'; }
        }
        plotBessel();
    };

    window.newCompDraw = function() {
        plotComparison();
    };

    window.resetCompExplorer = function() {
        var ids = ['eb-comp-n1-slider', 'eb-comp-n2-slider', 'eb-comp-sigma-slider', 'eb-comp-offset-slider'];
        var defaults = [10, 10, 1.5, 0];
        var displays = ['10', '10', '1.50', '0.00'];
        for (var i = 0; i < ids.length; i++) {
            var sl = document.getElementById(ids[i]);
            if (sl) {
                sl.value = defaults[i];
                var label = sl.closest('.control-group');
                if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = displays[i]; }
            }
        }
        plotComparison();
    };

    // Auto-initialize
    initializePlots();
})();
