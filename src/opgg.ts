import { chromium, firefox, Browser, Page } from "playwright";
import axios from 'axios';
import cheerio from 'cheerio';
import _ from 'lodash';
import fs from 'fs';
import {champion, championDetail, skillDetail, masterOrder, first3Order, runeSummary, runeDetail, rune, coreItem, startItem, shoe, Champion} from './interface';
import { exit } from "process";

const hostUrl: string = 'https://www.op.gg/champion/';

// 프로미스로 최대 n개까지 동시처리
async function start1() {
    
    let champions: Champion[] = Object.values(JSON.parse(fs.readFileSync('data/champion.json', 'utf-8')).data);
    const broswer = await chromium.launch();
    const maxCnt = 3; // 동시 처리할 갯수
    let currentCnt = 0;

    while (champions.length > 0) {
        if (currentCnt >= maxCnt) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
        }
        const champion: Champion = champions.shift()!;
        const page = await broswer.newPage();
        currentCnt += 1;
        console.log(`====== ${champion.id} 작업시작 ======`);
        getChampionData(champion.id!, champion.key!, page)
            .then(function (championId) {
                currentCnt -= 1;
            })
            .catch(function (err) {
                console.log(err);
                console.log(`${champion.id} 작업중 오류발생`);
                currentCnt -= 1;
                champions.push({id: champion.id, key: champion.key} as Champion);
                page.close();
            })
    }

    await broswer.close();
}
function getChampionDataPromies(championId: string, championKey: number, page: Page) {
    return new Promise(function (resolve, reject) {
        try {
            getChampionData(championId, championKey, page);
            resolve(championId);
        } catch (e) {
            // console.log(e);
            // console.log(`${championId} 작업중 오류발생`);
            reject(e);
        }
    });
}

// 하나씩 처리
async function start() {
    const champions = JSON.parse(fs.readFileSync('data/champion.json', 'utf-8')).data;
    const broswer = await chromium.launch();

    for (const championId in champions) {
        const champion = champions[championId];
        const championKey = champion.key;
        const page = await broswer.newPage();

        console.log(`====== ${championId} 작업시작 ======`);
        try {
            await getChampionData(championId, championKey, page);
        } catch (e) {
            console.log(e);
            console.log(`${championId} 작업중 오류발생`);
        }

        page.close();
    }
    await broswer.close();
}

async function getChampionData(championId: string, championKey: number, page: Page) {
    let champion: champion = {
        id: championId,
        position: [],
        version: '',
    };
    let championDetail: championDetail;

    await page.route('**/*', route => {
        return ['image', 'font', 'stylesheet'].some(el => el === route.request().resourceType())
            ? route.abort() : route.continue();
    });

    const {position, version} = await getPostion(championId, page);
    champion.version = version;
    
    for (const pos of position) {
        let championDetail = {} as championDetail;
        championDetail.spell = await getSpell(championId, pos, page);
        championDetail.skill = await getSkill(championId, championKey, pos, page);
        championDetail.rune = await getRune(championId, championKey, pos, page);
        championDetail.item = await getItem(championId, championKey, pos, page);
        champion[pos] = championDetail;
    }
    
    fs.writeFile(`result/${championId}.json`, JSON.stringify(champion), (err) => {
        if (err) {
            console.log(err);
        }
    })

    await page.close();
}

async function getPostion(championId: string, page: Page) {
    const url = hostUrl + championId + '/' + 'statistics';

    await page.goto(url);
    const position = await page.$$eval('.champion-stats-header__position', node => node.map(el => el.dataset.position!));
    const version = await page.$eval('.champion-stats-header-version', node =>  /\:(.*)/.exec(node.textContent!)![1].trim());

    return {position, version};
}

async function getSpell(championId: string, position: string, page: Page) {
    const url = `${hostUrl}${championId}/statistics/${position}`;

    await page.goto(url);
    const spell = await page.$$eval('.champion-overview__table--summonerspell img.tip', node => node.map(el => /\/spell\/(.*)\.png/.exec(el.getAttribute('src')!)![1]));

    return spell;
}

