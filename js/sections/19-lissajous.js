(function() {
    'use strict';

    // === Constants ===
    var TWO_PI = 2 * Math.PI;

    // === Explorer 1: Lissajous Generator ===
    function plotLissajous() {
        var wx = parseFloat(document.getElementById('lj-wx-slider').value);
        var wy = parseFloat(document.getElementById('lj-wy-slider').value);
        var phiX = parseFloat(document.getElementById('lj-phix-slider').value);
        var phiY = parseFloat(document.getElementById('lj-phiy-slider').value);
        var Ax = 1.0, Ay = 1.0;

        // Time range: enough for pattern to close (or long for irrational)
        var tMax = 20 * TWO_PI;
        var N = 4000;

        var t = [], xArr = [], yArr = [];
        for (var i = 0; i <= N; i++) {
            var ti = tMax * i / N;
            t.push(ti);
            xArr.push(Ax * Math.cos(wx * ti + phiX));
            yArr.push(Ay * Math.cos(wy * ti + phiY));
        }

        // LEFT: parametric (x,y)
        var traces1 = [];
        traces1.push({x:xArr, y:yArr, mode:'lines', line:{color:'#00f3ff', width:1.5}, showlegend:false});
        // Start marker
        traces1.push({x:[xArr[0]], y:[yArr[0]], mode:'markers', marker:{size:8, color:'#ffff00', symbol:'circle'}, name:'Start', showlegend:false});

        var layout1 = {
            title:{text:'Lissajous Figure (\u03C9\u2093:\u03C9\u1D67 = '+wx.toFixed(1)+':'+wy.toFixed(1)+')', font:{size:13}},
            xaxis:{title:'x(t)', range:[-1.4, 1.4], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080', scaleanchor:'y'},
            yaxis:{title:'y(t)', range:[-1.4, 1.4], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('lj-parametric-plot', traces1, layout1);

        // RIGHT: time domain
        var tShort = [], xShort = [], yShort = [];
        var NShort = Math.min(800, N);
        for (var i = 0; i <= NShort; i++) {
            tShort.push(t[i]);
            xShort.push(xArr[i]);
            yShort.push(yArr[i]);
        }
        var tMaxShort = t[NShort];

        var traces2 = [];
        traces2.push({x:tShort, y:xShort, mode:'lines', line:{color:'#00f3ff', width:1.5}, name:'x(t)'});
        traces2.push({x:tShort, y:yShort, mode:'lines', line:{color:'#ff00ff', width:1.5}, name:'y(t)'});

        var layout2 = {
            title:{text:'Time Domain', font:{size:13}},
            xaxis:{title:'t', range:[0, tMaxShort], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Displacement', range:[-1.4, 1.4], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('lj-time-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('lj-gen-stats');
        if (statsDiv) {
            var ratio = wx / wy;
            var dPhiDeg = ((phiY - phiX) * 180 / Math.PI);
            while (dPhiDeg > 180) dPhiDeg -= 360;
            while (dPhiDeg < -180) dPhiDeg += 360;

            // Identify shape
            var shape = '';
            if (Math.abs(wx - wy) < 0.05) {
                var dp = Math.abs(phiY - phiX) % TWO_PI;
                if (dp > Math.PI) dp = TWO_PI - dp;
                if (dp < 0.1 || Math.abs(dp - Math.PI) < 0.1) shape = 'Line';
                else if (Math.abs(dp - Math.PI/2) < 0.1) shape = 'Circle';
                else shape = 'Ellipse';
            } else {
                // Check rational ratio
                var found = false;
                for (var p = 1; p <= 8; p++) {
                    for (var q = 1; q <= 8; q++) {
                        if (Math.abs(ratio - p/q) < 0.05) {
                            shape = p + ':' + q + ' closed curve';
                            found = true; break;
                        }
                    }
                    if (found) break;
                }
                if (!found) shape = 'Open (fills region)';
            }

            statsDiv.innerHTML =
                '<span>\u03C9\u2093 = '+wx.toFixed(1)+'</span>'+
                '<span>\u03C9\u1D67 = '+wy.toFixed(1)+'</span>'+
                '<span>\u03C9\u2093/\u03C9\u1D67 = '+ratio.toFixed(3)+'</span>'+
                '<span>\u0394\u03C6 = '+dPhiDeg.toFixed(0)+'\u00B0</span>'+
                '<span>Shape: <strong>'+shape+'</strong></span>';
        }
    }

    // === Explorer 2: Pattern Gallery ===
    var galleryPresets = {
        line:     {wx:1, wy:1, phiX:0, phiY:0,         label:'Straight Line (1:1, \u0394\u03C6=0\u00B0)'},
        circle:   {wx:1, wy:1, phiX:0, phiY:Math.PI/2, label:'Circle (1:1, \u0394\u03C6=90\u00B0)'},
        ellipse:  {wx:1, wy:1, phiX:0, phiY:Math.PI/4, label:'Ellipse (1:1, \u0394\u03C6=45\u00B0)'},
        figure8:  {wx:1, wy:2, phiX:0, phiY:Math.PI/2, label:'Figure-8 (1:2, \u0394\u03C6=90\u00B0)'},
        bowtie:   {wx:1, wy:2, phiX:0, phiY:0,         label:'Parabola (1:2, \u0394\u03C6=0\u00B0)'},
        trefoil:  {wx:2, wy:3, phiX:0, phiY:0,         label:'Trefoil (2:3, \u0394\u03C6=0\u00B0)'},
        star:     {wx:3, wy:4, phiX:0, phiY:0,         label:'Star (3:4, \u0394\u03C6=0\u00B0)'}
    };

    function plotGallery() {
        var preset = document.getElementById('lj-gallery-select').value;
        var dPhiOffset = parseFloat(document.getElementById('lj-gallery-phi-slider').value);
        var p = galleryPresets[preset];

        var wx = p.wx, wy = p.wy, phiX = p.phiX, phiY = p.phiY + dPhiOffset;

        var tMax = 20 * TWO_PI;
        var N = 4000;
        var xArr = [], yArr = [];
        for (var i = 0; i <= N; i++) {
            var ti = tMax * i / N;
            xArr.push(Math.cos(wx * ti + phiX));
            yArr.push(Math.cos(wy * ti + phiY));
        }

        var traces = [];
        traces.push({x:xArr, y:yArr, mode:'lines', line:{color:'#ff00ff', width:2}, showlegend:false});
        traces.push({x:[xArr[0]], y:[yArr[0]], mode:'markers', marker:{size:8, color:'#ffff00'}, showlegend:false});

        var dPhiDeg = ((phiY - phiX) * 180 / Math.PI);
        while (dPhiDeg > 180) dPhiDeg -= 360;
        while (dPhiDeg < -180) dPhiDeg += 360;

        var layout = {
            title:{text:p.label + (Math.abs(dPhiOffset) > 0.05 ? ' + '+((dPhiOffset*180/Math.PI).toFixed(0))+'\u00B0' : ''), font:{size:13}},
            xaxis:{title:'x(t)', range:[-1.4, 1.4], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080', scaleanchor:'y'},
            yaxis:{title:'y(t)', range:[-1.4, 1.4], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('lj-gallery-plot', traces, layout);

        var statsDiv = document.getElementById('lj-gallery-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>\u03C9\u2093:\u03C9\u1D67 = '+wx+':'+wy+'</span>'+
                '<span>\u0394\u03C6<sub>total</sub> = '+dPhiDeg.toFixed(0)+'\u00B0</span>'+
                '<span style="color:#00f3ff">Drag the phase slider to morph the shape</span>';
        }
    }

    // === Explorer 3: Rational vs Irrational ===
    function plotRational() {
        var ratioVal = parseFloat(document.getElementById('lj-ratio-slider').value);
        var nCycles = parseFloat(document.getElementById('lj-cycles-slider').value);
        var snapOn = document.getElementById('lj-snap-btn').getAttribute('data-active') === 'true';

        // Snap to nearest simple rational if enabled
        var displayRatio = ratioVal;
        if (snapOn) {
            var bestP = 1, bestQ = 1, bestErr = 999;
            for (var p = 1; p <= 8; p++) {
                for (var q = 1; q <= 8; q++) {
                    var err = Math.abs(ratioVal - p/q);
                    if (err < bestErr) { bestErr = err; bestP = p; bestQ = q; }
                }
            }
            displayRatio = bestP / bestQ;
        }

        var wx = displayRatio, wy = 1.0;
        var phiY = Math.PI / 4; // Small phase offset for visual interest

        var tMax = nCycles * TWO_PI;
        var N = Math.round(nCycles * 500);
        if (N > 10000) N = 10000;

        var xArr = [], yArr = [];
        for (var i = 0; i <= N; i++) {
            var ti = tMax * i / N;
            xArr.push(Math.cos(wx * ti));
            yArr.push(Math.cos(wy * ti + phiY));
        }

        // Check if curve closes: does endpoint match start?
        var dx = Math.abs(xArr[N] - xArr[0]);
        var dy = Math.abs(yArr[N] - yArr[0]);
        var isClosed = (dx < 0.05 && dy < 0.05);

        // Color by time for visual clarity
        var colors = [];
        for (var i = 0; i <= N; i++) {
            colors.push(i);
        }

        var traces = [];
        traces.push({
            x:xArr, y:yArr, mode:'lines',
            line:{color:'#00f3ff', width:1.5},
            showlegend:false
        });
        // Start and end markers
        traces.push({x:[xArr[0]], y:[yArr[0]], mode:'markers', marker:{size:10, color:'#00ff9f', symbol:'circle'}, name:'Start'});
        traces.push({x:[xArr[N]], y:[yArr[N]], mode:'markers', marker:{size:10, color:'#ff6b6b', symbol:'x'}, name:'End'});

        var ratioStr = snapOn ? (bestP + '/' + bestQ) : displayRatio.toFixed(3);
        var layout = {
            title:{text:'\u03C9\u2093/\u03C9\u1D67 = ' + ratioStr + ' (' + nCycles.toFixed(0) + ' cycles)', font:{size:13}},
            xaxis:{title:'x(t)', range:[-1.4, 1.4], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080', scaleanchor:'y'},
            yaxis:{title:'y(t)', range:[-1.4, 1.4], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('lj-rational-plot', traces, layout);

        var statsDiv = document.getElementById('lj-rational-stats');
        if (statsDiv) {
            var closedMsg = isClosed ?
                '<span style="color:#00ff9f">\u2714 Curve closed! (rational ratio)</span>' :
                '<span style="color:#ff6b6b">\u2718 Not closed yet (try more cycles, or snap to rational)</span>';

            statsDiv.innerHTML =
                '<span>\u03C9\u2093/\u03C9\u1D67 = <strong>'+ratioStr+'</strong></span>'+
                '<span>Cycles: <strong>'+nCycles.toFixed(0)+'</strong></span>'+
                '<span>Start \u2192 End gap: <strong>'+(Math.sqrt(dx*dx+dy*dy)).toFixed(3)+'</strong></span>'+
                closedMsg;
        }
    }

    window.toggleSnap = function() {
        var btn = document.getElementById('lj-snap-btn');
        if (!btn) return;
        var active = btn.getAttribute('data-active') === 'true';
        btn.setAttribute('data-active', active ? 'false' : 'true');
        btn.style.background = active ? '' : '#00ff9f';
        btn.style.color = active ? '' : '#0a0e1a';
        btn.textContent = active ? 'Snap: OFF' : 'Snap: ON';
        plotRational();
    };

    // === Event Handlers ===
    function attachEventHandlers() {
        // Explorer 1 sliders
        var sliderIds1 = ['lj-wx-slider','lj-wy-slider','lj-phix-slider','lj-phiy-slider'];
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
                                v.textContent = parseFloat(this.value).toFixed(1);
                            }
                        }
                    }
                    plotLissajous();
                });
            })(sliderIds1[i]);
        }

        // Explorer 2
        var galSelect = document.getElementById('lj-gallery-select');
        if (galSelect) galSelect.addEventListener('change', function() {
            // Reset phase offset when changing preset
            var phiSl = document.getElementById('lj-gallery-phi-slider');
            if (phiSl) {
                phiSl.value = 0;
                var lb = phiSl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '0\u00B0'; }
            }
            plotGallery();
        });
        var galPhiSl = document.getElementById('lj-gallery-phi-slider');
        if (galPhiSl) galPhiSl.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) {
                var v = label.querySelector('.control-label-value');
                if (v) v.textContent = (parseFloat(this.value)*180/Math.PI).toFixed(0) + '\u00B0';
            }
            plotGallery();
        });

        // Explorer 3 sliders
        var sliderIds3 = ['lj-ratio-slider','lj-cycles-slider'];
        for (var i = 0; i < sliderIds3.length; i++) {
            (function(sid) {
                var sl = document.getElementById(sid);
                if (sl) sl.addEventListener('input', function() {
                    var label = this.closest('.control-group');
                    if (label) {
                        var v = label.querySelector('.control-label-value');
                        if (v) {
                            if (sid === 'lj-ratio-slider') v.textContent = parseFloat(this.value).toFixed(2);
                            else v.textContent = this.value;
                        }
                    }
                    plotRational();
                });
            })(sliderIds3[i]);
        }
    }

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('lj-parametric-plot');
        var p2 = document.getElementById('lj-gallery-plot');
        var p3 = document.getElementById('lj-rational-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        plotLissajous();
        plotGallery();
        plotRational();
        attachEventHandlers();
    }

    // === Global resets ===
    window.resetLissajous = function() {
        var defs = {
            'lj-wx-slider': ['1.0','1.0'], 'lj-wy-slider': ['2.0','2.0'],
            'lj-phix-slider': ['0','0\u00B0'], 'lj-phiy-slider': ['0','0\u00B0']
        };
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        plotLissajous();
    };

    window.resetGallery = function() {
        var sel = document.getElementById('lj-gallery-select');
        if (sel) sel.value = 'circle';
        var phiSl = document.getElementById('lj-gallery-phi-slider');
        if (phiSl) { phiSl.value = 0; var lb = phiSl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '0\u00B0'; } }
        plotGallery();
    };

    window.resetRational = function() {
        var defs = {'lj-ratio-slider': ['1.41','1.41'], 'lj-cycles-slider': ['10','10']};
        for (var id in defs) {
            var sl = document.getElementById(id);
            if (sl) { sl.value = defs[id][0]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = defs[id][1]; } }
        }
        var btn = document.getElementById('lj-snap-btn');
        if (btn) { btn.setAttribute('data-active', 'false'); btn.style.background = ''; btn.style.color = ''; btn.textContent = 'Snap: OFF'; }
        plotRational();
    };

    initializePlots();
})();
