// Section 1.1: Visual Thinking Introduction - Interactive Components

// Linear function plotter
function plotLinear() {
    const m = parseFloat(document.getElementById('slope-slider').value);
    const b = parseFloat(document.getElementById('intercept-slider').value);

    const x = range(-10, 10, 0.1);
    const y = x.map(xi => m * xi + b);

    const trace = {
        x: x,
        y: y,
        type: 'scatter',
        mode: 'lines',
        line: { color: '#00f3ff', width: 2 }
    };

    const layout = {
        title: {
            text: `f(x) = ${m.toFixed(1)}x + ${b.toFixed(1)}`,
            font: { color: '#00f3ff', size: 16 }
        },
        xaxis: {
            title: 'x',
            range: [-10, 10],
            zeroline: true,
            zerolinewidth: 2,
            zerolinecolor: '#808080'
        },
        yaxis: {
            title: 'f(x)',
            range: [-35, 35],
            zeroline: true,
            zerolinewidth: 2,
            zerolinecolor: '#808080'
        }
    };

    createPlot('linear-plot', [trace], layout);
}

function resetLinear() {
    document.getElementById('slope-slider').value = 2;
    document.getElementById('intercept-slider').value = -5;
    plotLinear();
}

// Quadratic function plotter
function plotQuadratic() {
    const a = parseFloat(document.getElementById('a-slider').value);
    const b = parseFloat(document.getElementById('b-slider').value);
    const c = parseFloat(document.getElementById('c-slider').value);

    const x = range(-10, 10, 0.1);
    const y = x.map(xi => a * xi * xi + b * xi + c);

    // Calculate vertex for highlighting and display
    let vertexTrace = null;
    let vertexText = 'N/A (a = 0)';

    if (a !== 0) {
        const xv = -b / (2 * a);
        const yv = a * xv * xv + b * xv + c;

        vertexTrace = {
            x: [xv],
            y: [yv],
            type: 'scatter',
            mode: 'markers',
            marker: { color: '#ff00ff', size: 10 },
            name: 'Vertex',
            showlegend: false
        };

        const vertexType = a > 0 ? 'Minimum' : 'Maximum';
        vertexText = `${vertexType}: (${xv.toFixed(2)}, ${yv.toFixed(2)})`;
    }

    // Update vertex display
    const vertexDisplay = document.getElementById('vertex-display');
    if (vertexDisplay) {
        vertexDisplay.textContent = vertexText;
    }

    const trace = {
        x: x,
        y: y,
        type: 'scatter',
        mode: 'lines',
        name: 'f(x)',
        line: { color: '#00f3ff', width: 2 },
        showlegend: false
    };

    const data = vertexTrace ? [trace, vertexTrace] : [trace];

    const layout = {
        title: {
            text: `f(x) = ${a.toFixed(1)}x² + ${b.toFixed(1)}x + ${c.toFixed(1)}`,
            font: { color: '#00f3ff', size: 16 }
        },
        xaxis: {
            title: 'x',
            range: [-10, 10],
            zeroline: true,
            zerolinewidth: 2,
            zerolinecolor: '#808080'
        },
        yaxis: {
            title: 'f(x)',
            range: [-25, 50],
            zeroline: true,
            zerolinewidth: 2,
            zerolinecolor: '#808080'
        }
    };

    createPlot('quadratic-plot', data, layout);
}

function resetQuadratic() {
    document.getElementById('a-slider').value = 1;
    document.getElementById('b-slider').value = 0;
    document.getElementById('c-slider').value = 0;
    plotQuadratic();
}


// Growth comparison plotter
function updateGrowthPlot() {
    const maxX = parseFloat(document.getElementById('range-slider').value);
    const x = range(0, maxX, maxX / 100);  // Start from 0, dynamic based on slider

    const colors = ['#00f3ff', '#ff00ff', '#00ff9f', '#ffff00'];

    const traces = [
        { x: x, y: x.map(xi => Math.sqrt(xi)), name: '√x', color: colors[0] },
        { x: x, y: x, name: 'x', color: colors[1] },
        { x: x, y: x.map(xi => xi * xi), name: 'x²', color: colors[2] },
        { x: x, y: x.map(xi => xi * xi * xi), name: 'x³', color: colors[3] }
    ];

    const formattedTraces = traces.map((trace, i) => ({
        x: trace.x,
        y: trace.y,
        type: 'scatter',
        mode: 'lines',
        name: trace.name,
        line: { color: trace.color, width: 2 }
    }));

    const layout = {
        title: {
            text: 'Function Growth Comparison',
            font: { color: '#00f3ff', size: 16 }
        },
        xaxis: {
            title: 'x',
            range: [0, maxX],  // Dynamic based on slider
            gridcolor: '#2a2f4a',
            zerolinecolor: '#808080',
            linecolor: '#808080'
        },
        yaxis: {
            title: 'f(x)',
            range: [0, maxX * maxX * maxX * 1.1],  // Dynamic based on slider
            gridcolor: '#2a2f4a',
            zerolinecolor: '#808080',
            linecolor: '#808080'
        },
        showlegend: true,
        legend: {
            bgcolor: 'rgba(0,0,0,0)',
            bordercolor: '#2a2f4a',
            borderwidth: 1,
            font: { color: '#e0e0e0' }
        }
    };

    createPlot('growth-plot', formattedTraces, layout);
}

// Initialize plots when ready
function initializePlotsWhenReady() {
    if (typeof Plotly !== 'undefined') {
        plotLinear();
        plotQuadratic();
        updateGrowthPlot();

        // Update on slider change
        document.getElementById('slope-slider').addEventListener('input', plotLinear);
        document.getElementById('intercept-slider').addEventListener('input', plotLinear);

        document.getElementById('a-slider').addEventListener('input', plotQuadratic);
        document.getElementById('b-slider').addEventListener('input', plotQuadratic);
        document.getElementById('c-slider').addEventListener('input', plotQuadratic);

        document.getElementById('range-slider').addEventListener('input', updateGrowthPlot);
    } else {
        setTimeout(initializePlotsWhenReady, 100);
    }
}

// Auto-initialize when script loads
initializePlotsWhenReady();
