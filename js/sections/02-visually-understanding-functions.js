// Section 1.2: Visually Understanding Functions - Interactive Components
// Covers: Zeros, Divergences, Extrema, Asymptotes

// ============================================================
// EXPLORER 1: Zero Finder
// ============================================================

function updateZerosPlot() {
    const a = parseFloat(document.getElementById('zeros-a-slider').value);
    const b = parseFloat(document.getElementById('zeros-b-slider').value);
    const c = parseFloat(document.getElementById('zeros-c-slider').value);

    // Update display values
    document.getElementById('zeros-a-value').textContent = a.toFixed(2);
    document.getElementById('zeros-b-value').textContent = b.toFixed(2);
    document.getElementById('zeros-c-value').textContent = c.toFixed(2);

    // Calculate discriminant
    const discriminant = b * b - 4 * a * c;
    let zerosInfo = '';
    let zeroPoints = [];

    if (a === 0) {
        // Linear function
        if (b !== 0) {
            const zero = -c / b;
            zeroPoints = [{ x: zero, y: 0 }];
            zerosInfo = `Linear: one zero at x = ${zero.toFixed(2)}`;
        } else {
            zerosInfo = 'Constant function';
        }
    } else {
        if (discriminant > 0) {
            const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
            const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);
            zeroPoints = [{ x: x1, y: 0 }, { x: x2, y: 0 }];
            zerosInfo = `Δ = ${discriminant.toFixed(2)} > 0 | Two real zeros`;
        } else if (discriminant === 0) {
            const x1 = -b / (2 * a);
            zeroPoints = [{ x: x1, y: 0 }];
            zerosInfo = `Δ = 0 | One real zero (repeated)`;
        } else {
            zerosInfo = `Δ = ${discriminant.toFixed(2)} < 0 | No real zeros`;
        }
    }

    document.getElementById('zeros-info').textContent = zerosInfo;

    // Generate plot data
    const x = range(-5, 8, 0.05);
    const y = x.map(xi => a * xi * xi + b * xi + c);

    const traces = [{
        x: x,
        y: y,
        type: 'scatter',
        mode: 'lines',
        name: 'f(x)',
        line: { color: '#00f3ff', width: 2 }
    }];

    // Add zero markers
    if (zeroPoints.length > 0) {
        traces.push({
            x: zeroPoints.map(p => p.x),
            y: zeroPoints.map(p => p.y),
            type: 'scatter',
            mode: 'markers',
            name: 'Zeros',
            marker: { color: '#ff00ff', size: 12, symbol: 'circle' }
        });
    }

    const layout = {
        title: {
            text: `f(x) = ${a.toFixed(1)}x² + ${b.toFixed(1)}x + ${c.toFixed(1)}`,
            font: { color: '#00f3ff', size: 16 }
        },
        xaxis: {
            title: 'x',
            range: [-5, 8],
            zeroline: true,
            zerolinewidth: 2,
            zerolinecolor: '#808080',
            gridcolor: '#2a2f4a'
        },
        yaxis: {
            title: 'f(x)',
            range: [-15, 25],
            zeroline: true,
            zerolinewidth: 2,
            zerolinecolor: '#808080',
            gridcolor: '#2a2f4a'
        },
        showlegend: true,
        legend: { x: 0.02, y: 0.98 }
    };

    createPlot('zeros-plot', traces, layout);
}

function resetZeros() {
    document.getElementById('zeros-a-slider').value = 1;
    document.getElementById('zeros-b-slider').value = -3;
    document.getElementById('zeros-c-slider').value = 2;
    updateZerosPlot();
}

// ============================================================
// EXPLORER 2: Divergence Visualizer
// ============================================================

