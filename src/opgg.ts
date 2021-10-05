import { chromium, firefox, Browser, Page } from "playwright";
import axios from 'axios';
import cheerio from 'cheerio';
import _ from 'lodash';
import fs from 'fs';

const hostUrl :string = 'https://www.op.gg/champion/';

async function init() {
    const champions = JSON.parse(fs.readFileSync('data/champion.json', 'utf-8')).data;
    const broswer = await chromium.launch();

    for (const championId in champions) {
        const champion = champions[championId];
        const championKey = +champion[championId].key;
        
        await getChampionData(championId, championKey, broswer);

        break;
    }
}

async function getChampionData(championId: string, championKey: number, broswer: Browser) {
    const page = await broswer.newPage();
    interface champion {
        id: string;
        position: (string | undefined)[];
        TOP?: championDetail;
        JUNGLE?: championDetail;
        MID?: championDetail;
        ADC?: championDetail;
        SUPPORT?: championDetail;
    }
    interface championDetail {
        rune: object[];
        skill: object[];
        item: object[];
        spell: string[];
    }

    let champion: champion = {
        id: championId,
        position: [undefined],
    };
    let championDetail: championDetail;

    const position =  await getPostion(championId, page);
    champion.position = position;

    for (const pos in position) {
        let championDetail = {} as championDetail;
        championDetail.spell = await getSpell(championId, pos, page);
        // championDetail.rune = await getRune()
    }

    await broswer.close();
}

async function getPostion(championId: string, page: Page) {
    const url = hostUrl + championId + '/' + 'statistics';

    await page.route('**/*', route => {
        return ['image', 'font', 'stylesheet'].some(el => el === route.request().resourceType())
            ? route.abort() : route.continue();
    });
    await page.goto(url);
    const position = await page.$$eval('.champion-stats-header__position', node  => node.map(el => el.dataset.position));

    return position;
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
    console.log(url2);

    // 마스터 순서
    // await page.goto(url);
    // const skillMasterOrderHandle = await page.$$eval("li[data-index]", nodes => nodes.map(n => n.outerHTML.replace(/\t/g, '')));
    // skillMasterOrderHandle.pop(); // 마지막은 값이 없음
    // for (const skillHtml of skillMasterOrderHandle) {
    //     const $ = cheerio.load(skillHtml);
    //     const pickRate: string = $('.champion-stats__filter_item_value--winrate > b').text(); // opgg에서 픽률, 승률 클래스명을 반대로 명시했음
    //     const winRate: string = $('.champion-stats__filter_item_value--pickrate > b').text();
    //     const order: string = $('li[title] > span').text();
    //     console.log(`order: ${order}`);
    //     console.log(`pick: ${pickRate}`);
    //     console.log(`win: ${winRate}`);
    // }

    // 첫 3레벨
    await page.goto(url2); 
    const first3SkillOrderHandle = await page.$$eval('table.champion-stats__table > tbody > tr', nodes => nodes.map(n => n.outerHTML));
    // console.log(first3SkillOrderHandle[0]);
    
    for(const skillHtml of first3SkillOrderHandle) {
        const $ = cheerio.load(skillHtml);
        console.log($('td.champion-stats__table__cell--winrate').length);
        const pickRate: string = $('td.champion-stats__table__cell--pickrate').text();
        const winRate: string = $('td.champion-stats__table__cell--winrate').text();
        const skillOrderElement = $('.champion-skill-build__table > tbody > tr').eq(1).find('td');
        const first3Order: string = skillOrderElement.eq(0).text().trim() + skillOrderElement.eq(1).text().trim() + skillOrderElement.eq(2).text().trim();
        
        console.log(`order: ${first3Order}`);
        console.log(`pick: ${pickRate}`);
        console.log(`win: ${winRate}`);
    }

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
    const result = await getSkill('lulu',117, 'SUPPORT', page);

    
    await broswer.close();
}

// init();
test();
