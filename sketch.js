// sketch.js

// config
const MAX_FACES = 1;
const CANVAS_RATIO = 0.5;
const CAMERA_FLIP = true;
const PREDICT_IRISES = true;
const NUM_KEYPOINTS = 468;
const NUM_IRIS_KEYPOINTS = 5;

// variable
var facemeshModel = null; // this will be loaded with the facemesh model
var videoDataLoaded = false; // is webcam capture ready?
var statusText = "Loading facemesh model...";
var myFaces = []; // faces detected in this browser

// html canvas for drawing debug view
var dbg = document.createElement("canvas").getContext('2d');
dbg.canvas.style.position = "absolute";
dbg.canvas.style.left = "0px";
dbg.canvas.style.top = "0px";
dbg.canvas.style.zIndex = 100; // "bring to front"
document.body.appendChild(dbg.canvas);

// read video from webcam
var capture = document.createElement("video");
capture.playsinline = "playsinline";
capture.autoplay = "autoplay";
navigator.mediaDevices.getUserMedia({audio:false, video:{
  facingMode: 'user',
  width: undefined,
  height: undefined,
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

// load the MediaPipe facemesh model assets.
faceLandmarksDetection.load().then(function(_model){
  console.log("model initialized.");
  statusText = "Model loaded.";
  facemeshModel = _model;
});

// draw a face object (2D debug view) returned by facemesh
function drawFaces(faces, noKeypoints){
  for (var i = 0; i < faces.length; i++){
    const keypoints = faces[i].scaledMesh;
    for (var j = 0; j < TRI.length; j+=3){
      var a = keypoints[TRI[j  ]];
      var b = keypoints[TRI[j+1]];
      var c = keypoints[TRI[j+2]];
      Object.keys(MARKCOLOR).forEach(function(m){
        if (MARK[m].includes(TRI[j])){
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
    if (PREDICT_IRISES){
      irises = faces[i].irises;
      dbg.fillStyle = MARKCOLOR["irises"];
      var rIris = irises[0];
      var lIris = irises[NUM_IRIS_KEYPOINTS];
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
  var fsm = face.scaledMesh;
  var ret = {scaledMesh:[], irises:[]};
  for (var i = 0; i < set.length; i++){
    var j = set[i];
    ret.scaledMesh[i] = [
      Math.floor(fsm[j][0] * 100) / 100, // x
      Math.floor(fsm[j][1] * 100) / 100, // y
      Math.floor(fsm[j][2] * 100) / 100, // 3D depth
    ];
  }
  if (PREDICT_IRISES){
    for (var i = 0; i < NUM_IRIS_KEYPOINTS * 2; i++) {
      ret.irises[i] = fsm[NUM_KEYPOINTS + i];
    }
  }
  return ret;
}

// the main render loop
function render() {
  requestAnimationFrame(render); // this creates an infinite animation loop
  
  if (facemeshModel && videoDataLoaded){ // model and video both loaded
    facemeshModel.pipeline.maxFaces = MAX_FACES;
    facemeshModel.estimateFaces({
      input: capture,
      returnTensors: false,
      flipHorizontal: false,
      predictIrises: PREDICT_IRISES
    }).then(function(_faces){
      myFaces = _faces.map(x => packFace(x, VTX)); // update the global myFaces
      if (!myFaces.length){ // haven't found any faces
        statusText = "Show Some Faces";
      }else{ // display the confidence, to 3 decimal places
        statusText = "Face Detected";
      }
    });
  }
  
  dbg.clearRect(0, 0, dbg.canvas.width, dbg.canvas.height);
  
  dbg.save();
  if (CAMERA_FLIP){
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

render(); // kick off the rendering loop!
