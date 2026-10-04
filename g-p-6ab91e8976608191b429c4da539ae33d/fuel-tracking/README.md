## Multi-view vehicle detection

The detector now analyzes the full frame plus overlapping square crops of the selected ROI, maps crop detections back to frame coordinates, and merges overlapping vehicle boxes before tracking. This addresses missed small vehicles in tall images. On the supplied screenshot, the same 50% threshold detected 1 car with the original view and 5 with multi-view analysis (~434 ms in the test browser). This is a screenshot check, not a full-video or field accuracy claim. Fourteen logic tests pass. Test screenshots are excluded from the ZIP.

## Short-video assessment update

Five-second clips can yield a preliminary density assessment after 3 seconds and at least 5 analyzed frames, plus 0.5 seconds of consistent classification. Classification now uses the median vehicle count across the last five readings, rather than requiring stationary tracks. Missing detections remain unknown; short clips are not proof of a fuel queue. Eight-second stationary tracking remains a separate metric.

Citizen cards show approximate vehicles inside the selected ROI and an assumed queue-clearance wait for a new arrival: ceil(observed median count / simultaneous lanes) × service minutes. Defaults are 2 lanes and 3 minutes, explicitly assumptions adjustable in camera settings. The estimate excludes vehicles outside the ROI and is not measured service performance. Operational use requires calibration.

Earlier methodological notes below describe previous versions where inconsistent.

## Camera and station-manager integration

Camera results now appear per station on citizen cards and in a dedicated operations table. Results distinguish recorded video, fresh live camera and previous observations, and include timestamps and detected/stationary counts. Camera observations stay in memory for this page session; reloading clears them. Existing maps, illustrative charts and forecast remain sample views and are not inferred camera waiting times.

The new Station manager tab edits opening status, gasoline availability and diesel availability independently of camera congestion. Changes are stored locally under waqood-operator-v1 and update station cards, filters and operations. This is an unauthenticated local role demonstration, not an authorized ministry service or cross-device backend. Saving the same sample station values was tested in the browser; no operational field data was entered.

# WAQOOD — Libya fuel station prototype

## Phone-camera pilot added September 2026

The original design, station dataset, map, charts and fuel-demand forecast are retained. A modular camera demonstration now replaces the visible crowd-report entry points. Existing report records are not deleted; the report UI is hidden. Station action buttons open **Camera demo**, and the ministry panel includes a separate session-only camera result.

Start the server with the command below, then choose **تجربة الكاميرا / Camera demo**. The quickest test is a fixed 30–60 second phone video transferred to your laptop. Select the file, draw a rectangle around the queue, confirm the camera is fixed and press **Start AI analysis**. Local video processing does not upload the file. TensorFlow.js 4.22.0, COCO-SSD 2.2.3 and all five pretrained weight shards are bundled in vendor/. The detector loads from the local server without external AI downloads; keep that folder when copying the project. Map tiles and other external page assets still need internet. No generated detections or fallback simulation are used.

For direct camera access on a phone, serve the site at a trusted HTTPS address. A laptop's `localhost` URL does not connect a phone to the laptop, and a LAN HTTP address ordinarily cannot use `getUserMedia`. This update does not publish the site or create a phone-to-laptop stream. The camera page runs on the device viewing it. A recorded clip is the immediate no-hosting demonstration path; webcam access also works on desktop localhost where permitted.

Read [camera-demo-guide.html](camera-demo-guide.html) for the Arabic field demonstration guide. New files: `camera-demo.js`, `camera-demo.css`, and `queue-engine.js`. Only a small loader was added to `enhancements.js`; `index.html`, `app.js`, original styles and forecast modules are unchanged.

### Measurement boundaries

