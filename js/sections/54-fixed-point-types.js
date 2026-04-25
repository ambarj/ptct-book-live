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

    // ===== Canonical systems for the Type Gallery =====
    var gallery = {
        center:         { name: 'Center',          a: 0,    b: 1,  c: -4,  d: 0,    color: '#bb86fc' },
        stableNode:     { name: 'Stable Node',     a: -1,   b: 0,  c: 0,   d: -3,   color: '#00ff88' },
        unstableNode:   { name: 'Unstable Node',   a: 1,    b: 0,  c: 0,   d: 3,    color: '#ff5722' },
        saddle:         { name: 'Saddle',           a: 2,    b: 0,  c: 0,   d: -1,   color: '#ff006e' },
        stableSpiral:   { name: 'Stable Spiral',   a: -0.2, b: 1,  c: -1,  d: -0.2, color: '#40c4ff' },
        unstableSpiral: { name: 'Unstable Spiral',  a: 0.2,  b: 1,  c: -1,  d: 0.2,  color: '#ffbe0b' }
    };

    // ===== RK4 solver for linear 2D system =====
    function rk4(a, b, c, d, x0, y0, T, N) {
        var h = T / N;
        var X = [x0], Y = [y0];
        var x = x0, y = y0;
        for (var i = 0; i < N; i++) {
            var k1x = a * x + b * y,           k1y = c * x + d * y;
            var mx = x + h / 2 * k1x,          my = y + h / 2 * k1y;
            var k2x = a * mx + b * my,          k2y = c * mx + d * my;
            var nx = x + h / 2 * k2x,          ny = y + h / 2 * k2y;
            var k3x = a * nx + b * ny,          k3y = c * nx + d * ny;
            var ex = x + h * k3x,              ey = y + h * k3y;
            var k4x = a * ex + b * ey,          k4y = c * ex + d * ey;
            x += (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
            y += (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
            if (Math.abs(x) > 15 || Math.abs(y) > 15) break;
            X.push(x); Y.push(y);
        }
        return { X: X, Y: Y };
    }

    // ===== Vector field arrows =====
    function fieldArrows(a, b, c, d, R, n) {
        var ax = [], ay = [];
        var step = 2 * R / (n - 1);
        var sc = step * 0.32;
        for (var i = 0; i < n; i++) {
            for (var j = 0; j < n; j++) {
                var px = -R + i * step;
                var py = -R + j * step;
                var fx = a * px + b * py;
                var fy = c * px + d * py;
                var mag = Math.sqrt(fx * fx + fy * fy);
                if (mag < 1e-8) continue;
                ax.push(px, px + fx / mag * sc, null);
                ay.push(py, py + fy / mag * sc, null);
            }
        }
        return { x: ax, y: ay };
    }

    // ===== Eigenvalue display =====
    function eigenStr(tau, delta) {
        var disc = tau * tau - 4 * delta;
        if (Math.abs(disc) < 0.01) {
            return 'λ = ' + (tau / 2).toFixed(2) + ' (repeated)';
        } else if (disc > 0) {
            var s = Math.sqrt(disc);
            return 'λ₁ = ' + ((tau + s) / 2).toFixed(2) + ',  λ₂ = ' + ((tau - s) / 2).toFixed(2);
        } else {
            var re = (tau / 2).toFixed(2);
            var im = (Math.sqrt(-disc) / 2).toFixed(2);
            return 'λ = ' + re + ' ± ' + im + 'i';
        }
    }

    function classifyStr(tau, delta) {
        if (delta < -0.01) return 'Saddle';
        if (delta < 0.01) return 'Non-isolated (Δ ≈ 0)';
        var disc = tau * tau - 4 * delta;
        if (Math.abs(tau) < 0.05) return 'Center';
        if (disc > 0.01) return tau < 0 ? 'Stable Node' : 'Unstable Node';
        if (disc < -0.01) return tau < 0 ? 'Stable Spiral' : 'Unstable Spiral';
        return tau < 0 ? 'Stable (degenerate)' : 'Unstable (degenerate)';
    }

    function classifyKey(tau, delta) {
        if (delta < -0.01) return 'saddle';
        if (delta < 0.01) return 'degenerate';
        var disc = tau * tau - 4 * delta;
        if (Math.abs(tau) < 0.05) return 'center';
        if (disc > 0.01) return tau < 0 ? 'stableNode' : 'unstableNode';
        if (disc < -0.01) return tau < 0 ? 'stableSpiral' : 'unstableSpiral';
        return 'degenerate';
    }

    // ===== Trajectory colors =====
    var trajColors = ['#00f3ff', '#ff006e', '#ffbe0b', '#00ff88',
                      '#bb86fc', '#ff5722', '#76ff03', '#40c4ff',
                      '#e040fb', '#ff9800', '#00e5ff', '#69f0ae'];

    // ===== EXPLORER 1: Type Gallery =====
    function updateGallery() {
        var key = document.getElementById('ft-type-select').value;
        var sys = gallery[key];
        var tau = sys.a + sys.d;
        var delta = sys.a * sys.d - sys.b * sys.c;

        // Vector field
        var arrows = fieldArrows(sys.a, sys.b, sys.c, sys.d, 3, 12);
        var arrowTrace = {
            x: arrows.x, y: arrows.y,
            type: 'scatter', mode: 'lines',
            line: { color: 'rgba(150,150,150,0.35)', width: 1 },
            hoverinfo: 'none', showlegend: false
        };

        // Trajectories
        var traces = [arrowTrace];
        var T = (key === 'center') ? 8 : (key.indexOf('spiral') >= 0 ? 25 : 10);
        for (var k = 0; k < 12; k++) {
            var theta = k * Math.PI / 6;
            var r = 1.5;
            var sol = rk4(sys.a, sys.b, sys.c, sys.d,
                          r * Math.cos(theta), r * Math.sin(theta), T, 2000);
            traces.push({
                x: sol.X, y: sol.Y,
                type: 'scatter', mode: 'lines',
                line: { color: trajColors[k], width: 1.5 },
                hoverinfo: 'none', showlegend: false
            });
        }

        // Fixed point marker
        traces.push({
            x: [0], y: [0],
            type: 'scatter', mode: 'markers',
            marker: { color: '#ffbe0b', size: 10, symbol: 'circle',
                      line: { color: 'white', width: 2 } },
            hoverinfo: 'none', showlegend: false
        });

        var layout = Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-3, 3], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-3, 3], 'y'),
            height: 440
        });

        Plotly.react('ft-galleryPlot', traces, layout, { responsive: true });

        // Stats bar
        document.getElementById('ft-stats1').innerHTML =
            '<span><strong>' + sys.name + '</strong></span>' +
            '<span>A = [[' + sys.a + ', ' + sys.b + '], [' + sys.c + ', ' + sys.d + ']]</span>' +
            '<span>τ = ' + tau.toFixed(1) + ', Δ = ' + delta.toFixed(1) + '</span>' +
            '<span>' + eigenStr(tau, delta) + '</span>';
    }

    // ===== EXPLORER 2: Trace-Determinant Plane =====
    var tdBackground = null;

    function buildTDBackground() {
        var n = 80;
        var tauArr = [], deltaArr = [], z = [];
        for (var j = 0; j < n; j++) {
            var dv = -3 + j * 9 / (n - 1);
            deltaArr.push(dv);
            var row = [];
            for (var i = 0; i < n; i++) {
                var tv = -4 + i * 8 / (n - 1);
                if (j === 0) tauArr.push(tv);
                if (dv < 0) { row.push(0); }
                else if (tv * tv >= 4 * dv) { row.push(tv >= 0 ? 2 : 1); }
                else { row.push(tv >= 0 ? 4 : 3); }
            }
            z.push(row);
        }
        tdBackground = { tau: tauArr, delta: deltaArr, z: z };
    }

    function drawTDPlane(tauVal, deltaVal) {
        if (!tdBackground) buildTDBackground();

        var heatmap = {
            z: tdBackground.z, x: tdBackground.tau, y: tdBackground.delta,
            type: 'heatmap',
            colorscale: [
                [0.0, 'rgba(255,0,110,0.25)'],
                [0.2, 'rgba(255,0,110,0.25)'],
                [0.2, 'rgba(0,255,136,0.25)'],
                [0.4, 'rgba(0,255,136,0.25)'],
                [0.4, 'rgba(255,87,34,0.25)'],
                [0.6, 'rgba(255,87,34,0.25)'],
                [0.6, 'rgba(64,196,255,0.25)'],
                [0.8, 'rgba(64,196,255,0.25)'],
                [0.8, 'rgba(255,190,11,0.25)'],
                [1.0, 'rgba(255,190,11,0.25)']
            ],
            zmin: -0.5, zmax: 4.5,
            showscale: false, hoverinfo: 'skip'
        };

        // Parabola
        var parX = [], parY = [];
        for (var t = -4; t <= 4; t += 0.05) {
            var pv = t * t / 4;
            if (pv <= 6) { parX.push(t); parY.push(pv); }
        }
        var parabola = {
            x: parX, y: parY,
            type: 'scatter', mode: 'lines',
            line: { color: 'rgba(255,255,255,0.6)', width: 2, dash: 'dash' },
            hoverinfo: 'skip', showlegend: false
        };

        // Current point
        var star = {
            x: [tauVal], y: [deltaVal],
            type: 'scatter', mode: 'markers',
            marker: { color: '#ffbe0b', size: 14, symbol: 'star',
                      line: { color: 'white', width: 2 } },
            hoverinfo: 'skip', showlegend: false
        };

        var layout = Object.assign({}, darkLayout, {
            xaxis: axStyle([-4, 4], 'Trace τ'),
            yaxis: axStyle([-3, 6], 'Determinant Δ'),
            height: 400,
            annotations: [
                { x: 0, y: -1.5, text: 'Saddle', showarrow: false, font: { color: '#ff006e', size: 12 } },
                { x: -2.8, y: 1.2, text: 'Stable<br>Node', showarrow: false, font: { color: '#00ff88', size: 11 } },
                { x: 2.8, y: 1.2, text: 'Unstable<br>Node', showarrow: false, font: { color: '#ff5722', size: 11 } },
                { x: -1.5, y: 4.5, text: 'Stable<br>Spiral', showarrow: false, font: { color: '#40c4ff', size: 11 } },
                { x: 1.5, y: 4.5, text: 'Unstable<br>Spiral', showarrow: false, font: { color: '#ffbe0b', size: 11 } },
                { x: 0, y: 5.5, text: 'Centers', showarrow: false, font: { color: '#bb86fc', size: 11 } }
            ]
        });

        Plotly.react('ft-tdPlot', [heatmap, parabola, star], layout, { responsive: true });
    }

    function updatePhaseFromTD(tauVal, deltaVal) {
        // Companion matrix: dx/dt = y, dy/dt = -delta*x + tau*y
        var a = 0, b = 1, c = -deltaVal, d = tauVal;
        var arrows = fieldArrows(a, b, c, d, 3, 10);
        var arrowTrace = {
            x: arrows.x, y: arrows.y,
            type: 'scatter', mode: 'lines',
            line: { color: 'rgba(150,150,150,0.3)', width: 1 },
            hoverinfo: 'none', showlegend: false
        };

        var traces = [arrowTrace];
        var T = 15;
        for (var k = 0; k < 10; k++) {
            var theta = k * Math.PI / 5;
            var sol = rk4(a, b, c, d, 1.5 * Math.cos(theta), 1.5 * Math.sin(theta), T, 2000);
            traces.push({
                x: sol.X, y: sol.Y,
                type: 'scatter', mode: 'lines',
                line: { color: trajColors[k], width: 1.3 },
                hoverinfo: 'none', showlegend: false
            });
        }

        traces.push({
            x: [0], y: [0],
            type: 'scatter', mode: 'markers',
            marker: { color: '#ffbe0b', size: 8, symbol: 'circle',
                      line: { color: 'white', width: 1.5 } },
            hoverinfo: 'none', showlegend: false
        });

        var layout = Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-3, 3], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-3, 3], 'y'),
            height: 400
        });

        Plotly.react('ft-phasePlot', traces, layout, { responsive: true });

        document.getElementById('ft-stats2').innerHTML =
            '<span><strong>Type:</strong> ' + classifyStr(tauVal, deltaVal) + '</span>' +
            '<span>τ = ' + tauVal.toFixed(1) + ', Δ = ' + deltaVal.toFixed(1) + '</span>' +
            '<span>τ² − 4Δ = ' + (tauVal * tauVal - 4 * deltaVal).toFixed(2) + '</span>' +
            '<span>' + eigenStr(tauVal, deltaVal) + '</span>';
    }

    function updateExplorer2() {
        var tau = parseFloat(document.getElementById('ft-tau-slider').value);
        var delta = parseFloat(document.getElementById('ft-delta-slider').value);
        document.getElementById('ft-tau-value').textContent = tau.toFixed(1);
        document.getElementById('ft-delta-value').textContent = delta.toFixed(1);
        drawTDPlane(tau, delta);
        updatePhaseFromTD(tau, delta);
    }

    // ===== EXPLORER 3: Classification Challenge =====
    var challengeAnswer = '';
    var challengeActive = false;
    var score = { correct: 0, total: 0 };

    function randomSystem(type) {
        var tau, delta;
        switch (type) {
            case 'center':
                tau = 0; delta = 0.5 + Math.random() * 4;
                break;
            case 'stableNode':
                tau = -(2 + Math.random() * 2);
                delta = 0.2 + Math.random() * (tau * tau / 4 - 0.4);
                if (delta < 0.2) delta = 0.2;
                break;
            case 'unstableNode':
                tau = 2 + Math.random() * 2;
                delta = 0.2 + Math.random() * (tau * tau / 4 - 0.4);
                if (delta < 0.2) delta = 0.2;
                break;
            case 'saddle':
                tau = -2 + Math.random() * 4;
                delta = -(0.5 + Math.random() * 2);
                break;
            case 'stableSpiral':
                tau = -(0.3 + Math.random() * 1.5);
                delta = tau * tau / 4 + 0.5 + Math.random() * 2;
                break;
            case 'unstableSpiral':
                tau = 0.3 + Math.random() * 1.5;
                delta = tau * tau / 4 + 0.5 + Math.random() * 2;
                break;
        }
        return { tau: tau, delta: delta };
    }

    function drawChallengePortrait(tau, delta) {
        var a = 0, b = 1, c = -delta, d = tau;
        var traces = [];
        for (var k = 0; k < 12; k++) {
            var theta = k * Math.PI / 6;
            var sol = rk4(a, b, c, d, 1.5 * Math.cos(theta), 1.5 * Math.sin(theta), 15, 2000);
            traces.push({
                x: sol.X, y: sol.Y,
                type: 'scatter', mode: 'lines',
                line: { color: trajColors[k], width: 1.5 },
                hoverinfo: 'none', showlegend: false
            });
        }
        traces.push({
            x: [0], y: [0],
            type: 'scatter', mode: 'markers',
            marker: { color: '#ffbe0b', size: 10, symbol: 'circle',
                      line: { color: 'white', width: 2 } },
            hoverinfo: 'none', showlegend: false
        });

        var layout = Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-3, 3], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-3, 3], 'y'),
            height: 420
        });

        Plotly.react('ft-challengePlot', traces, layout, { responsive: true });
    }

    // ===== Global functions =====

    window.ftGalleryReset = function() {
        document.getElementById('ft-type-select').value = 'center';
        updateGallery();
    };

    window.ftTDReset = function() {
        document.getElementById('ft-tau-slider').value = 0;
        document.getElementById('ft-delta-slider').value = 1;
        updateExplorer2();
    };

    window.ftNewChallenge = function() {
        var types = ['center', 'stableNode', 'unstableNode',
                     'saddle', 'stableSpiral', 'unstableSpiral'];
        var pick = types[Math.floor(Math.random() * types.length)];
        var sys = randomSystem(pick);
        challengeAnswer = pick;
        challengeActive = true;
        drawChallengePortrait(sys.tau, sys.delta);
        document.getElementById('ft-challengeResult').innerHTML =
            '<span style="color: var(--text-secondary);">What type of fixed point is this?</span>';
    };

    window.ftCheckAnswer = function(guess) {
        if (!challengeActive) {
            document.getElementById('ft-challengeResult').innerHTML =
                '<span style="color: #ffbe0b;">Click <strong>New Challenge</strong> first!</span>';
            return;
        }
        challengeActive = false;
        score.total++;
        var names = {
            center: 'Center', stableNode: 'Stable Node', unstableNode: 'Unstable Node',
            saddle: 'Saddle', stableSpiral: 'Stable Spiral', unstableSpiral: 'Unstable Spiral'
        };
        if (guess === challengeAnswer) {
            score.correct++;
            document.getElementById('ft-challengeResult').innerHTML =
                '<span style="color: #00ff88;">✓ Correct! It was a <strong>' + names[challengeAnswer] + '</strong></span>';
        } else {
            document.getElementById('ft-challengeResult').innerHTML =
                '<span style="color: #ff006e;">✗ Not quite. It was a <strong>' + names[challengeAnswer] +
                '</strong>, you guessed ' + names[guess] + '</span>';
        }
        document.getElementById('ft-score').textContent =
            'Score: ' + score.correct + ' / ' + score.total;
    };

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }
        var el = document.getElementById('ft-galleryPlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Explorer 1
        updateGallery();
        var typeSel = document.getElementById('ft-type-select');
        if (typeSel) typeSel.addEventListener('change', updateGallery);

        // Explorer 2
        updateExplorer2();
        var tauSl = document.getElementById('ft-tau-slider');
        var deltaSl = document.getElementById('ft-delta-slider');
        if (tauSl) tauSl.addEventListener('input', updateExplorer2);
        if (deltaSl) deltaSl.addEventListener('input', updateExplorer2);

        // Explorer 3 — start with empty plot
        var emptyLayout = Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-3, 3], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-3, 3], 'y'),
            height: 420,
            annotations: [{
                x: 0, y: 0, text: 'Click "New Challenge" to start',
                showarrow: false, font: { color: '#808080', size: 16 }
            }]
        });
        Plotly.newPlot('ft-challengePlot', [], emptyLayout, { responsive: true });
    }

    initializePlots();
})();
