import React, { useEffect, useRef, useState } from "react";
// BicepCurlFormCorrector.jsx
// Single-file React component (default export) using Tailwind CSS
// Requires: npm install @mediapipe/pose @mediapipe/camera_utils
// Usage: import and render <BicepCurlFormCorrector /> inside your app

// What it does:
// - Uses MediaPipe Pose to track landmarks from the chosen camera (front/back)
// - Counts bicep curl repetitions and gives live feedback about form
// - Draws landmarks & skeleton on a canvas overlay
// - Provides simple form checks: elbow angle, shoulder stable, wrist alignment

// Notes:
// - For best results, position the camera so the exercising arm is visible from the side
//   (if using front camera, rotate phone so the arm is visible). The model works best
//   when the user is roughly centered and the whole arm (shoulder->wrist) is visible.
// - The facing mode toggle switches between 'user' (front) and 'environment' (back) cameras.

import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";

export default function TricepCurlFormCorrector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const [facingMode, setFacingMode] = useState("user"); // 'user' or 'environment'
  const [running, setRunning] = useState(false);
  const [repCount, setRepCount] = useState(-2);
  const [stage, setStage] = useState("down"); // 'down' or 'up'
  const [feedback, setFeedback] = useState("Stand so your full arm is visible to the camera.");
  const [lastElbowAngle, setLastElbowAngle] = useState(null);
  const [armSide, setArmSide] = useState("right"); // 'left' or 'right' - autopreview
  const [formWrong, setformWrong] = useState(false); // 'left' or 'right' - autopreview


const [showTick, setShowTick] = useState(false);

  const elbowAngleRef = useRef(40);
  const stageRef = useRef("down");
  const directionRef = useRef(1);

  const minAngle = 40;
  const maxAngle = 170;
  const stepDuration = 50;
  const halfCycle = 2000;
  const pauseDuration = 1500;
  const upThreshold = 80;
  const downThreshold = 150;

  const step = ((maxAngle - minAngle) / halfCycle) * stepDuration;

  // Sync React state with refs
//   useEffect(() => {
//     stageRef.current = stage;
//   }, [stage]);

  // Increment reps on stage change to "down"
  useEffect(() => {
     if (!stage) return;

      setShowTick(true);
  const timer = setTimeout(() => setShowTick(false), 400);
    return () => clearTimeout(timer);
    // if (stage === "down") {
    //   setRepCount((r) => r + 1);
    //   console.log("Stage DOWN, rep counted:", repCount + 1);
    // }
  }, [stage]);

//   useEffect(() => {
//     function stepAngle() {
//       // update angle
//       elbowAngleRef.current += step * directionRef.current;

//       // stage changes based on thresholds
//       if (directionRef.current === -1 && elbowAngleRef.current <= upThreshold && stageRef.current === "down") {
//         stageRef.current = "up";
//         setStage("up");
//         console.log("Stage UP", elbowAngleRef.current);
//       }

//       if (directionRef.current === 1 && elbowAngleRef.current >= downThreshold && stageRef.current === "up") {
//         stageRef.current = "down";
//         setStage("down");
//         console.log("Stage DOWN", elbowAngleRef.current);
//       }

//       // pause at extremes
//       if (elbowAngleRef.current >= maxAngle) {
//         elbowAngleRef.current = maxAngle;
//         directionRef.current = -1;
//         setTimeout(stepAngle, pauseDuration);
//         return;
//       }

//       if (elbowAngleRef.current <= minAngle) {
//         elbowAngleRef.current = minAngle;
//         directionRef.current = 1;
//         setTimeout(stepAngle, pauseDuration);
//         return;
//       }

//       setTimeout(stepAngle, stepDuration);
//     }

//     stepAngle();
//   }, []); // run once


  // helpers
