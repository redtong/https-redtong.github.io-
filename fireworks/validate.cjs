// Print a self-contained browser test expression; pipe into the browser CLI's eval --stdin.
async function test() {
  const F = window.__FIREWORKS__, $ = s => document.querySelector(s);
  if (!F) throw new Error('Scene did not initialize');
  const tests = [];
  const check = (name, pass, detail = null) => tests.push({ name, passed: Boolean(pass), detail });
  const advance = seconds => { for (let t = 0; t < seconds; t += 1 / 60) F.step(1 / 60); };
  const frames = n => new Promise(resolve => { function tick() { if (--n <= 0) resolve(); else requestAnimationFrame(tick); } requestAnimationFrame(tick); });
  const change = (el, type = 'change') => el.dispatchEvent(new Event(type, { bubbles: true }));
  check('离线加载且完成初始化', location.protocol === 'file:' && $('#loading').classList.contains('ready'));
  const before = F.snapshot(); await frames(5); const after = F.snapshot();
  check('动画循环推进时间和粒子位置', after.time > before.time && after.checksum !== before.checksum);
  $('#auto').checked = false; change($('#auto'));
  check('自动燃放可关闭', F.state.auto === false);
  $('#pause').click(); const frozen = F.snapshot(); await frames(4);
  check('暂停冻结时钟与位置', F.state.paused && F.snapshot().time === frozen.time && F.snapshot().checksum === frozen.checksum);
  $('#pause').click(); check('恢复播放', !F.state.paused);
  F.clear(); let count = F.state.launched; $('#launch').click();
  check('按钮发射火箭', F.state.launched === count + 1 && F.snapshot().rockets === 1);
  const booms = F.state.exploded; advance(1.5);
  check('火箭爆炸为大量粒子', F.state.exploded === booms + 1 && F.snapshot().lit > 100);
  let s = F.snapshot(); advance(.3);
  check('爆炸粒子持续移动', F.snapshot().checksum !== s.checksum);
  for (const shape of ['peony', 'willow', 'ring', 'heart']) {
    F.clear(); const b = F.state.exploded; $('[data-shape="' + shape + '"]').click(); advance(1.5);
    check('造型执行：' + shape, F.state.shape === shape && F.state.lastShape === shape && F.state.exploded === b + 1 && F.snapshot().finite && F.snapshot().lit > 100);
  }
  $('[data-palette="ice"]').click(); check('配色切换', F.state.palette === 'ice' && $('[data-palette="ice"]').getAttribute('aria-pressed') === 'true');
  $('#density').value = '1.8'; change($('#density'), 'input');
  check('密度滑块', F.state.density === 1.8 && $('#density-value').textContent === '1.8×');
  F.clear(); count = F.state.launched; $('#finale').click(); advance(3.6);
  check('齐放生成九枚火箭', F.state.launched - count === 9 && F.snapshot().queued === 0);
  check('高密度齐放数值与容量有效', F.snapshot().finite && F.snapshot().lit <= F.snapshot().capacity);
  advance(8); check('生命周期结束回收全部粒子', F.snapshot().lit === 0 && F.snapshot().rockets === 0);
  $('#glow').checked = false; change($('#glow')); F.render();
  check('光晕关闭', F.state.bloom === false && F.composer.passes[1].enabled === false);
  $('#glow').checked = true; change($('#glow'));
  F.clear(); count = F.state.launched;
  const canvas = $('#scene');
  canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: innerWidth * .55, clientY: innerHeight * .28 }));
  canvas.dispatchEvent(new PointerEvent('pointerup', { clientX: innerWidth * .55, clientY: innerHeight * .28 }));
  check('点击夜空定点发射', F.state.launched === count + 1);
  $('#cinema').click(); const hidden = document.body.classList.contains('cinema'); $('#exit-cinema').click();
  check('沉浸模式进出', hidden && !document.body.classList.contains('cinema'));
  let downloaded = null; const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function() { downloaded = { download: this.download, href: this.href }; };
  try { $('#photo').click(); await frames(8); } finally { HTMLAnchorElement.prototype.click = click; }
  check('截图按钮生成 PNG 下载', downloaded?.download === 'afterglow-fireworks.png' && downloaded.href.startsWith('blob:'));
  check('无远程脚本图片依赖', ![...document.scripts].some(el => el.src) && ![...document.images].some(el => /^https?:/.test(el.src)));
  F.clear(); $('#auto').checked = true; change($('#auto')); count = F.state.launched; advance(2);
  check('自动发射可恢复', F.state.launched > count);
  $('#auto').checked = false; change($('#auto')); F.clear(); F.render();
  const memoryBefore = F.snapshot();
  for (let i = 0; i < 8; i++) { F.launch(0, 20); advance(1.6); F.render(); }
  advance(8); F.render(); const memoryAfter = F.snapshot();
  check('重复发射不增加几何与贴图数量', memoryAfter.geometries === memoryBefore.geometries && memoryAfter.textures === memoryBefore.textures, { before: memoryBefore.geometries, after: memoryAfter.geometries });
  // End with a controlled, visually inspectable scene; pause is intentional for the QA screenshot.
  F.clear(); $('#density').value = '1'; change($('#density'), 'input');
  $('[data-shape="peony"]').click(); F.clear(); $('[data-palette="aurora"]').click();
  const w = innerWidth < 700 ? 5 : 11;
  F.launch(-w, 23, { shape: 'willow', palette: 'gold' });
  F.launch(w, 21, { shape: 'peony', palette: 'ice' });
  F.launch(0, 28, { shape: 'ring', palette: 'rose' }); advance(2.15); F.render(); F.setPaused(true);
  check('多束不同颜色烟花并存且主粒子未被拖尾覆盖', F.snapshot().heads > 500 && F.snapshot().colorsPresent > 4, { heads: F.snapshot().heads, colors: F.snapshot().colorsPresent });
  $('#toast').classList.remove('show');
  const report = { passed: tests.every(t => t.passed), count: tests.length, tests, final: F.snapshot() };
  window.__VALIDATION__ = report;
  return report;
}
module.exports = { test };
if (require.main === module) process.stdout.write('(' + test.toString() + ')()');
