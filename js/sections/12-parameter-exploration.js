(function() {
    'use strict';

    // Constants
    var G_TRUE = 9.8, A_TRUE = G_TRUE / 2, N_TRIALS = 5, NOISE_PCT = 0.15;
    var TIMES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], N_TIMES = TIMES.length;

    // Shared data arrays
    var ppMeans = [], ppErrors = [];
    var psMeans = [], psErrors = [];
    var isMeans = [], isErrors = [];

    // Iterative search state
    var isParams = [15, -5, 3];
    var isHistory = [];

    function boxMuller(mu, sigma) {
        var u1 = Math.random();
        var u2 = Math.random();
        if (u1 < 1e-10) u1 = 1e-10;
        return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }

    function generateData() {
        var means = [], errors = [];
        for (var i = 0; i < N_TIMES; i++) {
            var t = TIMES[i];
            var dTrue = 0.5 * G_TRUE * t * t;
            var sigma = NOISE_PCT * dTrue;
            var trials = [];
            for (var j = 0; j < N_TRIALS; j++) trials.push(boxMuller(dTrue, sigma));
            var sum = 0;
            for (var j = 0; j < N_TRIALS; j++) sum += trials[j];
            var mean = sum / N_TRIALS;
            var varSum = 0;
            for (var j = 0; j < N_TRIALS; j++) { var d = trials[j] - mean; varSum += d * d; }
            var s = Math.sqrt(varSum / (N_TRIALS - 1));
            means.push(mean);
            errors.push(s / Math.sqrt(N_TRIALS - 1));
        }
        return { means: means, errors: errors };
    }

    function chi2_3param(a, b, c, means, errors) {
        var chi2 = 0;
        for (var i = 0; i < N_TIMES; i++) {
            var t = TIMES[i];
            var model = a + b * t + c * t * t;
            var r = means[i] - model;
            chi2 += (r * r) / (errors[i] * errors[i]);
        }
        return chi2;
    }

    // Analytical 1D best for parameter idx, fixing others
    function optimise1D(idx, params, means, errors) {
        // Sweep approach: 1000 points across the range
        var ranges = [[-30, 30], [-10, 10], [2, 8]];
        var lo = ranges[idx][0], hi = ranges[idx][1];
        var bestVal = params[idx], bestChi2 = Infinity;
        for (var k = 0; k <= 1000; k++) {
            var v = lo + (hi - lo) * k / 1000;
            var p = [params[0], params[1], params[2]];
            p[idx] = v;
            var c2 = chi2_3param(p[0], p[1], p[2], means, errors);
            if (c2 < bestChi2) { bestChi2 = c2; bestVal = v; }
        }
        return bestVal;
    }

    // Explorer 1: Parameter Playground
    function plotPlayground() {
        var a = parseFloat(document.getElementById('pp-a-slider').value);
        var b = parseFloat(document.getElementById('pp-b-slider').value);
        var c = parseFloat(document.getElementById('pp-c-slider').value);

        // LEFT: Data + model
        var traces1 = [];
        traces1.push({
            x: TIMES, y: ppMeans, mode: 'markers',
            error_y: { type: 'data', array: ppErrors, visible: true, color: '#00f3ff', thickness: 2 },
            marker: { size: 8, color: '#00f3ff' }, name: 'Data \u00B1 SE'
        });

        var tFine = [], dModel = [], dTrue = [];
        for (var k = 0; k <= 200; k++) {
            var t = 11 * k / 200;
            tFine.push(t);
            dModel.push(a + b * t + c * t * t);
            dTrue.push(A_TRUE * t * t);
        }
        traces1.push({
            x: tFine, y: dModel, mode: 'lines',
            line: { color: '#ffff00', width: 2.5 },
            name: 'd = ' + a.toFixed(1) + ' + ' + b.toFixed(1) + 't + ' + c.toFixed(2) + 't\u00B2'
        });
        traces1.push({
            x: tFine, y: dTrue, mode: 'lines',
            line: { color: '#ff00ff', width: 1.5, dash: 'dash' },
            name: 'True: d = 4.9t\u00B2'
        });

        var layout1 = {
            title: { text: 'Data vs Model', font: { size: 13 } },
            xaxis: { title: 'Time (s)', range: [0, 11], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            yaxis: { title: 'Distance (m)', range: [-50, 700], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            showlegend: true,
            legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)', font: { size: 10 } },
            margin: { t: 40, b: 50, l: 55, r: 15 }
        };
        createPlot('pp-data-plot', traces1, layout1);

        // RIGHT: χ² bar/readout
        var chi2Current = chi2_3param(a, b, c, ppMeans, ppErrors);
        var bestC = optimise1D(2, [a, b, c], ppMeans, ppErrors);
        var chi2Best = chi2_3param(a, b, bestC, ppMeans, ppErrors);

        // Compute full best fit (all 3)
        var fullBest = [a, b, c];
        for (var r = 0; r < 5; r++) {
            for (var idx = 0; idx < 3; idx++) {
                fullBest[idx] = optimise1D(idx, fullBest, ppMeans, ppErrors);
            }
        }
        var chi2FullBest = chi2_3param(fullBest[0], fullBest[1], fullBest[2], ppMeans, ppErrors);

        // χ² comparison bar chart
        var traces2 = [{
            x: ['Current', 'Best (all)'],
            y: [chi2Current, chi2FullBest],
            type: 'bar',
            marker: { color: ['#ffff00', '#00ff9f'] },
            text: [chi2Current.toFixed(1), chi2FullBest.toFixed(1)],
            textposition: 'outside',
            textfont: { color: '#c8c8e0' },
            hoverinfo: 'y'
        }];

        var chi2Cap = Math.max(chi2Current * 1.3, chi2FullBest * 5, 50);
        var layout2 = {
            title: { text: '\u03C7\u00B2 Comparison', font: { size: 13 } },
            xaxis: { gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            yaxis: { title: '\u03C7\u00B2', range: [0, chi2Cap], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            showlegend: false,
            margin: { t: 40, b: 50, l: 55, r: 15 }
        };
        createPlot('pp-chi2-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('pp-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>a = <strong>' + a.toFixed(1) + '</strong></span>' +
                '<span>b = <strong>' + b.toFixed(1) + '</strong></span>' +
                '<span>c = <strong>' + c.toFixed(2) + '</strong></span>' +
                '<span>\u03C7\u00B2 = <strong>' + chi2Current.toFixed(1) + '</strong></span>' +
                '<span>\u03C7\u00B2<sub>min</sub> = <strong>' + chi2FullBest.toFixed(1) + '</strong></span>';
        }
    }

    // Explorer 2: Parameter Sweep
    function plotSweep() {
        var param = document.getElementById('ps-param-select').value;
        var fixedA = parseFloat(document.getElementById('ps-fixed-a').value);
        var fixedB = parseFloat(document.getElementById('ps-fixed-b').value);
        var fixedC = parseFloat(document.getElementById('ps-fixed-c').value);

        var ranges = { a: [-30, 30], b: [-10, 10], c: [2, 8] };
        var labels = { a: 'Offset a', b: 'Velocity b', c: 'Acceleration c' };
        var lo = ranges[param][0], hi = ranges[param][1];

        var sweepVals = [], chi2Vals = [];
        var bestVal = 0, bestChi2 = Infinity;
        for (var k = 0; k <= 500; k++) {
            var v = lo + (hi - lo) * k / 500;
            sweepVals.push(v);
            var a = (param === 'a') ? v : fixedA;
            var b = (param === 'b') ? v : fixedB;
            var c = (param === 'c') ? v : fixedC;
            var c2 = chi2_3param(a, b, c, psMeans, psErrors);
            chi2Vals.push(c2);
            if (c2 < bestChi2) { bestChi2 = c2; bestVal = v; }
        }

        // Cap y for readability
        var chi2Cap = bestChi2 * 20;
        if (chi2Cap < 50) chi2Cap = 50;

        var traces = [];
        traces.push({
            x: sweepVals, y: chi2Vals, mode: 'lines',
            line: { color: '#00f3ff', width: 2.5 },
            name: '\u03C7\u00B2(' + param + ')'
        });
        traces.push({
            x: [bestVal], y: [bestChi2], mode: 'markers',
            marker: { size: 12, color: '#ffff00', symbol: 'star' },
            name: 'Min: ' + param + ' = ' + bestVal.toFixed(3)
        });

        var layout = {
            title: { text: '\u03C7\u00B2 Sweep: ' + labels[param], font: { size: 14 } },
            xaxis: { title: labels[param], range: [lo, hi], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            yaxis: { title: '\u03C7\u00B2', range: [0, chi2Cap], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            showlegend: true,
            legend: { x: 0.55, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)' }
        };
        createPlot('ps-sweep-plot', traces, layout);

        // Stats
        var statsDiv = document.getElementById('ps-stats');
        if (statsDiv) {
            var fixedStr = '';
            if (param !== 'a') fixedStr += 'a=' + fixedA.toFixed(1) + '  ';
            if (param !== 'b') fixedStr += 'b=' + fixedB.toFixed(1) + '  ';
            if (param !== 'c') fixedStr += 'c=' + fixedC.toFixed(2);
            statsDiv.innerHTML =
                '<span>Sweep: <strong>' + param + '</strong></span>' +
                '<span>Best ' + param + ': <strong>' + bestVal.toFixed(3) + '</strong></span>' +
                '<span>\u03C7\u00B2<sub>min</sub>: <strong>' + bestChi2.toFixed(1) + '</strong></span>' +
                '<span>Fixed: ' + fixedStr + '</span>';
        }
    }

    // Explorer 3: Iterative Search (Coordinate Descent)
    function plotIterative() {
        var a = isParams[0], b = isParams[1], c = isParams[2];
        var chi2Current = chi2_3param(a, b, c, isMeans, isErrors);

        // LEFT: Data + current fit
        var traces1 = [];
        traces1.push({
            x: TIMES, y: isMeans, mode: 'markers',
            error_y: { type: 'data', array: isErrors, visible: true, color: '#00f3ff', thickness: 2 },
            marker: { size: 8, color: '#00f3ff' }, name: 'Data \u00B1 SE'
        });

        var tFine = [], dModel = [], dTrue = [];
        for (var k = 0; k <= 200; k++) {
            var t = 11 * k / 200;
            tFine.push(t);
            dModel.push(a + b * t + c * t * t);
            dTrue.push(A_TRUE * t * t);
        }
        traces1.push({
            x: tFine, y: dModel, mode: 'lines',
            line: { color: '#ffff00', width: 2.5 },
            name: 'Current fit'
        });
        traces1.push({
            x: tFine, y: dTrue, mode: 'lines',
            line: { color: '#ff00ff', width: 1.5, dash: 'dash' },
            name: 'True: d = 4.9t\u00B2'
        });

        var layout1 = {
            title: { text: 'Fit (\u03C7\u00B2 = ' + chi2Current.toFixed(1) + ')', font: { size: 13 } },
            xaxis: { title: 'Time (s)', range: [0, 11], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            yaxis: { title: 'Distance (m)', range: [-50, 700], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            showlegend: true,
            legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)', font: { size: 10 } },
            margin: { t: 40, b: 50, l: 55, r: 15 }
        };
        createPlot('is-fit-plot', traces1, layout1);

        // RIGHT: χ² history
        var rounds = [], chi2Hist = [];
        for (var i = 0; i < isHistory.length; i++) {
            rounds.push(i);
            chi2Hist.push(isHistory[i].chi2);
        }

        var traces2 = [];
        if (isHistory.length > 0) {
            traces2.push({
                x: rounds, y: chi2Hist, mode: 'lines+markers',
                line: { color: '#00ff9f', width: 2 },
                marker: { size: 6, color: '#00ff9f' },
                name: '\u03C7\u00B2 per round'
            });
        }

        var yMax = isHistory.length > 0 ? Math.max.apply(null, chi2Hist) * 1.2 : 100;
        if (yMax < 10) yMax = 10;

        var layout2 = {
            title: { text: '\u03C7\u00B2 Convergence History', font: { size: 13 } },
            xaxis: { title: 'Round', gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            yaxis: { title: '\u03C7\u00B2', range: [0, yMax], gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080' },
            showlegend: false,
            margin: { t: 40, b: 50, l: 55, r: 15 }
        };
        createPlot('is-history-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('is-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>Round: <strong>' + isHistory.length + '</strong></span>' +
                '<span>a = <strong>' + a.toFixed(2) + '</strong></span>' +
                '<span>b = <strong>' + b.toFixed(2) + '</strong></span>' +
                '<span>c = <strong>' + c.toFixed(3) + '</strong></span>' +
                '<span>\u03C7\u00B2 = <strong>' + chi2Current.toFixed(1) + '</strong></span>';
        }
    }

    function doOneDescentRound() {
        for (var idx = 0; idx < 3; idx++) {
            isParams[idx] = optimise1D(idx, isParams, isMeans, isErrors);
        }
        var c2 = chi2_3param(isParams[0], isParams[1], isParams[2], isMeans, isErrors);
        isHistory.push({ a: isParams[0], b: isParams[1], c: isParams[2], chi2: c2 });
        return c2;
    }

    // Event handlers
    function attachEventHandlers() {
        // Explorer 1: sliders
        var ppSliders = ['pp-a-slider', 'pp-b-slider', 'pp-c-slider'];
        var ppFormats = [1, 1, 2]; // decimal places
        for (var i = 0; i < ppSliders.length; i++) {
            (function(id, dec) {
                var el = document.getElementById(id);
                if (el) el.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(dec); }
                    plotPlayground();
                });
            })(ppSliders[i], ppFormats[i]);
        }

        // Explorer 2: select + sliders
        var psSelect = document.getElementById('ps-param-select');
        if (psSelect) psSelect.addEventListener('change', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.options[this.selectedIndex].text; }
            plotSweep();
        });
        var psSliders = ['ps-fixed-a', 'ps-fixed-b', 'ps-fixed-c'];
        var psFormats = [1, 1, 2];
        for (var i = 0; i < psSliders.length; i++) {
            (function(id, dec) {
                var el = document.getElementById(id);
                if (el) el.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(dec); }
                    plotSweep();
                });
            })(psSliders[i], psFormats[i]);
        }

        // Explorer 3: start sliders (update labels only, don't replot — reset does that)
        var isSliders = ['is-start-a', 'is-start-b', 'is-start-c'];
        var isFormats = [1, 1, 2];
        for (var i = 0; i < isSliders.length; i++) {
            (function(id, dec) {
                var el = document.getElementById(id);
                if (el) el.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(dec); }
                });
            })(isSliders[i], isFormats[i]);
        }
    }

    // Initialization
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100);
            return;
        }
        var p1 = document.getElementById('pp-data-plot');
        var p2 = document.getElementById('ps-sweep-plot');
        var p3 = document.getElementById('is-fit-plot');
        if (!p1 || !p2 || !p3) {
            setTimeout(initializePlots, 100);
            return;
        }

        var d1 = generateData(); ppMeans = d1.means; ppErrors = d1.errors;
        var d2 = generateData(); psMeans = d2.means; psErrors = d2.errors;
        var d3 = generateData(); isMeans = d3.means; isErrors = d3.errors;

        // Set initial iterative state
        isParams = [parseFloat(document.getElementById('is-start-a').value),
                    parseFloat(document.getElementById('is-start-b').value),
                    parseFloat(document.getElementById('is-start-c').value)];
        isHistory = [{ a: isParams[0], b: isParams[1], c: isParams[2],
                       chi2: chi2_3param(isParams[0], isParams[1], isParams[2], isMeans, isErrors) }];

        plotPlayground();
        plotSweep();
        plotIterative();
        attachEventHandlers();
    }

    // Global functions
    window.newPlaygroundData = function() {
        var d = generateData(); ppMeans = d.means; ppErrors = d.errors;
        plotPlayground();
    };

    window.resetPlaygroundExplorer = function() {
        var ids = ['pp-a-slider', 'pp-b-slider', 'pp-c-slider'];
        var defs = [0, 0, 4.9];
        var disps = ['0.0', '0.0', '4.90'];
        for (var i = 0; i < ids.length; i++) {
            var sl = document.getElementById(ids[i]);
            if (sl) {
                sl.value = defs[i];
                var label = sl.closest('.control-group');
                if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = disps[i]; }
            }
        }
        var d = generateData(); ppMeans = d.means; ppErrors = d.errors;
        plotPlayground();
    };

    window.newSweepData = function() {
        var d = generateData(); psMeans = d.means; psErrors = d.errors;
        plotSweep();
    };

    window.resetSweepExplorer = function() {
        var psIds = ['ps-fixed-a', 'ps-fixed-b', 'ps-fixed-c'];
        var psDefs = [0, 0, 4.9];
        var psDisps = ['0.0', '0.0', '4.90'];
        for (var i = 0; i < psIds.length; i++) {
            var sl = document.getElementById(psIds[i]);
            if (sl) {
                sl.value = psDefs[i];
                var label = sl.closest('.control-group');
                if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = psDisps[i]; }
            }
        }
        var sel = document.getElementById('ps-param-select');
        if (sel) {
            sel.value = 'c';
            var label = sel.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = 'c (acceleration)'; }
        }
        var d = generateData(); psMeans = d.means; psErrors = d.errors;
        plotSweep();
    };

    window.stepCoordinateDescent = function() {
        doOneDescentRound();
        plotIterative();
    };

    window.autoRunDescent = function() {
        var maxRounds = 15;
        var round = 0;
        function tick() {
            if (round >= maxRounds) return;
            var c2 = doOneDescentRound();
            plotIterative();
            round++;
            if (isHistory.length > 1) {
                var prev = isHistory[isHistory.length - 2].chi2;
                if (Math.abs(c2 - prev) < 0.01) return;
            }
            setTimeout(tick, 400);
        }
        tick();
    };

    window.resetIterativeExplorer = function() {
        var ids = ['is-start-a', 'is-start-b', 'is-start-c'];
        var defs = [15, -5, 3];
        var disps = ['15.0', '-5.0', '3.00'];
        for (var i = 0; i < ids.length; i++) {
            var sl = document.getElementById(ids[i]);
            if (sl) {
                sl.value = defs[i];
                var label = sl.closest('.control-group');
                if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = disps[i]; }
            }
        }
        isParams = [15, -5, 3];
        var d = generateData(); isMeans = d.means; isErrors = d.errors;
        isHistory = [{ a: isParams[0], b: isParams[1], c: isParams[2],
                       chi2: chi2_3param(isParams[0], isParams[1], isParams[2], isMeans, isErrors) }];
        plotIterative();
    };

    // Auto-initialize
    initializePlots();
})();
