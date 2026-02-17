(function() {
    'use strict';

    // Solvers for SHO: x'' + ω₀²x = 0 → dx/dt = v, dv/dt = -ω₀²x

    function exactSHO(t, x0, v0, omega0) {
        return {
            x: x0 * Math.cos(omega0 * t) + (v0 / omega0) * Math.sin(omega0 * t),
            v: -x0 * omega0 * Math.sin(omega0 * t) + v0 * Math.cos(omega0 * t)
        };
    }

    function deriv(s, omega0) {
        return [s[1], -omega0 * omega0 * s[0]];
    }

    // Euler
    function eulerSolve(x0, v0, omega0, h, tMax) {
        var t = [0], x = [x0], v = [v0];
        var s = [x0, v0], ti = 0;
        var n = Math.round(tMax / h);
        for (var i = 0; i < n; i++) {
            var d = deriv(s, omega0);
            s = [s[0] + h * d[0], s[1] + h * d[1]];
            ti += h;
            t.push(ti); x.push(s[0]); v.push(s[1]);
        }
        return {t: t, x: x, v: v};
    }

    // RK2 (Midpoint method)
    function rk2Solve(x0, v0, omega0, h, tMax) {
        var t = [0], x = [x0], v = [v0];
        var s = [x0, v0], ti = 0;
        var n = Math.round(tMax / h);
        for (var i = 0; i < n; i++) {
            var k1 = deriv(s, omega0);
            var sMid = [s[0] + 0.5 * h * k1[0], s[1] + 0.5 * h * k1[1]];
            var k2 = deriv(sMid, omega0);
            s = [s[0] + h * k2[0], s[1] + h * k2[1]];
            ti += h;
            t.push(ti); x.push(s[0]); v.push(s[1]);
        }
        return {t: t, x: x, v: v};
    }

    // ===== Explorer 1: Algorithm Race (Euler vs RK2) =====
    function plotRace() {
        var h = parseFloat(document.getElementById('rk-ar-h').value);
        var omega0 = 2.0, x0 = 1.0, v0 = 0.0, tMax = 10.0;

        var solEuler = eulerSolve(x0, v0, omega0, h, tMax);
        var solRK2 = rk2Solve(x0, v0, omega0, h, tMax);

        // Exact
        var tE = [], xE = [];
        for (var i = 0; i <= 500; i++) {
            var ti = tMax * i / 500;
            tE.push(ti); xE.push(exactSHO(ti, x0, v0, omega0).x);
        }

        var yMax = 3.0;

        var traces = [];
        traces.push({x:tE, y:xE, mode:'lines', line:{color:'#00ff9f', width:3}, name:'Exact'});
        traces.push({x:solEuler.t, y:solEuler.x, mode:'lines', line:{color:'#ff6b6b', width:2}, name:'Euler'});
        traces.push({x:solRK2.t, y:solRK2.x, mode:'lines', line:{color:'#00f3ff', width:2.5}, name:'RK2 (midpoint)'});

        var layout = {
            title:{text:'Euler vs RK2: h = ' + h.toFixed(2), font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-yMax, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.55, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rk-ar-plot', traces, layout);

        // Right: phase space
        var vE = [];
        for (var i = 0; i <= 500; i++) {
            vE.push(exactSHO(tMax * i / 500, x0, v0, omega0).v);
        }
        var traces2 = [];
        traces2.push({x:xE, y:vE, mode:'lines', line:{color:'#00ff9f', width:3.5}, name:'Exact'});
        traces2.push({x:solEuler.x, y:solEuler.v, mode:'lines', line:{color:'#ff6b6b', width:1.5}, name:'Euler'});
        traces2.push({x:solRK2.x, y:solRK2.v, mode:'lines', line:{color:'#00f3ff', width:2}, name:'RK2'});

        var phMax = 3.0;
        var layout2 = {
            title:{text:'Phase Space Orbits', font:{size:13}},
            xaxis:{title:'x', range:[-phMax, phMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'v', range:[-phMax * omega0, phMax * omega0], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.55, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rk-ar-phase', traces2, layout2);

        // Stats
        var ex = exactSHO(solEuler.t[solEuler.t.length - 1], x0, v0, omega0);
        var errE = Math.abs(solEuler.x[solEuler.x.length - 1] - ex.x);
        var ex2 = exactSHO(solRK2.t[solRK2.t.length - 1], x0, v0, omega0);
        var errR2 = Math.abs(solRK2.x[solRK2.x.length - 1] - ex2.x);
        var statsDiv = document.getElementById('rk-ar-stats');
        if (statsDiv) {
            var ratio = errR2 > 1e-12 ? errE / errR2 : Infinity;
            statsDiv.innerHTML =
                '<span>h = <strong>' + h.toFixed(2) + '</strong></span>' +
                '<span style="color:#ff6b6b">Euler error: <strong>' + errE.toFixed(4) + '</strong></span>' +
                '<span style="color:#00f3ff">RK2 error: <strong>' + errR2.toFixed(4) + '</strong></span>' +
                '<span>RK2 is <strong>' + (ratio < 1e6 ? ratio.toFixed(0) : '>10\u2076') + '\u00D7</strong> better</span>';
        }
    }

    // ===== Explorer 2: Convergence Rate Plotter =====
    function plotConvergence() {
        var omega0 = 2.0, x0 = 1.0, v0 = 0.0;
        var nPeriods = parseInt(document.getElementById('rk-cv-periods').value);
        var T = 2 * Math.PI / omega0;
        var tMax = nPeriods * T;

        var hArr = [], errEuler = [], errRK2 = [];
        for (var exp = -2.5; exp <= -0.2; exp += 0.1) {
            var h = Math.pow(10, exp);
            if (h > 0.4 * T) continue;
            hArr.push(h);

            var sE = eulerSolve(x0, v0, omega0, h, tMax);
            var maxE = 0;
            for (var j = 0; j < sE.t.length; j++) {
                var err = Math.abs(sE.x[j] - exactSHO(sE.t[j], x0, v0, omega0).x);
                if (err > maxE) maxE = err;
            }
            errEuler.push(Math.max(maxE, 1e-16));

            var sR2 = rk2Solve(x0, v0, omega0, h, tMax);
            var maxR = 0;
            for (var j = 0; j < sR2.t.length; j++) {
                var err = Math.abs(sR2.x[j] - exactSHO(sR2.t[j], x0, v0, omega0).x);
                if (err > maxR) maxR = err;
            }
            errRK2.push(Math.max(maxR, 1e-16));
        }

        var traces = [];
        traces.push({x:hArr, y:errEuler, mode:'lines+markers', line:{color:'#ff6b6b', width:2.5},
            marker:{size:5}, name:'Euler O(h)'});
        traces.push({x:hArr, y:errRK2, mode:'lines+markers', line:{color:'#00f3ff', width:2.5},
            marker:{size:5}, name:'RK2 O(h\u00B2)'});

        // Reference slopes
        var hRef = [hArr[0], hArr[hArr.length - 1]];
        var midIdx = Math.floor(hArr.length / 2);
        var s1 = errEuler[midIdx] / hArr[midIdx];
        traces.push({x:hRef, y:hRef.map(function(h) { return s1 * h; }), mode:'lines',
            line:{color:'rgba(255,107,107,0.6)', width:2, dash:'dash'}, name:'slope 1 ref', showlegend:false});
        var s2 = errRK2[midIdx] / (hArr[midIdx] * hArr[midIdx]);
        traces.push({x:hRef, y:hRef.map(function(h) { return s2 * h * h; }), mode:'lines',
            line:{color:'rgba(0,243,255,0.6)', width:2, dash:'dash'}, name:'slope 2 ref', showlegend:false});

        var layout = {
            title:{text:'Error vs Step Size (' + nPeriods + ' period' + (nPeriods > 1 ? 's' : '') + ')', font:{size:13}},
            xaxis:{title:'Step size h', type:'log', gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'|Error|', type:'log', gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.02, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rk-cv-plot', traces, layout);

        // Right: halving-h improvement bars
        // Use max error over the trajectory (not endpoint) to avoid
        // phase-cancellation artifacts that make ratios unreliable.
        var hRef1 = 0.05, hRef2 = 0.025;
        var methods = ['Euler', 'RK2'];
        var solvers = [eulerSolve, rk2Solve];
        var colors = ['#ff6b6b', '#00f3ff'];
        var barLabels = [], barVals = [], barColors = [];

        function maxError(sol, omega0, x0, v0) {
            var maxE = 0;
            for (var i = 0; i < sol.t.length; i++) {
                var ex = exactSHO(sol.t[i], x0, v0, omega0);
                var err = Math.abs(sol.x[i] - ex.x);
                if (err > maxE) maxE = err;
            }
            return maxE;
        }

        for (var m = 0; m < 2; m++) {
            var sol1 = solvers[m](x0, v0, omega0, hRef1, tMax);
            var sol2 = solvers[m](x0, v0, omega0, hRef2, tMax);
            var e1 = maxError(sol1, omega0, x0, v0);
            var e2 = maxError(sol2, omega0, x0, v0);
            var ratio = e2 > 1e-16 ? e1 / e2 : 1e6;
            barLabels.push(methods[m]);
            barVals.push(ratio);
            barColors.push(colors[m]);
        }

        var traces2 = [];
        traces2.push({x:barLabels, y:barVals, type:'bar', marker:{color:barColors}, width:0.4});
        traces2.push({x:['Euler', 'RK2'], y:[2, 2], mode:'lines',
            line:{color:'rgba(255,107,107,0.4)', width:1.5, dash:'dot'}, name:'2\u00D7 (1st order)'});
        traces2.push({x:['Euler', 'RK2'], y:[4, 4], mode:'lines',
            line:{color:'rgba(0,243,255,0.4)', width:1.5, dash:'dot'}, name:'4\u00D7 (2nd order)'});

        var layout2 = {
            title:{text:'Halving h: How Much Better?', font:{size:13}},
            yaxis:{title:'Error improvement factor', gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            xaxis:{gridcolor:'#2a2f4a', linecolor:'#808080'},
            showlegend:true, legend:{x:0.5, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rk-cv-bar', traces2, layout2);

        var statsDiv = document.getElementById('rk-cv-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>Periods: <strong>' + nPeriods + '</strong></span>' +
                '<span>Halve h: Euler \u2192 <strong style="color:#ff6b6b">' + barVals[0].toFixed(1) + '\u00D7</strong> better</span>' +
                '<span>Halve h: RK2 \u2192 <strong style="color:#00f3ff">' + barVals[1].toFixed(1) + '\u00D7</strong> better</span>' +
                '<span>RK2 wins: 4\u00D7 vs 2\u00D7 per halving</span>';
        }
    }

    // ===== Explorer 3: Energy Conservation =====
    function plotEnergy() {
        var omega0 = 2.0, x0 = 1.0, v0 = 0.0;
        var tMax = parseFloat(document.getElementById('rk-en-tmax').value);
        var h = 0.15;
        var E0 = 0.5 * v0 * v0 + 0.5 * omega0 * omega0 * x0 * x0;

        var solE = eulerSolve(x0, v0, omega0, h, tMax);
        var solR2 = rk2Solve(x0, v0, omega0, h, tMax);

        function energyRatio(sol) {
            var t = [], e = [];
            for (var i = 0; i < sol.t.length; i++) {
                t.push(sol.t[i]);
                var Ei = 0.5 * sol.v[i] * sol.v[i] + 0.5 * omega0 * omega0 * sol.x[i] * sol.x[i];
                e.push(Ei / E0);
            }
            return {t: t, e: e};
        }

        var eE = energyRatio(solE);
        var eR2 = energyRatio(solR2);

        var eMaxE = Math.max.apply(null, eE.e);
        var eMinR2 = Math.min.apply(null, eR2.e);
        var eMaxR2 = Math.max.apply(null, eR2.e);
        var yTop = Math.max(eMaxE, eMaxR2) * 1.05;
        var yBot = Math.min(0.95, eMinR2 * 0.98);

        var traces = [];
        traces.push({x:eE.t, y:eE.e, mode:'lines', line:{color:'#ff6b6b', width:2}, name:'Euler'});
        traces.push({x:eR2.t, y:eR2.e, mode:'lines', line:{color:'#00f3ff', width:2.5}, name:'RK2'});
        traces.push({x:[0, tMax], y:[1, 1], mode:'lines',
            line:{color:'rgba(0,255,159,0.5)', width:2, dash:'dash'}, name:'Exact (E = const)'});

        var layout = {
            title:{text:'Energy Conservation (h = ' + h.toFixed(2) + ')', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'E(t) / E(0)', range:[yBot, yTop], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rk-en-plot', traces, layout);

        // Right: trajectory comparison at this tMax
        var tExact = [], xExact = [];
        for (var i = 0; i <= 500; i++) {
            var ti = tMax * i / 500;
            tExact.push(ti);
            xExact.push(exactSHO(ti, x0, v0, omega0).x);
        }

        var yMaxT = Math.max(1.5, Math.max.apply(null, solE.x.map(Math.abs)) * 1.1);
        if (yMaxT > 20) yMaxT = 20;

        var traces2 = [];
        traces2.push({x:tExact, y:xExact, mode:'lines', line:{color:'#00ff9f', width:2.5}, name:'Exact'});
        traces2.push({x:solE.t, y:solE.x, mode:'lines', line:{color:'#ff6b6b', width:1.5}, name:'Euler'});
        traces2.push({x:solR2.t, y:solR2.x, mode:'lines', line:{color:'#00f3ff', width:2}, name:'RK2'});

        var layout2 = {
            title:{text:'Trajectory Comparison', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-yMaxT, yMaxT], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.55, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rk-en-traj', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('rk-en-stats');
        if (statsDiv) {
            var eFinalE = eE.e[eE.e.length - 1];
            var eFinalR2 = eR2.e[eR2.e.length - 1];
            var driftE = ((eFinalE - 1) * 100).toFixed(1);
            var driftR2 = ((eFinalR2 - 1) * 100).toFixed(3);
            statsDiv.innerHTML =
                '<span>t<sub>max</sub> = <strong>' + tMax.toFixed(0) + '</strong> s</span>' +
                '<span style="color:#ff6b6b">Euler drift: <strong>+' + driftE + '%</strong></span>' +
                '<span style="color:#00f3ff">RK2 drift: <strong>' + (parseFloat(driftR2) >= 0 ? '+' : '') + driftR2 + '%</strong></span>' +
                '<span>RK2 energy drift is <strong>' +
                (Math.abs(eFinalR2 - 1) > 1e-12 ? (Math.abs(eFinalE - 1) / Math.abs(eFinalR2 - 1)).toFixed(0) : '>10\u2076') +
                '\u00D7</strong> smaller</span>';
        }
    }

    // ===== Event Handlers =====
    function attachEventHandlers() {
        var arH = document.getElementById('rk-ar-h');
        if (arH) arH.addEventListener('input', function() {
            var lb = this.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
            plotRace();
        });
        var cvP = document.getElementById('rk-cv-periods');
        if (cvP) cvP.addEventListener('input', function() {
            var lb = this.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = this.value; }
            plotConvergence();
        });
        var enT = document.getElementById('rk-en-tmax');
        if (enT) enT.addEventListener('input', function() {
            var lb = this.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(0); }
            plotEnergy();
        });
    }

    // ===== Initialization =====
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('rk-ar-plot');
        var p2 = document.getElementById('rk-cv-plot');
        var p3 = document.getElementById('rk-en-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        plotRace();
        plotConvergence();
        plotEnergy();
        attachEventHandlers();
    }

    // ===== Global resets =====
    window.resetRace = function() {
        var sl = document.getElementById('rk-ar-h');
        if (sl) { sl.value = '0.30'; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '0.30'; } }
        plotRace();
    };
    window.resetConvergence = function() {
        var sl = document.getElementById('rk-cv-periods');
        if (sl) { sl.value = '3'; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '3'; } }
        plotConvergence();
    };
    window.resetEnergy = function() {
        var sl = document.getElementById('rk-en-tmax');
        if (sl) { sl.value = '10'; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '10'; } }
        plotEnergy();
    };

    initializePlots();
})();
