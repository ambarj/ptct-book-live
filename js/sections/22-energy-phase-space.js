(function() {
    'use strict';

    var TWO_PI = 2 * Math.PI;
    var N_PTS = 500;

    // === Explorer 1: Energy Tracker ===
    function plotEnergy() {
        var A = parseFloat(document.getElementById('ps-en-amp').value);
        var omega = parseFloat(document.getElementById('ps-en-omega').value);

        var tFixed = 13;
        var t = [], xArr = [], keArr = [], peArr = [], eArr = [];
        // E = ½ω²A² (using m=1, k=ω²)
        var E = 0.5 * omega * omega * A * A;

        for (var i = 0; i <= N_PTS; i++) {
            var ti = tFixed * i / N_PTS;
            t.push(ti);
            var x = A * Math.cos(omega * ti);
            var v = -A * omega * Math.sin(omega * ti);
            xArr.push(x);
            peArr.push(0.5 * omega * omega * x * x);
            keArr.push(0.5 * v * v);
            eArr.push(E);
        }

        // LEFT: x(t) motion
        var traces1 = [];
        traces1.push({x:t, y:xArr, mode:'lines', line:{color:'#00f3ff', width:2.5}, name:'x(t)'});

        var layout1 = {
            title:{text:'Position x(t)', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'x', range:[-3.5, 3.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false,
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('ps-en-motion-plot', traces1, layout1);

        // RIGHT: KE, PE, E vs time
        var traces2 = [];
        traces2.push({x:t, y:peArr, mode:'lines', line:{color:'#ff00ff', width:2}, name:'PE = \u00BD\u03C9\u00B2x\u00B2', fill:'tozeroy', fillcolor:'rgba(255,0,255,0.15)'});
        traces2.push({x:t, y:keArr, mode:'lines', line:{color:'#00ff9f', width:2}, name:'KE = \u00BDv\u00B2', fill:'tozeroy', fillcolor:'rgba(0,255,159,0.15)'});
        traces2.push({x:t, y:eArr, mode:'lines', line:{color:'#ffff00', width:2, dash:'dash'}, name:'E = \u00BD\u03C9\u00B2A\u00B2 = '+E.toFixed(1)});

        // Fixed y for energy: max E = 0.5 * 25 * 9 = 112.5
        var eMax = 115;
        var layout2 = {
            title:{text:'Energy: KE + PE = E (constant)', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Energy', range:[0, eMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('ps-en-energy-plot', traces2, layout2);

        var statsDiv = document.getElementById('ps-en-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>A = <strong>'+A.toFixed(1)+'</strong></span>'+
                '<span>\u03C9 = <strong>'+omega.toFixed(1)+' rad/s</strong></span>'+
                '<span>E = \u00BD\u03C9\u00B2A\u00B2 = <strong>'+E.toFixed(2)+'</strong></span>'+
                '<span>PE\u2098\u2090\u2093 = E at x = \u00B1A</span>'+
                '<span>KE\u2098\u2090\u2093 = E at x = 0</span>';
        }
    }

    // === Explorer 2: Phase Space Explorer ===
    function plotPhase() {
        var A = parseFloat(document.getElementById('ps-ph-amp').value);
        var omega = parseFloat(document.getElementById('ps-ph-omega').value);

        // Orbit: x = A cos(θ), v/ω = -A sin(θ) → circle of radius A
        // or x = A cos(θ), v = -Aω sin(θ) → ellipse
        var xOrb = [], vOrb = [], vScaled = [];
        for (var i = 0; i <= N_PTS; i++) {
            var theta = TWO_PI * i / N_PTS;
            var x = A * Math.cos(theta);
            var v = -A * omega * Math.sin(theta);
            xOrb.push(x);
            vOrb.push(v);
            vScaled.push(v / omega); // v/ω for circular plot
        }

        // Also generate time evolution for direction arrows
        // Mark a few time points
        var nMarks = 8;
        var xMark = [], vMark = [];
        for (var i = 0; i < nMarks; i++) {
            var theta = TWO_PI * i / nMarks;
            xMark.push(A * Math.cos(theta));
            vMark.push(-A * omega * Math.sin(theta));
        }

        var traces = [];
        traces.push({x:xOrb, y:vOrb, mode:'lines', line:{color:'#00f3ff', width:2.5}, name:'Phase orbit (x, v)'});
        // Direction markers (show clockwise motion)
        traces.push({x:xMark, y:vMark, mode:'markers', marker:{size:6, color:'#ffff00', symbol:'circle'}, name:'Time flow (clockwise)', showlegend:true});
        // Start point
        traces.push({x:[A], y:[0], mode:'markers', marker:{size:12, color:'#ff6b6b', symbol:'star'}, name:'t=0: (A, 0)'});
        // Equilibrium
        traces.push({x:[0], y:[0], mode:'markers', marker:{size:8, color:'#808080', symbol:'x'}, name:'Equilibrium', showlegend:false});

        // Fixed ranges: x ±3.5, v ±17.5 (Amax * ωmax = 3*5 = 15)
        var vFixed = 17;
        var layout = {
            title:{text:'Phase Space: (x, v) Trajectory', font:{size:13}},
            xaxis:{title:'Position x', range:[-3.5, 3.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Velocity v', range:[-vFixed, vFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('ps-ph-plot', traces, layout);

        // RIGHT: scaled (x, v/ω) → perfect circle
        var traces2 = [];
        traces2.push({x:xOrb, y:vScaled, mode:'lines', line:{color:'#ff00ff', width:2.5}, name:'(x, v/\u03C9) \u2192 circle'});
        traces2.push({x:[A], y:[0], mode:'markers', marker:{size:12, color:'#ff6b6b', symbol:'star'}, name:'t=0', showlegend:false});

        var layout2 = {
            title:{text:'Scaled Phase Space: (x, v/\u03C9)', font:{size:13}},
            xaxis:{title:'Position x', range:[-3.5, 3.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080', scaleanchor:'y'},
            yaxis:{title:'v/\u03C9', range:[-3.5, 3.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false,
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('ps-ph-scaled-plot', traces2, layout2);

        var statsDiv = document.getElementById('ps-ph-stats');
        if (statsDiv) {
            var E = 0.5 * omega * omega * A * A;
            statsDiv.innerHTML =
                '<span>A = <strong>'+A.toFixed(1)+'</strong></span>'+
                '<span>\u03C9 = <strong>'+omega.toFixed(1)+' rad/s</strong></span>'+
                '<span>v\u2098\u2090\u2093 = A\u03C9 = <strong>'+(A*omega).toFixed(1)+'</strong></span>'+
                '<span>E = <strong>'+E.toFixed(2)+'</strong></span>'+
                '<span>Left: ellipse (v stretches with \u03C9)</span>'+
                '<span>Right: circle (v/\u03C9 removes \u03C9)</span>';
        }
    }

    // === Explorer 3: Portrait Gallery ===
    function plotGallery() {
        var omega = parseFloat(document.getElementById('ps-gl-omega').value);
        var nOrbits = parseInt(document.getElementById('ps-gl-count').value);

        var colors = ['#00f3ff','#ff00ff','#ffff00','#00ff9f','#ff6b6b','#9f7fff','#ff9f00'];
        var traces = [];

        for (var k = 1; k <= nOrbits; k++) {
            var Ak = k * 0.5;
            var xOrb = [], vOrb = [];
            for (var i = 0; i <= 200; i++) {
                var theta = TWO_PI * i / 200;
                xOrb.push(Ak * Math.cos(theta));
                vOrb.push(-Ak * omega * Math.sin(theta));
            }
            var Ek = 0.5 * omega * omega * Ak * Ak;
            traces.push({x:xOrb, y:vOrb, mode:'lines', line:{color:colors[(k-1) % colors.length], width:2},
                name:'A='+Ak.toFixed(1)+', E='+Ek.toFixed(1)});
        }

        // Equilibrium point
        traces.push({x:[0], y:[0], mode:'markers', marker:{size:10, color:'#ffffff', symbol:'x'}, name:'Equilibrium', showlegend:false});

        var vFixed = 17;
        var layout = {
            title:{text:'Phase Portrait: Nested Orbits at Different Energies', font:{size:13}},
            xaxis:{title:'Position x', range:[-3.5, 3.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Velocity v', range:[-vFixed, vFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('ps-gl-plot', traces, layout);

        // RIGHT: energy bar chart
        var As = [], Es = [], barColors = [];
        for (var k = 1; k <= nOrbits; k++) {
            var Ak = k * 0.5;
            As.push('A='+Ak.toFixed(1));
            Es.push(0.5 * omega * omega * Ak * Ak);
            barColors.push(colors[(k-1) % colors.length]);
        }

        var traces2 = [];
        traces2.push({x:As, y:Es, type:'bar', marker:{color:barColors}, name:'E = \u00BD\u03C9\u00B2A\u00B2'});

        var eMax = 115;
        var layout2 = {
            title:{text:'Energy Levels', font:{size:13}},
            xaxis:{title:'Amplitude', gridcolor:'#2a2f4a', linecolor:'#808080'},
            yaxis:{title:'Total Energy E', range:[0, eMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false,
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('ps-gl-energy-plot', traces2, layout2);

        var statsDiv = document.getElementById('ps-gl-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>\u03C9 = <strong>'+omega.toFixed(1)+' rad/s</strong></span>'+
                '<span>Orbits: <strong>'+nOrbits+'</strong></span>'+
                '<span>Higher energy \u2192 larger orbit</span>'+
                '<span>E \u221D A\u00B2 (quadratic growth)</span>';
        }
    }

    // === Event Handlers ===
    function attachEventHandlers() {
        // Explorer 1
        var enSliders = ['ps-en-amp','ps-en-omega'];
        for (var i = 0; i < enSliders.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(1); }
                    plotEnergy();
                });
            })(enSliders[i]);
        }

        // Explorer 2
        var phSliders = ['ps-ph-amp','ps-ph-omega'];
        for (var i = 0; i < phSliders.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(1); }
                    plotPhase();
                });
            })(phSliders[i]);
        }

        // Explorer 3
        var glSliders = ['ps-gl-omega','ps-gl-count'];
        for (var i = 0; i < glSliders.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) {
                        var v = label.querySelector('.control-label-value');
                        if (v) v.textContent = sid === 'ps-gl-count' ? this.value : parseFloat(this.value).toFixed(1);
                    }
                    plotGallery();
                });
            })(glSliders[i]);
        }
    }

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('ps-en-motion-plot');
        var p2 = document.getElementById('ps-ph-plot');
        var p3 = document.getElementById('ps-gl-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        plotEnergy();
        plotPhase();
        plotGallery();
        attachEventHandlers();
    }

    // === Global resets ===
    window.resetEnergy = function() {
        var defs = {'ps-en-amp':['2.0','2.0'],'ps-en-omega':['2.0','2.0']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotEnergy();
    };

    window.resetPhase = function() {
        var defs = {'ps-ph-amp':['2.0','2.0'],'ps-ph-omega':['2.0','2.0']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotPhase();
    };

    window.resetGallery = function() {
        var defs = {'ps-gl-omega':['2.0','2.0'],'ps-gl-count':['4','4']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotGallery();
    };

    initializePlots();
})();
