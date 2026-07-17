(function() {
    'use strict';

    var N_PTS = 600;

    // Steady-state amplitude: A = (F0/m) / sqrt((ω₀²-ω_d²)² + (2γω_d)²)
    function steadyAmp(F0m, omega0, wd, gamma) {
        var denom2 = Math.pow(omega0*omega0 - wd*wd, 2) + Math.pow(2*gamma*wd, 2);
        return F0m / Math.sqrt(denom2);
    }

    // Phase lag: δ = atan2(2γω_d, ω₀²-ω_d²)
    function steadyPhase(omega0, wd, gamma) {
        return Math.atan2(2*gamma*wd, omega0*omega0 - wd*wd);
    }

    // Resonance frequency (amplitude): ω_res = √(ω₀²-2γ²) if positive
    function omegaRes(omega0, gamma) {
        var val = omega0*omega0 - 2*gamma*gamma;
        return val > 0 ? Math.sqrt(val) : 0;
    }

    // Peak amplitude at resonance
    function peakAmp(F0m, omega0, gamma) {
        var wR = omegaRes(omega0, gamma);
        if (wR <= 0) return steadyAmp(F0m, omega0, 0.01, gamma);
        return steadyAmp(F0m, omega0, wR, gamma);
    }

    // Quality factor Q = ω₀/(2γ)
    function qFactor(omega0, gamma) {
        return omega0 / (2*gamma);
    }

    // === Explorer 1: Resonance Explorer ===
    function plotResonance() {
        var omegaD = parseFloat(document.getElementById('rs-ex-wd').value);
        var gamma = 0.20;
        var omega0 = 3.0;
        var F0m = 1.0;

        var A = steadyAmp(F0m, omega0, omegaD, gamma);
        var delta = steadyPhase(omega0, omegaD, gamma);

        // Steady-state at current ω_d
        var tMax = 12;
        var t = [], xSS = [], fDrive = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tMax * i / N_PTS;
            t.push(ti);
            xSS.push(A * Math.cos(omegaD * ti - delta));
            fDrive.push(0.3 * Math.cos(omegaD * ti));
        }

        var traces = [];
        traces.push({x:t, y:fDrive, mode:'lines', line:{color:'rgba(255,255,0,0.35)', width:1.5, dash:'dot'},
            name:'Drive (scaled)'});
        traces.push({x:t, y:xSS, mode:'lines', line:{color:'#00f3ff', width:2.5},
            name:'Response (A='+A.toFixed(2)+')'});

        var layout = {
            title:{text:'Steady-State at \u03C9_d = '+omegaD.toFixed(2)+' rad/s', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-10, 10], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.45, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rs-ex-plot', traces, layout);

        // Right: amplitude response curve
        var wArr = [], aArr = [];
        for (var i = 0; i <= 300; i++) {
            var w = 0.05 + 5.95 * i / 300;
            wArr.push(w);
            aArr.push(steadyAmp(F0m, omega0, w, gamma));
        }

        var wR = omegaRes(omega0, gamma);
        var Apeak = peakAmp(F0m, omega0, gamma);

        var traces2 = [];
        traces2.push({x:wArr, y:aArr, mode:'lines', line:{color:'#ff00ff', width:2.5}, name:'A(\u03C9_d)'});
        traces2.push({x:[omegaD], y:[A], mode:'markers', marker:{size:14, color:'#00f3ff', symbol:'star'},
            name:'Current', showlegend:false});
        // Resonance marker
        if (wR > 0) {
            traces2.push({x:[wR, wR], y:[0, Apeak*1.05], mode:'lines',
                line:{color:'rgba(255,255,0,0.5)', width:1.5, dash:'dashdot'}, name:'\u03C9_res = '+wR.toFixed(2)});
        }

        var layout2 = {
            title:{text:'Amplitude Response Curve', font:{size:13}},
            xaxis:{title:'Driving frequency \u03C9_d (rad/s)', range:[0, 6], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Steady-state amplitude A', range:[0, 10], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.5, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rs-ex-amp-plot', traces2, layout2);

        var statsDiv = document.getElementById('rs-ex-stats');
        if (statsDiv) {
            var deltaDeg = delta * 180 / Math.PI;
            statsDiv.innerHTML =
                '<span>\u03C9\u2080 = <strong>'+omega0.toFixed(1)+'</strong></span>'+
                '<span>\u03C9<sub>d</sub> = <strong>'+omegaD.toFixed(2)+'</strong></span>'+
                '<span>A = <strong>'+A.toFixed(2)+'</strong></span>'+
                '<span>\u03B4 = <strong>'+deltaDeg.toFixed(1)+'\u00B0</strong></span>'+
                '<span>A<sub>peak</sub> = <strong>'+Apeak.toFixed(2)+'</strong></span>';
        }
    }

    // === Explorer 2: Damping Effect on Resonance ===
    function plotDampingEffect() {
        var gamma = parseFloat(document.getElementById('rs-dp-gamma').value);
        var omega0 = 3.0;
        var F0m = 1.0;

        // Amplitude response curve
        var wArr = [], aArr = [];
        for (var i = 0; i <= 300; i++) {
            var w = 0.05 + 5.95 * i / 300;
            wArr.push(w);
            aArr.push(steadyAmp(F0m, omega0, w, gamma));
        }

        // Reference curves at fixed γ values
        var refs = [
            {g:0.10, color:'rgba(0,243,255,0.25)', name:'\u03B3=0.10 (Q=15)'},
            {g:0.30, color:'rgba(0,255,159,0.25)', name:'\u03B3=0.30 (Q=5)'},
            {g:1.00, color:'rgba(255,0,255,0.25)', name:'\u03B3=1.00 (Q=1.5)'}
        ];

        var traces = [];
        for (var r = 0; r < refs.length; r++) {
            var aRef = [];
            for (var i = 0; i <= 300; i++) {
                var w = 0.05 + 5.95 * i / 300;
                aRef.push(steadyAmp(F0m, omega0, w, refs[r].g));
            }
            traces.push({x:wArr, y:aRef, mode:'lines', line:{color:refs[r].color, width:1.5, dash:'dot'}, name:refs[r].name});
        }

        var wR = omegaRes(omega0, gamma);
        var Ap = peakAmp(F0m, omega0, gamma);
        var Q = qFactor(omega0, gamma);

        traces.push({x:wArr, y:aArr, mode:'lines', line:{color:'#ff6b6b', width:3},
            name:'Your \u03B3='+gamma.toFixed(2)+' (Q='+Q.toFixed(1)+')'});

        // FWHM markers (half-power bandwidth)
        var halfPower = Ap / Math.sqrt(2);
        // Find left and right crossing points
        var wLeft = 0, wRight = 0;
        for (var i = 1; i < aArr.length; i++) {
            if (aArr[i] >= halfPower && aArr[i-1] < halfPower && wLeft === 0) wLeft = wArr[i];
            if (aArr[i] < halfPower && aArr[i-1] >= halfPower && wRight === 0 && wLeft > 0) wRight = wArr[i];
        }
        if (wLeft > 0 && wRight > 0) {
            traces.push({x:[wLeft, wRight], y:[halfPower, halfPower], mode:'lines+markers',
                line:{color:'#ffff00', width:1.5, dash:'dash'},
                marker:{size:6, color:'#ffff00'},
                name:'\u0394\u03C9 = '+(wRight-wLeft).toFixed(2)});
        }

        var yMax = Math.min(Math.max(Ap*1.2, 3), 20);
        var layout = {
            title:{text:'How Damping Shapes the Resonance Peak', font:{size:13}},
            xaxis:{title:'Driving frequency \u03C9_d', range:[0, 6], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Amplitude A', range:[0, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.5, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rs-dp-plot', traces, layout);

        // Right: phase response
        var phArr = [];
        for (var i = 0; i <= 300; i++) {
            var w = 0.05 + 5.95 * i / 300;
            phArr.push(steadyPhase(omega0, w, gamma) * 180 / Math.PI);
        }

        // Reference phase curves
        var traces2 = [];
        for (var r = 0; r < refs.length; r++) {
            var phRef = [];
            for (var i = 0; i <= 300; i++) {
                var w = 0.05 + 5.95 * i / 300;
                phRef.push(steadyPhase(omega0, w, refs[r].g) * 180 / Math.PI);
            }
            traces2.push({x:wArr, y:phRef, mode:'lines', line:{color:refs[r].color, width:1.5, dash:'dot'},
                name:refs[r].name, showlegend:false});
        }
        traces2.push({x:wArr, y:phArr, mode:'lines', line:{color:'#ff6b6b', width:3},
            name:'Phase \u03B4(\u03C9_d)'});
        // 90° reference
        traces2.push({x:[0, 6], y:[90, 90], mode:'lines', line:{color:'rgba(255,255,0,0.3)', width:1, dash:'dot'},
            name:'90\u00B0', showlegend:false});

        var layout2 = {
            title:{text:'Phase Response', font:{size:13}},
            xaxis:{title:'Driving frequency \u03C9_d', range:[0, 6], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Phase lag \u03B4 (degrees)', range:[0, 185], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.05, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rs-dp-phase-plot', traces2, layout2);

        var statsDiv = document.getElementById('rs-dp-stats');
        if (statsDiv) {
            var bw = (wLeft > 0 && wRight > 0) ? (wRight - wLeft) : 0;
            statsDiv.innerHTML =
                '<span>\u03B3 = <strong>'+gamma.toFixed(2)+'</strong></span>'+
                '<span>Q = \u03C9\u2080/(2\u03B3) = <strong>'+Q.toFixed(1)+'</strong></span>'+
                '<span>A<sub>peak</sub> = <strong>'+Ap.toFixed(2)+'</strong></span>'+
                '<span>\u0394\u03C9 = <strong>'+(bw > 0 ? bw.toFixed(2) : '---')+'</strong></span>'+
                '<span>Q \u2248 \u03C9\u2080/\u0394\u03C9 = <strong>'+(bw > 0 ? (omega0/bw).toFixed(1) : '---')+'</strong></span>';
        }
    }

    // === Explorer 3: Q Factor Visualizer ===
    function plotQFactor() {
        var omega0 = parseFloat(document.getElementById('rs-qf-omega0').value);
        var gamma = parseFloat(document.getElementById('rs-qf-gamma').value);
        var F0m = 1.0;

        var Q = qFactor(omega0, gamma);
        var wR = omegaRes(omega0, gamma);
        var Ap = peakAmp(F0m, omega0, gamma);

        // Multi-Q comparison
        var Qs = [1, 3, 10, 30];
        var qColors = ['#ff6b6b', '#ffff00', '#00f3ff', '#00ff9f'];

        var traces = [];
        for (var q = 0; q < Qs.length; q++) {
            var gq = omega0 / (2*Qs[q]);
            var wArr = [], aArr = [];
            for (var i = 0; i <= 300; i++) {
                var w = 0.05 + (2*omega0) * i / 300;
                wArr.push(w / omega0); // normalized frequency
                aArr.push(steadyAmp(F0m, omega0, w, gq));
            }
            traces.push({x:wArr, y:aArr, mode:'lines',
                line:{color:qColors[q], width:2}, name:'Q = '+Qs[q]});
        }

        // Current Q
        var wArr2 = [], aArr2 = [];
        for (var i = 0; i <= 300; i++) {
            var w = 0.05 + (2*omega0) * i / 300;
            wArr2.push(w / omega0);
            aArr2.push(steadyAmp(F0m, omega0, w, gamma));
        }
        traces.push({x:wArr2, y:aArr2, mode:'lines',
            line:{color:'#ff00ff', width:3, dash:'dash'},
            name:'Your Q = '+Q.toFixed(1)});

        var yMax = Math.min(Math.max(Ap*1.2, 5), 20);
        var layout = {
            title:{text:'Resonance Curves at Different Q', font:{size:13}},
            xaxis:{title:'\u03C9_d / \u03C9\u2080 (normalized)', range:[0, 2], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Amplitude', range:[0, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.6, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rs-qf-plot', traces, layout);

        // Right: Q vs γ curve and energy interpretation
        var gArr = [], qArr = [], apArr = [];
        for (var i = 1; i <= 200; i++) {
            var gi = 0.02 + 2.0 * i / 200;
            gArr.push(gi);
            qArr.push(qFactor(omega0, gi));
            apArr.push(peakAmp(F0m, omega0, gi));
        }

        var traces2 = [];
        traces2.push({x:gArr, y:qArr, mode:'lines', line:{color:'#00f3ff', width:2.5}, name:'Q(\u03B3)', yaxis:'y'});
        traces2.push({x:gArr, y:apArr, mode:'lines', line:{color:'#ff6b6b', width:2.5, dash:'dash'}, name:'A_peak(\u03B3)', yaxis:'y2'});
        // Mark current
        traces2.push({x:[gamma], y:[Q], mode:'markers', marker:{size:12, color:'#ff00ff', symbol:'star'},
            name:'Current', showlegend:false, yaxis:'y'});

        var layout2 = {
            title:{text:'Q Factor and Peak Amplitude vs Damping', font:{size:13}},
            xaxis:{title:'Damping \u03B3', range:[0, 2], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Q factor', range:[0, Math.max(Q*1.3, 20)], gridcolor:'#2a2f4a', zerolinecolor:'#808080',
                linecolor:'#00f3ff', titlefont:{color:'#00f3ff'}},
            yaxis2:{title:'Peak amplitude', range:[0, Math.max(Ap*1.3, 5)],
                overlaying:'y', side:'right', gridcolor:'transparent', zerolinecolor:'#808080',
                linecolor:'#ff6b6b', titlefont:{color:'#ff6b6b'}},
            showlegend:true, legend:{x:0.4, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:25}
        };
        createPlot('rs-qf-metrics-plot', traces2, layout2);

        var statsDiv = document.getElementById('rs-qf-stats');
        if (statsDiv) {
            // Q = 2\u03C0 \u00D7 (energy stored)/(energy lost per cycle), i.e. the
            // stored energy is Q times the energy lost per RADIAN
            statsDiv.innerHTML =
                '<span>\u03C9\u2080 = <strong>'+omega0.toFixed(1)+'</strong></span>'+
                '<span>\u03B3 = <strong>'+gamma.toFixed(2)+'</strong></span>'+
                '<span>Q = <strong>'+Q.toFixed(1)+'</strong></span>'+
                '<span>A<sub>peak</sub> \u2248 F\u2080/(2m\u03B3\u03C9\u2080) = <strong>'+Ap.toFixed(2)+'</strong></span>'+
                '<span>energy stored / energy lost per radian = Q = <strong>'+Q.toFixed(1)+'</strong></span>';
        }
    }

    // === Event Handlers ===
    function attachEventHandlers() {
        // Explorer 1
        var exWd = document.getElementById('rs-ex-wd');
        if (exWd) exWd.addEventListener('input', function() {
            var lb = this.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
            plotResonance();
        });

        // Explorer 2
        var dpGamma = document.getElementById('rs-dp-gamma');
        if (dpGamma) dpGamma.addEventListener('input', function() {
            var lb = this.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
            plotDampingEffect();
        });

        // Explorer 3
        var qfSliders = ['rs-qf-omega0','rs-qf-gamma'];
        for (var i = 0; i < qfSliders.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var lb = this.closest('.control-group');
                    if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
                    plotQFactor();
                });
            })(qfSliders[i]);
        }
    }

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('rs-ex-plot');
        var p2 = document.getElementById('rs-dp-plot');
        var p3 = document.getElementById('rs-qf-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        plotResonance();
        plotDampingEffect();
        plotQFactor();
        attachEventHandlers();
    }

    // === Global resets ===
    window.resetResonance = function() {
        var sl = document.getElementById('rs-ex-wd');
        if (sl) { sl.value = '2.00'; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '2.00'; } }
        plotResonance();
    };

    window.resetDampingEffect = function() {
        var sl = document.getElementById('rs-dp-gamma');
        if (sl) { sl.value = '0.30'; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '0.30'; } }
        plotDampingEffect();
    };

    window.resetQFactor = function() {
        var defs = {'rs-qf-omega0':['3.00','3.00'],'rs-qf-gamma':['0.30','0.30']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotQFactor();
    };

    initializePlots();
})();
