(function() {
    'use strict';

    // === Constants ===
    var TWO_PI = 2 * Math.PI;

    // === Explorer 1: Beat Generator ===
    function plotBeats() {
        var f1 = parseFloat(document.getElementById('bt-f1-slider').value);
        var f2 = parseFloat(document.getElementById('bt-f2-slider').value);
        var A1 = parseFloat(document.getElementById('bt-a1-slider').value);
        var A2 = parseFloat(document.getElementById('bt-a2-slider').value);

        var omega1 = TWO_PI * f1;
        var omega2 = TWO_PI * f2;
        var df = Math.abs(f1 - f2);
        var fAvg = (f1 + f2) / 2;
        var fBeat = df; // beat frequency = |f1 - f2|

        // Time range: show at least 2-3 full beat cycles (or 10 carrier cycles if no beats)
        var tMax;
        if (df > 0.01) {
            tMax = Math.max(3 / df, 5 / fAvg);
        } else {
            tMax = 10 / fAvg;
        }
        if (tMax > 50) tMax = 50;
        var N = 2000;

        var t = [], y1 = [], y2 = [], ySum = [], envUp = [], envDown = [];
        for (var i = 0; i <= N; i++) {
            var ti = tMax * i / N;
            t.push(ti);
            var v1 = A1 * Math.cos(omega1 * ti);
            var v2 = A2 * Math.cos(omega2 * ti);
            y1.push(v1);
            y2.push(v2);
            ySum.push(v1 + v2);

            // Envelope for equal amplitudes: 2A|cos(Δω·t/2)|
            // For unequal: use general formula
            if (Math.abs(A1 - A2) < 0.01) {
                var env = 2 * A1 * Math.abs(Math.cos((omega1 - omega2) * ti / 2));
                envUp.push(env);
                envDown.push(-env);
            } else {
                // General envelope: sqrt(A1² + A2² + 2A1A2 cos(Δω·t))
                var Aenv = Math.sqrt(A1*A1 + A2*A2 + 2*A1*A2*Math.cos((omega1 - omega2) * ti));
                envUp.push(Aenv);
                envDown.push(-Aenv);
            }
        }

        var yMax = (A1 + A2) * 1.2;

        var traces = [];
        traces.push({x:t, y:y1, mode:'lines', line:{color:'rgba(0,243,255,0.3)', width:1, dash:'dot'}, name:'x\u2081 (f\u2081='+f1.toFixed(1)+' Hz)', visible:'legendonly'});
        traces.push({x:t, y:y2, mode:'lines', line:{color:'rgba(255,0,255,0.3)', width:1, dash:'dot'}, name:'x\u2082 (f\u2082='+f2.toFixed(1)+' Hz)', visible:'legendonly'});
        traces.push({x:t, y:ySum, mode:'lines', line:{color:'#ffff00', width:1.5}, name:'Sum'});
        traces.push({x:t, y:envUp, mode:'lines', line:{color:'#ff6b6b', width:2, dash:'dash'}, name:'Envelope'});
        traces.push({x:t, y:envDown, mode:'lines', line:{color:'#ff6b6b', width:2, dash:'dash'}, showlegend:false});

        var layout = {
            title:{text:'Beat Pattern: f\u2081 = '+f1.toFixed(1)+' Hz, f\u2082 = '+f2.toFixed(1)+' Hz', font:{size:14}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-yMax, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('bt-beat-plot', traces, layout);

        // Stats
        var statsDiv = document.getElementById('bt-beat-stats');
        if (statsDiv) {
            var beatPeriod = df > 0.01 ? (1/df).toFixed(2) + ' s' : '\u221E';
            var interf = '';
            if (df < 0.01) interf = '<span style="color:#00ff9f">Same frequency \u2014 no beats</span>';
            else if (df < 2) interf = '<span style="color:#ffff00">Slow beats \u2014 audible modulation</span>';
            else interf = '<span style="color:#00f3ff">Fast beats</span>';

            statsDiv.innerHTML =
                '<span>f<sub>beat</sub> = |f\u2081 \u2212 f\u2082| = <strong>'+df.toFixed(2)+' Hz</strong></span>'+
                '<span>T<sub>beat</sub> = <strong>'+beatPeriod+'</strong></span>'+
                '<span>f<sub>carrier</sub> = (f\u2081+f\u2082)/2 = <strong>'+fAvg.toFixed(2)+' Hz</strong></span>'+
                interf;
        }
    }

    // === Explorer 2: Anatomy of a Beat ===
    function plotAnatomy() {
        var f1 = parseFloat(document.getElementById('bt-an-f1-slider').value);
        var f2 = parseFloat(document.getElementById('bt-an-f2-slider').value);
        var A = 1.0; // Equal amplitudes for clean decomposition

        var omega1 = TWO_PI * f1;
        var omega2 = TWO_PI * f2;
        var omegaAvg = (omega1 + omega2) / 2;
        var omegaDiff = (omega1 - omega2) / 2;
        var df = Math.abs(f1 - f2);
        var fAvg = (f1 + f2) / 2;

        // Time range
        var tMax;
        if (df > 0.01) {
            tMax = Math.max(3 / df, 5 / fAvg);
        } else {
            tMax = 10 / fAvg;
        }
        if (tMax > 50) tMax = 50;
        var N = 2000;

        var t = [], ySum = [], yCarrier = [], yEnvelope = [], yEnvNeg = [];
        for (var i = 0; i <= N; i++) {
            var ti = tMax * i / N;
            t.push(ti);

            // Full sum
            var v1 = A * Math.cos(omega1 * ti);
            var v2 = A * Math.cos(omega2 * ti);
            ySum.push(v1 + v2);

            // Product-to-sum decomposition: 2A cos(ωavg·t) cos(Δω·t)
            var carrier = Math.cos(omegaAvg * ti);
            var envelope = 2 * A * Math.cos(omegaDiff * ti);
            yCarrier.push(carrier);
            yEnvelope.push(envelope);
            yEnvNeg.push(-Math.abs(envelope));
        }

        // LEFT: Sum with envelope
        var traces1 = [];
        traces1.push({x:t, y:ySum, mode:'lines', line:{color:'#ffff00', width:1.5}, name:'x\u2081 + x\u2082'});
        traces1.push({x:t, y:yEnvelope, mode:'lines', line:{color:'#ff6b6b', width:2, dash:'dash'}, name:'Envelope'});
        var envNegAbs = [];
        for (var i = 0; i <= N; i++) {
            envNegAbs.push(-Math.abs(yEnvelope[i]));
        }
        traces1.push({x:t, y:envNegAbs, mode:'lines', line:{color:'#ff6b6b', width:2, dash:'dash'}, showlegend:false});

        var layout1 = {
            title:{text:'Sum = Carrier \u00D7 Envelope', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-2.5, 2.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('bt-anatomy-sum-plot', traces1, layout1);

        // RIGHT: Separated carrier and envelope
        var traces2 = [];
        traces2.push({x:t, y:yCarrier, mode:'lines', line:{color:'#00f3ff', width:1.5}, name:'Carrier: cos(\u03C9\u2090\u1D65\u1D4D t)'});
        // Normalize envelope to [-1, 1] for visual comparison
        var envNorm = [];
        for (var i = 0; i <= N; i++) {
            envNorm.push(yEnvelope[i] / (2*A));
        }
        traces2.push({x:t, y:envNorm, mode:'lines', line:{color:'#ff6b6b', width:2.5}, name:'Envelope: cos(\u0394\u03C9 t/2)'});

        // Beat markers: where envelope = 0 (nodes of the beat)
        if (df > 0.01) {
            var beatPeriod = 1 / df;
            var nodeMarkerX = [], nodeMarkerY = [];
            for (var k = 0; k < 10; k++) {
                var tNode = (2*k + 1) * beatPeriod / 2;
                if (tNode > tMax) break;
                nodeMarkerX.push(tNode);
                nodeMarkerY.push(0);
            }
            if (nodeMarkerX.length > 0) {
                traces2.push({
                    x:nodeMarkerX, y:nodeMarkerY, mode:'markers',
                    marker:{size:10, color:'#ff6b6b', symbol:'x'},
                    name:'Beat nodes', showlegend:true
                });
            }
        }

        var layout2 = {
            title:{text:'Decomposed Components', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Normalized', range:[-1.5, 1.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('bt-anatomy-comp-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('bt-anatomy-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>f<sub>carrier</sub> = (f\u2081+f\u2082)/2 = <strong>'+fAvg.toFixed(2)+' Hz</strong></span>'+
                '<span>\u0394f = |f\u2081\u2212f\u2082| = <strong>'+df.toFixed(2)+' Hz</strong></span>'+
                '<span>f<sub>envelope</sub> = \u0394f/2 = <strong>'+(df/2).toFixed(2)+' Hz</strong></span>'+
                '<span>f<sub>beat</sub> = \u0394f = <strong>'+df.toFixed(2)+' Hz</strong></span>'+
                '<span style="color:#00f3ff">2 peaks per envelope cycle \u2192 f<sub>beat</sub> = 2 \u00D7 f<sub>envelope</sub></span>';
        }
    }

    // === Explorer 3: Beat Frequency Predictor ===
    var predState = {f1: 5, f2: 5.5, score: 0, round: 1};

    function newPrediction() {
        // Random f1 in [3, 8], f2 close to f1 (within ±2 Hz)
        predState.f1 = 3 + Math.random() * 5;
        predState.f2 = predState.f1 + 0.2 + Math.random() * 1.8;
        // Sometimes make f2 < f1
        if (Math.random() < 0.3) {
            var temp = predState.f1;
            predState.f1 = predState.f2;
            predState.f2 = temp;
        }
        predState.f1 = Math.round(predState.f1 * 10) / 10;
        predState.f2 = Math.round(predState.f2 * 10) / 10;

        var promptDiv = document.getElementById('bt-pred-prompt');
        if (promptDiv) {
            promptDiv.innerHTML =
                'Round '+predState.round+': Two tuning forks vibrate at <strong>f\u2081 = '+
                predState.f1.toFixed(1)+' Hz</strong> and <strong>f\u2082 = '+
                predState.f2.toFixed(1)+' Hz</strong>. What is the <strong>beat frequency</strong> '+
                'and the <strong>beat period</strong>?';
        }

        // Clear inputs
        var fbInput = document.getElementById('bt-pred-fbeat');
        var tbInput = document.getElementById('bt-pred-tbeat');
        if (fbInput) fbInput.value = '';
        if (tbInput) tbInput.value = '';

        // Clear feedback
        var fb = document.getElementById('bt-pred-feedback');
        if (fb) fb.innerHTML = '';

        plotPrediction(false);
    }

    function plotPrediction(showAnswer) {
        var f1 = predState.f1;
        var f2 = predState.f2;
        var omega1 = TWO_PI * f1;
        var omega2 = TWO_PI * f2;
        var df = Math.abs(f1 - f2);
        var fAvg = (f1 + f2) / 2;

        // Time range: show 3 beat cycles
        var tMax = df > 0.01 ? Math.max(3 / df, 5 / fAvg) : 10 / fAvg;
        if (tMax > 50) tMax = 50;
        var N = 2000;

        var t = [], ySum = [], envUp = [], envDown = [];
        for (var i = 0; i <= N; i++) {
            var ti = tMax * i / N;
            t.push(ti);
            ySum.push(Math.cos(omega1 * ti) + Math.cos(omega2 * ti));
            var env = 2 * Math.abs(Math.cos((omega1 - omega2) * ti / 2));
            envUp.push(env);
            envDown.push(-env);
        }

        var traces = [];
        traces.push({x:t, y:ySum, mode:'lines', line:{color:'#ffff00', width:1.5}, name:'Sum'});

        if (showAnswer) {
            traces.push({x:t, y:envUp, mode:'lines', line:{color:'#ff6b6b', width:2, dash:'dash'}, name:'Envelope'});
            traces.push({x:t, y:envDown, mode:'lines', line:{color:'#ff6b6b', width:2, dash:'dash'}, showlegend:false});

            // Mark beat period
            if (df > 0.01) {
                var Tbeat = 1 / df;
                for (var k = 0; k < 5; k++) {
                    var tMark = k * Tbeat;
                    if (tMark > tMax) break;
                    traces.push({
                        x:[tMark, tMark], y:[-2.5, 2.5], mode:'lines',
                        line:{color:'rgba(0,255,159,0.4)', width:1, dash:'dot'},
                        showlegend: k === 0, name: 'T\u2082\u2091\u2090\u209C = '+ Tbeat.toFixed(2)+' s'
                    });
                }
            }
        }

        var titleText = showAnswer ? 'Beat Pattern (f\u2082\u2091\u2090\u209C = '+df.toFixed(2)+' Hz)' : 'Beat Pattern \u2014 what is f\u2082\u2091\u2090\u209C?';
        var layout = {
            title:{text:titleText, font:{size:14}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-2.5, 2.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('bt-pred-plot', traces, layout);
    }

    window.submitPrediction = function() {
        var fbInput = document.getElementById('bt-pred-fbeat');
        var tbInput = document.getElementById('bt-pred-tbeat');
        if (!fbInput || !tbInput) return;

        var guessFbeat = parseFloat(fbInput.value);
        var guessTbeat = parseFloat(tbInput.value);
        if (isNaN(guessFbeat) && isNaN(guessTbeat)) return;

        var df = Math.abs(predState.f1 - predState.f2);
        var Tbeat = 1 / df;

        var fError = isNaN(guessFbeat) ? 999 : Math.abs(guessFbeat - df);
        var tError = isNaN(guessTbeat) ? 999 : Math.abs(guessTbeat - Tbeat);
        var fRelErr = fError / df * 100;
        var tRelErr = tError / Tbeat * 100;

        plotPrediction(true);

        var fb = document.getElementById('bt-pred-feedback');
        if (fb) {
            var parts = [];
            if (!isNaN(guessFbeat)) {
                if (fRelErr < 5) {
                    parts.push('<span style="color:#00ff9f">\u2714 f<sub>beat</sub> = '+guessFbeat.toFixed(2)+' Hz (correct! Actual: '+df.toFixed(2)+' Hz)</span>');
                } else {
                    parts.push('<span style="color:#ff6b6b">\u2718 f<sub>beat</sub> = '+guessFbeat.toFixed(2)+' Hz (actual: '+df.toFixed(2)+' Hz)</span>');
                }
            }
            if (!isNaN(guessTbeat)) {
                if (tRelErr < 10) {
                    parts.push('<span style="color:#00ff9f">\u2714 T<sub>beat</sub> = '+guessTbeat.toFixed(2)+' s (correct! Actual: '+Tbeat.toFixed(2)+' s)</span>');
                } else {
                    parts.push('<span style="color:#ff6b6b">\u2718 T<sub>beat</sub> = '+guessTbeat.toFixed(2)+' s (actual: '+Tbeat.toFixed(2)+' s)</span>');
                }
            }

            if (fRelErr < 5 && tRelErr < 10) {
                predState.score++;
                parts.push('<span style="color:#00ff9f"><strong>Both correct! Score: '+predState.score+'</strong></span>');
            } else {
                parts.push('<span style="color:#ffff00">Remember: f<sub>beat</sub> = |f\u2081 \u2212 f\u2082| and T<sub>beat</sub> = 1/f<sub>beat</sub></span>');
            }
            fb.innerHTML = parts.join('<br>');
        }
    };

    window.nextPrediction = function() {
        predState.round++;
        newPrediction();
    };

    window.resetPredictor = function() {
        predState.score = 0;
        predState.round = 1;
        newPrediction();
    };

    // === Event Handlers ===
    function attachEventHandlers() {
        // Explorer 1 sliders
        var sliderIds1 = ['bt-f1-slider','bt-f2-slider','bt-a1-slider','bt-a2-slider'];
        for (var i = 0; i < sliderIds1.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) {
                        var v = label.querySelector('.control-label-value');
                        if (v) {
                            if (sid.indexOf('f') >= 0 && sid.indexOf('a') < 0) {
                                v.textContent = parseFloat(this.value).toFixed(1) + ' Hz';
                            } else {
                                v.textContent = this.value;
                            }
                        }
                    }
                    plotBeats();
                });
            })(sliderIds1[i]);
        }

        // Explorer 2 sliders
        var sliderIds2 = ['bt-an-f1-slider','bt-an-f2-slider'];
        for (var i = 0; i < sliderIds2.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) {
                        var v = label.querySelector('.control-label-value');
                        if (v) v.textContent = parseFloat(this.value).toFixed(1) + ' Hz';
                    }
                    plotAnatomy();
                });
            })(sliderIds2[i]);
        }
    }

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('bt-beat-plot');
        var p2 = document.getElementById('bt-anatomy-sum-plot');
        var p3 = document.getElementById('bt-pred-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        plotBeats();
        plotAnatomy();
        newPrediction();
        attachEventHandlers();
    }

    // === Global resets ===
    window.resetBeats = function() {
        var defs = {
            'bt-f1-slider': ['5.0','5.0 Hz'], 'bt-f2-slider': ['5.5','5.5 Hz'],
            'bt-a1-slider': ['1.0','1.0'], 'bt-a2-slider': ['1.0','1.0']
        };
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotBeats();
    };

    window.resetAnatomy = function() {
        var defs = {
            'bt-an-f1-slider': ['5.0','5.0 Hz'], 'bt-an-f2-slider': ['5.5','5.5 Hz']
        };
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotAnatomy();
    };

    initializePlots();
})();
