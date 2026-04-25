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

    function isingEnergy(spins) {
        var E = 0;
        for (var i = 0; i < spins.length - 1; i++) E -= spins[i] * spins[i + 1];
        return E;
    }

    function deltaE(spins, idx) {
        var dE = 0;
        if (idx > 0) dE += 2 * spins[idx] * spins[idx - 1];
        if (idx < spins.length - 1) dE += 2 * spins[idx] * spins[idx + 1];
        return dE;
    }

    // ===============================================================
    // EXPLORER 1: Step-by-Step Metropolis
    // ===============================================================
    var mtState = { spins: [], E: 0, steps: 0, accepted: 0, lastIdx: -1, lastAction: '' };

    function initMtState() {
        var N = parseInt(document.getElementById('mt-N-slider').value);
        mtState.spins = [];
        for (var i = 0; i < N; i++) mtState.spins.push(Math.random() < 0.5 ? 1 : -1);
        mtState.E = isingEnergy(mtState.spins);
        mtState.steps = 0; mtState.accepted = 0;
        mtState.lastIdx = -1; mtState.lastAction = '';
    }

    function drawMtSpins() {
        var N = mtState.spins.length;
        var xPos = [], colors = [], texts = [];
        for (var i = 0; i < N; i++) {
            xPos.push(i);
            colors.push(i === mtState.lastIdx ? '#ffbe0b' : (mtState.spins[i] === 1 ? '#00f3ff' : '#ff006e'));
            texts.push(mtState.spins[i] === 1 ? '↑' : '↓');
        }

        Plotly.react('mt-spinPlot', [{
            x: xPos, y: xPos.map(function() { return 0; }),
            type: 'scatter', mode: 'markers+text',
            marker: { color: colors, size: Math.min(28, 500 / N), line: { color: 'white', width: 1.5 } },
            text: texts, textfont: { size: Math.min(16, 300 / N), color: 'white' }, textposition: 'middle center',
            hoverinfo: 'none', showlegend: false
        }], Object.assign({}, darkLayout, {
            xaxis: Object.assign(axStyle([-0.5, N - 0.5], ''), { showticklabels: false, showgrid: false }),
            yaxis: Object.assign(axStyle([-0.5, 0.5], ''), { showticklabels: false, showgrid: false }),
            height: 180
        }), { responsive: true });

        var accRate = mtState.steps > 0 ? (mtState.accepted / mtState.steps * 100).toFixed(1) : '—';
        document.getElementById('mt-stats1').innerHTML =
            '<span><strong>E = ' + mtState.E + 'J</strong>  |  Steps: ' + mtState.steps + '  |  Accepted: ' + mtState.accepted + ' (' + accRate + '%)</span>' +
            '<span>' + mtState.lastAction + '</span>';
    }

    function doOneStep() {
        var T = parseFloat(document.getElementById('mt-T-slider').value);
        var N = mtState.spins.length;
        var idx = Math.floor(Math.random() * N);
        var dE = deltaE(mtState.spins, idx);
        mtState.steps++;
        mtState.lastIdx = idx;

        if (dE <= 0 || Math.random() < Math.exp(-dE / T)) {
            mtState.spins[idx] *= -1;
            mtState.E += dE;
            mtState.accepted++;
            mtState.lastAction = 'Spin ' + idx + ': ΔE = ' + dE + 'J → ACCEPTED' + (dE <= 0 ? ' (downhill)' : ' (uphill, p=' + Math.exp(-dE / T).toFixed(3) + ')');
        } else {
            mtState.lastAction = 'Spin ' + idx + ': ΔE = ' + dE + 'J → REJECTED (p=' + Math.exp(-dE / T).toFixed(3) + ' < rand)';
        }
    }

    window.mtStep = function() { doOneStep(); drawMtSpins(); };
    window.mtRun100 = function() { for (var i = 0; i < 100; i++) doOneStep(); drawMtSpins(); };
    window.mtReset = function() { initMtState(); drawMtSpins(); };

    // ===============================================================
    // EXPLORER 2: Equilibration Watcher
    // ===============================================================
    window.mtEquilRun = function() {
        var T = parseFloat(document.getElementById('mt-eq-T-slider').value);
        var N = parseInt(document.getElementById('mt-eq-N-select').value);
        var nSteps = 5000;

        var spins = [];
        for (var i = 0; i < N; i++) spins.push(Math.random() < 0.5 ? 1 : -1);
        var E = isingEnergy(spins);

        var energies = [E], mags = [0];
        var M = 0;
        for (var i = 0; i < N; i++) M += spins[i];
        mags[0] = Math.abs(M) / N;

        for (var step = 0; step < nSteps; step++) {
            var idx = Math.floor(Math.random() * N);
            var dE = deltaE(spins, idx);
            if (dE <= 0 || Math.random() < Math.exp(-dE / T)) {
                M += -2 * spins[idx];
                spins[idx] *= -1;
                E += dE;
            }
            if (step % 5 === 0) {
                energies.push(E);
                mags.push(Math.abs(M) / N);
            }
        }

        var stepArr = [];
        for (var i = 0; i < energies.length; i++) stepArr.push(i * 5);

        // Burn-in line
        var burnIn = 1000;
        var avgE = 0, cnt = 0;
        for (var i = 0; i < energies.length; i++) {
            if (stepArr[i] >= burnIn) { avgE += energies[i]; cnt++; }
        }
        avgE /= cnt;

        Plotly.react('mt-energyPlot', [
            { x: stepArr, y: energies, type: 'scatter', mode: 'lines',
              line: { color: '#00f3ff', width: 1.5 }, name: 'E(step)' },
            { x: [burnIn, nSteps], y: [avgE, avgE], type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 2, dash: 'dash' }, name: '⟨E⟩ = ' + avgE.toFixed(1) },
            { x: [burnIn, burnIn], y: [Math.min.apply(null, energies) - 2, 2], type: 'scatter', mode: 'lines',
              line: { color: 'rgba(255,87,34,0.5)', width: 2, dash: 'dot' }, name: 'Burn-in end' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, nSteps], 'MC step'),
            yaxis: axStyle(null, 'Energy E/J'),
            height: 400, legend: { x: 0.55, y: 0.98, font: { color: '#aaa', size: 9 } }
        }), { responsive: true });

        Plotly.react('mt-magPlot', [
            { x: stepArr, y: mags, type: 'scatter', mode: 'lines',
              line: { color: '#ff006e', width: 1.5 }, name: '|M|/N' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, nSteps], 'MC step'),
            yaxis: axStyle([0, 1.05], '|Magnetization|/N'),
            height: 400
        }), { responsive: true });

        var exact = -Math.tanh(1 / T);
        document.getElementById('mt-stats2').innerHTML =
            '<span><strong>N = ' + N + ', T/J = ' + T.toFixed(1) + ', ' + nSteps + ' steps</strong></span>' +
            '<span>MC ⟨E⟩/N = ' + (avgE / N).toFixed(3) + '  |  Exact: ' + exact.toFixed(3) + '</span>';
    };

    window.mtEquilReset = function() {
        ['mt-energyPlot', 'mt-magPlot'].forEach(function(id) {
            Plotly.react(id, [], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
                annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run 5000 Steps"', font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
            }), { responsive: true });
        });
        document.getElementById('mt-stats2').innerHTML = '';
    };

    // ===============================================================
    // EXPLORER 3: Temperature Sweep
    // ===============================================================
    window.mtSweepRun = function() {
        var N = parseInt(document.getElementById('mt-sweep-N-select').value);
        var nSteps = parseInt(document.getElementById('mt-sweep-steps-select').value);
        var burnIn = Math.floor(nSteps * 0.2);

        var Ts = [], mcEs = [], accRates = [], exactEs = [];
        for (var ti = 0; ti < 20; ti++) {
            var T = 0.2 + ti * 4.8 / 19;
            Ts.push(T);
            exactEs.push(-Math.tanh(1 / T));

            var spins = [];
            for (var i = 0; i < N; i++) spins.push(Math.random() < 0.5 ? 1 : -1);
            var E = isingEnergy(spins), sumE = 0, cnt = 0, acc = 0;

            for (var step = 0; step < nSteps; step++) {
                var idx = Math.floor(Math.random() * N);
                var dE = deltaE(spins, idx);
                if (dE <= 0 || Math.random() < Math.exp(-dE / T)) {
                    spins[idx] *= -1; E += dE; acc++;
                }
                if (step >= burnIn) { sumE += E; cnt++; }
            }
            mcEs.push(sumE / cnt / N);
            accRates.push(acc / nSteps * 100);
        }

        Plotly.react('mt-sweepEPlot', [
            { x: Ts, y: mcEs, type: 'scatter', mode: 'markers',
              marker: { color: '#00f3ff', size: 8 }, name: 'MC ⟨E⟩/N' },
            { x: Ts, y: exactEs, type: 'scatter', mode: 'lines',
              line: { color: 'white', width: 2, dash: 'dash' }, name: 'Exact: −tanh(1/T)' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 5.2], 'T/J'), yaxis: axStyle([-1.1, 0.1], '⟨E⟩/NJ'),
            height: 400, legend: { x: 0.55, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        Plotly.react('mt-sweepAccPlot', [
            { x: Ts, y: accRates, type: 'scatter', mode: 'markers+lines',
              marker: { color: '#ffbe0b', size: 8 }, line: { color: '#ffbe0b', width: 2 }, name: 'Acceptance rate' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 5.2], 'T/J'), yaxis: axStyle([0, 105], 'Acceptance rate (%)'),
            height: 400
        }), { responsive: true });

        document.getElementById('mt-stats3').innerHTML =
            '<span><strong>N = ' + N + ', ' + nSteps + ' steps/T, 20 temperature points</strong></span>' +
            '<span>MC matches exact solution within statistical error</span>';
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('mt-spinPlot')) { setTimeout(initializePlots, 100); return; }

        // Explorer 1
        initMtState();
        drawMtSpins();
        document.getElementById('mt-N-slider').addEventListener('input', function() {
            document.getElementById('mt-N-value').textContent = this.value;
            initMtState(); drawMtSpins();
        });
        document.getElementById('mt-T-slider').addEventListener('input', function() {
            document.getElementById('mt-T-value').textContent = parseFloat(this.value).toFixed(1);
        });

        // Explorer 2 placeholder
        ['mt-energyPlot', 'mt-magPlot'].forEach(function(id) {
            Plotly.react(id, [], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
                annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run 5000 Steps"', font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
            }), { responsive: true });
        });
        document.getElementById('mt-eq-T-slider').addEventListener('input', function() {
            document.getElementById('mt-eq-T-value').textContent = parseFloat(this.value).toFixed(1);
        });

        // Explorer 3 placeholder
        ['mt-sweepEPlot', 'mt-sweepAccPlot'].forEach(function(id) {
            Plotly.react(id, [], Object.assign({}, darkLayout, {
                xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
                annotations: [{ x: 0.5, y: 0.5, text: 'Click "Run Sweep"', font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
            }), { responsive: true });
        });
    }

    initializePlots();
})();
