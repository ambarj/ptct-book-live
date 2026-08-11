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

    // Build cyan/magenta nullcline traces from the analytic segments
    function nullclineTraces(sys, withNames) {
        function polyline(segs) {
            var xs = [], ys = [];
            segs.forEach(function(s) {
                xs.push(s.x[0], s.x[1], null);
                ys.push(s.y[0], s.y[1], null);
            });
            return { xs: xs, ys: ys };
        }
        var fx = polyline(sys.nullX), gy = polyline(sys.nullY);
        return [
            { x: fx.xs, y: fx.ys, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 3 },
              name: 'ẋ = 0', hoverinfo: 'skip', showlegend: !!withNames },
            { x: gy.xs, y: gy.ys, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 3 },
              name: 'ẏ = 0', hoverinfo: 'skip', showlegend: !!withNames }
        ];
    }

    // ===== Nonlinear system library =====
    // nullX / nullY: analytic ẋ=0 / ẏ=0 curves as straight-line segments.
    // (Contour tracing broke at the self-intersections of these unions of
    // lines, and Plotly's coloring:'lines' ignored line.color — so the
    // promised cyan/magenta nullclines never appeared.)
    var systems = {
        pendulum: {
            name: 'Simple Pendulum',
            eq: 'ẋ = y,  ẏ = −sin(x)',
            f: function(x, y) { return y; },
            g: function(x, y) { return -Math.sin(x); },
            xR: [-7, 7], yR: [-3, 3],
            nullX: [ { x: [-7, 7], y: [0, 0] } ],
            nullY: [-2, -1, 0, 1, 2].map(function(n) {
                return { x: [n * Math.PI, n * Math.PI], y: [-3, 3] };
            }),
            fps: [
                { x: -2 * Math.PI, y: 0, label: 'Center' },
                { x: -Math.PI,     y: 0, label: 'Saddle' },
                { x: 0,            y: 0, label: 'Center' },
                { x: Math.PI,      y: 0, label: 'Saddle' },
                { x: 2 * Math.PI,  y: 0, label: 'Center' }
            ]
        },
        competition: {
            name: 'Competing Species',
            eq: 'ẋ = x(3−x−2y),  ẏ = y(2−x−y)',
            f: function(x, y) { return x * (3 - x - 2 * y); },
            g: function(x, y) { return y * (2 - x - y); },
            xR: [-0.5, 4.5], yR: [-0.5, 3.5],
            nullX: [ { x: [0, 0], y: [-0.5, 3.5] },
                     { x: [-0.5, 4.5], y: [1.75, -0.75] } ],   // x + 2y = 3
            nullY: [ { x: [-0.5, 4.5], y: [0, 0] },
                     { x: [-0.5, 4.5], y: [2.5, -2.5] } ],     // x + y = 2
            fps: [
                { x: 0, y: 0, label: 'Unstable Node' },
                { x: 3, y: 0, label: 'Stable Node' },
                { x: 0, y: 2, label: 'Stable Node' },
                { x: 1, y: 1, label: 'Saddle' }
            ]
        },
        predatorPrey: {
            name: 'Predator-Prey',
            eq: 'ẋ = x(2−y),  ẏ = y(−1+x)',
            f: function(x, y) { return x * (2 - y); },
            g: function(x, y) { return y * (-1 + x); },
            xR: [-0.5, 4.5], yR: [-0.5, 4.5],
            nullX: [ { x: [0, 0], y: [-0.5, 4.5] },
                     { x: [-0.5, 4.5], y: [2, 2] } ],
            nullY: [ { x: [-0.5, 4.5], y: [0, 0] },
                     { x: [1, 1], y: [-0.5, 4.5] } ],
            fps: [
                { x: 0, y: 0, label: 'Saddle' },
                { x: 1, y: 2, label: 'Center' }
            ]
        }
    };

    // ===== RK4 solver =====
    function rk4Traj(sys, x0, y0, Tmax, N) {
        var h = Tmax / N;
        var X = [x0], Y = [y0];
        var x = x0, y = y0;
        for (var i = 0; i < N; i++) {
            var k1x = sys.f(x, y), k1y = sys.g(x, y);
            var x2 = x + h / 2 * k1x, y2 = y + h / 2 * k1y;
            var k2x = sys.f(x2, y2), k2y = sys.g(x2, y2);
            var x3 = x + h / 2 * k2x, y3 = y + h / 2 * k2y;
            var k3x = sys.f(x3, y3), k3y = sys.g(x3, y3);
            var x4 = x + h * k3x, y4 = y + h * k3y;
            var k4x = sys.f(x4, y4), k4y = sys.g(x4, y4);
            x += (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
            y += (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
            X.push(x); Y.push(y);
            if (Math.abs(x) > 20 || Math.abs(y) > 20) break;
        }
        return { X: X, Y: Y };
    }

    // ===== Nullcline grid computation =====
    function computeGrid(sys, nx, ny) {
        var xArr = [], yArr = [], fGrid = [], gGrid = [];
        var xR = sys.xR, yR = sys.yR;
        for (var j = 0; j < ny; j++) {
            var py = yR[0] + j * (yR[1] - yR[0]) / (ny - 1);
            yArr.push(py);
            var fRow = [], gRow = [];
            for (var i = 0; i < nx; i++) {
                var px = xR[0] + i * (xR[1] - xR[0]) / (nx - 1);
                if (j === 0) xArr.push(px);
                fRow.push(sys.f(px, py));
                gRow.push(sys.g(px, py));
            }
            fGrid.push(fRow);
            gGrid.push(gRow);
        }
        return { x: xArr, y: yArr, fGrid: fGrid, gGrid: gGrid };
    }

    // ===== Streamline generation =====
    function streamTraces(sys, nPerSide, color) {
        var traces = [];
        var xR = sys.xR, yR = sys.yR;
        var pts = [];
        for (var k = 0; k < nPerSide; k++) {
            var tx = xR[0] + k * (xR[1] - xR[0]) / (nPerSide - 1);
            var ty = yR[0] + k * (yR[1] - yR[0]) / (nPerSide - 1);
            pts.push([xR[0], ty]);
            pts.push([xR[1], ty]);
            pts.push([tx, yR[0]]);
            pts.push([tx, yR[1]]);
        }
        for (var i = 0; i < pts.length; i++) {
            var sol = rk4Traj(sys, pts[i][0], pts[i][1], 15, 1500);
            if (sol.X.length > 5) {
                traces.push({
                    x: sol.X, y: sol.Y,
                    type: 'scatter', mode: 'lines',
                    line: { color: color || 'rgba(150,150,150,0.3)', width: 1 },
                    hoverinfo: 'none', showlegend: false
                });
            }
        }
        return traces;
    }

    // ===== EXPLORER 1: Nullcline Finder =====
    function updateExplorer1() {
        var key = document.getElementById('fp-system1').value;
        var sys = systems[key];

        // Nullcline traces
        var nulls = nullclineTraces(sys, true);
        var fNull = nulls[0];
        var gNull = nulls[1];

        // Streamlines
        var streams = streamTraces(sys, 4, 'rgba(150,150,150,0.3)');

        // Fixed points
        var fpTrace = {
            x: sys.fps.map(function(p) { return p.x; }),
            y: sys.fps.map(function(p) { return p.y; }),
            text: sys.fps.map(function(p) { return p.label; }),
            type: 'scatter', mode: 'markers',
            marker: { color: '#ffbe0b', size: 11, symbol: 'circle',
                      line: { color: 'white', width: 1.5 } },
            name: 'Fixed points', hoverinfo: 'text'
        };

        var traces = [fNull, gNull].concat(streams).concat([fpTrace]);

        var layout = Object.assign({}, darkLayout, {
            xaxis: axStyle(sys.xR, 'x'),
            yaxis: axStyle(sys.yR, 'y'),
            height: 440,
            legend: { x: 0.01, y: 0.99, font: { color: '#ccc', size: 11 } }
        });

        Plotly.react('fp-nullPlot', traces, layout, { responsive: true });

        var fpList = sys.fps.map(function(p) {
            return '(' + p.x.toFixed(1) + ', ' + p.y.toFixed(1) + ') ' + p.label;
        }).join(' | ');
        document.getElementById('fp-stats1').innerHTML =
            '<span><strong>System:</strong> ' + sys.name + '</span>' +
            '<span><strong>Fixed Points:</strong> ' + sys.fps.length + '</span>' +
            '<span style="font-size:0.85em">' + fpList + '</span>';
    }

    // ===== EXPLORER 2: Flow Direction Regions =====
    function updateExplorer2() {
        var key = document.getElementById('fp-system2').value;
        var sys = systems[key];

        // Nullcline traces
        var nulls = nullclineTraces(sys, false);
        var fNull = nulls[0];
        var gNull = nulls[1];

        // Sign-colored direction arrows
        var signData = { pp: { x: [], y: [] }, pn: { x: [], y: [] },
                         np: { x: [], y: [] }, nn: { x: [], y: [] } };
        var signColors = { pp: '#00ff88', pn: '#40c4ff', np: '#ffbe0b', nn: '#ff006e' };
        var signLabels = { pp: 'ẋ>0, ẏ>0', pn: 'ẋ>0, ẏ<0', np: 'ẋ<0, ẏ>0', nn: 'ẋ<0, ẏ<0' };

        var n = 14;
        var xR = sys.xR, yR = sys.yR;
        var dxa = (xR[1] - xR[0]) / (n - 1);
        var dya = (yR[1] - yR[0]) / (n - 1);
        var scale = Math.min(dxa, dya) * 0.35;

        for (var i = 0; i < n; i++) {
            for (var j = 0; j < n; j++) {
                var px = xR[0] + i * dxa;
                var py = yR[0] + j * dya;
                var fx = sys.f(px, py);
                var gy = sys.g(px, py);
                var mag = Math.sqrt(fx * fx + gy * gy);
                if (mag < 1e-8) continue;
                var ux = fx / mag * scale;
                var uy = gy / mag * scale;
                var sk = (fx >= 0 ? 'p' : 'n') + (gy >= 0 ? 'p' : 'n');
                signData[sk].x.push(px, px + ux, null);
                signData[sk].y.push(py, py + uy, null);
            }
        }

        var arrowTraces = ['pp', 'pn', 'np', 'nn'].map(function(sk) {
            return {
                x: signData[sk].x, y: signData[sk].y,
                type: 'scatter', mode: 'lines',
                line: { color: signColors[sk], width: 1.5 },
                name: signLabels[sk], hoverinfo: 'none'
            };
        });
        // Arrowheads at each segment tip (segments are x0,x1,null triplets)
        ['pp', 'pn', 'np', 'nn'].forEach(function(sk) {
            var hx = [], hy = [], ha = [];
            var xs = signData[sk].x, ys = signData[sk].y;
            for (var q = 0; q + 1 < xs.length; q += 3) {
                hx.push(xs[q + 1]);
                hy.push(ys[q + 1]);
                ha.push(90 - Math.atan2(ys[q + 1] - ys[q], xs[q + 1] - xs[q]) * 180 / Math.PI);
            }
            arrowTraces.push({
                x: hx, y: hy, type: 'scatter', mode: 'markers',
                marker: { symbol: 'triangle-up', size: 6, color: signColors[sk], angle: ha },
                hoverinfo: 'none', showlegend: false
            });
        });

        // Fixed points
        var fpTrace = {
            x: sys.fps.map(function(p) { return p.x; }),
            y: sys.fps.map(function(p) { return p.y; }),
            type: 'scatter', mode: 'markers',
            marker: { color: '#ffbe0b', size: 10, symbol: 'circle',
                      line: { color: 'white', width: 1.5 } },
            name: 'Fixed points', hoverinfo: 'none'
        };

        var traces = arrowTraces.concat([fNull, gNull, fpTrace]);

        var layout = Object.assign({}, darkLayout, {
            xaxis: axStyle(sys.xR, 'x'),
            yaxis: axStyle(sys.yR, 'y'),
            height: 440,
            legend: { x: 0.01, y: 0.99, font: { color: '#ccc', size: 10 } }
        });

        Plotly.react('fp-regionPlot', traces, layout, { responsive: true });

        document.getElementById('fp-stats2').innerHTML =
            '<span><strong>System:</strong> ' + sys.name + '</span>' +
            '<span><strong>Equations:</strong> ' + sys.eq + '</span>' +
            '<span><span style="color:#00f3ff">━</span> ẋ=0 nullcline  ' +
            '<span style="color:#ff006e">━</span> ẏ=0 nullcline</span>';
    }

    // ===== EXPLORER 3: Stability Tester =====
    var stabTrajectories = [];
    var trajColors = ['#00f3ff', '#ff006e', '#ffbe0b', '#00ff88',
                      '#bb86fc', '#ff5722', '#76ff03', '#40c4ff'];

    function populatePointSelect() {
        var key = document.getElementById('fp-system3').value;
        var sys = systems[key];
        var sel = document.getElementById('fp-point-select');
        sel.innerHTML = '';
        for (var i = 0; i < sys.fps.length; i++) {
            var fp = sys.fps[i];
            var opt = document.createElement('option');
            opt.value = i;
            opt.textContent = '(' + fp.x.toFixed(2) + ', ' + fp.y.toFixed(2) + ') — ' + fp.label;
            sel.appendChild(opt);
        }
        stabTrajectories = [];
    }

    function drawExplorer3() {
        var key = document.getElementById('fp-system3').value;
        var sys = systems[key];
        var fpIdx = parseInt(document.getElementById('fp-point-select').value) || 0;
        var fp = sys.fps[fpIdx];

        var traces = [];

        // Trajectories
        for (var i = 0; i < stabTrajectories.length; i++) {
            var traj = stabTrajectories[i];
            traces.push({
                x: traj.X, y: traj.Y,
                type: 'scatter', mode: 'lines',
                line: { color: trajColors[i % trajColors.length], width: 1.8 },
                hoverinfo: 'none', showlegend: false
            });
            // Start marker
            traces.push({
                x: [traj.X[0]], y: [traj.Y[0]],
                type: 'scatter', mode: 'markers',
                marker: { color: trajColors[i % trajColors.length], size: 6 },
                hoverinfo: 'none', showlegend: false
            });
        }

        // Fixed point marker
        traces.push({
            x: [fp.x], y: [fp.y],
            type: 'scatter', mode: 'markers',
            marker: { color: '#ffbe0b', size: 14, symbol: 'circle',
                      line: { color: 'white', width: 2 } },
            hoverinfo: 'none', showlegend: false
        });

        // Compute view range centered on fixed point
        var pad = 2;
        var layout = Object.assign({}, darkLayout, {
            xaxis: axStyle([fp.x - pad, fp.x + pad], 'x'),
            yaxis: Object.assign(axStyle([fp.y - pad, fp.y + pad], 'y'), { scaleanchor: 'x' }),
            height: 440
        });

        Plotly.react('fp-stabPlot', traces, layout, { responsive: true });

        document.getElementById('fp-stats3').innerHTML =
            '<span><strong>Fixed point:</strong> (' + fp.x.toFixed(2) + ', ' + fp.y.toFixed(2) + ')</span>' +
            '<span><strong>Type:</strong> ' + fp.label + '</span>' +
            '<span><strong>Trajectories:</strong> ' + stabTrajectories.length + '</span>';
    }

    // ===== Global functions =====

    window.fpNullReset = function() {
        document.getElementById('fp-system1').value = 'pendulum';
        updateExplorer1();
    };

    window.fpRegionReset = function() {
        document.getElementById('fp-system2').value = 'pendulum';
        updateExplorer2();
    };

    window.fpPerturb = function() {
        var key = document.getElementById('fp-system3').value;
        var sys = systems[key];
        var fpIdx = parseInt(document.getElementById('fp-point-select').value) || 0;
        var fp = sys.fps[fpIdx];
        var eps = parseFloat(document.getElementById('fp-eps-slider').value);
        document.getElementById('fp-eps-value').textContent = eps.toFixed(1);

        stabTrajectories = [];
        for (var k = 0; k < 8; k++) {
            var theta = k * Math.PI / 4;
            var x0 = fp.x + eps * Math.cos(theta);
            var y0 = fp.y + eps * Math.sin(theta);
            var sol = rk4Traj(sys, x0, y0, 30, 3000);
            // Truncate at the first exit from the displayed window (fp ± 2):
            // long re-entering arcs otherwise draw misleading closed lenses
            var pad = 2;
            for (var q = 0; q < sol.X.length; q++) {
                if (Math.abs(sol.X[q] - fp.x) > pad || Math.abs(sol.Y[q] - fp.y) > pad) {
                    sol = { X: sol.X.slice(0, q + 1), Y: sol.Y.slice(0, q + 1) };
                    break;
                }
            }
            stabTrajectories.push(sol);
        }
        drawExplorer3();
    };

    window.fpStabReset = function() {
        document.getElementById('fp-system3').value = 'pendulum';
        document.getElementById('fp-eps-slider').value = 0.3;
        document.getElementById('fp-eps-value').textContent = '0.3';
        populatePointSelect();
        stabTrajectories = [];
        drawExplorer3();
    };

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }
        var el = document.getElementById('fp-nullPlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Explorer 1
        updateExplorer1();
        var sys1 = document.getElementById('fp-system1');
        if (sys1) sys1.addEventListener('change', updateExplorer1);

        // Explorer 2
        updateExplorer2();
        var sys2 = document.getElementById('fp-system2');
        if (sys2) sys2.addEventListener('change', updateExplorer2);

        // Explorer 3
        populatePointSelect();
        drawExplorer3();

        var sys3 = document.getElementById('fp-system3');
        if (sys3) sys3.addEventListener('change', function() {
            populatePointSelect();
            stabTrajectories = [];
            drawExplorer3();
        });
        var ptSel = document.getElementById('fp-point-select');
        if (ptSel) ptSel.addEventListener('change', function() {
            stabTrajectories = [];
            drawExplorer3();
        });
        var epsSl = document.getElementById('fp-eps-slider');
        if (epsSl) epsSl.addEventListener('input', function() {
            document.getElementById('fp-eps-value').textContent =
                parseFloat(this.value).toFixed(1);
        });
    }

    initializePlots();
})();
