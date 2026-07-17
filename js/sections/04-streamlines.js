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

            // Midpoint step (normalized to constant arc length): forward
            // Euler makes closed streamlines (vortex circles) spiral outward
            const xm = x + 0.5 * dt * fx / mag;
            const ym = y + 0.5 * dt * fy / mag;
            const [fx2, fy2] = fieldFunc(xm, ym);
            const mag2 = Math.sqrt(fx2 * fx2 + fy2 * fy2);
            if (mag2 < 0.01) break;

            x += dt * fx2 / mag2;
            y += dt * fy2 / mag2;

            if (Math.abs(x) > bounds || Math.abs(y) > bounds) break;

            // The step size is fixed at dt, so a particle that reaches an
            // attractor (sink, spiral center) bounces back and forth across
            // it forever. Detect the oscillation and stop there cleanly.
            const n = pathX.length;
            if (n >= 2 && Math.hypot(x - pathX[n - 2], y - pathY[n - 2]) < 0.5 * dt) break;

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
        } else if (flowType === 'vortex') {
            // Vortex streamlines are concentric circles: vary the seed radius,
            // otherwise every line traces the same single circle
            for (let i = 0; i < numLines; i++) {
                const angle = (2 * Math.PI * i) / numLines;
                const radius = 0.4 + (2.8 * i) / Math.max(numLines - 1, 1);
                startPoints.push({
                    x: radius * Math.cos(angle),
                    y: radius * Math.sin(angle)
                });
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
            const path = traceStreamline(start.x, start.y, fieldFunc, 0.03, 800, 4);
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
                                angle: 90 - Math.atan2(dy, dx) * 180 / Math.PI
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
                        angle: 90 - Math.atan2(dy, dx) * 180 / Math.PI
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

        // The separation slider has no effect on the co-located
        // source + vortex combination, so grey it out there
        separationSlider.disabled = (config === 'source-vortex');

        // Point sources/sinks with a physical 1/r falloff (2D flux
        // conservation). A unit-magnitude model would make the field
        // exactly zero along the whole axis outside a dipole, producing
        // spurious stagnation lines and wrong streamline shapes.
        function pointFlow(x, y, x0, y0, s) {
            const r2 = (x - x0) ** 2 + (y - y0) ** 2 || 0.0001;
            return [s * (x - x0) / r2, s * (y - y0) / r2];
        }

        function combinedField(x, y) {
            const d = separation / 2;
            let pts;

            if (config === 'dipole') {
                pts = [{ x: -d, y: 0, s: 1 }, { x: d, y: 0, s: -1 }];
            } else if (config === 'two-sources') {
                pts = [{ x: -d, y: 0, s: 1 }, { x: d, y: 0, s: 1 }];
            } else if (config === 'two-sinks') {
                pts = [{ x: -d, y: 0, s: -1 }, { x: d, y: 0, s: -1 }];
            } else if (config === 'quadrupole') {
                pts = [
                    { x: -d, y: -d, s: 1 },
                    { x: d, y: -d, s: -1 },
                    { x: d, y: d, s: 1 },
                    { x: -d, y: d, s: -1 }
                ];
            } else if (config === 'source-vortex') {
                const r = Math.sqrt(x ** 2 + y ** 2) || 0.01;
                return [(x - y) / r, (y + x) / r];
            } else {
                return [0, 0];
            }

            let fx = 0, fy = 0;
            pts.forEach(p => {
                const [px, py] = pointFlow(x, y, p.x, p.y, p.s);
                fx += px;
                fy += py;
            });
            return [fx, fy];
        }

        const traces = [];
        const colors = ['#00f3ff', '#ff00ff', '#ffff00', '#00ff9f', '#4ecdc4', '#a855f7'];
        const d = separation / 2;

        // Seed streamlines from small rings around each source (traced
        // forward, with the flow) and each sink (traced backward, against
        // the flow). Boundary-only seeding misses the source→sink arcs
        // entirely because boundary flow exits the plot immediately.
        const reversedField = (x, y) => {
            const [fx, fy] = combinedField(x, y);
            return [-fx, -fy];
        };

        const markers = getConfigMarkers(config, d);
        const seeds = [];
        const linesPerPoint = 14;
        markers.labels.forEach((label, k) => {
            const isSource = label.indexOf('Source') !== -1;
            for (let i = 0; i < linesPerPoint; i++) {
                const angle = (2 * Math.PI * i) / linesPerPoint;
                seeds.push({
                    x: markers.x[k] + 0.12 * Math.cos(angle),
                    y: markers.y[k] + 0.12 * Math.sin(angle),
                    backward: !isSource
                });
            }
        });

        seeds.forEach((start, idx) => {
            const path = traceStreamline(start.x, start.y,
                start.backward ? reversedField : combinedField, 0.02, 900, 4.2);
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
        // Grid-scan |F| for local minima, then refine each candidate with a
        // shrinking local search. No hardcoded candidate list: this finds
        // every zero in view (e.g. the two-sources midpoint) and correctly
        // finds none for the dipole, where the flows never cancel.
        const mag = (x, y) => {
            const [fx, fy] = field(x, y);
            return Math.sqrt(fx * fx + fy * fy);
        };

        const candidates = [];
        const step = 0.15;
        for (let x = -3.6; x <= 3.6; x += step) {
            for (let y = -3.6; y <= 3.6; y += step) {
                const m = mag(x, y);
                if (m < 0.4 &&
                    m <= mag(x + step, y) && m <= mag(x - step, y) &&
                    m <= mag(x, y + step) && m <= mag(x, y - step)) {
                    candidates.push({ x, y });
                }
            }
        }

        // Refine each candidate by nested grid search
        const points = [];
        candidates.forEach(c => {
            let cx = c.x, cy = c.y, h = step;
            for (let iter = 0; iter < 6; iter++) {
                let best = { x: cx, y: cy, m: mag(cx, cy) };
                for (let i = -2; i <= 2; i++) {
                    for (let j = -2; j <= 2; j++) {
                        const m = mag(cx + i * h / 2, cy + j * h / 2);
                        if (m < best.m) best = { x: cx + i * h / 2, y: cy + j * h / 2, m };
                    }
                }
                cx = best.x;
                cy = best.y;
                h /= 2;
            }
            if (mag(cx, cy) < 0.05 &&
                !points.some(p => Math.hypot(p.x - cx, p.y - cy) < 0.3)) {
                points.push({ x: cx, y: cy });
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
