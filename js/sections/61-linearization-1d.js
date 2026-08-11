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

    // ===== 1D RK4 solver =====
    function rk4_1d(f, x0, T, N) {
        var h = T / N, X = [x0], t = [0], x = x0;
        for (var i = 0; i < N; i++) {
            var k1 = f(x);
            var k2 = f(x + h/2*k1);
            var k3 = f(x + h/2*k2);
            var k4 = f(x + h*k3);
            x += h / 6 * (k1 + 2*k2 + 2*k3 + k4);
            if (Math.abs(x) > 100) break;
            X.push(x); t.push((i + 1) * h);
        }
        return { X: X, t: t };
    }

    // ===== System definitions =====
    var systems = {
        logistic: {
            f: function(x, r) { return r * x * (1 - x / 5); },
            fp: function(x, r) { return r * (1 - 2 * x / 5); },
            fixedPoints: function(r) { return [0, 5]; },
            xRange: [-1, 7], yRange: [-5, 5],
            label: 'ẋ = rx(1 − x/5)'
        },
        cubic: {
            f: function(x) { return x - x * x * x; },
            fp: function(x) { return 1 - 3 * x * x; },
            fixedPoints: function() { return [-1, 0, 1]; },
            xRange: [-2, 2], yRange: [-2, 2],
            label: 'ẋ = x − x³'
        },
        sine: {
            f: function(x) { return Math.sin(x); },
            fp: function(x) { return Math.cos(x); },
            fixedPoints: function() { return [-Math.PI, 0, Math.PI]; },
            xRange: [-4, 4], yRange: [-1.5, 1.5],
            label: 'ẋ = sin(x)'
        },
        quadratic: {
            f: function(x, r) { return r - x * x; },
            fp: function(x) { return -2 * x; },
            fixedPoints: function(r) {
                if (r < 0) return [];
                var s = Math.sqrt(r);
                return [-s, s];
            },
            xRange: [-3, 3], yRange: [-4, 4],
            label: 'ẋ = r − x²'
        }
    };

    function getF(sysKey, r) {
        var sys = systems[sysKey];
        if (sysKey === 'logistic') return function(x) { return sys.f(x, r); };
        if (sysKey === 'quadratic') return function(x) { return sys.f(x, r); };
        return sys.f;
    }

    // ===============================================================
    // EXPLORER 1: Taylor Expansion Visualizer
    // ===============================================================
    function drawTaylor() {
        var sysKey = document.getElementById('lin-system-select').value;
        var r = parseFloat(document.getElementById('lin-r-slider').value);
        var sys = systems[sysKey];
        var f = getF(sysKey, r);
        var fps = sys.fixedPoints(r);

        // The cubic and sine systems have no parameter r — grey the slider
        // out so it doesn't look broken when moving it does nothing
        var rSlider = document.getElementById('lin-r-slider');
        if (rSlider) rSlider.disabled = (sysKey === 'cubic' || sysKey === 'sine');

        // Update fixed point dropdown, preserving the user's selection
        // (repopulating resets the select to index 0 otherwise)
        var fpSelect = document.getElementById('lin-fpIdx-select');
        var prevIdx = parseInt(fpSelect.value);
        fpSelect.innerHTML = '';
        for (var i = 0; i < fps.length; i++) {
            var opt = document.createElement('option');
            opt.value = i;
            opt.textContent = 'x₀ = ' + fps[i].toFixed(2);
            fpSelect.appendChild(opt);
        }
        fpSelect.value = Math.min(isNaN(prevIdx) ? 0 : prevIdx, Math.max(fps.length - 1, 0));

        var fpIdx = Math.min(parseInt(fpSelect.value) || 0, fps.length - 1);
        var x0 = fps[fpIdx];

        // Plot f(x) and tangent line
        var nPts = 400;
        var xArr = [], fArr = [];
        var dx = (sys.xRange[1] - sys.xRange[0]) / (nPts - 1);
        for (var i = 0; i < nPts; i++) {
            var xi = sys.xRange[0] + i * dx;
            xArr.push(xi); fArr.push(f(xi));
        }

        var traces = [
            { x: xArr, y: fArr, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2.5 }, name: 'f(x)' },
            { x: sys.xRange, y: [0, 0], type: 'scatter', mode: 'lines',
              line: { color: '#808080', width: 1, dash: 'dot' },
              hoverinfo: 'skip', showlegend: false }
        ];

        // Tangent lines at each FP
        var fpColors = ['#ff006e', '#00ff88', '#ffbe0b', '#bb86fc'];
        for (var i = 0; i < fps.length; i++) {
            var xp = fps[i];
            var lam = sys.fp(xp, r);
            var lineX = [xp - 1.5, xp + 1.5];
            var lineY = [lam * (lineX[0] - xp), lam * (lineX[1] - xp)];
            traces.push({
                x: lineX, y: lineY, type: 'scatter', mode: 'lines',
                line: { color: fpColors[i % 4], width: 2, dash: 'dash' },
                name: 'λ=' + lam.toFixed(2) + ' at x₀=' + xp.toFixed(1)
            });
            traces.push({
                x: [xp], y: [0], type: 'scatter', mode: 'markers',
                marker: { color: fpColors[i % 4], size: 12,
                    symbol: lam < -0.01 ? 'circle' : (lam > 0.01 ? 'circle-open' : 'diamond'),
                    line: { color: 'white', width: 2 } },
                showlegend: false, hoverinfo: 'none'
            });
        }

        Plotly.react('lin-fPlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle(sys.xRange, 'x'),
            yaxis: axStyle(sys.yRange, 'f(x) = ẋ'),
            height: 400,
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 9 } }
        }), { responsive: true });

        // Phase line (right panel)
        drawPhaseLine(f, fps, sys, r);

        // Stats
        if (fps.length > 0) {
            var lam = sys.fp(x0, r);
            var stability = Math.abs(lam) < 0.01 ? 'Indeterminate (λ ≈ 0)' :
                           (lam < 0 ? 'Stable (λ < 0)' : 'Unstable (λ > 0)');
            document.getElementById('lin-stats1').innerHTML =
                '<span><strong>' + sys.label + '</strong></span>' +
                '<span>Fixed point x₀ = ' + x0.toFixed(2) + '</span>' +
                '<span>λ = f\'(x₀) = ' + lam.toFixed(3) + '  →  ' + stability + '</span>' +
                '<span>Timescale: τ = 1/|λ| = ' + (Math.abs(lam) > 0.01 ? (1/Math.abs(lam)).toFixed(2) : '∞') + '</span>';
        }
    }

    function drawPhaseLine(f, fps, sys, r) {
        // Flow arrows on number line
        var traces = [];
        var nArr = 30;
        var dx = (sys.xRange[1] - sys.xRange[0]) / (nArr - 1);
        var arrowX = [], arrowY = [];
        for (var i = 0; i < nArr; i++) {
            var xi = sys.xRange[0] + i * dx;
            var fi = f(xi);
            var dir = fi > 0 ? 1 : (fi < 0 ? -1 : 0);
            var sc = dx * 0.35;
            arrowX.push(xi, xi + dir * sc, null);
            arrowY.push(0, 0, null);
        }
        traces.push({
            x: arrowX, y: arrowY, type: 'scatter', mode: 'lines',
            line: { color: 'rgba(0,243,255,0.6)', width: 2 },
            hoverinfo: 'none', showlegend: false
        });

        // x-axis
        traces.push({
            x: sys.xRange, y: [0, 0], type: 'scatter', mode: 'lines',
            line: { color: '#808080', width: 1 },
            hoverinfo: 'skip', showlegend: false
        });

        // Fixed points
        var fpColors = ['#ff006e', '#00ff88', '#ffbe0b', '#bb86fc'];
        for (var i = 0; i < fps.length; i++) {
            var lam = sys.fp(fps[i], r);
            traces.push({
                x: [fps[i]], y: [0], type: 'scatter', mode: 'markers',
                marker: { color: fpColors[i % 4], size: 14,
                    symbol: lam < -0.01 ? 'circle' : 'circle-open',
                    line: { color: 'white', width: 2 } },
                hoverinfo: 'none', showlegend: false
            });
        }

        // f(x) curve (faint)
        var xArr = [], fArr = [];
        for (var i = 0; i < 200; i++) {
            var xi = sys.xRange[0] + i * (sys.xRange[1] - sys.xRange[0]) / 199;
            xArr.push(xi); fArr.push(f(xi));
        }
        traces.push({
            x: xArr, y: fArr, type: 'scatter', mode: 'lines',
            line: { color: 'rgba(0,243,255,0.2)', width: 1.5 },
            hoverinfo: 'none', showlegend: false
        });

        var annotations = [];
        for (var i = 0; i < fps.length; i++) {
            var lam = sys.fp(fps[i], r);
            annotations.push({
                x: fps[i], y: -0.4 * (sys.yRange[1] - sys.yRange[0]) / 2,
                text: (lam < -0.01 ? '●' : '○') + ' x₀=' + fps[i].toFixed(1),
                font: { color: fpColors[i % 4], size: 10 }, showarrow: false
            });
        }

        Plotly.react('lin-phaseLine', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle(sys.xRange, 'x'),
            yaxis: axStyle([sys.yRange[0] * 0.5, sys.yRange[1] * 0.5], 'f(x)'),
            height: 400,
            annotations: annotations
        }), { responsive: true });
    }

    // ===============================================================
    // EXPLORER 2: 1D Phase Line with Trajectories
    // ===============================================================
    function drawFlow() {
        var sysKey = document.getElementById('lin-flow-system').value;
        var sys = systems[sysKey];
        // Keep the x0 slider bounded to the current system's plotted range
        // (otherwise x0 can sit outside the visible axes)
        var x0Slider = document.getElementById('lin-x0-slider');
        x0Slider.min = sys.xRange[0];
        x0Slider.max = sys.xRange[1];
        var x0 = Math.max(sys.xRange[0], Math.min(sys.xRange[1], parseFloat(x0Slider.value)));
        var f = getF(sysKey, 2.0);

        // f(x) plot with flow arrows
        var xArr = [], fArr = [];
        for (var i = 0; i < 300; i++) {
            var xi = sys.xRange[0] + i * (sys.xRange[1] - sys.xRange[0]) / 299;
            xArr.push(xi); fArr.push(f(xi));
        }

        var flowTraces = [
            { x: xArr, y: fArr, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2 }, name: 'f(x)' },
            { x: sys.xRange, y: [0, 0], type: 'scatter', mode: 'lines',
              line: { color: '#808080', width: 1, dash: 'dot' },
              hoverinfo: 'skip', showlegend: false },
            { x: [x0], y: [f(x0)], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 12, line: { color: 'white', width: 2 } },
              name: 'x₀ = ' + x0.toFixed(1) }
        ];

        // Direction arrows on the x-axis: point right where f > 0,
        // left where f < 0 (skip points too close to a fixed point)
        var arrX = [], arrSym = [];
        var fps0 = sys.fixedPoints(2.0);
        for (var i = 1; i <= 9; i++) {
            var xa = sys.xRange[0] + i * (sys.xRange[1] - sys.xRange[0]) / 10;
            var nearFP = fps0.some(function(p) {
                return Math.abs(xa - p) < 0.06 * (sys.xRange[1] - sys.xRange[0]);
            });
            if (nearFP || Math.abs(f(xa)) < 1e-6) continue;
            arrX.push(xa);
            arrSym.push(f(xa) > 0 ? 'triangle-right' : 'triangle-left');
        }
        flowTraces.push({
            x: arrX, y: arrX.map(function() { return 0; }),
            type: 'scatter', mode: 'markers',
            marker: { symbol: arrSym, size: 11, color: '#ffbe0b' },
            showlegend: false, hoverinfo: 'skip'
        });

        // Fixed point markers
        var fps = sys.fixedPoints(2.0);
        for (var i = 0; i < fps.length; i++) {
            var lam = sys.fp(fps[i], 2.0);
            flowTraces.push({
                x: [fps[i]], y: [0], type: 'scatter', mode: 'markers',
                marker: { color: lam < -0.01 ? '#00ff88' : '#ff006e', size: 10,
                    symbol: lam < -0.01 ? 'circle' : 'circle-open',
                    line: { color: 'white', width: 2 } },
                showlegend: false, hoverinfo: 'none'
            });
        }

        Plotly.react('lin-flowPlot', flowTraces, Object.assign({}, darkLayout, {
            xaxis: axStyle(sys.xRange, 'x'),
            yaxis: axStyle(sys.yRange, 'f(x) = ẋ'),
            height: 400
        }), { responsive: true });

        // Trajectory x(t)
        var sol = rk4_1d(f, x0, 8, 2000);
        Plotly.react('lin-trajectoryPlot', [
            { x: sol.t, y: sol.X, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2 }, name: 'x(t)' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 8], 'Time t'),
            yaxis: axStyle(sys.xRange, 'x(t)'),
            height: 400
        }), { responsive: true });

        // Determine fate
        var xFinal = sol.X[sol.X.length - 1];
        var nearestFP = fps.length > 0 ? fps.reduce(function(a, b) {
            return Math.abs(a - xFinal) < Math.abs(b - xFinal) ? a : b;
        }) : 'N/A';

        document.getElementById('lin-stats2').innerHTML =
            '<span><strong>' + sys.label + '</strong></span>' +
            '<span>x₀ = ' + x0.toFixed(1) + '  →  converges to x ≈ ' +
            (typeof nearestFP === 'number' ? nearestFP.toFixed(2) : nearestFP) + '</span>';
    }

    // ===============================================================
    // EXPLORER 3: Linear vs Nonlinear Comparison
    // ===============================================================
    var cmpSystems = {
        logistic: { x0: 5, f: function(x) { return 2*x*(1 - x/5); }, lam: -2, label: 'Logistic near K=5' },
        cubic:    { x0: 1, f: function(x) { return x - x*x*x; },     lam: -2, label: 'Cubic near x=1' },
        sine:     { x0: 0, f: function(x) { return Math.sin(x); },    lam: 1,  label: 'Sine near x=0 (unstable)' }
    };

    function drawCompare() {
        var sysKey = document.getElementById('lin-cmp-system').value;
        var y0 = parseFloat(document.getElementById('lin-deviation-slider').value);
        var sys = cmpSystems[sysKey];

        var x0_full = sys.x0 + y0;
        var T = Math.abs(sys.lam) > 0.5 ? 5 : 10;

        var sol = rk4_1d(sys.f, x0_full, T, 2000);

        // Linearized prediction
        var linT = [], linX = [];
        for (var i = 0; i < sol.t.length; i++) {
            linT.push(sol.t[i]);
            linX.push(sys.x0 + y0 * Math.exp(sys.lam * sol.t[i]));
        }

        var traces = [
            { x: sol.t, y: sol.X, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2.5 }, name: 'Exact (nonlinear)' },
            { x: linT, y: linX, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2, dash: 'dash' }, name: 'Linearized' },
            { x: [0, T], y: [sys.x0, sys.x0], type: 'scatter', mode: 'lines',
              line: { color: 'rgba(255,190,11,0.4)', width: 1.5, dash: 'dot' },
              name: 'Fixed point x₀ = ' + sys.x0 }
        ];

        // Dynamic y-range
        var allY = sol.X.concat(linX);
        var yMin = Math.min.apply(null, allY);
        var yMax = Math.max.apply(null, allY);
        var yPad = (yMax - yMin) * 0.15 + 0.5;

        Plotly.react('lin-comparePlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle([0, T], 'Time t'),
            yaxis: axStyle([yMin - yPad, yMax + yPad], 'x(t)'),
            height: 420,
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // Max error
        var maxErr = 0;
        for (var i = 0; i < Math.min(sol.X.length, linX.length); i++) {
            var err = Math.abs(sol.X[i] - linX[i]);
            if (err > maxErr) maxErr = err;
        }

        document.getElementById('lin-stats3').innerHTML =
            '<span><strong>' + sys.label + '</strong></span>' +
            '<span>x₀ = ' + sys.x0 + ', y₀ = ' + y0.toFixed(2) + ', λ = ' + sys.lam + '</span>' +
            '<span>Max |error| = ' + maxErr.toFixed(4) + '</span>';
    }

    // ===============================================================
    // Global functions
    // ===============================================================
    window.linTaylorReset = function() {
        document.getElementById('lin-system-select').value = 'logistic';
        document.getElementById('lin-r-slider').value = 2;
        document.getElementById('lin-r-value').textContent = '2.0';
        drawTaylor();
    };

    window.linFlowReset = function() {
        document.getElementById('lin-flow-system').value = 'logistic';
        document.getElementById('lin-x0-slider').value = 0.2;
        document.getElementById('lin-x0-value').textContent = '0.2';
        drawFlow();
    };

    window.linCompareReset = function() {
        document.getElementById('lin-cmp-system').value = 'logistic';
        document.getElementById('lin-deviation-slider').value = 0.3;
        document.getElementById('lin-deviation-value').textContent = '0.3';
        drawCompare();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }
        var el = document.getElementById('lin-fPlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Explorer 1
        drawTaylor();
        document.getElementById('lin-system-select').addEventListener('change', drawTaylor);
        document.getElementById('lin-fpIdx-select').addEventListener('change', drawTaylor);
        document.getElementById('lin-r-slider').addEventListener('input', function() {
            document.getElementById('lin-r-value').textContent = parseFloat(this.value).toFixed(1);
            drawTaylor();
        });

        // Explorer 2
        drawFlow();
        document.getElementById('lin-flow-system').addEventListener('change', function() {
            // Adjust slider range based on system
            var sys = systems[this.value];
            var slider = document.getElementById('lin-x0-slider');
            slider.min = sys.xRange[0];
            slider.max = sys.xRange[1];
            slider.value = 0.2;
            document.getElementById('lin-x0-value').textContent = '0.2';
            drawFlow();
        });
        document.getElementById('lin-x0-slider').addEventListener('input', function() {
            document.getElementById('lin-x0-value').textContent = parseFloat(this.value).toFixed(1);
            drawFlow();
        });

        // Explorer 3
        drawCompare();
        document.getElementById('lin-cmp-system').addEventListener('change', drawCompare);
        document.getElementById('lin-deviation-slider').addEventListener('input', function() {
            document.getElementById('lin-deviation-value').textContent = parseFloat(this.value).toFixed(2);
            drawCompare();
        });
    }

    initializePlots();
})();
