// Firebase config for webdevtales-ui-elements
const firebaseConfig = {
  apiKey: "AIzaSyC5RBtaV-K-SdF9lX7wndDTQQ8IFQ6mtNc",
  authDomain: "webdevtales-ui-elements.firebaseapp.com",
  projectId: "webdevtales-ui-elements",
  storageBucket: "webdevtales-ui-elements.firebasestorage.app",
  messagingSenderId: "57336409279",
  appId: "1:57336409279:web:0dee9c46b85fa9cfe8aa0a"
};

// Initialize Firebase only if not already initialized
if (!window.firebase || !window.firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

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
  try {
    const snapshot = await db.collection('components').orderBy('createdAt', 'desc').get();
    const all = snapshot.docs.map(doc => doc.data());
    window.allComponents = all; // Store for filtering
    renderPreviewGrid(all);
  } catch (error) {
    console.error('Error loading previews:', error);
    document.getElementById('previewGrid').innerHTML = '<div style="color:#f43676;text-align:center;width:100%;">Error loading components. Please try again.</div>';
  }
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

// Wait for CodeMirror to be ready before initializing
function waitForCodeMirror(callback) {
  if (typeof CodeMirror !== 'undefined' && 
      CodeMirror.modes && 
      CodeMirror.modes.htmlmixed && 
      CodeMirror.modes.css && 
      CodeMirror.modes.javascript) {
    callback();
  } else {
    setTimeout(() => waitForCodeMirror(callback), 100);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Wait for CodeMirror to be ready before setting up event listeners
  waitForCodeMirror(function() {
    console.log('CodeMirror is ready');
    
    if (document.getElementById('searchInput'))
      document.getElementById('searchInput').addEventListener('input', filterAndRender);
    if (document.getElementById('languageFilter'))
      document.getElementById('languageFilter').addEventListener('change', filterAndRender);
    if (document.getElementById('typeFilter'))
      document.getElementById('typeFilter').addEventListener('change', filterAndRender);
    
    loadPreviews();
  });
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

async function updatePopupPreview() {
  try {
    let html, css, js, previewContent;
    
    if (currentPopupLanguage === 'Tailwind') {
      html = window.popupTailwindHtmlEditor ? window.popupTailwindHtmlEditor.getValue() : '';
      js = window.popupJsEditor ? window.popupJsEditor.getValue() : '';
      previewContent = `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; }
    .preview-container { min-height: 200px; display: flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  <div class="preview-container">
    ${html || '<p style="color: #666;">No HTML content</p>'}
  </div>
  <script>
    try {
      ${js || ''}
    } catch(e) {
      console.error('JS Error:', e);
    }
  </script>
</body>
</html>`;
    } else {
      html = window.popupHtmlEditor ? window.popupHtmlEditor.getValue() : '';
      css = window.popupCssEditor ? window.popupCssEditor.getValue() : '';
      js = window.popupJsEditor ? window.popupJsEditor.getValue() : '';
      previewContent = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; }
    .preview-container { min-height: 200px; display: flex; align-items: center; justify-content: center; }
    ${css || ''}
  </style>
</head>
<body>
  <div class="preview-container">
    ${html || '<p style="color: #666;">No HTML content</p>'}
  </div>
  <script>
    try {
      ${js || ''}
    } catch(e) {
      console.error('JS Error:', e);
    }
  </script>
</body>
</html>`;
    }
    
    const previewContainer = document.querySelector('.popup-content .live-preview');
    if (!previewContainer) {
      console.error('Preview container not found');
      return;
    }
    
    const oldIframe = previewContainer.querySelector('#popupPreviewIframe');
    if (oldIframe) {
      previewContainer.removeChild(oldIframe);
    }
    
    const popupIframe = document.createElement('iframe');
    popupIframe.id = 'popupPreviewIframe';
    popupIframe.style.width = '100%';
    popupIframe.style.height = '340px';
    popupIframe.style.border = '2.5px solid #002050';
    popupIframe.style.borderRadius = '0';
    popupIframe.style.background = '#fff';
    
    // Use srcdoc for better compatibility
    popupIframe.srcdoc = previewContent;
    
    previewContainer.appendChild(popupIframe);
    
    // Fallback: if srcdoc doesn't work, use document.write
    popupIframe.onload = function() {
      if (!popupIframe.contentDocument || !popupIframe.contentDocument.body || !popupIframe.contentDocument.body.innerHTML.trim()) {
        const doc = popupIframe.contentDocument || popupIframe.contentWindow.document;
        doc.open();
        doc.write(previewContent);
        doc.close();
      }
    };
    
    console.log('Preview updated successfully');
  } catch (error) {
    console.error('Error updating preview:', error);
  }
}

function wrapInThemeDiv(textarea) {
  if (!textarea.parentElement.classList.contains('code-mirror-custom-theme')) {
    var wrapper = document.createElement('div');
    wrapper.className = 'code-mirror-custom-theme';
    textarea.parentNode.insertBefore(wrapper, textarea);
    wrapper.appendChild(textarea);
  }
}

async function initializeCodeMirrorEditor(textarea, mode, callback) {
  return new Promise((resolve, reject) => {
    if (typeof CodeMirror === 'undefined') {
      console.error('CodeMirror not available');
      resolve(null);
      return;
    }
    
    try {
      wrapInThemeDiv(textarea);
      const editor = CodeMirror.fromTextArea(textarea, {
        mode: mode,
        theme: '', // Use custom theme
        lineNumbers: true,
        lineWrapping: true,
        indentUnit: 2,
        tabSize: 2,
        autoCloseTags: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        styleActiveLine: true,
        viewportMargin: Infinity
      });
      
      if (callback) {
        editor.on('change', callback);
      }
      
      // Allow editor to render properly
      setTimeout(() => {
        editor.refresh();
        console.log(`CodeMirror ${mode} editor initialized successfully`);
        resolve(editor);
      }, 100);
      
    } catch (error) {
      console.error(`Error initializing CodeMirror ${mode} editor:`, error);
      resolve(null);
    }
  });
}

function attachGetCodeHandlers(all) {
  document.querySelectorAll('.getCodeBtn').forEach(btn => {
    btn.onclick = async function() {
      try {
        const idx = parseInt(this.getAttribute('data-idx'));
        const c = all[idx];
        
        console.log('Opening popup for component:', c.name);
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
          if (window.popupTailwindHtmlEditor) {
            window.popupTailwindHtmlEditor.toTextArea();
            window.popupTailwindHtmlEditor = null;
          }
          
          window.popupTailwindHtmlEditor = await initializeCodeMirrorEditor(ta, 'htmlmixed', updatePopupPreview);
          if (window.popupTailwindHtmlEditor) {
            window.popupTailwindHtmlEditor.setValue(c.html || '');
          }
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
          
          // Clean up existing editors
          if (window.popupHtmlEditor) {
            window.popupHtmlEditor.toTextArea();
            window.popupHtmlEditor = null;
          }
          if (window.popupCssEditor) {
            window.popupCssEditor.toTextArea();
            window.popupCssEditor = null;
          }
          if (window.popupJsEditor) {
            window.popupJsEditor.toTextArea();
            window.popupJsEditor = null;
          }
          
          // Initialize editors with async/await
          window.popupHtmlEditor = await initializeCodeMirrorEditor(taHtml, 'htmlmixed', updatePopupPreview);
          window.popupCssEditor = await initializeCodeMirrorEditor(taCss, 'css', updatePopupPreview);
          window.popupJsEditor = await initializeCodeMirrorEditor(taJs, 'javascript', updatePopupPreview);
          
          // Set values after all editors are initialized
          if (window.popupHtmlEditor) window.popupHtmlEditor.setValue(c.html || '');
          if (window.popupCssEditor) window.popupCssEditor.setValue(c.css || '');
          if (window.popupJsEditor) window.popupJsEditor.setValue(c.js || '');
        }
        
        // Update preview after ensuring all editors are ready
        setTimeout(() => updatePopupPreview(), 500);
        
      } catch (error) {
        console.error('Error in popup handler:', error);
      }
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
      setTimeout(() => {
        if (tab.dataset.tab === 'htmlTab' && window.popupHtmlEditor) window.popupHtmlEditor.refresh();
        if (tab.dataset.tab === 'cssTab' && window.popupCssEditor) window.popupCssEditor.refresh();
        if (tab.dataset.tab === 'jsTab' && window.popupJsEditor) window.popupJsEditor.refresh();
        if (tab.dataset.tab === 'tailwindTab' && window.popupTailwindHtmlEditor) window.popupTailwindHtmlEditor.refresh();
        
        // Update preview when switching tabs
        updatePopupPreview();
      }, 100);
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
    if (window.popupHtmlEditor) {
      navigator.clipboard.writeText(window.popupHtmlEditor.getValue());
      showCopyNotification('HTML Copied!');
    }
  };
  document.getElementById('copyCssBtn').onclick = function() {
    if (window.popupCssEditor) {
      navigator.clipboard.writeText(window.popupCssEditor.getValue());
      showCopyNotification('CSS Copied!');
    }
  };
  document.getElementById('copyJsBtn').onclick = function() {
    if (window.popupJsEditor) {
      navigator.clipboard.writeText(window.popupJsEditor.getValue());
      showCopyNotification('JS Copied!');
    }
  };
  document.getElementById('copyTailwindHtmlBtn').onclick = function() {
    if (window.popupTailwindHtmlEditor) {
      navigator.clipboard.writeText(window.popupTailwindHtmlEditor.getValue());
      showCopyNotification('HTML + Tailwind Copied!');
    }
  };
}
