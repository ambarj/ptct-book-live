(function() {
    'use strict';

    // Constants & shared state
    var G_TRUE = 9.8, A_TRUE = G_TRUE / 2, N_TRIALS = 5, NOISE_PCT_DEFAULT = 0.15;
    var TIMES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], N_TIMES = TIMES.length;
    var sharedMeans = [], sharedErrors = [];
    var landMeans = [], landErrors = [];
    var weightMeans = [], weightErrors = [];

    function boxMuller(mu, sigma) {
        var u1 = Math.random();
        var u2 = Math.random();
        if (u1 < 1e-10) u1 = 1e-10;
        var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mu + sigma * z;
    }

    function trueD(t) {
        return 0.5 * G_TRUE * t * t;
    }

    function generateGalileoData(noisePct) {
        var means = [];
        var errors = [];
        for (var i = 0; i < N_TIMES; i++) {
            var t = TIMES[i];
            var dTrue = trueD(t);
            var sigma = noisePct * dTrue;
            var trials = [];
            for (var j = 0; j < N_TRIALS; j++) {
                trials.push(boxMuller(dTrue, sigma));
            }
            var sum = 0;
            for (var j = 0; j < N_TRIALS; j++) sum += trials[j];
            var mean = sum / N_TRIALS;
            var varSum = 0;
            for (var j = 0; j < N_TRIALS; j++) {
                var d = trials[j] - mean;
                varSum += d * d;
            }
            var s = Math.sqrt(varSum / (N_TRIALS - 1));
            var se = s / Math.sqrt(N_TRIALS - 1);
            means.push(mean);
            errors.push(se);
        }
        return { means: means, errors: errors };
    }

    function computeChi2_1param(a, means, errors) {
        var chi2 = 0;
        for (var i = 0; i < N_TIMES; i++) {
            var t = TIMES[i];
            var model = a * t * t;
            var residual = means[i] - model;
            chi2 += (residual * residual) / (errors[i] * errors[i]);
        }
        return chi2;
    }

    function computeChi2_2param(a, c, means, errors) {
        var chi2 = 0;
        for (var i = 0; i < N_TIMES; i++) {
            var t = TIMES[i];
            var model = a + c * t * t;
            var residual = means[i] - model;
            chi2 += (residual * residual) / (errors[i] * errors[i]);
        }
        return chi2;
    }

    function findBest1Param(means, errors) {
        // Analytical: a_best = sum(w_i * y_i * t_i^2) / sum(w_i * t_i^4)
        var num = 0, den = 0;
        for (var i = 0; i < N_TIMES; i++) {
            var t = TIMES[i];
            var w = 1.0 / (errors[i] * errors[i]);
            num += w * means[i] * t * t;
            den += w * t * t * t * t;
        }
        return (den > 0) ? num / den : A_TRUE;
    }

    function findBest1ParamUnweighted(means) {
        // Unweighted: a_best = sum(y_i * t_i^2) / sum(t_i^4)
        var num = 0, den = 0;
        for (var i = 0; i < N_TIMES; i++) {
            var t = TIMES[i];
            num += means[i] * t * t;
            den += t * t * t * t;
        }
        return (den > 0) ? num / den : A_TRUE;
    }

    // Explorer 1: What is χ²?
    function generateSliderData() {
        var result = generateGalileoData(NOISE_PCT_DEFAULT);
        sharedMeans = result.means;
        sharedErrors = result.errors;
    }

    function plotSlider() {
        var a = parseFloat(document.getElementById('chi2-a-slider').value);

        // LEFT: Data + model curve
        var traces1 = [];

        // Data with error bars
        traces1.push({
            x: TIMES, y: sharedMeans, mode: 'markers',
            error_y: { type: 'data', array: sharedErrors, visible: true, color: '#00f3ff', thickness: 2 },
            marker: { size: 8, color: '#00f3ff' },
            name: 'Data ± SE'
        });

        // Model curve for current a
        var tFine = [], dModel = [];
        for (var k = 0; k <= 200; k++) {
            var t = 11 * k / 200;
            tFine.push(t);
            dModel.push(a * t * t);
        }
        traces1.push({
            x: tFine, y: dModel, mode: 'lines',
            line: { color: '#ffff00', width: 2.5 },
            name: 'Model: d = ' + a.toFixed(2) + 't²'
        });

        // True curve (dashed)
        var dTrue = [];
        for (var k = 0; k <= 200; k++) {
            dTrue.push(A_TRUE * tFine[k] * tFine[k]);
        }
        traces1.push({
            x: tFine, y: dTrue, mode: 'lines',
            line: { color: '#ff00ff', width: 1.5, dash: 'dash' },
            name: 'True: a = 4.90'
        });

        var layout1 = {
            title: { text: 'Data vs Model (a = ' + a.toFixed(2) + ')', font: { size: 13 } },
            xaxis: { title: 'Time (s)', range: [0, 11], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            yaxis: { title: 'Distance (m)', range: [0, 600], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            showlegend: true,
            legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)', font: { size: 10 } },
            margin: { t: 40, b: 50, l: 55, r: 15 }
        };

        createPlot('chi2-data-plot', traces1, layout1);

        // RIGHT: χ² curve
        var aVals = [], chi2Vals = [];
        for (var j = 0; j <= 200; j++) {
            var aVal = 3.0 + (7.0 - 3.0) * j / 200;
            aVals.push(aVal);
            chi2Vals.push(computeChi2_1param(aVal, sharedMeans, sharedErrors));
        }

        var aBest = findBest1Param(sharedMeans, sharedErrors);
        var chi2Best = computeChi2_1param(aBest, sharedMeans, sharedErrors);
        var chi2Current = computeChi2_1param(a, sharedMeans, sharedErrors);

        // Cap y-axis for readability
        var chi2Max = chi2Best * 20;
        if (chi2Max < 50) chi2Max = 50;

        var traces2 = [];
        traces2.push({
            x: aVals, y: chi2Vals, mode: 'lines',
            line: { color: '#00ff9f', width: 2.5 },
            name: 'χ²(a)'
        });

        // Current position marker
        traces2.push({
            x: [a], y: [Math.min(chi2Current, chi2Max)], mode: 'markers',
            marker: { size: 12, color: '#ffff00', symbol: 'circle' },
            name: 'Current: χ² = ' + chi2Current.toFixed(1)
        });

        // Best fit marker
        traces2.push({
            x: [aBest], y: [chi2Best], mode: 'markers',
            marker: { size: 10, color: '#ff00ff', symbol: 'star' },
            name: 'Best: a = ' + aBest.toFixed(3)
        });

        var layout2 = {
            title: { text: 'χ² Landscape', font: { size: 13 } },
            xaxis: { title: 'Parameter a', range: [3, 7], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            yaxis: { title: 'χ²', range: [0, chi2Max], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            showlegend: true,
            legend: { x: 0.55, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)', font: { size: 10 } },
            margin: { t: 40, b: 50, l: 55, r: 15 }
        };

        createPlot('chi2-curve-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('chi2-slider-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>Current a: <strong>' + a.toFixed(2) + '</strong></span>' +
                '<span>χ²: <strong>' + chi2Current.toFixed(1) + '</strong></span>' +
                '<span>Best-fit a: <strong>' + aBest.toFixed(3) + '</strong></span>' +
                '<span>χ²<sub>min</sub>: <strong>' + chi2Best.toFixed(1) + '</strong></span>';
        }
    }

    // Explorer 2: χ² Landscape (2D)
    var landGrid = null;
    var aRange = null;
    var cRange = null;

    function generateLandscapeData() {
        var result = generateGalileoData(NOISE_PCT_DEFAULT);
        landMeans = result.means;
        landErrors = result.errors;
        computeLandscapeGrid();
    }

    function computeLandscapeGrid() {
        var nA = 80, nC = 80;
        aRange = [];
        cRange = [];
        for (var i = 0; i < nA; i++) aRange.push(-20 + 40 * i / (nA - 1));
        for (var j = 0; j < nC; j++) cRange.push(3.0 + 4.0 * j / (nC - 1));

        landGrid = [];
        for (var j = 0; j < nC; j++) {
            var row = [];
            for (var i = 0; i < nA; i++) {
                row.push(computeChi2_2param(aRange[i], cRange[j], landMeans, landErrors));
            }
            landGrid.push(row);
        }
    }

    function plotLandscape() {
        var aVal = parseFloat(document.getElementById('chi2-land-a-slider').value);
        var cVal = parseFloat(document.getElementById('chi2-land-c-slider').value);

        // Find grid minimum
        var minChi2 = Infinity, bestA = 0, bestC = A_TRUE;
        for (var j = 0; j < cRange.length; j++) {
            for (var i = 0; i < aRange.length; i++) {
                if (landGrid[j][i] < minChi2) {
                    minChi2 = landGrid[j][i];
                    bestA = aRange[i];
                    bestC = cRange[j];
                }
            }
        }

        var chi2Current = computeChi2_2param(aVal, cVal, landMeans, landErrors);

        // Cap values for better contour visibility
        var cappedGrid = [];
        var capVal = minChi2 * 30;
        if (capVal < 100) capVal = 100;
        for (var j = 0; j < landGrid.length; j++) {
            var row = [];
            for (var i = 0; i < landGrid[j].length; i++) {
                row.push(Math.min(landGrid[j][i], capVal));
            }
            cappedGrid.push(row);
        }

        // LEFT: Contour plot
        var traces1 = [];
        traces1.push({
            x: aRange, y: cRange, z: cappedGrid,
            type: 'contour',
            colorscale: 'Viridis',
            ncontours: 20,
            showscale: true,
            colorbar: { title: 'χ²', titleside: 'right', len: 0.9 },
            hoverinfo: 'x+y+z'
        });

        // Current position
        traces1.push({
            x: [aVal], y: [cVal], mode: 'markers',
            marker: { size: 14, color: '#ffff00', symbol: 'cross', line: { width: 2, color: '#ffff00' } },
            name: 'Current',
            showlegend: false
        });

        // Best fit
        traces1.push({
            x: [bestA], y: [bestC], mode: 'markers',
            marker: { size: 12, color: '#ff00ff', symbol: 'star' },
            name: 'Minimum',
            showlegend: false
        });

        var layout1 = {
            title: { text: 'χ² Contour Map', font: { size: 13 } },
            xaxis: { title: 'Offset a', range: [-20, 20], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            yaxis: { title: 'Coefficient c', range: [3, 7], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            margin: { t: 40, b: 50, l: 55, r: 80 }
        };

        createPlot('chi2-contour-plot', traces1, layout1);

        // RIGHT: Data + current model
        var traces2 = [];
        traces2.push({
            x: TIMES, y: landMeans, mode: 'markers',
            error_y: { type: 'data', array: landErrors, visible: true, color: '#00f3ff', thickness: 2 },
            marker: { size: 8, color: '#00f3ff' },
            name: 'Data ± SE'
        });

        var tFine = [], dModel = [], dTrue = [];
        for (var k = 0; k <= 200; k++) {
            var t = 11 * k / 200;
            tFine.push(t);
            dModel.push(aVal + cVal * t * t);
            dTrue.push(A_TRUE * t * t);
        }
        traces2.push({
            x: tFine, y: dModel, mode: 'lines',
            line: { color: '#ffff00', width: 2.5 },
            name: 'd = ' + aVal.toFixed(1) + ' + ' + cVal.toFixed(2) + 't²'
        });
        traces2.push({
            x: tFine, y: dTrue, mode: 'lines',
            line: { color: '#ff00ff', width: 1.5, dash: 'dash' },
            name: 'True: d = 4.9t²'
        });

        var layout2 = {
            title: { text: 'Model Fit (χ² = ' + chi2Current.toFixed(1) + ')', font: { size: 13 } },
            xaxis: { title: 'Time (s)', range: [0, 11], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            yaxis: { title: 'Distance (m)', range: [-50, 600], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            showlegend: true,
            legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)', font: { size: 10 } },
            margin: { t: 40, b: 50, l: 55, r: 15 }
        };

        createPlot('chi2-landscape-data-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('chi2-landscape-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>Current (a, c): <strong>(' + aVal.toFixed(1) + ', ' + cVal.toFixed(2) + ')</strong></span>' +
                '<span>χ²: <strong>' + chi2Current.toFixed(1) + '</strong></span>' +
                '<span>Best-fit: <strong>(' + bestA.toFixed(1) + ', ' + bestC.toFixed(2) + ')</strong></span>' +
                '<span>χ²<sub>min</sub>: <strong>' + minChi2.toFixed(1) + '</strong></span>';
        }
    }

    // Explorer 3: Weighting by Uncertainty
    function generateWeightData(noisePct) {
        var result = generateGalileoData(noisePct);
        weightMeans = result.means;
        weightErrors = result.errors;
    }

    function plotWeight() {
        var noisePct = parseInt(document.getElementById('chi2-weight-noise-slider').value) / 100;
        var mode = document.getElementById('chi2-weight-mode-select').value;

        if (weightMeans.length === 0) {
            generateWeightData(noisePct);
        }

        // Compute best-fit for both modes
        var aBestW = findBest1Param(weightMeans, weightErrors);
        var aBestU = findBest1ParamUnweighted(weightMeans);

        var aCurrent = (mode === 'weighted') ? aBestW : aBestU;

        // Scan χ² for current mode
        var aVals = [], chi2W = [], chi2U = [];
        for (var j = 0; j <= 200; j++) {
            var aVal = 3.0 + 4.0 * j / 200;
            aVals.push(aVal);

            // Weighted
            var cw = 0;
            for (var i = 0; i < N_TIMES; i++) {
                var t = TIMES[i];
                var r = weightMeans[i] - aVal * t * t;
                cw += (r * r) / (weightErrors[i] * weightErrors[i]);
            }
            chi2W.push(cw);

            // Unweighted
            var cu = 0;
            for (var i = 0; i < N_TIMES; i++) {
                var t = TIMES[i];
                var r = weightMeans[i] - aVal * t * t;
                cu += r * r;
            }
            chi2U.push(cu);
        }

        var traces = [];

        // Data with error bars
        traces.push({
            x: TIMES, y: weightMeans, mode: 'markers',
            error_y: { type: 'data', array: weightErrors, visible: true, color: '#00f3ff', thickness: 2 },
            marker: { size: 8, color: '#00f3ff' },
            name: 'Data ± SE', yaxis: 'y'
        });

        // Best-fit curve (current mode)
        var tFine = [], dFit = [], dTrue = [];
        for (var k = 0; k <= 200; k++) {
            var t = 11 * k / 200;
            tFine.push(t);
            dFit.push(aCurrent * t * t);
            dTrue.push(A_TRUE * t * t);
        }
        var modeLabel = (mode === 'weighted') ? 'Weighted' : 'Unweighted';
        traces.push({
            x: tFine, y: dFit, mode: 'lines',
            line: { color: '#00ff9f', width: 2.5 },
            name: modeLabel + ': a = ' + aCurrent.toFixed(3)
        });

        // True curve
        traces.push({
            x: tFine, y: dTrue, mode: 'lines',
            line: { color: '#ff00ff', width: 1.5, dash: 'dash' },
            name: 'True: a = 4.900'
        });

        var layout = {
            title: { text: modeLabel + ' Fit: a = ' + aCurrent.toFixed(3) + ' (true = 4.900)', font: { size: 14 } },
            xaxis: { title: 'Time (s)', range: [0, 11], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            yaxis: { title: 'Distance (m)', range: [0, 600], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            showlegend: true,
            legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)' }
        };

        createPlot('chi2-weight-plot', traces, layout);

        // Stats
        var statsDiv = document.getElementById('chi2-weight-stats');
        if (statsDiv) {
            var diffW = Math.abs(aBestW - A_TRUE);
            var diffU = Math.abs(aBestU - A_TRUE);
            statsDiv.innerHTML =
                '<span>Weighted a: <strong>' + aBestW.toFixed(3) + '</strong> (|Δ| = ' + diffW.toFixed(3) + ')</span>' +
                '<span>Unweighted a: <strong>' + aBestU.toFixed(3) + '</strong> (|Δ| = ' + diffU.toFixed(3) + ')</span>' +
                '<span>Difference: <strong>' + Math.abs(aBestW - aBestU).toFixed(3) + '</strong></span>';
        }
    }

    // Event handlers
    function attachEventHandlers() {
        // Explorer 1
        var aSlider = document.getElementById('chi2-a-slider');
        if (aSlider) aSlider.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
            plotSlider();
        });

        // Explorer 2
        var landA = document.getElementById('chi2-land-a-slider');
        var landC = document.getElementById('chi2-land-c-slider');
        if (landA) landA.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(1); }
            plotLandscape();
        });
        if (landC) landC.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
            plotLandscape();
        });

        // Explorer 3
        var weightNoise = document.getElementById('chi2-weight-noise-slider');
        var weightMode = document.getElementById('chi2-weight-mode-select');
        if (weightNoise) weightNoise.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.value; }
            generateWeightData(parseInt(this.value) / 100);
            plotWeight();
        });
        if (weightMode) weightMode.addEventListener('change', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.options[this.selectedIndex].text; }
            plotWeight();
        });
    }

    // Initialization
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100);
            return;
        }

        var p1 = document.getElementById('chi2-data-plot');
        var p2 = document.getElementById('chi2-contour-plot');
        var p3 = document.getElementById('chi2-weight-plot');

        if (!p1 || !p2 || !p3) {
            setTimeout(initializePlots, 100);
            return;
        }

        generateSliderData();
        generateLandscapeData();
        generateWeightData(0.20);

        plotSlider();
        plotLandscape();
        plotWeight();
        attachEventHandlers();
    }

    // Global functions
    window.newChi2Data = function() {
        generateSliderData();
        plotSlider();
    };

    window.resetChi2Slider = function() {
        var s = document.getElementById('chi2-a-slider');
        if (s) {
            s.value = 4.9;
            var label = s.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = '4.90'; }
        }
        generateSliderData();
        plotSlider();
    };

    window.newLandscapeData = function() {
        generateLandscapeData();
        plotLandscape();
    };

    window.resetLandscapeExplorer = function() {
        var sA = document.getElementById('chi2-land-a-slider');
        var sC = document.getElementById('chi2-land-c-slider');
        if (sA) {
            sA.value = 0;
            var label = sA.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = '0'; }
        }
        if (sC) {
            sC.value = 4.9;
            var label = sC.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = '4.90'; }
        }
        generateLandscapeData();
        plotLandscape();
    };

    window.newWeightData = function() {
        var noisePct = parseInt(document.getElementById('chi2-weight-noise-slider').value) / 100;
        generateWeightData(noisePct);
        plotWeight();
    };

    window.resetWeightExplorer = function() {
        var sN = document.getElementById('chi2-weight-noise-slider');
        var sM = document.getElementById('chi2-weight-mode-select');
        if (sN) {
            sN.value = 20;
            var label = sN.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = '20'; }
        }
        if (sM) {
            sM.value = 'weighted';
            var label = sM.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = 'Weighted (÷ σ²)'; }
        }
        generateWeightData(0.20);
        plotWeight();
    };

    // Auto-initialize
    initializePlots();
})();
