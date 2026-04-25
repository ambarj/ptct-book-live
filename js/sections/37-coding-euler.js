(function() {
    'use strict';

    // ===== Shared layout =====
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

    // ===== Euler solver =====
    function eulerSolve(f, x0, tMax, h) {
        var t = [0], x = [x0];
        var xi = x0, ti = 0;
        var n = Math.round(tMax / h);
        for (var i = 0; i < n; i++) {
            xi = xi + h * f(xi, ti);
            ti += h;
            t.push(ti);
            x.push(xi);
            if (Math.abs(xi) > 1e6) break; // blow-up guard
        }
        return { t: t, x: x };
    }

    // Reference solver (tiny h)
    function refSolve(f, x0, tMax) {
        return eulerSolve(f, x0, tMax, 0.001);
    }

    // ===== ODE library =====
    var solverOdes = [
        {
            f: function(x) { return -2 * x; },
            exact: function(t) { return Math.exp(-2 * t); },
            x0: 1, tMax: 4,
            label: 'dx/dt = -2x',
            yRange: [-0.3, 1.3],
            phaseRange: [-2.5, 0.5]
        },
        {
            f: function(x) { return x * (1 - x); },
            exact: function(t, x0) {
                // x(t) = x0 * e^t / (1 - x0 + x0*e^t)
                return x0 * Math.exp(t) / (1 - x0 + x0 * Math.exp(t));
            },
            x0: 0.1, tMax: 8,
            label: 'dx/dt = x(1-x)',
            yRange: [-0.2, 1.5],
            phaseRange: [-0.3, 0.35]
        },
        {
            f: function(x) { return -Math.sin(x); },
            exact: null,
            x0: 2, tMax: 6,
            label: 'dx/dt = -sin(x)',
            yRange: [-0.5, 2.5],
            phaseRange: [-1.2, 0.2]
        }
    ];

    var labFuncs = [
        { f: function(x) { return -2 * x; }, exact: function(t) { return Math.exp(-2 * t); }, tMax: 4, label: '-2x', yRange: [-0.5, 1.5] },
        { f: function(x) { return x * (1 - x); }, exact: null, tMax: 8, label: 'x(1-x)', yRange: [-0.5, 2] },
        { f: function(x, t) { return Math.cos(t); }, exact: function(t) { return Math.sin(t); }, tMax: 10, label: 'cos(t)', yRange: [-1.5, 1.5] },
        { f: function(x, t) { return -x + Math.sin(t); }, exact: null, tMax: 10, label: '-x+sin(t)', yRange: [-1.5, 1.5] },
        { f: function(x, t) { return x * x - t; }, exact: null, tMax: 4, label: 'x²-t', yRange: [-5, 10] }
    ];

    var labRefs = {};

    // ===== Explorer 1: Code Builder =====
    var codeBlocks = [
        { id: 0, code: 'x0, h, t_max = 1.0, 0.2, 3.0', phase: 'init' },
        { id: 1, code: 'N = int(t_max / h)', phase: 'init' },
        { id: 2, code: 't_list, x_list = [0.0], [x0]', phase: 'init' },
        { id: 3, code: 't, x = 0.0, x0', phase: 'init' },
        { id: 4, code: 'for i in range(N):', phase: 'loop' },
        { id: 5, code: '    x = x + h * f(x, t)', phase: 'loop' },
        { id: 6, code: '    t = t + h', phase: 'loop' },
        { id: 7, code: '    t_list.append(t)', phase: 'store' },
        { id: 8, code: '    x_list.append(x)', phase: 'store' }
    ];

    var correctOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    var builderSelected = [];
    var builderShuffled = [];

    function shuffleArray(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
    }

    function initBuilder() {
        builderSelected = [];
        builderShuffled = shuffleArray(codeBlocks);
        renderBuilder();
        // Clear plot
        Plotly.newPlot('codeEuler-builderPlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 3], 't'),
            yaxis: axStyle([-0.3, 1.3], 'x(t)'),
            annotations: [{
                text: 'Arrange the code correctly<br>to see the solution!',
                xref: 'paper', yref: 'paper',
                x: 0.5, y: 0.5, showarrow: false,
                font: { color: '#808080', size: 14 }
            }]
        }), { responsive: true });
        var fb = document.getElementById('codeEuler-builderFeedback');
        if (fb) fb.innerHTML = '';
    }

    function renderBuilder() {
        var area = document.getElementById('codeEuler-builderArea');
        if (!area) return;

        var html = '';

        // Selected (top)
        if (builderSelected.length > 0) {
            html += '<div style="margin-bottom: 0.8rem; border-bottom: 1px solid #2a2f4a; padding-bottom: 0.8rem;">';
            html += '<div style="font-size: 0.75rem; color: #808080; margin-bottom: 0.4rem;">YOUR ORDER:</div>';
            for (var i = 0; i < builderSelected.length; i++) {
                var b = builderSelected[i];
                var phaseColor = b.phase === 'init' ? '#00f3ff' : b.phase === 'loop' ? '#ff00ff' : '#ffff00';
                html += '<div style="font-family: var(--font-mono); font-size: 0.82rem; padding: 0.3rem 0.5rem; margin: 0.15rem 0; background: rgba(0,243,255,0.08); border-left: 3px solid ' + phaseColor + '; border-radius: 4px; cursor: pointer; opacity: 0.9;" onclick="codeEulerRemoveBlock(' + i + ')">' +
                    '<span style="color: #808080; font-size: 0.7rem;">' + (i + 1) + '. </span>' + b.code + '</div>';
            }
            html += '</div>';
        }

        // Available (bottom)
        var usedIds = builderSelected.map(function(b) { return b.id; });
        var remaining = builderShuffled.filter(function(b) { return usedIds.indexOf(b.id) === -1; });

        if (remaining.length > 0) {
            html += '<div style="font-size: 0.75rem; color: #808080; margin-bottom: 0.4rem;">AVAILABLE BLOCKS:</div>';
            for (var i = 0; i < remaining.length; i++) {
                var b = remaining[i];
                var phaseColor = b.phase === 'init' ? '#00f3ff' : b.phase === 'loop' ? '#ff00ff' : '#ffff00';
                html += '<div style="font-family: var(--font-mono); font-size: 0.82rem; padding: 0.4rem 0.6rem; margin: 0.2rem 0; background: rgba(255,255,255,0.05); border-left: 3px solid ' + phaseColor + '; border-radius: 4px; cursor: pointer; transition: background 0.2s;" ' +
                    'onmouseover="this.style.background=\'rgba(0,243,255,0.12)\'" ' +
                    'onmouseout="this.style.background=\'rgba(255,255,255,0.05)\'" ' +
                    'onclick="codeEulerAddBlock(' + b.id + ')">' + b.code + '</div>';
            }
        }

        if (builderSelected.length === codeBlocks.length) {
            html += '<div style="text-align: center; margin-top: 0.8rem; color: #808080;">All blocks placed! Click <strong>Check Order</strong>.</div>';
        }

        area.innerHTML = html;
    }

    function checkBuilderOrder() {
        var fb = document.getElementById('codeEuler-builderFeedback');
        if (builderSelected.length < codeBlocks.length) {
            if (fb) fb.innerHTML = '<span style="color: #ffff00;">Place all ' + codeBlocks.length + ' blocks first!</span>';
            return;
        }

        var correct = true;
        for (var i = 0; i < correctOrder.length; i++) {
            if (builderSelected[i].id !== correctOrder[i]) {
                correct = false;
                break;
            }
        }

        if (correct) {
            if (fb) fb.innerHTML = '<span style="color: #00ff9f;">&#10003; Correct! The solver runs successfully.</span>';
            // Plot the solution
            var sol = eulerSolve(function(x) { return -2 * x; }, 1.0, 3.0, 0.2);
            var tEx = [], xEx = [];
            for (var i = 0; i <= 300; i++) {
                var t = 3 * i / 300;
                tEx.push(t); xEx.push(Math.exp(-2 * t));
            }
            Plotly.newPlot('codeEuler-builderPlot', [
                { x: tEx, y: xEx, type: 'scatter', mode: 'lines', name: 'Exact', line: { color: '#808080', width: 2, dash: 'dash' } },
                { x: sol.t, y: sol.x, type: 'scatter', mode: 'lines+markers', name: 'Euler', line: { color: '#00f3ff', width: 2 }, marker: { size: 5 } }
            ], Object.assign({}, darkLayout, {
                xaxis: axStyle([0, 3], 't'),
                yaxis: axStyle([-0.3, 1.3], 'x(t)'),
                showlegend: true,
                legend: { x: 0.5, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
            }), { responsive: true });
        } else {
            // Find first wrong position
            var wrongAt = -1;
            for (var i = 0; i < correctOrder.length; i++) {
                if (builderSelected[i].id !== correctOrder[i]) { wrongAt = i + 1; break; }
            }
            if (fb) fb.innerHTML = '<span style="color: #ff6b6b;">&#10007; Not quite &mdash; check block #' + wrongAt + '. Think about what must come first.</span>';
        }
    }

    // ===== Explorer 2: Live Solver =====
    var sinRefSolver = null;

    function plotSolver() {
        var idx = parseInt(document.getElementById('codeEuler-solver-ode').value);
        var h = parseFloat(document.getElementById('codeEuler-solver-h-slider').value);
        var x0 = parseFloat(document.getElementById('codeEuler-solver-x0-slider').value);
        var ode = solverOdes[idx];

        var sol = eulerSolve(ode.f, x0, ode.tMax, h);

        // Reference
        var refT = [], refX = [];
        if (ode.exact) {
            for (var i = 0; i <= 500; i++) {
                var t = ode.tMax * i / 500;
                refT.push(t);
                refX.push(idx === 1 ? ode.exact(t, x0) : ode.exact(t));
            }
        } else {
            if (!sinRefSolver) sinRefSolver = refSolve(ode.f, x0, ode.tMax);
            refT = sinRefSolver.t;
            refX = sinRefSolver.x;
        }

        // Left: time series
        var traces1 = [
            { x: refT, y: refX, type: 'scatter', mode: 'lines', name: 'Exact / Ref', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: sol.t, y: sol.x, type: 'scatter', mode: 'lines+markers', name: 'Euler (h=' + h.toFixed(2) + ')', line: { color: '#00f3ff', width: 2 }, marker: { size: sol.t.length > 60 ? 2 : 5 } }
        ];

        Plotly.newPlot('codeEuler-solverPlot', traces1, Object.assign({}, darkLayout, {
            xaxis: axStyle([0, ode.tMax], 't'),
            yaxis: axStyle(ode.yRange, 'x(t)'),
            showlegend: true,
            legend: { x: 0.4, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: phase portrait (x vs f(x))
        var phaseX = [], phaseY = [];
        for (var i = 0; i < sol.x.length; i++) {
            phaseX.push(sol.x[i]);
            phaseY.push(ode.f(sol.x[i], sol.t[i]));
        }

        // Continuous f(x) curve
        var fxX = [], fxY = [];
        var xMin = Math.min.apply(null, sol.x);
        var xMax = Math.max.apply(null, sol.x);
        for (var i = 0; i <= 200; i++) {
            var xx = xMin + (xMax - xMin) * i / 200;
            fxX.push(xx);
            fxY.push(ode.f(xx, 0));
        }

        Plotly.newPlot('codeEuler-phasePlot', [
            { x: fxX, y: fxY, type: 'scatter', mode: 'lines', name: 'f(x)', line: { color: '#808080', width: 1.5, dash: 'dot' } },
            { x: phaseX, y: phaseY, type: 'scatter', mode: 'lines+markers', name: 'Euler steps', line: { color: '#ff00ff', width: 1.5 }, marker: { size: 4 } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([xMin - 0.1, xMax + 0.1], 'x'),
            yaxis: axStyle(ode.phaseRange, 'f(x)'),
            showlegend: true,
            legend: { x: 0.4, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Stats
        var stepsEl = document.getElementById('codeEuler-solver-steps');
        var errorEl = document.getElementById('codeEuler-solver-error');
        var tFinalEl = document.getElementById('codeEuler-solver-tFinal');
        if (stepsEl) stepsEl.textContent = sol.t.length - 1;
        if (tFinalEl) tFinalEl.textContent = sol.t[sol.t.length - 1].toFixed(2);

        // Error
        if (ode.exact) {
            var refFinal = idx === 1 ? ode.exact(sol.t[sol.t.length - 1], x0) : ode.exact(sol.t[sol.t.length - 1]);
            var err = Math.abs(sol.x[sol.x.length - 1] - refFinal);
            if (errorEl) errorEl.textContent = err.toExponential(2);
        } else {
            if (errorEl) errorEl.textContent = '(no exact)';
        }
    }

    // ===== Explorer 3: Function Lab =====
    function plotLab() {
        var idx = parseInt(document.getElementById('codeEuler-lab-func').value);
        var x0 = parseFloat(document.getElementById('codeEuler-lab-x0-slider').value);
        var h = parseFloat(document.getElementById('codeEuler-lab-h-slider').value);
        var lf = labFuncs[idx];

        var sol = eulerSolve(lf.f, x0, lf.tMax, h);

        // Reference
        var refT = [], refX = [];
        if (lf.exact) {
            for (var i = 0; i <= 500; i++) {
                var t = lf.tMax * i / 500;
                refT.push(t); refX.push(lf.exact(t));
            }
        } else {
            var key = idx + '_' + x0.toFixed(1);
            if (!labRefs[key]) labRefs[key] = refSolve(lf.f, x0, lf.tMax);
            refT = labRefs[key].t;
            refX = labRefs[key].x;
        }

        var traces = [
            { x: refT, y: refX, type: 'scatter', mode: 'lines', name: 'Exact / Ref', line: { color: '#808080', width: 2, dash: 'dash' } },
            { x: sol.t, y: sol.x, type: 'scatter', mode: 'lines+markers', name: 'Euler (h=' + h.toFixed(2) + ')', line: { color: '#00f3ff', width: 2 }, marker: { size: sol.t.length > 80 ? 2 : 5 } }
        ];

        // Clamp y-range for blow-ups
        var yMin = lf.yRange[0], yMax = lf.yRange[1];
        var solMax = Math.max.apply(null, sol.x.map(Math.abs));
        if (solMax > 1e5) {
            yMin = -10; yMax = 10;
        }

        Plotly.newPlot('codeEuler-labPlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle([0, lf.tMax], 't'),
            yaxis: axStyle([yMin, yMax], 'x(t)'),
            showlegend: true,
            legend: { x: 0.4, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        var finalEl = document.getElementById('codeEuler-lab-final');
        var stepsEl = document.getElementById('codeEuler-lab-steps');
        if (finalEl) {
            var fv = sol.x[sol.x.length - 1];
            finalEl.textContent = Math.abs(fv) > 1e5 ? 'BLOW-UP!' : fv.toFixed(4);
            finalEl.style.color = Math.abs(fv) > 1e5 ? '#ff6b6b' : '#00f3ff';
        }
        if (stepsEl) stepsEl.textContent = sol.t.length - 1;
    }

    // ===== Event handlers =====
    function attachHandlers() {
        // Explorer 2
        var solverOde = document.getElementById('codeEuler-solver-ode');
        if (solverOde) solverOde.addEventListener('change', function() { sinRefSolver = null; plotSolver(); });

        var solverH = document.getElementById('codeEuler-solver-h-slider');
        if (solverH) solverH.addEventListener('input', function() {
            document.getElementById('codeEuler-solver-h-value').textContent = parseFloat(this.value).toFixed(2);
            plotSolver();
        });

        var solverX0 = document.getElementById('codeEuler-solver-x0-slider');
        if (solverX0) solverX0.addEventListener('input', function() {
            document.getElementById('codeEuler-solver-x0-value').textContent = parseFloat(this.value).toFixed(2);
            sinRefSolver = null; // x0 changed, recompute ref for nonlinear
            plotSolver();
        });

        // Explorer 3
        var labFunc = document.getElementById('codeEuler-lab-func');
        if (labFunc) labFunc.addEventListener('change', plotLab);

        var labX0 = document.getElementById('codeEuler-lab-x0-slider');
        if (labX0) labX0.addEventListener('input', function() {
            document.getElementById('codeEuler-lab-x0-value').textContent = parseFloat(this.value).toFixed(2);
            plotLab();
        });

        var labH = document.getElementById('codeEuler-lab-h-slider');
        if (labH) labH.addEventListener('input', function() {
            document.getElementById('codeEuler-lab-h-value').textContent = parseFloat(this.value).toFixed(2);
            plotLab();
        });
    }

    // ===== Global functions =====
    window.codeEulerAddBlock = function(id) {
        var block = codeBlocks.filter(function(b) { return b.id === id; })[0];
        if (block && builderSelected.indexOf(block) === -1) {
            builderSelected.push(block);
            renderBuilder();
        }
    };

    window.codeEulerRemoveBlock = function(index) {
        builderSelected.splice(index, 1);
        renderBuilder();
        // Clear plot on edit
        var fb = document.getElementById('codeEuler-builderFeedback');
        if (fb) fb.innerHTML = '';
    };

    window.codeEulerCheck = function() {
        checkBuilderOrder();
    };

    window.codeEulerBuilderReset = function() {
        initBuilder();
    };

    window.codeEulerSolverReset = function() {
        var ode = document.getElementById('codeEuler-solver-ode');
        var hS = document.getElementById('codeEuler-solver-h-slider');
        var x0S = document.getElementById('codeEuler-solver-x0-slider');
        if (ode) ode.value = '0';
        if (hS) { hS.value = 0.2; document.getElementById('codeEuler-solver-h-value').textContent = '0.20'; }
        if (x0S) { x0S.value = 1.0; document.getElementById('codeEuler-solver-x0-value').textContent = '1.00'; }
        sinRefSolver = null;
        plotSolver();
    };

    window.codeEulerLabReset = function() {
        var func = document.getElementById('codeEuler-lab-func');
        var x0S = document.getElementById('codeEuler-lab-x0-slider');
        var hS = document.getElementById('codeEuler-lab-h-slider');
        if (func) func.value = '0';
        if (x0S) { x0S.value = 1.0; document.getElementById('codeEuler-lab-x0-value').textContent = '1.00'; }
        if (hS) { hS.value = 0.1; document.getElementById('codeEuler-lab-h-value').textContent = '0.10'; }
        plotLab();
    };

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }

        var el = document.getElementById('codeEuler-builderPlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        initBuilder();
        plotSolver();
        plotLab();
        attachHandlers();
    }

    initializePlots();
})();
