const {test}=require('node:test');const assert=require('node:assert/strict');const {merge,tiles}=require('./vehicle-views.js');
test('overlapping views count each vehicle once',()=>{const a={class:'car',score:.9,bbox:[10,10,30,30]};assert.equal(merge([a,{...a,score:.8,bbox:[11,10,30,30]},{...a,bbox:[10,50,30,30]}]).length,2);});
test('vertical ROI tiles cover top and bottom without leaving ROI',()=>{const r=tiles(400,800,[.25,.1,.75,.9]);assert.equal(r[0][1],80);assert.equal(r.at(-1)[1]+r.at(-1)[3],720);assert.ok(r.every(t=>t[0]===100&&t[2]===200&&t[3]===200));});
