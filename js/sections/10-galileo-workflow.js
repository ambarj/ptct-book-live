(function() {
    'use strict';

    // ============================================
    // Constants
    // ============================================

    var G_TRUE = 9.8;
    var TIME_POINTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var N_TIMES = TIME_POINTS.length;

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

    function trueDistance(t) {
        return 0.5 * G_TRUE * t * t;
    }

    function generateData(nTrials, noisePct) {
        var data = [];
        for (var i = 0; i < N_TIMES; i++) {
            var t = TIME_POINTS[i];
            var dTrue = trueDistance(t);
            var sigma = noisePct * dTrue;
            var trials = [];
            for (var j = 0; j < nTrials; j++) {
                trials.push(boxMuller(dTrue, sigma));
            }
            data.push(trials);
        }
        return data;
    }

    function computePointStats(trials) {
        var n = trials.length;
        var sum = 0;
        for (var i = 0; i < n; i++) sum += trials[i];
        var mean = sum / n;
        var varSum = 0;
        for (var i = 0; i < n; i++) {
            var d = trials[i] - mean;
            varSum += d * d;
        }
        var s = (n > 1) ? Math.sqrt(varSum / (n - 1)) : 0;
        var se = (n > 1) ? s / Math.sqrt(n - 1) : 0;
        return { mean: mean, s: s, se: se };
    }

    function fitG(means, errors) {
        // Weighted least-squares: g_i = 2*mean_i / t_i^2
        var sumW = 0, sumWG = 0;
        for (var i = 0; i < N_TIMES; i++) {
            var t = TIME_POINTS[i];
            var gi = 2 * means[i] / (t * t);
            var sigmaGi = 2 * errors[i] / (t * t);
            if (sigmaGi > 0.0001) {
                var w = 1.0 / (sigmaGi * sigmaGi);
                sumW += w;
                sumWG += w * gi;
            }
        }
        var gFit = (sumW > 0) ? sumWG / sumW : G_TRUE;
        var gUnc = (sumW > 0) ? 1.0 / Math.sqrt(sumW) : 0;
        return { g: gFit, unc: gUnc };
    }

    // ============================================
    // Explorer 1: Galileo's Virtual Lab
    // ============================================

    function plotLab() {
        var nTrials = parseInt(document.getElementById('gal-lab-n-slider').value);
        var noisePct = parseInt(document.getElementById('gal-lab-noise-slider').value) / 100;

        var data = generateData(nTrials, noisePct);
        var means = [], errors = [];

        for (var i = 0; i < N_TIMES; i++) {
            var stats = computePointStats(data[i]);
            means.push(stats.mean);
            errors.push(stats.se);
        }

        var traces = [];

        // Individual measurements (scatter)
        var allX = [], allY = [];
        for (var i = 0; i < N_TIMES; i++) {
            for (var j = 0; j < data[i].length; j++) {
                allX.push(TIME_POINTS[i]);
                allY.push(data[i][j]);
            }
        }
        traces.push({
            x: allX, y: allY, mode: 'markers',
            marker: { size: 4, color: 'rgba(0, 243, 255, 0.35)' },
            name: 'Individual trials',
            hoverinfo: 'x+y'
        });

        // Means with error bars
        traces.push({
            x: TIME_POINTS, y: means, mode: 'markers',
            error_y: { type: 'data', array: errors, visible: true, color: '#ffff00', thickness: 2 },
            marker: { size: 10, color: '#ffff00', symbol: 'diamond' },
            name: 'Mean \u00B1 SE'
        });

        // Theoretical curve
        var tFine = [], dFine = [];
        for (var k = 0; k <= 200; k++) {
            var t = 11 * k / 200;
            tFine.push(t);
            dFine.push(trueDistance(t));
        }
        traces.push({
            x: tFine, y: dFine, mode: 'lines',
            line: { color: '#ff00ff', width: 2.5 },
            name: 'Theory: d = \u00BD(9.8)t\u00B2'
        });

        var layout = {
            title: { text: 'Galileo\'s Lab: N=' + nTrials + ', \u03C3=' + Math.round(noisePct * 100) + '%', font: { size: 14 } },
            xaxis: {
                title: 'Time (s)', range: [0, 11],
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            yaxis: {
                title: 'Distance (m)', range: [0, 600],
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            showlegend: true,
            legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)' },
            bargap: 0.05
        };

        createPlot('gal-lab-plot', traces, layout);

        // Count how many error bars contain the true value
        var nContain = 0;
        for (var i = 0; i < N_TIMES; i++) {
            var dTrue = trueDistance(TIME_POINTS[i]);
            if (Math.abs(means[i] - dTrue) <= errors[i]) nContain++;
        }

        var statsDiv = document.getElementById('gal-lab-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>Points with theory in error bar: <strong>' + nContain + '/10</strong></span>' +
                '<span>Avg error bar: <strong>\u00B1' +
                (errors.reduce(function(a, b) { return a + b; }, 0) / N_TIMES).toFixed(1) +
                ' m</strong></span>';
        }
    }

    // ============================================
    // Explorer 2: Noise vs Truth
    // ============================================

    function plotNoise() {
        var nTrials = 10; // Fixed at 10
        var noisePct = parseInt(document.getElementById('gal-noise-noise-slider').value) / 100;

        var data = generateData(nTrials, noisePct);
        var means = [], errors = [];

        for (var i = 0; i < N_TIMES; i++) {
            var stats = computePointStats(data[i]);
            means.push(stats.mean);
            errors.push(stats.se);
        }

        var traces = [];

        // Means with error bars
        traces.push({
            x: TIME_POINTS, y: means, mode: 'markers',
            error_y: { type: 'data', array: errors, visible: true, color: '#00f3ff', thickness: 2 },
            marker: { size: 10, color: '#00f3ff', symbol: 'circle' },
            name: 'Mean \u00B1 SE (N=10)'
        });

        // Theoretical curve
        var tFine = [], dFine = [];
        for (var k = 0; k <= 200; k++) {
            var t = 11 * k / 200;
            tFine.push(t);
            dFine.push(trueDistance(t));
        }
        traces.push({
            x: tFine, y: dFine, mode: 'lines',
            line: { color: '#ff00ff', width: 2.5 },
            name: 'Theory: d = \u00BD(9.8)t\u00B2'
        });

        // Color-code: green if theory inside bar, red if outside
        var nContain = 0;
        var hitX = [], hitY = [], missX = [], missY = [];
        for (var i = 0; i < N_TIMES; i++) {
            var dTrue = trueDistance(TIME_POINTS[i]);
            if (Math.abs(means[i] - dTrue) <= errors[i]) {
                nContain++;
                hitX.push(TIME_POINTS[i]);
                hitY.push(means[i]);
            } else {
                missX.push(TIME_POINTS[i]);
                missY.push(means[i]);
            }
        }

        // Hit markers (green ring)
        if (hitX.length > 0) {
            traces.push({
                x: hitX, y: hitY, mode: 'markers',
                marker: { size: 16, color: 'rgba(0,0,0,0)', line: { color: '#00ff9f', width: 2.5 } },
                name: 'Theory inside bar (' + hitX.length + ')',
                hoverinfo: 'skip'
            });
        }

        // Miss markers (red ring)
        if (missX.length > 0) {
            traces.push({
                x: missX, y: missY, mode: 'markers',
                marker: { size: 16, color: 'rgba(0,0,0,0)', line: { color: '#ff4444', width: 2.5 } },
                name: 'Theory outside bar (' + missX.length + ')',
                hoverinfo: 'skip'
            });
        }

        var layout = {
            title: { text: 'Noise vs Truth: \u03C3=' + Math.round(noisePct * 100) + '%, N=10', font: { size: 14 } },
            xaxis: {
                title: 'Time (s)', range: [0, 11],
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            yaxis: {
                title: 'Distance (m)', range: [0, 600],
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            showlegend: true,
            legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)' }
        };

        createPlot('gal-noise-plot', traces, layout);

        var statsDiv = document.getElementById('gal-noise-stats');
        if (statsDiv) {
            var pct = Math.round(nContain / N_TIMES * 100);
            var color = (nContain >= 5 && nContain <= 9) ? '#00ff9f' : '#ff4444';
            statsDiv.innerHTML =
                '<span>Theory inside error bar: <strong style="color:' + color + '">' +
                nContain + '/10 (' + pct + '%)</strong></span>' +
                '<span>Expected at 1\u03C3: <strong>~7/10 (68%)</strong></span>';
        }
    }

    // ============================================
    // Explorer 3: Extracting g
    // ============================================

    function plotFit() {
        var nTrials = parseInt(document.getElementById('gal-fit-n-slider').value);
        var noisePct = parseInt(document.getElementById('gal-fit-noise-slider').value) / 100;

        var data = generateData(nTrials, noisePct);
        var means = [], errors = [];

        for (var i = 0; i < N_TIMES; i++) {
            var stats = computePointStats(data[i]);
            means.push(stats.mean);
            errors.push(stats.se);
        }

        // Fit g
        var result = fitG(means, errors);
        var gFit = result.g;
        var gUnc = result.unc;
        var deviation = Math.abs(gFit - G_TRUE);
        var nSigma = (gUnc > 0.001) ? deviation / gUnc : 0;
        var consistent = nSigma < 2;

        var traces = [];

        // Means with error bars
        traces.push({
            x: TIME_POINTS, y: means, mode: 'markers',
            error_y: { type: 'data', array: errors, visible: true, color: '#ffff00', thickness: 2 },
            marker: { size: 10, color: '#ffff00', symbol: 'diamond' },
            name: 'Data (mean \u00B1 SE)'
        });

        // Best-fit curve
        var tFine = [], dFit = [], dTrue = [];
        for (var k = 0; k <= 200; k++) {
            var t = 11 * k / 200;
            tFine.push(t);
            dFit.push(0.5 * gFit * t * t);
            dTrue.push(0.5 * G_TRUE * t * t);
        }
        traces.push({
            x: tFine, y: dFit, mode: 'lines',
            line: { color: '#00ff9f', width: 2.5 },
            name: 'Fit: g = ' + gFit.toFixed(2)
        });

        // True curve (dashed)
        traces.push({
            x: tFine, y: dTrue, mode: 'lines',
            line: { color: '#ff00ff', width: 2, dash: 'dash' },
            name: 'True: g = 9.80'
        });

        var layout = {
            title: {
                text: 'g = ' + gFit.toFixed(3) + ' \u00B1 ' + gUnc.toFixed(3) + ' m/s\u00B2',
                font: { size: 14 }
            },
            xaxis: {
                title: 'Time (s)', range: [0, 11],
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            yaxis: {
                title: 'Distance (m)', range: [0, 600],
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            showlegend: true,
            legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)' }
        };

        createPlot('gal-fit-plot', traces, layout);

        var statsDiv = document.getElementById('gal-fit-stats');
        if (statsDiv) {
            var conColor = consistent ? '#00ff9f' : '#ff4444';
            var conText = consistent ? 'Yes' : 'No';
            statsDiv.innerHTML =
                '<span>g<sub>fit</sub>: <strong>' + gFit.toFixed(3) + ' \u00B1 ' + gUnc.toFixed(3) + '</strong> m/s\u00B2</span>' +
                '<span>|g<sub>fit</sub> \u2212 9.8|: <strong>' + deviation.toFixed(3) + '</strong> m/s\u00B2</span>' +
                '<span>Deviation: <strong>' + nSigma.toFixed(1) + '\u03C3</strong></span>' +
                '<span>Consistent with 9.8? <strong style="color:' + conColor + '">' + conText + '</strong></span>';
        }
    }

    // ============================================
    // Event handlers
    // ============================================

    function attachEventHandlers() {
        // Explorer 1
        var labN = document.getElementById('gal-lab-n-slider');
        var labNoise = document.getElementById('gal-lab-noise-slider');
        if (labN) labN.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.value; }
            plotLab();
        });
        if (labNoise) labNoise.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.value; }
            plotLab();
        });

        // Explorer 2
        var noiseSlider = document.getElementById('gal-noise-noise-slider');
        if (noiseSlider) noiseSlider.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.value; }
            plotNoise();
        });

        // Explorer 3
        var fitN = document.getElementById('gal-fit-n-slider');
        var fitNoise = document.getElementById('gal-fit-noise-slider');
        if (fitN) fitN.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.value; }
            plotFit();
        });
        if (fitNoise) fitNoise.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.value; }
            plotFit();
        });
    }

    // ============================================
    // Initialization
    // ============================================

    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100);
            return;
        }

        var plot1 = document.getElementById('gal-lab-plot');
        var plot2 = document.getElementById('gal-noise-plot');
        var plot3 = document.getElementById('gal-fit-plot');

        if (!plot1 || !plot2 || !plot3) {
            setTimeout(initializePlots, 100);
            return;
        }

        plotLab();
        plotNoise();
        plotFit();
        attachEventHandlers();
    }

    // ============================================
    // Global functions (for onclick attributes)
    // ============================================

    window.newLabDraw = function() { plotLab(); };

    window.resetLabExplorer = function() {
        var nSlider = document.getElementById('gal-lab-n-slider');
        var noiseSlider = document.getElementById('gal-lab-noise-slider');
        if (nSlider) {
            nSlider.value = 10;
            var label = nSlider.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = '10'; }
        }
        if (noiseSlider) {
            noiseSlider.value = 20;
            var label = noiseSlider.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = '20'; }
        }
        plotLab();
    };

    window.newNoiseDraw = function() { plotNoise(); };

    window.resetNoiseExplorer = function() {
        var noiseSlider = document.getElementById('gal-noise-noise-slider');
        if (noiseSlider) {
            noiseSlider.value = 20;
            var label = noiseSlider.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = '20'; }
        }
        plotNoise();
    };

    window.newFitDraw = function() { plotFit(); };

    window.resetFitExplorer = function() {
        var nSlider = document.getElementById('gal-fit-n-slider');
        var noiseSlider = document.getElementById('gal-fit-noise-slider');
        if (nSlider) {
            nSlider.value = 10;
            var label = nSlider.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = '10'; }
        }
        if (noiseSlider) {
            noiseSlider.value = 20;
            var label = noiseSlider.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = '20'; }
        }
        plotFit();
    };

    // Auto-initialize
    initializePlots();
})();
