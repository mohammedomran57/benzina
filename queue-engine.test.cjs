const {test}=require('node:test');
const assert=require('node:assert/strict');
const {QueueEngine,validate}=require('./queue-engine.js');
const settings={roi:[0,0,1,1],medium:3,high:8,confidence:.5};
const car=(x=10,y=10)=>({class:'car',score:.9,bbox:[x,y,12,12]});
function feed(engine,fn,end=14){let result;for(let i=0;i<=end*2;i++)result=engine.update(fn(i/2),100,100,i/2);return result;}
test('stationary vehicles mature into a real moderate indicator',()=>{const result=feed(new QueueEngine(settings),()=>[car(10),car(40),car(70)]);assert.equal(result.waiting,3);assert.equal(result.status,'medium');assert.equal(new Set(result.tracks.map(t=>t.id)).size,3);});
test('moving cars do not count as stationary queue evidence',()=>{const result=feed(new QueueEngine(settings),t=>[car(5+t*4)]);assert.equal(result.detected,1);assert.equal(result.waiting,0);assert.equal(result.status,'low');});
test('no detections never means a confirmed empty or uncongested station',()=>{const result=feed(new QueueEngine(settings),()=>[]);assert.equal(result.status,'none');});
test('ROI excludes passing cars; humans and weak detections are ignored',()=>{const e=new QueueEngine({...settings,roi:[.3,.3,.8,.8]});const r=feed(e,()=>[car(40,40),car(1,1),{...car(50,50),class:'person'},{...car(60,60),score:.1}]);assert.equal(r.detected,1);assert.equal(r.waiting,1);});
test('seek and stale frames reset continuity and stationary evidence',()=>{const e=new QueueEngine(settings);feed(e,()=>[car()]);let r=e.update([car()],100,100,20);assert.equal(r.status,'warming');assert.equal(r.waiting,0);r=e.update([car()],100,100,0);assert.equal(r.elapsed,0);assert.equal(r.waiting,0);});
test('a long missed detection cannot retain a waiting vehicle',()=>{const e=new QueueEngine(settings);feed(e,()=>[car()]);for(let t=14.5;t<=17;t+=.5)e.update([],100,100,t);const r=e.update([car()],100,100,17.5);assert.equal(r.waiting,0);});
test('high threshold and one-to-one matching',()=>{const result=feed(new QueueEngine(settings),()=>Array.from({length:8},(_,i)=>car(5+(i%4)*23,5+Math.floor(i/4)*35)));assert.equal(result.status,'high');assert.equal(result.waiting,8);});
test('invalid threshold order and ROI rejected',()=>{assert.equal(validate({...settings,high:2}),false);assert.equal(validate({...settings,roi:[.7,0,.3,1]}),false);assert.throws(()=>new QueueEngine({...settings,confidence:NaN}));});
test('invalid boxes cannot poison tracker',()=>{const e=new QueueEngine(settings);const r=e.update([{...car(),bbox:[NaN,0,2,2]},{...car(),bbox:[0,0,-2,2]}],100,100,0);assert.equal(r.detected,0);});

test('five-second clip supports preliminary density with no mature stationary tracks',()=>{const r=feed(new QueueEngine(settings),()=>[car(10),car(40),car(70)],4.5);assert.equal(r.status,'medium');assert.equal(r.estimated,3);assert.equal(r.waiting,0);});
test('brief observations still cannot produce a classification',()=>{const r=feed(new QueueEngine(settings),()=>[car()],2);assert.equal(r.status,'warming');});
test('median count resists a single missed detection',()=>{const e=new QueueEngine(settings);feed(e,()=>[car(10),car(40),car(70)],4);const r=e.update([car()],100,100,4.5);assert.equal(r.estimated,3);assert.equal(r.status,'medium');});
