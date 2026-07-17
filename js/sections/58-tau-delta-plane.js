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
                      '#e040fb', '#ff9800'];

    // ===== RK4 solver =====
    function rk4Solve(f, g, x0, y0, T, N) {
        var h = T / N, X = [x0], Y = [y0];
        var x = x0, y = y0;
        for (var i = 0; i < N; i++) {
            var k1x = f(x, y),                         k1y = g(x, y);
            var k2x = f(x + h/2*k1x, y + h/2*k1y),   k2y = g(x + h/2*k1x, y + h/2*k1y);
            var k3x = f(x + h/2*k2x, y + h/2*k2y),   k3y = g(x + h/2*k2x, y + h/2*k2y);
            var k4x = f(x + h*k3x, y + h*k3y),        k4y = g(x + h*k3x, y + h*k3y);
            x += h / 6 * (k1x + 2*k2x + 2*k3x + k4x);
            y += h / 6 * (k1y + 2*k2y + 2*k3y + k4y);
            if (Math.abs(x) > 20 || Math.abs(y) > 20) break;
            X.push(x); Y.push(y);
        }
        return { X: X, Y: Y };
    }

    // ===== Vector field arrows =====
    function fieldArrows(f, g, R, n) {
        var ax = [], ay = [];
        var step = 2 * R / (n - 1), sc = step * 0.32;
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

    // ===== Build matrix from τ, Δ =====
    // Use A = [[τ/2, 1], [Δ - τ²/4, τ/2]] which has trace τ and det Δ
    // This gives complex eigenvalues when τ²<4Δ (spirals) and real when τ²>4Δ
    function matFromTauDelta(tau, delta) {
        var half = tau / 2;
        return {
            a: half, b: 1,
            c: delta - half * half, d: half
        };
    }

    // ===== Classify =====
    function classify(tau, delta) {
        if (delta < -0.01) return 'Saddle';
        if (Math.abs(delta) <= 0.01) return 'Line of Fixed Points';
        var disc = tau * tau - 4 * delta;
        if (Math.abs(disc) < 0.05 * Math.abs(delta) + 0.05) {
            if (Math.abs(tau) < 0.05) return 'Center (degenerate)';
            return tau < 0 ? 'Stable Star Node' : 'Unstable Star Node';
        }
        if (disc > 0) {
            return tau < -0.01 ? 'Stable Node' : (tau > 0.01 ? 'Unstable Node' : 'Center (degenerate)');
        }
        if (Math.abs(tau) < 0.05) return 'Center';
        return tau < 0 ? 'Stable Spiral' : 'Unstable Spiral';
    }

    function eigenStr(tau, delta) {
        var disc = tau * tau - 4 * delta;
        if (Math.abs(disc) < 0.01) {
            return 'λ = ' + (tau / 2).toFixed(2) + ' (repeated)';
        } else if (disc > 0) {
            var s = Math.sqrt(disc);
            return 'λ₁ = ' + ((tau + s) / 2).toFixed(2) + ',  λ₂ = ' + ((tau - s) / 2).toFixed(2);
        } else {
            return 'λ = ' + (tau / 2).toFixed(2) + ' ± ' + (Math.sqrt(-disc) / 2).toFixed(2) + 'i';
        }
    }

    // ===== Draw τ-Δ map background =====
    function drawTDMap(plotId, tau, delta, extraAnnotations) {
        // Background heatmap for regions
        var nMap = 80;
        var tArr = [], dArr = [], z = [];
        for (var j = 0; j < nMap; j++) {
            var dv = -3 + j * 8 / (nMap - 1);
            dArr.push(dv);
            var row = [];
            for (var i = 0; i < nMap; i++) {
                var tv = -4 + i * 8 / (nMap - 1);
                if (j === 0) tArr.push(tv);
                if (dv < 0) row.push(0);       // saddle
                else if (tv * tv > 4 * dv) row.push(tv < 0 ? 1 : 2);  // node
                else row.push(tv < 0 ? 3 : (Math.abs(tv) < 0.1 ? 4 : 5));  // spiral/center
            }
            z.push(row);
        }

        var traces = [];

        // Heatmap
        traces.push({
            z: z, x: tArr, y: dArr, type: 'heatmap',
            colorscale: [
                [0, 'rgba(255,87,34,0.15)'],      // saddle
                [0.2, 'rgba(0,243,255,0.15)'],     // stable node
                [0.4, 'rgba(255,0,110,0.15)'],     // unstable node
                [0.6, 'rgba(0,243,255,0.1)'],      // stable spiral
                [0.8, 'rgba(255,190,11,0.2)'],     // center
                [1.0, 'rgba(255,0,110,0.1)']       // unstable spiral
            ],
            showscale: false, hoverinfo: 'skip'
        });

        // Parabola boundary
        var pTau = [], pDelta = [];
        for (var t = -4; t <= 4; t += 0.05) {
            pTau.push(t); pDelta.push(t * t / 4);
        }
        traces.push({
            x: pTau, y: pDelta, type: 'scatter', mode: 'lines',
            line: { color: 'rgba(255,255,255,0.7)', width: 2 },
            hoverinfo: 'skip', showlegend: false
        });

        // Δ = 0 axis
        traces.push({
            x: [-4.5, 4.5], y: [0, 0], type: 'scatter', mode: 'lines',
            line: { color: 'rgba(255,190,11,0.6)', width: 1.5, dash: 'dash' },
            hoverinfo: 'skip', showlegend: false
        });

        // τ = 0 axis
        traces.push({
            x: [0, 0], y: [-3, 5], type: 'scatter', mode: 'lines',
            line: { color: 'rgba(0,255,136,0.5)', width: 1.5, dash: 'dash' },
            hoverinfo: 'skip', showlegend: false
        });

        // Current point
        traces.push({
            x: [tau], y: [delta], type: 'scatter', mode: 'markers',
            marker: { color: '#ff006e', size: 14, symbol: 'star',
                      line: { color: 'white', width: 2 } },
            hoverinfo: 'skip', showlegend: false
        });

        var annotations = [
            { x: -3, y: 4.2, text: 'Stable<br>Node', font: { color: '#00f3ff', size: 10 }, showarrow: false },
            { x: 3, y: 4.2, text: 'Unstable<br>Node', font: { color: '#ff006e', size: 10 }, showarrow: false },
            { x: -1, y: 1.8, text: 'Stable<br>Spiral', font: { color: '#00f3ff', size: 10 }, showarrow: false },
            { x: 1, y: 1.8, text: 'Unstable<br>Spiral', font: { color: '#ff006e', size: 10 }, showarrow: false },
            { x: 0, y: -1.5, text: 'Saddle', font: { color: '#ff5722', size: 11 }, showarrow: false }
        ];
        if (extraAnnotations) annotations = annotations.concat(extraAnnotations);

        Plotly.react(plotId, traces, Object.assign({}, darkLayout, {
            xaxis: axStyle([-4.5, 4.5], 'τ (trace)'),
            yaxis: axStyle([-3, 5], 'Δ (determinant)'),
            height: plotId === 'td-mapPlot' ? 420 : 400,
            annotations: annotations
        }), { responsive: true });
    }

    // ===== Draw phase portrait from τ, Δ =====
    function drawPortrait(plotId, tau, delta, height) {
        var m = matFromTauDelta(tau, delta);
        var f = function(x, y) { return m.a * x + m.b * y; };
        var g = function(x, y) { return m.c * x + m.d * y; };

        var arr = fieldArrows(f, g, 3, 10);
        var traces = [{
            x: arr.x, y: arr.y, type: 'scatter', mode: 'lines',
            line: { color: 'rgba(150,150,150,0.25)', width: 1 },
            hoverinfo: 'none', showlegend: false
        }];

        var T = (delta < 0) ? 5 : 12;
        for (var k = 0; k < 10; k++) {
            var theta = k * Math.PI / 5;
            var sol = rk4Solve(f, g, 1.5 * Math.cos(theta), 1.5 * Math.sin(theta), T, 2000);
            traces.push({
                x: sol.X, y: sol.Y, type: 'scatter', mode: 'lines',
                line: { color: trajColors[k], width: 1.5 },
                hoverinfo: 'none', showlegend: false
            });
        }

        // Fixed point
        traces.push({
            x: [0], y: [0], type: 'scatter', mode: 'markers',
            marker: { color: '#ffbe0b', size: 10, line: { color: 'white', width: 2 } },
            hoverinfo: 'none', showlegend: false
        });

        var type = classify(tau, delta);
        Plotly.react(plotId, traces, Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-3, 3], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-3, 3], 'y'),
            height: height || 420,
            annotations: [
                { x: 0, y: 2.7, text: type, font: { color: '#ffbe0b', size: 12 },
                  showarrow: false }
            ]
        }), { responsive: true });
    }

    // ===============================================================
    // EXPLORER 1: τ-Δ Plane Explorer
    // ===============================================================
    function drawExplorer1() {
        var tau = parseFloat(document.getElementById('td-tau-slider').value);
        var delta = parseFloat(document.getElementById('td-delta-slider').value);

        drawTDMap('td-mapPlot', tau, delta);
        drawPortrait('td-portraitPlot', tau, delta, 420);

        var type = classify(tau, delta);
        document.getElementById('td-stats1').innerHTML =
            '<span><strong>' + type + '</strong></span>' +
            '<span>τ = ' + tau.toFixed(1) + ', Δ = ' + delta.toFixed(1) + '</span>' +
            '<span>' + eigenStr(tau, delta) + '</span>' +
            '<span>disc = τ²−4Δ = ' + (tau*tau - 4*delta).toFixed(2) + '</span>';
    }

    // ===============================================================
    // EXPLORER 2: Boundary Navigator
    // ===============================================================
    function drawBoundary() {
        var boundary = document.getElementById('td-boundary-select').value;
        var param = parseFloat(document.getElementById('td-boundary-param').value);
        var offset = parseFloat(document.getElementById('td-boundary-offset').value);

        var tau, delta;
        var boundaryLabel = '';

        if (boundary === 'parabola') {
            // Walk along parabola: param = τ, Δ = τ²/4 + offset
            tau = param;
            delta = param * param / 4 + offset;
            boundaryLabel = 'τ² = 4Δ (node-spiral boundary)';
        } else if (boundary === 'tau-axis') {
            // Walk along τ = 0: param = Δ, τ = offset
            tau = offset;
            delta = param;
            boundaryLabel = 'τ = 0 (stability boundary)';
        } else {
            // Walk along Δ = 0: param = τ, Δ = offset
            tau = param;
            delta = offset;
            boundaryLabel = 'Δ = 0 (saddle boundary)';
        }

        // Extra annotation showing boundary path
        var pathX = [], pathY = [];
        if (boundary === 'parabola') {
            for (var t = -4; t <= 4; t += 0.1) {
                pathX.push(t); pathY.push(t*t/4);
            }
        } else if (boundary === 'tau-axis') {
            pathX = [0, 0]; pathY = [-3, 5];
        } else {
            pathX = [-4.5, 4.5]; pathY = [0, 0];
        }

        drawTDMap('td-boundaryMapPlot', tau, delta, [
            { x: tau > 0 ? tau - 0.5 : tau + 0.5, y: delta + 0.3,
              text: '(' + tau.toFixed(1) + ', ' + delta.toFixed(1) + ')',
              font: { color: 'white', size: 10 }, showarrow: false }
        ]);
        drawPortrait('td-boundaryPortraitPlot', tau, delta, 400);

        var type = classify(tau, delta);
        document.getElementById('td-stats2').innerHTML =
            '<span><strong>' + boundaryLabel + '</strong></span>' +
            '<span>τ = ' + tau.toFixed(1) + ', Δ = ' + delta.toFixed(1) +
            '  |  offset = ' + offset.toFixed(2) + '</span>' +
            '<span>' + type + '  |  ' + eigenStr(tau, delta) + '</span>';
    }

    // ===============================================================
    // EXPLORER 3: Matrix Classifier
    // ===============================================================
    var classPresets = {
        sho:         { a: 0,    b: 1,   c: -1,   d: 0 },
        dampedSHO:   { a: 0,    b: 1,   c: -1,   d: -0.5 },
        predatorPrey:{ a: 0,    b: -2,  c: 1,    d: 0 },
        competition: { a: -1,   b: -2,  c: -1,   d: -1 }
    };

    function drawClassifier() {
        var a = parseFloat(document.getElementById('td-ma-slider').value);
        var b = parseFloat(document.getElementById('td-mb-slider').value);
        var c = parseFloat(document.getElementById('td-mc-slider').value);
        var d = parseFloat(document.getElementById('td-md-slider').value);

        var tau = a + d, delta = a * d - b * c;

        // τ-Δ map
        drawTDMap('td-classMapPlot', tau, delta);

        // Phase portrait using actual matrix (not canonical form)
        var f = function(x, y) { return a * x + b * y; };
        var g = function(x, y) { return c * x + d * y; };

        var arr = fieldArrows(f, g, 3, 10);
        var traces = [{
            x: arr.x, y: arr.y, type: 'scatter', mode: 'lines',
            line: { color: 'rgba(150,150,150,0.25)', width: 1 },
            hoverinfo: 'none', showlegend: false
        }];

        var T = (delta < 0) ? 5 : 12;
        for (var k = 0; k < 10; k++) {
            var theta = k * Math.PI / 5;
            var sol = rk4Solve(f, g, 1.5 * Math.cos(theta), 1.5 * Math.sin(theta), T, 2000);
            traces.push({
                x: sol.X, y: sol.Y, type: 'scatter', mode: 'lines',
                line: { color: trajColors[k], width: 1.5 },
                hoverinfo: 'none', showlegend: false
            });
        }

        traces.push({
            x: [0], y: [0], type: 'scatter', mode: 'markers',
            marker: { color: '#ffbe0b', size: 10, line: { color: 'white', width: 2 } },
            hoverinfo: 'none', showlegend: false
        });

        var type = classify(tau, delta);
        Plotly.react('td-classPortraitPlot', traces, Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-3, 3], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-3, 3], 'y'),
            height: 400,
            annotations: [
                { x: 0, y: 2.7, text: type, font: { color: '#ffbe0b', size: 12 },
                  showarrow: false }
            ]
        }), { responsive: true });

        document.getElementById('td-stats3').innerHTML =
            '<span><strong>' + type + '</strong></span>' +
            '<span>A = [[' + a.toFixed(1) + ', ' + b.toFixed(1) + '], [' +
            c.toFixed(1) + ', ' + d.toFixed(1) + ']]</span>' +
            '<span>τ = ' + tau.toFixed(2) + ', Δ = ' + delta.toFixed(2) + '</span>' +
            '<span>' + eigenStr(tau, delta) + '</span>';
    }

    // ===============================================================
    // Global functions
    // ===============================================================
    window.tdPlaneReset = function() {
        document.getElementById('td-tau-slider').value = 0;
        document.getElementById('td-delta-slider').value = 1;
        document.getElementById('td-tau-value').textContent = '0.0';
        document.getElementById('td-delta-value').textContent = '1.0';
        drawExplorer1();
    };

    window.tdBoundaryReset = function() {
        document.getElementById('td-boundary-select').value = 'parabola';
        document.getElementById('td-boundary-param').value = 0;
        document.getElementById('td-boundary-offset').value = 0;
        document.getElementById('td-boundary-param-value').textContent = '0.0';
        document.getElementById('td-boundary-offset-value').textContent = '0.0';
        drawBoundary();
    };

    window.tdClassReset = function() {
        document.getElementById('td-ma-slider').value = -1;
        document.getElementById('td-mb-slider').value = 2;
        document.getElementById('td-mc-slider').value = -1;
        document.getElementById('td-md-slider').value = -1;
        document.getElementById('td-ma-value').textContent = '-1.0';
        document.getElementById('td-mb-value').textContent = '2.0';
        document.getElementById('td-mc-value').textContent = '-1.0';
        document.getElementById('td-md-value').textContent = '-1.0';
        document.getElementById('td-class-preset').value = 'custom';
        drawClassifier();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }
        var el = document.getElementById('td-mapPlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Explorer 1
        drawExplorer1();
        document.getElementById('td-tau-slider').addEventListener('input', function() {
            document.getElementById('td-tau-value').textContent = parseFloat(this.value).toFixed(1);
            drawExplorer1();
        });
        document.getElementById('td-delta-slider').addEventListener('input', function() {
            document.getElementById('td-delta-value').textContent = parseFloat(this.value).toFixed(1);
            drawExplorer1();
        });

        // Explorer 2
        drawBoundary();
        document.getElementById('td-boundary-select').addEventListener('change', function() {
            drawBoundary();
        });
        document.getElementById('td-boundary-param').addEventListener('input', function() {
            document.getElementById('td-boundary-param-value').textContent = parseFloat(this.value).toFixed(1);
            drawBoundary();
        });
        document.getElementById('td-boundary-offset').addEventListener('input', function() {
            document.getElementById('td-boundary-offset-value').textContent = parseFloat(this.value).toFixed(2);
            drawBoundary();
        });

        // Explorer 3
        drawClassifier();
        ['td-ma-slider', 'td-mb-slider', 'td-mc-slider', 'td-md-slider'].forEach(function(id) {
            var valId = id.replace('slider', 'value');
            document.getElementById(id).addEventListener('input', function() {
                document.getElementById(valId).textContent = parseFloat(this.value).toFixed(1);
                document.getElementById('td-class-preset').value = 'custom';
                drawClassifier();
            });
        });
        document.getElementById('td-class-preset').addEventListener('change', function() {
            var key = this.value;
            if (key === 'custom') return;
            var p = classPresets[key];
            if (!p) return;
            document.getElementById('td-ma-slider').value = p.a;
            document.getElementById('td-mb-slider').value = p.b;
            document.getElementById('td-mc-slider').value = p.c;
            document.getElementById('td-md-slider').value = p.d;
            document.getElementById('td-ma-value').textContent = p.a.toFixed(1);
            document.getElementById('td-mb-value').textContent = p.b.toFixed(1);
            document.getElementById('td-mc-value').textContent = p.c.toFixed(1);
            document.getElementById('td-md-value').textContent = p.d.toFixed(1);
            drawClassifier();
        });
    }

    initializePlots();
})();
