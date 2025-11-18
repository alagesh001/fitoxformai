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
    if (stage === "up") {
      setRepCount((r) => r + 1);
      console.log("Stage DOWN, rep counted:", repCount + 1);
    }
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

  ctx.globalAlpha = 0.85;

  // ⭐ MIRROR CANVAS (Flip horizontally)
  ctx.scale(-1, 1);
  ctx.translate(-ctx.canvas.width, 0);

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

  const rightShoulder = lm[11];
  const rightElbow = lm[13];
  const rightWrist = lm[15];
  const leftShoulder = lm[12];
  const leftElbow = lm[14];
  const leftWrist = lm[16];

  const rightVis = Math.min(
    rightShoulder?.visibility ?? 0,
    rightElbow?.visibility ?? 0,
    rightWrist?.visibility ?? 0
  );
  const leftVis = Math.min(
    leftShoulder?.visibility ?? 0,
    leftElbow?.visibility ?? 0,
    leftWrist?.visibility ?? 0
  );

  // Detect dominant visible arm
  const side = rightVis > leftVis ? "right" : "left";
  setArmSide(side);

  const shoulder = side === "right" ? rightShoulder : leftShoulder;
  const elbow = side === "right" ? rightElbow : leftElbow;
  const wrist = side === "right" ? rightWrist : leftWrist;

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

  function analyzeForm(results) {
    const lm = results?.poseLandmarks;
    if (!lm) return;

    const rightShoulder = lm[11];
    const rightElbow = lm[13];
    const rightWrist = lm[15];
    const leftShoulder = lm[12];
    const leftElbow = lm[14];
    const leftWrist = lm[16];

    const rightVis = Math.min(rightShoulder?.visibility ?? 0, rightElbow?.visibility ?? 0, rightWrist?.visibility ?? 0);
    const leftVis = Math.min(leftShoulder?.visibility ?? 0, leftElbow?.visibility ?? 0, leftWrist?.visibility ?? 0);

    const side = rightVis > leftVis ? "right" : "left";

    const shoulder = side === "right" ? rightShoulder : leftShoulder;
    const elbow = side === "right" ? rightElbow : leftElbow;
    const wrist = side === "right" ? rightWrist : leftWrist;

    if (!shoulder || !elbow || !wrist) return;

    // elbow angle
    const elbowAngle = angleBetween(shoulder, elbow, wrist);
    setLastElbowAngle(elbowAngle);

    // simple rep counter logic: down (extended) -> up (flexed) counts 1 rep
    // thresholds can be tuned
    
    // detect shoulder movement (excessive elbow flare): measure horizontal distance between shoulder and elbow
    const shoulderElbowDx = Math.abs((shoulder.x - elbow.x) * 1); // normalized
    const shoulderElbowDy = Math.abs((shoulder.y - elbow.y) * 1);

    // detect wrist drifting forward or away from elbow line (simple heuristic)
    const elbowWristDx = Math.abs((elbow.x - wrist.x));

    // feedback rules (simple and intentionally conservative)
    let localFeedback = "Good visibility. Keep going.";

    if (elbowAngle == null) {
      localFeedback = "Move so your arm is fully visible on camera.";
    } else {
      if (elbowAngle < 30) {
        localFeedback = "Top of curl — avoid swinging. Keep shoulder stable.";
      } else if (elbowAngle <= upThreshold ) {
        localFeedback = "Curling — squeeze the biceps.";
        setStage("down");
      } else if (elbowAngle >= downThreshold  ) {
        setStage("up");
        localFeedback = "Down position — fully extend but keep elbow slightly soft (don’t lock).";
      }

      // shoulder stability check: if shoulder-elbow x-distance too large -> elbow flare
      if (shoulderElbowDx > 0.25) {
        localFeedback = "Elbow is flaring outward — keep your elbow close to your torso.";
      }

      // wrist check: if wrist is too far forward of elbow in x-direction, might be cheating
      if (elbowWristDx > 0.25) {
        localFeedback = "Wrist drifting forward — keep wrist in line with elbow.";
      }
    }

    setFeedback(localFeedback);
    // rep counting
    // if (elbowAngle != null) {
    //         console.log("Stage:", elbowAngle,stage);

    //   if (elbowAngle <= upThreshold && stage === "down") {
    //     setStage("up");
    //   }

    //   if (elbowAngle >= downThreshold && stage === "up") {
    //     setStage("down");
    //   //  setRepCount((r) => r + 1);
    //   }
    // }
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
  <video
  ref={videoRef}
  className="w-full h-auto object-cover"
  playsInline
  muted
  style={{
    transform: facingMode === "user" ? "scaleX(-1)" : "scaleX(1)",
  }}
/>

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
      <div className="flex flex-col gap-1 text-left">
        <p className="opacity-80">Camera: <span className="font-semibold opacity-100">{facingMode === 'user' ? 'Front' : 'Back'}</span></p>
        <p className="opacity-80">Arm: <span className="font-semibold opacity-100">{armSide}</span></p>
      </div>

      {/* CENTER */}
      <div className="text-center flex flex-col">
        <p className="text-lg font-bold">{stage}</p>
        <p className="text-xs opacity-80">
          {lastElbowAngle ? Math.round(lastElbowAngle) + "°" : "—"}
        </p>
      </div>
<div className="absolute mt-30 left-0 w-full flex justify-center">
    <div className="bg-black/50 backdrop-blur-md text-white text-lg px-5 py-2 rounded-lg">
      {feedback || "Perfect form!"}
    </div>
  </div>
      {/* RIGHT */}
      <div className="flex flex-col text-right">
        <p className="text-lg font-bold text-green-400">{repCount}</p>
        <p className="text-xs opacity-80">Reps</p>
      </div>

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
