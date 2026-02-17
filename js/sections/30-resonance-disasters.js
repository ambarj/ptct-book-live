(function() {
    'use strict';

    var N_PTS = 800;

    // Steady-state amplitude for driven damped oscillator
    // A(ω_d) = (F₀/m) / √((ω₀²-ω_d²)² + (2γω_d)²)
    function steadyAmp(omega0, omegaD, gamma, F0m) {
        var d = Math.pow(omega0*omega0 - omegaD*omegaD, 2) + Math.pow(2*gamma*omegaD, 2);
        return F0m / Math.sqrt(d);
    }

    // Full driven damped solution (underdamped, x(0)=0, v(0)=0)
    function drivenResponse(t, omega0, omegaD, gamma, F0m) {
        var denom2 = Math.pow(omega0*omega0 - omegaD*omegaD, 2) + Math.pow(2*gamma*omegaD, 2);
        var A = F0m / Math.sqrt(denom2);
        var delta = Math.atan2(2*gamma*omegaD, omega0*omega0 - omegaD*omegaD);
        var xSS = A * Math.cos(omegaD * t - delta);

        var xS0 = A * Math.cos(delta);
        var vS0 = A * omegaD * Math.sin(delta);
        var disc = gamma*gamma - omega0*omega0;
        var xTrans;
        if (disc < -1e-10) {
            var wd = Math.sqrt(-disc);
            xTrans = Math.exp(-gamma * t) * (-xS0 * Math.cos(wd * t) + (-vS0 + gamma*xS0)/wd * Math.sin(wd * t));
        } else {
            xTrans = (-xS0 + (-vS0 + gamma*xS0)*t) * Math.exp(-gamma * t);
        }
        return {total: xTrans + xSS, steady: xSS, transient: xTrans};
    }

    // === Explorer 1: Bridge Stress Simulator ===
    function plotBridge() {
        var omegaD = parseFloat(document.getElementById('rd-br-wd').value);
        var gamma = parseFloat(document.getElementById('rd-br-gamma').value);
        var omega0 = 3.0;
        var F0m = 1.0;

        // Time-domain: build up of oscillation
        var tMax = 40;
        var t = [], x = [], envP = [];
        var maxAmp = 0;
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tMax * i / N_PTS;
            t.push(ti);
            var sol = drivenResponse(ti, omega0, omegaD, gamma, F0m);
            x.push(sol.total);
            var a = Math.abs(sol.total);
            if (a > maxAmp) maxAmp = a;
        }
        // Running max amplitude for stress indicator
        var runMax = [];
        var rMax = 0;
        for (var i = 0; i <= N_PTS; i++) {
            if (Math.abs(x[i]) > rMax) rMax = Math.abs(x[i]);
            runMax.push(rMax);
        }

        var ssAmp = steadyAmp(omega0, omegaD, gamma, F0m);
        var yMax = Math.max(ssAmp * 1.3, maxAmp * 1.15, 1.5);
        if (yMax > 20) yMax = 20;

        var traces = [];
        traces.push({x:t, y:runMax, mode:'lines', line:{color:'rgba(255,107,107,0.4)', width:1.5, dash:'dash'}, name:'Peak stress', fill:'tozeroy', fillcolor:'rgba(255,107,107,0.08)'});
        traces.push({x:t, y:x, mode:'lines', line:{color:'#00f3ff', width:1.5}, name:'Displacement'});

        // Danger threshold line
        var dangerLevel = 3.0;
        traces.push({x:[0, tMax], y:[dangerLevel, dangerLevel], mode:'lines', line:{color:'#ff4444', width:2, dash:'dot'}, name:'Danger threshold'});
        traces.push({x:[0, tMax], y:[-dangerLevel, -dangerLevel], mode:'lines', line:{color:'#ff4444', width:2, dash:'dot'}, showlegend:false});

        var layout = {
            title:{text:'Bridge Response: \u03C9_d = '+omegaD.toFixed(2)+' rad/s', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Displacement', range:[-yMax, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.55, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rd-br-plot', traces, layout);

        // Right panel: amplitude response curve with marker
        var wArr = [], aArr = [];
        for (var i = 0; i <= 200; i++) {
            var w = 0.1 + 5.9 * i / 200;
            wArr.push(w);
            aArr.push(steadyAmp(omega0, w, gamma, F0m));
        }

        var traces2 = [];
        traces2.push({x:wArr, y:aArr, mode:'lines', line:{color:'#ff00ff', width:2.5}, name:'A(\u03C9_d)', fill:'tozeroy', fillcolor:'rgba(255,0,255,0.08)'});
        traces2.push({x:[omegaD], y:[ssAmp], mode:'markers', marker:{size:14, color:'#00f3ff', symbol:'star'}, name:'Current \u03C9_d'});
        // Danger line
        traces2.push({x:[0.1, 6], y:[dangerLevel, dangerLevel], mode:'lines', line:{color:'#ff4444', width:2, dash:'dot'}, name:'Danger', showlegend:false});
        // Shade danger zone
        var dangerW = [], dangerA = [];
        for (var i = 0; i <= 200; i++) {
            if (aArr[i] >= dangerLevel) {
                dangerW.push(wArr[i]);
                dangerA.push(aArr[i]);
            }
        }
        if (dangerW.length > 0) {
            traces2.push({x:dangerW, y:dangerA, mode:'lines', line:{color:'rgba(255,68,68,0.6)', width:0}, fill:'tozeroy', fillcolor:'rgba(255,68,68,0.15)', name:'Danger zone', showlegend:false});
        }

        var aMax = Math.min(Math.max.apply(null, aArr) * 1.1, 20);
        var layout2 = {
            title:{text:'Amplitude Response (Danger Zone)', font:{size:13}},
            xaxis:{title:'Driving freq \u03C9_d (rad/s)', range:[0, 6], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Steady-state amplitude', range:[0, aMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.55, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rd-br-amp-plot', traces2, layout2);

        // Stats bar
        var statsDiv = document.getElementById('rd-br-stats');
        if (statsDiv) {
            var ratio = ssAmp / dangerLevel;
            var dangerClass = ratio > 1 ? 'color:#ff4444;font-weight:bold' : ratio > 0.7 ? 'color:#ffff00' : 'color:#00ff9f';
            var status = ratio > 1 ? 'DANGER' : ratio > 0.7 ? 'WARNING' : 'SAFE';
            statsDiv.innerHTML =
                '<span>\u03C9\u2080 = <strong>'+omega0.toFixed(1)+'</strong> rad/s</span>'+
                '<span>\u03C9<sub>d</sub> = <strong>'+omegaD.toFixed(2)+'</strong> rad/s</span>'+
                '<span>\u03B3 = <strong>'+gamma.toFixed(2)+'</strong></span>'+
                '<span>A<sub>ss</sub> = <strong>'+ssAmp.toFixed(2)+'</strong></span>'+
                '<span style="'+dangerClass+'">Status: '+status+'</span>';
        }
    }

    // === Explorer 2: Rescue the Bridge (TMD Designer) ===
    // TMD = tuned mass damper: secondary oscillator attached to primary
    // Effective: reduces peak amplitude at resonance
    // Model: primary + TMD, show amplitude reduction
    function plotTMD() {
        var massRatio = parseFloat(document.getElementById('rd-tmd-mu').value);  // μ = m₂/m₁
        var tmdGamma = parseFloat(document.getElementById('rd-tmd-gamma2').value);
        var primaryGamma = 0.05;  // light damping on primary structure
        var omega0 = 3.0;
        var F0m = 1.0;

        // TMD amplitude response: two-DOF system
        // Primary amplitude |X₁(ω)| with TMD attached:
        // A₁(ω) ≈ √((ω_t² - ω²)² + (2γ_t ω)²) /
        //          √(((ω₀²-ω²)(ω_t²-ω²) - μω_t²ω² - 4γ₀γ_t ω²)² + (2ω(γ_t(ω₀²-ω²) + γ₀(ω_t²-ω²) + μγ_t ω²))²)
        // With ω_t = ω₀ (tuned)

        var omegaT = omega0;  // TMD frequency tuned to primary
        var g1 = primaryGamma;
        var g2 = tmdGamma;

        function tmdAmplitude(omegaD) {
            var w2 = omegaD * omegaD;
            var w02 = omega0 * omega0;
            var wt2 = omegaT * omegaT;
            // Numerator: |(ω_t² - ω²) + 2iγ_t ω|
            var numR = wt2 - w2;
            var numI = 2 * g2 * omegaD;
            var num2 = numR*numR + numI*numI;
            // Denominator of coupled system
            var DR = (w02 - w2)*(wt2 - w2) - massRatio * wt2 * w2 - 4*g1*g2*w2;
            var DI = 2*omegaD*(g2*(w02 - w2) + g1*(wt2 - w2) + massRatio*g2*w2);
            var D2 = DR*DR + DI*DI;
            if (D2 < 1e-20) return 100;
            return F0m * Math.sqrt(num2 / D2);
        }

        // Without TMD (just primary with light damping)
        function noTMDAmplitude(omegaD) {
            return steadyAmp(omega0, omegaD, primaryGamma, F0m);
        }

        var wArr = [], aWithTMD = [], aWithout = [];
        for (var i = 0; i <= 300; i++) {
            var w = 0.1 + 5.9 * i / 300;
            wArr.push(w);
            aWithout.push(noTMDAmplitude(w));
            aWithTMD.push(tmdAmplitude(w));
        }

        var maxWithout = Math.max.apply(null, aWithout);
        var maxWith = Math.max.apply(null, aWithTMD);
        var yMax = Math.min(Math.max(maxWithout, maxWith) * 1.1, 25);

        var traces = [];
        traces.push({x:wArr, y:aWithout, mode:'lines', line:{color:'rgba(255,107,107,0.7)', width:2, dash:'dash'}, name:'Without TMD'});
        traces.push({x:wArr, y:aWithTMD, mode:'lines', line:{color:'#00f3ff', width:2.5}, name:'With TMD'});

        var layout = {
            title:{text:'Amplitude Response: TMD Effect', font:{size:13}},
            xaxis:{title:'Driving freq \u03C9_d (rad/s)', range:[0, 6], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Amplitude', range:[0, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.55, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rd-tmd-plot', traces, layout);

        // Right panel: reduction factor and metrics
        var peakReduction = (1 - maxWith / maxWithout) * 100;
        var barLabels = ['Without TMD', 'With TMD'];
        var barVals = [maxWithout, maxWith];
        var barColors = ['#ff6b6b', '#00f3ff'];

        var traces2 = [];
        traces2.push({x:barLabels, y:barVals, type:'bar', marker:{color:barColors}, width:0.5});
        // Reference line
        traces2.push({x:['Without TMD', 'With TMD'], y:[3, 3], mode:'lines', line:{color:'#ff4444', width:2, dash:'dot'}, name:'Danger threshold', showlegend:false});

        var layout2 = {
            title:{text:'Peak Amplitude Comparison', font:{size:13}},
            yaxis:{title:'Max amplitude', range:[0, Math.max(maxWithout, 5) * 1.1], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            xaxis:{gridcolor:'#2a2f4a', linecolor:'#808080'},
            showlegend:false,
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rd-tmd-bar-plot', traces2, layout2);

        var statsDiv = document.getElementById('rd-tmd-stats');
        if (statsDiv) {
            var redClass = peakReduction > 50 ? 'color:#00ff9f;font-weight:bold' : peakReduction > 20 ? 'color:#ffff00' : 'color:#ff6b6b';
            statsDiv.innerHTML =
                '<span>Mass ratio \u03BC = <strong>'+massRatio.toFixed(2)+'</strong></span>'+
                '<span>TMD damping \u03B3<sub>TMD</sub> = <strong>'+tmdGamma.toFixed(2)+'</strong></span>'+
                '<span>Peak without TMD: <strong>'+maxWithout.toFixed(1)+'</strong></span>'+
                '<span>Peak with TMD: <strong>'+maxWith.toFixed(2)+'</strong></span>'+
                '<span style="'+redClass+'">Reduction: '+peakReduction.toFixed(0)+'%</span>';
        }
    }

    // === Explorer 3: Radio Tuner ===
    // LC circuit as resonant selector: A(ω) peaks at ω₀ = 1/√(LC)
    // Three stations at different frequencies, tune ω₀ to select one
    function plotRadio() {
        var omega0 = parseFloat(document.getElementById('rd-ra-w0').value);
        var Q = parseFloat(document.getElementById('rd-ra-q').value);
        var gamma = omega0 / (2 * Q);

        // Three "stations" at fixed frequencies
        var stations = [
            {freq: 2.0, name: 'Station A', color: '#ff6b6b', amp: 1.0},
            {freq: 3.5, name: 'Station B', color: '#00ff9f', amp: 0.8},
            {freq: 5.0, name: 'Station C', color: '#ffff00', amp: 0.6}
        ];

        // Response curve of the receiver (LC circuit)
        var wArr = [], rArr = [];
        for (var i = 0; i <= 400; i++) {
            var w = 0.5 + 6.0 * i / 400;
            wArr.push(w);
            rArr.push(steadyAmp(omega0, w, gamma, 1.0));
        }

        var rMax = Math.max.apply(null, rArr);

        // Normalize to peak = 1
        var rNorm = rArr.map(function(r) { return r / rMax; });

        var traces = [];
        // Response curve (filled)
        traces.push({x:wArr, y:rNorm, mode:'lines', line:{color:'#00f3ff', width:2.5}, name:'Receiver response', fill:'tozeroy', fillcolor:'rgba(0,243,255,0.08)'});

        // Station markers and their amplitudes through the filter
        for (var s = 0; s < stations.length; s++) {
            var st = stations[s];
            var received = steadyAmp(omega0, st.freq, gamma, st.amp) / rMax;
            traces.push({x:[st.freq, st.freq], y:[0, 1.1], mode:'lines',
                line:{color:st.color, width:1.5, dash:'dash'}, showlegend:false});
            traces.push({x:[st.freq], y:[received], mode:'markers+text',
                marker:{size:12, color:st.color, symbol:'diamond'},
                text:[st.name], textposition:'top center', textfont:{size:10, color:st.color},
                name:st.name+' ('+st.freq.toFixed(1)+' rad/s)'});
        }

        var layout = {
            title:{text:'Receiver Response Curve (\u03C9\u2080 = '+omega0.toFixed(2)+')', font:{size:13}},
            xaxis:{title:'Frequency (rad/s)', range:[0, 7], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Normalized response', range:[0, 1.3], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.55, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rd-ra-plot', traces, layout);

        // Right panel: received signal strengths (bar chart)
        var barNames = [], barVals = [], barColors = [];
        var bestStation = '';
        var bestVal = 0;
        for (var s = 0; s < stations.length; s++) {
            var st = stations[s];
            var received = steadyAmp(omega0, st.freq, gamma, st.amp) / rMax;
            barNames.push(st.name + '\n(' + st.freq.toFixed(1) + ')');
            barVals.push(received);
            barColors.push(st.color);
            if (received > bestVal) { bestVal = received; bestStation = st.name; }
        }

        var traces2 = [];
        traces2.push({x:barNames, y:barVals, type:'bar', marker:{color:barColors}, width:0.4});

        var layout2 = {
            title:{text:'Received Signal Strength', font:{size:13}},
            yaxis:{title:'Signal (normalized)', range:[0, 1.2], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            xaxis:{gridcolor:'#2a2f4a', linecolor:'#808080'},
            showlegend:false,
            margin:{t:40, b:60, l:55, r:15}
        };
        createPlot('rd-ra-bar-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('rd-ra-stats');
        if (statsDiv) {
            var bw = omega0 / Q;
            statsDiv.innerHTML =
                '<span>Tuned to \u03C9\u2080 = <strong>'+omega0.toFixed(2)+'</strong> rad/s</span>'+
                '<span>Q factor = <strong>'+Q.toFixed(0)+'</strong></span>'+
                '<span>Bandwidth \u0394\u03C9 = \u03C9\u2080/Q = <strong>'+bw.toFixed(2)+'</strong></span>'+
                '<span>Best match: <strong>'+bestStation+'</strong></span>';
        }
    }

    // === Event Handlers ===
    function attachEventHandlers() {
        // Explorer 1
        var brWd = document.getElementById('rd-br-wd');
        if (brWd) brWd.addEventListener('input', function() {
            var lb = this.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
            plotBridge();
        });
        var brGamma = document.getElementById('rd-br-gamma');
        if (brGamma) brGamma.addEventListener('input', function() {
            var lb = this.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
            plotBridge();
        });

        // Explorer 2
        var tmdMu = document.getElementById('rd-tmd-mu');
        if (tmdMu) tmdMu.addEventListener('input', function() {
            var lb = this.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
            plotTMD();
        });
        var tmdG2 = document.getElementById('rd-tmd-gamma2');
        if (tmdG2) tmdG2.addEventListener('input', function() {
            var lb = this.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
            plotTMD();
        });

        // Explorer 3
        var raW0 = document.getElementById('rd-ra-w0');
        if (raW0) raW0.addEventListener('input', function() {
            var lb = this.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
            plotRadio();
        });
        var raQ = document.getElementById('rd-ra-q');
        if (raQ) raQ.addEventListener('input', function() {
            var lb = this.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(0); }
            plotRadio();
        });
    }

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('rd-br-plot');
        var p2 = document.getElementById('rd-tmd-plot');
        var p3 = document.getElementById('rd-ra-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        plotBridge();
        plotTMD();
        plotRadio();
        attachEventHandlers();
    }

    // === Global resets ===
    window.resetBridge = function() {
        var sl = document.getElementById('rd-br-wd');
        if (sl) { sl.value = '1.00'; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '1.00'; } }
        var gm = document.getElementById('rd-br-gamma');
        if (gm) { gm.value = '0.10'; var lb = gm.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '0.10'; } }
        plotBridge();
    };

    window.resetTMD = function() {
        var sl = document.getElementById('rd-tmd-mu');
        if (sl) { sl.value = '0.05'; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '0.05'; } }
        var gm = document.getElementById('rd-tmd-gamma2');
        if (gm) { gm.value = '0.20'; var lb = gm.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '0.20'; } }
        plotTMD();
    };

    window.resetRadio = function() {
        var sl = document.getElementById('rd-ra-w0');
        if (sl) { sl.value = '2.00'; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '2.00'; } }
        var q = document.getElementById('rd-ra-q');
        if (q) { q.value = '10'; var lb = q.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '10'; } }
        plotRadio();
    };

    initializePlots();
})();
