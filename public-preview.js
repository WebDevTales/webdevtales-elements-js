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

document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('searchInput'))
    document.getElementById('searchInput').addEventListener('input', filterAndRender);
  if (document.getElementById('languageFilter'))
    document.getElementById('languageFilter').addEventListener('change', filterAndRender);
  if (document.getElementById('typeFilter'))
    document.getElementById('typeFilter').addEventListener('change', filterAndRender);
  loadPreviews();
  // Color picker logic for live preview
  const colorPicker = document.getElementById('previewBgColorPicker');
  if (colorPicker) {
    colorPicker.addEventListener('input', function() {
      currentPreviewBgColor = colorPicker.value;
      updatePopupPreview();
    });
  }
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

let currentPopupLanguage = 'CSS';

// Track the current preview background color
let currentPreviewBgColor = '#f7f8fa';

// Store preview backgrounds per component index
const previewBgMap = {};

function getInitialBodyBg(c) {
  if (c.language === 'Tailwind') {
    // 1. <body class="...">
    if (c.html) {
      const bodyClassMatch = c.html.match(/<body[^>]*class=["']([^"']+)["']/i);
      if (bodyClassMatch && bodyClassMatch[1]) {
        return { tailwindClass: bodyClassMatch[1].trim() };
      }
      // 2. <body style="background:...">
      const bodyStyleMatch = c.html.match(/<body[^>]*style=["'][^"']*background\s*:\s*([^;"']+)/i);
      if (bodyStyleMatch && bodyStyleMatch[1]) {
        return { bg: bodyStyleMatch[1].trim() };
      }
      // 3. <div ... style="background:...">
      const divStyleMatch = c.html.match(/<div[^>]*style=["'][^"']*background\s*:\s*([^;"']+)/i);
      if (divStyleMatch && divStyleMatch[1]) {
        return { bg: divStyleMatch[1].trim() };
      }
    }
    // Fallback
    return { bg: '#f7f8fa' };
  }
  // For CSS: check body { background: ... }
  if (c.css) {
    const cssBodyBgMatch = c.css.match(/body\s*{[^}]*background\s*:\s*([^;]+);/i);
    if (cssBodyBgMatch && cssBodyBgMatch[1]) {
      return { bg: cssBodyBgMatch[1].trim() };
    }
  }
  // Fallback
  return { bg: '#f7f8fa' };
}

