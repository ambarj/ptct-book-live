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

    // Closed-form Kepler conic ρ(φ) = p/(1+e cos φ)
    function conicXY(p, e) {
        var xs = [], ys = [];
        var phiArr;
        if (e < 0.999) {
            // closed (ellipse / circle)
            var n = 400;
            phiArr = new Array(n + 1);
            for (var i = 0; i <= n; i++) phiArr[i] = 2 * Math.PI * i / n;
        } else if (e < 1.001) {
            var n2 = 400;
            phiArr = new Array(n2 + 1);
            for (var i2 = 0; i2 <= n2; i2++) phiArr[i2] = -Math.PI * 0.97 + 2 * Math.PI * 0.97 * i2 / n2;
        } else {
            var phiMax = Math.acos(-1 / e) * 0.97;
            var n3 = 400;
            phiArr = new Array(n3 + 1);
            for (var i3 = 0; i3 <= n3; i3++) phiArr[i3] = -phiMax + 2 * phiMax * i3 / n3;
        }
        for (var k = 0; k < phiArr.length; k++) {
            var ph = phiArr[k];
            var r = p / (1 + e * Math.cos(ph));
            if (r > 0 && r < 100) {
                xs.push(r * Math.cos(ph));
                ys.push(r * Math.sin(ph));
            }
        }
        return { x: xs, y: ys };
    }

    // ===============================================================
    // EXPLORER 1: Conic Family
    // ===============================================================
    function getConicParams() {
        return {
            e:   parseFloat(document.getElementById('kp-ecc-slider').value),
            ell: parseFloat(document.getElementById('kp-ell-slider').value),
            k:   parseFloat(document.getElementById('kp-k-slider').value)
        };
    }

    function drawConic() {
        var p = getConicParams();
        var lat = p.ell * p.ell / (MU * p.k);  // semi-latus rectum
        var orbit = conicXY(lat, p.e);

        // Energy from e: e² = 1 + 2Eℓ²/(μk²) ⇒ E = (e²-1)μk²/(2ℓ²)
        var E = (p.e * p.e - 1) * MU * p.k * p.k / (2 * p.ell * p.ell);
        var classification, perihelion, aphelion = '∞', a = '∞';

        if (p.e < 0.001)         { classification = 'circle'; perihelion = lat.toFixed(3); aphelion = lat.toFixed(3); a = lat.toFixed(3); }
        else if (p.e < 0.999)    { classification = 'ellipse';
                                   perihelion = (lat / (1 + p.e)).toFixed(3);
                                   aphelion = (lat / (1 - p.e)).toFixed(3);
                                   a = (lat / (1 - p.e * p.e)).toFixed(3); }
        else if (p.e < 1.001)    { classification = 'parabola';
                                   perihelion = (lat / 2).toFixed(3); }
        else                     { classification = 'hyperbola';
                                   perihelion = (lat / (1 + p.e)).toFixed(3); }

        // Plot range — adapt to orbit size
        var R = 4;
        if (orbit.x.length > 0) {
            var ma = 0;
            for (var oi = 0; oi < orbit.x.length; oi++) {
                if (Math.abs(orbit.x[oi]) > ma) ma = Math.abs(orbit.x[oi]);
                if (Math.abs(orbit.y[oi]) > ma) ma = Math.abs(orbit.y[oi]);
            }
            R = Math.max(2, Math.min(8, ma * 1.2));
        }

        // Compute second focus position (for ellipse / hyperbola)
        var secondFocus = null;
        if (p.e > 0.01 && p.e < 0.999) {
            var aNum = lat / (1 - p.e * p.e);
            secondFocus = [-2 * aNum * p.e, 0];     // both foci on x-axis, perihelion at +x
        } else if (p.e > 1.001) {
            var aH = lat / (p.e * p.e - 1);
            secondFocus = [2 * aH * p.e, 0];
        }

        var traces = [
            { x: orbit.x, y: orbit.y, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2.5 }, name: classification },
            { x: [0], y: [0], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 14, symbol: 'star',
                        line: { color: '#fff', width: 1 } }, name: 'central body (focus)' }
        ];
        if (secondFocus) {
            traces.push({
                x: [secondFocus[0]], y: [secondFocus[1]],
                type: 'scatter', mode: 'markers',
                marker: { color: '#aaa', size: 10, symbol: 'cross-thin', line: { color: '#aaa', width: 2 } },
                name: 'second focus'
            });
        }
        // Perihelion marker (always exists)
        var periRho = parseFloat(perihelion);
        if (!isNaN(periRho)) {
            traces.push({
                x: [periRho], y: [0],
                type: 'scatter', mode: 'markers',
                marker: { color: '#ff006e', size: 10, symbol: 'circle-open', line: { color: '#ff006e', width: 2 } },
                name: 'perihelion'
            });
        }

        Plotly.react('kp-orbitPlot', traces, Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-R, R], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-R, R], 'y'),
            height: 440,
            title: { text: classification + '  (e = ' + p.e.toFixed(2) + ', p = ' + lat.toFixed(2) + ')',
                     font: { color: '#aaa', size: 12 } },
            legend: { x: 0.02, y: 0.02, font: { color: '#aaa', size: 9 } }
        }), { responsive: true });

        // RIGHT: U_eff with energy line
        var rhoMin = 0.1, rhoMax = 8;
        var rhos = [], Ue = [];
        for (var i = 0; i <= 400; i++) {
            var r = rhoMin + (rhoMax - rhoMin) * i / 400;
            rhos.push(r);
            Ue.push(-p.k / r + p.ell * p.ell / (2 * MU * r * r));
        }
        var emin = -MU * p.k * p.k / (2 * p.ell * p.ell);
        var rcirc = p.ell * p.ell / (MU * p.k);

        // Find turning points
        var tps = [];
        var prevG = Ue[0] - E;
        for (var j = 1; j < rhos.length; j++) {
            var g = Ue[j] - E;
            if (prevG * g < 0) {
                // bisect
                var aBis = rhos[j-1], bBis = rhos[j], faBis = prevG;
                for (var jj = 0; jj < 50; jj++) {
                    var m = 0.5 * (aBis + bBis);
                    var fm = -p.k/m + p.ell*p.ell/(2*MU*m*m) - E;
                    if (faBis * fm < 0) bBis = m; else { aBis = m; faBis = fm; }
                }
                tps.push(0.5 * (aBis + bBis));
            }
            prevG = g;
        }

        Plotly.react('kp-uPlot', [
            { x: rhos, y: Ue, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2.5 }, name: 'U_eff' },
            { x: [rhoMin, rhoMax], y: [E, E], type: 'scatter', mode: 'lines',
              line: { color: '#fff', width: 1.5, dash: 'dash' }, name: 'E = ' + E.toFixed(3) },
            { x: [rcirc], y: [emin], type: 'scatter', mode: 'markers',
              marker: { color: '#00ff88', size: 10, symbol: 'diamond' }, name: 'min', showlegend: false },
            { x: tps, y: tps.map(function() { return E; }),
              type: 'scatter', mode: 'markers',
              marker: { color: '#fff', size: 12, symbol: 'star', line: { color: '#ff006e', width: 1 } },
              name: 'turning points' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, rhoMax], 'ρ'),
            yaxis: axStyle([-1.5, 1.5], 'energy'),
            height: 440,
            title: { text: 'U_eff with energy line', font: { color: '#aaa', size: 12 } },
            legend: { x: 0.55, y: 0.02, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('kp-stats1').innerHTML =
            '<span><strong>' + classification + ', e = ' + p.e.toFixed(2) + ', ℓ = ' + p.ell.toFixed(2) + ', k = ' + p.k.toFixed(2) + '</strong></span>' +
            '<span>p = ' + lat.toFixed(3) + ', perihelion = ' + perihelion +
                ', aphelion = ' + aphelion + ', a = ' + a + '</span>' +
            '<span>E = ' + E.toFixed(4) + '  (E_min = ' + emin.toFixed(4) + ')</span>';
    }

    // Quick-jump buttons for Explorer 1
    function kpSetEcc(newE) {
        var sl = document.getElementById('kp-ecc-slider');
        sl.value = newE;
        document.getElementById('kp-ecc-value').textContent = newE.toFixed(2);
        drawConic();
    }
    window.kpJumpCircle    = function() { kpSetEcc(0.0); };
    window.kpJumpEllipse   = function() { kpSetEcc(0.5); };
    window.kpJumpParabola  = function() { kpSetEcc(1.0); };
    window.kpJumpHyperbola = function() { kpSetEcc(1.5); };
    window.kpConicReset    = function() {
        document.getElementById('kp-ecc-slider').value = 0.5;
        document.getElementById('kp-ell-slider').value = 1.0;
        document.getElementById('kp-k-slider').value   = 1.0;
        document.getElementById('kp-ecc-value').textContent = '0.50';
        document.getElementById('kp-ell-value').textContent = '1.00';
        document.getElementById('kp-k-value').textContent   = '1.00';
        drawConic();
    };

    // ===============================================================
    // EXPLORER 2: Kepler's 3rd Law Verifier
    // ===============================================================
    var measuredOrbits = [];

    function getThirdLawParams() {
        return {
            a:   parseFloat(document.getElementById('kp-a-slider').value),
            e:   parseFloat(document.getElementById('kp-3rd-ecc-slider').value),
            k:   parseFloat(document.getElementById('kp-3rd-k-slider').value)
        };
    }

    function periodFromA(a, k) {
        // T = 2π √(μ/k) · a^(3/2)
        return 2 * Math.PI * Math.sqrt(MU / k) * Math.pow(a, 1.5);
    }

    function drawThirdLaw() {
        var p = getThirdLawParams();
        // Build the bound orbit (ellipse) using e and a
        // ρ(φ) = a(1-e²)/(1 + e cos φ)
        var lat = p.a * (1 - p.e * p.e);
        var orbit = conicXY(lat, p.e);
        var b = p.a * Math.sqrt(1 - p.e * p.e);
        var T = periodFromA(p.a, p.k);

        // Plot range
        var R = Math.max(2.5, p.a * (1 + p.e) * 1.2);

        // Second focus
        var secondFocus = [-2 * p.a * p.e, 0];

        Plotly.react('kp-3rdOrbitPlot', [
            { x: orbit.x, y: orbit.y, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2.5 }, name: 'orbit' },
            { x: [0], y: [0], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 14, symbol: 'star' }, name: 'central body' },
            { x: [secondFocus[0]], y: [secondFocus[1]], type: 'scatter', mode: 'markers',
              marker: { color: '#aaa', size: 10, symbol: 'cross-thin', line: { color: '#aaa', width: 2 } },
              name: 'second focus' }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-R, R], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-R, R], 'y'),
            height: 420,
            title: { text: 'a = ' + p.a.toFixed(2) + ', e = ' + p.e.toFixed(2) + ', T = ' + T.toFixed(3),
                     font: { color: '#aaa', size: 12 } },
            legend: { x: 0.02, y: 0.02, font: { color: '#aaa', size: 9 } }
        }), { responsive: true });

        // RIGHT: T vs a log-log
        var aFit = [], TFit = [];
        for (var i = 0; i <= 100; i++) {
            var av = Math.pow(10, -1 + 2 * i / 100);
            aFit.push(av);
            TFit.push(periodFromA(av, p.k));
        }

        var measX = measuredOrbits.map(function(m) { return m.a; });
        var measY = measuredOrbits.map(function(m) { return m.T; });

        Plotly.react('kp-3rdLawPlot', [
            { x: aFit, y: TFit, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2, dash: 'dash' }, name: 'theory T ∝ a^(3/2)' },
            { x: measX, y: measY, type: 'scatter', mode: 'markers',
              marker: { color: '#00f3ff', size: 10 }, name: 'measured (' + measuredOrbits.length + ')' },
            { x: [p.a], y: [T], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 14, symbol: 'star', line: { color: '#fff', width: 1 } },
              name: 'current' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'a (semi-major axis)', 'log'),
            yaxis: axStyle(null, 'T (period)', 'log'),
            height: 420,
            title: { text: 'log–log: slope 3/2 ⇒ Kepler 3', font: { color: '#aaa', size: 12 } },
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('kp-stats2').innerHTML =
            '<span><strong>a = ' + p.a.toFixed(2) + ', e = ' + p.e.toFixed(2) + ', k = ' + p.k.toFixed(2) + '</strong></span>' +
            '<span>T = 2π√(μ/k)·a^(3/2) = ' + T.toFixed(4) + '</span>' +
            '<span>measurements collected: ' + measuredOrbits.length + '</span>';
    }

    window.kp3rdAdd = function() {
        var p = getThirdLawParams();
        var T = periodFromA(p.a, p.k);
        // Tag with k so different k values can be distinguished if desired
        measuredOrbits.push({ a: p.a, T: T, e: p.e, k: p.k });
        drawThirdLaw();
    };
    window.kp3rdClear = function() { measuredOrbits = []; drawThirdLaw(); };
    window.kp3rdReset = function() {
        measuredOrbits = [];
        document.getElementById('kp-a-slider').value = 1.0;
        document.getElementById('kp-3rd-ecc-slider').value = 0.30;
        document.getElementById('kp-3rd-k-slider').value = 1.0;
        document.getElementById('kp-a-value').textContent = '1.00';
        document.getElementById('kp-3rd-ecc-value').textContent = '0.30';
        document.getElementById('kp-3rd-k-value').textContent = '1.00';
        drawThirdLaw();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('kp-orbitPlot')) { setTimeout(initializePlots, 100); return; }

        // Explorer 1
        document.getElementById('kp-ecc-slider').addEventListener('input', function() {
            document.getElementById('kp-ecc-value').textContent = parseFloat(this.value).toFixed(2);
            drawConic();
        });
        document.getElementById('kp-ell-slider').addEventListener('input', function() {
            document.getElementById('kp-ell-value').textContent = parseFloat(this.value).toFixed(2);
            drawConic();
        });
        document.getElementById('kp-k-slider').addEventListener('input', function() {
            document.getElementById('kp-k-value').textContent = parseFloat(this.value).toFixed(2);
            drawConic();
        });
        drawConic();

        // Explorer 2
        document.getElementById('kp-a-slider').addEventListener('input', function() {
            document.getElementById('kp-a-value').textContent = parseFloat(this.value).toFixed(2);
            drawThirdLaw();
        });
        document.getElementById('kp-3rd-ecc-slider').addEventListener('input', function() {
            document.getElementById('kp-3rd-ecc-value').textContent = parseFloat(this.value).toFixed(2);
            drawThirdLaw();
        });
        document.getElementById('kp-3rd-k-slider').addEventListener('input', function() {
            document.getElementById('kp-3rd-k-value').textContent = parseFloat(this.value).toFixed(2);
            drawThirdLaw();
        });
        drawThirdLaw();
    }

    initializePlots();
})();
