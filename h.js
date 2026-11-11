// ==UserScript==
// @name         海角社区钻石视频破解 - 免费版
// @namespace    hjxiaozhushou123
// @version      1.1.0
// @description  海角社区免费解锁付费视频，支持很多视频，欢迎使用！！！！
// @author       xiaozhushou123
// @license      Proprietary
// @include      /^https?:\/\/(?:www\.)?[a-z0-9]{10,20}\.top\//
// @match        *://haijiao.com/*
// @match        *://*.haijiao.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.6.16/hls.light.min.js
// @connect      191.96.243.163
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @run-at       document-idle
// @antifeature  membership  播放前需加入 Telegram 群完成验证
// @noframes
// @downloadURL https://update.sleazyfork.org/scripts/604750/%E6%B5%B7%E8%A7%92%E7%A4%BE%E5%8C%BA%E9%92%BB%E7%9F%B3%E8%A7%86%E9%A2%91%E7%A0%B4%E8%A7%A3%20-%20%E5%85%8D%E8%B4%B9%E7%89%88.user.js
// @updateURL https://update.sleazyfork.org/scripts/604750/%E6%B5%B7%E8%A7%92%E7%A4%BE%E5%8C%BA%E9%92%BB%E7%9F%B3%E8%A7%86%E9%A2%91%E7%A0%B4%E8%A7%A3%20-%20%E5%85%8D%E8%B4%B9%E7%89%88.meta.js
// ==/UserScript==
(function () {
  'use strict';

  const REQUIRED_HLS = (typeof Hls !== 'undefined') ? Hls : null;

  const BASE_URL = "http://191.96.243.163:18787";
  const APP_TOKEN = "EHqRzyUOH0p9R2kRvBrh9nmWurPOZn";

  const KEY_DEVICE = 'deviceKey';
  const KEY_SERIAL = 'deviceSerial';
  const KEY_EST_SECONDS = 'parseEstimate';
  const KEY_PLAY_TOKEN = 'playToken';

  const store = {
    get(key, fallback) {
      try {
        return GM_getValue(key, fallback);
      } catch (_) {
        const raw = localStorage.getItem('haijiao.' + key);
        return raw === null ? fallback : raw;
      }
    },
    set(key, value) {
      try {
        GM_setValue(key, value);
      } catch (_) {
        try {
          localStorage.setItem('haijiao.' + key, value);
        } catch (_) {  }
      }
    },
  };

  function hostOf(url) {
    try {
      return new URL(url).hostname;
    } catch (_) {
      return '';
    }
  }

  function newDeviceKey() {
    const c = window.crypto || window.msCrypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    if (c && typeof c.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      c.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    return 'k-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  function ensureDeviceKey() {
    let key = store.get(KEY_DEVICE, '');
    if (!key) {
      key = newDeviceKey();
      store.set(KEY_DEVICE, key);
    }
    return key;
  }

  function callBackend(path, body, method) {
    return new Promise((resolve, reject) => {
      if (!APP_TOKEN) {
        reject(new Error('未配置，请联系管理员'));
        return;
      }
      const base = BASE_URL.replace(/\/+$/, '');
      if (!hostOf(base)) {
        reject(new Error('配置有误，请联系管理员'));
        return;
      }
      if (typeof GM_xmlhttpRequest !== 'function') {
        reject(new Error('当前浏览器不支持油猴请求，请换 Kiwi / Firefox + Tampermonkey'));
        return;
      }

      GM_xmlhttpRequest({
        method: method || 'POST',
        url: base + path,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + APP_TOKEN },
        data: method === 'GET' ? undefined : JSON.stringify(body || {}),
        timeout: 15000,
        onload(res) {
          let payload = null;
          try {
            payload = JSON.parse(res.responseText);
          } catch (_) {
            reject(new Error('服务异常（' + res.status + '）'));
            return;
          }
          if (res.status >= 200 && res.status < 300 && payload && payload.ok) {
            resolve(payload.data);
          } else {
            reject(new Error((payload && payload.error) || '服务异常（' + res.status + '）'));
          }
        },
        onerror: () => reject(new Error('网络异常，请稍后重试')),
        ontimeout: () => reject(new Error('网络超时，请稍后重试')),
      });
    });
  }

  const CSS = `
    #hj-card {
      position: fixed; left: 8px; bottom: 10px; z-index: 2147483000;
      display: flex; flex-direction: column; gap: 4px;
      margin: 0; padding: 0; border: 0; background: transparent;
      color: #1f2328;
      font: 12px/1.3 -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
      text-align: left;

      pointer-events: none;
    }

    #hj-actions button, #hj-center, #hj-status:not(:empty) { pointer-events: auto; }


    #hj-main { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }

    #hj-center { order: -1; }
    #hj-actions {
      display: flex; flex-direction: column; gap: 4px;
      padding: 0; margin: 0;
    }

    #hj-actions button {
      width: 72px; min-height: 34px; box-sizing: border-box;
      display: flex; align-items: center; justify-content: center; gap: 3px;
      font: inherit; font-size: 12px; font-weight: 600; line-height: 1.1;
      padding: 5px 6px;
      border: 1px solid rgba(31,35,40,.15); border-radius: 8px;
      background: #fff; color: #1f2328; cursor: pointer;
      box-shadow: 0 1px 4px rgba(31,35,40,.14);
      -webkit-tap-highlight-color: transparent;
    }
    #hj-card.hj-dark #hj-actions button {
      background: #21262d; color: #e6edf3; border-color: #30363d;
      box-shadow: 0 1px 4px rgba(1,4,9,.45);
    }
    #hj-actions button:active { background: #eaeef2; }
    #hj-card.hj-dark #hj-actions button:active { background: #30363d; }


    #hj-play { background: #1f883d; color: #fff; border-color: rgba(31,35,40,.15); }
    #hj-play:active { background: #1a7f37; }
    #hj-card.hj-dark #hj-play { background: #238636; color: #fff; }
    #hj-play[data-hj-busy="1"] { opacity: .7; cursor: progress; }


    .hj-slot { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; overflow: hidden; }
    .hj-slot > video {
      display: block; width: 100%; height: 100%;
      aspect-ratio: 16 / 9; object-fit: contain; background: #000;
    }


    #hj-center {
      display: none; width: max-content; max-width: min(72vw, 260px);
      padding: 5px 7px; border-radius: 8px;
      background: #fff; border: 1px solid #d0d7de;
      box-shadow: 0 1px 4px rgba(31,35,40,.14);
    }
    #hj-card.hj-dark #hj-center {
      background: #161b22; border-color: #30363d; box-shadow: 0 1px 4px rgba(1,4,9,.45);
    }
    #hj-center.hj-open { display: block; }

    #hj-row { display: flex; align-items: center; gap: 6px; }

    #hj-label { flex: none; font-size: 11px; color: #656d76; }
    #hj-card.hj-dark #hj-label { color: #8b949e; }

    #hj-serial {
      flex: 1; min-width: 0;
      display: flex; align-items: center; justify-content: flex-end; gap: 4px;
      font: 600 12px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace;
      letter-spacing: .02em; word-break: break-all; cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    #hj-serial.hj-placeholder {
      font-size: 11px; font-weight: 400; letter-spacing: 0; color: #8b949e;
    }
    .hj-copy-icon { flex: none; width: 11px; height: 11px; opacity: .4; }
    #hj-card.hj-dark .hj-copy-icon { opacity: .5; }


    #hj-status {
      width: max-content; max-width: min(72vw, 260px);
      padding: 4px 7px; border-radius: 7px; font-size: 10.5px; line-height: 1.3;
      background: #fff; border: 1px solid #d0d7de; color: #656d76;
      box-shadow: 0 1px 4px rgba(31,35,40,.14);
    }
    #hj-card.hj-dark #hj-status {
      background: #161b22; border-color: #30363d; color: #8b949e;
      box-shadow: 0 1px 4px rgba(1,4,9,.45);
    }
    #hj-status:empty { display: none; }
    #hj-status.hj-error { color: #cf222e; border-color: rgba(207,34,46,.4); }
    #hj-card.hj-dark #hj-status.hj-error { color: #f85149; }
    #hj-status.hj-ok { color: #1a7f37; }
    #hj-card.hj-dark #hj-status.hj-ok { color: #3fb950; }
    #hj-status.hj-warn { color: #9a6700; border-color: rgba(154,103,0,.4); }
    #hj-card.hj-dark #hj-status.hj-warn { color: #d29922; }


    #hj-player {
      position: fixed; z-index: 2147483000;
      left: 50%; top: 50%; transform: translate(-50%, -50%);
      width: min(92vw, 720px);
      padding: 6px; border-radius: 10px;
      background: #fff; border: 1px solid #d0d7de;
      box-shadow: 0 8px 28px rgba(1,4,9,.28);
      font: 12px/1.3 -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
    }
    #hj-card.hj-dark ~ #hj-player, #hj-player.hj-dark { background: #161b22; border-color: #30363d; }
    #hj-player video { display: block; width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: 6px; }
    #hj-player-bar { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 4px 2px; }
    #hj-player-bar button {
      font: inherit; font-weight: 600; padding: 4px 10px; cursor: pointer;
      border: 1px solid rgba(31,35,40,.15); border-radius: 7px;
      background: #fff; color: #1f2328;
    }


    #hj-verify {
      position: fixed; z-index: 2147483001;
      left: 50%; top: 50%; transform: translate(-50%, -50%);
      width: min(88vw, 320px); padding: 14px;
      background: #fff; border: 1px solid #d0d7de; border-radius: 10px;
      box-shadow: 0 8px 28px rgba(1,4,9,.28);
      font: 12px/1.5 -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
      color: #1f2328;
    }
    #hj-card.hj-dark ~ #hj-verify { background: #161b22; border-color: #30363d; color: #e6edf3; }
    .hj-verify-title { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
    .hj-verify-tip { color: #656d76; margin: 4px 0; }
    #hj-card.hj-dark ~ #hj-verify .hj-verify-tip { color: #8b949e; }
    .hj-verify-code {
      display: inline-block; margin: 2px 0 6px; padding: 2px 8px; border-radius: 6px;
      background: #f6f8fa; font: 700 16px/1.4 ui-monospace, Consolas, monospace;
      letter-spacing: .12em;
    }
    #hj-card.hj-dark ~ #hj-verify .hj-verify-code { background: #21262d; }
    .hj-verify-link {
      display: block; margin: 6px 0; padding: 7px 8px; text-align: center;
      text-decoration: none; border: 1px solid rgba(31,35,40,.15); border-radius: 7px;
      background: #1f883d; color: #fff; font-weight: 600;
    }
    .hj-verify-link + .hj-verify-link { background: #fff; color: #1f2328; }
    #hj-card.hj-dark ~ #hj-verify .hj-verify-link + .hj-verify-link {
      background: #21262d; color: #e6edf3; border-color: #30363d;
    }
  `;

  function injectStyle() {
    const style = document.createElement('style');
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
      else node.setAttribute(k, v);
    });
    children.forEach((c) => {
      if (c !== '' && c != null) node.append(c);
    });
    return node;
  }

  function findVideoSlot() {
    const all = Array.from(document.querySelectorAll('.video-div, .video-div-btn'));
    if (!all.length) return null;
    const empty = all.filter((node) => !node.querySelector('video'));
    const list = empty.length ? empty : all;
    const primary = list.filter((node) => node.classList.contains('video-div'));
    const pickFrom = primary.length ? primary : list;
    const vh = window.innerHeight || 0;
    let best = pickFrom[0];
    let bestDist = Infinity;
    pickFrom.forEach((node) => {
      const top = node.getBoundingClientRect().top;
      const dist = top > vh ? top - vh : top < 0 ? -top : 0;
      if (dist < bestDist) {
        bestDist = dist;
        best = node;
      }
    });
    return best;
  }

  function isPlayableUrl(url) {
    return /^https?:\/\/[^\s]+$/i.test(url);
  }

  function videoUsable(video) {
    if (!video) return false;
    if (!video.paused) return true;
    if (video.readyState >= 1) return true;
    const d = video.duration;
    return typeof d === 'number' && isFinite(d) && d > 0;
  }

  function discardPlayer(video) {
    if (video.__hjHls) {
      try {
        video.__hjHls.destroy();
      } catch (_) {  }
      video.__hjHls = null;
    }
    releaseBlobs(video);
    try {
      video.pause();
      video.removeAttribute('src');
      video.load();
    } catch (_) {  }
    const panel = video.closest ? video.closest('#hj-player') : null;
    if (panel) {
      panel.remove();
      return;
    }
    const parent = video.parentNode;
    if (parent) {
      parent.removeChild(video);
      if (parent.classList && parent.classList.contains('hj-slot')) {
        parent.classList.remove('hj-slot');
        parent.textContent = '';
      }
    }
  }

  function pageWindow() {
    try {
      if (typeof unsafeWindow !== 'undefined' && unsafeWindow) return unsafeWindow;
    } catch (_) {  }
    return window;
  }

  function waitMediaReady(video, ms) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        video.removeEventListener('loadedmetadata', onMeta);
        video.removeEventListener('error', onErr);
        clearTimeout(timer);
        resolve(ok);
      };
      const onMeta = () => finish(true);
      const onErr = () => finish(false);
      const timer = setTimeout(() => finish(video.readyState >= 1), ms);
      video.addEventListener('loadedmetadata', onMeta);
      video.addEventListener('error', onErr);
    });
  }

  function resetVideo(video) {
    try {
      video.pause();
      video.removeAttribute('src');
      video.load();
    } catch (_) {  }
  }

  function attachNative(video, url, ms) {
    video.src = url;
    return waitMediaReady(video, ms);
  }

  function gmRequest(options) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== 'function') {
        reject(new Error('当前浏览器不支持油猴请求，请换 Kiwi / Firefox + Tampermonkey'));
        return;
      }
      GM_xmlhttpRequest({
        method: 'GET',
        url: options.url,
        responseType: options.responseType || 'text',
        timeout: options.timeout || 15000,
        onload(res) {
          if (res.status >= 200 && res.status < 300) resolve(res);
          else reject(new Error('播放地址打不开，请稍后重试'));
        },
        onerror: () => reject(new Error('网络异常，请稍后重试')),
        ontimeout: () => reject(new Error('网络超时，请稍后重试')),
      });
    });
  }

  async function preparePlaylist(playUrl) {
    const res = await gmRequest({ url: playUrl, responseType: 'text' });
    let text = String(res.responseText || '');
    if (!/^#EXTM3U/.test(text.trim())) throw new Error('播放清单格式异常');

    const blobs = [];

    text = text.replace(/(#EXT-X-MAP:[^\n]*URI=")([^"]+)(")/g, (match, head, uri, tail) => {
      try {
        return head + new URL(uri, playUrl).href + tail;
      } catch (_) {
        return match;
      }
    });

    const keyLine = text.match(/#EXT-X-KEY:[^\n]*URI="([^"]+)"/);
    if (keyLine) {
      const keyUrl = new URL(keyLine[1], playUrl).href;
      const keyRes = await gmRequest({ url: keyUrl, responseType: 'arraybuffer' });
      const keyBlobUrl = URL.createObjectURL(
        new Blob([keyRes.response], { type: 'application/octet-stream' }),
      );
      blobs.push(keyBlobUrl);
      text = text.replace(/(#EXT-X-KEY:[^\n]*URI=")[^"]+(")/g, '$1' + keyBlobUrl + '$2');
    }

    text = text
      .split(/\r?\n/)
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        try {
          return new URL(trimmed, playUrl).href;
        } catch (_) {
          return line;
        }
      })
      .join('\n');

    const playlistUrl = URL.createObjectURL(
      new Blob([text], { type: 'application/vnd.apple.mpegurl' }),
    );
    blobs.push(playlistUrl);
    return { playlistUrl, blobs };
  }

  function releaseBlobs(video) {
    if (!video || !video.__hjBlobs) return;
    video.__hjBlobs.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {  }
    });
    video.__hjBlobs = null;
  }

  function attachHls(video, url, Hls, ms) {
    let hls = null;
    try {
      hls = new Hls({ enableWorker: true });
    } catch (_) {
      return Promise.resolve(false);
    }
    video.__hjHls = hls;
    let settled = false;
    return new Promise((resolve) => {
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        if (!ok) {
          try {
            hls.destroy();
          } catch (_) {  }
          video.__hjHls = null;
        }
        resolve(ok);
      };
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data || !data.fatal) return;
        finish(false);
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      waitMediaReady(video, ms).then(finish);
    });
  }

  async function attachMedia(video, url) {
    const isM3u8 = /\.m3u8(\?|$)/i.test(url);
    const HlsLib = pageWindow().Hls || REQUIRED_HLS;
    const hlsUsable = !!(isM3u8 && HlsLib && typeof HlsLib.isSupported === 'function' && HlsLib.isSupported());

    if (hlsUsable) {
      try {
        const prepared = await preparePlaylist(url);
        video.__hjBlobs = prepared.blobs;
        if (await attachHls(video, prepared.playlistUrl, HlsLib, 15000)) return true;
      } catch (_) {  }
      releaseBlobs(video);
      resetVideo(video);
    }
    return attachNative(video, url, 10000);
  }

  async function fillSlot(slot, url) {
    slot.textContent = '';
    slot.classList.add('hj-slot');
    if (slot.style && slot.style.marginBottom) slot.style.marginBottom = '0px';

    const video = createPlayer();
    slot.appendChild(video);

    const ok = await attachMedia(video, url);
    if (ok) {
      try {
        await video.play();
      } catch (_) {  }
    }
    try {
      slot.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (_) {  }
    return { video, ok };
  }

  function createPlayer() {
    const video = document.createElement('video');
    video.controls = true;
    video.setAttribute('preload', 'metadata');
    return video;
  }

  function showVerifyPanel(data) {
    const old = document.getElementById('hj-verify');
    if (old) old.remove();

    const botLink = el(
      'a',
      { class: 'hj-verify-link', href: data.bot_url || '#', target: '_blank', rel: 'noopener' },
      '打开 Bot 发送验证码',
    );

    const panel = el(
      'div',
      { id: 'hj-verify' },
      el('div', { class: 'hj-verify-title' }, '播放前需要验证'),
      el('div', { class: 'hj-verify-tip' }, '判断是否为机器人：先打开 Bot 发送验证码，再按提示加群。'),
      botLink,
      el('div', { class: 'hj-verify-tip' }, '验证码'),
      el('div', { class: 'hj-verify-code' }, data.code || ''),
      el('div', { class: 'hj-verify-tip' }, '在 Bot 里发送：/start ' + (data.code || '')),
    );
    document.body.appendChild(panel);
  }

  function closeVerifyPanel() {
    const panel = document.getElementById('hj-verify');
    if (panel) panel.remove();
  }

  async function pollVerify(code) {
    for (let i = 0; i < 150; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        const status = await callBackend(
          '/api/verify/status?code=' + encodeURIComponent(code),
          null,
          'GET',
        );
        if (status && status.verified && status.play_token) {
          closeVerifyPanel();
          return String(status.play_token);
        }
        if (status && status.ok === false) break;
      } catch (_) {  }
    }
    closeVerifyPanel();
    return '';
  }

  function openFallbackPlayer(url) {
    const old = document.getElementById('hj-player');
    if (old) old.remove();

    const video = createPlayer();

    const closeBtn = el('button', { type: 'button' }, '关闭');
    const panel = el(
      'div',
      { id: 'hj-player' },
      video,
      el('div', { id: 'hj-player-bar' }, el('span', {}, '播放'), closeBtn),
    );
    closeBtn.addEventListener('click', () => {
      if (video.__hjHls) {
        try {
          video.__hjHls.destroy();
        } catch (_) {  }
      }
      panel.remove();
    });
    document.body.appendChild(panel);

    return attachMedia(video, url).then((ok) => {
      if (ok) video.play().catch(() => {});
      return { video, ok };
    });
  }

  function buildCard() {
    const serialText = el('span', { class: 'hj-serial-text' }, '—');
    const copyIcon = el('span', { class: 'hj-copy-icon', 'aria-hidden': 'true' }, '⧉');
    const serialEl = el('div', { id: 'hj-serial', class: 'hj-placeholder' }, serialText, copyIcon);
    const statusEl = el('div', { id: 'hj-status' });

    const playBtn = el('button', { id: 'hj-play', type: 'button' }, '▶ 播放');
    const centerBtn = el('button', { id: 'hj-center-btn', type: 'button' }, '个人中心');

    const center = el(
      'div',
      { id: 'hj-center' },
      el('div', { id: 'hj-row' }, el('span', { id: 'hj-label' }, '设备编号'), serialEl),
    );

    const card = el(
      'div',
      { id: 'hj-card' },
      el(
        'div',
        { id: 'hj-main' },
        el('div', { id: 'hj-actions' }, playBtn, centerBtn),
        center,
      ),
      statusEl,
    );

    let currentSerial = '';
    let clearTimer = null;

    function setStatus(text, kind) {
      statusEl.textContent = text;
      statusEl.className = kind || '';
    }

    function flashStatus(text, kind) {
      setStatus(text, kind);
      if (clearTimer) clearTimeout(clearTimer);
      clearTimer = setTimeout(() => setStatus(''), 1600);
    }

    function showSerial(serial) {
      currentSerial = serial || '';
      if (currentSerial) {
        serialText.textContent = currentSerial;
        serialEl.className = '';
      } else {
        serialText.textContent = '未获取';
        serialEl.className = 'hj-placeholder';
      }
    }

    let busy = false;

    async function bindDevice() {
      if (busy) return;
      busy = true;
      try {
        const deviceKey = ensureDeviceKey();
        const data = await callBackend('/api/device', { device_key: deviceKey });
        showSerial(data.serial);
        store.set(KEY_SERIAL, data.serial);
        setStatus('');
      } catch (err) {
        const cached = store.get(KEY_SERIAL, '');
        showSerial(cached);
        setStatus(err.message, 'hj-error');
      } finally {
        busy = false;
      }
    }

    async function copySerial() {
      if (!currentSerial) return;
      try {
        if (typeof GM_setClipboard === 'function') {
          GM_setClipboard(currentSerial, 'text');
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(currentSerial);
        } else {
          throw new Error('no clipboard');
        }
        flashStatus('已复制编号', 'hj-ok');
      } catch (_) {
        flashStatus('复制失败，请长按选中', 'hj-error');
      }
    }

    serialEl.addEventListener('click', copySerial);

    playBtn.addEventListener('click', async () => {
      if (playBtn.dataset.hjBusy === '1') return;
      playBtn.dataset.hjBusy = '1';
      try {
        await togglePlay();
      } finally {
        playBtn.dataset.hjBusy = '';
      }
    });

    async function ensurePlayToken() {
      const saved = store.get(KEY_PLAY_TOKEN, '');
      if (saved) return { required: true, token: saved };

      let data = null;
      try {
        data = await callBackend('/api/verify/start', { device_key: ensureDeviceKey() });
      } catch (_) {
        return { required: false, token: '' };
      }
      if (!data || !data.code) return { required: false, token: '' };

      showVerifyPanel(data);
      playBtn.textContent = '验证中…';
      const token = await pollVerify(data.code);
      if (token) {
        store.set(KEY_PLAY_TOKEN, token);
        flashStatus('验证成功，继续播放…', 'hj-ok');
      }
      return { required: true, token };
    }

    async function togglePlay() {
      const existing =
        document.querySelector('.hj-slot > video') || document.querySelector('#hj-player video');
      if (existing && videoUsable(existing)) {
        try {
          if (existing.paused) {
            await existing.play();
            playBtn.textContent = '❚❚ 暂停';
          } else {
            existing.pause();
            playBtn.textContent = '▶ 播放';
          }
        } catch (_) {
          flashStatus('播放被浏览器拦截，请先点一下页面', 'hj-error');
        }
        return;
      }
      if (existing) discardPlayer(existing);

      const slot = findVideoSlot();

      const native = !slot && document.querySelector('video, audio');
      if (native) {
        try {
          if (native.paused) {
            await native.play();
            playBtn.textContent = '❚❚ 暂停';
          } else {
            native.pause();
            playBtn.textContent = '▶ 播放';
          }
        } catch (_) {
          flashStatus('播放被浏览器拦截，请先点一下页面', 'hj-error');
        }
        return;
      }

      const verified = await ensurePlayToken();
      if (verified.required && !verified.token) {
        playBtn.textContent = '▶ 播放';
        flashStatus('请先完成 Telegram 验证', 'hj-error');
        return;
      }

      const startedAt = Date.now();
      let estimate = Math.round(Number(store.get(KEY_EST_SECONDS, 15)) || 15);
      if (!isFinite(estimate) || estimate < 3) estimate = 15;
      let remaining = estimate;
      setStatus('正在解析，预计 ' + remaining + ' 秒…');
      playBtn.textContent = '解析中…';
      const ticker = setInterval(() => {
        remaining = Math.max(0, remaining - 1);
        setStatus(
          remaining > 0
            ? '正在解析，预计 ' + remaining + ' 秒…'
            : '正在解析，请稍候…',
        );
      }, 1000);

      try {
        const data = await callBackend('/api/play', {
          page_url: location.href,
          device_key: ensureDeviceKey(),
          play_token: verified.token,
        });
        store.set(
          KEY_EST_SECONDS,
          Math.max(3, Math.round((Date.now() - startedAt) / 1000)),
        );
        const url = String((data && (data.play_url || data.url)) || '').trim();
        if (!isPlayableUrl(url)) {
          flashStatus('后端没有返回可播放的地址', 'hj-error');
          playBtn.textContent = '▶ 播放';
          return;
        }

        const target = slot || findVideoSlot();
        let result = null;
        if (target) {
          result = await fillSlot(target, url);
        } else {
          result = await openFallbackPlayer(url);
        }

        if (result.ok) {
          playBtn.textContent = result.video && !result.video.paused ? '❚❚ 暂停' : '▶ 播放';
          flashStatus('已就绪，点画面播放', 'hj-ok');
        } else {
          playBtn.textContent = '▶ 播放';
          flashStatus('播放地址打不开，请稍后重试', 'hj-error');
        }
      } catch (err) {
        if (String(err.message || '').indexOf('验证') >= 0) store.set(KEY_PLAY_TOKEN, '');
        flashStatus(err.message, 'hj-error');
        playBtn.textContent = '▶ 播放';
      } finally {
        clearInterval(ticker);
      }
    }

    centerBtn.addEventListener('click', () => {
      const open = center.classList.toggle('hj-open');
      centerBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open && !currentSerial) bindDevice();
    });

    return { card, bindDevice, showSerial };
  }

  function mount() {
    if (document.getElementById('hj-card')) return;
    injectStyle();
    const { card, bindDevice, showSerial } = buildCard();

    document.body.appendChild(card);

    const root = document.documentElement;
    if (
      root.getAttribute('data-color-mode') === 'dark' ||
      root.getAttribute('data-dark-theme') !== null
    ) {
      card.classList.add('hj-dark');
    }

    const cached = store.get(KEY_SERIAL, '');
    if (cached) showSerial(cached);
    bindDevice();
  }

  mount();
})();