function updateDivergencePlot() {
    const a = parseFloat(document.getElementById('div-a-slider').value);
    const b = parseFloat(document.getElementById('div-b-slider').value);

    // Update display values
    document.getElementById('div-a-value').textContent = a.toFixed(2);
    document.getElementById('div-b-value').textContent = b.toFixed(2);

    // Sort poles to know which is smaller
    const pole1 = Math.min(a, b);
    const pole2 = Math.max(a, b);

    const xMin = -3;
    const xMax = 6;
    const step = 0.005; // Fine step for smooth curves
    const gap = 0.02;   // Small gap to get close to poles

    // Between close poles the middle branch bottoms out at |f| = 4/d²
    // (d = pole separation), which can exceed a fixed y-range and make
    // the branch vanish entirely. Grow the visible range with 1/d² up
    // to a cap, and clamp curve values instead of dropping them so the
    // branch arms always reach the edge of the plot.
    const d = pole2 - pole1;
    const midPeak = d > 1e-6 ? 4 / (d * d) : Infinity;
    const yLim = Math.min(Math.max(30, midPeak * 1.3), 200);
    const yClip = yLim * 1.5;

    // Create separate arrays for each continuous region
    const leftX = [], leftY = [];
    const middleX = [], middleY = [];
    const rightX = [], rightY = [];

    for (let xi = xMin; xi <= xMax; xi += step) {
        let yi = 1 / ((xi - a) * (xi - b));

        // Skip points too close to poles
        if (Math.abs(xi - pole1) < gap || Math.abs(xi - pole2) < gap) {
            continue;
        }

        // Clamp extreme values so branches run off the top/bottom of the
        // plot instead of silently disappearing
        yi = Math.max(-yClip, Math.min(yClip, yi));

        // Assign to appropriate region
        if (xi < pole1 - gap) {
            leftX.push(xi);
            leftY.push(yi);
        } else if (xi > pole1 + gap && xi < pole2 - gap) {
            middleX.push(xi);
            middleY.push(yi);
        } else if (xi > pole2 + gap) {
            rightX.push(xi);
            rightY.push(yi);
        }
    }

    // Create separate traces for each region (no connections across poles)
    const traces = [
        {
            x: leftX, y: leftY,
            type: 'scatter', mode: 'lines',
            line: { color: '#00f3ff', width: 2 },
            showlegend: false, hoverinfo: 'x+y'
        },
        {
            x: middleX, y: middleY,
            type: 'scatter', mode: 'lines',
            line: { color: '#00f3ff', width: 2 },
            showlegend: false, hoverinfo: 'x+y'
        },
        {
            x: rightX, y: rightY,
            type: 'scatter', mode: 'lines',
            name: 'f(x)',
            line: { color: '#00f3ff', width: 2 },
            showlegend: false, hoverinfo: 'x+y'
        }
    ];

    // Vertical asymptote lines
    const shapes = [
        {
            type: 'line',
            x0: a, x1: a,
            y0: -yLim, y1: yLim,
            line: { color: '#ff00ff', width: 2, dash: 'dash' }
        },
        {
            type: 'line',
            x0: b, x1: b,
            y0: -yLim, y1: yLim,
            line: { color: '#ff00ff', width: 2, dash: 'dash' }
        }
    ];

    // If the poles are so close that even the enlarged range can't show
    // the middle branch, say so instead of leaving a mysterious gap
    const annotations = [];
    if (isFinite(midPeak) && midPeak > yLim && d > 2 * gap) {
        annotations.push({
            x: (pole1 + pole2) / 2,
            y: -yLim * 0.85,
            text: 'poles very close:<br>middle branch below view',
            showarrow: false,
            font: { color: '#ffff00', size: 11 }
        });
    }

    const layout = {
        title: {
            text: `f(x) = 1/[(x - ${a.toFixed(1)})(x - ${b.toFixed(1)})]`,
            font: { color: '#00f3ff', size: 16 }
        },
        xaxis: {
            title: 'x',
            range: [-3, 6],
            zeroline: true,
            zerolinewidth: 2,
            zerolinecolor: '#808080',
            gridcolor: '#2a2f4a'
        },
        yaxis: {
            title: 'f(x)',
            range: [-yLim, yLim],
            zeroline: true,
            zerolinewidth: 2,
            zerolinecolor: '#808080',
            gridcolor: '#2a2f4a'
        },
        shapes: shapes,
        annotations: annotations,
        showlegend: false
    };

    createPlot('divergence-plot', traces, layout);
}

