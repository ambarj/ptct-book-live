(function() {
    'use strict';

    var TWO_PI = 2 * Math.PI;
    var N_PTS = 600;

    // Damped oscillator solution for ALL regimes
    // x(0)=A, v(0)=0 initial conditions
    function dampedSolution(t, A, gamma, omega0) {
        var disc = gamma * gamma - omega0 * omega0;
        if (disc < -1e-10) {
            // Underdamped: x = A e^(-γt) [cos(ωd t) + (γ/ωd) sin(ωd t)]
            var omegaD = Math.sqrt(-disc);
            return A * Math.exp(-gamma * t) * (Math.cos(omegaD * t) + (gamma / omegaD) * Math.sin(omegaD * t));
        } else if (disc > 1e-10) {
            // Overdamped: x = A/(r1-r2) * (r1 e^(r2 t) - r2 e^(r1 t))
            // where r1,r2 = -γ ± √(γ²-ω₀²), with v(0)=0: x = A/(r1-r2)(r1 e^(r2t) - r2 e^(r1t))
            var sqrtDisc = Math.sqrt(disc);
            var r1 = -gamma + sqrtDisc; // less negative (slower decay)
            var r2 = -gamma - sqrtDisc; // more negative (faster decay)
            // x(0)=A, v(0)=0 → C1 = A*r2/(r2-r1), C2 = A*r1/(r1-r2)
            // Simplification: x = A/(r2-r1) * (r2*e^(r1*t) - r1*e^(r2*t))
            var denom = r2 - r1;
            return A / denom * (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t));
        } else {
            // Critically damped: x = A(1 + γt) e^(-γt)
            return A * (1 + gamma * t) * Math.exp(-gamma * t);
        }
    }

    function getRegimeLabel(gamma, omega0) {
        var disc = gamma * gamma - omega0 * omega0;
        if (disc < -1e-10) return 'Underdamped (\u03B3 < \u03C9\u2080)';
        if (disc > 1e-10) return 'Overdamped (\u03B3 > \u03C9\u2080)';
        return 'Critically Damped (\u03B3 = \u03C9\u2080)';
    }

    // === Explorer 1: Regime Explorer ===
    function plotRegime() {
        var gamma = parseFloat(document.getElementById('rg-ex-gamma').value);
        var omega0 = parseFloat(document.getElementById('rg-ex-omega0').value);
        var A = 2.0;

        var tFixed = 12;
        var t = [], xArr = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tFixed * i / N_PTS;
            t.push(ti);
            xArr.push(dampedSolution(ti, A, gamma, omega0));
        }

        // Also show envelope for underdamped
        var disc = gamma * gamma - omega0 * omega0;
        var traces = [];

        if (disc < -1e-10) {
            var envUp = [], envDown = [];
            for (var i = 0; i <= N_PTS; i++) {
                var ti = tFixed * i / N_PTS;
                var env = A * Math.exp(-gamma * ti) * Math.sqrt(1 + (gamma * gamma) / (-disc));
                envUp.push(env);
                envDown.push(-env);
            }
            traces.push({x:t, y:envUp, mode:'lines', line:{color:'rgba(255,107,107,0.5)', width:1.5, dash:'dash'}, name:'Envelope', showlegend:true});
            traces.push({x:t, y:envDown, mode:'lines', line:{color:'rgba(255,107,107,0.5)', width:1.5, dash:'dash'}, showlegend:false});
        }

        // Main curve color: cyan=underdamped, green=critical, magenta=overdamped
        var color = disc < -1e-10 ? '#00f3ff' : (disc > 1e-10 ? '#ff00ff' : '#00ff9f');
        traces.push({x:t, y:xArr, mode:'lines', line:{color:color, width:2.5}, name:getRegimeLabel(gamma, omega0)});

        // Zero line reference
        traces.push({x:[0, tFixed], y:[0, 0], mode:'lines', line:{color:'#808080', width:0.5}, showlegend:false});

        var layout = {
            title:{text:'Damped Response: x(0) = A, v(0) = 0', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Displacement x', range:[-2.5, 2.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rg-ex-plot', traces, layout);

        // RIGHT: characteristic equation roots visualization
        var r1Re, r1Im, r2Re, r2Im;
        if (disc < -1e-10) {
            var omegaD = Math.sqrt(-disc);
            r1Re = -gamma; r1Im = omegaD;
            r2Re = -gamma; r2Im = -omegaD;
        } else if (disc > 1e-10) {
            var sqrtDisc = Math.sqrt(disc);
            r1Re = -gamma + sqrtDisc; r1Im = 0;
            r2Re = -gamma - sqrtDisc; r2Im = 0;
        } else {
            r1Re = -gamma; r1Im = 0;
            r2Re = -gamma; r2Im = 0;
        }

        var traces2 = [];
        // Axes
        traces2.push({x:[-8, 2], y:[0, 0], mode:'lines', line:{color:'#808080', width:1}, showlegend:false});
        traces2.push({x:[0, 0], y:[-5, 5], mode:'lines', line:{color:'#808080', width:1}, showlegend:false});

        // Roots
        traces2.push({x:[r1Re], y:[r1Im], mode:'markers+text', marker:{size:14, color:color, symbol:'circle'},
            text:['r\u2081'], textposition:'top right', textfont:{color:color, size:11}, name:'r\u2081 = '+r1Re.toFixed(2)+(r1Im !== 0 ? (r1Im > 0 ? '+' : '')+r1Im.toFixed(2)+'i' : '')});
        traces2.push({x:[r2Re], y:[r2Im], mode:'markers+text', marker:{size:14, color:color, symbol:'diamond'},
            text:['r\u2082'], textposition:'bottom right', textfont:{color:color, size:11}, name:'r\u2082 = '+r2Re.toFixed(2)+(r2Im !== 0 ? (r2Im > 0 ? '+' : '')+r2Im.toFixed(2)+'i' : '')});

        // Critical boundary: circle of radius ω₀
        var circX = [], circY = [];
        for (var i = 0; i <= 100; i++) {
            var angle = Math.PI / 2 + Math.PI * i / 100; // left half only
            circX.push(omega0 * Math.cos(angle));
            circY.push(omega0 * Math.sin(angle));
        }
        traces2.push({x:circX, y:circY, mode:'lines', line:{color:'rgba(255,255,0,0.3)', width:1, dash:'dot'},
            name:'\u03C9\u2080 boundary'});

        var layout2 = {
            title:{text:'Roots of r\u00B2 + 2\u03B3r + \u03C9\u2080\u00B2 = 0', font:{size:13}},
            xaxis:{title:'Re(r)', range:[-8, 2], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Im(r)', range:[-5, 5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080', scaleanchor:'x'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rg-ex-roots-plot', traces2, layout2);

        var statsDiv = document.getElementById('rg-ex-stats');
        if (statsDiv) {
            var omegaD = disc < -1e-10 ? Math.sqrt(-disc) : 0;
            statsDiv.innerHTML =
                '<span>\u03B3 = <strong>'+gamma.toFixed(2)+'</strong></span>'+
                '<span>\u03C9\u2080 = <strong>'+omega0.toFixed(1)+'</strong></span>'+
                '<span>\u0394 = \u03B3\u00B2\u2013\u03C9\u2080\u00B2 = <strong>'+disc.toFixed(2)+'</strong></span>'+
                '<span>Regime: <strong>'+getRegimeLabel(gamma, omega0)+'</strong></span>'+
                (omegaD > 0 ? '<span>\u03C9\u1D48 = <strong>'+omegaD.toFixed(2)+'</strong></span>' : '');
        }
    }

    // === Explorer 2: Three-Panel Comparison ===
    function plotComparison() {
        var omega0 = parseFloat(document.getElementById('rg-cp-omega0').value);
        var A = 2.0;
        var tFixed = 12;

        // Three specific γ values for each regime
        var gammaUnder = omega0 * 0.3;   // well into underdamped
        var gammaCrit = omega0;           // exactly critical
        var gammaOver = omega0 * 2.0;    // well into overdamped

        var t = [];
        var xUnder = [], xCrit = [], xOver = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tFixed * i / N_PTS;
            t.push(ti);
            xUnder.push(dampedSolution(ti, A, gammaUnder, omega0));
            xCrit.push(dampedSolution(ti, A, gammaCrit, omega0));
            xOver.push(dampedSolution(ti, A, gammaOver, omega0));
        }

        // All three on one plot
        var traces = [];
        traces.push({x:t, y:xUnder, mode:'lines', line:{color:'#00f3ff', width:2.5},
            name:'Underdamped (\u03B3='+gammaUnder.toFixed(1)+')'});
        traces.push({x:t, y:xCrit, mode:'lines', line:{color:'#00ff9f', width:2.5},
            name:'Critical (\u03B3='+gammaCrit.toFixed(1)+')'});
        traces.push({x:t, y:xOver, mode:'lines', line:{color:'#ff00ff', width:2.5},
            name:'Overdamped (\u03B3='+gammaOver.toFixed(1)+')'});

        var layout = {
            title:{text:'Three Regimes at \u03C9\u2080 = '+omega0.toFixed(1), font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Displacement x', range:[-1.5, 2.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.4, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rg-cp-plot', traces, layout);

        // RIGHT: settling time comparison (time to reach |x| < 0.05A)
        function settlingTime(gamma, omega0, threshold) {
            var thresh = threshold * A;
            for (var i = 0; i <= 2000; i++) {
                var ti = 20 * i / 2000;
                if (Math.abs(dampedSolution(ti, A, gamma, omega0)) < thresh && ti > 0.5) return ti;
            }
            return 20;
        }

        var gammaArr = [];
        var settleArr = [];
        var barColors = [];
        var nBars = 20;
        for (var k = 0; k < nBars; k++) {
            var g = omega0 * 0.1 + (omega0 * 3.0 - omega0 * 0.1) * k / (nBars - 1);
            gammaArr.push(g.toFixed(1));
            settleArr.push(settlingTime(g, omega0, 0.05));
            // Color by regime
            if (g < omega0 * 0.99) barColors.push('#00f3ff');
            else if (g < omega0 * 1.01) barColors.push('#00ff9f');
            else barColors.push('#ff00ff');
        }

        var traces2 = [];
        traces2.push({x:gammaArr, y:settleArr, type:'bar', marker:{color:barColors}, name:'Settling time'});

        var layout2 = {
            title:{text:'Time to Settle Within 5% of Equilibrium', font:{size:13}},
            xaxis:{title:'\u03B3', gridcolor:'#2a2f4a', linecolor:'#808080', tickangle:-45},
            yaxis:{title:'Settling time (s)', range:[0, 15], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false,
            margin:{t:40, b:60, l:55, r:15}
        };
        createPlot('rg-cp-settle-plot', traces2, layout2);

        var statsDiv = document.getElementById('rg-cp-stats');
        if (statsDiv) {
            var tUnder = settlingTime(gammaUnder, omega0, 0.05);
            var tCrit = settlingTime(gammaCrit, omega0, 0.05);
            var tOver = settlingTime(gammaOver, omega0, 0.05);
            statsDiv.innerHTML =
                '<span>\u03C9\u2080 = <strong>'+omega0.toFixed(1)+'</strong></span>'+
                '<span>Underdamped settles: <strong>'+tUnder.toFixed(1)+' s</strong></span>'+
                '<span>Critical settles: <strong>'+tCrit.toFixed(1)+' s</strong> (fastest!)</span>'+
                '<span>Overdamped settles: <strong>'+tOver.toFixed(1)+' s</strong></span>';
        }
    }

    // === Explorer 3: Parameter Space Map ===
    function plotParamSpace() {
        var gammaProbe = parseFloat(document.getElementById('rg-ps-gamma').value);
        var omega0Probe = parseFloat(document.getElementById('rg-ps-omega0').value);

        // LEFT: Parameter space heatmap — settling time as color
        var nGrid = 30;
        var gammaRange = [], omega0Range = [];
        for (var i = 0; i < nGrid; i++) {
            gammaRange.push(0.1 + 5.9 * i / (nGrid - 1));
            omega0Range.push(0.5 + 4.5 * i / (nGrid - 1));
        }

        var A = 2.0;
        var zData = [];
        for (var j = 0; j < nGrid; j++) {
            var row = [];
            for (var i = 0; i < nGrid; i++) {
                var g = gammaRange[i];
                var w = omega0Range[j];
                // Settling time
                var settle = 20;
                for (var k = 0; k <= 1000; k++) {
                    var tk = 20 * k / 1000;
                    if (Math.abs(dampedSolution(tk, A, g, w)) < 0.1 && tk > 0.2) { settle = tk; break; }
                }
                row.push(settle);
            }
            zData.push(row);
        }

        var traces = [];
        traces.push({x:gammaRange, y:omega0Range, z:zData, type:'heatmap',
            colorscale:[[0,'#00ff9f'],[0.3,'#00f3ff'],[0.6,'#ff00ff'],[1,'#ff6b6b']],
            colorbar:{title:'Settle (s)', titleside:'right', tickfont:{color:'#c8c8e0'}, titlefont:{color:'#c8c8e0'}},
            hovertemplate:'\u03B3=%{x:.1f}, \u03C9\u2080=%{y:.1f}<br>Settle=%{z:.1f}s<extra></extra>'});

        // Critical damping line: γ = ω₀
        traces.push({x:[0.5, 5], y:[0.5, 5], mode:'lines', line:{color:'#ffff00', width:2, dash:'dash'},
            name:'\u03B3 = \u03C9\u2080 (critical)'});

        // Probe point
        traces.push({x:[gammaProbe], y:[omega0Probe], mode:'markers', marker:{size:14, color:'#ffffff', symbol:'cross', line:{width:2, color:'#ffffff'}},
            name:'Probe: ('+gammaProbe.toFixed(1)+', '+omega0Probe.toFixed(1)+')'});

        // Region labels
        traces.push({x:[1.0], y:[4.0], mode:'text', text:['UNDERDAMPED'], textfont:{color:'rgba(255,255,255,0.5)', size:12}, showlegend:false});
        traces.push({x:[4.5], y:[1.5], mode:'text', text:['OVERDAMPED'], textfont:{color:'rgba(255,255,255,0.5)', size:12}, showlegend:false});

        var layout = {
            title:{text:'Parameter Space: Settling Time', font:{size:13}},
            xaxis:{title:'\u03B3 (damping)', range:[0.1, 6], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'\u03C9\u2080 (natural freq)', range:[0.5, 5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rg-ps-map-plot', traces, layout);

        // RIGHT: motion at probe point
        var tFixed = 12;
        var t = [], xArr = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tFixed * i / N_PTS;
            t.push(ti);
            xArr.push(dampedSolution(ti, A, gammaProbe, omega0Probe));
        }

        var disc = gammaProbe * gammaProbe - omega0Probe * omega0Probe;
        var color = disc < -1e-10 ? '#00f3ff' : (disc > 1e-10 ? '#ff00ff' : '#00ff9f');

        var traces2 = [];
        traces2.push({x:t, y:xArr, mode:'lines', line:{color:color, width:2.5}, name:getRegimeLabel(gammaProbe, omega0Probe)});

        var layout2 = {
            title:{text:'Motion at Probe Point', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Displacement x', range:[-2.5, 2.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('rg-ps-motion-plot', traces2, layout2);

        var statsDiv = document.getElementById('rg-ps-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>Probe: \u03B3 = <strong>'+gammaProbe.toFixed(1)+'</strong>, \u03C9\u2080 = <strong>'+omega0Probe.toFixed(1)+'</strong></span>'+
                '<span>\u0394 = <strong>'+disc.toFixed(2)+'</strong></span>'+
                '<span>Regime: <strong>'+getRegimeLabel(gammaProbe, omega0Probe)+'</strong></span>'+
                '<span>Yellow line: critical boundary (\u03B3 = \u03C9\u2080)</span>';
        }
    }

    // === Event Handlers ===
    function attachEventHandlers() {
        // Explorer 1
        var exSliders = ['rg-ex-gamma','rg-ex-omega0'];
        for (var i = 0; i < exSliders.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
                    plotRegime();
                });
            })(exSliders[i]);
        }

        // Explorer 2
        var cpSlider = document.getElementById('rg-cp-omega0');
        if (cpSlider) cpSlider.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(1); }
            plotComparison();
        });

        // Explorer 3
        var psSliders = ['rg-ps-gamma','rg-ps-omega0'];
        for (var i = 0; i < psSliders.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(1); }
                    plotParamSpace();
                });
            })(psSliders[i]);
        }
    }

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('rg-ex-plot');
        var p2 = document.getElementById('rg-cp-plot');
        var p3 = document.getElementById('rg-ps-map-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        plotRegime();
        plotComparison();
        plotParamSpace();
        attachEventHandlers();
    }

    // === Global resets ===
    window.resetRegime = function() {
        var defs = {'rg-ex-gamma':['1.00','1.00'],'rg-ex-omega0':['3.0','3.00']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotRegime();
    };

    window.resetComparison = function() {
        var sl = document.getElementById('rg-cp-omega0');
        if (sl) { sl.value = '3.0'; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '3.0'; } }
        plotComparison();
    };

    window.resetParamSpace = function() {
        var defs = {'rg-ps-gamma':['1.0','1.0'],'rg-ps-omega0':['3.0','3.0']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotParamSpace();
    };

    initializePlots();
})();
