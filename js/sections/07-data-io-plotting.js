(function() {
    'use strict';

    // ============================================
    // Function definitions (shared by Explorer 1 & 2)
    // ============================================

    const functionDefs = {
        gaussian: {
            label: 'Gaussian: exp(-x\u00B2)',
            fn: function(x) { return Math.exp(-x * x); },
            xRange: [-3, 3]
        },
        sine: {
            label: 'Sine: sin(x)',
            fn: function(x) { return Math.sin(x); },
            xRange: [0, 10]
        },
        cubic: {
            label: 'Cubic: x\u00B3 - 3x',
            fn: function(x) { return x * x * x - 3 * x; },
            xRange: [-2.5, 2.5]
        },
        decay: {
            label: 'Exp. Decay: 5\u00B7exp(-x/2)',
            fn: function(x) { return 5 * Math.exp(-0.5 * x); },
            xRange: [0, 10]
        }
    };

    // Functions for Scale Explorer (always positive for log scale)
    const scaleFunctions = {
        exponential: {
            label: 'Exp. Decay: 10\u00B7exp(-0.3x)',
            fn: function(x) { return 10 * Math.exp(-0.3 * x); },
            xRange: [0.1, 15]
        },
        powerlaw: {
            label: 'Power Law: 10 \u00D7 x^1.5',
            fn: function(x) { return 10 * Math.pow(x, 1.5); },
            xRange: [0.5, 20]
        },
        gaussian_pos: {
            label: 'Gaussian: 10\u00B7exp(-x\u00B2/4)',
            fn: function(x) { return 10 * Math.exp(-x * x / 4); },
            xRange: [0.1, 5]
        }
    };

    // ============================================
    // Noise cache (stable noise during slider drag)
    // ============================================

    var noiseValues = [];
    var noiseNPoints = 0;
    var currentScaleType = 'linear';

    function ensureNoise(n) {
        if (n !== noiseNPoints) {
            regenerateNoiseValues(n);
        }
    }

    function regenerateNoiseValues(n) {
        noiseValues = [];
        for (var i = 0; i < n; i++) {
            noiseValues.push(Math.random() * 2 - 1);
        }
        noiseNPoints = n;
    }

    // ============================================
    // Helper: compute y-range from data
    // ============================================

    function computeYRange(yValues, padding) {
        var yMin = yValues[0], yMax = yValues[0];
        for (var i = 1; i < yValues.length; i++) {
            if (yValues[i] < yMin) yMin = yValues[i];
            if (yValues[i] > yMax) yMax = yValues[i];
        }
        var margin = (yMax - yMin) * padding;
        if (margin < 0.1) margin = 0.1;
        return [yMin - margin, yMax + margin];
    }

    // ============================================
    // Explorer 1: Function to Data
    // ============================================

    function plotFunctionToData() {
        var funcKey = document.getElementById('dataIO-func-select').value;
        var nPoints = parseInt(document.getElementById('dataIO-npoints-slider').value);
        var func = functionDefs[funcKey];
        var xMin = func.xRange[0], xMax = func.xRange[1];

        // Continuous reference curve (200 points)
        var xCont = [], yCont = [];
        for (var i = 0; i <= 200; i++) {
            var x = xMin + (xMax - xMin) * i / 200;
            xCont.push(x);
            yCont.push(func.fn(x));
        }

        // Discrete sample points
        var xDisc = [], yDisc = [];
        for (var j = 0; j < nPoints; j++) {
            var xd = xMin + (xMax - xMin) * j / (nPoints - 1);
            xDisc.push(xd);
            yDisc.push(func.fn(xd));
        }

        var yRange = computeYRange(yCont, 0.15);

        var traces = [
            {
                x: xCont, y: yCont, mode: 'lines',
                name: 'True function',
                line: { color: '#808080', width: 1.5, dash: 'dot' },
                hoverinfo: 'skip'
            },
            {
                x: xDisc, y: yDisc, mode: 'markers',
                name: nPoints + ' data points',
                marker: { color: '#00f3ff', size: 8, line: { color: '#00f3ff', width: 1 } }
            }
        ];

        var layout = {
            title: { text: func.label + ' \u2014 ' + nPoints + ' samples', font: { size: 14 } },
            xaxis: {
                title: 'x', range: [xMin - 0.3, xMax + 0.3],
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            yaxis: {
                title: 'f(x)', range: yRange,
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            showlegend: true,
            legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)' }
        };

        createPlot('dataIO-function-plot', traces, layout);
    }

    // ============================================
    // Explorer 2: Noise Explorer
    // ============================================

    function plotNoise() {
        var funcKey = document.getElementById('dataIO-noise-func-select').value;
        var nPoints = parseInt(document.getElementById('dataIO-noise-npoints-slider').value);
        var noiseLevel = parseFloat(document.getElementById('dataIO-noise-level-slider').value) / 100;
        var func = functionDefs[funcKey];
        var xMin = func.xRange[0], xMax = func.xRange[1];

        ensureNoise(nPoints);

        // Compute clean data
        var xData = [], yClean = [];
        for (var i = 0; i < nPoints; i++) {
            var x = xMin + (xMax - xMin) * i / (nPoints - 1);
            xData.push(x);
            yClean.push(func.fn(x));
        }

        // Compute amplitude for noise scaling
        var yMin = yClean[0], yMax = yClean[0];
        for (var k = 1; k < yClean.length; k++) {
            if (yClean[k] < yMin) yMin = yClean[k];
            if (yClean[k] > yMax) yMax = yClean[k];
        }
        var amplitude = yMax - yMin;
        if (amplitude < 0.01) amplitude = 1;

        // Apply noise
        var yNoisy = [];
        for (var j = 0; j < nPoints; j++) {
            yNoisy.push(yClean[j] + noiseLevel * amplitude * noiseValues[j]);
        }

        // Reference curve
        var xCont = [], yCont = [];
        for (var m = 0; m <= 200; m++) {
            var xc = xMin + (xMax - xMin) * m / 200;
            xCont.push(xc);
            yCont.push(func.fn(xc));
        }

        // Y-range: accommodate max noise (50%)
        var worstMargin = 0.6 * amplitude;
        var yRangeLow = yMin - worstMargin;
        var yRangeHigh = yMax + worstMargin;

        var traces = [
            {
                x: xCont, y: yCont, mode: 'lines',
                name: 'True function',
                line: { color: '#808080', width: 1.5, dash: 'dot' },
                hoverinfo: 'skip'
            },
            {
                x: xData, y: yNoisy, mode: 'markers',
                name: Math.round(noiseLevel * 100) + '% noise',
                marker: { color: '#ff00ff', size: 7, opacity: 0.85 }
            }
        ];

        var noisePct = Math.round(noiseLevel * 100);
        var layout = {
            title: { text: func.label + ' \u2014 ' + nPoints + ' pts, ' + noisePct + '% noise', font: { size: 14 } },
            xaxis: {
                title: 'x', range: [xMin - 0.3, xMax + 0.3],
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            yaxis: {
                title: 'f(x)', range: [yRangeLow, yRangeHigh],
                gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080'
            },
            showlegend: true,
            legend: { x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)' }
        };

        createPlot('dataIO-noise-plot', traces, layout);
    }

    // ============================================
    // Explorer 3: Scale Explorer
    // ============================================

    function plotScale() {
        var funcKey = document.getElementById('dataIO-scale-func-select').value;
        var func = scaleFunctions[funcKey];
        var xMin = func.xRange[0], xMax = func.xRange[1];

        // Generate data points
        var nPts = 60;
        var xData = [], yData = [];
        for (var i = 0; i < nPts; i++) {
            var x = xMin + (xMax - xMin) * i / (nPts - 1);
            xData.push(x);
            yData.push(func.fn(x));
        }

        var traces = [
            {
                x: xData, y: yData, mode: 'lines+markers',
                name: 'Data',
                line: { color: '#00f3ff', width: 2 },
                marker: { color: '#00f3ff', size: 4 }
            }
        ];

        // Build axis configuration based on scale type
        var xaxisConfig = {
            title: 'x', gridcolor: '#2a2f4a',
            zerolinecolor: '#808080', linecolor: '#808080'
        };
        var yaxisConfig = {
            title: 'f(x)', gridcolor: '#2a2f4a',
            zerolinecolor: '#808080', linecolor: '#808080'
        };

        var scaleLabel = 'Linear';
        if (currentScaleType === 'semilog') {
            yaxisConfig.type = 'log';
            scaleLabel = 'Semi-log';
        } else if (currentScaleType === 'loglog') {
            xaxisConfig.type = 'log';
            yaxisConfig.type = 'log';
            scaleLabel = 'Log-log';
        }

        var layout = {
            title: { text: func.label + ' \u2014 ' + scaleLabel + ' scale', font: { size: 14 } },
            xaxis: xaxisConfig,
            yaxis: yaxisConfig,
            showlegend: false
        };

        createPlot('dataIO-scale-plot', traces, layout);
    }

    // ============================================
    // Scale button toggling
    // ============================================

    function updateScaleButtons() {
        var types = ['linear', 'semilog', 'loglog'];
        for (var i = 0; i < types.length; i++) {
            var btn = document.getElementById('dataIO-' + types[i] + '-btn');
            if (btn) {
                if (types[i] === currentScaleType) {
                    btn.style.background = 'rgba(0, 243, 255, 0.2)';
                    btn.style.borderColor = '#00f3ff';
                    btn.style.color = '#00f3ff';
                } else {
                    btn.style.background = '';
                    btn.style.borderColor = '';
                    btn.style.color = '';
                }
            }
        }
    }

    // ============================================
    // Noise level display (manual since it shows %)
    // ============================================

    function updateNoiseDisplay() {
        var slider = document.getElementById('dataIO-noise-level-slider');
        if (!slider) return;
        var label = slider.closest('.control-group');
        if (label) {
            var valSpan = label.querySelector('.control-label-value');
            if (valSpan) {
                valSpan.textContent = slider.value + '%';
            }
        }
    }

    // ============================================
    // Event handlers
    // ============================================

    function attachEventHandlers() {
        // Explorer 1
        var funcSelect = document.getElementById('dataIO-func-select');
        var npointsSlider = document.getElementById('dataIO-npoints-slider');
        if (funcSelect) funcSelect.addEventListener('change', plotFunctionToData);
        if (npointsSlider) npointsSlider.addEventListener('input', plotFunctionToData);

        // Explorer 2
        var noiseFuncSelect = document.getElementById('dataIO-noise-func-select');
        var noiseNpointsSlider = document.getElementById('dataIO-noise-npoints-slider');
        var noiseLevelSlider = document.getElementById('dataIO-noise-level-slider');

        if (noiseFuncSelect) noiseFuncSelect.addEventListener('change', plotNoise);
        if (noiseNpointsSlider) {
            noiseNpointsSlider.addEventListener('input', function() {
                // Changing point count regenerates noise
                var n = parseInt(this.value);
                regenerateNoiseValues(n);
                plotNoise();
            });
        }
        if (noiseLevelSlider) {
            noiseLevelSlider.addEventListener('input', function() {
                updateNoiseDisplay();
                plotNoise();
            });
        }

        // Explorer 3
        var scaleFuncSelect = document.getElementById('dataIO-scale-func-select');
        if (scaleFuncSelect) scaleFuncSelect.addEventListener('change', plotScale);
    }

    // ============================================
    // Initialization
    // ============================================

    function initializePlots() {
        // Check dependencies
        if (typeof Plotly === 'undefined' || typeof createPlot !== 'function') {
            setTimeout(initializePlots, 100);
            return;
        }

        // Check DOM elements exist
        var plot1 = document.getElementById('dataIO-function-plot');
        var plot2 = document.getElementById('dataIO-noise-plot');
        var plot3 = document.getElementById('dataIO-scale-plot');

        if (!plot1 || !plot2 || !plot3) {
            setTimeout(initializePlots, 100);
            return;
        }

        // Initialize noise cache for Explorer 2 default (50 points)
        regenerateNoiseValues(50);

        // Draw all plots
        plotFunctionToData();
        plotNoise();
        updateScaleButtons();
        plotScale();

        // Attach handlers
        attachEventHandlers();
    }

    // ============================================
    // Global functions (for onclick attributes)
    // ============================================

    window.resetFunctionExplorer = function() {
        var funcSelect = document.getElementById('dataIO-func-select');
        var npointsSlider = document.getElementById('dataIO-npoints-slider');
        if (funcSelect) funcSelect.value = 'gaussian';
        if (npointsSlider) {
            npointsSlider.value = 20;
            var label = npointsSlider.closest('.control-group');
            if (label) {
                var valSpan = label.querySelector('.control-label-value');
                if (valSpan) valSpan.textContent = '20';
            }
        }
        plotFunctionToData();
    };

    window.resetNoiseExplorer = function() {
        var funcSelect = document.getElementById('dataIO-noise-func-select');
        var npointsSlider = document.getElementById('dataIO-noise-npoints-slider');
        var noiseSlider = document.getElementById('dataIO-noise-level-slider');
        if (funcSelect) funcSelect.value = 'gaussian';
        if (npointsSlider) {
            npointsSlider.value = 50;
            var label = npointsSlider.closest('.control-group');
            if (label) {
                var valSpan = label.querySelector('.control-label-value');
                if (valSpan) valSpan.textContent = '50';
            }
        }
        if (noiseSlider) {
            noiseSlider.value = 20;
        }
        regenerateNoiseValues(50);
        updateNoiseDisplay();
        plotNoise();
    };

    window.newNoiseSample = function() {
        var nPoints = parseInt(document.getElementById('dataIO-noise-npoints-slider').value) || 50;
        regenerateNoiseValues(nPoints);
        plotNoise();
    };

    window.setScaleType = function(type) {
        currentScaleType = type;
        updateScaleButtons();
        plotScale();
    };

    window.resetScaleExplorer = function() {
        var funcSelect = document.getElementById('dataIO-scale-func-select');
        if (funcSelect) funcSelect.value = 'exponential';
        currentScaleType = 'linear';
        updateScaleButtons();
        plotScale();
    };

    // Auto-initialize
    initializePlots();
})();
