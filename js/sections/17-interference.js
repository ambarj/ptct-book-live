(function() {
    'use strict';

    // === Constants ===
    var TWO_PI = 2 * Math.PI;
    var N_PTS = 500;

    // === Explorer 1: Interference Visualizer ===
    function plotInterference() {
        var A1 = parseFloat(document.getElementById('if-a1-slider').value);
        var A2 = parseFloat(document.getElementById('if-a2-slider').value);
        var dPhi = parseFloat(document.getElementById('if-dphi-slider').value);
        var omega = 1.0;

        var t = [], y1 = [], y2 = [], ySum = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = 4 * TWO_PI * i / N_PTS;
            t.push(ti);
            var v1 = A1 * Math.cos(omega * ti);
            var v2 = A2 * Math.cos(omega * ti + dPhi);
            y1.push(v1);
            y2.push(v2);
            ySum.push(v1 + v2);
        }

        // Resultant amplitude from formula
        var Ares = Math.sqrt(A1*A1 + A2*A2 + 2*A1*A2*Math.cos(dPhi));
        var Amax = A1 + A2;
        var Amin = Math.abs(A1 - A2);

        var yMax = Math.max(Amax, 1) * 1.3;
        var traces = [];
        traces.push({x:t, y:y1, mode:'lines', line:{color:'#00f3ff', width:1.5, dash:'dot'}, name:'x\u2081 (A\u2081='+A1.toFixed(1)+')'});
        traces.push({x:t, y:y2, mode:'lines', line:{color:'#ff00ff', width:1.5, dash:'dot'}, name:'x\u2082 (A\u2082='+A2.toFixed(1)+')'});
        traces.push({x:t, y:ySum, mode:'lines', line:{color:'#ffff00', width:2.5}, name:'Sum (A='+Ares.toFixed(2)+')'});

        // Envelope lines
        var envUp = [], envDown = [];
        for (var i = 0; i <= N_PTS; i++) {
            envUp.push(Ares);
            envDown.push(-Ares);
        }
        traces.push({x:t, y:envUp, mode:'lines', line:{color:'rgba(255,255,0,0.3)', width:1, dash:'dash'}, name:'Envelope', showlegend:false});
        traces.push({x:t, y:envDown, mode:'lines', line:{color:'rgba(255,255,0,0.3)', width:1, dash:'dash'}, showlegend:false});

        var layout = {
            title:{text:'Same-Frequency Interference: x\u2081 + x\u2082', font:{size:14}},
            xaxis:{title:'t', range:[0, 4*TWO_PI], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-yMax, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('if-wave-plot', traces, layout);

        // Stats bar
        var statsDiv = document.getElementById('if-wave-stats');
        if (statsDiv) {
            var dPhiDeg = dPhi * 180 / Math.PI;
            var interf = '';
            if (Math.abs(Math.cos(dPhi) - 1) < 0.05) interf = '<span style="color:#00ff9f">Fully Constructive!</span>';
            else if (Math.abs(Math.cos(dPhi) + 1) < 0.05) interf = '<span style="color:#ff6b6b">Fully Destructive!</span>';
            else if (Math.cos(dPhi) > 0) interf = '<span style="color:#a0ffa0">Partial constructive</span>';
            else interf = '<span style="color:#ffa0a0">Partial destructive</span>';

            statsDiv.innerHTML =
                '<span>\u0394\u03C6 = '+dPhiDeg.toFixed(0)+'\u00B0</span>'+
                '<span>A\u00B2 = '+A1.toFixed(1)+'\u00B2 + '+A2.toFixed(1)+'\u00B2 + 2\u00B7'+A1.toFixed(1)+'\u00B7'+A2.toFixed(1)+'\u00B7cos('+dPhiDeg.toFixed(0)+'\u00B0)</span>'+
                '<span>A = <strong>'+Ares.toFixed(2)+'</strong></span>'+
                '<span>['+Amin.toFixed(1)+', '+Amax.toFixed(1)+']</span>'+
                interf;
        }
    }

    // === Explorer 2: Phasor Diagram ===
    function plotPhasor() {
        var A1 = parseFloat(document.getElementById('if-ph-a1-slider').value);
        var A2 = parseFloat(document.getElementById('if-ph-a2-slider').value);
        var dPhi = parseFloat(document.getElementById('if-ph-dphi-slider').value);
        var tSnap = parseFloat(document.getElementById('if-ph-time-slider').value);
        var omega = 1.0;

        // Phasor positions at time tSnap
        var angle1 = omega * tSnap;
        var angle2 = omega * tSnap + dPhi;
        var x1 = A1 * Math.cos(angle1);
        var y1p = A1 * Math.sin(angle1);
        var x2end = x1 + A2 * Math.cos(angle2);
        var y2end = y1p + A2 * Math.sin(angle2);

        // Resultant
        var Ares = Math.sqrt(A1*A1 + A2*A2 + 2*A1*A2*Math.cos(dPhi));
        var rMax = Math.max(A1 + A2, 1) * 1.3;

        // LEFT: Phasor diagram
        var traces1 = [];

        // Reference circle for A1
        var cx = [], cy = [];
        for (var i = 0; i <= 100; i++) {
            var a = TWO_PI * i / 100;
            cx.push(A1 * Math.cos(a));
            cy.push(A1 * Math.sin(a));
        }
        traces1.push({x:cx, y:cy, mode:'lines', line:{color:'rgba(0,243,255,0.15)', width:1}, showlegend:false, hoverinfo:'skip'});

        // Phasor 1: origin -> tip1
        traces1.push({
            x:[0, x1], y:[0, y1p], mode:'lines+markers',
            line:{color:'#00f3ff', width:3},
            marker:{size:[0, 8], color:'#00f3ff', symbol:'arrow', angleref:'previous'},
            name:'A\u2081 = '+A1.toFixed(1)
        });

        // Phasor 2: tip1 -> tip2 (tail-to-tip addition)
        traces1.push({
            x:[x1, x2end], y:[y1p, y2end], mode:'lines+markers',
            line:{color:'#ff00ff', width:3},
            marker:{size:[0, 8], color:'#ff00ff', symbol:'arrow', angleref:'previous'},
            name:'A\u2082 = '+A2.toFixed(1)
        });

        // Resultant: origin -> tip2
        traces1.push({
            x:[0, x2end], y:[0, y2end], mode:'lines+markers',
            line:{color:'#ffff00', width:3},
            marker:{size:[0, 10], color:'#ffff00', symbol:'arrow', angleref:'previous'},
            name:'A = '+Ares.toFixed(2)
        });

        // Angle arc for Δφ
        var arcX = [], arcY = [];
        var arcR = Math.min(A1, A2) * 0.3;
        if (arcR < 0.15) arcR = 0.15;
        var aStart = angle1;
        var aEnd = angle2;
        var nArc = 40;
        for (var i = 0; i <= nArc; i++) {
            var a = aStart + (aEnd - aStart) * i / nArc;
            arcX.push(x1 + arcR * Math.cos(a));
            arcY.push(y1p + arcR * Math.sin(a));
        }
        traces1.push({x:arcX, y:arcY, mode:'lines', line:{color:'#ffff00', width:1.5, dash:'dot'}, name:'\u0394\u03C6', showlegend:false, hoverinfo:'skip'});

        // Projection line (real part = displacement)
        traces1.push({
            x:[x2end, x2end], y:[y2end, 0], mode:'lines',
            line:{color:'rgba(255,255,0,0.3)', width:1, dash:'dot'}, showlegend:false, hoverinfo:'skip'
        });
        traces1.push({
            x:[x2end], y:[0], mode:'markers',
            marker:{size:8, color:'#ffff00', symbol:'diamond'}, showlegend:false,
            name:'Re = '+x2end.toFixed(2)
        });

        var layout1 = {
            title:{text:'Phasor Diagram (t = '+(tSnap/Math.PI).toFixed(1)+'\u03C0)', font:{size:13}},
            xaxis:{title:'Re', range:[-rMax, rMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080', scaleanchor:'y'},
            yaxis:{title:'Im', range:[-rMax, rMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('if-phasor-plot', traces1, layout1);

        // RIGHT: time-domain waveform with marker at tSnap
        var t = [], yy1 = [], yy2 = [], yySum = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = 4 * TWO_PI * i / N_PTS;
            t.push(ti);
            yy1.push(A1 * Math.cos(omega * ti));
            yy2.push(A2 * Math.cos(omega * ti + dPhi));
            yySum.push(A1 * Math.cos(omega * ti) + A2 * Math.cos(omega * ti + dPhi));
        }

        var traces2 = [];
        traces2.push({x:t, y:yy1, mode:'lines', line:{color:'#00f3ff', width:1, dash:'dot'}, name:'x\u2081'});
        traces2.push({x:t, y:yy2, mode:'lines', line:{color:'#ff00ff', width:1, dash:'dot'}, name:'x\u2082'});
        traces2.push({x:t, y:yySum, mode:'lines', line:{color:'#ffff00', width:2.5}, name:'Sum'});

        // Time marker
        var yAtT = A1*Math.cos(omega*tSnap) + A2*Math.cos(omega*tSnap + dPhi);
        traces2.push({
            x:[tSnap, tSnap], y:[-rMax, rMax], mode:'lines',
            line:{color:'rgba(255,255,255,0.3)', width:1, dash:'dash'}, showlegend:false, hoverinfo:'skip'
        });
        traces2.push({
            x:[tSnap], y:[yAtT], mode:'markers',
            marker:{size:10, color:'#ffff00', symbol:'diamond'}, showlegend:false,
            name:'x(t) = '+yAtT.toFixed(2)
        });

        var layout2 = {
            title:{text:'Time Domain', font:{size:13}},
            xaxis:{title:'t', range:[0, 4*TWO_PI], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-rMax, rMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('if-phasor-time-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('if-phasor-stats');
        if (statsDiv) {
            var dPhiDeg = dPhi * 180 / Math.PI;
            statsDiv.innerHTML =
                '<span>A\u2081 = '+A1.toFixed(1)+'</span>'+
                '<span>A\u2082 = '+A2.toFixed(1)+'</span>'+
                '<span>\u0394\u03C6 = '+dPhiDeg.toFixed(0)+'\u00B0</span>'+
                '<span>A<sub>result</sub> = <strong>'+Ares.toFixed(2)+'</strong></span>'+
                '<span>x(t) = <strong>'+yAtT.toFixed(2)+'</strong></span>';
        }
    }

    // === Explorer 3: Amplitude Challenge ===
    var challengeState = {A1: 1, A2: 1, targetA: 1.5, score: 0, round: 1};

    function newChallenge() {
        // Random A1 in [0.5, 2.0], A2 in [0.5, 2.0]
        challengeState.A1 = 0.5 + Math.random() * 1.5;
        challengeState.A2 = 0.5 + Math.random() * 1.5;
        // Target amplitude between |A1-A2| and A1+A2
        var Amin = Math.abs(challengeState.A1 - challengeState.A2);
        var Amax = challengeState.A1 + challengeState.A2;
        challengeState.targetA = Amin + Math.random() * (Amax - Amin);
        // Round to 2 decimals
        challengeState.A1 = Math.round(challengeState.A1 * 100) / 100;
        challengeState.A2 = Math.round(challengeState.A2 * 100) / 100;
        challengeState.targetA = Math.round(challengeState.targetA * 100) / 100;

        // Update display
        var promptDiv = document.getElementById('if-challenge-prompt');
        if (promptDiv) {
            promptDiv.innerHTML =
                'Round '+challengeState.round+': Given <strong>A\u2081 = '+challengeState.A1.toFixed(2)+
                '</strong> and <strong>A\u2082 = '+challengeState.A2.toFixed(2)+
                '</strong>, find the phase difference \u0394\u03C6 that gives a resultant amplitude of <strong>A = '+
                challengeState.targetA.toFixed(2)+'</strong>.';
        }

        // Clear input
        var inp = document.getElementById('if-challenge-input');
        if (inp) inp.value = '';

        // Clear feedback
        var fb = document.getElementById('if-challenge-feedback');
        if (fb) fb.innerHTML = '';

        plotChallenge(null);
    }

    function plotChallenge(guessDPhi) {
        var A1 = challengeState.A1;
        var A2 = challengeState.A2;
        var targetA = challengeState.targetA;
        var omega = 1.0;

        // LEFT: A vs Δφ curve
        var dpArr = [], aArr = [];
        for (var i = 0; i <= 360; i++) {
            var dp = i * Math.PI / 180;
            dpArr.push(i);
            aArr.push(Math.sqrt(A1*A1 + A2*A2 + 2*A1*A2*Math.cos(dp)));
        }

        var traces1 = [];
        traces1.push({x:dpArr, y:aArr, mode:'lines', line:{color:'#00f3ff', width:2.5}, name:'A(\u0394\u03C6)'});

        // Target line
        traces1.push({
            x:[0, 360], y:[targetA, targetA], mode:'lines',
            line:{color:'#ff6b6b', width:2, dash:'dash'}, name:'Target A = '+targetA.toFixed(2)
        });

        // Guess marker
        if (guessDPhi !== null) {
            var guessA = Math.sqrt(A1*A1 + A2*A2 + 2*A1*A2*Math.cos(guessDPhi * Math.PI / 180));
            traces1.push({
                x:[guessDPhi], y:[guessA], mode:'markers',
                marker:{size:14, color:'#ffff00', symbol:'star'}, name:'Your guess'
            });
        }

        var layout1 = {
            title:{text:'Amplitude vs Phase Difference', font:{size:13}},
            xaxis:{title:'\u0394\u03C6 (degrees)', range:[0, 360], dtick:45, gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Resultant A', range:[0, (A1+A2)*1.1], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('if-challenge-curve-plot', traces1, layout1);

        // RIGHT: resulting waveform if guess submitted
        var t = [], y1 = [], y2 = [], ySum = [];
        var showDPhi = guessDPhi !== null ? guessDPhi * Math.PI / 180 : 0;
        for (var i = 0; i <= N_PTS; i++) {
            var ti = 4 * TWO_PI * i / N_PTS;
            t.push(ti);
            var v1 = A1 * Math.cos(omega * ti);
            var v2 = A2 * Math.cos(omega * ti + showDPhi);
            y1.push(v1);
            y2.push(v2);
            ySum.push(v1 + v2);
        }

        var guessAres = Math.sqrt(A1*A1 + A2*A2 + 2*A1*A2*Math.cos(showDPhi));
        var yMax = (A1 + A2) * 1.3;

        var traces2 = [];
        traces2.push({x:t, y:y1, mode:'lines', line:{color:'#00f3ff', width:1, dash:'dot'}, name:'x\u2081'});
        traces2.push({x:t, y:y2, mode:'lines', line:{color:'#ff00ff', width:1, dash:'dot'}, name:'x\u2082'});
        traces2.push({x:t, y:ySum, mode:'lines', line:{color:'#ffff00', width:2.5}, name:'Sum (A='+guessAres.toFixed(2)+')'});

        // Target envelope
        traces2.push({x:t, y:t.map(function() { return targetA; }), mode:'lines', line:{color:'#ff6b6b', width:1, dash:'dash'}, name:'Target', showlegend:false});
        traces2.push({x:t, y:t.map(function() { return -targetA; }), mode:'lines', line:{color:'#ff6b6b', width:1, dash:'dash'}, showlegend:false});

        var titleText = guessDPhi !== null ? 'Your Waves (\u0394\u03C6 = '+guessDPhi.toFixed(0)+'\u00B0)' : 'Submit a guess to see the result';
        var layout2 = {
            title:{text:titleText, font:{size:13}},
            xaxis:{title:'t', range:[0, 4*TWO_PI], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-yMax, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('if-challenge-wave-plot', traces2, layout2);
    }

    window.submitChallenge = function() {
        var inp = document.getElementById('if-challenge-input');
        if (!inp) return;
        var guessDPhi = parseFloat(inp.value);
        if (isNaN(guessDPhi)) return;

        // Clamp to [0, 360]
        while (guessDPhi < 0) guessDPhi += 360;
        while (guessDPhi > 360) guessDPhi -= 360;

        var A1 = challengeState.A1;
        var A2 = challengeState.A2;
        var targetA = challengeState.targetA;

        var guessA = Math.sqrt(A1*A1 + A2*A2 + 2*A1*A2*Math.cos(guessDPhi * Math.PI / 180));
        var error = Math.abs(guessA - targetA);
        var relError = error / targetA * 100;

        plotChallenge(guessDPhi);

        // Compute correct Δφ
        var cosDP = (targetA*targetA - A1*A1 - A2*A2) / (2*A1*A2);
        cosDP = Math.max(-1, Math.min(1, cosDP));
        var correctDPhi = Math.acos(cosDP) * 180 / Math.PI;

        var fb = document.getElementById('if-challenge-feedback');
        if (fb) {
            if (relError < 5) {
                challengeState.score++;
                fb.innerHTML = '<span style="color:#00ff9f">\u2714 Excellent! Your amplitude: '+guessA.toFixed(2)+
                    ' (error: '+relError.toFixed(1)+'%). Correct \u0394\u03C6 \u2248 '+correctDPhi.toFixed(1)+'\u00B0. Score: '+
                    challengeState.score+'</span>';
            } else if (relError < 15) {
                fb.innerHTML = '<span style="color:#ffff00">\u2248 Close! Your amplitude: '+guessA.toFixed(2)+
                    ' (error: '+relError.toFixed(1)+'%). Correct \u0394\u03C6 \u2248 '+correctDPhi.toFixed(1)+'\u00B0. Try again or click Next.</span>';
            } else {
                fb.innerHTML = '<span style="color:#ff6b6b">\u2718 Off target. Your amplitude: '+guessA.toFixed(2)+
                    ' (error: '+relError.toFixed(1)+'%). Correct \u0394\u03C6 \u2248 '+correctDPhi.toFixed(1)+
                    '\u00B0. Use the formula: cos(\u0394\u03C6) = (A\u00B2 \u2212 A\u2081\u00B2 \u2212 A\u2082\u00B2) / (2A\u2081A\u2082).</span>';
            }
        }
    };

    window.nextChallenge = function() {
        challengeState.round++;
        newChallenge();
    };

    window.resetChallenge = function() {
        challengeState.score = 0;
        challengeState.round = 1;
        newChallenge();
    };

    // === Event Handlers ===
    function attachEventHandlers() {
        // Explorer 1 sliders
        var sliderIds1 = ['if-a1-slider','if-a2-slider','if-dphi-slider'];
        for (var i = 0; i < sliderIds1.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) {
                        var v = label.querySelector('.control-label-value');
                        if (v) {
                            if (sid === 'if-dphi-slider') {
                                v.textContent = (parseFloat(this.value)*180/Math.PI).toFixed(0) + '\u00B0';
                            } else {
                                v.textContent = this.value;
                            }
                        }
                    }
                    plotInterference();
                });
            })(sliderIds1[i]);
        }

        // Explorer 2 sliders
        var sliderIds2 = ['if-ph-a1-slider','if-ph-a2-slider','if-ph-dphi-slider','if-ph-time-slider'];
        for (var i = 0; i < sliderIds2.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) {
                        var v = label.querySelector('.control-label-value');
                        if (v) {
                            if (sid === 'if-ph-dphi-slider') {
                                v.textContent = (parseFloat(this.value)*180/Math.PI).toFixed(0) + '\u00B0';
                            } else if (sid === 'if-ph-time-slider') {
                                v.textContent = (parseFloat(this.value)/Math.PI).toFixed(1) + '\u03C0';
                            } else {
                                v.textContent = this.value;
                            }
                        }
                    }
                    plotPhasor();
                });
            })(sliderIds2[i]);
        }
    }

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('if-wave-plot');
        var p2 = document.getElementById('if-phasor-plot');
        var p3 = document.getElementById('if-challenge-curve-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        plotInterference();
        plotPhasor();
        newChallenge();
        attachEventHandlers();
    }

    // === Global resets ===
    window.resetInterference = function() {
        var defs = {
            'if-a1-slider': ['1.0','1.0'], 'if-a2-slider': ['1.0','1.0'],
            'if-dphi-slider': ['0','0\u00B0']
        };
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotInterference();
    };

    window.resetPhasor = function() {
        var defs = {
            'if-ph-a1-slider': ['1.0','1.0'], 'if-ph-a2-slider': ['1.0','1.0'],
            'if-ph-dphi-slider': ['0','0\u00B0'], 'if-ph-time-slider': ['0','0.0\u03C0']
        };
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotPhasor();
    };

    initializePlots();
})();
