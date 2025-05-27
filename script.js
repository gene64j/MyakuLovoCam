import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const video = document.getElementById('video');
const canvas = document.getElementById('three-canvas');
const snapshot = document.getElementById('snapshot');
const captureButton = document.getElementById('capture-btn');
const downloadButton = document.getElementById('download-btn');
const returnButton = document.getElementById('return-btn');
const settingButton = document.getElementById('setting-btn');
const changeButton = document.getElementById('change-btn');
const autoButton = document.getElementById('auto-btn');
const modelFiles = ['asset/model1.glb', 'asset/model2.glb', 'asset/model3.glb'];
let modelIndex = 0;
let model = null;

let videoWidth = 0, videoHeight = 0;
let lastImageURL = null;
let mergedDataURL = null;

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      videoWidth = video.videoWidth;
      videoHeight = video.videoHeight;
    };
  } catch (e) {
    console.error("カメラ起動エラー:", e);
  }
}

const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
scene.add(light);

const lightSlider = document.getElementById('light-slider');
lightSlider.addEventListener('input', () => {
  light.intensity = parseFloat(lightSlider.value);
});

function loadModel(filename) {
  const loader = new GLTFLoader();
  loader.load(filename, gltf => {
    // 以前のモデルを削除
    if (model) {
      scene.remove(model);
    }

    model = gltf.scene;
    model.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.transparent = true;
        if (lastImageURL === null) {
          child.material.opacity = 0.3; // 初期状態では透明
        }
      }
    });
    scene.add(model);

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();

    camera.position.copy(center.clone().add(new THREE.Vector3(0, 0, size)));
    controls.target.copy(center);
    camera.lookAt(controls.target);
    model.position.y += 0.5;
    updateRotation();
  }, undefined, err => {
    console.error('モデル読み込みエラー:', err);
  });
}

const loader = new GLTFLoader();
loadModel(modelFiles[modelIndex]);

changeButton.addEventListener('click', () => {
  modelIndex = (modelIndex + 1) % modelFiles.length;
  loadModel(modelFiles[modelIndex]);
});

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  renderer.setSize(width, height, false); // falseでcanvasのスタイルを維持
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

function capture() {
  model.traverse(child => {
    if (child.isMesh && child.material) {
      child.material.opacity = 1.0;
    }
  });
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const screenAspect = screenWidth / screenHeight;
  const videoAspect = videoWidth / videoHeight;

  const captureCanvas = document.createElement('canvas');
  captureCanvas.width = screenWidth;
  captureCanvas.height = screenHeight;
  const ctx = captureCanvas.getContext('2d');

  let sx, sy, sWidth, sHeight;
  if (screenAspect > videoAspect) {
    sWidth = videoWidth;
    sHeight = videoWidth / screenAspect;
    sx = 0;
    sy = (videoHeight - sHeight) / 2;
  } else {
    sHeight = videoHeight;
    sWidth = videoHeight * screenAspect;
    sy = 0;
    sx = (videoWidth - sWidth) / 2;
  }
  ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, screenWidth, screenHeight);

  const dataURL = captureCanvas.toDataURL('image/jpeg', 0.95);
  snapshot.src = dataURL;
  snapshot.style.display = 'block';
  video.style.display = 'none';
  lastImageURL = dataURL;

  downloadButton.classList.remove('disabled-button');
  shareButton.classList.remove('disabled-button');
  returnButton.style.display = 'flex';
  captureButton.style.display = 'none';
}

captureButton.addEventListener('click', capture);

function resetControls() {
  model.traverse(child => {
    if (child.isMesh && child.material) {
      child.material.opacity = 0.3;
    }
  });
  snapshot.style.display = 'none';
  video.style.display = 'block';
  lastImageURL = null;
  downloadButton.classList.add('disabled-button');
  shareButton.classList.add('disabled-button');
  returnButton.style.display = 'none';
  captureButton.style.display = 'flex';
}

downloadButton.addEventListener('click', () => {
  if (lastImageURL) {
    const bgImg = new Image();
    bgImg.onload = () => {
      const mergedDataURL = createMergedDataURL(bgImg);

      const link = document.createElement('a');
      link.href = mergedDataURL;
      link.download = 'MyakuLovo.jpg';
      link.click();

      resetControls();
    };
    bgImg.src = lastImageURL;
  }
});

returnButton.addEventListener('click', resetControls);

const rotateSlider = document.getElementById('rotate-slider');
rotateSlider.addEventListener('input', updateRotation);

function createMergedDataURL(bgImg) {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const screenAspect = screenWidth / screenHeight;
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = screenWidth;
  finalCanvas.height = screenHeight;
  const ctx = finalCanvas.getContext('2d');
  ctx.drawImage(bgImg, 0, 0, screenWidth, screenHeight);

  const renderCanvas = renderer.domElement;
  const renderWidth = renderCanvas.width;
  const renderHeight = renderCanvas.height;
  const renderAspect = renderWidth / renderHeight;
  let sx, sy, sWidth, sHeight;
  if (screenAspect > renderAspect) {
    sWidth = renderWidth;
    sHeight = renderWidth / screenAspect;
    sx = 0;
    sy = (renderHeight - sHeight) / 2;
  } else {
    sHeight = renderHeight;
    sWidth = renderHeight * screenAspect;
    sy = 0;
    sx = (renderWidth - sWidth) / 2;
  }

  renderer.render(scene, camera);
  ctx.drawImage(renderCanvas, sx, sy, sWidth, sHeight, 0, 0, screenWidth, screenHeight);
  const mergedDataURL = finalCanvas.toDataURL('image/jpeg', 0.95);
  return mergedDataURL;
}

function updateRotation() {
  const angleInDegrees = parseFloat(rotateSlider.value);
  const angleInRadians = angleInDegrees * Math.PI / 180;
  if (model) {
    model.rotation.z = angleInRadians;
  }
};

const infoModal = document.getElementById('info-modal');
const closeButton = infoModal.querySelector('.close-button');

settingButton.addEventListener('click', () => {
  infoModal.style.display = 'flex';
});

closeButton.addEventListener('click', () => {
  infoModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === infoModal) {
    infoModal.style.display = 'none';
  }
});


function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}
const shareButton = document.getElementById('share-btn');
if (navigator.canShare && isMobile()) {
  shareButton.style.display = 'flex';
} else {
  downloadButton.style.display = 'flex';
}
shareButton.addEventListener('click', async () => {
  if (!lastImageURL) return;

  try {
    const mergedDataURL = await createMergedDataURLFromImage(lastImageURL);
    const blob = dataURLToBlob(mergedDataURL);
    const file = new File([blob], 'MyakuLovo.jpg', { type: 'image/jpeg' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'ミャクラボカメラ',
        text: '画像を共有します！',
        files: [file]
      });
    } else {
      alert('共有機能が使えません。');
    }

    resetControls();
  } catch (err) {
    console.error('共有失敗:', err);
    alert('共有に失敗しました。');
  }
});

function dataURLToBlob(dataURL) {
  const [header, base64] = dataURL.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

async function createMergedDataURLFromImage(dataURL) {
  return new Promise((resolve, reject) => {
    const bgImg = new Image();
    bgImg.onload = () => {
      const result = createMergedDataURL(bgImg);
      resolve(result);
    };
    bgImg.onerror = reject;
    bgImg.src = dataURL;
  });
}

startCamera();