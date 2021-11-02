import { waitForProcess } from '../lib/processManager';
import { STRING_VOICEMEETER_FRIENDLY_NAMES } from '../lib/strings';
import {
    getToggle,
    getSettings,
    setSettings,
    saveSettings,
} from './settingsManager';
import { systray } from './persistantSysTray';
import { Voicemeeter } from 'voicemeeter-connector';
import { speaker } from 'win-audio';

let vm = null;
let voicemeeterLoaded = false;
let lastVolume = null;
let lastEventTimestamp = Date.now();
let lastVolumeTime = Date.now();

/**
 * called when Windows audio levels have changed
 * @param {*} volume volume change object
 * @param {int} volume.new the new volume
 * @param {int} volume.old the old volume
 */
const winAudioChanged = (volume) => {
    getToggle('remember_volume')?.value && rememberCurrentVolume(volume.new);
};

/**
 * called when Voicemeeter properties have changed
 * @param {*} voicemeeter the voicemeeter connection handle
 */
const voicemeeterChanged = (voicemeeter) => {
    updateBindingLabels(voicemeeter);
};

/**
 * saves the current volume to be loaded on next launch
 */
const rememberCurrentVolume = () => {
    let volume = speaker.get();
    console.log(`remembering volume: ${volume}`);
    let settings = getSettings();
    settings.initial_volume = volume;
    setSettings(settings);
    saveSettings();
};

/**
 * if initial_volume is defined in settings, this will apply it to the windows
 * volume slider (and by extension propogate the change to any bound voicemeeter
 * strips and subs)
 */
const setInitialVolume = () => {
    let settings = getSettings();

    if (getToggle('remember_volume')?.value && settings.initial_volume) {
        lastVolumeTime = Date.now();
        console.log(`Set initial volume to ${settings.initial_volume}%`);
        speaker.set(settings.initial_volume);
    }
};

/**
 * connects to the voicemeeter client api once it is available
 */
const connectVoicemeeter = () => {
    return new Promise((resolve, reject) => {
        waitForProcess(/voicemeeter(.*)?[^(setup)].exe/g, () => {
            Voicemeeter.init().then(async (voicemeeter) => {
                try {
                    voicemeeter.connect();

                    // changes happen rapidly on voicemeeter startup, and stop after
                    // the engine is fully loaded. we can wait until changes stop
                    // to detect when the voicemeeter engine is fully loaded
                    let voicemeeterEngineWaiter;

                    // console.log(
                    //     voicemeeter.updateDeviceList(),
                    //     voicemeeter.$outputDevices,
                    //     voicemeeter.$inputDevices
                    // );
                    voicemeeter.attachChangeEvent(() => {
                        if (!voicemeeterLoaded) {
                            lastEventTimestamp = Date.now();
                        }

                        let moment = new Date();
                        console.log(
                            `Voicemeeter: [${moment.getHours()}:${moment.getMinutes()}:${moment.getSeconds()}] Changed detected`
                        );
                        voicemeeterChanged(voicemeeter);
                    });

                    lastEventTimestamp = Date.now();
                    voicemeeterEngineWaiter = setInterval(() => {
                        let timeDelta = Date.now() - lastEventTimestamp;
                        if (timeDelta >= 3000) {
                            // 3 seconds have passed between events, assume loaded
                            clearInterval(voicemeeterEngineWaiter);
                            voicemeeterLoaded = true;
                            console.log('Voicemeeter: Fully Initialized');
                            resolve(voicemeeter);
                        }
                    }, 1000);

                    vm = voicemeeter;
                } catch {
                    systray.kill(false);
                    setTimeout(() => {
                        process.exit();
                    }, 1000);
                    reject('Error Attaching to Voicemeeter');
                }
            });
        });
    });
};

/**
 * converts a A windows volume level (0-100) to Voicemeeter decibel level
 */
const convertVolumeToVoicemeeterGain = (windowsVolume, gain_min, gain_max) => {
    const gain = (windowsVolume * (gain_max - gain_min)) / 100 + gain_min;
    const roundedGain = Math.round(gain * 10) / 10;
    return roundedGain;
};

/**
 * begins polling Windows audio for changes, and propegates those changes over
 * the Voicemeeter API
 */
