(function() {
    'use strict';

    var TWO_PI = 2 * Math.PI;
    var N_PTS = 500;

    // === Explorer 1: Parameter Explorer ===
    function plotParams() {
        var A = parseFloat(document.getElementById('os-amp-slider').value);
        var omega = parseFloat(document.getElementById('os-omega-slider').value);
        var phi = parseFloat(document.getElementById('os-phi-slider').value);

        var T = TWO_PI / omega;
        var tMax = Math.max(4 * T, 8);
        if (tMax > 30) tMax = 30;

        var t = [], y = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tMax * i / N_PTS;
            t.push(ti);
            y.push(A * Math.cos(omega * ti + phi));
        }

        var traces = [];
        traces.push({x:t, y:y, mode:'lines', line:{color:'#00f3ff', width:2.5}, name:'x(t) = A cos(\u03C9t + \u03C6)'});

        // Amplitude envelope
        traces.push({x:[0, tMax], y:[A, A], mode:'lines', line:{color:'rgba(255,255,0,0.3)', width:1, dash:'dash'}, name:'A', showlegend:false});
        traces.push({x:[0, tMax], y:[-A, -A], mode:'lines', line:{color:'rgba(255,255,0,0.3)', width:1, dash:'dash'}, showlegend:false});

        // Period marker
        if (T < tMax) {
            traces.push({x:[0, 0], y:[-A*1.3, A*1.3], mode:'lines', line:{color:'rgba(0,255,159,0.4)', width:1, dash:'dot'}, showlegend:false, hoverinfo:'skip'});
            traces.push({x:[T, T], y:[-A*1.3, A*1.3], mode:'lines', line:{color:'rgba(0,255,159,0.4)', width:1, dash:'dot'}, showlegend:false, hoverinfo:'skip'});
            // T annotation arrow
            var yAnn = -A * 1.1;
            traces.push({x:[0, T], y:[yAnn, yAnn], mode:'lines+markers', line:{color:'#00ff9f', width:1.5}, marker:{size:6, symbol:'line-ew', color:'#00ff9f'}, name:'T = '+T.toFixed(2)+' s'});
        }

        // Initial value marker
        var x0 = A * Math.cos(phi);
        traces.push({x:[0], y:[x0], mode:'markers', marker:{size:10, color:'#ffff00', symbol:'circle'}, name:'x(0) = '+x0.toFixed(2)});

        var layout = {
            title:{text:'Simple Harmonic Motion: x(t) = A cos(\u03C9t + \u03C6)', font:{size:14}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-3.5, 3.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('os-param-plot', traces, layout);

        var statsDiv = document.getElementById('os-param-stats');
        if (statsDiv) {
            var f = omega / TWO_PI;
            var phiDeg = phi * 180 / Math.PI;
            statsDiv.innerHTML =
                '<span>A = <strong>'+A.toFixed(1)+'</strong></span>'+
                '<span>\u03C9 = <strong>'+omega.toFixed(1)+' rad/s</strong></span>'+
                '<span>f = <strong>'+f.toFixed(2)+' Hz</strong></span>'+
                '<span>T = <strong>'+T.toFixed(2)+' s</strong></span>'+
                '<span>\u03C6 = <strong>'+phiDeg.toFixed(0)+'\u00B0</strong></span>'+
                '<span>x(0) = <strong>'+x0.toFixed(2)+'</strong></span>';
        }
    }

    // === Explorer 2: Restoring Force Lab ===
    function plotRestoring() {
        var system = document.getElementById('os-sys-select').value;
        var xDisp = parseFloat(document.getElementById('os-disp-slider').value);

        // Define potential energy and force for each system
        var xArr = [], Uarr = [], Farr = [], UparabArr = [];
        var xMin = -3, xMax = 3;
        var kEff = 1; // effective spring constant
        var sysLabel = '', forceLabel = '';

        if (system === 'spring') {
            kEff = 1;
            sysLabel = 'Spring: U(x) = \u00BDkx\u00B2';
            forceLabel = 'F = -kx';
            for (var i = 0; i <= N_PTS; i++) {
                var x = xMin + (xMax - xMin) * i / N_PTS;
                xArr.push(x);
                Uarr.push(0.5 * kEff * x * x);
                Farr.push(-kEff * x);
                UparabArr.push(0.5 * kEff * x * x); // exact match
            }
        } else if (system === 'pendulum') {
            kEff = 1;
            sysLabel = 'Pendulum: U(\u03B8) = 1 - cos(\u03B8)';
            forceLabel = 'F = -sin(\u03B8)';
            for (var i = 0; i <= N_PTS; i++) {
                var x = xMin + (xMax - xMin) * i / N_PTS;
                xArr.push(x);
                Uarr.push(1 - Math.cos(x));
                Farr.push(-Math.sin(x));
                UparabArr.push(0.5 * x * x); // Taylor approx
            }
        } else if (system === 'morse') {
            // Morse potential (molecular bond)
            var De = 2, a = 1;
            kEff = 2 * De * a * a;
            sysLabel = 'Molecular Bond: Morse Potential';
            forceLabel = 'F = -dU/dx';
            for (var i = 0; i <= N_PTS; i++) {
                var x = xMin + (xMax - xMin) * i / N_PTS;
                xArr.push(x);
                var expTerm = Math.exp(-a * x);
                Uarr.push(De * (1 - expTerm) * (1 - expTerm));
                Farr.push(-2 * De * a * expTerm * (1 - expTerm));
                UparabArr.push(De * a * a * x * x); // Taylor approx
            }
        }

        // LEFT: Potential energy
        var traces1 = [];
        traces1.push({x:xArr, y:Uarr, mode:'lines', line:{color:'#00f3ff', width:2.5}, name:'U(x)'});
        traces1.push({x:xArr, y:UparabArr, mode:'lines', line:{color:'#ffff00', width:1.5, dash:'dash'}, name:'\u00BDk\u2091\u1DA0\u1DA0x\u00B2 (approx)'});

        // Displacement marker on U curve
        var Ux;
        if (system === 'spring') Ux = 0.5 * kEff * xDisp * xDisp;
        else if (system === 'pendulum') Ux = 1 - Math.cos(xDisp);
        else { var expT = Math.exp(-1 * xDisp); Ux = 2 * (1 - expT) * (1 - expT); }

        traces1.push({x:[xDisp], y:[Ux], mode:'markers', marker:{size:14, color:'#ff6b6b', symbol:'circle'}, name:'Displaced'});
        // Equilibrium marker
        traces1.push({x:[0], y:[0], mode:'markers', marker:{size:10, color:'#00ff9f', symbol:'diamond'}, name:'Equilibrium'});

        var uMax = system === 'morse' ? 3 : 5;
        var layout1 = {
            title:{text:'Potential Energy', font:{size:13}},
            xaxis:{title:'Displacement x', range:[xMin, xMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'U(x)', range:[-0.5, uMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('os-potential-plot', traces1, layout1);

        // RIGHT: Force
        var traces2 = [];
        traces2.push({x:xArr, y:Farr, mode:'lines', line:{color:'#ff00ff', width:2.5}, name:'F(x) = -dU/dx'});
        // Linear approx
        var FlinArr = [];
        for (var i = 0; i <= N_PTS; i++) {
            FlinArr.push(-kEff * xArr[i]);
        }
        traces2.push({x:xArr, y:FlinArr, mode:'lines', line:{color:'#ffff00', width:1.5, dash:'dash'}, name:'F \u2248 -k\u2091\u1DA0\u1DA0x (linear)'});

        // Force arrow at displacement
        var Fx;
        if (system === 'spring') Fx = -kEff * xDisp;
        else if (system === 'pendulum') Fx = -Math.sin(xDisp);
        else { var eT = Math.exp(-1 * xDisp); Fx = -2 * 2 * 1 * eT * (1 - eT); }

        traces2.push({x:[xDisp], y:[Fx], mode:'markers', marker:{size:14, color:'#ff6b6b', symbol:'triangle-left'}, name:'F at x = '+xDisp.toFixed(1)});
        // Zero line emphasis
        traces2.push({x:[xMin, xMax], y:[0, 0], mode:'lines', line:{color:'#808080', width:1}, showlegend:false, hoverinfo:'skip'});

        var fMax = system === 'morse' ? 3 : 4;
        var layout2 = {
            title:{text:'Restoring Force', font:{size:13}},
            xaxis:{title:'Displacement x', range:[xMin, xMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'F(x)', range:[-fMax, fMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('os-force-plot', traces2, layout2);

        var statsDiv = document.getElementById('os-restoring-stats');
        if (statsDiv) {
            var direction = xDisp > 0.05 ? '\u2190 (toward equilibrium)' : xDisp < -0.05 ? '\u2192 (toward equilibrium)' : 'at equilibrium';
            statsDiv.innerHTML =
                '<span>System: <strong>'+sysLabel+'</strong></span>'+
                '<span>x = <strong>'+xDisp.toFixed(1)+'</strong></span>'+
                '<span>F(x) = <strong>'+Fx.toFixed(2)+'</strong> '+direction+'</span>'+
                '<span>U(x) = <strong>'+Ux.toFixed(2)+'</strong></span>';
        }
    }

    // === Explorer 3: Pattern Matcher ===
    var matchState = {A: 2, omega: 3, phi: 0.5, score: 0, round: 1};

    function newPattern() {
        matchState.A = 0.5 + Math.random() * 2.5;
        matchState.omega = 1 + Math.random() * 5;
        matchState.phi = Math.random() * TWO_PI;
        // Round
        matchState.A = Math.round(matchState.A * 10) / 10;
        matchState.omega = Math.round(matchState.omega * 10) / 10;
        matchState.phi = Math.round(matchState.phi * 100) / 100;

        var promptDiv = document.getElementById('os-match-prompt');
        if (promptDiv) {
            promptDiv.innerHTML = 'Round '+matchState.round+': Study the mystery oscillation below. Identify its <strong>amplitude A</strong>, <strong>period T</strong> (in seconds), and <strong>initial displacement x(0)</strong>.';
        }

        // Clear inputs
        var ids = ['os-match-amp','os-match-period','os-match-x0'];
        for (var i = 0; i < ids.length; i++) {
            var inp = document.getElementById(ids[i]);
            if (inp) inp.value = '';
        }
        var fb = document.getElementById('os-match-feedback');
        if (fb) fb.innerHTML = '';

        plotPattern();
    }

    function plotPattern() {
        var A = matchState.A, omega = matchState.omega, phi = matchState.phi;
        var T = TWO_PI / omega;
        var tMax = Math.max(4 * T, 8);
        if (tMax > 30) tMax = 30;

        var t = [], y = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tMax * i / N_PTS;
            t.push(ti);
            y.push(A * Math.cos(omega * ti + phi));
        }

        var traces = [];
        traces.push({x:t, y:y, mode:'lines', line:{color:'#ff00ff', width:2.5}, name:'Mystery signal'});

        var layout = {
            title:{text:'Mystery Oscillation \u2014 identify A, T, and x(0)', font:{size:14}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-3.5, 3.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false,
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('os-match-plot', traces, layout);
    }

    window.submitMatch = function() {
        var guessA = parseFloat(document.getElementById('os-match-amp').value);
        var guessT = parseFloat(document.getElementById('os-match-period').value);
        var guessX0 = parseFloat(document.getElementById('os-match-x0').value);

        if (isNaN(guessA) && isNaN(guessT) && isNaN(guessX0)) return;

        var A = matchState.A, omega = matchState.omega, phi = matchState.phi;
        var T = TWO_PI / omega;
        var x0 = A * Math.cos(phi);

        var parts = [];
        var allCorrect = true;

        if (!isNaN(guessA)) {
            var aErr = Math.abs(guessA - A) / A * 100;
            if (aErr < 15) parts.push('<span style="color:#00ff9f">\u2714 A = '+guessA.toFixed(1)+' (actual: '+A.toFixed(1)+')</span>');
            else { parts.push('<span style="color:#ff6b6b">\u2718 A = '+guessA.toFixed(1)+' (actual: '+A.toFixed(1)+')</span>'); allCorrect = false; }
        } else { allCorrect = false; }

        if (!isNaN(guessT)) {
            var tErr = Math.abs(guessT - T) / T * 100;
            if (tErr < 15) parts.push('<span style="color:#00ff9f">\u2714 T = '+guessT.toFixed(2)+' s (actual: '+T.toFixed(2)+' s)</span>');
            else { parts.push('<span style="color:#ff6b6b">\u2718 T = '+guessT.toFixed(2)+' s (actual: '+T.toFixed(2)+' s)</span>'); allCorrect = false; }
        } else { allCorrect = false; }

        if (!isNaN(guessX0)) {
            var x0Err = Math.abs(guessX0 - x0);
            if (x0Err < 0.3) parts.push('<span style="color:#00ff9f">\u2714 x(0) = '+guessX0.toFixed(1)+' (actual: '+x0.toFixed(2)+')</span>');
            else { parts.push('<span style="color:#ff6b6b">\u2718 x(0) = '+guessX0.toFixed(1)+' (actual: '+x0.toFixed(2)+')</span>'); allCorrect = false; }
        } else { allCorrect = false; }

        if (allCorrect) {
            matchState.score++;
            parts.push('<span style="color:#00ff9f"><strong>All correct! Score: '+matchState.score+'</strong></span>');
        } else {
            parts.push('<span style="color:#ffff00">Tip: A = peak height, T = time between peaks, x(0) = value at t=0</span>');
        }

        var fb = document.getElementById('os-match-feedback');
        if (fb) fb.innerHTML = parts.join('<br>');
    };

    window.nextPattern = function() {
        matchState.round++;
        newPattern();
    };

    window.resetMatcher = function() {
        matchState.score = 0;
        matchState.round = 1;
        newPattern();
    };

    // === Event Handlers ===
    function attachEventHandlers() {
        // Explorer 1 sliders
        var sliderIds1 = ['os-amp-slider','os-omega-slider','os-phi-slider'];
        for (var i = 0; i < sliderIds1.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) {
                        var v = label.querySelector('.control-label-value');
                        if (v) {
                            if (sid === 'os-phi-slider') {
                                v.textContent = (parseFloat(this.value)*180/Math.PI).toFixed(0) + '\u00B0';
                            } else {
                                v.textContent = parseFloat(this.value).toFixed(1);
                            }
                        }
                    }
                    plotParams();
                });
            })(sliderIds1[i]);
        }

        // Explorer 2
        var sysSelect = document.getElementById('os-sys-select');
        if (sysSelect) sysSelect.addEventListener('change', function() {
            plotRestoring();
        });
        var dispSlider = document.getElementById('os-disp-slider');
        if (dispSlider) dispSlider.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(1); }
            plotRestoring();
        });
    }

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('os-param-plot');
        var p2 = document.getElementById('os-potential-plot');
        var p3 = document.getElementById('os-match-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        plotParams();
        plotRestoring();
        newPattern();
        attachEventHandlers();
    }

    // === Global resets ===
    window.resetParams = function() {
        var defs = {'os-amp-slider':['2.0','2.0'],'os-omega-slider':['2.0','2.0'],'os-phi-slider':['0','0\u00B0']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotParams();
    };

    window.resetRestoring = function() {
        var sel = document.getElementById('os-sys-select');
        if (sel) sel.value = 'spring';
        var sl = document.getElementById('os-disp-slider');
        if (sl) { sl.value = 0; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '0.0'; } }
        plotRestoring();
    };

    initializePlots();
})();
