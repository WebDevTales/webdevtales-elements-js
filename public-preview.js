// Firebase config for webdevtales-ui-elements
const firebaseConfig = {
  apiKey: "AIzaSyC5RBtaV-K-SdF9lX7wndDTQQ8IFQ6mtNc",
  authDomain: "webdevtales-ui-elements.firebaseapp.com",
  projectId: "webdevtales-ui-elements",
  storageBucket: "webdevtales-ui-elements.firebasestorage.app",
  messagingSenderId: "57336409279",
  appId: "1:57336409279:web:0dee9c46b85fa9cfe8aa0a"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- DYNAMICALLY LOAD CODEMIRROR LIBRARIES ---
function loadCss(url) {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = resolve;
    document.head.appendChild(link);
  });
}
function loadJs(url) {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    document.body.appendChild(script);
  });
}

async function loadCodeMirrorDeps() {
  await loadCss('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css');
  await loadCss('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/material-darker.min.css');
  await loadJs('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js');
  await loadJs('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/xml/xml.min.js');
  await loadJs('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js');
  await loadJs('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/css/css.min.js');
  await loadJs('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/htmlmixed/htmlmixed.min.js');
}

// --- END DYNAMIC LOAD ---

function createPreviewIframe({ html, css, js, language }) {
  const iframe = document.createElement('iframe');
  iframe.className = 'preview-iframe';
  iframe.style.width = '100%';
  iframe.style.height = '340px';
  iframe.style.border = 'none';
  iframe.onload = function() {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    if (language === 'Tailwind') {
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body style="margin:0;">
            <div style="display:flex;justify-content:center;align-items:center;min-height:100vh;width:100vw;">
              ${html || ''}
            </div>
            <script>${js || ''}<\/script>
          </body>
        </html>
      `);
    } else {
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>${css || ''}</style>
          </head>
          <body style="margin:0;">
            <div style="display:flex;justify-content:center;align-items:center;min-height:100vh;width:100vw;">
              ${html || ''}
            </div>
            <script>${js || ''}<\/script>
          </body>
        </html>
      `);
    }
    doc.close();
  };
  setTimeout(() => { iframe.onload(); }, 0);
  return iframe;
}

async function loadPreviews() {
  document.getElementById('loader').style.display = 'flex';
  document.getElementById('previewGrid').style.display = 'none';
  const snapshot = await db.collection('components').orderBy('createdAt', 'desc').get();
  const all = snapshot.docs.map(doc => doc.data());
  window.allComponents = all; // Store for filtering
  renderPreviewGrid(all);
  document.getElementById('loader').style.display = 'none';
}

function filterAndRender() {
  const search = document.getElementById('searchInput').value.trim().toLowerCase();
  const lang = document.getElementById('languageFilter').value;
  const type = document.getElementById('typeFilter').value;
  let filtered = window.allComponents.filter(c => {
    let matches = true;
    if (search) {
      const text = (c.name + ' ' + (c.tags || []).join(' ')).toLowerCase();
      matches = matches && text.includes(search);
    }
    if (lang) matches = matches && c.language === lang;
    if (type) matches = matches && (c.type || '').toLowerCase().trim() === type.toLowerCase().trim();
    return matches;
  });
  renderPreviewGrid(filtered);
}

document.addEventListener('DOMContentLoaded', async function() {
  // Dynamically load CodeMirror dependencies before anything else
  await loadCodeMirrorDeps();
  if (document.getElementById('searchInput'))
    document.getElementById('searchInput').addEventListener('input', filterAndRender);
  if (document.getElementById('languageFilter'))
    document.getElementById('languageFilter').addEventListener('change', filterAndRender);
  if (document.getElementById('typeFilter'))
    document.getElementById('typeFilter').addEventListener('change', filterAndRender);
  loadPreviews();
});

function renderPreviewGrid(components) {
  const grid = document.getElementById('previewGrid');
  grid.innerHTML = '';
  if (!components.length) {
    grid.innerHTML = '<div style="color:#aaa;text-align:center;width:100%;">No components found.</div>';
  } else {
    components.forEach((c, idx) => {
      const card = document.createElement('div');
      card.className = 'preview-card';
      const title = document.createElement('div');
      title.className = 'preview-title';
      title.innerHTML = `<i class='fa fa-cube'></i> ${c.name}`;
      const iframe = createPreviewIframe(c);
      const btn = document.createElement('button');
      btn.className = 'edit-btn-tailwindcss getCodeBtn';
      btn.dataset.idx = idx;
      btn.innerHTML = `<i class='fa fa-code'></i> Get Code`;
      card.appendChild(title);
      card.appendChild(iframe);
      card.appendChild(btn);
      grid.appendChild(card);
    });
  }
  grid.style.display = 'flex';
  attachGetCodeHandlers(components);
}

