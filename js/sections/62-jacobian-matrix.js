(function() {
    'use strict';

    var darkLayout = {
        template: 'plotly_dark',
        margin: { t: 30, r: 20, b: 45, l: 55 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    };

    function axStyle(range, title) {
        return { gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080', range: range, title: title || '' };
    }

    var trajColors = ['#00f3ff','#ff006e','#ffbe0b','#00ff88','#bb86fc','#ff5722','#76ff03','#40c4ff'];

    function rk4Solve(f, g, x0, y0, T, N) {
        var h = T/N, X=[x0], Y=[y0], x=x0, y=y0;
        for (var i=0; i<N; i++) {
            var k1x=f(x,y), k1y=g(x,y);
            var k2x=f(x+h/2*k1x,y+h/2*k1y), k2y=g(x+h/2*k1x,y+h/2*k1y);
            var k3x=f(x+h/2*k2x,y+h/2*k2y), k3y=g(x+h/2*k2x,y+h/2*k2y);
            var k4x=f(x+h*k3x,y+h*k3y), k4y=g(x+h*k3x,y+h*k3y);
            x += h/6*(k1x+2*k2x+2*k3x+k4x);
            y += h/6*(k1y+2*k2y+2*k3y+k4y);
            if (Math.abs(x)>20||Math.abs(y)>20) break;
            X.push(x); Y.push(y);
        }
        return {X:X, Y:Y};
    }

    function fieldArrows(f, g, xR, yR, n) {
        var ax=[], ay=[], sx=2*xR/(n-1), sy=2*yR/(n-1), sc=Math.min(sx,sy)*0.32;
        for (var i=0;i<n;i++) for (var j=0;j<n;j++) {
            var px=-xR+i*sx, py=-yR+j*sy, fx=f(px,py), fy=g(px,py);
            var mag=Math.sqrt(fx*fx+fy*fy);
            if(mag<1e-8) continue;
            ax.push(px,px+fx/mag*sc,null); ay.push(py,py+fy/mag*sc,null);
        }
        return {x:ax, y:ay};
    }

    function classify(tau, delta) {
        if (delta < -0.01) return 'Saddle';
        if (Math.abs(delta) < 0.01) return 'Degenerate';
        var disc = tau*tau - 4*delta;
        if (Math.abs(tau) < 0.05) return 'Center';
        if (disc < -0.01) return tau < 0 ? 'Stable Spiral' : 'Unstable Spiral';
        return tau < 0 ? 'Stable Node' : 'Unstable Node';
    }

    function eigenStr(tau, delta) {
        var disc = tau*tau - 4*delta;
        if (Math.abs(disc)<0.01) return 'λ = '+(tau/2).toFixed(2)+' (repeated)';
        if (disc>0) { var s=Math.sqrt(disc); return 'λ₁='+ ((tau+s)/2).toFixed(2)+', λ₂='+((tau-s)/2).toFixed(2); }
        return 'λ = '+(tau/2).toFixed(2)+' ± '+Math.abs(Math.sqrt(-disc)/2).toFixed(2)+'i';
    }

    // ===== System definitions =====
    var sysDefs = {
        lotkaVolterra: {
            f: function(x,y){return x*(2-y);}, g: function(x,y){return y*(-1+x);},
            J: function(x,y){return [[2-y,-x],[y,-1+x]];},
            fps: [[0,0,'Origin'],[1,2,'Coexistence']],
            xR:[-0.5,4], yR:[-0.5,4], label:'ẋ=x(2−y), ẏ=y(−1+x)'
        },
        competition: {
            f: function(x,y){return x*(3-x-2*y);}, g: function(x,y){return y*(2-x-y);},
            J: function(x,y){return [[3-2*x-2*y,-2*x],[-y,2-x-2*y]];},
            fps: [[0,0,'Origin'],[3,0,'Sp.1 wins'],[0,2,'Sp.2 wins'],[1,1,'Coexistence']],
            xR:[-0.5,4], yR:[-0.5,3], label:'ẋ=x(3−x−2y), ẏ=y(2−x−y)'
        },
        vanderpol: {
            f: function(x,y){return y;}, g: function(x,y){return -x+0.5*(1-x*x)*y;},
            J: function(x,y){return [[0,1],[-1-x*y, 0.5*(1-x*x)]];},
            fps: [[0,0,'Origin']],
            xR:[-3,3], yR:[-3,3], label:'ẋ=y, ẏ=−x+μ(1−x²)y, μ=0.5'
        },
        pendulum: {
            f: function(x,y){return y;}, g: function(x,y){return -Math.sin(x)-0.3*y;},
            J: function(x,y){return [[0,1],[-Math.cos(x),-0.3]];},
            fps: [[0,0,'Hanging down'],[Math.PI,0,'Inverted'],[- Math.PI,0,'Inverted']],
            xR:[-4,4], yR:[-3,3], label:'θ̈ + 0.3θ̇ + sin(θ) = 0'
        }
    };

    function updateFPSelect(selectId, fps) {
        var sel = document.getElementById(selectId);
        // Repopulating resets the browser's selection to index 0, which
        // silently discarded the user's choice on every redraw — remember
        // it and restore (clamped) after rebuilding the options
        var prev = parseInt(sel.value);
        sel.innerHTML = '';
        for (var i=0; i<fps.length; i++) {
            var o = document.createElement('option');
            o.value = i;
            o.textContent = '('+fps[i][0].toFixed(1)+', '+fps[i][1].toFixed(1)+') '+fps[i][2];
            sel.appendChild(o);
        }
        sel.value = Math.min(isNaN(prev) ? 0 : prev, Math.max(fps.length - 1, 0));
    }

    // ===============================================================
    // EXPLORER 1: Jacobian Calculator
    // ===============================================================
    function drawExplorer1() {
        var key = document.getElementById('jc-system-select').value;
        var sys = sysDefs[key];
        updateFPSelect('jc-fp-select', sys.fps);
        var fpIdx = parseInt(document.getElementById('jc-fp-select').value) || 0;
        fpIdx = Math.min(fpIdx, sys.fps.length-1);
        var fp = sys.fps[fpIdx];
        var x0=fp[0], y0=fp[1];

        // Vector field + trajectories
        var arr = fieldArrows(sys.f, sys.g, (sys.xR[1]-sys.xR[0])/2, (sys.yR[1]-sys.yR[0])/2, 10);
        var cx = (sys.xR[0]+sys.xR[1])/2, cy = (sys.yR[0]+sys.yR[1])/2;
        var traces = [{x:arr.x,y:arr.y,type:'scatter',mode:'lines',line:{color:'rgba(150,150,150,0.2)',width:1},hoverinfo:'none',showlegend:false}];

        for (var k=0; k<8; k++) {
            var th=k*Math.PI/4, r=0.8;
            var sol = rk4Solve(sys.f, sys.g, x0+r*Math.cos(th), y0+r*Math.sin(th), 12, 2000);
            traces.push({x:sol.X,y:sol.Y,type:'scatter',mode:'lines',line:{color:trajColors[k],width:1.5},hoverinfo:'none',showlegend:false});
        }

        // FP markers
        for (var i=0; i<sys.fps.length; i++) {
            var Jm = sys.J(sys.fps[i][0], sys.fps[i][1]);
            var tau = Jm[0][0]+Jm[1][1], delta = Jm[0][0]*Jm[1][1]-Jm[0][1]*Jm[1][0];
            var isCurrent = (i === fpIdx);
            traces.push({
                x:[sys.fps[i][0]], y:[sys.fps[i][1]], type:'scatter', mode:'markers',
                marker:{color:isCurrent?'#ff006e':'#ffbe0b', size:isCurrent?14:10,
                    symbol: delta>0&&tau<0 ? 'circle' : 'circle-open',
                    line:{color:'white',width:2}},
                hoverinfo:'none', showlegend:false
            });
        }

        Plotly.react('jc-vectorField', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle(sys.xR, 'x'), yaxis: axStyle(sys.yR, 'y'), height:400
        }), {responsive:true});

        // τ-Δ map
        var Jm = sys.J(x0, y0);
        var tau = Jm[0][0]+Jm[1][1], delta = Jm[0][0]*Jm[1][1]-Jm[0][1]*Jm[1][0];
        drawTDMap(tau, delta);

        // Stats — show full Jacobian
        var type = classify(tau, delta);
        document.getElementById('jc-stats1').innerHTML =
            '<span><strong>'+type+'</strong> at ('+x0.toFixed(1)+', '+y0.toFixed(1)+')</span>' +
            '<span>J = [['+Jm[0][0].toFixed(2)+', '+Jm[0][1].toFixed(2)+'], ['+Jm[1][0].toFixed(2)+', '+Jm[1][1].toFixed(2)+']]</span>' +
            '<span>τ = '+tau.toFixed(2)+', Δ = '+delta.toFixed(2)+'</span>' +
            '<span>'+eigenStr(tau,delta)+'</span>';
    }

    function drawTDMap(tau, delta) {
        var pT=[], pD=[];
        for (var t=-5;t<=5;t+=0.05){pT.push(t); pD.push(t*t/4);}
        var traces = [
            {x:pT,y:pD,type:'scatter',mode:'lines',line:{color:'rgba(255,255,255,0.5)',width:1.5},hoverinfo:'skip',showlegend:false},
            {x:[-5,5],y:[0,0],type:'scatter',mode:'lines',line:{color:'rgba(255,190,11,0.4)',width:1,dash:'dash'},hoverinfo:'skip',showlegend:false},
            {x:[0,0],y:[-2,7],type:'scatter',mode:'lines',line:{color:'rgba(0,255,136,0.3)',width:1,dash:'dash'},hoverinfo:'skip',showlegend:false},
            {x:[tau],y:[delta],type:'scatter',mode:'markers',marker:{color:'#ff006e',size:14,symbol:'star',line:{color:'white',width:2}},hoverinfo:'skip',showlegend:false}
        ];
        Plotly.react('jc-tdLocation', traces, Object.assign({}, darkLayout, {
            xaxis:axStyle([-5,5],'τ'), yaxis:axStyle([-2,7],'Δ'), height:400,
            annotations:[
                {x:-3,y:5,text:'Stable<br>Node',font:{color:'#00f3ff',size:9},showarrow:false},
                {x:3,y:5,text:'Unstable<br>Node',font:{color:'#ff006e',size:9},showarrow:false},
                {x:-1,y:2,text:'Stable<br>Spiral',font:{color:'#00f3ff',size:9},showarrow:false},
                {x:1,y:2,text:'Unstable<br>Spiral',font:{color:'#ff006e',size:9},showarrow:false},
                {x:0,y:-1,text:'Saddle',font:{color:'#ff5722',size:10},showarrow:false}
            ]
        }), {responsive:true});
    }

    // ===============================================================
    // EXPLORER 2: Linearization Comparison
    // ===============================================================
    function drawComparison() {
        var key = document.getElementById('jc-cmp-system').value;
        var sys = sysDefs[key];
        updateFPSelect('jc-cmp-fp', sys.fps);
        var fpIdx = parseInt(document.getElementById('jc-cmp-fp').value) || 0;
        fpIdx = Math.min(fpIdx, sys.fps.length-1);
        var fp = sys.fps[fpIdx];
        var x0=fp[0], y0=fp[1];
        var zoom = parseFloat(document.getElementById('jc-zoom-slider').value);

        var Jm = sys.J(x0, y0);
        var linF = function(x,y){ return Jm[0][0]*(x-x0)+Jm[0][1]*(y-y0); };
        var linG = function(x,y){ return Jm[1][0]*(x-x0)+Jm[1][1]*(y-y0); };

        var xR = [x0-zoom*2, x0+zoom*2], yR = [y0-zoom*2, y0+zoom*2];

        // Nonlinear field + trajectories
        var arrNL = fieldArrows(sys.f, sys.g, zoom*2, zoom*2, 10);
        // Offset arrows to center on FP
        var nlAx=[], nlAy=[];
        for (var i=0; i<arrNL.x.length; i++) {
            nlAx.push(arrNL.x[i]===null ? null : arrNL.x[i]+x0);
            nlAy.push(arrNL.y[i]===null ? null : arrNL.y[i]+y0);
        }

        var nlTraces = [{x:nlAx,y:nlAy,type:'scatter',mode:'lines',line:{color:'rgba(150,150,150,0.3)',width:1},hoverinfo:'none',showlegend:false}];
        for (var k=0; k<6; k++) {
            var th=k*Math.PI/3, r=zoom*0.5;
            var sol = rk4Solve(sys.f, sys.g, x0+r*Math.cos(th), y0+r*Math.sin(th), 8, 2000);
            nlTraces.push({x:sol.X,y:sol.Y,type:'scatter',mode:'lines',line:{color:trajColors[k],width:1.5},hoverinfo:'none',showlegend:false});
        }
        nlTraces.push({x:[x0],y:[y0],type:'scatter',mode:'markers',marker:{color:'#ffbe0b',size:10,line:{color:'white',width:2}},hoverinfo:'none',showlegend:false});

        Plotly.react('jc-nonlinearPlot', nlTraces, Object.assign({}, darkLayout, {
            xaxis:axStyle(xR,'x'), yaxis:axStyle(yR,'y'), height:400,
            annotations:[{x:xR[0]+0.3*zoom,y:yR[1]-0.2*zoom,text:'Nonlinear',font:{color:'#00f3ff',size:12},showarrow:false}]
        }), {responsive:true});

        // Linearized field + trajectories
        var arrLin = fieldArrows(linF, linG, zoom*2, zoom*2, 10);
        var linAx=[], linAy=[];
        for (var i=0; i<arrLin.x.length; i++) {
            linAx.push(arrLin.x[i]===null ? null : arrLin.x[i]+x0);
            linAy.push(arrLin.y[i]===null ? null : arrLin.y[i]+y0);
        }

        var linTraces = [{x:linAx,y:linAy,type:'scatter',mode:'lines',line:{color:'rgba(150,150,150,0.3)',width:1},hoverinfo:'none',showlegend:false}];
        for (var k=0; k<6; k++) {
            var th=k*Math.PI/3, r=zoom*0.5;
            var sol = rk4Solve(linF, linG, x0+r*Math.cos(th), y0+r*Math.sin(th), 8, 2000);
            linTraces.push({x:sol.X,y:sol.Y,type:'scatter',mode:'lines',line:{color:trajColors[k],width:1.5},hoverinfo:'none',showlegend:false});
        }
        linTraces.push({x:[x0],y:[y0],type:'scatter',mode:'markers',marker:{color:'#ffbe0b',size:10,line:{color:'white',width:2}},hoverinfo:'none',showlegend:false});

        Plotly.react('jc-linearizedPlot', linTraces, Object.assign({}, darkLayout, {
            xaxis:axStyle(xR,'x'), yaxis:axStyle(yR,'y'), height:400,
            annotations:[{x:xR[0]+0.3*zoom,y:yR[1]-0.2*zoom,text:'Linearized',font:{color:'#ff006e',size:12},showarrow:false}]
        }), {responsive:true});

        var tau = Jm[0][0]+Jm[1][1], delta = Jm[0][0]*Jm[1][1]-Jm[0][1]*Jm[1][0];
        document.getElementById('jc-stats2').innerHTML =
            '<span><strong>'+classify(tau,delta)+'</strong> at ('+x0.toFixed(1)+', '+y0.toFixed(1)+')</span>' +
            '<span>Zoom: ±'+zoom.toFixed(1)+' around FP</span>' +
            '<span>'+eigenStr(tau,delta)+'</span>';
    }

    // ===============================================================
    // EXPLORER 3: Full Pipeline
    // ===============================================================
    function drawPipeline() {
        var key = document.getElementById('jc-pipe-system').value;
        var sys = sysDefs[key];
        updateFPSelect('jc-pipe-fp', sys.fps);
        var fpIdx = parseInt(document.getElementById('jc-pipe-fp').value) || 0;
        fpIdx = Math.min(fpIdx, sys.fps.length-1);
        var fp = sys.fps[fpIdx];
        var x0=fp[0], y0=fp[1];

        var Jm = sys.J(x0, y0);
        var tau = Jm[0][0]+Jm[1][1], delta = Jm[0][0]*Jm[1][1]-Jm[0][1]*Jm[1][0];
        var type = classify(tau, delta);

        // Phase portrait centered on FP
        var arr = fieldArrows(sys.f, sys.g, (sys.xR[1]-sys.xR[0])/2, (sys.yR[1]-sys.yR[0])/2, 12);
        var traces = [{x:arr.x,y:arr.y,type:'scatter',mode:'lines',line:{color:'rgba(150,150,150,0.15)',width:1},hoverinfo:'none',showlegend:false}];

        for (var k=0; k<8; k++) {
            var th=k*Math.PI/4, r=1;
            var sol = rk4Solve(sys.f, sys.g, x0+r*Math.cos(th), y0+r*Math.sin(th), 15, 2000);
            traces.push({x:sol.X,y:sol.Y,type:'scatter',mode:'lines',line:{color:trajColors[k],width:1.5},hoverinfo:'none',showlegend:false});
        }

        // All FPs
        for (var i=0; i<sys.fps.length; i++) {
            var Jfp = sys.J(sys.fps[i][0], sys.fps[i][1]);
            var t2 = Jfp[0][0]+Jfp[1][1], d2 = Jfp[0][0]*Jfp[1][1]-Jfp[0][1]*Jfp[1][0];
            var tp = classify(t2, d2);
            var isCurr = (i===fpIdx);
            traces.push({
                x:[sys.fps[i][0]], y:[sys.fps[i][1]], type:'scatter', mode:'markers+text',
                marker:{color:isCurr?'#ff006e':'#ffbe0b', size:isCurr?14:10,
                    symbol: d2>0&&t2<0 ? 'circle' : 'circle-open',
                    line:{color:'white',width:2}},
                text:[tp], textposition:'top center',
                textfont:{color:isCurr?'#ff006e':'#ffbe0b', size:9},
                hoverinfo:'none', showlegend:false
            });
        }

        Plotly.react('jc-pipelinePlot', traces, Object.assign({}, darkLayout, {
            xaxis: axStyle(sys.xR, 'x'), yaxis: axStyle(sys.yR, 'y'), height:440
        }), {responsive:true});

        // Build pipeline summary
        var pipeline = '';
        for (var i=0; i<sys.fps.length; i++) {
            var Jfp = sys.J(sys.fps[i][0], sys.fps[i][1]);
            var t2 = Jfp[0][0]+Jfp[1][1], d2 = Jfp[0][0]*Jfp[1][1]-Jfp[0][1]*Jfp[1][0];
            pipeline += '('+sys.fps[i][0].toFixed(1)+','+sys.fps[i][1].toFixed(1)+'): '+classify(t2,d2);
            if (i < sys.fps.length-1) pipeline += '  |  ';
        }

        document.getElementById('jc-stats3').innerHTML =
            '<span><strong>'+sys.label+'</strong></span>' +
            '<span>Selected: ('+x0.toFixed(1)+', '+y0.toFixed(1)+') → J = [['+Jm[0][0].toFixed(1)+','+Jm[0][1].toFixed(1)+'],['+Jm[1][0].toFixed(1)+','+Jm[1][1].toFixed(1)+']]</span>' +
            '<span>τ='+tau.toFixed(2)+', Δ='+delta.toFixed(2)+' → '+type+' ('+eigenStr(tau,delta)+')</span>' +
            '<span>All FPs: '+pipeline+'</span>';
    }

    // ===============================================================
    // Global functions
    // ===============================================================
    window.jcReset = function() {
        document.getElementById('jc-system-select').value = 'lotkaVolterra';
        drawExplorer1();
    };
    window.jcCmpReset = function() {
        document.getElementById('jc-cmp-system').value = 'lotkaVolterra';
        document.getElementById('jc-zoom-slider').value = 1;
        document.getElementById('jc-zoom-value').textContent = '1.0';
        drawComparison();
    };
    window.jcPipeReset = function() {
        document.getElementById('jc-pipe-system').value = 'lotkaVolterra';
        drawPipeline();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('jc-vectorField')) { setTimeout(initializePlots, 100); return; }

        drawExplorer1();
        document.getElementById('jc-system-select').addEventListener('change', drawExplorer1);
        document.getElementById('jc-fp-select').addEventListener('change', drawExplorer1);

        drawComparison();
        document.getElementById('jc-cmp-system').addEventListener('change', function() {
            var sys = sysDefs[this.value];
            updateFPSelect('jc-cmp-fp', sys.fps);
            drawComparison();
        });
        document.getElementById('jc-cmp-fp').addEventListener('change', drawComparison);
        document.getElementById('jc-zoom-slider').addEventListener('input', function() {
            document.getElementById('jc-zoom-value').textContent = parseFloat(this.value).toFixed(1);
            drawComparison();
        });

        drawPipeline();
        document.getElementById('jc-pipe-system').addEventListener('change', function() {
            var sys = sysDefs[this.value];
            updateFPSelect('jc-pipe-fp', sys.fps);
            drawPipeline();
        });
        document.getElementById('jc-pipe-fp').addEventListener('change', drawPipeline);
    }

    initializePlots();
})();