function resetDivergence() {
    document.getElementById('div-a-slider').value = 1;
    document.getElementById('div-b-slider').value = 2;
    updateDivergencePlot();
}

// ============================================================
// EXPLORER 3: Extrema Explorer
// ============================================================

function updateExtremaPlot() {
    const a = parseFloat(document.getElementById('ext-a-slider').value);
    const b = parseFloat(document.getElementById('ext-b-slider').value);
    const c = parseFloat(document.getElementById('ext-c-slider').value);
    const showDerivative = document.getElementById('show-derivative').checked;

    // Update display values
    document.getElementById('ext-a-value').textContent = a.toFixed(2);
    document.getElementById('ext-b-value').textContent = b.toFixed(2);
    document.getElementById('ext-c-value').textContent = c.toFixed(2);

    // Calculate extremum
    let extremumInfo = 'No extremum (a = 0)';
    let extremumX = null;
    let extremumY = null;

    if (a !== 0) {
        extremumX = -b / (2 * a);
        extremumY = a * extremumX * extremumX + b * extremumX + c;
        const extremumType = a > 0 ? 'minimum' : 'maximum';
        extremumInfo = `f(x) has its ${extremumType} at (${extremumX.toFixed(2)}, ${extremumY.toFixed(2)})`;
    }

    document.getElementById('extrema-info').textContent = extremumInfo;

    // Generate plot data
    const x = range(-6, 6, 0.05);
    const y = x.map(xi => a * xi * xi + b * xi + c);

    const traces = [{
        x: x,
        y: y,
        type: 'scatter',
        mode: 'lines',
        name: 'f(x)',
        line: { color: '#00f3ff', width: 2 }
    }];

    // Add derivative if checked
    if (showDerivative) {
        const yPrime = x.map(xi => 2 * a * xi + b);
        traces.push({
            x: x,
            y: yPrime,
            type: 'scatter',
            mode: 'lines',
            name: "f'(x)",
            line: { color: '#ffff00', width: 2, dash: 'dash' }
        });
    }

    // Add extremum marker
    if (extremumX !== null) {
        const markerSymbol = a > 0 ? 'triangle-up' : 'triangle-down';
        traces.push({
            x: [extremumX],
            y: [extremumY],
            type: 'scatter',
            mode: 'markers',
            name: a > 0 ? 'Minimum' : 'Maximum',
            marker: { color: '#00ff9f', size: 14, symbol: markerSymbol }
        });
    }

    const layout = {
        title: {
            text: `f(x) = ${a.toFixed(1)}x² + ${b.toFixed(1)}x + ${c.toFixed(1)}`,
            font: { color: '#00f3ff', size: 16 }
        },
        xaxis: {
            title: 'x',
            range: [-6, 6],
            zeroline: true,
            zerolinewidth: 2,
            zerolinecolor: '#808080',
            gridcolor: '#2a2f4a'
        },
        yaxis: {
            title: 'y',
            range: [-20, 30],
            zeroline: true,
            zerolinewidth: 2,
            zerolinecolor: '#808080',
            gridcolor: '#2a2f4a'
        },
        showlegend: true,
        legend: { x: 0.02, y: 0.98 }
    };

    createPlot('extrema-plot', traces, layout);
}

function resetExtrema() {
    document.getElementById('ext-a-slider').value = 1;
    document.getElementById('ext-b-slider').value = -3;
    document.getElementById('ext-c-slider').value = 2;
    document.getElementById('show-derivative').checked = false;
    updateExtremaPlot();
}

// ============================================================
// EXPLORER 4: Asymptote Analyzer
// ============================================================

