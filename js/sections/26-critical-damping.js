(function() {
    'use strict';

    var N_PTS = 600;

    // Damped solution: x(0)=x0, v(0)=0
    function dampedSoln(t, x0, gamma, omega0) {
        var disc = gamma * gamma - omega0 * omega0;
        if (disc < -1e-10) {
            var wd = Math.sqrt(-disc);
            return x0 * Math.exp(-gamma * t) * (Math.cos(wd * t) + (gamma / wd) * Math.sin(wd * t));
        } else if (disc > 1e-10) {
            var s = Math.sqrt(disc);
            var r1 = -gamma + s, r2 = -gamma - s;
            return x0 / (r2 - r1) * (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t));
        } else {
            return x0 * (1 + gamma * t) * Math.exp(-gamma * t);
        }
    }

    function regimeColor(gamma, omega0) {
        var d = gamma * gamma - omega0 * omega0;
        return d < -1e-10 ? '#00f3ff' : (d > 1e-10 ? '#ff00ff' : '#00ff9f');
    }

    function regimeName(gamma, omega0) {
        var d = gamma * gamma - omega0 * omega0;
        return d < -1e-10 ? 'Underdamped' : (d > 1e-10 ? 'Overdamped' : 'Critical');
    }

    // Overshoot percentage for underdamped (zeta < 1)
    function overshootPct(zeta) {
        if (zeta >= 1) return 0;
        return 100 * Math.exp(-Math.PI * zeta / Math.sqrt(1 - zeta * zeta));
    }

    // === Explorer 1: Door Closer Designer ===
    function plotDoor() {
        var k = parseFloat(document.getElementById('cd-dr-k').value);
        var b = parseFloat(document.getElementById('cd-dr-b').value);
        var m = 5.0; // door mass fixed at 5 kg

        var omega0 = Math.sqrt(k / m);
        var gamma = b / (2 * m);
        var zeta = gamma / omega0;
        var x0 = 1.0; // door starts at 1 radian (open)

        var tFixed = 8;
        var t = [], xArr = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tFixed * i / N_PTS;
            t.push(ti);
            xArr.push(dampedSoln(ti, x0, gamma, omega0));
        }

        // Also show critical damping reference
        var gammaCrit = omega0;
        var bCrit = 2 * m * omega0;
        var xCrit = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tFixed * i / N_PTS;
            xCrit.push(dampedSoln(ti, x0, gammaCrit, omega0));
        }

        var color = regimeColor(gamma, omega0);
        var traces = [];
        traces.push({x:t, y:xCrit, mode:'lines', line:{color:'rgba(0,255,159,0.3)', width:2, dash:'dash'},
            name:'Critical (b='+bCrit.toFixed(1)+' Ns/m)'});
        traces.push({x:t, y:xArr, mode:'lines', line:{color:color, width:2.5},
            name:regimeName(gamma, omega0)+' (b='+b.toFixed(0)+' Ns/m)'});
        // Zero = door closed
        traces.push({x:[0, tFixed], y:[0, 0], mode:'lines', line:{color:'#808080', width:0.5}, showlegend:false});

        var layout = {
            title:{text:'Door Closing: Angle vs Time', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Door angle (normalized)', range:[-0.5, 1.2], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.35, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('cd-dr-plot', traces, layout);

        // RIGHT: overshoot and settling metrics
        var os = overshootPct(zeta);
        // Settling time (to 5%)
        var tSettle = tFixed;
        for (var i = 1; i <= N_PTS; i++) {
            if (Math.abs(xArr[i]) < 0.05 * x0) { tSettle = t[i]; break; }
        }

        var categories = ['Overshoot %', 'Settle time (s)', '\u03B6 (damping ratio)'];
        var values = [os, tSettle, zeta];
        var barColors = [os > 10 ? '#ff6b6b' : (os > 0 ? '#ffff00' : '#00ff9f'),
                         tSettle > 5 ? '#ff6b6b' : (tSettle > 3 ? '#ffff00' : '#00ff9f'),
                         color];

        var traces2 = [];
        traces2.push({x:categories, y:values, type:'bar', marker:{color:barColors},
            text:values.map(function(v){return v.toFixed(2);}),
            textposition:'auto', textfont:{color:'#1a1b2e', size:11}});

        var layout2 = {
            title:{text:'Performance Metrics', font:{size:13}},
            xaxis:{gridcolor:'#2a2f4a', linecolor:'#808080'},
            yaxis:{title:'Value', range:[0, Math.max(os, tSettle, zeta) * 1.3 + 1], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false,
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('cd-dr-metrics-plot', traces2, layout2);

        var statsDiv = document.getElementById('cd-dr-stats');
        if (statsDiv) {
            var verdict = zeta < 0.9 ? 'Door bounces \u2014 annoying!' :
                         (zeta < 1.1 ? 'Smooth close \u2014 perfect!' :
                          'Too slow \u2014 frustrating!');
            statsDiv.innerHTML =
                '<span>k = <strong>'+k.toFixed(0)+' N/m</strong></span>'+
                '<span>b = <strong>'+b.toFixed(0)+' Ns/m</strong></span>'+
                '<span>\u03C9\u2080 = <strong>'+omega0.toFixed(2)+'</strong></span>'+
                '<span>\u03B3 = <strong>'+gamma.toFixed(2)+'</strong></span>'+
                '<span>\u03B6 = \u03B3/\u03C9\u2080 = <strong>'+zeta.toFixed(2)+'</strong></span>'+
                '<span>'+verdict+'</span>';
        }
    }

    // === Explorer 2: Suspension Tuner ===
    function plotSuspension() {
        var mCar = parseFloat(document.getElementById('cd-sp-mass').value);
        var kSpring = parseFloat(document.getElementById('cd-sp-k').value);
        var bDamper = parseFloat(document.getElementById('cd-sp-b').value);

        var omega0 = Math.sqrt(kSpring / mCar);
        var gamma = bDamper / (2 * mCar);
        var zeta = gamma / omega0;
        var x0 = 0.1; // 10 cm bump

        var tFixed = 5;
        var t = [], xArr = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tFixed * i / N_PTS;
            t.push(ti);
            xArr.push(dampedSoln(ti, x0, gamma, omega0));
        }

        // Three reference curves: ζ=0.3, ζ=1.0, ζ=2.0
        var refs = [
            {zeta:0.3, color:'rgba(0,243,255,0.25)', name:'\u03B6=0.3 (sporty)'},
            {zeta:1.0, color:'rgba(0,255,159,0.25)', name:'\u03B6=1.0 (critical)'},
            {zeta:2.0, color:'rgba(255,0,255,0.25)', name:'\u03B6=2.0 (luxury)'}
        ];

        var traces = [];
        for (var r = 0; r < refs.length; r++) {
            var gRef = refs[r].zeta * omega0;
            var xRef = [];
            for (var i = 0; i <= N_PTS; i++) {
                var ti = tFixed * i / N_PTS;
                xRef.push(dampedSoln(ti, x0, gRef, omega0));
            }
            traces.push({x:t, y:xRef, mode:'lines', line:{color:refs[r].color, width:1.5, dash:'dot'}, name:refs[r].name});
        }

        var color = regimeColor(gamma, omega0);
        traces.push({x:t, y:xArr, mode:'lines', line:{color:color, width:2.5},
            name:'Your tune (\u03B6='+zeta.toFixed(2)+')'});

        var layout = {
            title:{text:'Suspension Response to 10 cm Bump', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Displacement (m)', range:[-0.06, 0.12], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.4, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('cd-sp-plot', traces, layout);

        // RIGHT: overshoot curve as function of ζ
        var zetaArr = [], osArr = [];
        for (var i = 0; i <= 100; i++) {
            var z = 0.01 + 1.99 * i / 100;
            zetaArr.push(z);
            osArr.push(overshootPct(z));
        }

        var traces2 = [];
        traces2.push({x:zetaArr, y:osArr, mode:'lines', line:{color:'#ff6b6b', width:2}, name:'Overshoot %'});
        // Mark current ζ
        var currentOS = overshootPct(zeta);
        traces2.push({x:[zeta], y:[currentOS], mode:'markers+text', marker:{size:12, color:color, symbol:'star'},
            text:['\u03B6='+zeta.toFixed(2)+', OS='+currentOS.toFixed(1)+'%'],
            textposition:'top right', textfont:{color:color, size:10}, name:'Current', showlegend:false});
        // ζ=1 reference
        traces2.push({x:[1, 1], y:[0, 50], mode:'lines', line:{color:'#00ff9f', width:1.5, dash:'dash'}, name:'\u03B6=1 (critical)'});

        var layout2 = {
            title:{text:'Overshoot vs Damping Ratio', font:{size:13}},
            xaxis:{title:'Damping ratio \u03B6', range:[0, 2], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Overshoot %', range:[0, 55], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.5, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('cd-sp-os-plot', traces2, layout2);

        var statsDiv = document.getElementById('cd-sp-stats');
        if (statsDiv) {
            var bCrit = 2 * mCar * omega0;
            statsDiv.innerHTML =
                '<span>m = <strong>'+mCar.toFixed(0)+' kg</strong></span>'+
                '<span>k = <strong>'+kSpring.toFixed(0)+' N/m</strong></span>'+
                '<span>b = <strong>'+bDamper.toFixed(0)+' Ns/m</strong></span>'+
                '<span>\u03B6 = <strong>'+zeta.toFixed(2)+'</strong></span>'+
                '<span>b\u2090\u2099\u1D62\u209C = 2m\u03C9\u2080 = <strong>'+bCrit.toFixed(0)+' Ns/m</strong></span>'+
                '<span>Overshoot: <strong>'+currentOS.toFixed(1)+'%</strong></span>';
        }
    }

    // === Explorer 3: Design Challenge ===
    var challengeState = {
        targetSettle: 0,
        targetOS: 0,
        omega0: 0,
        score: 0,
        attempts: 0
    };

    function newChallenge() {
        // Random specs
        challengeState.omega0 = 2 + Math.random() * 4; // ω₀ from 2 to 6
        challengeState.targetSettle = 1 + Math.random() * 3; // settle time 1-4s
        challengeState.targetOS = Math.floor(Math.random() * 3) * 5; // 0%, 5%, or 10%

        document.getElementById('cd-ch-feedback').innerHTML = '';

        var specsDiv = document.getElementById('cd-ch-specs');
        if (specsDiv) {
            specsDiv.innerHTML =
                '<strong>Design Specs:</strong> ' +
                '\u03C9\u2080 = '+challengeState.omega0.toFixed(1)+' rad/s | ' +
                'Settle within <strong>'+challengeState.targetSettle.toFixed(1)+' s</strong> | ' +
                'Overshoot \u2264 <strong>'+challengeState.targetOS+'%</strong>';
        }
        plotChallenge();
    }

    function plotChallenge() {
        var zeta = parseFloat(document.getElementById('cd-ch-zeta').value);
        var omega0 = challengeState.omega0;
        var gamma = zeta * omega0;
        var x0 = 1.0;

        var tFixed = 8;
        var t = [], xArr = [];
        for (var i = 0; i <= N_PTS; i++) {
            var ti = tFixed * i / N_PTS;
            t.push(ti);
            xArr.push(dampedSoln(ti, x0, gamma, omega0));
        }

        var color = regimeColor(gamma, omega0);
        var traces = [];
        traces.push({x:t, y:xArr, mode:'lines', line:{color:color, width:2.5}, name:'\u03B6 = '+zeta.toFixed(2)});

        // Settling time target region
        traces.push({x:[challengeState.targetSettle, challengeState.targetSettle], y:[-0.5, 1.2], mode:'lines',
            line:{color:'#ffff00', width:1.5, dash:'dashdot'}, name:'Settle deadline'});

        // ±5% band
        traces.push({x:[0, tFixed], y:[0.05, 0.05], mode:'lines', line:{color:'rgba(255,255,0,0.3)', width:1}, showlegend:false});
        traces.push({x:[0, tFixed], y:[-0.05, -0.05], mode:'lines', line:{color:'rgba(255,255,0,0.3)', width:1}, showlegend:false});

        var layout = {
            title:{text:'Your Design Response', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0, tFixed], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Displacement', range:[-0.5, 1.2], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.4, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('cd-ch-plot', traces, layout);
    }

    function checkDesign() {
        var zeta = parseFloat(document.getElementById('cd-ch-zeta').value);
        var omega0 = challengeState.omega0;
        var gamma = zeta * omega0;
        var x0 = 1.0;

        // Compute actual overshoot and settling time
        var actualOS = overshootPct(zeta);
        var actualSettle = 8;
        for (var i = 1; i <= N_PTS; i++) {
            var ti = 8 * i / N_PTS;
            if (Math.abs(dampedSoln(ti, x0, gamma, omega0)) < 0.05) { actualSettle = ti; break; }
        }

        challengeState.attempts++;
        var osOK = actualOS <= challengeState.targetOS + 1; // 1% tolerance
        var settleOK = actualSettle <= challengeState.targetSettle + 0.2;

        var feedback = document.getElementById('cd-ch-feedback');
        if (osOK && settleOK) {
            challengeState.score++;
            feedback.innerHTML = '<span style="color:#00ff9f;">\u2705 Design meets specs! OS = '+actualOS.toFixed(1)+'%, Settle = '+actualSettle.toFixed(2)+'s. Score: '+challengeState.score+'/'+challengeState.attempts+'</span>';
        } else {
            var issues = [];
            if (!osOK) issues.push('Overshoot '+actualOS.toFixed(1)+'% > '+challengeState.targetOS+'%');
            if (!settleOK) issues.push('Settle time '+actualSettle.toFixed(2)+'s > '+challengeState.targetSettle.toFixed(1)+'s');
            feedback.innerHTML = '<span style="color:#ff6b6b;">\u274C Not quite: '+issues.join(', ')+'. Score: '+challengeState.score+'/'+challengeState.attempts+'</span>';
        }
    }

    // === Event Handlers ===
    function attachEventHandlers() {
        // Explorer 1
        var drSliders = ['cd-dr-k','cd-dr-b'];
        for (var i = 0; i < drSliders.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(0); }
                    plotDoor();
                });
            })(drSliders[i]);
        }

        // Explorer 2
        var spSliders = ['cd-sp-mass','cd-sp-k','cd-sp-b'];
        for (var i = 0; i < spSliders.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(0); }
                    plotSuspension();
                });
            })(spSliders[i]);
        }

        // Explorer 3
        var chZeta = document.getElementById('cd-ch-zeta');
        if (chZeta) chZeta.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = parseFloat(this.value).toFixed(2); }
            plotChallenge();
        });

        var checkBtn = document.getElementById('cd-ch-check');
        if (checkBtn) checkBtn.addEventListener('click', checkDesign);
    }

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('cd-dr-plot');
        var p2 = document.getElementById('cd-sp-plot');
        var p3 = document.getElementById('cd-ch-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        plotDoor();
        plotSuspension();
        newChallenge();
        attachEventHandlers();
    }

    // === Global resets ===
    window.resetDoor = function() {
        var defs = {'cd-dr-k':['20','20'],'cd-dr-b':['20','20']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotDoor();
    };

    window.resetSuspension = function() {
        var defs = {'cd-sp-mass':['300','300'],'cd-sp-k':['20000','20000'],'cd-sp-b':['3000','3000']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotSuspension();
    };

    window.newChallenge = newChallenge;

    initializePlots();
})();
