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

    var funcDefs = {
        inv:   { f: function(x){return 1/(1+x);}, a: 0, b: 1, trueVal: Math.log(2), label: '1/(1+x)' },
        sin:   { f: function(x){return Math.sin(x);}, a: 0, b: Math.PI, trueVal: 2, label: 'sin(x)' },
        gauss: { f: function(x){return Math.exp(-x*x);}, a: 0, b: 2, trueVal: 0.8821, label: 'e^(-x²)' }
    };

    // ===============================================================
    // EXPLORER 1: Error Scaling Verifier
    // ===============================================================
    window.esRunScaling = function() {
        var key = document.getElementById('es-func-select').value;
        var nTrials = parseInt(document.getElementById('es-trials-slider').value);
        var fn = funcDefs[key];

        var Ns = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
        var errors = [], allEstimates = {};

        for (var ni = 0; ni < Ns.length; ni++) {
            var N = Ns[ni];
            var estimates = [];
            for (var t = 0; t < nTrials; t++) {
                var sum = 0;
                for (var i = 0; i < N; i++) {
                    sum += fn.f(fn.a + Math.random() * (fn.b - fn.a));
                }
                estimates.push((fn.b - fn.a) * sum / N);
            }
            var mean = 0;
            for (var t = 0; t < estimates.length; t++) mean += estimates[t];
            mean /= estimates.length;
            var variance = 0;
            for (var t = 0; t < estimates.length; t++) variance += (estimates[t] - mean) * (estimates[t] - mean);
            variance /= (estimates.length - 1);
            errors.push(Math.sqrt(variance));
            allEstimates[N] = estimates;
        }

        // Fit slope
        var logN = Ns.map(Math.log10), logErr = errors.map(Math.log10);
        var sx = 0, sy = 0, sxy = 0, sx2 = 0, n = logN.length;
        for (var i = 0; i < n; i++) { sx += logN[i]; sy += logErr[i]; sxy += logN[i]*logErr[i]; sx2 += logN[i]*logN[i]; }
        var slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx);

        // Log-log plot
        var refN = [50, 10000];
        var refErr = [errors[0] * Math.sqrt(Ns[0] / 50), errors[0] * Math.sqrt(Ns[0] / 10000)];

        Plotly.react('es-loglogPlot', [
            { x: Ns, y: errors, type: 'scatter', mode: 'markers+lines',
              marker: { color: '#00f3ff', size: 10 },
              line: { color: '#00f3ff', width: 2 },
              name: 'Measured (slope = ' + slope.toFixed(2) + ')' },
            { x: refN, y: refErr, type: 'scatter', mode: 'lines',
              line: { color: 'white', width: 1.5, dash: 'dash' },
              name: '1/√N reference' }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle(null, 'N (samples)'), { type: 'log' }),
            yaxis: Object.assign(axStyle(null, 'Standard error'), { type: 'log' }),
            height: 400,
            legend: { x: 0.5, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // Histogram of estimates at two N values
        var smallN = allEstimates[100] || [];
        var largeN = allEstimates[10000] || allEstimates[5000] || [];

        Plotly.react('es-histPlot', [
            { x: smallN, type: 'histogram', opacity: 0.6,
              marker: { color: '#ff006e' }, name: 'N = 100', nbinsx: 25 },
            { x: largeN, type: 'histogram', opacity: 0.6,
              marker: { color: '#00f3ff' }, name: 'N = 10000', nbinsx: 25 },
            { x: [fn.trueVal, fn.trueVal], y: [0, nTrials * 0.3], type: 'scatter', mode: 'lines',
              line: { color: 'white', width: 2, dash: 'dash' }, name: 'True value' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Estimate'),
            yaxis: axStyle(null, 'Count'),
            height: 400, barmode: 'overlay',
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('es-stats1').innerHTML =
            '<span><strong>Log-log slope: ' + slope.toFixed(3) + '</strong></span>' +
            '<span>' + nTrials + ' trials per N  |  Function: ' + fn.label + '</span>';
    };

    window.esReset = function() {
        Plotly.react('es-loglogPlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle([1, 5], 'N'), yaxis: axStyle([-4, -1], 'Error'), height: 400,
            annotations: [{ x: 3, y: -2.5, text: 'Click "Run"', font: { color: '#aaa', size: 14 }, showarrow: false }]
        }), { responsive: true });
        Plotly.react('es-histPlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400
        }), { responsive: true });
        document.getElementById('es-stats1').innerHTML = '';
    };

    // ===============================================================
    // EXPLORER 2: MC vs Quadrature
    // ===============================================================
    window.esQuadRun = function() {
        var key = document.getElementById('es-quad-func').value;
        var fn = funcDefs[key];

        var Ns = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
        var mcErrors = [], trapErrors = [];

        for (var ni = 0; ni < Ns.length; ni++) {
            var N = Ns[ni];

            // Trapezoidal rule
            var h = (fn.b - fn.a) / N;
            var trapSum = fn.f(fn.a) / 2 + fn.f(fn.b) / 2;
            for (var i = 1; i < N; i++) trapSum += fn.f(fn.a + i * h);
            trapSum *= h;
            trapErrors.push(Math.abs(trapSum - fn.trueVal));

            // MC (average over 100 trials)
            var mcErrSum = 0;
            for (var t = 0; t < 100; t++) {
                var sum = 0;
                for (var i = 0; i < N; i++) sum += fn.f(fn.a + Math.random() * (fn.b - fn.a));
                mcErrSum += Math.abs((fn.b - fn.a) * sum / N - fn.trueVal);
            }
            mcErrors.push(mcErrSum / 100);
        }

        Plotly.react('es-quadPlot', [
            { x: Ns, y: mcErrors, type: 'scatter', mode: 'markers+lines',
              marker: { color: '#00f3ff', size: 8 }, line: { color: '#00f3ff', width: 2 },
              name: 'Monte Carlo (slope ≈ −0.5)' },
            { x: Ns, y: trapErrors, type: 'scatter', mode: 'markers+lines',
              marker: { color: '#ff006e', size: 8 }, line: { color: '#ff006e', width: 2 },
              name: 'Trapezoidal (slope ≈ −2)' }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle(null, 'N (evaluation points)'), { type: 'log' }),
            yaxis: Object.assign(axStyle(null, '|Error|'), { type: 'log' }),
            height: 420,
            legend: { x: 0.5, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('es-stats2').innerHTML =
            '<span><strong>1D comparison: Trapezoidal wins easily</strong></span>' +
            '<span>At N=1000: MC error ≈ ' + mcErrors[6].toExponential(1) +
            '  |  Trap error ≈ ' + trapErrors[6].toExponential(1) + '</span>';
    };

    // ===============================================================
    // EXPLORER 3: Dimensional Crossover
    // ===============================================================
    function drawCrossover() {
        var digits = parseInt(document.getElementById('es-target-slider').value);
        var target = Math.pow(10, -digits);

        var dims = [1, 2, 3, 4, 5, 6, 7, 8, 10];
        var gridCost = [], mcCost = [];
        var mcN = Math.ceil(1 / (target * target)); // σ/√N = target → N = 1/target²

        for (var i = 0; i < dims.length; i++) {
            var d = dims[i];
            // Grid: n^{-2} = target → n = target^{-1/2}, N = n^d = target^{-d/2}
            var gridN = Math.pow(target, -d / 2);
            gridCost.push(gridN);
            mcCost.push(mcN);
        }

        // Left: convergence exponent comparison
        var trapExponents = dims.map(function(d) { return -2 / d; });
        var mcExponent = dims.map(function() { return -0.5; });

        Plotly.react('es-crossoverPlot', [
            { x: dims, y: trapExponents, type: 'scatter', mode: 'lines+markers',
              marker: { color: '#ff006e', size: 8 }, line: { color: '#ff006e', width: 2 },
              name: 'Grid: N^(-2/d)' },
            { x: dims, y: mcExponent, type: 'scatter', mode: 'lines+markers',
              marker: { color: '#00f3ff', size: 8 }, line: { color: '#00f3ff', width: 2 },
              name: 'MC: N^(-1/2)' },
            { x: [4, 4], y: [-2.5, 0], type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 2, dash: 'dash' }, name: 'Crossover d = 4' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 11], 'Dimension d'),
            yaxis: axStyle([-2.5, 0], 'Convergence exponent'),
            height: 400,
            legend: { x: 0.5, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // Right: cost comparison
        Plotly.react('es-costPlot', [
            { x: dims.map(function(d){return d+'D';}), y: gridCost, type: 'bar',
              marker: { color: '#ff006e' }, name: 'Grid points needed' },
            { x: dims.map(function(d){return d+'D';}), y: mcCost, type: 'bar',
              marker: { color: '#00f3ff' }, name: 'MC samples needed' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Dimension'),
            yaxis: Object.assign(axStyle(null, 'Points needed'), { type: 'log' }),
            height: 400, barmode: 'group',
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('es-stats3').innerHTML =
            '<span><strong>Target: ' + digits + ' digits of accuracy (ε = ' + target.toExponential(0) + ')</strong></span>' +
            '<span>MC needs ' + mcN.toExponential(1) + ' samples (any dimension)  |  ' +
            'Grid in 10D: ' + gridCost[dims.indexOf(10) >= 0 ? dims.indexOf(10) : dims.length-1].toExponential(1) + ' points</span>';
    }

    window.esCrossoverReset = function() {
        document.getElementById('es-target-slider').value = 3;
        document.getElementById('es-target-value').textContent = '3';
        drawCrossover();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('es-loglogPlot')) { setTimeout(initializePlots, 100); return; }

        // Placeholders
        Plotly.react('es-loglogPlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle([1, 5], 'N'), yaxis: axStyle([-4, -1], 'Error'), height: 400,
            annotations: [{ x: 3, y: -2.5, text: 'Click "Run"', font: { color: '#aaa', size: 14 }, showarrow: false }]
        }), { responsive: true });
        Plotly.react('es-histPlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400
        }), { responsive: true });

        Plotly.react('es-quadPlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle([1, 4], 'N'), yaxis: axStyle([-6, 0], '|Error|'), height: 420,
            annotations: [{ x: 2.5, y: -3, text: 'Click "Run Comparison"', font: { color: '#aaa', size: 14 }, showarrow: false }]
        }), { responsive: true });

        document.getElementById('es-trials-slider').addEventListener('input', function() {
            document.getElementById('es-trials-value').textContent = this.value;
        });

        // Explorer 3
        drawCrossover();
        document.getElementById('es-target-slider').addEventListener('input', function() {
            document.getElementById('es-target-value').textContent = this.value;
            drawCrossover();
        });
    }

    initializePlots();
})();
