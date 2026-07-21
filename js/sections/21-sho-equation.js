(function() {
    'use strict';

    var TWO_PI = 2 * Math.PI;
    var N_PTS = 500;

    // === Explorer 1: ODE Visualizer ===
    function plotODE() {
        var omega = parseFloat(document.getElementById('sh-ode-omega').value);
        var A = parseFloat(document.getElementById('sh-ode-amp').value);
        var phi = parseFloat(document.getElementById('sh-ode-phi').value);

        // Fixed time axis; y-axes adapt to current parameters
        var tFixed = 13;
        var yMax = A * omega * omega * 1.3; // dominated by acceleration
        if (yMax < 3) yMax = 3;
        var aMax = yMax; // same scale for a-vs-x

        var t = [], xArr = [], vArr = [], aArr = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tFixed * i / N_PTS;
            t.push(ti);
            var x = A * Math.cos(omega * ti + phi);
            var v = -A * omega * Math.sin(omega * ti + phi);
            var a = -A * omega * omega * Math.cos(omega * ti + phi);
            xArr.push(x);
            vArr.push(v);
            aArr.push(a);
        }

        // LEFT PANEL: x(t), v(t), a(t) time series
        var traces1 = [];
        traces1.push({x:t, y:xArr, mode:'lines', line:{color:'#00f3ff', width:2.5}, name:'x(t)'});
        traces1.push({x:t, y:vArr, mode:'lines', line:{color:'#ff00ff', width:2}, name:'v(t) = dx/dt'});
        traces1.push({x:t, y:aArr, mode:'lines', line:{color:'#ffff00', width:2}, name:'a(t) = d\u00B2x/dt\u00B2'});

        var layout1 = {
            title:{text:'Time Evolution: x(t), v(t), a(t)', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Value', range:[-yMax, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('sh-ode-time-plot', traces1, layout1);

        // RIGHT PANEL: a vs x (should be a straight line with slope -omega^2)
        var traces2 = [];
        traces2.push({x:xArr, y:aArr, mode:'lines', line:{color:'#00ff9f', width:2.5}, name:'a vs x (trajectory)'});

        // Reference line: a = -omega^2 * x
        var xRef = [-A, A];
        var aRef = [A * omega * omega, -A * omega * omega];
        traces2.push({x:xRef, y:aRef, mode:'lines', line:{color:'#ffff00', width:1.5, dash:'dash'}, name:'a = -\u03C9\u00B2x (slope = -'+omega.toFixed(1)+'\u00B2 = -'+(omega*omega).toFixed(1)+')'});

        // Current point marker (at t=0)
        traces2.push({x:[xArr[0]], y:[aArr[0]], mode:'markers', marker:{size:12, color:'#ff6b6b', symbol:'circle'}, name:'t = 0'});

        var layout2 = {
            title:{text:'The SHO Signature: a = -\u03C9\u00B2x', font:{size:13}},
            xaxis:{title:'Position x', range:[-A*1.3, A*1.3], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Acceleration a', range:[-aMax, aMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('sh-ode-phase-plot', traces2, layout2);

        var statsDiv = document.getElementById('sh-ode-stats');
        if (statsDiv) {
            var T = 2 * Math.PI / omega;
            statsDiv.innerHTML =
                '<span>\u03C9 = <strong>'+omega.toFixed(1)+' rad/s</strong></span>'+
                '<span>A = <strong>'+A.toFixed(1)+'</strong></span>'+
                '<span>\u03C6 = <strong>'+(phi*180/Math.PI).toFixed(0)+'\u00B0</strong></span>'+
                '<span>T = <strong>'+T.toFixed(2)+' s</strong></span>'+
                '<span>v\u2098\u2090\u2093 = A\u03C9 = <strong>'+(A*omega).toFixed(1)+'</strong></span>'+
                '<span>a\u2098\u2090\u2093 = A\u03C9\u00B2 = <strong>'+(A*omega*omega).toFixed(1)+'</strong></span>';
        }
    }

    // === Explorer 2: Initial Condition Explorer ===
    function plotInitCond() {
        var x0 = parseFloat(document.getElementById('sh-ic-x0').value);
        var v0 = parseFloat(document.getElementById('sh-ic-v0').value);
        var omega = parseFloat(document.getElementById('sh-ic-omega').value);

        // Compute A and phi from initial conditions
        // x(0) = A cos(phi) = x0
        // v(0) = -A omega sin(phi) = v0
        // => A^2 = x0^2 + (v0/omega)^2
        // => tan(phi) = -v0/(omega*x0)
        var A = Math.sqrt(x0 * x0 + (v0 / omega) * (v0 / omega));
        var phi = 0;
        if (A > 1e-10) {
            phi = Math.atan2(-v0 / omega, x0);
        }

        var T = TWO_PI / omega;
        var tMax = Math.max(3 * T, 6);
        if (tMax > 25) tMax = 25;

        var t = [], xArr = [], vArr = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tMax * i / N_PTS;
            t.push(ti);
            xArr.push(A * Math.cos(omega * ti + phi));
            vArr.push(-A * omega * Math.sin(omega * ti + phi));
        }

        var traces = [];
        traces.push({x:t, y:xArr, mode:'lines', line:{color:'#00f3ff', width:2.5}, name:'x(t)'});
        traces.push({x:t, y:vArr, mode:'lines', line:{color:'#ff00ff', width:2}, name:'v(t)'});

        // Mark initial conditions
        traces.push({x:[0], y:[x0], mode:'markers', marker:{size:12, color:'#ffff00', symbol:'circle'}, name:'x(0) = '+x0.toFixed(1)});
        traces.push({x:[0], y:[v0], mode:'markers', marker:{size:12, color:'#ff6b6b', symbol:'diamond'}, name:'v(0) = '+v0.toFixed(1)});

        // Amplitude envelope
        if (A > 0.05) {
            traces.push({x:[0, tMax], y:[A, A], mode:'lines', line:{color:'rgba(255,255,0,0.25)', width:1, dash:'dash'}, showlegend:false});
            traces.push({x:[0, tMax], y:[-A, -A], mode:'lines', line:{color:'rgba(255,255,0,0.25)', width:1, dash:'dash'}, showlegend:false});
        }

        var yMax = Math.max(A, A * omega, 3) * 1.2;
        var layout = {
            title:{text:'Motion from Initial Conditions', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Value', range:[-yMax, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('sh-ic-plot', traces, layout);

        // Phasor diagram (smaller, right side)
        var pTraces = [];
        // Circle of radius A
        var cTheta = [], cx = [], cy = [];
        for (var i = 0; i <= 100; i++) {
            var th = TWO_PI * i / 100;
            cx.push(A * Math.cos(th));
            cy.push(A * Math.sin(th));
        }
        pTraces.push({x:cx, y:cy, mode:'lines', line:{color:'rgba(128,128,128,0.4)', width:1}, showlegend:false, hoverinfo:'skip'});

        // Phasor arrow (angle = phi above x-axis)
        pTraces.push({x:[0, A*Math.cos(phi)], y:[0, A*Math.sin(phi)], mode:'lines+markers', line:{color:'#00f3ff', width:2.5}, marker:{size:[0,10], symbol:['circle','arrow'], angleref:'previous'}, name:'Phasor (A, \u03C6)'});

        // x-projection
        pTraces.push({x:[A*Math.cos(phi), A*Math.cos(phi)], y:[0, A*Math.sin(phi)], mode:'lines', line:{color:'rgba(255,255,0,0.5)', width:1, dash:'dot'}, showlegend:false});
        pTraces.push({x:[0, A*Math.cos(phi)], y:[0, 0], mode:'lines', line:{color:'#ffff00', width:2}, name:'x(0) = A cos \u03C6'});

        var pMax = Math.max(A, 3) * 1.3;
        var pLayout = {
            title:{text:'Phasor Diagram', font:{size:13}},
            xaxis:{title:'x-component', range:[-pMax, pMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080', scaleanchor:'y'},
            yaxis:{title:'y-component', range:[-pMax, pMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('sh-ic-phasor', pTraces, pLayout);

        var statsDiv = document.getElementById('sh-ic-stats');
        if (statsDiv) {
            var phiDeg = phi * 180 / Math.PI;
            statsDiv.innerHTML =
                '<span>x\u2080 = <strong>'+x0.toFixed(1)+'</strong></span>'+
                '<span>v\u2080 = <strong>'+v0.toFixed(1)+'</strong></span>'+
                '<span>\u03C9 = <strong>'+omega.toFixed(1)+' rad/s</strong></span>'+
                '<span class="info-highlight">A = \u221A(x\u2080\u00B2 + v\u2080\u00B2/\u03C9\u00B2) = <strong>'+A.toFixed(2)+'</strong></span>'+
                '<span class="info-highlight">\u03C6 = atan2(-v\u2080/\u03C9, x\u2080) = <strong>'+phiDeg.toFixed(1)+'\u00B0</strong></span>'+
                '<span>x(t) = '+A.toFixed(2)+' cos('+omega.toFixed(1)+'t '+(phi>=0?'+ ':'- ')+Math.abs(phiDeg).toFixed(0)+'\u00B0)</span>';
        }
    }

    // === Explorer 3: Solution Verifier ===
    // Students set A, omega, phi and watch the ODE get verified step by step
    var verifyState = {timeIndex: 0, playing: false, animTimer: null};

    function plotVerify() {
        var A = parseFloat(document.getElementById('sh-vf-amp').value);
        var omega = parseFloat(document.getElementById('sh-vf-omega').value);

        // Fixed ranges based on slider limits: A max=3, omega max=5
        var tFixed = 13; // ~2 full cycles at lowest omega (0.5)
        var xFixed = 3.5; // slightly above max A=3
        var vFixed = 16;  // max v = A*omega = 3*5 = 15
        var aFixed = 80;  // max a = A*omega^2 = 3*25 = 75
        var nPts = 300;

        var t = [], xArr = [], vArr = [], aArr = [], negOm2x = [];
        for (var i = 0; i <= nPts; i++) {
            var ti = tFixed * i / nPts;
            t.push(ti);
            var x = A * Math.cos(omega * ti);
            var v = -A * omega * Math.sin(omega * ti);
            var a = -A * omega * omega * Math.cos(omega * ti);
            xArr.push(x);
            vArr.push(v);
            aArr.push(a);
            negOm2x.push(-omega * omega * x);
        }

        var idx = verifyState.timeIndex;
        if (idx > nPts) idx = nPts;
        var tNow = t[idx];

        // Three-panel stacked view
        // Panel 1: x(t)
        var traces1 = [];
        traces1.push({x:t, y:xArr, mode:'lines', line:{color:'#00f3ff', width:2.5}, name:'x(t) = A cos(\u03C9t)'});
        traces1.push({x:[tNow], y:[xArr[idx]], mode:'markers', marker:{size:12, color:'#ff6b6b'}, showlegend:false});

        var layout1 = {
            title:{text:'Position: x(t) = A cos(\u03C9t)', font:{size:12}},
            xaxis:{range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080', showticklabels:false},
            yaxis:{title:'x', range:[-xFixed, xFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false,
            margin:{t:25, b:5, l:50, r:10}, height:150
        };
        createPlot('sh-vf-plot-x', traces1, layout1);

        // Panel 2: v(t)
        var traces2 = [];
        traces2.push({x:t, y:vArr, mode:'lines', line:{color:'#ff00ff', width:2.5}, name:'v(t) = -A\u03C9 sin(\u03C9t)'});
        traces2.push({x:[tNow], y:[vArr[idx]], mode:'markers', marker:{size:10, color:'#ff6b6b'}, showlegend:false});

        var layout2 = {
            title:{text:'Velocity: v(t) = dx/dt = -A\u03C9 sin(\u03C9t)', font:{size:11}},
            xaxis:{range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080', showticklabels:false},
            yaxis:{title:'v', range:[-vFixed, vFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false,
            margin:{t:25, b:5, l:50, r:10}, height:150
        };
        createPlot('sh-vf-plot-v', traces2, layout2);

        // Panel 3: a(t) with -omega^2 * x overlay
        var traces3 = [];
        traces3.push({x:t, y:aArr, mode:'lines', line:{color:'#ffff00', width:2.5}, name:'a(t) = d\u00B2x/dt\u00B2'});
        traces3.push({x:t, y:negOm2x, mode:'lines', line:{color:'#00ff9f', width:2, dash:'dash'}, name:'-\u03C9\u00B2x(t)'});
        traces3.push({x:[tNow], y:[aArr[idx]], mode:'markers', marker:{size:10, color:'#ff6b6b'}, showlegend:false});

        var layout3 = {
            title:{text:'Verification: a(t) = -\u03C9\u00B2 x(t)  \u2714', font:{size:11}},
            xaxis:{title:'Time (s)', range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'a', range:[-aFixed, aFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.55, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:9}},
            margin:{t:25, b:40, l:50, r:10}, height:150
        };
        createPlot('sh-vf-plot-a', traces3, layout3);

        // Stats
        var statsDiv = document.getElementById('sh-vf-stats');
        if (statsDiv) {
            var xNow = xArr[idx], vNow = vArr[idx], aNow = aArr[idx];
            var negW2x = negOm2x[idx];
            var match = Math.abs(aNow - negW2x) < 0.01;
            statsDiv.innerHTML =
                '<span>t = <strong>'+tNow.toFixed(2)+' s</strong></span>'+
                '<span>x(t) = <strong>'+xNow.toFixed(3)+'</strong></span>'+
                '<span>v(t) = <strong>'+vNow.toFixed(3)+'</strong></span>'+
                '<span>a(t) = <strong>'+aNow.toFixed(3)+'</strong></span>'+
                '<span>-\u03C9\u00B2x = <strong>'+negW2x.toFixed(3)+'</strong></span>'+
                '<span style="color:'+(match?'#00ff9f':'#ff6b6b')+'"><strong>'+(match?'a = -\u03C9\u00B2x  \u2714':'a \u2260 -\u03C9\u00B2x  \u2718')+'</strong></span>';
        }
    }

    window.playVerify = function() {
        if (verifyState.playing) {
            clearInterval(verifyState.animTimer);
            verifyState.playing = false;
            var btn = document.getElementById('sh-vf-play-btn');
            if (btn) btn.textContent = '\u25B6 Play';
            return;
        }
        verifyState.playing = true;
        var btn = document.getElementById('sh-vf-play-btn');
        if (btn) btn.textContent = '\u23F8 Pause';

        verifyState.animTimer = setInterval(function() {
            verifyState.timeIndex += 2;
            if (verifyState.timeIndex > 300) verifyState.timeIndex = 0;
            var sl = document.getElementById('sh-vf-time');
            if (sl) sl.value = verifyState.timeIndex;
            plotVerify();
        }, 50);
    };

    // === Event Handlers ===
    function attachEventHandlers() {
        // Explorer 1 sliders
        var odeSliders = ['sh-ode-omega','sh-ode-amp','sh-ode-phi'];
        for (var i = 0; i < odeSliders.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) {
                        var v = label.querySelector('.control-label-value');
                        if (v) {
                            if (sid === 'sh-ode-phi') v.textContent = (parseFloat(this.value)*180/Math.PI).toFixed(0) + '\u00B0';
                            else v.textContent = parseFloat(this.value).toFixed(1);
                        }
                    }
                    plotODE();
                });
            })(odeSliders[i]);
        }

        // Explorer 2 sliders
        var icSliders = ['sh-ic-x0','sh-ic-v0','sh-ic-omega'];
        for (var i = 0; i < icSliders.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) {
                        var v = label.querySelector('.control-label-value');
                        if (v) v.textContent = parseFloat(this.value).toFixed(1);
                    }
                    plotInitCond();
                });
            })(icSliders[i]);
        }

        // Explorer 3 sliders
        var vfSliders = ['sh-vf-amp','sh-vf-omega'];
        for (var i = 0; i < vfSliders.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) {
                        var v = label.querySelector('.control-label-value');
                        if (v) v.textContent = parseFloat(this.value).toFixed(1);
                    }
                    verifyState.timeIndex = 0;
                    var tsl = document.getElementById('sh-vf-time');
                    if (tsl) tsl.value = 0;
                    plotVerify();
                });
            })(vfSliders[i]);
        }

        var timeSl = document.getElementById('sh-vf-time');
        if (timeSl) timeSl.addEventListener('input', function() {
            verifyState.timeIndex = parseInt(this.value);
            plotVerify();
        });
    }

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('sh-ode-time-plot');
        var p2 = document.getElementById('sh-ic-plot');
        var p3 = document.getElementById('sh-vf-plot-x');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        plotODE();
        plotInitCond();
        plotVerify();
        attachEventHandlers();
    }

    // === Global resets ===
    window.resetODE = function() {
        var defs = {'sh-ode-omega':['2.0','2.0'],'sh-ode-amp':['2.0','2.0'],'sh-ode-phi':['0','0\u00B0']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotODE();
    };

    window.resetIC = function() {
        var defs = {'sh-ic-x0':['2.0','2.0'],'sh-ic-v0':['0.0','0.0'],'sh-ic-omega':['2.0','2.0']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotInitCond();
    };

    window.resetVerify = function() {
        if (verifyState.playing) {
            clearInterval(verifyState.animTimer);
            verifyState.playing = false;
            var btn = document.getElementById('sh-vf-play-btn');
            if (btn) btn.textContent = '\u25B6 Play';
        }
        verifyState.timeIndex = 0;
        var defs = {'sh-vf-amp':['2.0','2.0'],'sh-vf-omega':['2.0','2.0']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        var tsl = document.getElementById('sh-vf-time');
        if (tsl) tsl.value = 0;
        plotVerify();
    };

    initializePlots();
})();
