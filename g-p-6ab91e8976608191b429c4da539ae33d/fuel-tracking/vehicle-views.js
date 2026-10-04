/* Multiple views of the same captured frame; coordinates are merged before tracking. */
(function(root){
const vehicle=new Set(['car','truck','bus','motorcycle']);
function overlap(a,b){const area=Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]));return area/(a[2]*a[3]+b[2]*b[3]-area||1);}
function merge(items){const kept=[];for(const p of items.filter(p=>vehicle.has(p.class)).sort((a,b)=>b.score-a.score)){if(!kept.some(q=>overlap(p.bbox,q.bbox)>.4))kept.push(p);}return kept;}
function tiles(width,height,roi){const l=Math.max(0,roi[0]*width),t=Math.max(0,roi[1]*height),w=(roi[2]-roi[0])*width,h=(roi[3]-roi[1])*height;const side=Math.min(w,h),span=Math.max(w,h)-side,n=Math.min(8,Math.max(1,Math.ceil(span/(side*.55))+1));return Array.from({length:n},(_,i)=>[l+(w>h&&n>1?span*i/(n-1):0),t+(h>=w&&n>1?span*i/(n-1):0),side,side]);}
async function detect(model,frame,roi,score,active=()=>true){let predictions=await model.detect(frame,100,score);const crop=document.createElement('canvas');crop.width=640;crop.height=640;const ctx=crop.getContext('2d');for(const [x,y,w,h] of tiles(frame.width,frame.height,roi)){if(!active())return [];ctx.drawImage(frame,x,y,w,h,0,0,640,640);const result=await model.detect(crop,100,score);predictions.push(...result.filter(p=>p.bbox[0]>3&&p.bbox[1]>3&&p.bbox[0]+p.bbox[2]<637&&p.bbox[1]+p.bbox[3]<637).map(p=>({...p,bbox:[x+p.bbox[0]*w/640,y+p.bbox[1]*h/640,p.bbox[2]*w/640,p.bbox[3]*h/640]})));}return merge(predictions);}
const api={merge,tiles,detect};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VehicleViews=api;
})(globalThis);
