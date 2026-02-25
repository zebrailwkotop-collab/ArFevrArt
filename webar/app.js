(function () {
  'use strict';

  var ui = document.getElementById('ui');
  var btnStart = document.getElementById('btn-start');
  var loading = document.getElementById('loading');
  var canvasWrap = document.getElementById('canvas-wrap');
  var canvas = document.getElementById('canvas');

  var cameraVideo = null;
  var scene, camera, renderer;
  var mixer = null;
  var clock = new THREE.Clock();
  var modelGroup = null;
  var placeholderPlane = null;

  var config = window.AR_CONFIG || {};
  var GLB_PATH = config.modelPath || 'assets/model.glb';
  var MODEL_SIZE = typeof config.modelSize === 'number' ? config.modelSize : 0.8;

  function showLoading(show) {
    if (loading) loading.classList.toggle('hidden', !show);
  }

  function showError(msg) {
    if (loading) {
      loading.textContent = msg;
      loading.classList.remove('hidden');
    }
    if (btnStart) btnStart.disabled = false;
  }

  function fitModelToScreen(model, targetSize) {
    var box = new THREE.Box3().setFromObject(model);
    var size = new THREE.Vector3();
    box.getSize(size);
    var maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim <= 0) return 1;
    return targetSize / maxDim;
  }

  function initThree(videoElement) {
    var width = window.innerWidth;
    var height = window.innerHeight;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // Фон — камера
    var videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    var bgGeometry = new THREE.PlaneGeometry(2, 2);
    var bgMaterial = new THREE.MeshBasicMaterial({
      map: videoTexture,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    var bgPlane = new THREE.Mesh(bgGeometry, bgMaterial);
    bgPlane.position.z = -1;
    scene.add(bgPlane);

    // Контейнер для GLB-модели
    modelGroup = new THREE.Group();
    modelGroup.position.set(0, 0, -0.8);
    scene.add(modelGroup);

    // Запас: плоскость, если GLB не загрузится
    var placeholderGeometry = new THREE.PlaneGeometry(1, 1);
    var placeholderMaterial = new THREE.MeshBasicMaterial({
      color: 0xeab676,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    placeholderPlane = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
    placeholderPlane.position.set(0, 0, -0.5);
    placeholderPlane.visible = false;
    scene.add(placeholderPlane);

    var modelLoadingEl = document.getElementById('model-loading');
    function hideModelLoading() {
      if (modelLoadingEl) modelLoadingEl.classList.add('hidden');
    }

    var loader = new THREE.GLTFLoader();
    loader.load(
      GLB_PATH,
      function (gltf) {
        var model = gltf.scene;
        modelGroup.add(model);

        var scale = fitModelToScreen(model, MODEL_SIZE);
        model.scale.setScalar(scale);

        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          for (var i = 0; i < gltf.animations.length; i++) {
            var clip = gltf.animations[i];
            var action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat);
            action.clampWhenFinished = false;
            action.play();
          }
        }
        hideModelLoading();
      },
      undefined,
      function () {
        placeholderPlane.visible = true;
        hideModelLoading();
      }
    );

    window.addEventListener('resize', onResize);
    animate();
  }

  function onResize() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    if (camera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    if (renderer) renderer.setSize(width, height);
  }

  function animate() {
    requestAnimationFrame(animate);
    var delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  function startAR() {
    btnStart.disabled = true;
    showLoading(true);
    loading.textContent = 'Запускаем камеру…';

    cameraVideo = document.createElement('video');
    cameraVideo.autoplay = true;
    cameraVideo.playsInline = true;
    cameraVideo.muted = true;
    cameraVideo.setAttribute('playsinline', '');
    cameraVideo.setAttribute('webkit-playsinline', '');

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(function (s) {
        cameraVideo.srcObject = s;
        cameraVideo.play().then(function () {
          showLoading(false);
          ui.classList.add('hidden');
          canvasWrap.classList.remove('hidden');
          initThree(cameraVideo);
        }).catch(function () {
          showLoading(false);
          ui.classList.remove('hidden');
          btnStart.disabled = false;
          showError('Не удалось запустить камеру.');
        });
      })
      .catch(function () {
        showLoading(false);
        ui.classList.remove('hidden');
        btnStart.disabled = false;
        showError('Доступ к камере запрещён или недоступен.');
      });
  }

  if (btnStart) {
    btnStart.addEventListener('click', startAR);
  }

  // При открытии по QR — сразу запускаем камеру (после разрешения проиграется GLB)
  if (config.autoStart) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startAR);
    } else {
      startAR();
    }
  }
})();
