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

    // ===== Explorer 1: Loop Stepper =====
    var stepperState = {
        step: 0,
        maxSteps: 10,
        values: [],    // { t, x, xNext }
        rule: 'additive',
        autoTimer: null
    };

    function getRule() {
        var sel = document.getElementById('forLoops-rule-select');
        return sel ? sel.value : 'additive';
    }

    function computeStepperData() {
        var N = parseInt(document.getElementById('forLoops-N-slider').value);
        var rule = getRule();
        stepperState.maxSteps = N;
        stepperState.step = 0;
        stepperState.rule = rule;
        stepperState.values = [];

        var h = 0.5;
        var x, x0;

        if (rule === 'additive') {
            x0 = 0; x = 0;
        } else if (rule === 'multiplicative') {
            x0 = 1; x = 1;
        } else {
            // euler-decay: dx/dt = -2x, h = 0.3
            h = 0.3;
            x0 = 1; x = 1;
        }

        for (var i = 0; i <= N; i++) {
            var t = i * h;
            var xNext;
            if (rule === 'additive') {
                xNext = x + 0.5;
            } else if (rule === 'multiplicative') {
                xNext = 1.2 * x;
            } else {
                xNext = x + h * (-2 * x);
            }
            stepperState.values.push({ t: t, x: x, xNext: xNext, i: i });
            x = xNext;
        }
    }

    function getRuleString(rule) {
        if (rule === 'additive') return 'x = x + 0.5';
        if (rule === 'multiplicative') return 'x = 1.2 * x';
        return 'x = x + h*(-2*x)';
    }

    function getH(rule) {
        if (rule === 'euler-decay') return 0.3;
        return 0.5;
    }

    function plotStepper() {
        var step = stepperState.step;
        var vals = stepperState.values;
        var N = stepperState.maxSteps;

        // Build arrays up to current step
        var tArr = [], xArr = [];
        for (var i = 0; i <= Math.min(step, N); i++) {
            tArr.push(vals[i].t);
            xArr.push(vals[i].x);
        }

        var traces = [];

        // Path so far
        if (tArr.length > 0) {
            traces.push({
                x: tArr, y: xArr,
                type: 'scatter', mode: 'lines+markers',
                name: 'Loop output',
                line: { color: '#00f3ff', width: 2.5 },
                marker: { color: '#00f3ff', size: 7 }
            });
        }

        // Current point highlight
        if (step <= N && step < vals.length) {
            traces.push({
                x: [vals[step].t], y: [vals[step].x],
                type: 'scatter', mode: 'markers',
                name: 'Current',
                marker: { color: '#ffff00', size: 12, symbol: 'diamond' },
                showlegend: false
            });
        }

        // Determine axis ranges
        var allX = vals.map(function(v) { return v.x; });
        var xMin = Math.min.apply(null, allX);
        var xMax = Math.max.apply(null, allX);
        var pad = (xMax - xMin) * 0.15 || 1;
        var tMax = vals[N].t;

        var layout = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, tMax * 1.05], 'Step (t)'),
            yaxis: axStyle([xMin - pad, xMax + pad], 'x'),
            showlegend: true,
            legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        });

        Plotly.newPlot('forLoops-stepperPlot', traces, layout, { responsive: true });
        updateCodeDisplay();
        updateStepperButtons();
    }

    function updateCodeDisplay() {
        var el = document.getElementById('forLoops-codeDisplay');
        if (!el) return;

        var step = stepperState.step;
        var vals = stepperState.values;
        var N = stepperState.maxSteps;
        var rule = stepperState.rule;
        var h = getH(rule);
        var ruleStr = getRuleString(rule);

        var x0 = vals[0].x;
        var lines = [];

        // Header
        lines.push('<span style="color:#808080;"># Initialize</span>');
        lines.push('x = ' + x0.toFixed(1));
        lines.push('h = ' + h.toFixed(1));
        lines.push('x_list = [' + x0.toFixed(1) + ']');
        lines.push('');
        lines.push('<span style="color:#808080;"># Loop</span>');
        lines.push('<span style="color:#ff00ff;">for</span> i <span style="color:#ff00ff;">in</span> range(' + N + '):');

        // Show iterations
        for (var i = 0; i < N; i++) {
            var d = vals[i];
            var isCurrent = (i === step);
            var isPast = (i < step);
            var isFuture = (i > step);

            if (isFuture) {
                lines.push('  <span style="color:#444;">  # i=' + i + ' ... (not yet executed)</span>');
                break;  // Only show one future line
            }

            var bg = isCurrent ? 'background:rgba(255,255,0,0.15);display:inline-block;width:100%;' : '';
            var arrow = isCurrent ? '<span style="color:#ffff00;">→ </span>' : '  ';

            if (isPast || isCurrent) {
                var xVal = d.x;
                var xNext = d.xNext;

                if (rule === 'euler-decay') {
                    lines.push('<span style="' + bg + '">' + arrow +
                        '<span style="color:#808080;">i=' + i + ':</span> x = ' +
                        xVal.toFixed(4) + ' + ' + h.toFixed(1) + '×(' +
                        (-2 * xVal).toFixed(4) + ') = <span style="color:#00f3ff;">' +
                        xNext.toFixed(4) + '</span></span>');
                } else {
                    lines.push('<span style="' + bg + '">' + arrow +
                        '<span style="color:#808080;">i=' + i + ':</span> x = ' +
                        ruleStr.replace('x', xVal.toFixed(4)).split('=')[1].trim() +
                        ' = <span style="color:#00f3ff;">' + xNext.toFixed(4) + '</span></span>');
                }
            }
        }

        if (step >= N) {
            lines.push('');
            lines.push('<span style="color:#00ff9f;">✓ Loop complete!</span>');
            lines.push('x_list has <span style="color:#ffff00;">' + (N + 1) + '</span> values');
            lines.push('Final: x = <span style="color:#00f3ff;">' + vals[N].x.toFixed(4) + '</span>');
        }

        el.innerHTML = lines.join('<br>');
    }

    function updateStepperButtons() {
        var stepBtn = document.getElementById('forLoops-step-btn');
        if (stepBtn) stepBtn.disabled = (stepperState.step >= stepperState.maxSteps);
    }

    // ===== Explorer 2: Growth Patterns =====
    function plotGrowth() {
        var h = parseFloat(document.getElementById('forLoops-growth-h-slider').value);
        var N = parseInt(document.getElementById('forLoops-growth-N-slider').value);

        // Three update rules
        var t = [0], xAdd = [0], xMult = [1], xQuad = [0];
        var ti = 0;

        for (var i = 0; i < N; i++) {
            ti += h;
            xAdd.push(xAdd[i] + 1.0);           // x = x + 1
            xMult.push((1 + h) * xMult[i]);      // x = (1+h)*x
            xQuad.push(xQuad[i] + t[i] * h);     // x = x + t*h
            t.push(ti);
        }

        var traces = [
            {
                x: t, y: xAdd,
                type: 'scatter', mode: 'lines+markers',
                name: 'x + 1 (linear)',
                line: { color: '#00f3ff', width: 2 },
                marker: { size: N > 25 ? 2 : 5 }
            },
            {
                x: t, y: xMult,
                type: 'scatter', mode: 'lines+markers',
                name: '(1+h)·x (exponential)',
                line: { color: '#ff00ff', width: 2 },
                marker: { size: N > 25 ? 2 : 5 }
            },
            {
                x: t, y: xQuad,
                type: 'scatter', mode: 'lines+markers',
                name: 'x + t·h (quadratic)',
                line: { color: '#ffff00', width: 2 },
                marker: { size: N > 25 ? 2 : 5 }
            }
        ];

        // Dynamic y-range based on max value
        var yMax = Math.max(xAdd[N], xMult[N], xQuad[N]);
        var yRange = [Math.min(0, -yMax * 0.05), yMax * 1.15];

        var layout = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, t[N] * 1.05], 't'),
            yaxis: axStyle(yRange, 'x(t)'),
            showlegend: true,
            legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        });

        Plotly.newPlot('forLoops-growthPlot', traces, layout, { responsive: true });
    }

    // ===== Explorer 3: Update Recipe (Euler bridge) =====
    var odes = [
        {
            f: function(x) { return -2 * x; },
            exact: function(t) { return Math.exp(-2 * t); },
            x0: 1, tMax: 3,
            label: 'dx/dt = -2x',
            yRange: [-0.5, 1.3]
        },
        {
            f: function(x) { return x; },
            exact: function(t) { return Math.exp(t); },
            x0: 1, tMax: 3,
            label: 'dx/dt = x',
            yRange: [-2, 25]
        },
        {
            f: function(x) { return -Math.sin(x); },
            exact: null,
            x0: 2, tMax: 5,
            label: 'dx/dt = -sin(x)',
            yRange: [-0.5, 2.5]
        }
    ];

    var sinRef = null;

    function computeReference(ode) {
        var h = 0.001;
        var n = Math.round(ode.tMax / h);
        var t = [0], x = [ode.x0];
        var xi = ode.x0, ti = 0;
        for (var i = 0; i < n; i++) {
            xi = xi + h * ode.f(xi, ti);
            ti += h;
            t.push(ti);
            x.push(xi);
        }
        return { t: t, x: x };
    }

    function interpRef(ref, tTarget) {
        for (var i = 0; i < ref.t.length - 1; i++) {
            if (ref.t[i] <= tTarget && ref.t[i + 1] >= tTarget) {
                var frac = (tTarget - ref.t[i]) / (ref.t[i + 1] - ref.t[i]);
                return ref.x[i] + frac * (ref.x[i + 1] - ref.x[i]);
            }
        }
        return ref.x[ref.x.length - 1];
    }

    function plotRecipe() {
        var idx = parseInt(document.getElementById('forLoops-ode-select').value);
        var h = parseFloat(document.getElementById('forLoops-recipe-h-slider').value);
        var ode = odes[idx];

        // Euler solve
        var t = [0], x = [ode.x0];
        var xi = ode.x0, ti = 0;
        var N = Math.round(ode.tMax / h);
        for (var i = 0; i < N; i++) {
            xi = xi + h * ode.f(xi, ti);
            ti += h;
            t.push(ti);
            x.push(xi);
        }

        // Reference / exact
        var refT = [], refX = [];
        if (ode.exact) {
            for (var i = 0; i <= 500; i++) {
                var tt = ode.tMax * i / 500;
                refT.push(tt);
                refX.push(ode.exact(tt));
            }
        } else {
            if (!sinRef) sinRef = computeReference(ode);
            refT = sinRef.t;
            refX = sinRef.x;
        }

        // Error at each step
        var errT = [], errY = [];
        for (var i = 0; i < t.length; i++) {
            var refVal;
            if (ode.exact) {
                refVal = ode.exact(t[i]);
            } else {
                refVal = interpRef(sinRef, t[i]);
            }
            errT.push(t[i]);
            errY.push(Math.abs(x[i] - refVal));
        }

        // Left panel: solution
        var traces1 = [
            {
                x: refT, y: refX,
                type: 'scatter', mode: 'lines',
                name: 'Exact / Reference',
                line: { color: '#808080', width: 2, dash: 'dash' }
            },
            {
                x: t, y: x,
                type: 'scatter', mode: 'lines+markers',
                name: 'Euler (h=' + h.toFixed(2) + ')',
                line: { color: '#00f3ff', width: 2 },
                marker: { size: N > 30 ? 2 : 5 }
            }
        ];

        // Dynamic y-range for growth ODE
        var yRange = ode.yRange;
        if (idx === 1) {
            var maxVal = Math.max.apply(null, x.concat(refX.slice(0, 500)));
            if (maxVal > 25) yRange = [-2, Math.min(maxVal * 1.1, 500)];
        }

        var layout1 = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, ode.tMax], 't'),
            yaxis: axStyle(yRange, 'x(t)'),
            showlegend: true,
            legend: { x: 0.35, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        });

        Plotly.newPlot('forLoops-recipePlot', traces1, layout1, { responsive: true });

        // Right panel: error
        var maxErr = Math.max.apply(null, errY);
        var errRange = [0, Math.max(maxErr * 1.15, 0.01)];

        var traces2 = [{
            x: errT, y: errY,
            type: 'scatter', mode: 'lines+markers',
            name: '|error|',
            line: { color: '#ff6b6b', width: 2 },
            marker: { size: N > 30 ? 2 : 5 },
            fill: 'tozeroy',
            fillcolor: 'rgba(255,107,107,0.15)'
        }];

        var layout2 = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, ode.tMax], 't'),
            yaxis: axStyle(errRange, '|Error|'),
            showlegend: false
        });

        Plotly.newPlot('forLoops-errorPlot', traces2, layout2, { responsive: true });

        // Update label
        var labelEl = document.getElementById('forLoops-ode-label');
        if (labelEl) labelEl.textContent = ode.label;
    }

    // ===== Event handlers =====
    function attachHandlers() {
        // Explorer 1
        var nSlider = document.getElementById('forLoops-N-slider');
        if (nSlider) {
            nSlider.addEventListener('input', function() {
                document.getElementById('forLoops-N-value').textContent = this.value;
                computeStepperData();
                plotStepper();
            });
        }

        var ruleSelect = document.getElementById('forLoops-rule-select');
        if (ruleSelect) {
            ruleSelect.addEventListener('change', function() {
                var labelEl = document.getElementById('forLoops-rule-label');
                if (labelEl) labelEl.textContent = getRuleString(this.value);
                computeStepperData();
                plotStepper();
            });
        }

        // Explorer 2
        var ghSlider = document.getElementById('forLoops-growth-h-slider');
        if (ghSlider) {
            ghSlider.addEventListener('input', function() {
                document.getElementById('forLoops-growth-h-value').textContent =
                    parseFloat(this.value).toFixed(2);
                plotGrowth();
            });
        }

        var gnSlider = document.getElementById('forLoops-growth-N-slider');
        if (gnSlider) {
            gnSlider.addEventListener('input', function() {
                document.getElementById('forLoops-growth-N-value').textContent = this.value;
                plotGrowth();
            });
        }

        // Explorer 3
        var odeSelect = document.getElementById('forLoops-ode-select');
        if (odeSelect) {
            odeSelect.addEventListener('change', plotRecipe);
        }

        var rhSlider = document.getElementById('forLoops-recipe-h-slider');
        if (rhSlider) {
            rhSlider.addEventListener('input', function() {
                document.getElementById('forLoops-recipe-h-value').textContent =
                    parseFloat(this.value).toFixed(2);
                plotRecipe();
            });
        }
    }

    // ===== Global functions (onclick) =====
    window.forLoopsStep = function() {
        if (stepperState.step < stepperState.maxSteps) {
            stepperState.step++;
            plotStepper();
        }
    };

    window.forLoopsRun = function() {
        if (stepperState.autoTimer) {
            clearInterval(stepperState.autoTimer);
            stepperState.autoTimer = null;
        }
        stepperState.autoTimer = setInterval(function() {
            if (stepperState.step < stepperState.maxSteps) {
                stepperState.step++;
                plotStepper();
            } else {
                clearInterval(stepperState.autoTimer);
                stepperState.autoTimer = null;
            }
        }, 300);
    };

    window.forLoopsReset = function() {
        if (stepperState.autoTimer) {
            clearInterval(stepperState.autoTimer);
            stepperState.autoTimer = null;
        }
        computeStepperData();
        plotStepper();
    };

    window.forLoopsGrowthReset = function() {
        var hSlider = document.getElementById('forLoops-growth-h-slider');
        var nSlider = document.getElementById('forLoops-growth-N-slider');
        if (hSlider) { hSlider.value = 0.3; document.getElementById('forLoops-growth-h-value').textContent = '0.30'; }
        if (nSlider) { nSlider.value = 20; document.getElementById('forLoops-growth-N-value').textContent = '20'; }
        plotGrowth();
    };

    window.forLoopsRecipeReset = function() {
        var odeSelect = document.getElementById('forLoops-ode-select');
        var hSlider = document.getElementById('forLoops-recipe-h-slider');
        if (odeSelect) { odeSelect.value = '0'; }
        if (hSlider) { hSlider.value = 0.3; document.getElementById('forLoops-recipe-h-value').textContent = '0.30'; }
        var labelEl = document.getElementById('forLoops-ode-label');
        if (labelEl) labelEl.textContent = 'dx/dt = -2x';
        plotRecipe();
    };

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }

        var el = document.getElementById('forLoops-stepperPlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        computeStepperData();
        plotStepper();
        plotGrowth();
        plotRecipe();
        attachHandlers();
    }

    initializePlots();
})();
