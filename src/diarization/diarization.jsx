import React, { useState, useEffect } from 'react';
// import * as ort from 'onnxruntime-web';
// import tf from '@tensorflow/tfjs';
// import * as wasmFeatureDetect from 'wasm-feature-detect';

import { computeMelLogSpectrogram } from './mel_log_spectrogram';
import { gruInference } from '../inference';
// import { LinkCluster } from '/Users/tugoph/Downloads/browser-ml-inference-main/src/diarization/clustering/online_links.ts';
import LinksCluster from './online_links.ts'

import Meyda from 'meyda';
import { MeydaAnalyzer } from 'meyda/dist/esm/meyda-wa';


const FFT_SIZE = 1024;
const HOP_LENGTH = 256;
const WIN_LENGTH = 1024;
const N_MEL_CHANNELS = 80;
const SAMPLING_RATE = 22050;
const MEL_FMIN = 0;
const MEL_FMAX = 8000.0;
const MAX_WAV_VALUE = 32768.0;
const MIN_LOG_VALUE = -11.52;
const MAX_LOG_VALUE = 1.2;
const SILENCE_THRESHOLD_DB = -10;
const N_FRAMES = 40;

const audioContext = new (window.AudioContext || window.webkitAudioContext) ({
   latencyHint: 'interactive',
   sampleRate: SAMPLING_RATE // 16000 max
});
const analyser = new AnalyserNode(audioContext, { "fftSize": FFT_SIZE, "smoothingTimeConstant": 0.8 }); // for AnalyserOptions
let dataArray = new Float32Array(FFT_SIZE / 2); // FFT_SIZE / 2 = analyser.frequencyBinCount;
const getAudioData = () => {
   const freqDataQueue = [];
   let currentFrames = 0;
   return new Promise((resolve, reject) => {
      const intervalID = setInterval(() => {
         const dArray = new Uint8Array(analyser.frequencyBinCount);
         analyser.getByteFrequencyData(dArray);
         dataArray = new Float32Array(dArray);
         // analyser.getFloatFrequencyData(dataArray);
         if (dataArray[0] === -Infinity) {
            clearInterval(intervalID);
            resolve(freqDataQueue);
         }
         // freqDataQueue.push(dataArray.map((data) => Math.abs(data)));
         freqDataQueue.push(dataArray);

         if (++currentFrames === N_FRAMES) {
            clearInterval(intervalID);
            resolve(freqDataQueue);
         }
      }, FFT_SIZE / SAMPLING_RATE * 1000);
   });
}

let freqDataQueue = [];
const getMFCC = (source) => {
   // let currentFrames = 0;
   const mfccAnalyser = Meyda.createMeydaAnalyzer({
      audioContext: audioContext,
      source: source,
      bufferSize: FFT_SIZE,
      numberOfMFCCCoefficients: FFT_SIZE / 2,
      featureExtractors: [
        'loudness',
        'spectralCentroid',
        'mfcc',
      ],
      callback: (features) => {
         // if (features.loudness.total >= LOUDNESS_THRESHOLD) {
         //    history[history_write_index].mfcc.set(features.mfcc);
         //    history[history_write_index].centroid = features.spectralCentroid;
         //    history_write_index = (history_write_index + 1) % HISTORY_LENGTH;
         // }
         freqDataQueue.push(features.mfcc);
         // currentFrames++;
         // return features.mfcc;
         // console.log(80, freqDataQueue.length);
      }
   });

   mfccAnalyser.start();

   // while (freqDataQueue.length < N_FRAMES) {

   // }
   return freqDataQueue;
}

