(function() {
    'use strict';

    // ============================================================
    // Scalar Field Functions
    // ============================================================

    const scalarFields = {
        paraboloid: (x, y) => x*x + y*y,
        saddle: (x, y) => x*x - y*y,
        gaussian: (x, y) => Math.exp(-(x*x + y*y)),
        cone: (x, y) => Math.sqrt(x*x + y*y),
        ripple: (x, y) => Math.sin(Math.sqrt(x*x + y*y + 0.01))
    };

    const gradientFunctions = {
        paraboloid: (x, y) => [2*x, 2*y],
        saddle: (x, y) => [2*x, -2*y],
        tilted: (x, y) => [2, 1],
        wave: (x, y) => [Math.cos(x), -Math.sin(y)]
    };

    const gradientScalarFields = {
        paraboloid: (x, y) => x*x + y*y,
        saddle: (x, y) => x*x - y*y,
        tilted: (x, y) => 2*x + y,
        wave: (x, y) => Math.sin(x) + Math.cos(y)
    };

    // ============================================================
    // Explorer 1: Scalar Field Visualizer (3D + 2D)
    // ============================================================

    function initializeScalarViz() {
        const funcSelect = document.getElementById('contours-function-select');
        const levelsSlider = document.getElementById('contours-levels-slider');

        if (!funcSelect || !levelsSlider) return;

        funcSelect.addEventListener('change', updateScalarViz);
        levelsSlider.addEventListener('input', function() {
            document.getElementById('contours-levels-value').textContent = this.value;
            updateScalarViz();
        });

        updateScalarViz();
    }

    function updateScalarViz() {
        const funcType = document.getElementById('contours-function-select').value;
        const numLevels = parseInt(document.getElementById('contours-levels-slider').value);
        const field = scalarFields[funcType];

        // Generate grid data
        const n = 50;
        const range = 3;
        const x = [], y = [], z = [];

        for (let i = 0; i < n; i++) {
            const xi = -range + (2 * range * i / (n - 1));
            x.push(xi);
            y.push(xi);
        }

        let zMin = Infinity, zMax = -Infinity;
        for (let j = 0; j < n; j++) {
            const row = [];
            for (let i = 0; i < n; i++) {
                const val = field(x[i], y[j]);
                row.push(val);
                if (val < zMin) zMin = val;
                if (val > zMax) zMax = val;
            }
            z.push(row);
        }

        // Calculate contour step size
        const contourSize = (zMax - zMin) / numLevels;

        // 3D Surface Plot
        const surface = {
            type: 'surface',
            x: x,
            y: y,
            z: z,
            colorscale: 'Viridis',
            showscale: false
        };

        const layout3d = {
            template: 'plotly_dark',
            paper_bgcolor: '#0a0e27',
            margin: { l: 0, r: 0, t: 30, b: 0 },
            title: { text: '3D Surface', font: { size: 14, color: '#ffffff' } },
            scene: {
                bgcolor: '#151934',
                xaxis: { title: 'x', gridcolor: '#2a2f4a', color: '#ffffff' },
                yaxis: { title: 'y', gridcolor: '#2a2f4a', color: '#ffffff' },
                zaxis: { title: 'f(x,y)', gridcolor: '#2a2f4a', color: '#ffffff' },
                camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } }
            }
        };

        Plotly.react('contours-3d-plot', [surface], layout3d, { responsive: true });

        // 2D Contour Plot - use bright colorscale for dark theme
        const contour = {
            type: 'contour',
            x: x,
            y: y,
            z: z,
            colorscale: [
                [0, '#00f3ff'],
                [0.25, '#00ff9f'],
                [0.5, '#ffff00'],
                [0.75, '#ff00ff'],
                [1, '#ff6b6b']
            ],
            contours: {
                coloring: 'lines',
                showlabels: true,
                labelfont: { size: 10, color: 'white' },
                start: zMin,
                end: zMax,
                size: contourSize
            },
            line: { width: 2 },
            showscale: false
        };

        const layout2d = {
            template: 'plotly_dark',
            paper_bgcolor: '#0a0e27',
            plot_bgcolor: '#151934',
            margin: { l: 50, r: 20, t: 30, b: 50 },
            title: { text: '2D Contour Plot', font: { size: 14, color: '#ffffff' } },
            xaxis: {
                title: 'x',
                range: [-range, range],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080',
                scaleanchor: 'y'
            },
            yaxis: {
                title: 'y',
                range: [-range, range],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080'
            }
        };

        Plotly.react('contours-2d-plot', [contour], layout2d, { responsive: true });
    }

    window.resetScalarViz = function() {
        document.getElementById('contours-function-select').value = 'paraboloid';
        document.getElementById('contours-levels-slider').value = 10;
        document.getElementById('contours-levels-value').textContent = '10';
        updateScalarViz();
    };

    // ============================================================
    // Explorer 2: Equipotential Explorer
    // ============================================================

    function initializeEquipotential() {
        const chargeSelect = document.getElementById('contours-charge-select');
        const showField = document.getElementById('contours-show-field');
        const sepSlider = document.getElementById('contours-separation-slider');

        if (!chargeSelect) return;

        chargeSelect.addEventListener('change', updateEquipotential);
        if (showField) showField.addEventListener('change', updateEquipotential);
        if (sepSlider) {
            sepSlider.addEventListener('input', function() {
                document.getElementById('contours-separation-value').textContent = this.value;
                updateEquipotential();
            });
        }

        updateEquipotential();
    }

    function computePotential(x, y, config, separation) {
        const d = separation / 2;

        switch (config) {
            case 'single-positive': {
                const r = Math.sqrt(x*x + y*y);
                return r < 0.1 ? 10 : 1 / r;
            }
            case 'single-negative': {
                const r = Math.sqrt(x*x + y*y);
                return r < 0.1 ? -10 : -1 / r;
            }
            case 'dipole': {
                const r1 = Math.sqrt((x - d)**2 + y**2);
                const r2 = Math.sqrt((x + d)**2 + y**2);
                const v1 = r1 < 0.15 ? 10 : 1 / r1;
                const v2 = r2 < 0.15 ? -10 : -1 / r2;
                return v1 + v2;
            }
            case 'two-positive': {
                const r1 = Math.sqrt((x - d)**2 + y**2);
                const r2 = Math.sqrt((x + d)**2 + y**2);
                const v1 = r1 < 0.15 ? 10 : 1 / r1;
                const v2 = r2 < 0.15 ? 10 : 1 / r2;
                return v1 + v2;
            }
            case 'quadrupole': {
                const r1 = Math.sqrt((x - d)**2 + (y - d)**2);
                const r2 = Math.sqrt((x + d)**2 + (y - d)**2);
                const r3 = Math.sqrt((x - d)**2 + (y + d)**2);
                const r4 = Math.sqrt((x + d)**2 + (y + d)**2);
                let v = 0;
                v += r1 < 0.15 ? 10 : 1 / r1;
                v += r2 < 0.15 ? -10 : -1 / r2;
                v += r3 < 0.15 ? -10 : -1 / r3;
                v += r4 < 0.15 ? 10 : 1 / r4;
                return v;
            }
            default:
                return 0;
        }
    }

    function computeField(x, y, config, separation) {
        const d = separation / 2;
        let Ex = 0, Ey = 0;

        const addCharge = (cx, cy, sign) => {
            const dx = x - cx;
            const dy = y - cy;
            const r2 = dx*dx + dy*dy;
            if (r2 < 0.04) return;
            const r3 = Math.pow(r2, 1.5);
            Ex += sign * dx / r3;
            Ey += sign * dy / r3;
        };

        switch (config) {
            case 'single-positive':
                addCharge(0, 0, 1);
                break;
            case 'single-negative':
                addCharge(0, 0, -1);
                break;
            case 'dipole':
                addCharge(d, 0, 1);
                addCharge(-d, 0, -1);
                break;
            case 'two-positive':
                addCharge(d, 0, 1);
                addCharge(-d, 0, 1);
                break;
            case 'quadrupole':
                addCharge(d, d, 1);
                addCharge(-d, d, -1);
                addCharge(d, -d, -1);
                addCharge(-d, -d, 1);
                break;
        }

        return [Ex, Ey];
    }

    function traceFieldLine(x0, y0, config, separation, forward = true) {
        const dt = 0.03;
        const steps = 300;
        const pathX = [x0], pathY = [y0];
        let x = x0, y = y0;
        const sign = forward ? 1 : -1;

        for (let i = 0; i < steps; i++) {
            const [Ex, Ey] = computeField(x, y, config, separation);
            const mag = Math.sqrt(Ex*Ex + Ey*Ey);

            if (mag < 0.01 || mag > 100) break;

            x += sign * dt * Ex / mag;
            y += sign * dt * Ey / mag;

            if (Math.abs(x) > 4 || Math.abs(y) > 4) break;

            pathX.push(x);
            pathY.push(y);
        }

        return { x: pathX, y: pathY };
    }

    function updateEquipotential() {
        const config = document.getElementById('contours-charge-select').value;
        const showField = document.getElementById('contours-show-field').checked;
        const separation = parseFloat(document.getElementById('contours-separation-slider').value);

        // Generate potential grid
        const n = 100;
        const range = 4;
        const x = [], y = [], z = [];

        for (let i = 0; i < n; i++) {
            x.push(-range + (2 * range * i / (n - 1)));
            y.push(-range + (2 * range * i / (n - 1)));
        }

        for (let j = 0; j < n; j++) {
            const row = [];
            for (let i = 0; i < n; i++) {
                let v = computePotential(x[i], y[j], config, separation);
                v = Math.max(-5, Math.min(5, v));
                row.push(v);
            }
            z.push(row);
        }

        const traces = [];

        // Contour plot - equipotentials
        traces.push({
            type: 'contour',
            x: x,
            y: y,
            z: z,
            colorscale: [
                [0, '#ff6b6b'],
                [0.5, '#ffffff'],
                [1, '#00f3ff']
            ],
            contours: {
                start: -4,
                end: 4,
                size: 0.2,
                coloring: 'lines'
            },
            line: { width: 2 },
            showscale: false
        });

        // Field lines - use boundary seeding for all configurations
        // Let the field naturally guide the lines
        if (showField) {
            const bound = range;  // Use full plot area
            const numSeeds = 24;
            let startPoints = [];

            // Seed from all four edges of the plot boundary
            for (let i = 0; i < numSeeds; i++) {
                const t = -bound + (2 * bound * i / (numSeeds - 1));
                startPoints.push([t, bound]);    // top edge
                startPoints.push([t, -bound]);   // bottom edge
                startPoints.push([bound, t]);    // right edge
                startPoints.push([-bound, t]);   // left edge
            }

            // Trace both directions from each seed point
            startPoints.forEach(([sx, sy]) => {
                [true, false].forEach(forward => {
                    const path = traceFieldLine(sx, sy, config, separation, forward);
                    if (path.x.length > 5) {
                        traces.push({
                            type: 'scatter',
                            x: path.x,
                            y: path.y,
                            mode: 'lines',
                            line: { color: '#ffff00', width: 1.5 },
                            showlegend: false,
                            hoverinfo: 'skip'
                        });
                    }
                });
            });
        }

        // Charge markers
        const chargeX = [], chargeY = [], chargeColors = [], chargeText = [];
        const d = separation / 2;

        switch (config) {
            case 'single-positive':
                chargeX.push(0); chargeY.push(0);
                chargeColors.push('#ff4444'); chargeText.push('+');
                break;
            case 'single-negative':
                chargeX.push(0); chargeY.push(0);
                chargeColors.push('#4444ff'); chargeText.push('−');
                break;
            case 'dipole':
                chargeX.push(d, -d); chargeY.push(0, 0);
                chargeColors.push('#ff4444', '#4444ff');
                chargeText.push('+', '−');
                break;
            case 'two-positive':
                chargeX.push(d, -d); chargeY.push(0, 0);
                chargeColors.push('#ff4444', '#ff4444');
                chargeText.push('+', '+');
                break;
            case 'quadrupole':
                chargeX.push(d, -d, d, -d);
                chargeY.push(d, d, -d, -d);
                chargeColors.push('#ff4444', '#4444ff', '#4444ff', '#ff4444');
                chargeText.push('+', '−', '−', '+');
                break;
        }

        traces.push({
            type: 'scatter',
            x: chargeX,
            y: chargeY,
            mode: 'markers+text',
            marker: { size: 20, color: chargeColors },
            text: chargeText,
            textposition: 'middle center',
            textfont: { size: 16, color: 'white' },
            showlegend: false
        });

        const layout = {
            template: 'plotly_dark',
            paper_bgcolor: '#0a0e27',
            plot_bgcolor: '#151934',
            xaxis: {
                range: [-range, range],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080',
                scaleanchor: 'y',
                constrain: 'domain'
            },
            yaxis: {
                range: [-range, range],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080',
                constrain: 'domain'
            },
            margin: { l: 50, r: 20, t: 20, b: 50 }
        };

        Plotly.react('contours-equipotential-plot', traces, layout, { responsive: true });
    }

    window.resetEquipotential = function() {
        document.getElementById('contours-charge-select').value = 'single-positive';
        document.getElementById('contours-show-field').checked = true;
        document.getElementById('contours-separation-slider').value = 2;
        document.getElementById('contours-separation-value').textContent = '2.0';
        updateEquipotential();
    };

    // ============================================================
    // Explorer 3: Gradient Visualizer
    // ============================================================

    let clickedGradient = null;

    function initializeGradientViz() {
        const funcSelect = document.getElementById('contours-gradient-function');
        const showGrid = document.getElementById('contours-show-grid');

        if (!funcSelect) return;

        funcSelect.addEventListener('change', updateGradientViz);
        if (showGrid) showGrid.addEventListener('change', updateGradientViz);

        updateGradientViz();

        // Add click handler
        setTimeout(function() {
            const plotDiv = document.getElementById('contours-gradient-plot');
            if (plotDiv && plotDiv.on) {
                plotDiv.on('plotly_click', function(data) {
                    if (data.points && data.points[0]) {
                        const x = data.points[0].x;
                        const y = data.points[0].y;
                        showGradientAt(x, y);
                    }
                });
            }
        }, 200);
    }

    function updateGradientViz() {
        const funcType = document.getElementById('contours-gradient-function').value;
        const showGrid = document.getElementById('contours-show-grid').checked;
        const field = gradientScalarFields[funcType];
        const gradFunc = gradientFunctions[funcType];

        // Generate contour data
        const n = 80;
        const range = 3;
        const x = [], y = [], z = [];

        for (let i = 0; i < n; i++) {
            x.push(-range + (2 * range * i / (n - 1)));
            y.push(-range + (2 * range * i / (n - 1)));
        }

        for (let j = 0; j < n; j++) {
            const row = [];
            for (let i = 0; i < n; i++) {
                row.push(field(x[i], y[j]));
            }
            z.push(row);
        }

        const traces = [];

        // Contour - use bright colorscale for dark theme
        traces.push({
            type: 'contour',
            x: x,
            y: y,
            z: z,
            colorscale: [
                [0, '#00f3ff'],
                [0.25, '#00ff9f'],
                [0.5, '#ffff00'],
                [0.75, '#ff00ff'],
                [1, '#ff6b6b']
            ],
            contours: {
                coloring: 'lines',
                showlabels: true,
                labelfont: { size: 9, color: 'white' }
            },
            line: { width: 2 },
            ncontours: 15,
            showscale: false
        });

        // Gradient grid
        if (showGrid) {
            const step = 0.6;
            for (let gx = -range + 0.3; gx <= range - 0.3; gx += step) {
                for (let gy = -range + 0.3; gy <= range - 0.3; gy += step) {
                    const [gfx, gfy] = gradFunc(gx, gy);
                    const mag = Math.sqrt(gfx*gfx + gfy*gfy);

                    if (mag < 0.01) continue;

                    const scale = 0.25;
                    const dx = scale * gfx / mag;
                    const dy = scale * gfy / mag;

                    // Arrow shaft
                    traces.push({
                        type: 'scatter',
                        x: [gx, gx + dx * 0.7],
                        y: [gy, gy + dy * 0.7],
                        mode: 'lines',
                        line: { color: '#ff00ff', width: 1.5 },
                        showlegend: false,
                        hoverinfo: 'skip'
                    });

                    // Arrow head
                    traces.push({
                        type: 'scatter',
                        x: [gx + dx],
                        y: [gy + dy],
                        mode: 'markers',
                        marker: {
                            symbol: 'triangle-up',
                            size: 6,
                            color: '#ff00ff',
                            angle: Math.atan2(gfy, gfx) * 180 / Math.PI - 90
                        },
                        showlegend: false,
                        hoverinfo: 'skip'
                    });
                }
            }
        }

        // Add clicked gradient if exists
        if (clickedGradient) {
            traces.push(clickedGradient.shaft);
            traces.push(clickedGradient.head);
            traces.push(clickedGradient.point);
        }

        const layout = {
            template: 'plotly_dark',
            paper_bgcolor: '#0a0e27',
            plot_bgcolor: '#151934',
            xaxis: {
                range: [-range, range],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080',
                scaleanchor: 'y'
            },
            yaxis: {
                range: [-range, range],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080'
            },
            margin: { l: 50, r: 20, t: 20, b: 50 }
        };

        Plotly.react('contours-gradient-plot', traces, layout, { responsive: true });
    }

    function showGradientAt(x, y) {
        const funcType = document.getElementById('contours-gradient-function').value;
        const gradFunc = gradientFunctions[funcType];
        const field = gradientScalarFields[funcType];

        const [gfx, gfy] = gradFunc(x, y);
        const mag = Math.sqrt(gfx*gfx + gfy*gfy);
        const fVal = field(x, y);

        // Update info
        const info = document.getElementById('contours-gradient-info');
        info.innerHTML = `Point: (${x.toFixed(2)}, ${y.toFixed(2)}) | f = ${fVal.toFixed(2)} | ∇f = (${gfx.toFixed(2)}, ${gfy.toFixed(2)}) | |∇f| = ${mag.toFixed(2)}`;

        if (mag < 0.01) {
            clickedGradient = null;
            updateGradientViz();
            return;
        }

        const scale = 0.5;
        const dx = scale * gfx / mag;
        const dy = scale * gfy / mag;

        clickedGradient = {
            shaft: {
                type: 'scatter',
                x: [x, x + dx * 0.8],
                y: [y, y + dy * 0.8],
                mode: 'lines',
                line: { color: '#00f3ff', width: 3 },
                showlegend: false,
                hoverinfo: 'skip'
            },
            head: {
                type: 'scatter',
                x: [x + dx],
                y: [y + dy],
                mode: 'markers',
                marker: {
                    symbol: 'triangle-up',
                    size: 12,
                    color: '#00f3ff',
                    angle: Math.atan2(gfy, gfx) * 180 / Math.PI - 90
                },
                showlegend: false,
                hoverinfo: 'skip'
            },
            point: {
                type: 'scatter',
                x: [x],
                y: [y],
                mode: 'markers',
                marker: { size: 8, color: '#ffff00' },
                showlegend: false,
                hoverinfo: 'skip'
            }
        };

        updateGradientViz();
    }

    window.resetGradientViz = function() {
        document.getElementById('contours-gradient-function').value = 'paraboloid';
        document.getElementById('contours-show-grid').checked = false;
        clickedGradient = null;
        document.getElementById('contours-gradient-info').innerHTML = 'Click on the plot to see gradient at that point';
        updateGradientViz();
    };

    window.clearGradientArrow = function() {
        clickedGradient = null;
        document.getElementById('contours-gradient-info').innerHTML = 'Click on the plot to see gradient at that point';
        updateGradientViz();
    };

    // ============================================================
    // Initialization
    // ============================================================

    function initializePlots() {
        if (typeof Plotly === 'undefined') {
            setTimeout(initializePlots, 100);
            return;
        }

        const scalarSelect = document.getElementById('contours-function-select');
        if (!scalarSelect) {
            setTimeout(initializePlots, 100);
            return;
        }

        initializeScalarViz();
        initializeEquipotential();
        initializeGradientViz();
    }

    initializePlots();
})();
