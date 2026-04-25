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

    // ===== System presets =====
    var presets = {
        center:         { a: 0,   b: 1,  c: -1,  d: 0,    name: 'Center (SHO)' },
        saddle:         { a: 1,   b: 0,  c: 0,   d: -1,   name: 'Saddle' },
        stableSpiral:   { a: -0.2, b: 1,  c: -1,  d: -0.2, name: 'Stable Spiral' },
        unstableSpiral: { a: 0.2, b: 1,  c: -1,  d: 0.2,  name: 'Unstable Spiral' },
        source:         { a: 1,   b: 0,  c: 0,   d: 1,    name: 'Source' },
        sink:           { a: -1,  b: 0,  c: 0,   d: -1,   name: 'Sink' },
        stableNode:     { a: -2,  b: 1,  c: 0,   d: -1,   name: 'Stable Node' }
    };

    // ===== Vector field generation =====
    function makeArrows(a, b, c, d, n, R) {
        var xd = [], yd = [];
        var dx = 2 * R / (n - 1);
        for (var i = 0; i < n; i++) {
            for (var j = 0; j < n; j++) {
                var px = -R + i * dx;
                var py = -R + j * dx;
                var u = a * px + b * py;
                var v = c * px + d * py;
                var mag = Math.sqrt(u * u + v * v);
                if (mag < 1e-10) continue;
                var scale = 0.28;
                var ux = u / mag * scale;
                var uy = v / mag * scale;
                xd.push(px, px + ux, null);
                yd.push(py, py + uy, null);
            }
        }
        return {
            x: xd, y: yd,
            type: 'scatter', mode: 'lines',
            line: { color: 'rgba(100, 120, 200, 0.4)', width: 1 },
            hoverinfo: 'none', showlegend: false
        };
    }

    // ===== RK4 trajectory =====
    function rk4Traj(a, b, c, d, x0, y0, Tmax, N) {
        var h = Tmax / N;
        var X = [x0], Y = [y0];
        var x = x0, y = y0;
        for (var i = 0; i < N; i++) {
            var k1x = a * x + b * y, k1y = c * x + d * y;
            var x2 = x + h / 2 * k1x, y2 = y + h / 2 * k1y;
            var k2x = a * x2 + b * y2, k2y = c * x2 + d * y2;
            var x3 = x + h / 2 * k2x, y3 = y + h / 2 * k2y;
            var k3x = a * x3 + b * y3, k3y = c * x3 + d * y3;
            var x4 = x + h * k3x, y4 = y + h * k3y;
            var k4x = a * x4 + b * y4, k4y = c * x4 + d * y4;
            x += (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
            y += (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
            X.push(x); Y.push(y);
            if (Math.abs(x) > 8 || Math.abs(y) > 8) break;
        }
        return { X: X, Y: Y };
    }

    // Generate streamline traces from boundary launch points
    function streamTraces(a, b, c, d, nPerSide, color, width) {
        var traces = [];
        var R = 3.8;
        var pts = [];
        // Launch from all four edges
        for (var k = 0; k < nPerSide; k++) {
            var t = -R + k * 2 * R / (nPerSide - 1);
            pts.push([-R, t]); // left edge
            pts.push([R, t]);  // right edge
            pts.push([t, -R]); // bottom edge
            pts.push([t, R]);  // top edge
        }
        for (var i = 0; i < pts.length; i++) {
            var sol = rk4Traj(a, b, c, d, pts[i][0], pts[i][1], 15, 1500);
            if (sol.X.length > 3) {
                traces.push({
                    x: sol.X, y: sol.Y,
                    type: 'scatter', mode: 'lines',
                    line: { color: color || '#00f3ff', width: width || 1.5 },
                    hoverinfo: 'none', showlegend: false
                });
            }
        }
        return traces;
    }

    // ===== Eigenvalue formatting =====
    function eigenStr(a, b, c, d) {
        var tau = a + d;
        var delta = a * d - b * c;
        var disc = tau * tau - 4 * delta;
        if (Math.abs(disc) < 1e-8) {
            return 'λ = ' + (tau / 2).toFixed(2) + ' (repeated)';
        } else if (disc > 0) {
            var sq = Math.sqrt(disc);
            return 'λ₁ = ' + ((tau + sq) / 2).toFixed(2) + ', λ₂ = ' + ((tau - sq) / 2).toFixed(2);
        } else {
            var re = tau / 2;
            var im = Math.sqrt(-disc) / 2;
            return 'λ = ' + re.toFixed(2) + ' ± ' + im.toFixed(2) + 'i';
        }
    }

    function classifyStr(a, b, c, d) {
        var tau = a + d;
        var delta = a * d - b * c;
        if (delta < -0.01) return 'Saddle';
        var disc = tau * tau - 4 * delta;
        if (disc > 0.01) {
            return tau < -0.01 ? 'Stable Node' : tau > 0.01 ? 'Unstable Node' : 'Degenerate';
        } else if (disc < -0.01) {
            return tau < -0.01 ? 'Stable Spiral' : tau > 0.01 ? 'Unstable Spiral' : 'Center';
        } else {
            return tau < -0.01 ? 'Stable (Star/Degenerate)' : tau > 0.01 ? 'Unstable (Star/Degenerate)' : 'Center/Degenerate';
        }
    }

    // ===== EXPLORER 1: Field Builder =====
    function getMatrixParams() {
        return {
            a: parseFloat(document.getElementById('vf-a-slider').value),
            b: parseFloat(document.getElementById('vf-b-slider').value),
            c: parseFloat(document.getElementById('vf-c-slider').value),
            d: parseFloat(document.getElementById('vf-d-slider').value)
        };
    }

    function updateSliderDisplays(p) {
        document.getElementById('vf-a-value').textContent = p.a.toFixed(1);
        document.getElementById('vf-b-value').textContent = p.b.toFixed(1);
        document.getElementById('vf-c-value').textContent = p.c.toFixed(1);
        document.getElementById('vf-d-value').textContent = p.d.toFixed(1);
    }

    function updateExplorer1() {
        var p = getMatrixParams();
        updateSliderDisplays(p);

        var arrows = makeArrows(p.a, p.b, p.c, p.d, 16, 4);
        var streams = streamTraces(p.a, p.b, p.c, p.d, 5, '#00f3ff', 2);
        var traces = [arrows].concat(streams);

        // Fixed point marker
        traces.push({
            x: [0], y: [0],
            type: 'scatter', mode: 'markers',
            marker: { color: '#ff006e', size: 10, symbol: 'x', line: { width: 2, color: '#ff006e' } },
            hoverinfo: 'none', showlegend: false
        });

        var layout = Object.assign({}, darkLayout, {
            xaxis: axStyle([-4, 4], 'x'),
            yaxis: Object.assign(axStyle([-4, 4], 'y'), { scaleanchor: 'x' }),
            height: 420
        });

        Plotly.react('vf-fieldPlot', traces, layout, { responsive: true });

        var tau = p.a + p.d;
        var delta = p.a * p.d - p.b * p.c;
        document.getElementById('vf-stats1').innerHTML =
            '<span><strong>Matrix:</strong> [' + p.a.toFixed(1) + ', ' + p.b.toFixed(1) + '; ' +
            p.c.toFixed(1) + ', ' + p.d.toFixed(1) + ']</span>' +
            '<span><strong>τ =</strong> ' + tau.toFixed(2) + '</span>' +
            '<span><strong>Δ =</strong> ' + delta.toFixed(2) + '</span>' +
            '<span><strong>' + eigenStr(p.a, p.b, p.c, p.d) + '</strong></span>' +
            '<span><strong>Type:</strong> ' + classifyStr(p.a, p.b, p.c, p.d) + '</span>';
    }

    // ===== EXPLORER 2: Arrows to Streamlines =====
    function getSystem2() {
        var key = document.getElementById('vf-system2').value;
        return presets[key];
    }

    function updateExplorer2() {
        var sys = getSystem2();
        var n = parseInt(document.getElementById('vf-density-slider').value);
        document.getElementById('vf-density-value').textContent = n + '×' + n;

        var a = sys.a, b = sys.b, c = sys.c, d = sys.d;

        // Left panel: arrows only
        var arrowTrace = makeArrows(a, b, c, d, n, 4);
        arrowTrace.line.color = 'rgba(0, 243, 255, 0.5)';
        arrowTrace.line.width = 1.2;
        var traces1 = [arrowTrace, {
            x: [0], y: [0],
            type: 'scatter', mode: 'markers',
            marker: { color: '#ff006e', size: 8, symbol: 'x', line: { width: 2, color: '#ff006e' } },
            hoverinfo: 'none', showlegend: false
        }];

        var layout1 = Object.assign({}, darkLayout, {
            title: { text: 'Arrows', font: { size: 13, color: '#aaa' } },
            xaxis: axStyle([-4, 4], 'x'),
            yaxis: Object.assign(axStyle([-4, 4], 'y'), { scaleanchor: 'x' })
        });

        Plotly.react('vf-arrowPlot', traces1, layout1, { responsive: true });

        // Right panel: streamlines
        var streams = streamTraces(a, b, c, d, 5, '#00f3ff', 2);
        streams.push({
            x: [0], y: [0],
            type: 'scatter', mode: 'markers',
            marker: { color: '#ff006e', size: 8, symbol: 'x', line: { width: 2, color: '#ff006e' } },
            hoverinfo: 'none', showlegend: false
        });

        var layout2 = Object.assign({}, darkLayout, {
            title: { text: 'Streamlines', font: { size: 13, color: '#aaa' } },
            xaxis: axStyle([-4, 4], 'x'),
            yaxis: Object.assign(axStyle([-4, 4], 'y'), { scaleanchor: 'x' })
        });

        Plotly.react('vf-streamPlot', streams, layout2, { responsive: true });

        document.getElementById('vf-stats2').innerHTML =
            '<span><strong>System:</strong> ' + sys.name + '</span>' +
            '<span><strong>Arrow grid:</strong> ' + n + '×' + n + ' = ' + (n * n) + ' points</span>' +
            '<span><strong>' + eigenStr(a, b, c, d) + '</strong></span>';
    }

    // ===== EXPLORER 3: Speed Map =====
    function updateExplorer3() {
        var key = document.getElementById('vf-system3').value;
        var sys = presets[key];
        var a = sys.a, b = sys.b, c = sys.c, d = sys.d;

        // Generate speed heatmap
        var nx = 60, ny = 60;
        var xArr = [], yArr = [], zData = [];
        var maxSpeed = 0;
        for (var j = 0; j < ny; j++) {
            var row = [];
            var py = -4 + j * 8 / (ny - 1);
            if (j === 0) { /* populate x array once */ }
            for (var i = 0; i < nx; i++) {
                var px = -4 + i * 8 / (nx - 1);
                if (j === 0) xArr.push(px);
                var u = a * px + b * py;
                var v = c * px + d * py;
                var spd = Math.sqrt(u * u + v * v);
                row.push(spd);
                if (spd > maxSpeed) maxSpeed = spd;
            }
            yArr.push(py);
            zData.push(row);
        }

        // Heatmap trace
        var heatmap = {
            z: zData, x: xArr, y: yArr,
            type: 'heatmap',
            colorscale: 'Viridis',
            showscale: true,
            colorbar: { title: 'Speed', titlefont: { color: '#ccc' }, tickfont: { color: '#ccc' } },
            hoverinfo: 'none'
        };

        // Streamlines overlaid in white
        var streams = streamTraces(a, b, c, d, 5, 'rgba(255,255,255,0.7)', 1.5);

        // Fixed point
        var fpMarker = {
            x: [0], y: [0],
            type: 'scatter', mode: 'markers',
            marker: { color: '#ff006e', size: 10, symbol: 'x', line: { width: 2.5, color: '#ff006e' } },
            hoverinfo: 'none', showlegend: false
        };

        var traces = [heatmap].concat(streams).concat([fpMarker]);

        var layout = Object.assign({}, darkLayout, {
            xaxis: axStyle([-4, 4], 'x'),
            yaxis: Object.assign(axStyle([-4, 4], 'y'), { scaleanchor: 'x' }),
            height: 440
        });

        Plotly.react('vf-speedPlot', traces, layout, { responsive: true });

        document.getElementById('vf-stats3').innerHTML =
            '<span><strong>System:</strong> ' + sys.name + '</span>' +
            '<span><strong>Max speed:</strong> ' + maxSpeed.toFixed(2) + ' (at corners)</span>' +
            '<span><strong>Speed at origin:</strong> 0 (fixed point)</span>';
    }

    // ===== Global functions =====

    window.vfBuilderReset = function() {
        document.getElementById('vf-preset').value = 'center';
        var p = presets.center;
        document.getElementById('vf-a-slider').value = p.a;
        document.getElementById('vf-b-slider').value = p.b;
        document.getElementById('vf-c-slider').value = p.c;
        document.getElementById('vf-d-slider').value = p.d;
        updateExplorer1();
    };

    window.vfFlowReset = function() {
        document.getElementById('vf-system2').value = 'center';
        document.getElementById('vf-density-slider').value = 12;
        updateExplorer2();
    };

    window.vfSpeedReset = function() {
        document.getElementById('vf-system3').value = 'center';
        updateExplorer3();
    };

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }
        var el = document.getElementById('vf-fieldPlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Explorer 1
        updateExplorer1();

        // Explorer 1 handlers
        ['vf-a-slider', 'vf-b-slider', 'vf-c-slider', 'vf-d-slider'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('input', function() {
                document.getElementById('vf-preset').value = 'custom';
                updateExplorer1();
            });
        });

        var presetSel = document.getElementById('vf-preset');
        if (presetSel) presetSel.addEventListener('change', function() {
            var key = this.value;
            if (key === 'custom') return;
            var p = presets[key];
            document.getElementById('vf-a-slider').value = p.a;
            document.getElementById('vf-b-slider').value = p.b;
            document.getElementById('vf-c-slider').value = p.c;
            document.getElementById('vf-d-slider').value = p.d;
            updateExplorer1();
        });

        // Explorer 2
        updateExplorer2();
        var sys2 = document.getElementById('vf-system2');
        var denSlider = document.getElementById('vf-density-slider');
        if (sys2) sys2.addEventListener('change', updateExplorer2);
        if (denSlider) denSlider.addEventListener('input', updateExplorer2);

        // Explorer 3
        updateExplorer3();
        var sys3 = document.getElementById('vf-system3');
        if (sys3) sys3.addEventListener('change', updateExplorer3);
    }

    initializePlots();
})();
