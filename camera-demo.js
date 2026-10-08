/* Additive phone-camera pilot. Video stays in this browser; results are session-only.
   This uses real COCO-SSD inference. Never substitute random or simulated detections. */
(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const bi = (ar,en) => `data-ar="${ar}" data-en="${en}"`;
  const navigation=document.querySelector('nav');
  document.querySelector('[data-tab="reports"]').hidden=true;
  const button=document.createElement('button');button.id='cameraTab';button.dataset.tab='cameraPanel';button.dataset.ar='📷 تجربة الكاميرا';button.dataset.en='📷 Camera demo';navigation.append(button);
  const panel=document.createElement('section');panel.id='cameraPanel';panel.className='panel';panel.hidden=true;
  panel.innerHTML=`
    <div class="section-heading"><div class="camera-intro"><span class="camera-tag" ${bi('تجربة فعلية بكاميرا الهاتف · ليست خدمة تشغيل معتمدة','PHONE CAMERA PILOT · NOT A VALIDATED OPERATIONAL SERVICE')}></span><h2 ${bi('شاهد كيف يقيس النظام الطابور','See how the system observes a queue')}></h2><p ${bi('ثبّت الهاتف، حدد منطقة الانتظار، ثم ابدأ التحليل. يمكن أيضاً اختيار فيديو مصوّر بالهاتف.','Mount the phone, select the queue area, then start analysis. You can also choose a video recorded on your phone.')}></p></div></div>
    <div class="camera-layout"><div class="camera-box">
      <label><span ${bi('ربط التجربة بمحطة في النموذج','Associate this demo with a sample station')}></span><select id="camStation"></select></label>
      <div class="camera-controls"><button id="camOpen" class="primary" ${bi('فتح كاميرا الهاتف','Open phone camera')}></button><label class="camera-file"><span ${bi('اختيار فيديو من الهاتف','Choose phone video')}></span><input id="camFile" type="file" accept="video/*" aria-label="Choose a local phone video"></label></div>
      <div class="camera-stage" id="camStage"><video id="camVideo" muted playsinline preload="metadata"></video><canvas id="camCanvas" aria-label="Video analysis and queue area" tabindex="0"></canvas><div class="camera-placeholder" id="camPlaceholder"><strong>▣</strong><span ${bi('اختر كاميرا أو فيديو لبدء تجربة حقيقية','Choose a camera or video to start a real demonstration')}></span></div></div>
      <p class="camera-source" id="camSource"></p><p id="camMessage" class="camera-message" role="status" aria-live="polite"></p>
      <div class="camera-controls"><button id="camStart" class="primary" disabled ${bi('بدء التحليل الآلي','Start AI analysis')}></button><button id="camStop" disabled ${bi('إيقاف وإغلاق الكاميرا','Stop & release camera')}></button><button id="camReplay" disabled ${bi('إعادة الفيديو','Replay video')}></button></div>
      <progress id="camProgress" class="camera-progress" value="0" max="1" aria-label="Video progress" hidden></progress>
      <p class="camera-note" ${bi('اسحب مستطيلاً فوق الصورة لتحديد منطقة الطابور فقط. المربعات الزرقاء: مركبات مرصودة؛ البرتقالية: ساكنة تقريباً لمدة ٨ ثوانٍ. ثبّت الهاتف طوال الاختبار.','Drag a rectangle over the image to include only the queue. Blue boxes: detected vehicles; orange: approximately stationary for 8 seconds. Keep the phone fixed throughout the test.')}></p>
      <details><summary ${bi('إعدادات منطقة الرصد والتصنيف','Queue area and classification settings')}></summary><div class="camera-settings">
        <label><span ${bi('الحد الأدنى لدرجة الكشف','Minimum detection score')}></span><select id="camConfidence"><option value="0.4">40%</option><option value="0.5" selected>50%</option><option value="0.6">60%</option><option value="0.7">70%</option></select></label>
        <label><span ${bi('ازدحام متوسط يبدأ من','Moderate starts at')}></span><input id="camMedium" type="number" min="1" max="99" step="1" value="3"></label>
        <label><span ${bi('ازدحام مرتفع يبدأ من','High starts at')}></span><input id="camHigh" type="number" min="2" max="100" step="1" value="8"></label>
        <label><span ${bi('متوسط خدمة السيارة بالدقائق (افتراض)','Minutes per vehicle (assumption)')}></span><input id="camService" type="number" min="0.5" max="30" step="0.5" value="3"></label><label><span ${bi('مسارات خدمة متزامنة (افتراض)','Simultaneous service lanes (assumption)')}></span><input id="camLanes" type="number" min="1" max="20" step="1" value="2"></label><button id="camResetROI" ${bi('توسيع منطقة الرصد','Use full queue area')}></button>
        <div class="wide camera-roi-fields"><label><span ${bi('يسار %','Left %')}></span><input id="camLeft" type="number" min="0" max="95" value="10"></label><label><span ${bi('أعلى %','Top %')}></span><input id="camTop" type="number" min="0" max="95" value="15"></label><label><span ${bi('يمين %','Right %')}></span><input id="camRight" type="number" min="5" max="100" value="90"></label><label><span ${bi('أسفل %','Bottom %')}></span><input id="camBottom" type="number" min="5" max="100" value="90"></label></div>
      </div><p class="camera-note" ${bi('التصنيف الأولي حسب وسيط عدد المركبات في آخر ٥ قراءات داخل المنطقة، بحدود تجريبية قابلة للمعايرة لكل محطة. درجة الكشف ليست نسبة دقة النظام.','Preliminary classification uses the median vehicle count over the last five readings inside the area, with thresholds to calibrate per station. Detection score is not system accuracy.')}></p></details>
      <label class="camera-check"><input id="camConfirm" type="checkbox"><span ${bi('الهاتف ثابت والمنطقة المحددة تمثل الطابور، وليست موقف سيارات أو طريقاً عابراً.','The phone is fixed and the selected area is a queue, not a car park or through road.')}></span></label>
    </div><aside class="camera-box"><h3 ${bi('القراءة الآلية','Automatic observation')}></h3><div id="camStatus" class="camera-status" data-level="unknown"></div><div class="camera-metrics"><div class="camera-metric"><b id="camCount">—</b><span ${bi('مركبات مرصودة داخل المنطقة','Vehicles detected in area')}></span></div><div class="camera-metric"><b id="camWaiting">—</b><span ${bi('مركبات ساكنة تقريباً','Approximately stationary vehicles')}></span></div><div class="camera-metric"><b id="camSeconds">—</b><span ${bi('ثوانٍ من الرصد المتصل','Seconds of continuous observation')}></span></div><div class="camera-metric"><b id="camLatency">—</b><span ${bi('زمن التحليل بالمللي ثانية','Inference time in milliseconds')}></span></div></div>
      <section id="camSummary" class="camera-summary" hidden aria-live="polite"></section><p class="camera-note" id="camMethod"></p><p class="camera-result-note" ${bi('يبدأ التقييم الأولي بعد نحو ٣–٤ ثوانٍ من القراءات المتصلة، ليناسب فيديو من ٥ ثوانٍ. المستوى يعتمد على عدد المركبات المرصودة داخل المنطقة، وليس إثباتاً أنها تنتظر الوقود. عند غياب الكشوف لا نستنتج أن المحطة خالية.','Preliminary assessment starts after about 3–4 seconds of continuous readings, suitable for a 5-second clip. Levels use vehicles observed inside the area, not proof they are queueing for fuel. No detections do not establish that the station is empty.')}></p>
      <button id="camExport" disabled ${bi('تنزيل سجل التجربة CSV','Download observation log CSV')}></button><p class="camera-note" ${bi('السجل أرقام فقط دون صور، ويُحفظ آخر ٣٦٠٠ قراءة لهذه الجلسة.','The log contains numbers, not images, and retains the latest 3,600 observations for this session.')}></p><div id="camAudit" class="camera-audit" aria-label="Recent observations"></div>
    </aside></div>
    <details class="camera-box camera-guide" open><summary ${bi('طريقة العرض أمام الوزارة','How to demonstrate it to the ministry')}></summary><ol>
      <li ${bi('صوّر ٣٠–٦٠ ثانية لطابور سيارات من مكان ثابت وآمن ومصرح به. لا تصوّر أثناء القيادة.','Record 30–60 seconds of a vehicle queue from a fixed, safe, permitted location. Do not film while driving.')}></li>
      <li ${bi('اختر الفيديو هنا، أو افتح الصفحة عبر HTTPS على الهاتف واضغط فتح الكاميرا. رابط localhost على الحاسوب لا يفتح الحاسوب من الهاتف.','Choose the video here, or open this page over HTTPS on the phone and tap Open camera. A localhost link on a laptop does not point to the laptop from your phone.')}></li>
      <li ${bi('حدد منطقة الطابور ثم أكد ثبات الهاتف واضغط بدء التحليل. يُحمّل نموذج الكشف محلياً من الملفات المرفقة.','Select only the queue area, confirm the phone is fixed, and start analysis. The detector loads locally from the bundled vendor folder.')}></li>
      <li ${bi('راقب المربعات والعدد وتغيّر الحالة، ثم نزّل السجل. قارن النتائج بعدّ يدوي لعينة لتقييم الدقة قبل أي اعتماد.','Observe boxes, counts and status changes, then download the log. Compare a sample with a manual count to evaluate accuracy before adoption.')}></li>
    </ol><p ${bi('الفيديو يُحلّل في هذا المتصفح ولا يُرفع إلى خادم. النتائج تظهر في هذا الجهاز فقط ولا تُرسل إلى الوزارة أو إلى حاسوب آخر. الخلفية وحركة الهاتف والحجب قد تسبب أخطاء.','Video is analyzed in this browser and is not uploaded. Results appear on this device only; they are not sent to the ministry or another computer. Background, phone movement and occlusion can cause errors.')}></p><p><a href="camera-demo-guide.html" target="_blank" rel="noopener" ${bi('فتح دليل التشغيل والمحددات','Open setup guide and limitations')}></a></p></details>`;
  document.querySelector('footer').before(panel);
  const ops=document.createElement('div');ops.className='camera-ops';ops.id='camOps';byId('opsStats').after(ops);
  const video=byId('camVideo'),canvas=byId('camCanvas'),ctx=canvas.getContext('2d');
  const frame=document.createElement('canvas'),frameContext=frame.getContext('2d',{willReadFrequently:true});
  let source=null,stream=null,objectURL=null,model=null,modelPromise=null;
  let generation=0,running=false,pending=false,timer=null,engine=null,latest=null,lastResultAt=0;
  let completed=null;
  let sessionStation=1,rows=[],lastLogged=-Infinity,lastFrameTime=-1,drawStart=null;
  let status='idle',messageCode='ready',messageDetail='',latency=0,modelState='unloaded';
  let roi=[.1,.15,.9,.9];
  const texts={
    idle:['بانتظار مصدر فيديو','Waiting for video'],loading:['جارٍ تجهيز التحليل','Preparing analysis'],
    warming:['تجميع قراءات متصلة','Collecting observations'],settling:['تأكيد تغير المشهد','Confirming scene change'],
    none:['لم تُرصد مركبات','No vehicles detected'],low:['مؤشر ازدحام خفيف','Low congestion indicator'],
    medium:['مؤشر ازدحام متوسط','Moderate congestion indicator'],high:['مؤشر ازدحام مرتفع','High congestion indicator'],
    stopped:['متوقف · لا توجد قراءة حالية','Stopped · No current reading'],ended:['انتهى الفيديو · قراءة مسجلة','Video ended · Recorded observation'],
    unavailable:['تعذر التقييم','Assessment unavailable'],ready:['اختر كاميرا أو فيديو، ثم حدد منطقة الطابور.','Choose a camera or video, then select the queue area.'],
    preview:['المصدر جاهز. حدد منطقة الطابور ثم ابدأ التحليل.','Source ready. Select the queue area, then start analysis.'],
    model:['جارٍ تنزيل نموذج الكشف الحقيقي؛ قد يستغرق أول تشغيل بعض الوقت.','Downloading the real detector; the first run may take a little time.'],
    active:['تحليل فعلي داخل الجهاز. حافظ على ثبات الهاتف.','Real on-device analysis. Keep the phone fixed.'],
    secure:['الكاميرا المباشرة تحتاج HTTPS على الهاتف أو localhost على نفس الجهاز. استخدم فيديو مسجلاً الآن أو افتح رابط HTTPS موثوقاً؛ لا تتجاوز تحذيرات المتصفح.','Live camera needs HTTPS on a phone or localhost on this device. Use a recorded video now or a trusted HTTPS address; do not bypass browser warnings.'],
    permission:['لم يُسمح باستخدام الكاميرا. اسمح بها من المتصفح أو اختر فيديو مسجلاً.','Camera permission was not granted. Allow it in your browser or choose a recorded video.'],
    cameraError:['تعذر فتح الكاميرا؛ قد تكون مشغولة أو غير متاحة. جرّب فيديو مسجلاً.','Camera unavailable or in use. Try a recorded video.'],
    modelError:['تعذر تحميل أحد مكونات الكشف. راجع مسار الملف الموضح أدناه وتأكد من نشره، ثم أعد المحاولة. تفاصيل:','A detector component could not load. Check the file path below is published, then retry. Details:'],
    videoError:['تعذر قراءة الفيديو. جرّب مقطع MP4 بترميز H.264 قصيراً.','Could not read this video. Try a short H.264 MP4 clip.'],
    settings:['راجع القيم: الحد المرتفع أكبر من المتوسط، والمنطقة مستطيل لا يقل عن ٥٪ عرضاً وارتفاعاً.','Check settings: high must exceed moderate, and the rectangle must be at least 5% wide and high.'],
    confirm:['أكد أولاً أن الهاتف ثابت وأن المنطقة تمثل الطابور.','First confirm that the phone is fixed and the area is a queue.'],
    paused:['تم الإيقاف. أعد فتح الكاميرا أو ابدأ الفيديو من جديد للاستئناف.','Stopped. Reopen the camera or restart video to resume.'],
    hidden:['توقف التحليل وأُغلقت الكاميرا عند مغادرة التبويب.','Analysis stopped and the camera was released when leaving the tab.'],
    endedMessage:['انتهى المقطع. النتائج مسجلة وليست حالة مباشرة؛ يمكنك تنزيل السجل أو إعادة الفيديو.','Clip ended. Results are recorded, not live; download the log or replay.'],
    stale:['توقفت الإطارات أو تأخر التحليل. تعذر تقييم الحالة الحالية؛ أعد المحاولة بمقطع أقل دقة.','Frames stopped or inference stalled. Current assessment unavailable; retry with a lower-resolution clip.'],
    inferenceError:['تعذر تحليل الإطار على هذا الجهاز. أعد المحاولة أو استخدم متصفحاً حديثاً على حاسوب.','Frame analysis failed on this device. Retry or use a current desktop browser.'],
    reset:['تغيرت الإعدادات؛ بدأ تجميع القراءات من جديد.','Settings changed; observation continuity has been reset.']
  };
  const text=key=>{const pair=texts[key]||texts.unavailable;return t(pair[0],pair[1]);};
  function settings(){return {roi:roi.slice(),medium:Number(byId('camMedium').value),high:Number(byId('camHigh').value),confidence:Number(byId('camConfidence').value)};}
  function labelSource(){return source==='camera'?t('كاميرا الجهاز المباشرة','Live device camera'):source==='video'?t('فيديو هاتف مسجل','Recorded phone video'):t('لا يوجد مصدر','No source');}
  function setMessage(code,detail=''){messageCode=code;messageDetail=detail;byId('camMessage').textContent=text(code)+(detail?' '+detail:'');byId('camMessage').classList.toggle('error',['secure','permission','cameraError','modelError','videoError','settings','inferenceError','stale'].includes(code));}
  function fresh(){return running&&latest&&Date.now()-lastResultAt<5000;}
  function resultText(){if(!fresh())return text(['ended','idle','loading','unavailable'].includes(status)?status:'stopped');return `${labelSource()} · ${text(status)} · ${latest.detected} ${t('مرصودة','detected')} / ${latest.waiting} ${t('ساكنة','stationary')}`;}
  function syncResults(){
    if(window.stationWorkflowReady){window.dispatchEvent(new Event("waqood-refresh"));return;}
    const station=stations.find(s=>s.id===sessionStation);
    const pilotStat=byId('opsStats').children[2];
    if(pilotStat){pilotStat.querySelector('strong').textContent=rows.length;pilotStat.querySelector('span').textContent=t('قراءات تجربة الكاميرا المحلية','Local camera-demo observations');}
    byId('camOps').replaceChildren();const heading=document.createElement('strong');heading.textContent=t('تجربة تقييم الازدحام بالكاميرا','Camera congestion demonstration');
    const p=document.createElement('p');p.textContent=(station?name(station)+' · ':'')+resultText();byId('camOps').append(heading,p);
    const note=document.createElement('small');note.textContent=t('نتائج محلية تجريبية منفصلة عن مؤشرات البيانات النموذجية أعلاه.','Local experimental results, separate from the sample-data metrics above.');byId('camOps').append(note);
    document.querySelectorAll('#cards .station').forEach(card=>{
      const action=card.querySelector('[data-report]');if(!action)return;action.textContent=t('📷 تقييم بالكاميرا','📷 Camera assessment');
      const id=Number(action.dataset.report);let block=card.querySelector('.camera-overlay-result');
      if(id!==sessionStation||!source){block?.remove();card.querySelector('.wait').hidden=false;return;}
      card.querySelector('.wait').hidden=true;
      if(!block){block=document.createElement('div');block.className='camera-overlay-result';card.querySelector('.wait').after(block);}
      block.textContent=resultText();
    });
    if(typeof stationMap!=='undefined'&&stationMap&&!stationMap._cameraDemoHook){stationMap._cameraDemoHook=true;stationMap.on('popupopen',e=>{const b=e.popup.getElement()?.querySelector('button');if(b)b.textContent=t('📷 تقييم بالكاميرا','📷 Camera assessment');});}
  }
  function display(){
    byId('camStatus').textContent=text(status);byId('camStatus').dataset.level=fresh()?status:'unknown';
    const reading=fresh()?latest:completed?.reading;
    byId('camCount').textContent=reading?reading.detected:'—';byId('camWaiting').textContent=reading?reading.waiting:'—';
    byId('camSeconds').textContent=reading?reading.elapsed.toFixed(1):'—';byId('camLatency').textContent=reading?Math.round(completed?completed.latency:latency):'—';
    renderSummary();
    byId('camMethod').textContent=modelState==='ready'?t('الكشف: COCO-SSD Lite. تتبع تجريبي بمطابقة الصناديق. السكون: حركة أقل من ٢٪ من أبعاد الصورة لمدة ٨ ثوانٍ.','Detector: COCO-SSD Lite. Experimental bounding-box matching. Stationary: movement below 2% in normalized image space for 8 seconds.'):t('نموذج الكشف يُحمّل عند بدء التحليل فقط.','The detector loads only when you start analysis.');
    byId('camStart').disabled=(!source||running||pending);byId('camStop').disabled=(!source&&!pending&&!running);
    byId('camReplay').disabled=source!=='video'||running||pending;byId('camExport').disabled=!rows.length;
    byId('camStation').disabled=running||pending;byId('camOpen').disabled=pending;byId('camFile').disabled=pending;
    byId('camSource').textContent=labelSource()+(source==='video'?t(' · تحليل مسجل؛ لا يمثل الحالة الحالية للمحطة',' · Recorded analysis; not the current station state'):'');
    const audit=byId('camAudit');audit.replaceChildren();
    if(rows.length){const table=document.createElement('table'),caption=table.createCaption();caption.textContent=t('آخر القراءات · الزمن داخل الفيديو بالثواني','Recent readings · video time in seconds');
      const head=table.createTHead().insertRow();[t('الزمن','Time'),t('مرصودة','Detected'),t('ساكنة','Stationary'),t('التقييم','Assessment')].forEach(label=>{const th=document.createElement('th');th.textContent=label;head.append(th);});
      const body=table.createTBody();rows.slice(-5).reverse().forEach(row=>{const tr=body.insertRow();[row.media_seconds.toFixed(1),row.detected,row.stationary,text(row.status)].forEach(value=>tr.insertCell().textContent=value);});audit.append(table);}

    syncResults();
    window.dispatchEvent(new CustomEvent('waqood-camera',{detail:{station:sessionStation,source,status,running,highThreshold:settings().high,serviceMinutes:Number(byId("camService").value),serviceLanes:Number(byId("camLanes").value),reading:fresh()?{detected:latest.detected,estimated:latest.estimated,waiting:latest.waiting,elapsed:latest.elapsed,status:latest.status}:completed?.reading?{detected:completed.reading.detected,estimated:completed.reading.estimated,waiting:completed.reading.waiting,elapsed:completed.reading.elapsed,status:completed.reading.status}:null,at:completed?.at||lastResultAt}}));
  }
  function renderSummary(){
    const box=byId('camSummary');box.replaceChildren();box.hidden=!completed;if(!completed)return;
    const heading=document.createElement('h3');heading.textContent=t('ملخص المسح المسجّل','Recorded scan summary');box.append(heading);
    const note=document.createElement('p');note.textContent=t('البطاقات أعلاه تعرض آخر إطار محلّل، وليست حالة المحطة الآن.','Cards above show the last analyzed frame, not the station now.');box.append(note);
    const reading=completed.reading,decision=document.createElement('strong');
    decision.textContent=!reading?t('لا توجد إطارات محلّلة؛ لا يمكن التقييم.','No analyzed frames; assessment unavailable.'):['low','medium','high'].includes(reading.status)?t('تقييم آخر قراءة: ','Last reading assessment: ')+text(reading.status):reading.status==='none'?t('لم تُرصد مركبات في آخر قراءة؛ لا يعني ذلك أن المحطة خالية.','No vehicles in the last reading; this does not establish an empty station.'):t('القراءات المتصلة غير كافية؛ جرّب فيديو ثابتاً من ٥ ثوانٍ أو أطول وتأكد من وضوح المركبات.','Insufficient continuous readings; try a fixed video of 5 seconds or longer with clearly visible vehicles.');box.append(decision);
    const stats=document.createElement('dl');
    const values=[[t('عدد تقريبي داخل المنطقة','Approximate vehicles in area'),reading?.estimated??'—'],[t('انتظار افتراضي بالدقائق · حسب إعدادات الخدمة','Assumed wait in minutes · service settings'),reading&&['low','medium','high'].includes(reading.status)?Math.ceil(reading.estimated/Number(byId('camLanes').value))*Number(byId('camService').value):'—'],[t('قراءات محفوظة','Saved observations'),rows.length],[t('أعلى عدد مرصود في قراءة','Peak vehicles in one reading'),rows.length?Math.max(...rows.map(r=>r.detected)):'—'],[t('أعلى عدد ساكن في قراءة','Peak stationary vehicles in one reading'),rows.length?Math.max(...rows.map(r=>r.stationary)):'—'],[t('متوسط العدد المرصود','Mean detected count'),rows.length?(rows.reduce((n,r)=>n+r.detected,0)/rows.length).toFixed(1):'—']];
    values.forEach(([label,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;stats.append(dt,dd);});box.append(stats);
    const scope=document.createElement('small');scope.textContent=t('الإحصاءات تخص المنطقة المحددة فقط. الانتظار افتراضي لسيارة تنضم خلف المركبات المرصودة، حسب زمن الخدمة والمسارات في الإعدادات؛ ليس زمناً مقاساً.','Statistics cover the selected area only. Wait assumes a new arrival behind observed vehicles using configured service time and lanes; it is not measured.');box.append(scope);
  }
  function populate(){const selected=byId('camStation').value;byId('camStation').replaceChildren(...stations.map(s=>new Option(name(s),s.id)));byId('camStation').value=selected||sessionStation;setMessage(messageCode,messageDetail);display();}
  function resetTracking(){engine=new QueueVision.QueueEngine(settings());latest=null;lastFrameTime=-1;status=running?'warming':'idle';lastResultAt=Date.now();}
  function releaseStream(){if(stream){stream.getTracks().forEach(tr=>{tr.onended=null;tr.stop();});stream=null;}video.srcObject=null;}
  function stop(reason='paused',ending=false){
    if(ending)completed={reading:latest?{...latest}:null,latency,at:Date.now()};
    generation++;running=false;pending=false;clearTimeout(timer);video.pause();releaseStream();
    status=ending?'ended':'stopped';latest=null;setMessage(reason);display();
  }
  function clearSource(){completed=null;stop();if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}video.removeAttribute('src');video.load();source=null;rows=[];lastLogged=-Infinity;canvas.width=640;canvas.height=360;ctx.clearRect(0,0,640,360);byId('camPlaceholder').hidden=false;byId('camProgress').hidden=true;}
  function frameSize(){const w=video.videoWidth,h=video.videoHeight;if(!w||!h)return false;const ratio=Math.min(1,640/w);frame.width=Math.round(w*ratio);frame.height=Math.round(h*ratio);canvas.width=frame.width;canvas.height=frame.height;byId('camStage').style.aspectRatio=`${w}/${h}`;return true;}
  function draw(tracks=[]){
    if(!frame.width)return;ctx.drawImage(frame,0,0,canvas.width,canvas.height);
    const [l,u,r,b]=roi;ctx.fillStyle='#06132366';ctx.fillRect(0,0,canvas.width,u*canvas.height);ctx.fillRect(0,b*canvas.height,canvas.width,(1-b)*canvas.height);ctx.fillRect(0,u*canvas.height,l*canvas.width,(b-u)*canvas.height);ctx.fillRect(r*canvas.width,u*canvas.height,(1-r)*canvas.width,(b-u)*canvas.height);
    ctx.strokeStyle='#6df1a3';ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.strokeRect(l*canvas.width,u*canvas.height,(r-l)*canvas.width,(b-u)*canvas.height);ctx.setLineDash([]);
    tracks.forEach(tr=>{const [x,y,w,h]=tr.bbox;ctx.strokeStyle=tr.waiting?'#ffb84d':'#57baff';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);ctx.fillStyle=ctx.strokeStyle;ctx.font='13px Arial';const label=`#${tr.id} ${tr.class} ${Math.round(tr.score*100)}%`;ctx.fillRect(x,Math.max(0,y-20),ctx.measureText(label).width+8,20);ctx.fillStyle='#0e233b';ctx.fillText(label,x+4,Math.max(14,y-5));});
  }
  function waitForVideo(){return new Promise((resolve,reject)=>{if(video.readyState>=2&&video.videoWidth)return resolve();let timeout;const cleanup=()=>{clearTimeout(timeout);video.removeEventListener('loadeddata',ok);video.removeEventListener('error',bad);};const ok=()=>{cleanup();resolve();},bad=()=>{cleanup();reject(Error('video'));};video.addEventListener('loadeddata',ok);video.addEventListener('error',bad);timeout=setTimeout(bad,15000);});}
  async function openCamera(){
    clearSource();
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){status='unavailable';setMessage('secure');display();return;}
    const token=++generation;pending=true;status='loading';display();
    try{
      const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
      if(token!==generation){acquired.getTracks().forEach(tr=>tr.stop());return;}
      stream=acquired;source='camera';video.srcObject=stream;video.muted=true;await video.play();await waitForVideo();
      if(token!==generation)return;
      stream.getVideoTracks().forEach(tr=>tr.onended=()=>stop('cameraError'));
      frameSize();frameContext.drawImage(video,0,0,frame.width,frame.height);draw();byId('camPlaceholder').hidden=true;pending=false;status='idle';setMessage('preview');display();
    }catch(error){if(token!==generation)return;releaseStream();source=null;pending=false;status='unavailable';setMessage(error.name==='NotAllowedError'?'permission':'cameraError');display();}
  }
  async function chooseVideo(file){
    if(!file)return;clearSource();const token=++generation;pending=true;display();
    if(file.size>500*1024*1024){pending=false;status='unavailable';setMessage('videoError',t('الحد الأقصى ٥٠٠ ميغابايت.','Maximum file size is 500 MB.'));display();return;}
    source='video';objectURL=URL.createObjectURL(file);video.src=objectURL;video.muted=true;video.load();
    try{await waitForVideo();if(token!==generation)return;frameSize();frameContext.drawImage(video,0,0,frame.width,frame.height);draw();byId('camPlaceholder').hidden=true;byId('camProgress').hidden=false;pending=false;status='idle';setMessage('preview');display();}
    catch{if(token!==generation)return;pending=false;status='unavailable';source=null;setMessage('videoError');display();}
  }
  const scriptLoads=new Map();
  function loadScript(url,globalName){
    if(window[globalName])return Promise.resolve();if(scriptLoads.has(url))return scriptLoads.get(url);
    const promise=new Promise((resolve,reject)=>{const script=document.createElement('script');const timeout=setTimeout(()=>{script.remove();reject(Error('Timed out loading: '+url));},45000);script.src=url;script.onload=()=>{clearTimeout(timeout);window[globalName]?resolve():reject(Error('Invalid library file: '+url));};script.onerror=()=>{clearTimeout(timeout);script.remove();reject(Error('Failed to load: '+url+' — check this file exists in the published site, then retry.'));};document.head.append(script);}).catch(e=>{scriptLoads.delete(url);throw e;});scriptLoads.set(url,promise);return promise;
  }
  async function getModel(){
    if(model)return model;if(modelPromise)return modelPromise;modelState='loading';
    modelPromise=(async()=>{await loadScript('vehicle-views.js','VehicleViews');await loadScript('vendor/tf.min.js','tf');await tf.ready();await loadScript('vendor/coco-ssd.min.js','cocoSsd');model=await cocoSsd.load({base:'lite_mobilenet_v2',modelUrl:'vendor/model/model.json'});modelState='ready';return model;})().catch(error=>{modelPromise=null;modelState='unloaded';throw error;});return modelPromise;
  }
  async function start(){
    if(!source||running||pending)return;
    if(!QueueVision.validate(settings())){setMessage('settings');return;}
    if(!byId('camService').checkValidity()||!byId('camLanes').checkValidity()){byId('camService').reportValidity();byId('camLanes').reportValidity();setMessage('settings');return;}
    if(!byId('camConfirm').checked){setMessage('confirm');return;}
    if(source==='camera'&&!stream){await openCamera();if(!stream)return;}
    completed=null;const token=++generation;pending=true;status='loading';setMessage('model');display();
    try{await getModel();if(token!==generation)return;}catch(error){if(token!==generation)return;pending=false;status='unavailable';releaseStream();console.error('Camera detector initialization failed:',error);setMessage('modelError',String(error.message||error).slice(0,250));display();return;}
    try{
      if(source==='video'&&video.ended)video.currentTime=0;
      await video.play();if(token!==generation)return;await waitForVideo();if(token!==generation)return;
      frameSize();pending=false;running=true;rows=[];lastLogged=-Infinity;sessionStation=Number(byId('camStation').value);resetTracking();setMessage('active');display();tick(token);
    }catch{if(token!==generation)return;stop('videoError');}
  }
  async function tick(token){
    if(!running||token!==generation)return;
    if(video.ended){stop('endedMessage',true);return;}
    const mediaTime=video.currentTime;
    if(video.readyState<2||mediaTime<=lastFrameTime){timer=setTimeout(()=>tick(token),200);return;}
    lastFrameTime=mediaTime;frameContext.drawImage(video,0,0,frame.width,frame.height);const before=performance.now();
    try{
      const predictions=await VehicleViews.detect(model,frame,roi,settings().confidence,()=>token===generation&&running);
      if(token!==generation||!running)return;
      latency=performance.now()-before;
      // A late prediction must not publish a current congestion result.
      if(latency>3000){stop('stale');return;}
      latest=engine.update(predictions,frame.width,frame.height,mediaTime);lastResultAt=Date.now();status=latest.status;draw(latest.tracks);
      if(mediaTime-lastLogged>=1){const config=settings();rows.push({station_id:sessionStation,source:source==='camera'?'local_live_camera':'recorded_video',observed_at:new Date().toISOString(),media_seconds:mediaTime,detected:latest.detected,stationary:latest.waiting,status,continuous_seconds:latest.elapsed,inference_ms:Math.round(latency),threshold_score:config.confidence,moderate_at:config.medium,high_at:config.high,roi:config.roi.join('|')});if(rows.length>3600)rows.shift();lastLogged=mediaTime;}
      if(source==='video'&&Number.isFinite(video.duration))byId('camProgress').value=mediaTime/video.duration;
      display();timer=setTimeout(()=>tick(token),Math.max(50,500-latency));
    }catch{if(token===generation)stop('inferenceError');}
  }
  function changed(){completed=null;roi=['camLeft','camTop','camRight','camBottom'].map(id=>Number(byId(id).value)/100);if(!QueueVision.validate(settings())){if(running)stop('settings');else setMessage('settings');return;}if(running){stop('reset');}latest=null;if(source)draw();setMessage('reset');display();}
  function pointer(event){const rect=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))];}
  canvas.addEventListener('pointerdown',e=>{if(!source||pending)return;if(running)stop('reset');drawStart=pointer(e);canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointerup',e=>{if(!drawStart)return;const end=pointer(e),startPoint=drawStart;drawStart=null;const next=[Math.min(startPoint[0],end[0]),Math.min(startPoint[1],end[1]),Math.max(startPoint[0],end[0]),Math.max(startPoint[1],end[1])];if(next[2]-next[0]<.05||next[3]-next[1]<.05)return;roi=next;['camLeft','camTop','camRight','camBottom'].forEach((id,i)=>byId(id).value=Math.round(roi[i]*100));changed();});
  canvas.addEventListener('pointercancel',()=>drawStart=null);
  ['camLeft','camTop','camRight','camBottom','camMedium','camHigh','camConfidence','camService','camLanes'].forEach(id=>byId(id).addEventListener('change',changed));
  byId('camResetROI').onclick=()=>{[0,0,100,100].forEach((v,i)=>byId(['camLeft','camTop','camRight','camBottom'][i]).value=v);changed();};
  byId('camConfirm').onchange=()=>{if(!byId('camConfirm').checked&&running)stop('confirm');};
  byId('camOpen').onclick=openCamera;byId('camFile').onchange=e=>{chooseVideo(e.target.files[0]);e.target.value='';};byId('camStart').onclick=start;
  byId('camStop').onclick=()=>stop();byId('camReplay').onclick=()=>{if(source==='video'){video.currentTime=0;start();}};
  byId('camStation').onchange=()=>{completed=null;sessionStation=Number(byId('camStation').value);rows=[];latest=null;display();};
  video.addEventListener('ended',()=>{if(running)stop('endedMessage',true);});
  video.addEventListener('error',()=>{if(running)stop('videoError');});
  video.addEventListener('seeking',()=>{if(running){resetTracking();setMessage('reset');}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&(running||pending||stream))stop('hidden');});
  window.addEventListener('pagehide',()=>{stop();if(objectURL)URL.revokeObjectURL(objectURL);});
  setInterval(()=>{if(running&&Date.now()-lastResultAt>6000)stop('stale');},1500);
  byId('camExport').onclick=()=>{if(!rows.length)return;const columns=Object.keys(rows[0]);const csv='\uFEFF'+[['EXPERIMENTAL CAMERA PILOT - NOT VALIDATED - NO FUEL OR TOTAL WAIT INFERENCE'],columns,...rows.map(row=>columns.map(k=>row[k]))].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='waqood-camera-observations.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  function activate(id){
    if(id&&Number(id)!==sessionStation){completed=null;stop();sessionStation=Number(id);byId('camStation').value=sessionStation;rows=[];}
    document.querySelectorAll('.panel').forEach(p=>p.hidden=p!==panel);document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-current',b===button?'page':'false');});display();panel.scrollIntoView({block:'start',behavior:'smooth'});
  }
  button.onclick=()=>activate();
  navigation.addEventListener('click',e=>{const target=e.target.closest('[data-tab]');if(target&&target!==button&&(running||stream||pending))stop('hidden');});
  // Retire crowd-report entry points without deleting stored reports or original code.
  openReport=id=>activate(id);
  const previousRender=render;render=function(){previousRender();populate();};
  translate();
  // Existing app installed its interval before the additive module; refresh our own labels too.
  setInterval(syncResults,1000);
})();
