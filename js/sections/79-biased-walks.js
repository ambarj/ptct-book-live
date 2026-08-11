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

    var colors = ['#00f3ff','#ff006e','#ffbe0b','#00ff88','#bb86fc'];

    // ===============================================================
    // EXPLORER 1: Drift vs Diffusion Race
    // ===============================================================
    window.bwRaceRun = function() {
        var p = parseFloat(document.getElementById('bw-p-slider').value);
        var maxN = parseInt(document.getElementById('bw-maxN-slider').value);
        var q = 1 - p, drift = 2 * p - 1;

        var ns = [], driftLine = [], upper = [], lower = [];
        for (var n = 1; n <= maxN; n += Math.max(1, Math.floor(maxN / 500))) {
            ns.push(n);
            var d = n * drift, s = 2 * Math.sqrt(n * p * q);
            driftLine.push(d); upper.push(d + s); lower.push(d - s);
        }

        var traces = [
            { x: ns, y: upper, type: 'scatter', mode: 'lines', line: { width: 0 }, showlegend: false, hoverinfo: 'skip' },
            { x: ns, y: lower, type: 'scatter', mode: 'lines', line: { width: 0 },
              fill: 'tonexty', fillcolor: 'rgba(0,243,255,0.15)', name: '±1σ band', hoverinfo: 'skip' },
            { x: ns, y: driftLine, type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 2.5 }, name: 'Drift: N×' + drift.toFixed(2) }
        ];

        // Sample walks
        for (var w = 0; w < 8; w++) {
            var pos = [0], x = 0;
            for (var s = 0; s < maxN; s++) { x += Math.random() < p ? 1 : -1; pos.push(x); }
            traces.push({ y: pos, type: 'scatter', mode: 'lines', hoverinfo: 'skip', opacity: 0.4,
                line: { color: colors[w % 5], width: 0.8 }, showlegend: false });
        }

        // Zero line
        traces.push({ x: [0, maxN], y: [0, 0], type: 'scatter', mode: 'lines',
            line: { color: '#808080', width: 1, dash: 'dot' }, showlegend: false, hoverinfo: 'skip' });

        Plotly.react('bw-racePlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle([0, maxN], 'Steps N'), yaxis: axStyle(null, 'Position'),
            height: 420, legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        var finalDrift = maxN * drift, finalSpread = 2 * Math.sqrt(maxN * p * q);
        var snr = finalDrift / finalSpread;
        document.getElementById('bw-stats1').innerHTML =
            '<span><strong>p = ' + p.toFixed(2) + ', N = ' + maxN + '</strong></span>' +
            '<span>Drift = ' + finalDrift.toFixed(0) + '  |  Spread = ' + finalSpread.toFixed(1) + '  |  SNR = ' + snr.toFixed(2) + '</span>';
    };

    // ===============================================================
    // EXPLORER 2: Signal-to-Noise Ratio
    // ===============================================================
    window.bwSNRRun = function() {
        var N = [];
        for (var n = 1; n <= 2000; n += 4) N.push(n);

        var biases = [0.51, 0.55, 0.6, 0.7];
        var bColors = ['#00f3ff', '#ffbe0b', '#ff006e', '#00ff88'];

        // Left: SNR vs N
        var snrTraces = [];
        for (var bi = 0; bi < biases.length; bi++) {
            var p = biases[bi], q = 1 - p;
            var snrVals = N.map(function(n) { return (p - q) * Math.sqrt(n) / (2 * Math.sqrt(p * q)); });
            snrTraces.push({ x: N, y: snrVals, type: 'scatter', mode: 'lines',
                line: { color: bColors[bi], width: 2 }, name: 'p = ' + p });
        }
        snrTraces.push({ x: [0, 2000], y: [1, 1], type: 'scatter', mode: 'lines',
            line: { color: 'rgba(255,255,255,0.4)', width: 1.5, dash: 'dot' }, name: 'SNR = 1' });
        snrTraces.push({ x: [0, 2000], y: [3, 3], type: 'scatter', mode: 'lines',
            line: { color: 'rgba(255,255,255,0.4)', width: 1.5, dash: 'dash' }, name: 'SNR = 3' });

        Plotly.react('bw-snrPlot', snrTraces, Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 2000], 'Steps N'), yaxis: axStyle([0, 15], 'SNR'),
            height: 400, legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 9 } }
        }), { responsive: true });

        // Right: N_detect (where SNR = 1) bar chart
        var nDetects = biases.map(function(p) {
            var q = 1 - p;
            return Math.ceil(4 * p * q / Math.pow(2 * p - 1, 2));
        });

        Plotly.react('bw-detectPlot', [
            { x: biases.map(function(p) { return 'p=' + p; }), y: nDetects, type: 'bar',
              marker: { color: bColors }, showlegend: false,
              text: nDetects.map(function(n) { return n.toLocaleString(); }), textposition: 'outside',
              textfont: { color: '#aaa', size: 11 } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Bias p'), yaxis: Object.assign(axStyle(null, 'Steps to detect (SNR=1)'), { type: 'log' }),
            height: 400
        }), { responsive: true });

        document.getElementById('bw-stats2').innerHTML =
            '<span><strong>Steps needed for SNR = 1:</strong></span>' +
            '<span>' + biases.map(function(p, i) { return 'p=' + p + ': N=' + nDetects[i].toLocaleString(); }).join('  |  ') + '</span>';
    };

    // ===============================================================
    // EXPLORER 3: Physical Applications
    // ===============================================================
    var physSystems = {
        electric:  { p: 0.6,  label: 'Charged particle in E-field', nSteps: 500 },
        gravity:   { p: 0.55, label: 'Sedimentation under gravity', nSteps: 500 },
        membrane:  { p: 0.52, label: 'Membrane transport', nSteps: 500 }
    };

    window.bwPhysRun = function() {
        var key = document.getElementById('bw-phys-select').value;
        var sys = physSystems[key];
        var nW = 30, finals = [];

        var trajTraces = [];
        for (var w = 0; w < nW; w++) {
            var pos = [0], x = 0;
            for (var s = 0; s < sys.nSteps; s++) { x += Math.random() < sys.p ? 1 : -1; pos.push(x); }
            finals.push(x);
            if (w < 10) trajTraces.push({ y: pos, type: 'scatter', mode: 'lines', hoverinfo: 'skip', opacity: 0.5,
                line: { color: colors[w % 5], width: 1 }, showlegend: false });
        }

        var drift = sys.nSteps * (2 * sys.p - 1);
        trajTraces.push({ x: [0, sys.nSteps], y: [0, drift], type: 'scatter', mode: 'lines',
            line: { color: '#ffbe0b', width: 2.5, dash: 'dash' }, name: 'Drift = ' + drift.toFixed(0) });

        Plotly.react('bw-physTrajPlot', trajTraces, Object.assign({}, darkLayout, {
            xaxis: axStyle([0, sys.nSteps], 'Steps'), yaxis: axStyle(null, 'Position'),
            height: 400, legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        Plotly.react('bw-physHistPlot', [
            { x: finals, type: 'histogram', marker: { color: '#00f3ff' }, opacity: 0.7, nbinsx: 20, name: 'Final positions' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Final position'), yaxis: axStyle(null, 'Count'), height: 400
        }), { responsive: true });

        var spread = 2 * Math.sqrt(sys.nSteps * sys.p * (1 - sys.p));
        document.getElementById('bw-stats3').innerHTML =
            '<span><strong>' + sys.label + ' (p = ' + sys.p + ')</strong></span>' +
            '<span>Drift = ' + drift.toFixed(0) + '  |  Spread = ' + spread.toFixed(1) + '  |  SNR = ' + (drift / spread).toFixed(2) + '</span>';
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('bw-racePlot')) { setTimeout(initializePlots, 100); return; }

        var ph = function(ids, text) {
            ids.forEach(function(id) {
                Plotly.react(id, [], Object.assign({}, darkLayout, {
                    xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: id === 'bw-racePlot' ? 420 : 400,
                    annotations: [{ x: 0.5, y: 0.5, text: text, font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
                }), { responsive: true });
            });
        };

        ph(['bw-racePlot'], 'Click "Run"');
        ph(['bw-snrPlot', 'bw-detectPlot'], 'Click "Compute SNR"');
        ph(['bw-physTrajPlot', 'bw-physHistPlot'], 'Click "Run Simulation"');

        document.getElementById('bw-p-slider').addEventListener('input', function() {
            document.getElementById('bw-p-value').textContent = parseFloat(this.value).toFixed(2);
        });
        document.getElementById('bw-maxN-slider').addEventListener('input', function() {
            document.getElementById('bw-maxN-value').textContent = this.value;
        });
    }

    initializePlots();
})();
