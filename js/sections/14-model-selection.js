(function() {
    'use strict';

    // === Constants ===
    var G_TRUE = 9.8, A_TRUE = G_TRUE / 2, N_TRIALS = 5, NOISE_DEFAULT = 0.15;
    var TIMES = [1,2,3,4,5,6,7,8,9,10], N_TIMES = TIMES.length;

    // State
    var compMeans = [], compErrors = [];
    var ofData = null; // {trainX, trainY, trainErr, testX, testY, testErr}
    var parsMeans = [], parsErrors = [];

    function boxMuller(mu, sigma) {
        var u1 = Math.random(), u2 = Math.random();
        if (u1 < 1e-10) u1 = 1e-10;
        return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }

    function generateData(noisePct, bTrue) {
        bTrue = bTrue || 0;
        var means = [], errors = [];
        for (var i = 0; i < N_TIMES; i++) {
            var t = TIMES[i], dPhys = A_TRUE * t * t + bTrue * t;
            var sigma = noisePct * Math.abs(A_TRUE * t * t);
            if (sigma < 0.5) sigma = 0.5;
            var trials = [], sum = 0;
            for (var j = 0; j < N_TRIALS; j++) { var v = boxMuller(dPhys, sigma); trials.push(v); sum += v; }
            var mean = sum / N_TRIALS, vs = 0;
            for (var j = 0; j < N_TRIALS; j++) { var d = trials[j] - mean; vs += d * d; }
            means.push(mean);
            errors.push(Math.sqrt(vs / (N_TRIALS - 1)) / Math.sqrt(N_TRIALS - 1));
        }
        return { means: means, errors: errors };
    }

    // === Polynomial fitting via weighted normal equations ===
    // Fit y = sum_{k=0}^{p-1} a_k * t^k using weighted least squares
    function fitPoly(order, ts, ys, ws) {
        var n = ts.length, p = order;
        // Build normal equations: M * a = v, where M[i][j] = sum w*t^(i+j), v[i] = sum w*y*t^i
        var M = [], v = [];
        for (var i = 0; i < p; i++) {
            M[i] = [];
            for (var j = 0; j < p; j++) M[i][j] = 0;
            v[i] = 0;
        }
        for (var k = 0; k < n; k++) {
            var t = ts[k], w = ws[k], y = ys[k];
            var tp = []; tp[0] = 1;
            for (var j = 1; j < 2 * p; j++) tp[j] = tp[j-1] * t;
            for (var i = 0; i < p; i++) {
                for (var j = 0; j < p; j++) M[i][j] += w * tp[i+j];
                v[i] += w * y * tp[i];
            }
        }
        // Solve via Gaussian elimination with partial pivoting
        var aug = [];
        for (var i = 0; i < p; i++) {
            aug[i] = [];
            for (var j = 0; j < p; j++) aug[i][j] = M[i][j];
            aug[i][p] = v[i];
        }
        for (var col = 0; col < p; col++) {
            var maxR = col, maxV = Math.abs(aug[col][col]);
            for (var r = col+1; r < p; r++) {
                if (Math.abs(aug[r][col]) > maxV) { maxV = Math.abs(aug[r][col]); maxR = r; }
            }
            if (maxR !== col) { var tmp = aug[col]; aug[col] = aug[maxR]; aug[maxR] = tmp; }
            if (Math.abs(aug[col][col]) < 1e-15) continue;
            for (var r = col+1; r < p; r++) {
                var f = aug[r][col] / aug[col][col];
                for (var c = col; c <= p; c++) aug[r][c] -= f * aug[col][c];
            }
        }
        var coeffs = [];
        for (var i = 0; i < p; i++) coeffs[i] = 0;
        for (var i = p-1; i >= 0; i--) {
            var s = aug[i][p];
            for (var j = i+1; j < p; j++) s -= aug[i][j] * coeffs[j];
            coeffs[i] = s / aug[i][i];
        }
        // Compute chi2
        var chi2 = 0;
        for (var k = 0; k < n; k++) {
            var t = ts[k], yfit = 0, tp = 1;
            for (var j = 0; j < p; j++) { yfit += coeffs[j] * tp; tp *= t; }
            var r = ys[k] - yfit;
            chi2 += ws[k] * r * r;
        }
        // Invert M for covariance matrix (diagonal only)
        var covDiag = [];
        var Minv = invertMatrix(M, p);
        for (var i = 0; i < p; i++) covDiag[i] = Minv ? Math.sqrt(Math.abs(Minv[i][i])) : 0;
        return { coeffs: coeffs, chi2: chi2, dof: n - p, errors: covDiag };
    }

    function invertMatrix(M, n) {
        // Augmented matrix [M | I]
        var A = [];
        for (var i = 0; i < n; i++) {
            A[i] = [];
            for (var j = 0; j < n; j++) A[i][j] = M[i][j];
            for (var j = 0; j < n; j++) A[i][n+j] = (i === j) ? 1 : 0;
        }
        for (var col = 0; col < n; col++) {
            var maxR = col, maxV = Math.abs(A[col][col]);
            for (var r = col+1; r < n; r++) {
                if (Math.abs(A[r][col]) > maxV) { maxV = Math.abs(A[r][col]); maxR = r; }
            }
            if (maxR !== col) { var tmp = A[col]; A[col] = A[maxR]; A[maxR] = tmp; }
            if (Math.abs(A[col][col]) < 1e-15) return null;
            var piv = A[col][col];
            for (var c = 0; c < 2*n; c++) A[col][c] /= piv;
            for (var r = 0; r < n; r++) {
                if (r === col) continue;
                var f = A[r][col];
                for (var c = 0; c < 2*n; c++) A[r][c] -= f * A[col][c];
            }
        }
        var inv = [];
        for (var i = 0; i < n; i++) {
            inv[i] = [];
            for (var j = 0; j < n; j++) inv[i][j] = A[i][n+j];
        }
        return inv;
    }

    function evalPoly(coeffs, t) {
        var v = 0, tp = 1;
        for (var j = 0; j < coeffs.length; j++) { v += coeffs[j] * tp; tp *= t; }
        return v;
    }

    // === Explorer 1: Model Comparator ===
    function plotComparator() {
        var selType = parseInt(document.getElementById('ms-comp-select').value);
        var ws = [];
        for (var i = 0; i < N_TIMES; i++) ws[i] = 1 / (compErrors[i] * compErrors[i]);

        // Fit models 1-5 param
        var fits = [];
        for (var p = 1; p <= 5; p++) {
            fits.push(fitPoly(p, TIMES, compMeans, ws));
        }
        var selFit = fits[selType - 1];

        // LEFT: data + selected fit
        var traces1 = [];
        traces1.push({
            x: TIMES, y: compMeans, mode: 'markers',
            error_y: {type:'data', array:compErrors, visible:true, color:'#00f3ff', thickness:2},
            marker: {size:8, color:'#00f3ff'}, name: 'Data \u00B1 SE'
        });
        var tF = [], dF = [], dT = [];
        for (var k = 0; k <= 200; k++) {
            var t = 0.5 + 10 * k / 200; tF.push(t);
            dF.push(evalPoly(selFit.coeffs, t));
            dT.push(A_TRUE * t * t);
        }
        traces1.push({ x:tF, y:dF, mode:'lines', line:{color:'#ffff00', width:2.5}, name: selType+'-param fit' });
        traces1.push({ x:tF, y:dT, mode:'lines', line:{color:'#ff00ff', width:1.5, dash:'dash'}, name:'True: d = 4.9t\u00B2' });

        var layout1 = {
            title:{text: selType+'-parameter fit (\u03C7\u00B2/dof = '+(selFit.dof>0?(selFit.chi2/selFit.dof).toFixed(2):'\u2014')+')', font:{size:13}},
            xaxis:{title:'Time (s)', range:[0,11], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Distance (m)', range:[-20,600], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('ms-comp-data-plot', traces1, layout1);

        // RIGHT: χ²/dof bar chart for all models
        var labels = ['1-param', '2-param', '3-param', '4-param', '5-param'];
        var chi2dofs = [];
        var colors = [];
        for (var p = 0; p < 5; p++) {
            chi2dofs.push(fits[p].dof > 0 ? fits[p].chi2 / fits[p].dof : 0);
            colors.push(p === selType - 1 ? '#00f3ff' : '#555');
        }
        var traces2 = [{
            x: labels, y: chi2dofs, type: 'bar', marker: {color: colors},
            text: chi2dofs.map(function(v){return v.toFixed(2);}),
            textposition: 'outside', textfont: {color:'#c8c8e0'}, hoverinfo: 'y'
        }];
        // Reference line at χ²/dof = 1
        traces2.push({
            x: [labels[0], labels[4]], y: [1, 1], mode: 'lines',
            line: {color:'#00ff9f', width:2, dash:'dash'}, name: '\u03C7\u00B2/dof = 1',
            hoverinfo: 'skip'
        });
        var maxBar = Math.max.apply(null, chi2dofs) * 1.4;
        if (maxBar < 3) maxBar = 3;
        var layout2 = {
            title:{text:'\u03C7\u00B2/dof by Model Complexity', font:{size:13}},
            xaxis:{gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'\u03C7\u00B2/dof', range:[0,maxBar], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.65, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:80, l:55, r:15}
        };
        createPlot('ms-comp-chi2-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('ms-comp-stats');
        if (statsDiv) {
            var parts = [];
            for (var j = 0; j < selType; j++) {
                parts.push('a<sub>'+j+'</sub> = ' + selFit.coeffs[j].toFixed(3) + ' \u00B1 ' + selFit.errors[j].toFixed(3));
            }
            parts.push('\u03C7\u00B2 = ' + selFit.chi2.toFixed(1));
            parts.push('\u03C7\u00B2/dof = ' + (selFit.dof>0?(selFit.chi2/selFit.dof).toFixed(2):'\u2014'));
            statsDiv.innerHTML = parts.map(function(p){return '<span>'+p+'</span>';}).join('');
        }
    }

    // === Explorer 2: Overfitting Demonstrator ===
    function generateOverfitData() {
        var nPts = parseInt(document.getElementById('ms-npts-slider').value);
        var noisePct = 0.15;
        // Generate N+5 points: first N for training, last 5 for testing
        var allT = [], allY = [], allE = [];
        var tStep = 10 / (nPts + 4);
        for (var i = 0; i < nPts + 5; i++) {
            var t = 0.5 + tStep * i;
            var dTrue = A_TRUE * t * t;
            var sigma = noisePct * dTrue;
            if (sigma < 0.5) sigma = 0.5;
            var y = boxMuller(dTrue, sigma);
            allT.push(t);
            allY.push(y);
            allE.push(sigma);
        }
        // Split: first nPts = training, rest = test
        ofData = {
            trainX: allT.slice(0, nPts), trainY: allY.slice(0, nPts), trainErr: allE.slice(0, nPts),
            testX: allT.slice(nPts), testY: allY.slice(nPts), testErr: allE.slice(nPts)
        };
    }

    function plotOverfit() {
        if (!ofData) { generateOverfitData(); }
        var degree = parseInt(document.getElementById('ms-degree-slider').value);
        var nPts = ofData.trainX.length;

        var ws = [];
        for (var i = 0; i < nPts; i++) ws[i] = 1 / (ofData.trainErr[i] * ofData.trainErr[i]);
        var wsTest = [];
        for (var i = 0; i < ofData.testX.length; i++) wsTest[i] = 1 / (ofData.testErr[i] * ofData.testErr[i]);

        // Fit training data
        var order = degree + 1; // degree 0 = 1 param, degree 1 = 2 params, etc.
        if (order > nPts - 1) order = nPts - 1;
        var fit = fitPoly(order, ofData.trainX, ofData.trainY, ws);

        // Compute test χ²
        var testChi2 = 0;
        for (var i = 0; i < ofData.testX.length; i++) {
            var r = ofData.testY[i] - evalPoly(fit.coeffs, ofData.testX[i]);
            testChi2 += wsTest[i] * r * r;
        }

        // LEFT: data + fit curve
        var traces1 = [];
        traces1.push({
            x: ofData.trainX, y: ofData.trainY, mode: 'markers',
            error_y: {type:'data', array:ofData.trainErr, visible:true, color:'#00f3ff', thickness:2},
            marker: {size:8, color:'#00f3ff'}, name: 'Training data'
        });
        traces1.push({
            x: ofData.testX, y: ofData.testY, mode: 'markers',
            error_y: {type:'data', array:ofData.testErr, visible:true, color:'#ff6b6b', thickness:2},
            marker: {size:10, color:'#ff6b6b', symbol:'diamond'}, name: 'Test data'
        });

        var tF = [], dF = [], dT = [];
        var tMin = Math.min.apply(null, ofData.trainX.concat(ofData.testX));
        var tMax = Math.max.apply(null, ofData.trainX.concat(ofData.testX));
        for (var k = 0; k <= 300; k++) {
            var t = tMin + (tMax - tMin) * k / 300; tF.push(t);
            dF.push(evalPoly(fit.coeffs, t));
            dT.push(A_TRUE * t * t);
        }
        traces1.push({ x:tF, y:dF, mode:'lines', line:{color:'#ffff00', width:2.5}, name:'Degree-'+degree+' fit' });
        traces1.push({ x:tF, y:dT, mode:'lines', line:{color:'#ff00ff', width:1.5, dash:'dash'}, name:'True: 4.9t\u00B2' });

        var yMax = 0;
        for (var i = 0; i < ofData.trainY.length; i++) { var v = Math.abs(ofData.trainY[i]); if(v>yMax) yMax=v; }
        for (var i = 0; i < ofData.testY.length; i++) { var v = Math.abs(ofData.testY[i]); if(v>yMax) yMax=v; }
        // Clamp fit curve to avoid wild polynomial excursions in display
        var dFclamp = [];
        for (var k = 0; k < dF.length; k++) dFclamp.push(Math.max(-yMax*0.5, Math.min(yMax*2, dF[k])));

        var layout1 = {
            title:{text:'Degree-'+degree+' polynomial ('+order+' params)', font:{size:13}},
            xaxis:{title:'Time (s)', range:[tMin-0.5, tMax+0.5], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'Distance (m)', range:[-yMax*0.3, yMax*1.6], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.02, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('ms-overfit-data-plot', traces1, layout1);

        // RIGHT: train chi2/dof vs test chi2/dof for all degrees
        var maxDeg = Math.min(nPts - 2, 8);
        var trainChi2s = [], testChi2s = [], degs = [];
        for (var d = 1; d <= maxDeg; d++) {
            var f = fitPoly(d + 1, ofData.trainX, ofData.trainY, ws);
            var tc2 = 0;
            for (var i = 0; i < ofData.testX.length; i++) {
                var r = ofData.testY[i] - evalPoly(f.coeffs, ofData.testX[i]);
                tc2 += wsTest[i] * r * r;
            }
            degs.push(d);
            trainChi2s.push(f.dof > 0 ? f.chi2 / f.dof : 0);
            testChi2s.push(tc2 / ofData.testX.length);
        }
        var traces2 = [];
        traces2.push({
            x: degs, y: trainChi2s, mode: 'lines+markers',
            line: {color:'#00f3ff', width:2}, marker: {size:7, color:'#00f3ff'},
            name: 'Train \u03C7\u00B2/dof'
        });
        traces2.push({
            x: degs, y: testChi2s, mode: 'lines+markers',
            line: {color:'#ff6b6b', width:2}, marker: {size:7, color:'#ff6b6b'},
            name: 'Test \u03C7\u00B2/pt'
        });
        // Highlight current degree
        var cIdx = degree - 1;
        if (cIdx >= 0 && cIdx < degs.length) {
            traces2.push({
                x: [degree], y: [trainChi2s[cIdx]], mode: 'markers',
                marker: {size:14, color:'#ffff00', symbol:'circle-open', line:{width:3}},
                name: 'Current', showlegend: false
            });
        }
        // Reference line
        traces2.push({
            x: [degs[0], degs[degs.length-1]], y: [1, 1], mode:'lines',
            line:{color:'#00ff9f', width:1.5, dash:'dash'}, name:'\u03C7\u00B2/dof = 1', hoverinfo:'skip'
        });
        var yUp = Math.max.apply(null, trainChi2s.concat(testChi2s)) * 1.3;
        if (yUp < 3) yUp = 3;
        if (yUp > 30) yUp = 30;
        var layout2 = {
            title:{text:'Train vs Test Error', font:{size:13}},
            xaxis:{title:'Polynomial Degree', dtick:1, gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'\u03C7\u00B2 / point', range:[0, yUp], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.55, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:50, l:55, r:15}
        };
        createPlot('ms-overfit-err-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('ms-overfit-stats');
        if (statsDiv) {
            var trainC = fit.dof > 0 ? fit.chi2/fit.dof : 0;
            var testC = testChi2 / ofData.testX.length;
            statsDiv.innerHTML =
                '<span>Degree: <strong>'+degree+'</strong></span>'+
                '<span>Params: <strong>'+order+'</strong></span>'+
                '<span>Train \u03C7\u00B2/dof: <strong>'+trainC.toFixed(2)+'</strong></span>'+
                '<span>Test \u03C7\u00B2/pt: <strong>'+testC.toFixed(2)+'</strong></span>'+
                '<span style="color:'+(degree<=3?'#00ff9f':'#ff6b6b')+'">'+
                (degree<=3?'Good complexity':'Risk of overfitting')+'</span>';
        }
    }

    // === Explorer 3: Parsimony Meter (χ²/dof + BIC) ===
    function plotParsimony() {
        var noisePct = parseInt(document.getElementById('ms-pars-noise-slider').value) / 100;
        var extraBtn = document.getElementById('ms-extra-signal-btn');
        var hasExtra = extraBtn && extraBtn.getAttribute('data-active') === 'true';
        var bTrue = hasExtra ? 5.0 : 0;

        // Regenerate data
        var d = generateData(noisePct, bTrue);
        parsMeans = d.means; parsErrors = d.errors;

        var ws = [];
        for (var i = 0; i < N_TIMES; i++) ws[i] = 1 / (parsErrors[i] * parsErrors[i]);

        // Fit models with 1-5 params
        var fits = [];
        for (var p = 1; p <= 5; p++) {
            fits.push(fitPoly(p, TIMES, parsMeans, ws));
        }

        var labels = ['1-param', '2-param', '3-param', '4-param', '5-param'];

        // LEFT: χ²/dof bars
        var chi2dofs = [], colors1 = [];
        for (var p = 0; p < 5; p++) {
            chi2dofs.push(fits[p].dof > 0 ? fits[p].chi2 / fits[p].dof : 0);
            colors1.push('#00f3ff');
        }
        // Highlight the best (closest to 1)
        var bestIdx = 0, bestDist = 999;
        for (var p = 0; p < 5; p++) {
            if (fits[p].dof > 0) {
                var dist = Math.abs(chi2dofs[p] - 1);
                if (dist < bestDist) { bestDist = dist; bestIdx = p; }
            }
        }

        var traces1 = [{
            x: labels, y: chi2dofs, type: 'bar',
            marker: {color: colors1.map(function(c, i){ return i===bestIdx ? '#00ff9f' : '#00f3ff'; })},
            text: chi2dofs.map(function(v){return v.toFixed(2);}),
            textposition: 'outside', textfont:{color:'#c8c8e0'}, hoverinfo:'y'
        }];
        traces1.push({
            x: [labels[0], labels[4]], y: [1, 1], mode:'lines',
            line:{color:'#ffff00', width:2, dash:'dash'}, name:'\u03C7\u00B2/dof = 1', hoverinfo:'skip'
        });
        var maxChi = Math.max.apply(null, chi2dofs) * 1.4;
        if (maxChi < 3) maxChi = 3;
        var layout1 = {
            title:{text:'\u03C7\u00B2/dof (closer to 1 = better)', font:{size:13}},
            xaxis:{gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'\u03C7\u00B2/dof', range:[0, maxChi], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:true, legend:{x:0.65, y:0.98, bgcolor:'rgba(0,0,0,0.3)', font:{size:10}},
            margin:{t:40, b:80, l:55, r:15}
        };
        createPlot('ms-pars-chi2-plot', traces1, layout1);

        // RIGHT: BIC bars
        // BIC = χ² + k * ln(N), where k = number of params, N = data points
        var lnN = Math.log(N_TIMES);
        var bics = [], colors2 = [];
        var minBIC = 1e12, bicBest = 0;
        for (var p = 0; p < 5; p++) {
            var bic = fits[p].chi2 + (p + 1) * lnN;
            bics.push(bic);
            if (bic < minBIC) { minBIC = bic; bicBest = p; }
        }
        for (var p = 0; p < 5; p++) {
            colors2.push(p === bicBest ? '#00ff9f' : '#ff00ff');
        }

        var traces2 = [{
            x: labels, y: bics, type: 'bar', marker: {color: colors2},
            text: bics.map(function(v){return v.toFixed(1);}),
            textposition: 'outside', textfont:{color:'#c8c8e0'}, hoverinfo:'y'
        }];
        var maxBIC = Math.max.apply(null, bics) * 1.3;
        var minBICdisp = Math.min.apply(null, bics) * 0.7;
        if (minBICdisp < 0) minBICdisp = 0;
        var layout2 = {
            title:{text:'BIC (lower = better)', font:{size:13}},
            xaxis:{gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            yaxis:{title:'BIC', range:[minBICdisp, maxBIC], gridcolor:'#2a2f4a', zerolinecolor:'#808080', linecolor:'#808080'},
            showlegend:false,
            margin:{t:40, b:80, l:55, r:15}
        };
        createPlot('ms-pars-bic-plot', traces2, layout2);

        // Stats
        var statsDiv = document.getElementById('ms-pars-stats');
        if (statsDiv) {
            var sigLabel = hasExtra ? 'bt + ct\u00B2 (b = 5)' : 'ct\u00B2 only';
            statsDiv.innerHTML =
                '<span>True model: <strong>'+sigLabel+'</strong></span>'+
                '<span>\u03C7\u00B2/dof best: <strong>'+labels[bestIdx]+'</strong></span>'+
                '<span>BIC best: <strong>'+labels[bicBest]+'</strong></span>'+
                '<span style="color:#00ff9f">BIC = \u03C7\u00B2 + k\u00B7ln(N)</span>';
        }
    }

    // === Event Handlers ===
    function attachEventHandlers() {
        // Explorer 1
        var compSelect = document.getElementById('ms-comp-select');
        if (compSelect) compSelect.addEventListener('change', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.options[this.selectedIndex].text; }
            plotComparator();
        });

        // Explorer 2
        var nPtsSlider = document.getElementById('ms-npts-slider');
        if (nPtsSlider) nPtsSlider.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.value; }
            generateOverfitData();
            // Clamp degree slider if needed
            var degSlider = document.getElementById('ms-degree-slider');
            var maxDeg = Math.min(parseInt(this.value) - 2, 8);
            if (maxDeg < 1) maxDeg = 1;
            if (degSlider) {
                degSlider.max = maxDeg;
                if (parseInt(degSlider.value) > maxDeg) {
                    degSlider.value = maxDeg;
                    var lb = degSlider.closest('.control-group');
                    if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = maxDeg; }
                }
            }
            plotOverfit();
        });
        var degSlider = document.getElementById('ms-degree-slider');
        if (degSlider) degSlider.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.value; }
            plotOverfit();
        });

        // Explorer 3
        var parsNoiseSlider = document.getElementById('ms-pars-noise-slider');
        if (parsNoiseSlider) parsNoiseSlider.addEventListener('input', function() {
            var label = this.closest('.control-group');
            if (label) { var v = label.querySelector('.control-label-value'); if (v) v.textContent = this.value; }
            plotParsimony();
        });
    }

    // Toggle extra signal button
    window.toggleExtraSignal = function() {
        var btn = document.getElementById('ms-extra-signal-btn');
        if (!btn) return;
        var active = btn.getAttribute('data-active') === 'true';
        btn.setAttribute('data-active', active ? 'false' : 'true');
        btn.textContent = active ? 'Extra Signal: OFF' : 'Extra Signal: ON';
        btn.style.background = active ? '#2a2f4a' : '#00ff9f';
        btn.style.color = active ? '#c8c8e0' : '#0d1117';
        plotParsimony();
    };

    // === Initialization ===
    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100); return;
        }
        var p1 = document.getElementById('ms-comp-data-plot');
        var p2 = document.getElementById('ms-overfit-data-plot');
        var p3 = document.getElementById('ms-pars-chi2-plot');
        if (!p1 || !p2 || !p3) { setTimeout(initializePlots, 100); return; }

        var d1 = generateData(NOISE_DEFAULT); compMeans = d1.means; compErrors = d1.errors;
        generateOverfitData();

        plotComparator();
        plotOverfit();
        plotParsimony();
        attachEventHandlers();
    }

    // === Global functions ===
    window.newComparatorData = function() {
        var d = generateData(NOISE_DEFAULT); compMeans = d.means; compErrors = d.errors;
        plotComparator();
    };
    window.resetComparatorExplorer = function() {
        var sel = document.getElementById('ms-comp-select');
        if (sel) { sel.value = '3'; var lb = sel.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = 'a\u2080 + a\u2081t + a\u2082t\u00B2 (3-param)'; } }
        var d = generateData(NOISE_DEFAULT); compMeans = d.means; compErrors = d.errors;
        plotComparator();
    };
    window.newOverfitData = function() {
        generateOverfitData(); plotOverfit();
    };
    window.resetOverfitExplorer = function() {
        var sl1 = document.getElementById('ms-npts-slider');
        if (sl1) { sl1.value = 10; var lb = sl1.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '10'; } }
        var sl2 = document.getElementById('ms-degree-slider');
        if (sl2) { sl2.max = 8; sl2.value = 2; var lb = sl2.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '2'; } }
        generateOverfitData(); plotOverfit();
    };
    window.newParsimonyData = function() { plotParsimony(); };
    window.resetParsimonyExplorer = function() {
        var sl = document.getElementById('ms-pars-noise-slider');
        if (sl) { sl.value = 15; var lb = sl.closest('.control-group');
            if (lb) { var v = lb.querySelector('.control-label-value'); if (v) v.textContent = '15'; } }
        var btn = document.getElementById('ms-extra-signal-btn');
        if (btn) { btn.setAttribute('data-active','false'); btn.textContent='Extra Signal: OFF';
            btn.style.background='#2a2f4a'; btn.style.color='#c8c8e0'; }
        plotParsimony();
    };

    initializePlots();
})();
