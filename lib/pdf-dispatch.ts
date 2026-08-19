"use client";

type TextItem = { str:string; transform:number[] };
export type ParsedDispatch = { date:string; volumes:Record<string,[number,number]>; orders:number; diesel:number; gas:number };

const aliases:[string,string][]=[
  ["MARISCAL","EE.SS. Mariscal Sucre"],["AZARI","E.S. Azari"],["TREBOL","EOSO Trébol SRL"],
  ["MARIA","EOSO María Alejandra"],["MESA","EOSO Mesa Verde"],["OSTRIA","EESS Ostria Gutiérrez · YPFB"],
  ["MORRO","EOSO El Morro"],["MURILLO","EOSO Murillo · Zudáñez"],["AIQUILE","EOSO Aiquile"],
  ["SAN ANTONIO","EOSO San Antonio"],["PUJLLAY","E.S. Pujllay · Tarabuco"],["SERRANO","EESS Serrano · YPFB"],
  ["NAYLER","EOSO Nayler"],["TEJAR","EESS El Tejar · YPFB"],["OQHARIKUNA","EOSO Oqharikuna SRL"],
  ["JUANA","EOSO Juana Azurduy"],
];

export async function parseDispatchPdf(file:File):Promise<ParsedDispatch>{
  const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc=new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs",import.meta.url).toString();
  const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const volumes:Record<string,[number,number]>={};let orders=0,date="";
  for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
    const page=await pdf.getPage(pageNumber),content=await page.getTextContent(),groups=new Map<number,TextItem[]>();
    for(const raw of content.items){if(!("str" in raw))continue;const item=raw as TextItem,y=Math.round(item.transform[5]*2)/2;groups.set(y,[...(groups.get(y)||[]),item])}
    for(const items of groups.values()){
      const line=items.sort((a,b)=>a.transform[4]-b.transform[4]),text=line.map(item=>item.str).join(" ");
      const dateMatch=text.match(/(\d{2})\/(\d{2})\/(\d{2})/);if(!dateMatch)continue;
      date=`20${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      const clientText=line.filter(item=>item.transform[4]>=95&&item.transform[4]<174).map(item=>item.str).join(" ").toUpperCase();
      const alias=aliases.find(([key])=>clientText.includes(key));if(!alias)continue;
      const amounts=line.filter(item=>item.transform[4]>425&&/^\d{1,3}\.\d{3}$/.test(item.str));if(!amounts.length)continue;
      const current=volumes[alias[1]]||[0,0];for(const amount of amounts){const value=Number(amount.str.replace(".",""));if(amount.transform[4]<465)current[0]+=value;else current[1]+=value;orders++}volumes[alias[1]]=current;
    }
  }
  return{date,volumes,orders,diesel:Object.values(volumes).reduce((s,v)=>s+v[0],0),gas:Object.values(volumes).reduce((s,v)=>s+v[1],0)};
}
