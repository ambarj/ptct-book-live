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

    // ===============================================================
    // EXPLORER 1: Two-Body Animator (Coupled → Decoupled)
    // ===============================================================
    // Use Kepler-orbit parameterization (closed-form ellipse) so we
    // don't have to integrate ODEs in the browser. Both bodies orbit
    // their common CM in similar ellipses, scaled by mass ratio.

    var animState = { running: false, t: 0, raf: null };

    // Solve Kepler's equation E - e sin E = M for E (eccentric anomaly)
    function keplerSolve(M, e) {
        var E = M;
        for (var i = 0; i < 10; i++) {
            E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        }
        return E;
    }

    // Returns relative-coordinate position {x, y} on Kepler ellipse
    // semi-major axis a = 1, eccentricity e, mean anomaly M = 2πt
    function relPos(t, e) {
        var M = 2 * Math.PI * t;
        var E = keplerSolve(M, e);
        var x = Math.cos(E) - e;                  // already in semi-major-axis units
        var y = Math.sqrt(1 - e * e) * Math.sin(E);
        return { x: x, y: y };
    }

    function buildOrbit(e, n) {
        var xs = [], ys = [];
        for (var k = 0; k < n; k++) {
            var p = relPos(k / n, e);
            xs.push(p.x); ys.push(p.y);
        }
        xs.push(xs[0]); ys.push(ys[0]);
        return { x: xs, y: ys };
    }

    function drawAnimator() {
        var logRatio = parseFloat(document.getElementById('tb-ratio-slider').value);
        var ratio = Math.pow(10, logRatio);     // m2/m1
        var e = parseFloat(document.getElementById('tb-ecc-slider').value);
        var t = parseFloat(document.getElementById('tb-time-slider').value);

        // Mass fractions: alpha = m2/(m1+m2), beta = m1/(m1+m2)
        // r1 = -alpha * r_rel,  r2 = +beta * r_rel  (so CM = 0)
        var alpha = ratio / (1 + ratio);
        var beta = 1 / (1 + ratio);

        // Full relative orbit (closed ellipse)
        var rel = buildOrbit(e, 200);

        // Body 1 trail (orbits around CM in scaled-down version)
        var body1Trail = { x: rel.x.map(function(v) { return -alpha * v; }),
                           y: rel.y.map(function(v) { return -alpha * v; }) };
        var body2Trail = { x: rel.x.map(function(v) { return  beta * v; }),
                           y: rel.y.map(function(v) { return  beta * v; }) };

        // Current positions
        var p = relPos(t, e);
        var p1 = { x: -alpha * p.x, y: -alpha * p.y };
        var p2 = { x:  beta * p.x,  y:  beta * p.y };

        // Add a CM-velocity drift in original frame to make "coupled" view distinct
        // (Pure visual flourish — physics is the same, just shifted)
        var driftX = 0.4 * t * 1.5;   // mild drift to right
        var driftY = 0.0;

        var R = 2.4;

        // LEFT panel: original frame (with CM drift)
        Plotly.react('tb-origPlot', [
            // body 1 trail
            { x: body1Trail.x.map(function(v) { return v + driftX; }),
              y: body1Trail.y.map(function(v) { return v + driftY; }),
              type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 1, dash: 'dot' }, name: 'm₁ orbit',
              opacity: 0.4, hoverinfo: 'skip' },
            // body 2 trail
            { x: body2Trail.x.map(function(v) { return v + driftX; }),
              y: body2Trail.y.map(function(v) { return v + driftY; }),
              type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 1, dash: 'dot' }, name: 'm₂ orbit',
              opacity: 0.4, hoverinfo: 'skip' },
            // bodies as filled markers
            { x: [p1.x + driftX], y: [p1.y + driftY], type: 'scatter', mode: 'markers',
              marker: { color: '#00f3ff', size: Math.max(8, 22 * Math.cbrt(1 / (1 + ratio))), line: { color: '#fff', width: 1 } },
              name: 'm₁', hoverinfo: 'name' },
            { x: [p2.x + driftX], y: [p2.y + driftY], type: 'scatter', mode: 'markers',
              marker: { color: '#ff006e', size: Math.max(8, 22 * Math.cbrt(ratio / (1 + ratio))), line: { color: '#fff', width: 1 } },
              name: 'm₂', hoverinfo: 'name' },
            // CM marker (drifting)
            { x: [driftX], y: [driftY], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 14, symbol: 'star' }, name: 'CM ★', hoverinfo: 'name' }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-R, R + 2], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-R, R], 'y'),
            height: 420,
            title: { text: 'Original frame (CM drifts uniformly →)', font: { color: '#aaa', size: 12 } },
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 9 } },
            showlegend: true
        }), { responsive: true });

        // RIGHT panel: CM frame + relative coordinate
        Plotly.react('tb-cmPlot', [
            // body 1 in CM frame
            { x: body1Trail.x, y: body1Trail.y, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 1, dash: 'dot' }, opacity: 0.4, hoverinfo: 'skip', showlegend: false },
            { x: body2Trail.x, y: body2Trail.y, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 1, dash: 'dot' }, opacity: 0.4, hoverinfo: 'skip', showlegend: false },
            // relative-coord trail (the equivalent one-body!)
            { x: rel.x, y: rel.y, type: 'scatter', mode: 'lines',
              line: { color: '#00ff88', width: 2.5 }, name: 'r⃗ = r⃗₁−r⃗₂ (one-body)' },
            // body 1 marker
            { x: [p1.x], y: [p1.y], type: 'scatter', mode: 'markers',
              marker: { color: '#00f3ff', size: Math.max(8, 22 * Math.cbrt(1 / (1 + ratio))), line: { color: '#fff', width: 1 } },
              showlegend: false, hoverinfo: 'skip' },
            { x: [p2.x], y: [p2.y], type: 'scatter', mode: 'markers',
              marker: { color: '#ff006e', size: Math.max(8, 22 * Math.cbrt(ratio / (1 + ratio))), line: { color: '#fff', width: 1 } },
              showlegend: false, hoverinfo: 'skip' },
            // relative coord marker (with line from origin)
            { x: [0, p.x], y: [0, p.y], type: 'scatter', mode: 'lines',
              line: { color: '#00ff88', width: 2 }, showlegend: false, hoverinfo: 'skip' },
            { x: [p.x], y: [p.y], type: 'scatter', mode: 'markers',
              marker: { color: '#00ff88', size: 12, symbol: 'diamond', line: { color: '#fff', width: 1 } },
              name: 'tip of r⃗', hoverinfo: 'name' },
            // CM marker (fixed at origin)
            { x: [0], y: [0], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 14, symbol: 'star' }, name: 'CM ★ (fixed)', hoverinfo: 'name' }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-R, R], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-R, R], 'y'),
            height: 420,
            title: { text: 'CM frame: r⃗₁, r⃗₂ orbit fixed CM; r⃗ traces equivalent one-body', font: { color: '#aaa', size: 12 } },
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 9 } },
            showlegend: true
        }), { responsive: true });

        // Stats bar
        var mu = ratio / (1 + ratio);   // μ in units of m1
        document.getElementById('tb-stats1').innerHTML =
            '<span><strong>m₂/m₁ = ' + ratio.toFixed(3) + '</strong></span>' +
            '<span>μ = ' + mu.toFixed(3) + ' m₁  |  μ/m_lighter = ' + (mu / Math.min(1, ratio)).toFixed(3) + '</span>' +
            '<span>e = ' + e.toFixed(2) + '  |  t = ' + t.toFixed(2) + '</span>';
    }

    function animTick() {
        if (!animState.running) return;
        var slider = document.getElementById('tb-time-slider');
        var t = parseFloat(slider.value) + 0.005;
        if (t > 1) t = 0;
        slider.value = t;
        document.getElementById('tb-time-value').textContent = t.toFixed(2);
        drawAnimator();
        animState.raf = setTimeout(animTick, 40);
    }

    window.tbAnimToggle = function() {
        var btn = document.getElementById('tb-play-btn');
        if (animState.running) {
            animState.running = false;
            if (animState.raf) { clearTimeout(animState.raf); animState.raf = null; }
            btn.textContent = '▶ Play';
        } else {
            animState.running = true;
            btn.textContent = '⏸ Pause';
            animTick();
        }
    };

    window.tbAnimReset = function() {
        animState.running = false;
        if (animState.raf) { clearTimeout(animState.raf); animState.raf = null; }
        document.getElementById('tb-play-btn').textContent = '▶ Play';
        document.getElementById('tb-ratio-slider').value = 0;
        document.getElementById('tb-ecc-slider').value = 0.40;
        document.getElementById('tb-time-slider').value = 0;
        document.getElementById('tb-ratio-value').textContent = '1.000';
        document.getElementById('tb-ecc-value').textContent = '0.40';
        document.getElementById('tb-time-value').textContent = '0.00';
        drawAnimator();
    };

    // ===============================================================
    // EXPLORER 2: Reduced Mass Calculator
    // ===============================================================
    // Canonical systems: [name, m1 (kg), m2 (kg)]
    var SYSTEMS = [
        { name: 'Sun-Earth',         m1: 1.989e30, m2: 5.972e24 },
        { name: 'Earth-Moon',        m1: 5.972e24, m2: 7.342e22 },
        { name: 'Pluto-Charon',      m1: 1.303e22, m2: 1.586e21 },
        { name: 'Equal binary',      m1: 1.989e30, m2: 1.989e30 },
        { name: 'Hydrogen atom',     m1: 1.673e-27, m2: 9.109e-31 }
    ];

    function reducedMass(m1, m2) {
        return m1 * m2 / (m1 + m2);
    }

    function drawReducedMass() {
        var idx = parseInt(document.getElementById('rm-system-select').value);
        var m1, m2, sysName;

        if (idx === 5) {
            // Custom
            m1 = Math.pow(10, parseFloat(document.getElementById('rm-m1-slider').value));
            m2 = Math.pow(10, parseFloat(document.getElementById('rm-m2-slider').value));
            sysName = 'Custom';
        } else {
            var sys = SYSTEMS[idx];
            m1 = sys.m1; m2 = sys.m2; sysName = sys.name;
        }
        var mu = reducedMass(m1, m2);

        // LEFT panel: bar chart of all systems (log scale) with current selection highlighted
        var names = SYSTEMS.map(function(s) { return s.name; });
        if (idx === 5) names = names.concat(['Custom']);
        var m1Vals = SYSTEMS.map(function(s) { return s.m1; });
        var m2Vals = SYSTEMS.map(function(s) { return s.m2; });
        var muVals = SYSTEMS.map(function(s) { return reducedMass(s.m1, s.m2); });
        if (idx === 5) {
            m1Vals.push(m1); m2Vals.push(m2); muVals.push(mu);
        }

        // Highlight current system with stronger opacity
        var m1Colors = names.map(function(_, i) { return i === idx ? '#00f3ff' : 'rgba(0,243,255,0.35)'; });
        var m2Colors = names.map(function(_, i) { return i === idx ? '#ff006e' : 'rgba(255,0,110,0.35)'; });
        var muColors = names.map(function(_, i) { return i === idx ? '#ffbe0b' : 'rgba(255,190,11,0.35)'; });

        Plotly.react('rm-barPlot', [
            { y: names, x: m1Vals, type: 'bar', orientation: 'h',
              marker: { color: m1Colors }, name: 'm₁' },
            { y: names, x: m2Vals, type: 'bar', orientation: 'h',
              marker: { color: m2Colors }, name: 'm₂' },
            { y: names, x: muVals, type: 'bar', orientation: 'h',
              marker: { color: muColors }, name: 'μ' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'mass (kg)', 'log'),
            yaxis: axStyle(null, ''),
            height: 440, barmode: 'group',
            margin: { t: 30, r: 20, b: 50, l: 130 },
            legend: { x: 0.7, y: 0.05, font: { color: '#aaa', size: 10 } },
            title: { text: 'Masses across systems (log scale)', font: { color: '#aaa', size: 12 } }
        }), { responsive: true });

        // RIGHT panel: μ/m₁ vs m₂/m₁ on log axes, with reference curve
        var ratios = [];
        for (var lr = -4; lr <= 2; lr += 0.05) ratios.push(Math.pow(10, lr));
        var muOverM1 = ratios.map(function(r) { return r / (1 + r); });
        // Limits
        var lightLimit = ratios;          // μ → m₂ when m₂ ≪ m₁
        var equalLimit = ratios.map(function() { return 0.5; });  // μ = m₁/2 when equal

        var curRatio = m2 / m1;
        var curMuOverM1 = mu / m1;

        Plotly.react('rm-ratioPlot', [
            { x: ratios, y: muOverM1, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2.5 }, name: 'μ/m₁ = m₂/(m₁+m₂)' },
            { x: ratios, y: lightLimit, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 1.5, dash: 'dash' }, name: 'm₂ ≪ m₁: μ → m₂' },
            { x: ratios, y: equalLimit, type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 1.5, dash: 'dash' }, name: 'm₂ = m₁: μ = m₁/2' },
            { x: [curRatio], y: [curMuOverM1], type: 'scatter', mode: 'markers',
              marker: { color: '#fff', size: 14, symbol: 'star' }, name: sysName }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'm₂/m₁', 'log'),
            yaxis: axStyle(null, 'μ/m₁', 'log'),
            height: 440,
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } },
            title: { text: 'μ/m₁ vs mass ratio', font: { color: '#aaa', size: 12 } }
        }), { responsive: true });

        // Stats bar
        var muOverLighter = mu / Math.min(m1, m2);
        var dCMfromM1 = m2 / (m1 + m2);  // fraction of separation

        document.getElementById('rm-stats').innerHTML =
            '<span><strong>' + sysName + '</strong></span>' +
            '<span>m₁ = ' + m1.toExponential(2) + ' kg, m₂ = ' + m2.toExponential(2) + ' kg</span>' +
            '<span>μ = ' + mu.toExponential(3) + ' kg  (μ/m_lighter = ' + muOverLighter.toFixed(6) + ')</span>' +
            '<span>CM is ' + (100 * dCMfromM1).toFixed(2) + '% of separation away from m₁</span>';
    }

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('tb-origPlot')) { setTimeout(initializePlots, 100); return; }

        // ---- Explorer 1 ----
        drawAnimator();
        document.getElementById('tb-ratio-slider').addEventListener('input', function() {
            document.getElementById('tb-ratio-value').textContent = Math.pow(10, parseFloat(this.value)).toFixed(3);
            drawAnimator();
        });
        document.getElementById('tb-ecc-slider').addEventListener('input', function() {
            document.getElementById('tb-ecc-value').textContent = parseFloat(this.value).toFixed(2);
            drawAnimator();
        });
        document.getElementById('tb-time-slider').addEventListener('input', function() {
            document.getElementById('tb-time-value').textContent = parseFloat(this.value).toFixed(2);
            drawAnimator();
        });

        // ---- Explorer 2 ----
        drawReducedMass();
        document.getElementById('rm-system-select').addEventListener('change', function() {
            var idx = parseInt(this.value);
            // If user picks a preset, auto-fill the custom sliders to match
            if (idx >= 0 && idx < SYSTEMS.length) {
                document.getElementById('rm-m1-slider').value = Math.log10(SYSTEMS[idx].m1).toFixed(2);
                document.getElementById('rm-m2-slider').value = Math.log10(SYSTEMS[idx].m2).toFixed(2);
                document.getElementById('rm-m1-value').textContent = Math.log10(SYSTEMS[idx].m1).toFixed(2);
                document.getElementById('rm-m2-value').textContent = Math.log10(SYSTEMS[idx].m2).toFixed(2);
            }
            drawReducedMass();
        });
        document.getElementById('rm-m1-slider').addEventListener('input', function() {
            document.getElementById('rm-m1-value').textContent = parseFloat(this.value).toFixed(2);
            // Auto-switch to custom if user moves slider
            document.getElementById('rm-system-select').value = '5';
            drawReducedMass();
        });
        document.getElementById('rm-m2-slider').addEventListener('input', function() {
            document.getElementById('rm-m2-value').textContent = parseFloat(this.value).toFixed(2);
            document.getElementById('rm-system-select').value = '5';
            drawReducedMass();
        });
    }

    initializePlots();
})();
