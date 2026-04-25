(function() {
    'use strict';

    var darkLayout = {
        template: 'plotly_dark',
        margin: { t: 30, r: 20, b: 45, l: 55 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    };

    function axStyle(range, title) {
        return { gridcolor: '#2a2f4a', zerolinecolor: '#808080', linecolor: '#808080', range: range, title: title || '' };
    }

    // ===== Ising energy =====
    function isingEnergy(spins) {
        var E = 0;
        for (var i = 0; i < spins.length - 1; i++) E -= spins[i] * spins[i + 1];
        return E;
    }

    // ===============================================================
    // EXPLORER 1: Spin Chain Visualizer
    // ===============================================================
    var chainSpins = [];

    function drawSpinChain() {
        var N = chainSpins.length;
        var xPos = [], yPos = [], colors = [], texts = [];
        for (var i = 0; i < N; i++) {
            xPos.push(i); yPos.push(0);
            colors.push(chainSpins[i] === 1 ? '#00f3ff' : '#ff006e');
            texts.push(chainSpins[i] === 1 ? '↑' : '↓');
        }

        // Bond colors
        var bondX = [], bondY = [], bondColors = [];
        for (var i = 0; i < N - 1; i++) {
            var aligned = chainSpins[i] === chainSpins[i + 1];
            bondX.push(i, i + 1, null);
            bondY.push(0, 0, null);
            bondColors.push(aligned ? 'rgba(0,255,136,0.5)' : 'rgba(255,87,34,0.5)');
        }

        // Draw bonds as individual segments
        var traces = [];
        for (var i = 0; i < N - 1; i++) {
            traces.push({
                x: [i, i + 1], y: [0, 0], type: 'scatter', mode: 'lines',
                line: { color: chainSpins[i] === chainSpins[i + 1] ? 'rgba(0,255,136,0.6)' : 'rgba(255,87,34,0.6)', width: 4 },
                hoverinfo: 'none', showlegend: false
            });
        }

        // Spin markers
        traces.push({
            x: xPos, y: yPos, type: 'scatter', mode: 'markers+text',
            marker: { color: colors, size: 30, line: { color: 'white', width: 2 } },
            text: texts, textfont: { size: 18, color: 'white' }, textposition: 'middle center',
            hoverinfo: 'none', showlegend: false
        });

        Plotly.react('im-spinPlot', traces, Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-0.5, N - 0.5], ''), { showticklabels: false, showgrid: false }),
            yaxis: Object.assign(axStyle([-0.5, 0.5], ''), { showticklabels: false, showgrid: false }),
            height: 200
        }), { responsive: true });

        // Make clickable
        var plotEl = document.getElementById('im-spinPlot');
        plotEl.removeAllListeners && plotEl.removeAllListeners('plotly_click');
        plotEl.on('plotly_click', function(data) {
            if (data.points && data.points.length > 0) {
                var idx = data.points[0].pointIndex;
                if (idx !== undefined && idx < chainSpins.length) {
                    chainSpins[idx] *= -1;
                    drawSpinChain();
                }
            }
        });

        var E = isingEnergy(chainSpins);
        var M = 0;
        for (var i = 0; i < N; i++) M += chainSpins[i];
        var nAligned = 0;
        for (var i = 0; i < N - 1; i++) if (chainSpins[i] === chainSpins[i + 1]) nAligned++;

        document.getElementById('im-stats1').innerHTML =
            '<span><strong>E = ' + E + 'J</strong>  |  Magnetization M = ' + M + '</span>' +
            '<span>N = ' + N + ' spins  |  ' + nAligned + '/' + (N - 1) + ' aligned pairs</span>';
    }

    function initChain(N) {
        chainSpins = [];
        for (var i = 0; i < N; i++) chainSpins.push(Math.random() < 0.5 ? 1 : -1);
    }

    window.imRandomize = function() { initChain(chainSpins.length); drawSpinChain(); };
    window.imAllUp = function() { for (var i = 0; i < chainSpins.length; i++) chainSpins[i] = 1; drawSpinChain(); };
    window.imReset = function() {
        var N = parseInt(document.getElementById('im-N-slider').value);
        initChain(N); drawSpinChain();
    };

    // ===============================================================
    // EXPLORER 2: Temperature Explorer
    // ===============================================================
    function drawTemperature() {
        var T = parseFloat(document.getElementById('im-T-slider').value);
        var N = parseInt(document.getElementById('im-small-N-slider').value);
        var nConfigs = Math.pow(2, N);

        // Enumerate all configurations
        var energies = [], weights = [];
        var Z = 0;
        for (var c = 0; c < nConfigs; c++) {
            var spins = [];
            for (var i = 0; i < N; i++) spins.push(((c >> i) & 1) * 2 - 1);
            var E = isingEnergy(spins);
            var w = Math.exp(-E / T);
            energies.push(E);
            weights.push(w);
            Z += w;
        }

        // Normalized probabilities
        var probs = weights.map(function(w) { return w / Z; });

        // Group by energy level
        var energyLevels = {};
        for (var c = 0; c < nConfigs; c++) {
            var E = energies[c];
            if (!energyLevels[E]) energyLevels[E] = { count: 0, totalProb: 0 };
            energyLevels[E].count++;
            energyLevels[E].totalProb += probs[c];
        }

        var eLevels = Object.keys(energyLevels).map(Number).sort(function(a, b) { return a - b; });
        var counts = eLevels.map(function(E) { return energyLevels[E].count; });
        var totalProbs = eLevels.map(function(E) { return energyLevels[E].totalProb; });
        var eLabels = eLevels.map(function(E) { return E + 'J'; });

        // Left: probability by energy level (weighted)
        Plotly.react('im-weightPlot', [
            { x: eLabels, y: totalProbs, type: 'bar', marker: { color: '#00f3ff' }, name: 'Boltzmann probability' },
            { x: eLabels, y: counts.map(function(c) { return c / nConfigs; }), type: 'bar',
              marker: { color: 'rgba(255,190,11,0.4)' }, name: 'Degeneracy (unweighted)' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle(null, 'Energy level'), yaxis: axStyle([0, 1], 'Probability'),
            height: 400, barmode: 'group',
            legend: { x: 0.4, y: 0.98, font: { color: '#aaa', size: 9 } }
        }), { responsive: true });

        // Right: ⟨E⟩ vs T
        var Ts = [], avgEs = [];
        for (var ti = 0; ti < 50; ti++) {
            var Tv = 0.2 + ti * 4.8 / 49;
            Ts.push(Tv);
            var Zv = 0, sumE = 0;
            for (var c = 0; c < nConfigs; c++) {
                var w = Math.exp(-energies[c] / Tv);
                Zv += w; sumE += energies[c] * w;
            }
            avgEs.push(sumE / Zv);
        }

        Plotly.react('im-avgPlot', [
            { x: Ts, y: avgEs, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 2.5 }, name: '⟨E⟩' },
            { x: [T], y: [avgEs[Math.round((T - 0.2) / 4.8 * 49)]],
              type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 14, line: { color: 'white', width: 2 } },
              name: 'Current T' },
            { x: [0, 5], y: [-(N - 1), -(N - 1)], type: 'scatter', mode: 'lines',
              line: { color: 'rgba(255,255,255,0.3)', width: 1, dash: 'dot' }, name: 'Ground state' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 5], 'T/J'), yaxis: axStyle([-(N - 1) - 0.5, 1], '⟨E⟩/J'),
            height: 400, legend: { x: 0.55, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        var avgE = 0;
        for (var c = 0; c < nConfigs; c++) avgE += energies[c] * probs[c];
        document.getElementById('im-stats2').innerHTML =
            '<span><strong>N = ' + N + ', T/J = ' + T.toFixed(1) + '</strong></span>' +
            '<span>2^N = ' + nConfigs + ' configs  |  ⟨E⟩ = ' + avgE.toFixed(2) + 'J  |  Z = ' + Z.toFixed(1) + '</span>';
    }

    window.imTempReset = function() {
        document.getElementById('im-T-slider').value = 1;
        document.getElementById('im-small-N-slider').value = 6;
        document.getElementById('im-T-value').textContent = '1.0';
        document.getElementById('im-small-N-value').textContent = '6';
        drawTemperature();
    };

    // ===============================================================
    // EXPLORER 3: Brute Force Scaling
    // ===============================================================
    function drawBrute() {
        var N = parseInt(document.getElementById('im-brute-N-slider').value);
        var T = parseFloat(document.getElementById('im-brute-T-slider').value);
        var nConfigs = Math.pow(2, N);

        // Enumerate (only if feasible)
        if (N <= 12) {
            var energies = [];
            for (var c = 0; c < nConfigs; c++) {
                var spins = [];
                for (var i = 0; i < N; i++) spins.push(((c >> i) & 1) * 2 - 1);
                energies.push(isingEnergy(spins));
            }

            // Energy histogram (unweighted and weighted)
            var bins = {};
            for (var c = 0; c < nConfigs; c++) {
                var E = energies[c];
                if (!bins[E]) bins[E] = { count: 0, weight: 0 };
                bins[E].count++;
                bins[E].weight += Math.exp(-E / T);
            }

            var Z = 0;
            for (var E in bins) Z += bins[E].weight;

            var eLevels = Object.keys(bins).map(Number).sort(function(a, b) { return a - b; });
            var eLabels = eLevels.map(function(E) { return E + 'J'; });
            var countVals = eLevels.map(function(E) { return bins[E].count; });
            var probVals = eLevels.map(function(E) { return bins[E].weight / Z; });

            Plotly.react('im-bruteBarPlot', [
                { x: eLabels, y: countVals, type: 'bar', marker: { color: 'rgba(255,190,11,0.5)' }, name: 'Degeneracy (count)', yaxis: 'y' },
                { x: eLabels, y: probVals, type: 'scatter', mode: 'lines+markers',
                  line: { color: '#00f3ff', width: 2 }, marker: { color: '#00f3ff', size: 6 },
                  name: 'Boltzmann prob', yaxis: 'y2' }
            ], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, 'Energy'), yaxis: axStyle(null, 'Count'),
                yaxis2: { title: 'Probability', overlaying: 'y', side: 'right', gridcolor: 'rgba(0,0,0,0)',
                    zerolinecolor: '#808080', titlefont: { color: '#00f3ff' }, tickfont: { color: '#00f3ff' } },
                height: 400, legend: { x: 0.4, y: 0.98, font: { color: '#aaa', size: 9 } }
            }), { responsive: true });
        }

        // Scaling plot: 2^N vs N
        var dims = [], vals = [];
        for (var n = 1; n <= 30; n++) {
            dims.push(n);
            vals.push(Math.pow(2, n));
        }

        Plotly.react('im-scalingPlot', [
            { x: dims, y: vals, type: 'scatter', mode: 'lines+markers',
              line: { color: '#ff006e', width: 2 }, marker: { color: '#ff006e', size: 4 }, name: '2^N' },
            { x: [N], y: [Math.pow(2, N)], type: 'scatter', mode: 'markers',
              marker: { color: '#ffbe0b', size: 14, line: { color: 'white', width: 2 } },
              name: 'Current N = ' + N }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 31], 'N (spins)'),
            yaxis: Object.assign(axStyle(null, 'Number of configurations'), { type: 'log' }),
            height: 400, legend: { x: 0.02, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        document.getElementById('im-stats3').innerHTML =
            '<span><strong>N = ' + N + ': 2^N = ' + nConfigs.toLocaleString() + ' configurations</strong></span>' +
            '<span>' + (N <= 20 ? 'Brute force feasible' : 'Brute force IMPOSSIBLE — need Monte Carlo!') + '</span>';
    }

    window.imBruteReset = function() {
        document.getElementById('im-brute-N-slider').value = 6;
        document.getElementById('im-brute-T-slider').value = 1;
        document.getElementById('im-brute-N-value').textContent = '6';
        document.getElementById('im-brute-T-value').textContent = '1.0';
        drawBrute();
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('im-spinPlot')) { setTimeout(initializePlots, 100); return; }

        // Explorer 1
        initChain(parseInt(document.getElementById('im-N-slider').value));
        drawSpinChain();
        document.getElementById('im-N-slider').addEventListener('input', function() {
            document.getElementById('im-N-value').textContent = this.value;
            initChain(parseInt(this.value));
            drawSpinChain();
        });

        // Explorer 2
        drawTemperature();
        document.getElementById('im-T-slider').addEventListener('input', function() {
            document.getElementById('im-T-value').textContent = parseFloat(this.value).toFixed(1);
            drawTemperature();
        });
        document.getElementById('im-small-N-slider').addEventListener('input', function() {
            document.getElementById('im-small-N-value').textContent = this.value;
            drawTemperature();
        });

        // Explorer 3
        drawBrute();
        document.getElementById('im-brute-N-slider').addEventListener('input', function() {
            document.getElementById('im-brute-N-value').textContent = this.value;
            drawBrute();
        });
        document.getElementById('im-brute-T-slider').addEventListener('input', function() {
            document.getElementById('im-brute-T-value').textContent = parseFloat(this.value).toFixed(1);
            drawBrute();
        });
    }

    initializePlots();
})();