const runWinAudio = () => {
    let settings = getSettings();
    speaker.polling(settings.polling_rate);

    speaker.events.on('change', (volume) => {
        // There is an issue with some drivers and Windows versions where the
        // associated audio device will spike to 100% volume when either devices
        // change or the audio engine is reset. This will revert any 100%
        // volume requests that were not gradual (such as the user using a
        // volume slider)
        let currentTime = Date.now();
        let timeSinceLastVolume = currentTime - lastVolumeTime;

        if (volume.new === 100 && timeSinceLastVolume >= 1000) {
            let fixingVolume = getToggle('apply_volume_fix');

            if (
                fixingVolume &&
                null !== lastVolume &&
                settings.initial_volume !== 100
            ) {
                console.log(
                    `Driver Anomoly Detected: Volume reached 100% from ${lastVolume}%. Reverting to ${lastVolume}%`
                );
                speaker.set(lastVolume);
            }
        }
        lastVolume = volume.new;
        lastVolumeTime = currentTime;

        // propagate volume to Voicemeeter
        if (vm) {
            for (let [key, value] of systray.internalIdMap) {
                if (
                    value.checked &&
                    (value?.sid?.startsWith('Strip') ||
                        value?.sid?.startsWith('Bus'))
                ) {
                    const voicemeeterGain = convertVolumeToVoicemeeterGain(
                        volume.new,
                        settings.gain_min,
                        settings.gain_max
                    );
                    const tokens = value.sid.split('_');
                    try {
                        vm.setParameter(
                            tokens[0],
                            tokens[1],
                            'Gain',
                            voicemeeterGain
                        );
                    } catch (e) {}
                }
            }
        }
        winAudioChanged(volume);
    });

    speaker.events.on('toggle', (status) => {
        // status.new = true or false to indicate mute
        if (vm) {
            for (let [key, value] of systray.internalIdMap) {
                if (
                    value.checked &&
                    (value?.sid?.startsWith('Strip') ||
                        value?.sid?.startsWith('Bus'))
                ) {
                    const tokens = value.sid.split('_');
                    const type = '';
                    const isMute = status.new ? 1 : 0;
                    try {
                        vm.setParameter(tokens[0], tokens[1], 'Mute', isMute);
                    } catch (e) {}
                }
            }
        }
    });
};

const updateBindingLabels = (vm) => {
    const friendlyNames = STRING_VOICEMEETER_FRIENDLY_NAMES[vm.$type];

    if (friendlyNames) {
        for (let [key, value] of systray.internalIdMap) {
            // enable bind menu if needed
            if (value.title === 'Bind Windows Volume To' && !value.enabled) {
                value.enabled = true;
                systray.sendAction({
                    type: 'update-item',
                    item: value,
                });
            }

            // update labels if needed
            if (
                value.sid &&
                (value.sid.startsWith('Strip_') || value.sid.startsWith('Bus_'))
            ) {
                let tokens = value.sid.split('_');
                let type = tokens[0],
                    index = parseInt(tokens[1]);
                let lastTitle = value.title;
                let lastHidden = value.hidden;
                let label = vm.getParameter(type, index, 'Label');
                let deviceName = vm.getParameter(type, index, 'device.name');

                let newFriendlyNames = friendlyNames[type];
                if (newFriendlyNames[index]) {
                    value.title =
                        label.length > 0 ? label : newFriendlyNames[index];

                    value.hidden = false;
                } else {
                    value.hidden = true;
                }

                value.title = `${value.title} ${deviceName ? ' : ' : ''} ${
                    deviceName ? '<' + deviceName + '>' : ''
                }`;

                value.title = value.title.trim();

                // refresh the item only if the state was changed
                if (value.title !== lastTitle || value.hidden !== lastHidden) {
                    systray.sendAction({
                        type: 'update-item',
                        item: value,
                    });
                }
            }
        }
    }
};

/**
 * begins synchronizing audio between Voicemeeter and Windows
 */
const startAudioSync = () => {
    connectVoicemeeter()
        .then((vm) => {
            runWinAudio();
            setInitialVolume();
            updateBindingLabels(vm);
        })
        .catch((err) => console.log);
};

export { startAudioSync, rememberCurrentVolume };
