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

    function metropolis(N, T, nSteps) {
        var spins = [];
        for (var i = 0; i < N; i++) spins.push(Math.random() < 0.5 ? 1 : -1);
        var E = isingEnergy(spins);
        var energies = [], mags = [];
        for (var step = 0; step < nSteps; step++) {
            var idx = Math.floor(Math.random() * N);
            var dE = 0;
            if (idx > 0) dE += 2 * spins[idx] * spins[idx - 1];
            if (idx < N - 1) dE += 2 * spins[idx] * spins[idx + 1];
            if (dE <= 0 || Math.random() < Math.exp(-dE / T)) {
                spins[idx] *= -1;
                E += dE;
            }
            energies.push(E);
            var M = 0;
            for (var i = 0; i < N; i++) M += spins[i];
            mags.push(Math.abs(M) / N);
        }
        return { energies: energies, mags: mags };
    }

    // ===============================================================
    // EXPLORER 1: Full Simulation
    // ===============================================================
    window.isSimRun = function() {
        var T = parseFloat(document.getElementById('is-T-slider').value);
        var N = parseInt(document.getElementById('is-N-select').value);
        var nSteps = parseInt(document.getElementById('is-steps-select').value);
        var burnIn = Math.floor(nSteps * 0.2);

        var result = metropolis(N, T, nSteps);

        // Subsample for plotting
        var rate = Math.max(1, Math.floor(nSteps / 1000));
        var stepArr = [], eArr = [], mArr = [];
        for (var i = 0; i < nSteps; i += rate) {
            stepArr.push(i); eArr.push(result.energies[i]); mArr.push(result.mags[i]);
        }

        // Averages after burn-in
        var sumE = 0, sumM = 0, cnt = 0;
        for (var i = burnIn; i < nSteps; i++) { sumE += result.energies[i]; sumM += result.mags[i]; cnt++; }
        var avgE = sumE / cnt, avgM = sumM / cnt;

        Plotly.react('is-energyPlot', [
            { x: stepArr, y: eArr, type: 'scatter', mode: 'lines', line: { color: '#00f3ff', width: 1 }, name: 'E(step)' },
            { x: [burnIn, nSteps], y: [avgE, avgE], type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 2, dash: 'dash' }, name: '⟨E⟩ = ' + avgE.toFixed(1) },
            { x: [burnIn, burnIn], y: [Math.min.apply(null, eArr), 2], type: 'scatter', mode: 'lines',
              line: { color: 'rgba(255,87,34,0.5)', width: 2, dash: 'dot' }, name: 'Burn-in' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, nSteps], 'MC step'), yaxis: axStyle(null, 'Energy E/J'),
            height: 400, legend: { x: 0.55, y: 0.98, font: { color: '#aaa', size: 9 } }
        }), { responsive: true });

        Plotly.react('is-magPlot', [
            { x: stepArr, y: mArr, type: 'scatter', mode: 'lines', line: { color: '#ff006e', width: 1 }, name: '|M|/N' },
            { x: [burnIn, nSteps], y: [avgM, avgM], type: 'scatter', mode: 'lines',
              line: { color: '#ffbe0b', width: 2, dash: 'dash' }, name: '⟨|M|⟩/N = ' + avgM.toFixed(3) }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, nSteps], 'MC step'), yaxis: axStyle([0, 1.05], '|M|/N'),
            height: 400, legend: { x: 0.55, y: 0.98, font: { color: '#aaa', size: 9 } }
        }), { responsive: true });

        var exact = -Math.tanh(1 / T);
        document.getElementById('is-stats1').innerHTML =
            '<span><strong>N = ' + N + ', T/J = ' + T.toFixed(1) + ', ' + nSteps.toLocaleString() + ' steps</strong></span>' +
            '<span>MC: ⟨E⟩/N = ' + (avgE / N).toFixed(4) + '  |  Exact: ' + exact.toFixed(4) + '  |  ⟨|M|⟩/N = ' + avgM.toFixed(4) + '</span>';
    };

    // ===============================================================
    // EXPLORER 2: MC vs Exact Sweep
    // ===============================================================
    window.isSweepRun = function() {
        var N = parseInt(document.getElementById('is-sweep-N-select').value);
        var nSteps = parseInt(document.getElementById('is-sweep-steps-select').value);
        var burnIn = Math.floor(nSteps * 0.2);

        var Ts = [], mcEs = [], mcMs = [], exEs = [];
        for (var ti = 0; ti < 25; ti++) {
            var T = 0.3 + ti * 4.7 / 24;
            Ts.push(T);
            exEs.push(-Math.tanh(1 / T));

            var result = metropolis(N, T, nSteps);
            var sumE = 0, sumM = 0, cnt = 0;
            for (var i = burnIn; i < nSteps; i++) { sumE += result.energies[i]; sumM += result.mags[i]; cnt++; }
            mcEs.push(sumE / cnt / N);
            mcMs.push(sumM / cnt);
        }

        Plotly.react('is-sweepEPlot', [
            { x: Ts, y: mcEs, type: 'scatter', mode: 'markers', marker: { color: '#00f3ff', size: 8 }, name: 'MC ⟨E⟩/N' },
            { x: Ts, y: exEs, type: 'scatter', mode: 'lines', line: { color: 'white', width: 2, dash: 'dash' }, name: 'Exact −tanh(1/T)' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 5.2], 'T/J'), yaxis: axStyle([-1.1, 0.1], '⟨E⟩/NJ'),
            height: 400, legend: { x: 0.55, y: 0.98, font: { color: '#aaa', size: 10 } }
        }), { responsive: true });

        Plotly.react('is-sweepMPlot', [
            { x: Ts, y: mcMs, type: 'scatter', mode: 'markers+lines',
              marker: { color: '#ff006e', size: 8 }, line: { color: '#ff006e', width: 1.5 }, name: 'MC ⟨|M|⟩/N' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, 5.2], 'T/J'), yaxis: axStyle([0, 1.05], '⟨|M|⟩/N'),
            height: 400
        }), { responsive: true });

        document.getElementById('is-stats2').innerHTML =
            '<span><strong>Sweep: N = ' + N + ', ' + nSteps.toLocaleString() + ' steps/T, 25 temperatures</strong></span>' +
            '<span>MC agrees with exact 1D solution. No phase transition in 1D.</span>';
    };

    // ===============================================================
    // EXPLORER 3: Autocorrelation
    // ===============================================================
    window.isAutoRun = function() {
        var T = parseFloat(document.getElementById('is-ac-T-slider').value);
        var N = 50, nSteps = 20000, burnIn = 2000;

        var result = metropolis(N, T, nSteps);
        var data = result.energies.slice(burnIn);
        var nData = data.length;

        // Burn-in detection plot
        var rate = Math.max(1, Math.floor(nSteps / 500));
        var stepArr = [], eArr = [];
        for (var i = 0; i < nSteps; i += rate) { stepArr.push(i); eArr.push(result.energies[i]); }

        Plotly.react('is-burninPlot', [
            { x: stepArr, y: eArr, type: 'scatter', mode: 'lines', line: { color: '#00f3ff', width: 1 }, name: 'E(step)' },
            { x: [burnIn, burnIn], y: [Math.min.apply(null, eArr), 2], type: 'scatter', mode: 'lines',
              line: { color: '#ff5722', width: 2, dash: 'dot' }, name: 'Burn-in end' }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, nSteps], 'MC step'), yaxis: axStyle(null, 'Energy E/J'),
            height: 400, legend: { x: 0.55, y: 0.02, font: { color: '#aaa', size: 9 } }
        }), { responsive: true });

        // Autocorrelation
        var maxLag = Math.min(500, Math.floor(nData / 4));
        var mean = 0;
        for (var i = 0; i < nData; i++) mean += data[i];
        mean /= nData;
        var variance = 0;
        for (var i = 0; i < nData; i++) variance += (data[i] - mean) * (data[i] - mean);
        variance /= nData;

        var C = [], lags = [];
        var tauAuto = maxLag; // default
        for (var k = 0; k < maxLag; k++) {
            var sum = 0;
            for (var i = 0; i < nData - k; i++) sum += (data[i] - mean) * (data[i + k] - mean);
            var ck = sum / ((nData - k) * variance);
            C.push(ck); lags.push(k);
            if (k > 1 && ck < 1 / Math.E && tauAuto === maxLag) tauAuto = k;
        }

        Plotly.react('is-autocorrPlot', [
            { x: lags, y: C, type: 'scatter', mode: 'lines', line: { color: '#00f3ff', width: 2 }, name: 'C(k)' },
            { x: [0, maxLag], y: [1 / Math.E, 1 / Math.E], type: 'scatter', mode: 'lines',
              line: { color: 'rgba(255,190,11,0.5)', width: 1.5, dash: 'dash' }, name: '1/e level' },
            { x: [0, maxLag], y: [0, 0], type: 'scatter', mode: 'lines',
              line: { color: '#808080', width: 1, dash: 'dot' }, showlegend: false },
            { x: [tauAuto, tauAuto], y: [-0.2, 1], type: 'scatter', mode: 'lines',
              line: { color: '#ff5722', width: 2, dash: 'dot' }, name: 'τ_auto ≈ ' + tauAuto }
        ], Object.assign({}, darkLayout, {
            xaxis: axStyle([0, maxLag], 'Lag k (steps)'), yaxis: axStyle([-0.2, 1.05], 'C(k)'),
            height: 400, legend: { x: 0.55, y: 0.98, font: { color: '#aaa', size: 9 } }
        }), { responsive: true });

        var nEff = Math.floor(nData / (2 * Math.max(tauAuto, 1)));
        document.getElementById('is-stats3').innerHTML =
            '<span><strong>T/J = ' + T.toFixed(1) + '  |  τ_auto ≈ ' + tauAuto + ' steps</strong></span>' +
            '<span>N_steps = ' + nData + '  |  N_eff ≈ ' + nEff + '  |  Error inflation: ×' + Math.sqrt(nData / Math.max(nEff, 1)).toFixed(1) + '</span>';
    };

    // ===============================================================
    // Initialization
    // ===============================================================
    function initializePlots() {
        if (typeof Plotly === 'undefined') { setTimeout(initializePlots, 100); return; }
        if (!document.getElementById('is-energyPlot')) { setTimeout(initializePlots, 100); return; }

        var placeholder = function(ids, text) {
            ids.forEach(function(id) {
                Plotly.react(id, [], Object.assign({}, darkLayout, {
                    xaxis: axStyle(null, ''), yaxis: axStyle(null, ''), height: 400,
                    annotations: [{ x: 0.5, y: 0.5, text: text, font: { color: '#aaa', size: 14 }, showarrow: false, xref: 'paper', yref: 'paper' }]
                }), { responsive: true });
            });
        };

        placeholder(['is-energyPlot', 'is-magPlot'], 'Click "Run Simulation"');
        placeholder(['is-sweepEPlot', 'is-sweepMPlot'], 'Click "Run Sweep"');
        placeholder(['is-burninPlot', 'is-autocorrPlot'], 'Click "Run Analysis"');

        document.getElementById('is-T-slider').addEventListener('input', function() {
            document.getElementById('is-T-value').textContent = parseFloat(this.value).toFixed(1);
        });
        document.getElementById('is-ac-T-slider').addEventListener('input', function() {
            document.getElementById('is-ac-T-value').textContent = parseFloat(this.value).toFixed(1);
        });
    }

    initializePlots();
})();
