import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

import {champion, championDetail, skillDetail, masterOrder, first3Order, runeSummary, runeDetail, rune, coreItem, startItem, shoe, Champion} from './interface';

function init() {
    const serviceAccount = require('../key/firebase-key.json');
    initializeApp({
        credential: cert(serviceAccount)
    });
    const db = getFirestore();
}

function addChampion(champion: champion) {
    
}

export async function test(champion: any) {
    const serviceAccount = require('../key/firebase-key.json');
    initializeApp({
        credential: cert(serviceAccount)
    });
    const db = getFirestore();

    await db.collection('test2').doc(champion.id).set(champion);
}

