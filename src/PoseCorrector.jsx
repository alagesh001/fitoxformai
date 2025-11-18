// FormCoach.jsx
import React, { useRef, useEffect, useState } from "react";
import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";

/*
  Usage:
  - <FormCoach />
  - Requires: npm i @mediapipe/pose @mediapipe/camera_utils
  - Run on https / localhost with camera permissions
*/

export default function PoseCorrect() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);

  const [status, setStatus] = useState("Idle");
  const [exercise, setExercise] = useState("squat"); // default
  const [reps, setReps] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [plankTime, setPlankTime] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [showOverlay, setShowOverlay] = useState(true);

  // thresholds / rules per exercise (angle in degrees)
  const RULES = {
    squat: { hipKneeAnkleMin: 90, hipKneeAnkleMax: 140 },
    pushup: { elbowMin: 40, elbowMax: 160 },
    deadlift: { backAngleMin: 160 }, // closer to straight = good
    bench: { elbowMin: 30, elbowMax: 160 },
    shoulder: { elbowMin: 70, elbowMax: 160 },
    bicep: { elbowCurlMin: 30, elbowCurlMax: 160 },
    plank: { hipAlignmentTolerance: 10 }, // degrees from shoulder-hip-ankle vertical
    lunge: { kneeAngleMin: 80, kneeAngleMax: 140 },
  };

  // stateful trackers for rep detection
  const trackerRef = useRef({
    direction: null, // 'down' or 'up' for reps
    lastAngle: null,
    inRep: false,
    plankRunning: false,
    plankStartTs: null,
  });

  // Utility: angle between three landmarks (A,B,C) with B as vertex
  function angleBetween(A, B, C) {
    // landmarks have .x, .y (normalized or pixel); use pixel or normalized consistently
    const AB = { x: A.x - B.x, y: A.y - B.y };
    const CB = { x: C.x - B.x, y: C.y - B.y };
    const dot = AB.x * CB.x + AB.y * CB.y;
    const magAB = Math.sqrt(AB.x * AB.x + AB.y * AB.y);
    const magCB = Math.sqrt(CB.x * CB.x + CB.y * CB.y);
    if (magAB * magCB === 0) return 0;
    let cos = dot / (magAB * magCB);
    cos = Math.max(-1, Math.min(1, cos));
    return (Math.acos(cos) * 180) / Math.PI;
  }

  function speak(text) {
    if (!audioEnabled || !("speechSynthesis" in window)) return;
    const ut = new SpeechSynthesisUtterance(text);
    ut.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(ut);
  }

  // Simple rep detection generic helper:
  // If angle goes below lowThreshold -> mark "down", then when above highThreshold -> count rep.
  function detectRep(angle, lowThreshold, highThreshold, key = "default") {
    const t = trackerRef.current;
    if (!t[key]) t[key] = { state: "up" }; // start state
    // state "up" means currently extended; "down" is contracted
    if (t[key].state === "up" && angle <= lowThreshold) {
      t[key].state = "down";
      t[key].downTs = Date.now();
      // optionally audio
    } else if (t[key].state === "down" && angle >= highThreshold) {
      t[key].state = "up";
      // count rep
      setReps((r) => r + 1);
      return true;
    }
    return false;
  }

  // Knee inward detection: check angle between hip-knee-ankle in frontal plane approximated by comparing x positions:
  function isKneeCaving(lmHip, lmKnee, lmAnkle) {
    // If knee x is significantly more medial compared to hip->ankle line, detect inward
    // Use slope of hip->ankle and knee distance to that line: approximate in 2D screen space.
    const xHip = lmHip.x, yHip = lmHip.y;
    const xAnk = lmAnkle.x, yAnk = lmAnkle.y;
    const xKnee = lmKnee.x, yKnee = lmKnee.y;

    // line from hip to ankle: compute cross product distance normalized
    const num = Math.abs((yAnk - yHip) * xKnee - (xAnk - xHip) * yKnee + xAnk * yHip - yAnk * xHip);
    const den = Math.sqrt((yAnk - yHip) ** 2 + (xAnk - xHip) ** 2) + 1e-6;
    const dist = num / den; // normalized distance
    // larger dist can indicate knee outwards; but we want inward: compare knee x relative to hip/ankle midx
    const midX = (xHip + xAnk) / 2;
    const inward = Math.abs(xKnee - midX) < 0.03; // threshold tweakable
    return inward && dist < 0.06; // both conditions
  }

  // Plank alignment: shoulder-hip-ankle vertical deviation
  function plankAlignment(shoulder, hip, ankle, canvasWidth) {
    // We'll compute the angle between shoulder->hip and hip->ankle in vertical sense
    const shoulderHip = { x: hip.x - shoulder.x, y: hip.y - shoulder.y };
    const hipAnkle = { x: ankle.x - hip.x, y: ankle.y - hip.y };
    const dot = shoulderHip.x * hipAnkle.x + shoulderHip.y * hipAnkle.y;
    const mag1 = Math.sqrt(shoulderHip.x * shoulderHip.x + shoulderHip.y * shoulderHip.y);
    const mag2 = Math.sqrt(hipAnkle.x * hipAnkle.x + hipAnkle.y * hipAnkle.y);
    if (mag1 * mag2 === 0) return 0;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * (180 / Math.PI);
    // If angle is small, alignment is good (hip is in line)
    return angle;
  }

  // get a back camera stream (ideal) with fallback
  async function getBackCameraStream() {
    try {
      // prefer exact device if possible
      const devices = await navigator.mediaDevices.enumerateDevices();
      const back = devices.find((d) => d.kind === "videoinput" && /back|rear|environment/i.test(d.label));
      const constraints = back ? { video: { deviceId: { exact: back.deviceId } } } : { video: { facingMode: { ideal: "environment" } } };
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      // fallback to any camera
      return await navigator.mediaDevices.getUserMedia({ video: true });
    }
  }

  // draw landmarks & angles
  function drawResults(results) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    // fit canvas to video resolution
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // draw video frame
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (!results.poseLandmarks || !showOverlay) {
      ctx.restore();
      return;
    }

    const lm = results.poseLandmarks;

    // helper to draw circle
    const drawPoint = (p, color = "red") => {
      ctx.beginPath();
      ctx.arc(p.x * canvas.width, p.y * canvas.height, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    };

    // draw key landmarks we use
    const LEFT = {
      hip: lm[23],
      knee: lm[25],
      ankle: lm[27],
      shoulder: lm[11],
      elbow: lm[13],
      wrist: lm[15],
    };
    const RIGHT = {
      hip: lm[24],
      knee: lm[26],
      ankle: lm[28],
      shoulder: lm[12],
      elbow: lm[14],
      wrist: lm[16],
    };

    // draw small dots
    Object.values(LEFT).forEach((p) => p && drawPoint(p, "rgba(0,200,100,0.9)"));
    Object.values(RIGHT).forEach((p) => p && drawPoint(p, "rgba(0,150,255,0.9)"));

    // compute angles we'll display depending on exercise
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.font = "16px Inter, Arial";

    if (exercise === "squat" || exercise === "lunge") {
      // hip-knee-ankle angle (right side)
      const angleR = angleBetween(RIGHT.hip, RIGHT.knee, RIGHT.ankle);
      const angleL = angleBetween(LEFT.hip, LEFT.knee, LEFT.ankle);
      ctx.fillText(`R knee angle: ${Math.round(angleR)}°`, 10, 20);
      ctx.fillText(`L knee angle: ${Math.round(angleL)}°`, 10, 40);
    } else if (exercise === "pushup" || exercise === "bench" || exercise === "deadlift" || exercise === "shoulder" || exercise === "bicep") {
      const elbowR = angleBetween(RIGHT.shoulder, RIGHT.elbow, RIGHT.wrist);
      const elbowL = angleBetween(LEFT.shoulder, LEFT.elbow, LEFT.wrist);
      ctx.fillText(`R elbow: ${Math.round(elbowR)}°`, 10, 20);
      ctx.fillText(`L elbow: ${Math.round(elbowL)}°`, 10, 40);
    } else if (exercise === "plank") {
      const align = plankAlignment(LEFT.shoulder || RIGHT.shoulder, LEFT.hip || RIGHT.hip, LEFT.ankle || RIGHT.ankle);
      ctx.fillText(`Spine angle: ${Math.round(align)}°`, 10, 20);
    }

    // overlay rep count & status
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(canvas.width - 160, 10, 150, 80);
    ctx.fillStyle = "#111827";
    ctx.font = "18px Inter, Arial";
    ctx.fillText(`Exercise: ${exercise}`, canvas.width - 150, 35);
    ctx.fillText(`Reps: ${reps}`, canvas.width - 150, 60);
    ctx.fillText(`${status}`, canvas.width - 150, 85);

    ctx.restore();
  }

  // main results handler
  function onResults(results) {
    drawResults(results);

    if (!results.poseLandmarks) {
      setStatus("No person found");
      return;
    }

    const lm = results.poseLandmarks;

    // pick side with better confidence (right vs left)
    const RIGHT = { hip: lm[24], knee: lm[26], ankle: lm[28], shoulder: lm[12], elbow: lm[14], wrist: lm[16] };
    const LEFT = { hip: lm[23], knee: lm[25], ankle: lm[27], shoulder: lm[11], elbow: lm[13], wrist: lm[15] };

    // Compute angles depending on exercise and run rule checks
    if (exercise === "squat") {
      const angleR = angleBetween(RIGHT.hip, RIGHT.knee, RIGHT.ankle);
      const angleL = angleBetween(LEFT.hip, LEFT.knee, LEFT.ankle);
      const angle = Math.min(angleR, angleL); // conservative
      const rule = RULES.squat;
      // rep detect: down when angle < min, up when angle > max
      const counted = detectRep(angle, rule.hipKneeAnkleMin, rule.hipKneeAnkleMax, "squat");
      if (counted) {
        setStatus("Good rep");
        speak("Good rep");
      } else {
        // feedback
        if (angle < rule.hipKneeAnkleMin) {
          setStatus("Too Low - check depth/pressure");
          setFeedback("Too low");
          speak("Too low");
        } else if (angle > rule.hipKneeAnkleMax) {
          setStatus("Not low enough");
        } else {
          setStatus("Maintaining form");
        }
      }
      // knee inward detection
      if (isKneeCaving(LEFT.hip, LEFT.knee, LEFT.ankle) || isKneeCaving(RIGHT.hip, RIGHT.knee, RIGHT.ankle)) {
        setFeedback("Knee caving in");
        speak("Knees caving in");
      }
    } else if (exercise === "pushup") {
      // elbow angle shoulder-elbow-wrist (smaller angle = bent)
      const elbowR = angleBetween(RIGHT.shoulder, RIGHT.elbow, RIGHT.wrist);
      const elbowL = angleBetween(LEFT.shoulder, LEFT.elbow, LEFT.wrist);
      const angle = Math.min(elbowR, elbowL);
      const rule = RULES.pushup;
      const counted = detectRep(angle, rule.elbowMin, rule.elbowMax, "pushup");
      if (counted) {
        setStatus("Push-up rep");
        speak("Nice push up");
      } else {
        if (angle > rule.elbowMax) setStatus("Arms too straight");
        else if (angle < rule.elbowMin) setStatus("Too low");
        else setStatus("Good depth");
      }
    } else if (exercise === "deadlift") {
      // measure back angle: shoulder-hip-knee (approx)
      const shoulder = RIGHT.shoulder || LEFT.shoulder;
      const hip = RIGHT.hip || LEFT.hip;
      const knee = RIGHT.knee || LEFT.knee;
      const backAngle = angleBetween(shoulder, hip, knee); // if ~180 straight back
      if (backAngle < RULES.deadlift.backAngleMin) {
        setStatus("Back rounded - Danger");
        speak("Keep your back straight");
      } else setStatus("Good hip hinge");
      // rep detection could be hip angle-based — detect in similar way with thresholds
      detectRep(backAngle, 120, 170, "deadlift");
    } else if (exercise === "bench") {
      const elbowR = angleBetween(RIGHT.shoulder, RIGHT.elbow, RIGHT.wrist);
      const elbowL = angleBetween(LEFT.shoulder, LEFT.elbow, LEFT.wrist);
      const angle = Math.min(elbowR, elbowL);
      detectRep(angle, RULES.bench.elbowMin, RULES.bench.elbowMax, "bench");
    } else if (exercise === "shoulder") {
      const elbowR = angleBetween(RIGHT.shoulder, RIGHT.elbow, RIGHT.wrist);
      const elbowL = angleBetween(LEFT.shoulder, LEFT.elbow, LEFT.wrist);
      const angle = Math.min(elbowR, elbowL);
      detectRep(angle, RULES.shoulder.elbowMin, RULES.shoulder.elbowMax, "shoulder");
    } else if (exercise === "bicep") {
      const elbowR = angleBetween(RIGHT.shoulder, RIGHT.elbow, RIGHT.wrist);
      const elbowL = angleBetween(LEFT.shoulder, LEFT.elbow, LEFT.wrist);
      const curlAngle = Math.min(elbowR, elbowL);
      const counted = detectRep(curlAngle, RULES.bicep.elbowCurlMin, RULES.bicep.elbowCurlMax, "bicep");
      if (counted) speak("Curl");
    } else if (exercise === "plank") {
      const shoulder = RIGHT.shoulder || LEFT.shoulder;
      const hip = RIGHT.hip || LEFT.hip;
      const ankle = RIGHT.ankle || LEFT.ankle;
      const align = plankAlignment(shoulder, hip, ankle);
      // small align -> good
      if (!trackerRef.current.plankRunning && align < RULES.plank.hipAlignmentTolerance) {
        trackerRef.current.plankRunning = true;
        trackerRef.current.plankStartTs = Date.now();
        setPlankTime(0);
        setStatus("Plank started");
        speak("Plank started");
      } else if (trackerRef.current.plankRunning && align >= RULES.plank.hipAlignmentTolerance + 5) {
        // ended due to sagging
        trackerRef.current.plankRunning = false;
        const duration = Math.round((Date.now() - trackerRef.current.plankStartTs) / 1000);
        setStatus(`Plank ended: ${duration}s`);
        speak(`Plank ended ${duration} seconds`);
      } else if (trackerRef.current.plankRunning) {
        setPlankTime(Math.round((Date.now() - trackerRef.current.plankStartTs) / 1000));
        setStatus(`Plank: ${plankTime}s`);
      }
    } else if (exercise === "lunge") {
      const angleR = angleBetween(RIGHT.hip, RIGHT.knee, RIGHT.ankle);
      const angleL = angleBetween(LEFT.hip, LEFT.knee, LEFT.ankle);
      const angle = Math.min(angleL, angleR);
      const counted = detectRep(angle, RULES.lunge.kneeAngleMin, RULES.lunge.kneeAngleMax, "lunge");
      if (counted) speak("Lunge rep");
      if (isKneeCaving(LEFT.hip, LEFT.knee, LEFT.ankle) || isKneeCaving(RIGHT.hip, RIGHT.knee, RIGHT.ankle)) {
        setFeedback("Knee caving in on lunge");
        speak("Knees caving in");
      }
    }
  }

  // Setup MediaPipe and camera
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus("Camera API not supported");
        return;
      }

      const stream = await getBackCameraStream();
      if (!mounted) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((res) => {
        onResults(res);
      });
      poseRef.current = pose;

      // We will not use MediaPipe Camera wrapper for facingMode constraints because we set srcObject manually.
      // But still can use wrapper to call requestAnimationFrame chain:
      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (!poseRef.current) return;
          await poseRef.current.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });

      cameraRef.current.start();
      setStatus("Ready");
    })();

    return () => {
      mounted = false;
      // stop tracks
      try {
        const tracks = videoRef.current?.srcObject?.getTracks?.();
        tracks && tracks.forEach((t) => t.stop());
      } catch (e) {}
      if (cameraRef.current) {
        try {
          cameraRef.current.stop();
        } catch (e) {}
      }
      if (poseRef.current) {
        try {
          poseRef.current.close();
        } catch (e) {}
      }
    };
  }, [exercise]);

  // Recording: record canvas stream
  const startRecording = () => {
    if (!canvasRef.current.captureStream) {
      alert("Recording not supported in this browser");
      return;
    }
    recordedChunksRef.current = [];
    const stream = canvasRef.current.captureStream(30); // 30fps
    const options = { mimeType: "video/webm; codecs=vp9" };
    const mr = new MediaRecorder(stream, options);
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exercise}-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };
    mr.start();
    setIsRecording(true);
    speak("Recording started");
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      speak("Recording stopped");
    }
  };

  // Minimal UI
  return (
    <div className="p-4 min-h-screen bg-slate-50 flex flex-col items-center">
      <h1 className="text-2xl font-semibold mb-4">Form Coach — Multi Exercise</h1>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 md:col-span-2 bg-white p-3 rounded-lg shadow">
          <div className="relative">
            <video ref={videoRef} playsInline muted className="hidden" />
            <canvas ref={canvasRef} className="w-full rounded-lg bg-black" />
            <div className="absolute top-3 left-3 bg-white/70 rounded px-2 py-1 text-sm">
              {feedback || status}
            </div>
            <div className="absolute top-3 right-3 bg-white/70 rounded px-2 py-1 text-sm">
              Reps: {reps}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <select
              value={exercise}
              onChange={(e) => {
                setExercise(e.target.value);
                setReps(0);
                trackerRef.current = {};
              }}
              className="px-3 py-2 border rounded"
            >
              <option value="squat">Squat</option>
              <option value="pushup">Push-up</option>
              <option value="deadlift">Deadlift</option>
              <option value="bench">Bench Press</option>
              <option value="shoulder">Shoulder Press</option>
              <option value="bicep">Bicep Curl</option>
              <option value="plank">Plank</option>
              <option value="lunge">Lunge</option>
            </select>

            <button
              onClick={() => {
                setAudioEnabled((s) => !s);
                if (!audioEnabled) speak("Audio enabled");
              }}
              className="px-3 py-2 bg-indigo-600 text-white rounded"
            >
              {audioEnabled ? "Audio On" : "Audio Off"}
            </button>

            {!isRecording ? (
              <button onClick={startRecording} className="px-3 py-2 bg-green-600 text-white rounded">
                Start Recording
              </button>
            ) : (
              <button onClick={stopRecording} className="px-3 py-2 bg-red-600 text-white rounded">
                Stop & Download
              </button>
            )}

            <button
              onClick={() => {
                setReps(0);
                trackerRef.current = {};
                setFeedback("");
              }}
              className="px-3 py-2 bg-gray-200 rounded"
            >
              Reset
            </button>

            <label className="flex items-center gap-2 ml-2">
              <input type="checkbox" checked={showOverlay} onChange={(e) => setShowOverlay(e.target.checked)} />
              Overlay
            </label>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Session Info</h3>
          <div className="text-sm mb-2">Exercise: <strong>{exercise}</strong></div>
          <div className="text-sm mb-2">Reps: <strong>{reps}</strong></div>
          <div className="text-sm mb-2">Plank time: <strong>{plankTime}s</strong></div>

          <div className="mt-2">
            <h4 className="font-medium">Tips</h4>
            <ul className="text-sm list-disc ml-4 mt-1">
              <li>Position camera so the whole body is visible</li>
              <li>Tweak thresholds in RULES object to suit users</li>
              <li>Use headphones for audio feedback in noisy gyms</li>
            </ul>
          </div>

          <div className="mt-3">
            <h4 className="font-medium">Export</h4>
            <p className="text-xs text-gray-500">Use Start Recording to capture the canvas (with overlays) and Stop to download a webm file.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
