/* Experimental image-space tracking, NOT calibrated distance or waiting-time measurement.
 * No generated detections: inputs must be supplied by the vision model.
 * Pure module shared by the browser and node:test. */
(function (root) {
  'use strict';
  const vehicleClasses = new Set(['car', 'truck', 'bus', 'motorcycle']);
  const center = b => [b[0] + b[2] / 2, b[1] + b[3] / 2];
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  function iou(a, b) {
    const overlap = Math.max(0, Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0])) *
      Math.max(0, Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]));
    return overlap / Math.max(1e-9, a[2]*a[3]+b[2]*b[3]-overlap);
  }
  function validate(settings) {
    return Number.isInteger(settings.medium) && Number.isInteger(settings.high) &&
      settings.medium >= 1 && settings.high > settings.medium && settings.high <= 100 &&
      Number.isFinite(settings.confidence) && settings.confidence >= .2 && settings.confidence <= .9 &&
      settings.roi.length === 4 && settings.roi.every(Number.isFinite) &&
      settings.roi[0] >= 0 && settings.roi[1] >= 0 && settings.roi[2] <= 1 && settings.roi[3] <= 1 &&
      settings.roi[2]-settings.roi[0] >= .05 && settings.roi[3]-settings.roi[1] >= .05;
  }
  class QueueEngine {
    constructor(settings) { this.settings = settings; if(!validate(settings)) throw Error('Invalid settings'); this.reset(); }
    reset() { this.tracks=[]; this.nextId=1; this.started=null; this.last=null; this.frames=0; this.candidate=null; this.since=null; this.counts=[]; }
    update(predictions, width, height, seconds) {
      if(!Number.isFinite(seconds)||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Invalid frame');
      // A seek, freeze or very slow inference breaks evidence continuity.
      if(this.last!==null && (seconds<=this.last || seconds-this.last>3))this.reset();
      if(this.started===null)this.started=seconds;
      this.last=seconds;this.frames++;
      const [left,top,right,bottom]=this.settings.roi;
      const detections=predictions.filter(p=>vehicleClasses.has(p.class) && p.score>=this.settings.confidence &&
        Array.isArray(p.bbox)&&p.bbox.length===4&&p.bbox.every(Number.isFinite)&&p.bbox[2]>0&&p.bbox[3]>0)
        .map(p=>({...p,box:[p.bbox[0]/width,p.bbox[1]/height,p.bbox[2]/width,p.bbox[3]/height]}))
        .filter(p=>{const [x,y]=center(p.box);return x>=left&&x<=right&&y>=top&&y<=bottom;});
      this.tracks=this.tracks.filter(track=>seconds-track.last<=1.5);
      const matches=[];
      detections.forEach((d,di)=>this.tracks.forEach((tr,ti)=>{
        const overlap=iou(d.box,tr.box),delta=distance(center(d.box),center(tr.box));
        const size=d.box[2]*d.box[3]/(tr.box[2]*tr.box[3]);
        if(size>.4&&size<2.5&&(overlap>.2||delta<.04))matches.push({di,ti,cost:1-overlap+delta});
      }));
      matches.sort((a,b)=>a.cost-b.cost);
      const usedD=new Set(),usedT=new Set(),assignment=new Map();
      for(const m of matches)if(!usedD.has(m.di)&&!usedT.has(m.ti)){usedD.add(m.di);usedT.add(m.ti);assignment.set(m.di,this.tracks[m.ti]);}
      const current=detections.map((d,i)=>{
        let tr=assignment.get(i);
        if(!tr){tr={id:this.nextId++,box:d.box,anchor:center(d.box),first:seconds,stillSince:seconds,hits:0};this.tracks.push(tr);}
        if(distance(center(d.box),tr.anchor)>.02){tr.anchor=center(d.box);tr.stillSince=seconds;}
        tr.box=d.box;tr.last=seconds;tr.hits++;
        return {...d,id:tr.id,observed:seconds-tr.first,stationary:seconds-tr.stillSince,
          waiting:tr.hits>=3&&seconds-tr.stillSince>=8};
      });
      const waiting=current.filter(tr=>tr.waiting).length;
      const age=seconds-this.started;
      this.counts.push(current.length);if(this.counts.length>5)this.counts.shift();
      const sorted=this.counts.slice().sort((a,b)=>a-b),estimated=sorted[Math.floor(sorted.length/2)];
      let status='warming';
      if(age>=3&&this.frames>=5){
        const candidate=current.length===0?'none':estimated>=this.settings.high?'high':estimated>=this.settings.medium?'medium':'low';
        if(candidate!==this.candidate){this.candidate=candidate;this.since=seconds;}
        // Never show the old status while a changed scene is being confirmed.
        status=seconds-this.since>=.5?candidate:'settling';
      }
      return {detected:current.length,estimated,waiting,status,tracks:current,elapsed:age};
    }
  }
  const api={QueueEngine,validate,iou};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.QueueVision=api;
})(globalThis);
