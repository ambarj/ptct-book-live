(function() {
    'use strict';

    var darkLayout = {
        template: 'plotly_dark',
        margin: { t: 30, r: 20, b: 45, l: 55 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    };

    function axStyle(range, title, type) {
        var ax = { gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080', title: title || '' };
        if (range) ax.range = range;
        if (type) ax.type = type;
        return ax;
    }

    // ln(N!) via log-gamma (Lanczos approximation)
    function logGamma(z) {
        if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
        z -= 1;
        var g = 7;
        var c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
            771.32342877765313, -176.61502916214059, 12.507343278686905,
            -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
        var x = c[0];
        for (var i = 1; i < g + 2; i++) x += c[i] / (z + i);
        var t = z + g + 0.5;
        return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
    }

    function logFact(n) {
        if (n < 2) return 0;
        return logGamma(n + 1);
    }

    function stirling(n) {
        if (n < 1) return 0;
        return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n);
    }

    function gauss(m, N) {
        return Math.exp(-m * m / (2 * N)) / Math.sqrt(2 * Math.PI * N);
    }

    function binomDensity(m, N) {
        var k = (m + N) / 2;
        if (k < 0 || k > N || k !== Math.floor(k)) return 0;
        var logP = logFact(N) - logFact(k) - logFact(N - k) - N * Math.LN2;
        return Math.exp(logP) / 2;
    }

    // ===============================================================
    // EXPLORER 1: Stirling Checker
    // ===============================================================
    function drawStirling() {
        var Nmax = parseInt(document.getElementById('sg-nmax-slider').value);
        var ns = [], exact = [], stirl = [], relErr = [];
        for (var n = 1; n <= Nmax; n++) {
            ns.push(n);
            var e = logFact(n);
            var s = stirling(n);
            exact.push(e);
            stirl.push(s);
            // |ln(exact) − ln(Stirling)| IS the fractional error of N! itself
            // (dividing by ln(N!) would give the error of the logarithm instead,
            // which never matches the 1/(12N) reference line)
            relErr.push(Math.abs(e - s) * 100);
        }

        Plotly.react('sg-factPlot', [
            { x: ns, y: exact, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2.5 }, name: 'exact ln(N!)' },
            { x: ns, y: stirl, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2, dash: 'dash' }, name: 'Stirling' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, Nmax + 2], 'N'),
            yaxis: axStyle(null, 'ln(N!)'),
            height: 400, legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } },
            title: { text: 'ln(N!) vs Stirling', font: { color: '#aaa', size: 12 } }
        }), { responsive: true });

        // 1/(12N) reference
        var ref = ns.map(function(n) { return 100 / (12 * n); });

        Plotly.react('sg-errPlot', [
            { x: ns, y: relErr, type: 'scatter', mode: 'lines+markers',
              marker: { color: '#00f3ff', size: 4 }, line: { color: '#00f3ff', width: 1.5 },
              name: 'measured error' },
            { x: ns, y: ref, type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 2, dash: 'dash' }, name: '1/(12N) × 100' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, Nmax + 2], 'N'),
            yaxis: axStyle(null, 'relative error (%)'),
            height: 400, legend: { x: 0.6, y: 0.98, font: { color: '#aaa', size: 10 } },
            title: { text: 'Relative error vs 1/(12N)', font: { color: '#aaa', size: 12 } }
        }), { responsive: true });

        var n10err = relErr.length >= 10 ? relErr[9].toFixed(3) : '—';
        document.getElementById('sg-stats1').innerHTML =
            '<span><strong>N max = ' + Nmax + '</strong></span>' +
            '<span>error @ N=10: ' + n10err + '%  |  error @ N=' + Nmax + ': ' + relErr[relErr.length - 1].toFixed(4) + '%</span>';
    }

    window.sgFactReset = function() {
        document.getElementById('sg-nmax-slider').value = 50;
        document.getElementById('sg-nmax-value').textContent = '50';
        drawStirling();
    };

    // ===============================================================
    // EXPLORER 2: Binomial → Gaussian Morpher
    // ===============================================================
    function drawMorph() {
        var N = parseInt(document.getElementById('sg-morph-n-slider').value);
        var centers = [], bY = [];
        for (var m = -N; m <= N; m += 2) {
            centers.push(m);
            bY.push(binomDensity(m, N));
        }

        var gX = [], gY = [];
        var range = 3.5 * Math.sqrt(N);
        for (var i = -200; i <= 200; i++) {
            var x = i * range / 200;
            gX.push(x); gY.push(gauss(x, N));
        }

        var yMax = gauss(0, N) * 1.3;

        Plotly.react('sg-morphPlot', [
            { x: centers, y: bY, type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: Math.max(3, 8 - N / 30) }, name: 'binomial (exact)' },
            { x: gX, y: gY, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2.5 }, name: 'Gaussian approx' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-range, range], 'm'),
            yaxis: axStyle([0, yMax], 'P(m) density'),
            height: 440,
            legend: { x: 0.72, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        var maxErr = 0;
        for (var j = 0; j < centers.length; j++) {
            var d = Math.abs(bY[j] - gauss(centers[j], N));
            if (d > maxErr) maxErr = d;
        }

        document.getElementById('sg-stats2').innerHTML =
            '<span><strong>N = ' + N + '</strong></span>' +
            '<span>peak = ' + gauss(0, N).toFixed(5) + '  |  σ = √N = ' + Math.sqrt(N).toFixed(2) + '</span>' +
            '<span>max |error| = ' + maxErr.toExponential(2) + '</span>';
    }

    window.sgMorphReset = function() {
        document.getElementById('sg-morph-n-slider').value = 10;
        document.getElementById('sg-morph-n-value').textContent = '10';
        drawMorph();
    };

    // ===============================================================
    // EXPLORER 3: Approximation Quality vs N
    // ===============================================================
    var qualData = { Ns: [], errs: [] };

    function computeQualityData() {
        qualData.Ns = []; qualData.errs = [];
        for (var N = 4; N <= 200; N += 2) {
            qualData.Ns.push(N);
            var maxE = 0;
            for (var m = -N; m <= N; m += 2) {
                var d = Math.abs(binomDensity(m, N) - gauss(m, N));
                if (d > maxE) maxE = d;
            }
            qualData.errs.push(maxE);
        }
    }

    function drawQuality() {
        var N = parseInt(document.getElementById('sg-qual-n-slider').value);

        // Left: current N overlay
        var centers = [], bY = [], gY2 = [];
        for (var m = -N; m <= N; m += 2) {
            centers.push(m);
            bY.push(binomDensity(m, N));
            gY2.push(gauss(m, N));
        }
        var range = 3.5 * Math.sqrt(N);
        var yMax = gauss(0, N) * 1.3;

        Plotly.react('sg-qualPlot', [
            { x: centers, y: bY, type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: Math.max(3, 7 - N / 40) }, name: 'binomial' },
            { x: centers, y: gY2, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2 }, name: 'Gaussian' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-range, range], 'm'),
            yaxis: axStyle([0, yMax], 'P(m)'),
            height: 400,
            title: { text: 'N = ' + N, font: { color: '#aaa', size: 12 } },
            legend: { x: 0.72, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // Right: scaling plot with marker at current N
        var refLine = qualData.Ns.map(function(n) {
            return qualData.errs[0] * (qualData.Ns[0] / n);
        });

        // Find current N in data
        var idx = (N - 4) / 2;
        var curErr = idx >= 0 && idx < qualData.errs.length ? qualData.errs[idx] : null;

        var traces = [
            { x: qualData.Ns, y: qualData.errs, type: 'scatter', mode: 'lines+markers',
              marker: { color: '#00f3ff', size: 4 }, line: { color: '#00f3ff', width: 1.5 },
              name: 'max |error|' },
            { x: qualData.Ns, y: refLine, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2, dash: 'dash' }, name: '1/N reference' }
        ];
        if (curErr !== null) {
            traces.push({ x: [N], y: [curErr], type: 'scatter', mode: 'markers',
                marker: { color: '#ffbe0b', size: 14, symbol: 'star' }, name: 'N = ' + N, showlegend: false });
        }

        Plotly.react('sg-scalePlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'N', 'log'),
            yaxis: axStyle(null, 'max |P_binom − P_Gauss|', 'log'),
            height: 400,
            title: { text: 'Convergence (slope ≈ −1)', font: { color: '#aaa', size: 12 } },
            legend: { x: 0.02, y: 0.02, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        var peakPct = curErr !== null ? (curErr / gauss(0, N) * 100).toFixed(2) : '—';
        document.getElementById('sg-stats3').innerHTML =
            '<span><strong>N = ' + N + '</strong></span>' +
            '<span>max |error| = ' + (curErr !== null ? curErr.toExponential(2) : '—') +
            '  (' + peakPct + '% of peak)</span>';
    }

    window.sgQualReset = function() {
        document.getElementById('sg-qual-n-slider').value = 20;
        document.getElementById('sg-qual-n-value').textContent = '20';
        drawQuality();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('sg-factPlot')) { setTimeout(initializePlots, 100); return; }

        // Explorer 1
        drawStirling();
        document.getElementById('sg-nmax-slider').addEventListener('input', function() {
            document.getElementById('sg-nmax-value').textContent = this.value;
            drawStirling();
        });

        // Explorer 2
        drawMorph();
        document.getElementById('sg-morph-n-slider').addEventListener('input', function() {
            document.getElementById('sg-morph-n-value').textContent = this.value;
            drawMorph();
        });

        // Explorer 3 — precompute scaling data
        computeQualityData();
        drawQuality();
        document.getElementById('sg-qual-n-slider').addEventListener('input', function() {
            document.getElementById('sg-qual-n-value').textContent = this.value;
            drawQuality();
        });
    }

    initializePlots();
})();
