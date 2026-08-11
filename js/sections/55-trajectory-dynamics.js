(function() {
    'use strict';

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

    var trajColors = ['#00f3ff', '#ff006e', '#ffbe0b', '#00ff88',
                      '#bb86fc', '#ff5722', '#76ff03', '#40c4ff',
                      '#e040fb', '#ff9800', '#00e5ff', '#69f0ae'];

    // ===== General RK4 solver (full trajectory) =====
    function rk4Solve(f, g, x0, y0, T, N) {
        var h = T / N, X = [x0], Y = [y0], t = [0];
        var x = x0, y = y0;
        for (var i = 0; i < N; i++) {
            var k1x = f(x, y),                            k1y = g(x, y);
            var k2x = f(x + h/2*k1x, y + h/2*k1y),      k2y = g(x + h/2*k1x, y + h/2*k1y);
            var k3x = f(x + h/2*k2x, y + h/2*k2y),      k3y = g(x + h/2*k2x, y + h/2*k2y);
            var k4x = f(x + h*k3x, y + h*k3y),           k4y = g(x + h*k3x, y + h*k3y);
            x += h / 6 * (k1x + 2*k2x + 2*k3x + k4x);
            y += h / 6 * (k1y + 2*k2y + 2*k3y + k4y);
            if (Math.abs(x) > 20 || Math.abs(y) > 20) break;
            X.push(x); Y.push(y); t.push((i + 1) * h);
        }
        return { X: X, Y: Y, t: t };
    }

    // ===== RK4 endpoint-only (for basin mapping) =====
    function rk4Endpoint(f, g, x0, y0, T, N) {
        var h = T / N, x = x0, y = y0;
        for (var i = 0; i < N; i++) {
            var k1x = f(x, y),                            k1y = g(x, y);
            var k2x = f(x + h/2*k1x, y + h/2*k1y),      k2y = g(x + h/2*k1x, y + h/2*k1y);
            var k3x = f(x + h/2*k2x, y + h/2*k2y),      k3y = g(x + h/2*k2x, y + h/2*k2y);
            var k4x = f(x + h*k3x, y + h*k3y),           k4y = g(x + h*k3x, y + h*k3y);
            x += h / 6 * (k1x + 2*k2x + 2*k3x + k4x);
            y += h / 6 * (k1y + 2*k2y + 2*k3y + k4y);
            if (Math.abs(x) > 50 || Math.abs(y) > 50) break;
        }
        return [x, y];
    }

    // ===== Vector field arrows (general nonlinear) =====
    function fieldArrows(f, g, xR, yR, n) {
        var ax = [], ay = [];
        var dx = (xR[1] - xR[0]) / (n - 1);
        var dy = (yR[1] - yR[0]) / (n - 1);
        var sc = Math.min(dx, dy) * 0.35;
        for (var i = 0; i < n; i++) {
            for (var j = 0; j < n; j++) {
                var px = xR[0] + i * dx, py = yR[0] + j * dy;
                var fx = f(px, py), fy = g(px, py);
                var mag = Math.sqrt(fx * fx + fy * fy);
                if (mag < 1e-8) continue;
                ax.push(px, px + fx / mag * sc, null);
                ay.push(py, py + fy / mag * sc, null);
            }
        }
        return { x: ax, y: ay };
    }

    // ===============================================================
    // EXPLORER 1: Trajectory Launcher — system definitions
    // ===============================================================
    var sys1 = {
        center: {
            name: 'Center (SHO)',
            f: function(x, y) { return y; },
            g: function(x, y) { return -x; },
            xR: [-3, 3], yR: [-3, 3], T: 8, fp: [0, 0],
            info: 'ẋ = y, ẏ = -x  |  λ = ±i',
            aspect: true, xl: 'x', yl: 'y'
        },
        stableSpiral: {
            name: 'Stable Spiral',
            f: function(x, y) { return -0.2 * x + y; },
            g: function(x, y) { return -x - 0.2 * y; },
            xR: [-3, 3], yR: [-3, 3], T: 25, fp: [0, 0],
            info: 'ẋ = -0.2x+y, ẏ = -x-0.2y  |  λ = -0.2±0.98i',
            aspect: true, xl: 'x', yl: 'y'
        },
        saddle: {
            name: 'Saddle',
            f: function(x, y) { return 2 * x; },
            g: function(x, y) { return -y; },
            xR: [-3, 3], yR: [-3, 3], T: 3, fp: [0, 0],
            info: 'ẋ = 2x, ẏ = -y  |  λ₁ = 2, λ₂ = -1',
            aspect: true, xl: 'x', yl: 'y'
        },
        predatorPrey: {
            name: 'Predator-Prey',
            f: function(x, y) { return x * (2 - y); },
            g: function(x, y) { return y * (-1 + x); },
            xR: [0, 4.5], yR: [0, 4.5], T: 15, fp: [1, 2],
            info: 'ẋ = x(2-y), ẏ = y(-1+x)  |  FP: (1,2)',
            aspect: false, xl: 'Prey', yl: 'Predator'
        }
    };

    var launched = [];

    function drawExplorer1() {
        var key = document.getElementById('td-system1').value;
        var s = sys1[key];

        // Vector field
        var arr = fieldArrows(s.f, s.g, s.xR, s.yR, 10);
        var traces = [{
            x: arr.x, y: arr.y, type: 'scatter', mode: 'lines',
            line: { color: 'rgba(150,150,150,0.3)', width: 1 },
            hoverinfo: 'none', showlegend: false
        }];

        // Accumulated trajectories
        for (var i = 0; i < launched.length; i++) {
            traces.push({
                x: launched[i].X, y: launched[i].Y,
                type: 'scatter', mode: 'lines',
                line: { color: trajColors[i % trajColors.length], width: 1.5 },
                hoverinfo: 'none', showlegend: false
            });
            traces.push({
                x: [launched[i].X[0]], y: [launched[i].Y[0]],
                type: 'scatter', mode: 'markers',
                marker: { color: trajColors[i % trajColors.length], size: 6,
                          line: { color: 'white', width: 1 } },
                hoverinfo: 'none', showlegend: false
            });
        }

        // Fixed point
        traces.push({
            x: [s.fp[0]], y: [s.fp[1]],
            type: 'scatter', mode: 'markers',
            marker: { color: '#ffbe0b', size: 10, symbol: 'circle',
                      line: { color: 'white', width: 2 } },
            hoverinfo: 'none', showlegend: false
        });

        var xax = axStyle(s.xR, s.xl);
        if (s.aspect) xax.scaleanchor = 'y';
        Plotly.react('td-phasePlot', traces, Object.assign({}, darkLayout, {
            xaxis: xax, yaxis: axStyle(s.yR, s.yl), height: 400
        }), { responsive: true });

        // Time series panel
        if (launched.length > 0) {
            var last = launched[launched.length - 1];
            Plotly.react('td-timePlot', [
                { x: last.t, y: last.X, type: 'scatter', mode: 'lines',
                  line: { color: '#00f3ff', width: 2 }, name: 'x(t)',
                  hoverinfo: 'none' },
                { x: last.t, y: last.Y, type: 'scatter', mode: 'lines',
                  line: { color: '#ff006e', width: 2 }, name: 'y(t)',
                  hoverinfo: 'none' }
            ], Object.assign({}, darkLayout, {
                xaxis: axStyle([0, s.T], 'Time t'),
                yaxis: axStyle(s.yR, 'Value'),
                height: 400,
                legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 11 } }
            }), { responsive: true });
        } else {
            Plotly.react('td-timePlot', [], Object.assign({}, darkLayout, {
                xaxis: axStyle([0, s.T], 'Time t'),
                yaxis: axStyle(s.yR, 'Value'),
                height: 400,
                annotations: [{ x: s.T / 2, y: (s.yR[0] + s.yR[1]) / 2,
                    text: 'Launch a trajectory to see x(t), y(t)',
                    showarrow: false, font: { color: '#808080', size: 14 } }]
            }), { responsive: true });
        }

        // Stats bar
        var x0 = parseFloat(document.getElementById('td-x0-slider').value);
        var y0 = parseFloat(document.getElementById('td-y0-slider').value);
        document.getElementById('td-stats1').innerHTML =
            '<span><strong>' + s.name + '</strong></span>' +
            '<span>IC: (' + x0.toFixed(1) + ', ' + y0.toFixed(1) + ')</span>' +
            '<span>' + s.info + '</span>' +
            '<span>Trajectories: ' + launched.length + '</span>';
    }

    // ===============================================================
    // EXPLORER 2: Basin of Attraction Mapper
    // ===============================================================
    var sys2 = {
        competition: {
            name: 'Competing Species',
            f: function(x, y) { return x * (3 - x - 2 * y); },
            g: function(x, y) { return y * (2 - x - y); },
            xR: [0.01, 3.99], yR: [0.01, 2.99],
            plotXR: [0, 4], plotYR: [0, 3],
            attractors: [[3, 0], [0, 2]],
            fps: [
                { x: 3, y: 0, label: 'Stable' },
                { x: 0, y: 2, label: 'Stable' },
                { x: 1, y: 1, label: 'Saddle' },
                { x: 0, y: 0, label: 'Unstable' }
            ],
            colors: ['#00f3ff', '#ff006e'],
            T: 30, N: 500, nx: 50, ny: 38,
            xl: 'Species 1', yl: 'Species 2'
        },
        doubleWell: {
            name: 'Damped Double-Well',
            f: function(x, y) { return y; },
            g: function(x, y) { return x - x * x * x - 0.5 * y; },
            xR: [-2.5, 2.5], yR: [-2.5, 2.5],
            plotXR: [-2.5, 2.5], plotYR: [-2.5, 2.5],
            attractors: [[-1, 0], [1, 0]],
            fps: [
                { x: -1, y: 0, label: 'Stable' },
                { x: 1, y: 0, label: 'Stable' },
                { x: 0, y: 0, label: 'Saddle' }
            ],
            colors: ['#bb86fc', '#00ff88'],
            T: 30, N: 500, nx: 50, ny: 50,
            xl: 'x', yl: 'ẋ'
        }
    };

    function drawBasin() {
        var key = document.getElementById('td-basin-system').value;
        var s = sys2[key];

        var xs = [], ys = [];
        for (var i = 0; i < s.nx; i++) xs.push(s.xR[0] + i * (s.xR[1] - s.xR[0]) / (s.nx - 1));
        for (var j = 0; j < s.ny; j++) ys.push(s.yR[0] + j * (s.yR[1] - s.yR[0]) / (s.ny - 1));

        var z = [];
        for (var j = 0; j < s.ny; j++) {
            var row = [];
            for (var i = 0; i < s.nx; i++) {
                var ep = rk4Endpoint(s.f, s.g, xs[i], ys[j], s.T, s.N);
                var minD = Infinity, minK = 0;
                for (var k = 0; k < s.attractors.length; k++) {
                    var dx = ep[0] - s.attractors[k][0];
                    var dy = ep[1] - s.attractors[k][1];
                    var d = dx * dx + dy * dy;
                    if (d < minD) { minD = d; minK = k; }
                }
                row.push(minK);
            }
            z.push(row);
        }

        var traces = [{
            z: z, x: xs, y: ys, type: 'heatmap',
            colorscale: [[0, s.colors[0]], [1, s.colors[1]]],
            opacity: 0.5, showscale: false, hoverinfo: 'skip'
        }];

        for (var fi = 0; fi < s.fps.length; fi++) {
            var fp = s.fps[fi];
            traces.push({
                x: [fp.x], y: [fp.y], type: 'scatter', mode: 'markers+text',
                marker: { color: '#ffbe0b', size: 10,
                          line: { color: 'white', width: 2 } },
                text: [fp.label], textposition: 'top center',
                textfont: { color: 'white', size: 10 },
                hoverinfo: 'none', showlegend: false
            });
        }

        Plotly.react('td-basinPlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle(s.plotXR, s.xl),
            yaxis: axStyle(s.plotYR, s.yl),
            height: 440
        }), { responsive: true });

        var saddle = s.fps.filter(function(p) { return p.label === 'Saddle'; })[0];
        document.getElementById('td-stats2').innerHTML =
            '<span><strong>' + s.name + '</strong></span>' +
            '<span>Attractors: ' + s.attractors.length + '</span>' +
            '<span>Grid: ' + s.nx + '×' + s.ny + ' ICs</span>' +
            '<span>Saddle at (' + saddle.x + ', ' + saddle.y + ')</span>';
    }

    // ===============================================================
    // EXPLORER 3: Cloud Evolution (No-Crossing Principle)
    // ===============================================================
    var cloudCfg = {
        center:       { cx: 1.0, cy: 0.0, r: 0.3, T: 6.5 },
        stableSpiral: { cx: 1.5, cy: 0.0, r: 0.3, T: 15 },
        saddle:       { cx: 0.2, cy: 0.2, r: 0.2, T: 2.5 }
    };

    var cloudSnapshots = null;
    var cloudInitX = null, cloudInitY = null;
    var cloudCx = null, cloudCy = null;   // user-chosen center (click-to-place)
    var CLOUD_STEPS = 500, CLOUD_PTS = 40;

    function computeCloud() {
        var key = document.getElementById('td-cloud-system').value;
        var s = sys1[key];
        var cfg = cloudCfg[key];
        if (!cfg) return;

        var ccx = cloudCx !== null ? cloudCx : cfg.cx;
        var ccy = cloudCy !== null ? cloudCy : cfg.cy;
        var h = cfg.T / CLOUD_STEPS;
        var X = [], Y = [];
        for (var p = 0; p < CLOUD_PTS; p++) {
            var theta = p * 2 * Math.PI / CLOUD_PTS;
            X.push(ccx + cfg.r * Math.cos(theta));
            Y.push(ccy + cfg.r * Math.sin(theta));
        }
        cloudInitX = X.slice();
        cloudInitY = Y.slice();

        cloudSnapshots = [{ X: X.slice(), Y: Y.slice() }];
        for (var step = 0; step < CLOUD_STEPS; step++) {
            var newX = [], newY = [];
            for (var p = 0; p < CLOUD_PTS; p++) {
                var x = X[p], y = Y[p];
                var k1x = s.f(x, y),                          k1y = s.g(x, y);
                var k2x = s.f(x+h/2*k1x, y+h/2*k1y),         k2y = s.g(x+h/2*k1x, y+h/2*k1y);
                var k3x = s.f(x+h/2*k2x, y+h/2*k2y),         k3y = s.g(x+h/2*k2x, y+h/2*k2y);
                var k4x = s.f(x+h*k3x,   y+h*k3y),           k4y = s.g(x+h*k3x,   y+h*k3y);
                newX.push(x + h/6*(k1x + 2*k2x + 2*k3x + k4x));
                newY.push(y + h/6*(k1y + 2*k2y + 2*k3y + k4y));
            }
            X = newX; Y = newY;
            cloudSnapshots.push({ X: X.slice(), Y: Y.slice() });
        }
    }

    function drawCloudAtStep(step) {
        if (!cloudSnapshots || step >= cloudSnapshots.length) return;

        var key = document.getElementById('td-cloud-system').value;
        var s = sys1[key];
        var cfg = cloudCfg[key];
        var snap = cloudSnapshots[step];

        var arr = fieldArrows(s.f, s.g, s.xR, s.yR, 10);
        var polyX = snap.X.concat([snap.X[0]]);
        var polyY = snap.Y.concat([snap.Y[0]]);
        var initX = cloudInitX.concat([cloudInitX[0]]);
        var initY = cloudInitY.concat([cloudInitY[0]]);

        var traces = [
            { x: arr.x, y: arr.y, type: 'scatter', mode: 'lines',
              line: { color: 'rgba(150,150,150,0.25)', width: 1 },
              hoverinfo: 'none', showlegend: false },
            { x: initX, y: initY, type: 'scatter', mode: 'lines',
              line: { color: 'rgba(255,190,11,0.3)', width: 1, dash: 'dot' },
              hoverinfo: 'none', showlegend: false },
            { x: polyX, y: polyY, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2 },
              fill: 'toself', fillcolor: 'rgba(0,243,255,0.15)',
              hoverinfo: 'none', showlegend: false },
            { x: snap.X, y: snap.Y, type: 'scatter', mode: 'markers',
              marker: { color: '#00f3ff', size: 4 },
              hoverinfo: 'none', showlegend: false },
            { x: [s.fp[0]], y: [s.fp[1]], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 8, symbol: 'circle',
                        line: { color: 'white', width: 1.5 } },
              hoverinfo: 'none', showlegend: false }
        ];

        var xax = axStyle(s.xR, 'x');
        if (s.aspect) xax.scaleanchor = 'y';
        Plotly.react('td-cloudPlot', traces, Object.assign({}, darkLayout, {
            xaxis: xax, yaxis: axStyle(s.yR, 'y'), height: 440
        }), { responsive: true });

        var t = step * cfg.T / CLOUD_STEPS;
        document.getElementById('td-stats3').innerHTML =
            '<span><strong>' + s.name + '</strong></span>' +
            '<span>Time: ' + t.toFixed(2) + '</span>' +
            '<span>Cloud points: ' + CLOUD_PTS + '</span>';
    }

    // ===============================================================
    // Global functions
    // ===============================================================

    window.tdLaunch = function() {
        var key = document.getElementById('td-system1').value;
        var s = sys1[key];
        var x0 = parseFloat(document.getElementById('td-x0-slider').value);
        var y0 = parseFloat(document.getElementById('td-y0-slider').value);
        if (key === 'predatorPrey') {
            x0 = Math.max(0.05, x0);
            y0 = Math.max(0.05, y0);
        }
        launched.push(rk4Solve(s.f, s.g, x0, y0, s.T, 2000));
        drawExplorer1();
    };

    window.tdClear = function() {
        launched = [];
        drawExplorer1();
    };

    window.tdBasinReset = function() {
        drawBasin();
    };

    window.tdDropCloud = function() {
        computeCloud();
        document.getElementById('td-cloud-time').value = 0;
        document.getElementById('td-cloud-time-value').textContent = '0.0';
        drawCloudAtStep(0);
    };

    window.tdCloudReset = function() {
        cloudSnapshots = null;
        cloudCx = null; cloudCy = null;
        document.getElementById('td-cloud-time').value = 0;
        document.getElementById('td-cloud-time-value').textContent = '0.0';
        var key = document.getElementById('td-cloud-system').value;
        var s = sys1[key];
        var xax = axStyle(s.xR, 'x');
        if (s.aspect) xax.scaleanchor = 'y';
        Plotly.react('td-cloudPlot', [], Object.assign({}, darkLayout, {
            xaxis: xax, yaxis: axStyle(s.yR, 'y'), height: 440,
            annotations: [{ x: 0, y: 0, text: 'Click "Drop Cloud" to start',
                showarrow: false, font: { color: '#808080', size: 14 } }]
        }), { responsive: true });
        document.getElementById('td-stats3').innerHTML = '';
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }
        var el = document.getElementById('td-phasePlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Explorer 1
        drawExplorer1();
        document.getElementById('td-system1').addEventListener('change', function() {
            launched = [];
            drawExplorer1();
        });
        document.getElementById('td-x0-slider').addEventListener('input', function() {
            document.getElementById('td-x0-value').textContent =
                parseFloat(this.value).toFixed(1);
        });
        document.getElementById('td-y0-slider').addEventListener('input', function() {
            document.getElementById('td-y0-value').textContent =
                parseFloat(this.value).toFixed(1);
        });

        // Explorer 2
        drawBasin();
        document.getElementById('td-basin-system').addEventListener('change', drawBasin);

        // Explorer 3 — empty start
        window.tdCloudReset();
        document.getElementById('td-cloud-system').addEventListener('change', function() {
            cloudSnapshots = null;
            window.tdCloudReset();
        });
        // Click-to-place the cloud (native listener: plotly_click only
        // fires on data points, never empty canvas)
        var cp = document.getElementById('td-cloudPlot');
        if (cp && !cp._cloudClickBound) {
            cp._cloudClickBound = true;
            cp.addEventListener('click', function(e) {
                if (e.target.closest('.modebar')) return;
                var fl = cp._fullLayout;
                if (!fl || !fl.xaxis || !fl.xaxis.p2d) return;
                var rect = cp.getBoundingClientRect();
                var x = fl.xaxis.p2d(e.clientX - rect.left - fl.xaxis._offset);
                var y = fl.yaxis.p2d(e.clientY - rect.top - fl.yaxis._offset);
                var s = sys1[document.getElementById('td-cloud-system').value];
                if (isNaN(x) || isNaN(y) ||
                    x < s.xR[0] || x > s.xR[1] || y < s.yR[0] || y > s.yR[1]) return;
                cloudCx = x; cloudCy = y;
                window.tdDropCloud();
            });
        }
        document.getElementById('td-cloud-time').addEventListener('input', function() {
            var step = parseInt(this.value);
            var key = document.getElementById('td-cloud-system').value;
            var cfg = cloudCfg[key];
            var t = step * cfg.T / CLOUD_STEPS;
            document.getElementById('td-cloud-time-value').textContent = t.toFixed(1);
            if (cloudSnapshots) drawCloudAtStep(step);
        });
    }

    initializePlots();
})();
