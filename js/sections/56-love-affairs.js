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

    // ===== General RK4 solver =====
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

    // Quadrant labels for phase portrait
    var quadrantAnnotations = [
        { x: 1.7, y: 1.7, text: 'Mutual<br>Love', font: { color: '#00ff88', size: 11 }, showarrow: false, opacity: 0.7 },
        { x: -1.7, y: 1.7, text: 'J loves<br>R hates', font: { color: '#bb86fc', size: 10 }, showarrow: false, opacity: 0.7 },
        { x: -1.7, y: -1.7, text: 'Mutual<br>Hate', font: { color: '#ff006e', size: 11 }, showarrow: false, opacity: 0.7 },
        { x: 1.7, y: -1.7, text: 'R loves<br>J hates', font: { color: '#ffbe0b', size: 10 }, showarrow: false, opacity: 0.7 }
    ];

    // ===============================================================
    // EXPLORER 1: The Love Story (simple SHO model)
    // ===============================================================
    function drawStory() {
        var r0 = parseFloat(document.getElementById('la-r0-slider').value);
        var j0 = parseFloat(document.getElementById('la-j0-slider').value);

        var f = function(x, y) { return y; };
        var g = function(x, y) { return -x; };

        var traj = rk4Solve(f, g, r0, j0, 8, 2000);
        var arr = fieldArrows(f, g, 3, 10);

        // Phase portrait
        var traces = [
            { x: arr.x, y: arr.y, type: 'scatter', mode: 'lines',
              line: { color: 'rgba(150,150,150,0.25)', width: 1 },
              hoverinfo: 'none', showlegend: false },
            { x: traj.X, y: traj.Y, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2 },
              hoverinfo: 'none', showlegend: false },
            { x: [r0], y: [j0], type: 'scatter', mode: 'markers',
              marker: { color: '#00f3ff', size: 8,
                        line: { color: 'white', width: 2 } },
              hoverinfo: 'none', showlegend: false },
            { x: [0], y: [0], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 8, symbol: 'circle',
                        line: { color: 'white', width: 1.5 } },
              hoverinfo: 'none', showlegend: false }
        ];

        Plotly.react('la-storyPlot', traces, Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-3, 3], 'Romeo R'), { scaleanchor: 'y' }),
            yaxis: axStyle([-3, 3], 'Juliet J'),
            height: 400,
            annotations: quadrantAnnotations
        }), { responsive: true });

        // Time series
        Plotly.react('la-timePlot', [
            { x: traj.t, y: traj.X, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2 }, name: 'Romeo',
              hoverinfo: 'none' },
            { x: traj.t, y: traj.Y, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2 }, name: 'Juliet',
              hoverinfo: 'none' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 8], 'Time t'),
            yaxis: axStyle([-3, 3], 'Feelings'),
            height: 400,
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 11 } }
        }), { responsive: true });

        // Stats
        var amp = Math.sqrt(r0 * r0 + j0 * j0);
        document.getElementById('la-stats1').innerHTML =
            '<span><strong>Simple SHO Model</strong></span>' +
            '<span>ẋ = y, ẏ = -x  |  λ = ±i</span>' +
            '<span>IC: (' + r0.toFixed(1) + ', ' + j0.toFixed(1) + ')</span>' +
            '<span>Amplitude: ' + amp.toFixed(2) + '  |  Period: 2π ≈ 6.28</span>';
    }

    // ===============================================================
    // EXPLORER 2: Personality Parameters
    // ===============================================================
    var presets = {
        eternalCycle:  { a: 0,    b: 1,  c: -1, d: 0,    name: 'Eternal Cycle',   fate: 'Love cycles forever — sweet phases followed by bitter ones' },
        loveFades:     { a: -2,   b: 1,  c: 1,  d: -2,   name: 'Love Fades',      fate: 'Both feelings decay to indifference — the flame dies out' },
        loveGrows:     { a: 2,    b: 1,  c: 1,  d: 2,    name: 'Love Grows',      fate: 'Feelings intensify without bound — explosive passion!' },
        starCrossed:   { a: -1,   b: 2,  c: 2,  d: -1,   name: 'Star-Crossed',    fate: 'Outcome depends on starting point — love or ruin' },
        spiralRomance: { a: -0.3, b: 1,  c: -1, d: -0.3, name: 'Spiral Romance',  fate: 'Oscillating feelings gradually calm to indifference' },
        custom:        { name: 'Custom', fate: '' }
    };

    function classifyFate(tau, delta) {
        if (delta < -0.01) return 'Saddle — outcome depends on starting point';
        if (Math.abs(delta) < 0.01) return 'Degenerate — borderline case';
        var disc = tau * tau - 4 * delta;
        if (Math.abs(tau) < 0.05) return 'Center — eternal cycling';
        if (tau < 0) {
            return disc > 0.01 ? 'Stable Node — feelings decay' :
                                 'Stable Spiral — oscillations fade';
        }
        return disc > 0.01 ? 'Unstable Node — feelings explode' :
                             'Unstable Spiral — wild oscillations grow';
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

    function drawPersonality() {
        var a = parseFloat(document.getElementById('la-a-slider').value);
        var b = parseFloat(document.getElementById('la-b-slider').value);
        var c = parseFloat(document.getElementById('la-c-slider').value);
        var d = parseFloat(document.getElementById('la-d-slider').value);

        var f = function(x, y) { return a * x + b * y; };
        var g = function(x, y) { return c * x + d * y; };

        var arr = fieldArrows(f, g, 3, 10);
        var traces = [{
            x: arr.x, y: arr.y, type: 'scatter', mode: 'lines',
            line: { color: 'rgba(150,150,150,0.3)', width: 1 },
            hoverinfo: 'none', showlegend: false
        }];

        // Multiple trajectories from circle of ICs
        var T = 15;
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
            marker: { color: '#ffbe0b', size: 10, symbol: 'circle',
                      line: { color: 'white', width: 2 } },
            hoverinfo: 'none', showlegend: false
        });

        Plotly.react('la-paramPlot', traces, Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-3, 3], 'Romeo R'), { scaleanchor: 'y' }),
            yaxis: axStyle([-3, 3], 'Juliet J'),
            height: 440,
            annotations: quadrantAnnotations
        }), { responsive: true });

        // Stats
        var tau = a + d, delta = a * d - b * c;
        var preset = document.getElementById('la-preset-select').value;
        var presetName = presets[preset] ? presets[preset].name : 'Custom';

        document.getElementById('la-stats2').innerHTML =
            '<span><strong>' + presetName + '</strong></span>' +
            '<span>A = [[' + a.toFixed(1) + ', ' + b.toFixed(1) + '], [' + c.toFixed(1) + ', ' + d.toFixed(1) + ']]</span>' +
            '<span>τ = ' + tau.toFixed(1) + ', Δ = ' + delta.toFixed(1) + '</span>' +
            '<span>' + eigenStr(tau, delta) + '</span>' +
            '<span>' + classifyFate(tau, delta) + '</span>';
    }

    // ===============================================================
    // EXPLORER 3: Cautiousness vs Responsiveness
    // ===============================================================
    function drawRegime() {
        var alpha = parseFloat(document.getElementById('la-caution-slider').value);
        var beta = parseFloat(document.getElementById('la-response-slider').value);

        // System: R' = -alpha*R + beta*J, J' = beta*R - alpha*J
        var f = function(x, y) { return -alpha * x + beta * y; };
        var g = function(x, y) { return beta * x - alpha * y; };

        // Phase portrait
        var arr = fieldArrows(f, g, 3, 10);
        var traces = [{
            x: arr.x, y: arr.y, type: 'scatter', mode: 'lines',
            line: { color: 'rgba(150,150,150,0.3)', width: 1 },
            hoverinfo: 'none', showlegend: false
        }];

        var T = 15;
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
            marker: { color: '#ffbe0b', size: 10, symbol: 'circle',
                      line: { color: 'white', width: 2 } },
            hoverinfo: 'none', showlegend: false
        });

        // Eigenvector lines for saddle
        if (beta > alpha + 0.05) {
            // Unstable: (1,1), Stable: (1,-1)
            traces.push({
                x: [-3, 3], y: [-3, 3], type: 'scatter', mode: 'lines',
                line: { color: 'rgba(255,87,34,0.5)', width: 1.5, dash: 'dash' },
                hoverinfo: 'none', showlegend: false
            });
            traces.push({
                x: [-3, 3], y: [3, -3], type: 'scatter', mode: 'lines',
                line: { color: 'rgba(0,255,136,0.5)', width: 1.5, dash: 'dash' },
                hoverinfo: 'none', showlegend: false
            });
        }

        Plotly.react('la-regimePlot', traces, Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-3, 3], 'Romeo R'), { scaleanchor: 'y' }),
            yaxis: axStyle([-3, 3], 'Juliet J'),
            height: 400,
            annotations: quadrantAnnotations
        }), { responsive: true });

        // Regime map (right panel)
        drawRegimeMap(alpha, beta);

        // Stats
        var lam1 = beta - alpha, lam2 = -(alpha + beta);
        var type = (Math.abs(lam1) < 0.05) ? 'Degenerate (line of FPs)' :
                   (lam1 > 0) ? 'Saddle — all or nothing' : 'Stable Node — indifference wins';
        document.getElementById('la-stats3').innerHTML =
            '<span><strong>Symmetric Model</strong></span>' +
            '<span>α = ' + alpha.toFixed(1) + ', β = ' + beta.toFixed(1) + '</span>' +
            '<span>λ₁ = β−α = ' + lam1.toFixed(2) + ',  λ₂ = −(α+β) = ' + lam2.toFixed(2) + '</span>' +
            '<span>' + type + '</span>';
    }

    function drawRegimeMap(alpha, beta) {
        // Background heatmap
        var nmap = 60;
        var aArr = [], bArr = [], z = [];
        for (var j = 0; j < nmap; j++) {
            var bv = 0.1 + j * 2.9 / (nmap - 1);
            bArr.push(bv);
            var row = [];
            for (var i = 0; i < nmap; i++) {
                var av = 0.1 + i * 2.9 / (nmap - 1);
                if (j === 0) aArr.push(av);
                row.push(bv > av ? 1 : 0);
            }
            z.push(row);
        }

        var traces = [
            { z: z, x: aArr, y: bArr, type: 'heatmap',
              colorscale: [[0, 'rgba(0,255,136,0.2)'], [1, 'rgba(255,0,110,0.2)']],
              showscale: false, hoverinfo: 'skip' },
            // Diagonal boundary
            { x: [0.1, 3], y: [0.1, 3], type: 'scatter', mode: 'lines',
              line: { color: 'rgba(255,255,255,0.6)', width: 2, dash: 'dash' },
              hoverinfo: 'skip', showlegend: false },
            // Current point
            { x: [alpha], y: [beta], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 14, symbol: 'star',
                        line: { color: 'white', width: 2 } },
              hoverinfo: 'skip', showlegend: false }
        ];

        Plotly.react('la-regimeMapPlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 3.2], 'Cautiousness α'),
            yaxis: axStyle([0, 3.2], 'Responsiveness β'),
            height: 400,
            annotations: [
                { x: 2.2, y: 0.8, text: 'Stable Node<br>Indifference', showarrow: false,
                  font: { color: '#00ff88', size: 12 } },
                { x: 0.8, y: 2.2, text: 'Saddle<br>All or Nothing', showarrow: false,
                  font: { color: '#ff006e', size: 12 } },
                { x: 1.8, y: 1.9, text: 'α = β', showarrow: false,
                  font: { color: 'rgba(255,255,255,0.6)', size: 10 }, textangle: -42 }
            ]
        }), { responsive: true });
    }

    // ===============================================================
    // Global functions
    // ===============================================================

    window.laStoryReset = function() {
        document.getElementById('la-r0-slider').value = 2;
        document.getElementById('la-j0-slider').value = 0;
        document.getElementById('la-r0-value').textContent = '2.0';
        document.getElementById('la-j0-value').textContent = '0.0';
        drawStory();
    };

    window.laPresetChange = function() {
        var key = document.getElementById('la-preset-select').value;
        if (key === 'custom') return;
        var p = presets[key];
        if (!p) return;
        document.getElementById('la-a-slider').value = p.a;
        document.getElementById('la-b-slider').value = p.b;
        document.getElementById('la-c-slider').value = p.c;
        document.getElementById('la-d-slider').value = p.d;
        document.getElementById('la-a-value').textContent = p.a.toFixed(1);
        document.getElementById('la-b-value').textContent = p.b.toFixed(1);
        document.getElementById('la-c-value').textContent = p.c.toFixed(1);
        document.getElementById('la-d-value').textContent = p.d.toFixed(1);
        drawPersonality();
    };

    window.laParamReset = function() {
        document.getElementById('la-preset-select').value = 'eternalCycle';
        window.laPresetChange();
    };

    window.laRegimeReset = function() {
        document.getElementById('la-caution-slider').value = 1.5;
        document.getElementById('la-response-slider').value = 0.8;
        document.getElementById('la-caution-value').textContent = '1.5';
        document.getElementById('la-response-value').textContent = '0.8';
        drawRegime();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }
        var el = document.getElementById('la-storyPlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Explorer 1
        drawStory();
        document.getElementById('la-r0-slider').addEventListener('input', function() {
            document.getElementById('la-r0-value').textContent = parseFloat(this.value).toFixed(1);
            drawStory();
        });
        document.getElementById('la-j0-slider').addEventListener('input', function() {
            document.getElementById('la-j0-value').textContent = parseFloat(this.value).toFixed(1);
            drawStory();
        });

        // Explorer 2
        drawPersonality();
        var paramSliders = ['la-a-slider', 'la-b-slider', 'la-c-slider', 'la-d-slider'];
        var paramValues = ['la-a-value', 'la-b-value', 'la-c-value', 'la-d-value'];
        paramSliders.forEach(function(id, idx) {
            document.getElementById(id).addEventListener('input', function() {
                document.getElementById(paramValues[idx]).textContent = parseFloat(this.value).toFixed(1);
                document.getElementById('la-preset-select').value = 'custom';
                drawPersonality();
            });
        });

        // Explorer 3
        drawRegime();
        document.getElementById('la-caution-slider').addEventListener('input', function() {
            document.getElementById('la-caution-value').textContent = parseFloat(this.value).toFixed(1);
            drawRegime();
        });
        document.getElementById('la-response-slider').addEventListener('input', function() {
            document.getElementById('la-response-value').textContent = parseFloat(this.value).toFixed(1);
            drawRegime();
        });
    }

    initializePlots();
})();
