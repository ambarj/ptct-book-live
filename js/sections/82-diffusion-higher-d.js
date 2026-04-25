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

    // ===============================================================
    // EXPLORER 1: 2D Diffusion Heatmap
    // ===============================================================
    function drawHeatmap() {
        var t = parseFloat(document.getElementById('hd-t-slider').value);
        var D = parseFloat(document.getElementById('hd-D-slider').value);

        var n = 80;
        var R = 6;
        var xArr = [], yArr = [], zArr = [];
        for (var j = 0; j < n; j++) {
            var y = -R + j * 2 * R / (n - 1);
            yArr.push(y);
            var row = [];
            for (var i = 0; i < n; i++) {
                var x = -R + i * 2 * R / (n - 1);
                if (j === 0) xArr.push(x);
                var r2 = x * x + y * y;
                row.push(Math.exp(-r2 / (4 * D * t)) / (4 * Math.PI * D * t));
            }
            zArr.push(row);
        }

        // RMS circle
        var rms = Math.sqrt(4 * D * t);
        var circX = [], circY = [];
        for (var i = 0; i <= 60; i++) {
            var a = i * 2 * Math.PI / 60;
            circX.push(rms * Math.cos(a)); circY.push(rms * Math.sin(a));
        }

        Plotly.react('hd-heatmapPlot', [
            { z: zArr, x: xArr, y: yArr, type: 'heatmap', colorscale: 'Viridis', showscale: true, hoverinfo: 'skip' },
            { x: circX, y: circY, type: 'scatter', mode: 'lines', line: { color: 'white', width: 2, dash: 'dash' }, name: 'RMS = ' + rms.toFixed(2), hoverinfo: 'skip' }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-R, R], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-R, R], 'y'), height: 440,
            legend: { x: 0.02, y: 0.02, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        var peak = 1 / (4 * Math.PI * D * t);
        document.getElementById('hd-stats1').innerHTML =
            '<span><strong>2D: t = ' + t.toFixed(2) + ', D = ' + D.toFixed(1) + '</strong></span>' +
            '<span>Peak = ' + peak.toFixed(4) + '  |  RMS = √(4Dt) = ' + rms.toFixed(2) + '</span>';
    }

    window.hdHeatReset = function() {
        document.getElementById('hd-t-slider').value = 0.5;
        document.getElementById('hd-D-slider').value = 1;
        document.getElementById('hd-t-value').textContent = '0.50';
        document.getElementById('hd-D-value').textContent = '1.0';
        drawHeatmap();
    };

    // ===============================================================
    // EXPLORER 2: Dimensional Comparison
    // ===============================================================
    function drawComparison() {
        var t = parseFloat(document.getElementById('hd-cmp-t-slider').value);
        var D = 1;

        // Radial profiles
        var r = [];
        for (var i = 0; i <= 200; i++) r.push(i * 6 / 200);
        var dims = [1, 2, 3];
        var dColors = ['#00f3ff', '#ffbe0b', '#ff006e'];
        var radialTraces = [];

        for (var di = 0; di < dims.length; di++) {
            var d = dims[di];
            var gy = r.map(function(rv) { return Math.exp(-rv * rv / (4 * D * t)) / Math.pow(4 * Math.PI * D * t, d / 2); });
            radialTraces.push({ x: r, y: gy, type: 'scatter', mode: 'lines',
                line: { color: dColors[di], width: 2.5 }, name: d + 'D' });
        }

        Plotly.react('hd-radialPlot', radialTraces, Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 6], 'r'), yaxis: axStyle([0, Math.pow(4 * Math.PI * D * t, -0.5) * 1.1], 'ρ(r, t)'),
            height: 400, legend: { x: 0.7, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // RMS comparison
        var dArr = [1, 2, 3, 5, 10];
        var rmsVals = dArr.map(function(d) { return Math.sqrt(2 * d * D * t); });

        Plotly.react('hd-rmsPlot', [
            { x: dArr.map(function(d) { return d + 'D'; }), y: rmsVals, type: 'bar',
              marker: { color: ['#00f3ff', '#ffbe0b', '#ff006e', '#00ff88', '#bb86fc'] }, showlegend: false }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Dimension'), yaxis: axStyle([0, Math.max.apply(null, rmsVals) * 1.2], 'RMS = √(2dDt)'),
            height: 400
        }), { responsive: true });

        document.getElementById('hd-stats2').innerHTML =
            '<span><strong>D = 1, t = ' + t.toFixed(1) + '</strong></span>' +
            '<span>RMS: 1D = ' + Math.sqrt(2 * D * t).toFixed(2) + '  |  2D = ' + Math.sqrt(4 * D * t).toFixed(2) + '  |  3D = ' + Math.sqrt(6 * D * t).toFixed(2) + '</span>';
    }

    window.hdCmpReset = function() {
        document.getElementById('hd-cmp-t-slider').value = 1;
        document.getElementById('hd-cmp-t-value').textContent = '1.0';
        drawComparison();
    };

    // ===============================================================
    // EXPLORER 3: 2D Walk Cloud
    // ===============================================================
    window.hdCloudRun = function() {
        var nW = parseInt(document.getElementById('hd-cloud-nw-value').textContent);
        var nS = parseInt(document.getElementById('hd-cloud-ns-value').textContent);

        var xFinals = [], yFinals = [];
        for (var w = 0; w < nW; w++) {
            var x = 0, y = 0;
            for (var s = 0; s < nS; s++) {
                var dir = Math.floor(Math.random() * 4);
                if (dir === 0) x++; else if (dir === 1) x--; else if (dir === 2) y++; else y--;
            }
            xFinals.push(x); yFinals.push(y);
        }

        // RMS circle
        var sumR2 = 0;
        for (var i = 0; i < nW; i++) sumR2 += xFinals[i] * xFinals[i] + yFinals[i] * yFinals[i];
        var rms = Math.sqrt(sumR2 / nW);

        var circX = [], circY = [];
        for (var i = 0; i <= 60; i++) { var a = i * 2 * Math.PI / 60; circX.push(rms * Math.cos(a)); circY.push(rms * Math.sin(a)); }

        var R = rms * 2.5;
        Plotly.react('hd-cloudPlot', [
            { x: xFinals, y: yFinals, type: 'scatter', mode: 'markers',
              marker: { color: '#00f3ff', size: 2, opacity: 0.4 }, name: 'Walkers', hoverinfo: 'none' },
            { x: circX, y: circY, type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 2, dash: 'dash' }, name: 'RMS = ' + rms.toFixed(1) }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-R, R], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-R, R], 'y'), height: 440,
            legend: { x: 0.02, y: 0.02, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('hd-stats3').innerHTML =
            '<span><strong>' + nW + ' walkers, ' + nS + ' steps in 2D</strong></span>' +
            '<span>RMS = ' + rms.toFixed(1) + '  |  Theory: √N = ' + Math.sqrt(nS).toFixed(1) + '</span>';
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('hd-heatmapPlot')) { setTimeout(initializePlots, 100); return; }

        drawHeatmap();
        document.getElementById('hd-t-slider').addEventListener('input', function() {
            document.getElementById('hd-t-value').textContent = parseFloat(this.value).toFixed(2); drawHeatmap();
        });
        document.getElementById('hd-D-slider').addEventListener('input', function() {
            document.getElementById('hd-D-value').textContent = parseFloat(this.value).toFixed(1); drawHeatmap();
        });

        drawComparison();
        document.getElementById('hd-cmp-t-slider').addEventListener('input', function() {
            document.getElementById('hd-cmp-t-value').textContent = parseFloat(this.value).toFixed(1); drawComparison();
        });

        // Explorer 3 placeholder
        Plotly.react('hd-cloudPlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 440,
            annotations: [{ x: 0.5, y: 0.5, text: 'Click "Launch"', font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
        }), { responsive: true });

        document.getElementById('hd-cloud-nw-slider').addEventListener('input', function() {
            document.getElementById('hd-cloud-nw-value').textContent = this.value;
        });
        document.getElementById('hd-cloud-ns-slider').addEventListener('input', function() {
            document.getElementById('hd-cloud-ns-value').textContent = this.value;
        });
    }

    initializePlots();
})();
