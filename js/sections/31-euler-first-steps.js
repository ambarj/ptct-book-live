(function() {
    'use strict';

    // Euler's method for systems: X_{n+1} = X_n + h * F(X_n, t_n)
    // We solve the SHO: x'' + ω₀²x = 0  →  dx/dt = v,  dv/dt = -ω₀²x
    // Exact solution: x(t) = x₀ cos(ω₀t) + (v₀/ω₀) sin(ω₀t)

    // Exact solution for SHO
    function exactSHO(t, x0, v0, omega0) {
        return {
            x: x0 * Math.cos(omega0 * t) + (v0 / omega0) * Math.sin(omega0 * t),
            v: -x0 * omega0 * Math.sin(omega0 * t) + v0 * Math.cos(omega0 * t)
        };
    }

    // Euler method: returns arrays of {t, x, v}
    function eulerSolve(x0, v0, omega0, h, tMax) {
        var t = [0], x = [x0], v = [v0];
        var xi = x0, vi = v0, ti = 0;
        var nSteps = Math.round(tMax / h);
        for (var i = 0; i < nSteps; i++) {
            var xNew = xi + h * vi;
            var vNew = vi + h * (-omega0 * omega0 * xi);
            xi = xNew;
            vi = vNew;
            ti += h;
            t.push(ti);
            x.push(xi);
            v.push(vi);
        }
        return {t: t, x: x, v: v};
    }

    // === Explorer 1: Step-by-Step Euler Visualizer ===
    function plotStepByStep() {
        var h = parseFloat(document.getElementById('eu-sv-h').value);
        var nShow = parseInt(document.getElementById('eu-sv-n').value);
        var omega0 = 2.0;
        var x0 = 1.0, v0 = 0.0;

        // Euler steps
        var sol = eulerSolve(x0, v0, omega0, h, h * nShow);

        // Exact solution (smooth)
        var tMax = h * nShow;
        var tExact = [], xExact = [];
        var nPts = Math.max(200, nShow * 20);
        for (var i = 0; i <= nPts; i++) {
            var ti = tMax * i / nPts;
            tExact.push(ti);
            xExact.push(exactSHO(ti, x0, v0, omega0).x);
        }

        // Tangent line segments at each Euler step
        var tangentX = [], tangentY = [];
        for (var i = 0; i < sol.t.length - 1; i++) {
            tangentX.push(sol.t[i], sol.t[i+1], null);
            tangentY.push(sol.x[i], sol.x[i+1], null);
        }

        var yMax = Math.max(1.5, Math.max.apply(null, sol.x.map(Math.abs)) * 1.15);

        var traces = [];
        // Exact solution
        traces.push({x:tExact, y:xExact, mode:'lines', line:{color:'rgba(0,255,159,0.5)', width:2}, name:'Exact x(t)'});
        // Euler tangent segments
        traces.push({x:tangentX, y:tangentY, mode:'lines', line:{color:'#ff00ff', width:2}, name:'Euler steps'});
        // Euler points
        traces.push({x:sol.t, y:sol.x, mode:'markers', marker:{size:7, color:'#00f3ff', symbol:'circle'}, name:'Euler points'});

        var layout = {
            title:{text:'Euler Method: h = '+h.toFixed(2)+', '+nShow+' steps', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, Math.max(tMax, 0.5)], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-yMax, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.55, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('eu-sv-plot', traces, layout);

        // Right: phase space (x, v)
        var vExact = [];
        for (var i = 0; i <= nPts; i++) {
            var ti = tMax * i / nPts;
            vExact.push(exactSHO(ti, x0, v0, omega0).v);
        }

        var traces2 = [];
        traces2.push({x:xExact, y:vExact, mode:'lines', line:{color:'rgba(0,255,159,0.5)', width:2}, name:'Exact orbit'});
        traces2.push({x:sol.x, y:sol.v, mode:'lines+markers', line:{color:'#ff00ff', width:1.5},
            marker:{size:5, color:'#00f3ff'}, name:'Euler orbit'});
        // Start marker
        traces2.push({x:[x0], y:[v0], mode:'markers', marker:{size:12, color:'#ffff00', symbol:'star'}, name:'Start'});

        var phMax = Math.max(yMax, Math.max.apply(null, sol.v.map(Math.abs)) * 1.15, 2.5);

        var layout2 = {
            title:{text:'Phase Space (x, v)', font:{size:13}},
            xaxis:{title:'x', range:[-phMax, phMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'v', range:[-phMax*omega0, phMax*omega0], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080', scaleanchor:'x', scaleratio:1/omega0},
            showlegend:true, legend:{x:0.55, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('eu-sv-phase', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('eu-sv-stats');
        if (statsDiv) {
            var lastExact = exactSHO(tMax, x0, v0, omega0);
            var errX = Math.abs(sol.x[sol.x.length-1] - lastExact.x);
            // Energy: E = 0.5*v² + 0.5*ω₀²*x²
            var E0 = 0.5*v0*v0 + 0.5*omega0*omega0*x0*x0;
            var lastX = sol.x[sol.x.length-1], lastV = sol.v[sol.v.length-1];
            var Ef = 0.5*lastV*lastV + 0.5*omega0*omega0*lastX*lastX;
            var eDrift = ((Ef - E0) / E0 * 100);
            statsDiv.innerHTML =
                '<span>\u03C9\u2080 = <strong>'+omega0.toFixed(1)+'</strong></span>'+
                '<span>Step h = <strong>'+h.toFixed(2)+'</strong></span>'+
                '<span>Steps: <strong>'+nShow+'</strong></span>'+
                '<span>|Error| at t='+tMax.toFixed(1)+': <strong>'+errX.toFixed(4)+'</strong></span>'+
                '<span>Energy drift: <strong style="color:'+(Math.abs(eDrift) > 5 ? '#ff6b6b' : '#00ff9f')+'">'+eDrift.toFixed(1)+'%</strong></span>';
        }
    }

    // === Explorer 2: Step Size Explorer ===
    function plotStepSize() {
        var omega0 = 2.0;
        var x0 = 1.0, v0 = 0.0;
        var tMax = 10.0;

        var hValues = [1.0, 0.50, 0.20, 0.05];
        var colors = ['#ff6b6b', '#ffff00', '#00f3ff', '#ff00ff'];

        // Exact
        var tExact = [], xExact = [];
        for (var i = 0; i <= 500; i++) {
            var ti = tMax * i / 500;
            tExact.push(ti);
            xExact.push(exactSHO(ti, x0, v0, omega0).x);
        }

        var traces = [];
        traces.push({x:tExact, y:xExact, mode:'lines', line:{color:'#00ff9f', width:3}, name:'Exact'});

        var hSlider = parseFloat(document.getElementById('eu-ss-h').value);
        // Show the user-selected h prominently, plus the fixed comparison set
        var userSol = eulerSolve(x0, v0, omega0, hSlider, tMax);
        traces.push({x:userSol.t, y:userSol.x, mode:'lines', line:{color:'#00f3ff', width:2.5}, name:'h = '+hSlider.toFixed(2)});

        var yMax = Math.max(1.5, Math.max.apply(null, userSol.x.map(Math.abs)) * 1.1);
        if (yMax > 30) yMax = 30;

        var layout = {
            title:{text:'Euler vs Exact: h = '+hSlider.toFixed(2), font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-yMax, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.55, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('eu-ss-plot', traces, layout);

        // Right: error vs time for multiple h
        var traces2 = [];
        for (var j = 0; j < hValues.length; j++) {
            var h = hValues[j];
            var sol = eulerSolve(x0, v0, omega0, h, tMax);
            var tErr = [], errArr = [];
            for (var i = 0; i < sol.t.length; i++) {
                var ex = exactSHO(sol.t[i], x0, v0, omega0);
                tErr.push(sol.t[i]);
                errArr.push(Math.abs(sol.x[i] - ex.x));
            }
            traces2.push({x:tErr, y:errArr, mode:'lines', line:{color:colors[j], width:2}, name:'h='+h.toFixed(2)});
        }

        var layout2 = {
            title:{text:'Error Growth vs Time', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'|x_Euler - x_exact|', type:'log', range:[-4, 2], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('eu-ss-err-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('eu-ss-stats');
        if (statsDiv) {
            var lastExact = exactSHO(tMax, x0, v0, omega0);
            var errFinal = Math.abs(userSol.x[userSol.x.length-1] - lastExact.x);
            var nSteps = Math.round(tMax / hSlider);
            statsDiv.innerHTML =
                '<span>h = <strong>'+hSlider.toFixed(2)+'</strong></span>'+
                '<span>Steps: <strong>'+nSteps+'</strong></span>'+
                '<span>Final error: <strong>'+errFinal.toFixed(3)+'</strong></span>'+
                '<span>Smaller h \u2192 more steps but less error</span>';
        }
    }

    // === Explorer 3: Error Accumulation Tracker ===
    function plotErrorTracker() {
        var omega0 = 2.0;
        var x0 = 1.0, v0 = 0.0;

        var nPeriods = parseInt(document.getElementById('eu-et-periods').value);
        var T = 2 * Math.PI / omega0;
        var tMax = nPeriods * T;

        // Compare different step sizes: final error at t = nPeriods * T
        var hArr = [];
        var errArr = [];
        var nStepsArr = [];
        for (var exp = -2; exp <= 0; exp += 0.1) {
            var h = Math.pow(10, exp);
            if (h > 0.5 * T) continue; // skip if h > half period (nonsense)
            hArr.push(h);
            var sol = eulerSolve(x0, v0, omega0, h, tMax);
            var ex = exactSHO(tMax, x0, v0, omega0);
            errArr.push(Math.abs(sol.x[sol.x.length-1] - ex.x));
            nStepsArr.push(sol.t.length - 1);
        }

        var traces = [];
        traces.push({x:hArr, y:errArr, mode:'lines+markers', line:{color:'#00f3ff', width:2.5},
            marker:{size:5, color:'#00f3ff'}, name:'Euler error'});

        // Reference O(h) line
        var refH = [hArr[0], hArr[hArr.length-1]];
        var scale = errArr[Math.floor(errArr.length/2)] / hArr[Math.floor(hArr.length/2)];
        var refErr = refH.map(function(h) { return scale * h; });
        traces.push({x:refH, y:refErr, mode:'lines', line:{color:'rgba(255,255,0,0.5)', width:2, dash:'dash'}, name:'O(h) reference'});

        var layout = {
            title:{text:'Final Error vs Step Size ('+nPeriods+' period'+(nPeriods>1?'s':'')+')', font:{size:13}},
            xaxis:{title:'Step size h', type:'log', gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'|Error| at t = '+tMax.toFixed(1)+' s', type:'log', gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('eu-et-plot', traces, layout);

        // Right: energy drift over time for a moderate h
        var hDemo = 0.10;
        var solDemo = eulerSolve(x0, v0, omega0, hDemo, tMax);
        var E0 = 0.5*v0*v0 + 0.5*omega0*omega0*x0*x0;
        var tE = [], eRatio = [];
        for (var i = 0; i < solDemo.t.length; i++) {
            tE.push(solDemo.t[i]);
            var E = 0.5*solDemo.v[i]*solDemo.v[i] + 0.5*omega0*omega0*solDemo.x[i]*solDemo.x[i];
            eRatio.push(E / E0);
        }

        var traces2 = [];
        traces2.push({x:tE, y:eRatio, mode:'lines', line:{color:'#ff00ff', width:2.5}, name:'E(t)/E(0)'});
        traces2.push({x:[0, tMax], y:[1, 1], mode:'lines', line:{color:'rgba(0,255,159,0.5)', width:2, dash:'dash'}, name:'Exact (conserved)'});

        var eMax = Math.max.apply(null, eRatio) * 1.05;

        var layout2 = {
            title:{text:'Energy Drift (h = '+hDemo.toFixed(2)+')', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'E(t) / E(0)', range:[0.9, Math.max(eMax, 1.1)], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('eu-et-energy-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('eu-et-stats');
        if (statsDiv) {
            var finalE = eRatio[eRatio.length - 1];
            var drift = ((finalE - 1) * 100).toFixed(1);
            statsDiv.innerHTML =
                '<span>Periods: <strong>'+nPeriods+'</strong></span>'+
                '<span>T = <strong>'+T.toFixed(2)+'</strong> s</span>'+
                '<span>t<sub>max</sub> = <strong>'+tMax.toFixed(1)+'</strong> s</span>'+
                '<span>Energy at end (h=0.10): <strong>'+finalE.toFixed(3)+' E\u2080</strong></span>'+
                '<span style="color:'+(Math.abs(drift) > 10 ? '#ff6b6b' : '#ffff00')+'">Drift: +'+drift+'%</span>';
        }
    }

    // === Event Handlers ===
    function attachEventHandlers() {
        // Explorer 1
        var svH = document.getElementById('eu-sv-h');
        if (svH) svH.addEventListener('input', function() {
            var lb = this.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
            plotStepByStep();
        });
        var svN = document.getElementById('eu-sv-n');
        if (svN) svN.addEventListener('input', function() {
            var lb = this.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = this.value; }
            plotStepByStep();
        });

        // Explorer 2
        var ssH = document.getElementById('eu-ss-h');
        if (ssH) ssH.addEventListener('input', function() {
            var lb = this.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
            plotStepSize();
        });

        // Explorer 3
        var etP = document.getElementById('eu-et-periods');
        if (etP) etP.addEventListener('input', function() {
            var lb = this.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = this.value; }
            plotErrorTracker();
        });
    }

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('eu-sv-plot');
        var p2 = document.getElementById('eu-ss-plot');
        var p3 = document.getElementById('eu-et-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        plotStepByStep();
        plotStepSize();
        plotErrorTracker();
        attachEventHandlers();
    }

    // === Global resets ===
    window.resetStepVis = function() {
        var sl = document.getElementById('eu-sv-h');
        if (sl) { sl.value = '0.30'; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '0.30'; } }
        var n = document.getElementById('eu-sv-n');
        if (n) { n.value = '15'; var lb = n.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '15'; } }
        plotStepByStep();
    };

    window.resetStepSize = function() {
        var sl = document.getElementById('eu-ss-h');
        if (sl) { sl.value = '0.30'; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '0.30'; } }
        plotStepSize();
    };

    window.resetErrorTracker = function() {
        var sl = document.getElementById('eu-et-periods');
        if (sl) { sl.value = '3'; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '3'; } }
        plotErrorTracker();
    };

    initializePlots();
})();
