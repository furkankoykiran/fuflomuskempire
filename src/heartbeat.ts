import { storage } from './index.js';
import { MuskEmpireAccount } from './util/config.js';
import { dateNowInSeconds } from './util/date.js';
import { Color, Logger } from '@starkow/logger';
import { getMuskEmpireApiKey } from './telegram-auth.js';
import { upgrader } from './modules/upgrader.js';
import { offlineBonusClaimer } from './modules/offline-bonus-claimer.js';
import { combater } from './modules/combater.js';
import { tapper } from './modules/tapper.js';

const log = Logger.create('[HEARTBEAT]');

const modules = {
    upgrader: upgrader,
    'offline-bonus-claimer': offlineBonusClaimer,
    combater: combater,
    tapper: tapper,
};

export async function startHeartbeat() {
    for (const account of Object.values(storage.data.accounts)) {
        const authData = await getMuskEmpireApiKey(account.clientName);

        await accountHeartbeat(account, authData.apiKey);
    }
}

async function accountHeartbeat(account: MuskEmpireAccount, apiKey: string) {
    try {
        for (const module of account.modules) {
            const key = module as keyof typeof modules;
            await modules[key](account, apiKey);
        }
    } catch (e) {
        log.error(
            Logger.color(account.clientName, Color.Cyan),
            Logger.color('|', Color.Gray),
            'Ошибка при обновлении аккаунта:',
            e
        );

        apiKey = (await getMuskEmpireApiKey(account.clientName)).apiKey;
    } finally {
        setTimeout(accountHeartbeat, 1000, account, apiKey);
    }
}

export function isCooldownOver(
    cooldown: keyof MuskEmpireAccount['currentCooldowns'],
    account: MuskEmpireAccount
): boolean {
    return account.currentCooldowns[cooldown] <= dateNowInSeconds();
}

export function setCooldown(
    cooldown: keyof MuskEmpireAccount['currentCooldowns'],
    account: MuskEmpireAccount,
    time: number
) {
    storage.update((data) => {
        data.accounts[account.clientName].currentCooldowns[cooldown] =
            dateNowInSeconds() + time;
    });
}
