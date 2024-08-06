document.addEventListener('DOMContentLoaded', function () {

    const States = Object.freeze({
        IDLE: 'idle',
        WAITING_BEEP: 'waiting beep',
        RESULT: 'result',
        FALSE_START: 'false start',
        FINAL_RESULT: 'final result'
    });
    const DOMTitle = document.getElementById("title");
    const DOMMessage1 = document.getElementById("message1");
    const DOMMessage2 = document.getElementById("message2");
    const DOMplayButton = document.getElementById("play-beep");
    const DOMTriesList = document.getElementById("tries-list");
    const DOMWaveSelect = document.getElementById("wave-select");
    const DOMPitchInput = document.getElementById("pitch-input");
    const DOMVolumeInput = document.getElementById("volume-input");
    const DOMMinimumDelayInput = document.getElementById("minimum-delay-input");
    const DOMMaximumDelayInput = document.getElementById("maximum-delay-input");
    const DOMNumberOfTriesInput = document.getElementById("number-of-tries-input");
    const blueColorHex = '#007bff';
    const orangeColorHex = '#f59e42';
    const redColorHex = 'red';
    const lastTriesKey = 'AudioTest_LastTries';
    const settingsKey = 'AudioTest_Settings';

    //settins of the app, retrieve from local storage and save when the user change it
    let settings = {
        audio: {
            volume: 0.5,
            frequency: 260,
            type: 'square'
        },
        test: {
            numberOfTries: 5,
            timeBetweenTriesInSecondsMin: 3,
            timeBetweenTriesInSecondsMax: 12
        }
    };

    let timeoutIdBeep;
    let state = States.IDLE;
    let audioStartTimeStamp = 0;
    let reactionTimeInMs = 0;
    let totalReactionTimeInMs = 0;
    let numberOfReactions = 0;
    let isSoundRunning = false;
    let lastTries = [];
    let oscillator;

    initializeSettings();
    initializeLastTries();

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let gainNode = createAudioObject();

    document.addEventListener('mousedown', () => { oscillator.start() }, { once: true });
    document.addEventListener('keydown', (handleSpacebarPress));
    DOMplayButton.addEventListener('mousedown', handleClick);
    DOMWaveSelect.addEventListener('change', () => {
        updateSettingsAndUpdateAudio('audio.type', DOMWaveSelect.value);
    });
    DOMPitchInput.addEventListener('change', () => {
        updateSettingsAndUpdateAudio('audio.frequency', DOMPitchInput.value);
    });
    DOMVolumeInput.addEventListener('change', () => {
        updateSettingsAndUpdateAudio('audio.volume', DOMVolumeInput.value);
    });
    DOMMinimumDelayInput.addEventListener('change', () => {
        updateSettings('test.timeBetweenTriesInSecondsMin', DOMMinimumDelayInput.value);
    });
    DOMMaximumDelayInput.addEventListener('change', () => {
        updateSettings('test.timeBetweenTriesInSecondsMax', DOMMaximumDelayInput.value);
    });
    DOMNumberOfTriesInput.addEventListener('change', () => {
        updateSettings('test.numberOfTries', DOMNumberOfTriesInput.value)
    });

    function handleSpacebarPress(event) {
        if (event.code === 'Space') {
            handleClick();
            event.preventDefault();
        }
    }

    function handleClick() {
        switch (state) {
            case States.IDLE:
                transitionToWaitingBeep();
                break;
            case States.WAITING_BEEP:
                if (!isSoundRunning)
                    transitionToFalseStart();
                else if (numberOfReactions >= settings.test.numberOfTries - 1)
                    transitionToFinalResult();
                else
                    transitionToResult();
                break;
            case States.RESULT:
                transitionToWaitingBeep();
                break;
            case States.FALSE_START:
                transitionToWaitingBeep();
                break;
            case States.FINAL_RESULT:
                transitionToIdle();
                break;
            default:
                console.log(`Error, state is: ${state}.`);
        }
    }

    function transitionToWaitingBeep() {
        state = States.WAITING_BEEP;
        startAudioRandom();
        DOMplayButton.style.backgroundColor = orangeColorHex;
        DOMTitle.textContent = 'Click when you hear the beep.';
        DOMMessage1.textContent = '';
        DOMMessage2.textContent = '';
    }

    function transitionToResult() {
        state = States.RESULT;
        stopSound();
        numberOfReactions++;
        DOMplayButton.style.backgroundColor = blueColorHex;
        DOMTitle.textContent = Math.floor(reactionTimeInMs) + ' ms';
        DOMMessage1.textContent = 'Click to try again.';
        DOMMessage2.textContent = '';
    }

    function transitionToFalseStart() {
        state = States.FALSE_START;
        clearTimeout(timeoutIdBeep);
        DOMplayButton.style.backgroundColor = redColorHex;
        DOMTitle.textContent = 'Too soon!';
        DOMMessage1.textContent = 'Click to try again.';
        DOMMessage2.textContent = '';
    }

    function transitionToFinalResult() {
        state = States.FINAL_RESULT;
        stopSound();
        DOMplayButton.style.backgroundColor = blueColorHex;
        let averageReactionTimeInMs = Math.floor(totalReactionTimeInMs / settings.test.numberOfTries);
        DOMTitle.textContent = 'Average result: ' + averageReactionTimeInMs + ' ms';
        DOMMessage1.textContent = 'Click to try again the test.';
        DOMMessage2.textContent = '';
        lastTries.push(averageReactionTimeInMs);
        addTrieToListDOM(averageReactionTimeInMs);
        localStorage.setItem(lastTriesKey, JSON.stringify(lastTries));
    }

    function transitionToIdle() {
        state = States.IDLE;
        numberOfReactions = 0;
        totalReactionTimeInMs = 0;
        DOMplayButton.style.backgroundColor = blueColorHex;
        DOMTitle.textContent = 'Audio Reaction Time Test';
        DOMMessage1.textContent = 'When the beep sound click as fast as you can.';
        DOMMessage2.textContent = 'Click to begin.';
    }

    function addTrieToListDOM(reactionTimeInMs) {
        const li = document.createElement('li');
        li.textContent = reactionTimeInMs + ' ms';
        DOMTriesList.insertBefore(li, DOMTriesList.firstChild);
    }

    function createTriesList() {
        DOMTriesList.innerHTML = '';
        lastTries.forEach((time) => {
            addTrieToListDOM(time);
        });
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function startAudio(startDelay) {
        timeoutIdBeep = setTimeout(() => {
            gainNode.connect(audioContext.destination);
            audioStartTimeStamp = performance.now()
            isSoundRunning = true;
        }, startDelay);
    }

    function startAudioRandom() {
        const randomDelay = getRandomInt(settings.test.timeBetweenTriesInSecondsMin * 1000, settings.test.timeBetweenTriesInSecondsMax * 1000);
        startAudio(randomDelay);
    }

    function stopSound() {
        let timeStampClick = performance.now();
        reactionTimeInMs = timeStampClick - audioStartTimeStamp - 10;
        totalReactionTimeInMs += reactionTimeInMs;
        gainNode.disconnect(audioContext.destination);
        isSoundRunning = false;
    }

    function initializeSettings() {
        const settingsJson = localStorage.getItem(settingsKey);
        if (settingsJson)
            settings = JSON.parse(settingsJson);
        DOMWaveSelect.value = settings.audio.type;
        DOMPitchInput.value = settings.audio.frequency;
        DOMVolumeInput.value = settings.audio.volume;
        DOMMinimumDelayInput.value = settings.test.timeBetweenTriesInSecondsMin;
        DOMMaximumDelayInput.value = settings.test.timeBetweenTriesInSecondsMax;
        DOMNumberOfTriesInput.value = settings.test.numberOfTries;
    }

    function initializeLastTries() {
        const lastTriesJson = localStorage.getItem(lastTriesKey);
        if (lastTriesJson)
            lastTries = JSON.parse(lastTriesJson);
        createTriesList();
    }

    function createAudioObject() {
        oscillator = audioContext.createOscillator();
        oscillator.frequency.setValueAtTime(settings.audio.frequency, audioContext.currentTime);
        oscillator.type = settings.audio.type;
        let gainNode = audioContext.createGain();
        gainNode.gain.value = settings.audio.volume;
        oscillator.connect(gainNode);
        return gainNode;
    }

    //update a propoerty of an object, 
    function updateObject(object, propertyPath, value) {
        const keys = propertyPath.split('.');
        let current = object;

        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;
    }

    function updateSettings(propertyPath, value) {
        updateObject(settings, propertyPath, value);
        localStorage.setItem(settingsKey, JSON.stringify(settings));
    }

    function updateSettingsAndUpdateAudio(propertyPath, value) {
        updateSettings(propertyPath, value);
        if (isSoundRunning)
            gainNode.disconnect(audioContext.destination);
        gainNode = createAudioObject();
        oscillator.start();
        if (isSoundRunning)
            gainNode.connect(audioContext.destination);
    }
});