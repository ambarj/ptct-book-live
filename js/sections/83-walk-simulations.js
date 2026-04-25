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
    }

    initializePlots();
})();
