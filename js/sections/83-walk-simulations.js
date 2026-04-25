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

    // Standard normal cdf via erf approx — good enough for overlay
    function gauss(m, N) {
        return Math.exp(-m * m / (2 * N)) / Math.sqrt(2 * Math.PI * N);
    }

    // log(n!) via Lanczos/Stirling for moderate N (avoid overflow)
    function logFact(n) {
        if (n < 2) return 0;
        // Stirling with correction
        return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n) + 1 / (12 * n);
    }

    // Exact binomial P(m) with N ±1 steps: m = 2k - N, k = (m+N)/2
    // P(m)/2 so it is a density on integer bins of width 2
    function binomDensity(m, N) {
        var k = (m + N) / 2;
        if (k < 0 || k > N || k !== Math.floor(k)) return 0;
        var logP = logFact(N) - logFact(k) - logFact(N - k) - N * Math.log(2);
        return Math.exp(logP) / 2; // density on bin width 2
    }

    // Simulate Nw walks of N ±1 steps; return array of final positions
    function simulate(Nw, N) {
        var out = new Array(Nw);
        for (var w = 0; w < Nw; w++) {
            var m = 0;
            for (var s = 0; s < N; s++) m += (Math.random() < 0.5 ? -1 : 1);
            out[w] = m;
        }
        return out;
    }

    // ===============================================================
    // EXPLORER 1: Ensemble histogram
    // ===============================================================
    function drawHistogram(walks, N) {
        var Nw = walks.length;
        // Bins at even integers -N..N (step 2)
        var centers = [], counts = [];
        for (var m = -N; m <= N; m += 2) { centers.push(m); counts.push(0); }
        for (var i = 0; i < Nw; i++) {
            var idx = (walks[i] + N) / 2;
            if (idx >= 0 && idx < counts.length) counts[idx]++;
        }
        var dens = counts.map(function(c) { return c / (Nw * 2); });

        var binY = centers.map(function(m) { return binomDensity(m, N); });
        var gaussX = [], gaussY = [];
        for (var gi = -N; gi <= N; gi += 0.5) { gaussX.push(gi); gaussY.push(gauss(gi, N)); }

        var sum = 0, sq = 0;
        for (var k = 0; k < Nw; k++) { sum += walks[k]; sq += walks[k] * walks[k]; }
        var mean = sum / Nw, m2 = sq / Nw, sigma = Math.sqrt(m2 - mean * mean);

        var xRange = 4 * Math.sqrt(N);
        var yMax = gauss(0, N) * 1.4;

        Plotly.react('ws-histPlot', [
            { x: centers, y: dens, type: 'bar', name: 'simulation',
              marker: { color: '#00f3ff', opacity: 0.55 }, hoverinfo: 'x+y' },
            { x: centers, y: binY, type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 6 }, name: 'binomial (exact)' },
            { x: gaussX, y: gaussY, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2 }, name: 'Gaussian' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-xRange, xRange], 'm (final position)'),
            yaxis: axStyle([0, yMax], 'P(m)'),
            height: 440, bargap: 0.05,
            legend: { x: 0.72, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('ws-stats1').innerHTML =
            '<span><strong>' + Nw + ' walkers, N = ' + N + '</strong></span>' +
            '<span>measured: ⟨m⟩ = ' + mean.toFixed(2) + ', σ = ' + sigma.toFixed(2) + '</span>' +
            '<span>theory: ⟨m⟩ = 0, σ = √N = ' + Math.sqrt(N).toFixed(2) + '</span>';
    }

    function emptyHist() {
        Plotly.react('ws-histPlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'm'), yaxis: axStyle(null, 'P(m)'), height: 440,
            annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run Simulation"',
                font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
        }), { responsive: true });
        document.getElementById('ws-stats1').innerHTML = '';
    }

    window.wsHistRun = function() {
        var Nw = parseInt(document.getElementById('ws-nw-slider').value);
        var N = parseInt(document.getElementById('ws-ns-slider').value);
        drawHistogram(simulate(Nw, N), N);
    };

    window.wsHistReset = function() {
        document.getElementById('ws-nw-slider').value = 2000;
        document.getElementById('ws-ns-slider').value = 100;
        document.getElementById('ws-nw-value').textContent = '2000';
        document.getElementById('ws-ns-value').textContent = '100';
        emptyHist();
    };

    // ===============================================================
    // EXPLORER 2: Moment sweep
    // ===============================================================
    function runMomentSweep(NwPer) {
        var Ns = [];
        for (var N = 20; N <= 300; N += 20) Ns.push(N);
        var means = [], m2s = [], errMean = [];
        for (var k = 0; k < Ns.length; k++) {
            var walks = simulate(NwPer, Ns[k]);
            var s = 0, sq = 0;
            for (var i = 0; i < NwPer; i++) { s += walks[i]; sq += walks[i] * walks[i]; }
            means.push(s / NwPer);
            m2s.push(sq / NwPer);
            errMean.push(Math.sqrt(Ns[k] / NwPer));
        }

        var theoryM2 = Ns.slice();
        Plotly.react('ws-meanPlot', [
            { x: Ns, y: means, type: 'scatter', mode: 'markers',
              marker: { color: '#00f3ff', size: 8 }, name: 'measured ⟨m⟩',
              error_y: { type: 'data', array: errMean, color: '#00f3ff', thickness: 1.2, width: 3 } },
            { x: Ns, y: Ns.map(function() { return 0; }), type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2 }, name: 'theory 0' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 320], 'Steps N'),
            yaxis: axStyle([-4 * Math.sqrt(300 / NwPer), 4 * Math.sqrt(300 / NwPer)], '⟨m⟩'),
            height: 400, legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } },
            title: { text: 'Measured mean vs theory', font: { color: '#aaa', size: 12 } }
        }), { responsive: true });

        Plotly.react('ws-varPlot', [
            { x: Ns, y: m2s, type: 'scatter', mode: 'markers',
              marker: { color: '#00f3ff', size: 8 }, name: 'measured ⟨m²⟩' },
            { x: Ns, y: theoryM2, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2 }, name: 'theory N' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 320], 'Steps N'),
            yaxis: axStyle([0, 360], '⟨m²⟩'),
            height: 400, legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } },
            title: { text: '⟨m²⟩ vs N (slope = 1)', font: { color: '#aaa', size: 12 } }
        }), { responsive: true });

        // Fit slope of m2 vs N (through origin)
        var num = 0, den = 0;
        for (var j = 0; j < Ns.length; j++) { num += Ns[j] * m2s[j]; den += Ns[j] * Ns[j]; }
        var slope = num / den;

        document.getElementById('ws-stats2').innerHTML =
            '<span><strong>' + NwPer + ' walkers per N</strong></span>' +
            '<span>fitted slope of ⟨m²⟩ vs N: ' + slope.toFixed(3) + '  (theory 1.000)</span>';
    }

    function emptyMoments() {
        var base = Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
            annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run Sweep"',
                font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
        });
        Plotly.react('ws-meanPlot', [], base, { responsive: true });
        Plotly.react('ws-varPlot', [], base, { responsive: true });
        document.getElementById('ws-stats2').innerHTML = '';
    }

    window.wsMomRun = function() {
        runMomentSweep(parseInt(document.getElementById('ws-nw2-slider').value));
    };

    window.wsMomReset = function() {
        document.getElementById('ws-nw2-slider').value = 500;
        document.getElementById('ws-nw2-value').textContent = '500';
        emptyMoments();
    };

    // ===============================================================
    // EXPLORER 3: Convergence
    // ===============================================================
    function runConvergence(N) {
        var Nws = [];
        for (var e = 1.5; e <= 4.5; e += 0.25) Nws.push(Math.round(Math.pow(10, e)));

        // Theoretical gauss at bin centers
        var centers = [];
        for (var m = -N; m <= N; m += 2) centers.push(m);
        var theory = centers.map(function(m) { return gauss(m, N); });

        var errs = [];
        for (var k = 0; k < Nws.length; k++) {
            var Nw = Nws[k];
            var walks = simulate(Nw, N);
            var counts = centers.map(function() { return 0; });
            for (var i = 0; i < Nw; i++) {
                var idx = (walks[i] + N) / 2;
                if (idx >= 0 && idx < counts.length) counts[idx]++;
            }
            var se = 0;
            for (var j = 0; j < centers.length; j++) {
                var d = counts[j] / (Nw * 2) - theory[j];
                se += d * d;
            }
            errs.push(Math.sqrt(se / centers.length));
        }

        // Final histogram panel (last run with biggest Nw)
        var bigNw = Nws[Nws.length - 1];
        var finalWalks = simulate(bigNw, N);
        var fc = centers.map(function() { return 0; });
        for (var i = 0; i < bigNw; i++) {
            var idx = (finalWalks[i] + N) / 2;
            if (idx >= 0 && idx < fc.length) fc[idx]++;
        }
        var fDens = fc.map(function(c) { return c / (bigNw * 2); });
        var xRange = 4 * Math.sqrt(N);

        Plotly.react('ws-convHist', [
            { x: centers, y: fDens, type: 'bar', name: 'final histogram',
              marker: { color: '#00f3ff', opacity: 0.55 } },
            { x: centers, y: theory, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2 }, name: 'Gaussian' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-xRange, xRange], 'm'),
            yaxis: axStyle([0, gauss(0, N) * 1.4], 'P(m)'),
            height: 400, bargap: 0.05,
            title: { text: 'Nw = ' + bigNw, font: { color: '#aaa', size: 12 } },
            legend: { x: 0.72, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // Reference 1/√Nw line anchored at first point
        var ref = Nws.map(function(nw) { return errs[0] * Math.sqrt(Nws[0] / nw); });

        Plotly.react('ws-convErr', [
            { x: Nws, y: errs, type: 'scatter', mode: 'markers+lines',
              marker: { color: '#00f3ff', size: 8 }, line: { color: '#00f3ff', width: 1.5 },
              name: 'RMS error' },
            { x: Nws, y: ref, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2, dash: 'dash' }, name: '1/√Nw reference' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Walkers Nw', 'log'),
            yaxis: axStyle(null, 'RMS error', 'log'),
            height: 400,
            title: { text: 'log–log convergence (slope ≈ −1/2)', font: { color: '#aaa', size: 12 } },
            legend: { x: 0.02, y: 0.02, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('ws-stats3').innerHTML =
            '<span><strong>N = ' + N + '</strong></span>' +
            '<span>error @ Nw=' + Nws[0] + ': ' + errs[0].toExponential(2) +
            '  |  error @ Nw=' + Nws[Nws.length - 1] + ': ' + errs[errs.length - 1].toExponential(2) + '</span>';
    }

    function emptyConvergence() {
        var base = Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
            annotations: [{ x: 0.5, y: 0.5, text: 'Click "Build up"',
                font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
        });
        Plotly.react('ws-convHist', [], base, { responsive: true });
        Plotly.react('ws-convErr', [], base, { responsive: true });
        document.getElementById('ws-stats3').innerHTML = '';
    }

    window.wsConvRun = function() {
        runConvergence(parseInt(document.getElementById('ws-conv-ns-slider').value));
    };

    window.wsConvReset = function() {
        document.getElementById('ws-conv-ns-slider').value = 100;
        document.getElementById('ws-conv-ns-value').textContent = '100';
        emptyConvergence();
    };

    // ===============================================================
    // EXPLORER 4: Biased Random Walk
    // ===============================================================
    function simulateBiased(Nw, N, p) {
        var out = new Array(Nw);
        for (var w = 0; w < Nw; w++) {
            var m = 0;
            for (var s = 0; s < N; s++) m += (Math.random() < p ? 1 : -1);
            out[w] = m;
        }
        return out;
    }

    function runBiased(Nw, N, p) {
        var walks = simulateBiased(Nw, N, p);
        var sum = 0, sq = 0;
        var minM = walks[0], maxM = walks[0];
        for (var i = 0; i < Nw; i++) {
            sum += walks[i]; sq += walks[i] * walks[i];
            if (walks[i] < minM) minM = walks[i];
            if (walks[i] > maxM) maxM = walks[i];
        }
        var mean = sum / Nw, m2 = sq / Nw;
        var meanTh = N * (2 * p - 1);
        var m2Th = N + N * (N - 1) * (2 * p - 1) * (2 * p - 1);
        var varTh = N * 4 * p * (1 - p);

        // Histogram in bins of width 2 (positions have same parity as N)
        var binWidth = Math.max(2, Math.round((maxM - minM) / 40 / 2) * 2);
        var lo = Math.floor(minM / binWidth) * binWidth;
        var hi = Math.ceil(maxM / binWidth) * binWidth;
        var nbins = (hi - lo) / binWidth + 1;
        var counts = new Array(nbins).fill(0);
        var centers = [];
        for (var b = 0; b < nbins; b++) centers.push(lo + b * binWidth);
        for (var j = 0; j < Nw; j++) {
            var idx = Math.round((walks[j] - lo) / binWidth);
            if (idx >= 0 && idx < nbins) counts[idx]++;
        }

        // Gaussian theory overlay (approximating binomial as Gaussian)
        var gX = [], gY = [];
        var sigma = Math.sqrt(varTh);
        var totalArea = Nw * binWidth;
        for (var k = -200; k <= 200; k++) {
            var x = meanTh + k * 4 * sigma / 200;
            gX.push(x);
            gY.push(totalArea * Math.exp(-(x - meanTh) * (x - meanTh) / (2 * varTh)) / Math.sqrt(2 * Math.PI * varTh));
        }

        Plotly.react('ws-biasHist', [
            { x: centers, y: counts, type: 'bar',
              marker: { color: '#00f3ff', opacity: 0.6 }, name: 'simulation' },
            { x: gX, y: gY, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2 }, name: 'Gaussian theory' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([lo - binWidth, hi + binWidth], 'm (final position)'),
            yaxis: axStyle(null, 'count'),
            shapes: [{ type: 'line', x0: meanTh, x1: meanTh, y0: 0, y1: Math.max.apply(null, counts) * 1.1,
                line: { color: '#ffbe0b', width: 2, dash: 'dash' } }],
            annotations: [{ x: meanTh, y: Math.max.apply(null, counts) * 1.1, text: '⟨m⟩ theory',
                font: { color: '#ffbe0b', size: 11 }, showarrow: false, yshift: 10 }],
            height: 400, bargap: 0.05,
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } },
            title: { text: 'Histogram (p = ' + p.toFixed(2) + ', N = ' + N + ')', font: { color: '#aaa', size: 12 } }
        }), { responsive: true });

        // Moment comparison: ⟨m²⟩ vs N curve
        var Ns = [];
        for (var nn = 20; nn <= 800; nn += 40) Ns.push(nn);
        var diffusive = Ns.map(function(n) { return n; });
        var ballistic = Ns.map(function(n) { return n + n * (n - 1) * (2 * p - 1) * (2 * p - 1); });

        Plotly.react('ws-biasMoments', [
            { x: Ns, y: diffusive, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2, dash: 'dot' }, name: 'unbiased: N' },
            { x: Ns, y: ballistic, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2 }, name: 'biased: N + N(N−1)(2p−1)²' },
            { x: [N], y: [m2], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 14, symbol: 'star' }, name: 'measured @ N' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 820], 'N'),
            yaxis: axStyle(null, '⟨m²⟩', 'log'),
            height: 400,
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } },
            title: { text: '⟨m²⟩ vs N: ballistic vs diffusive', font: { color: '#aaa', size: 12 } }
        }), { responsive: true });

        document.getElementById('ws-stats4').innerHTML =
            '<span><strong>p = ' + p.toFixed(2) + ', N = ' + N + ', ' + Nw + ' walkers</strong></span>' +
            '<span>⟨m⟩: meas ' + mean.toFixed(2) + ' / theory ' + meanTh.toFixed(2) + '</span>' +
            '<span>⟨m²⟩: meas ' + m2.toFixed(0) + ' / theory ' + m2Th.toFixed(0) + '</span>';
    }

    function emptyBias() {
        var base = Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
            annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run"',
                font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
        });
        Plotly.react('ws-biasHist', [], base, { responsive: true });
        Plotly.react('ws-biasMoments', [], base, { responsive: true });
        document.getElementById('ws-stats4').innerHTML = '';
    }

    window.wsBiasRun = function() {
        var p = parseFloat(document.getElementById('ws-bias-p-slider').value);
        var N = parseInt(document.getElementById('ws-bias-n-slider').value);
        runBiased(2000, N, p);
    };

    window.wsBiasReset = function() {
        document.getElementById('ws-bias-p-slider').value = 0.55;
        document.getElementById('ws-bias-n-slider').value = 200;
        document.getElementById('ws-bias-p-value').textContent = '0.55';
        document.getElementById('ws-bias-n-value').textContent = '200';
        emptyBias();
    };

    // ===============================================================
    // EXPLORER 5: First-Passage Time
    // ===============================================================
    function firstReturn(cap) {
        var pos = 0;
        for (var t = 1; t <= cap; t++) {
            pos += (Math.random() < 0.5 ? -1 : 1);
            if (pos === 0) return t;
        }
        return -1; // didn't return within cap
    }

    function runFPT(Nw, cap) {
        var taus = [];
        var nReturned = 0;
        for (var w = 0; w < Nw; w++) {
            var t = firstReturn(cap);
            if (t > 0) { taus.push(t); nReturned++; }
        }

        if (taus.length < 5) {
            document.getElementById('ws-stats5').innerHTML = '<span>Too few returns — increase walkers or cap</span>';
            return;
        }

        // Sort to compute median and running mean over sorted-by-trial order
        var sumT = 0;
        for (var i = 0; i < taus.length; i++) sumT += taus[i];
        var meanT = sumT / taus.length;
        var sorted = taus.slice().sort(function(a, b) { return a - b; });
        var medianT = sorted[Math.floor(sorted.length / 2)];
        var maxT = sorted[sorted.length - 1];

        // Log-spaced histogram
        var nbins = 25;
        var logMin = 0, logMax = Math.log10(maxT);
        var edges = [];
        for (var e = 0; e <= nbins; e++) edges.push(Math.pow(10, logMin + e * (logMax - logMin) / nbins));
        var counts = new Array(nbins).fill(0);
        for (var j = 0; j < taus.length; j++) {
            for (var b = 0; b < nbins; b++) {
                if (taus[j] >= edges[b] && taus[j] < edges[b + 1]) { counts[b]++; break; }
            }
        }
        var centers = [], dens = [];
        for (var b2 = 0; b2 < nbins; b2++) {
            var c = Math.sqrt(edges[b2] * edges[b2 + 1]);
            var w = edges[b2 + 1] - edges[b2];
            centers.push(c);
            dens.push(counts[b2] / (taus.length * w));
        }

        // τ^(-3/2) reference, anchored to median region
        var ref = centers.map(function(c) {
            return 0.4 * Math.pow(c, -1.5);
        });

        Plotly.react('ws-fptHist', [
            { x: centers, y: dens, type: 'scatter', mode: 'markers',
              marker: { color: '#00f3ff', size: 6 }, name: 'P(τ) sim' },
            { x: centers, y: ref, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2, dash: 'dash' }, name: 'τ^(−3/2)' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'return time τ', 'log'),
            yaxis: axStyle(null, 'P(τ)', 'log'),
            height: 400,
            title: { text: 'Heavy power-law tail', font: { color: '#aaa', size: 12 } },
            legend: { x: 0.02, y: 0.02, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // Running mean as walkers accumulate (in order generated)
        var trial = [], runMean = [];
        var s = 0;
        for (var k = 0; k < taus.length; k++) {
            s += taus[k];
            if (k % 5 === 0 || k === taus.length - 1) {
                trial.push(k + 1);
                runMean.push(s / (k + 1));
            }
        }

        Plotly.react('ws-fptMean', [
            { x: trial, y: runMean, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2 }, name: 'running mean ⟨τ⟩' },
            { x: trial, y: trial.map(function() { return medianT; }), type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 1.5, dash: 'dot' }, name: 'median (finite)' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, taus.length + 10], 'walkers accumulated'),
            yaxis: axStyle(null, 'mean / median τ'),
            height: 400,
            title: { text: 'Mean climbs (diverges); median is finite', font: { color: '#aaa', size: 12 } },
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('ws-stats5').innerHTML =
            '<span><strong>' + Nw + ' walkers, cap = ' + cap + '</strong></span>' +
            '<span>return rate: ' + (nReturned / Nw).toFixed(3) + '  (Pólya: 1.0)</span>' +
            '<span>median τ = ' + medianT + '  |  measured mean τ = ' + meanT.toFixed(0) + ' (depends on cap)</span>';
    }

    function emptyFPT() {
        var base = Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
            annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run"',
                font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
        });
        Plotly.react('ws-fptHist', [], base, { responsive: true });
        Plotly.react('ws-fptMean', [], base, { responsive: true });
        document.getElementById('ws-stats5').innerHTML = '';
    }

    window.wsFptRun = function() {
        var Nw = parseInt(document.getElementById('ws-fpt-nw-slider').value);
        var cap = parseInt(document.getElementById('ws-fpt-cap-slider').value);
        runFPT(Nw, cap);
    };

    window.wsFptReset = function() {
        document.getElementById('ws-fpt-nw-slider').value = 2000;
        document.getElementById('ws-fpt-cap-slider').value = 10000;
        document.getElementById('ws-fpt-nw-value').textContent = '2000';
        document.getElementById('ws-fpt-cap-value').textContent = '10000';
        emptyFPT();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('ws-histPlot')) { setTimeout(initializePlots, 100); return; }

        // Explorer 1
        emptyHist();
        document.getElementById('ws-nw-slider').addEventListener('input', function() {
            document.getElementById('ws-nw-value').textContent = this.value;
        });
        document.getElementById('ws-ns-slider').addEventListener('input', function() {
            document.getElementById('ws-ns-value').textContent = this.value;
        });

        // Explorer 2
        emptyMoments();
        document.getElementById('ws-nw2-slider').addEventListener('input', function() {
            document.getElementById('ws-nw2-value').textContent = this.value;
        });

        // Explorer 3
        emptyConvergence();
        document.getElementById('ws-conv-ns-slider').addEventListener('input', function() {
            document.getElementById('ws-conv-ns-value').textContent = this.value;
        });

        // Explorer 4 (biased)
        emptyBias();
        document.getElementById('ws-bias-p-slider').addEventListener('input', function() {
            document.getElementById('ws-bias-p-value').textContent = parseFloat(this.value).toFixed(2);
        });
        document.getElementById('ws-bias-n-slider').addEventListener('input', function() {
            document.getElementById('ws-bias-n-value').textContent = this.value;
        });

        // Explorer 5 (FPT)
        emptyFPT();
        document.getElementById('ws-fpt-nw-slider').addEventListener('input', function() {
            document.getElementById('ws-fpt-nw-value').textContent = this.value;
        });
        document.getElementById('ws-fpt-cap-slider').addEventListener('input', function() {
            document.getElementById('ws-fpt-cap-value').textContent = this.value;
        });
    }

    initializePlots();
})();
