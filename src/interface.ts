export interface champion {
    [index: string]: any;
    id: string;
    version: string;
    position: any;
    TOP?: championDetail;
    JUNGLE?: championDetail;
    MID?: championDetail;
    ADC?: championDetail;
    SUPPORT?: championDetail;
}
export interface championDetail {
    rune: object[];
    skill: object;
    item: object;
    spell: string[];
}
export interface skillDetail {
    masterOrder: masterOrder[];
    first3Order: first3Order[];
}
export interface masterOrder {
    order: string;
    pickRate: string;
    winRate: string;
}
export interface first3Order {
    order: string;
    pickRate: string;
}
export interface runeSummary {
    mainRune: string,
    subRune: string,
    pickRate: string,
    winRate: string,
}
export interface runeDetail {
    main: string[],
    sub: string[],
    chip: string[],
    pickRate: string,
    winRate: string,
}
export interface rune {
    summary: runeSummary,
    detail: runeDetail[],
}
export interface coreItem {
    items: string[],
    pickRate: string,
    winRate: string,
}
export interface startItem {
    items: string[],
    pickRate: string,
    winRate: string,
}
export interface shoe {
    item: string,
    pickRate: string,
    winRate: string,
}
export interface Champion {
    id?: string,
    key?: number,
}
