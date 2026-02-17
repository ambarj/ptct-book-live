// PTCT Book - Reusable Interactive Components

// Initialize all components on a page
function initializeComponents() {
    initializeCopyButtons();
    initializeTabs();
    initializeSliders();
}

// Copy to clipboard functionality for code blocks
function initializeCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const codeBlock = this.closest('.code-block-container').querySelector('code');
            const code = codeBlock.textContent;

            try {
                await navigator.clipboard.writeText(code);
                this.textContent = '✓ Copied!';
                this.classList.add('copied');

                setTimeout(() => {
                    this.textContent = 'Copy';
                    this.classList.remove('copied');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                this.textContent = '✗ Failed';
            }
        });
    });
}

// Tab switching functionality
function initializeTabs() {
    document.querySelectorAll('.tabs').forEach(tabContainer => {
        const buttons = tabContainer.querySelectorAll('.tab-button');
        const contents = tabContainer.querySelectorAll('.tab-content');

        buttons.forEach((button, index) => {
            button.addEventListener('click', function() {
                // Remove active class from all
                buttons.forEach(b => b.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                // Add active class to clicked
                this.classList.add('active');
                contents[index].classList.add('active');
            });
        });
    });
}

// Slider value updates
function initializeSliders() {
    document.querySelectorAll('.slider').forEach(slider => {
        const updateValue = () => {
            const valueDisplay = slider.parentElement.querySelector('.control-label-value');
            if (valueDisplay) {
                valueDisplay.textContent = parseFloat(slider.value).toFixed(2);
            }
        };

        slider.addEventListener('input', updateValue);
        updateValue(); // Initial update
    });
}

// Create a simple plot with Plotly
function createPlot(elementId, data, layout = {}) {
    const defaultLayout = {
        paper_bgcolor: '#0a0e27',
        plot_bgcolor: '#151934',
        font: {
            color: '#e0e0e0',
            family: 'Inter, sans-serif'
        },
        xaxis: {
            gridcolor: '#2a2f4a',
            zerolinecolor: '#808080',
            linecolor: '#808080'
        },
        yaxis: {
            gridcolor: '#2a2f4a',
            zerolinecolor: '#808080',
            linecolor: '#808080'
        },
        margin: { t: 40, r: 40, b: 50, l: 60 },
        autosize: true
    };

    const mergedLayout = { ...defaultLayout, ...layout };

    // Left-align title so it doesn't overlap Plotly toolbar on dual-panel plots
    if (mergedLayout.title) {
        if (typeof mergedLayout.title === 'string') {
            mergedLayout.title = { text: mergedLayout.title };
        }
        if (!mergedLayout.title.x) mergedLayout.title.x = 0.02;
        if (!mergedLayout.title.xanchor) mergedLayout.title.xanchor = 'left';
    }

    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };

    Plotly.newPlot(elementId, data, mergedLayout, config);
}

// Update an existing plot
function updatePlot(elementId, data, layout = {}) {
    Plotly.react(elementId, data, layout);
}

// Helper: Generate range array
function range(start, end, step = 1) {
    const arr = [];
    for (let i = start; i <= end; i += step) {
        arr.push(i);
    }
    return arr;
}

// Helper: Generate function values
function evaluateFunction(func, xValues) {
    return xValues.map(x => func(x));
}

// Example: Create a simple line plot
function createLinePlot(elementId, xData, yData, title = '', xLabel = 'x', yLabel = 'y') {
    const trace = {
        x: xData,
        y: yData,
        type: 'scatter',
        mode: 'lines',
        line: {
            color: '#00f3ff',
            width: 2
        }
    };

    const layout = {
        title: {
            text: title,
            font: {
                color: '#00f3ff',
                size: 18
            }
        },
        xaxis: { title: xLabel },
        yaxis: { title: yLabel }
    };

    createPlot(elementId, [trace], layout);
}

// Example: Create multiple traces
function createMultiPlot(elementId, traces, title = '') {
    const colors = ['#00f3ff', '#ff00ff', '#00ff9f', '#ffff00', '#b026ff'];

    const formattedTraces = traces.map((trace, i) => ({
        x: trace.x,
        y: trace.y,
        type: 'scatter',
        mode: trace.mode || 'lines',
        name: trace.name || `Series ${i + 1}`,
        line: {
            color: colors[i % colors.length],
            width: 2
        }
    }));

    const layout = {
        title: {
            text: title,
            font: {
                color: '#00f3ff',
                size: 18
            }
        },
        showlegend: true,
        legend: {
            bgcolor: 'rgba(0,0,0,0)',
            bordercolor: '#2a2f4a',
            borderwidth: 1
        }
    };

    createPlot(elementId, formattedTraces, layout);
}

// Show/hide loading spinner
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="spinner"></div>';
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '';
    }
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
