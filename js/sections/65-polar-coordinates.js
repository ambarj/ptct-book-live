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

    var trajColors = ['#00f3ff','#ff006e','#ffbe0b','#00ff88','#bb86fc','#ff5722'];

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

    function rk4_1d(h_func, r0, T, N) {
        var dt=T/N,R=[r0],t=[0],r=r0;
        for(var i=0;i<N;i++){
            var k1=h_func(r);var k2=h_func(r+dt/2*k1);
            var k3=h_func(r+dt/2*k2);var k4=h_func(r+dt*k3);
            r+=dt/6*(k1+2*k2+2*k3+k4);
            if(r<0)r=0;if(r>10)break;
            R.push(r);t.push((i+1)*dt);
        }
        return {R:R,t:t};
    }

    // ===============================================================
    // EXPLORER 1: Polar Transformer
    // ===============================================================
    var polarSystems = {
        stableSpiral:  { rdot: function(r){return -r;},           label: 'ṙ = −r', tdot: '1' },
        unstableSpiral:{ rdot: function(r){return 0.3*r;},        label: 'ṙ = 0.3r', tdot: '1' },
        center:        { rdot: function(r){return 0;},            label: 'ṙ = 0', tdot: '1' },
        limitCycle:    { rdot: function(r){return r*(1-r*r);},    label: 'ṙ = r(1−r²)', tdot: '1' },
        brokenCenter:  { rdot: null, label: 'ṙ = εr³', tdot: '1' } // eps-dependent
    };

    function makeCartesian(rdot_func, omega) {
        return {
            f: function(x,y) {
                var r2=x*x+y*y, r=Math.sqrt(r2);
                if(r<1e-10)return -omega*y;
                var rd=rdot_func(r);
                return rd*x/r - omega*y;
            },
            g: function(x,y) {
                var r2=x*x+y*y, r=Math.sqrt(r2);
                if(r<1e-10)return omega*x;
                var rd=rdot_func(r);
                return rd*y/r + omega*x;
            }
        };
    }

    function drawTransformer() {
        var key = document.getElementById('pc-system-select').value;
        var eps = parseFloat(document.getElementById('pc-eps-slider').value);

        var rdot_func;
        var rdotLabel;
        if(key==='brokenCenter'){
            rdot_func = function(r){return eps*r*r*r;};
            rdotLabel = 'ṙ = '+eps.toFixed(2)+'·r³';
        } else {
            rdot_func = polarSystems[key].rdot;
            rdotLabel = polarSystems[key].label;
        }

        var sys = makeCartesian(rdot_func, 1);

        // Phase portrait
        var traces = [];
        var T = (key==='unstableSpiral'||eps>0.05)?8:20;
        var ics = [0.3, 0.7, 1.0, 1.5, 2.0, 2.5];
        for(var k=0;k<ics.length;k++){
            var sol = rk4Solve(sys.f,sys.g,ics[k],0,T,3000);
            traces.push({x:sol.X,y:sol.Y,type:'scatter',mode:'lines',
                line:{color:trajColors[k],width:1.5},hoverinfo:'none',showlegend:false});
        }

        // Limit cycle circle if applicable
        if(key==='limitCycle'){
            var cx=[],cy=[];
            for(var i=0;i<=100;i++){var a=i*2*Math.PI/100;cx.push(Math.cos(a));cy.push(Math.sin(a));}
            traces.push({x:cx,y:cy,type:'scatter',mode:'lines',
                line:{color:'white',width:2,dash:'dash'},hoverinfo:'none',showlegend:false});
        }

        traces.push({x:[0],y:[0],type:'scatter',mode:'markers',
            marker:{color:'#ffbe0b',size:8,line:{color:'white',width:1.5}},hoverinfo:'none',showlegend:false});

        Plotly.react('pc-cartPlot',traces,Object.assign({},darkLayout,{
            xaxis:Object.assign(axStyle([-3,3],'x'),{scaleanchor:'y'}),
            yaxis:axStyle([-3,3],'y'),height:400,
            annotations:[{x:0,y:2.7,text:'Phase Portrait',font:{color:'#aaa',size:11},showarrow:false}]
        }),{responsive:true});

        // ṙ vs r plot
        var rArr=[],rdArr=[];
        for(var i=0;i<=100;i++){
            var r=i*3/100;rArr.push(r);rdArr.push(rdot_func(r));
        }
        var rdTraces = [
            {x:rArr,y:rdArr,type:'scatter',mode:'lines',line:{color:'#00f3ff',width:2.5},name:rdotLabel},
            {x:[0,3],y:[0,0],type:'scatter',mode:'lines',line:{color:'#808080',width:1,dash:'dot'},showlegend:false,hoverinfo:'skip'}
        ];

        // Mark zeros
        for(var i=1;i<rArr.length;i++){
            if(rdArr[i-1]*rdArr[i]<=0 && rArr[i]>0.05){
                rdTraces.push({x:[rArr[i]],y:[0],type:'scatter',mode:'markers',
                    marker:{color:'white',size:10,line:{color:'white',width:2}},
                    showlegend:false,hoverinfo:'none'});
            }
        }

        var yMax=Math.max.apply(null,rdArr.map(Math.abs))*1.3+0.1;
        Plotly.react('pc-radialPlot',rdTraces,Object.assign({},darkLayout,{
            xaxis:axStyle([0,3],'r'),yaxis:axStyle([-yMax,yMax],'ṙ'),height:400,
            annotations:[{x:1.5,y:yMax*0.8,text:rdotLabel,font:{color:'#00f3ff',size:12},showarrow:false}]
        }),{responsive:true});

        var type = key==='center'&&Math.abs(eps)<0.01 ? 'True Center' :
                   key==='limitCycle' ? 'Stable Limit Cycle at r=1' :
                   key==='stableSpiral' ? 'Stable Spiral' :
                   key==='unstableSpiral' ? 'Unstable Spiral' :
                   eps>0.01 ? 'Unstable Spiral (ε>0)' :
                   eps<-0.01 ? 'Stable Spiral (ε<0)' : 'True Center (ε=0)';

        document.getElementById('pc-stats1').innerHTML=
            '<span><strong>'+type+'</strong></span>'+
            '<span>Polar: '+rdotLabel+', θ̇ = 1</span>'+
            '<span>Jacobian at origin: λ = ±i (always predicts center)</span>';
    }

    // ===============================================================
    // EXPLORER 2: Radial Dynamics Analyzer
    // ===============================================================
    var radialSystems = {
        limitCycle: {h:function(r){return r*(1-r*r);},label:'ṙ = r(1−r²)',rMax:2.5},
        cubic:      {h:function(r){return -r+r*r*r;},label:'ṙ = −r+r³',rMax:2.5},
        bistable:   {h:function(r){return r*(1-r*r)*(r*r-4);},label:'ṙ = r(1−r²)(r²−4)',rMax:3},
        decay:      {h:function(r){return -0.5*r;},label:'ṙ = −0.5r',rMax:3}
    };

    function drawRadial() {
        var key = document.getElementById('pc-radial-system').value;
        var r0 = parseFloat(document.getElementById('pc-r0-slider').value);
        var sys = radialSystems[key];

        // h(r) plot
        var rArr=[],hArr=[];
        for(var i=0;i<=200;i++){
            var r=i*sys.rMax/200;rArr.push(r);hArr.push(sys.h(r));
        }

        var hTraces=[
            {x:rArr,y:hArr,type:'scatter',mode:'lines',line:{color:'#00f3ff',width:2.5},name:sys.label},
            {x:[0,sys.rMax],y:[0,0],type:'scatter',mode:'lines',line:{color:'#808080',width:1,dash:'dot'},showlegend:false,hoverinfo:'skip'},
            {x:[r0],y:[sys.h(r0)],type:'scatter',mode:'markers',
                marker:{color:'#ffbe0b',size:12,line:{color:'white',width:2}},name:'r₀='+r0.toFixed(1)}
        ];

        // Mark zeros and classify
        for(var i=1;i<rArr.length;i++){
            if(hArr[i-1]*hArr[i]<=0&&rArr[i]>0.05){
                var stable=hArr[i-1]>0; // going from + to - = stable
                hTraces.push({x:[rArr[i]],y:[0],type:'scatter',mode:'markers',
                    marker:{color:stable?'#00ff88':'#ff006e',size:10,
                        symbol:stable?'circle':'circle-open',
                        line:{color:'white',width:2}},
                    showlegend:false,hoverinfo:'none'});
            }
        }

        // Flow arrows
        for(var i=0;i<15;i++){
            var r=0.1+i*sys.rMax/15;
            var hr=sys.h(r);
            if(Math.abs(hr)<0.01)continue;
            var dir=hr>0?1:-1;
            hTraces.push({x:[r,r+dir*0.08],y:[0,0],type:'scatter',mode:'lines',
                line:{color:hr>0?'rgba(0,255,136,0.5)':'rgba(255,0,110,0.5)',width:3},
                showlegend:false,hoverinfo:'none'});
        }

        var yMax=Math.max.apply(null,hArr.map(Math.abs))*1.2+0.1;
        Plotly.react('pc-hrPlot',hTraces,Object.assign({},darkLayout,{
            xaxis:axStyle([0,sys.rMax],'r'),yaxis:axStyle([-yMax,yMax],'ṙ = h(r)'),height:400
        }),{responsive:true});

        // r(t) trajectory
        var sol = rk4_1d(sys.h,r0,15,3000);
        Plotly.react('pc-rTimePlot',[
            {x:sol.t,y:sol.R,type:'scatter',mode:'lines',line:{color:'#00f3ff',width:2},name:'r(t)'}
        ],Object.assign({},darkLayout,{
            xaxis:axStyle([0,15],'Time t'),yaxis:axStyle([0,sys.rMax],'r(t)'),height:400
        }),{responsive:true});

        var rFinal=sol.R[sol.R.length-1];
        document.getElementById('pc-stats2').innerHTML=
            '<span><strong>'+sys.label+'</strong></span>'+
            '<span>r₀ = '+r0.toFixed(1)+' → r(∞) ≈ '+rFinal.toFixed(2)+'</span>';
    }

    // ===============================================================
    // EXPLORER 3: Center vs Spiral Resolver
    // ===============================================================
    function drawResolver() {
        var mu = parseFloat(document.getElementById('pc-resolve-mu').value);

        // System: ẋ = -y + μx(1-r²), ẏ = x + μy(1-r²)
        // Polar: ṙ = μr(1-r²), θ̇ = 1
        var rdot = function(r){return mu*r*(1-r*r);};
        var sys = makeCartesian(rdot, 1);

        // Phase portrait
        var traces=[];
        var T = Math.abs(mu)<0.02?15:20;
        var ics=[0.3,0.6,1.0,1.5,2.0];
        for(var k=0;k<ics.length;k++){
            var sol=rk4Solve(sys.f,sys.g,ics[k],0,T,3000);
            traces.push({x:sol.X,y:sol.Y,type:'scatter',mode:'lines',
                line:{color:trajColors[k],width:1.5},hoverinfo:'none',showlegend:false});
        }

        // Limit cycle at r=1 if μ > 0
        if(Math.abs(mu)>0.02){
            var cx=[],cy=[];
            for(var i=0;i<=100;i++){var a=i*2*Math.PI/100;cx.push(Math.cos(a));cy.push(Math.sin(a));}
            traces.push({x:cx,y:cy,type:'scatter',mode:'lines',
                line:{color:'white',width:2,dash:'dash'},hoverinfo:'none',showlegend:false});
        }
        traces.push({x:[0],y:[0],type:'scatter',mode:'markers',
            marker:{color:'#ffbe0b',size:8,line:{color:'white',width:1.5}},hoverinfo:'none',showlegend:false});

        var type = Math.abs(mu)<0.02 ? 'True Center' :
                   mu>0 ? 'Unstable origin + Stable limit cycle at r=1' :
                   'Stable spiral (all → origin)';
        var typeColor = Math.abs(mu)<0.02?'#ffbe0b':mu>0?'#00ff88':'#00f3ff';

        Plotly.react('pc-resolvePlot',traces,Object.assign({},darkLayout,{
            xaxis:Object.assign(axStyle([-3,3],'x'),{scaleanchor:'y'}),yaxis:axStyle([-3,3],'y'),height:400,
            annotations:[{x:0,y:2.7,text:type,font:{color:typeColor,size:11},showarrow:false}]
        }),{responsive:true});

        // ṙ vs r
        var rArr=[],rdArr=[];
        for(var i=0;i<=100;i++){var r=i*2.5/100;rArr.push(r);rdArr.push(rdot(r));}

        var rdTraces=[
            {x:rArr,y:rdArr,type:'scatter',mode:'lines',line:{color:'#00f3ff',width:2.5},
                name:'ṙ = '+mu.toFixed(2)+'·r(1−r²)'},
            {x:[0,2.5],y:[0,0],type:'scatter',mode:'lines',line:{color:'#808080',width:1,dash:'dot'},
                showlegend:false,hoverinfo:'skip'}
        ];

        if(Math.abs(mu)>0.02){
            rdTraces.push({x:[1],y:[0],type:'scatter',mode:'markers',
                marker:{color:'white',size:10,line:{color:'white',width:2}},
                name:'r=1 (limit cycle)',hoverinfo:'none'});
        }

        var yMax=Math.max.apply(null,rdArr.map(Math.abs))*1.3+0.05;
        Plotly.react('pc-resolveRdotPlot',rdTraces,Object.assign({},darkLayout,{
            xaxis:axStyle([0,2.5],'r'),yaxis:axStyle([-yMax,yMax],'ṙ'),height:400
        }),{responsive:true});

        document.getElementById('pc-stats3').innerHTML=
            '<span><strong>μ = '+mu.toFixed(2)+'</strong></span>'+
            '<span>Polar: ṙ = '+mu.toFixed(2)+'·r(1−r²), θ̇ = 1</span>'+
            '<span>Linearization says: center (λ = ±i).  Polar says: <strong>'+type+'</strong></span>';
    }

    // ===============================================================
    // Global functions
    // ===============================================================
    window.pcTransformReset=function(){
        document.getElementById('pc-system-select').value='center';
        document.getElementById('pc-eps-slider').value=0.1;
        document.getElementById('pc-eps-value').textContent='0.10';
        drawTransformer();
    };
    window.pcRadialReset=function(){
        document.getElementById('pc-radial-system').value='limitCycle';
        document.getElementById('pc-r0-slider').value=0.3;
        document.getElementById('pc-r0-value').textContent='0.3';
        drawRadial();
    };
    window.pcResolveReset=function(){
        document.getElementById('pc-resolve-mu').value=0;
        document.getElementById('pc-resolve-mu-value').textContent='0.00';
        drawResolver();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots(){
        if(typeof Plotly==='undefined'){setTimeout(initializePlots,100);return;}
        if(!document.getElementById('pc-cartPlot')){setTimeout(initializePlots,100);return;}

        drawTransformer();
        document.getElementById('pc-system-select').addEventListener('change',drawTransformer);
        document.getElementById('pc-eps-slider').addEventListener('input',function(){
            document.getElementById('pc-eps-value').textContent=parseFloat(this.value).toFixed(2);
            drawTransformer();
        });

        drawRadial();
        document.getElementById('pc-radial-system').addEventListener('change',drawRadial);
        document.getElementById('pc-r0-slider').addEventListener('input',function(){
            document.getElementById('pc-r0-value').textContent=parseFloat(this.value).toFixed(1);
            drawRadial();
        });

        drawResolver();
        document.getElementById('pc-resolve-mu').addEventListener('input',function(){
            document.getElementById('pc-resolve-mu-value').textContent=parseFloat(this.value).toFixed(2);
            drawResolver();
        });
    }

    initializePlots();
})();