let popupHtmlEditor, popupCssEditor, popupJsEditor, popupTailwindHtmlEditor;
let currentPopupLanguage = 'CSS';

function updatePopupPreview() {
  let html, css, js, previewContent;
  if (currentPopupLanguage === 'Tailwind') {
    html = popupTailwindHtmlEditor ? popupTailwindHtmlEditor.getValue() : '';
    js = popupJsEditor ? popupJsEditor.getValue() : '';
    previewContent = `<!DOCTYPE html><html><head><script src='https://cdn.tailwindcss.com'></script></head><body style='margin:0;'><div style=\"display:flex;justify-content:center;align-items:center;min-height:100vh;width:100vw;\">${html}</div><script>${js || ''}<\/script></body></html>`;
  } else {
    html = popupHtmlEditor ? popupHtmlEditor.getValue() : '';
    css = popupCssEditor ? popupCssEditor.getValue() : '';
    js = popupJsEditor ? popupJsEditor.getValue() : '';
    previewContent = `<!DOCTYPE html><html><head><style>${css}</style></head><body style='margin:0;'><div style=\"display:flex;justify-content:center;align-items:center;min-height:100vh;width:100vw;\">${html}</div><script>${js || ''}<\/script></body></html>`;
  }
  const previewContainer = document.querySelector('.popup-content .live-preview');
  const oldIframe = previewContainer.querySelector('#popupPreviewIframe');
  if (oldIframe) previewContainer.removeChild(oldIframe);
  const popupIframe = document.createElement('iframe');
  popupIframe.id = 'popupPreviewIframe';
  popupIframe.className = 'preview-iframe';
  popupIframe.srcdoc = previewContent;
  previewContainer.appendChild(popupIframe);
}

function ensureCodeMirrorReady(mode, callback) {
  function isReady() {
    if (typeof CodeMirror === 'undefined') return false;
    if (mode === 'htmlmixed' && !CodeMirror.modes['htmlmixed']) return false;
    if (mode === 'css' && !CodeMirror.modes['css']) return false;
    if (mode === 'javascript' && !CodeMirror.modes['javascript']) return false;
    return true;
  }
  function wait() {
    if (isReady()) {
      callback();
    } else {
      setTimeout(wait, 50);
    }
  }
  wait();
}

function wrapInThemeDiv(textarea) {
  if (!textarea.parentElement.classList.contains('code-mirror-custom-theme')) {
    var wrapper = document.createElement('div');
    wrapper.className = 'code-mirror-custom-theme';
    textarea.parentNode.insertBefore(wrapper, textarea);
    wrapper.appendChild(textarea);
  }
}

