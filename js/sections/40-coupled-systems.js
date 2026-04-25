(function() {
    'use strict';

    // ===== Shared layout =====
    var darkLayout = {
        template: 'plotly_dark',
        margin: { t: 30, r: 20, b: 45, l: 55 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    };

    function axStyle(range, title) {
        return {
            gridcolor: '#2a2f4a',
            zerolinecolor: '#808080',
            linecolor: '#808080',
            range: range,
            title: title || ''
        };
    }

    // ===== Vector Euler solver =====
    function eulerSystem(f, y0, tMax, h) {
        var n = Math.round(tMax / h);
        var t = [0], Y = [y0.slice()];
        var y = y0.slice(), ti = 0;
        for (var i = 0; i < n; i++) {
            var dy = f(y, ti);
            var yNew = [];
            for (var j = 0; j < y.length; j++) {
                yNew.push(y[j] + h * dy[j]);
            }
            y = yNew; ti += h;
            t.push(ti); Y.push(y.slice());
            if (Math.abs(y[0]) > 1e6 || Math.abs(y[1]) > 1e6) break;
        }
        return { t: t, Y: Y };
    }

    // ===== System library =====
    var systems = [
        {
            name: 'Harmonic Oscillator',
            f: function(y) { return [y[1], -y[0]]; },
            xRange: [-3.5, 3.5], yRange: [-3.5, 3.5],
            tRange: [0, 20], tMax: 20,
            xLabel: 'x', yLabel: 'v',
            defX0: 2.0, defY0: 0.0,
            orbitType: 'Center (closed orbits)',
            fieldRange: [-3, 3]
        },
        {
            name: 'Damped Oscillator',
            f: function(y) { return [y[1], -y[0] - 0.3 * y[1]]; },
            xRange: [-3.5, 3.5], yRange: [-3.5, 3.5],
            tRange: [0, 25], tMax: 25,
            xLabel: 'x', yLabel: 'v',
            defX0: 2.0, defY0: 0.0,
            orbitType: 'Stable spiral',
            fieldRange: [-3, 3]
        },
        {
            name: 'Predator-Prey',
            f: function(y) {
                return [y[0] * (1.5 - y[1]), y[1] * (y[0] - 1.0)];
            },
            xRange: [-0.5, 5], yRange: [-0.5, 5],
            tRange: [0, 15], tMax: 15,
            xLabel: 'Prey (x)', yLabel: 'Predator (y)',
            defX0: 1.0, defY0: 1.0,
            orbitType: 'Periodic orbit',
            fieldRange: [0.1, 4.5],
            fieldCenter: [2.25, 2.25]
        },
        {
            name: 'Van der Pol',
            f: function(y) {
                return [y[1], 2 * (1 - y[0] * y[0]) * y[1] - y[0]];
            },
            xRange: [-4, 4], yRange: [-6, 6],
            tRange: [0, 30], tMax: 30,
            xLabel: 'x', yLabel: 'v',
            defX0: 0.1, defY0: 0.0,
            orbitType: 'Limit cycle',
            fieldRange: [-3.5, 3.5],
            fieldYRange: [-5, 5]
        }
    ];

    // ===== Explorer 1: System Solver =====
    function plotSolver() {
        var idx = parseInt(document.getElementById('coupledSys-system').value);
        var x0 = parseFloat(document.getElementById('coupledSys-x0-slider').value);
        var y0 = parseFloat(document.getElementById('coupledSys-y0-slider').value);
        var h = parseFloat(document.getElementById('coupledSys-h-slider').value);
        var sys = systems[idx];

        // Adjust ICs for predator-prey (must be positive)
        if (idx === 2) {
            x0 = Math.max(0.1, Math.abs(x0));
            y0 = Math.max(0.1, Math.abs(y0));
        }

        var sol = eulerSystem(sys.f, [x0, y0], sys.tMax, h);

        // Extract arrays
        var tArr = sol.t;
        var xArr = [], yArr = [];
        for (var i = 0; i < sol.Y.length; i++) {
            xArr.push(sol.Y[i][0]);
            yArr.push(sol.Y[i][1]);
        }

        // Left: time domain
        Plotly.newPlot('coupledSys-timePlot', [
            { x: tArr, y: xArr, type: 'scatter', mode: 'lines',
              name: sys.xLabel, line: { color: '#00f3ff', width: 2 } },
            { x: tArr, y: yArr, type: 'scatter', mode: 'lines',
              name: sys.yLabel, line: { color: '#ff6b6b', width: 2 } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(sys.tRange, 't'),
            yaxis: axStyle(null, 'Value'),
            showlegend: true,
            legend: { x: 0.6, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: phase portrait
        Plotly.newPlot('coupledSys-phasePlot', [
            { x: xArr, y: yArr, type: 'scatter', mode: 'lines',
              name: 'Trajectory', line: { color: '#00ff9f', width: 2 } },
            { x: [xArr[0]], y: [yArr[0]], type: 'scatter', mode: 'markers',
              name: 'Start', marker: { color: '#ffff00', size: 10, symbol: 'star' } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(sys.xRange, sys.xLabel),
            yaxis: axStyle(sys.yRange, sys.yLabel),
            showlegend: true,
            legend: { x: 0.6, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Stats
        var last = sol.Y[sol.Y.length - 1];
        var el;
        el = document.getElementById('coupledSys-steps');
        if (el) el.textContent = sol.t.length - 1;
        el = document.getElementById('coupledSys-finalX');
        if (el) el.textContent = last[0].toFixed(3);
        el = document.getElementById('coupledSys-finalY');
        if (el) el.textContent = last[1].toFixed(3);
        el = document.getElementById('coupledSys-orbitType');
        if (el) el.textContent = sys.orbitType;
    }

    // ===== Explorer 2: Vector Field Explorer =====
    function computeQuiver(sys, n) {
        var fr = sys.fieldRange;
        var xMin = fr[0], xMax = fr[1];
        var yMin = sys.fieldYRange ? sys.fieldYRange[0] : fr[0];
        var yMax = sys.fieldYRange ? sys.fieldYRange[1] : fr[1];
        if (sys.fieldCenter) {
            xMin = sys.fieldCenter[0] - (fr[1] - fr[0]) / 2;
            xMax = sys.fieldCenter[0] + (fr[1] - fr[0]) / 2;
            yMin = sys.fieldCenter[1] - (fr[1] - fr[0]) / 2;
            yMax = sys.fieldCenter[1] + (fr[1] - fr[0]) / 2;
        }

        var lineX = [], lineY = [], colors = [];
        var dx = (xMax - xMin) / (n - 1);
        var dy = (yMax - yMin) / (n - 1);
        var arrowScale = Math.min(dx, dy) * 0.4;

        for (var i = 0; i < n; i++) {
            for (var j = 0; j < n; j++) {
                var x = xMin + dx * i;
                var y = yMin + dy * j;
                var dxy = sys.f([x, y], 0);
                var mag = Math.sqrt(dxy[0] * dxy[0] + dxy[1] * dxy[1]);
                if (mag < 1e-10) continue;

                var s = arrowScale / mag;
                var tipX = x + s * dxy[0];
                var tipY = y + s * dxy[1];

                lineX.push(x, tipX, null);
                lineY.push(y, tipY, null);
            }
        }
        return { lineX: lineX, lineY: lineY };
    }

    function plotField() {
        var idx = parseInt(document.getElementById('coupledSys-field-system').value);
        var x0 = parseFloat(document.getElementById('coupledSys-field-x0-slider').value);
        var y0 = parseFloat(document.getElementById('coupledSys-field-y0-slider').value);
        var sys = systems[idx];

        if (idx === 2) {
            x0 = Math.max(0.1, Math.abs(x0));
            y0 = Math.max(0.1, Math.abs(y0));
        }

        var quiver = computeQuiver(sys, 18);

        // Euler trajectory
        var sol = eulerSystem(sys.f, [x0, y0], sys.tMax, 0.02);
        var xArr = [], yArr = [];
        for (var i = 0; i < sol.Y.length; i++) {
            xArr.push(sol.Y[i][0]);
            yArr.push(sol.Y[i][1]);
        }

        var traces = [
            // Vector field arrows
            { x: quiver.lineX, y: quiver.lineY, type: 'scatter', mode: 'lines',
              line: { color: 'rgba(128,128,128,0.4)', width: 1.2 },
              hoverinfo: 'skip', showlegend: false },
            // Trajectory
            { x: xArr, y: yArr, type: 'scatter', mode: 'lines',
              name: 'Trajectory', line: { color: '#00f3ff', width: 2.5 } },
            // Start point
            { x: [x0], y: [y0], type: 'scatter', mode: 'markers',
              name: 'Start', marker: { color: '#ffff00', size: 10, symbol: 'star' } }
        ];

        Plotly.newPlot('coupledSys-fieldPlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle(sys.xRange, sys.xLabel),
            yaxis: axStyle(sys.yRange, sys.yLabel),
            showlegend: true,
            legend: { x: 0.7, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });
    }

    // ===== Explorer 3: Portrait Builder =====
    var portraitTraces = [];
    var portraitColors = [
        '#00f3ff', '#ff6b6b', '#00ff9f', '#ffff00',
        '#ff00ff', '#ff8c00', '#7b68ee', '#00ced1',
        '#ff69b4', '#adff2f', '#da70d6', '#ffa07a',
        '#87ceeb', '#98fb98', '#dda0dd', '#f0e68c'
    ];
    var colorIdx = 0;

    function plotPortrait() {
        var idx = parseInt(document.getElementById('coupledSys-portrait-system').value);
        var sys = systems[idx];

        var quiver = computeQuiver(sys, 14);

        var traces = [
            // Vector field (faint background)
            { x: quiver.lineX, y: quiver.lineY, type: 'scatter', mode: 'lines',
              line: { color: 'rgba(128,128,128,0.25)', width: 1 },
              hoverinfo: 'skip', showlegend: false }
        ];

        // Add stored trajectories
        for (var i = 0; i < portraitTraces.length; i++) {
            traces.push(portraitTraces[i]);
        }

        Plotly.newPlot('coupledSys-portraitPlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle(sys.xRange, sys.xLabel),
            yaxis: axStyle(sys.yRange, sys.yLabel),
            showlegend: false
        }), { responsive: true });

        var el = document.getElementById('coupledSys-trajCount');
        if (el) el.textContent = portraitTraces.length;
    }

    function launchRing() {
        var idx = parseInt(document.getElementById('coupledSys-portrait-system').value);
        var radius = parseFloat(document.getElementById('coupledSys-radius-slider').value);
        var count = parseInt(document.getElementById('coupledSys-count-slider').value);
        var sys = systems[idx];

        // Compute center for predator-prey
        var cx = 0, cy = 0;
        if (idx === 2) { cx = 1.0; cy = 1.5; }

        for (var i = 0; i < count; i++) {
            var angle = 2 * Math.PI * i / count;
            var x0 = cx + radius * Math.cos(angle);
            var y0 = cy + radius * Math.sin(angle);

            if (idx === 2) {
                x0 = Math.max(0.05, x0);
                y0 = Math.max(0.05, y0);
            }

            var sol = eulerSystem(sys.f, [x0, y0], sys.tMax, 0.02);
            var xArr = [], yArr = [];
            for (var k = 0; k < sol.Y.length; k++) {
                xArr.push(sol.Y[k][0]);
                yArr.push(sol.Y[k][1]);
            }

            var c = portraitColors[colorIdx % portraitColors.length];
            colorIdx++;

            portraitTraces.push({
                x: xArr, y: yArr, type: 'scatter', mode: 'lines',
                line: { color: c, width: 1.5 }, showlegend: false
            });
        }

        var el = document.getElementById('coupledSys-ringR');
        if (el) el.textContent = radius.toFixed(1);

        plotPortrait();
    }

    // ===== Event handlers =====
    function attachHandlers() {
        // Explorer 1
        var sysSel = document.getElementById('coupledSys-system');
        if (sysSel) sysSel.addEventListener('change', function() {
            // Update slider ranges for predator-prey
            var idx = parseInt(this.value);
            var sys = systems[idx];
            var x0S = document.getElementById('coupledSys-x0-slider');
            var y0S = document.getElementById('coupledSys-y0-slider');
            if (idx === 2) {
                x0S.min = '0.1'; x0S.max = '4'; x0S.value = sys.defX0;
                y0S.min = '0.1'; y0S.max = '4'; y0S.value = sys.defY0;
            } else {
                x0S.min = '-3'; x0S.max = '3'; x0S.value = sys.defX0;
                y0S.min = '-3'; y0S.max = '3'; y0S.value = sys.defY0;
            }
            document.getElementById('coupledSys-x0-value').textContent = parseFloat(x0S.value).toFixed(1);
            document.getElementById('coupledSys-y0-value').textContent = parseFloat(y0S.value).toFixed(1);
            plotSolver();
        });

        var sliders1 = ['coupledSys-x0-slider', 'coupledSys-y0-slider', 'coupledSys-h-slider'];
        var labels1 = ['coupledSys-x0-value', 'coupledSys-y0-value', 'coupledSys-h-value'];
        for (var i = 0; i < sliders1.length; i++) {
            (function(sid, lid) {
                var el = document.getElementById(sid);
                if (el) el.addEventListener('input', function() {
                    document.getElementById(lid).textContent = parseFloat(this.value).toFixed(2);
                    plotSolver();
                });
            })(sliders1[i], labels1[i]);
        }

        // Explorer 2
        var fieldSel = document.getElementById('coupledSys-field-system');
        if (fieldSel) fieldSel.addEventListener('change', function() {
            var idx = parseInt(this.value);
            var sys = systems[idx];
            var x0S = document.getElementById('coupledSys-field-x0-slider');
            var y0S = document.getElementById('coupledSys-field-y0-slider');
            if (idx === 2) {
                x0S.min = '0.1'; x0S.max = '4'; x0S.value = sys.defX0;
                y0S.min = '0.1'; y0S.max = '4'; y0S.value = sys.defY0;
            } else {
                x0S.min = '-3'; x0S.max = '3'; x0S.value = sys.defX0;
                y0S.min = '-3'; y0S.max = '3'; y0S.value = sys.defY0;
            }
            document.getElementById('coupledSys-field-x0-value').textContent = parseFloat(x0S.value).toFixed(1);
            document.getElementById('coupledSys-field-y0-value').textContent = parseFloat(y0S.value).toFixed(1);
            plotField();
        });

        var sliders2 = ['coupledSys-field-x0-slider', 'coupledSys-field-y0-slider'];
        var labels2 = ['coupledSys-field-x0-value', 'coupledSys-field-y0-value'];
        for (var i = 0; i < sliders2.length; i++) {
            (function(sid, lid) {
                var el = document.getElementById(sid);
                if (el) el.addEventListener('input', function() {
                    document.getElementById(lid).textContent = parseFloat(this.value).toFixed(1);
                    plotField();
                });
            })(sliders2[i], labels2[i]);
        }

        // Explorer 3
        var portSel = document.getElementById('coupledSys-portrait-system');
        if (portSel) portSel.addEventListener('change', function() {
            portraitTraces = [];
            colorIdx = 0;
            plotPortrait();
        });

        var sliders3 = ['coupledSys-radius-slider', 'coupledSys-count-slider'];
        var labels3 = ['coupledSys-radius-value', 'coupledSys-count-value'];
        for (var i = 0; i < sliders3.length; i++) {
            (function(sid, lid) {
                var el = document.getElementById(sid);
                if (el) el.addEventListener('input', function() {
                    var v = parseFloat(this.value);
                    document.getElementById(lid).textContent = (sid.indexOf('count') >= 0) ? v : v.toFixed(1);
                });
            })(sliders3[i], labels3[i]);
        }
    }

    // ===== Global functions =====
    window.coupledSysSolverReset = function() {
        var idx = parseInt(document.getElementById('coupledSys-system').value);
        var sys = systems[idx];
        document.getElementById('coupledSys-x0-slider').value = sys.defX0;
        document.getElementById('coupledSys-y0-slider').value = sys.defY0;
        document.getElementById('coupledSys-h-slider').value = 0.05;
        document.getElementById('coupledSys-x0-value').textContent = sys.defX0.toFixed(1);
        document.getElementById('coupledSys-y0-value').textContent = sys.defY0.toFixed(1);
        document.getElementById('coupledSys-h-value').textContent = '0.05';
        plotSolver();
    };

    window.coupledSysFieldReset = function() {
        var idx = parseInt(document.getElementById('coupledSys-field-system').value);
        var sys = systems[idx];
        document.getElementById('coupledSys-field-x0-slider').value = sys.defX0;
        document.getElementById('coupledSys-field-y0-slider').value = sys.defY0;
        document.getElementById('coupledSys-field-x0-value').textContent = sys.defX0.toFixed(1);
        document.getElementById('coupledSys-field-y0-value').textContent = sys.defY0.toFixed(1);
        plotField();
    };

    window.coupledSysLaunchRing = launchRing;

    window.coupledSysPortraitReset = function() {
        portraitTraces = [];
        colorIdx = 0;
        document.getElementById('coupledSys-radius-slider').value = 1.0;
        document.getElementById('coupledSys-count-slider').value = 8;
        document.getElementById('coupledSys-radius-value').textContent = '1.0';
        document.getElementById('coupledSys-count-value').textContent = '8';
        plotPortrait();
    };

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }

        var el = document.getElementById('coupledSys-timePlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        plotSolver();
        plotField();
        plotPortrait();
        attachHandlers();
    }

    initializePlots();
})();