function updateAsymptotePlot() {
    const funcChoice = document.getElementById('asymptote-function').value;
    const xRange = parseFloat(document.getElementById('asymp-range-slider').value);

    document.getElementById('asymp-range-value').textContent = xRange;

    let funcLabel = '';
    let asymptoteInfo = '';
    let yFunc;
    const shapes = [];
    const gap = 0.1;

    switch (funcChoice) {
        case '1': // 1/x
            funcLabel = 'f(x) = 1/x';
            asymptoteInfo = 'Horizontal: y = 0 | Vertical: x = 0';
            yFunc = (x) => Math.abs(x) < gap ? null : 1 / x;
            shapes.push(
                { type: 'line', x0: 0, x1: 0, y0: -xRange, y1: xRange, line: { color: '#ff00ff', width: 2, dash: 'dash' } },
                { type: 'line', x0: -xRange, x1: xRange, y0: 0, y1: 0, line: { color: '#ffff00', width: 2, dash: 'dash' } }
            );
            break;
        case '2': // 5/(x² + 1) - Lorentzian
            funcLabel = 'f(x) = 5/(x² + 1)';
            asymptoteInfo = 'Horizontal: y = 0 | No vertical asymptotes';
            yFunc = (x) => 5 / (x * x + 1);
            shapes.push(
                { type: 'line', x0: -xRange, x1: xRange, y0: 0, y1: 0, line: { color: '#ffff00', width: 2, dash: 'dash' } }
            );
            break;
        case '3': // (2x + 1)/(x - 1)
            funcLabel = 'f(x) = (2x + 1)/(x - 1)';
            asymptoteInfo = 'Horizontal: y = 2 | Vertical: x = 1';
            yFunc = (x) => Math.abs(x - 1) < gap ? null : (2 * x + 1) / (x - 1);
            shapes.push(
                { type: 'line', x0: 1, x1: 1, y0: -xRange, y1: xRange, line: { color: '#ff00ff', width: 2, dash: 'dash' } },
                { type: 'line', x0: -xRange, x1: xRange, y0: 2, y1: 2, line: { color: '#ffff00', width: 2, dash: 'dash' } }
            );
            break;
        case '4': // (x² + 1)/x = x + 1/x
            funcLabel = 'f(x) = (x² + 1)/x';
            asymptoteInfo = 'Oblique: y = x | Vertical: x = 0';
            yFunc = (x) => Math.abs(x) < gap ? null : (x * x + 1) / x;
            shapes.push(
                { type: 'line', x0: 0, x1: 0, y0: -xRange * 1.5, y1: xRange * 1.5, line: { color: '#ff00ff', width: 2, dash: 'dash' } },
                { type: 'line', x0: -xRange, x1: xRange, y0: -xRange, y1: xRange, line: { color: '#ffff00', width: 2, dash: 'dash' } }
            );
            break;
        case '5': // 5x/(x² + 1)
            funcLabel = 'f(x) = 5x/(x² + 1)';
            asymptoteInfo = 'Horizontal: y = 0 | No vertical asymptotes';
            yFunc = (x) => 5 * x / (x * x + 1);
            shapes.push(
                { type: 'line', x0: -xRange, x1: xRange, y0: 0, y1: 0, line: { color: '#ffff00', width: 2, dash: 'dash' } }
            );
            break;
    }

    document.getElementById('asymptote-info').textContent = asymptoteInfo;

    // Generate data
    const x = range(-xRange, xRange, xRange / 200);
    const y = x.map(xi => {
        const val = yFunc(xi);
        if (val === null || Math.abs(val) > xRange * 2) return null;
        return val;
    });

    const traces = [{
        x: x,
        y: y,
        type: 'scatter',
        mode: 'lines',
        name: funcLabel,
        line: { color: '#00f3ff', width: 2 },
        connectgaps: false
    }];

    const yMax = funcChoice === '4' ? xRange * 1.5 : Math.min(xRange, 15);

    const layout = {
        title: {
            text: funcLabel,
            font: { color: '#00f3ff', size: 16 }
        },
        xaxis: {
            title: 'x',
            range: [-xRange, xRange],
            zeroline: true,
            zerolinewidth: 2,
            zerolinecolor: '#808080',
            gridcolor: '#2a2f4a'
        },
        yaxis: {
            title: 'f(x)',
            range: [-yMax, yMax],
            zeroline: true,
            zerolinewidth: 2,
            zerolinecolor: '#808080',
            gridcolor: '#2a2f4a'
        },
        shapes: shapes,
        showlegend: false
    };

    createPlot('asymptote-plot', traces, layout);
}

