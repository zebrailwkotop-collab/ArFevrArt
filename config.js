// Конфиг для главной страницы (презентация / общая сцена).
// Для certificate.html задаётся свой конфиг в самой странице.
window.AR_CONFIG = window.AR_CONFIG || {
  modelPath: 'model.glb',  // можно положить в корень (рядом с index.html) или в assets/ и указать 'assets/model.glb'
  title: 'AR-сюрприз',
  subtitle: 'Разрешите камеру — и увидите 3D-анимацию.',
  modelSize: 0.8,
  autoStart: true  // true: при открытии по QR сразу запрашиваем камеру, анимация GLB после разрешения
};
