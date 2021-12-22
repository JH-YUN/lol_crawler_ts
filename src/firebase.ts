import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

import {champion, championDetail, skillDetail, masterOrder, first3Order, runeSummary, runeDetail, rune, coreItem, startItem, shoe, Champion} from './interface';

function init() {
    const serviceAccount = require('./firebase-key.json');
    initializeApp({
        credential: cert(serviceAccount)
    });
    const db = getFirestore();
}

function addChampion(champion: champion) {
    
}

