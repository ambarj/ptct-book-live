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
                      '#bb86fc', '#ff5722', '#76ff03', '#40c4ff'];

    // ===== RK4 solver =====
    function rk4Solve(a11, a12, a21, a22, x0, y0, T, N) {
        var h = T / N, X = [x0], Y = [y0], t = [0];
        var x = x0, y = y0;
        for (var i = 0; i < N; i++) {
            var k1x = a11*x + a12*y,                     k1y = a21*x + a22*y;
            var mx1 = x + h/2*k1x, my1 = y + h/2*k1y;
            var k2x = a11*mx1 + a12*my1,                 k2y = a21*mx1 + a22*my1;
            var mx2 = x + h/2*k2x, my2 = y + h/2*k2y;
            var k3x = a11*mx2 + a12*my2,                 k3y = a21*mx2 + a22*my2;
            var mx3 = x + h*k3x, my3 = y + h*k3y;
            var k4x = a11*mx3 + a12*my3,                 k4y = a21*mx3 + a22*my3;
            x += h / 6 * (k1x + 2*k2x + 2*k3x + k4x);
            y += h / 6 * (k1y + 2*k2y + 2*k3y + k4y);
            if (Math.abs(x) > 30 || Math.abs(y) > 30) break;
            X.push(x); Y.push(y); t.push((i + 1) * h);
        }
        return { X: X, Y: Y, t: t };
    }

    // ===== Vector field arrows =====
    function fieldArrows(a11, a12, a21, a22, Rx, Ry, n) {
        var ax = [], ay = [];
        var sx = 2 * Rx / (n - 1), sy = 2 * Ry / (n - 1);
        var sc = Math.min(sx, sy) * 0.32;
        for (var i = 0; i < n; i++) {
            for (var j = 0; j < n; j++) {
                var px = -Rx + i * sx, py = -Ry + j * sy;
                var fx = a11*px + a12*py, fy = a21*px + a22*py;
                var mag = Math.sqrt(fx * fx + fy * fy);
                if (mag < 1e-8) continue;
                ax.push(px, px + fx / mag * sc, null);
                ay.push(py, py + fy / mag * sc, null);
            }
        }
        return { x: ax, y: ay };
    }

    // ===== τ-Δ map background =====
    function drawTDMap(plotId, tau, delta) {
        var nMap = 60;
        var tArr = [], dArr = [], z = [];
        for (var j = 0; j < nMap; j++) {
            var dv = -2 + j * 12 / (nMap - 1);
            dArr.push(dv);
            var row = [];
            for (var i = 0; i < nMap; i++) {
                var tv = -8 + i * 10 / (nMap - 1);
                if (j === 0) tArr.push(tv);
                if (dv < 0) row.push(0);
                else if (tv * tv > 4 * dv) row.push(tv < 0 ? 1 : 2);
                else row.push(tv < 0 ? 3 : (Math.abs(tv) < 0.1 ? 4 : 5));
            }
            z.push(row);
        }

        var traces = [{
            z: z, x: tArr, y: dArr, type: 'heatmap',
            colorscale: [
                [0, 'rgba(255,87,34,0.12)'],
                [0.2, 'rgba(0,243,255,0.12)'],
                [0.4, 'rgba(255,0,110,0.12)'],
                [0.6, 'rgba(0,243,255,0.08)'],
                [0.8, 'rgba(255,190,11,0.15)'],
                [1.0, 'rgba(255,0,110,0.08)']
            ],
            showscale: false, hoverinfo: 'skip'
        }];

        // Parabola
        var pT = [], pD = [];
        for (var t = -8; t <= 2; t += 0.05) { pT.push(t); pD.push(t * t / 4); }
        traces.push({ x: pT, y: pD, type: 'scatter', mode: 'lines',
            line: { color: 'rgba(255,255,255,0.6)', width: 2 },
            hoverinfo: 'skip', showlegend: false });

        // Δ=0 axis
        traces.push({ x: [-8, 2], y: [0, 0], type: 'scatter', mode: 'lines',
            line: { color: 'rgba(255,190,11,0.5)', width: 1.5, dash: 'dash' },
            hoverinfo: 'skip', showlegend: false });

        // τ=0 axis
        traces.push({ x: [0, 0], y: [-2, 10], type: 'scatter', mode: 'lines',
            line: { color: 'rgba(0,255,136,0.4)', width: 1.5, dash: 'dash' },
            hoverinfo: 'skip', showlegend: false });

        // Current point
        traces.push({ x: [tau], y: [delta], type: 'scatter', mode: 'markers',
            marker: { color: '#ff006e', size: 14, symbol: 'star',
                      line: { color: 'white', width: 2 } },
            hoverinfo: 'skip', showlegend: false });

        // Oscillator constraint line (τ ≤ 0, Δ fixed) shown as arrow
        traces.push({ x: [0, tau], y: [delta, delta], type: 'scatter', mode: 'lines',
            line: { color: 'rgba(255,0,110,0.5)', width: 2, dash: 'dot' },
            hoverinfo: 'skip', showlegend: false });

        Plotly.react(plotId, traces, Object.assign({}, darkLayout, {
            xaxis: axStyle([-8, 2], 'τ = −b/m'),
            yaxis: axStyle([-2, 10], 'Δ = k/m'),
            height: 400,
            annotations: [
                { x: -5, y: 8, text: 'Stable<br>Node', font: { color: '#00f3ff', size: 10 }, showarrow: false },
                { x: -2, y: 4, text: 'Stable<br>Spiral', font: { color: '#00f3ff', size: 10 }, showarrow: false },
                { x: 0, y: -1, text: 'Saddle', font: { color: '#ff5722', size: 10 }, showarrow: false }
            ]
        }), { responsive: true });
    }

    // ===== Classify regime =====
    function classifyRegime(m, k, b) {
        var disc = b * b - 4 * m * k;
        if (Math.abs(disc) < 0.05 * Math.sqrt(m * k)) return 'Critically Damped';
        if (b < 0.01) return 'Undamped (Center)';
        return disc < 0 ? 'Underdamped (Spiral)' : 'Overdamped (Node)';
    }

    // ===============================================================
    // EXPLORER 1: Damping Regime Explorer
    // ===============================================================
    function drawExplorer1() {
        var m = parseFloat(document.getElementById('op-m-slider').value);
        var k = parseFloat(document.getElementById('op-k-slider').value);
        var b = parseFloat(document.getElementById('op-b-slider').value);

        var tau = -b / m, delta = k / m;

        // Phase portrait
        var arr = fieldArrows(0, 1, -k/m, -b/m, 3, 6, 10);
        var traces = [{
            x: arr.x, y: arr.y, type: 'scatter', mode: 'lines',
            line: { color: 'rgba(150,150,150,0.2)', width: 1 },
            hoverinfo: 'none', showlegend: false
        }];

        var T = b < 0.3 ? 15 : 10;
        for (var i = 0; i < 6; i++) {
            var x0 = 2.5 * Math.cos(i * Math.PI / 3);
            var v0 = 4 * Math.sin(i * Math.PI / 3);
            var sol = rk4Solve(0, 1, -k/m, -b/m, x0, v0, T, 2000);
            traces.push({
                x: sol.X, y: sol.Y, type: 'scatter', mode: 'lines',
                line: { color: trajColors[i], width: 1.5 },
                hoverinfo: 'none', showlegend: false
            });
        }

        traces.push({
            x: [0], y: [0], type: 'scatter', mode: 'markers',
            marker: { color: '#ffbe0b', size: 10, line: { color: 'white', width: 2 } },
            hoverinfo: 'none', showlegend: false
        });

        var regime = classifyRegime(m, k, b);
        Plotly.react('op-phasePlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle([-3, 3], 'Position x'),
            yaxis: axStyle([-6, 6], 'Velocity v'),
            height: 400,
            annotations: [{ x: 0, y: 5.5, text: regime,
                font: { color: '#ffbe0b', size: 12 }, showarrow: false }]
        }), { responsive: true });

        // τ-Δ map
        drawTDMap('op-tdPlot', tau, delta);

        // Stats
        var bCrit = Math.sqrt(4 * m * k);
        document.getElementById('op-stats1').innerHTML =
            '<span><strong>' + regime + '</strong></span>' +
            '<span>m = ' + m.toFixed(1) + ', k = ' + k.toFixed(1) + ', b = ' + b.toFixed(1) + '</span>' +
            '<span>τ = ' + tau.toFixed(2) + ', Δ = ' + delta.toFixed(2) + '</span>' +
            '<span>b_crit = √(4mk) = ' + bCrit.toFixed(2) + '  |  b/b_crit = ' + (b / bCrit).toFixed(2) + '</span>';
    }

    // ===============================================================
    // EXPLORER 2: Three Regimes Comparison
    // ===============================================================
    function drawComparison() {
        var k = parseFloat(document.getElementById('op-cmp-k-slider').value);
        var m = parseFloat(document.getElementById('op-cmp-m-slider').value);
        var bCrit = Math.sqrt(4 * m * k);

        var cases = [
            { b: 0.4 * bCrit, label: 'Underdamped', color: '#00f3ff', dash: 'solid' },
            { b: bCrit,        label: 'Critical',    color: '#ffbe0b', dash: 'solid' },
            { b: 2.0 * bCrit,  label: 'Overdamped',  color: '#ff006e', dash: 'solid' }
        ];

        var timeTraces = [], phaseTraces = [];

        for (var c = 0; c < cases.length; c++) {
            var b = cases[c].b;
            var sol = rk4Solve(0, 1, -k/m, -b/m, 2.5, 0, 12, 2000);

            timeTraces.push({
                x: sol.t, y: sol.X, type: 'scatter', mode: 'lines',
                line: { color: cases[c].color, width: 2 },
                name: cases[c].label
            });

            phaseTraces.push({
                x: sol.X, y: sol.Y, type: 'scatter', mode: 'lines',
                line: { color: cases[c].color, width: 2 },
                name: cases[c].label, showlegend: false
            });
            // Start marker
            phaseTraces.push({
                x: [2.5], y: [0], type: 'scatter', mode: 'markers',
                marker: { color: cases[c].color, size: 6, line: { color: 'white', width: 1 } },
                hoverinfo: 'none', showlegend: false
            });
        }

        // Zero reference line
        timeTraces.push({
            x: [0, 12], y: [0, 0], type: 'scatter', mode: 'lines',
            line: { color: 'rgba(150,150,150,0.3)', width: 1, dash: 'dot' },
            hoverinfo: 'none', showlegend: false
        });

        Plotly.react('op-comparePlot', timeTraces, Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 12], 'Time t'),
            yaxis: axStyle([-2, 3], 'Position x(t)'),
            height: 400,
            legend: { x: 0.55, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // Fixed point
        phaseTraces.push({
            x: [0], y: [0], type: 'scatter', mode: 'markers',
            marker: { color: '#ffbe0b', size: 8, line: { color: 'white', width: 1.5 } },
            hoverinfo: 'none', showlegend: false
        });

        Plotly.react('op-comparePhasePlot', phaseTraces, Object.assign({}, darkLayout, {
            xaxis: axStyle([-3, 3], 'Position x'),
            yaxis: axStyle([-6, 6], 'Velocity v'),
            height: 400
        }), { responsive: true });

        document.getElementById('op-stats2').innerHTML =
            '<span><strong>IC: (2.5, 0) | ω₀ = ' + Math.sqrt(k/m).toFixed(2) + '</strong></span>' +
            '<span>b_crit = ' + bCrit.toFixed(2) + '</span>' +
            '<span>Underdamped: b = ' + (0.4*bCrit).toFixed(1) +
            '  |  Critical: b = ' + bCrit.toFixed(1) +
            '  |  Overdamped: b = ' + (2*bCrit).toFixed(1) + '</span>';
    }

    // ===============================================================
    // EXPLORER 3: Energy Dissipation
    // ===============================================================
    function drawEnergy() {
        var b = parseFloat(document.getElementById('op-en-b-slider').value);
        var x0 = parseFloat(document.getElementById('op-en-x0-slider').value);
        var m = 1, k = 4;

        var sol = rk4Solve(0, 1, -k/m, -b/m, x0, 0, 15, 3000);

        // Energy contour ellipses
        var phaseTraces = [];
        var E0 = 0.5 * k * x0 * x0;
        var eLevels = [];
        for (var frac = 0.2; frac <= 1.0; frac += 0.2) {
            eLevels.push(E0 * frac);
        }
        eLevels.push(E0 * 1.2);

        for (var ei = 0; ei < eLevels.length; ei++) {
            var E = eLevels[ei];
            var cx = [], cy = [];
            for (var a = 0; a <= 200; a++) {
                var th = a * 2 * Math.PI / 200;
                cx.push(Math.sqrt(2 * E / k) * Math.cos(th));
                cy.push(Math.sqrt(2 * E / m) * Math.sin(th));
            }
            phaseTraces.push({
                x: cx, y: cy, type: 'scatter', mode: 'lines',
                line: { color: 'rgba(100,100,100,0.25)', width: 1 },
                hoverinfo: 'none', showlegend: false
            });
        }

        // Trajectory
        phaseTraces.push({
            x: sol.X, y: sol.Y, type: 'scatter', mode: 'lines',
            line: { color: '#00f3ff', width: 2.5 },
            hoverinfo: 'none', showlegend: false
        });
        phaseTraces.push({
            x: [x0], y: [0], type: 'scatter', mode: 'markers',
            marker: { color: '#00f3ff', size: 8, line: { color: 'white', width: 2 } },
            hoverinfo: 'none', showlegend: false
        });
        phaseTraces.push({
            x: [0], y: [0], type: 'scatter', mode: 'markers',
            marker: { color: '#ffbe0b', size: 8, line: { color: 'white', width: 1.5 } },
            hoverinfo: 'none', showlegend: false
        });

        Plotly.react('op-energyPhasePlot', phaseTraces, Object.assign({}, darkLayout, {
            xaxis: axStyle([-3.5, 3.5], 'Position x'),
            yaxis: axStyle([-7, 7], 'Velocity v'),
            height: 400
        }), { responsive: true });

        // Energy time series
        var Earr = [], tArr = [];
        for (var i = 0; i < sol.t.length; i++) {
            Earr.push(0.5 * m * sol.Y[i] * sol.Y[i] + 0.5 * k * sol.X[i] * sol.X[i]);
            tArr.push(sol.t[i]);
        }

        var gamma = b / (2 * m);
        var envT = [], envE = [];
        for (var i = 0; i < sol.t.length; i += 10) {
            envT.push(sol.t[i]);
            envE.push(Earr[0] * Math.exp(-2 * gamma * sol.t[i]));
        }

        var energyTraces = [
            { x: tArr, y: Earr, type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 2 }, name: 'E(t)' }
        ];
        if (b > 0.01) {
            energyTraces.push({
                x: envT, y: envE, type: 'scatter', mode: 'lines',
                line: { color: '#ff006e', width: 1.5, dash: 'dash' },
                name: 'E₀·e^(-2γt)'
            });
        }

        Plotly.react('op-energyTimePlot', energyTraces, Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 15], 'Time t'),
            yaxis: axStyle([0, Math.max(E0 * 1.2, 2)], 'Energy E'),
            height: 400,
            legend: { x: 0.55, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        var regime = classifyRegime(m, k, b);
        document.getElementById('op-stats3').innerHTML =
            '<span><strong>' + regime + '</strong></span>' +
            '<span>b = ' + b.toFixed(1) + ', γ = b/(2m) = ' + gamma.toFixed(3) + '</span>' +
            '<span>E₀ = ' + Earr[0].toFixed(2) + '  |  τ_energy = 1/(2γ) = ' +
            (gamma > 0.001 ? (1/(2*gamma)).toFixed(2) : '∞') + '</span>';
    }

    // ===============================================================
    // Global functions
    // ===============================================================
    window.opRegimeReset = function() {
        document.getElementById('op-m-slider').value = 1;
        document.getElementById('op-k-slider').value = 4;
        document.getElementById('op-b-slider').value = 1;
        document.getElementById('op-m-value').textContent = '1.0';
        document.getElementById('op-k-value').textContent = '4.0';
        document.getElementById('op-b-value').textContent = '1.0';
        drawExplorer1();
    };

    window.opCompareReset = function() {
        document.getElementById('op-cmp-k-slider').value = 4;
        document.getElementById('op-cmp-m-slider').value = 1;
        document.getElementById('op-cmp-k-value').textContent = '4.0';
        document.getElementById('op-cmp-m-value').textContent = '1.0';
        drawComparison();
    };

    window.opEnergyReset = function() {
        document.getElementById('op-en-b-slider').value = 0.8;
        document.getElementById('op-en-x0-slider').value = 2.5;
        document.getElementById('op-en-b-value').textContent = '0.8';
        document.getElementById('op-en-x0-value').textContent = '2.5';
        drawEnergy();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }
        var el = document.getElementById('op-phasePlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Explorer 1
        drawExplorer1();
        ['op-m-slider', 'op-k-slider', 'op-b-slider'].forEach(function(id) {
            var valId = id.replace('slider', 'value');
            document.getElementById(id).addEventListener('input', function() {
                document.getElementById(valId).textContent = parseFloat(this.value).toFixed(1);
                drawExplorer1();
            });
        });

        // Explorer 2
        drawComparison();
        ['op-cmp-k-slider', 'op-cmp-m-slider'].forEach(function(id) {
            var valId = id.replace('slider', 'value');
            document.getElementById(id).addEventListener('input', function() {
                document.getElementById(valId).textContent = parseFloat(this.value).toFixed(1);
                drawComparison();
            });
        });

        // Explorer 3
        drawEnergy();
        ['op-en-b-slider', 'op-en-x0-slider'].forEach(function(id) {
            var valId = id.replace('slider', 'value');
            document.getElementById(id).addEventListener('input', function() {
                document.getElementById(valId).textContent = parseFloat(this.value).toFixed(1);
                drawEnergy();
            });
        });
    }

    initializePlots();
})();
