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

    function gaussian(x, D, t) {
        if (t < 1e-6) return x === 0 ? 1e6 : 0;
        return Math.exp(-x * x / (4 * D * t)) / Math.sqrt(4 * Math.PI * D * t);
    }

    // erfc approximation
    function erfc(x) {
        var t = 1 / (1 + 0.3275911 * Math.abs(x));
        var poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
        var val = poly * Math.exp(-x * x);
        return x >= 0 ? val : 2 - val;
    }

    // ===============================================================
    // EXPLORER 1: Gaussian Spreading
    // ===============================================================
    function drawSpread() {
        var t = parseFloat(document.getElementById('de-t-slider').value);
        var D = parseFloat(document.getElementById('de-D-slider').value);

        var xArr = [], yArr = [];
        for (var i = 0; i <= 400; i++) {
            var x = -8 + i * 16 / 400;
            xArr.push(x); yArr.push(gaussian(x, D, t));
        }

        // Ghost traces at fixed times
        var traces = [];
        var ghostTimes = [0.1, 0.5, 2.0];
        var ghostColors = ['rgba(255,0,110,0.2)', 'rgba(255,190,11,0.2)', 'rgba(0,255,136,0.2)'];
        for (var gi = 0; gi < ghostTimes.length; gi++) {
            var gt = ghostTimes[gi];
            var gx = [], gy = [];
            for (var i = 0; i <= 200; i++) { var x = -8 + i * 16 / 200; gx.push(x); gy.push(gaussian(x, D, gt)); }
            traces.push({ x: gx, y: gy, type: 'scatter', mode: 'lines',
                line: { color: ghostColors[gi], width: 1 }, name: 't=' + gt, hoverinfo: 'skip' });
        }

        traces.push({ x: xArr, y: yArr, type: 'scatter', mode: 'lines',
            line: { color: '#00f3ff', width: 3 }, name: 't = ' + t.toFixed(2) });

        var sigma = Math.sqrt(2 * D * t);
        var peak = 1 / Math.sqrt(4 * Math.PI * D * t);

        Plotly.react('de-spreadPlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle([-8, 8], 'Position x'), yaxis: axStyle([0, Math.max(peak * 1.2, 0.5)], 'ρ(x, t)'),
            height: 420, legend: { x: 0.7, y: 0.98, font: { color: '#aaa', size: 9 } }
        }), { responsive: true });

        document.getElementById('de-stats1').innerHTML =
            '<span><strong>t = ' + t.toFixed(2) + ', D = ' + D.toFixed(1) + '</strong></span>' +
            '<span>σ = √(2Dt) = ' + sigma.toFixed(3) + '  |  Peak = 1/√(4πDt) = ' + peak.toFixed(3) + '</span>';
    }

    window.deSpreadReset = function() {
        document.getElementById('de-t-slider').value = 0.5;
        document.getElementById('de-D-slider').value = 1;
        document.getElementById('de-t-value').textContent = '0.50';
        document.getElementById('de-D-value').textContent = '1.0';
        drawSpread();
    };

    // ===============================================================
    // EXPLORER 2: Width Tracker
    // ===============================================================
    window.deWidthRun = function() {
        var D = parseFloat(document.getElementById('de-width-D-slider').value);

        // Left: snapshots at several times
        var times = [0.1, 0.5, 1.0, 2.0, 5.0];
        var tColors = ['#ff006e', '#ffbe0b', '#00f3ff', '#00ff88', '#bb86fc'];
        var snapTraces = [];
        for (var ti = 0; ti < times.length; ti++) {
            var t = times[ti];
            var gx = [], gy = [];
            for (var i = 0; i <= 200; i++) { var x = -8 + i * 16 / 200; gx.push(x); gy.push(gaussian(x, D, t)); }
            snapTraces.push({ x: gx, y: gy, type: 'scatter', mode: 'lines',
                line: { color: tColors[ti], width: 2 }, name: 't=' + t });
        }

        Plotly.react('de-snapPlot', snapTraces, Object.assign({}, darkLayout, {
            xaxis: axStyle([-8, 8], 'x'), yaxis: axStyle([0, 1.5], 'ρ(x,t)'),
            height: 400, legend: { x: 0.7, y: 0.98, font: { color: '#aaa', size: 9 } }
        }), { responsive: true });

        // Right: σ vs t
        var tArr = [], sigmaArr = [], theoryArr = [];
        for (var i = 1; i <= 100; i++) {
            var t = i * 5 / 100;
            tArr.push(t); sigmaArr.push(Math.sqrt(2 * D * t)); theoryArr.push(Math.sqrt(2 * D * t));
        }

        Plotly.react('de-widthPlot', [
            { x: tArr, y: sigmaArr, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2.5 }, name: 'σ = √(2Dt)' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 5], 'Time t'), yaxis: axStyle([0, Math.sqrt(10 * D) + 0.5], 'Width σ'),
            height: 400
        }), { responsive: true });

        document.getElementById('de-stats2').innerHTML =
            '<span><strong>D = ' + D.toFixed(1) + '</strong></span>' +
            '<span>At t=1: σ = ' + Math.sqrt(2 * D).toFixed(2) + '  |  At t=4: σ = ' + Math.sqrt(8 * D).toFixed(2) + '</span>';
    };

    // ===============================================================
    // EXPLORER 3: Different Initial Conditions
    // ===============================================================
    function drawIC() {
        var icType = document.getElementById('de-ic-select').value;
        var t = parseFloat(document.getElementById('de-ic-t-slider').value);
        var D = 1.0;

        var xArr = [], yArr = [], y0Arr = [];
        var nPts = 400;

        for (var i = 0; i <= nPts; i++) {
            var x = -8 + i * 16 / nPts;
            xArr.push(x);

            if (icType === 'delta') {
                y0Arr.push(Math.abs(x) < 0.05 ? 10 : 0);
                yArr.push(gaussian(x, D, t));
            } else if (icType === 'step') {
                y0Arr.push(x < 0 ? 1 : 0);
                yArr.push(0.5 * erfc(x / Math.sqrt(4 * D * t)));
            } else if (icType === 'double') {
                var d = 3;
                y0Arr.push(Math.abs(x - d) < 0.1 ? 5 : (Math.abs(x + d) < 0.1 ? 5 : 0));
                yArr.push(0.5 * gaussian(x - d, D, t) + 0.5 * gaussian(x + d, D, t));
            } else if (icType === 'square') {
                var w = 2;
                y0Arr.push(Math.abs(x) < w ? 1 / (2 * w) : 0);
                yArr.push(0.5 * (erfc((x - w) / Math.sqrt(4 * D * t)) - erfc((x + w) / Math.sqrt(4 * D * t))) / (2 * w));
            }
        }

        Plotly.react('de-icPlot', [
            { x: xArr, y: y0Arr, type: 'scatter', mode: 'lines',
              line: { color: 'rgba(255,255,255,0.3)', width: 1.5, dash: 'dot' }, name: 'Initial (t≈0)' },
            { x: xArr, y: yArr, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2.5 }, name: 't = ' + t.toFixed(2) }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-8, 8], 'Position x'),
            yaxis: axStyle([0, Math.max.apply(null, yArr) * 1.2 + 0.1], 'ρ(x, t)'),
            height: 420, legend: { x: 0.7, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('de-stats3').innerHTML =
            '<span><strong>IC: ' + icType + '  |  t = ' + t.toFixed(2) + ', D = ' + D.toFixed(1) + '</strong></span>';
    }

    window.deICReset = function() {
        document.getElementById('de-ic-select').value = 'delta';
        document.getElementById('de-ic-t-slider').value = 0.1;
        document.getElementById('de-ic-t-value').textContent = '0.10';
        drawIC();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('de-spreadPlot')) { setTimeout(initializePlots, 100); return; }

        drawSpread();
        document.getElementById('de-t-slider').addEventListener('input', function() {
            document.getElementById('de-t-value').textContent = parseFloat(this.value).toFixed(2); drawSpread();
        });
        document.getElementById('de-D-slider').addEventListener('input', function() {
            document.getElementById('de-D-value').textContent = parseFloat(this.value).toFixed(1); drawSpread();
        });

        // Explorer 2 placeholder
        Plotly.react('de-snapPlot', [], Object.assign({}, darkLayout, { xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
            annotations: [{ x: 0.5, y: 0.5, text: 'Click "Compute"', font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }] }), { responsive: true });
        Plotly.react('de-widthPlot', [], Object.assign({}, darkLayout, { xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400 }), { responsive: true });
        document.getElementById('de-width-D-slider').addEventListener('input', function() {
            document.getElementById('de-width-D-value').textContent = parseFloat(this.value).toFixed(1);
        });

        drawIC();
        document.getElementById('de-ic-select').addEventListener('change', drawIC);
        document.getElementById('de-ic-t-slider').addEventListener('input', function() {
            document.getElementById('de-ic-t-value').textContent = parseFloat(this.value).toFixed(2); drawIC();
        });
    }

    initializePlots();
})();