async function getSkill(championId: string, championKey: number, position: string, page: Page) {
    const url = `${hostUrl}${championId}/statistics/${position}/skill`;
    const url2 = `${hostUrl}ajax/statistics/skillList/championId=${championKey}&position=${position}`;

    // 마스터 순서
    let skillDetail = {
        masterOrder: [],
        first3Order: [],
    } as skillDetail

    await page.goto(url);
    const skillMasterOrderHandle = await page.$$eval("li[data-index]", nodes => nodes.map(n => n.outerHTML.replace(/\t/g, '')));
    skillMasterOrderHandle.pop(); // 마지막은 값이 없음
    for (const skillHtml of skillMasterOrderHandle) {
        const $ = cheerio.load(skillHtml);
        const pickRate: string = $('.champion-stats__filter_item_value--winrate > b').text(); // opgg에서 픽률, 승률 클래스명을 반대로 명시했음
        const winRate: string = $('.champion-stats__filter_item_value--pickrate > b').text();
        const order: string = $('li[title] > span').text();

        let masterOrder: masterOrder = {
            order: order,
            pickRate: pickRate,
            winRate: winRate,
        }
        skillDetail.masterOrder.push(masterOrder);
    }

    // 첫 3레벨
    await page.goto(url2);
    const first3SkillOrderHandle = await page.$$eval('table.champion-stats__table > tbody > tr', nodes => nodes.map(n => n.outerHTML));

    let obj: { [key: string]: number } = {};
    for (const skillHtml of first3SkillOrderHandle) {
        const $ = cheerio.load(skillHtml, null, false);
        const pick: number = parseFloat($('.champion-stats__table__cell--pickrate').text().trim().split(' ')[0].replace('%', ''));
        // const winRate: string = $('td.champion-stats__table__cell--winrate').text().trim();

        const skillOrderElement = $('.champion-skill-build__table > tbody > tr').eq(1).find('td');
        const order: string = skillOrderElement.eq(0).text().trim() + skillOrderElement.eq(1).text().trim() + skillOrderElement.eq(2).text().trim();

        if (!obj.hasOwnProperty(order)) {
            obj[order] = pick;
        } else {
            obj[order] += pick;
        }
    }

    for (const order in obj) {
        let first3Order: first3Order = {
            order: order,
            pickRate: obj[order].toFixed(2) + '%',
        }
        skillDetail.first3Order.push(first3Order);
    }

    return skillDetail;
}

async function getRune(championId: string, championKey: number, position: string, page: Page) {
    const url = `${hostUrl}${championId}/statistics/${position}/rune`;

    // 룬 요약정보 가져오기
    await page.goto(url);

    const runes: rune[] = [];

    const runeSummaryHandle = await page.$$eval("li[data-index]", nodes => nodes.map(n => n.outerHTML.replace(/\t/g, '')));
    runeSummaryHandle.pop();

    for (const runeSummaryHTML of runeSummaryHandle) {
        const $ = cheerio.load(runeSummaryHTML);
        const pickRate: string = $('.champion-stats__filter_item_value--winrate > b').text(); // opgg에서 픽률, 승률 클래스명을 반대로 명시했음
        const winRate: string = $('.champion-stats__filter_item_value--pickrate > b').text();
        const mainRune: string = /\/perk.*\/(.*)\.png/.exec($('img').eq(1).attr('src')!)![1];
        const subRune: string = /\/perk.*\/(.*)\.png/.exec($('img').eq(2).attr('src')!)![1];

        const runeSummary: runeSummary = {
            mainRune: mainRune,
            subRune: subRune,
            pickRate: pickRate,
            winRate: winRate,
        }

        // 요약정보를 가지고 룬 디테일 가져오기
        const url2 = `${hostUrl}ajax/statistics/runeList/championId=${championKey}&position=${position}&primaryPerkId=${mainRune}&subPerkStyleId=${subRune}`;
        await page.goto(url2);
        const runeDetailHandle = await page.$$eval('table.champion-stats__table > tbody > tr', nodes => nodes.map(n => n.outerHTML));

        let runeDetails: runeDetail[] = [];

        for (const runeHtml of runeDetailHandle) {
            const $ = cheerio.load(runeHtml, null, false);
            const pickRate: string = $('.champion-stats__table__cell--pickrate').text().trim().split(' ')[0];
            const winRate: string = $('.champion-stats__table__cell--winrate').text().trim();

            const mainRune = $('.perk-page').eq(0).find('.perk-page__item--active img').map((i, el) => /\/perk.*\/(.*)\.png/.exec($(el).attr('src')!)![1]).toArray();
            const subRune = $('.perk-page').eq(1).find('.perk-page__item--active img').map((i, el) => /\/perk.*\/(.*)\.png/.exec($(el).attr('src')!)![1]).toArray();
            const chipRune = $('.fragment-page').find('.tip.active').map((i, el) => /\/perk.*\/(.*)\.png/.exec($(el).attr('src')!)![1]).toArray();

            const runeDetail: runeDetail = {
                main: mainRune,
                sub: subRune,
                chip: chipRune,
                pickRate: pickRate,
                winRate: winRate,
            }
            runeDetails.push(runeDetail);
        }

        const rune: rune = {
            summary: runeSummary,
            detail: runeDetails,
        }
        runes.push(rune);
    }

    return runes;
}

