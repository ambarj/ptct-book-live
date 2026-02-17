(function() {
    'use strict';

    var TWO_PI = 2 * Math.PI;
    var N_PTS = 500;

    // === Explorer 1: System Identifier ===
    // Shows three physical systems (spring, pendulum, LC circuit) all obeying ẍ = -ω²x
    function plotSystems() {
        var k = parseFloat(document.getElementById('un-sys-k').value);
        var m = parseFloat(document.getElementById('un-sys-m').value);
        var L = parseFloat(document.getElementById('un-sys-L').value);
        var Lc = parseFloat(document.getElementById('un-sys-Lc').value);
        var C = parseFloat(document.getElementById('un-sys-C').value);

        // Natural frequencies
        var omegaSpring = Math.sqrt(k / m);
        var omegaPend = Math.sqrt(9.8 / L);
        var omegaLC = 1.0 / Math.sqrt(Lc * C);

        var tFixed = 15;
        var A = 1.0; // normalized amplitude for comparison

        // Generate time series for each
        var t = [];
        var xSpring = [], xPend = [], xLC = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tFixed * i / N_PTS;
            t.push(ti);
            xSpring.push(A * Math.cos(omegaSpring * ti));
            xPend.push(A * Math.cos(omegaPend * ti));
            xLC.push(A * Math.cos(omegaLC * ti));
        }

        // LEFT: all three oscillations vs time
        var traces1 = [];
        traces1.push({x:t, y:xSpring, mode:'lines', line:{color:'#00f3ff', width:2.5},
            name:'Spring: x(t)'});
        traces1.push({x:t, y:xPend, mode:'lines', line:{color:'#ff00ff', width:2.5},
            name:'Pendulum: \u03B8(t)'});
        traces1.push({x:t, y:xLC, mode:'lines', line:{color:'#ffff00', width:2.5},
            name:'LC Circuit: Q(t)'});

        var layout1 = {
            title:{text:'Three Systems, One Equation', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Normalized displacement', range:[-1.5, 1.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('un-sys-plot', traces1, layout1);

        // RIGHT: frequency comparison bar chart
        var systems = ['Spring', 'Pendulum', 'LC Circuit'];
        var omegas = [omegaSpring, omegaPend, omegaLC];
        var barColors = ['#00f3ff', '#ff00ff', '#ffff00'];

        var traces2 = [];
        traces2.push({x:systems, y:omegas, type:'bar', marker:{color:barColors},
            text:omegas.map(function(w){return '\u03C9 = '+w.toFixed(2);}),
            textposition:'auto', textfont:{color:'#1a1b2e', size:11}});

        var layout2 = {
            title:{text:'Natural Frequencies \u03C9', font:{size:13}},
            xaxis:{gridcolor:'#2a2f4a', linecolor:'#808080'},
            yaxis:{title:'\u03C9 (rad/s)', range:[0, 12], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false,
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('un-sys-freq-plot', traces2, layout2);

        var statsDiv = document.getElementById('un-sys-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>Spring: \u03C9 = \u221A(k/m) = <strong>'+omegaSpring.toFixed(2)+' rad/s</strong></span>'+
                '<span>Pendulum: \u03C9 = \u221A(g/L) = <strong>'+omegaPend.toFixed(2)+' rad/s</strong></span>'+
                '<span>LC: \u03C9 = 1/\u221A(LC) = <strong>'+omegaLC.toFixed(2)+' rad/s</strong></span>';
        }
    }

    // === Explorer 2: Cross-Domain Mapper ===
    // Given one system's parameters, find equivalent parameters in another domain
    function plotMapper() {
        var sourceSystem = document.getElementById('un-map-source').value;
        var targetSystem = document.getElementById('un-map-target').value;

        // Source parameter values
        var param1 = parseFloat(document.getElementById('un-map-p1').value);
        var param2 = parseFloat(document.getElementById('un-map-p2').value);

        // Calculate omega from source
        var omegaSource;
        if (sourceSystem === 'spring') {
            omegaSource = Math.sqrt(param1 / param2); // k/m
        } else if (sourceSystem === 'pendulum') {
            omegaSource = Math.sqrt(9.8 / param1); // g/L (param1=L, param2 unused directly)
        } else {
            omegaSource = 1.0 / Math.sqrt(param1 * param2); // 1/sqrt(LC)
        }

        var T = TWO_PI / omegaSource;
        var f = omegaSource / TWO_PI;

        // Generate motion with unit amplitude
        var tFixed = 4 * T;
        if (tFixed > 20) tFixed = 20;
        if (tFixed < 2) tFixed = 2;
        var t = [], xArr = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tFixed * i / N_PTS;
            t.push(ti);
            xArr.push(Math.cos(omegaSource * ti));
        }

        // LEFT: oscillation
        var traces1 = [];
        var sourceColor = sourceSystem === 'spring' ? '#00f3ff' : (sourceSystem === 'pendulum' ? '#ff00ff' : '#ffff00');
        traces1.push({x:t, y:xArr, mode:'lines', line:{color:sourceColor, width:2.5}, name:'Oscillation'});

        var layout1 = {
            title:{text:'Source System Oscillation', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Displacement', range:[-1.5, 1.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false,
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('un-map-plot', traces1, layout1);

        // RIGHT: parameter conversion table visualization
        // Show target parameters that give the same ω
        var targetParams = {};
        var targetLabel = '';
        if (targetSystem === 'spring') {
            // ω = √(k/m): choose m=1, k=ω²
            var kTarget = omegaSource * omegaSource;
            targetParams = {k: kTarget, m: 1.0};
            targetLabel = 'k = \u03C9\u00B2 = ' + kTarget.toFixed(2) + ' N/m  (m = 1 kg)';
        } else if (targetSystem === 'pendulum') {
            // ω = √(g/L): L = g/ω²
            var LTarget = 9.8 / (omegaSource * omegaSource);
            targetParams = {L: LTarget};
            targetLabel = 'L = g/\u03C9\u00B2 = ' + LTarget.toFixed(3) + ' m';
        } else {
            // ω = 1/√(LC): choose C=1μF, L=1/(ω²C)
            var CTarget = 1e-3; // 1 mF for readable numbers
            var LcTarget = 1.0 / (omegaSource * omegaSource * CTarget);
            targetParams = {Lc: LcTarget, C: CTarget};
            targetLabel = 'L = ' + LcTarget.toFixed(3) + ' H  (C = 1 mF)';
        }

        // Conversion arrows visualization
        var categories = ['\u03C9 (rad/s)', 'T (s)', 'f (Hz)'];
        var values = [omegaSource, T, f];
        var traces2 = [];
        traces2.push({x:categories, y:values, type:'bar',
            marker:{color:['#00ff9f','#ff6b6b','#9f7fff']},
            text:values.map(function(v){return v.toFixed(3);}),
            textposition:'auto', textfont:{color:'#1a1b2e', size:12}});

        var layout2 = {
            title:{text:'Shared Oscillation Properties', font:{size:13}},
            xaxis:{gridcolor:'#2a2f4a', linecolor:'#808080'},
            yaxis:{title:'Value', gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false,
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('un-map-conv-plot', traces2, layout2);

        var statsDiv = document.getElementById('un-map-stats');
        if (statsDiv) {
            var sourceLabel = sourceSystem === 'spring' ? 'Spring (k='+param1.toFixed(1)+', m='+param2.toFixed(1)+')' :
                             (sourceSystem === 'pendulum' ? 'Pendulum (L='+param1.toFixed(2)+' m)' :
                              'LC Circuit (L='+param1.toFixed(2)+' H, C='+param2.toFixed(2)+' F)');
            statsDiv.innerHTML =
                '<span>Source: <strong>'+sourceLabel+'</strong></span>'+
                '<span>\u03C9 = <strong>'+omegaSource.toFixed(3)+' rad/s</strong></span>'+
                '<span>T = <strong>'+T.toFixed(3)+' s</strong></span>'+
                '<span>Target '+targetSystem+': <strong>'+targetLabel+'</strong></span>';
        }
    }

    // Update slider labels and ranges when source system changes
    function updateMapperControls() {
        var sourceSystem = document.getElementById('un-map-source').value;
        var p1Label = document.getElementById('un-map-p1-label');
        var p2Group = document.getElementById('un-map-p2-group');
        var p1Slider = document.getElementById('un-map-p1');
        var p2Slider = document.getElementById('un-map-p2');

        if (sourceSystem === 'spring') {
            p1Label.innerHTML = 'Spring constant k: <span class="control-label-value">'+parseFloat(p1Slider.value).toFixed(1)+'</span>';
            p1Slider.min = '0.5'; p1Slider.max = '20'; p1Slider.step = '0.5'; p1Slider.value = '4.0';
            p2Group.style.display = '';
            document.getElementById('un-map-p2-label').innerHTML = 'Mass m: <span class="control-label-value">'+parseFloat(p2Slider.value).toFixed(1)+'</span>';
            p2Slider.min = '0.1'; p2Slider.max = '5.0'; p2Slider.step = '0.1'; p2Slider.value = '1.0';
            updateMapperLabel('un-map-p1', p1Slider.value);
            updateMapperLabel('un-map-p2', p2Slider.value);
        } else if (sourceSystem === 'pendulum') {
            p1Label.innerHTML = 'Pendulum length L: <span class="control-label-value">'+parseFloat(p1Slider.value).toFixed(2)+'</span>';
            p1Slider.min = '0.1'; p1Slider.max = '5.0'; p1Slider.step = '0.1'; p1Slider.value = '1.0';
            p2Group.style.display = 'none';
            updateMapperLabel('un-map-p1', p1Slider.value);
        } else {
            p1Label.innerHTML = 'Inductance L: <span class="control-label-value">'+parseFloat(p1Slider.value).toFixed(2)+'</span>';
            p1Slider.min = '0.01'; p1Slider.max = '2.0'; p1Slider.step = '0.01'; p1Slider.value = '0.10';
            p2Group.style.display = '';
            document.getElementById('un-map-p2-label').innerHTML = 'Capacitance C: <span class="control-label-value">'+parseFloat(p2Slider.value).toFixed(3)+'</span>';
            p2Slider.min = '0.001'; p2Slider.max = '0.1'; p2Slider.step = '0.001'; p2Slider.value = '0.010';
            updateMapperLabel('un-map-p1', p1Slider.value);
            updateMapperLabel('un-map-p2', p2Slider.value);
        }
        plotMapper();
    }

    function updateMapperLabel(sliderId, val) {
        var sl = document.getElementById(sliderId);
        if (!sl) return;
        var lb = sl.closest('.control-group');
        if (lb) {
            var v = lb.querySelector('.control-label-value');
            if (v) {
                var sourceSystem = document.getElementById('un-map-source').value;
                if (sourceSystem === 'lc') {
                    v.textContent = parseFloat(val).toFixed(sliderId === 'un-map-p2' ? 3 : 2);
                } else if (sourceSystem === 'pendulum') {
                    v.textContent = parseFloat(val).toFixed(2);
                } else {
                    v.textContent = parseFloat(val).toFixed(1);
                }
            }
        }
    }

    // === Explorer 3: Phase Relationship Explorer ===
    // Shows Q(t) and I(t) = dQ/dt with π/2 phase lag in LC circuit
    // Also shows analogous x(t)/v(t) for spring and θ(t)/ω(t) for pendulum
    function plotPhaseRel() {
        var omega = parseFloat(document.getElementById('un-pr-omega').value);
        var system = document.getElementById('un-pr-system').value;

        var tFixed = 13;
        var A = 1.0;
        var t = [], primary = [], derivative = [];

        for (var i = 0; i <= N_PTS; i++) {
            var ti = tFixed * i / N_PTS;
            t.push(ti);
            primary.push(A * Math.cos(omega * ti));
            derivative.push(-A * omega * Math.sin(omega * ti));
        }

        // Labels depend on system
        var primLabel, derivLabel, primName, derivName;
        if (system === 'spring') {
            primLabel = 'Position x(t)';
            derivLabel = 'Velocity v(t)';
            primName = 'x(t) = A cos(\u03C9t)';
            derivName = 'v(t) = \u2013A\u03C9 sin(\u03C9t)';
        } else if (system === 'pendulum') {
            primLabel = 'Angle \u03B8(t)';
            derivLabel = 'Angular velocity d\u03B8/dt';
            primName = '\u03B8(t) = \u03B8\u2080 cos(\u03C9t)';
            derivName = 'd\u03B8/dt = \u2013\u03B8\u2080\u03C9 sin(\u03C9t)';
        } else {
            primLabel = 'Charge Q(t)';
            derivLabel = 'Current I(t) = dQ/dt';
            primName = 'Q(t) = Q\u2080 cos(\u03C9t)';
            derivName = 'I(t) = \u2013Q\u2080\u03C9 sin(\u03C9t)';
        }

        // LEFT: both curves vs time
        var traces1 = [];
        traces1.push({x:t, y:primary, mode:'lines', line:{color:'#00f3ff', width:2.5}, name:primName});
        traces1.push({x:t, y:derivative, mode:'lines', line:{color:'#ff00ff', width:2.5}, name:derivName});

        // Mark the π/2 lag
        // Primary peaks at t=0, derivative peaks at t=π/(2ω)
        var tLag = Math.PI / (2 * omega);
        if (tLag < tFixed) {
            traces1.push({x:[0, 0], y:[-1.5, 1.5], mode:'lines', line:{color:'#ffff00', width:1, dash:'dot'}, showlegend:false});
            traces1.push({x:[tLag, tLag], y:[-1.5*omega, 1.5*omega], mode:'lines', line:{color:'#ffff00', width:1, dash:'dot'}, showlegend:false});
            // Arrow annotation for lag
            traces1.push({x:[0, tLag], y:[-0.2*omega, -0.2*omega], mode:'lines+text', line:{color:'#ffff00', width:1.5},
                text:['', '\u0394t = \u03C0/2\u03C9'], textposition:'top center', textfont:{color:'#ffff00', size:10}, showlegend:false});
        }

        var yMax = Math.max(A * 1.3, A * omega * 1.3);
        var layout1 = {
            title:{text:primLabel + ' and ' + derivLabel, font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Amplitude', range:[-yMax, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('un-pr-plot', traces1, layout1);

        // RIGHT: phase space (primary vs derivative)
        var traces2 = [];
        traces2.push({x:primary, y:derivative, mode:'lines', line:{color:'#00ff9f', width:2.5}, name:'Phase orbit'});
        // Start point
        traces2.push({x:[A], y:[0], mode:'markers', marker:{size:12, color:'#ff6b6b', symbol:'star'}, name:'t=0'});
        // Direction arrow markers
        var nMarks = 8;
        var xM = [], yM = [];
        for (var j = 0; j < nMarks; j++) {
            var theta = TWO_PI * j / nMarks;
            xM.push(A * Math.cos(theta));
            yM.push(-A * omega * Math.sin(theta));
        }
        traces2.push({x:xM, y:yM, mode:'markers', marker:{size:5, color:'#ffff00', symbol:'circle'},
            name:'Time flow', showlegend:false});

        var layout2 = {
            title:{text:'Phase Space: (' + primLabel.split(' ')[0] + ', ' + derivLabel.split(' ')[0] + ')', font:{size:13}},
            xaxis:{title:primLabel.split('(')[0].trim(), range:[-1.5, 1.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:derivLabel.split('(')[0].trim(), range:[-yMax, yMax], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false,
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('un-pr-phase-plot', traces2, layout2);

        var statsDiv = document.getElementById('un-pr-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>\u03C9 = <strong>'+omega.toFixed(1)+' rad/s</strong></span>'+
                '<span>T = <strong>'+(TWO_PI/omega).toFixed(2)+' s</strong></span>'+
                '<span>Phase lag = <strong>\u03C0/2 = 90\u00B0</strong></span>'+
                '<span>'+derivLabel.split('(')[0].trim()+' leads '+primLabel.split('(')[0].trim()+' by \u00BCT</span>';
        }
    }

    // === Event Handlers ===
    function attachEventHandlers() {
        // Explorer 1: System Identifier
        var sysSliders = ['un-sys-k','un-sys-m','un-sys-L','un-sys-Lc','un-sys-C'];
        for (var i = 0; i < sysSliders.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) {
                        var v = label.querySelector('.control-label-value');
                        if (v) v.textContent = parseFloat(this.value).toFixed(sid === 'un-sys-C' || sid === 'un-sys-Lc' ? 2 : 1);
                    }
                    plotSystems();
                });
            })(sysSliders[i]);
        }

        // Explorer 2: Cross-Domain Mapper
        var mapSource = document.getElementById('un-map-source');
        if (mapSource) mapSource.addEventListener('change', updateMapperControls);
        var mapTarget = document.getElementById('un-map-target');
        if (mapTarget) mapTarget.addEventListener('change', plotMapper);

        var mapSliders = ['un-map-p1','un-map-p2'];
        for (var i = 0; i < mapSliders.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    updateMapperLabel(sid, this.value);
                    plotMapper();
                });
            })(mapSliders[i]);
        }

        // Explorer 3: Phase Relationship
        var prOmega = document.getElementById('un-pr-omega');
        if (prOmega) prOmega.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(1); }
            plotPhaseRel();
        });
        var prSystem = document.getElementById('un-pr-system');
        if (prSystem) prSystem.addEventListener('change', plotPhaseRel);
    }

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('un-sys-plot');
        var p2 = document.getElementById('un-map-plot');
        var p3 = document.getElementById('un-pr-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        plotSystems();
        plotMapper();
        plotPhaseRel();
        attachEventHandlers();
    }

    // === Global resets ===
    window.resetSystems = function() {
        var defs = {'un-sys-k':['4.0','4.0'],'un-sys-m':['1.0','1.0'],'un-sys-L':['1.00','1.00'],'un-sys-Lc':['0.10','0.10'],'un-sys-C':['0.01','0.01']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotSystems();
    };

    window.resetMapper = function() {
        document.getElementById('un-map-source').value = 'spring';
        document.getElementById('un-map-target').value = 'pendulum';
        updateMapperControls();
    };

    window.resetPhaseRel = function() {
        var sl = document.getElementById('un-pr-omega');
        if (sl) { sl.value = '2.0'; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '2.0'; } }
        document.getElementById('un-pr-system').value = 'lc';
        plotPhaseRel();
    };

    initializePlots();
})();
