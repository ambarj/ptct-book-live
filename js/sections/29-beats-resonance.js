(function() {
    'use strict';

    var N_PTS = 1000;

    // Undamped driven oscillator: x'' + ω₀²x = (F₀/m)cos(ω_d t)
    // Solution (x(0)=0, v(0)=0, ω_d ≠ ω₀):
    //   x(t) = [F₀/m / (ω₀²-ω_d²)] [cos(ω_d t) - cos(ω₀ t)]
    // Using product-to-sum: = [2F₀/m / (ω₀²-ω_d²)] sin(Δω t/2) sin(ω_avg t)
    // where Δω = ω₀ - ω_d, ω_avg = (ω₀ + ω_d)/2

    // Damped driven: includes transient decay
    function drivenDamped(t, omega0, omegaD, gamma, F0m) {
        // Steady-state
        var denom2 = Math.pow(omega0*omega0 - omegaD*omegaD, 2) + Math.pow(2*gamma*omegaD, 2);
        var A = F0m / Math.sqrt(denom2);
        var delta = Math.atan2(2*gamma*omegaD, omega0*omega0 - omegaD*omegaD);
        var xSS = A * Math.cos(omegaD * t - delta);

        // Transient from IC: x(0)=0, v(0)=0
        var xS0 = A * Math.cos(delta);
        var vS0 = A * omegaD * Math.sin(delta);
        var xT0 = -xS0;
        var vT0 = -vS0;

        var disc = gamma*gamma - omega0*omega0;
        var xTrans;
        if (disc < -1e-10) {
            var wd = Math.sqrt(-disc);
            xTrans = Math.exp(-gamma * t) * (xT0 * Math.cos(wd * t) + (vT0 + gamma*xT0)/wd * Math.sin(wd * t));
        } else {
            xTrans = (xT0 + (vT0 + gamma*xT0)*t) * Math.exp(-gamma * t);
        }
        return {total: xTrans + xSS, steady: xSS, transient: xTrans};
    }

    // Undamped driven: exact formula for beats
    function drivenUndamped(t, omega0, omegaD, F0m) {
        var diff = omega0*omega0 - omegaD*omegaD;
        if (Math.abs(diff) < 1e-6) {
            // Exact resonance: x(t) = (F₀/2mω₀) t sin(ω₀t)
            return F0m / (2*omega0) * t * Math.sin(omega0 * t);
        }
        return F0m / diff * (Math.cos(omegaD * t) - Math.cos(omega0 * t));
    }

    // Beat envelope for undamped: ±2(F₀/m)|sin(Δω t/2)| / |ω₀²-ω_d²|
    function beatEnvelope(t, omega0, omegaD, F0m) {
        var diff = omega0*omega0 - omegaD*omegaD;
        if (Math.abs(diff) < 1e-6) return F0m / (2*omega0) * t;
        var halfDw = (omega0 - omegaD) / 2;
        return 2 * F0m / Math.abs(diff) * Math.abs(Math.sin(halfDw * t));
    }

    // === Explorer 1: Beat Visualizer ===
    function plotBeats() {
        var omegaD = parseFloat(document.getElementById('bt-bv-wd').value);
        var dampToggle = document.getElementById('bt-bv-damp');
        var hasDamping = dampToggle && dampToggle.checked;
        var omega0 = 3.0;
        var F0m = 1.0;
        var gamma = hasDamping ? 0.08 : 0;

        var dw = Math.abs(omega0 - omegaD);
        var tBeat = dw > 0.01 ? 2 * Math.PI / dw : 100;
        var tMax = Math.min(Math.max(4 * tBeat, 20), 80);

        var t = [], x = [], envP = [], envM = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tMax * i / N_PTS;
            t.push(ti);
            if (hasDamping) {
                var sol = drivenDamped(ti, omega0, omegaD, gamma, F0m);
                x.push(sol.total);
            } else {
                x.push(drivenUndamped(ti, omega0, omegaD, F0m));
            }
            var env = beatEnvelope(ti, omega0, omegaD, F0m);
            if (hasDamping) env *= Math.exp(-gamma * ti);
            envP.push(env);
            envM.push(-env);
        }

        var yMax = Math.max.apply(null, envP.map(Math.abs)) * 1.15;
        if (yMax < 1) yMax = 1;
        if (yMax > 20) yMax = 20;

        var traces = [];
        traces.push({x:t, y:envP, mode:'lines', line:{color:'rgba(255,107,107,0.6)', width:1.5, dash:'dash'}, name:'Envelope'});
        traces.push({x:t, y:envM, mode:'lines', line:{color:'rgba(255,107,107,0.6)', width:1.5, dash:'dash'}, showlegend:false});
        traces.push({x:t, y:x, mode:'lines', line:{color:'#00f3ff', width:1.5}, name:'x(t)'});

        var layout = {
            title:{text:(hasDamping ? 'Damped' : 'Undamped') + ' Beats: \u03C9_d = '+omegaD.toFixed(2), font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-yMax, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.6, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('bt-bv-plot', traces, layout);

        // Right: frequency spectrum view (conceptual)
        var wAvg = (omega0 + omegaD) / 2;
        var halfDw = dw / 2;

        var traces2 = [];
        // Two frequency peaks
        var wPlot = [], sPeak = [];
        for (var i = 0; i <= 200; i++) {
            var w = 0.5 + 5.0 * i / 200;
            wPlot.push(w);
            var s1 = 1.0 / (1 + Math.pow((w - omega0)*5, 2));
            var s2 = 1.0 / (1 + Math.pow((w - omegaD)*5, 2));
            sPeak.push(s1 + s2);
        }
        traces2.push({x:wPlot, y:sPeak, mode:'lines', line:{color:'#ff00ff', width:2.5}, fill:'tozeroy',
            fillcolor:'rgba(255,0,255,0.15)', name:'Frequencies'});
        // Mark ω₀ and ω_d
        traces2.push({x:[omega0], y:[1], mode:'markers+text', marker:{size:10, color:'#00ff9f'},
            text:['\u03C9\u2080='+omega0.toFixed(1)], textposition:'top center', textfont:{size:10, color:'#00ff9f'},
            showlegend:false});
        traces2.push({x:[omegaD], y:[1], mode:'markers+text', marker:{size:10, color:'#00f3ff'},
            text:['\u03C9_d='+omegaD.toFixed(2)], textposition:'top center', textfont:{size:10, color:'#00f3ff'},
            showlegend:false});
        // Show Δω
        if (dw > 0.1) {
            traces2.push({x:[omegaD, omega0], y:[0.5, 0.5], mode:'lines+text',
                line:{color:'#ffff00', width:2},
                text:['', '\u0394\u03C9='+dw.toFixed(2)], textposition:['middle left','middle right'],
                textfont:{size:10, color:'#ffff00'}, showlegend:false});
        }

        var layout2 = {
            title:{text:'Frequency Content', font:{size:13}},
            xaxis:{title:'Frequency (rad/s)', range:[0.5, 5.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Power (a.u.)', range:[0, 2.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false,
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('bt-bv-freq-plot', traces2, layout2);

        var statsDiv = document.getElementById('bt-bv-stats');
        if (statsDiv) {
            var fBeat = dw / (2*Math.PI);
            statsDiv.innerHTML =
                '<span>\u03C9\u2080 = <strong>'+omega0.toFixed(1)+'</strong></span>'+
                '<span>\u03C9<sub>d</sub> = <strong>'+omegaD.toFixed(2)+'</strong></span>'+
                '<span>\u0394\u03C9 = |\u03C9\u2080 \u2212 \u03C9<sub>d</sub>| = <strong>'+dw.toFixed(2)+'</strong></span>'+
                '<span>f<sub>beat</sub> = \u0394\u03C9/(2\u03C0) = <strong>'+fBeat.toFixed(3)+' Hz</strong></span>'+
                '<span>T<sub>beat</sub> = <strong>'+(fBeat > 0.001 ? (1/fBeat).toFixed(1) : '\u221E')+' s</strong></span>';
        }
    }

    // === Explorer 2: Approach to Resonance ===
    function plotApproach() {
        var omegaD = parseFloat(document.getElementById('bt-ap-wd').value);
        var omega0 = 3.0;
        var F0m = 1.0;

        var tMax = 60;
        var t = [], x = [], envP = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tMax * i / N_PTS;
            t.push(ti);
            x.push(drivenUndamped(ti, omega0, omegaD, F0m));
            envP.push(beatEnvelope(ti, omega0, omegaD, F0m));
        }

        var yMax = Math.min(Math.max.apply(null, envP) * 1.15, 25);

        var traces = [];
        traces.push({x:t, y:envP, mode:'lines', line:{color:'rgba(255,107,107,0.5)', width:1.5, dash:'dash'}, name:'Envelope'});
        traces.push({x:t, y:x, mode:'lines', line:{color:'#00f3ff', width:1.5}, name:'x(t)'});

        var layout = {
            title:{text:'Approaching Resonance: \u03C9_d = '+omegaD.toFixed(2), font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-yMax, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.6, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('bt-ap-plot', traces, layout);

        // Right: peak envelope vs Δω
        var dwArr = [], peakArr = [];
        for (var i = 1; i <= 100; i++) {
            var dw = 0.02 + 2.0 * i / 100;
            dwArr.push(dw);
            peakArr.push(2 * F0m / Math.abs(2*omega0*dw - dw*dw));
        }
        var currentDw = Math.abs(omega0 - omegaD);
        var currentPeak = currentDw > 0.01 ? 2 * F0m / Math.abs(omega0*omega0 - omegaD*omegaD) : 999;

        var traces2 = [];
        traces2.push({x:dwArr, y:peakArr, mode:'lines', line:{color:'#ff00ff', width:2.5}, name:'Peak envelope'});
        if (currentDw > 0.01 && currentPeak < 25) {
            traces2.push({x:[currentDw], y:[currentPeak], mode:'markers', marker:{size:14, color:'#00f3ff', symbol:'star'},
                name:'Current', showlegend:false});
        }
        // ω_d = ω₀ asymptote
        traces2.push({x:[0, 0], y:[0, 25], mode:'lines', line:{color:'rgba(255,255,0,0.4)', width:1.5, dash:'dashdot'},
            name:'\u0394\u03C9 \u2192 0 (\u221E)'});

        var layout2 = {
            title:{text:'Peak Envelope vs Detuning', font:{size:13}},
            xaxis:{title:'\u0394\u03C9 = |\u03C9\u2080 \u2212 \u03C9_d|', range:[0, 2], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Max amplitude', range:[0, 15], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.4, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('bt-ap-peak-plot', traces2, layout2);

        var statsDiv = document.getElementById('bt-ap-stats');
        if (statsDiv) {
            var dw = currentDw;
            var tBeat = dw > 0.01 ? 2 * Math.PI / dw : Infinity;
            statsDiv.innerHTML =
                '<span>\u0394\u03C9 = <strong>'+dw.toFixed(2)+'</strong></span>'+
                '<span>T<sub>beat</sub> = <strong>'+(tBeat < 500 ? tBeat.toFixed(1)+' s' : '\u221E')+' </strong></span>'+
                '<span>Peak amplitude = <strong>'+(currentPeak < 100 ? currentPeak.toFixed(2) : '\u221E')+'</strong></span>'+
                '<span>As \u0394\u03C9 \u2192 0: beats slow, amplitude \u2192 \u221E</span>';
        }
    }

    // === Explorer 3: Beat Frequency Challenge ===
    var challengeState = {
        targetDw: 0,
        omega0: 3.0,
        score: 0,
        attempts: 0
    };

    function newBeatChallenge() {
        challengeState.targetDw = 0.1 + Math.random() * 1.5; // Δω from 0.1 to 1.6
        document.getElementById('bt-ch-feedback').innerHTML = '';

        // Show the mystery beat pattern
        var omega0 = challengeState.omega0;
        var omegaD = omega0 - challengeState.targetDw;
        var F0m = 1.0;
        var dw = challengeState.targetDw;
        var tBeat = 2 * Math.PI / dw;
        var tMax = Math.min(4 * tBeat, 60);

        var t = [], x = [], envP = [], envM = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tMax * i / N_PTS;
            t.push(ti);
            x.push(drivenUndamped(ti, omega0, omegaD, F0m));
            var env = beatEnvelope(ti, omega0, omegaD, F0m);
            envP.push(env);
            envM.push(-env);
        }

        var yMax = Math.max.apply(null, envP) * 1.15;

        var traces = [];
        traces.push({x:t, y:envP, mode:'lines', line:{color:'rgba(255,107,107,0.5)', width:1.5, dash:'dash'}, name:'Envelope'});
        traces.push({x:t, y:envM, mode:'lines', line:{color:'rgba(255,107,107,0.5)', width:1.5, dash:'dash'}, showlegend:false});
        traces.push({x:t, y:x, mode:'lines', line:{color:'#00f3ff', width:1.5}, name:'Mystery beats'});

        var layout = {
            title:{text:'Mystery Beat Pattern (\u03C9\u2080 = 3.0)', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-yMax, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.6, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('bt-ch-plot', traces, layout);
    }

    function checkBeatGuess() {
        var guessStr = document.getElementById('bt-ch-guess').value;
        var guess = parseFloat(guessStr);
        if (isNaN(guess)) return;

        challengeState.attempts++;
        var actual = challengeState.targetDw;
        var err = Math.abs(guess - actual);
        var tol = 0.15;

        var feedback = document.getElementById('bt-ch-feedback');
        if (err <= tol) {
            challengeState.score++;
            feedback.innerHTML = '<span style="color:#00ff9f;">\u2705 Correct! \u0394\u03C9 = '+actual.toFixed(2)+
                ' (you guessed '+guess.toFixed(2)+'). Score: '+challengeState.score+'/'+challengeState.attempts+'</span>';
        } else {
            var hint = guess > actual ? 'Too high' : 'Too low';
            feedback.innerHTML = '<span style="color:#ff6b6b;">\u274C '+hint+'. \u0394\u03C9 = '+actual.toFixed(2)+
                ' (you guessed '+guess.toFixed(2)+'). Score: '+challengeState.score+'/'+challengeState.attempts+'</span>';
        }
    }

    // === Event Handlers ===
    function attachEventHandlers() {
        // Explorer 1
        var bvWd = document.getElementById('bt-bv-wd');
        if (bvWd) bvWd.addEventListener('input', function() {
            var lb = this.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
            plotBeats();
        });
        var dampToggle = document.getElementById('bt-bv-damp');
        if (dampToggle) dampToggle.addEventListener('change', plotBeats);

        // Explorer 2
        var apWd = document.getElementById('bt-ap-wd');
        if (apWd) apWd.addEventListener('input', function() {
            var lb = this.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
            plotApproach();
        });

        // Explorer 3
        var chBtn = document.getElementById('bt-ch-check');
        if (chBtn) chBtn.addEventListener('click', checkBeatGuess);
    }

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('bt-bv-plot');
        var p2 = document.getElementById('bt-ap-plot');
        var p3 = document.getElementById('bt-ch-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        plotBeats();
        plotApproach();
        newBeatChallenge();
        attachEventHandlers();
    }

    // === Global resets ===
    window.resetBeatVis = function() {
        var sl = document.getElementById('bt-bv-wd');
        if (sl) { sl.value = '2.70'; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '2.70'; } }
        var damp = document.getElementById('bt-bv-damp');
        if (damp) damp.checked = false;
        plotBeats();
    };

    window.resetApproach = function() {
        var sl = document.getElementById('bt-ap-wd');
        if (sl) { sl.value = '2.50'; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '2.50'; } }
        plotApproach();
    };

    window.newBeatChallenge = newBeatChallenge;

    initializePlots();
})();
