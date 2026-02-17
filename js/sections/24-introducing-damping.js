(function() {
    'use strict';

    var TWO_PI = 2 * Math.PI;
    var N_PTS = 800;

    // Damped oscillation: x(t) = A e^(-γt) cos(ωd t)
    // where ωd = sqrt(ω₀² - γ²) (underdamped only, γ < ω₀)
    function dampedX(t, A, gamma, omega0) {
        if (gamma >= omega0) {
            // Overdamped/critical: just exponential decay (simplified)
            return A * Math.exp(-gamma * t);
        }
        var omegaD = Math.sqrt(omega0 * omega0 - gamma * gamma);
        return A * Math.exp(-gamma * t) * Math.cos(omegaD * t);
    }

    function dampedEnvelope(t, A, gamma) {
        return A * Math.exp(-gamma * t);
    }

    // === Explorer 1: Damping Explorer ===
    function plotDamping() {
        var gamma = parseFloat(document.getElementById('dp-ex-gamma').value);
        var omega0 = parseFloat(document.getElementById('dp-ex-omega0').value);
        var A = parseFloat(document.getElementById('dp-ex-amp').value);

        var tFixed = 20;
        var t = [], xArr = [], envUp = [], envDown = [];

        for (var i = 0; i <= N_PTS; i++) {
            var ti = tFixed * i / N_PTS;
            t.push(ti);
            xArr.push(dampedX(ti, A, gamma, omega0));
            envUp.push(dampedEnvelope(ti, A, gamma));
            envDown.push(-dampedEnvelope(ti, A, gamma));
        }

        // Also generate undamped for comparison
        var xUndamped = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tFixed * i / N_PTS;
            xUndamped.push(A * Math.cos(omega0 * ti));
        }

        // LEFT: damped + envelope + undamped ghost
        var traces1 = [];
        traces1.push({x:t, y:xUndamped, mode:'lines', line:{color:'rgba(128,128,128,0.3)', width:1.5, dash:'dot'},
            name:'Undamped (\u03B3=0)'});
        traces1.push({x:t, y:envUp, mode:'lines', line:{color:'#ff6b6b', width:1.5, dash:'dash'},
            name:'Envelope: Ae\u207B\u1D5E\u1D57'});
        traces1.push({x:t, y:envDown, mode:'lines', line:{color:'#ff6b6b', width:1.5, dash:'dash'},
            showlegend:false});
        traces1.push({x:t, y:xArr, mode:'lines', line:{color:'#00f3ff', width:2.5},
            name:'Damped: Ae\u207B\u1D5E\u1D57cos(\u03C9\u1D48t)'});

        var layout1 = {
            title:{text:'Damped Oscillation', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Displacement x', range:[-3.5, 3.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('dp-ex-plot', traces1, layout1);

        // RIGHT: energy decay
        var eArr = [], e0Arr = [];
        var E0 = 0.5 * omega0 * omega0 * A * A;
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tFixed * i / N_PTS;
            // E(t) ≈ E₀ e^(-2γt) for underdamped
            eArr.push(E0 * Math.exp(-2 * gamma * ti));
            e0Arr.push(E0);
        }

        var traces2 = [];
        traces2.push({x:t, y:e0Arr, mode:'lines', line:{color:'rgba(255,255,0,0.3)', width:1.5, dash:'dot'},
            name:'Undamped energy'});
        traces2.push({x:t, y:eArr, mode:'lines', line:{color:'#ffff00', width:2.5},
            name:'E(t) \u2248 E\u2080 e\u207B\u00B2\u1D5E\u1D57', fill:'tozeroy', fillcolor:'rgba(255,255,0,0.08)'});

        var layout2 = {
            title:{text:'Energy Decay', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Energy', range:[0, E0 * 1.15], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.45, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('dp-ex-energy-plot', traces2, layout2);

        // Stats
        var omegaD = gamma < omega0 ? Math.sqrt(omega0 * omega0 - gamma * gamma) : 0;
        var regime = gamma < omega0 ? 'Underdamped' : (gamma === omega0 ? 'Critical' : 'Overdamped');
        var statsDiv = document.getElementById('dp-ex-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>\u03B3 = <strong>'+gamma.toFixed(2)+'</strong> s\u207B\u00B9</span>'+
                '<span>\u03C9\u2080 = <strong>'+omega0.toFixed(1)+'</strong> rad/s</span>'+
                '<span>\u03C9\u1D48 = \u221A(\u03C9\u2080\u00B2\u2013\u03B3\u00B2) = <strong>'+(omegaD > 0 ? omegaD.toFixed(2) : '\u2014')+'</strong></span>'+
                '<span>Regime: <strong>'+regime+'</strong></span>'+
                '<span>\u03C4\u1D48\u2090\u2098\u209A = 1/\u03B3 = <strong>'+(gamma > 0 ? (1/gamma).toFixed(2) : '\u221E')+' s</strong></span>';
        }
    }

    // === Explorer 2: Two Time Scales ===
    function plotTimeScales() {
        var gamma = parseFloat(document.getElementById('dp-ts-gamma').value);
        var omega0 = parseFloat(document.getElementById('dp-ts-omega0').value);

        var A = 2.0;
        var tFixed = 20;
        var t = [], xArr = [], envUp = [], envDown = [];

        var omegaD = gamma < omega0 ? Math.sqrt(omega0 * omega0 - gamma * gamma) : 0;
        var Tosc = omegaD > 0 ? TWO_PI / omegaD : Infinity;
        var tauDamp = gamma > 0 ? 1.0 / gamma : Infinity;

        for (var i = 0; i <= N_PTS; i++) {
            var ti = tFixed * i / N_PTS;
            t.push(ti);
            xArr.push(dampedX(ti, A, gamma, omega0));
            envUp.push(dampedEnvelope(ti, A, gamma));
            envDown.push(-dampedEnvelope(ti, A, gamma));
        }

        // Plot with marked time scales
        var traces = [];
        traces.push({x:t, y:envUp, mode:'lines', line:{color:'#ff6b6b', width:1.5, dash:'dash'},
            name:'Envelope'});
        traces.push({x:t, y:envDown, mode:'lines', line:{color:'#ff6b6b', width:1.5, dash:'dash'},
            showlegend:false});
        traces.push({x:t, y:xArr, mode:'lines', line:{color:'#00f3ff', width:2.5},
            name:'x(t)'});

        // Mark T_osc (first full period) with vertical lines
        if (omegaD > 0 && Tosc < tFixed) {
            traces.push({x:[Tosc, Tosc], y:[-3.5, 3.5], mode:'lines',
                line:{color:'#00ff9f', width:2, dash:'dot'}, name:'T\u2092\u209B\u209C = '+Tosc.toFixed(2)+' s'});
            // Second period marker
            if (2 * Tosc < tFixed) {
                traces.push({x:[2*Tosc, 2*Tosc], y:[-3.5, 3.5], mode:'lines',
                    line:{color:'#00ff9f', width:1, dash:'dot'}, showlegend:false});
            }
        }

        // Mark τ_damp with vertical line
        if (gamma > 0 && tauDamp < tFixed) {
            traces.push({x:[tauDamp, tauDamp], y:[-3.5, 3.5], mode:'lines',
                line:{color:'#ffff00', width:2, dash:'dashdot'}, name:'\u03C4\u1D48\u2090\u2098\u209A = 1/\u03B3 = '+tauDamp.toFixed(2)+' s'});
            // At τ_damp, amplitude has dropped to A/e ≈ 0.368A
            var xAtTau = dampedEnvelope(tauDamp, A, gamma);
            traces.push({x:[tauDamp], y:[xAtTau], mode:'markers+text',
                marker:{size:10, color:'#ffff00', symbol:'circle'},
                text:['A/e = '+xAtTau.toFixed(2)], textposition:'top right', textfont:{color:'#ffff00', size:10},
                showlegend:false});
        }

        var layout = {
            title:{text:'Two Competing Time Scales', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Displacement x', range:[-3.5, 3.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('dp-ts-plot', traces, layout);

        // RIGHT: ratio bar chart
        var ratio = tauDamp / Tosc;
        var ratioLabel = ratio > 100 ? '>100' : ratio.toFixed(1);
        var barColors = ratio > 5 ? ['#00ff9f', '#ffff00', '#00ff9f'] :
                       (ratio > 1 ? ['#00ff9f', '#ffff00', '#ffff00'] :
                                    ['#ff6b6b', '#ff6b6b', '#ff6b6b']);

        var traces2 = [];
        traces2.push({x:['T\u2092\u209B\u209C', '\u03C4\u1D48\u2090\u2098\u209A', 'Ratio \u03C4/T'], y:[Tosc, tauDamp, ratio],
            type:'bar', marker:{color:barColors},
            text:[Tosc > 100 ? '>100' : Tosc.toFixed(2)+' s', tauDamp > 100 ? '>100' : tauDamp.toFixed(2)+' s', ratioLabel],
            textposition:'auto', textfont:{color:'#1a1b2e', size:11}});

        // Reference line at ratio = 1
        var yMax = Math.max(Tosc, tauDamp, ratio, 5) * 1.2;
        if (yMax > 200) yMax = 200;

        var layout2 = {
            title:{text:'Time Scale Comparison', font:{size:13}},
            xaxis:{gridcolor:'#2a2f4a', linecolor:'#808080'},
            yaxis:{title:'Time (s) or Ratio', range:[0, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false,
            margin:{t:40, b:50, l:55, r:15},
            shapes:[{type:'line', x0:-0.5, x1:2.5, y0:1, y1:1, line:{color:'#808080', width:1, dash:'dot'}}]
        };
        createPlot('dp-ts-bar-plot', traces2, layout2);

        // Stats
        var Q = omega0 / (2 * gamma); // Quality factor
        var statsDiv = document.getElementById('dp-ts-stats');
        if (statsDiv) {
            var description = '';
            if (ratio > 10) description = 'Very light damping: many oscillations before fading';
            else if (ratio > 3) description = 'Light damping: several oscillations visible';
            else if (ratio > 1) description = 'Moderate damping: a few oscillations';
            else description = 'Heavy damping: barely oscillates';

            statsDiv.innerHTML =
                '<span>T\u2092\u209B\u209C = <strong>'+(Tosc > 100 ? '\u221E' : Tosc.toFixed(2)+' s')+'</strong></span>'+
                '<span>\u03C4\u1D48\u2090\u2098\u209A = <strong>'+(tauDamp > 100 ? '\u221E' : tauDamp.toFixed(2)+' s')+'</strong></span>'+
                '<span>\u03C4/T = <strong>'+ratioLabel+'</strong></span>'+
                '<span>Q = \u03C9\u2080/(2\u03B3) = <strong>'+Q.toFixed(1)+'</strong></span>'+
                '<span>'+description+'</span>';
        }
    }

    // === Explorer 3: Damping Detector ===
    // Mystery oscillation — guess the damping coefficient
    var detectorState = {
        targetGamma: 0,
        omega0: 3.0,
        A: 2.0,
        score: 0,
        attempts: 0,
        revealed: false
    };

    function newMystery() {
        // Random γ from 0.05 to 0.8
        detectorState.targetGamma = 0.05 + Math.random() * 0.75;
        detectorState.revealed = false;
        document.getElementById('dp-det-feedback').innerHTML = '';
        document.getElementById('dp-det-guess').value = '';
        plotDetector();
    }

    function plotDetector() {
        var gamma = detectorState.targetGamma;
        var omega0 = detectorState.omega0;
        var A = detectorState.A;

        var tFixed = 20;
        var t = [], xArr = [], envUp = [], envDown = [];

        for (var i = 0; i <= N_PTS; i++) {
            var ti = tFixed * i / N_PTS;
            t.push(ti);
            xArr.push(dampedX(ti, A, gamma, omega0));
            envUp.push(dampedEnvelope(ti, A, gamma));
            envDown.push(-dampedEnvelope(ti, A, gamma));
        }

        var traces = [];
        traces.push({x:t, y:xArr, mode:'lines', line:{color:'#00f3ff', width:2.5}, name:'Mystery oscillation'});

        if (detectorState.revealed) {
            traces.push({x:t, y:envUp, mode:'lines', line:{color:'#ff6b6b', width:1.5, dash:'dash'}, name:'Envelope'});
            traces.push({x:t, y:envDown, mode:'lines', line:{color:'#ff6b6b', width:1.5, dash:'dash'}, showlegend:false});

            // Mark τ_damp
            var tauDamp = 1.0 / gamma;
            if (tauDamp < tFixed) {
                traces.push({x:[tauDamp, tauDamp], y:[-3.5, 3.5], mode:'lines',
                    line:{color:'#ffff00', width:2, dash:'dashdot'}, name:'\u03C4 = 1/\u03B3 = '+ tauDamp.toFixed(2)+' s'});
            }
        }

        var layout = {
            title:{text:'Mystery Damped Oscillation (\u03C9\u2080 = '+omega0.toFixed(1)+' rad/s)', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Displacement x', range:[-3.5, 3.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('dp-det-plot', traces, layout);

        // Score display
        var scoreDiv = document.getElementById('dp-det-score');
        if (scoreDiv) {
            scoreDiv.innerHTML = 'Score: <strong>'+detectorState.score+'/'+detectorState.attempts+'</strong>';
        }
    }

    function checkGuess() {
        var guessStr = document.getElementById('dp-det-guess').value.trim();
        if (!guessStr) return;

        var guess = parseFloat(guessStr);
        if (isNaN(guess)) return;

        var actual = detectorState.targetGamma;
        var error = Math.abs(guess - actual);
        var tolerance = 0.1; // within 0.1 is a hit

        detectorState.attempts++;
        detectorState.revealed = true;

        var feedback = document.getElementById('dp-det-feedback');
        if (error <= tolerance) {
            detectorState.score++;
            feedback.innerHTML = '<span style="color:#00ff9f;">\u2705 Correct! \u03B3 = '+actual.toFixed(2)+
                ' (you guessed '+guess.toFixed(2)+'). Error: '+error.toFixed(3)+'</span>';
        } else if (error <= 0.25) {
            feedback.innerHTML = '<span style="color:#ffff00;">\u26A0\uFE0F Close! \u03B3 = '+actual.toFixed(2)+
                ' (you guessed '+guess.toFixed(2)+'). Off by '+error.toFixed(3)+'</span>';
        } else {
            feedback.innerHTML = '<span style="color:#ff6b6b;">\u274C Not quite. \u03B3 = '+actual.toFixed(2)+
                ' (you guessed '+guess.toFixed(2)+'). Off by '+error.toFixed(2)+'</span>';
        }

        plotDetector();
    }

    // === Event Handlers ===
    function attachEventHandlers() {
        // Explorer 1
        var exSliders = ['dp-ex-gamma','dp-ex-omega0','dp-ex-amp'];
        for (var i = 0; i < exSliders.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) {
                        var v = label.querySelector('.control-label-value');
                        if (v) v.textContent = parseFloat(this.value).toFixed(2);
                    }
                    plotDamping();
                });
            })(exSliders[i]);
        }

        // Explorer 2
        var tsSliders = ['dp-ts-gamma','dp-ts-omega0'];
        for (var i = 0; i < tsSliders.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) {
                        var v = label.querySelector('.control-label-value');
                        if (v) v.textContent = parseFloat(this.value).toFixed(2);
                    }
                    plotTimeScales();
                });
            })(tsSliders[i]);
        }

        // Explorer 3 buttons
        var guessBtn = document.getElementById('dp-det-check');
        if (guessBtn) guessBtn.addEventListener('click', checkGuess);

        var guessInput = document.getElementById('dp-det-guess');
        if (guessInput) guessInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') checkGuess();
        });
    }

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('dp-ex-plot');
        var p2 = document.getElementById('dp-ts-plot');
        var p3 = document.getElementById('dp-det-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        plotDamping();
        plotTimeScales();
        newMystery();
        attachEventHandlers();
    }

    // === Global resets ===
    window.resetDamping = function() {
        var defs = {'dp-ex-gamma':['0.10','0.10'],'dp-ex-omega0':['3.0','3.00'],'dp-ex-amp':['2.0','2.00']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotDamping();
    };

    window.resetTimeScales = function() {
        var defs = {'dp-ts-gamma':['0.15','0.15'],'dp-ts-omega0':['3.0','3.00']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotTimeScales();
    };

    window.newMystery = newMystery;

    initializePlots();
})();
