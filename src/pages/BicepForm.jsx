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

export default function BicepCurlFormCorrector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const [facingMode, setFacingMode] = useState("user"); // 'user' or 'environment'
  const [running, setRunning] = useState(false);
  const [repCount, setRepCount] = useState(-2);
  const [stage, setStage] = useState("up"); // 'down' or 'up'
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
  const upThreshold = 58;
  const downThreshold = 160;

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

    // if (stage === "up") {
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

  // Mirror horizontally for selfie mode
  ctx.translate(ctx.canvas.width, 0);
  ctx.scale(-1, 1);

  ctx.globalAlpha = 0.9;

  const lm = results?.poseLandmarks;
  if (!lm || lm.length < 33) {
    ctx.restore();
    return;
  }

  // Helper: take pixel coordinates
  const P = (i) => ({
    x: lm[i].x * ctx.canvas.width,
    y: lm[i].y * ctx.canvas.height
  });

  const vis = (i) => lm[i].visibility ?? 0;

  const drawLine = (a, b, color = "white", width = 5) => {
    const A = P(a);
    const B = P(b);

    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  };

  const drawPoint = (i, color = "white", r = 6) => {
    const p = P(i);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  };

  // Right side joints
  const R = {
    SHOULDER: 12, ELBOW: 14, WRIST: 16,
    HIP: 24, KNEE: 26, ANKLE: 28
  };

  // Left side joints
  const L = {
    SHOULDER: 11, ELBOW: 13, WRIST: 15,
    HIP: 23, KNEE: 25, ANKLE: 27
  };

  // Compute arm visibility score
  const rightScore = vis(R.SHOULDER) + vis(R.ELBOW) + vis(R.WRIST);
  const leftScore  = vis(L.SHOULDER) + vis(L.ELBOW) + vis(L.WRIST);

  // Choose better side
  const SIDE = rightScore >= leftScore ? R : L;

  // ==========================================
  // DRAW ONLY THE SELECTED SIDE
  // ==========================================

  // Arm
  drawLine(SIDE.SHOULDER, SIDE.ELBOW, "rgba(0,150,255,1)", 6);
  drawLine(SIDE.ELBOW, SIDE.WRIST, "rgba(0,220,255,1)", 6);

  // Torso
  drawLine(SIDE.SHOULDER, SIDE.HIP, "rgba(255,200,0,1)", 7);

  // Leg
  drawLine(SIDE.HIP, SIDE.KNEE, "rgba(0,255,100,1)", 6);
  drawLine(SIDE.KNEE, SIDE.ANKLE, "rgba(0,255,100,1)", 6);

  // Points
  [
    SIDE.SHOULDER,
    SIDE.ELBOW,
    SIDE.WRIST,
    SIDE.HIP,
    SIDE.KNEE,
    SIDE.ANKLE
  ].forEach((i) => drawPoint(i, "white", 6));

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

  // -----------------------------
  // CHOOSE BEST VISIBLE SIDE
  // -----------------------------
  const R = { shoulder: lm[11], elbow: lm[13], wrist: lm[15], hip: lm[23] };
  const L = { shoulder: lm[12], elbow: lm[14], wrist: lm[16], hip: lm[24] };

  const rightVis = Math.min(
    R.shoulder?.visibility ?? 0,
    R.elbow?.visibility ?? 0,
    R.wrist?.visibility ?? 0
  );

  const leftVis = Math.min(
    L.shoulder?.visibility ?? 0,
    L.elbow?.visibility ?? 0,
    L.wrist?.visibility ?? 0
  );

  const side = rightVis > leftVis ? "right" : "left";
  const S = side === "right" ? R : L;

  const shoulder = S.shoulder;
  const elbow = S.elbow;
  const wrist = S.wrist;
  const hip = S.hip;

  if (!shoulder || !elbow || !wrist || !hip) return;

  // -----------------------------
  // ANGLE CALCULATOR
  // -----------------------------
  function angle(a, b, c) {
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };

    const dot = ab.x * cb.x + ab.y * cb.y;
    const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2);
    const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2);

    let ang = Math.acos(dot / (magAB * magCB));
    return ang * (180 / Math.PI);
  }

  // -----------------------------
  // ANGLES
  // -----------------------------
  const elbowAngle = angle(shoulder, elbow, wrist); // curl angle
  const elbowTorsoAngle = angle(elbow, shoulder, hip); // elbow-to-body
  const torsoLean = Math.abs(shoulder.x - hip.x); // leaning backward check

  setLastElbowAngle(elbowAngle); // UI visualization

  // -----------------------------
  // THRESHOLDS
  // -----------------------------
  const upThreshold = 60;   // top of curl
  const downThreshold = 150; // full stretch
  const maxElbowTorso = 25; // elbow not flaring outward
  const maxLean = 0.07;     // torso should not lean back

  let feedback = "";
  let formWrong = false;

  // -----------------------------
  // FORM FAULT CHECKS (block reps)
  // -----------------------------

  // 1. Elbow drifting away from torso
  if (elbowTorsoAngle > maxElbowTorso) {
    feedback = "Keep your elbow close — don’t let it drift away.";
    formWrong = true;
  }

  // 2. Leaning backward while curling
  if (torsoLean > maxLean) {
    feedback = "Don’t lean back — keep torso stable.";
    formWrong = true;
  }

  // Update wrong state
  setformWrong(formWrong);

  // If wrong form → stop here (no rep counting)
  if (formWrong) {
    setFeedback(feedback);
    return;
  }

  // -----------------------------
  // NORMAL FEEDBACK + REP LOGIC
  // -----------------------------
  if (elbowAngle < upThreshold) {
    setStage("down");
    feedback = "Good contraction — squeeze at the top.";
  } 
  else if (elbowAngle > downThreshold) {
    setStage("up");
    feedback = "Full extension — nice controlled descent.";
  } 
  else {
    feedback = "Controlled curl — keep it smooth.";
  }

  setFeedback(feedback);

  // -----------------------------
  // OPTIONAL REP COUNT (only if form is perfect)
  // -----------------------------
  /*
    if (stage === "down" && elbowAngle <= upThreshold) {
        setStage("up");
    }
    if (stage === "up" && elbowAngle >= downThreshold) {
        setStage("down");
        setRepCount(r => r + 1);
    }
  */
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
        <h2 className="text-2xl font-semibold mb-2">Bicep Curl Form Corrector</h2>
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
</p>      {/* <p className="text-xs opacity-80">
          {lastElbowAngle ? Math.round(lastElbowAngle) + "°" : "—"}
        </p> */}
      </div>

      {/* (YOU HAVE DUPLICATE FEEDBACK BLOCK — KEEP ONLY ONE) */}
      
      {/* RIGHT */}
      {/* <div className="flex flex-col text-right">
        <p className="text-lg font-bold text-green-400">{repCount}</p>
        <p className="text-xs opacity-80">Reps</p>
      </div> */}
    </div>
  </div>

  {/* FEEDBACK BOTTOM */}
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
