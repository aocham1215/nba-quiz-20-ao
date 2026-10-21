import { getStore } from '@netlify/blobs';
const headers = {'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const send=(status,data)=>new Response(JSON.stringify(data),{status,headers});
const storeName='nba-quiz-scores-v1';
export default async (req)=>{
 try {
  const store=getStore(storeName);
  if(req.method==='GET'){
   const entries=[]; let cursor;
   do {
    const page=await store.list({prefix:'score-',paginate:false,cursor});
    for(const item of page.blobs){const row=await store.get(item.key,{type:'json'});if(row&&typeof row.name==='string'&&Number.isInteger(row.score))entries.push(row);}
    cursor=page.cursor;
   }while(cursor&&entries.length<1000);
   entries.sort((a,b)=>b.score-a.score||a.createdAt.localeCompare(b.createdAt));
   return send(200,{ranking:entries.slice(0,100),total:entries.length});
  }
  if(req.method==='POST'){
   const raw=await req.text();if(raw.length>2000)return send(413,{error:'送信内容が大きすぎます'});
   const data=JSON.parse(raw);
   const name=String(data.name||'').trim().replace(/[<>]/g,'');
   const score=Number(data.score);
   const detail=data.detail;
   if(name.length<1||name.length>20||!Number.isInteger(score)||score<0||score>100||!Array.isArray(detail)||detail.length!==20||detail.some(x=>![0,1,3,5].includes(x))||detail.reduce((a,b)=>a+b,0)!==score)return send(400,{error:'記録の形式が正しくありません'});
   const row={name,score,detail,createdAt:new Date().toISOString(),id:crypto.randomUUID()};
   await store.setJSON('score-'+row.id,row);
   return send(201,{ok:true,id:row.id});
  }
  return send(405,{error:'対応していない操作です'});
 }catch(e){console.error(e);return send(500,{error:'ランキングを取得・保存できませんでした。NetlifyのFunctionsとBlobs設定を確認してください。'});}
};