async function getItem(championId: string, championKey: number, position: string, page: Page) {
    const url = `${hostUrl}${championId}/statistics/${position}/item`;

    const coreItems: coreItem[] = [];
    const startItems: startItem[] = [];
    const shoes: shoe[] = [];

    await page.goto(url);

    const [coreItemsHandle, shoeHandle, startItemsHandle] = await page.$$('.champion-box');

    for (const coreItemsHtml of await coreItemsHandle.$$eval('tbody > tr', nodes => nodes.map(n => n.outerHTML))) {
        const $ = cheerio.load(coreItemsHtml, null, false);
        const pickRate = $('.champion-stats__table__cell--pickrate').text().trim().match(/(.*\%).*/)![1];
        const winRate = $('.champion-stats__table__cell--winrate').text().trim();
        const items = $('.champion-stats__list__item img').map((i, el) => /\/item\/(.*)\.png/.exec($(el).attr('src')!)![1]).toArray();

        const coreItem: coreItem = {
            items: items,
            winRate: winRate,
            pickRate: pickRate,
        }
        coreItems.push(coreItem);
    }

    for (const itemHandle of await startItemsHandle.$$eval('tbody > tr', nodes => nodes.map(n => n.outerHTML))) {
        const $ = cheerio.load(itemHandle, null, false);
        const pickRate = $('.champion-stats__table__cell--pickrate').text().trim().match(/(.*\%).*/)![1];
        const winRate = $('.champion-stats__table__cell--winrate').text().trim();
        const items = $('.champion-stats__list__item img').map((i, el) => /\/item\/(.*)\.png/.exec($(el).attr('src')!)![1]).toArray();

        const startItem: startItem = {
            items: items,
            winRate: winRate,
            pickRate: pickRate,
        }
        startItems.push(startItem);
    }

    for (const itemHandle of await shoeHandle.$$eval('tbody > tr', nodes => nodes.map(n => n.outerHTML))) {
        const $ = cheerio.load(itemHandle, null, false);
        const pickRate = $('.champion-stats__table__cell--pickrate').text().trim().match(/(.*\%).*/)![1];
        const winRate = $('.champion-stats__table__cell--winrate').text().trim();
        const item = /\/item\/(.*)\.png/.exec($('.champion-stats__single__item img').attr('src')!)![1];

        const shoe: shoe = {
            item: item,
            pickRate: pickRate,
            winRate: winRate,
        }
        shoes.push(shoe);
    }

    return { coreItems, startItems, shoes };
}

function championsToArray(champions: any, n: number) {
    const keys = Object.keys(champions);
    const len = keys.length;
    const cnt = Math.floor(len / n) + (Math.floor(len % n) > 0 ? 1 : 0);
    let tmp = [];

    for (let i = 0; i < cnt; i++) {
        let arr = [];
        for (const championId of keys.splice(0, n)) {
            const champion = {
                id: champions[championId].id,
                key: champions[championId].key,
            }
            arr.push(champion);
        }
        tmp[i] = arr;
    }

    return tmp;
}

async function test() {
    const url = "https://www.op.gg/champion/akali/statistics";
    const broswer = await firefox.launch();
    const page = await broswer.newPage();

    await page.route('**/*', route => {
        return ['image', 'font', 'stylesheet'].some(el => el === route.request().resourceType())
            ? route.abort() : route.continue();
    });

    // await page.goto(url);
    // const result = await getItem('lulu',117, 'SUPPORT', page);
    const result = await getPostion('lulu', page);
    console.log(result);

    await broswer.close();
}

test();