function drawLandmarks(ctx, results) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();

  // Mirror horizontally
  ctx.scale(-1, 1);
  ctx.translate(-ctx.canvas.width, 0);

  ctx.globalAlpha = 0.85;

  const drawLine = (a, b, color = "rgba(0,255,0,0.8)") => {
    ctx.beginPath();
    ctx.moveTo(a.x * ctx.canvas.width, a.y * ctx.canvas.height);
    ctx.lineTo(b.x * ctx.canvas.width, b.y * ctx.canvas.height);
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.stroke();
  };

  const drawPoint = (p, r = 6, color = "rgba(255,0,0,0.9)") => {
    ctx.beginPath();
    ctx.arc(p.x * ctx.canvas.width, p.y * ctx.canvas.height, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  };

  const lm = results?.poseLandmarks;
  if (!lm) {
    ctx.restore();
    return;
  }

  // Shoulders
  const RS = lm[11];
  const RE = lm[13];
  const RW = lm[15];

  const LS = lm[12];
  const LE = lm[14];
  const LW = lm[16];

  // Draw both shoulders always
  drawPoint(RS, 6, "yellow");
  drawPoint(LS, 6, "yellow");

  // Visibility check
  const rightVis = Math.min(RS?.visibility ?? 0, RE?.visibility ?? 0, RW?.visibility ?? 0);
  const leftVis  = Math.min(LS?.visibility ?? 0, LE?.visibility ?? 0, LW?.visibility ?? 0);

  // Detect which arm is raised upward
  const rightRaised = RE.y < RS.y;
  const leftRaised  = LE.y < LS.y;

  let side = "right"; // fallback

  if (rightRaised && !leftRaised) side = "right";
  else if (!rightRaised && leftRaised) side = "left";
  else if (rightRaised && leftRaised) side = rightVis > leftVis ? "right" : "left";
  else side = rightVis > leftVis ? "right" : "left"; // none raised

  setArmSide(side);

  const shoulder = side === "right" ? RS : LS;
  const elbow    = side === "right" ? RE : LE;
  const wrist    = side === "right" ? RW : LW;

  // Draw only chosen arm fully
  if (shoulder && elbow && wrist) {
    drawLine(shoulder, elbow);
    drawLine(elbow, wrist);

    drawPoint(shoulder, 5);
    drawPoint(elbow, 6);
    drawPoint(wrist, 5);
  }

  ctx.restore();
}



  function angleBetween(A, B, C) {
    // angle at B formed by BA and BC in degrees
    const AB = { x: A.x - B.x, y: A.y - B.y };
    const CB = { x: C.x - B.x, y: C.y - B.y };
    const dot = AB.x * CB.x + AB.y * CB.y;
    const magAB = Math.sqrt(AB.x * AB.x + AB.y * AB.y);
    const magCB = Math.sqrt(CB.x * CB.x + CB.y * CB.y);
    if (magAB === 0 || magCB === 0) return null;
    let cosine = dot / (magAB * magCB);
    cosine = Math.min(1, Math.max(-1, cosine));
    return (Math.acos(cosine) * 180) / Math.PI;
  }
