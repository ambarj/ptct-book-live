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
        var h=T/N, X=[x0], Y=[y0], x=x0, y=y0;
        for (var i=0;i<N;i++) {
            var k1x=f(x,y),k1y=g(x,y);
            var k2x=f(x+h/2*k1x,y+h/2*k1y),k2y=g(x+h/2*k1x,y+h/2*k1y);
            var k3x=f(x+h/2*k2x,y+h/2*k2y),k3y=g(x+h/2*k2x,y+h/2*k2y);
            var k4x=f(x+h*k3x,y+h*k3y),k4y=g(x+h*k3x,y+h*k3y);
            x+=h/6*(k1x+2*k2x+2*k3x+k4x); y+=h/6*(k1y+2*k2y+2*k3y+k4y);
            if(Math.abs(x)>20||Math.abs(y)>20)break;
            X.push(x);Y.push(y);
        }
        return {X:X,Y:Y};
    }

    function fieldArrows(f, g, xR, yR, n) {
        var ax=[],ay=[],sx=2*xR/(n-1),sy=2*yR/(n-1),sc=Math.min(sx,sy)*0.3;
        for(var i=0;i<n;i++)for(var j=0;j<n;j++){
            var px=-xR+i*sx,py=-yR+j*sy,fx=f(px,py),fy=g(px,py);
            var mag=Math.sqrt(fx*fx+fy*fy); if(mag<1e-8)continue;
            ax.push(px,px+fx/mag*sc,null);ay.push(py,py+fy/mag*sc,null);
        }
        return {x:ax,y:ay};
    }

    function classify(tau, delta) {
        if(delta<-0.01)return'Saddle';
        if(Math.abs(delta)<0.01)return'Degenerate';
        var disc=tau*tau-4*delta;
        if(Math.abs(tau)<0.05)return'Center';
        if(disc<-0.01)return tau<0?'Stable Spiral':'Unstable Spiral';
        return tau<0?'Stable Node':'Unstable Node';
    }

    function eigenStr(tau, delta) {
        var disc=tau*tau-4*delta;
        if(Math.abs(disc)<0.01)return'λ='+(tau/2).toFixed(2)+' (repeated)';
        if(disc>0){var s=Math.sqrt(disc);return'λ₁='+((tau+s)/2).toFixed(2)+', λ₂='+((tau-s)/2).toFixed(2);}
        return'λ='+(tau/2).toFixed(2)+' ± '+Math.abs(Math.sqrt(-disc)/2).toFixed(2)+'i';
    }

    function isHyperbolic(tau, delta) {
        var disc=tau*tau-4*delta;
        if(disc>=0){var s=Math.sqrt(disc);return Math.abs(tau+s)>0.1&&Math.abs(tau-s)>0.1;}
        return Math.abs(tau)>0.1;
    }

    // ===== Systems =====
    var sysDefs = {
        lotkaVolterra: {
            f:function(x,y){return x*(2-y);},g:function(x,y){return y*(-1+x);},
            J:function(x,y){return[[2-y,-x],[y,-1+x]];},
            fps:[[0,0,'Origin'],[1,2,'Coexistence']],
            xR:[-0.5,4],yR:[-0.5,4],label:'Lotka-Volterra'
        },
        competition: {
            f:function(x,y){return x*(3-x-2*y);},g:function(x,y){return y*(2-x-y);},
            J:function(x,y){return[[3-2*x-2*y,-2*x],[-y,2-x-2*y]];},
            fps:[[0,0,'Origin'],[3,0,'Sp.1 wins'],[0,2,'Sp.2 wins'],[1,1,'Coexistence']],
            xR:[-0.5,4],yR:[-0.5,3],label:'Competing Species'
        },
        pendulum: {
            f:function(x,y){return y;},g:function(x,y){return -Math.sin(x)-0.3*y;},
            J:function(x,y){return[[0,1],[-Math.cos(x),-0.3]];},
            fps:[[0,0,'Hanging'],[Math.PI,0,'Inverted'],[-Math.PI,0,'Inverted']],
            xR:[-4,4],yR:[-3,3],label:'Damped Pendulum'
        },
        glycolysis: {
            f:function(x,y){return -x+0.5*y+x*x*y;},g:function(x,y){return 0.5-0.5*y-x*x*y;},
            J:function(x,y){return[[-1+2*x*y,0.5+x*x],[-2*x*y,-0.5-x*x]];},
            fps:[[0.5,0.5/(0.5+0.25),'Steady state']],
            xR:[-0.5,3],yR:[-0.5,3],label:'Glycolysis Model'
        }
    };
    // Fix glycolysis FP
    sysDefs.glycolysis.fps = [[0.5, 0.5/(0.5+0.25), 'Steady state']];

    function updateFPSelect(id, fps) {
        var sel=document.getElementById(id);
        // Preserve the user's selection across redraws (repopulating the
        // options otherwise resets it to index 0 every time)
        var prev=parseInt(sel.value);
        sel.innerHTML='';
        for(var i=0;i<fps.length;i++){
            var o=document.createElement('option');o.value=i;
            o.textContent='('+fps[i][0].toFixed(2)+', '+fps[i][1].toFixed(2)+') '+fps[i][2];
            sel.appendChild(o);
        }
        sel.value=Math.min(isNaN(prev)?0:prev, Math.max(fps.length-1,0));
    }

    function drawPhasePortrait(plotId, sys, fpIdx, height) {
        var arr=fieldArrows(sys.f,sys.g,(sys.xR[1]-sys.xR[0])/2,(sys.yR[1]-sys.yR[0])/2,10);
        var traces=[{x:arr.x,y:arr.y,type:'scatter',mode:'lines',line:{color:'rgba(150,150,150,0.2)',width:1},hoverinfo:'none',showlegend:false}];

        for(var k=0;k<8;k++){
            var th=k*Math.PI/4,fp=sys.fps[fpIdx||0],r=1;
            var sol=rk4Solve(sys.f,sys.g,fp[0]+r*Math.cos(th),fp[1]+r*Math.sin(th),15,2000);
            traces.push({x:sol.X,y:sol.Y,type:'scatter',mode:'lines',line:{color:trajColors[k],width:1.5},hoverinfo:'none',showlegend:false});
        }

        for(var i=0;i<sys.fps.length;i++){
            var Jm=sys.J(sys.fps[i][0],sys.fps[i][1]);
            var tau=Jm[0][0]+Jm[1][1],delta=Jm[0][0]*Jm[1][1]-Jm[0][1]*Jm[1][0];
            var hyp=isHyperbolic(tau,delta);
            traces.push({
                x:[sys.fps[i][0]],y:[sys.fps[i][1]],type:'scatter',mode:'markers',
                marker:{color:hyp?'#00ff88':'#ffbe0b',size:i===fpIdx?14:10,
                    symbol:delta>0&&tau<0?'circle':'circle-open',
                    line:{color:'white',width:2}},
                hoverinfo:'none',showlegend:false
            });
        }

        Plotly.react(plotId,traces,Object.assign({},darkLayout,{
            xaxis:axStyle(sys.xR,'x'),yaxis:axStyle(sys.yR,'y'),height:height||400
        }),{responsive:true});
    }

    // ===============================================================
    // EXPLORER 1: Full Stability Pipeline
    // ===============================================================
    function drawPipeline() {
        var key=document.getElementById('sp-system-select').value;
        var sys=sysDefs[key];
        updateFPSelect('sp-fp-select',sys.fps);
        var fpIdx=Math.min(parseInt(document.getElementById('sp-fp-select').value)||0,sys.fps.length-1);
        var fp=sys.fps[fpIdx];

        // Nonlinear portrait
        drawPhasePortrait('sp-nonlinearPlot',sys,fpIdx,400);

        // Linearized portrait near FP
        var Jm=sys.J(fp[0],fp[1]);
        var linF=function(x,y){return Jm[0][0]*(x-fp[0])+Jm[0][1]*(y-fp[1]);};
        var linG=function(x,y){return Jm[1][0]*(x-fp[0])+Jm[1][1]*(y-fp[1]);};

        var arr=fieldArrows(linF,linG,(sys.xR[1]-sys.xR[0])/2,(sys.yR[1]-sys.yR[0])/2,10);
        var linTraces=[{x:arr.x,y:arr.y,type:'scatter',mode:'lines',line:{color:'rgba(150,150,150,0.2)',width:1},hoverinfo:'none',showlegend:false}];

        for(var k=0;k<8;k++){
            var th=k*Math.PI/4,r=1;
            var sol=rk4Solve(linF,linG,fp[0]+r*Math.cos(th),fp[1]+r*Math.sin(th),15,2000);
            linTraces.push({x:sol.X,y:sol.Y,type:'scatter',mode:'lines',line:{color:trajColors[k],width:1.5},hoverinfo:'none',showlegend:false});
        }
        linTraces.push({x:[fp[0]],y:[fp[1]],type:'scatter',mode:'markers',marker:{color:'#ffbe0b',size:12,line:{color:'white',width:2}},hoverinfo:'none',showlegend:false});

        var tau=Jm[0][0]+Jm[1][1],delta=Jm[0][0]*Jm[1][1]-Jm[0][1]*Jm[1][0];
        var type=classify(tau,delta), hyp=isHyperbolic(tau,delta);

        Plotly.react('sp-linearPlot',linTraces,Object.assign({},darkLayout,{
            xaxis:axStyle(sys.xR,'x'),yaxis:axStyle(sys.yR,'y'),height:400,
            annotations:[{x:(sys.xR[0]+sys.xR[1])/2,y:sys.yR[1]-0.3,text:'Linearized: '+type,font:{color:'#ffbe0b',size:12},showarrow:false}]
        }),{responsive:true});

        document.getElementById('sp-stats1').innerHTML=
            '<span><strong>'+type+(hyp?' ✓ Hyperbolic':' ⚠ Non-Hyperbolic')+'</strong></span>'+
            '<span>FP: ('+fp[0].toFixed(2)+', '+fp[1].toFixed(2)+')  |  J = [['+Jm[0][0].toFixed(1)+','+Jm[0][1].toFixed(1)+'],['+Jm[1][0].toFixed(1)+','+Jm[1][1].toFixed(1)+']]</span>'+
            '<span>τ='+tau.toFixed(2)+', Δ='+delta.toFixed(2)+' | '+eigenStr(tau,delta)+'</span>'+
            '<span>Trust: '+(hyp?'YES — linearization reliable':'CAUTION — nonlinear terms may change behavior')+'</span>';
    }

    // ===============================================================
    // EXPLORER 2: Trust Boundary (τ-Δ plane with trust zones)
    // ===============================================================
    function drawTrust() {
        var tau=parseFloat(document.getElementById('sp-trust-tau').value);
        var delta=parseFloat(document.getElementById('sp-trust-delta').value);

        // τ-Δ map with trust coloring
        var nMap=60,tArr=[],dArr=[],z=[];
        for(var j=0;j<nMap;j++){
            var dv=-2+j*7/(nMap-1);dArr.push(dv);var row=[];
            for(var i=0;i<nMap;i++){
                var tv=-4+i*8/(nMap-1);if(j===0)tArr.push(tv);
                if(dv<0)row.push(1); // saddle=hyperbolic
                else if(Math.abs(tv)<0.15&&tv*tv<4*dv)row.push(0); // center=non-hyp
                else row.push(1); // everything else=hyperbolic
            }
            z.push(row);
        }

        var mapTraces=[
            {z:z,x:tArr,y:dArr,type:'heatmap',
                colorscale:[[0,'rgba(255,190,11,0.2)'],[1,'rgba(0,255,136,0.1)']],
                showscale:false,hoverinfo:'skip'},
        ];

        // Parabola
        var pT=[],pD=[];for(var t=-4;t<=4;t+=0.05){pT.push(t);pD.push(t*t/4);}
        mapTraces.push({x:pT,y:pD,type:'scatter',mode:'lines',line:{color:'rgba(255,255,255,0.5)',width:1.5},hoverinfo:'skip',showlegend:false});
        // Δ=0
        mapTraces.push({x:[-4.5,4.5],y:[0,0],type:'scatter',mode:'lines',line:{color:'rgba(255,190,11,0.4)',width:1,dash:'dash'},hoverinfo:'skip',showlegend:false});
        // τ=0 (danger zone)
        mapTraces.push({x:[0,0],y:[0,5],type:'scatter',mode:'lines',line:{color:'rgba(255,190,11,0.8)',width:3},hoverinfo:'skip',showlegend:false});
        // Current point
        var hyp=isHyperbolic(tau,delta);
        mapTraces.push({x:[tau],y:[delta],type:'scatter',mode:'markers',
            marker:{color:hyp?'#00ff88':'#ffbe0b',size:14,symbol:'star',line:{color:'white',width:2}},
            hoverinfo:'skip',showlegend:false});

        Plotly.react('sp-trustMapPlot',mapTraces,Object.assign({},darkLayout,{
            xaxis:axStyle([-4.5,4.5],'τ'),yaxis:axStyle([-2,5],'Δ'),height:400,
            annotations:[
                {x:0,y:3,text:'⚠ τ=0<br>Non-Hyp',font:{color:'#ffbe0b',size:10},showarrow:false},
                {x:-2.5,y:3,text:'✓ Reliable',font:{color:'#00ff88',size:10},showarrow:false},
                {x:2.5,y:3,text:'✓ Reliable',font:{color:'#00ff88',size:10},showarrow:false},
                {x:0,y:-1,text:'✓ Saddle',font:{color:'#00ff88',size:10},showarrow:false}
            ]
        }),{responsive:true});

        // Phase portrait from canonical form
        var half=tau/2;
        var a=half,b=1,c=delta-half*half,d=half;
        var pf=function(x,y){return a*x+b*y;},pg=function(x,y){return c*x+d*y;};

        var arr=fieldArrows(pf,pg,3,3,10);
        var pTraces=[{x:arr.x,y:arr.y,type:'scatter',mode:'lines',line:{color:'rgba(150,150,150,0.2)',width:1},hoverinfo:'none',showlegend:false}];
        var T=delta<0?5:12;
        for(var k=0;k<8;k++){
            var th=k*Math.PI/4;
            var sol=rk4Solve(pf,pg,1.5*Math.cos(th),1.5*Math.sin(th),T,2000);
            pTraces.push({x:sol.X,y:sol.Y,type:'scatter',mode:'lines',line:{color:trajColors[k],width:1.5},hoverinfo:'none',showlegend:false});
        }
        pTraces.push({x:[0],y:[0],type:'scatter',mode:'markers',marker:{color:hyp?'#00ff88':'#ffbe0b',size:10,line:{color:'white',width:2}},hoverinfo:'none',showlegend:false});

        var type=classify(tau,delta);
        Plotly.react('sp-trustPortraitPlot',pTraces,Object.assign({},darkLayout,{
            xaxis:Object.assign(axStyle([-3,3],'x'),{scaleanchor:'y'}),yaxis:axStyle([-3,3],'y'),height:400,
            annotations:[{x:0,y:2.7,text:type+(hyp?' ✓':' ⚠'),font:{color:hyp?'#00ff88':'#ffbe0b',size:12},showarrow:false}]
        }),{responsive:true});

        document.getElementById('sp-stats2').innerHTML=
            '<span><strong>'+type+'</strong></span>'+
            '<span>τ='+tau.toFixed(1)+', Δ='+delta.toFixed(1)+' | '+eigenStr(tau,delta)+'</span>'+
            '<span>Hyperbolic: '+(hyp?'YES ✓ — trust this prediction':'NO ⚠ — nonlinear terms may alter behavior')+'</span>';
    }

    // ===============================================================
    // EXPLORER 3: Example Gallery
    // ===============================================================
    function drawGallery() {
        var key=document.getElementById('sp-gallery-select').value;
        var sys=sysDefs[key];

        var arr=fieldArrows(sys.f,sys.g,(sys.xR[1]-sys.xR[0])/2,(sys.yR[1]-sys.yR[0])/2,12);
        var traces=[{x:arr.x,y:arr.y,type:'scatter',mode:'lines',line:{color:'rgba(150,150,150,0.12)',width:1},hoverinfo:'none',showlegend:false}];

        // Trajectories from multiple ICs spread across domain
        for(var k=0;k<8;k++){
            var cx=(sys.xR[0]+sys.xR[1])/2,cy=(sys.yR[0]+sys.yR[1])/2;
            var rx=(sys.xR[1]-sys.xR[0])*0.35,ry=(sys.yR[1]-sys.yR[0])*0.35;
            var th=k*Math.PI/4;
            var sol=rk4Solve(sys.f,sys.g,cx+rx*Math.cos(th),cy+ry*Math.sin(th),20,3000);
            traces.push({x:sol.X,y:sol.Y,type:'scatter',mode:'lines',line:{color:trajColors[k],width:1.5},hoverinfo:'none',showlegend:false});
        }

        // FPs with classification labels
        var summaryParts=[];
        for(var i=0;i<sys.fps.length;i++){
            var Jm=sys.J(sys.fps[i][0],sys.fps[i][1]);
            var tau=Jm[0][0]+Jm[1][1],delta=Jm[0][0]*Jm[1][1]-Jm[0][1]*Jm[1][0];
            var type=classify(tau,delta),hyp=isHyperbolic(tau,delta);

            traces.push({
                x:[sys.fps[i][0]],y:[sys.fps[i][1]],type:'scatter',mode:'markers+text',
                marker:{color:hyp?'#00ff88':'#ffbe0b',size:12,
                    symbol:delta>0&&tau<0?'circle':'circle-open',
                    line:{color:'white',width:2}},
                text:[type+(hyp?' ✓':' ⚠')],textposition:'top center',
                textfont:{color:hyp?'#00ff88':'#ffbe0b',size:9},
                hoverinfo:'none',showlegend:false
            });
            summaryParts.push('('+sys.fps[i][0].toFixed(1)+','+sys.fps[i][1].toFixed(1)+'): '+type+(hyp?' ✓':' ⚠'));
        }

        Plotly.react('sp-galleryPlot',traces,Object.assign({},darkLayout,{
            xaxis:axStyle(sys.xR,'x'),yaxis:axStyle(sys.yR,'y'),height:440
        }),{responsive:true});

        document.getElementById('sp-stats3').innerHTML=
            '<span><strong>'+sys.label+'</strong> — '+sys.fps.length+' fixed points</span>'+
            '<span>'+summaryParts.join('  |  ')+'</span>';
    }

    // ===============================================================
    // Global functions
    // ===============================================================
    window.spPipelineReset=function(){document.getElementById('sp-system-select').value='lotkaVolterra';drawPipeline();};
    window.spTrustReset=function(){
        document.getElementById('sp-trust-tau').value=0;document.getElementById('sp-trust-delta').value=2;
        document.getElementById('sp-trust-tau-value').textContent='0.0';document.getElementById('sp-trust-delta-value').textContent='2.0';
        drawTrust();
    };
    window.spGalleryReset=function(){document.getElementById('sp-gallery-select').value='pendulum';drawGallery();};

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if(typeof Plotly==='undefined'){setTimeout(initializePlots,100);return;}
        if(!document.getElementById('sp-nonlinearPlot')){setTimeout(initializePlots,100);return;}

        drawPipeline();
        document.getElementById('sp-system-select').addEventListener('change',function(){
            updateFPSelect('sp-fp-select',sysDefs[this.value].fps);drawPipeline();
        });
        document.getElementById('sp-fp-select').addEventListener('change',drawPipeline);

        drawTrust();
        document.getElementById('sp-trust-tau').addEventListener('input',function(){
            document.getElementById('sp-trust-tau-value').textContent=parseFloat(this.value).toFixed(1);drawTrust();
        });
        document.getElementById('sp-trust-delta').addEventListener('input',function(){
            document.getElementById('sp-trust-delta-value').textContent=parseFloat(this.value).toFixed(1);drawTrust();
        });

        drawGallery();
        document.getElementById('sp-gallery-select').addEventListener('change',drawGallery);
    }

    initializePlots();
})();
