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

    // ===== RK4 solver =====
    function rk4Solve(f, g, x0, y0, T, N) {
        var h = T / N, X = [x0], Y = [y0], t = [0];
        var x = x0, y = y0;
        for (var i = 0; i < N; i++) {
            var k1x = f(x, y),                         k1y = g(x, y);
            var k2x = f(x + h/2*k1x, y + h/2*k1y),   k2y = g(x + h/2*k1x, y + h/2*k1y);
            var k3x = f(x + h/2*k2x, y + h/2*k2y),   k3y = g(x + h/2*k2x, y + h/2*k2y);
            var k4x = f(x + h*k3x, y + h*k3y),        k4y = g(x + h*k3x, y + h*k3y);
            x += h / 6 * (k1x + 2*k2x + 2*k3x + k4x);
            y += h / 6 * (k1y + 2*k2y + 2*k3y + k4y);
            if (Math.abs(x) > 20 || Math.abs(y) > 20) break;
            X.push(x); Y.push(y); t.push((i + 1) * h);
        }
        return { X: X, Y: Y, t: t };
    }

    // ===== Vector field arrows =====
    function fieldArrows(f, g, R, n) {
        var ax = [], ay = [];
        var step = 2 * R / (n - 1);
        var sc = step * 0.32;
        for (var i = 0; i < n; i++) {
            for (var j = 0; j < n; j++) {
                var px = -R + i * step, py = -R + j * step;
                var fx = f(px, py), fy = g(px, py);
                var mag = Math.sqrt(fx * fx + fy * fy);
                if (mag < 1e-8) continue;
                ax.push(px, px + fx / mag * sc, null);
                ay.push(py, py + fy / mag * sc, null);
            }
        }
        return { x: ax, y: ay };
    }

    // ===== Eigenvalue computation for 2x2 =====
    function eigenvalues2x2(a, b, c, d) {
        var tau = a + d, delta = a * d - b * c;
        var disc = tau * tau - 4 * delta;
        if (disc >= 0) {
            var s = Math.sqrt(disc);
            return {
                lam1: { re: (tau + s) / 2, im: 0 },
                lam2: { re: (tau - s) / 2, im: 0 },
                tau: tau, delta: delta, disc: disc
            };
        } else {
            var s = Math.sqrt(-disc);
            return {
                lam1: { re: tau / 2, im: s / 2 },
                lam2: { re: tau / 2, im: -s / 2 },
                tau: tau, delta: delta, disc: disc
            };
        }
    }

    // Eigenvectors for real eigenvalues
    function eigenvectors2x2(a, b, c, d, lam) {
        // (A - λI)v = 0 → use first row: (a-λ)vx + b*vy = 0
        var ax = a - lam, bx = b;
        if (Math.abs(bx) > 1e-10) {
            var vx = -bx, vy = ax;
            var mag = Math.sqrt(vx * vx + vy * vy);
            return { x: vx / mag, y: vy / mag };
        }
        // Try second row
        var cx2 = c, dx2 = d - lam;
        if (Math.abs(dx2) > 1e-10) {
            var vx = dx2, vy = -cx2;
            var mag = Math.sqrt(vx * vx + vy * vy);
            return { x: vx / mag, y: vy / mag };
        }
        return { x: 1, y: 0 };
    }

    function eigenStr(eig) {
        if (eig.disc >= 0) {
            return 'λ₁ = ' + eig.lam1.re.toFixed(2) + ',  λ₂ = ' + eig.lam2.re.toFixed(2);
        } else {
            return 'λ = ' + eig.lam1.re.toFixed(2) + ' ± ' + Math.abs(eig.lam1.im).toFixed(2) + 'i';
        }
    }

    function classifyType(eig) {
        var tau = eig.tau, delta = eig.delta;
        if (delta < -0.01) return 'Saddle';
        if (Math.abs(delta) < 0.01) return 'Degenerate';
        if (eig.disc < -0.01) {
            if (Math.abs(tau) < 0.05) return 'Center';
            return tau < 0 ? 'Stable Spiral' : 'Unstable Spiral';
        }
        if (tau < -0.01) return 'Stable Node';
        if (tau > 0.01) return 'Unstable Node';
        return 'Center (degenerate)';
    }

    // ===== Presets =====
    var presets = {
        center:         { a: 0,    b: 1,   c: -1,  d: 0 },
        stableNode:     { a: -2,   b: 0.5, c: 0.5, d: -1 },
        unstableNode:   { a: 2,    b: 0.5, c: 0.5, d: 1 },
        saddle:         { a: 1,    b: 1,   c: 0,   d: -2 },
        stableSpiral:   { a: -0.3, b: 1,   c: -1,  d: -0.3 },
        unstableSpiral: { a: 0.3,  b: 1,   c: -1,  d: 0.3 }
    };

    // ===============================================================
    // EXPLORER 1: Matrix Explorer
    // ===============================================================
    function drawMatrixExplorer() {
        var a = parseFloat(document.getElementById('ls-a-slider').value);
        var b = parseFloat(document.getElementById('ls-b-slider').value);
        var c = parseFloat(document.getElementById('ls-c-slider').value);
        var d = parseFloat(document.getElementById('ls-d-slider').value);

        var f = function(x, y) { return a * x + b * y; };
        var g = function(x, y) { return c * x + d * y; };

        var eig = eigenvalues2x2(a, b, c, d);

        // Phase portrait
        var arr = fieldArrows(f, g, 3, 10);
        var traces = [{
            x: arr.x, y: arr.y, type: 'scatter', mode: 'lines',
            line: { color: 'rgba(150,150,150,0.25)', width: 1 },
            hoverinfo: 'none', showlegend: false
        }];

        var T = (classifyType(eig) === 'Saddle') ? 5 : 15;
        for (var k = 0; k < 10; k++) {
            var theta = k * Math.PI / 5;
            var sol = rk4Solve(f, g, 1.5 * Math.cos(theta), 1.5 * Math.sin(theta), T, 2000);
            traces.push({
                x: sol.X, y: sol.Y, type: 'scatter', mode: 'lines',
                line: { color: trajColors[k], width: 1.5 },
                hoverinfo: 'none', showlegend: false
            });
        }

        // Eigenvector lines (real eigenvalues only)
        var annotations = [];
        if (eig.disc >= 0) {
            var v1 = eigenvectors2x2(a, b, c, d, eig.lam1.re);
            var v2 = eigenvectors2x2(a, b, c, d, eig.lam2.re);
            traces.push({
                x: [-3*v1.x, 3*v1.x], y: [-3*v1.y, 3*v1.y],
                type: 'scatter', mode: 'lines',
                line: { color: '#ff5722', width: 2, dash: 'dash' },
                hoverinfo: 'none', showlegend: false
            });
            traces.push({
                x: [-3*v2.x, 3*v2.x], y: [-3*v2.y, 3*v2.y],
                type: 'scatter', mode: 'lines',
                line: { color: '#00ff88', width: 2, dash: 'dash' },
                hoverinfo: 'none', showlegend: false
            });
            annotations.push(
                { x: 2.5*v1.x, y: 2.5*v1.y, text: 'v₁', font: { color: '#ff5722', size: 12 }, showarrow: false },
                { x: 2.5*v2.x, y: 2.5*v2.y, text: 'v₂', font: { color: '#00ff88', size: 12 }, showarrow: false }
            );
        }

        // Fixed point
        traces.push({
            x: [0], y: [0], type: 'scatter', mode: 'markers',
            marker: { color: '#ffbe0b', size: 10, line: { color: 'white', width: 2 } },
            hoverinfo: 'none', showlegend: false
        });

        Plotly.react('ls-phasePlot', traces, Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-3, 3], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-3, 3], 'y'),
            height: 400,
            annotations: annotations
        }), { responsive: true });

        // Eigenvalue plot (complex plane)
        var eigTraces = [];

        // Unit circle for reference
        var circX = [], circY = [];
        for (var i = 0; i <= 60; i++) {
            circX.push(Math.cos(i * 2 * Math.PI / 60));
            circY.push(Math.sin(i * 2 * Math.PI / 60));
        }
        eigTraces.push({
            x: circX, y: circY, type: 'scatter', mode: 'lines',
            line: { color: 'rgba(100,100,100,0.3)', width: 1, dash: 'dot' },
            hoverinfo: 'none', showlegend: false
        });

        // Imaginary axis highlight
        eigTraces.push({
            x: [0, 0], y: [-3.5, 3.5], type: 'scatter', mode: 'lines',
            line: { color: 'rgba(100,100,100,0.2)', width: 1 },
            hoverinfo: 'none', showlegend: false
        });

        // Eigenvalue markers
        eigTraces.push({
            x: [eig.lam1.re], y: [eig.lam1.im],
            type: 'scatter', mode: 'markers+text',
            marker: { color: '#ff5722', size: 14, line: { color: 'white', width: 2 } },
            text: ['λ₁'], textposition: 'top right',
            textfont: { color: '#ff5722', size: 12 },
            hoverinfo: 'none', showlegend: false
        });
        eigTraces.push({
            x: [eig.lam2.re], y: [eig.lam2.im],
            type: 'scatter', mode: 'markers+text',
            marker: { color: '#00ff88', size: 14, line: { color: 'white', width: 2 } },
            text: ['λ₂'], textposition: 'bottom right',
            textfont: { color: '#00ff88', size: 12 },
            hoverinfo: 'none', showlegend: false
        });

        Plotly.react('ls-eigenPlot', eigTraces, Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-3.5, 3.5], 'Re(λ)'), { scaleanchor: 'y2' }),
            yaxis: axStyle([-3.5, 3.5], 'Im(λ)'),
            height: 400,
            annotations: [
                { x: -2, y: 3, text: 'Stable<br>(Re < 0)', font: { color: '#00ff88', size: 10 },
                  showarrow: false, opacity: 0.5 },
                { x: 2, y: 3, text: 'Unstable<br>(Re > 0)', font: { color: '#ff006e', size: 10 },
                  showarrow: false, opacity: 0.5 }
            ]
        }), { responsive: true });

        // Stats bar
        var type = classifyType(eig);
        document.getElementById('ls-stats1').innerHTML =
            '<span><strong>' + type + '</strong></span>' +
            '<span>A = [[' + a.toFixed(1) + ', ' + b.toFixed(1) + '], [' + c.toFixed(1) + ', ' + d.toFixed(1) + ']]</span>' +
            '<span>τ = ' + eig.tau.toFixed(2) + ', Δ = ' + eig.delta.toFixed(2) + '</span>' +
            '<span>' + eigenStr(eig) + '</span>';
    }

    // ===============================================================
    // EXPLORER 2: Eigenvector Directions (diagonal system)
    // ===============================================================
    function drawEigvec() {
        var lam1 = parseFloat(document.getElementById('ls-lam1-slider').value);
        var lam2 = parseFloat(document.getElementById('ls-lam2-slider').value);
        var angleDeg = parseFloat(document.getElementById('ls-angle-slider').value);
        var th = angleDeg * Math.PI / 180;

        // Eigenvectors
        var v1x = Math.cos(th), v1y = Math.sin(th);
        var v2x = Math.cos(th + Math.PI / 2), v2y = Math.sin(th + Math.PI / 2);

        // Build matrix A = V * D * V^-1
        // V = [[v1x, v2x], [v1y, v2y]], D = diag(lam1, lam2)
        var detV = v1x * v2y - v2x * v1y;
        var Vinv00 = v2y / detV, Vinv01 = -v2x / detV;
        var Vinv10 = -v1y / detV, Vinv11 = v1x / detV;

        var a = lam1 * v1x * Vinv00 + lam2 * v2x * Vinv10;
        var b = lam1 * v1x * Vinv01 + lam2 * v2x * Vinv11;
        var c = lam1 * v1y * Vinv00 + lam2 * v2y * Vinv10;
        var d = lam1 * v1y * Vinv01 + lam2 * v2y * Vinv11;

        var f = function(x, y) { return a * x + b * y; };
        var g = function(x, y) { return c * x + d * y; };

        var arr = fieldArrows(f, g, 3, 10);
        var traces = [{
            x: arr.x, y: arr.y, type: 'scatter', mode: 'lines',
            line: { color: 'rgba(150,150,150,0.25)', width: 1 },
            hoverinfo: 'none', showlegend: false
        }];

        var T = (lam1 * lam2 < 0) ? 5 : 10;
        for (var k = 0; k < 10; k++) {
            var theta = k * Math.PI / 5;
            var sol = rk4Solve(f, g, 1.5 * Math.cos(theta), 1.5 * Math.sin(theta), T, 2000);
            traces.push({
                x: sol.X, y: sol.Y, type: 'scatter', mode: 'lines',
                line: { color: trajColors[k], width: 1.5 },
                hoverinfo: 'none', showlegend: false
            });
        }

        // Eigenvector lines
        traces.push({
            x: [-3*v1x, 3*v1x], y: [-3*v1y, 3*v1y],
            type: 'scatter', mode: 'lines',
            line: { color: '#ff5722', width: 2, dash: 'dash' },
            hoverinfo: 'none', showlegend: false
        });
        traces.push({
            x: [-3*v2x, 3*v2x], y: [-3*v2y, 3*v2y],
            type: 'scatter', mode: 'lines',
            line: { color: '#00ff88', width: 2, dash: 'dash' },
            hoverinfo: 'none', showlegend: false
        });

        // Fixed point
        traces.push({
            x: [0], y: [0], type: 'scatter', mode: 'markers',
            marker: { color: '#ffbe0b', size: 10, line: { color: 'white', width: 2 } },
            hoverinfo: 'none', showlegend: false
        });

        // Arrows on eigenvector lines
        var arrowLen = 0.2;
        for (var sign = -1; sign <= 1; sign += 2) {
            var px = sign * 2 * v1x, py = sign * 2 * v1y;
            var dir = lam1 > 0 ? sign : -sign;
            traces.push({
                x: [px, px + dir * arrowLen * v1x],
                y: [py, py + dir * arrowLen * v1y],
                type: 'scatter', mode: 'lines',
                line: { color: '#ff5722', width: 3 },
                hoverinfo: 'none', showlegend: false
            });
        }
        for (var sign = -1; sign <= 1; sign += 2) {
            var px = sign * 2 * v2x, py = sign * 2 * v2y;
            var dir = lam2 > 0 ? sign : -sign;
            traces.push({
                x: [px, px + dir * arrowLen * v2x],
                y: [py, py + dir * arrowLen * v2y],
                type: 'scatter', mode: 'lines',
                line: { color: '#00ff88', width: 3 },
                hoverinfo: 'none', showlegend: false
            });
        }

        Plotly.react('ls-eigvecPlot', traces, Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-3, 3], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-3, 3], 'y'),
            height: 440,
            annotations: [
                { x: 2.7*v1x, y: 2.7*v1y, text: 'v₁ (λ₁=' + lam1.toFixed(1) + ')',
                  font: { color: '#ff5722', size: 11 }, showarrow: false },
                { x: 2.7*v2x, y: 2.7*v2y, text: 'v₂ (λ₂=' + lam2.toFixed(1) + ')',
                  font: { color: '#00ff88', size: 11 }, showarrow: false }
            ]
        }), { responsive: true });

        // Stats
        var type;
        if (lam1 * lam2 < 0) type = 'Saddle';
        else if (lam1 < 0 && lam2 < 0) type = 'Stable Node';
        else if (lam1 > 0 && lam2 > 0) type = 'Unstable Node';
        else type = 'Degenerate';

        var slow = Math.abs(lam1) < Math.abs(lam2) ? 'v₁' : 'v₂';
        var fast = Math.abs(lam1) < Math.abs(lam2) ? 'v₂' : 'v₁';
        document.getElementById('ls-stats2').innerHTML =
            '<span><strong>' + type + '</strong></span>' +
            '<span>λ₁ = ' + lam1.toFixed(1) + ', λ₂ = ' + lam2.toFixed(1) + '</span>' +
            '<span>θ = ' + angleDeg + '°</span>' +
            '<span>Slow: ' + slow + '  |  Fast: ' + fast + '</span>';
    }

    // ===============================================================
    // EXPLORER 3: Solution Decomposition
    // ===============================================================
    var decompSystems = {
        saddle:       { lam1: 2, lam2: -1, th: 30, T: 3 },
        stableNode:   { lam1: -0.5, lam2: -3, th: 30, T: 8 },
        unstableNode: { lam1: 1, lam2: 3, th: 30, T: 3 }
    };

    function drawDecomp() {
        var sysKey = document.getElementById('ls-dec-system').value;
        var sys = decompSystems[sysKey];
        var x0 = parseFloat(document.getElementById('ls-dec-x0-slider').value);
        var y0 = parseFloat(document.getElementById('ls-dec-y0-slider').value);

        var th = sys.th * Math.PI / 180;
        var v1x = Math.cos(th), v1y = Math.sin(th);
        var v2x = Math.cos(th + Math.PI / 2), v2y = Math.sin(th + Math.PI / 2);
        var lam1 = sys.lam1, lam2 = sys.lam2;

        // Decompose IC: x0 = c1*v1 + c2*v2
        var detV = v1x * v2y - v2x * v1y;
        var c1 = (x0 * v2y - y0 * v2x) / detV;
        var c2 = (v1x * y0 - v1y * x0) / detV;

        // Build A = V D V^-1
        var Vinv00 = v2y / detV, Vinv01 = -v2x / detV;
        var Vinv10 = -v1y / detV, Vinv11 = v1x / detV;
        var a = lam1 * v1x * Vinv00 + lam2 * v2x * Vinv10;
        var b = lam1 * v1x * Vinv01 + lam2 * v2x * Vinv11;
        var cc = lam1 * v1y * Vinv00 + lam2 * v2y * Vinv10;
        var d = lam1 * v1y * Vinv01 + lam2 * v2y * Vinv11;

        var f = function(x, y) { return a * x + b * y; };
        var g = function(x, y) { return cc * x + d * y; };

        var sol = rk4Solve(f, g, x0, y0, sys.T, 2000);

        // Phase portrait
        var traces = [];

        // Eigenvector lines
        traces.push({
            x: [-3*v1x, 3*v1x], y: [-3*v1y, 3*v1y],
            type: 'scatter', mode: 'lines',
            line: { color: 'rgba(255,87,34,0.4)', width: 1.5, dash: 'dash' },
            hoverinfo: 'none', showlegend: false
        });
        traces.push({
            x: [-3*v2x, 3*v2x], y: [-3*v2y, 3*v2y],
            type: 'scatter', mode: 'lines',
            line: { color: 'rgba(0,255,136,0.4)', width: 1.5, dash: 'dash' },
            hoverinfo: 'none', showlegend: false
        });

        // Full trajectory
        traces.push({
            x: sol.X, y: sol.Y, type: 'scatter', mode: 'lines',
            line: { color: '#00f3ff', width: 2.5 },
            hoverinfo: 'none', showlegend: false
        });

        // Start marker
        traces.push({
            x: [x0], y: [y0], type: 'scatter', mode: 'markers',
            marker: { color: '#00f3ff', size: 8, line: { color: 'white', width: 2 } },
            hoverinfo: 'none', showlegend: false
        });

        // Fixed point
        traces.push({
            x: [0], y: [0], type: 'scatter', mode: 'markers',
            marker: { color: '#ffbe0b', size: 10, line: { color: 'white', width: 2 } },
            hoverinfo: 'none', showlegend: false
        });

        Plotly.react('ls-decompPhasePlot', traces, Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-3, 3], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-3, 3], 'y'),
            height: 400,
            annotations: [
                { x: 2.7*v1x, y: 2.7*v1y, text: 'v₁',
                  font: { color: '#ff5722', size: 12 }, showarrow: false },
                { x: 2.7*v2x, y: 2.7*v2y, text: 'v₂',
                  font: { color: '#00ff88', size: 12 }, showarrow: false }
            ]
        }), { responsive: true });

        // Time series: mode decomposition
        var nPts = Math.min(sol.t.length, 500);
        var tArr = [], m1Arr = [], m2Arr = [], fullX = [], fullY = [];
        for (var i = 0; i < nPts; i++) {
            var ti = sol.t[i];
            tArr.push(ti);
            m1Arr.push(c1 * Math.exp(lam1 * ti));
            m2Arr.push(c2 * Math.exp(lam2 * ti));
            fullX.push(sol.X[i]);
            fullY.push(sol.Y[i]);
        }

        var timeTraces = [
            { x: tArr, y: m1Arr, type: 'scatter', mode: 'lines',
              line: { color: '#ff5722', width: 2 },
              name: 'c₁e^(λ₁t)' },
            { x: tArr, y: m2Arr, type: 'scatter', mode: 'lines',
              line: { color: '#00ff88', width: 2, dash: 'dash' },
              name: 'c₂e^(λ₂t)' },
            { x: tArr, y: fullX, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 1.5 },
              name: 'x(t)' },
            { x: tArr, y: fullY, type: 'scatter', mode: 'lines',
              line: { color: '#bb86fc', width: 1.5 },
              name: 'y(t)' }
        ];

        // Determine y-range for time plot
        var allVals = m1Arr.concat(m2Arr).concat(fullX).concat(fullY);
        var yMin = Math.min.apply(null, allVals);
        var yMax = Math.max.apply(null, allVals);
        var yPad = (yMax - yMin) * 0.1 + 0.5;

        Plotly.react('ls-decompTimePlot', timeTraces, Object.assign({}, darkLayout, {
            xaxis: axStyle([0, sys.T], 'Time t'),
            yaxis: axStyle([yMin - yPad, yMax + yPad], 'Amplitude'),
            height: 400,
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // Stats
        document.getElementById('ls-stats3').innerHTML =
            '<span><strong>λ₁ = ' + lam1 + ', λ₂ = ' + lam2 + '</strong></span>' +
            '<span>IC: (' + x0.toFixed(1) + ', ' + y0.toFixed(1) + ')</span>' +
            '<span>c₁ = ' + c1.toFixed(2) + ', c₂ = ' + c2.toFixed(2) + '</span>' +
            '<span>x(t) = ' + c1.toFixed(2) + '·e^(' + lam1 + 't)·v₁ + ' + c2.toFixed(2) + '·e^(' + lam2 + 't)·v₂</span>';
    }

    // ===============================================================
    // Global functions (button handlers)
    // ===============================================================
    window.lsMatrixReset = function() {
        document.getElementById('ls-preset').value = 'center';
        lsPresetChange('center');
    };

    function lsPresetChange(key) {
        if (key === 'custom') return;
        var p = presets[key];
        if (!p) return;
        document.getElementById('ls-a-slider').value = p.a;
        document.getElementById('ls-b-slider').value = p.b;
        document.getElementById('ls-c-slider').value = p.c;
        document.getElementById('ls-d-slider').value = p.d;
        document.getElementById('ls-a-value').textContent = p.a.toFixed(1);
        document.getElementById('ls-b-value').textContent = p.b.toFixed(1);
        document.getElementById('ls-c-value').textContent = p.c.toFixed(1);
        document.getElementById('ls-d-value').textContent = p.d.toFixed(1);
        drawMatrixExplorer();
    }

    window.lsEigvecReset = function() {
        document.getElementById('ls-lam1-slider').value = 2;
        document.getElementById('ls-lam2-slider').value = -1;
        document.getElementById('ls-angle-slider').value = 30;
        document.getElementById('ls-lam1-value').textContent = '2.0';
        document.getElementById('ls-lam2-value').textContent = '-1.0';
        document.getElementById('ls-angle-value').textContent = '30';
        drawEigvec();
    };

    window.lsDecompReset = function() {
        document.getElementById('ls-dec-system').value = 'saddle';
        document.getElementById('ls-dec-x0-slider').value = 1;
        document.getElementById('ls-dec-y0-slider').value = 0.5;
        document.getElementById('ls-dec-x0-value').textContent = '1.0';
        document.getElementById('ls-dec-y0-value').textContent = '0.5';
        drawDecomp();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }
        var el = document.getElementById('ls-phasePlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Explorer 1: Matrix Explorer
        drawMatrixExplorer();
        ['ls-a-slider', 'ls-b-slider', 'ls-c-slider', 'ls-d-slider'].forEach(function(id) {
            var valId = id.replace('slider', 'value');
            document.getElementById(id).addEventListener('input', function() {
                document.getElementById(valId).textContent = parseFloat(this.value).toFixed(1);
                document.getElementById('ls-preset').value = 'custom';
                drawMatrixExplorer();
            });
        });
        document.getElementById('ls-preset').addEventListener('change', function() {
            lsPresetChange(this.value);
        });

        // Explorer 2: Eigenvector Directions
        drawEigvec();
        ['ls-lam1-slider', 'ls-lam2-slider'].forEach(function(id) {
            var valId = id.replace('slider', 'value');
            document.getElementById(id).addEventListener('input', function() {
                document.getElementById(valId).textContent = parseFloat(this.value).toFixed(1);
                drawEigvec();
            });
        });
        document.getElementById('ls-angle-slider').addEventListener('input', function() {
            document.getElementById('ls-angle-value').textContent = this.value;
            drawEigvec();
        });

        // Explorer 3: Solution Decomposition
        drawDecomp();
        document.getElementById('ls-dec-system').addEventListener('change', function() {
            drawDecomp();
        });
        ['ls-dec-x0-slider', 'ls-dec-y0-slider'].forEach(function(id) {
            var valId = id.replace('slider', 'value');
            document.getElementById(id).addEventListener('input', function() {
                document.getElementById(valId).textContent = parseFloat(this.value).toFixed(1);
                drawDecomp();
            });
        });
    }

    initializePlots();
})();