function checkForm(lm) {
  // ---- Extract both arms ----
  const RS = lm[11], RE = lm[13], RW = lm[15];
  const LS = lm[12], LE = lm[14], LW = lm[16];

  // ---- Detect arm raised upward ----
  const rightRaised = RE.y < RS.y - 0.02;
  const leftRaised  = LE.y < LS.y - 0.02;

  // Choose side
  let side = null;
  if (rightRaised && !leftRaised) side = "right";
  else if (leftRaised && !rightRaised) side = "left";
  else if (rightRaised && leftRaised) {
    // use better visibility
    const rightVis = Math.min(RS.visibility, RE.visibility, RW.visibility);
    const leftVis  = Math.min(LS.visibility, LE.visibility, LW.visibility);
    side = rightVis > leftVis ? "right" : "left";
  } else {
    // no arm raised -> skip form checking
    return true; // treat as wrong form
  }

  // ---- Select correct arm ----
  const shoulder = side === "right" ? RS : LS;
  const elbow    = side === "right" ? RE : LE;
  const wrist    = side === "right" ? RW : LW;

  let formWrong = false;

  // ---------------------------------------
  // 1️⃣ Elbow must be pointing upward
  // ---------------------------------------
  const isElbowUp = elbow.y < shoulder.y - 0.02; 
  if (!isElbowUp) formWrong = true;

  // ---------------------------------------
  // 2️⃣ Elbow left/right tilt (15° tolerance)
  // ---------------------------------------
  const dx = elbow.x - shoulder.x;
  const dy = shoulder.y - elbow.y;
  const elbowAngle = Math.atan2(dy, dx) * (180 / Math.PI); // 90 = straight up

  if (Math.abs(90 - elbowAngle) > 15) formWrong = true;

  // ---------------------------------------
  // 3️⃣ Wrist too low (checked only if visible)
  // ---------------------------------------
  const wristVisible = wrist.visibility > 0.5;
  if (wristVisible) {
    const isWristTooLow = wrist.y > elbow.y + 0.02;
    if (isWristTooLow) formWrong = true;
  }

  return formWrong;
}

 function analyzeForm(results) {
  const lm = results?.poseLandmarks;
  if (!lm) return;

  // Landmarks
  const RS = lm[11], RE = lm[13], RW = lm[15];
  const LS = lm[12], LE = lm[14], LW = lm[16];

  const rightVis = Math.min(RS?.visibility ?? 0, RE?.visibility ?? 0, RW?.visibility ?? 0);
  const leftVis  = Math.min(LS?.visibility ?? 0, LE?.visibility ?? 0, LW?.visibility ?? 0);

  const side = rightVis > leftVis ? "right" : "left";
  setArmSide(side);

  const shoulder = side === "right" ? RS : LS;
  const elbow    = side === "right" ? RE : LE;
  const wrist    = side === "right" ? RW : LW;

  if (!shoulder || !elbow || !wrist) return;

  // elbow extension angle (tricep curl angle)
  const elbowAngle = angleBetween(shoulder, elbow, wrist);
  //setLastElbowAngle(elbowAngle);

  // ----- FORM CHECKS -----

let feedback = "Good form — keep going.";
let formOK = false;  // assume good form until a rule fails
  // 1️⃣ Upper arm should be horizontal (parallel to floor)
// 1️⃣ Upper arm horizontal
const upperArmAngle = Math.abs(shoulder.y - elbow.y);
if (upperArmAngle > 0.15) {
  feedback = "Keep upper arm parallel to the floor.";
  formOK = false;
}

// 2️⃣ Elbow stays fixed
const elbowMovement = Math.abs(elbow.x - shoulder.x);
if (elbowMovement > 0.25) {
  feedback = "Don’t swing your elbow — keep it fixed.";
  formOK = false;
}

// 3️⃣ Wrist alignment
const wristDx = Math.abs(elbow.x - wrist.x);
if (wristDx > 0.22) {
  feedback = "Keep wrist aligned with elbow — no bending.";
  formOK = false;
}

// 4️⃣ Torso stability
const torsoAngle = Math.abs(RS?.y - LS?.y);
if (torsoAngle > 0.2) {
  feedback = "Keep your torso stable — don’t twist.";
  formOK = false;
}

 const formWrongIs = checkForm(lm);
setformWrong(formWrongIs);
  if (formWrongIs) {
    // DO NOTHING
    
    return;
  }

//setformWrong(!formOK);
  // 5️⃣ Elbow angle rules (tricep)
  // elbow bent (90°) → "up" phase
  // elbow extended (~160°) → "down" phase (kickback)
 const bendThreshold = 80; 
const extendThreshold = 150;

if (elbowAngle < bendThreshold) {
  if (formOK) feedback = "Starting position — keep elbow tucked.";
  setStage("up");
}

if (elbowAngle > extendThreshold) {
  if (formOK) feedback = "Full extension — squeeze triceps!";
  setStage("down");
}

  // 6️⃣ Rep count logic
//   if (elbowAngle != null) {
//     if (elbowAngle < bendThreshold && stage === "down") {
//       setStage("up");
//       setRepCount((r) => r + 1); // count one rep
//     }
//   }

  setFeedback(feedback);
}


  useEffect(() => {
    // initialize Pose
    poseRef.current = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    poseRef.current.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    poseRef.current.onResults((results) => {
      // draw
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) drawLandmarks(ctx, results);
      analyzeForm(results);
    });

    return () => {
      // cleanup
      poseRef.current?.close?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // start/stop camera when running toggles
    async function startCamera() {
      if (!videoRef.current || !poseRef.current) return;
      // stop existing camera
      try {
        cameraRef.current?.stop?.();
      } catch (e) {}

      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (!poseRef.current) return;
          await poseRef.current.send({ image: videoRef.current });
        },
        facingMode: facingMode, // 'user' or 'environment'
        width: 1280,
        height: 720,
      });

      try {
        await cameraRef.current.start();
        setRunning(true);
      } catch (err) {
        console.error("Camera start failed", err);
        setRunning(false);
      }
    }

    if (running) {
      // if already running, restart with new facingMode
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  useEffect(() => {
    // start camera initially when component mounts
    (async () => {
      if (!videoRef.current || !poseRef.current) return;
      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (!poseRef.current) return;
          await poseRef.current.send({ image: videoRef.current });
        },
        facingMode: facingMode,
        width: 1280,
        height: 720,
      });

      try {
        await cameraRef.current.start();
        setRunning(true);
      } catch (err) {
        console.error("Failed to start camera", err);
      }
    })();

    return () => {
      try {
        cameraRef.current?.stop?.();
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UI and controls
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-slate-700/30 rounded-2xl p-4 shadow-lg">
        <h2 className="text-2xl font-semibold mb-2">Tricep Curl Form Corrector</h2>
        <p className="text-sm text-slate-200/80 mb-4">Choose camera, get live form feedback and rep counting using MediaPipe Pose.</p>

        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setFacingMode("user")}
            className={`px-3 py-2 rounded-md font-medium ${facingMode === "user" ? "bg-indigo-500" : "bg-slate-600/40"}`}>
            Front Camera
          </button>
          <button
            onClick={() => setFacingMode("environment")}
            className={`px-3 py-2 rounded-md font-medium ${facingMode === "environment" ? "bg-indigo-500" : "bg-slate-600/40"}`}>
            Back Camera
          </button>
          <button
            onClick={async () => {
              // toggle running
              try {
                if (cameraRef.current) {
                  await cameraRef.current.stop();
                  cameraRef.current = null;
                  setRunning(false);
                } else {
                  // start with current facingMode
                  const cam = new Camera(videoRef.current, {
                    onFrame: async () => {
                      if (!poseRef.current) return;
                      await poseRef.current.send({ image: videoRef.current });
                    },
                    facingMode,
                    width: 1280,
                    height: 720,
                  });
                  await cam.start();
                  cameraRef.current = cam;
                  setRunning(true);
                }
              } catch (err) {
                console.error(err);
              }
            }}
            className="px-3 py-2 rounded-md font-medium bg-emerald-500/80">
            Toggle Camera
          </button>
          <button
            onClick={() => {
              setRepCount(0);
              setStage("down");
              setFeedback("Stand so your full arm is visible to the camera.");
            }}
            className="px-3 py-2 rounded-md font-medium bg-yellow-500/80">
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="relative bg-black rounded-lg overflow-hidden">

  {/* Video */}
  <div className={`video-wrapper ${formWrong ? "video-wrong" : "video-good"}`}>
  <video
    ref={videoRef}
    className="w-full h-auto object-cover"
    playsInline
    muted
    style={{
      transform: facingMode === "user" ? "scaleX(-1)" : "scaleX(1)",
    }}
  />
</div>

  {/* Canvas */}
  <canvas
    ref={canvasRef}
    className="absolute inset-0 w-full h-full pointer-events-none"
  />

  {/* MIDDLE HUD */}
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="
      w-[95%] 
      max-w-[600px] 
      bg-black/40 
      backdrop-blur-md 
      text-white 
      rounded-xl 
      py-3 
      px-4 
      flex 
      items-center 
      justify-between
      text-sm
    ">
      
      {/* LEFT */}
      {/* <div className="flex flex-col gap-1 text-left">
        <p className="opacity-80">Camera: <span className="font-semibold opacity-100">{facingMode === 'user' ? 'Front' : 'Back'}</span></p>
        <p className="opacity-80">Arm: <span className="font-semibold opacity-100">{armSide}</span></p>
      </div> */}

      {/* CENTER */}
       <div className="text-center flex flex-col">
<p className="text-6xl font-bold transition-all duration-300">
  {showTick 
    ? <span className="text-green-400">✔</span>
    : stage === "up"
      ? "⬆ UP"
      : stage === "down"
        ? "⬇ DOWN"
        : "—"}
</p>

  
</div>
{/* <div className="absolute mt-30 left-0 w-full flex justify-center">
    <div className="bg-black/50 backdrop-blur-md text-white text-lg px-5 py-2 rounded-lg">
      {feedback || "Perfect form!"}
    </div>
  </div>
      {/* RIGHT */}
      {/* <div className="flex flex-col text-right">
        <p className="text-lg font-bold text-green-400">{repCount}</p>
        <p className="text-xs opacity-80">Reps</p>
      </div> */} 

    </div>
  </div>

  {/* FEEDBACK (BOTTOM CENTER) */}
  <div className="absolute bottom-3 left-0 w-full flex justify-center">
    <div className="bg-black/50 backdrop-blur-md text-white text-sm px-5 py-2 rounded-lg">
      {feedback || "Perfect form!"}
    </div>
  </div>

</div>



            <div className="bg-slate-700/40 rounded-lg p-3 flex-1">

              <div className="mt-4">
                <h4 className="font-medium">Form tips</h4>
                <ul className="list-disc list-inside text-sm mt-1">
                  <li>Keep elbow close to your torso; avoid swinging the shoulder.</li>
                  <li>Move with a controlled tempo—avoid momentum.</li>
                  <li>Keep wrist neutral; don’t curl wrist towards forearm.</li>
                  <li>Use side profile for more accurate arm tracking when possible.</li>
                </ul>
              </div>
            </div>

            <div className="bg-slate-700/40 rounded-lg p-3">
              <h3 className="font-medium">Notes</h3>
              <p className="text-xs mt-1">This is a lightweight, heuristic-based trainer. For clinical or professional training, combine with expert coaching.</p>
            </div>
        
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-400 max-w-4xl text-center">
        <p>Tip: For best detection, ensure the camera captures shoulder, elbow and wrist clearly. If using front camera, keep phone to the side so your arm profile is visible.</p>
      </div>
    </div>
  );
}
