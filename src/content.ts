if (window.top === window) {
  const host = document.createElement('div');
  host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;right:20px;bottom:20px;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      .btn {
        width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #2563eb, #4f46e5);
        border: 0; cursor: pointer; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
        display: flex; align-items: center; justify-content: center;
        position: absolute; right: 0; bottom: 0; transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .btn:hover { transform: scale(1.06); box-shadow: 0 8px 24px rgba(37, 99, 235, 0.55); }
      .panel {
        display: none; position: absolute; right: 0; bottom: 68px;
        width: 400px; max-width: calc(100vw - 32px);
        height: 600px; max-height: calc(100vh - 96px);
        border-radius: 16px; overflow: hidden;
        border: 1px solid #1e293b;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
        background: #020617;
      }
      .panel.open { display: block; }
      iframe { width: 100%; height: 100%; border: 0; display: block; }
    </style>
    <div class="panel"></div>
    <button class="btn" title="Support AI Copilot">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round">
        <path d="M12 2v6M12 16v6M2 12h6M16 12h6M4.9 4.9l4.2 4.2M14.9 14.9l4.2 4.2M19.1 4.9l-4.2 4.2M9.1 14.9l-4.2 4.2"/>
        <circle cx="12" cy="12" r="1.6" fill="#fff"/>
      </svg>
    </button>`;

  const panel = root.querySelector('.panel') as HTMLDivElement;
  let iframe: HTMLIFrameElement | null = null;

  const open = () => {
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.src = chrome.runtime.getURL('sidepanel.html');
      panel.appendChild(iframe);
    }
    panel.classList.add('open');
  };

  const close = () => panel.classList.remove('open');
  const toggle = () => (panel.classList.contains('open') ? close() : open());

  root.querySelector('.btn')!.addEventListener('click', toggle);
  window.addEventListener('message', (e) => {
    if (e.data === 'support-ai-close') close();
  });
  chrome.runtime.onMessage.addListener((m) => {
    if (m?.type === 'open-panel') open();
  });
  document.documentElement.appendChild(host);
}
