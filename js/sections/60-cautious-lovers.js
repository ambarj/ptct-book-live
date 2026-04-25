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
    function rk4Solve(a, b, x0, y0, T, N) {
        var h = T / N, X = [x0], Y = [y0], t = [0];
        var x = x0, y = y0;
        for (var i = 0; i < N; i++) {
            var k1x = a*x + b*y,                           k1y = b*x + a*y;
            var mx1 = x + h/2*k1x, my1 = y + h/2*k1y;
            var k2x = a*mx1 + b*my1,                       k2y = b*mx1 + a*my1;
            var mx2 = x + h/2*k2x, my2 = y + h/2*k2y;
            var k3x = a*mx2 + b*my2,                       k3y = b*mx2 + a*my2;
            var mx3 = x + h*k3x, my3 = y + h*k3y;
            var k4x = a*mx3 + b*my3,                       k4y = b*mx3 + a*my3;
            x += h / 6 * (k1x + 2*k2x + 2*k3x + k4x);
            y += h / 6 * (k1y + 2*k2y + 2*k3y + k4y);
            if (Math.abs(x) > 20 || Math.abs(y) > 20) break;
            X.push(x); Y.push(y); t.push((i + 1) * h);
        }
        return { X: X, Y: Y, t: t };
    }

    // ===== Vector field arrows =====
    function fieldArrows(a, b, R, n) {
        var ax = [], ay = [];
        var step = 2 * R / (n - 1), sc = step * 0.32;
        for (var i = 0; i < n; i++) {
            for (var j = 0; j < n; j++) {
                var px = -R + i * step, py = -R + j * step;
                var fx = a*px + b*py, fy = b*px + a*py;
                var mag = Math.sqrt(fx * fx + fy * fy);
                if (mag < 1e-8) continue;
                ax.push(px, px + fx / mag * sc, null);
                ay.push(py, py + fy / mag * sc, null);
            }
        }
        return { x: ax, y: ay };
    }

    function classify(a, b) {
        var l1 = a + b, l2 = a - b;
        if (Math.abs(l1) < 0.05 || Math.abs(l2) < 0.05) return 'Degenerate (line of FPs)';
        if (l1 < 0 && l2 < 0) return 'Stable Node — indifference wins';
        if (l1 > 0 && l2 > 0) return 'Unstable Node — feelings explode';
        return 'Saddle — all or nothing';
    }

    // Quadrant annotations
    var quadAnns = [
        { x: 1.7, y: 1.7, text: 'Mutual<br>Love', font: { color: '#00ff88', size: 10 }, showarrow: false, opacity: 0.6 },
        { x: -1.7, y: 1.7, text: 'J loves<br>R hates', font: { color: '#bb86fc', size: 9 }, showarrow: false, opacity: 0.6 },
        { x: -1.7, y: -1.7, text: 'Mutual<br>Hate', font: { color: '#ff006e', size: 10 }, showarrow: false, opacity: 0.6 },
        { x: 1.7, y: -1.7, text: 'R loves<br>J hates', font: { color: '#ffbe0b', size: 9 }, showarrow: false, opacity: 0.6 }
    ];

    // ===== Draw phase portrait for given (a, b) =====
    function drawPortrait(plotId, a, b, height, extraAnns) {
        var arr = fieldArrows(a, b, 3, 10);
        var traces = [{
            x: arr.x, y: arr.y, type: 'scatter', mode: 'lines',
            line: { color: 'rgba(150,150,150,0.25)', width: 1 },
            hoverinfo: 'none', showlegend: false
        }];

        var l1 = a + b, l2 = a - b;
        var T = (l1 * l2 < 0) ? 5 : 10;
        for (var k = 0; k < 10; k++) {
            var theta = k * Math.PI / 5;
            var sol = rk4Solve(a, b, 1.5 * Math.cos(theta), 1.5 * Math.sin(theta), T, 2000);
            traces.push({
                x: sol.X, y: sol.Y, type: 'scatter', mode: 'lines',
                line: { color: trajColors[k], width: 1.5 },
                hoverinfo: 'none', showlegend: false
            });
        }

        // Eigenvector lines: (1,1) and (1,-1)
        traces.push({
            x: [-3, 3], y: [-3, 3], type: 'scatter', mode: 'lines',
            line: { color: 'rgba(255,87,34,0.5)', width: 2, dash: 'dash' },
            hoverinfo: 'none', showlegend: false
        });
        traces.push({
            x: [-3, 3], y: [3, -3], type: 'scatter', mode: 'lines',
            line: { color: 'rgba(0,255,136,0.5)', width: 2, dash: 'dash' },
            hoverinfo: 'none', showlegend: false
        });

        // Fixed point
        traces.push({
            x: [0], y: [0], type: 'scatter', mode: 'markers',
            marker: { color: '#ffbe0b', size: 10, line: { color: 'white', width: 2 } },
            hoverinfo: 'none', showlegend: false
        });

        var anns = quadAnns.slice();
        anns.push(
            { x: 2.3, y: 2.5, text: 'λ₁=' + l1.toFixed(1), font: { color: '#ff5722', size: 10 }, showarrow: false },
            { x: 2.5, y: -2.3, text: 'λ₂=' + l2.toFixed(1), font: { color: '#00ff88', size: 10 }, showarrow: false }
        );
        if (extraAnns) anns = anns.concat(extraAnns);

        Plotly.react(plotId, traces, Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-3, 3], 'Romeo R'), { scaleanchor: 'y' }),
            yaxis: axStyle([-3, 3], 'Juliet J'),
            height: height || 400,
            annotations: anns
        }), { responsive: true });
    }

    // ===============================================================
    // EXPLORER 1: Personality Explorer
    // ===============================================================
    function drawExplorer1() {
        var a = parseFloat(document.getElementById('cl-a-slider').value);
        var b = parseFloat(document.getElementById('cl-b-slider').value);

        drawPortrait('cl-phasePlot', a, b, 400);

        // Time series from IC (2, 0.5)
        var T = (a + b) * (a - b) < 0 ? 4 : 8;
        var sol = rk4Solve(a, b, 2, 0.5, T, 2000);

        Plotly.react('cl-timePlot', [
            { x: sol.t, y: sol.X, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2 }, name: 'Romeo' },
            { x: sol.t, y: sol.Y, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2 }, name: 'Juliet' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, T], 'Time t'),
            yaxis: axStyle([-3, 3], 'Feelings'),
            height: 400,
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        var l1 = a + b, l2 = a - b;
        document.getElementById('cl-stats1').innerHTML =
            '<span><strong>' + classify(a, b) + '</strong></span>' +
            '<span>a = ' + a.toFixed(1) + ', b = ' + b.toFixed(1) + '</span>' +
            '<span>λ₁ = a+b = ' + l1.toFixed(2) + '  |  λ₂ = a−b = ' + l2.toFixed(2) + '</span>';
    }

    // ===============================================================
    // EXPLORER 2: Parameter Space Map
    // ===============================================================
    function drawParamMap() {
        var a = parseFloat(document.getElementById('cl-map-a-slider').value);
        var b = parseFloat(document.getElementById('cl-map-b-slider').value);

        // Background heatmap
        var nMap = 60;
        var aArr = [], bArr = [], z = [];
        for (var j = 0; j < nMap; j++) {
            var bv = -2 + j * 5 / (nMap - 1);
            bArr.push(bv);
            var row = [];
            for (var i = 0; i < nMap; i++) {
                var av = -3 + i * 5 / (nMap - 1);
                if (j === 0) aArr.push(av);
                var l1 = av + bv, l2 = av - bv;
                if (l1 < 0 && l2 < 0) row.push(0);
                else if (l1 > 0 && l2 > 0) row.push(2);
                else row.push(1);
            }
            z.push(row);
        }

        var mapTraces = [{
            z: z, x: aArr, y: bArr, type: 'heatmap',
            colorscale: [[0, 'rgba(0,243,255,0.2)'], [0.5, 'rgba(255,87,34,0.2)'], [1, 'rgba(255,0,110,0.2)']],
            showscale: false, hoverinfo: 'skip'
        }];

        // Boundary b = -a
        mapTraces.push({ x: [-3, 2], y: [3, -2], type: 'scatter', mode: 'lines',
            line: { color: 'rgba(255,255,255,0.6)', width: 2, dash: 'dash' },
            hoverinfo: 'skip', showlegend: false });
        // Boundary b = a
        mapTraces.push({ x: [-3, 2], y: [-3, 2], type: 'scatter', mode: 'lines',
            line: { color: 'rgba(255,190,11,0.6)', width: 2, dash: 'dash' },
            hoverinfo: 'skip', showlegend: false });

        // Current point
        mapTraces.push({ x: [a], y: [b], type: 'scatter', mode: 'markers',
            marker: { color: '#ff006e', size: 14, symbol: 'star',
                      line: { color: 'white', width: 2 } },
            hoverinfo: 'skip', showlegend: false });

        Plotly.react('cl-paramMapPlot', mapTraces, Object.assign({}, darkLayout, {
            xaxis: axStyle([-3, 2], 'Cautiousness a'),
            yaxis: axStyle([-2, 3], 'Responsiveness b'),
            height: 400,
            annotations: [
                { x: -2.2, y: 0, text: 'Stable<br>Node', font: { color: '#00f3ff', size: 11 }, showarrow: false },
                { x: -0.2, y: 2, text: 'Saddle', font: { color: '#ff5722', size: 11 }, showarrow: false },
                { x: 1.3, y: 0.5, text: 'Unstable<br>Node', font: { color: '#ff006e', size: 10 }, showarrow: false },
                { x: -1, y: 1.2, text: 'b = −a', font: { color: 'rgba(255,255,255,0.5)', size: 9 },
                  showarrow: false, textangle: -45 },
                { x: -1.5, y: -1.3, text: 'b = a', font: { color: 'rgba(255,190,11,0.5)', size: 9 },
                  showarrow: false, textangle: 45 }
            ]
        }), { responsive: true });

        // Phase portrait
        drawPortrait('cl-paramPortraitPlot', a, b, 400);

        var l1 = a + b, l2 = a - b;
        document.getElementById('cl-stats2').innerHTML =
            '<span><strong>' + classify(a, b) + '</strong></span>' +
            '<span>a = ' + a.toFixed(1) + ', b = ' + b.toFixed(1) + '</span>' +
            '<span>λ₁ = ' + l1.toFixed(2) + ', λ₂ = ' + l2.toFixed(2) + '</span>';
    }

    // ===============================================================
    // EXPLORER 3: Scenario Gallery
    // ===============================================================
    var scenarios = {
        guarded:     { a: -2,   b: 0.5,  name: 'Guarded Couple',
            story: 'Both cautious, modest responsiveness. Cautiousness overwhelms — feelings fade to indifference.' },
        tipping:     { a: -1,   b: 1,    name: 'Tipping Point',
            story: 'λ₁ = 0: degenerate case. A line of fixed points along R = J. Couples settle at whatever mutual feeling level they start near.' },
        passionate:  { a: -0.5, b: 2,    name: 'Passionate Couple',
            story: 'Responsiveness far exceeds cautiousness. Saddle: mutual feelings amplify explosively. Love or hate, depending on first impression.' },
        narcissists: { a: 1,    b: 0.3,  name: 'Mutual Narcissists',
            story: 'Self-reinforcing (a > 0): both partners\' feelings amplify on their own. Unstable node — all feelings grow without bound.' },
        contrarian:  { a: -1,   b: -0.5, name: 'Contrarian Couple',
            story: 'Cautious AND contrarian (b < 0): partner\'s love repels. Both eigenvalues strongly negative — feelings collapse rapidly.' }
    };

    function drawScenario() {
        var key = document.getElementById('cl-scenario-select').value;
        var s = scenarios[key];

        drawPortrait('cl-scenarioPlot', s.a, s.b, 440, [
            { x: 0, y: -2.7, text: s.name, font: { color: '#ffbe0b', size: 13 }, showarrow: false }
        ]);

        var l1 = s.a + s.b, l2 = s.a - s.b;
        document.getElementById('cl-stats3').innerHTML =
            '<span><strong>' + s.name + '</strong></span>' +
            '<span>a = ' + s.a.toFixed(1) + ', b = ' + s.b.toFixed(1) +
            '  |  λ₁ = ' + l1.toFixed(1) + ', λ₂ = ' + l2.toFixed(1) + '</span>' +
            '<span>' + s.story + '</span>';
    }

    // ===============================================================
    // Global functions
    // ===============================================================
    window.clPersonalityReset = function() {
        document.getElementById('cl-a-slider').value = -1.5;
        document.getElementById('cl-b-slider').value = 0.8;
        document.getElementById('cl-a-value').textContent = '-1.5';
        document.getElementById('cl-b-value').textContent = '0.8';
        drawExplorer1();
    };

    window.clMapReset = function() {
        document.getElementById('cl-map-a-slider').value = -1;
        document.getElementById('cl-map-b-slider').value = 0.5;
        document.getElementById('cl-map-a-value').textContent = '-1.0';
        document.getElementById('cl-map-b-value').textContent = '0.5';
        drawParamMap();
    };

    window.clScenarioReset = function() {
        document.getElementById('cl-scenario-select').value = 'guarded';
        drawScenario();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }
        var el = document.getElementById('cl-phasePlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Explorer 1
        drawExplorer1();
        ['cl-a-slider', 'cl-b-slider'].forEach(function(id) {
            var valId = id.replace('slider', 'value');
            document.getElementById(id).addEventListener('input', function() {
                document.getElementById(valId).textContent = parseFloat(this.value).toFixed(1);
                drawExplorer1();
            });
        });

        // Explorer 2
        drawParamMap();
        ['cl-map-a-slider', 'cl-map-b-slider'].forEach(function(id) {
            var valId = id.replace('slider', 'value');
            document.getElementById(id).addEventListener('input', function() {
                document.getElementById(valId).textContent = parseFloat(this.value).toFixed(1);
                drawParamMap();
            });
        });

        // Explorer 3
        drawScenario();
        document.getElementById('cl-scenario-select').addEventListener('change', drawScenario);
    }

    initializePlots();
})();
