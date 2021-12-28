import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

import {champion, championDetail, skillDetail, masterOrder, first3Order, runeSummary, runeDetail, rune, coreItem, startItem, shoe, Champion} from './interface';

let db : FirebaseFirestore.Firestore;

export function init() {
    const serviceAccount = require('../key/firebase-key.json');
    initializeApp({
        credential: cert(serviceAccount)
    });
    db = getFirestore();
}

export async function setChampionData(champion: any) {
    await db.collection('champions').doc(champion.id).set(champion);
}

