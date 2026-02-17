(function() {
    'use strict';

    // === Constants ===
    var G_TRUE = 9.8, A_TRUE = G_TRUE / 2, N_TRIALS = 5, NOISE_DEFAULT = 0.15;
    var TIMES = [1,2,3,4,5,6,7,8,9,10], N_TIMES = TIMES.length;

    // State
    var covMeans = [], covErrors = [];
    var ellMeans = [], ellErrors = [];
    var bootMeans = [], bootErrors = [];

    function boxMuller(mu, sigma) {
        var u1 = Math.random(), u2 = Math.random();
        if (u1 < 1e-10) u1 = 1e-10;
        return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }

    function generateData(noisePct) {
        var means = [], errors = [];
        for (var i = 0; i < N_TIMES; i++) {
            var t = TIMES[i], dPhys = A_TRUE * t * t;
            var sigma = noisePct * dPhys;
            if (sigma < 0.1) sigma = 0.1;
            var trials = [], sum = 0;
            for (var j = 0; j < N_TRIALS; j++) { var v = boxMuller(dPhys, sigma); trials.push(v); sum += v; }
            var mean = sum / N_TRIALS, vs = 0;
            for (var j = 0; j < N_TRIALS; j++) { var d = trials[j] - mean; vs += d * d; }
            means.push(mean);
            errors.push(Math.sqrt(vs / (N_TRIALS - 1)) / Math.sqrt(N_TRIALS - 1));
        }
        return { means: means, errors: errors };
    }

    // === 3-param weighted least-squares with full covariance matrix ===
    function fitFull(means, errors, absSigma) {
        var s0=0,s1=0,s2=0,s3=0,s4=0,sy=0,sy1=0,sy2=0;
        var scale = 1;
        for (var i = 0; i < N_TIMES; i++) {
            var t = TIMES[i], w = 1/(errors[i]*errors[i]), t2 = t*t;
            s0+=w; s1+=w*t; s2+=w*t2; s3+=w*t*t2; s4+=w*t2*t2;
            sy+=w*means[i]; sy1+=w*means[i]*t; sy2+=w*means[i]*t2;
        }
        // Normal equations matrix M
        var M = [[s0,s1,s2],[s1,s2,s3],[s2,s3,s4]];
        var v = [sy, sy1, sy2];
        // Cofactor expansion for 3x3
        var C00=s2*s4-s3*s3, C01=s3*s2-s1*s4, C02=s1*s3-s2*s2;
        var C11=s0*s4-s2*s2, C12=s1*s2-s0*s3, C22=s0*s2-s1*s1;
        var D = s0*C00 + s1*C01 + s2*C02;
        var a=(C00*sy+C01*sy1+C02*sy2)/D;
        var b=(C01*sy+C11*sy1+C12*sy2)/D;
        var c=(C02*sy+C12*sy1+C22*sy2)/D;
        // Chi2
        var chi2 = 0;
        for (var i = 0; i < N_TIMES; i++) {
            var t = TIMES[i], r = means[i] - (a + b*t + c*t*t);
            chi2 += (r*r)/(errors[i]*errors[i]);
        }
        // Covariance matrix = M^{-1} (if absolute_sigma)
        // If not absolute_sigma, scale by chi2/dof
        var cov = [
            [C00/D, C01/D, C02/D],
            [C01/D, C11/D, C12/D],
            [C02/D, C12/D, C22/D]
        ];
        if (!absSigma) {
            scale = chi2 / (N_TIMES - 3);
            for (var i = 0; i < 3; i++)
                for (var j = 0; j < 3; j++) cov[i][j] *= scale;
        }
        return {
            a:a, b:b, c:c, chi2:chi2, dof:N_TIMES-3,
            da:Math.sqrt(Math.abs(cov[0][0])),
            db:Math.sqrt(Math.abs(cov[1][1])),
            dc:Math.sqrt(Math.abs(cov[2][2])),
            cov:cov
        };
    }

    // === Explorer 1: Covariance Explorer ===
    function plotCovariance() {
        var absBtn = document.getElementById('fu-abs-sigma-btn');
        var absOn = absBtn && absBtn.getAttribute('data-active') === 'true';
        var fit = fitFull(covMeans, covErrors, absOn);

        // LEFT: Covariance matrix as heatmap
        var labels = ['a (offset)', 'b (linear)', 'c (quad)'];
        var zData = [];
        var textData = [];
        for (var i = 0; i < 3; i++) {
            zData[i] = [];
            textData[i] = [];
            for (var j = 0; j < 3; j++) {
                zData[i][j] = fit.cov[i][j];
                textData[i][j] = fit.cov[i][j].toExponential(2);
            }
        }
        var traces1 = [{
            z: zData, x: labels, y: labels, type: 'heatmap',
            colorscale: [[0,'#ff00ff'],[0.5,'#0d1117'],[1,'#00f3ff']],
            text: textData, texttemplate: '%{text}', textfont: {size:11, color:'#c8c8e0'},
            hoverinfo: 'z', showscale: true,
            colorbar: {title:{text:'Cov', font:{color:'#c8c8e0'}}, tickfont:{color:'#c8c8e0'}}
        }];
        var layout1 = {
            title:{text:'Covariance Matrix'+(absOn?'':' (rescaled)'), font:{size:13}},
            xaxis:{gridcolor:'#2a2f4a', linecolor:'#808080', tickfont:{color:'#c8c8e0'}},
            yaxis:{gridcolor:'#2a2f4a', linecolor:'#808080', tickfont:{color:'#c8c8e0'}, autorange:'reversed'},
            margin:{t:40, b:70, l:90, r:15}
        };
        createPlot('fu-cov-plot', traces1, layout1);

        // RIGHT: correlation matrix
        var corrData = [], corrText = [];
        for (var i = 0; i < 3; i++) {
            corrData[i] = []; corrText[i] = [];
            for (var j = 0; j < 3; j++) {
                var denom = Math.sqrt(Math.abs(fit.cov[i][i])) * Math.sqrt(Math.abs(fit.cov[j][j]));
                var rho = denom > 0 ? fit.cov[i][j] / denom : 0;
                corrData[i][j] = rho;
                corrText[i][j] = rho.toFixed(3);
            }
        }
        var traces2 = [{
            z: corrData, x: labels, y: labels, type: 'heatmap',
            colorscale: [[0,'#ff00ff'],[0.5,'#0d1117'],[1,'#00f3ff']],
            zmin: -1, zmax: 1,
            text: corrText, texttemplate: '%{text}', textfont: {size:13, color:'#c8c8e0'},
            hoverinfo: 'z', showscale: true,
            colorbar: {title:{text:'\u03C1', font:{color:'#c8c8e0'}}, tickfont:{color:'#c8c8e0'}}
        }];
        var layout2 = {
            title:{text:'Correlation Matrix (\u03C1)', font:{size:13}},
            xaxis:{gridcolor:'#2a2f4a', linecolor:'#808080', tickfont:{color:'#c8c8e0'}},
            yaxis:{gridcolor:'#2a2f4a', linecolor:'#808080', tickfont:{color:'#c8c8e0'}, autorange:'reversed'},
            margin:{t:40, b:70, l:90, r:15}
        };
        createPlot('fu-corr-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('fu-cov-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>a = '+fit.a.toFixed(2)+' \u00B1 '+fit.da.toFixed(2)+'</span>'+
                '<span>b = '+fit.b.toFixed(3)+' \u00B1 '+fit.db.toFixed(3)+'</span>'+
                '<span>c = '+fit.c.toFixed(4)+' \u00B1 '+fit.dc.toFixed(4)+'</span>'+
                '<span>g = '+(2*fit.c).toFixed(2)+' \u00B1 '+(2*fit.dc).toFixed(2)+'</span>'+
                '<span>\u03C7\u00B2/dof = '+(fit.chi2/fit.dof).toFixed(2)+'</span>'+
                '<span>absolute_sigma: <strong>'+(absOn?'ON':'OFF')+'</strong></span>';
        }
    }

    // Toggle absolute_sigma
    window.toggleAbsSigma = function() {
        var btn = document.getElementById('fu-abs-sigma-btn');
        if (!btn) return;
        var active = btn.getAttribute('data-active') === 'true';
        btn.setAttribute('data-active', active ? 'false' : 'true');
        btn.textContent = active ? 'absolute_sigma: OFF' : 'absolute_sigma: ON';
        btn.style.background = active ? '#2a2f4a' : '#00ff9f';
        btn.style.color = active ? '#c8c8e0' : '#0d1117';
        plotCovariance();
    };

    // === Explorer 2: Confidence Ellipse ===
    function plotEllipse() {
        var fit = fitFull(ellMeans, ellErrors, true);
        var nExps = parseInt(document.getElementById('fu-nexp-slider').value);

        // Compute 1σ and 2σ ellipses in (b, c) space from 2x2 sub-covariance
        var cbb = fit.cov[1][1], cbc = fit.cov[1][2], ccc = fit.cov[2][2];
        // Eigenvalues of 2x2
        var tr = cbb + ccc, det = cbb*ccc - cbc*cbc;
        var disc = Math.sqrt(Math.max(tr*tr/4 - det, 0));
        var lam1 = tr/2 + disc, lam2 = tr/2 - disc;
        if (lam1 < 0) lam1 = 0; if (lam2 < 0) lam2 = 0;
        // Eigenvector angle
        var theta = Math.atan2(lam1 - cbb, cbc);
        if (isNaN(theta)) theta = 0;

        function ellipsePoints(nsig) {
            var bPts = [], cPts = [];
            var s1 = nsig * Math.sqrt(lam1), s2 = nsig * Math.sqrt(lam2);
            for (var k = 0; k <= 100; k++) {
                var ang = 2 * Math.PI * k / 100;
                var u = s1 * Math.cos(ang), v = s2 * Math.sin(ang);
                bPts.push(fit.b + u * Math.cos(theta) - v * Math.sin(theta));
                cPts.push(fit.c + u * Math.sin(theta) + v * Math.cos(theta));
            }
            return {b: bPts, c: cPts};
        }

        var ell1 = ellipsePoints(1), ell2 = ellipsePoints(2);

        // Run repeated experiments and collect (b, c) pairs
        var bFits = [], cFits = [];
        for (var e = 0; e < nExps; e++) {
            var d = generateData(NOISE_DEFAULT);
            var f = fitFull(d.means, d.errors, true);
            bFits.push(f.b);
            cFits.push(f.c);
        }

        // LEFT: confidence ellipses with scatter
        var traces1 = [];
        traces1.push({
            x: ell2.b, y: ell2.c, mode:'lines', fill:'toself',
            fillcolor:'rgba(255,0,255,0.1)', line:{color:'#ff00ff', width:1.5, dash:'dash'},
            name:'2\u03C3 region'
        });
        traces1.push({
            x: ell1.b, y: ell1.c, mode:'lines', fill:'toself',
            fillcolor:'rgba(0,243,255,0.15)', line:{color:'#00f3ff', width:2},
            name:'1\u03C3 region'
        });
        traces1.push({
            x: bFits, y: cFits, mode:'markers',
            marker:{size:4, color:'#ffff00', opacity:0.6}, name:'Repeated fits'
        });
        traces1.push({
            x:[fit.b], y:[fit.c], mode:'markers',
            marker:{size:12, color:'#00ff9f', symbol:'x', line:{width:2}}, name:'This fit'
        });
        traces1.push({
            x:[0], y:[A_TRUE], mode:'markers',
            marker:{size:10, color:'#ff00ff', symbol:'star', line:{width:1}}, name:'True (0, 4.9)'
        });

        // Compute how many fall inside 1σ ellipse
        var inside1 = 0;
        for (var e = 0; e < nExps; e++) {
            var db = bFits[e] - fit.b, dc = cFits[e] - fit.c;
            var u = db * Math.cos(theta) + dc * Math.sin(theta);
            var v = -db * Math.sin(theta) + dc * Math.cos(theta);
            if (lam1 > 0 && lam2 > 0 && (u*u/lam1 + v*v/lam2) <= 1) inside1++;
        }
        var pct1 = nExps > 0 ? (100 * inside1 / nExps).toFixed(0) : '—';

        var bRange = Math.max(Math.abs(fit.db) * 5, 2);
        var cRange = Math.max(Math.abs(fit.dc) * 5, 0.5);
        var layout1 = {
            title:{text:'Confidence Regions (b, c)', font:{size:13}},
            xaxis:{title:'b (linear)', range:[fit.b-bRange, fit.b+bRange], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'c (quadratic)', range:[fit.c-cRange, fit.c+cRange], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:9}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('fu-ellipse-plot', traces1, layout1);

        // RIGHT: data + fit
        var traces2 = [];
        traces2.push({
            x: TIMES, y: ellMeans, mode:'markers',
            error_y:{type:'data', array:ellErrors, visible:true, color:'#00f3ff', thickness:2},
            marker:{size:8, color:'#00f3ff'}, name:'Data \u00B1 SE'
        });
        var tF=[], dF=[], dT=[];
        for (var k=0; k<=200; k++) {
            var t=11*k/200; tF.push(t);
            dF.push(fit.a + fit.b*t + fit.c*t*t);
            dT.push(A_TRUE*t*t);
        }
        traces2.push({x:tF, y:dF, mode:'lines', line:{color:'#ffff00', width:2.5}, name:'Fit'});
        traces2.push({x:tF, y:dT, mode:'lines', line:{color:'#ff00ff', width:1.5, dash:'dash'}, name:'True: 4.9t\u00B2'});
        var layout2 = {
            title:{text:'Data + Fit', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0,11], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Distance (m)', range:[-20,600], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('fu-fit-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('fu-ell-stats');
        if (statsDiv) {
            statsDiv.innerHTML =
                '<span>b = '+fit.b.toFixed(3)+' \u00B1 '+fit.db.toFixed(3)+'</span>'+
                '<span>c = '+fit.c.toFixed(4)+' \u00B1 '+fit.dc.toFixed(4)+'</span>'+
                '<span>\u03C1(b,c) = '+(cbc/Math.sqrt(cbb*ccc)).toFixed(3)+'</span>'+
                '<span>Inside 1\u03C3: <strong>'+pct1+'%</strong> (expect ~39%)</span>';
        }
    }

    // === Explorer 3: Bootstrap Simulator ===
    function plotBootstrap() {
        var nBoots = parseInt(document.getElementById('fu-nboot-slider').value);
        var paramSel = document.getElementById('fu-boot-param-select').value;

        // Original fit
        var origFit = fitFull(bootMeans, bootErrors, true);

        // Bootstrap: resample with replacement and refit
        var bootA = [], bootB = [], bootC = [];
        var bootCurves = [];
        for (var r = 0; r < nBoots; r++) {
            // Resample indices with replacement
            var rsMeans = [], rsErrors = [];
            for (var i = 0; i < N_TIMES; i++) {
                var idx = Math.floor(Math.random() * N_TIMES);
                rsMeans.push(bootMeans[idx]);
                rsErrors.push(bootErrors[idx]);
            }
            var f = fitFull(rsMeans, rsErrors, true);
            bootA.push(f.a);
            bootB.push(f.b);
            bootC.push(f.c);
            if (r < 50) { // Store first 50 curves for overlay
                var curve = [];
                for (var k = 0; k <= 100; k++) {
                    var t = 11 * k / 100;
                    curve.push(f.a + f.b * t + f.c * t * t);
                }
                bootCurves.push(curve);
            }
        }

        // Compute bootstrap standard deviations
        function stdArr(arr) {
            var n = arr.length, s = 0, s2 = 0;
            for (var i = 0; i < n; i++) { s += arr[i]; s2 += arr[i]*arr[i]; }
            var mean = s/n;
            return Math.sqrt(s2/n - mean*mean);
        }
        var sdA = stdArr(bootA), sdB = stdArr(bootB), sdC = stdArr(bootC);

        // Select which parameter to histogram
        var histVals, histLabel, covErr, bootErr;
        if (paramSel === 'a') {
            histVals = bootA; histLabel = 'a (offset)'; covErr = origFit.da; bootErr = sdA;
        } else if (paramSel === 'b') {
            histVals = bootB; histLabel = 'b (linear)'; covErr = origFit.db; bootErr = sdB;
        } else {
            histVals = bootC; histLabel = 'c (quadratic)'; covErr = origFit.dc; bootErr = sdC;
        }

        // LEFT: histogram of bootstrap parameter values
        var traces1 = [];
        traces1.push({
            x: histVals, type:'histogram',
            marker:{color:'rgba(0,243,255,0.5)', line:{color:'#00f3ff', width:1}},
            nbinsx: Math.min(30, Math.max(10, Math.floor(nBoots/5))),
            name:'Bootstrap ' + histLabel
        });
        // Mark original fit value
        var hPeak = nBoots / 6;
        var origVal = paramSel === 'a' ? origFit.a : (paramSel === 'b' ? origFit.b : origFit.c);
        traces1.push({
            x:[origVal,origVal], y:[0,hPeak], mode:'lines',
            line:{color:'#ffff00', width:2.5}, name:'Original fit'
        });

        var layout1 = {
            title:{text:'Bootstrap Distribution: '+histLabel, font:{size:13}},
            xaxis:{title:histLabel, gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Count', gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.55, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('fu-boot-hist-plot', traces1, layout1);

        // RIGHT: data + bootstrap fit curves overlaid
        var traces2 = [];
        // Bootstrap curves (semi-transparent)
        var tCurve = [];
        for (var k = 0; k <= 100; k++) tCurve.push(11 * k / 100);
        for (var r = 0; r < bootCurves.length; r++) {
            traces2.push({
                x: tCurve, y: bootCurves[r], mode:'lines',
                line:{color:'rgba(255,255,0,0.08)', width:1},
                hoverinfo:'skip', showlegend: r === 0, name: r === 0 ? 'Bootstrap fits' : undefined
            });
        }
        // Data points
        traces2.push({
            x: TIMES, y: bootMeans, mode:'markers',
            error_y:{type:'data', array:bootErrors, visible:true, color:'#00f3ff', thickness:2},
            marker:{size:8, color:'#00f3ff'}, name:'Data \u00B1 SE'
        });
        // Original fit
        var origCurve = [];
        for (var k = 0; k <= 100; k++) {
            var t = 11 * k / 100;
            origCurve.push(origFit.a + origFit.b * t + origFit.c * t * t);
        }
        traces2.push({x:tCurve, y:origCurve, mode:'lines', line:{color:'#00ff9f', width:2.5}, name:'Original fit'});

        var layout2 = {
            title:{text:'Bootstrap Fit Curves ('+Math.min(50,nBoots)+' shown)', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0,11], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Distance (m)', range:[-20,600], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('fu-boot-curves-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('fu-boot-stats');
        if (statsDiv) {
            var match = Math.abs(bootErr - covErr) / covErr < 0.5;
            statsDiv.innerHTML =
                '<span>Covariance \u03B4'+paramSel+': <strong>'+covErr.toFixed(4)+'</strong></span>'+
                '<span>Bootstrap \u03B4'+paramSel+': <strong>'+bootErr.toFixed(4)+'</strong></span>'+
                '<span style="color:'+(match?'#00ff9f':'#ffff00')+'">Match: <strong>'+(match?'Yes':'Rough')+'</strong></span>'+
                '<span>\u03B4a<sub>boot</sub> = '+sdA.toFixed(3)+'</span>'+
                '<span>\u03B4b<sub>boot</sub> = '+sdB.toFixed(4)+'</span>'+
                '<span>\u03B4c<sub>boot</sub> = '+sdC.toFixed(5)+'</span>';
        }
    }

    // === Event Handlers ===
    function attachEventHandlers() {
        var nExpSlider = document.getElementById('fu-nexp-slider');
        if (nExpSlider) nExpSlider.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.value; }
            plotEllipse();
        });

        var nBootSlider = document.getElementById('fu-nboot-slider');
        if (nBootSlider) nBootSlider.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.value; }
            plotBootstrap();
        });

        var bootParamSelect = document.getElementById('fu-boot-param-select');
        if (bootParamSelect) bootParamSelect.addEventListener('change', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.options[this.selectedIndex].text; }
            plotBootstrap();
        });
    }

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('fu-cov-plot');
        var p2 = document.getElementById('fu-ellipse-plot');
        var p3 = document.getElementById('fu-boot-hist-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        var d1 = generateData(NOISE_DEFAULT); covMeans = d1.means; covErrors = d1.errors;
        var d2 = generateData(NOISE_DEFAULT); ellMeans = d2.means; ellErrors = d2.errors;
        var d3 = generateData(NOISE_DEFAULT); bootMeans = d3.means; bootErrors = d3.errors;

        plotCovariance();
        plotEllipse();
        plotBootstrap();
        attachEventHandlers();
    }

    // === Global functions ===
    window.newCovarianceData = function() {
        var d = generateData(NOISE_DEFAULT); covMeans = d.means; covErrors = d.errors;
        plotCovariance();
    };
    window.resetCovarianceExplorer = function() {
        var btn = document.getElementById('fu-abs-sigma-btn');
        if (btn) { btn.setAttribute('data-active','true'); btn.textContent='absolute_sigma: ON';
            btn.style.background='#00ff9f'; btn.style.color='#0d1117'; }
        var d = generateData(NOISE_DEFAULT); covMeans = d.means; covErrors = d.errors;
        plotCovariance();
    };
    window.newEllipseData = function() {
        var d = generateData(NOISE_DEFAULT); ellMeans = d.means; ellErrors = d.errors;
        plotEllipse();
    };
    window.resetEllipseExplorer = function() {
        var sl = document.getElementById('fu-nexp-slider');
        if (sl) { sl.value = 50; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '50'; } }
        var d = generateData(NOISE_DEFAULT); ellMeans = d.means; ellErrors = d.errors;
        plotEllipse();
    };
    window.newBootstrapData = function() {
        var d = generateData(NOISE_DEFAULT); bootMeans = d.means; bootErrors = d.errors;
        plotBootstrap();
    };
    window.resetBootstrapExplorer = function() {
        var sl = document.getElementById('fu-nboot-slider');
        if (sl) { sl.value = 200; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '200'; } }
        var sel = document.getElementById('fu-boot-param-select');
        if (sel) { sel.value = 'c'; var lb = sel.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = 'c (quadratic)'; } }
        var d = generateData(NOISE_DEFAULT); bootMeans = d.means; bootErrors = d.errors;
        plotBootstrap();
    };

    initializePlots();
})();
