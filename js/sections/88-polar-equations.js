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
    // EXPLORER 1: Polar Decomposition Visualizer
    // ===============================================================
    // Trajectories parameterized by t in [0, 1] (= one full traversal)
    function trajectory(name, t, p) {
        // p is the "shape parameter" in [0.1, 0.9]
        var x, y, vx, vy;
        if (name === 'circle') {
            // Uniform circle, radius p+0.5 ⇒ [0.6, 1.4]
            var R = p + 0.5;
            var w = 2 * Math.PI;
            x = R * Math.cos(w*t);   y = R * Math.sin(w*t);
            vx = -R*w * Math.sin(w*t); vy = R*w * Math.cos(w*t);
        } else if (name === 'ellipse') {
            // Ellipse with eccentricity related to p (Kepler-style time → mean anomaly)
            var e = p * 0.85;          // eccentricity 0.085 .. 0.765
            var a = 1.0;               // semi-major axis
            var M = 2 * Math.PI * t;   // mean anomaly
            // Newton solve E - e sin E = M
            var E = M;
            for (var i = 0; i < 8; i++) {
                E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
            }
            x = a * (Math.cos(E) - e);
            y = a * Math.sqrt(1 - e*e) * Math.sin(E);
            // Time derivative via dM/dt = 2π, dE/dt = (2π) / (1 - e cos E)
            var dEdt = 2 * Math.PI / (1 - e * Math.cos(E));
            vx = -a * Math.sin(E) * dEdt;
            vy =  a * Math.sqrt(1 - e*e) * Math.cos(E) * dEdt;
        } else if (name === 'line') {
            // Straight line through origin at angle p*π
            var theta = p * Math.PI;
            // Move along the line, position = (3*(2t-1)) * (cos θ, sin θ)
            var s = 3 * (2*t - 1);
            x = s * Math.cos(theta); y = s * Math.sin(theta);
            vx = 6 * Math.cos(theta); vy = 6 * Math.sin(theta);   // d s / dt = 6
        } else {  // spiral
            // Outward Archimedean spiral: ρ = 0.3 + p*2*t, φ = 4π t
            var rho = 0.3 + p * 2 * t;
            var phi = 4 * Math.PI * t;
            x = rho * Math.cos(phi);
            y = rho * Math.sin(phi);
            // dρ/dt = 2p, dφ/dt = 4π
            var rdot = 2*p, pdot = 4*Math.PI;
            vx = rdot * Math.cos(phi) - rho * pdot * Math.sin(phi);
            vy = rdot * Math.sin(phi) + rho * pdot * Math.cos(phi);
        }
        return { x: x, y: y, vx: vx, vy: vy };
    }

    function buildFullPath(name, p, n) {
        var xs = [], ys = [];
        for (var k = 0; k <= n; k++) {
            var s = trajectory(name, k/n, p);
            xs.push(s.x); ys.push(s.y);
        }
        return { x: xs, y: ys };
    }

    function drawPolarDecomp() {
        var name = document.getElementById('pe-traj-select').value;
        var p = parseFloat(document.getElementById('pe-param-slider').value);
        var t = parseFloat(document.getElementById('pe-time-slider').value);

        var path = buildFullPath(name, p, 200);
        var s = trajectory(name, t, p);

        var rho = Math.sqrt(s.x*s.x + s.y*s.y);
        var phi = Math.atan2(s.y, s.x);
        var rdot, pdot;
        if (rho < 1e-6) { rdot = 0; pdot = 0; }
        else {
            rdot = (s.x*s.vx + s.y*s.vy) / rho;
            pdot = (s.x*s.vy - s.y*s.vx) / (rho*rho);
        }

        // Velocity scaling for visual clarity
        var vmag = Math.sqrt(s.vx*s.vx + s.vy*s.vy);
        var vScale = vmag > 0 ? Math.min(1.5, 1.0) / vmag : 0;
        // For radial/tangential components
        var rhat = rho > 1e-6 ? [s.x/rho, s.y/rho] : [1, 0];
        var phat = [-rhat[1], rhat[0]];

        var R = 3.0;

        // LEFT: Cartesian decomposition
        Plotly.react('pe-cartPlot', [
            { x: path.x, y: path.y, type: 'scatter', mode: 'lines',
              line: { color: '#444', width: 1 }, name: 'path', hoverinfo: 'skip', showlegend: false },
            { x: [s.x], y: [s.y], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 12 }, name: 'particle', hoverinfo: 'name' },
            // v vector (cyan, full)
            { x: [s.x, s.x + vScale * s.vx], y: [s.y, s.y + vScale * s.vy],
              type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 3 }, name: 'v⃗', hoverinfo: 'name' },
            // vx component (dashed magenta)
            { x: [s.x, s.x + vScale * s.vx], y: [s.y, s.y],
              type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2, dash: 'dot' }, name: 'v_x', hoverinfo: 'name' },
            { x: [s.x + vScale * s.vx, s.x + vScale * s.vx], y: [s.y, s.y + vScale * s.vy],
              type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2, dash: 'dot' }, name: 'v_y', hoverinfo: 'name', showlegend: false }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-R, R], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-R, R], 'y'),
            height: 360,
            title: { text: 'Cartesian: v⃗ = v_x x̂ + v_y ŷ', font: { color: '#aaa', size: 11 } },
            legend: { x: 0.02, y: 0.02, font: { color: '#aaa', size: 9 } },
            margin: { t: 40, r: 10, b: 40, l: 50 }
        }), { responsive: true });

        // MIDDLE: Polar decomposition
        var radComp = [vScale * rdot * rhat[0], vScale * rdot * rhat[1]];
        var tanComp = [vScale * rho * pdot * phat[0], vScale * rho * pdot * phat[1]];

        Plotly.react('pe-polarPlot', [
            { x: path.x, y: path.y, type: 'scatter', mode: 'lines',
              line: { color: '#444', width: 1 }, hoverinfo: 'skip', showlegend: false },
            { x: [s.x], y: [s.y], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 12 }, name: 'particle', hoverinfo: 'name' },
            // ρ vector from origin to particle
            { x: [0, s.x], y: [0, s.y], type: 'scatter', mode: 'lines',
              line: { color: '#888', width: 1, dash: 'dot' }, name: 'ρ', hoverinfo: 'name' },
            // v vector
            { x: [s.x, s.x + vScale * s.vx], y: [s.y, s.y + vScale * s.vy],
              type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 3 }, name: 'v⃗', hoverinfo: 'name' },
            // radial component (along ρ̂)
            { x: [s.x, s.x + radComp[0]], y: [s.y, s.y + radComp[1]],
              type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2, dash: 'dot' }, name: 'ρ̇ ρ̂', hoverinfo: 'name' },
            // tangential component (along φ̂)
            { x: [s.x + radComp[0], s.x + radComp[0] + tanComp[0]],
              y: [s.y + radComp[1], s.y + radComp[1] + tanComp[1]],
              type: 'scatter', mode: 'lines',
              line: { color: '#00ff88', width: 2, dash: 'dot' }, name: 'ρφ̇ φ̂', hoverinfo: 'name' }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-R, R], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-R, R], 'y'),
            height: 360,
            title: { text: 'Polar: v⃗ = ρ̇ ρ̂ + ρφ̇ φ̂', font: { color: '#aaa', size: 11 } },
            legend: { x: 0.02, y: 0.02, font: { color: '#aaa', size: 9 } },
            margin: { t: 40, r: 10, b: 40, l: 50 }
        }), { responsive: true });

        // RIGHT: time series ρ(t) and φ(t) (with current t marked)
        var ts = [], rhos = [], phis = [];
        for (var k = 0; k <= 100; k++) {
            var ti = k/100;
            var si = trajectory(name, ti, p);
            ts.push(ti);
            rhos.push(Math.sqrt(si.x*si.x + si.y*si.y));
            phis.push(Math.atan2(si.y, si.x));
        }

        Plotly.react('pe-timePlot', [
            { x: ts, y: rhos, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2 }, name: 'ρ(t)' },
            { x: ts, y: phis, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2 }, name: 'φ(t) [rad]', yaxis: 'y2' },
            { x: [t, t], y: [-4, 4], type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 1.5, dash: 'dash' },
              showlegend: false, hoverinfo: 'skip' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 1], 't / period'),
            yaxis: axStyle(null, 'ρ'),
            yaxis2: { overlaying: 'y', side: 'right', gridcolor: '#2a2f4a',
                      zerolinecolor: '#808080', linecolor: '#808080', title: 'φ' },
            height: 360,
            title: { text: 'Time series', font: { color: '#aaa', size: 11 } },
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 9 } },
            margin: { t: 40, r: 50, b: 40, l: 50 }
        }), { responsive: true });

        document.getElementById('pe-stats1').innerHTML =
            '<span><strong>' + name + '</strong></span>' +
            '<span>ρ = ' + rho.toFixed(3) + ', φ = ' + (phi*180/Math.PI).toFixed(1) + '°</span>' +
            '<span>ρ̇ = ' + rdot.toFixed(3) + ', ρφ̇ = ' + (rho*pdot).toFixed(3) + '</span>' +
            '<span>|v| = ' + vmag.toFixed(3) + '  (Cartesian = √(ρ̇²+ρ²φ̇²) = ' +
                Math.sqrt(rdot*rdot + rho*rho*pdot*pdot).toFixed(3) + ')</span>';
    }

    var peAnim = { running: false, raf: null };
    function pePlayTick() {
        if (!peAnim.running) return;
        var sl = document.getElementById('pe-time-slider');
        var t = parseFloat(sl.value) + 0.005;
        if (t > 1) t = 0;
        sl.value = t;
        document.getElementById('pe-time-value').textContent = t.toFixed(2);
        drawPolarDecomp();
        peAnim.raf = setTimeout(pePlayTick, 40);
    }
    window.pePlayToggle = function() {
        var btn = document.getElementById('pe-play-btn');
        if (peAnim.running) {
            peAnim.running = false;
            if (peAnim.raf) { clearTimeout(peAnim.raf); peAnim.raf = null; }
            btn.textContent = '▶ Play';
        } else {
            peAnim.running = true;
            btn.textContent = '⏸ Pause';
            pePlayTick();
        }
    };
    window.pePolarReset = function() {
        peAnim.running = false;
        if (peAnim.raf) { clearTimeout(peAnim.raf); peAnim.raf = null; }
        document.getElementById('pe-play-btn').textContent = '▶ Play';
        document.getElementById('pe-traj-select').value = 'circle';
        document.getElementById('pe-param-slider').value = 0.5;
        document.getElementById('pe-time-slider').value = 0.30;
        document.getElementById('pe-param-value').textContent = '0.50';
        document.getElementById('pe-time-value').textContent = '0.30';
        drawPolarDecomp();
    };

    // ===============================================================
    // EXPLORER 2: Centrifugal Barrier
    // ===============================================================
    function potentialAndForce(name, k, yuk, rho) {
        var U, Fmag;  // Fmag = -dU/dρ (radial force, positive = outward)
        if (name === 'kepler') {
            U    = -k / rho;
            Fmag = -k / (rho * rho);   // -dU/dρ = -k/ρ², attractive ⇒ negative = inward
        } else if (name === 'harmonic') {
            U    =  0.5 * k * rho * rho;
            Fmag = -k * rho;
        } else if (name === 'yukawa') {
            U    = -k * Math.exp(-rho / yuk) / rho;
            // -dU/dρ = -k e^(-ρ/μ) (1/ρ² + 1/(μρ))
            Fmag = -k * Math.exp(-rho/yuk) * (1/(rho*rho) + 1/(yuk*rho));
        }
        return { U: U, F: Fmag };
    }

    function drawCentrifugal() {
        var name = document.getElementById('pe-pot-select').value;
        var ell  = parseFloat(document.getElementById('pe-ell-slider').value);
        var k    = parseFloat(document.getElementById('pe-k-slider').value);
        var yuk  = parseFloat(document.getElementById('pe-yuk-slider').value);
        var mu = 1.0;

        // Show/hide Yukawa-range slider based on selection
        var yukRow = document.getElementById('pe-yuk-slider').parentElement;
        yukRow.style.display = (name === 'yukawa') ? '' : 'none';

        var rhos = [], Ubare = [], Ucent = [], Ueff = [];
        var Fbare = [], Fcent = [], Fnet = [];
        var rhoMin = 0.1, rhoMax = 8;
        for (var i = 0; i <= 400; i++) {
            var r = rhoMin + i * (rhoMax - rhoMin) / 400;
            rhos.push(r);
            var pf = potentialAndForce(name, k, yuk, r);
            var Uc = ell * ell / (2 * mu * r * r);
            var Fc = ell * ell / (mu * r * r * r);
            Ubare.push(pf.U);
            Ucent.push(Uc);
            Ueff.push(pf.U + Uc);
            Fbare.push(pf.F);
            Fcent.push(Fc);
            Fnet.push(pf.F + Fc);
        }

        // Y axis ranges (clip the singular values)
        var yMinPot = -3, yMaxPot = 3;
        var yMinFor = -5, yMaxFor = 5;
        if (name === 'harmonic') { yMaxPot = 6; yMinFor = -8; yMaxFor = 8; }

        Plotly.react('pe-potPlot', [
            { x: rhos, y: Ubare, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2 }, name: 'U(ρ)' },
            { x: rhos, y: Ucent, type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 2, dash: 'dot' }, name: 'ℓ²/(2μρ²)' },
            { x: rhos, y: Ueff, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2.5 }, name: 'U + ℓ²/(2μρ²)' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, rhoMax], 'ρ'),
            yaxis: axStyle([yMinPot, yMaxPot], 'energy'),
            height: 400,
            title: { text: 'Potential view', font: { color: '#aaa', size: 12 } },
            legend: { x: 0.55, y: 0.02, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        Plotly.react('pe-forcePlot', [
            { x: rhos, y: Fbare, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2 }, name: '−dU/dρ' },
            { x: rhos, y: Fcent, type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 2, dash: 'dot' }, name: '+ℓ²/(μρ³)' },
            { x: rhos, y: Fnet, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 2.5 }, name: 'net radial force' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, rhoMax], 'ρ'),
            yaxis: axStyle([yMinFor, yMaxFor], 'force'),
            height: 400,
            title: { text: 'Force view', font: { color: '#aaa', size: 12 } },
            legend: { x: 0.55, y: 0.02, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // Find U_eff minimum numerically (= circular orbit radius for Kepler / harmonic)
        var rCirc = '—', UeffMin = '—';
        var minIdx = -1, minVal = Infinity;
        for (var j = 1; j < Ueff.length - 1; j++) {
            // local minimum check
            if (Ueff[j] < Ueff[j-1] && Ueff[j] < Ueff[j+1] && Ueff[j] < minVal) {
                minVal = Ueff[j]; minIdx = j;
            }
        }
        if (minIdx > 0) {
            rCirc = rhos[minIdx].toFixed(3);
            UeffMin = Ueff[minIdx].toFixed(3);
        }

        var details = '';
        if (name === 'kepler') {
            var rTheory = (ell * ell / (mu * k));
            details = '  |  Theory ρ_circ = ℓ²/(μk) = ' + rTheory.toFixed(3);
        }

        document.getElementById('pe-stats2').innerHTML =
            '<span><strong>' + name + ', k = ' + k.toFixed(2) + ', ℓ = ' + ell.toFixed(2) + '</strong></span>' +
            '<span>U_eff minimum at ρ ≈ ' + rCirc + (UeffMin !== '—' ? ', U_eff = ' + UeffMin : '') + details + '</span>';
    }

    window.peCentReset = function() {
        document.getElementById('pe-pot-select').value = 'kepler';
        document.getElementById('pe-ell-slider').value = 1.0;
        document.getElementById('pe-k-slider').value = 1.0;
        document.getElementById('pe-yuk-slider').value = 2.0;
        document.getElementById('pe-ell-value').textContent = '1.00';
        document.getElementById('pe-k-value').textContent = '1.00';
        document.getElementById('pe-yuk-value').textContent = '2.00';
        drawCentrifugal();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('pe-cartPlot')) { setTimeout(initializePlots, 100); return; }

        // Explorer 1
        document.getElementById('pe-traj-select').addEventListener('change', drawPolarDecomp);
        document.getElementById('pe-param-slider').addEventListener('input', function() {
            document.getElementById('pe-param-value').textContent = parseFloat(this.value).toFixed(2);
            drawPolarDecomp();
        });
        document.getElementById('pe-time-slider').addEventListener('input', function() {
            document.getElementById('pe-time-value').textContent = parseFloat(this.value).toFixed(2);
            drawPolarDecomp();
        });
        drawPolarDecomp();

        // Explorer 2
        document.getElementById('pe-pot-select').addEventListener('change', drawCentrifugal);
        document.getElementById('pe-ell-slider').addEventListener('input', function() {
            document.getElementById('pe-ell-value').textContent = parseFloat(this.value).toFixed(2);
            drawCentrifugal();
        });
        document.getElementById('pe-k-slider').addEventListener('input', function() {
            document.getElementById('pe-k-value').textContent = parseFloat(this.value).toFixed(2);
            drawCentrifugal();
        });
        document.getElementById('pe-yuk-slider').addEventListener('input', function() {
            document.getElementById('pe-yuk-value').textContent = parseFloat(this.value).toFixed(2);
            drawCentrifugal();
        });
        drawCentrifugal();
    }

    initializePlots();
})();
