(function() {
    'use strict';

    // === Constants ===
    var TWO_PI = 2 * Math.PI;
    var N_PTS = 500;

    // === Explorer 1: Wave Adder ===
    function plotWaveAdder() {
        var A1 = parseFloat(document.getElementById('sp-a1-slider').value);
        var A2 = parseFloat(document.getElementById('sp-a2-slider').value);
        var phi1 = parseFloat(document.getElementById('sp-phi1-slider').value);
        var phi2 = parseFloat(document.getElementById('sp-phi2-slider').value);
        var omega = parseFloat(document.getElementById('sp-omega-slider').value);

        var t = [], y1 = [], y2 = [], ySum = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = 4 * TWO_PI * i / N_PTS;
            t.push(ti);
            var v1 = A1 * Math.cos(omega * ti + phi1);
            var v2 = A2 * Math.cos(omega * ti + phi2);
            y1.push(v1);
            y2.push(v2);
            ySum.push(v1 + v2);
        }

        // Compute resultant amplitude and phase
        var dPhi = phi2 - phi1;
        var Ares = Math.sqrt(A1*A1 + A2*A2 + 2*A1*A2*Math.cos(dPhi));

        var traces = [];
        traces.push({x:t, y:y1, mode:'lines', line:{color:'#00f3ff', width:1.5, dash:'dot'}, name:'x\u2081 (A\u2081='+A1.toFixed(1)+')'});
        traces.push({x:t, y:y2, mode:'lines', line:{color:'#ff00ff', width:1.5, dash:'dot'}, name:'x\u2082 (A\u2082='+A2.toFixed(1)+')'});
        traces.push({x:t, y:ySum, mode:'lines', line:{color:'#ffff00', width:2.5}, name:'Sum (A='+Ares.toFixed(2)+')'});

        var yMax = Math.max(A1+A2, 1) * 1.3;
        var layout = {
            title:{text:'x\u2081 + x\u2082 = A cos(\u03C9t + \u03C6)', font:{size:14}},
            xaxis:{title:'t', range:[0, 4*TWO_PI], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-yMax, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('sp-wave-plot', traces, layout);

        // Stats
        var statsDiv = document.getElementById('sp-wave-stats');
        if (statsDiv) {
            var dPhiDeg = (dPhi * 180 / Math.PI);
            // Normalize to [-180, 180]
            while (dPhiDeg > 180) dPhiDeg -= 360;
            while (dPhiDeg < -180) dPhiDeg += 360;
            var interf = '';
            if (Math.abs(Math.cos(dPhi) - 1) < 0.1) interf = '<span style="color:#00ff9f">Constructive!</span>';
            else if (Math.abs(Math.cos(dPhi) + 1) < 0.1) interf = '<span style="color:#ff6b6b">Destructive!</span>';
            statsDiv.innerHTML =
                '<span>A\u2081 = '+A1.toFixed(1)+'</span>'+
                '<span>A\u2082 = '+A2.toFixed(1)+'</span>'+
                '<span>\u0394\u03C6 = '+dPhiDeg.toFixed(0)+'\u00B0</span>'+
                '<span>A<sub>result</sub> = '+Ares.toFixed(2)+'</span>'+
                interf;
        }
    }

    // === Explorer 2: Linearity Tester ===
    function plotLinearity() {
        var sysType = document.getElementById('sp-system-select').value;

        // Two input signals
        var t = [], x1 = [], x2 = [], xSum = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = 4 * TWO_PI * i / N_PTS;
            t.push(ti);
            var v1 = Math.cos(ti);
            var v2 = 0.7 * Math.cos(2 * ti + 0.5);
            x1.push(v1);
            x2.push(v2);
            xSum.push(v1 + v2);
        }

        // Apply system function
        function applySystem(val) {
            if (sysType === 'linear') return val; // f(x) = x (identity / SHO solution)
            if (sysType === 'double') return 2 * val; // f(x) = 2x (scaled linear)
            if (sysType === 'square') return val * val; // f(x) = x² (nonlinear)
            if (sysType === 'cubic') return val * val * val; // f(x) = x³ (nonlinear)
            return val;
        }

        var fSum = [], sumF = [];
        for (var i = 0; i <= N_PTS; i++) {
            fSum.push(applySystem(xSum[i])); // f(x₁ + x₂)
            sumF.push(applySystem(x1[i]) + applySystem(x2[i])); // f(x₁) + f(x₂)
        }

        // Check if they match
        var maxDiff = 0;
        for (var i = 0; i <= N_PTS; i++) {
            var d = Math.abs(fSum[i] - sumF[i]);
            if (d > maxDiff) maxDiff = d;
        }
        var isLinear = maxDiff < 0.01;

        // LEFT: input signals
        var traces1 = [];
        traces1.push({x:t, y:x1, mode:'lines', line:{color:'#00f3ff', width:1.5, dash:'dot'}, name:'x\u2081 = cos(t)'});
        traces1.push({x:t, y:x2, mode:'lines', line:{color:'#ff00ff', width:1.5, dash:'dot'}, name:'x\u2082 = 0.7cos(2t+0.5)'});
        traces1.push({x:t, y:xSum, mode:'lines', line:{color:'#ffff00', width:2}, name:'x\u2081 + x\u2082'});
        var layout1 = {
            title:{text:'Input Signals', font:{size:13}},
            xaxis:{title:'t', range:[0,4*TWO_PI], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-2.5, 2.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('sp-lin-input-plot', traces1, layout1);

        // RIGHT: f(sum) vs sum of f
        var traces2 = [];
        traces2.push({x:t, y:fSum, mode:'lines', line:{color:'#ffff00', width:2.5}, name:'f(x\u2081+x\u2082)'});
        traces2.push({x:t, y:sumF, mode:'lines', line:{color:'#00ff9f', width:2, dash:'dash'}, name:'f(x\u2081)+f(x\u2082)'});
        var yMax2 = 0;
        for (var i = 0; i <= N_PTS; i++) {
            var m = Math.max(Math.abs(fSum[i]), Math.abs(sumF[i]));
            if (m > yMax2) yMax2 = m;
        }
        if (yMax2 < 2) yMax2 = 2;
        var sysLabel = sysType === 'linear' ? 'f(x) = x' : sysType === 'double' ? 'f(x) = 2x' : sysType === 'square' ? 'f(x) = x\u00B2' : 'f(x) = x\u00B3';
        var layout2 = {
            title:{text:'Superposition Test: '+sysLabel, font:{size:13}},
            xaxis:{title:'t', range:[0,4*TWO_PI], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'f(x)', range:[-yMax2*1.2, yMax2*1.2], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('sp-lin-output-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('sp-lin-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>System: <strong>'+sysLabel+'</strong></span>'+
                '<span>Max |f(x\u2081+x\u2082) \u2212 [f(x\u2081)+f(x\u2082)]|: <strong>'+maxDiff.toFixed(4)+'</strong></span>'+
                '<span style="color:'+(isLinear?'#00ff9f':'#ff6b6b')+'">Superposition '+(isLinear?'HOLDS \u2714':'FAILS \u2718')+'</span>';
        }
    }

    // === Explorer 3: Pattern Builder (Fourier components) ===
    function plotPatternBuilder() {
        var a1 = parseFloat(document.getElementById('sp-h1-slider').value);
        var a2 = parseFloat(document.getElementById('sp-h2-slider').value);
        var a3 = parseFloat(document.getElementById('sp-h3-slider').value);
        var a4 = parseFloat(document.getElementById('sp-h4-slider').value);
        var targetType = document.getElementById('sp-target-select').value;

        var omega0 = 1;
        var t = [], yComps = [[], [], [], []], ySum = [], yTarget = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = 2 * TWO_PI * i / N_PTS;
            t.push(ti);
            var c1 = a1 * Math.sin(omega0 * ti);
            var c2 = a2 * Math.sin(2 * omega0 * ti);
            var c3 = a3 * Math.sin(3 * omega0 * ti);
            var c4 = a4 * Math.sin(4 * omega0 * ti);
            yComps[0].push(c1);
            yComps[1].push(c2);
            yComps[2].push(c3);
            yComps[3].push(c4);
            ySum.push(c1 + c2 + c3 + c4);

            // Target waveform
            var phase = omega0 * ti;
            // Normalize phase to [0, 2π]
            var p = phase % TWO_PI;
            if (targetType === 'square') {
                yTarget.push(p < Math.PI ? 1 : -1);
            } else if (targetType === 'sawtooth') {
                yTarget.push(1 - p / Math.PI);
            } else {
                yTarget.push(p < Math.PI ? 2 * p / Math.PI - 1 : 3 - 2 * p / Math.PI);
            }
        }

        // LEFT: individual components
        var compColors = ['#00f3ff', '#ff00ff', '#ffff00', '#00ff9f'];
        var traces1 = [];
        var amps = [a1, a2, a3, a4];
        for (var h = 0; h < 4; h++) {
            if (Math.abs(amps[h]) > 0.01) {
                traces1.push({
                    x: t, y: yComps[h], mode: 'lines',
                    line: {color: compColors[h], width: 1.5, dash: 'dot'},
                    name: (h+1)+'\u03C9 (a='+ amps[h].toFixed(2)+')'
                });
            }
        }
        traces1.push({x:t, y:ySum, mode:'lines', line:{color:'#ffffff', width:2.5}, name:'Sum'});

        var layout1 = {
            title:{text:'Components + Sum', font:{size:13}},
            xaxis:{title:'t', range:[0, 2*TWO_PI], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-3, 3], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:9}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('sp-fourier-comp-plot', traces1, layout1);

        // RIGHT: sum vs target
        var traces2 = [];
        traces2.push({x:t, y:yTarget, mode:'lines', line:{color:'#808080', width:2, dash:'dash'}, name:'Target'});
        traces2.push({x:t, y:ySum, mode:'lines', line:{color:'#ffff00', width:2.5}, name:'Your sum'});

        // Compute error
        var errSum = 0;
        for (var i = 0; i <= N_PTS; i++) {
            var d = ySum[i] - yTarget[i];
            errSum += d * d;
        }
        var rmsErr = Math.sqrt(errSum / (N_PTS + 1));

        var layout2 = {
            title:{text:'Match the Target (RMS error: '+rmsErr.toFixed(3)+')', font:{size:13}},
            xaxis:{title:'t', range:[0, 2*TWO_PI], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x(t)', range:[-3, 3], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('sp-fourier-target-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('sp-fourier-stats');
        if (statsDiv) {
            var quality = rmsErr < 0.2 ? 'Excellent!' : rmsErr < 0.4 ? 'Good' : rmsErr < 0.7 ? 'Getting there' : 'Keep tuning';
            var qColor = rmsErr < 0.2 ? '#00ff9f' : rmsErr < 0.4 ? '#ffff00' : '#ff6b6b';
            statsDiv.innerHTML =
                '<span>1\u03C9: '+a1.toFixed(2)+'</span>'+
                '<span>2\u03C9: '+a2.toFixed(2)+'</span>'+
                '<span>3\u03C9: '+a3.toFixed(2)+'</span>'+
                '<span>4\u03C9: '+a4.toFixed(2)+'</span>'+
                '<span>RMS error: <strong>'+rmsErr.toFixed(3)+'</strong></span>'+
                '<span style="color:'+qColor+'"><strong>'+quality+'</strong></span>';
        }
    }

    // === Hint for Fourier coefficients ===
    window.showFourierHint = function() {
        var targetType = document.getElementById('sp-target-select').value;
        var hint = '';
        if (targetType === 'square') {
            hint = 'Square wave Fourier series: 4/\u03C0 [sin(\u03C9t) + sin(3\u03C9t)/3 + ...]. Try a\u2081\u22481.27, a\u2082=0, a\u2083\u22480.42, a\u2084=0.';
        } else if (targetType === 'sawtooth') {
            hint = 'Sawtooth Fourier series: 2/\u03C0 [sin(\u03C9t) - sin(2\u03C9t)/2 + sin(3\u03C9t)/3 - ...]. Try a\u2081\u22480.64, a\u2082\u2248-0.32, a\u2083\u22480.21, a\u2084\u2248-0.16.';
        } else {
            hint = 'Triangle wave Fourier series: 8/\u03C0\u00B2 [sin(\u03C9t) - sin(3\u03C9t)/9 + ...]. Try a\u2081\u22480.81, a\u2082=0, a\u2083\u2248-0.09, a\u2084=0.';
        }
        var statsDiv = document.getElementById('sp-fourier-stats');
        if (statsDiv) statsDiv.innerHTML = '<span style="color:#00f3ff">'+hint+'</span>';
    };

    // === Event Handlers ===
    function attachEventHandlers() {
        // Explorer 1 sliders
        var sliderIds1 = ['sp-a1-slider','sp-a2-slider','sp-phi1-slider','sp-phi2-slider','sp-omega-slider'];
        for (var i = 0; i < sliderIds1.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) {
                        var v = label.querySelector('.control-label-value');
                        if (v) {
                            if (sid.indexOf('phi') >= 0) {
                                v.textContent = (parseFloat(this.value)*180/Math.PI).toFixed(0) + '\u00B0';
                            } else {
                                v.textContent = this.value;
                            }
                        }
                    }
                    plotWaveAdder();
                });
            })(sliderIds1[i]);
        }

        // Explorer 2 select
        var sysSelect = document.getElementById('sp-system-select');
        if (sysSelect) sysSelect.addEventListener('change', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.options[this.selectedIndex].text; }
            plotLinearity();
        });

        // Explorer 3 sliders + select
        var sliderIds3 = ['sp-h1-slider','sp-h2-slider','sp-h3-slider','sp-h4-slider'];
        for (var i = 0; i < sliderIds3.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
                    plotPatternBuilder();
                });
            })(sliderIds3[i]);
        }
        var targetSelect = document.getElementById('sp-target-select');
        if (targetSelect) targetSelect.addEventListener('change', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.options[this.selectedIndex].text; }
            plotPatternBuilder();
        });
    }

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('sp-wave-plot');
        var p2 = document.getElementById('sp-lin-input-plot');
        var p3 = document.getElementById('sp-fourier-comp-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        plotWaveAdder();
        plotLinearity();
        plotPatternBuilder();
        attachEventHandlers();
    }

    // === Global functions ===
    window.resetWaveAdder = function() {
        var defs = {
            'sp-a1-slider': ['1.0','1.0'], 'sp-a2-slider': ['1.0','1.0'],
            'sp-phi1-slider': ['0','0\u00B0'], 'sp-phi2-slider': ['0','0\u00B0'],
            'sp-omega-slider': ['1.0','1.0']
        };
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotWaveAdder();
    };
    window.resetLinearityTester = function() {
        var sel = document.getElementById('sp-system-select');
        if (sel) { sel.value = 'linear'; var lb = sel.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = 'f(x) = x (linear)'; } }
        plotLinearity();
    };
    window.resetPatternBuilder = function() {
        var defs = {'sp-h1-slider':'0.00','sp-h2-slider':'0.00','sp-h3-slider':'0.00','sp-h4-slider':'0.00'};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = 0; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id]; } }
        }
        var sel = document.getElementById('sp-target-select');
        if (sel) { sel.value = 'square'; var lb = sel.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = 'Square wave'; } }
        plotPatternBuilder();
    };

    initializePlots();
})();
