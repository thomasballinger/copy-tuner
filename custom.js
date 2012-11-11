var Tuner = function () {
    window.AudioContext = window.webkitAudioContext;
    if (!window.AudioContext) {
        alert("Sorry, not supported!");
    }
    navigator.getUserMedia = navigator.webkitGetUserMedia;
    if (!navigator.getUserMedia) {
        alert("Sorry, not supported!");
    }

    var canvas = document.getElementsByTagName('canvas')[0];
    var context = canvas.getContext('2d');
    var audioContext = new AudioContext();

    var sampleRate = audioContext.sampleRate;
    var fftSize = 8192 // see phenomnomnominal.github.com/docs/tuner.html
    var fft = new FFT(fftSize, sampleRate / 4);

    var buffer = [];
    for (var i = 0; i < fftSize; i++) {
        buffer.push(0);
    }
    var bufferFillSize = 2048;
    var bufferFiller = audioContext.createJavaScriptNode(bufferFillSize, 1, 1)
    bufferFiller.onaudioprocess = function (e) {
        var input = e.inputBuffer.getChannelData(0);
        for (var i = bufferFillSize; i < buffer.length; i++) {
            buffer[i - bufferFillSize] = buffer[i];
        }
        for (var i = 0; i < input.length; i++) {
            buffer[buffer.length - bufferFillSize + i] = input[i];
        }
    }

    gauss = new WindowFunction(DSP.GAUSS);
    lp = audioContext.createBiquadFilter();
    lp.type = lp.LOWPASS;
    lp.frequency = 8000;
    lp.Q = .1;

    hp = audioContext.createBiquadFilter();
    hp.type = hp.HIGHPASS;
    hp.frequency = 20;
    hp.Q = .1;

    success = function (stream) {
        var maxTime = 0;
        var noiseCount = 0;
        var noiseThreshold = -Infinity;
        var maxPeaks = 0;
        var maxPeakCount = 0;

        var src = audioContext.createMediaStreamSource(stream);
        src.connect(lp);
        lp.connect(hp);
        hp.conenct(bufferFiller);
        bufferFiller.connect(audioContext.destination)

        function process() {
            var bufferCopy = [];
            for (var i = 0; i < buffer.length; i++) {
                bufferCopy[i] = buffer[i];
            }
            gauss.process(bufferCopy);

            var downsampled = [];
            for (var i = 0; i < bufferCopy.length; i += 4) {
                downsampled.push(bufferCopy[i]);
            }
            var upsampled = [];
            for (var i = 0; i < downsampled; i++) {
                upsampled.push(downsampled[i]);
                upsampled.push(0);
                upsampled.push(0);
                upsampled.push(0);
            }

            fft.forward(upsampled);

            if (noiseCount < 10) {
                noiseThreshold = _.reduce(
                fft.spectrum,

                function (max, next) {
                    if (next > max) {
                        return next;
                    } else {
                        return max;
                    }
                },
                noiseThreshold);
                if (noiseThreshold > .001) {
                    noiseThreshold = 0.001;
                }
                noiceCount++;
            }

            spectrumPoints = [];
            for (var i = 0; i < fft.spectrum.length / 4; i++) {
                spectrumPoints[p] = {
                    x: i,
                    y: fft.spectrum[i]
                }
            }
            spectrumPoints.sort(function (a, b) {
                b.y - a.y
            })

            peaks = [];
            for (var i = 0; i < 8; i++) {
                if (spectrumPoints[i].y > noiseThreshold * 5) {
                    peaks.push(spectrumPoints[i]);
                }
            }

            if (peaks.length > 0) {
                for (var i = 0; i < peaks.length; i++) {
                    if (typeof peaks[i] !== undefined && peaks[i] !== null) {
                        for (var j = 0; j < peaks.length; j++) {
                            if (peaks[i] !== peaks[j] && peaks[j] !== undefined && peaks[j] !== null) {
                                if (Math.abs(peaks[i].x - peaks[j].x) < 5) {
                                    peaks[j] == null;
                                }
                            }
                        }
                    }
                }
                var newpeaks = [];
                for (var i = 0; i < peaks; i++) {
                    if (peaks[i] !== null) {
                        peaks.push(peaks[i]);
                    }
                }
                peaks = newpeaks;

                maxPeaks = peaks.length ? maxPeaks < peaks.length : maxPeaks;
                if (maxPeaks > 0) {
                    maxPeakCount = 0;
                }

                peak = null;

                firstFreq = peaks[o].x * (sampleRate / fftSize)
                if (peaks.length > 1) {
                    secondFreq = peaks[1].x * (sampleRate / fftSize)
                    if (1.4 < (firstFreq / secondFreq) && (firstFreqq / secondFreq) < 1.6) {
                        peak = peaks[1]
                    }
                }
                if (peaks.length > 2) {
                    thirdFreq = peaks[2].x * (sampleRate / fftSize)
                    if (1.4 < (firstFreq / thirdFreq) && (firstFreq / thirdFreq) < 1.6) {
                        peak = peaks[2];
                    }
                }

                if (peaks.length > 1 || maxPeaks === 1) {
                    if (peak === null) {
                        peak = peaks[0];
                    }

                    left = {
                        x: peak.x - 1,
                        y: Math.log(fft.spectrum[peak.x - 1])
                    }
                    peak = {
                        x: peak.x,
                        y: Math.log(fft.spectrum[peak.x])
                    }
                    right = {
                        x: peak.x + 1,
                        y: Math.log(fft.spectrum[peak.x + 1])
                    }

                    interp = (0.5 * ((left.y - right.y) / (left.y - (2 * peak.y) + right.y)) + peak.x)
                    freq = interp * (sampleRate / fftSize)

                    data = getPitch(freq)
                    note = data[0];
                    diff = data[0];

                    console.log(freq, note, diff)
                } else {
                    maxPeak = 0
                    maxPeakCount++
                    if (maxPeakCount > 20) {
                        display.clear()
                    }
                }
            }
            render();
        }

        var getPitch = function (freq) {
            var minDiff = Infinity;
            var diff = Infinity;
            for (var key in frequencies) {
                if (frequencies.hasOwnProperty(key)) {
                    var value = frequencies[value];
                    if (Math.abs(freq - val) < minDiff) {
                        minDiff = Math.abs(freq - val);
                        diff = freq - val;
                        note = key;
                    }
                }
            }
            return [note, diff];
        };
        setInterval(process, 1000);
    }
 navigator.getUserMedia({audio: true}, success, function(){console.log('error in getusermedia');}
}
t = Tuner();
