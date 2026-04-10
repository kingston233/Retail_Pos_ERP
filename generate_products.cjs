const fs = require('fs');
const crypto = require('crypto');

const catIds = {
  飲料: "cb3e227e-013c-432c-ba54-1da6d9405727",
  乳製品: "11cf6691-4c9d-421a-b885-fb2f4d17d998",
  熟食: "cebdc11b-a92b-4cbf-b0b1-e28e66589f55",
  輕食: "a74e0b37-b4c7-418b-b8ed-ab845d02fc83",
  零食: "d886bf7f-8156-4884-87db-1adddbf3f945",
  甜點: "89536ab0-a6a2-4b7a-afc3-cd7028c5671b",
  保養: "eb699413-31aa-4dbe-999f-9e341ffeafe7",
  日用品: "5253ec8a-b550-46a7-bcc3-d51104a762d5"
};

const supIds = {
  統一企業: "8cd02d2f-a7cd-4e2c-aa87-a4077fa1300d",
  台灣純水: "467bbd9a-909d-4ae6-9145-75f25dacf303",
  統一鮮食: "18e434e5-c45a-4dac-b90a-d7d2fa6c3968",
  City_Cafe: "99412f29-666c-4cbe-b803-90e41f4b1447",
  可樂農場: "788c065e-3dad-4b7a-9e96-642d61878bbd",
  伊藤園: "f075c5e2-ae28-4ec3-bbbe-dc4d3ddf2a86",
  卡夫亨氏: "285b821f-39cb-41a6-8d77-3752555e7b27",
  大塚製藥: "fdedcc6c-d6c9-424e-a857-30550efa6412",
  我的美麗日記: "ae40959d-e1bf-4c7d-a054-f95b342d9b54",
  維力食品: "c0e6bc1c-ec0a-47f2-9b69-d2235a8a38c3"
};

const defaultSup = "8cd02d2f-a7cd-4e2c-aa87-a4077fa1300d"; // 統一企業

const products = [
  ["可口可樂 600ml", "飲料", "可樂農場", 35],
  ["雪碧 600ml", "飲料", "可樂農場", 35],
  ["芬達橘子汽水 600ml", "飲料", "可樂農場", 35],
  ["爽健美茶 535ml", "飲料", "可樂農場", 25],
  ["御茶園 台灣四季春 500ml", "飲料", "卡夫亨氏", 25],
  ["寶礦力水得 580ml", "飲料", "大塚製藥", 29],
  ["伊藤園 濃味綠茶 530ml", "飲料", "伊藤園", 35],
  ["黑松沙士 600ml", "飲料", defaultSup, 29],
  ["麥香奶茶 300ml", "飲料", "統一企業", 15],
  ["立頓奶茶 300ml", "飲料", defaultSup, 15],
  ["舒跑 運動飲料 590ml", "飲料", "維力食品", 25],
  ["悅氏 礦泉水 600ml", "飲料", "台灣純水", 20],
  ["多喝水 竹碳水 700ml", "飲料", "台灣純水", 20],
  ["果微醺 蘋果氣泡酒", "飲料", defaultSup, 49],
  ["統一 瑞穗全脂鮮乳 930ml", "乳製品", "統一企業", 92],
  ["林鳳營 鮮乳 936ml", "乳製品", defaultSup, 90],
  ["光泉 全脂鮮乳 936ml", "乳製品", defaultSup, 89],
  ["統一 AB優酪乳 206ml", "乳製品", "統一企業", 28],
  ["養樂多 300LIGHT", "乳製品", defaultSup, 15],
  ["貝納頌 經典拿鐵 290ml", "乳製品", "City_Cafe", 35],
  ["左岸咖啡館 曼特寧", "乳製品", "City_Cafe", 30],
  ["統一 布丁 100g", "甜點", "統一企業", 15],
  ["奮起湖 鐵路便當", "熟食", "統一鮮食", 89],
  ["國民便當 (排骨)", "熟食", "統一鮮食", 85],
  ["紐奧良 烤雞腿便當", "熟食", "統一鮮食", 89],
  ["香腸炒飯", "熟食", "統一鮮食", 79],
  ["咖哩豬排飯", "熟食", "統一鮮食", 89],
  ["麻婆豆腐燴飯", "熟食", "統一鮮食", 75],
  ["鮪魚飯糰", "輕食", "統一鮮食", 35],
  ["肉鬆飯糰", "輕食", "統一鮮食", 39],
  ["鮭魚明太子飯糰", "輕食", "統一鮮食", 45],
  ["紐奧良烤雞三明治", "輕食", "統一鮮食", 49],
  ["爆漿火腿起司三明治", "輕食", "統一鮮食", 45],
  ["雞肉生菜沙拉", "輕食", "統一鮮食", 65],
  ["樂事 九州岩燒海苔洋芋片", "零食", defaultSup, 35],
  ["樂事 經典原味洋芋片", "零食", defaultSup, 35],
  ["可樂果 豌豆酥(原味)", "零食", defaultSup, 25],
  ["乖乖 椰子口味", "零食", defaultSup, 25],
  ["義美 小泡芙(巧克力)", "零食", defaultSup, 32],
  ["品客 洋芋片(洋蔥)", "零食", defaultSup, 65],
  ["七七乳加巧克力", "零食", defaultSup, 15],
  ["卡迪那 德州薯條", "零食", defaultSup, 25],
  ["提拉米蘇蛋糕", "甜點", "City_Cafe", 45],
  ["焦糖烤布蕾", "甜點", "City_Cafe", 40],
  ["巧克力瑞士捲", "甜點", "City_Cafe", 35],
  ["鮮奶泡芙", "甜點", "City_Cafe", 35],
  ["我的美麗日記 黑珍珠", "保養", "我的美麗日記", 250],
  ["雪肌粹 洗面乳", "保養", "我的美麗日記", 180],
  ["舒潔 抽取式衛生紙(110抽)", "日用品", defaultSup, 120],
  ["靠得住 衛生棉(日用)", "日用品", defaultSup, 99]
];

let sql = "INSERT INTO inventory (name, barcode, category_id, supplier_id, original_price, current_stock, safety_stock, unit) VALUES\n";

const values = products.map((p, i) => {
  const [name, cat, supKey, price] = p;
  const barcode = "471" + Math.floor(100000000 + Math.random() * 900000000).toString();
  const cId = catIds[cat];
  const sId = supIds[supKey] || defaultSup;
  const stock = Math.floor(10 + Math.random() * 90);
  const safe = Math.floor(5 + Math.random() * 15);
  return `('${name}', '${barcode}', '${cId}', '${sId}', ${price}, ${stock}, ${safe}, '件')`;
});

sql += values.join(",\n") + ";\n";

fs.writeFileSync('insert_products.sql', sql);
console.log("SQL generated!");
