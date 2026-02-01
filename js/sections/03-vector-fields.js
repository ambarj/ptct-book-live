// Section 1.3: Vector Fields and Field Lines - Interactive Components

(function() {
    'use strict';

    // ============================================================
    // Vector Field Definitions
    // ============================================================

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

    // Store field line traces
    let fieldLineTraces = [];

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
        if (!fieldFunc) return;

        const range = 3;
        const step = (2 * range) / density;

        // Generate arrow traces
        const traces = [];

        for (let x = -range; x <= range; x += step) {
            for (let y = -range; y <= range; y += step) {
                const [fx, fy] = fieldFunc(x, y, strength);
                const mag = Math.sqrt(fx*fx + fy*fy);

                if (mag > 0.01) {
                    const scale = 0.25;
                    const dx = scale * fx / mag;
                    const dy = scale * fy / mag;

                    // Color based on magnitude
                    const intensity = Math.min(mag / 3, 1);
                    const r = Math.floor(255 * intensity);
                    const g = Math.floor(243 * (1 - intensity * 0.3));
                    const b = 255;
                    const color = `rgb(${r}, ${g}, ${b})`;

                    // Arrow line
                    traces.push({
                        x: [x, x + dx * 0.7],
                        y: [y, y + dy * 0.7],
                        mode: 'lines',
                        line: { color: color, width: 2 },
                        showlegend: false,
                        hoverinfo: 'skip'
                    });

                    // Arrowhead
                    traces.push({
                        x: [x + dx],
                        y: [y + dy],
                        mode: 'markers',
                        marker: {
                            symbol: 'triangle-up',
                            size: 8,
                            color: color,
                            angle: Math.atan2(fy, fx) * 180 / Math.PI - 90
                        },
                        showlegend: false,
                        hoverinfo: 'skip'
                    });
                }
            }
        }

        const titles = {
            uniform: 'Uniform Flow: F = (1, 0)',
            source: 'Source: F = (x, y) / r',
            sink: 'Sink: F = -(x, y) / r',
            vortex: 'Vortex: F = (-y, x) / r',
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

        // Set up click handler after plot is created
        setTimeout(function() {
            const plotDiv = document.getElementById('field-line-plot');
            if (plotDiv && plotDiv.on) {
                // Remove existing handler first
                plotDiv.removeAllListeners && plotDiv.removeAllListeners('plotly_click');
                plotDiv.on('plotly_click', function(data) {
                    if (data.points && data.points[0]) {
                        traceFieldLine(data.points[0].x, data.points[0].y);
                    }
                });
            }
        }, 100);
    }

    function traceFieldLine(x0, y0) {
        const fieldTypeEl = document.getElementById('trace-field-select');
        const durationEl = document.getElementById('duration-slider');
        if (!fieldTypeEl || !durationEl) return;

        const fieldType = fieldTypeEl.value;
        const duration = parseFloat(durationEl.value);
        const fieldFunc = fieldDefinitions[fieldType];
        if (!fieldFunc) return;

        const dt = 0.02;
        const steps = Math.floor(duration / dt);

        // Trace forward
        let x = x0, y = y0;
        const pathX = [x], pathY = [y];

        for (let i = 0; i < steps; i++) {
            const [fx, fy] = fieldFunc(x, y, 1);
            const mag = Math.sqrt(fx*fx + fy*fy);

            if (mag < 0.01) break;

            x += dt * fx;
            y += dt * fy;

            if (Math.abs(x) > 5 || Math.abs(y) > 5) break;

            pathX.push(x);
            pathY.push(y);
        }

        // Trace backward for some field types
        if (fieldType === 'saddle' || fieldType === 'uniform') {
            x = x0;
            y = y0;
            const backX = [], backY = [];

            for (let i = 0; i < steps; i++) {
                const [fx, fy] = fieldFunc(x, y, 1);
                const mag = Math.sqrt(fx*fx + fy*fy);

                if (mag < 0.01) break;

                x -= dt * fx;
                y -= dt * fy;

                if (Math.abs(x) > 5 || Math.abs(y) > 5) break;

                backX.unshift(x);
                backY.unshift(y);
            }

            pathX.unshift(...backX);
            pathY.unshift(...backY);
        }

        // Random color
        const colors = ['#ff00ff', '#ffff00', '#00ff9f', '#ff6b6b', '#4ecdc4', '#a855f7'];
        const color = colors[fieldLineTraces.length % colors.length];

        // Add traces
        fieldLineTraces.push({
            x: pathX,
            y: pathY,
            mode: 'lines',
            line: { color: color, width: 2.5 },
            showlegend: false,
            hoverinfo: 'skip'
        });

        fieldLineTraces.push({
            x: [x0],
            y: [y0],
            mode: 'markers',
            marker: { color: color, size: 10, symbol: 'circle' },
            showlegend: false,
            hoverinfo: 'skip'
        });

        plotFieldLineExplorer();
    }

    window.clearFieldLines = function() {
        fieldLineTraces = [];
        plotFieldLineExplorer();
    };

    window.traceMultipleLines = function() {
        fieldLineTraces = [];
        const startingPoints = [
            [-2, 0], [2, 0], [0, 2], [0, -2],
            [-2, 2], [2, 2], [-2, -2], [2, -2]
        ];

        startingPoints.forEach(function(pt) {
            traceFieldLine(pt[0], pt[1]);
        });
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

        // Generate arrows
        const traces = [];
        const range = 3;
        const step = 0.5;

        for (let x = -range; x <= range; x += step) {
            for (let y = -range; y <= range; y += step) {
                const r = Math.sqrt(x*x + y*y) || 0.01;

                // Combined field
                let fx = uniformStrength;
                let fy = 0;
                fx += radialStrength * x / r;
                fy += radialStrength * y / r;
                fx += -vortexStrength * y / r;
                fy += vortexStrength * x / r;

                const mag = Math.sqrt(fx*fx + fy*fy);

                if (mag > 0.01) {
                    const scale = 0.2;
                    const normMag = Math.min(mag, 3);
                    const dx = scale * fx / mag * (0.5 + 0.5 * normMag / 3);
                    const dy = scale * fy / mag * (0.5 + 0.5 * normMag / 3);

                    const intensity = Math.min(mag / 3, 1);
                    const color = `hsl(${180 - intensity * 60}, 100%, ${50 + intensity * 20}%)`;

                    traces.push({
                        x: [x, x + dx * 0.7],
                        y: [y, y + dy * 0.7],
                        mode: 'lines',
                        line: { color: color, width: 2 },
                        showlegend: false,
                        hoverinfo: 'skip'
                    });

                    traces.push({
                        x: [x + dx],
                        y: [y + dy],
                        mode: 'markers',
                        marker: {
                            symbol: 'triangle-up',
                            size: 7,
                            color: color,
                            angle: Math.atan2(fy, fx) * 180 / Math.PI - 90
                        },
                        showlegend: false,
                        hoverinfo: 'skip'
                    });
                }
            }
        }

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
                plotFieldLineExplorer();
            };
        }

        if (durationSlider) {
            durationSlider.oninput = function() {
                const val = document.getElementById('duration-value');
                if (val) val.textContent = parseFloat(this.value).toFixed(1);
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
