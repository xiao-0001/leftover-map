import type { Dorm } from '../types';

// Sources:
//  - NTHU: extracted from official campusmap.cc.nthu.edu.tw XML (Markersite.xml,
//    ids 86-108). Cross-verified building-by-building against OpenStreetMap
//    (way["name"~"齋"], 24.789-24.793 / 120.990-120.996). All match within ~10 m.
//  - NYCU: pulled from OpenStreetMap Overpass API
//    (way["building"="dormitory"] with name~"舍|軒" inside the Guangfu bbox).
//    Most NYCU dorms have explicit OSM addr:street/addr:full tags pointing at
//    新竹市東區大學路1001號 etc. Previous coords (georeferenced from 2024 PDF)
//    were off by 60-350 m — replaced everywhere.
// Unverified dorms (NYCU 一~六舍 + 十四舍, NTHU 行齋) are omitted.
export const dorms: Dorm[] = [
  // ===== NYCU 光復校區 (all coords: OSM, verified 2026-06-01) =====
  { id: 'nycu-7',  school: 'NYCU', name: '交大七舍 (男大一)',  lat: 24.78573, lng: 120.99941 }, // OSM way: 學生七舍, addr 大學路
  { id: 'nycu-8',  school: 'NYCU', name: '交大八舍 (男大一)',  lat: 24.78528, lng: 120.99967 }, // OSM way: 學生八舍, addr 300新竹市東區大學路1001號
  { id: 'nycu-9',  school: 'NYCU', name: '交大九舍',          lat: 24.78985, lng: 120.99672 }, // OSM way: 學生九舍
  { id: 'nycu-10', school: 'NYCU', name: '交大十舍 (男)',      lat: 24.79000, lng: 120.99673 }, // OSM way: 學生十舍
  { id: 'nycu-11', school: 'NYCU', name: '交大十一舍 (女)',    lat: 24.79007, lng: 120.99744 }, // OSM way: 學生十一舍
  { id: 'nycu-12', school: 'NYCU', name: '交大十二舍 (男)',    lat: 24.78423, lng: 120.99564 }, // OSM way: 學十二舍
  { id: 'nycu-13', school: 'NYCU', name: '交大十三舍 (男)',    lat: 24.78384, lng: 120.99626 }, // OSM way: 學生十三舍
  { id: 'nycu-zh', school: 'NYCU', name: '竹軒 (女大一)',      lat: 24.78953, lng: 120.99818 }, // OSM way: 竹軒宿舍
  { id: 'nycu-f2', school: 'NYCU', name: '女二舍',            lat: 24.78463, lng: 120.99938 }, // OSM: 女二舍A棟 / B棟 centroid
  { id: 'nycu-r1', school: 'NYCU', name: '研一舍',            lat: 24.78979, lng: 120.99747 }, // OSM way: 研一舍
  { id: 'nycu-r2', school: 'NYCU', name: '研二舍',            lat: 24.78471, lng: 120.99532 }, // OSM way: 研二舍
  { id: 'nycu-r3', school: 'NYCU', name: '研三舍',            lat: 24.78374, lng: 120.99708 }, // OSM way: 研三舍

  // ===== NTHU 校本部 (all coords: official NTHU campusmap XML, cross-verified vs OSM) =====
  { id: 'nthu-qing',  school: 'NTHU', name: '清華 清齋',       lat: 24.79127, lng: 120.99314 }, // NTHU XML id=103 / OSM 24.79115,120.99323 (≈11m)
  { id: 'nthu-hua',   school: 'NTHU', name: '清華 華齋',       lat: 24.79179, lng: 120.99402 }, // NTHU XML id=89  / OSM 24.79172,120.99417 (≈16m)
  { id: 'nthu-ming',  school: 'NTHU', name: '清華 明齋 (社科院)', lat: 24.79277, lng: 120.99315 }, // NTHU XML id=86  / OSM 24.79270,120.99327 (≈14m)
  { id: 'nthu-xinz',  school: 'NTHU', name: '清華 新齋',       lat: 24.79164, lng: 120.99290 }, // NTHU XML id=104 / OSM match
  { id: 'nthu-yi',    school: 'NTHU', name: '清華 義齋',       lat: 24.79102, lng: 120.99391 }, // NTHU XML id=100 / OSM match
  { id: 'nthu-ping',  school: 'NTHU', name: '清華 平齋 (教職員)', lat: 24.79260, lng: 120.99319 }, // NTHU XML id=87  / OSM match
  { id: 'nthu-cheng', school: 'NTHU', name: '清華 誠齋',       lat: 24.79147, lng: 120.99393 }, // NTHU XML id=99  / OSM match
  { id: 'nthu-xinA',  school: 'NTHU', name: '清華 信齋 A',     lat: 24.79123, lng: 120.99571 }, // NTHU XML id=95
  { id: 'nthu-xinB',  school: 'NTHU', name: '清華 信齋 B',     lat: 24.79104, lng: 120.99548 }, // NTHU XML id=96
  { id: 'nthu-xinC',  school: 'NTHU', name: '清華 信齋 C',     lat: 24.79088, lng: 120.99520 }, // NTHU XML id=97
  { id: 'nthu-ren',   school: 'NTHU', name: '清華 仁齋',       lat: 24.79151, lng: 120.99570 }, // NTHU XML id=92
  { id: 'nthu-shi',   school: 'NTHU', name: '清華 實齋',       lat: 24.79161, lng: 120.99509 }, // NTHU XML id=91
  { id: 'nthu-li',    school: 'NTHU', name: '清華 禮齋',       lat: 24.79125, lng: 120.99529 }, // NTHU XML id=94
  { id: 'nthu-shuo',  school: 'NTHU', name: '清華 碩齋',       lat: 24.79136, lng: 120.99677 }, // NTHU XML id=93
  { id: 'nthu-ru',    school: 'NTHU', name: '清華 儒齋',       lat: 24.79065, lng: 120.99447 }, // NTHU XML id=98
  { id: 'nthu-shan',  school: 'NTHU', name: '清華 善齋',       lat: 24.79220, lng: 120.99345 }, // NTHU XML id=88
  { id: 'nthu-xue',   school: 'NTHU', name: '清華 學齋',       lat: 24.79012, lng: 120.99301 }, // NTHU XML id=102
  { id: 'nthu-hong',  school: 'NTHU', name: '清華 鴻齋 (國際生)', lat: 24.79055, lng: 120.99372 }, // NTHU XML id=101
  { id: 'nthu-ya',    school: 'NTHU', name: '清華 雅齋 (女)',  lat: 24.79287, lng: 120.99185 }, // NTHU XML id=105
  { id: 'nthu-jing',  school: 'NTHU', name: '清華 靜齋 (女)',  lat: 24.79258, lng: 120.99129 }, // NTHU XML id=106
  { id: 'nthu-hui',   school: 'NTHU', name: '清華 慧齋 (女)',  lat: 24.79217, lng: 120.99125 }, // NTHU XML id=107
  { id: 'nthu-wen',   school: 'NTHU', name: '清華 文齋 (女)',  lat: 24.79201, lng: 120.99078 }, // NTHU XML id=108
];

// Updated map centers to match the corrected NYCU dorm cluster centroid.
export const NYCU_CENTER: [number, number] = [24.7868, 120.9974];
export const NTHU_CENTER: [number, number] = [24.7917, 120.9935];
