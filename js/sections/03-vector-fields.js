// Section 1.3: Vector Fields and Field Lines - Interactive Components

(function() {
    'use strict';

    // ============================================================
    // Vector Field Definitions
    // ============================================================

    // Unit-magnitude directions, used for drawing arrows and tracing
    // field lines (tracing needs bounded speeds near the origin)
    const fieldDefinitions = {
        uniform: (x, y, strength) => [strength, 0],
        source: (x, y, strength) => {
            const r = Math.sqrt(x*x + y*y) || 0.01;
            return [strength * x / r, strength * y / r];
        },
        sink: (x, y, strength) => {
            const r = Math.sqrt(x*x + y*y) || 0.01;
            return [-strength * x / r, -strength * y / r];
        },
        vortex: (x, y, strength) => {
            const r = Math.sqrt(x*x + y*y) || 0.01;
            return [-strength * y / r, strength * x / r];
        },
        saddle: (x, y, strength) => [strength * x, -strength * y]
    };

    // Physical field strength at each point, used for color-coding:
    // point sources/sinks/vortices fall off as 1/r in 2D
    const fieldMagnitudes = {
        uniform: (x, y, s) => s,
        source: (x, y, s) => s / Math.max(Math.sqrt(x*x + y*y), 0.2),
        sink: (x, y, s) => s / Math.max(Math.sqrt(x*x + y*y), 0.2),
        vortex: (x, y, s) => s / Math.max(Math.sqrt(x*x + y*y), 0.2),
        saddle: (x, y, s) => s * Math.sqrt(x*x + y*y)
    };

    // Build one shaft trace + one arrowhead trace (colored by |F|) for a
    // whole grid of arrows. Two traces instead of two per arrow keeps
    // slider redraws fast.
    function buildArrowTraces(dirFunc, magFunc, gridRange, step, opts) {
        const shaftX = [], shaftY = [];
        const headX = [], headY = [], headAngle = [], headMag = [];

        for (let x = -gridRange; x <= gridRange; x += step) {
            for (let y = -gridRange; y <= gridRange; y += step) {
                const [fx, fy] = dirFunc(x, y);
                const dirMag = Math.sqrt(fx*fx + fy*fy);
                if (dirMag < 0.01) continue;

                const scale = opts.arrowScale || 0.25;
                const dx = scale * fx / dirMag;
                const dy = scale * fy / dirMag;

                shaftX.push(x, x + dx * 0.7, null);
                shaftY.push(y, y + dy * 0.7, null);
                headX.push(x + dx);
                headY.push(y + dy);
                headAngle.push(90 - Math.atan2(fy, fx) * 180 / Math.PI);
                headMag.push(magFunc(x, y));
            }
        }

        // Robust color scale: cap at the 95th percentile so the few huge
        // values right next to a singularity don't wash out the palette
        const sorted = [...headMag].sort((p, q) => p - q);
        const cmax = sorted[Math.floor(0.95 * (sorted.length - 1))] || 1;
        const clamped = headMag.map(m => Math.min(m, cmax));

        return [{
            x: shaftX,
            y: shaftY,
            mode: 'lines',
            line: { color: 'rgba(0, 243, 255, 0.45)', width: 1.5 },
            showlegend: false,
            hoverinfo: 'skip'
        }, {
            x: headX,
            y: headY,
            mode: 'markers',
            marker: {
                symbol: 'triangle-up',
                size: opts.headSize || 8,
                color: clamped,
                colorscale: 'Viridis',
                cmin: 0,
                cmax: cmax,
                angle: headAngle,
                showscale: !!opts.colorbar,
                colorbar: opts.colorbar ? {
                    title: { text: '|F|', font: { color: '#a0a8d0', size: 12 } },
                    tickfont: { color: '#a0a8d0', size: 10 },
                    thickness: 12,
                    len: 0.75,
                    outlinewidth: 0
                } : undefined
            },
            showlegend: false,
            hoverinfo: 'skip'
        }];
    }

    // Store field line traces and the click points that created them
    let fieldLineTraces = [];
    let fieldLineStarts = [];

    // ============================================================
    // Explorer 1: Vector Field Visualizer
    // ============================================================

    function plotVectorField() {
        const fieldTypeEl = document.getElementById('field-type-select');
        const strengthEl = document.getElementById('strength-slider');
        const densityEl = document.getElementById('density-slider');

        if (!fieldTypeEl || !strengthEl || !densityEl) return;

        const fieldType = fieldTypeEl.value;
        const strength = parseFloat(strengthEl.value);
        const density = parseInt(densityEl.value);

        const fieldFunc = fieldDefinitions[fieldType];
        const magFunc = fieldMagnitudes[fieldType];
        if (!fieldFunc || !magFunc) return;

        const range = 3;
        const step = (2 * range) / density;

        const traces = buildArrowTraces(
            (x, y) => fieldFunc(x, y, strength),
            (x, y) => magFunc(x, y, strength),
            range, step,
            { arrowScale: 0.25, headSize: 8, colorbar: true }
        );

        const titles = {
            uniform: 'Uniform Flow: F = (1, 0)',
            source: 'Source: strength falls off as 1/r',
            sink: 'Sink: strength falls off as 1/r',
            vortex: 'Vortex: strength falls off as 1/r',
            saddle: 'Saddle: F = (x, -y)'
        };

        const layout = {
            title: {
                text: titles[fieldType] || 'Vector Field',
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
            createPlot('vector-field-plot', traces, layout);
        }
    }

    window.resetVectorField = function() {
        const fieldTypeEl = document.getElementById('field-type-select');
        const strengthEl = document.getElementById('strength-slider');
        const densityEl = document.getElementById('density-slider');

        if (fieldTypeEl) fieldTypeEl.value = 'uniform';
        if (strengthEl) strengthEl.value = 1;
        if (densityEl) densityEl.value = 12;

        const strengthVal = document.getElementById('strength-value');
        const densityVal = document.getElementById('density-value');
        if (strengthVal) strengthVal.textContent = '1.0';
        if (densityVal) densityVal.textContent = '12';

        plotVectorField();
    };

    // ============================================================
    // Explorer 2: Field Line Tracer
    // ============================================================

    function plotFieldLineExplorer() {
        const fieldTypeEl = document.getElementById('trace-field-select');
        if (!fieldTypeEl) return;

        const fieldType = fieldTypeEl.value;
        const fieldFunc = fieldDefinitions[fieldType];
        if (!fieldFunc) return;

        // Background arrows (lower density)
        const traces = [];
        const range = 3;
        const step = 0.6;

        for (let x = -range; x <= range; x += step) {
            for (let y = -range; y <= range; y += step) {
                const [fx, fy] = fieldFunc(x, y, 1);
                const mag = Math.sqrt(fx*fx + fy*fy);

                if (mag > 0.01) {
                    const scale = 0.15;
                    const dx = scale * fx / mag;
                    const dy = scale * fy / mag;

                    traces.push({
                        x: [x, x + dx],
                        y: [y, y + dy],
                        mode: 'lines',
                        line: { color: 'rgba(0, 243, 255, 0.3)', width: 1.5 },
                        showlegend: false,
                        hoverinfo: 'skip'
                    });
                }
            }
        }

        // Add stored field line traces
        traces.push(...fieldLineTraces);

        const layout = {
            title: {
                text: 'Click to Trace Field Lines',
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
            createPlot('field-line-plot', traces, layout);
        }

        // Set up click handler after plot is created. Plotly's own
        // plotly_click only fires on data points, so listen on the div
        // and convert pixel coordinates to data coordinates ourselves.
        setTimeout(function() {
            const plotDiv = document.getElementById('field-line-plot');
            if (plotDiv && !plotDiv._traceClickBound) {
                plotDiv._traceClickBound = true;
                plotDiv.addEventListener('click', function(e) {
                    if (e.target.closest('.modebar')) return;
                    const fl = plotDiv._fullLayout;
                    if (!fl || !fl.xaxis || !fl.xaxis.p2d) return;
                    const rect = plotDiv.getBoundingClientRect();
                    const x = fl.xaxis.p2d(e.clientX - rect.left - fl.xaxis._offset);
                    const y = fl.yaxis.p2d(e.clientY - rect.top - fl.yaxis._offset);
                    if (x < -4 || x > 4 || y < -4 || y > 4 || isNaN(x) || isNaN(y)) return;
                    traceFieldLine(x, y);
                });
            }
        }, 100);
    }

    // Integrate one field line from (x0, y0) and return its plot traces.
    // Uses a midpoint step so closed lines (vortex) stay closed instead of
    // spiraling outward like forward Euler does.
    function computeFieldLine(x0, y0, color) {
        const fieldTypeEl = document.getElementById('trace-field-select');
        const durationEl = document.getElementById('duration-slider');
        if (!fieldTypeEl || !durationEl) return [];

        const fieldType = fieldTypeEl.value;
        const duration = parseFloat(durationEl.value);
        const fieldFunc = fieldDefinitions[fieldType];
        if (!fieldFunc) return [];

        const dt = 0.02;
        const steps = Math.floor(duration / dt);

        function integrate(sign) {
            let x = x0, y = y0;
            const px = [], py = [];
            for (let i = 0; i < steps; i++) {
                const [fx1, fy1] = fieldFunc(x, y, 1);
                const mag1 = Math.sqrt(fx1*fx1 + fy1*fy1);
                if (mag1 < 0.01) break;
                const xm = x + sign * 0.5 * dt * fx1;
                const ym = y + sign * 0.5 * dt * fy1;
                const [fx2, fy2] = fieldFunc(xm, ym, 1);
                x += sign * dt * fx2;
                y += sign * dt * fy2;
                if (Math.abs(x) > 5 || Math.abs(y) > 5) break;
                // Sinks converge on the origin: stop instead of jittering there
                if (fieldType !== 'uniform' && Math.sqrt(x*x + y*y) < 0.05) {
                    px.push(x); py.push(y);
                    break;
                }
                px.push(x);
                py.push(y);
            }
            return [px, py];
        }

        const [fwdX, fwdY] = integrate(1);
        let pathX = [x0, ...fwdX];
        let pathY = [y0, ...fwdY];

        // Trace backward too, so the line shows where the flow came from
        if (fieldType === 'saddle' || fieldType === 'uniform') {
            const [backX, backY] = integrate(-1);
            pathX = [...backX.reverse(), ...pathX];
            pathY = [...backY.reverse(), ...pathY];
        }

        const traces = [{
            x: pathX,
            y: pathY,
            mode: 'lines',
            line: { color: color, width: 2.5 },
            showlegend: false,
            hoverinfo: 'skip'
        }, {
            x: [x0],
            y: [y0],
            mode: 'markers',
            marker: { color: color, size: 10, symbol: 'circle' },
            showlegend: false,
            hoverinfo: 'skip'
        }];

        // Direction arrowheads along the path (every ~1.2 units of arc length)
        const arrowX = [], arrowY = [], arrowAngle = [];
        let acc = 0;
        for (let i = 1; i < pathX.length; i++) {
            acc += Math.hypot(pathX[i] - pathX[i-1], pathY[i] - pathY[i-1]);
            if (acc >= 1.2) {
                acc = 0;
                const [fx, fy] = fieldFunc(pathX[i], pathY[i], 1);
                if (Math.hypot(fx, fy) > 0.01) {
                    arrowX.push(pathX[i]);
                    arrowY.push(pathY[i]);
                    arrowAngle.push(90 - Math.atan2(fy, fx) * 180 / Math.PI);
                }
            }
        }
        if (arrowX.length > 0) {
            traces.push({
                x: arrowX,
                y: arrowY,
                mode: 'markers',
                marker: { symbol: 'triangle-up', size: 9, color: color, angle: arrowAngle },
                showlegend: false,
                hoverinfo: 'skip'
            });
        }

        return traces;
    }

    // Rebuild every stored field line (used after a new click, a duration
    // change, or a field change so all lines reflect the current settings)
    function rebuildFieldLines() {
        const colors = ['#ff00ff', '#ffff00', '#00ff9f', '#ff6b6b', '#4ecdc4', '#a855f7'];
        fieldLineTraces = [];
        fieldLineStarts.forEach(function(pt, i) {
            fieldLineTraces.push(...computeFieldLine(pt[0], pt[1], colors[i % colors.length]));
        });
        plotFieldLineExplorer();
    }

    function traceFieldLine(x0, y0) {
        fieldLineStarts.push([x0, y0]);
        rebuildFieldLines();
    }

    window.clearFieldLines = function() {
        fieldLineTraces = [];
        fieldLineStarts = [];
        plotFieldLineExplorer();
    };

    window.traceMultipleLines = function() {
        fieldLineStarts = [
            [-2, 0], [2, 0], [0, 2], [0, -2],
            [-2, 2], [2, 2], [-2, -2], [2, -2]
        ];
        rebuildFieldLines();
    };

    // ============================================================
    // Explorer 3: Build Your Own Field
    // ============================================================

    function plotCombinedField() {
        const uniformEl = document.getElementById('uniform-slider');
        const radialEl = document.getElementById('radial-slider');
        const vortexEl = document.getElementById('vortex-slider');

        if (!uniformEl || !radialEl || !vortexEl) return;

        const uniformStrength = parseFloat(uniformEl.value);
        const radialStrength = parseFloat(radialEl.value);
        const vortexStrength = parseFloat(vortexEl.value);

        // Combined field with physical 1/r falloff for the point
        // components, so combinations like uniform + vortex have a real
        // stagnation point that moves with the sliders
        function combined(x, y) {
            const r = Math.max(Math.sqrt(x*x + y*y), 0.2);
            const fx = uniformStrength + (radialStrength * x - vortexStrength * y) / (r * r);
            const fy = (radialStrength * y + vortexStrength * x) / (r * r);
            return [fx, fy];
        }

        const range = 3;
        const step = 0.5;
        const traces = buildArrowTraces(
            combined,
            (x, y) => {
                const [fx, fy] = combined(x, y);
                return Math.sqrt(fx*fx + fy*fy);
            },
            range, step,
            { arrowScale: 0.2, headSize: 7, colorbar: true }
        );

        // Build title
        let titleParts = [];
        if (Math.abs(uniformStrength) > 0.01) titleParts.push('Uniform(' + uniformStrength.toFixed(1) + ')');
        if (Math.abs(radialStrength) > 0.01) {
            titleParts.push(radialStrength > 0 ? 'Source(' + radialStrength.toFixed(1) + ')' : 'Sink(' + (-radialStrength).toFixed(1) + ')');
        }
        if (Math.abs(vortexStrength) > 0.01) titleParts.push('Vortex(' + vortexStrength.toFixed(1) + ')');

        const title = titleParts.length > 0 ? titleParts.join(' + ') : 'No Field (all zero)';

        const layout = {
            title: {
                text: title,
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
            createPlot('combined-field-plot', traces, layout);
        }
    }

    window.resetCombinedField = function() {
        const uniformEl = document.getElementById('uniform-slider');
        const radialEl = document.getElementById('radial-slider');
        const vortexEl = document.getElementById('vortex-slider');

        if (uniformEl) uniformEl.value = 0;
        if (radialEl) radialEl.value = 0;
        if (vortexEl) vortexEl.value = 0;

        const uniformVal = document.getElementById('uniform-value');
        const radialVal = document.getElementById('radial-value');
        const vortexVal = document.getElementById('vortex-value');

        if (uniformVal) uniformVal.textContent = '0.0';
        if (radialVal) radialVal.textContent = '0.0';
        if (vortexVal) vortexVal.textContent = '0.0';

        plotCombinedField();
    };

    window.presetSpiral = function() {
        const uniformEl = document.getElementById('uniform-slider');
        const radialEl = document.getElementById('radial-slider');
        const vortexEl = document.getElementById('vortex-slider');

        if (uniformEl) uniformEl.value = 0;
        if (radialEl) radialEl.value = -1;
        if (vortexEl) vortexEl.value = 1;

        const uniformVal = document.getElementById('uniform-value');
        const radialVal = document.getElementById('radial-value');
        const vortexVal = document.getElementById('vortex-value');

        if (uniformVal) uniformVal.textContent = '0.0';
        if (radialVal) radialVal.textContent = '-1.0';
        if (vortexVal) vortexVal.textContent = '1.0';

        plotCombinedField();
    };

    window.presetDipole = function() {
        const uniformEl = document.getElementById('uniform-slider');
        const radialEl = document.getElementById('radial-slider');
        const vortexEl = document.getElementById('vortex-slider');

        if (uniformEl) uniformEl.value = 1;
        if (radialEl) radialEl.value = 0;
        if (vortexEl) vortexEl.value = 1;

        const uniformVal = document.getElementById('uniform-value');
        const radialVal = document.getElementById('radial-value');
        const vortexVal = document.getElementById('vortex-value');

        if (uniformVal) uniformVal.textContent = '1.0';
        if (radialVal) radialVal.textContent = '0.0';
        if (vortexVal) vortexVal.textContent = '1.0';

        plotCombinedField();
    };

    // ============================================================
    // Initialization
    // ============================================================

    function initializePlots() {
        // Check if Plotly and createPlot are available
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100);
            return;
        }

        // Check if section elements exist
        const vectorFieldSelect = document.getElementById('field-type-select');
        if (!vectorFieldSelect) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Reset field line traces for fresh start
        fieldLineTraces = [];
        fieldLineStarts = [];

        // Initialize all plots
        plotVectorField();
        plotFieldLineExplorer();
        plotCombinedField();

        // Explorer 1 event listeners
        const fieldTypeSelect = document.getElementById('field-type-select');
        const strengthSlider = document.getElementById('strength-slider');
        const densitySlider = document.getElementById('density-slider');

        if (fieldTypeSelect) {
            fieldTypeSelect.onchange = plotVectorField;
        }

        if (strengthSlider) {
            strengthSlider.oninput = function() {
                const val = document.getElementById('strength-value');
                if (val) val.textContent = parseFloat(this.value).toFixed(1);
                plotVectorField();
            };
        }

        if (densitySlider) {
            densitySlider.oninput = function() {
                const val = document.getElementById('density-value');
                if (val) val.textContent = this.value;
                plotVectorField();
            };
        }

        // Explorer 2 event listeners
        const traceFieldSelect = document.getElementById('trace-field-select');
        const durationSlider = document.getElementById('duration-slider');

        if (traceFieldSelect) {
            traceFieldSelect.onchange = function() {
                fieldLineTraces = [];
                fieldLineStarts = [];
                plotFieldLineExplorer();
            };
        }

        if (durationSlider) {
            durationSlider.oninput = function() {
                const val = document.getElementById('duration-value');
                if (val) val.textContent = parseFloat(this.value).toFixed(1);
                if (fieldLineStarts.length > 0) rebuildFieldLines();
            };
        }

        // Explorer 3 event listeners
        const uniformSlider = document.getElementById('uniform-slider');
        const radialSlider = document.getElementById('radial-slider');
        const vortexSlider = document.getElementById('vortex-slider');

        if (uniformSlider) {
            uniformSlider.oninput = function() {
                const val = document.getElementById('uniform-value');
                if (val) val.textContent = parseFloat(this.value).toFixed(1);
                plotCombinedField();
            };
        }

        if (radialSlider) {
            radialSlider.oninput = function() {
                const val = document.getElementById('radial-value');
                if (val) val.textContent = parseFloat(this.value).toFixed(1);
                plotCombinedField();
            };
        }

        if (vortexSlider) {
            vortexSlider.oninput = function() {
                const val = document.getElementById('vortex-value');
                if (val) val.textContent = parseFloat(this.value).toFixed(1);
                plotCombinedField();
            };
        }
    }

    // Auto-initialize when script loads
    initializePlots();

})();
