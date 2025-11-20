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

export default function SquatFormCorrector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const [facingMode, setFacingMode] = useState("user"); // 'user' or 'environment'
  const [running, setRunning] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [stage, setStage] = useState("down"); // 'down' or 'up'
  const [feedback, setFeedback] = useState("Stand so your full body is visible to the camera.");
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
 const downThreshold = 105;  // deep
  const upThreshold = 165;    // standing

  const step = ((maxAngle - minAngle) / halfCycle) * stepDuration;

 
  // Increment reps on stage change to "down"
  useEffect(() => {
     if (!stage) return;

      setShowTick(true);
  const timer = setTimeout(() => setShowTick(false), 400);
    return () => clearTimeout(timer);
    // if (stage === "up") {
    //   setRepCount((r) => r + 1);
    //   console.log("Stage DOWN, rep counted:", repCount + 1);
    // }
  }, [stage]);



  // helpers
function drawLandmarks(ctx, results) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();

  // Mirror horizontally
  ctx.translate(ctx.canvas.width, 0);
  ctx.scale(-1, 1);

  ctx.globalAlpha = 0.9;

  const lm = results?.poseLandmarks;
  if (!lm || lm.length < 33) {
    ctx.restore();
    return;
  }

  // Convert relative coordinates to canvas coords
  const P = (i) => ({
    x: lm[i].x * ctx.canvas.width,
    y: lm[i].y * ctx.canvas.height
  });

  const drawLine = (i, j, color = "rgba(0,255,0,0.9)") => {
    ctx.beginPath();
    const a = P(i);
    const b = P(j);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.stroke();
  };

  const drawPoint = (i, color = "rgba(255,0,0,0.9)", r = 6) => {
    const p = P(i);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  };

  // -----------------------------
  // FULL BODY CONNECTIONS
  // -----------------------------

  const LEFT = {
    SHOULDER: 11,
    ELBOW: 13,
    WRIST: 15,
    HIP: 23,
    KNEE: 25,
    ANKLE: 27,
    HEEL: 29,
    FOOT: 31
  };

  const RIGHT = {
    SHOULDER: 12,
    ELBOW: 14,
    WRIST: 16,
    HIP: 24,
    KNEE: 26,
    ANKLE: 28,
    HEEL: 30,
    FOOT: 32
  };

  // Torso
  drawLine(LEFT.SHOULDER, RIGHT.SHOULDER);
  drawLine(LEFT.HIP, RIGHT.HIP);
  drawLine(LEFT.SHOULDER, LEFT.HIP);
  drawLine(RIGHT.SHOULDER, RIGHT.HIP);

  // Left Arm
  drawLine(LEFT.SHOULDER, LEFT.ELBOW);
  drawLine(LEFT.ELBOW, LEFT.WRIST);

  // Right Arm
  drawLine(RIGHT.SHOULDER, RIGHT.ELBOW);
  drawLine(RIGHT.ELBOW, RIGHT.WRIST);

  // Left Leg
  drawLine(LEFT.HIP, LEFT.KNEE);
  drawLine(LEFT.KNEE, LEFT.ANKLE);
  drawLine(LEFT.ANKLE, LEFT.HEEL);
  drawLine(LEFT.HEEL, LEFT.FOOT);

  // Right Leg
  drawLine(RIGHT.HIP, RIGHT.KNEE);
  drawLine(RIGHT.KNEE, RIGHT.ANKLE);
  drawLine(RIGHT.ANKLE, RIGHT.HEEL);
  drawLine(RIGHT.HEEL, RIGHT.FOOT);

  // Draw Points (all 33)
  for (let i = 0; i < lm.length; i++) {
    drawPoint(i);
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

function analyzeForm(results) {
  const lm = results?.poseLandmarks;
  if (!lm) return;

  // ----------------------------
  // Landmark Shortcuts
  // ----------------------------

  const RH = lm[24]; // right hip
  const RK = lm[26]; // right knee
  const RA = lm[28]; // right ankle

  const LH = lm[23]; // left hip
  const LK = lm[25]; // left knee
  const LA = lm[27]; // left ankle

  const RS = lm[11];
  const LS = lm[12];

  if (!RH || !RK || !RA || !LH || !LK || !LA) return;

  // Visibility check
  const rightVis = Math.min(RH.visibility, RK.visibility, RA.visibility);
  const leftVis  = Math.min(LH.visibility, LK.visibility, LA.visibility);

  const side = rightVis > leftVis ? "right" : "left";
  setArmSide(side);

  // Choose best visible side
  const hip   = side === "right" ? RH : LH;
  const knee  = side === "right" ? RK : LK;
  const ankle = side === "right" ? RA : LA;

  // ----------------------------
  // ANGLES
  // ----------------------------

  // Knee bend angle 
  const kneeAngle = angleBetween(hip, knee, ankle);
  //setLastElbowAngle(kneeAngle); // reuse state but rename later if needed

  // Torso lean angle (shoulder–hip vertical)
  const torsoLean = Math.abs((side === "right" ? RS.y : LS.y) - hip.y);

  // Knee valgus (knee caving inwards)
  const kneeValgus = Math.abs(knee.x - ankle.x);

  // Depth check (hip below knee = deep squat)
  const hipBelowKnee = hip.y > knee.y;

  // ----------------------------
  // FEEDBACK
  // ----------------------------

  let feedback = "Good squat. Keep going.";

  // 1️⃣ Knee valgus check
  if (kneeValgus > 0.15) {
    feedback = "Knees collapsing inward — push knees out.";
  }

  // 2️⃣ Torso lean
  if (torsoLean > 0.15) {
    feedback = "Keep chest up — reduce torso lean.";
  }

  // 3️⃣ Too shallow
  if (kneeAngle > 160) {
    feedback = "Stand tall — full lockout.";
  }

  // 4️⃣ Mid squat
  if (kneeAngle > 110 && kneeAngle <= 160) {
    feedback = "Going down — keep weight on heels.";
  }

  // 5️⃣ Deep squat
  if (hipBelowKnee && kneeAngle <= 110) {
    feedback = "Great depth — stay stable!";
  }
// --- Outward tracking ---
let kneeOutward = 0;

if (side === "right") {
  kneeOutward = knee.x - hip.x;       // right = outward is right
} else {
  kneeOutward = hip.x - knee.x;       // left = outward is left
}

const needsMoreOutward = kneeOutward < 0.03;


// --- Inward collapse (valgus) ---
let kneeInward = 0;

if (side === "right") {
  kneeInward = hip.x - knee.x;        // inward = toward midline
} else {
  //kneeInward = knee.x - hip.x;
}

// hip–knee–ankle angle (valgus detection)
const valgusAngle = angleBetween(hip, knee, ankle);

const hasValgus =
  kneeInward < 0.03;
  


// --- FEEDBACK PRIORITY ---
if (hasValgus) {
  setformWrong(true);
  setFeedback("Knees collapsing inward — push knees outward.");
  return;
}

// if (needsMoreOutward) {
//   setformWrong(true);
//   setFeedback("Push knees slightly outward to track over toes.");
//   return;
// }

// GOOD
setformWrong(false);

  // ----------------------------
  // SQUAT PHASE / REP COUNTER
  // ----------------------------


if ( kneeAngle < downThreshold ) {
    setStage("up");
}

// Trigger UP only if previously DOWN and knees are valid
if ( kneeAngle > upThreshold ) {
    setStage("down");
    // setRepCount(r => r + 1); // count 1 rep
}

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
        <h2 className="text-2xl font-semibold mb-2">Squats Form Corrector</h2>
<p className="text-sm text-slate-200/80 mb-4">
  Stand facing the camera with your full body visible from head to ankles for accurate squat tracking.
</p>
<div className="w-full flex justify-center mt-6">
  <svg 
    width="140" 
    height="260" 
    viewBox="0 0 140 260"
  >
    {/* Head */}
    <circle cx="70" cy="40" r="25" stroke="white" strokeWidth="6" fill="none" />

    {/* Torso */}
    <line 
      x1="70" y1="70" 
      x2="70" y2="140" 
      stroke="white" strokeWidth="8"
    />

    {/* Arms */}
    <line 
      x1="70" y1="90" 
      x2="40" y2="130" 
      stroke="white" strokeWidth="8"
    />
    <line 
      x1="70" y1="90" 
      x2="100" y2="130" 
      stroke="white" strokeWidth="8"
    />

    {/* Legs (squat position) */}
    <line 
      x1="70" y1="140" 
      x2="40" y2="200" 
      stroke="white" strokeWidth="10"
    />
    <line 
      x1="70" y1="140" 
      x2="100" y2="200" 
      stroke="white" strokeWidth="10"
    />

    {/* Shins */}
    <line 
      x1="40" y1="200" 
      x2="40" y2="250" 
      stroke="white" strokeWidth="10"
    />
    <line 
      x1="100" y1="200" 
      x2="100" y2="250" 
      stroke="white" strokeWidth="10"
    />
  </svg>
</div>

        <div className="flex gap-3 mb-4 mt-5">
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
      </div>  */}

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
  <h4 className="font-medium">Squat Form Tips</h4>
  <ul className="list-disc list-inside text-sm mt-1">
    <li>Keep chest up and torso upright; avoid leaning forward.</li>
    <li>Push your knees slightly outward; track them over your toes.</li>
    <li>Maintain your weight on your heels, not your toes.</li>
    <li>Squat to a comfortable depth where hips go below knees if possible.</li>
    <li>Use a front profile for accurate tracking of knees and foot alignment.</li>
  </ul>
</div>
            </div>

            <div className="bg-slate-700/40 rounded-lg p-3">
              <h3 className="font-medium">Notes</h3>
              <p className="text-xs mt-1">This is a lightweight, heuristic-based AI trainer. For clinical or professional training, combine with expert coaching.</p>
            </div>
        
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-400 max-w-4xl text-center">
        <p>Tip: For best detection, ensure the camera captures shoulder, elbow and wrist clearly. If using front camera, keep phone to the side so your arm profile is visible.</p>
      </div>
    </div>
  );
}
