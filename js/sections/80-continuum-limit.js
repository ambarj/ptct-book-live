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

    function logBinom(n, k) {
        if (k < 0 || k > n) return -Infinity;
        if (k === 0 || k === n) return 0;
        var r = 0;
        for (var i = 0; i < k; i++) r += Math.log(n - i) - Math.log(i + 1);
        return r;
    }

    // ===============================================================
    // EXPLORER 1: Discrete to Continuous
    // ===============================================================
    function drawConverge() {
        var level = parseInt(document.getElementById('cl-refine-slider').value);
        var T = parseFloat(document.getElementById('cl-T-slider').value);
        var D = 1.0;

        // Gaussian limit
        var gx = [], gy = [];
        for (var i = 0; i <= 300; i++) {
            var x = -5 + i * 10 / 300;
            gx.push(x);
            gy.push(Math.exp(-x * x / (4 * D * T)) / Math.sqrt(4 * Math.PI * D * T));
        }

        var traces = [];
        var refLevels = [1, 2, 4, 8, 16, 32];
        var refColors = ['#ff006e', '#ff5722', '#ffbe0b', '#00ff88', '#00f3ff', '#bb86fc'];

        // Show current and all previous levels
        for (var li = 0; li <= Math.min(level - 1, refLevels.length - 1); li++) {
            var ref = refLevels[li];
            var a = 1.0 / ref;
            var tau = a * a / (2 * D);
            var N = Math.round(T / tau);
            if (N > 5000) continue; // skip too large

            var mVals = [], probs = [], xVals = [];
            for (var nR = 0; nR <= N; nR++) {
                var m = 2 * nR - N;
                var logP = logBinom(N, nR) - N * Math.log(2);
                var prob = Math.exp(logP);
                if (prob > 1e-10) {
                    mVals.push(m);
                    probs.push(prob / (2 * a)); // density
                    xVals.push(m * a);
                }
            }

            var opacity = li === level - 1 ? 0.7 : 0.2;
            traces.push({
                x: xVals, y: probs, type: 'bar', marker: { color: refColors[li] },
                opacity: opacity, width: 1.5 * a,
                name: 'a=' + a.toFixed(2) + ' (N=' + N + ')'
            });
        }

        traces.push({
            x: gx, y: gy, type: 'scatter', mode: 'lines',
            line: { color: 'white', width: 3, dash: 'dash' }, name: 'Gaussian limit'
        });

        Plotly.react('cl-convergePlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle([-5, 5], 'Position x'),
            yaxis: axStyle([0, Math.max.apply(null, gy) * 1.3], 'P(x, T)'),
            height: 420, barmode: 'overlay',
            legend: { x: 0.6, y: 0.98, font: { color: '#aaa', size: 9 } }
        }), { responsive: true });

        var a = 1.0 / refLevels[Math.min(level - 1, refLevels.length - 1)];
        var N = Math.round(T / (a * a / (2 * D)));
        document.getElementById('cl-stats1').innerHTML =
            '<span><strong>Level ' + level + ': a = ' + a.toFixed(3) + ', N = ' + N + ', D = ' + D.toFixed(1) + '</strong></span>' +
            '<span>σ = √(2DT) = ' + Math.sqrt(2 * D * T).toFixed(2) + ' (same at all levels)</span>';
    }

    window.clConvergeReset = function() {
        document.getElementById('cl-refine-slider').value = 1;
        document.getElementById('cl-T-slider').value = 1;
        document.getElementById('cl-refine-value').textContent = '1';
        document.getElementById('cl-T-value').textContent = '1.0';
        drawConverge();
    };

    // ===============================================================
    // EXPLORER 2: Parameter Explorer
    // ===============================================================
    function drawParams() {
        var a = parseFloat(document.getElementById('cl-a-slider').value);
        var tau = parseFloat(document.getElementById('cl-tau-slider').value);
        var D = a * a / (2 * tau);
        var T = 1.0;
        var N = Math.round(T / tau);

        // Discrete walk simulation
        var nW = 500, finals = [];
        for (var w = 0; w < nW; w++) {
            var x = 0;
            for (var s = 0; s < N; s++) x += Math.random() < 0.5 ? a : -a;
            finals.push(x);
        }

        Plotly.react('cl-paramPlot', [
            { x: finals, type: 'histogram', marker: { color: '#00f3ff' }, opacity: 0.7,
              nbinsx: 30, name: 'Walk histogram' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-5, 5], 'Position x'), yaxis: axStyle(null, 'Count'),
            height: 400
        }), { responsive: true });

        // Gaussian
        var gx = [], gy = [];
        var sigma = Math.sqrt(2 * D * T);
        for (var i = 0; i <= 200; i++) {
            var x = -5 + i * 10 / 200;
            gx.push(x);
            gy.push(nW * (10 / 30) * Math.exp(-x * x / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI)));
        }

        Plotly.react('cl-gaussPlot', [
            { x: gx, y: gy, type: 'scatter', mode: 'lines',
              line: { color: 'white', width: 2.5, dash: 'dash' }, name: 'Gaussian (D=' + D.toFixed(2) + ')' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-5, 5], 'Position x'), yaxis: axStyle(null, 'Density (scaled)'),
            height: 400
        }), { responsive: true });

        document.getElementById('cl-stats2').innerHTML =
            '<span><strong>a = ' + a.toFixed(2) + ', τ = ' + tau.toFixed(3) + '</strong></span>' +
            '<span>D = a²/(2τ) = ' + D.toFixed(3) + '  |  N = T/τ = ' + N + '  |  σ = √(2DT) = ' + sigma.toFixed(2) + '</span>';
    }

    window.clParamReset = function() {
        document.getElementById('cl-a-slider').value = 0.5;
        document.getElementById('cl-tau-slider').value = 0.125;
        document.getElementById('cl-a-value').textContent = '0.50';
        document.getElementById('cl-tau-value').textContent = '0.125';
        drawParams();
    };

    // ===============================================================
    // EXPLORER 3: Diffusion Constant
    // ===============================================================
    function drawDiffusion() {
        var D = parseFloat(document.getElementById('cl-D-slider').value);

        // Gaussian at several times
        var times = [0.2, 0.5, 1.0, 2.0];
        var tColors = ['#ff006e', '#ffbe0b', '#00f3ff', '#00ff88'];
        var traces = [];

        for (var ti = 0; ti < times.length; ti++) {
            var t = times[ti];
            var gx = [], gy = [];
            for (var i = 0; i <= 200; i++) {
                var x = -6 + i * 12 / 200;
                gx.push(x);
                gy.push(Math.exp(-x * x / (4 * D * t)) / Math.sqrt(4 * Math.PI * D * t));
            }
            traces.push({ x: gx, y: gy, type: 'scatter', mode: 'lines',
                line: { color: tColors[ti], width: 2 }, name: 't = ' + t });
        }

        Plotly.react('cl-spreadPlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle([-6, 6], 'Position x'),
            yaxis: axStyle([0, 1.2], 'P(x, t)'),
            height: 400, legend: { x: 0.7, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // D comparison bar
        var Ds = [0.5, 1, 2, 5];
        var sigmas = Ds.map(function(d) { return Math.sqrt(2 * d * 1); });

        Plotly.react('cl-dBarPlot', [
            { x: Ds.map(function(d) { return 'D=' + d; }), y: sigmas, type: 'bar',
              marker: { color: ['#ff006e', '#ffbe0b', '#00f3ff', '#00ff88'] },
              name: 'σ at t=1' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Diffusion constant'),
            yaxis: axStyle([0, 4], 'Width σ = √(2Dt) at t=1'),
            height: 400,
            annotations: [{ x: 'D=' + D, y: Math.sqrt(2 * D), text: 'Current',
                font: { color: '#ffbe0b', size: 12 }, showarrow: true, arrowcolor: '#ffbe0b' }]
        }), { responsive: true });

        document.getElementById('cl-stats3').innerHTML =
            '<span><strong>D = ' + D.toFixed(1) + '</strong></span>' +
            '<span>At t = 1: σ = √(2D) = ' + Math.sqrt(2 * D).toFixed(2) +
            '  |  At t = 4: σ = √(8D) = ' + Math.sqrt(8 * D).toFixed(2) + '</span>';
    }

    window.clDiffReset = function() {
        document.getElementById('cl-D-slider').value = 1;
        document.getElementById('cl-D-value').textContent = '1.0';
        drawDiffusion();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('cl-convergePlot')) { setTimeout(initializePlots, 100); return; }

        drawConverge();
        document.getElementById('cl-refine-slider').addEventListener('input', function() {
            document.getElementById('cl-refine-value').textContent = this.value; drawConverge();
        });
        document.getElementById('cl-T-slider').addEventListener('input', function() {
            document.getElementById('cl-T-value').textContent = parseFloat(this.value).toFixed(1); drawConverge();
        });

        drawParams();
        document.getElementById('cl-a-slider').addEventListener('input', function() {
            document.getElementById('cl-a-value').textContent = parseFloat(this.value).toFixed(2); drawParams();
        });
        document.getElementById('cl-tau-slider').addEventListener('input', function() {
            document.getElementById('cl-tau-value').textContent = parseFloat(this.value).toFixed(3); drawParams();
        });

        drawDiffusion();
        document.getElementById('cl-D-slider').addEventListener('input', function() {
            document.getElementById('cl-D-value').textContent = parseFloat(this.value).toFixed(1); drawDiffusion();
        });
    }

    initializePlots();
})();