// ============================================================
// EXPLORER 5: Complete Function Analyzer
// ============================================================

function updateCompletePlot() {
    const funcChoice = document.getElementById('complete-function').value;

    let funcLabel = '';
    let zeros = [];
    let divergences = [];
    let extremaInfo = '';
    let asymptoteInfo = '';
    let yFunc;
    const shapes = [];
    const gap = 0.1;
    let xRange = [-6, 8];
    let yRange = [-15, 20];

    switch (funcChoice) {
        case '1': // (x² - 4)/(x - 3)
            funcLabel = 'f(x) = (x² - 4)/(x - 3)';
            zeros = [-2, 2];
            divergences = [3];
            extremaInfo = 'Local max ≈ (0.76, 1.53), Local min ≈ (5.24, 10.47)';
            asymptoteInfo = 'Oblique: y = x + 3';
            yFunc = (x) => Math.abs(x - 3) < gap ? null : (x * x - 4) / (x - 3);
            shapes.push(
                { type: 'line', x0: 3, x1: 3, y0: -20, y1: 25, line: { color: '#ff00ff', width: 2, dash: 'dash' } },
                { type: 'line', x0: -6, x1: 8, y0: -3, y1: 11, line: { color: '#ffff00', width: 2, dash: 'dash' } }
            );
            yRange = [-20, 25];
            break;
        case '2': // (x² - 1)/(x² - 4)
            funcLabel = 'f(x) = (x² - 1)/(x² - 4)';
            zeros = [-1, 1];
            divergences = [-2, 2];
            extremaInfo = 'Local max at x = 0';
            asymptoteInfo = 'Horizontal: y = 1';
            yFunc = (x) => (Math.abs(x - 2) < gap || Math.abs(x + 2) < gap) ? null : (x * x - 1) / (x * x - 4);
            shapes.push(
                { type: 'line', x0: -2, x1: -2, y0: -10, y1: 10, line: { color: '#ff00ff', width: 2, dash: 'dash' } },
                { type: 'line', x0: 2, x1: 2, y0: -10, y1: 10, line: { color: '#ff00ff', width: 2, dash: 'dash' } },
                { type: 'line', x0: -6, x1: 8, y0: 1, y1: 1, line: { color: '#ffff00', width: 2, dash: 'dash' } }
            );
            yRange = [-10, 10];
            break;
        case '3': // x³ - 3x
            funcLabel = 'f(x) = x³ - 3x';
            zeros = [-Math.sqrt(3), 0, Math.sqrt(3)];
            divergences = [];
            extremaInfo = 'Max at x = -1, Min at x = 1';
            asymptoteInfo = 'None (polynomial)';
            yFunc = (x) => x * x * x - 3 * x;
            xRange = [-3, 3];
            yRange = [-5, 5];
            break;
        case '4': // 1/(x² - 1)
            funcLabel = 'f(x) = 1/(x² - 1)';
            zeros = [];
            divergences = [-1, 1];
            extremaInfo = 'Local max at x = 0';
            asymptoteInfo = 'Horizontal: y = 0';
            yFunc = (x) => (Math.abs(x - 1) < gap || Math.abs(x + 1) < gap) ? null : 1 / (x * x - 1);
            shapes.push(
                { type: 'line', x0: -1, x1: -1, y0: -10, y1: 10, line: { color: '#ff00ff', width: 2, dash: 'dash' } },
                { type: 'line', x0: 1, x1: 1, y0: -10, y1: 10, line: { color: '#ff00ff', width: 2, dash: 'dash' } }
            );
            xRange = [-4, 4];
            yRange = [-10, 10];
            break;
        case '5': // (x - 1)/(x² + 1)
            funcLabel = 'f(x) = (x - 1)/(x² + 1)';
            zeros = [1];
            divergences = [];
            extremaInfo = 'Min at x ≈ -0.41, Max at x ≈ 2.41';
            asymptoteInfo = 'Horizontal: y = 0';
            yFunc = (x) => (x - 1) / (x * x + 1);
            xRange = [-5, 5];
            yRange = [-1, 1];
            break;
    }

    // Update analysis display
    const analysisDiv = document.getElementById('complete-analysis');
    analysisDiv.innerHTML = `
        <div style="color: var(--neon-cyan);">● Zeros: ${zeros.length > 0 ? 'x = ' + zeros.map(z => z.toFixed(2)).join(', ') : 'None'}</div>
        <div style="color: var(--neon-magenta);">▼ Divergences: ${divergences.length > 0 ? 'x = ' + divergences.join(', ') : 'None'}</div>
        <div style="color: var(--neon-green);">◆ Extrema: ${extremaInfo}</div>
        <div style="color: var(--neon-yellow);">— Asymptotes: ${asymptoteInfo}</div>
    `;

    // Generate data
    const x = range(xRange[0], xRange[1], (xRange[1] - xRange[0]) / 400);
    const y = x.map(xi => {
        const val = yFunc(xi);
        if (val === null || Math.abs(val) > yRange[1] * 2) return null;
        return val;
    });

    const traces = [{
        x: x,
        y: y,
        type: 'scatter',
        mode: 'lines',
        name: 'f(x)',
        line: { color: '#00f3ff', width: 2 },
        connectgaps: false
    }];

    // Add zero markers
    if (zeros.length > 0) {
        traces.push({
            x: zeros,
            y: zeros.map(() => 0),
            type: 'scatter',
            mode: 'markers',
            name: 'Zeros',
            marker: { color: '#00f3ff', size: 10, symbol: 'circle', line: { color: 'white', width: 1 } }
        });
    }

    const layout = {
        title: {
            text: funcLabel,
            font: { color: '#00f3ff', size: 16 }
        },
        xaxis: {
            title: 'x',
            range: xRange,
            zeroline: true,
            zerolinewidth: 2,
            zerolinecolor: '#808080',
            gridcolor: '#2a2f4a'
        },
        yaxis: {
            title: 'f(x)',
            range: yRange,
            zeroline: true,
            zerolinewidth: 2,
            zerolinecolor: '#808080',
            gridcolor: '#2a2f4a'
        },
        shapes: shapes,
        showlegend: false
    };

    createPlot('complete-plot', traces, layout);
}

