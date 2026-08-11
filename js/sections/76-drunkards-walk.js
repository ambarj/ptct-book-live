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

    var colors = ['#00f3ff','#ff006e','#ffbe0b','#00ff88','#bb86fc','#ff5722','#76ff03','#40c4ff'];

    // ===============================================================
    // EXPLORER 1: Single Walker
    // ===============================================================
    var walkState = { positions: [0], steps: 0, allFinals: [] };

    function drawSingleWalk() {
        var pos = walkState.positions;
        var x = pos[pos.length - 1];
        var range = Math.max(20, Math.abs(x) + 5);

        // Number line
        Plotly.react('dw-numberLine', [
            { x: [x], y: [0], type: 'scatter', mode: 'markers',
              marker: { color: '#00f3ff', size: 16, line: { color: 'white', width: 2 } },
              hoverinfo: 'none', showlegend: false },
            { x: [0], y: [0], type: 'scatter', mode: 'markers',
              marker: { color: '#808080', size: 8, symbol: 'diamond' },
              hoverinfo: 'none', showlegend: false }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-range, range], ''), { dtick: 5 }),
            yaxis: Object.assign(axStyle([-0.5, 0.5], ''), { showticklabels: false, showgrid: false }),
            height: 200
        }), { responsive: true });

        // Trajectory
        Plotly.react('dw-trajPlot', [
            { y: pos, type: 'scatter', mode: 'lines', name: 'position',
              line: { color: '#00f3ff', width: 1.5 }, showlegend: false },
            { x: [0, pos.length], y: [0, 0], type: 'scatter', mode: 'lines',
              line: { color: '#808080', width: 1, dash: 'dot' }, showlegend: false, hoverinfo: 'skip' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, Math.max(pos.length, 20)], 'Step'),
            yaxis: axStyle(null, 'Position x'), height: 250
        }), { responsive: true });

        // Histogram of final positions (accumulated walks)
        if (walkState.allFinals.length > 0) {
            Plotly.react('dw-histPlot', [
                { x: walkState.allFinals, type: 'histogram', marker: { color: '#00f3ff' },
                  opacity: 0.7, nbinsx: 20, name: 'Final positions' }
            ], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, 'Final position'), yaxis: axStyle(null, 'Count'), height: 460
            }), { responsive: true });
        } else {
            Plotly.react('dw-histPlot', [], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 460,
                annotations: [{ x: 0.5, y: 0.5, text: 'Click "New Walk" to record this walk\u2019s final position here',
                    font: { color: '#aaa', size: 12 }, showarrow: false, xref: 'paper', yref: 'paper' }]
            }), { responsive: true });
        }

        document.getElementById('dw-stats1').innerHTML =
            '<span><strong>Step ' + walkState.steps + '  |  Position: ' + x + '</strong></span>' +
            '<span>Walks completed: ' + walkState.allFinals.length + '  |  RMS expected: √' + walkState.steps + ' = ' + Math.sqrt(walkState.steps).toFixed(1) + '</span>';
    }

    function doStep() {
        var step = Math.random() < 0.5 ? 1 : -1;
        walkState.steps++;
        walkState.positions.push(walkState.positions[walkState.positions.length - 1] + step);
    }

    window.dwStep = function() { doStep(); drawSingleWalk(); };
    window.dwWalk100 = function() { for (var i = 0; i < 100; i++) doStep(); drawSingleWalk(); };
    window.dwNewWalk = function() {
        if (walkState.steps > 0) walkState.allFinals.push(walkState.positions[walkState.positions.length - 1]);
        walkState.positions = [0]; walkState.steps = 0;
        drawSingleWalk();
    };
    window.dwReset = function() {
        walkState = { positions: [0], steps: 0, allFinals: [] };
        drawSingleWalk();
    };

    // ===============================================================
    // EXPLORER 2: Many Walkers
    // ===============================================================
    window.dwManyRun = function() {
        var nW = parseInt(document.getElementById('dw-nwalkers-value').textContent);
        var nS = parseInt(document.getElementById('dw-nsteps-value').textContent);

        var trajTraces = [], finals = [];
        var showMax = Math.min(nW, 30);

        for (var w = 0; w < nW; w++) {
            var pos = [0], x = 0;
            for (var s = 0; s < nS; s++) { x += Math.random() < 0.5 ? 1 : -1; pos.push(x); }
            finals.push(x);
            if (w < showMax) {
                trajTraces.push({ y: pos, type: 'scatter', mode: 'lines', hoverinfo: 'skip', opacity: 0.5,
                    line: { color: colors[w % 8], width: 0.8 }, showlegend: false });
            }
        }

        // Envelope
        var envX = [], envUp = [], envDown = [];
        for (var s = 0; s <= nS; s += Math.max(1, Math.floor(nS / 100))) {
            envX.push(s); envUp.push(Math.sqrt(s)); envDown.push(-Math.sqrt(s));
        }
        trajTraces.push({ x: envX, y: envUp, type: 'scatter', mode: 'lines',
            line: { color: 'white', width: 2, dash: 'dash' }, name: '±√N' });
        trajTraces.push({ x: envX, y: envDown, type: 'scatter', mode: 'lines',
            line: { color: 'white', width: 2, dash: 'dash' }, showlegend: false, hoverinfo: 'skip' });

        Plotly.react('dw-manyTrajPlot', trajTraces, Object.assign({}, darkLayout, {
            xaxis: axStyle([0, nS], 'Step'), yaxis: axStyle(null, 'Position'),
            height: 400, legend: { x: 0.8, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        Plotly.react('dw-manyHistPlot', [
            { x: finals, type: 'histogram', marker: { color: '#00f3ff' }, opacity: 0.7, nbinsx: 25, name: 'Final positions' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Final position'), yaxis: axStyle(null, 'Count'), height: 400
        }), { responsive: true });

        var mean = finals.reduce(function(a, b) { return a + b; }, 0) / nW;
        var rms = Math.sqrt(finals.reduce(function(a, b) { return a + b * b; }, 0) / nW);
        document.getElementById('dw-stats2').innerHTML =
            '<span><strong>' + nW + ' walkers, ' + nS + ' steps</strong></span>' +
            '<span>⟨x⟩ = ' + mean.toFixed(1) + '  |  RMS = ' + rms.toFixed(1) + '  |  Theory: √' + nS + ' = ' + Math.sqrt(nS).toFixed(1) + '</span>';
    };

    // ===============================================================
    // EXPLORER 3: Biased Walk
    // ===============================================================
    window.dwBiasRun = function() {
        var p = parseFloat(document.getElementById('dw-p-slider').value);
        var nS = parseInt(document.getElementById('dw-bias-steps-value').textContent);
        var nW = 30;
        var drift = 2 * p - 1;

        var trajTraces = [], finals = [];
        for (var w = 0; w < nW; w++) {
            var pos = [0], x = 0;
            for (var s = 0; s < nS; s++) { x += Math.random() < p ? 1 : -1; pos.push(x); }
            finals.push(x);
            if (w < 15) {
                trajTraces.push({ y: pos, type: 'scatter', mode: 'lines', hoverinfo: 'skip', opacity: 0.5,
                    line: { color: colors[w % 8], width: 1 }, showlegend: false });
            }
        }

        // Drift line
        var driftLine = [];
        for (var s = 0; s <= nS; s += Math.max(1, Math.floor(nS / 100))) driftLine.push({ x: s, y: drift * s });
        trajTraces.push({ x: driftLine.map(function(d) { return d.x; }), y: driftLine.map(function(d) { return d.y; }),
            type: 'scatter', mode: 'lines', line: { color: '#ffbe0b', width: 2.5, dash: 'dash' },
            name: 'Drift: ' + (drift * nS).toFixed(0) });

        Plotly.react('dw-biasPlot', trajTraces, Object.assign({}, darkLayout, {
            xaxis: axStyle([0, nS], 'Step'), yaxis: axStyle(null, 'Position'),
            height: 400, legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        Plotly.react('dw-biasHistPlot', [
            { x: finals, type: 'histogram', marker: { color: '#00f3ff' }, opacity: 0.7, nbinsx: 20, name: 'Final positions' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Final position'), yaxis: axStyle(null, 'Count'), height: 400
        }), { responsive: true });

        var mean = finals.reduce(function(a, b) { return a + b; }, 0) / nW;
        document.getElementById('dw-stats3').innerHTML =
            '<span><strong>p = ' + p.toFixed(2) + ', drift/step = ' + drift.toFixed(2) + '</strong></span>' +
            '<span>⟨x⟩ = ' + mean.toFixed(1) + ' (theory: ' + (drift * nS).toFixed(1) + ')  |  σ = √(' + nS + '·4pq) = ' + (2 * Math.sqrt(nS * p * (1 - p))).toFixed(1) + '</span>';
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('dw-numberLine')) { setTimeout(initializePlots, 100); return; }

        drawSingleWalk();

        var ph = function(ids, text) {
            ids.forEach(function(id) {
                Plotly.react(id, [], Object.assign({}, darkLayout, {
                    xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
                    annotations: [{ x: 0.5, y: 0.5, text: text, font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
                }), { responsive: true });
            });
        };

        ph(['dw-manyTrajPlot', 'dw-manyHistPlot'], 'Click "Launch"');
        ph(['dw-biasPlot', 'dw-biasHistPlot'], 'Click "Run 30 Walkers"');

        document.getElementById('dw-nwalkers-slider').addEventListener('input', function() {
            document.getElementById('dw-nwalkers-value').textContent = this.value;
        });
        document.getElementById('dw-nsteps-slider').addEventListener('input', function() {
            document.getElementById('dw-nsteps-value').textContent = this.value;
        });
        document.getElementById('dw-p-slider').addEventListener('input', function() {
            document.getElementById('dw-p-value').textContent = parseFloat(this.value).toFixed(2);
        });
        document.getElementById('dw-bias-steps-slider').addEventListener('input', function() {
            document.getElementById('dw-bias-steps-value').textContent = this.value;
        });
    }

    initializePlots();
})();
