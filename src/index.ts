/**
 * main entry point for voicemeeter-windows-volume
 */

console.log('typescript conversion ready...');
setTimeout(() => {}, 10000);
/*
// imports *********************************************************************

// local
import { systray, setupPersistantSystray } from './lib/persistantSysTray.js';
import { startAudioSync } from './lib/managers/audioSyncManager.js';
import { getVoicemeeterConnection } from './lib/managers/audioSyncManager.js';
import { getTrayApp } from './trayApp.js';
import { defaults } from './defaultSettings.js';
import { getDirName, getSystemColor } from './lib/util.js';

const settingsPath = `${getDirName()}/settings.json`;

// types ***********************************************************************

type exitOptions = {
    cleanup?: boolean;
    exit?: boolean;
};

// handle app exit *************************************************************

const exitHandler = (options: exitOptions, exitCode: string) => {
    if (options.cleanup) {
        let vm = getVoicemeeterConnection();
        vm && vm.disconnect();
        vm = null;
        systray && systray.kill(false);
        console.log('clean exit');
    }
    if (exitCode) console.log('Exit Code:', exitCode);
    if (options.exit) process.exit();
};
// do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));
// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));
// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

// initialize the tray app *****************************************************
console.log('Voicemeeter Windows Volume started, Process ID: ', process.pid);
getSystemColor().then((color: any) => {
    setupPersistantSystray({
        trayApp: getTrayApp(color),
        defaults,
        settingsPath,
        onReady: () => {
            console.log('Starting audio synchronization');
            startAudioSync();
        },
    });
});
*/