// ============================================================
// Initialization
// ============================================================

function initializePlotsWhenReady() {
    // Check if Plotly and createPlot are available
    if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
        setTimeout(initializePlotsWhenReady, 100);
        return;
    }

    // Check if section elements exist (section might not be loaded yet)
    const zerosSlider = document.getElementById('zeros-a-slider');
    if (!zerosSlider) {
        setTimeout(initializePlotsWhenReady, 100);
        return;
    }

    // Initialize all plots
    updateZerosPlot();
    updateDivergencePlot();
    updateExtremaPlot();
    updateAsymptotePlot();
    updateCompletePlot();

    // Set up event listeners for zeros explorer
    document.getElementById('zeros-a-slider').addEventListener('input', updateZerosPlot);
    document.getElementById('zeros-b-slider').addEventListener('input', updateZerosPlot);
    document.getElementById('zeros-c-slider').addEventListener('input', updateZerosPlot);

    // Set up event listeners for divergence explorer
    document.getElementById('div-a-slider').addEventListener('input', updateDivergencePlot);
    document.getElementById('div-b-slider').addEventListener('input', updateDivergencePlot);

    // Set up event listeners for extrema explorer
    document.getElementById('ext-a-slider').addEventListener('input', updateExtremaPlot);
    document.getElementById('ext-b-slider').addEventListener('input', updateExtremaPlot);
    document.getElementById('ext-c-slider').addEventListener('input', updateExtremaPlot);

    // Set up event listeners for asymptote explorer
    document.getElementById('asymp-range-slider').addEventListener('input', updateAsymptotePlot);
}

// Auto-initialize when script loads
initializePlotsWhenReady();
