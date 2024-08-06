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

    const blueColorHex = '#007bff';
    const orangeColorHex = '#f59e42';
    const redColorHex = 'red';
    const lastTriesKey = 'AudioTest_LastTries';

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    oscillator.frequency.setValueAtTime(260, audioContext.currentTime);
    oscillator.type = 'sine';
    const numberOfReactionTotal = 1;

    let timeoutIdBeep;
    let state = States.IDLE;
    let audioStartTimeStamp = 0;
    let reactionTimeInMs = 0;
    let totalReactionTimeInMs = 0;
    let numberOfReactions = 0;
    let isSoundRunning = false;
    let lastTries = [];

    const jsonArray = localStorage.getItem(lastTriesKey);

    if (jsonArray)
        lastTries = JSON.parse(jsonArray);

    document.addEventListener('mousedown', () => { oscillator.start() }, { once: true });
    DOMplayButton.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', (handleSpacebarPress));
    createTriesList();

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
                else if (numberOfReactions >= numberOfReactionTotal - 1)
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
        launchAudioRandom();
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
        let averageReactionTimeInMs = Math.floor(totalReactionTimeInMs / numberOfReactionTotal);
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

    function launchAudio(startDelay) {
        timeoutIdBeep = setTimeout(() => {
            oscillator.connect(audioContext.destination);
            audioStartTimeStamp = performance.now()
            isSoundRunning = true;
        }, startDelay);
    }

    function launchAudioRandom() {
        const randomDelay = getRandomInt(2000, 7000);
        launchAudio(randomDelay);
    }

    function stopSound() {
        let timeStampClick = performance.now();
        reactionTimeInMs = timeStampClick - audioStartTimeStamp - 10;
        totalReactionTimeInMs += reactionTimeInMs;
        oscillator.disconnect(audioContext.destination);
        isSoundRunning = false;
    }
});