export const Diarization = () => {

   const [audioRunning, setAudioRunning] = React.useState(false);
   // const [cluster, setCluster] = React.useState(new LinksCluster.LinksCluster(0.6, 0.6, 0.2));
   // const [cluster1, setCluster1] = React.useState(new LinksCluster.LinksCluster(0.6, 0.6, 0.4));
   // const [cluster2, setCluster2] = React.useState(new LinksCluster.LinksCluster(0.6, 0.6, 0.6));
   // const [cluster3, setCluster3] = React.useState(new LinksCluster.LinksCluster(0.6, 0.6, 0.8));
   // const [cluster, setCluster] = React.useState(new LinksCluster.LinksCluster(0.1, 0.1, 0.5));
   // const [cluster0, setCluster0] = React.useState(new LinksCluster.LinksCluster(0.2, 0.2, 0.5));
   // const [cluster1, setCluster1] = React.useState(new LinksCluster.LinksCluster(0.3, 0.3, 0.5));
   // const [cluster2, setCluster2] = React.useState(new LinksCluster.LinksCluster(0.5, 0.5, 0.5));
   // const [cluster3, setCluster3] = React.useState(new LinksCluster.LinksCluster(0.7, 0.7, 0.5));
   const [cluster, setCluster] = React.useState(new LinksCluster.LinksCluster(0.1, 0.4, 0.5)); // bounced off to 4 or 5
   const [cluster0, setCluster0] = React.useState(new LinksCluster.LinksCluster(0.1, 0.5, 0.5)); // was largely able to restrain to 0, 1, 2 for (silent, maya, tiger), but seems not sensitive. Unstable if there is a pause
   const [cluster1, setCluster1] = React.useState(new LinksCluster.LinksCluster(0.3, 0.3, 0.5)); // bounced off to 8 or 9.
   const [cluster2, setCluster2] = React.useState(new LinksCluster.LinksCluster(0.3, 0.5, 0.5)); // bounced off to 8 or 9.
   
   // const [freqData, setFreqData] = React.useState('');
   // const [spectroGram, setSpectroGram] = React.useState('');
   // const [gruEmbedder, setGruEmbedder] = React.useState(null);

   useEffect(() => {
      document.querySelector('button').addEventListener('click', () => {
         audioContext.resume().then(() => {
            console.log('Playback resumed successfully');
            if (audioContext.state === 'running') {
               console.log('running');
               setAudioRunning(true);

               navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
                  const source = audioContext.createMediaStreamSource(stream);
                  source.connect(analyser);
                  // analyser.connect(audioContext.destination);
                  const next = () => {
                     // getMFCC(source);
                     // console.log(127, freqDataQueue.length);
                     // if (freqDataQueue.length >= N_FRAMES) {
                     //    // console.log(131, freqDataQueue.length, freqDataQueue[0].length);
                     //    freqDataQueue = [];
                     // }
                     getAudioData().then((freqDataQueue) => { 
                        // console.log('frequency data: ', freqDataQueue[0][0], freqDataQueue.length, freqDataQueue[0].length);
                        // 2-norm
                        // for (let i = 0; i < freqDataQueue.length; i++) {
                        //    const norm = Math.sqrt(freqDataQueue[i].reduce((acc, cur) => acc + cur * cur, 0));
                        //    console.log(134, norm);
                        //    freqDataQueue[i] = freqDataQueue[i].map(data => data / norm);
                        // }
                        // console.log('frequency data: ', freqDataQueue[0][0], freqDataQueue.length, freqDataQueue[0].length);
                        computeMelLogSpectrogram(freqDataQueue).then((melLogSpectrogram) => {
                           // console.log(68, `mel log shape: (${melLogSpectrogram.length}, ${melLogSpectrogram[0].length})`);
                           gruInference(melLogSpectrogram)
                              .then(
                                 (gruEmbedding) => {
                                    // console.log(83, `gru embedding shape: (${gruEmbedding.output.dims}), ${gruEmbedding}`);
                                    console.log(
                                       cluster.predict(gruEmbedding.output.data),
                                       cluster0.predict(gruEmbedding.output.data),
                                       cluster1.predict(gruEmbedding.output.data),
                                       cluster2.predict(gruEmbedding.output.data),
                                       // cluster3.predict(gruEmbedding.output.data)
                                    );
                                 }
                              );
                        });
                        next();
                     });
                  };
                  next();
               });
            }
         });
      });
   }, []);

   return (
      <div>
         <h1>Diarization</h1>
         <button>Start</button>
         <p>
            {/* {dataArray.slice(0, 5).map((data, index) => `Element ${index}: ${data} `)} */}
            {/* {dataArray[0]} */}
            {/* {freqData} */}
         </p>
      </div>
   )
}