- Real browser COCO-SSD detections are filtered to cars, buses, trucks and motorcycles whose box centers are in the ROI.
- Greedy one-to-one box matching is an experimental tracker, not field-validated multi-object tracking. Occlusion, detector errors and camera movement can break identity.
- A vehicle becomes approximately stationary after 8 seconds within a 0.02 normalized-image-distance anchor. This is not physical speed or full queue waiting time. Parked vehicles in a poorly selected ROI can be mistaken for a queue.
- After 10 seconds of continuous observations and 2 seconds of consistent classification, the default stationary-count thresholds are moderate at 3, high at 8. These require site calibration. Missing detections never produce a confirmed-empty claim.
- Gaps over 3 seconds reset tracking continuity; late inference and stalled video stop assessment. Stop, backgrounding and switching tabs release the camera. No reading remains labelled current when analysis stops.
- Camera outputs are separate from the map/chart sample statistics and fuel availability. A linked card temporarily replaces its sample wait box with the camera observation. A recorded video is always labelled recorded.
- CSV exports contain timestamps, media time, counts, source, ROI, detection score and thresholds. Only the last 3,600 numeric observations are held in memory. Reload clears the session. No footage, faces or plates are uploaded or included in exports.
- HTTPS hosting, cross-device result synchronization, authentication, automatic image-quality assessment are outside this pilot.

### Verification for this addition

Run `node --test queue-engine.test.cjs`. Nine tests cover stationary/moving detections, no detections, ROI filtering, ignored people, score threshold, seeks/gaps, lost tracks, high congestion and invalid inputs. These test the queue logic, not detector accuracy.

Browser verification: the actual downloaded detector recognized a vehicle in the development clip and produced a stationary reading. Clip completion and explicit Stop cleared the current metrics. Arabic and English camera controls were checked. Physical-phone camera access and real-station accuracy remain untested. CSV download was implemented but the browser automation download event timed out, so end-to-end export is not verified. The attempted mobile viewport override did not change the actual viewport; mobile validation of this addition remains outstanding.

The `tests/` directory is development QA only and must not be deployed. Its optional fixture builder repeats a public still image in a video to test the detector-to-UI pipeline; that fixture is not real queue footage and is not evidence of field accuracy. Image source: https://github.com/ultralytics/ultralytics/blob/main/ultralytics/assets/bus.jpg. The fixture and QA server are excluded from the deliverable ZIP.

The notes below describe the earlier prototype and are retained for context; the camera pilot supersedes the citizen-report workflow.

Open `index.html` in a browser. For consistent browser storage and geolocation, serve this folder locally:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Then open http://127.0.0.1:8765. No build or package installation is required. Google Fonts is optional; system fonts are the fallback. Directions open Google Maps. Location requires browser permission and localhost or HTTPS; coordinates are held in memory, not stored by this app.

## Changes

- Arabic RTL and English LTR responsive citizen interface.
- Separate opening status, fuel availability and estimated queue time.
- Search in either language, fuel and open-only filters, favorites, shortest-wait and freshness sorting, optional straight-line distance sorting.
- Timestamp aging and explicit stale-data notices after 30 minutes.
- Local complaint records with unique reference numbers, validation and escaped display text. Reports remain unverified and do not overwrite station records.
- Derived operational metrics, attention list, CSV download, browser print-to-PDF and explicitly illustrative supply simulation.
- No mandatory JavaScript CDN dependencies.

`original.html` preserves the supplied prototype, including its embedded map and original charts. This alternate citizen-focused version uses per-station directions links instead of an embedded map, and a transparent supply scenario instead of the original hardcoded 30-day forecast. Seed names and coordinates are copied from the supplied prototype and are not independently verified.

## Demo boundaries

This is a front-end prototype, not a deployed ministry service. Station data is illustrative. Favorites and reports live in this browser's localStorage under `waqood-demo-v1`; no report is transmitted. There is no authentication, multi-user synchronization, authorized station update workflow or actual dispatch. A clearly marked TEST ONLY report may appear in the local preview from verification; it is not bundled in the source files.

For a production pilot, add authenticated operator and ministry roles, a station registry with verified coordinates and hours, timestamped fuel/queue updates, server-side report validation and moderation, an audit trail, and an authenticated API/database. Establish a real update source and queue estimation method before presenting live availability or forecasts.

## Verification

- Node syntax checks passed for app.js and stations.js.
- Browser-verified Arabic initial rendering, search for Janzour, English switching, report dialog selection, local submission and persistence after reload.
- Arabic mobile layout checked at 390 × 844; document had no horizontal overflow.
- Preview screenshot saved as preview.png.
- Location permission/success, external directions, CSV download and print output were not exercised end-to-end.

Files: index.html (markup), style.css (responsive styles), app.js (behavior), stations.js (sample data).
