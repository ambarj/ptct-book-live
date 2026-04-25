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

    // ===== Physical constants =====
    var g0 = 9.8;         // m/s² at Earth surface
    var R0 = 6.37e6;      // m, Earth radius
    var vEsc = Math.sqrt(2 * g0 * R0);  // ~11,174 m/s

    // Planetary data: [g (m/s²), R (m)]
    var bodies = {
        earth:   { name: 'Earth',   g: 9.80,  R: 6.37e6,  color: '#00f3ff' },
        moon:    { name: 'Moon',    g: 1.62,  R: 1.74e6,  color: '#808080' },
        mars:    { name: 'Mars',    g: 3.72,  R: 3.39e6,  color: '#ff6b6b' },
        jupiter: { name: 'Jupiter', g: 24.79, R: 7.15e7,  color: '#ff00ff' }
    };

    // ============================================================
    // EXPLORER 1: How Gravity Weakens
    // ============================================================
    function updateGravExplorer() {
        var alt = parseFloat(document.getElementById('esc-alt-slider').value);
        document.getElementById('esc-alt-value').textContent = alt.toFixed(1);

        var xPos = 1 + alt; // distance from center in Earth radii
        var gTrue = g0 / (xPos * xPos);
        var frac = 100 / (xPos * xPos);

        document.getElementById('esc-dist').textContent = xPos.toFixed(2) + ' R';
        document.getElementById('esc-trueG').textContent = gTrue.toFixed(2) + ' m/s²';
        document.getElementById('esc-frac').textContent = frac.toFixed(1) + '%';

        // Left plot: g(x) vs x/R
        var nPts = 200;
        var xArr = [], gArr = [], gConstArr = [];
        for (var i = 0; i < nPts; i++) {
            var xi = 1 + i * 10 / (nPts - 1);  // 1 to 11 R
            xArr.push(xi);
            gArr.push(g0 / (xi * xi));
            gConstArr.push(g0);
        }

        var traces1 = [
            { x: xArr, y: gArr, mode: 'lines', name: 'g(x) = g₀R²/x²',
              line: { color: '#00f3ff', width: 2 } },
            { x: xArr, y: gConstArr, mode: 'lines', name: 'Constant g',
              line: { color: '#ff6b6b', width: 2, dash: 'dash' } },
            { x: [xPos], y: [gTrue], mode: 'markers', name: 'You',
              marker: { color: '#ff6b6b', size: 12, symbol: 'circle' },
              showlegend: false }
        ];

        var layout1 = Object.assign({}, darkLayout, {
            xaxis: axStyle([1, 11], 'x / R (from center)'),
            yaxis: axStyle([0, 11], 'g (m/s²)'),
            legend: { x: 0.5, y: 0.95, font: { size: 11 } },
            showlegend: true
        });

        Plotly.react('esc-gravPlot', traces1, layout1, { responsive: true });

        // Right plot: Gravitational potential well U(x) = -gR²/x (per unit mass, in MJ/kg)
        var xArr2 = [], uArr = [], uConstArr = [];
        for (var j = 0; j < nPts; j++) {
            var xj = 1 + j * 10 / (nPts - 1);
            xArr2.push(xj);
            // U = -g*R/x (in units of gR, but let's use MJ/kg)
            // U(x) = -gR²/(xR) = -gR/x per unit mass
            var uVal = -g0 * R0 / (xj) / 1e6;  // MJ/kg
            uArr.push(uVal);
            // Constant-g potential: U = g*(x - R) per unit mass (shifted so U(R)=0)
            // Actually let's show -gR (reference) as horizontal line at U(surface)
            uConstArr.push(-g0 * R0 / 1e6 + g0 * R0 * (xj - 1) / 1e6);
        }

        var uAtPos = -g0 * R0 / xPos / 1e6;

        var traces2 = [
            { x: xArr2, y: uArr, mode: 'lines', name: 'U = −gR²/x',
              line: { color: '#00ff9f', width: 2 }, fill: 'tozeroy',
              fillcolor: 'rgba(0,255,159,0.1)' },
            { x: [xPos], y: [uAtPos], mode: 'markers', name: 'You',
              marker: { color: '#ff6b6b', size: 12 }, showlegend: false }
        ];

        // Add zero reference line
        traces2.push({
            x: [1, 11], y: [0, 0], mode: 'lines', name: 'E = 0 (escape)',
            line: { color: '#ffff00', width: 1, dash: 'dash' },
            showlegend: true
        });

        var layout2 = Object.assign({}, darkLayout, {
            xaxis: axStyle([1, 11], 'x / R (from center)'),
            yaxis: axStyle([-70, 10], 'U/m (MJ/kg)'),
            legend: { x: 0.4, y: 0.95, font: { size: 11 } },
            showlegend: true
        });

        Plotly.react('esc-potPlot', traces2, layout2, { responsive: true });
    }

    // ============================================================
    // EXPLORER 2: Trajectory Classifier
    // ============================================================
    function updateTrajExplorer() {
        var v0_kms = parseFloat(document.getElementById('esc-v0-slider').value);
        document.getElementById('esc-v0-value').textContent = v0_kms.toFixed(1);

        var v0 = v0_kms * 1000;  // m/s
        var vEscKms = vEsc / 1000;
        var ratio = v0_kms / vEscKms;
        var Etotal = 0.5 * v0 * v0 - g0 * R0;  // per unit mass, J/kg

        // Classification
        var cls, clsColor;
        if (Math.abs(v0_kms - vEscKms) < 0.15) {
            cls = 'Critical'; clsColor = '#ffff00';
        } else if (v0 < vEsc) {
            cls = 'Bound'; clsColor = '#ff6b6b';
        } else {
            cls = 'Unbound'; clsColor = '#00ff9f';
        }

        // Max height for bound trajectory: v²=0 → x_max = R/(1 - v₀²/(2gR))
        var maxH;
        var v0sq_over_2gR = v0 * v0 / (2 * g0 * R0);
        if (v0sq_over_2gR >= 1) {
            maxH = '∞';
        } else {
            var xMax = R0 / (1 - v0sq_over_2gR);  // from center
            var altMax = (xMax - R0) / 1000;  // km above surface
            if (altMax > 1e6) {
                maxH = (altMax / 1e6).toFixed(1) + ' M km';
            } else {
                maxH = Math.round(altMax).toLocaleString() + ' km';
            }
        }

        document.getElementById('esc-vratio').textContent = ratio.toFixed(2);
        document.getElementById('esc-energy').textContent = (Etotal / 1e6).toFixed(1) + ' MJ/kg';
        document.getElementById('esc-class').textContent = cls;
        document.getElementById('esc-class').style.color = clsColor;
        document.getElementById('esc-maxH').textContent = maxH;

        // Left plot: v²(x) curve
        var nPts = 300;
        var xArr = [], v2Arr = [], v2EscArr = [];
        var xMax_plot = 20;  // in Earth radii
        for (var i = 0; i < nPts; i++) {
            var xi = 1 + i * (xMax_plot - 1) / (nPts - 1);
            xArr.push(xi);
            // v² = v₀² - 2gR(1 - R/x) = v₀² - 2gR + 2gR²/(xR) = v₀² - 2gR(1 - 1/xi)
            var v2 = v0 * v0 - 2 * g0 * R0 * (1 - 1 / xi);
            v2Arr.push(v2 / 1e6);  // (km/s)²

            // escape trajectory for reference
            var v2e = vEsc * vEsc - 2 * g0 * R0 * (1 - 1 / xi);
            v2EscArr.push(v2e / 1e6);
        }

        var traces1 = [
            { x: xArr, y: v2Arr, mode: 'lines', name: 'v₀ = ' + v0_kms.toFixed(1) + ' km/s',
              line: { color: clsColor, width: 3 } },
            { x: xArr, y: v2EscArr, mode: 'lines', name: 'v₀ = v_esc',
              line: { color: '#ffff00', width: 1, dash: 'dash' } },
            { x: [1, xMax_plot], y: [0, 0], mode: 'lines', name: 'v² = 0 (turnaround)',
              line: { color: '#808080', width: 1, dash: 'dot' }, showlegend: false }
        ];

        // Find and mark turning point for bound trajectories
        if (v0 < vEsc && v0sq_over_2gR < 1) {
            var xTurn = 1 / (1 - v0sq_over_2gR);  // in Earth radii
            if (xTurn <= xMax_plot) {
                traces1.push({
                    x: [xTurn], y: [0], mode: 'markers',
                    name: 'Turning point',
                    marker: { color: '#ff6b6b', size: 10, symbol: 'x' }
                });
            }
        }

        var yMin = Math.min(-50, v2Arr[v2Arr.length - 1] - 10);
        var yMax = Math.max(v0 * v0 / 1e6 + 20, 150);

        var layout1 = Object.assign({}, darkLayout, {
            xaxis: axStyle([1, xMax_plot], 'x / R (from center)'),
            yaxis: axStyle([yMin, yMax], 'v² (km/s)²'),
            legend: { x: 0.45, y: 0.95, font: { size: 11 } },
            showlegend: true
        });

        Plotly.react('esc-vxPlot', traces1, layout1, { responsive: true });

        // Right plot: Energy diagram (KE, PE, Total E)
        var xArr2 = [], keArr = [], peArr = [], eArr = [];
        for (var j = 0; j < nPts; j++) {
            var xj = 1 + j * (xMax_plot - 1) / (nPts - 1);
            xArr2.push(xj);
            // PE = -gR/x (per unit mass, in MJ/kg)
            var pe = -g0 * R0 / xj / 1e6;
            peArr.push(pe);
            // KE = E_total - PE
            var ke = Etotal / 1e6 - pe;
            if (ke < 0) ke = 0;  // can't have negative KE — trajectory ends
            keArr.push(ke);
            // Total E = constant
            eArr.push(Etotal / 1e6);
        }

        var traces2 = [
            { x: xArr2, y: keArr, mode: 'lines', name: 'KE/m',
              line: { color: '#00f3ff', width: 2 },
              fill: 'tozeroy', fillcolor: 'rgba(0,243,255,0.1)' },
            { x: xArr2, y: peArr, mode: 'lines', name: 'PE/m',
              line: { color: '#ff6b6b', width: 2 } },
            { x: xArr2, y: eArr, mode: 'lines', name: 'Total E/m',
              line: { color: '#ffff00', width: 2, dash: 'dash' } }
        ];

        var eMin = Math.min(peArr[0] - 5, -70);
        var eMax = Math.max(Etotal / 1e6 + 20, keArr[0] + 10);

        var layout2 = Object.assign({}, darkLayout, {
            xaxis: axStyle([1, xMax_plot], 'x / R (from center)'),
            yaxis: axStyle([eMin, eMax], 'Energy/m (MJ/kg)'),
            legend: { x: 0.5, y: 0.95, font: { size: 11 } },
            showlegend: true
        });

        Plotly.react('esc-energyPlot', traces2, layout2, { responsive: true });
    }

    // ============================================================
    // EXPLORER 3: Planetary Escape Calculator
    // ============================================================
    function getBodyParams() {
        var sel = document.getElementById('esc-body-select').value;
        if (sel === 'custom') {
            return {
                g: parseFloat(document.getElementById('esc-gCustom-slider').value),
                R: parseFloat(document.getElementById('esc-rCustom-slider').value) * 1e6
            };
        }
        return { g: bodies[sel].g, R: bodies[sel].R };
    }

    function updatePlanetExplorer() {
        var sel = document.getElementById('esc-body-select').value;
        var params = getBodyParams();
        var gSlider = document.getElementById('esc-gCustom-slider');
        var rSlider = document.getElementById('esc-rCustom-slider');

        // Update slider displays
        document.getElementById('esc-gCustom-value').textContent =
            parseFloat(gSlider.value).toFixed(1);
        document.getElementById('esc-rCustom-value').textContent =
            parseFloat(rSlider.value).toFixed(1);

        // Sync sliders to selected body (unless custom)
        if (sel !== 'custom') {
            gSlider.value = params.g;
            rSlider.value = (params.R / 1e6).toFixed(1);
            document.getElementById('esc-gCustom-value').textContent = params.g.toFixed(1);
            document.getElementById('esc-rCustom-value').textContent =
                (params.R / 1e6).toFixed(1);
        }

        var vescSel = Math.sqrt(2 * params.g * params.R);

        document.getElementById('esc-vesc').textContent =
            (vescSel / 1000).toFixed(1) + ' km/s';
        document.getElementById('esc-surfG').textContent =
            params.g.toFixed(2) + ' m/s²';
        document.getElementById('esc-radius').textContent =
            Math.round(params.R / 1000).toLocaleString() + ' km';

        // Left plot: bar chart of escape velocities
        var barNames = [], barVals = [], barColors = [];
        var bodyKeys = ['moon', 'mars', 'earth', 'jupiter'];
        for (var i = 0; i < bodyKeys.length; i++) {
            var b = bodies[bodyKeys[i]];
            barNames.push(b.name);
            barVals.push(Math.sqrt(2 * b.g * b.R) / 1000);
            barColors.push(b.color);
        }

        // Add custom/selected body highlight
        if (sel === 'custom') {
            barNames.push('Custom');
            barVals.push(vescSel / 1000);
            barColors.push('#ffff00');
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
            yaxis: axStyle([0, maxBar * 1.25], 'v_esc (km/s)'),
            showlegend: false
        });

        Plotly.react('esc-barPlot', traces1, layout1, { responsive: true });

        // Right plot: potential wells for each body
        var nPts = 200;
        var traces2 = [];

        for (var j = 0; j < bodyKeys.length; j++) {
            var bj = bodies[bodyKeys[j]];
            var xArr = [], uArr = [];
            // Normalize x-axis to body's own radius
            for (var m = 0; m < nPts; m++) {
                var xi = 1 + m * 9 / (nPts - 1);  // 1 to 10 R_body
                xArr.push(xi);
                // U/m = -g*R/xi (in MJ/kg)
                uArr.push(-bj.g * bj.R / xi / 1e6);
            }
            traces2.push({
                x: xArr, y: uArr, mode: 'lines', name: bj.name,
                line: { color: bj.color, width: 2 }
            });
        }

        if (sel === 'custom') {
            var xArrC = [], uArrC = [];
            for (var n = 0; n < nPts; n++) {
                var xn = 1 + n * 9 / (nPts - 1);
                xArrC.push(xn);
                uArrC.push(-params.g * params.R / xn / 1e6);
            }
            traces2.push({
                x: xArrC, y: uArrC, mode: 'lines', name: 'Custom',
                line: { color: '#ffff00', width: 2, dash: 'dash' }
            });
        }

        // Zero line
        traces2.push({
            x: [1, 10], y: [0, 0], mode: 'lines',
            line: { color: '#808080', width: 1, dash: 'dot' },
            showlegend: false
        });

        // Find deepest well for y-axis
        var deepest = 0;
        for (var p = 0; p < traces2.length - 1; p++) {
            if (traces2[p].y && traces2[p].y[0] < deepest) {
                deepest = traces2[p].y[0];
            }
        }

        var layout2 = Object.assign({}, darkLayout, {
            xaxis: axStyle([1, 10], 'x / R (body radii)'),
            yaxis: axStyle([deepest * 1.15, Math.abs(deepest) * 0.15], 'U/m (MJ/kg)'),
            legend: { x: 0.55, y: 0.95, font: { size: 11 } },
            showlegend: true
        });

        Plotly.react('esc-wellPlot', traces2, layout2, { responsive: true });
    }

    // ============================================================
    // Initialization
    // ============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }

        var el1 = document.getElementById('esc-gravPlot');
        var el2 = document.getElementById('esc-vxPlot');
        var el3 = document.getElementById('esc-barPlot');
        if (!el1 || !el2 || !el3) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Attach event handlers
        var altSlider = document.getElementById('esc-alt-slider');
        if (altSlider) {
            altSlider.addEventListener('input', updateGravExplorer);
        }

        var v0Slider = document.getElementById('esc-v0-slider');
        if (v0Slider) {
            v0Slider.addEventListener('input', updateTrajExplorer);
        }

        var bodySelect = document.getElementById('esc-body-select');
        if (bodySelect) {
            bodySelect.addEventListener('change', function() {
                updatePlanetExplorer();
            });
        }

        var gSlider = document.getElementById('esc-gCustom-slider');
        if (gSlider) {
            gSlider.addEventListener('input', function() {
                // Switch to custom when user adjusts sliders
                document.getElementById('esc-body-select').value = 'custom';
                updatePlanetExplorer();
            });
        }

        var rSlider = document.getElementById('esc-rCustom-slider');
        if (rSlider) {
            rSlider.addEventListener('input', function() {
                document.getElementById('esc-body-select').value = 'custom';
                updatePlanetExplorer();
            });
        }

        // Initial draws
        updateGravExplorer();
        updateTrajExplorer();
        updatePlanetExplorer();
    }

    // ============================================================
    // Global reset functions (called from HTML onclick)
    // ============================================================
    window.escGravReset = function() {
        var s = document.getElementById('esc-alt-slider');
        if (s) { s.value = 0; }
        updateGravExplorer();
    };

    window.escTrajReset = function() {
        var s = document.getElementById('esc-v0-slider');
        if (s) { s.value = 8.0; }
        updateTrajExplorer();
    };

    window.escPlanetReset = function() {
        var sel = document.getElementById('esc-body-select');
        var gs = document.getElementById('esc-gCustom-slider');
        var rs = document.getElementById('esc-rCustom-slider');
        if (sel) sel.value = 'earth';
        if (gs) gs.value = 9.8;
        if (rs) rs.value = 6.37;
        updatePlanetExplorer();
    };

    // Auto-initialize
    initializePlots();
})();
