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

    // System database: name, D (m²/s), xScale (m), tUnit, tLabel, color
    var SYSTEMS = [
        { name: 'Heat in iron',     D: 2.3e-5,  xScale: 0.05,  tMax: 10,   tUnit: 's',    color: '#00f3ff' },
        { name: 'Ink in water',     D: 1e-9,    xScale: 5e-4,  tMax: 3600, tUnit: 's',    color: '#ff006e' },
        { name: 'O₂ in air',        D: 2e-5,    xScale: 0.05,  tMax: 10,   tUnit: 's',    color: '#ffbe0b' },
        { name: 'Dopant in Si',     D: 1e-16,   xScale: 5e-7,  tMax: 3600, tUnit: 's',    color: '#00ff88' },
        { name: 'Stock (σ²/2)',     D: 0.02,    xScale: 1.0,   tMax: 5,    tUnit: 'yr',   color: '#bb86fc' },
        { name: 'Bacteria in agar', D: 5e-10,   xScale: 3e-4,  tMax: 3600, tUnit: 's',    color: '#ff9e64' }
    ];

    function gauss1d(x, D, t) {
        if (t < 1e-30) t = 1e-30;
        return Math.exp(-x * x / (4 * D * t)) / Math.sqrt(4 * Math.PI * D * t);
    }

    // ===============================================================
    // EXPLORER 1: Cross-Domain Parameter Explorer
    // ===============================================================
    function drawDomain() {
        var idx = parseInt(document.getElementById('da-system-select').value);
        var sys = SYSTEMS[idx];
        var tSlider = parseFloat(document.getElementById('da-t-slider').value);

        // Scale the slider value to the system's natural timescale
        var t = tSlider * sys.tMax / 10;
        document.getElementById('da-t-value').textContent = t < 0.01 ? t.toExponential(1) : t.toFixed(2);
        document.getElementById('da-t-unit').textContent = sys.tUnit;

        // Gaussian profile
        var xR = sys.xScale * 2;
        var xArr = [], yArr = [];
        for (var i = -200; i <= 200; i++) {
            var x = i * xR / 200;
            xArr.push(x);
            yArr.push(gauss1d(x, sys.D, t));
        }
        var yMax = gauss1d(0, sys.D, t) * 1.3;

        var xLabel = sys.D < 1e-10 ? 'x (μm)' : sys.D < 1e-3 ? 'x (m)' : 'x';
        var xMult = sys.D < 1e-10 ? 1e6 : 1;
        var xPlot = xArr.map(function(v) { return v * xMult; });

        Plotly.react('da-gaussPlot', [
            { x: xPlot, y: yArr, type: 'scatter', mode: 'lines',
              line: { color: sys.color, width: 2.5 }, name: sys.name }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-xR * xMult, xR * xMult], xLabel),
            yaxis: axStyle([0, yMax], 'u(x, t)'),
            height: 400,
            title: { text: sys.name, font: { color: '#aaa', size: 12 } }
        }), { responsive: true });

        // RMS vs time
        var tArr = [], rmsArr = [];
        var Nt = 100;
        for (var j = 0; j <= Nt; j++) {
            var tt = j * sys.tMax / Nt;
            tArr.push(tt);
            rmsArr.push(Math.sqrt(2 * sys.D * tt) * xMult);
        }
        var rmsNow = Math.sqrt(2 * sys.D * t);

        Plotly.react('da-rmsPlot', [
            { x: tArr, y: rmsArr, type: 'scatter', mode: 'lines',
              line: { color: sys.color, width: 2.5 }, name: '√(2Dt)' },
            { x: [t], y: [rmsNow * xMult], type: 'scatter', mode: 'markers',
              marker: { color: '#fff', size: 12, symbol: 'star' }, name: 'now', showlegend: false }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, sys.tMax], 't (' + sys.tUnit + ')'),
            yaxis: axStyle([0, Math.sqrt(2 * sys.D * sys.tMax) * xMult * 1.1],
                'RMS distance' + (xMult > 1 ? ' (μm)' : ' (m)')),
            height: 400
        }), { responsive: true });

        var rmsDisp = rmsNow < 1e-6 ? (rmsNow * 1e9).toFixed(1) + ' nm'
            : rmsNow < 1e-3 ? (rmsNow * 1e6).toFixed(1) + ' μm'
            : rmsNow < 1 ? (rmsNow * 100).toFixed(2) + ' cm'
            : rmsNow.toFixed(3) + ' m';
        document.getElementById('da-stats1').innerHTML =
            '<span><strong>' + sys.name + '</strong></span>' +
            '<span>D = ' + sys.D.toExponential(1) + ' m²/s  |  t = ' + (t < 0.01 ? t.toExponential(1) : t.toFixed(2)) + ' ' + sys.tUnit + '</span>' +
            '<span>RMS = ' + rmsDisp + '</span>';
    }

    window.daParamReset = function() {
        document.getElementById('da-system-select').value = '0';
        document.getElementById('da-t-slider').value = 1;
        document.getElementById('da-t-value').textContent = '1.0';
        drawDomain();
    };

    // ===============================================================
    // EXPLORER 2: Scaling Estimator
    // ===============================================================
    function drawScaling() {
        var logD = parseFloat(document.getElementById('da-logD-slider').value);
        var logT = parseFloat(document.getElementById('da-logT-slider').value);
        var D = Math.pow(10, logD);
        var t = Math.pow(10, logT);
        var ell = Math.sqrt(2 * D * t);

        // log-log D vs distance for various times
        var logDs = [];
        for (var d = -16; d <= -1; d += 0.5) logDs.push(d);
        var times = [1, 60, 3600, 86400, 3.15e7];
        var tLabels = ['1 s', '1 min', '1 hr', '1 day', '1 yr'];
        var tColors = ['#00f3ff', '#ffbe0b', '#ff006e', '#00ff88', '#bb86fc'];

        var traces = [];
        for (var ti = 0; ti < times.length; ti++) {
            var dists = logDs.map(function(ld) { return Math.sqrt(2 * Math.pow(10, ld) * times[ti]); });
            traces.push({ x: logDs, y: dists, type: 'scatter', mode: 'lines',
                line: { color: tColors[ti], width: 2 }, name: tLabels[ti] });
        }
        // Current point
        traces.push({ x: [logD], y: [ell], type: 'scatter', mode: 'markers',
            marker: { color: '#fff', size: 14, symbol: 'star', line: { color: '#ff006e', width: 2 } },
            name: 'current', showlegend: false });

        // Reference lines
        var refs = [
            { y: 1e-6, label: '1 μm' }, { y: 1e-3, label: '1 mm' },
            { y: 0.01, label: '1 cm' }, { y: 1, label: '1 m' }
        ];
        var shapes = refs.map(function(r) {
            return { type: 'line', x0: -16, x1: -1, y0: r.y, y1: r.y,
                line: { color: '#555', width: 1, dash: 'dot' } };
        });
        var annots = refs.map(function(r) {
            return { x: -1.5, y: Math.log10(r.y), text: r.label,
                font: { color: '#777', size: 10 }, showarrow: false, xref: 'x', yref: 'y' };
        });

        Plotly.react('da-scalePlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle([-16.5, -0.5], 'log₁₀(D) [m²/s]'),
            yaxis: axStyle(null, 'distance ℓ (m)', 'log'),
            height: 420, shapes: shapes, annotations: annots,
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        var ellDisp = ell < 1e-6 ? (ell * 1e9).toFixed(1) + ' nm'
            : ell < 1e-3 ? (ell * 1e6).toFixed(1) + ' μm'
            : ell < 1 ? (ell * 100).toFixed(2) + ' cm'
            : ell.toFixed(3) + ' m';
        var tDisp = t < 60 ? t.toFixed(1) + ' s'
            : t < 3600 ? (t / 60).toFixed(1) + ' min'
            : t < 86400 ? (t / 3600).toFixed(1) + ' hr'
            : t < 3.15e7 ? (t / 86400).toFixed(1) + ' days'
            : (t / 3.15e7).toFixed(1) + ' yr';
        document.getElementById('da-stats2').innerHTML =
            '<span><strong>D = 10^(' + logD.toFixed(1) + ') m²/s</strong></span>' +
            '<span>t = ' + tDisp + '  →  ℓ = √(2Dt) = ' + ellDisp + '</span>';
    }

    window.daScaleReset = function() {
        document.getElementById('da-logD-slider').value = -5;
        document.getElementById('da-logT-slider').value = 0;
        document.getElementById('da-logD-value').textContent = '-5.0';
        document.getElementById('da-logT-value').textContent = '0.0';
        drawScaling();
    };

    // ===============================================================
    // EXPLORER 3: Heat vs Mass side-by-side
    // ===============================================================
    function drawComparison() {
        var t = parseFloat(document.getElementById('da-cmp-t-slider').value);
        var Dheat = 2.3e-5;
        var Dink = 1e-9;

        // Heat in iron (meters)
        var xH = [], yH = [];
        var rmsH = Math.sqrt(2 * Dheat * t);
        var rangeH = Math.max(rmsH * 4, 0.002);
        for (var i = -200; i <= 200; i++) {
            var x = i * rangeH / 200;
            xH.push(x * 100); // cm
            yH.push(gauss1d(x, Dheat, t));
        }

        Plotly.react('da-heatPlot', [
            { x: xH, y: yH, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2.5 }, fill: 'tozeroy',
              fillcolor: 'rgba(255,0,110,0.15)', name: 'Temperature' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-rangeH * 100, rangeH * 100], 'x (cm)'),
            yaxis: axStyle([0, gauss1d(0, Dheat, t) * 1.2], 'T(x,t)'),
            height: 400,
            title: { text: 'Heat in iron (κ = 2.3×10⁻⁵)', font: { color: '#aaa', size: 12 } }
        }), { responsive: true });

        // Ink in water (μm)
        var xI = [], yI = [];
        var rmsI = Math.sqrt(2 * Dink * t);
        var rangeI = Math.max(rmsI * 4, 1e-5);
        for (var j = -200; j <= 200; j++) {
            var xi = j * rangeI / 200;
            xI.push(xi * 1e6); // μm
            yI.push(gauss1d(xi, Dink, t));
        }

        Plotly.react('da-massPlot', [
            { x: xI, y: yI, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2.5 }, fill: 'tozeroy',
              fillcolor: 'rgba(0,243,255,0.15)', name: 'Concentration' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([-rangeI * 1e6, rangeI * 1e6], 'x (μm)'),
            yaxis: axStyle([0, gauss1d(0, Dink, t) * 1.2], 'c(x,t)'),
            height: 400,
            title: { text: 'Ink in water (D = 10⁻⁹)', font: { color: '#aaa', size: 12 } }
        }), { responsive: true });

        document.getElementById('da-stats3').innerHTML =
            '<span><strong>t = ' + t.toFixed(1) + ' s</strong></span>' +
            '<span>Heat RMS: ' + (rmsH * 100).toFixed(2) + ' cm  |  Ink RMS: ' + (rmsI * 1e6).toFixed(1) + ' μm</span>' +
            '<span>Ratio: ' + (Dheat / Dink).toExponential(1) + '×</span>';
    }

    window.daCmpReset = function() {
        document.getElementById('da-cmp-t-slider').value = 1;
        document.getElementById('da-cmp-t-value').textContent = '1.0';
        drawComparison();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('da-gaussPlot')) { setTimeout(initializePlots, 100); return; }

        // Explorer 1
        drawDomain();
        document.getElementById('da-system-select').addEventListener('change', drawDomain);
        document.getElementById('da-t-slider').addEventListener('input', function() {
            drawDomain();
        });

        // Explorer 2
        drawScaling();
        document.getElementById('da-logD-slider').addEventListener('input', function() {
            document.getElementById('da-logD-value').textContent = parseFloat(this.value).toFixed(1);
            drawScaling();
        });
        document.getElementById('da-logT-slider').addEventListener('input', function() {
            document.getElementById('da-logT-value').textContent = parseFloat(this.value).toFixed(1);
            drawScaling();
        });

        // Explorer 3
        drawComparison();
        document.getElementById('da-cmp-t-slider').addEventListener('input', function() {
            document.getElementById('da-cmp-t-value').textContent = parseFloat(this.value).toFixed(1);
            drawComparison();
        });
    }

    initializePlots();
})();
