(function() {
    'use strict';

    var darkLayout = {
        template: 'plotly_dark',
        margin: { t: 30, r: 20, b: 45, l: 55 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    };

    function axStyle(range, title) {
        return {
            gridcolor: '#2a2f4a',
            zerolinecolor: '#808080',
            linecolor: '#808080',
            range: range,
            title: title || ''
        };
    }

    // ===== Planetary data =====
    var planets = {
        earth:   { name: 'Earth',   g: 9.80,  R: 6.37e6,  color: '#00f3ff' },
        moon:    { name: 'Moon',    g: 1.62,  R: 1.74e6,  color: '#808080' },
        mars:    { name: 'Mars',    g: 3.72,  R: 3.39e6,  color: '#ff6b6b' },
        jupiter: { name: 'Jupiter', g: 24.79, R: 7.15e7,  color: '#ff00ff' }
    };

    var planetKeys = ['earth', 'moon', 'mars', 'jupiter'];

    function vEsc(g, R) { return Math.sqrt(2 * g * R); }

    // ============================================================
    // EXPLORER 1: The Scaling Collapse
    // ============================================================
    function updateCollapseExplorer() {
        var ratio = parseFloat(document.getElementById('nd-ratio-slider').value);
        document.getElementById('nd-ratio-value').textContent = ratio.toFixed(2);

        var V0 = ratio * Math.sqrt(2);  // dimensionless launch speed

        // Compute physical v0 for each planet
        var pEarth = planets.earth, pMoon = planets.moon, pMars = planets.mars;
        var v0Earth = ratio * vEsc(pEarth.g, pEarth.R);
        var v0Moon  = ratio * vEsc(pMoon.g, pMoon.R);
        var v0Mars  = ratio * vEsc(pMars.g, pMars.R);

        document.getElementById('nd-v0earth').textContent = (v0Earth / 1000).toFixed(1) + ' km/s';
        document.getElementById('nd-v0moon').textContent = (v0Moon / 1000).toFixed(1) + ' km/s';
        document.getElementById('nd-v0mars').textContent = (v0Mars / 1000).toFixed(1) + ' km/s';
        document.getElementById('nd-V0').textContent = V0.toFixed(2);

        var nPts = 200;
        var xMaxPlot = 15;  // in planet radii

        // --- Left plot: Dimensional v²(x) ---
        var tracesDim = [];
        var showPlanets = [
            { key: 'earth', v0: v0Earth },
            { key: 'moon',  v0: v0Moon },
            { key: 'mars',  v0: v0Mars }
        ];

        var dimYmax = 0;
        for (var p = 0; p < showPlanets.length; p++) {
            var pl = planets[showPlanets[p].key];
            var v0 = showPlanets[p].v0;
            var xArr = [], v2Arr = [];

            for (var i = 0; i < nPts; i++) {
                // x in meters, from R to xMaxPlot*R
                var xPhys = pl.R * (1 + i * (xMaxPlot - 1) / (nPts - 1));
                xArr.push(xPhys / 1e6);  // Mm for display
                var v2 = v0 * v0 - 2 * pl.g * pl.R * (1 - pl.R / xPhys);
                v2Arr.push(v2 / 1e6);  // (km/s)²
            }

            if (v0 * v0 / 1e6 > dimYmax) dimYmax = v0 * v0 / 1e6;

            tracesDim.push({
                x: xArr, y: v2Arr, mode: 'lines', name: pl.name,
                line: { color: pl.color, width: 2 }
            });
        }

        // Zero line
        tracesDim.push({
            x: [0, showPlanets[0].v0 > 0 ? planets.earth.R * xMaxPlot / 1e6 : 100],
            y: [0, 0], mode: 'lines',
            line: { color: '#808080', width: 1, dash: 'dot' }, showlegend: false
        });

        var layout1 = Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'x (Mm)'),
            yaxis: axStyle([Math.min(-20, -dimYmax * 0.3), dimYmax * 1.2], 'v² (km/s)²'),
            legend: { x: 0.55, y: 0.95, font: { size: 11 } },
            showlegend: true,
            title: { text: 'Dimensional', font: { size: 13, color: '#e0e0e0' } }
        });

        Plotly.react('nd-dimPlot', tracesDim, layout1, { responsive: true });

        // --- Right plot: Dimensionless V²(X) — all collapse! ---
        var tracesNdim = [];
        var ndX = [], ndV2 = [];
        for (var j = 0; j < nPts; j++) {
            var Xj = 1 + j * (xMaxPlot - 1) / (nPts - 1);
            ndX.push(Xj);
            ndV2.push(V0 * V0 - 2 * (1 - 1 / Xj));
        }

        // Plot all three on top of each other (they're identical!)
        for (var q = 0; q < showPlanets.length; q++) {
            var plq = planets[showPlanets[q].key];
            tracesNdim.push({
                x: ndX, y: ndV2, mode: 'lines', name: plq.name,
                line: { color: plq.color, width: 2 + (2 - q) },
                showlegend: false
            });
        }

        // Zero line
        tracesNdim.push({
            x: [1, xMaxPlot], y: [0, 0], mode: 'lines',
            line: { color: '#808080', width: 1, dash: 'dot' }, showlegend: false
        });

        var ndYmax = V0 * V0 + 0.5;

        var layout2 = Object.assign({}, darkLayout, {
            xaxis: axStyle([1, xMaxPlot], 'X (planet radii)'),
            yaxis: axStyle([Math.min(-1, -ndYmax * 0.3), ndYmax], 'V² (dimensionless)'),
            showlegend: false,
            title: { text: 'Dimensionless (all collapse!)', font: { size: 13, color: '#00ff9f' } }
        });

        Plotly.react('nd-ndimPlot', tracesNdim, layout2, { responsive: true });
    }

    // ============================================================
    // EXPLORER 2: Universal Phase Portrait
    // ============================================================
    function updateUniversalExplorer() {
        var V0 = parseFloat(document.getElementById('nd-V0-slider').value);
        document.getElementById('nd-V0-value').textContent = V0.toFixed(2);

        var E = 0.5 * V0 * V0 - 1;
        var sqrt2 = Math.sqrt(2);

        // Classification
        var cls, clsColor;
        if (Math.abs(V0 - sqrt2) < 0.03) {
            cls = 'Critical'; clsColor = '#ffff00';
        } else if (V0 < sqrt2) {
            cls = 'Bound'; clsColor = '#ff6b6b';
        } else {
            cls = 'Unbound'; clsColor = '#00ff9f';
        }

        // Max height or V_infinity
        var xmaxStr;
        if (V0 * V0 >= 2) {
            var Vinf = Math.sqrt(V0 * V0 - 2);
            xmaxStr = 'V_∞ = ' + Vinf.toFixed(2);
        } else {
            var Xmax = 2 / (2 - V0 * V0);
            if (Xmax > 100) {
                xmaxStr = 'X_max → ∞';
            } else {
                xmaxStr = 'X_max = ' + Xmax.toFixed(2);
            }
        }

        document.getElementById('nd-V0val').textContent = V0.toFixed(2);
        document.getElementById('nd-Eval').textContent = E.toFixed(2);
        document.getElementById('nd-class2').textContent = cls;
        document.getElementById('nd-class2').style.color = clsColor;
        document.getElementById('nd-xmax').textContent = xmaxStr;

        var nPts = 300;
        var xMax = 20;

        // --- Left plot: V(X) curves ---
        var xArr = [], vArr = [], vCritArr = [];
        for (var i = 0; i < nPts; i++) {
            var Xi = 1 + i * (xMax - 1) / (nPts - 1);
            xArr.push(Xi);

            var V2 = V0 * V0 - 2 + 2 / Xi;
            vArr.push(V2 >= 0 ? Math.sqrt(V2) : null);

            var V2crit = 2 - 2 + 2 / Xi;  // V0 = sqrt(2)
            vCritArr.push(Math.sqrt(V2crit));
        }

        var traces1 = [
            { x: xArr, y: vArr, mode: 'lines',
              name: 'V₀ = ' + V0.toFixed(2),
              line: { color: clsColor, width: 3 }, connectgaps: false },
            { x: xArr, y: vCritArr, mode: 'lines',
              name: 'V₀ = √2 (critical)',
              line: { color: '#ffff00', width: 1, dash: 'dash' } }
        ];

        // Mark turning point for bound
        if (V0 < sqrt2 && V0 * V0 < 2) {
            var Xturn = 2 / (2 - V0 * V0);
            if (Xturn <= xMax) {
                traces1.push({
                    x: [Xturn], y: [0], mode: 'markers', name: 'Turning point',
                    marker: { color: '#ff6b6b', size: 10, symbol: 'x' }
                });
            }
        }

        var layout1 = Object.assign({}, darkLayout, {
            xaxis: axStyle([1, xMax], 'X (planet radii)'),
            yaxis: axStyle([0, Math.max(V0 + 0.3, 2)], 'V (dimensionless speed)'),
            legend: { x: 0.45, y: 0.95, font: { size: 11 } },
            showlegend: true
        });

        Plotly.react('nd-vxPlot', traces1, layout1, { responsive: true });

        // --- Right plot: Energy landscape ---
        var xArr2 = [], uArr = [];
        for (var j = 0; j < nPts; j++) {
            var Xj = 1 + j * (xMax - 1) / (nPts - 1);
            xArr2.push(Xj);
            uArr.push(-1 / Xj);  // U(X) = -1/X
        }

        var traces2 = [
            { x: xArr2, y: uArr, mode: 'lines', name: 'U(X) = −1/X',
              line: { color: '#00ff9f', width: 2 },
              fill: 'tozeroy', fillcolor: 'rgba(0,255,159,0.08)' },
            // Total energy line
            { x: [1, xMax], y: [E, E], mode: 'lines',
              name: 'E = ' + E.toFixed(2),
              line: { color: clsColor, width: 2, dash: 'dash' } },
            // Zero energy reference
            { x: [1, xMax], y: [0, 0], mode: 'lines',
              name: 'E = 0',
              line: { color: '#808080', width: 1, dash: 'dot' } }
        ];

        // Mark intersection (turning point) for bound
        if (E < 0 && V0 * V0 < 2) {
            var Xint = -1 / E;  // U(X) = E → -1/X = E → X = -1/E
            if (Xint <= xMax && Xint > 0) {
                traces2.push({
                    x: [Xint], y: [E], mode: 'markers', name: 'Turning point',
                    marker: { color: '#ff6b6b', size: 10, symbol: 'x' },
                    showlegend: false
                });
            }
        }

        var layout2 = Object.assign({}, darkLayout, {
            xaxis: axStyle([1, xMax], 'X (planet radii)'),
            yaxis: axStyle([-1.2, Math.max(E + 0.5, 0.5)], 'Energy (dimensionless)'),
            legend: { x: 0.45, y: 0.95, font: { size: 11 } },
            showlegend: true
        });

        Plotly.react('nd-ePlot', traces2, layout2, { responsive: true });
    }

    // ============================================================
    // EXPLORER 3: Scale Translator
    // ============================================================
    function updateScaleExplorer() {
        var sel = document.getElementById('nd-body-select2').value;
        var V0 = parseFloat(document.getElementById('nd-V0dim-slider').value);
        document.getElementById('nd-V0dim-value').textContent = V0.toFixed(2);

        var pl = planets[sel];
        var tau = Math.sqrt(pl.R / pl.g);
        var vPhys = V0 * Math.sqrt(pl.g * pl.R);

        document.getElementById('nd-physV0').textContent = (vPhys / 1000).toFixed(1) + ' km/s';
        document.getElementById('nd-tscale').textContent = Math.round(tau) + ' s';
        document.getElementById('nd-lscale').textContent = Math.round(pl.R / 1000).toLocaleString() + ' km';

        // --- Left plot: physical v₀ bar chart for all planets at this V₀ ---
        var barNames = [], barVals = [], barColors = [];
        for (var i = 0; i < planetKeys.length; i++) {
            var b = planets[planetKeys[i]];
            barNames.push(b.name);
            barVals.push(V0 * Math.sqrt(b.g * b.R) / 1000);  // km/s
            barColors.push(planetKeys[i] === sel ? '#ffff00' : b.color);
        }

        var textVals = [];
        for (var k = 0; k < barVals.length; k++) {
            textVals.push(barVals[k].toFixed(1));
        }

        var traces1 = [{
            type: 'bar',
            x: barNames, y: barVals,
            marker: { color: barColors },
            text: textVals,
            textposition: 'outside',
            textfont: { color: '#e0e0e0', size: 12 }
        }];

        var maxBar = Math.max.apply(null, barVals);

        var layout1 = Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''),
            yaxis: axStyle([0, maxBar * 1.3], 'Physical v₀ (km/s)'),
            showlegend: false,
            title: { text: 'V₀ = ' + V0.toFixed(2) + ' → physical speeds',
                     font: { size: 13, color: '#e0e0e0' } }
        });

        Plotly.react('nd-scaleBarPlot', traces1, layout1, { responsive: true });

        // --- Right plot: scale factors comparison ---
        // Show τ, R, √(gR) for each planet as grouped bars
        var scaleNames = ['τ = √(R/g)\n(seconds)', 'R\n(1000 km)', '√(gR)\n(km/s)'];
        var scaleData = [];

        for (var j = 0; j < planetKeys.length; j++) {
            var bj = planets[planetKeys[j]];
            var tauJ = Math.sqrt(bj.R / bj.g);
            var sqrtGR = Math.sqrt(bj.g * bj.R) / 1000;  // km/s
            scaleData.push({
                name: bj.name,
                vals: [tauJ, bj.R / 1e6, sqrtGR],  // τ in s, R in 1000km, √(gR) in km/s
                color: planetKeys[j] === sel ? '#ffff00' : bj.color
            });
        }

        // Normalize each scale factor to Earth's value for comparison
        var earthTau = Math.sqrt(planets.earth.R / planets.earth.g);
        var earthR = planets.earth.R / 1e6;
        var earthSqrtGR = Math.sqrt(planets.earth.g * planets.earth.R) / 1000;
        var norms = [earthTau, earthR, earthSqrtGR];

        var traces2 = [];
        for (var m = 0; m < scaleData.length; m++) {
            var sd = scaleData[m];
            var normVals = [];
            for (var n = 0; n < sd.vals.length; n++) {
                normVals.push(sd.vals[n] / norms[n]);
            }
            traces2.push({
                type: 'bar',
                x: scaleNames, y: normVals,
                name: sd.name,
                marker: { color: sd.color }
            });
        }

        var layout2 = Object.assign({}, darkLayout, {
            xaxis: axStyle(null, ''),
            yaxis: axStyle([0, 15], 'Relative to Earth'),
            barmode: 'group',
            legend: { x: 0.5, y: 0.95, font: { size: 11 } },
            showlegend: true,
            title: { text: 'Scale factors (normalized to Earth)',
                     font: { size: 13, color: '#e0e0e0' } }
        });

        Plotly.react('nd-scalePlot', traces2, layout2, { responsive: true });
    }

    // ============================================================
    // Initialization
    // ============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }

        var el1 = document.getElementById('nd-dimPlot');
        var el2 = document.getElementById('nd-vxPlot');
        var el3 = document.getElementById('nd-scaleBarPlot');
        if (!el1 || !el2 || !el3) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Attach event handlers
        var ratioSlider = document.getElementById('nd-ratio-slider');
        if (ratioSlider) ratioSlider.addEventListener('input', updateCollapseExplorer);

        var V0slider = document.getElementById('nd-V0-slider');
        if (V0slider) V0slider.addEventListener('input', updateUniversalExplorer);

        var bodySelect = document.getElementById('nd-body-select2');
        if (bodySelect) bodySelect.addEventListener('change', updateScaleExplorer);

        var V0dimSlider = document.getElementById('nd-V0dim-slider');
        if (V0dimSlider) V0dimSlider.addEventListener('input', updateScaleExplorer);

        // Initial draws
        updateCollapseExplorer();
        updateUniversalExplorer();
        updateScaleExplorer();
    }

    // ============================================================
    // Global reset functions
    // ============================================================
    window.ndCollapseReset = function() {
        var s = document.getElementById('nd-ratio-slider');
        if (s) s.value = 0.80;
        updateCollapseExplorer();
    };

    window.ndUniversalReset = function() {
        var s = document.getElementById('nd-V0-slider');
        if (s) s.value = 1.00;
        updateUniversalExplorer();
    };

    window.ndScaleReset = function() {
        var sel = document.getElementById('nd-body-select2');
        var s = document.getElementById('nd-V0dim-slider');
        if (sel) sel.value = 'earth';
        if (s) s.value = 1.41;
        updateScaleExplorer();
    };

    // Auto-initialize
    initializePlots();
})();
