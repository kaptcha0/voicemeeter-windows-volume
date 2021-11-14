/**
 * main entry point for voicemeeter-windows-volume
 */

// imports *********************************************************************

// built-in
import os from 'os';
import path from 'path';

// external
import SysTray from 'systray2';

// local
import { PRIORITIES } from './lib/processManager';
import { setupPersistantSystray } from './lib/persistantSysTray';
import { startAudioSync } from './lib/audioSyncManager';

// menu items
import { itemListBindings } from './menuItems/itemListBindings';
import { itemListRestarts } from './menuItems/itemListRestarts';
import { itemListPatches } from './menuItems/itemListPatches';
import { itemShowVoicemeeter } from './menuItems/voicemeeter/itemShowVoicemeeter';
import { itemRestartVoicemeeter } from './menuItems/voicemeeter/itemRestartVoicemeeter';
import { itemRestartAudioEngine } from './menuItems/voicemeeter/itemRestartAudioEngine';
import { itemVisitGithub } from './menuItems/support/itemVisitGithub';
import { itemDonate } from './menuItems/support/itemDonate';
import { itemExit } from './menuItems/itemExit';
import { STRING_MENU_ITEMS, STRING_METADATA } from './lib/strings';

// configuration ***************************************************************

// default settings
const defaults = {
    polling_rate: 100,
    gain_min: -60,
    gain_max: 12,
    start_with_windows: true,
    limit_db_gain_to_0: false,
    remember_volume: false,
    disable_donate: false,
    audiodg: {
        priority: PRIORITIES.HIGH,
        affinity: 2,
    },
    toggles: [
        {
            setting: 'restart_audio_engine_on_device_change',
            value: false,
        },
        {
            setting: 'restart_audio_engine_on_app_launch',
            value: false,
        },
    ],
};
const settingsPath = `${__dirname}/settings.json`;

// tray app menu
const trayApp = {
    menu: {
        icon:
            os.platform() === 'win32'
                ? path.normalize(__dirname + '/assets/app.ico')
                : path.normalize(__dirname + '/assets/app.png'),
        title: STRING_METADATA.friendlyname,
        tooltip: STRING_METADATA.friendlyname,
        items: [
            {
                title: `${STRING_METADATA.friendlyname.toUpperCase()}\tv${
                    STRING_METADATA.version
                }`,
                enabled: false,
            },
            itemListBindings(),
            itemListRestarts(),
            itemListPatches(),
            SysTray.separator,
            { title: STRING_MENU_ITEMS['itemVMTitle'], enabled: false },
            itemShowVoicemeeter(),
            itemRestartVoicemeeter(),
            itemRestartAudioEngine(),
            SysTray.separator,
            { title: STRING_MENU_ITEMS['itemSupportTitle'], enabled: false },
            itemVisitGithub(),
            itemDonate(),
            SysTray.separator,
            itemExit({
                click: () => {
                    process.exit();
                },
            }),
        ],
    },
    debug: false,
    copyDir: true, // this is required since we're compiling to an exe
};

// initialize the tray app *****************************************************

console.log('Voicemeeter Windows Volume started, Process ID: ', process.pid);
const systray = setupPersistantSystray({
    trayApp,
    defaults,
    settingsPath,
    onReady: () => {
        console.log('Starting audio synchronization');
        startAudioSync();
    },
});
