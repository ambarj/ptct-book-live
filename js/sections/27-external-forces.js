(function() {
    'use strict';

    var N_PTS = 800;

    // Full driven oscillator: x'' + 2γx' + ω₀²x = (F₀/m)cos(ω_d t)
    // Analytical solution: x(t) = x_transient(t) + x_steady(t)
    //
    // Steady-state amplitude: A = (F₀/m) / √((ω₀²-ω_d²)² + (2γω_d)²)
    // Steady-state phase: tan(δ) = 2γω_d / (ω₀²-ω_d²)
    // x_steady = A cos(ω_d t - δ)
    //
    // Transient (underdamped γ<ω₀): Ce^(-γt) cos(ω_d_natural t - φ)
    // where ω_d_natural = √(ω₀²-γ²)

    function steadyAmp(F0m, omega0, omegaD, gamma) {
        var denom2 = Math.pow(omega0*omega0 - omegaD*omegaD, 2) + Math.pow(2*gamma*omegaD, 2);
        return F0m / Math.sqrt(denom2);
    }

    function steadyPhase(omega0, omegaD, gamma) {
        return Math.atan2(2*gamma*omegaD, omega0*omega0 - omegaD*omegaD);
    }

    // Full solution with initial conditions x(0)=x0, v(0)=v0
    function drivenSolution(t, x0, v0, F0m, omega0, omegaD, gamma) {
        var A = steadyAmp(F0m, omega0, omegaD, gamma);
        var delta = steadyPhase(omega0, omegaD, gamma);

        var xSteady = A * Math.cos(omegaD * t - delta);

        // At t=0: x_steady(0) = A cos(δ)  (note: cos(-δ) = cos(δ))
        // v_steady(0) = A ω_d sin(δ)       (note: d/dt cos(ω_d t - δ)|₀ = ω_d sin(δ))
        var xS0 = A * Math.cos(delta);   // note cos(-delta) = cos(delta)
        var vS0 = A * omegaD * Math.sin(delta); // derivative at t=0

        // Transient must make up the difference
        var xT0 = x0 - xS0;
        var vT0 = v0 - vS0;

        var disc = gamma*gamma - omega0*omega0;
        var xTrans;
        if (disc < -1e-10) {
            // Underdamped transient
            var wd = Math.sqrt(-disc);
            var Ct = xT0;
            var Dt = (vT0 + gamma * xT0) / wd;
            xTrans = Math.exp(-gamma * t) * (Ct * Math.cos(wd * t) + Dt * Math.sin(wd * t));
        } else if (disc > 1e-10) {
            // Overdamped transient
            var s = Math.sqrt(disc);
            var r1 = -gamma + s, r2 = -gamma - s;
            var c2 = (vT0 - r1 * xT0) / (r2 - r1);
            var c1 = xT0 - c2;
            xTrans = c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
        } else {
            // Critically damped transient
            xTrans = (xT0 + (vT0 + gamma * xT0) * t) * Math.exp(-gamma * t);
        }

        return {total: xTrans + xSteady, transient: xTrans, steady: xSteady};
    }

    // === Explorer 1: Transient Decay Animator ===
    function plotTransient() {
        var gamma = parseFloat(document.getElementById('ef-tr-gamma').value);
        var omegaD = parseFloat(document.getElementById('ef-tr-wd').value);
        var omega0 = 3.0;
        var F0m = 2.0;
        var x0 = 3.0, v0 = 0;

        var tMax = 20;
        var t = [], xTotal = [], xTrans = [], xSteady = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tMax * i / N_PTS;
            t.push(ti);
            var sol = drivenSolution(ti, x0, v0, F0m, omega0, omegaD, gamma);
            xTotal.push(sol.total);
            xTrans.push(sol.transient);
            xSteady.push(sol.steady);
        }

        var traces = [];
        traces.push({x:t, y:xSteady, mode:'lines', line:{color:'rgba(0,255,159,0.4)', width:1.5, dash:'dash'}, name:'Steady-state'});
        traces.push({x:t, y:xTrans, mode:'lines', line:{color:'rgba(255,107,107,0.5)', width:1.5, dash:'dot'}, name:'Transient'});
        traces.push({x:t, y:xTotal, mode:'lines', line:{color:'#00f3ff', width:2.5}, name:'Total x(t)'});

        var layout = {
            title:{text:'Driven Oscillator: Transient + Steady-State', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-8, 8], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.5, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('ef-tr-plot', traces, layout);

        // Right: envelope showing transient decay
        var envPlus = [], envMinus = [];
        var Ass = steadyAmp(F0m, omega0, omegaD, gamma);
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tMax * i / N_PTS;
            var env = Math.abs(xTrans[i]);
            envPlus.push(Ass + env);
            envMinus.push(Math.max(Ass - env, 0));
        }

        var traces2 = [];
        traces2.push({x:t, y:envPlus, mode:'lines', line:{color:'#ff6b6b', width:2}, name:'Upper bound'});
        traces2.push({x:t, y:envMinus, mode:'lines', line:{color:'#ff6b6b', width:2, dash:'dash'}, name:'Lower bound'});
        traces2.push({x:t, y:envPlus.map(function(){return Ass;}), mode:'lines',
            line:{color:'#00ff9f', width:2}, name:'A_ss = '+Ass.toFixed(2)});

        var layout2 = {
            title:{text:'Amplitude Envelope', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Amplitude', range:[0, 8], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.35, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('ef-tr-env-plot', traces2, layout2);

        var statsDiv = document.getElementById('ef-tr-stats');
        if (statsDiv) {
            var tauDecay = (gamma > 0.01) ? (1/gamma) : 999;
            statsDiv.innerHTML =
                '<span>\u03C9\u2080 = <strong>'+omega0.toFixed(1)+'</strong></span>'+
                '<span>\u03C9<sub>d</sub> = <strong>'+omegaD.toFixed(2)+'</strong></span>'+
                '<span>\u03B3 = <strong>'+gamma.toFixed(2)+'</strong></span>'+
                '<span>\u03C4<sub>decay</sub> = 1/\u03B3 = <strong>'+tauDecay.toFixed(1)+' s</strong></span>'+
                '<span>A<sub>ss</sub> = <strong>'+Ass.toFixed(2)+'</strong></span>';
        }
    }

    // === Explorer 2: Driving Frequency Explorer ===
    function plotFreqExplorer() {
        var omegaD = parseFloat(document.getElementById('ef-fr-wd').value);
        var gamma = parseFloat(document.getElementById('ef-fr-gamma').value);
        var omega0 = 3.0;
        var F0m = 2.0;

        // Show steady-state only (what survives after transient dies)
        var Ass = steadyAmp(F0m, omega0, omegaD, gamma);
        var delta = steadyPhase(omega0, omegaD, gamma);

        var tMax = 10;
        var t = [], xSS = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tMax * i / N_PTS;
            t.push(ti);
            xSS.push(Ass * Math.cos(omegaD * ti - delta));
        }

        // Also show driving force (scaled)
        var xDrive = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tMax * i / N_PTS;
            xDrive.push(F0m * 0.3 * Math.cos(omegaD * ti)); // scaled for visibility
        }

        var traces = [];
        traces.push({x:t, y:xDrive, mode:'lines', line:{color:'rgba(255,255,0,0.4)', width:1.5, dash:'dot'},
            name:'Driving force (scaled)'});
        traces.push({x:t, y:xSS, mode:'lines', line:{color:'#00f3ff', width:2.5},
            name:'Response (A='+Ass.toFixed(2)+')'});

        var layout = {
            title:{text:'Steady-State Response at \u03C9_d = '+omegaD.toFixed(2), font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-6, 6], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.4, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('ef-fr-plot', traces, layout);

        // Right: amplitude response curve A(ω_d)
        var wArr = [], aArr = [];
        for (var i = 0; i <= 200; i++) {
            var w = 0.1 + 5.9 * i / 200;
            wArr.push(w);
            aArr.push(steadyAmp(F0m, omega0, w, gamma));
        }

        var traces2 = [];
        traces2.push({x:wArr, y:aArr, mode:'lines', line:{color:'#ff00ff', width:2.5}, name:'A(\u03C9_d)'});
        // Mark current position
        traces2.push({x:[omegaD], y:[Ass], mode:'markers', marker:{size:14, color:'#00f3ff', symbol:'star'},
            name:'\u03C9_d = '+omegaD.toFixed(2), showlegend:false});
        // Mark resonance
        var omRes = Math.sqrt(Math.max(omega0*omega0 - 2*gamma*gamma, 0.01));
        traces2.push({x:[omRes, omRes], y:[0, steadyAmp(F0m, omega0, omRes, gamma)*1.1], mode:'lines',
            line:{color:'rgba(255,255,0,0.5)', width:1.5, dash:'dashdot'}, name:'\u03C9_res'});

        var layout2 = {
            title:{text:'Amplitude Response Curve', font:{size:13}},
            xaxis:{title:'Driving frequency \u03C9_d', range:[0, 6], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Steady-state amplitude', range:[0, 6], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.5, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('ef-fr-amp-plot', traces2, layout2);

        var statsDiv = document.getElementById('ef-fr-stats');
        if (statsDiv) {
            var deltaDeg = delta * 180 / Math.PI;
            statsDiv.innerHTML =
                '<span>\u03C9\u2080 = <strong>'+omega0.toFixed(1)+'</strong></span>'+
                '<span>\u03C9<sub>d</sub> = <strong>'+omegaD.toFixed(2)+'</strong></span>'+
                '<span>A<sub>ss</sub> = <strong>'+Ass.toFixed(2)+'</strong></span>'+
                '<span>Phase lag \u03B4 = <strong>'+deltaDeg.toFixed(1)+'\u00B0</strong></span>'+
                '<span>\u03C9<sub>res</sub> = <strong>'+omRes.toFixed(2)+'</strong></span>';
        }
    }

    // === Explorer 3: Initial Condition Independence ===
    function plotICTest() {
        var ic = parseInt(document.getElementById('ef-ic-select').value);
        var gamma = 0.3;
        var omega0 = 3.0;
        var omegaD = 2.0;
        var F0m = 2.0;

        // Four different initial conditions
        var ics = [
            {x0: 0, v0: 0, color: '#00f3ff', name: 'x\u2080=0, v\u2080=0'},
            {x0: 5, v0: 0, color: '#ff00ff', name: 'x\u2080=5, v\u2080=0'},
            {x0: -3, v0: 4, color: '#ffff00', name: 'x\u2080=-3, v\u2080=4'},
            {x0: 0, v0: -6, color: '#ff6b6b', name: 'x\u2080=0, v\u2080=-6'}
        ];

        var tMax = 25;
        var traces = [];

        // Always show all four
        for (var j = 0; j < ics.length; j++) {
            var t = [], x = [];
            for (var i = 0; i <= N_PTS; i++) {
                var ti = tMax * i / N_PTS;
                t.push(ti);
                var sol = drivenSolution(ti, ics[j].x0, ics[j].v0, F0m, omega0, omegaD, gamma);
                x.push(sol.total);
            }
            var alpha = (ic === 4 || ic === j) ? 1.0 : 0.2;
            traces.push({x:t, y:x, mode:'lines',
                line:{color:ics[j].color, width: (ic === j) ? 3 : 1.5},
                opacity: alpha,
                name:ics[j].name});
        }

        // Show steady-state reference
        var Ass = steadyAmp(F0m, omega0, omegaD, gamma);
        var delta = steadyPhase(omega0, omegaD, gamma);
        var tRef = [], xRef = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tMax * i / N_PTS;
            tRef.push(ti);
            xRef.push(Ass * Math.cos(omegaD * ti - delta));
        }
        traces.push({x:tRef, y:xRef, mode:'lines',
            line:{color:'#00ff9f', width:2, dash:'dash'}, name:'Steady-state'});

        var layout = {
            title:{text:'All Roads Lead to the Same Steady State', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-8, 8], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.55, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('ef-ic-plot', traces, layout);

        // Right: difference from steady-state (shows transient decay)
        var traces2 = [];
        for (var j = 0; j < ics.length; j++) {
            var t2 = [], diff = [];
            for (var i = 0; i <= N_PTS; i++) {
                var ti = tMax * i / N_PTS;
                t2.push(ti);
                var sol = drivenSolution(ti, ics[j].x0, ics[j].v0, F0m, omega0, omegaD, gamma);
                diff.push(sol.total - sol.steady);
            }
            var alpha2 = (ic === 4 || ic === j) ? 1.0 : 0.2;
            traces2.push({x:t2, y:diff, mode:'lines',
                line:{color:ics[j].color, width: (ic === j) ? 3 : 1.5},
                opacity: alpha2,
                name:ics[j].name});
        }

        // Decay envelope
        var tEnv = [], envP = [], envM = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tMax * i / N_PTS;
            tEnv.push(ti);
            var env = 6 * Math.exp(-gamma * ti);
            envP.push(env);
            envM.push(-env);
        }
        traces2.push({x:tEnv, y:envP, mode:'lines', line:{color:'rgba(255,255,255,0.2)', width:1, dash:'dot'}, showlegend:false});
        traces2.push({x:tEnv, y:envM, mode:'lines', line:{color:'rgba(255,255,255,0.2)', width:1, dash:'dot'}, showlegend:false});

        var layout2 = {
            title:{text:'Deviation from Steady State', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t) - x_ss(t)', range:[-7, 7], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false,
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('ef-ic-diff-plot', traces2, layout2);

        var statsDiv = document.getElementById('ef-ic-stats');
        if (statsDiv) {
            var tauDecay = 1 / gamma;
            statsDiv.innerHTML =
                '<span>\u03B3 = <strong>'+gamma.toFixed(1)+'</strong></span>'+
                '<span>\u03C4<sub>decay</sub> = <strong>'+tauDecay.toFixed(1)+' s</strong></span>'+
                '<span>A<sub>ss</sub> = <strong>'+Ass.toFixed(2)+'</strong></span>'+
                '<span>All converge by t \u2248 <strong>'+(3*tauDecay).toFixed(0)+' s</strong> (3\u03C4)</span>';
        }
    }

    // === Event Handlers ===
    function attachEventHandlers() {
        // Explorer 1
        var trSliders = ['ef-tr-gamma','ef-tr-wd'];
        for (var i = 0; i < trSliders.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var lb = this.closest('.control-group');
                    if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
                    plotTransient();
                });
            })(trSliders[i]);
        }

        // Explorer 2
        var frSliders = ['ef-fr-wd','ef-fr-gamma'];
        for (var i = 0; i < frSliders.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var lb = this.closest('.control-group');
                    if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
                    plotFreqExplorer();
                });
            })(frSliders[i]);
        }

        // Explorer 3
        var icSelect = document.getElementById('ef-ic-select');
        if (icSelect) icSelect.addEventListener('change', plotICTest);
    }

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('ef-tr-plot');
        var p2 = document.getElementById('ef-fr-plot');
        var p3 = document.getElementById('ef-ic-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        plotTransient();
        plotFreqExplorer();
        plotICTest();
        attachEventHandlers();
    }

    // === Global resets ===
    window.resetTransient = function() {
        var defs = {'ef-tr-gamma':['0.30','0.30'],'ef-tr-wd':['2.50','2.50']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotTransient();
    };

    window.resetFreqExplorer = function() {
        var defs = {'ef-fr-wd':['2.00','2.00'],'ef-fr-gamma':['0.30','0.30']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotFreqExplorer();
    };

    window.resetICTest = function() {
        var sel = document.getElementById('ef-ic-select');
        if (sel) sel.value = '4';
        plotICTest();
    };

    initializePlots();
})();
