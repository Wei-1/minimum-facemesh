// sketch.js

// config
const MAX_FACES = 1;
const CANVAS_RATIO = 0.5;
const CAMERA_FLIP = true;
const PREDICT_IRISES = false;

// variable
let facemeshModel = null; // this will be loaded with the facemesh model
let videoDataLoaded = false; // is webcam capture ready?
let statusText = "Loading facemesh model...";
// var myFaces = []; // faces detected in this browser

// html canvas for drawing debug view
const dbg = document.createElement("canvas").getContext('2d');
dbg.canvas.style.position = "absolute";
dbg.canvas.style.left = "0px";
dbg.canvas.style.top = "0px";
dbg.canvas.style.zIndex = 100; // "bring to front"
document.body.appendChild(dbg.canvas);

// read video from webcam
const capture = document.createElement("video");
capture.playsinline = "playsinline";
capture.autoplay = "autoplay";
navigator.mediaDevices.getUserMedia({audio:false, video:{
  facingMode: 'user',
  width: undefined,
  height: undefined
}}).then(function(stream){
  window.stream = stream;
  capture.srcObject = stream;
});

// hide the video element
capture.style.position = "absolute";
capture.style.opacity = 0;
capture.style.zIndex = -100; // "send to back"

// signal when capture is ready and set size for debug canvas
capture.onloadeddata = function(){
  console.log("video initialized");
  videoDataLoaded = true;
  dbg.canvas.width = Math.floor(capture.videoWidth * CANVAS_RATIO);
  dbg.canvas.height = Math.floor(capture.videoHeight * CANVAS_RATIO);
}

// // load the MediaPipe facemesh model assets.
async function loadModel(){
  const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
  const detectorConfig = {runtime: 'tfjs'};
  facemeshModel = await faceLandmarksDetection.createDetector(model, detectorConfig);
  console.log("model loaded");
}
loadModel();

// draw a face object (2D debug view) returned by facemesh
function drawFaces(faces, noKeypoints){
  for(let i = 0; i < faces.length; i++){
    const keypoints = faces[i].scaledMesh;
    for(let j = 0; j < TRI.length; j+=3){
      let a = keypoints[TRI[j  ]];
      let b = keypoints[TRI[j+1]];
      let c = keypoints[TRI[j+2]];
      Object.keys(MARKCOLOR).forEach(function(m){
        if(MARK[m].includes(TRI[j])){
          dbg.strokeStyle = MARKCOLOR[m];
        }
      });
      dbg.beginPath();
      dbg.moveTo(a[0], a[1]);
      dbg.lineTo(b[0], b[1]);
      dbg.lineTo(c[0], c[1]);
      dbg.closePath();
      dbg.stroke();
    }
    if(PREDICT_IRISES){
      irises = faces[i].irises;
      dbg.fillStyle = MARKCOLOR["irises"];
      let rIris = irises[0];
      let lIris = irises[NUM_IRIS_KEYPOINTS];
      dbg.beginPath();
      dbg.arc(rIris[0], rIris[1], 8, 0, 2 * Math.PI);
      dbg.fill();
      dbg.beginPath();
      dbg.arc(lIris[0], lIris[1], 8, 0, 2 * Math.PI);
      dbg.fill();
    }
  }
}

// reduce vertices to the desired set, and compress data as well
function packFace(face, set){
  let fsm = face.scaledMesh;
  let ret = {scaledMesh:[], irises:[]};
  for(let i = 0; i < set.length; i++){
    let j = set[i];
    ret.scaledMesh[i] = [
      Math.floor(fsm[j][0] * 100) / 100, // x
      Math.floor(fsm[j][1] * 100) / 100, // y
      Math.floor(fsm[j][2] * 100) / 100, // 3D depth
    ];
  }
  if(PREDICT_IRISES){
    for(let i = 0; i < NUM_IRIS_KEYPOINTS * 2; i++){
      ret.irises[i] = fsm[NUM_KEYPOINTS + i];
    }
  }
  return ret;
}

const estimationConfig = {flipHorizontal: false};
// the main render loop
async function render(){
  if(facemeshModel && videoDataLoaded){ // model and video both loaded
    let _faces = await facemeshModel.estimateFaces(capture, estimationConfig);
    let myFaces = _faces.map(x => packFace(x, VTX)); // update the global myFaces
    statusText = "Detecting " + _faces.length + " faces";

    dbg.clearRect(0, 0, dbg.canvas.width, dbg.canvas.height);

    dbg.save();
    if(CAMERA_FLIP){
      dbg.translate(dbg.canvas.width, 0);
      dbg.scale(- CANVAS_RATIO, CANVAS_RATIO);
    }else{
      dbg.scale(CANVAS_RATIO, CANVAS_RATIO);
    }
    dbg.drawImage(capture, 0, 0); // print the camera
    drawFaces(myFaces); // print the mesh
    dbg.restore();

    dbg.save();
    dbg.fillStyle = "red";
    dbg.fillText(statusText, 2, 60);
    dbg.restore();
  }

  requestAnimationFrame(render); // this creates an infinite animation loop
}

requestAnimationFrame(render); // kick off the rendering loop!
