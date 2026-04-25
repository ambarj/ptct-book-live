(function() {
    'use strict';

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

    // ===== Dynamical Systems Library =====
    var systems = {
        center: {
            name: 'Center (SHO)',
            f: function(x, y) { return [y, -x]; },
            desc: 'Closed orbits — periodic motion'
        },
        saddle: {
            name: 'Saddle Point',
            f: function(x, y) { return [x, -y]; },
            desc: 'Attracted along y, repelled along x'
        },
        stableSpiral: {
            name: 'Stable Spiral',
            f: function(x, y) { return [-0.2 * x + y, -x - 0.2 * y]; },
            desc: 'Spirals inward — damped oscillation'
        },
        unstableSpiral: {
            name: 'Unstable Spiral',
            f: function(x, y) { return [0.2 * x + y, -x + 0.2 * y]; },
            desc: 'Spirals outward — growing oscillation'
        },
        source: {
            name: 'Unstable Source',
            f: function(x, y) { return [x, y]; },
            desc: 'All trajectories flee the origin'
        },
        sink: {
            name: 'Stable Sink',
            f: function(x, y) { return [-x, -y]; },
            desc: 'All trajectories approach the origin'
        }
    };

    // RK4 full-trajectory solver
    function rk4Solve(sysKey, x0, y0, Tmax, N) {
        var sys = systems[sysKey];
        var h = Tmax / N;
        var t = [0], X = [x0], Y = [y0];
        var x = x0, y = y0;
        for (var i = 0; i < N; i++) {
            var k1 = sys.f(x, y);
            var x2 = x + h / 2 * k1[0], y2 = y + h / 2 * k1[1];
            var k2 = sys.f(x2, y2);
            var x3 = x + h / 2 * k2[0], y3 = y + h / 2 * k2[1];
            var k3 = sys.f(x3, y3);
            var x4 = x + h * k3[0], y4 = y + h * k3[1];
            var k4 = sys.f(x4, y4);
            x = x + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
            y = y + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
            t.push((i + 1) * h);
            X.push(x);
            Y.push(y);
            // Stop if escaped the view
            if (Math.abs(x) > 8 || Math.abs(y) > 8) break;
        }
        return { t: t, X: X, Y: Y };
    }

    // Generate vector field arrows for a system
    function makeArrows(sysKey, nx, ny, R) {
        var sys = systems[sysKey];
        var ax = [], ay = [], au = [], av = [];
        var dx = 2 * R / (nx - 1);
        var dy = 2 * R / (ny - 1);
        for (var i = 0; i < nx; i++) {
            for (var j = 0; j < ny; j++) {
                var px = -R + i * dx;
                var py = -R + j * dy;
                var v = sys.f(px, py);
                var mag = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                if (mag < 1e-10) continue;
                // Normalize and scale for visibility
                var scale = 0.25;
                var ux = v[0] / mag * scale;
                var uy = v[1] / mag * scale;
                ax.push(px);
                ay.push(py);
                au.push(ux);
                av.push(uy);
            }
        }
        return { x: ax, y: ay, u: au, v: av };
    }

    // Build arrow traces (line segments with small arrowheads)
    function arrowTraces(arrows) {
        var xd = [], yd = [];
        for (var i = 0; i < arrows.x.length; i++) {
            var px = arrows.x[i], py = arrows.y[i];
            var ux = arrows.u[i], uy = arrows.v[i];
            // Line from base to tip
            xd.push(px, px + ux, null);
            yd.push(py, py + uy, null);
        }
        return {
            x: xd, y: yd,
            type: 'scatter', mode: 'lines',
            line: { color: 'rgba(100, 120, 200, 0.35)', width: 1 },
            hoverinfo: 'none', showlegend: false
        };
    }

    // ===== EXPLORER 1: State Space Viewer =====
    var Tmax1 = 20;
    var Nsteps1 = 2000;

    function updateExplorer1() {
        var sysKey = document.getElementById('ps-system1').value;
        var x0 = parseFloat(document.getElementById('ps-x0-slider').value);
        var y0 = parseFloat(document.getElementById('ps-y0-slider').value);
        document.getElementById('ps-x0-value').textContent = x0.toFixed(1);
        document.getElementById('ps-y0-value').textContent = y0.toFixed(1);

        var sys = systems[sysKey];
        var sol = rk4Solve(sysKey, x0, y0, Tmax1, Nsteps1);
        var arrows = makeArrows(sysKey, 16, 16, 4);

        // Phase space plot (left)
        var traces1 = [
            arrowTraces(arrows),
            {
                x: sol.X, y: sol.Y,
                type: 'scatter', mode: 'lines',
                line: { color: '#00f3ff', width: 2.5 },
                hoverinfo: 'none', showlegend: false
            },
            {
                x: [sol.X[0]], y: [sol.Y[0]],
                type: 'scatter', mode: 'markers',
                marker: { color: '#ffbe0b', size: 10, symbol: 'circle' },
                hoverinfo: 'none', showlegend: false
            },
            {
                x: [0], y: [0],
                type: 'scatter', mode: 'markers',
                marker: { color: '#ff006e', size: 8, symbol: 'x', line: { width: 2, color: '#ff006e' } },
                hoverinfo: 'none', showlegend: false
            }
        ];

        var layout1 = Object.assign({}, darkLayout, {
            xaxis: axStyle([-4, 4], 'x'),
            yaxis: Object.assign(axStyle([-4, 4], 'y'), { scaleanchor: 'x' })
        });

        Plotly.react('ps-fieldPlot', traces1, layout1, { responsive: true });

        // Time series plot (right)
        var traces2 = [
            {
                x: sol.t, y: sol.X,
                type: 'scatter', mode: 'lines',
                line: { color: '#00f3ff', width: 2 },
                name: 'x(t)'
            },
            {
                x: sol.t, y: sol.Y,
                type: 'scatter', mode: 'lines',
                line: { color: '#ff006e', width: 2 },
                name: 'y(t)'
            }
        ];

        var layout2 = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, Tmax1], 't'),
            yaxis: axStyle([-4, 4], ''),
            legend: { x: 0.7, y: 0.98, font: { color: '#ccc', size: 11 } }
        });

        Plotly.react('ps-timePlot', traces2, layout2, { responsive: true });

        // Stats bar
        document.getElementById('ps-stats1').innerHTML =
            '<span><strong>System:</strong> ' + sys.name + '</span>' +
            '<span><strong>Behavior:</strong> ' + sys.desc + '</span>' +
            '<span><strong>IC:</strong> (' + x0.toFixed(1) + ', ' + y0.toFixed(1) + ')</span>';
    }

    // ===== EXPLORER 2: Time ↔ Phase Space =====
    var sol2 = null;
    var animId = null;
    var animIdx = 0;
    var isPlaying = false;
    var Tmax2 = 25;
    var Nsteps2 = 500;

    function computeExplorer2() {
        var sysKey = document.getElementById('ps-system2').value;
        sol2 = rk4Solve(sysKey, 2, 0, Tmax2, Nsteps2);
        animIdx = 0;
        var slider = document.getElementById('ps-time-slider');
        slider.max = sol2.t.length - 1;
        slider.value = 0;
        document.getElementById('ps-time-value').textContent = '0.0';
    }

    function drawExplorer2(idx) {
        if (!sol2 || idx >= sol2.t.length) return;
        var sysKey = document.getElementById('ps-system2').value;
        var sys = systems[sysKey];
        var arrows = makeArrows(sysKey, 14, 14, 4);

        // Phase space (left) — trail + moving dot
        var trailX = sol2.X.slice(0, idx + 1);
        var trailY = sol2.Y.slice(0, idx + 1);
        var traces1 = [
            arrowTraces(arrows),
            {
                x: trailX, y: trailY,
                type: 'scatter', mode: 'lines',
                line: { color: '#00f3ff', width: 2.5 },
                hoverinfo: 'none', showlegend: false
            },
            {
                x: [sol2.X[idx]], y: [sol2.Y[idx]],
                type: 'scatter', mode: 'markers',
                marker: { color: '#ffbe0b', size: 12 },
                hoverinfo: 'none', showlegend: false
            },
            {
                x: [0], y: [0],
                type: 'scatter', mode: 'markers',
                marker: { color: '#ff006e', size: 8, symbol: 'x', line: { width: 2, color: '#ff006e' } },
                hoverinfo: 'none', showlegend: false
            }
        ];

        var layout1 = Object.assign({}, darkLayout, {
            xaxis: axStyle([-4, 4], 'x'),
            yaxis: Object.assign(axStyle([-4, 4], 'y'), { scaleanchor: 'x' })
        });

        Plotly.react('ps-phasePlot', traces1, layout1, { responsive: true });

        // Time series (right) — full curves + cursor
        var tcur = sol2.t[idx];
        var traces2 = [
            {
                x: sol2.t, y: sol2.X,
                type: 'scatter', mode: 'lines',
                line: { color: '#00f3ff', width: 2 },
                name: 'x(t)'
            },
            {
                x: sol2.t, y: sol2.Y,
                type: 'scatter', mode: 'lines',
                line: { color: '#ff006e', width: 2 },
                name: 'y(t)'
            },
            {
                x: [sol2.X[idx]], y: [sol2.Y[idx]],
                type: 'scatter', mode: 'markers',
                marker: { color: '#ffbe0b', size: 10 },
                hoverinfo: 'none', showlegend: false
            }
        ];

        var layout2 = Object.assign({}, darkLayout, {
            xaxis: axStyle([0, Tmax2], 't'),
            yaxis: axStyle([-4, 4], ''),
            legend: { x: 0.7, y: 0.98, font: { color: '#ccc', size: 11 } },
            shapes: [{
                type: 'line',
                x0: tcur, x1: tcur,
                y0: -4, y1: 4,
                line: { color: '#ffbe0b', width: 1.5, dash: 'dash' }
            }]
        });

        Plotly.react('ps-xtPlot', traces2, layout2, { responsive: true });

        // Stats
        document.getElementById('ps-stats2').innerHTML =
            '<span><strong>System:</strong> ' + sys.name + '</span>' +
            '<span><strong>t =</strong> ' + sol2.t[idx].toFixed(1) + '</span>' +
            '<span><strong>State:</strong> (' + sol2.X[idx].toFixed(2) + ', ' + sol2.Y[idx].toFixed(2) + ')</span>';
    }

    function animStep() {
        if (!isPlaying || !sol2) return;
        animIdx += 2;
        if (animIdx >= sol2.t.length) {
            animIdx = sol2.t.length - 1;
            stopAnimation();
        }
        var slider = document.getElementById('ps-time-slider');
        slider.value = animIdx;
        document.getElementById('ps-time-value').textContent = sol2.t[animIdx].toFixed(1);
        drawExplorer2(animIdx);
        if (isPlaying) {
            animId = requestAnimationFrame(animStep);
        }
    }

    function stopAnimation() {
        isPlaying = false;
        if (animId) cancelAnimationFrame(animId);
        animId = null;
        var btn = document.getElementById('ps-play-btn');
        if (btn) btn.textContent = 'Play';
    }

    // ===== EXPLORER 3: Trajectory Zoo =====
    var zooTrajectories = [];
    var zooColors = ['#00f3ff', '#ff006e', '#ffbe0b', '#00ff88', '#bb86fc',
                     '#ff5722', '#76ff03', '#40c4ff', '#ea80fc', '#ffd740'];

    function drawExplorer3() {
        var sysKey = document.getElementById('ps-system3').value;
        var sys = systems[sysKey];
        var arrows = makeArrows(sysKey, 16, 16, 4);
        var traces = [arrowTraces(arrows)];

        for (var i = 0; i < zooTrajectories.length; i++) {
            var traj = zooTrajectories[i];
            traces.push({
                x: traj.X, y: traj.Y,
                type: 'scatter', mode: 'lines',
                line: { color: zooColors[i % zooColors.length], width: 2 },
                hoverinfo: 'none', showlegend: false
            });
            // Start marker
            traces.push({
                x: [traj.X[0]], y: [traj.Y[0]],
                type: 'scatter', mode: 'markers',
                marker: { color: zooColors[i % zooColors.length], size: 8, symbol: 'circle' },
                hoverinfo: 'none', showlegend: false
            });
        }

        // Fixed point marker
        traces.push({
            x: [0], y: [0],
            type: 'scatter', mode: 'markers',
            marker: { color: '#ff006e', size: 10, symbol: 'x', line: { width: 2, color: '#ff006e' } },
            hoverinfo: 'none', showlegend: false
        });

        var layout = Object.assign({}, darkLayout, {
            xaxis: axStyle([-4, 4], 'x'),
            yaxis: Object.assign(axStyle([-4, 4], 'y'), { scaleanchor: 'x' }),
            height: 420
        });

        Plotly.react('ps-zooPlot', traces, layout, { responsive: true });

        document.getElementById('ps-stats3').innerHTML =
            '<span><strong>System:</strong> ' + sys.name + '</span>' +
            '<span><strong>Trajectories:</strong> ' + zooTrajectories.length + '</span>' +
            '<span><strong>Behavior:</strong> ' + sys.desc + '</span>';
    }

    // ===== Expose global functions =====

    window.psStateReset = function() {
        document.getElementById('ps-system1').value = 'center';
        document.getElementById('ps-x0-slider').value = 2;
        document.getElementById('ps-y0-slider').value = 0;
        updateExplorer1();
    };

    window.psPlayPause = function() {
        if (isPlaying) {
            stopAnimation();
        } else {
            if (animIdx >= sol2.t.length - 1) {
                animIdx = 0;
            }
            isPlaying = true;
            document.getElementById('ps-play-btn').textContent = 'Pause';
            animId = requestAnimationFrame(animStep);
        }
    };

    window.psTimeReset = function() {
        stopAnimation();
        document.getElementById('ps-system2').value = 'center';
        computeExplorer2();
        drawExplorer2(0);
    };

    window.psAddTrajectory = function() {
        if (zooTrajectories.length >= 10) return;
        var sysKey = document.getElementById('ps-system3').value;
        // Random IC in [-3, 3] avoiding origin
        var x0, y0;
        do {
            x0 = (Math.random() * 6 - 3);
            y0 = (Math.random() * 6 - 3);
        } while (Math.abs(x0) < 0.3 && Math.abs(y0) < 0.3);
        x0 = Math.round(x0 * 10) / 10;
        y0 = Math.round(y0 * 10) / 10;
        var sol = rk4Solve(sysKey, x0, y0, 25, 2500);
        zooTrajectories.push(sol);
        drawExplorer3();
    };

    window.psZooReset = function() {
        zooTrajectories = [];
        drawExplorer3();
    };

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }
        var el = document.getElementById('ps-fieldPlot');
        if (!el) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Explorer 1
        updateExplorer1();

        // Explorer 1 handlers
        var sys1 = document.getElementById('ps-system1');
        var x0s = document.getElementById('ps-x0-slider');
        var y0s = document.getElementById('ps-y0-slider');
        if (sys1) sys1.addEventListener('change', updateExplorer1);
        if (x0s) x0s.addEventListener('input', updateExplorer1);
        if (y0s) y0s.addEventListener('input', updateExplorer1);

        // Explorer 2
        computeExplorer2();
        drawExplorer2(0);

        var sys2 = document.getElementById('ps-system2');
        var tSlider = document.getElementById('ps-time-slider');
        if (sys2) sys2.addEventListener('change', function() {
            stopAnimation();
            computeExplorer2();
            drawExplorer2(0);
        });
        if (tSlider) tSlider.addEventListener('input', function() {
            stopAnimation();
            animIdx = parseInt(this.value);
            document.getElementById('ps-time-value').textContent = sol2.t[animIdx].toFixed(1);
            drawExplorer2(animIdx);
        });

        // Explorer 3
        drawExplorer3();

        var sys3 = document.getElementById('ps-system3');
        if (sys3) sys3.addEventListener('change', function() {
            zooTrajectories = [];
            drawExplorer3();
        });
    }

    initializePlots();
})();
