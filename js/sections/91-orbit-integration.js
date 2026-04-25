(function() {
    'use strict';

    var darkLayout = {
        template: 'plotly_dark',
        margin: { t: 30, r: 20, b: 45, l: 55 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    };

    function axStyle(range, title, type) {
        var ax = { gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080', title: title || '' };
        if (range) ax.range = range;
        if (type) ax.type = type;
        return ax;
    }

    var MU = 1.0, K = 1.0;

    // --------- Cartesian Kepler force ---------
    function keplerRHS(s) {
        // s = [x, y, vx, vy]
        var r2 = s[0]*s[0] + s[1]*s[1];
        var r3 = r2 * Math.sqrt(r2);
        if (r3 < 1e-9) r3 = 1e-9;
        return [s[2], s[3], -K*s[0]/r3, -K*s[1]/r3];
    }

    function rk4Step(s, h, rhs) {
        var k1 = rhs(s);
        var k2 = rhs(s.map(function(v, i) { return v + 0.5*h*k1[i]; }));
        var k3 = rhs(s.map(function(v, i) { return v + 0.5*h*k2[i]; }));
        var k4 = rhs(s.map(function(v, i) { return v + h*k3[i]; }));
        return s.map(function(v, i) { return v + (h/6)*(k1[i] + 2*k2[i] + 2*k3[i] + k4[i]); });
    }

    function eulerStep(s, h, rhs) {
        var f = rhs(s);
        return s.map(function(v, i) { return v + h*f[i]; });
    }

    function energyOf(s) {
        var v2 = s[2]*s[2] + s[3]*s[3];
        var r  = Math.sqrt(s[0]*s[0] + s[1]*s[1]);
        return 0.5 * v2 - K/r;
    }
    function angmomOf(s) {
        return s[0]*s[3] - s[1]*s[2];
    }

    function classifyByE(E) {
        if (Math.abs(E + 0.5) < 1e-3 && true) return 'circular (E = E_min)';
        if (E < -1e-3)  return 'bound elliptical';
        if (Math.abs(E) < 5e-3) return 'parabolic (E ≈ 0)';
        return 'unbound hyperbolic';
    }

    // ===============================================================
    // EXPLORER 1: Live Orbit Launcher
    // ===============================================================
    var oiAnim = { running: false, raf: null, traj: [], times: [], Es: [], Ls: [], idx: 0,
                   r0: 1, vx0: 0, vy0: 1.0, h: 0.02, N: 1200 };

    function oiInit() {
        oiAnim.r0  = parseFloat(document.getElementById('oi-r0-slider').value);
        oiAnim.vx0 = parseFloat(document.getElementById('oi-vx0-slider').value);
        oiAnim.vy0 = parseFloat(document.getElementById('oi-vy0-slider').value);
        oiAnim.h   = Math.pow(10, parseFloat(document.getElementById('oi-h-slider').value));
        oiAnim.N   = 1500;
        oiAnim.traj = [[oiAnim.r0, 0, oiAnim.vx0, oiAnim.vy0]];
        oiAnim.times = [0];
        var s0 = oiAnim.traj[0];
        oiAnim.Es = [energyOf(s0)];
        oiAnim.Ls = [angmomOf(s0)];
        oiAnim.idx = 0;
    }

    function oiDrawCurrent() {
        var traj = oiAnim.traj;
        var xs = traj.map(function(s) { return s[0]; });
        var ys = traj.map(function(s) { return s[1]; });

        // Determine plot range
        var R = 3;
        for (var i = 0; i < traj.length; i++) {
            if (Math.abs(traj[i][0]) > R - 0.5) R = Math.abs(traj[i][0]) + 0.5;
            if (Math.abs(traj[i][1]) > R - 0.5) R = Math.abs(traj[i][1]) + 0.5;
        }
        R = Math.min(8, R);

        var sNow = traj[traj.length - 1];

        Plotly.react('oi-orbitPlot', [
            { x: xs, y: ys, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2 }, name: 'orbit', hoverinfo: 'skip' },
            { x: [0], y: [0], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 14, symbol: 'star' }, name: 'central body' },
            { x: [sNow[0]], y: [sNow[1]], type: 'scatter', mode: 'markers',
              marker: { color: '#ff006e', size: 12 }, name: 'planet' }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-R, R], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-R, R], 'y'),
            height: 440,
            title: { text: 'Orbit  (n=' + traj.length + ')', font: { color: '#aaa', size: 12 } },
            legend: { x: 0.02, y: 0.02, font: { color: '#aaa', size: 9 } }
        }), { responsive: true });

        // Conservation
        var t = oiAnim.times;
        var E0 = oiAnim.Es[0], L0 = oiAnim.Ls[0];
        var dE = oiAnim.Es.map(function(e) { return Math.abs(E0) > 1e-9 ? Math.abs((e - E0)/E0) : Math.abs(e - E0); });
        var dL = oiAnim.Ls.map(function(l) { return Math.abs(L0) > 1e-9 ? Math.abs((l - L0)/L0) : Math.abs(l - L0); });
        // Avoid log(0)
        for (var k = 0; k < dE.length; k++) {
            if (dE[k] < 1e-16) dE[k] = 1e-16;
            if (dL[k] < 1e-16) dL[k] = 1e-16;
        }

        Plotly.react('oi-conservPlot', [
            { x: t, y: dE, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 1.5 }, name: '|ΔE/E|' },
            { x: t, y: dL, type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 1.5 }, name: '|Δℓ/ℓ|' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 't'),
            yaxis: axStyle(null, 'relative drift', 'log'),
            height: 440,
            title: { text: 'Conservation drift (log)', font: { color: '#aaa', size: 12 } },
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        var maxDE = Math.max.apply(null, dE);
        var maxDL = Math.max.apply(null, dL);

        document.getElementById('oi-stats1').innerHTML =
            '<span><strong>r₀ = ' + oiAnim.r0.toFixed(2) + ', v = (' + oiAnim.vx0.toFixed(2) + ', ' + oiAnim.vy0.toFixed(2) + '), h = ' + oiAnim.h.toExponential(1) + '</strong></span>' +
            '<span>E = ' + E0.toFixed(4) + ', ℓ = ' + L0.toFixed(4) + ' → ' + classifyByE(E0) + '</span>' +
            '<span>max drifts: ΔE/E = ' + maxDE.toExponential(2) + ', Δℓ/ℓ = ' + maxDL.toExponential(2) + '</span>';
    }

    function oiTick() {
        if (!oiAnim.running) return;
        // Advance several steps per frame for smoother animation
        var stepsPerFrame = 5;
        for (var k = 0; k < stepsPerFrame; k++) {
            if (oiAnim.idx >= oiAnim.N - 1) {
                oiAnim.running = false;
                document.getElementById('oi-launch-btn').textContent = 'Launch';
                break;
            }
            var sNew = rk4Step(oiAnim.traj[oiAnim.traj.length - 1], oiAnim.h, keplerRHS);
            // Guard against blowup
            if (!isFinite(sNew[0]) || Math.abs(sNew[0]) > 50 || Math.abs(sNew[1]) > 50) {
                oiAnim.running = false;
                document.getElementById('oi-launch-btn').textContent = 'Launch';
                break;
            }
            oiAnim.traj.push(sNew);
            oiAnim.times.push(oiAnim.times[oiAnim.times.length - 1] + oiAnim.h);
            oiAnim.Es.push(energyOf(sNew));
            oiAnim.Ls.push(angmomOf(sNew));
            oiAnim.idx++;
        }
        oiDrawCurrent();
        if (oiAnim.running) oiAnim.raf = setTimeout(oiTick, 30);
    }

    window.oiLaunch = function() {
        var btn = document.getElementById('oi-launch-btn');
        if (oiAnim.running) {
            // Toggle: pause
            oiAnim.running = false;
            if (oiAnim.raf) { clearTimeout(oiAnim.raf); oiAnim.raf = null; }
            btn.textContent = 'Resume';
            return;
        }
        // If finished or idle, restart from current sliders
        if (oiAnim.idx === 0 || oiAnim.idx >= oiAnim.N - 1) {
            oiInit();
            oiDrawCurrent();
        }
        oiAnim.running = true;
        btn.textContent = 'Pause';
        oiTick();
    };

    window.oiStop = function() {
        oiAnim.running = false;
        if (oiAnim.raf) { clearTimeout(oiAnim.raf); oiAnim.raf = null; }
        document.getElementById('oi-launch-btn').textContent = 'Launch';
    };

    window.oiReset = function() {
        oiAnim.running = false;
        if (oiAnim.raf) { clearTimeout(oiAnim.raf); oiAnim.raf = null; }
        document.getElementById('oi-launch-btn').textContent = 'Launch';
        document.getElementById('oi-r0-slider').value = 1.0;
        document.getElementById('oi-vx0-slider').value = 0.0;
        document.getElementById('oi-vy0-slider').value = 1.0;
        document.getElementById('oi-h-slider').value = -1.7;
        document.getElementById('oi-r0-value').textContent = '1.00';
        document.getElementById('oi-vx0-value').textContent = '0.00';
        document.getElementById('oi-vy0-value').textContent = '1.00';
        document.getElementById('oi-h-value').textContent = '0.020';
        oiInit();
        oiDrawCurrent();
    };

    function oiQuickJump(vy) {
        oiAnim.running = false;
        if (oiAnim.raf) { clearTimeout(oiAnim.raf); oiAnim.raf = null; }
        document.getElementById('oi-launch-btn').textContent = 'Launch';
        document.getElementById('oi-r0-slider').value = 1.0;
        document.getElementById('oi-vx0-slider').value = 0.0;
        document.getElementById('oi-vy0-slider').value = vy;
        document.getElementById('oi-r0-value').textContent = '1.00';
        document.getElementById('oi-vx0-value').textContent = '0.00';
        document.getElementById('oi-vy0-value').textContent = vy.toFixed(2);
        oiInit();
        oiAnim.running = true;
        document.getElementById('oi-launch-btn').textContent = 'Pause';
        oiTick();
    }
    window.oiJumpCircle   = function() { oiQuickJump(1.0); };
    window.oiJumpEllipse  = function() { oiQuickJump(1.2); };
    window.oiJumpParabola = function() { oiQuickJump(Math.sqrt(2)); };
    window.oiJumpHyper    = function() { oiQuickJump(1.5); };

    // ===============================================================
    // EXPLORER 2: Numerical vs Analytical Comparison
    // ===============================================================
    function getCmpParams() {
        return {
            r0:  parseFloat(document.getElementById('oi-cmp-r0-slider').value),
            vy0: parseFloat(document.getElementById('oi-cmp-vy0-slider').value),
            h:   Math.pow(10, parseFloat(document.getElementById('oi-cmp-h-slider').value)),
            integrator: document.getElementById('oi-cmp-int-select').value
        };
    }

    function analyticalConicXY(p, e) {
        if (e >= 0.999) {
            // Don't bother for unbounded — comparison panel needs bound orbits
            return { x: [], y: [] };
        }
        var n = 400;
        var xs = [], ys = [];
        for (var i = 0; i <= n; i++) {
            var phi = 2 * Math.PI * i / n;
            var r = p / (1 + e * Math.cos(phi));
            xs.push(r * Math.cos(phi));
            ys.push(r * Math.sin(phi));
        }
        return { x: xs, y: ys };
    }

    function analyticalRhoOfPhi(p, e, phi) {
        return p / (1 + e * Math.cos(phi));
    }

    window.oiCmpRun = function() {
        var pr = getCmpParams();
        var s0 = [pr.r0, 0, 0, pr.vy0];
        var E = energyOf(s0);
        var L = angmomOf(s0);
        if (E >= -1e-3) {
            document.getElementById('oi-stats2').innerHTML =
                '<span style="color:#ff6">Pick a bound orbit (E < 0): try v_{y0} between 0.5 and ~1.4</span>';
            return;
        }
        var p = L*L / (MU * K);
        var e = Math.sqrt(Math.max(0, 1 + 2 * E * L*L / (MU * K * K)));
        var a = K / (2 * Math.abs(E));
        var T = 2 * Math.PI * Math.sqrt(MU / K) * Math.pow(a, 1.5);

        // Integrate one orbit (slightly more)
        var N = Math.ceil(1.05 * T / pr.h);
        if (N > 50000) N = 50000;
        var stepFn = pr.integrator === 'rk4' ? rk4Step : eulerStep;
        var traj = new Array(N);
        traj[0] = s0.slice();
        for (var i = 1; i < N; i++) traj[i] = stepFn(traj[i-1], pr.h, keplerRHS);

        // Compute analytical comparison: at each numerical (x_n, y_n), compute the
        // numerical phi, then analytical ρ_anal(phi), then Δr = r_num - ρ_anal.
        var xs = traj.map(function(s) { return s[0]; });
        var ys = traj.map(function(s) { return s[1]; });
        var ts = [];
        var errs = [];
        for (var k = 0; k < N; k++) {
            ts.push(k * pr.h);
            var rNum = Math.sqrt(xs[k]*xs[k] + ys[k]*ys[k]);
            var phiNum = Math.atan2(ys[k], xs[k]);
            var rAnal = analyticalRhoOfPhi(p, e, phiNum);
            errs.push(Math.abs(rNum - rAnal) / a);
            if (errs[k] < 1e-16) errs[k] = 1e-16;
        }

        var conic = analyticalConicXY(p, e);

        // Plot range
        var R = a * (1 + e) * 1.2;

        Plotly.react('oi-cmpOrbitPlot', [
            { x: xs, y: ys, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2 }, name: pr.integrator.toUpperCase() },
            { x: conic.x, y: conic.y, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2, dash: 'dash' }, name: 'analytical' },
            { x: [0], y: [0], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 12, symbol: 'star' }, name: 'central body' }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-R, R], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-R, R], 'y'),
            height: 420,
            title: { text: 'Numerical vs analytical (e = ' + e.toFixed(3) + ', a = ' + a.toFixed(3) + ')', font: { color: '#aaa', size: 12 } },
            legend: { x: 0.02, y: 0.02, font: { color: '#aaa', size: 9 } }
        }), { responsive: true });

        Plotly.react('oi-cmpErrPlot', [
            { x: ts, y: errs, type: 'scatter', mode: 'lines',
              line: { color: pr.integrator === 'rk4' ? '#00f3ff' : '#ff006e', width: 1.5 },
              name: '|Δr|/a' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, T], 't (one orbital period T = ' + T.toFixed(2) + ')'),
            yaxis: axStyle(null, '|Δr|/a', 'log'),
            height: 420,
            title: { text: pr.integrator.toUpperCase() + ' radial error vs t (log scale)', font: { color: '#aaa', size: 12 } },
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        var maxErr = Math.max.apply(null, errs);
        document.getElementById('oi-stats2').innerHTML =
            '<span><strong>' + pr.integrator.toUpperCase() + ', h = ' + pr.h.toExponential(1) + ', T = ' + T.toFixed(2) + '</strong></span>' +
            '<span>E = ' + E.toFixed(4) + ', ℓ = ' + L.toFixed(4) + ', e = ' + e.toFixed(3) + ', a = ' + a.toFixed(3) + '</span>' +
            '<span>max |Δr|/a over one orbit: ' + maxErr.toExponential(2) + '</span>';
    };

    window.oiCmpReset = function() {
        document.getElementById('oi-cmp-r0-slider').value = 1.0;
        document.getElementById('oi-cmp-vy0-slider').value = 1.2;
        document.getElementById('oi-cmp-h-slider').value = -1.7;
        document.getElementById('oi-cmp-int-select').value = 'rk4';
        document.getElementById('oi-cmp-r0-value').textContent = '1.00';
        document.getElementById('oi-cmp-vy0-value').textContent = '1.20';
        document.getElementById('oi-cmp-h-value').textContent = '−1.7';
        // Clear plots
        var emptyBase = Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''), yaxis: axStyle(null, ''),
            annotations: [{ x: 0.5, y: 0.5, text: 'Click "Compare"',
                font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
        });
        Plotly.react('oi-cmpOrbitPlot', [], Object.assign({}, emptyBase, { height: 420 }), { responsive: true });
        Plotly.react('oi-cmpErrPlot', [], Object.assign({}, emptyBase, { height: 420 }), { responsive: true });
        document.getElementById('oi-stats2').innerHTML = '';
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('oi-orbitPlot')) { setTimeout(initializePlots, 100); return; }

        // Explorer 1
        var sliderIds = ['oi-r0-slider', 'oi-vx0-slider', 'oi-vy0-slider'];
        var valueIds  = ['oi-r0-value',  'oi-vx0-value',  'oi-vy0-value'];
        for (var i = 0; i < 3; i++) {
            (function(idx) {
                document.getElementById(sliderIds[idx]).addEventListener('input', function() {
                    document.getElementById(valueIds[idx]).textContent = parseFloat(this.value).toFixed(2);
                });
            })(i);
        }
        document.getElementById('oi-h-slider').addEventListener('input', function() {
            var h = Math.pow(10, parseFloat(this.value));
            document.getElementById('oi-h-value').textContent = h.toFixed(3);
        });
        oiInit();
        oiDrawCurrent();

        // Explorer 2
        document.getElementById('oi-cmp-r0-slider').addEventListener('input', function() {
            document.getElementById('oi-cmp-r0-value').textContent = parseFloat(this.value).toFixed(2);
        });
        document.getElementById('oi-cmp-vy0-slider').addEventListener('input', function() {
            document.getElementById('oi-cmp-vy0-value').textContent = parseFloat(this.value).toFixed(2);
        });
        document.getElementById('oi-cmp-h-slider').addEventListener('input', function() {
            var v = parseFloat(this.value);
            document.getElementById('oi-cmp-h-value').textContent = (v >= 0 ? '' : '−') + Math.abs(v).toFixed(1);
        });
        oiCmpReset();
    }

    initializePlots();
})();
