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

    var MU = 1.0;  // reduced mass fixed at 1 throughout

    // ---------------- Potentials ----------------
    function bareU(name, k, rho) {
        if (name === 'kepler') return -k / rho;
        return 0.5 * k * rho * rho;          // sho
    }
    function ueff(name, k, ell, rho) {
        return bareU(name, k, rho) + ell * ell / (2 * MU * rho * rho);
    }
    function rhoCirc(name, k, ell) {
        if (name === 'kepler') return ell * ell / (MU * k);
        return Math.pow(ell * ell / (MU * k), 0.25);
    }
    function eMin(name, k, ell) {
        return ueff(name, k, ell, rhoCirc(name, k, ell));
    }
    function uInf(name) {
        if (name === 'kepler') return 0;
        return Infinity;
    }

    // Find turning points by sampling + bracketed Brent (simple bisection here)
    function findTurningPoints(name, k, ell, E) {
        // Allowed where ueff <= E. Sample, find sign changes of g(ρ) = ueff - E.
        var rhoMin = 0.05, rhoMax = name === 'sho' ? 6 : 30;
        var n = 1000;
        var pts = [];
        var prevG = ueff(name, k, ell, rhoMin) - E;
        var prevR = rhoMin;
        for (var i = 1; i <= n; i++) {
            var r = rhoMin + (rhoMax - rhoMin) * i / n;
            var g = ueff(name, k, ell, r) - E;
            if (prevG * g < 0) {
                // bisect
                var a = prevR, b = r, fa = prevG, fb = g;
                for (var j = 0; j < 50; j++) {
                    var m = 0.5 * (a + b);
                    var fm = ueff(name, k, ell, m) - E;
                    if (fa * fm < 0) { b = m; fb = fm; } else { a = m; fa = fm; }
                }
                pts.push(0.5 * (a + b));
            }
            prevG = g; prevR = r;
        }
        return pts;
    }

    function classify(name, k, ell, E) {
        var emin = eMin(name, k, ell);
        var uinf = uInf(name);
        if (E < emin - 1e-6) return 'forbidden';
        if (Math.abs(E - emin) < 5e-3) return 'circular';
        if (name === 'kepler') {
            if (E < 0) return 'bound';
            if (Math.abs(E) < 5e-3) return 'parabolic';
            return 'unbound (hyperbolic)';
        }
        // sho — always bound
        return 'bound';
    }

    // ---------------- Kepler closed-form orbit ----------------
    // r(φ) = p / (1 + e cos φ), p = ℓ²/(μk), e = √(1 + 2Eℓ²/(μk²))
    function keplerOrbitXY(k, ell, E) {
        var p = ell * ell / (MU * k);
        var e2 = 1 + 2 * E * ell * ell / (MU * k * k);
        if (e2 < 0) e2 = 0;
        var ecc = Math.sqrt(e2);
        var xs = [], ys = [];
        var phiArr;
        if (ecc < 0.999) {
            // ellipse
            var n = 400;
            phiArr = new Array(n + 1);
            for (var i = 0; i <= n; i++) phiArr[i] = -Math.PI + 2 * Math.PI * i / n;
        } else if (ecc < 1.001) {
            // parabola
            var n2 = 400;
            phiArr = new Array(n2 + 1);
            for (var i2 = 0; i2 <= n2; i2++) phiArr[i2] = -Math.PI * 0.95 + 2 * Math.PI * 0.95 * i2 / n2;
        } else {
            // hyperbola — limit φ to keep r positive
            var phiMax = Math.acos(-1 / ecc) * 0.97;
            var n3 = 400;
            phiArr = new Array(n3 + 1);
            for (var i3 = 0; i3 <= n3; i3++) phiArr[i3] = -phiMax + 2 * phiMax * i3 / n3;
        }
        for (var k2 = 0; k2 < phiArr.length; k2++) {
            var ph = phiArr[k2];
            var r = p / (1 + ecc * Math.cos(ph));
            if (r > 0 && r < 50) {
                xs.push(r * Math.cos(ph));
                ys.push(r * Math.sin(ph));
            }
        }
        return { x: xs, y: ys, ecc: ecc };
    }

    // SHO closed-form orbit: parametric ellipse with semi-axes set by turning points.
    function shoOrbitXY(k, ell, E) {
        var pts = findTurningPoints('sho', k, ell, E);
        if (pts.length < 2) {
            // Circular fallback
            var rc = rhoCirc('sho', k, ell);
            pts = [rc, rc];
        }
        var rmin = pts[0], rmax = pts[1];
        // 2D harmonic oscillator with angular momentum: orbit is an ellipse
        // centered at origin with semi-major rmax, semi-minor rmin.
        var n = 400;
        var xs = [], ys = [];
        for (var i = 0; i <= n; i++) {
            var t = 2 * Math.PI * i / n;
            xs.push(rmax * Math.cos(t));
            ys.push(rmin * Math.sin(t));
        }
        return { x: xs, y: ys };
    }

    function rhoOfTimeKepler(k, ell, E, nT) {
        var p = ell * ell / (MU * k);
        var e2 = 1 + 2 * E * ell * ell / (MU * k * k);
        if (e2 < 0) e2 = 0;
        var ecc = Math.sqrt(e2);
        // For bound (ecc<1): use mean anomaly via Kepler equation
        var ts = [], rs = [];
        if (ecc < 0.999) {
            // bound — show 2 periods
            var T = 2 * Math.PI * Math.pow(p / (1 - ecc * ecc), 1.5) * Math.sqrt(MU / k); // Kepler's 3rd
            for (var i = 0; i <= 400; i++) {
                var ti = i * (nT * T) / 400;
                var M = 2 * Math.PI * ti / T;
                // Solve E - e sin E = M
                var Ec = M;
                for (var j = 0; j < 8; j++) Ec = Ec - (Ec - ecc * Math.sin(Ec) - M) / (1 - ecc * Math.cos(Ec));
                // r = a(1 - e cos E) where a = p/(1-e²)
                var a = p / (1 - ecc * ecc);
                ts.push(ti);
                rs.push(a * (1 - ecc * Math.cos(Ec)));
            }
        } else {
            // unbound — just show ρ as function of φ → t mapping is monotonic
            // approximate: use φ as independent variable.
            for (var i2 = 0; i2 <= 400; i2++) {
                var phi = -Math.PI * 0.7 + 1.4 * Math.PI * i2 / 400;
                var r = p / (1 + ecc * Math.cos(phi));
                if (r > 0 && r < 50) { ts.push(i2 * 0.05); rs.push(r); }
            }
        }
        return { t: ts, rho: rs };
    }

    function rhoOfTimeSHO(k, ell, E) {
        var pts = findTurningPoints('sho', k, ell, E);
        if (pts.length < 2) {
            var rc = rhoCirc('sho', k, ell);
            return { t: [0, 1], rho: [rc, rc] };
        }
        var rmin = pts[0], rmax = pts[1];
        // Radial oscillation period for SHO with angular momentum is half the spatial period
        // simpler: just plot a sinusoid between rmin and rmax
        var omega = Math.sqrt(k / MU);
        var T = 2 * Math.PI / omega;
        var ts = [], rs = [];
        for (var i = 0; i <= 400; i++) {
            var ti = i * 2 * T / 400;
            var rho = 0.5 * (rmin + rmax) + 0.5 * (rmax - rmin) * Math.cos(2 * omega * ti);
            ts.push(ti); rs.push(rho);
        }
        return { t: ts, rho: rs };
    }

    // ===============================================================
    // EXPLORER 1: U_eff Energy Diagram
    // ===============================================================
    function getEPParams() {
        return {
            name: document.getElementById('ep-pot-select').value,
            ell:  parseFloat(document.getElementById('ep-ell-slider').value),
            k:    parseFloat(document.getElementById('ep-k-slider').value),
            E:    parseFloat(document.getElementById('ep-E-slider').value)
        };
    }

    function drawUeffDiagram() {
        var p = getEPParams();
        var rhoMin = 0.1, rhoMax = p.name === 'sho' ? 4 : 8;
        var rhos = [], Ub = [], Uc = [], Ue = [];
        for (var i = 0; i <= 400; i++) {
            var r = rhoMin + (rhoMax - rhoMin) * i / 400;
            rhos.push(r);
            Ub.push(bareU(p.name, p.k, r));
            Uc.push(p.ell * p.ell / (2 * MU * r * r));
            Ue.push(ueff(p.name, p.k, p.ell, r));
        }

        var rc = rhoCirc(p.name, p.k, p.ell);
        var emin = eMin(p.name, p.k, p.ell);
        var tps = findTurningPoints(p.name, p.k, p.ell, p.E);
        var cls = classify(p.name, p.k, p.ell, p.E);

        // Y-range: clip
        var yMin = p.name === 'kepler' ? -1.5 : 0;
        var yMax = p.name === 'kepler' ? 1.5 : 6;

        // Allowed-region shading: build piecewise traces of U_eff between turning points,
        // filled to the E line.
        var shading = [];
        if (cls === 'bound' && tps.length >= 2) {
            var sx = [], sy = [];
            for (var s = 0; s < rhos.length; s++) {
                if (rhos[s] >= tps[0] && rhos[s] <= tps[1]) {
                    sx.push(rhos[s]); sy.push(Ue[s]);
                }
            }
            // Add the closing line at E
            shading.push({
                x: [tps[0]].concat(sx).concat([tps[1], tps[0]]),
                y: [p.E].concat(sy).concat([p.E, p.E]),
                type: 'scatter', mode: 'none', fill: 'toself',
                fillcolor: 'rgba(0,255,136,0.15)', name: 'allowed', hoverinfo: 'skip', showlegend: false
            });
        } else if (cls === 'unbound (hyperbolic)' && tps.length >= 1) {
            var sx2 = [], sy2 = [];
            for (var s2 = 0; s2 < rhos.length; s2++) {
                if (rhos[s2] >= tps[0]) {
                    sx2.push(rhos[s2]); sy2.push(Ue[s2]);
                }
            }
            shading.push({
                x: [tps[0]].concat(sx2).concat([rhoMax, tps[0]]),
                y: [p.E].concat(sy2).concat([p.E, p.E]),
                type: 'scatter', mode: 'none', fill: 'toself',
                fillcolor: 'rgba(0,255,136,0.15)', hoverinfo: 'skip', showlegend: false
            });
        } else if (cls === 'parabolic' && tps.length >= 1) {
            var sx3 = [], sy3 = [];
            for (var s3 = 0; s3 < rhos.length; s3++) {
                if (rhos[s3] >= tps[0]) {
                    sx3.push(rhos[s3]); sy3.push(Ue[s3]);
                }
            }
            shading.push({
                x: [tps[0]].concat(sx3).concat([rhoMax, tps[0]]),
                y: [p.E].concat(sy3).concat([p.E, p.E]),
                type: 'scatter', mode: 'none', fill: 'toself',
                fillcolor: 'rgba(0,255,136,0.15)', hoverinfo: 'skip', showlegend: false
            });
        }

        var traces = shading.concat([
            { x: rhos, y: Ub, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 1.2, dash: 'dot' }, name: 'U(ρ)' },
            { x: rhos, y: Uc, type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 1.2, dash: 'dot' }, name: 'ℓ²/(2μρ²)' },
            { x: rhos, y: Ue, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2.5 }, name: 'U_eff' },
            // E line
            { x: [rhoMin, rhoMax], y: [p.E, p.E], type: 'scatter', mode: 'lines',
              line: { color: '#fff', width: 1.5, dash: 'dash' }, name: 'E = ' + p.E.toFixed(2) },
            // Circular orbit marker
            { x: [rc], y: [emin], type: 'scatter', mode: 'markers',
              marker: { color: '#00ff88', size: 12, symbol: 'diamond', line: { color: '#fff', width: 1 } },
              name: 'min (ρ_circ)' }
        ]);

        // Turning points
        if (tps.length > 0) {
            traces.push({
                x: tps, y: tps.map(function() { return p.E; }),
                type: 'scatter', mode: 'markers',
                marker: { color: '#fff', size: 14, symbol: 'star', line: { color: '#ff006e', width: 1 } },
                name: 'turning points', hoverinfo: 'x'
            });
        }

        Plotly.react('ep-uPlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle([0, rhoMax], 'ρ'),
            yaxis: axStyle([yMin, yMax], 'energy'),
            height: 440,
            title: { text: 'U_eff energy diagram', font: { color: '#aaa', size: 12 } },
            legend: { x: 0.55, y: 0.02, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // RIGHT: actual orbit
        var orbit;
        if (p.name === 'kepler') {
            if (cls === 'forbidden' || cls === 'circular') {
                if (cls === 'circular') {
                    var ot = [], ox = [], oy = [];
                    for (var oi = 0; oi <= 200; oi++) {
                        var oth = 2 * Math.PI * oi / 200;
                        ox.push(rc * Math.cos(oth));
                        oy.push(rc * Math.sin(oth));
                    }
                    orbit = { x: ox, y: oy };
                } else {
                    orbit = { x: [], y: [] };
                }
            } else {
                orbit = keplerOrbitXY(p.k, p.ell, p.E);
            }
        } else {
            orbit = shoOrbitXY(p.k, p.ell, p.E);
        }

        var R = 5;
        if (p.name === 'sho' && orbit.x.length > 0) {
            var maxAbs = 0;
            for (var oj = 0; oj < orbit.x.length; oj++) {
                if (Math.abs(orbit.x[oj]) > maxAbs) maxAbs = Math.abs(orbit.x[oj]);
                if (Math.abs(orbit.y[oj]) > maxAbs) maxAbs = Math.abs(orbit.y[oj]);
            }
            R = Math.max(2.5, maxAbs * 1.2);
        }

        Plotly.react('ep-orbitPlot', [
            { x: orbit.x, y: orbit.y, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2 }, name: 'orbit', showlegend: false },
            { x: [0], y: [0], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 10, symbol: 'star' }, name: 'force center', showlegend: false }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-R, R], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-R, R], 'y'),
            height: 440,
            title: { text: 'Orbit: ' + cls, font: { color: '#aaa', size: 12 } }
        }), { responsive: true });

        var tpStr = tps.length === 0 ? 'none'
                  : tps.length === 1 ? tps[0].toFixed(3)
                  : tps[0].toFixed(3) + ' / ' + tps[1].toFixed(3);

        document.getElementById('ep-stats1').innerHTML =
            '<span><strong>' + p.name + ', k = ' + p.k.toFixed(2) + ', ℓ = ' + p.ell.toFixed(2) + '</strong></span>' +
            '<span>ρ_circ = ' + rc.toFixed(3) + ', E_min = ' + emin.toFixed(3) + '</span>' +
            '<span>E = ' + p.E.toFixed(3) + ' → ' + cls + '  |  turning points: ' + tpStr + '</span>';
    }

    // Quick-jump buttons for Explorer 1
    function epUpdateESlider(newE) {
        var sl = document.getElementById('ep-E-slider');
        // Clamp to slider range
        var min = parseFloat(sl.min), max = parseFloat(sl.max);
        sl.value = Math.max(min, Math.min(max, newE));
        document.getElementById('ep-E-value').textContent = (parseFloat(sl.value) >= 0 ? '' : '−') + Math.abs(parseFloat(sl.value)).toFixed(2);
        drawUeffDiagram();
    }
    window.epJumpEmin  = function() { var p = getEPParams(); epUpdateESlider(eMin(p.name, p.k, p.ell)); };
    window.epJumpEhalf = function() { var p = getEPParams(); epUpdateESlider(0.5 * eMin(p.name, p.k, p.ell)); };
    window.epJumpEzero = function() { epUpdateESlider(0); };
    window.epUeffReset = function() {
        document.getElementById('ep-pot-select').value = 'kepler';
        document.getElementById('ep-ell-slider').value = 1.0;
        document.getElementById('ep-k-slider').value = 1.0;
        document.getElementById('ep-E-slider').value = -0.40;
        document.getElementById('ep-ell-value').textContent = '1.00';
        document.getElementById('ep-k-value').textContent = '1.00';
        document.getElementById('ep-E-value').textContent = '−0.40';
        drawUeffDiagram();
    };

    // ===============================================================
    // EXPLORER 2: Bound vs Unbound Classifier (triple panel)
    // ===============================================================
    function getClsParams() {
        return {
            name: document.getElementById('ep-cls-pot-select').value,
            ell:  parseFloat(document.getElementById('ep-cls-ell-slider').value),
            k:    1.0,    // fixed for the classifier so we focus on E and ℓ
            E:    parseFloat(document.getElementById('ep-cls-E-slider').value)
        };
    }

    function drawClassifier() {
        var p = getClsParams();
        var rhoMin = 0.1, rhoMax = p.name === 'sho' ? 4 : 8;
        var rhos = [], Ue = [];
        for (var i = 0; i <= 400; i++) {
            var r = rhoMin + (rhoMax - rhoMin) * i / 400;
            rhos.push(r);
            Ue.push(ueff(p.name, p.k, p.ell, r));
        }

        var rc = rhoCirc(p.name, p.k, p.ell);
        var emin = eMin(p.name, p.k, p.ell);
        var tps = findTurningPoints(p.name, p.k, p.ell, p.E);
        var cls = classify(p.name, p.k, p.ell, p.E);

        var yMin = p.name === 'kepler' ? -1.0 : 0;
        var yMax = p.name === 'kepler' ? 0.8 : 5;

        // LEFT: U_eff with E line
        Plotly.react('ep-clsUPlot', [
            { x: rhos, y: Ue, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2.5 }, name: 'U_eff', showlegend: false },
            { x: [rhoMin, rhoMax], y: [p.E, p.E], type: 'scatter', mode: 'lines',
              line: { color: '#fff', width: 1.5, dash: 'dash' }, name: 'E', showlegend: false },
            { x: [rc], y: [emin], type: 'scatter', mode: 'markers',
              marker: { color: '#00ff88', size: 10, symbol: 'diamond' }, showlegend: false },
            { x: tps, y: tps.map(function() { return p.E; }), type: 'scatter', mode: 'markers',
              marker: { color: '#fff', size: 12, symbol: 'star', line: { color: '#ff006e', width: 1 } },
              showlegend: false }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, rhoMax], 'ρ'),
            yaxis: axStyle([yMin, yMax], 'energy'),
            height: 360,
            title: { text: 'U_eff (' + cls + ')', font: { color: '#aaa', size: 11 } },
            margin: { t: 40, r: 10, b: 40, l: 50 }
        }), { responsive: true });

        // MIDDLE: actual orbit
        var orbit;
        if (p.name === 'kepler') {
            if (cls === 'forbidden') orbit = { x: [], y: [] };
            else if (cls === 'circular') {
                var oxs = [], oys = [];
                for (var oi = 0; oi <= 200; oi++) {
                    var oth = 2 * Math.PI * oi / 200;
                    oxs.push(rc * Math.cos(oth));
                    oys.push(rc * Math.sin(oth));
                }
                orbit = { x: oxs, y: oys };
            } else orbit = keplerOrbitXY(p.k, p.ell, p.E);
        } else {
            orbit = shoOrbitXY(p.k, p.ell, p.E);
        }

        var R = 4;
        if (orbit.x.length > 0) {
            var ma = 0;
            for (var oj = 0; oj < orbit.x.length; oj++) {
                if (Math.abs(orbit.x[oj]) > ma) ma = Math.abs(orbit.x[oj]);
                if (Math.abs(orbit.y[oj]) > ma) ma = Math.abs(orbit.y[oj]);
            }
            R = Math.max(2, ma * 1.2);
        }

        Plotly.react('ep-clsOrbitPlot', [
            { x: orbit.x, y: orbit.y, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2 }, showlegend: false },
            { x: [0], y: [0], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 10, symbol: 'star' }, showlegend: false }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-R, R], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-R, R], 'y'),
            height: 360,
            title: { text: 'Orbit (x, y)', font: { color: '#aaa', size: 11 } },
            margin: { t: 40, r: 10, b: 40, l: 50 }
        }), { responsive: true });

        // RIGHT: ρ(t)
        var rt;
        if (p.name === 'kepler') rt = rhoOfTimeKepler(p.k, p.ell, p.E, 2);
        else                     rt = rhoOfTimeSHO(p.k, p.ell, p.E);

        var rhoMaxT = 1; for (var ri = 0; ri < rt.rho.length; ri++) if (rt.rho[ri] > rhoMaxT) rhoMaxT = rt.rho[ri];
        var traces = [
            { x: rt.t, y: rt.rho, type: 'scatter', mode: 'lines',
              line: { color: '#00ff88', width: 2 }, showlegend: false }
        ];
        // Turning-point reference lines
        for (var tpi = 0; tpi < tps.length; tpi++) {
            traces.push({
                x: [rt.t[0] || 0, rt.t[rt.t.length - 1] || 1],
                y: [tps[tpi], tps[tpi]],
                type: 'scatter', mode: 'lines',
                line: { color: '#ff006e', width: 1, dash: 'dot' }, showlegend: false, hoverinfo: 'skip'
            });
        }

        Plotly.react('ep-clsRhoPlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 't'),
            yaxis: axStyle([0, rhoMaxT * 1.1], 'ρ(t)'),
            height: 360,
            title: { text: 'Radial coordinate vs time', font: { color: '#aaa', size: 11 } },
            margin: { t: 40, r: 10, b: 40, l: 50 }
        }), { responsive: true });

        // Eccentricity for Kepler
        var detailStr = '';
        if (p.name === 'kepler') {
            var e2 = 1 + 2 * p.E * p.ell * p.ell / (MU * p.k * p.k);
            if (e2 < 0) e2 = 0;
            var ecc = Math.sqrt(e2);
            detailStr = '  |  e = ' + ecc.toFixed(3);
        }
        var tpStr = tps.length === 0 ? 'none'
                  : tps.length === 1 ? tps[0].toFixed(2)
                  : tps[0].toFixed(2) + ' / ' + tps[1].toFixed(2);

        document.getElementById('ep-stats2').innerHTML =
            '<span><strong>' + p.name + ', ℓ = ' + p.ell.toFixed(2) + ', E = ' + p.E.toFixed(3) + '</strong></span>' +
            '<span>' + cls + detailStr + '</span>' +
            '<span>turning points: ' + tpStr + '</span>';
    }

    function clsUpdateESlider(newE) {
        var sl = document.getElementById('ep-cls-E-slider');
        var min = parseFloat(sl.min), max = parseFloat(sl.max);
        sl.value = Math.max(min, Math.min(max, newE));
        document.getElementById('ep-cls-E-value').textContent = (parseFloat(sl.value) >= 0 ? '' : '−') + Math.abs(parseFloat(sl.value)).toFixed(2);
        drawClassifier();
    }
    window.epClsJumpEmin   = function() { var p = getClsParams(); clsUpdateESlider(eMin(p.name, p.k, p.ell)); };
    window.epClsJumpEbound = function() { var p = getClsParams(); clsUpdateESlider(0.5 * eMin(p.name, p.k, p.ell)); };
    window.epClsJumpEzero  = function() { clsUpdateESlider(0); };
    window.epClsJumpEhyper = function() { clsUpdateESlider(0.1); };
    window.epClsReset = function() {
        document.getElementById('ep-cls-pot-select').value = 'kepler';
        document.getElementById('ep-cls-ell-slider').value = 1.0;
        document.getElementById('ep-cls-E-slider').value = -0.30;
        document.getElementById('ep-cls-ell-value').textContent = '1.00';
        document.getElementById('ep-cls-E-value').textContent = '−0.30';
        drawClassifier();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('ep-uPlot')) { setTimeout(initializePlots, 100); return; }

        // Explorer 1
        document.getElementById('ep-pot-select').addEventListener('change', drawUeffDiagram);
        document.getElementById('ep-ell-slider').addEventListener('input', function() {
            document.getElementById('ep-ell-value').textContent = parseFloat(this.value).toFixed(2);
            drawUeffDiagram();
        });
        document.getElementById('ep-k-slider').addEventListener('input', function() {
            document.getElementById('ep-k-value').textContent = parseFloat(this.value).toFixed(2);
            drawUeffDiagram();
        });
        document.getElementById('ep-E-slider').addEventListener('input', function() {
            var v = parseFloat(this.value);
            document.getElementById('ep-E-value').textContent = (v >= 0 ? '' : '−') + Math.abs(v).toFixed(2);
            drawUeffDiagram();
        });
        drawUeffDiagram();

        // Explorer 2
        document.getElementById('ep-cls-pot-select').addEventListener('change', drawClassifier);
        document.getElementById('ep-cls-ell-slider').addEventListener('input', function() {
            document.getElementById('ep-cls-ell-value').textContent = parseFloat(this.value).toFixed(2);
            drawClassifier();
        });
        document.getElementById('ep-cls-E-slider').addEventListener('input', function() {
            var v = parseFloat(this.value);
            document.getElementById('ep-cls-E-value').textContent = (v >= 0 ? '' : '−') + Math.abs(v).toFixed(2);
            drawClassifier();
        });
        drawClassifier();
    }

    initializePlots();
})();
