// // PoseTrainer.js
// import React, { useEffect, useState, useRef } from "react";
// import { View, Text, StyleSheet, Dimensions, Picker, Platform, Alert } from "react-native";
// import { Camera, useCameraDevices, useFrameProcessor } from "react-native-vision-camera";
// import * as tf from "@tensorflow/tfjs";
// import "@tensorflow/tfjs-react-native";
// import * as posedetection from "@tensorflow-models/pose-detection";
// import { runOnJS } from "react-native-reanimated";
// import { Svg, Circle } from "react-native-svg";
// import poses from "../assets/poses.json"; // Your reference poses

// const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// export default function PoseTrainer() {
//   const [detector, setDetector] = useState(null);
//   const [selectedPose, setSelectedPose] = useState(poses[0]);
//   const [userKeypoints, setUserKeypoints] = useState([]);
//   const [score, setScore] = useState(0);

//   // --- Camera setup ---
//   const devices = useCameraDevices();
//   const device = devices.front;
//   const cameraRef = useRef(null);

//   // --- TensorFlow.js init ---
//   useEffect(() => {
//     const initTF = async () => {
//       await tf.ready();
//       const model = posedetection.SupportedModels.MoveNet;
//       const detectorInstance = await posedetection.createDetector(model, {
//         modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
//       });
//       setDetector(detectorInstance);
//     };
//     initTF();
//   }, []);

//   // --- Pose comparison ---
//   const getDistance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

//   const comparePoseToReference = (userPose, referencePose) => {
//     const results = userPose.map((kp, idx) => {
//       const ref = referencePose[idx];
//       const distance = getDistance(kp, ref);
//       return { index: idx, distance, correct: distance < 30 };
//     });
//     const correctCount = results.filter(r => r.correct).length;
//     const score = (correctCount / results.length) * 100;
//     return { results, score };
//   };

//   // --- Frame processor ---
//   const frameProcessor = useFrameProcessor((frame) => {
//     "worklet";
//     if (!detector) return;
//     runOnJS(processFrame)(frame);
//   }, [detector, selectedPose]);

//   const processFrame = async (frame) => {
//     if (!detector || !frame) return;
//     try {
//       const imageTensor = tf.browser.fromPixels({
//         data: frame.data,
//         width: frame.width,
//         height: frame.height,
//       });

//       const posesDetected = await detector.estimatePoses(imageTensor, { flipHorizontal: true });
//       if (posesDetected && posesDetected[0]?.keypoints) {
//         setUserKeypoints(posesDetected[0].keypoints);
//         const comparison = comparePoseToReference(posesDetected[0].keypoints, selectedPose.keypoints);
//         setScore(comparison.score);
//       }
//       imageTensor.dispose();
//     } catch (e) {
//       console.warn("Frame processing error:", e);
//     }
//   };

//   // --- Render keypoints ---
//   const renderKeypoints = () => {
//     return userKeypoints.map((kp, idx) => (
//       <Circle
//         key={idx}
//         cx={(kp.x / 640) * SCREEN_WIDTH}
//         cy={(kp.y / 480) * SCREEN_HEIGHT}
//         r={5}
//         fill="red"
//       />
//     ));
//   };

//   if (!device) return <Text style={{ color: "#fff" }}>Loading camera...</Text>;

//   return (
//     <View style={styles.container}>
//       <Camera
//         style={styles.camera}
//         ref={cameraRef}
//         device={device}
//         isActive={true}
//         frameProcessor={frameProcessor}
//         frameProcessorFps={5}
//       />
//       <Svg style={StyleSheet.absoluteFill}>{renderKeypoints()}</Svg>

//       <View style={styles.overlay}>
//         <Text style={styles.scoreText}>Score: {score.toFixed(1)}%</Text>

//         <Picker
//           selectedValue={selectedPose.name}
//           style={{ height: 50, width: 200, color: "#fff" }}
//           onValueChange={(itemValue) => {
//             const pose = poses.find((p) => p.name === itemValue);
//             setSelectedPose(pose);
//           }}
//         >
//           {poses.map((p) => (
//             <Picker.Item key={p.name} label={p.name} value={p.name} />
//           ))}
//         </Picker>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#000" },
//   camera: { flex: 1 },
//   overlay: {
//     position: "absolute",
//     top: 50,
//     alignSelf: "center",
//     alignItems: "center",
//   },
//   scoreText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
// });