function attachGetCodeHandlers(all) {
  document.querySelectorAll('.getCodeBtn').forEach(btn => {
    btn.onclick = function() {
      const idx = parseInt(this.getAttribute('data-idx'));
      const c = all[idx];
      document.getElementById('popupOverlay').style.display = 'flex';
      const previewContainer = document.querySelector('.popup-content .live-preview');
      const oldIframe = previewContainer.querySelector('#popupPreviewIframe');
      if (oldIframe) previewContainer.removeChild(oldIframe);
      currentPopupLanguage = c.language;
      // Show/hide tabs and editors
      if (c.language === 'Tailwind') {
        document.querySelector('.tailwindTabBtn').style.display = '';
        document.querySelector('.tailwindTab').style.display = '';
        document.querySelector('.htmlTabBtn').style.display = 'none';
        document.querySelector('.htmlTab').style.display = 'none';
        document.querySelector('.cssTabBtn').style.display = 'none';
        document.querySelector('.cssTab').style.display = 'none';
        document.querySelector('.jsTabBtn').style.display = 'none';
        document.querySelector('.jsTab').style.display = 'none';
        // Activate Tailwind tab
        document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        document.querySelector('.tailwindTabBtn').classList.add('active');
        document.querySelector('.tailwindTab').classList.add('active');
        // Setup CodeMirror for Tailwind HTML
        var ta = document.getElementById('popupTailwindHtmlCode');
        wrapInThemeDiv(ta);
        ensureCodeMirrorReady('htmlmixed', function() {
          if (window.popupTailwindHtmlEditor) {
            window.popupTailwindHtmlEditor.toTextArea();
            window.popupTailwindHtmlEditor = null;
          }
          window.popupTailwindHtmlEditor = CodeMirror.fromTextArea(ta, {
            mode: 'htmlmixed', theme: '', lineNumbers: true
          });
          window.popupTailwindHtmlEditor.on('change', updatePopupPreview);
          window.popupTailwindHtmlEditor.setValue(c.html||'');
          console.log('CodeMirror Tailwind HTML editor initialized');
        });
      } else {
        document.querySelector('.tailwindTabBtn').style.display = 'none';
        document.querySelector('.tailwindTab').style.display = 'none';
        document.querySelector('.htmlTabBtn').style.display = '';
        document.querySelector('.htmlTab').style.display = '';
        document.querySelector('.cssTabBtn').style.display = '';
        document.querySelector('.cssTab').style.display = '';
        document.querySelector('.jsTabBtn').style.display = '';
        document.querySelector('.jsTab').style.display = '';
        // Activate HTML tab
        document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        document.querySelector('.htmlTabBtn').classList.add('active');
        document.querySelector('.htmlTab').classList.add('active');
        var taHtml = document.getElementById('popupHtmlCode');
        var taCss = document.getElementById('popupCssCode');
        var taJs = document.getElementById('popupJsCode');
        wrapInThemeDiv(taHtml);
        wrapInThemeDiv(taCss);
        wrapInThemeDiv(taJs);
        ensureCodeMirrorReady('htmlmixed', function() {
          if (window.popupHtmlEditor) {
            window.popupHtmlEditor.toTextArea();
            window.popupHtmlEditor = null;
          }
          window.popupHtmlEditor = CodeMirror.fromTextArea(taHtml, {
            mode: 'htmlmixed', theme: '', lineNumbers: true
          });
          window.popupHtmlEditor.on('change', updatePopupPreview);
          window.popupHtmlEditor.setValue(c.html||'');
          console.log('CodeMirror HTML editor initialized');
        });
        ensureCodeMirrorReady('css', function() {
          if (window.popupCssEditor) {
            window.popupCssEditor.toTextArea();
            window.popupCssEditor = null;
          }
          window.popupCssEditor = CodeMirror.fromTextArea(taCss, {
            mode: 'css', theme: '', lineNumbers: true
          });
          window.popupCssEditor.on('change', updatePopupPreview);
          window.popupCssEditor.setValue(c.css||'');
          console.log('CodeMirror CSS editor initialized');
        });
        ensureCodeMirrorReady('javascript', function() {
          if (window.popupJsEditor) {
            window.popupJsEditor.toTextArea();
            window.popupJsEditor = null;
          }
          window.popupJsEditor = CodeMirror.fromTextArea(taJs, {
            mode: 'javascript', theme: '', lineNumbers: true
          });
          window.popupJsEditor.on('change', updatePopupPreview);
          window.popupJsEditor.setValue(c.js||'');
          console.log('CodeMirror JS editor initialized');
        });
      }
      updatePopupPreview();
    };
  });
  // Tab switching logic: only allow switching to visible tabs
  document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.onclick = function() {
      if (tab.style.display === 'none') return;
      document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      tab.classList.add('active');
      document.querySelector('.' + tab.dataset.tab).classList.add('active');
      // Refresh CodeMirror editor for the active tab
      if (tab.dataset.tab === 'htmlTab' && popupHtmlEditor) popupHtmlEditor.refresh();
      if (tab.dataset.tab === 'cssTab' && popupCssEditor) popupCssEditor.refresh();
      if (tab.dataset.tab === 'jsTab' && popupJsEditor) popupJsEditor.refresh();
      if (tab.dataset.tab === 'tailwindTab' && popupTailwindHtmlEditor) popupTailwindHtmlEditor.refresh();
    };
  });
  document.getElementById('closePopupBtn').onclick = function() {
    document.getElementById('popupOverlay').style.display = 'none';
  };
  function showCopyNotification(msg) {
    const notif = document.getElementById('copyNotification');
    notif.textContent = msg;
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 1500);
  }
  document.getElementById('copyHtmlBtn').onclick = function() {
    if (popupHtmlEditor) {
      navigator.clipboard.writeText(popupHtmlEditor.getValue());
      showCopyNotification('HTML Copied!');
    }
  };
  document.getElementById('copyCssBtn').onclick = function() {
    if (popupCssEditor) {
      navigator.clipboard.writeText(popupCssEditor.getValue());
      showCopyNotification('CSS Copied!');
    }
  };
  document.getElementById('copyJsBtn').onclick = function() {
    if (popupJsEditor) {
      navigator.clipboard.writeText(popupJsEditor.getValue());
      showCopyNotification('JS Copied!');
    }
  };
  document.getElementById('copyTailwindHtmlBtn').onclick = function() {
    if (popupTailwindHtmlEditor) {
      navigator.clipboard.writeText(popupTailwindHtmlEditor.getValue());
      showCopyNotification('HTML + Tailwind Copied!');
    }
  };
} 
