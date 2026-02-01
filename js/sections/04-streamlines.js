// Section 1.4: Streamlines and Flow Visualization - Interactive Components

(function() {
    'use strict';

    // ============================================================
    // Utility: Streamline Tracing
    // ============================================================

    function traceStreamline(x0, y0, fieldFunc, dt, steps, bounds) {
        const pathX = [x0], pathY = [y0];
        let x = x0, y = y0;

        for (let i = 0; i < steps; i++) {
            const [fx, fy] = fieldFunc(x, y);
            const mag = Math.sqrt(fx * fx + fy * fy);

            if (mag < 0.01) break;

            x += dt * fx / mag;
            y += dt * fy / mag;

            if (Math.abs(x) > bounds || Math.abs(y) > bounds) break;

            pathX.push(x);
            pathY.push(y);
        }

        return { x: pathX, y: pathY };
    }

    // ============================================================
    // Field Definitions
    // ============================================================

    const flowFields = {
        uniform: (x, y) => [1, 0],
        source: (x, y) => {
            const r = Math.sqrt(x * x + y * y) || 0.01;
            return [x / r, y / r];
        },
        sink: (x, y) => {
            const r = Math.sqrt(x * x + y * y) || 0.01;
            return [-x / r, -y / r];
        },
        vortex: (x, y) => {
            const r = Math.sqrt(x * x + y * y) || 0.01;
            return [-y / r, x / r];
        },
        saddle: (x, y) => [x, -y],
        'spiral-in': (x, y) => {
            const r = Math.sqrt(x * x + y * y) || 0.01;
            return [-0.5 * x / r - y / r, -0.5 * y / r + x / r];
        },
        'spiral-out': (x, y) => {
            const r = Math.sqrt(x * x + y * y) || 0.01;
            return [0.5 * x / r - y / r, 0.5 * y / r + x / r];
        }
    };

    // ============================================================
    // Explorer 1: Streamline Visualizer
    // ============================================================

    function plotStreamlines() {
        const flowSelect = document.getElementById('streamlines-flow-select');
        const countSlider = document.getElementById('streamlines-count-slider');
        const showArrows = document.getElementById('streamlines-show-arrows');

        if (!flowSelect || !countSlider) return;

        const flowType = flowSelect.value;
        const numLines = parseInt(countSlider.value);
        const fieldFunc = flowFields[flowType];

        if (!fieldFunc) return;

        const traces = [];
        const colors = ['#00f3ff', '#ff00ff', '#ffff00', '#00ff9f', '#4ecdc4', '#a855f7'];

        // Generate starting points based on flow type
        let startPoints = [];

        if (flowType === 'uniform') {
            // Horizontal lines for uniform flow
            for (let i = 0; i < numLines; i++) {
                const y = -3 + (6 * i) / (numLines - 1);
                startPoints.push({ x: -3.5, y: y });
            }
        } else if (flowType === 'saddle') {
            // Grid approach for saddle
            for (let i = 0; i < numLines / 2; i++) {
                const t = -3 + (6 * i) / (numLines / 2 - 1);
                startPoints.push({ x: t, y: 3 });
                startPoints.push({ x: t, y: -3 });
            }
        } else {
            // Circular starting points for radial/rotational flows
            for (let i = 0; i < numLines; i++) {
                const angle = (2 * Math.PI * i) / numLines;
                const radius = (flowType === 'source' || flowType === 'spiral-out') ? 0.3 : 3;
                startPoints.push({
                    x: radius * Math.cos(angle),
                    y: radius * Math.sin(angle)
                });
            }
        }

        // Trace streamlines
        startPoints.forEach((start, idx) => {
            const path = traceStreamline(start.x, start.y, fieldFunc, 0.03, 600, 4);
            const color = colors[idx % colors.length];

            traces.push({
                x: path.x,
                y: path.y,
                mode: 'lines',
                line: { color: color, width: 2 },
                showlegend: false,
                hoverinfo: 'skip'
            });

            // Add direction arrows along streamline
            if (showArrows && showArrows.checked && path.x.length > 10) {
                const arrowIndices = [Math.floor(path.x.length / 3), Math.floor(2 * path.x.length / 3)];
                arrowIndices.forEach(i => {
                    if (i < path.x.length - 1) {
                        const dx = path.x[i + 1] - path.x[i];
                        const dy = path.y[i + 1] - path.y[i];
                        traces.push({
                            x: [path.x[i]],
                            y: [path.y[i]],
                            mode: 'markers',
                            marker: {
                                symbol: 'triangle-up',
                                size: 8,
                                color: color,
                                angle: Math.atan2(dy, dx) * 180 / Math.PI - 90
                            },
                            showlegend: false,
                            hoverinfo: 'skip'
                        });
                    }
                });
            }
        });

        // Mark origin for non-uniform flows
        if (flowType !== 'uniform') {
            traces.push({
                x: [0],
                y: [0],
                mode: 'markers',
                marker: { size: 10, color: 'white', symbol: 'x' },
                showlegend: false,
                hoverinfo: 'skip'
            });
        }

        const layout = {
            title: {
                text: getFlowTitle(flowType),
                font: { color: '#00f3ff', size: 16 }
            },
            xaxis: {
                range: [-4, 4],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080',
                linecolor: '#808080',
                dtick: 1
            },
            yaxis: {
                range: [-4, 4],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080',
                linecolor: '#808080',
                scaleanchor: 'x',
                dtick: 1
            },
            showlegend: false,
            margin: { t: 50, r: 30, b: 50, l: 50 }
        };

        if (typeof createPlot === 'function') {
            createPlot('streamlines-main-plot', traces, layout);
        }
    }

    function getFlowTitle(flowType) {
        const titles = {
            uniform: 'Uniform Flow',
            source: 'Source (Radial Outward)',
            sink: 'Sink (Radial Inward)',
            vortex: 'Vortex (Center)',
            saddle: 'Saddle Point',
            'spiral-in': 'Stable Spiral',
            'spiral-out': 'Unstable Spiral'
        };
        return titles[flowType] || 'Flow Pattern';
    }

    window.resetStreamlineViz = function() {
        const flowSelect = document.getElementById('streamlines-flow-select');
        const countSlider = document.getElementById('streamlines-count-slider');
        const showArrows = document.getElementById('streamlines-show-arrows');

        if (flowSelect) flowSelect.value = 'uniform';
        if (countSlider) countSlider.value = 12;
        if (showArrows) showArrows.checked = true;

        const countValue = document.getElementById('streamlines-count-value');
        if (countValue) countValue.textContent = '12';

        plotStreamlines();
    };

    // ============================================================
    // Explorer 2: Fixed Point Classifier
    // ============================================================

    function plotFixedPoint() {
        const radialSlider = document.getElementById('streamlines-radial-slider');
        const rotationSlider = document.getElementById('streamlines-rotation-slider');

        if (!radialSlider || !rotationSlider) return;

        const radial = parseFloat(radialSlider.value);
        const rotation = parseFloat(rotationSlider.value);

        // Create field function
        function field(x, y) {
            const fx = radial * x - rotation * y;
            const fy = radial * y + rotation * x;
            return [fx, fy];
        }

        // Classify fixed point
        const classification = classifyFixedPoint(radial, rotation);
        const classDiv = document.getElementById('streamlines-classification');
        if (classDiv) {
            classDiv.textContent = 'Classification: ' + classification;
        }

        // Trace streamlines
        const traces = [];
        const colors = ['#00f3ff', '#ff00ff', '#ffff00', '#00ff9f', '#4ecdc4', '#a855f7', '#ff6b6b', '#45b7d1'];

        for (let i = 0; i < 8; i++) {
            const angle = (2 * Math.PI * i) / 8;
            const radius = 3;
            const x0 = radius * Math.cos(angle);
            const y0 = radius * Math.sin(angle);

            const path = traceStreamline(x0, y0, field, 0.02, 800, 4);

            traces.push({
                x: path.x,
                y: path.y,
                mode: 'lines',
                line: { color: colors[i], width: 2 },
                showlegend: false,
                hoverinfo: 'skip'
            });

            // Direction arrow
            if (path.x.length > 5) {
                const midIdx = Math.floor(path.x.length / 2);
                const dx = path.x[midIdx + 1] - path.x[midIdx];
                const dy = path.y[midIdx + 1] - path.y[midIdx];
                traces.push({
                    x: [path.x[midIdx]],
                    y: [path.y[midIdx]],
                    mode: 'markers',
                    marker: {
                        symbol: 'triangle-up',
                        size: 8,
                        color: colors[i],
                        angle: Math.atan2(dy, dx) * 180 / Math.PI - 90
                    },
                    showlegend: false,
                    hoverinfo: 'skip'
                });
            }
        }

        // Mark fixed point
        traces.push({
            x: [0],
            y: [0],
            mode: 'markers',
            marker: { size: 12, color: 'white', symbol: 'circle' },
            showlegend: false,
            name: 'Fixed Point'
        });

        const layout = {
            title: {
                text: classification,
                font: { color: '#00f3ff', size: 16 }
            },
            xaxis: {
                range: [-4, 4],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080',
                linecolor: '#808080',
                dtick: 1
            },
            yaxis: {
                range: [-4, 4],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080',
                linecolor: '#808080',
                scaleanchor: 'x',
                dtick: 1
            },
            showlegend: false,
            margin: { t: 50, r: 30, b: 50, l: 50 }
        };

        if (typeof createPlot === 'function') {
            createPlot('streamlines-fixedpoint-plot', traces, layout);
        }
    }

    function classifyFixedPoint(radial, rotation) {
        const eps = 0.05;

        if (Math.abs(rotation) < eps) {
            if (radial < -eps) return 'Stable Node';
            if (radial > eps) return 'Unstable Node';
            return 'Degenerate (Zero Field)';
        } else {
            if (Math.abs(radial) < eps) return 'Center';
            if (radial < 0) return 'Stable Spiral';
            return 'Unstable Spiral';
        }
    }

    window.presetCenter = function() {
        const radialSlider = document.getElementById('streamlines-radial-slider');
        const rotationSlider = document.getElementById('streamlines-rotation-slider');
        if (radialSlider) radialSlider.value = 0;
        if (rotationSlider) rotationSlider.value = 1;
        updateFixedPointValues();
        plotFixedPoint();
    };

    window.presetStableSpiral = function() {
        const radialSlider = document.getElementById('streamlines-radial-slider');
        const rotationSlider = document.getElementById('streamlines-rotation-slider');
        if (radialSlider) radialSlider.value = -0.5;
        if (rotationSlider) rotationSlider.value = 1;
        updateFixedPointValues();
        plotFixedPoint();
    };

    window.presetUnstableNode = function() {
        const radialSlider = document.getElementById('streamlines-radial-slider');
        const rotationSlider = document.getElementById('streamlines-rotation-slider');
        if (radialSlider) radialSlider.value = 1;
        if (rotationSlider) rotationSlider.value = 0;
        updateFixedPointValues();
        plotFixedPoint();
    };

    function updateFixedPointValues() {
        const radialSlider = document.getElementById('streamlines-radial-slider');
        const rotationSlider = document.getElementById('streamlines-rotation-slider');
        const radialValue = document.getElementById('streamlines-radial-value');
        const rotationValue = document.getElementById('streamlines-rotation-value');

        if (radialSlider && radialValue) {
            radialValue.textContent = parseFloat(radialSlider.value).toFixed(1);
        }
        if (rotationSlider && rotationValue) {
            rotationValue.textContent = parseFloat(rotationSlider.value).toFixed(1);
        }
    }

    // ============================================================
    // Explorer 3: Flow Pattern Builder
    // ============================================================

    function plotCombinedFlow() {
        const configSelect = document.getElementById('streamlines-config-select');
        const separationSlider = document.getElementById('streamlines-separation-slider');
        const showStagnation = document.getElementById('streamlines-show-stagnation');

        if (!configSelect || !separationSlider) return;

        const config = configSelect.value;
        const separation = parseFloat(separationSlider.value);

        // Define combined field based on configuration
        function combinedField(x, y) {
            const d = separation / 2;

            if (config === 'dipole') {
                // Source at (-d, 0), Sink at (+d, 0)
                const r1 = Math.sqrt((x + d) ** 2 + y ** 2) || 0.01;
                const r2 = Math.sqrt((x - d) ** 2 + y ** 2) || 0.01;
                const fx = (x + d) / r1 - (x - d) / r2;
                const fy = y / r1 - y / r2;
                return [fx, fy];
            } else if (config === 'two-sources') {
                const r1 = Math.sqrt((x + d) ** 2 + y ** 2) || 0.01;
                const r2 = Math.sqrt((x - d) ** 2 + y ** 2) || 0.01;
                return [(x + d) / r1 + (x - d) / r2, y / r1 + y / r2];
            } else if (config === 'two-sinks') {
                const r1 = Math.sqrt((x + d) ** 2 + y ** 2) || 0.01;
                const r2 = Math.sqrt((x - d) ** 2 + y ** 2) || 0.01;
                return [-(x + d) / r1 - (x - d) / r2, -y / r1 - y / r2];
            } else if (config === 'quadrupole') {
                // +/- at corners
                const pts = [
                    { x: -d, y: -d, s: 1 },
                    { x: d, y: -d, s: -1 },
                    { x: d, y: d, s: 1 },
                    { x: -d, y: d, s: -1 }
                ];
                let fx = 0, fy = 0;
                pts.forEach(p => {
                    const r = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2) || 0.01;
                    fx += p.s * (x - p.x) / r;
                    fy += p.s * (y - p.y) / r;
                });
                return [fx, fy];
            } else if (config === 'source-vortex') {
                const r = Math.sqrt(x ** 2 + y ** 2) || 0.01;
                return [x / r - y / r, y / r + x / r];
            }

            return [0, 0];
        }

        // Trace streamlines from boundary
        const traces = [];
        const colors = ['#00f3ff', '#ff00ff', '#ffff00', '#00ff9f', '#4ecdc4', '#a855f7'];

        const startPoints = [];
        for (let i = 0; i < 8; i++) {
            const t = -3 + (6 * i) / 7;
            startPoints.push({ x: t, y: 3.5 });
            startPoints.push({ x: t, y: -3.5 });
            startPoints.push({ x: 3.5, y: t });
            startPoints.push({ x: -3.5, y: t });
        }

        startPoints.forEach((start, idx) => {
            const path = traceStreamline(start.x, start.y, combinedField, 0.02, 800, 4);
            if (path.x.length > 5) {
                traces.push({
                    x: path.x,
                    y: path.y,
                    mode: 'lines',
                    line: { color: colors[idx % colors.length], width: 1.5 },
                    showlegend: false,
                    hoverinfo: 'skip'
                });
            }
        });

        // Mark sources/sinks
        const d = separation / 2;
        const markers = getConfigMarkers(config, d);
        if (markers.x.length > 0) {
            traces.push({
                x: markers.x,
                y: markers.y,
                mode: 'markers',
                marker: { size: 12, color: markers.colors, symbol: 'circle' },
                showlegend: false,
                hoverinfo: 'text',
                text: markers.labels
            });
        }

        // Find and mark stagnation points
        if (showStagnation && showStagnation.checked) {
            const stagnationPoints = findStagnationPoints(combinedField, config, d);
            if (stagnationPoints.length > 0) {
                traces.push({
                    x: stagnationPoints.map(p => p.x),
                    y: stagnationPoints.map(p => p.y),
                    mode: 'markers',
                    marker: { size: 10, color: 'white', symbol: 'x', line: { width: 2 } },
                    showlegend: false,
                    name: 'Stagnation'
                });
            }
        }

        const layout = {
            title: {
                text: getConfigTitle(config),
                font: { color: '#00f3ff', size: 16 }
            },
            xaxis: {
                range: [-4, 4],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080',
                linecolor: '#808080',
                dtick: 1
            },
            yaxis: {
                range: [-4, 4],
                gridcolor: '#2a2f4a',
                zerolinecolor: '#808080',
                linecolor: '#808080',
                scaleanchor: 'x',
                dtick: 1
            },
            showlegend: false,
            margin: { t: 50, r: 30, b: 50, l: 50 }
        };

        if (typeof createPlot === 'function') {
            createPlot('streamlines-combined-plot', traces, layout);
        }
    }

    function getConfigMarkers(config, d) {
        const result = { x: [], y: [], colors: [], labels: [] };

        if (config === 'dipole') {
            result.x = [-d, d];
            result.y = [0, 0];
            result.colors = ['#00ff9f', '#ff6b6b'];
            result.labels = ['Source', 'Sink'];
        } else if (config === 'two-sources') {
            result.x = [-d, d];
            result.y = [0, 0];
            result.colors = ['#00ff9f', '#00ff9f'];
            result.labels = ['Source', 'Source'];
        } else if (config === 'two-sinks') {
            result.x = [-d, d];
            result.y = [0, 0];
            result.colors = ['#ff6b6b', '#ff6b6b'];
            result.labels = ['Sink', 'Sink'];
        } else if (config === 'quadrupole') {
            result.x = [-d, d, d, -d];
            result.y = [-d, -d, d, d];
            result.colors = ['#00ff9f', '#ff6b6b', '#00ff9f', '#ff6b6b'];
            result.labels = ['Source', 'Sink', 'Source', 'Sink'];
        } else if (config === 'source-vortex') {
            result.x = [0];
            result.y = [0];
            result.colors = ['#00ff9f'];
            result.labels = ['Source + Vortex'];
        }

        return result;
    }

    function findStagnationPoints(field, config, d) {
        const points = [];

        // Check likely stagnation locations based on config
        const candidates = [];
        if (config === 'dipole') {
            candidates.push({ x: 0, y: 0 });
        } else if (config === 'two-sources' || config === 'two-sinks') {
            candidates.push({ x: 0, y: 0 });
        } else if (config === 'quadrupole') {
            candidates.push({ x: 0, y: 0 });
        }

        candidates.forEach(c => {
            const [fx, fy] = field(c.x, c.y);
            const mag = Math.sqrt(fx * fx + fy * fy);
            if (mag < 0.5) {
                points.push(c);
            }
        });

        return points;
    }

    function getConfigTitle(config) {
        const titles = {
            dipole: 'Dipole (Source + Sink)',
            'two-sources': 'Two Sources',
            'two-sinks': 'Two Sinks',
            quadrupole: 'Quadrupole',
            'source-vortex': 'Source + Vortex (Spiral)'
        };
        return titles[config] || 'Combined Flow';
    }

    window.resetCombinedFlow = function() {
        const configSelect = document.getElementById('streamlines-config-select');
        const separationSlider = document.getElementById('streamlines-separation-slider');
        const showStagnation = document.getElementById('streamlines-show-stagnation');

        if (configSelect) configSelect.value = 'dipole';
        if (separationSlider) separationSlider.value = 2;
        if (showStagnation) showStagnation.checked = true;

        const sepValue = document.getElementById('streamlines-separation-value');
        if (sepValue) sepValue.textContent = '2.0';

        plotCombinedFlow();
    };

    // ============================================================
    // Initialization
    // ============================================================

    function initializePlots() {
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100);
            return;
        }

        const flowSelect = document.getElementById('streamlines-flow-select');
        if (!flowSelect) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Initialize all plots
        plotStreamlines();
        plotFixedPoint();
        plotCombinedFlow();

        // Explorer 1 event listeners
        const flowSelectEl = document.getElementById('streamlines-flow-select');
        const countSlider = document.getElementById('streamlines-count-slider');
        const showArrows = document.getElementById('streamlines-show-arrows');

        if (flowSelectEl) {
            flowSelectEl.onchange = plotStreamlines;
        }

        if (countSlider) {
            countSlider.oninput = function() {
                const val = document.getElementById('streamlines-count-value');
                if (val) val.textContent = this.value;
                plotStreamlines();
            };
        }

        if (showArrows) {
            showArrows.onchange = plotStreamlines;
        }

        // Explorer 2 event listeners
        const radialSlider = document.getElementById('streamlines-radial-slider');
        const rotationSlider = document.getElementById('streamlines-rotation-slider');

        if (radialSlider) {
            radialSlider.oninput = function() {
                updateFixedPointValues();
                plotFixedPoint();
            };
        }

        if (rotationSlider) {
            rotationSlider.oninput = function() {
                updateFixedPointValues();
                plotFixedPoint();
            };
        }

        // Explorer 3 event listeners
        const configSelect = document.getElementById('streamlines-config-select');
        const separationSlider = document.getElementById('streamlines-separation-slider');
        const showStagnation = document.getElementById('streamlines-show-stagnation');

        if (configSelect) {
            configSelect.onchange = plotCombinedFlow;
        }

        if (separationSlider) {
            separationSlider.oninput = function() {
                const val = document.getElementById('streamlines-separation-value');
                if (val) val.textContent = parseFloat(this.value).toFixed(1);
                plotCombinedFlow();
            };
        }

        if (showStagnation) {
            showStagnation.onchange = plotCombinedFlow;
        }
    }

    // Auto-initialize
    initializePlots();

})();
