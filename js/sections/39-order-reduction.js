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

    // ===== Vector Euler solver =====
    function eulerSystem(f, y0, tMax, h) {
        var n = Math.round(tMax / h);
        var t = [0], Y = [y0.slice()];
        var y = y0.slice(), ti = 0;
        for (var i = 0; i < n; i++) {
            var dy = f(y, ti);
            var yNew = [];
            for (var j = 0; j < y.length; j++) {
                yNew.push(y[j] + h * dy[j]);
            }
            y = yNew;
            ti += h;
            t.push(ti);
            Y.push(y.slice());
            if (Math.abs(y[0]) > 1e6 || Math.abs(y[1]) > 1e6) break;
        }
        return { t: t, Y: Y };
    }

    // ===== Explorer 1: ODE Transformer =====
    var equations = [
        {
            name: 'Simple Harmonic Oscillator',
            original: '$$\\ddot{x} = -\\omega_0^2\\, x$$',
            step1: 'Define \\(v = \\dot{x}\\), so \\(\\ddot{x} = \\dot{v}\\)',
            reduced: ['\\dfrac{dx}{dt} = v', '\\dfrac{dv}{dt} = -\\omega_0^2\\, x'],
            stateVec: '\\mathbf{y} = \\begin{bmatrix} x \\\\ v \\end{bmatrix}'
        },
        {
            name: 'Damped Oscillator',
            original: '$$\\ddot{x} = -2\\gamma\\dot{x} - \\omega_0^2\\, x$$',
            step1: 'Define \\(v = \\dot{x}\\), replace \\(\\dot{x} \\to v\\) and \\(\\ddot{x} \\to \\dot{v}\\)',
            reduced: ['\\dfrac{dx}{dt} = v', '\\dfrac{dv}{dt} = -2\\gamma\\, v - \\omega_0^2\\, x'],
            stateVec: '\\mathbf{y} = \\begin{bmatrix} x \\\\ v \\end{bmatrix}'
        },
        {
            name: 'Driven Oscillator',
            original: '$$\\ddot{x} = -2\\gamma\\dot{x} - \\omega_0^2\\, x + F_0\\cos(\\omega_d t)$$',
            step1: 'Define \\(v = \\dot{x}\\), all \\(\\dot{x}\\) terms become \\(v\\)',
            reduced: ['\\dfrac{dx}{dt} = v', '\\dfrac{dv}{dt} = -2\\gamma\\, v - \\omega_0^2\\, x + F_0\\cos(\\omega_d t)'],
            stateVec: '\\mathbf{y} = \\begin{bmatrix} x \\\\ v \\end{bmatrix}'
        },
        {
            name: 'Real Pendulum',
            original: '$$\\ddot{\\theta} = -\\frac{g}{L}\\sin\\theta$$',
            step1: 'Define \\(\\omega = \\dot{\\theta}\\) (angular velocity)',
            reduced: ['\\dfrac{d\\theta}{dt} = \\omega', '\\dfrac{d\\omega}{dt} = -\\frac{g}{L}\\sin\\theta'],
            stateVec: '\\mathbf{y} = \\begin{bmatrix} \\theta \\\\ \\omega \\end{bmatrix}'
        }
    ];

    var transformStep = 0;

    function renderTransform() {
        var idx = parseInt(document.getElementById('orderRed-eq-select').value);
        var eq = equations[idx];

        var origEl = document.getElementById('orderRed-original');
        var redEl = document.getElementById('orderRed-reduced');

        // Always show original
        origEl.innerHTML = '<div style="text-align:center;">' +
            '<div style="font-size:0.8rem;color:#808080;margin-bottom:0.5rem;">ORIGINAL (2nd order)</div>' +
            '<div style="font-size:1.1rem;margin-bottom:1rem;">' + eq.original + '</div>' +
            '<div style="font-size:0.85rem;color:#ffff00;">One equation, two time derivatives</div></div>';

        if (transformStep === 0) {
            redEl.innerHTML = '<div style="text-align:center;color:#808080;padding-top:3rem;">' +
                '<p style="font-size:1.2rem;">?</p>' +
                '<p>Click <strong>Show Steps</strong> to transform</p></div>';
        } else if (transformStep === 1) {
            redEl.innerHTML = '<div style="text-align:center;">' +
                '<div style="font-size:0.8rem;color:#808080;margin-bottom:0.5rem;">STEP 1: Substitution</div>' +
                '<div style="font-size:1rem;color:#ffff00;margin-bottom:1rem;">' + eq.step1 + '</div>' +
                '<div style="font-size:0.85rem;color:#808080;">Now we have two unknowns: \\(x\\) and \\(v\\)...</div></div>';
        } else {
            redEl.innerHTML = '<div style="text-align:center;">' +
                '<div style="font-size:0.8rem;color:#808080;margin-bottom:0.5rem;">REDUCED SYSTEM (1st order)</div>' +
                '<div style="font-size:1rem;margin:0.5rem 0;color:#00f3ff;">$$' + eq.reduced[0] + '$$</div>' +
                '<div style="font-size:1rem;margin:0.5rem 0;color:#ff00ff;">$$' + eq.reduced[1] + '$$</div>' +
                '<div style="font-size:0.9rem;margin-top:1rem;color:#808080;">State vector: \\(' + eq.stateVec + '\\)</div>' +
                '<div style="font-size:0.85rem;color:#00ff9f;margin-top:0.5rem;">Two equations, one derivative each &#10003;</div></div>';
        }

        // Re-render MathJax
        if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
            MathJax.typesetPromise([origEl, redEl]);
        }
    }

    // ===== Explorer 2: State Space Viewer =====
    var systemDefs = [
        { // SHO
            f: function(y, t, w0, g) { return [y[1], -w0 * w0 * y[0]]; },
            label: 'SHO'
        },
        { // Damped
            f: function(y, t, w0, g) { return [y[1], -2 * g * y[1] - w0 * w0 * y[0]]; },
            label: 'Damped'
        },
        { // Pendulum
            f: function(y, t, w0, g) { return [y[1], -w0 * w0 * Math.sin(y[0])]; },
            label: 'Pendulum'
        }
    ];

    function plotViewer() {
        var sysIdx = parseInt(document.getElementById('orderRed-system-select').value);
        var w0 = parseFloat(document.getElementById('orderRed-omega-slider').value);
        var gamma = parseFloat(document.getElementById('orderRed-gamma-slider').value);
        var h = parseFloat(document.getElementById('orderRed-h-slider').value);
        var sys = systemDefs[sysIdx];

        var tMax = 15;
        var f = function(y, t) { return sys.f(y, t, w0, gamma); };
        var sol = eulerSystem(f, [1.0, 0.0], tMax, h);

        var tArr = sol.t;
        var xArr = sol.Y.map(function(y) { return y[0]; });
        var vArr = sol.Y.map(function(y) { return y[1]; });

        // Left: time series
        Plotly.newPlot('orderRed-timePlot', [
            { x: tArr, y: xArr, type: 'scatter', mode: 'lines', name: 'x(t)', line: { color: '#00f3ff', width: 2 } },
            { x: tArr, y: vArr, type: 'scatter', mode: 'lines', name: 'v(t)', line: { color: '#ff00ff', width: 1.5, dash: 'dot' } }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, tMax], 't'),
            yaxis: axStyle([-3, 3], 'x, v'),
            showlegend: true,
            legend: { x: 0.7, y: 0.98, bgcolor: 'rgba(0,0,0,0.5)' }
        }), { responsive: true });

        // Right: phase portrait
        Plotly.newPlot('orderRed-phasePlot', [{
            x: xArr, y: vArr,
            type: 'scatter', mode: 'lines',
            name: 'Phase',
            line: { color: '#ff00ff', width: 1.5 }
        }, {
            x: [xArr[0]], y: [vArr[0]],
            type: 'scatter', mode: 'markers',
            name: 'Start',
            marker: { color: '#00ff9f', size: 10, symbol: 'diamond' },
            showlegend: false
        }], Object.assign({}, darkLayout, {
            xaxis: axStyle([-2.5, 2.5], 'x'),
            yaxis: axStyle([-6, 6], 'v'),
            showlegend: false
        }), { responsive: true });

        // Stats
        var stepsEl = document.getElementById('orderRed-steps');
        var periodEl = document.getElementById('orderRed-period');
        var energyEl = document.getElementById('orderRed-energy');
        if (stepsEl) stepsEl.textContent = tArr.length - 1;

        // Estimate period from zero crossings
        var crossings = [];
        for (var i = 1; i < xArr.length; i++) {
            if (xArr[i - 1] > 0 && xArr[i] <= 0) crossings.push(tArr[i]);
        }
        if (crossings.length >= 2) {
            var T = 2 * (crossings[1] - crossings[0]);
            if (periodEl) periodEl.textContent = T.toFixed(3);
        } else {
            if (periodEl) periodEl.textContent = '—';
        }

        // Energy drift
        var E0 = 0.5 * vArr[0] * vArr[0] + 0.5 * w0 * w0 * xArr[0] * xArr[0];
        var ELast = 0.5 * vArr[vArr.length - 1] * vArr[vArr.length - 1] +
                    0.5 * w0 * w0 * xArr[xArr.length - 1] * xArr[xArr.length - 1];
        var drift = E0 > 0 ? ((ELast - E0) / E0 * 100).toFixed(1) + '%' : '—';
        if (energyEl) energyEl.textContent = drift;
    }

    // ===== Explorer 3: Reduction Challenge =====
    var challenges = [
        {
            eq: '$$\\ddot{x} + 9x = 0$$',
            desc: 'Spring with ω²=9',
            correct: 1,
            options: [
                'dx/dt = -9x,  dv/dt = v',
                'dx/dt = v,  dv/dt = -9x',
                'dx/dt = 9x,  dv/dt = -v',
                'dx/dt = -3x,  dv/dt = -3v'
            ],
            f: function(y) { return [y[1], -9 * y[0]]; },
            y0: [1, 0], tMax: 6
        },
        {
            eq: '$$\\ddot{x} + 0.4\\dot{x} + 4x = 0$$',
            desc: 'Damped spring (γ=0.2, ω₀²=4)',
            correct: 2,
            options: [
                'dx/dt = v,  dv/dt = -4x',
                'dx/dt = -0.4v,  dv/dt = -4x',
                'dx/dt = v,  dv/dt = -0.4v - 4x',
                'dx/dt = v - 0.4x,  dv/dt = -4x'
            ],
            f: function(y) { return [y[1], -0.4 * y[1] - 4 * y[0]]; },
            y0: [1, 0], tMax: 10
        },
        {
            eq: '$$\\ddot{\\theta} + \\sin\\theta = 0$$',
            desc: 'Pendulum with g/L=1',
            correct: 0,
            options: [
                'dθ/dt = ω,  dω/dt = -sin(θ)',
                'dθ/dt = -sin(θ),  dω/dt = ω',
                'dθ/dt = ω,  dω/dt = -θ',
                'dθ/dt = sin(ω),  dω/dt = -θ'
            ],
            f: function(y) { return [y[1], -Math.sin(y[0])]; },
            y0: [2, 0], tMax: 10
        },
        {
            eq: '$$\\ddot{x} + 2\\dot{x} + x = 3\\cos(t)$$',
            desc: 'Driven damped (γ=1, ω₀²=1, F₀=3)',
            correct: 3,
            options: [
                'dx/dt = v,  dv/dt = -x + 3cos(t)',
                'dx/dt = v,  dv/dt = -2v - x',
                'dx/dt = v + 3cos(t),  dv/dt = -2v - x',
                'dx/dt = v,  dv/dt = -2v - x + 3cos(t)'
            ],
            f: function(y, t) { return [y[1], -2 * y[1] - y[0] + 3 * Math.cos(t)]; },
            y0: [0, 0], tMax: 20
        }
    ];

    var challengeState = { idx: 0, score: 0, total: 0, answered: false };

    function renderChallenge() {
        var ch = challenges[challengeState.idx];

        // Equation
        var eqEl = document.getElementById('orderRed-challengeEq');
        if (eqEl) {
            eqEl.innerHTML = '<div style="text-align:center;">' +
                '<div style="font-size:0.8rem;color:#808080;margin-bottom:0.5rem;">Reduce this:</div>' +
                '<div style="font-size:1.1rem;">' + ch.eq + '</div>' +
                '<div style="font-size:0.85rem;color:#808080;margin-top:0.5rem;">' + ch.desc + '</div></div>';
        }

        // Options
        var optEl = document.getElementById('orderRed-challengeOptions');
        if (optEl) {
            var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">';
            for (var i = 0; i < ch.options.length; i++) {
                html += '<div style="background:rgba(255,255,255,0.05);border:1px solid #2a2f4a;' +
                    'border-radius:6px;padding:0.6rem;cursor:pointer;font-family:var(--font-mono);' +
                    'font-size:0.82rem;transition:all 0.2s;" ' +
                    'onmouseover="this.style.borderColor=\'#00f3ff\'" ' +
                    'onmouseout="this.style.borderColor=\'#2a2f4a\'" ' +
                    'onclick="orderRedAnswer(' + i + ')" id="orderRed-opt-' + i + '">' +
                    '<span style="color:#808080;">' + String.fromCharCode(65 + i) + '. </span>' +
                    ch.options[i] + '</div>';
            }
            html += '</div>';
            optEl.innerHTML = html;
        }

        // Clear feedback and plot
        var fb = document.getElementById('orderRed-challengeFeedback');
        if (fb) fb.innerHTML = '';
        challengeState.answered = false;

        Plotly.newPlot('orderRed-challengePlot', [], Object.assign({}, darkLayout, {
            xaxis: axStyle([-3, 3], 'x / θ'),
            yaxis: axStyle([-6, 6], 'v / ω'),
            annotations: [{ text: 'Choose the correct<br>reduction to see<br>the phase portrait!',
                xref: 'paper', yref: 'paper', x: 0.5, y: 0.5, showarrow: false,
                font: { color: '#808080', size: 13 } }]
        }), { responsive: true });

        if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
            MathJax.typesetPromise([eqEl]);
        }

        // Update score display
        document.getElementById('orderRed-score').textContent = challengeState.score;
        document.getElementById('orderRed-total').textContent = challengeState.total;
    }

    function answerChallenge(optIdx) {
        if (challengeState.answered) return;
        challengeState.answered = true;
        challengeState.total++;

        var ch = challenges[challengeState.idx];
        var fb = document.getElementById('orderRed-challengeFeedback');
        var correct = (optIdx === ch.correct);

        // Highlight options
        for (var i = 0; i < ch.options.length; i++) {
            var el = document.getElementById('orderRed-opt-' + i);
            if (!el) continue;
            if (i === ch.correct) {
                el.style.borderColor = '#00ff9f';
                el.style.background = 'rgba(0,255,159,0.1)';
            } else if (i === optIdx && !correct) {
                el.style.borderColor = '#ff6b6b';
                el.style.background = 'rgba(255,107,107,0.1)';
            }
            el.style.cursor = 'default';
        }

        if (correct) {
            challengeState.score++;
            if (fb) fb.innerHTML = '<span style="color:#00ff9f;">&#10003; Correct!</span>';
        } else {
            if (fb) fb.innerHTML = '<span style="color:#ff6b6b;">&#10007; Not quite. The correct answer is highlighted in green.</span>';
        }

        // Show phase portrait
        var sol = eulerSystem(ch.f, ch.y0, ch.tMax, 0.01);
        var xArr = sol.Y.map(function(y) { return y[0]; });
        var vArr = sol.Y.map(function(y) { return y[1]; });

        Plotly.newPlot('orderRed-challengePlot', [{
            x: xArr, y: vArr,
            type: 'scatter', mode: 'lines',
            line: { color: correct ? '#00ff9f' : '#ff6b6b', width: 1.5 }
        }], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'x / θ'),
            yaxis: axStyle(null, 'v / ω'),
            showlegend: false
        }), { responsive: true });

        document.getElementById('orderRed-score').textContent = challengeState.score;
        document.getElementById('orderRed-total').textContent = challengeState.total;
    }

    // ===== Event handlers =====
    function attachHandlers() {
        var eqSelect = document.getElementById('orderRed-eq-select');
        if (eqSelect) eqSelect.addEventListener('change', function() {
            transformStep = 0;
            renderTransform();
        });

        var sysSelect = document.getElementById('orderRed-system-select');
        if (sysSelect) sysSelect.addEventListener('change', plotViewer);

        var omegaSlider = document.getElementById('orderRed-omega-slider');
        if (omegaSlider) omegaSlider.addEventListener('input', function() {
            document.getElementById('orderRed-omega-value').textContent = parseFloat(this.value).toFixed(2);
            plotViewer();
        });

        var gammaSlider = document.getElementById('orderRed-gamma-slider');
        if (gammaSlider) gammaSlider.addEventListener('input', function() {
            document.getElementById('orderRed-gamma-value').textContent = parseFloat(this.value).toFixed(2);
            plotViewer();
        });

        var hSlider = document.getElementById('orderRed-h-slider');
        if (hSlider) hSlider.addEventListener('input', function() {
            document.getElementById('orderRed-h-value').textContent = parseFloat(this.value).toFixed(2);
            plotViewer();
        });
    }

    // ===== Global functions =====
    window.orderRedShowSteps = function() {
        transformStep++;
        if (transformStep > 2) transformStep = 2;
        renderTransform();
        var btn = document.getElementById('orderRed-show-btn');
        if (btn) btn.textContent = transformStep < 2 ? 'Next Step' : 'Done!';
        if (transformStep >= 2 && btn) btn.disabled = true;
    };

    window.orderRedTransformReset = function() {
        transformStep = 0;
        renderTransform();
        var btn = document.getElementById('orderRed-show-btn');
        if (btn) { btn.textContent = 'Show Steps'; btn.disabled = false; }
    };

    window.orderRedViewerReset = function() {
        var sys = document.getElementById('orderRed-system-select');
        var omega = document.getElementById('orderRed-omega-slider');
        var gamma = document.getElementById('orderRed-gamma-slider');
        var hS = document.getElementById('orderRed-h-slider');
        if (sys) sys.value = '0';
        if (omega) { omega.value = 2.0; document.getElementById('orderRed-omega-value').textContent = '2.00'; }
        if (gamma) { gamma.value = 0.0; document.getElementById('orderRed-gamma-value').textContent = '0.00'; }
        if (hS) { hS.value = 0.05; document.getElementById('orderRed-h-value').textContent = '0.05'; }
        plotViewer();
    };

    window.orderRedAnswer = function(idx) { answerChallenge(idx); };

    window.orderRedNextChallenge = function() {
        challengeState.idx = (challengeState.idx + 1) % challenges.length;
        renderChallenge();
    };

    window.orderRedChallengeReset = function() {
        challengeState.score = 0;
        challengeState.total = 0;
        challengeState.idx = 0;
        renderChallenge();
    };

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }

        var el = document.getElementById('orderRed-timePlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        renderTransform();
        plotViewer();
        renderChallenge();
        attachHandlers();
    }

    initializePlots();
})();
