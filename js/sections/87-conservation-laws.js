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

    // ---------- shared math ----------
    function cross3(a, b) {
        return [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
    }
    function norm3(v) { return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]); }
    function dot3(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
    function scale3(a, c) { return [a[0]*c, a[1]*c, a[2]*c]; }
    function add3(a, b) { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }

    // ===============================================================
    // EXPLORER 1: 3D Planar Motion under Kepler force
    // ===============================================================
    // RK4 on state [x,y,z,vx,vy,vz] under U = -1/r force.
    function kepler3DForce(r) {
        var rmag = Math.sqrt(r[0]*r[0] + r[1]*r[1] + r[2]*r[2]);
        var r3 = rmag * rmag * rmag;
        return [-r[0]/r3, -r[1]/r3, -r[2]/r3];
    }

    function rhs3D(s) {
        var f = kepler3DForce([s[0], s[1], s[2]]);
        return [s[3], s[4], s[5], f[0], f[1], f[2]];
    }

    function rk4Step(s, h, rhs) {
        var k1 = rhs(s);
        var k2 = rhs(s.map(function(v, i) { return v + 0.5*h*k1[i]; }));
        var k3 = rhs(s.map(function(v, i) { return v + 0.5*h*k2[i]; }));
        var k4 = rhs(s.map(function(v, i) { return v + h*k3[i]; }));
        return s.map(function(v, i) { return v + (h/6)*(k1[i] + 2*k2[i] + 2*k3[i] + k4[i]); });
    }

    function integrate3DKepler(s0, h, N) {
        var traj = new Array(N);
        var s = s0.slice();
        for (var k = 0; k < N; k++) {
            traj[k] = s.slice();
            s = rk4Step(s, h, rhs3D);
            // Bail out if particle escapes too far
            if (Math.abs(s[0]) > 5 || Math.abs(s[1]) > 5 || Math.abs(s[2]) > 5) {
                traj.length = k + 1;
                break;
            }
        }
        return traj;
    }

    function draw3D() {
        var rx = parseFloat(document.getElementById('cl-rx-slider').value);
        var ry = parseFloat(document.getElementById('cl-ry-slider').value);
        var rz = parseFloat(document.getElementById('cl-rz-slider').value);
        var vx = parseFloat(document.getElementById('cl-vx-slider').value);
        var vy = parseFloat(document.getElementById('cl-vy-slider').value);
        var vz = parseFloat(document.getElementById('cl-vz-slider').value);

        var s0 = [rx, ry, rz, vx, vy, vz];

        // Compute initial angular momentum L = r × v
        var L0 = cross3([rx, ry, rz], [vx, vy, vz]);
        var L0mag = norm3(L0);

        var traj = integrate3DKepler(s0, 0.01, 4000);

        var xs = traj.map(function(p) { return p[0]; });
        var ys = traj.map(function(p) { return p[1]; });
        var zs = traj.map(function(p) { return p[2]; });

        // Final L for drift check
        var sf = traj[traj.length - 1];
        var Lf = cross3([sf[0], sf[1], sf[2]], [sf[3], sf[4], sf[5]]);
        var Lfmag = norm3(Lf);
        var Ldrift = L0mag > 0 ? Math.abs(Lfmag - L0mag) / L0mag : 0;

        var traces = [
            { x: xs, y: ys, z: zs, type: 'scatter3d', mode: 'lines',
              line: { color: '#00f3ff', width: 3 }, name: 'orbit', hoverinfo: 'skip' },
            // Force center
            { x: [0], y: [0], z: [0], type: 'scatter3d', mode: 'markers',
              marker: { color: '#ffbe0b', size: 6, symbol: 'diamond' }, name: 'force center', hoverinfo: 'name' },
            // Initial position
            { x: [rx], y: [ry], z: [rz], type: 'scatter3d', mode: 'markers',
              marker: { color: '#ff006e', size: 6 }, name: 'r₀', hoverinfo: 'name' }
        ];

        // L vector
        if (document.getElementById('cl-show-L').checked && L0mag > 0.01) {
            var Lscale = 1.5 / L0mag;  // visual scale only
            traces.push({
                x: [0, L0[0]*Lscale], y: [0, L0[1]*Lscale], z: [0, L0[2]*Lscale],
                type: 'scatter3d', mode: 'lines+markers',
                line: { color: '#ffbe0b', width: 6 },
                marker: { color: '#ffbe0b', size: [3, 7] },
                name: 'L⃗', hoverinfo: 'name'
            });
        }

        // Orbital plane: spanned by r₀ and v₀ (assuming non-parallel).
        if (document.getElementById('cl-show-plane').checked && L0mag > 0.01) {
            // Build orthonormal basis (e1, e2) in the plane perpendicular to L
            var Lhat = scale3(L0, 1 / L0mag);
            // pick e1 = r0 / |r0| projected onto plane
            var rmag = Math.sqrt(rx*rx + ry*ry + rz*rz);
            if (rmag > 1e-6) {
                var e1raw = [rx, ry, rz];
                // Project out L component
                var rDotL = dot3(e1raw, Lhat);
                var e1 = [e1raw[0] - rDotL*Lhat[0], e1raw[1] - rDotL*Lhat[1], e1raw[2] - rDotL*Lhat[2]];
                var e1mag = norm3(e1);
                if (e1mag > 1e-6) {
                    e1 = scale3(e1, 1/e1mag);
                    var e2 = cross3(Lhat, e1);
                    // Build a 2x2 mesh disk in the plane
                    var diskR = 2.0;
                    var px = [], py = [], pz = [];
                    for (var i = 0; i <= 30; i++) {
                        var th = i * 2 * Math.PI / 30;
                        var rr = diskR;
                        px.push(rr * (Math.cos(th)*e1[0] + Math.sin(th)*e2[0]));
                        py.push(rr * (Math.cos(th)*e1[1] + Math.sin(th)*e2[1]));
                        pz.push(rr * (Math.cos(th)*e1[2] + Math.sin(th)*e2[2]));
                    }
                    traces.push({
                        x: px, y: py, z: pz, type: 'scatter3d', mode: 'lines',
                        line: { color: '#00ff88', width: 3, dash: 'dash' },
                        name: 'orbital plane', hoverinfo: 'skip'
                    });
                }
            }
        }

        Plotly.react('cl-3dPlot', traces, Object.assign({}, darkLayout, {
            height: 500,
            scene: {
                xaxis: Object.assign(axStyle([-2.5, 2.5], 'x'), { backgroundcolor: 'rgba(0,0,0,0)' }),
                yaxis: Object.assign(axStyle([-2.5, 2.5], 'y'), { backgroundcolor: 'rgba(0,0,0,0)' }),
                zaxis: Object.assign(axStyle([-2.5, 2.5], 'z'), { backgroundcolor: 'rgba(0,0,0,0)' }),
                aspectmode: 'cube'
            },
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        var Lthx = (180/Math.PI) * Math.acos(Math.abs(L0[2]) / Math.max(L0mag, 1e-12));
        document.getElementById('cl-stats1').innerHTML =
            '<span><strong>|L⃗| = ' + L0mag.toFixed(3) + '</strong></span>' +
            '<span>L⃗ = (' + L0[0].toFixed(2) + ', ' + L0[1].toFixed(2) + ', ' + L0[2].toFixed(2) + ')</span>' +
            '<span>angle to z-axis: ' + Lthx.toFixed(1) + '°</span>' +
            '<span>numerical drift |Δ|L||/|L| = ' + Ldrift.toExponential(2) + '</span>';
    }

    window.cl3dReset = function() {
        document.getElementById('cl-rx-slider').value = 1;
        document.getElementById('cl-ry-slider').value = 0;
        document.getElementById('cl-rz-slider').value = 0.3;
        document.getElementById('cl-vx-slider').value = 0;
        document.getElementById('cl-vy-slider').value = 0.8;
        document.getElementById('cl-vz-slider').value = 0.2;
        document.getElementById('cl-rx-value').textContent = '1.00';
        document.getElementById('cl-ry-value').textContent = '0.00';
        document.getElementById('cl-rz-value').textContent = '0.30';
        document.getElementById('cl-vx-value').textContent = '0.00';
        document.getElementById('cl-vy-value').textContent = '0.80';
        document.getElementById('cl-vz-value').textContent = '0.20';
        document.getElementById('cl-show-L').checked = true;
        document.getElementById('cl-show-plane').checked = true;
        draw3D();
    };

    // ===============================================================
    // EXPLORER 2: Conservation Tracker (planar, Euler vs RK4)
    // ===============================================================
    function force2D(potential, r) {
        // r = [x, y]; returns [Fx, Fy]
        var rmag = Math.sqrt(r[0]*r[0] + r[1]*r[1]);
        if (rmag < 1e-6) return [0, 0];
        var fmag;
        if (potential === 'kepler') {
            // U = -1/r, F = -1/r² r̂
            fmag = -1 / (rmag * rmag);
        } else if (potential === 'harmonic') {
            // U = ½ r², F = -r̂ * r
            fmag = -rmag;
        } else if (potential === 'coulomb') {
            // U = +1/r, F = +1/r² r̂
            fmag = 1 / (rmag * rmag);
        }
        return [fmag * r[0]/rmag, fmag * r[1]/rmag];
    }

    function eulerStep2D(s, h, potential) {
        var f = force2D(potential, [s[0], s[1]]);
        return [s[0] + h*s[2], s[1] + h*s[3], s[2] + h*f[0], s[3] + h*f[1]];
    }

    function rhs2D(s, potential) {
        var f = force2D(potential, [s[0], s[1]]);
        return [s[2], s[3], f[0], f[1]];
    }

    function rk4Step2D(s, h, potential) {
        var k1 = rhs2D(s, potential);
        var k2 = rhs2D(s.map(function(v, i) { return v + 0.5*h*k1[i]; }), potential);
        var k3 = rhs2D(s.map(function(v, i) { return v + 0.5*h*k2[i]; }), potential);
        var k4 = rhs2D(s.map(function(v, i) { return v + h*k3[i]; }), potential);
        return s.map(function(v, i) { return v + (h/6)*(k1[i] + 2*k2[i] + 2*k3[i] + k4[i]); });
    }

    function energy2D(s, potential) {
        var KE = 0.5 * (s[2]*s[2] + s[3]*s[3]);
        var rmag = Math.sqrt(s[0]*s[0] + s[1]*s[1]);
        var U;
        if (potential === 'kepler')   U = -1/rmag;
        if (potential === 'harmonic') U = 0.5 * rmag * rmag;
        if (potential === 'coulomb')  U = +1/rmag;
        return KE + U;
    }

    function angmom2D(s) { return s[0]*s[3] - s[1]*s[2]; }

    function integrate2D(stepper, s0, h, N, potential) {
        var traj = new Array(N);
        var s = s0.slice();
        for (var k = 0; k < N; k++) {
            traj[k] = s.slice();
            s = stepper(s, h, potential);
            if (s[0]*s[0] + s[1]*s[1] > 200) {  // diverged
                traj.length = k + 1;
                break;
            }
        }
        return traj;
    }

    function clTrackerCompute() {
        var pot = document.getElementById('cl-pot-select').value;
        var h = Math.pow(10, parseFloat(document.getElementById('cl-h-slider').value));
        var tmax = parseFloat(document.getElementById('cl-tmax-slider').value);
        var N = Math.max(50, Math.min(20000, Math.round(tmax / h)));

        // Initial state — choose to give a reasonably elongated bound orbit
        var s0;
        if (pot === 'kepler') {
            s0 = [1.0, 0.0, 0.0, 0.9];     // E < 0, bound elliptical
        } else if (pot === 'harmonic') {
            s0 = [1.0, 0.0, 0.0, 0.6];     // bound ellipse
        } else {  // coulomb (repulsive — always unbound)
            s0 = [3.0, -2.0, 0.0, 0.5];   // hyperbolic-style fly-by
        }

        var euTraj = integrate2D(eulerStep2D, s0, h, N, pot);
        var rkTraj = integrate2D(rk4Step2D, s0, h, N, pot);

        // Compute E(t), L(t) for both
        var euE = euTraj.map(function(s) { return energy2D(s, pot); });
        var rkE = rkTraj.map(function(s) { return energy2D(s, pot); });
        var euL = euTraj.map(function(s) { return angmom2D(s); });
        var rkL = rkTraj.map(function(s) { return angmom2D(s); });

        var euT = euTraj.map(function(_, i) { return i*h; });
        var rkT = rkTraj.map(function(_, i) { return i*h; });

        // Orbits panel
        var R = pot === 'coulomb' ? 5 : 3;
        Plotly.react('cl-orbitPlot', [
            { x: euTraj.map(function(s) { return s[0]; }),
              y: euTraj.map(function(s) { return s[1]; }),
              type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 1.5 }, name: 'Euler' },
            { x: rkTraj.map(function(s) { return s[0]; }),
              y: rkTraj.map(function(s) { return s[1]; }),
              type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 1.5 }, name: 'RK4' },
            { x: [0], y: [0], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 10, symbol: 'star' }, name: 'origin' }
        ], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-R, R], 'x'), { scaleanchor: 'y' }),
            yaxis: axStyle([-R, R], 'y'),
            height: 400,
            title: { text: 'Orbit (' + pot + ', h = ' + h.toExponential(1) + ')', font: { color: '#aaa', size: 12 } },
            legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        // Energy plot
        var euE0 = euE[0], rkE0 = rkE[0];
        var euDE = euE.map(function(e) { return Math.abs((e - euE0) / euE0); });
        var rkDE = rkE.map(function(e) { return Math.abs((e - rkE0) / rkE0); });

        Plotly.react('cl-EnergyPlot', [
            { x: euT, y: euDE, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 1.5 }, name: 'Euler', showlegend: false },
            { x: rkT, y: rkDE, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 1.5 }, name: 'RK4', showlegend: false }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 't'),
            yaxis: axStyle(null, '|ΔE/E|', 'log'),
            height: 200,
            margin: { t: 20, r: 20, b: 35, l: 60 },
            title: { text: 'Energy drift (log scale)', font: { color: '#aaa', size: 11 } }
        }), { responsive: true });

        // Angular momentum plot
        var euL0 = euL[0], rkL0 = rkL[0];
        var euDL = euL.map(function(L) { return Math.abs((L - euL0) / euL0); });
        var rkDL = rkL.map(function(L) { return Math.abs((L - rkL0) / rkL0); });

        Plotly.react('cl-LPlot', [
            { x: euT, y: euDL, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 1.5 }, name: 'Euler', showlegend: false },
            { x: rkT, y: rkDL, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 1.5 }, name: 'RK4', showlegend: false }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 't'),
            yaxis: axStyle(null, '|Δℓ/ℓ|', 'log'),
            height: 200,
            margin: { t: 20, r: 20, b: 35, l: 60 },
            title: { text: 'Angular momentum drift (log scale)', font: { color: '#aaa', size: 11 } }
        }), { responsive: true });

        var euDEmax = Math.max.apply(null, euDE);
        var rkDEmax = Math.max.apply(null, rkDE);
        var euDLmax = Math.max.apply(null, euDL);
        var rkDLmax = Math.max.apply(null, rkDL);

        document.getElementById('cl-stats2').innerHTML =
            '<span><strong>' + pot + ', h = ' + h.toExponential(1) + ', T = ' + tmax.toFixed(0) + '</strong></span>' +
            '<span>Euler: max |ΔE/E| = ' + euDEmax.toExponential(2) + ', max |Δℓ/ℓ| = ' + euDLmax.toExponential(2) + '</span>' +
            '<span>RK4: max |ΔE/E| = ' + rkDEmax.toExponential(2) + ', max |Δℓ/ℓ| = ' + rkDLmax.toExponential(2) + '</span>';
    }

    function clTrackerEmpty() {
        var base = Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''), yaxis: axStyle(null, ''),
            annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run"',
                font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
        });
        Plotly.react('cl-orbitPlot', [], Object.assign({}, base, { height: 400 }), { responsive: true });
        Plotly.react('cl-EnergyPlot', [], Object.assign({}, base, { height: 200 }), { responsive: true });
        Plotly.react('cl-LPlot', [], Object.assign({}, base, { height: 200 }), { responsive: true });
        document.getElementById('cl-stats2').innerHTML = '';
    }

    window.clTrackerRun = function() { clTrackerCompute(); };

    window.clTrackerReset = function() {
        document.getElementById('cl-pot-select').value = 'kepler';
        document.getElementById('cl-h-slider').value = -2;
        document.getElementById('cl-tmax-slider').value = 30;
        document.getElementById('cl-h-value').textContent = '−2.00';
        document.getElementById('cl-tmax-value').textContent = '30';
        clTrackerEmpty();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('cl-3dPlot')) { setTimeout(initializePlots, 100); return; }

        // ---- Explorer 1 (3D) ----
        var sliderIds = ['cl-rx-slider', 'cl-ry-slider', 'cl-rz-slider',
                         'cl-vx-slider', 'cl-vy-slider', 'cl-vz-slider'];
        var valueIds  = ['cl-rx-value',  'cl-ry-value',  'cl-rz-value',
                         'cl-vx-value',  'cl-vy-value',  'cl-vz-value'];
        for (var i = 0; i < 6; i++) {
            (function(idx) {
                document.getElementById(sliderIds[idx]).addEventListener('input', function() {
                    document.getElementById(valueIds[idx]).textContent = parseFloat(this.value).toFixed(2);
                    draw3D();
                });
            })(i);
        }
        document.getElementById('cl-show-L').addEventListener('change', draw3D);
        document.getElementById('cl-show-plane').addEventListener('change', draw3D);
        draw3D();

        // ---- Explorer 2 (Conservation Tracker) ----
        clTrackerEmpty();
        document.getElementById('cl-h-slider').addEventListener('input', function() {
            var v = parseFloat(this.value);
            document.getElementById('cl-h-value').textContent = (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
        });
        document.getElementById('cl-tmax-slider').addEventListener('input', function() {
            document.getElementById('cl-tmax-value').textContent = this.value;
        });
    }

    initializePlots();
})();
