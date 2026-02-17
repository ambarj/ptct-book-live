(function() {
    'use strict';

    // Constants
    var G_TRUE = 9.8, A_TRUE = G_TRUE / 2, N_TRIALS = 5, NOISE_DEFAULT = 0.15;
    var TIMES = [1,2,3,4,5,6,7,8,9,10], N_TIMES = TIMES.length;

    // State for each explorer
    var wizMeans = [], wizErrors = [];
    var resMeans = [], resErrors = [];

    function boxMuller(mu, sigma) {
        var u1 = Math.random(), u2 = Math.random();
        if (u1 < 1e-10) u1 = 1e-10;
        return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }

    function generateData(noisePct, aOffset) {
        aOffset = aOffset || 0;
        var means = [], errors = [];
        for (var i = 0; i < N_TIMES; i++) {
            var t = TIMES[i], dPhys = A_TRUE * t * t;
            var sigma = noisePct * dPhys;
            if (sigma < 0.1) sigma = 0.1;
            var trials = [], sum = 0;
            for (var j = 0; j < N_TRIALS; j++) { var v = boxMuller(aOffset + dPhys, sigma); trials.push(v); sum += v; }
            var mean = sum / N_TRIALS, vs = 0;
            for (var j = 0; j < N_TRIALS; j++) { var d = trials[j] - mean; vs += d * d; }
            means.push(mean);
            errors.push(Math.sqrt(vs / (N_TRIALS - 1)) / Math.sqrt(N_TRIALS - 1));
        }
        return { means: means, errors: errors };
    }

    // Weighted least-squares fit: type 1=ct², 2=bt+ct², 3=a+bt+ct²
    function fitModel(type, means, errors) {
        var s0=0,s1=0,s2=0,s3=0,s4=0,sy=0,sy1=0,sy2=0;
        for (var i = 0; i < N_TIMES; i++) {
            var t = TIMES[i], w = 1/(errors[i]*errors[i]), t2 = t*t;
            s0+=w; s1+=w*t; s2+=w*t2; s3+=w*t*t2; s4+=w*t2*t2;
            sy+=w*means[i]; sy1+=w*means[i]*t; sy2+=w*means[i]*t2;
        }
        var a=0, b=0, c=0, da=0, db=0, dc=0;
        if (type === 1) {
            c = sy2/s4; dc = Math.sqrt(1/s4);
        } else if (type === 2) {
            var D = s2*s4 - s3*s3;
            b = (s4*sy1 - s3*sy2)/D; c = (s2*sy2 - s3*sy1)/D;
            db = Math.sqrt(s4/D); dc = Math.sqrt(s2/D);
        } else {
            // 3x3 normal equations via cofactor expansion
            var C00=s2*s4-s3*s3, C01=s3*s2-s1*s4, C02=s1*s3-s2*s2;
            var C11=s0*s4-s2*s2, C12=s1*s2-s0*s3, C22=s0*s2-s1*s1;
            var D = s0*C00 + s1*C01 + s2*C02;
            a=(C00*sy+C01*sy1+C02*sy2)/D;
            b=(C01*sy+C11*sy1+C12*sy2)/D;
            c=(C02*sy+C12*sy1+C22*sy2)/D;
            da=Math.sqrt(Math.abs(C00/D));
            db=Math.sqrt(Math.abs(C11/D));
            dc=Math.sqrt(Math.abs(C22/D));
        }
        var chi2 = 0;
        for (var i = 0; i < N_TIMES; i++) {
            var t = TIMES[i], r = means[i] - (a + b*t + c*t*t);
            chi2 += (r*r)/(errors[i]*errors[i]);
        }
        return {a:a, b:b, c:c, da:da, db:db, dc:dc, chi2:chi2, dof:N_TIMES-type};
    }

    // Explorer 1: Fit Wizard
    function plotWizard() {
        var type = parseInt(document.getElementById('af-model-select').value);
        var fit = fitModel(type, wizMeans, wizErrors);
        var fit1 = fitModel(1, wizMeans, wizErrors);
        var fit2 = fitModel(2, wizMeans, wizErrors);
        var fit3 = fitModel(3, wizMeans, wizErrors);

        // LEFT: data + fit
        var traces1 = [];
        traces1.push({
            x: TIMES, y: wizMeans, mode: 'markers',
            error_y: {type:'data', array:wizErrors, visible:true, color:'#00f3ff', thickness:2},
            marker: {size:8, color:'#00f3ff'}, name: 'Data \u00B1 SE'
        });
        var tF=[], dF=[], dT=[];
        for (var k=0; k<=200; k++) {
            var t=11*k/200; tF.push(t);
            dF.push(fit.a + fit.b*t + fit.c*t*t);
            dT.push(A_TRUE*t*t);
        }
        traces1.push({ x:tF, y:dF, mode:'lines', line:{color:'#ffff00', width:2.5}, name:'Fit' });
        traces1.push({ x:tF, y:dT, mode:'lines', line:{color:'#ff00ff', width:1.5, dash:'dash'}, name:'True: d = 4.9t\u00B2' });

        var layout1 = {
            title:{text:'Data + Fit (\u03C7\u00B2 = '+fit.chi2.toFixed(1)+')', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0,11], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Distance (m)', range:[-20,600], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('af-data-plot', traces1, layout1);

        // RIGHT: χ² comparison bars
        var chi2s = [fit1.chi2, fit2.chi2, fit3.chi2];
        var colors = ['#555','#555','#555'];
        colors[type-1] = '#00f3ff';
        var traces2 = [{
            x: ['ct\u00B2 (1p)', 'bt+ct\u00B2 (2p)', 'a+bt+ct\u00B2 (3p)'],
            y: chi2s, type:'bar', marker:{color:colors},
            text: chi2s.map(function(v){return v.toFixed(1);}),
            textposition:'outside', textfont:{color:'#c8c8e0'}, hoverinfo:'y'
        }];
        var chi2Cap = Math.max.apply(null, chi2s) * 1.4;
        if (chi2Cap < 20) chi2Cap = 20;
        var layout2 = {
            title:{text:'\u03C7\u00B2 by Model', font:{size:13}},
            xaxis:{gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'\u03C7\u00B2', range:[0,chi2Cap], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false, margin:{t:40, b:80, l:55, r:15}
        };
        createPlot('af-chi2-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('af-wiz-stats');
        if (statsDiv) {
            var parts = [];
            if (type >= 3) parts.push('a = ' + fit.a.toFixed(1) + ' \u00B1 ' + fit.da.toFixed(1));
            if (type >= 2) parts.push('b = ' + fit.b.toFixed(2) + ' \u00B1 ' + fit.db.toFixed(2));
            parts.push('c = ' + fit.c.toFixed(3) + ' \u00B1 ' + fit.dc.toFixed(3));
            parts.push('g = 2c = ' + (2*fit.c).toFixed(2) + ' \u00B1 ' + (2*fit.dc).toFixed(2));
            parts.push('\u03C7\u00B2/dof = ' + (fit.dof>0 ? (fit.chi2/fit.dof).toFixed(2) : '\u2014'));
            statsDiv.innerHTML = parts.map(function(p){return '<span>'+p+'</span>';}).join('');
        }
    }

    // Explorer 2: Physics Extractor (histogram of g from many experiments)
    function plotExtractor() {
        var noisePct = parseInt(document.getElementById('af-noise-slider').value) / 100;
        var nExps = parseInt(document.getElementById('af-nexp-slider').value);
        var gVals = [], dgVals = [];
        for (var e = 0; e < nExps; e++) {
            var d = generateData(noisePct);
            var fit = fitModel(3, d.means, d.errors);
            gVals.push(2 * fit.c);
            dgVals.push(2 * fit.dc);
        }
        var gSum=0, dgSum=0;
        for (var i=0; i<nExps; i++) { gSum+=gVals[i]; dgSum+=dgVals[i]; }
        var gMean = gSum/nExps, dgMean = dgSum/nExps;
        var gVarSum = 0;
        for (var i=0; i<nExps; i++) { var dd=gVals[i]-gMean; gVarSum+=dd*dd; }
        var gStd = Math.sqrt(gVarSum/(nExps-1));

        var traces = [];
        traces.push({
            x:gVals, type:'histogram',
            marker:{color:'rgba(0,243,255,0.5)', line:{color:'#00f3ff', width:1}},
            nbinsx:25, name:'g extracted'
        });
        var hPeak = nExps/5;
        traces.push({ x:[G_TRUE,G_TRUE], y:[0,hPeak], mode:'lines',
            line:{color:'#ff00ff', width:2.5, dash:'dash'}, name:'True g = '+G_TRUE });
        traces.push({ x:[gMean,gMean], y:[0,hPeak], mode:'lines',
            line:{color:'#ffff00', width:2, dash:'dot'}, name:'\u27E8g\u27E9 = '+gMean.toFixed(2) });

        var layout = {
            title:{text:'Extracted g from '+nExps+' experiments', font:{size:14}},
            xaxis:{title:'g (m/s\u00B2)', range:[6,14], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Count', gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.60, y:0.98, bgcolor:'rgba(0,0,0,0.3)'}
        };
        createPlot('af-hist-plot', traces, layout);

        var statsDiv = document.getElementById('af-ext-stats');
        if (statsDiv) {
            var match = Math.abs(gStd - dgMean)/dgMean < 0.3;
            statsDiv.innerHTML =
                '<span>g<sub>true</sub> = <strong>'+G_TRUE.toFixed(1)+'</strong></span>'+
                '<span>\u27E8g\u27E9 = <strong>'+gMean.toFixed(2)+'</strong></span>'+
                '<span>std(g) = <strong>'+gStd.toFixed(2)+'</strong></span>'+
                '<span>Typical \u03B4g = <strong>'+dgMean.toFixed(2)+'</strong></span>'+
                '<span style="color:'+(match?'#00ff9f':'#ffff00')+'">std \u2248 \u03B4g: <strong>'+
                (match?'Yes!':'Close')+'</strong></span>';
        }
    }

    // Explorer 3: Residual Inspector
    function plotResiduals() {
        var type = parseInt(document.getElementById('af-res-model-select').value);
        var fit = fitModel(type, resMeans, resErrors);

        // LEFT: data + fit
        var traces1 = [];
        traces1.push({
            x:TIMES, y:resMeans, mode:'markers',
            error_y:{type:'data', array:resErrors, visible:true, color:'#00f3ff', thickness:2},
            marker:{size:8, color:'#00f3ff'}, name:'Data \u00B1 SE'
        });
        var tF=[], dF=[];
        for (var k=0; k<=200; k++) { var t=11*k/200; tF.push(t); dF.push(fit.a+fit.b*t+fit.c*t*t); }
        traces1.push({ x:tF, y:dF, mode:'lines', line:{color:'#ffff00', width:2.5}, name:'Fit' });
        var yMax = 0;
        for (var i=0; i<N_TIMES; i++) { var v=Math.abs(resMeans[i])+resErrors[i]; if(v>yMax) yMax=v; }

        var layout1 = {
            title:{text:'Data + Fit', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0,11], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Distance (m)', range:[-20, yMax*1.2], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('af-fit-plot', traces1, layout1);

        // RIGHT: residuals
        var residuals = [];
        for (var i=0; i<N_TIMES; i++) {
            var t = TIMES[i];
            residuals.push(resMeans[i] - (fit.a + fit.b*t + fit.c*t*t));
        }
        var traces2 = [];
        traces2.push({
            x:TIMES, y:residuals, mode:'markers',
            error_y:{type:'data', array:resErrors, visible:true, color:'#00f3ff', thickness:2},
            marker:{size:8, color:'#00f3ff'}, name:'Residuals'
        });
        traces2.push({ x:[0,11], y:[0,0], mode:'lines',
            line:{color:'#808080', width:1.5, dash:'dash'}, name:'Zero', hoverinfo:'skip' });
        var maxR = 0;
        for (var i=0; i<N_TIMES; i++) { var m=Math.abs(residuals[i])+resErrors[i]; if(m>maxR) maxR=m; }
        if (maxR < 5) maxR = 5;

        var layout2 = {
            title:{text:'Residuals (data \u2212 model)', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0,11], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Residual', range:[-maxR*1.3, maxR*1.3], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false, margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('af-resid-plot', traces2, layout2);

        // Stats
        var chi2dof = fit.dof > 0 ? fit.chi2/fit.dof : 0;
        var statsDiv = document.getElementById('af-res-stats');
        if (statsDiv) {
            var aOff = parseFloat(document.getElementById('af-offset-slider').value);
            var parts = [];
            if (type>=3) parts.push('a = '+fit.a.toFixed(1)+' \u00B1 '+fit.da.toFixed(1));
            if (type>=2) parts.push('b = '+fit.b.toFixed(2)+' \u00B1 '+fit.db.toFixed(2));
            parts.push('c = '+fit.c.toFixed(3)+' \u00B1 '+fit.dc.toFixed(3));
            parts.push('\u03C7\u00B2 = '+fit.chi2.toFixed(1));
            parts.push('\u03C7\u00B2/dof = '+chi2dof.toFixed(2));
            parts.push('True a\u2080 = '+aOff.toFixed(0));
            statsDiv.innerHTML = parts.map(function(p){return '<span>'+p+'</span>';}).join('');
        }
    }

    // Event handlers
    function attachEventHandlers() {
        var wizSelect = document.getElementById('af-model-select');
        if (wizSelect) wizSelect.addEventListener('change', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.options[this.selectedIndex].text; }
            plotWizard();
        });
        var noiseSlider = document.getElementById('af-noise-slider');
        if (noiseSlider) noiseSlider.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.value; }
            plotExtractor();
        });
        var nexpSlider = document.getElementById('af-nexp-slider');
        if (nexpSlider) nexpSlider.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.value; }
            plotExtractor();
        });
        var resSelect = document.getElementById('af-res-model-select');
        if (resSelect) resSelect.addEventListener('change', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.options[this.selectedIndex].text; }
            plotResiduals();
        });
        var offsetSlider = document.getElementById('af-offset-slider');
        if (offsetSlider) offsetSlider.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.value; }
            var aOff = parseFloat(this.value);
            var d = generateData(NOISE_DEFAULT, aOff);
            resMeans = d.means; resErrors = d.errors;
            plotResiduals();
        });
    }

    // Initialization
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('af-data-plot');
        var p2 = document.getElementById('af-hist-plot');
        var p3 = document.getElementById('af-fit-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        var d1 = generateData(NOISE_DEFAULT); wizMeans = d1.means; wizErrors = d1.errors;
        var aOff = parseFloat(document.getElementById('af-offset-slider').value);
        var d3 = generateData(NOISE_DEFAULT, aOff); resMeans = d3.means; resErrors = d3.errors;

        plotWizard();
        plotExtractor();
        plotResiduals();
        attachEventHandlers();
    }

    // Global functions
    window.newWizardData = function() {
        var d = generateData(NOISE_DEFAULT); wizMeans = d.means; wizErrors = d.errors;
        plotWizard();
    };
    window.resetWizardExplorer = function() {
        var sel = document.getElementById('af-model-select');
        if (sel) { sel.value = '3'; var lb = sel.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = 'a + bt + ct\u00B2 (3-param)'; } }
        var d = generateData(NOISE_DEFAULT); wizMeans = d.means; wizErrors = d.errors;
        plotWizard();
    };
    window.newExtractorData = function() { plotExtractor(); };
    window.resetExtractorExplorer = function() {
        var ids = ['af-noise-slider','af-nexp-slider'], defs = [15,100], disps = ['15','100'];
        for (var i=0; i<ids.length; i++) {
            var sl = document.getElementById(ids[i]);
            if (sl) { sl.value = defs[i]; var lb = sl.closest('.control-group');
                if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = disps[i]; } }
        }
        plotExtractor();
    };
    window.newResidualData = function() {
        var aOff = parseFloat(document.getElementById('af-offset-slider').value);
        var d = generateData(NOISE_DEFAULT, aOff); resMeans = d.means; resErrors = d.errors;
        plotResiduals();
    };
    window.resetResidualExplorer = function() {
        var sel = document.getElementById('af-res-model-select');
        if (sel) { sel.value = '3'; var lb = sel.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = 'a + bt + ct\u00B2 (3-param)'; } }
        var sl = document.getElementById('af-offset-slider');
        if (sl) { sl.value = 0; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '0'; } }
        var d = generateData(NOISE_DEFAULT, 0); resMeans = d.means; resErrors = d.errors;
        plotResiduals();
    };

    initializePlots();
})();