function updatePopupPreview(c, idx) {
  console.log('[DEBUG] updatePopupPreview called', {c, idx});
  // If no arguments, get current code and background from popup
  if (typeof c === 'undefined') {
    // Try to detect if Tailwind tab is active
    const isTailwind = document.querySelector('.tailwindTabBtn')?.classList.contains('active');
    let html, css, js, previewContent, bg, language;
    if (isTailwind) {
      html = document.getElementById('popupTailwindHtmlCode')?.textContent || '';
      js = document.getElementById('popupJsCode')?.textContent || '';
      language = 'Tailwind';
      // Try to get background from picker or swatch
      bg = document.getElementById('previewBgColorPicker')?.value || '#f7f8fa';
      previewContent = `<!DOCTYPE html><html><head><script src='https://cdn.tailwindcss.com'></script></head><body style='background:${bg};'><div style=\"display:flex;justify-content:center;align-items:center;min-height:100vh;width:100vw;\">${html}</div><script>${js || ''}<\/script></body></html>`;
    } else {
      html = document.getElementById('popupHtmlCode')?.textContent || '';
      css = document.getElementById('popupCssCode')?.textContent || '';
      js = document.getElementById('popupJsCode')?.textContent || '';
      bg = document.getElementById('previewBgColorPicker')?.value || '#f7f8fa';
      previewContent = `<!DOCTYPE html><html><head><style>${css}</style></head><body style='margin:0;background:${bg};'><div style=\"display:flex;justify-content:center;align-items:center;min-height:100vh;width:100vw;\">${html}</div><script>${js || ''}<\/script></body></html>`;
    }
    const previewContainer = document.querySelector('.popup-content .live-preview');
    const oldIframe = previewContainer.querySelector('#popupPreviewIframe');
    if (oldIframe) previewContainer.removeChild(oldIframe);
    const popupIframe = document.createElement('iframe');
    popupIframe.id = 'popupPreviewIframe';
    popupIframe.className = 'preview-iframe';
    popupIframe.srcdoc = previewContent;
    previewContainer.appendChild(popupIframe);
    return;
  } else {
    let html, css, js, previewContent;
    if (c.language === 'Tailwind') {
      html = document.getElementById('popupTailwindHtmlCode')?.textContent || '';
      js = document.getElementById('popupJsCode')?.textContent || '';
      // Determine if user override is a style or a class
      const bgObj = previewBgMap[idx] || getInitialBodyBg(c);
      let bodyClass = '';
      let bodyStyle = '';
      if (typeof bgObj === 'object' && bgObj.tailwindClass && !bgObj.bg) {
        bodyClass = bgObj.tailwindClass;
      } else if (typeof bgObj === 'object' && bgObj.bg) {
        bodyStyle = `background:${bgObj.bg};`;
      } else if (typeof bgObj === 'string') {
        // User override: if it's a color/gradient, use style
        bodyStyle = `background:${bgObj};`;
      }
      previewContent = `<!DOCTYPE html><html><head><script src='https://cdn.tailwindcss.com'></script></head><body${bodyClass ? ` class='${bodyClass}'` : ''}${bodyStyle ? ` style='${bodyStyle}'` : ''}><div style=\"display:flex;justify-content:center;align-items:center;min-height:100vh;width:100vw;\">${html}</div><script>${js || ''}<\/script></body></html>`;
    } else {
      html = document.getElementById('popupHtmlCode')?.textContent || '';
      css = document.getElementById('popupCssCode')?.textContent || '';
      js = document.getElementById('popupJsCode')?.textContent || '';
      const bg = (previewBgMap[idx] && typeof previewBgMap[idx] === 'string') ? previewBgMap[idx] : (getInitialBodyBg(c).bg || '#f7f8fa');
      previewContent = `<!DOCTYPE html><html><head><style>${css}</style></head><body style='margin:0;background:${bg};'><div style=\"display:flex;justify-content:center;align-items:center;min-height:100vh;width:100vw;\">${html}</div><script>${js || ''}<\/script></body></html>`;
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
}

function attachGetCodeHandlers(all) {
  document.querySelectorAll('.getCodeBtn').forEach(btn => {
    btn.onclick = function() {
      const idx = parseInt(this.getAttribute('data-idx'));
      const c = all[idx];
      // If no user override, detect initial bg from HTML/CSS
      if (!previewBgMap[idx]) {
        previewBgMap[idx] = getInitialBodyBg(c);
      }
      document.getElementById('popupOverlay').style.display = 'flex';
      const previewContainer = document.querySelector('.popup-content .live-preview');
      const oldIframe = previewContainer.querySelector('#popupPreviewIframe');
      if (oldIframe) previewContainer.removeChild(oldIframe);
      currentPopupLanguage = c.language;
      // Show/hide tabs
      if (c.language === 'Tailwind') {
        document.querySelector('.tailwindTabBtn').style.display = '';
        document.querySelector('.tailwindTab').style.display = '';
        document.querySelector('.htmlTabBtn').style.display = 'none';
        document.querySelector('.htmlTab').style.display = 'none';
        document.querySelector('.cssTabBtn').style.display = 'none';
        document.querySelector('.cssTab').style.display = 'none';
        document.querySelector('.jsTabBtn').style.display = 'none';
        document.querySelector('.jsTab').style.display = 'none';
        document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        document.querySelector('.tailwindTabBtn').classList.add('active');
        document.querySelector('.tailwindTab').classList.add('active');
        // Set code
        const tailwindCode = document.getElementById('popupTailwindHtmlCode');
        tailwindCode.textContent = c.html || '// No HTML code found';
        Prism.highlightElement(tailwindCode);
        // Show tags
        const tagsDiv = document.getElementById('popupTailwindTags');
        if (tagsDiv) {
          if (Array.isArray(c.tags) && c.tags.length) {
            tagsDiv.innerHTML = c.tags.map(tag => `<span>${tag}</span>`).join(' ');
          } else {
            tagsDiv.innerHTML = '';
          }
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
        document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        document.querySelector('.htmlTabBtn').classList.add('active');
        document.querySelector('.htmlTab').classList.add('active');
        // Set code
        const htmlCode = document.getElementById('popupHtmlCode');
        const cssCode = document.getElementById('popupCssCode');
        const jsCode = document.getElementById('popupJsCode');
        htmlCode.textContent = c.html || '// No HTML code found';
        cssCode.textContent = c.css || '/* No CSS code found */';
        jsCode.textContent = c.js || '// No JS code found';
        Prism.highlightElement(htmlCode);
        Prism.highlightElement(cssCode);
        Prism.highlightElement(jsCode);
        // Show tags
        const htmlTagsDiv = document.getElementById('popupHtmlTags');
        const cssTagsDiv = document.getElementById('popupCssTags');
        const jsTagsDiv = document.getElementById('popupJsTags');
        if (htmlTagsDiv) {
          if (Array.isArray(c.tags) && c.tags.length) {
            htmlTagsDiv.innerHTML = c.tags.map(tag => `<span>${tag}</span>`).join(' ');
          } else {
            htmlTagsDiv.innerHTML = '';
          }
        }
        if (cssTagsDiv) {
          if (Array.isArray(c.tags) && c.tags.length) {
            cssTagsDiv.innerHTML = c.tags.map(tag => `<span>${tag}</span>`).join(' ');
          } else {
            cssTagsDiv.innerHTML = '';
          }
        }
        if (jsTagsDiv) {
          if (Array.isArray(c.tags) && c.tags.length) {
            jsTagsDiv.innerHTML = c.tags.map(tag => `<span>${tag}</span>`).join(' ');
          } else {
            jsTagsDiv.innerHTML = '';
          }
        }
      }
      // Set background picker to current value for this component
      const colorPicker = document.getElementById('previewBgColorPicker');
      if (colorPicker) {
        // Only set color picker if the value is a color (not a gradient)
        const bg = previewBgMap[idx];
        colorPicker.value = /^#([0-9a-f]{3}){1,2}$/i.test(bg) ? bg : '#f7f8fa';
      }
      // Hide tooltip on open
      const tooltip = document.getElementById('previewBgTooltip');
      if (tooltip) tooltip.classList.remove('show');
      updatePopupPreview(c, idx);
      // Settings icon logic
      const settingsBtn = document.getElementById('previewBgSettingsBtn');
      if (settingsBtn && tooltip) {
        settingsBtn.onclick = function(e) {
          e.stopPropagation();
          tooltip.classList.toggle('show');
        };
        // Hide tooltip if click outside
        document.addEventListener('click', function hideTooltip(ev) {
          if (!tooltip.contains(ev.target) && ev.target !== settingsBtn) {
            tooltip.classList.remove('show');
            document.removeEventListener('click', hideTooltip);
          }
        });
      }
      // Preset swatch logic
      document.querySelectorAll('.bg-swatch').forEach(swatch => {
        swatch.onclick = function() {
          const bg = swatch.getAttribute('data-bg');
          previewBgMap[idx] = bg;
          updatePopupPreview(c, idx);
          tooltip.classList.remove('show');
        };
      });
      // Color picker logic
      if (colorPicker) {
        colorPicker.oninput = function() {
          previewBgMap[idx] = colorPicker.value;
          updatePopupPreview(c, idx);
        };
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
    const code = document.getElementById('popupHtmlCode').textContent;
    navigator.clipboard.writeText(code);
      showCopyNotification('HTML Copied!');
  };
  document.getElementById('copyCssBtn').onclick = function() {
    const code = document.getElementById('popupCssCode').textContent;
    navigator.clipboard.writeText(code);
      showCopyNotification('CSS Copied!');
  };
  document.getElementById('copyJsBtn').onclick = function() {
    const code = document.getElementById('popupJsCode').textContent;
    navigator.clipboard.writeText(code);
      showCopyNotification('JS Copied!');
  };
  document.getElementById('copyTailwindHtmlBtn').onclick = function() {
    const code = document.getElementById('popupTailwindHtmlCode').textContent;
    navigator.clipboard.writeText(code);
      showCopyNotification('HTML + Tailwind Copied!');
  };
  // --- Caret preservation utilities ---
  function saveCaretPosition(editableDiv) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(editableDiv);
    preSelectionRange.setEnd(range.endContainer, range.endOffset);
    return preSelectionRange.toString().length;
  }

  function restoreCaretPosition(editableDiv, savedPos) {
    if (savedPos == null) return;
    let charIndex = 0, range = document.createRange();
    range.setStart(editableDiv, 0);
    range.collapse(true);
    const nodeStack = [editableDiv], nodes = [];
    let node;
    while ((node = nodeStack.pop())) {
      if (node.nodeType === 3) {
        nodes.push(node);
      } else {
        let i = node.childNodes.length;
        while (i--) nodeStack.push(node.childNodes[i]);
      }
    }
    for (let i = 0; i < nodes.length; i++) {
      const textNode = nodes[i];
      const nextCharIndex = charIndex + textNode.length;
      if (savedPos <= nextCharIndex) {
        range.setStart(textNode, savedPos - charIndex);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      charIndex = nextCharIndex;
    }
  }
  // --- End caret preservation utilities ---
  ['popupHtmlCode', 'popupCssCode', 'popupJsCode', 'popupTailwindHtmlCode'].forEach(id => {
    const codeEl = document.getElementById(id);
    if (codeEl) {
      codeEl.addEventListener('input', function() {
        console.log(`[DEBUG] input event fired on #${id}`);
        // Save caret position
        const caret = saveCaretPosition(codeEl);
        Prism.highlightElement(codeEl);
        // Restore caret position
        restoreCaretPosition(codeEl, caret);
        console.log('[DEBUG] Calling updatePopupPreview() after input event');
        updatePopupPreview();
      });
    }
  });
} 
