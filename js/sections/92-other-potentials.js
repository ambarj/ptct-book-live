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

    var MU = 1.0;

    // ===============================================================
    // Potentials and forces (radial scalar form)
    // ===============================================================
    function bareU(name, k, aux, rho) {
        if (name === 'coulomb-rep') return  k / rho;
        if (name === 'harmonic')    return 0.5 * k * rho * rho;
        if (name === 'yukawa')      return -k * Math.exp(-rho / aux) / rho;
        if (name === 'lj') {        // k = ε, aux = σ
            var s6 = Math.pow(aux / rho, 6);
            return 4 * k * (s6 * s6 - s6);
        }
        return 0;
    }

    function ueff(name, k, aux, ell, rho) {
        return bareU(name, k, aux, rho) + ell * ell / (2 * MU * rho * rho);
    }

    // 2D Cartesian force = -∇U
    function force2D(name, k, aux, x, y) {
        var rho = Math.sqrt(x*x + y*y);
        if (rho < 1e-6) return [0, 0];
        var fmag;  // radial force magnitude (positive = outward)
        if (name === 'kepler') {
            fmag = -k / (rho * rho);
        } else if (name === 'harmonic') {
            fmag = -k * rho;
        } else if (name === 'yukawa') {
            fmag = -k * Math.exp(-rho / aux) * (1/(rho*rho) + 1/(aux * rho));
        } else if (name === 'power101') {
            // U = -k/ρ^1.01, F = -1.01 k / ρ^2.01
            fmag = -1.01 * k / Math.pow(rho, 2.01);
        }
        return [fmag * x / rho, fmag * y / rho];
    }

    // ===============================================================
    // EXPLORER 1: Energy Diagram Zoo
    // ===============================================================
    function getOpParams() {
        return {
            name: document.getElementById('op-pot-select').value,
            ell:  parseFloat(document.getElementById('op-ell-slider').value),
            k:    parseFloat(document.getElementById('op-k-slider').value),
            aux:  parseFloat(document.getElementById('op-aux-slider').value),
            E:    parseFloat(document.getElementById('op-E-slider').value)
        };
    }

    function describePotential(name, hasMin, minRho, minVal) {
        if (name === 'coulomb-rep')
            return [
                ['Coulomb-repulsive: U(ρ) = +k/ρ', '#ff006e', 16],
                ['No minimum in U_eff — both terms positive', '#ddd', 13],
                ['→ Always unbound (Rutherford-like flyby)', '#ddd', 13],
                ['→ No bound state, no circular orbit', '#ddd', 13],
                ['Physical: like-charges scattering', '#aaa', 12]
            ];
        if (name === 'harmonic')
            return [
                ['Harmonic spring: U(ρ) = ½ K ρ²', '#ff006e', 16],
                ['U_eff has a minimum at ρ_circ = (ℓ²/(μK))^{1/4}', '#ddd', 13],
                ['→ All orbits bound (well rises to ∞)', '#ddd', 13],
                ['→ Closed: ellipse centered on origin', '#ddd', 13],
                ['Bertrand-blessed (one of two)', '#00ff88', 12]
            ];
        if (name === 'yukawa')
            return [
                ['Yukawa: U(ρ) = −k e^{−ρ/ρ₀}/ρ', '#ff006e', 16],
                ['Has a minimum like Kepler at small ρ', '#ddd', 13],
                ['Rapid decay at ρ ≫ ρ₀ (screened)', '#ddd', 13],
                ['→ Bound orbits PRECESS (not closed)', '#ddd', 13],
                ['Physical: nuclear strong force, plasmas', '#aaa', 12]
            ];
        if (name === 'lj')
            return [
                ['Lennard-Jones: U = 4ε[(σ/ρ)¹²−(σ/ρ)⁶]', '#ff006e', 16],
                ['Strong repulsion at small ρ (Pauli)', '#ddd', 13],
                ['Attractive well around bond length ρ ≈ σ', '#ddd', 13],
                ['→ Bound for E < 0; precesses', '#ddd', 13],
                ['Physical: molecular interactions', '#aaa', 12]
            ];
        return [];
    }

    function findTurningPoints(name, k, aux, ell, E, rhoMin, rhoMax) {
        var n = 1000;
        var pts = [];
        var prevG = ueff(name, k, aux, ell, rhoMin) - E, prevR = rhoMin;
        for (var i = 1; i <= n; i++) {
            var r = rhoMin + (rhoMax - rhoMin) * i / n;
            var g = ueff(name, k, aux, ell, r) - E;
            if (prevG * g < 0) {
                var a = prevR, b = r, fa = prevG;
                for (var j = 0; j < 50; j++) {
                    var m = 0.5 * (a + b);
                    var fm = ueff(name, k, aux, ell, m) - E;
                    if (fa * fm < 0) b = m; else { a = m; fa = fm; }
                }
                pts.push(0.5 * (a + b));
            }
            prevG = g; prevR = r;
        }
        return pts;
    }

    function findMinimum(name, k, aux, ell, rhoMin, rhoMax) {
        // Sample search + parabolic refinement
        var n = 1000;
        var bestI = -1, bestVal = Infinity;
        for (var i = 1; i < n - 1; i++) {
            var r = rhoMin + (rhoMax - rhoMin) * i / n;
            var v = ueff(name, k, aux, ell, r);
            if (v < bestVal) { bestVal = v; bestI = i; }
        }
        if (bestI < 1) return null;
        // Check it's actually a local minimum
        var rL = rhoMin + (rhoMax - rhoMin) * (bestI - 1) / n;
        var rR = rhoMin + (rhoMax - rhoMin) * (bestI + 1) / n;
        var rC = rhoMin + (rhoMax - rhoMin) * bestI / n;
        if (ueff(name, k, aux, ell, rL) < ueff(name, k, aux, ell, rC) ||
            ueff(name, k, aux, ell, rR) < ueff(name, k, aux, ell, rC)) {
            // Plateau or boundary minimum
            if (Math.abs(bestI - 1) < 5 || Math.abs(bestI - n + 2) < 5) return null;
        }
        return { rho: rC, val: bestVal };
    }

    function drawZoo() {
        var p = getOpParams();
        // Adapt range to potential
        var rhoMin, rhoMax, yMin, yMax;
        if (p.name === 'lj') {
            rhoMin = 0.7 * p.aux; rhoMax = 4 * p.aux;
            yMin = -2 * p.k; yMax = 2 * p.k;
        } else if (p.name === 'coulomb-rep') {
            rhoMin = 0.1; rhoMax = 6;
            yMin = 0; yMax = 5;
        } else if (p.name === 'harmonic') {
            rhoMin = 0.2; rhoMax = 4;
            yMin = 0; yMax = 6;
        } else {  // yukawa
            rhoMin = 0.1; rhoMax = 6;
            yMin = -1; yMax = 1.5;
        }

        var rhos = [], Ub = [], Ucent = [], Ue = [];
        for (var i = 0; i <= 400; i++) {
            var r = rhoMin + (rhoMax - rhoMin) * i / 400;
            rhos.push(r);
            Ub.push(bareU(p.name, p.k, p.aux, r));
            Ucent.push(p.ell * p.ell / (2 * MU * r * r));
            Ue.push(ueff(p.name, p.k, p.aux, p.ell, r));
        }

        var minInfo = findMinimum(p.name, p.k, p.aux, p.ell, rhoMin, rhoMax);
        var tps = findTurningPoints(p.name, p.k, p.aux, p.ell, p.E, rhoMin, rhoMax);

        var traces = [
            { x: rhos, y: Ub, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 1.2, dash: 'dot' }, name: 'U(ρ)' },
            { x: rhos, y: Ucent, type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 1.2, dash: 'dot' }, name: 'ℓ²/(2μρ²)' },
            { x: rhos, y: Ue, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2.5 }, name: 'U_eff' },
            { x: [rhoMin, rhoMax], y: [p.E, p.E], type: 'scatter', mode: 'lines',
              line: { color: '#fff', width: 1.5, dash: 'dash' }, name: 'E = ' + p.E.toFixed(2) }
        ];
        if (minInfo) {
            traces.push({
                x: [minInfo.rho], y: [minInfo.val], type: 'scatter', mode: 'markers',
                marker: { color: '#00ff88', size: 12, symbol: 'diamond', line: { color: '#fff', width: 1 } },
                name: 'min'
            });
        }
        if (tps.length > 0) {
            traces.push({
                x: tps, y: tps.map(function() { return p.E; }),
                type: 'scatter', mode: 'markers',
                marker: { color: '#fff', size: 14, symbol: 'star', line: { color: '#ff006e', width: 1 } },
                name: 'turning points'
            });
        }

        Plotly.react('op-uPlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle([rhoMin, rhoMax], 'ρ'),
            yaxis: axStyle([yMin, yMax], 'energy'),
            height: 440,
            title: { text: p.name, font: { color: '#aaa', size: 12 } },
            legend: { x: 0.55, y: 0.02, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // RIGHT panel: text annotations as a "summary chart"
        var lines = describePotential(p.name, !!minInfo,
            minInfo ? minInfo.rho : null, minInfo ? minInfo.val : null);
        var annots = lines.map(function(line, idx) {
            return {
                x: 0.05, y: 0.9 - idx * 0.13, xref: 'paper', yref: 'paper',
                text: line[0], showarrow: false, xanchor: 'left',
                font: { color: line[1], size: line[2] }
            };
        });

        Plotly.react('op-summaryPlot', [], Object.assign({}, darkLayout, {
            xaxis: { visible: false, range: [0, 1] },
            yaxis: { visible: false, range: [0, 1] },
            height: 440, annotations: annots,
            title: { text: 'What U_eff tells us', font: { color: '#aaa', size: 12 } }
        }), { responsive: true });

        var minStr = minInfo
            ? 'min at ρ = ' + minInfo.rho.toFixed(3) + ', U_eff = ' + minInfo.val.toFixed(3)
            : 'no minimum (no bound circular orbit)';
        var tpStr = tps.length === 0 ? 'none'
                  : tps.length === 1 ? tps[0].toFixed(3)
                  : tps[0].toFixed(3) + ' / ' + tps[1].toFixed(3);

        document.getElementById('op-stats1').innerHTML =
            '<span><strong>' + p.name + ', ℓ = ' + p.ell.toFixed(2) + ', k = ' + p.k.toFixed(2) + '</strong></span>' +
            '<span>' + minStr + '</span>' +
            '<span>turning points at E = ' + p.E.toFixed(2) + ': ' + tpStr + '</span>';
    }

    window.opJumpEmin = function() {
        var p = getOpParams();
        var rhoMin, rhoMax;
        if (p.name === 'lj') { rhoMin = 0.7 * p.aux; rhoMax = 4 * p.aux; }
        else                 { rhoMin = 0.1; rhoMax = 6; }
        var minInfo = findMinimum(p.name, p.k, p.aux, p.ell, rhoMin, rhoMax);
        if (minInfo) {
            // Jump just slightly above E_min for visible turning points
            var newE = minInfo.val + 0.05 * (Math.abs(minInfo.val) + 1);
            document.getElementById('op-E-slider').value = newE;
            document.getElementById('op-E-value').textContent = newE.toFixed(2);
            drawZoo();
        }
    };

    window.opReset = function() {
        document.getElementById('op-pot-select').value = 'coulomb-rep';
        document.getElementById('op-ell-slider').value = 0.5;
        document.getElementById('op-k-slider').value = 1.0;
        document.getElementById('op-aux-slider').value = 2.0;
        document.getElementById('op-E-slider').value = 0.5;
        document.getElementById('op-ell-value').textContent = '0.50';
        document.getElementById('op-k-value').textContent = '1.00';
        document.getElementById('op-aux-value').textContent = '2.00';
        document.getElementById('op-E-value').textContent = '0.50';
        drawZoo();
    };

    // ===============================================================
    // EXPLORER 2: Bertrand Demonstrator (live RK4)
    // ===============================================================
    function rk4Step2D(s, h, name, k, aux) {
        function rhs(s) {
            var f = force2D(name, k, aux, s[0], s[1]);
            return [s[2], s[3], f[0], f[1]];
        }
        var k1 = rhs(s);
        var k2 = rhs(s.map(function(v, i) { return v + 0.5*h*k1[i]; }));
        var k3 = rhs(s.map(function(v, i) { return v + 0.5*h*k2[i]; }));
        var k4 = rhs(s.map(function(v, i) { return v + h*k3[i]; }));
        return s.map(function(v, i) { return v + (h/6)*(k1[i] + 2*k2[i] + 2*k3[i] + k4[i]); });
    }

    var bdAnim = { running: false, raf: null, traj: [], times: [], idx: 0,
                   N: 3000, h: 0.02, name: 'kepler', k: 1.0, aux: 3.0,
                   perihelia: [] };

    function bdInit() {
        bdAnim.name = document.getElementById('op-bd-pot-select').value;
        bdAnim.h = Math.pow(10, parseFloat(document.getElementById('op-bd-h-slider').value));
        bdAnim.k = 1.0;
        bdAnim.aux = 3.0;  // Yukawa range fixed for this explorer
        bdAnim.N = 3000;
        var r0 = parseFloat(document.getElementById('op-bd-r0-slider').value);
        var vy0 = parseFloat(document.getElementById('op-bd-vy0-slider').value);
        bdAnim.traj = [[r0, 0, 0, vy0]];
        bdAnim.times = [0];
        bdAnim.idx = 0;
        bdAnim.perihelia = [];
    }

    function bdDraw() {
        var traj = bdAnim.traj;
        var xs = traj.map(function(s) { return s[0]; });
        var ys = traj.map(function(s) { return s[1]; });
        var ts = bdAnim.times;
        var rhos = traj.map(function(s) { return Math.sqrt(s[0]*s[0] + s[1]*s[1]); });

        // Plot range adaptive
        var R = 2.5;
        for (var i = 0; i < traj.length; i++) {
            if (Math.abs(traj[i][0]) > R - 0.5) R = Math.abs(traj[i][0]) + 0.5;
            if (Math.abs(traj[i][1]) > R - 0.5) R = Math.abs(traj[i][1]) + 0.5;
        }
        R = Math.min(8, R);

        var sNow = traj[traj.length - 1];

        Plotly.react('op-orbitPlot', [
            { x: xs, y: ys, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2 }, name: 'orbit', hoverinfo: 'skip' },
            { x: [0], y: [0], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 14, symbol: 'star' }, name: 'force center' },
            { x: [sNow[0]], y: [sNow[1]], type: 'scatter', mode: 'markers',
              marker: { color: '#ff006e', size: 12 }, name: 'particle' }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-R, R], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-R, R], 'y'),
            height: 440,
            title: { text: bdAnim.name + ' orbit (' + traj.length + ' steps)', font: { color: '#aaa', size: 12 } },
            legend: { x: 0.02, y: 0.02, font: { color: '#aaa', size: 9 } }
        }), { responsive: true });

        Plotly.react('op-rhoPlot', [
            { x: ts, y: rhos, type: 'scatter', mode: 'lines',
              line: { color: '#00ff88', width: 2 }, name: 'ρ(t)', showlegend: false }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 't'),
            yaxis: axStyle(null, 'ρ(t)'),
            height: 440,
            title: { text: 'Radial coordinate ρ(t) — periodic if Bertrand', font: { color: '#aaa', size: 12 } }
        }), { responsive: true });

        // Compute precession metric: angle between successive perihelia
        var precessStr = '—';
        if (bdAnim.perihelia.length >= 2) {
            var n = bdAnim.perihelia.length;
            var ang = bdAnim.perihelia.map(function(idx) {
                return Math.atan2(traj[idx][1], traj[idx][0]);
            });
            // Unwrap angles
            for (var u = 1; u < ang.length; u++) {
                while (ang[u] - ang[u-1] > Math.PI) ang[u] -= 2 * Math.PI;
                while (ang[u] - ang[u-1] < -Math.PI) ang[u] += 2 * Math.PI;
            }
            var diffs = [];
            for (var d = 1; d < ang.length; d++) {
                var dd = ang[d] - ang[d-1];
                // Subtract a full revolution to get the precession (residual)
                if (dd > Math.PI) dd -= 2 * Math.PI;
                if (dd < -Math.PI) dd += 2 * Math.PI;
                diffs.push(dd);
            }
            var meanDiff = diffs.reduce(function(a, b) { return a + b; }, 0) / diffs.length;
            precessStr = (meanDiff * 180 / Math.PI).toFixed(2) + '° / orbit';
        }

        var classification = '?';
        if (bdAnim.name === 'kepler' || bdAnim.name === 'harmonic') classification = 'Bertrand-blessed → closes';
        else if (bdAnim.name === 'yukawa') classification = 'Not Bertrand → precesses';
        else if (bdAnim.name === 'power101') classification = 'Off Kepler by 1% → precesses slowly';

        document.getElementById('op-stats2').innerHTML =
            '<span><strong>' + bdAnim.name + ' (' + classification + ')</strong></span>' +
            '<span>perihelia detected: ' + bdAnim.perihelia.length + '</span>' +
            '<span>precession (residual angle per orbit): ' + precessStr + '</span>';
    }

    function bdTick() {
        if (!bdAnim.running) return;
        var stepsPerFrame = 5;
        for (var k = 0; k < stepsPerFrame; k++) {
            if (bdAnim.idx >= bdAnim.N - 1) {
                bdAnim.running = false;
                document.getElementById('op-bd-launch-btn').textContent = 'Launch';
                break;
            }
            var sNew = rk4Step2D(bdAnim.traj[bdAnim.traj.length - 1], bdAnim.h, bdAnim.name, bdAnim.k, bdAnim.aux);
            if (!isFinite(sNew[0]) || Math.abs(sNew[0]) > 50) {
                bdAnim.running = false;
                document.getElementById('op-bd-launch-btn').textContent = 'Launch';
                break;
            }
            bdAnim.traj.push(sNew);
            bdAnim.times.push(bdAnim.times[bdAnim.times.length - 1] + bdAnim.h);
            // Detect perihelion (local min of ρ)
            if (bdAnim.traj.length >= 3) {
                var n = bdAnim.traj.length;
                var rPrev = Math.sqrt(bdAnim.traj[n-3][0]*bdAnim.traj[n-3][0] + bdAnim.traj[n-3][1]*bdAnim.traj[n-3][1]);
                var rCurr = Math.sqrt(bdAnim.traj[n-2][0]*bdAnim.traj[n-2][0] + bdAnim.traj[n-2][1]*bdAnim.traj[n-2][1]);
                var rNext = Math.sqrt(sNew[0]*sNew[0] + sNew[1]*sNew[1]);
                if (rCurr < rPrev && rCurr < rNext) {
                    bdAnim.perihelia.push(n - 2);
                }
            }
            bdAnim.idx++;
        }
        bdDraw();
        if (bdAnim.running) bdAnim.raf = setTimeout(bdTick, 30);
    }

    window.opBdLaunch = function() {
        var btn = document.getElementById('op-bd-launch-btn');
        if (bdAnim.running) {
            bdAnim.running = false;
            if (bdAnim.raf) { clearTimeout(bdAnim.raf); bdAnim.raf = null; }
            btn.textContent = 'Resume';
            return;
        }
        if (bdAnim.idx === 0 || bdAnim.idx >= bdAnim.N - 1) {
            bdInit();
            bdDraw();
        }
        bdAnim.running = true;
        btn.textContent = 'Pause';
        bdTick();
    };

    window.opBdStop = function() {
        bdAnim.running = false;
        if (bdAnim.raf) { clearTimeout(bdAnim.raf); bdAnim.raf = null; }
        document.getElementById('op-bd-launch-btn').textContent = 'Launch';
    };

    window.opBdReset = function() {
        bdAnim.running = false;
        if (bdAnim.raf) { clearTimeout(bdAnim.raf); bdAnim.raf = null; }
        document.getElementById('op-bd-launch-btn').textContent = 'Launch';
        document.getElementById('op-bd-pot-select').value = 'kepler';
        document.getElementById('op-bd-r0-slider').value = 1.0;
        document.getElementById('op-bd-vy0-slider').value = 0.95;
        document.getElementById('op-bd-h-slider').value = -1.7;
        document.getElementById('op-bd-r0-value').textContent = '1.00';
        document.getElementById('op-bd-vy0-value').textContent = '0.95';
        document.getElementById('op-bd-h-value').textContent = '−1.7';
        bdInit();
        bdDraw();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('op-uPlot')) { setTimeout(initializePlots, 100); return; }

        // Explorer 1
        document.getElementById('op-pot-select').addEventListener('change', drawZoo);
        document.getElementById('op-ell-slider').addEventListener('input', function() {
            document.getElementById('op-ell-value').textContent = parseFloat(this.value).toFixed(2);
            drawZoo();
        });
        document.getElementById('op-k-slider').addEventListener('input', function() {
            document.getElementById('op-k-value').textContent = parseFloat(this.value).toFixed(2);
            drawZoo();
        });
        document.getElementById('op-aux-slider').addEventListener('input', function() {
            document.getElementById('op-aux-value').textContent = parseFloat(this.value).toFixed(2);
            drawZoo();
        });
        document.getElementById('op-E-slider').addEventListener('input', function() {
            document.getElementById('op-E-value').textContent = parseFloat(this.value).toFixed(2);
            drawZoo();
        });
        drawZoo();

        // Explorer 2
        var sliderIds = ['op-bd-r0-slider', 'op-bd-vy0-slider'];
        var valueIds  = ['op-bd-r0-value', 'op-bd-vy0-value'];
        for (var i = 0; i < 2; i++) {
            (function(idx) {
                document.getElementById(sliderIds[idx]).addEventListener('input', function() {
                    document.getElementById(valueIds[idx]).textContent = parseFloat(this.value).toFixed(2);
                });
            })(i);
        }
        document.getElementById('op-bd-h-slider').addEventListener('input', function() {
            var v = parseFloat(this.value);
            document.getElementById('op-bd-h-value').textContent = (v >= 0 ? '' : '−') + Math.abs(v).toFixed(1);
        });
        bdInit();
        bdDraw();
    }

    initializePlots();
})();
