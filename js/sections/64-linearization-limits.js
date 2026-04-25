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
        var h=T/N,X=[x0],Y=[y0],t=[0],x=x0,y=y0;
        for(var i=0;i<N;i++){
            var k1x=f(x,y),k1y=g(x,y);
            var k2x=f(x+h/2*k1x,y+h/2*k1y),k2y=g(x+h/2*k1x,y+h/2*k1y);
            var k3x=f(x+h/2*k2x,y+h/2*k2y),k3y=g(x+h/2*k2x,y+h/2*k2y);
            var k4x=f(x+h*k3x,y+h*k3y),k4y=g(x+h*k3x,y+h*k3y);
            x+=h/6*(k1x+2*k2x+2*k3x+k4x);y+=h/6*(k1y+2*k2y+2*k3y+k4y);
            if(x*x+y*y>100)break;
            X.push(x);Y.push(y);t.push((i+1)*h);
        }
        return {X:X,Y:Y,t:t};
    }

    // ===============================================================
    // EXPLORER 1: Success vs Failure
    // ===============================================================
    var pairs = {
        centerPair: {
            success: {
                f: function(x,y){return -y;}, g: function(x,y){return x;},
                label: 'ẋ=−y, ẏ=x (true center)'
            },
            failure: {
                f: function(x,y){return -y+0.1*x*(x*x+y*y);},
                g: function(x,y){return x+0.1*y*(x*x+y*y);},
                label: 'ẋ=−y+0.1x·r², ẏ=x+0.1y·r² (unstable spiral)'
            },
            desc: 'Both have J=[[0,−1],[1,0]] at origin (λ=±i). Left: true center. Right: nonlinear r² term breaks it.'
        },
        weakDamping: {
            success: {
                f: function(x,y){return -0.05*x-y;}, g: function(x,y){return x-0.05*y;},
                label: 'ẋ=−0.05x−y, ẏ=x−0.05y (true stable spiral)'
            },
            failure: {
                f: function(x,y){return -0.05*x-y+0.3*x*(x*x+y*y);},
                g: function(x,y){return x-0.05*y+0.3*y*(x*x+y*y);},
                label: '+ 0.3·r² nonlinear term (limit cycle!)'
            },
            desc: 'Left: weak damping gives stable spiral (trustworthy). Right: strong nonlinear term overwhelms weak damping.'
        }
    };

    function drawPair() {
        var key = document.getElementById('lf-pair-select').value;
        var pair = pairs[key];

        ['success','failure'].forEach(function(side) {
            var sys = pair[side];
            var plotId = side === 'success' ? 'lf-successPlot' : 'lf-failurePlot';
            var traces = [];

            for(var k=0;k<6;k++){
                var th=k*Math.PI/3,r=0.8;
                var sol=rk4Solve(sys.f,sys.g,r*Math.cos(th),r*Math.sin(th),20,3000);
                traces.push({x:sol.X,y:sol.Y,type:'scatter',mode:'lines',
                    line:{color:trajColors[k],width:1.5},hoverinfo:'none',showlegend:false});
            }
            traces.push({x:[0],y:[0],type:'scatter',mode:'markers',
                marker:{color:'#ffbe0b',size:10,line:{color:'white',width:2}},
                hoverinfo:'none',showlegend:false});

            Plotly.react(plotId,traces,Object.assign({},darkLayout,{
                xaxis:Object.assign(axStyle([-3,3],'x'),{scaleanchor:'y'}),
                yaxis:axStyle([-3,3],'y'),height:400,
                annotations:[{x:0,y:2.7,text:side==='success'?'Linearization Succeeds':'Linearization Fails',
                    font:{color:side==='success'?'#00ff88':'#ff006e',size:12},showarrow:false}]
            }),{responsive:true});
        });

        document.getElementById('lf-stats1').innerHTML=
            '<span><strong>Same Jacobian, different nonlinear terms</strong></span>'+
            '<span>'+pair.desc+'</span>';
    }

    // ===============================================================
    // EXPLORER 2: Nonlinear Effect Tuner
    // ===============================================================
    function drawTuner() {
        var eps = parseFloat(document.getElementById('lf-eps-slider').value);
        var omega = parseFloat(document.getElementById('lf-omega-slider').value);

        // ẋ = -ω·y + ε·x·(x²+y²), ẏ = ω·x + ε·y·(x²+y²)
        var f = function(x,y){return -omega*y + eps*x*(x*x+y*y);};
        var g = function(x,y){return omega*x + eps*y*(x*x+y*y);};

        // Phase portrait
        var traces = [];
        var T = Math.abs(eps) < 0.01 ? 15 : (eps > 0 ? 8 : 20);
        for(var k=0;k<6;k++){
            var th=k*Math.PI/3,r=0.7;
            var sol=rk4Solve(f,g,r*Math.cos(th),r*Math.sin(th),T,3000);
            traces.push({x:sol.X,y:sol.Y,type:'scatter',mode:'lines',
                line:{color:trajColors[k],width:1.5},hoverinfo:'none',showlegend:false});
        }
        traces.push({x:[0],y:[0],type:'scatter',mode:'markers',
            marker:{color:'#ffbe0b',size:10,line:{color:'white',width:2}},
            hoverinfo:'none',showlegend:false});

        var type = Math.abs(eps)<0.01 ? 'Center' : (eps>0 ? 'Unstable Spiral' : 'Stable Spiral');
        var color = Math.abs(eps)<0.01 ? '#ffbe0b' : (eps>0 ? '#ff006e' : '#00ff88');

        Plotly.react('lf-tunerPlot',traces,Object.assign({},darkLayout,{
            xaxis:Object.assign(axStyle([-3,3],'x'),{scaleanchor:'y'}),
            yaxis:axStyle([-3,3],'y'),height:400,
            annotations:[{x:0,y:2.7,text:type,font:{color:color,size:13},showarrow:false}]
        }),{responsive:true});

        // Time series (radius vs time)
        var sol = rk4Solve(f,g,0.7,0,T,3000);
        var rArr = [];
        for(var i=0;i<sol.X.length;i++){
            rArr.push(Math.sqrt(sol.X[i]*sol.X[i]+sol.Y[i]*sol.Y[i]));
        }

        Plotly.react('lf-tunerTimePlot',[
            {x:sol.t,y:sol.X,type:'scatter',mode:'lines',line:{color:'#00f3ff',width:2},name:'x(t)'},
            {x:sol.t,y:rArr,type:'scatter',mode:'lines',line:{color:'#ff006e',width:1.5,dash:'dash'},name:'r(t)'}
        ],Object.assign({},darkLayout,{
            xaxis:axStyle([0,T],'Time t'),
            yaxis:axStyle([-3,3],'x(t) and r(t)'),height:400,
            legend:{x:0.02,y:0.98,font:{color:'#aaa',size:10}}
        }),{responsive:true});

        document.getElementById('lf-stats2').innerHTML=
            '<span><strong>'+type+'</strong> (ε = '+eps.toFixed(2)+', ω = '+omega.toFixed(1)+')</span>'+
            '<span>Jacobian at origin: [[0, −'+omega.toFixed(1)+'], ['+omega.toFixed(1)+', 0]] — always λ = ±'+omega.toFixed(1)+'i</span>'+
            '<span>'+(Math.abs(eps)<0.01?'Pure center — closed orbits':'Nonlinear term ε·r² '+
                (eps>0?'pushes outward → unstable':'pulls inward → stable'))+'</span>';
    }

    // ===============================================================
    // EXPLORER 3: Trust Region Summary
    // ===============================================================
    var systemExamples = {
        physics: [
            {tau:-0.6,delta:2,label:'Damped\nPendulum',color:'#00f3ff'},
            {tau:-4,delta:4,label:'Overdamped\nSHO',color:'#00f3ff'},
            {tau:0,delta:4,label:'Undamped\nSHO',color:'#ffbe0b'},
            {tau:0.6,delta:1,label:'Van der Pol\n(origin)',color:'#ff006e'}
        ],
        biology: [
            {tau:0,delta:2,label:'Lotka-\nVolterra',color:'#ffbe0b'},
            {tau:-2,delta:-3,label:'Competing\nSpecies',color:'#00ff88'},
            {tau:-1,delta:0.5,label:'SIR\nEndemic',color:'#00f3ff'}
        ]
    };

    function drawTrustSummary() {
        var filter = document.getElementById('lf-show-systems').value;

        // τ-Δ background
        var nMap=60,tArr=[],dArr=[],z=[];
        for(var j=0;j<nMap;j++){
            var dv=-3+j*10/(nMap-1);dArr.push(dv);var row=[];
            for(var i=0;i<nMap;i++){
                var tv=-5+i*10/(nMap-1);if(j===0)tArr.push(tv);
                // 0=danger, 1=safe
                if(Math.abs(tv)<0.2&&dv>0) row.push(0); // τ≈0 inside parabola
                else if(Math.abs(dv)<0.15) row.push(0.5); // Δ≈0
                else row.push(1);
            }
            z.push(row);
        }

        var traces = [{z:z,x:tArr,y:dArr,type:'heatmap',
            colorscale:[[0,'rgba(255,190,11,0.25)'],[0.5,'rgba(255,87,34,0.15)'],[1,'rgba(0,255,136,0.08)']],
            showscale:false,hoverinfo:'skip'}];

        // Parabola
        var pT=[],pD=[];for(var t=-5;t<=5;t+=0.05){pT.push(t);pD.push(t*t/4);}
        traces.push({x:pT,y:pD,type:'scatter',mode:'lines',line:{color:'rgba(255,255,255,0.5)',width:2},hoverinfo:'skip',showlegend:false});

        // Danger axes
        traces.push({x:[0,0],y:[0,7],type:'scatter',mode:'lines',
            line:{color:'#ffbe0b',width:4},name:'τ=0 (centers — CAUTION)',hoverinfo:'skip'});
        traces.push({x:[-5,5],y:[0,0],type:'scatter',mode:'lines',
            line:{color:'#ff5722',width:2,dash:'dash'},name:'Δ=0 (zero eigenvalue — CAUTION)',hoverinfo:'skip'});

        // Region labels
        var annotations = [
            {x:-3,y:5,text:'✓ Stable Node',font:{color:'#00ff88',size:10},showarrow:false},
            {x:3,y:5,text:'✓ Unstable Node',font:{color:'#00ff88',size:10},showarrow:false},
            {x:-1.5,y:1.5,text:'✓ Stable Spiral',font:{color:'#00ff88',size:10},showarrow:false},
            {x:1.5,y:1.5,text:'✓ Unstable Spiral',font:{color:'#00ff88',size:10},showarrow:false},
            {x:0,y:-1.5,text:'✓ Saddle',font:{color:'#00ff88',size:10},showarrow:false},
            {x:0,y:3.5,text:'⚠ Center',font:{color:'#ffbe0b',size:11},showarrow:false}
        ];

        // System markers
        var systems = [];
        if(filter==='all'||filter==='physics') systems=systems.concat(systemExamples.physics);
        if(filter==='all'||filter==='biology') systems=systems.concat(systemExamples.biology);

        for(var i=0;i<systems.length;i++){
            var s=systems[i];
            traces.push({x:[s.tau],y:[s.delta],type:'scatter',mode:'markers+text',
                marker:{color:s.color,size:12,line:{color:'white',width:2}},
                text:[s.label],textposition:'top center',
                textfont:{color:s.color,size:9},
                hoverinfo:'none',showlegend:false});
        }

        Plotly.react('lf-trustSummaryPlot',traces,Object.assign({},darkLayout,{
            xaxis:axStyle([-5,5],'τ (trace)'),yaxis:axStyle([-3,7],'Δ (determinant)'),height:460,
            annotations:annotations,
            legend:{x:0.01,y:0.01,font:{color:'#aaa',size:9}}
        }),{responsive:true});

        var nSafe=0,nDanger=0;
        for(var i=0;i<systems.length;i++){
            if(Math.abs(systems[i].tau)<0.1&&systems[i].delta>0) nDanger++;
            else nSafe++;
        }
        document.getElementById('lf-stats3').innerHTML=
            '<span><strong>Trust Map Summary</strong></span>'+
            '<span>Showing '+(filter==='all'?'all':filter)+' examples: '+nSafe+' hyperbolic (safe), '+nDanger+' non-hyperbolic (caution)</span>'+
            '<span>Green ✓ = trust linearization  |  Yellow ⚠ = need additional analysis</span>';
    }

    // ===============================================================
    // Global functions
    // ===============================================================
    window.lfPairReset=function(){document.getElementById('lf-pair-select').value='centerPair';drawPair();};
    window.lfTunerReset=function(){
        document.getElementById('lf-eps-slider').value=0;document.getElementById('lf-omega-slider').value=1;
        document.getElementById('lf-eps-value').textContent='0.00';document.getElementById('lf-omega-value').textContent='1.0';
        drawTuner();
    };
    window.lfTrustReset=function(){document.getElementById('lf-show-systems').value='all';drawTrustSummary();};

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots(){
        if(typeof Plotly==='undefined'){setTimeout(initializePlots,100);return;}
        if(!document.getElementById('lf-successPlot')){setTimeout(initializePlots,100);return;}

        drawPair();
        document.getElementById('lf-pair-select').addEventListener('change',drawPair);

        drawTuner();
        document.getElementById('lf-eps-slider').addEventListener('input',function(){
            document.getElementById('lf-eps-value').textContent=parseFloat(this.value).toFixed(2);drawTuner();
        });
        document.getElementById('lf-omega-slider').addEventListener('input',function(){
            document.getElementById('lf-omega-value').textContent=parseFloat(this.value).toFixed(1);drawTuner();
        });

        drawTrustSummary();
        document.getElementById('lf-show-systems').addEventListener('change',drawTrustSummary);
    }

    initializePlots();
})();
