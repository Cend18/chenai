// ponytail: render plain text only; add markdown formatting only when sanitized parser exists.
const MODES = {
  text: { endpoint: '/generate-text', badge: 'Teks', cta: 'Jelaskan topik ↗', hint: 'Tanyakan konsep, minta contoh, atau buat latihan.' },
  image: { endpoint: '/generate-from-image', field: 'image', accept: 'image/png,image/jpeg,image/webp', badge: 'Gambar', label: 'Unggah gambar materi', fileHint: 'PNG, JPG, atau WEBP maksimal 10 MB.', cta: 'Bahas gambar ↗', hint: 'Unggah foto catatan, diagram, atau soal.' },
  document: { endpoint: '/generate-from-document', field: 'document', accept: '.pdf,.txt,application/pdf,text/plain', badge: 'Dokumen', label: 'Unggah dokumen belajar', fileHint: 'PDF atau TXT (UTF-8) maksimal 10 MB.', cta: 'Ringkas dokumen ↗', hint: 'Unggah PDF atau catatan teks untuk diringkas.' },
  audio: { endpoint: '/generate-from-audio', field: 'audio', accept: '.mp3,.wav,audio/mpeg,audio/wav', badge: 'Audio', label: 'Unggah rekaman audio', fileHint: 'MP3 atau WAV maksimal 10 MB.', cta: 'Pahami audio ↗', hint: 'Unggah rekaman penjelasan atau diskusi singkat.' }
};

const el = id => document.getElementById(id);
const mode = el('mode'), style = el('style'), temp = el('temperature'), tempVal = el('temperature-value');
const promptInput = el('prompt'), fileGroup = el('file-group'), fileInput = el('file');
const fileLabel = el('file-label'), fileHint = el('file-hint'), modeHint = el('mode-hint'), modeBadge = el('mode-badge');
const statusBox = el('status'), retryBtn = el('retry'), submitBtn = el('submit'), resultBox = el('result'), form = el('study-form');
let configured = false, busy = false;

function setStatus(message, isError = false, canRetry = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle('error', isError);
  retryBtn.hidden = !canRetry;
}

function appendInline(parent, text) {
  const regex = /(\*\*[\s\S]+?\*\*|\*[^\s*][\s\S]*?[^\s*]\*|`[^`]+?`)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const span = document.createElement('span');
      span.textContent = text.slice(lastIndex, match.index);
      parent.appendChild(span);
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      const strong = document.createElement('strong');
      strong.textContent = token.slice(2, -2);
      parent.appendChild(strong);
    } else if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      const code = document.createElement('code');
      code.textContent = token.slice(1, -1);
      parent.appendChild(code);
    } else if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      const em = document.createElement('em');
      em.textContent = token.slice(1, -1);
      parent.appendChild(em);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    const span = document.createElement('span');
    span.textContent = text.slice(lastIndex);
    parent.appendChild(span);
  }
}

function renderMarkdown(container, rawText) {
  const lines = rawText.split('\n');
  let currentList = null;
  let listType = null;

  function closeList() {
    if (currentList) {
      container.appendChild(currentList);
      currentList = null;
      listType = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      closeList();
      const level = Math.min(6, trimmed.match(/^#+/)[0].length);
      const h = document.createElement('h' + level);
      appendInline(h, trimmed.replace(/^#{1,6}\s+/, ''));
      container.appendChild(h);
      continue;
    }

    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeList();
      const hr = document.createElement('hr');
      container.appendChild(hr);
      continue;
    }

    const bulletMatch = trimmed.match(/^[\*\-]\s+(.*)$/);
    if (bulletMatch) {
      if (listType !== 'ul') {
        closeList();
        currentList = document.createElement('ul');
        listType = 'ul';
      }
      const li = document.createElement('li');
      appendInline(li, bulletMatch[1]);
      currentList.appendChild(li);
      continue;
    }

    const numMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (numMatch) {
      if (listType !== 'ol') {
        closeList();
        currentList = document.createElement('ol');
        listType = 'ol';
      }
      const li = document.createElement('li');
      appendInline(li, numMatch[1]);
      currentList.appendChild(li);
      continue;
    }

    closeList();
    const p = document.createElement('p');
    appendInline(p, line);
    container.appendChild(p);
  }

  closeList();
}

let currentLoadingBubble = null;

function appendUserBubble(promptText, attachedFile) {
  if (!resultBox.tagName) return;
  const welcome = resultBox.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  const msg = document.createElement('div');
  msg.className = 'chat-message user-msg';

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar user-avatar';
  avatar.textContent = '👤';
  msg.appendChild(avatar);

  const content = document.createElement('div');
  content.className = 'msg-content';

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  const name = document.createElement('span');
  name.className = 'msg-author';
  name.textContent = 'Kamu';
  const time = document.createElement('span');
  time.className = 'msg-timestamp';
  const d = new Date();
  time.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  meta.appendChild(name);
  meta.appendChild(time);
  content.appendChild(meta);

  if (attachedFile) {
    const fileBadge = document.createElement('div');
    fileBadge.className = 'chat-file-badge';
    const icon = document.createElement('span');
    icon.textContent = '📎 ';
    const fileName = document.createElement('strong');
    fileName.textContent = attachedFile.name;
    const size = document.createElement('span');
    size.textContent = ` (${(attachedFile.size / 1024).toFixed(1)} KB)`;
    fileBadge.appendChild(icon);
    fileBadge.appendChild(fileName);
    fileBadge.appendChild(size);
    content.appendChild(fileBadge);
  }

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble user-bubble';
  bubble.textContent = promptText;
  content.appendChild(bubble);

  msg.appendChild(content);
  resultBox.appendChild(msg);
  resultBox.scrollTop = resultBox.scrollHeight;
}

function appendLoadingBubble() {
  if (!resultBox.tagName) return;
  const msg = document.createElement('div');
  msg.className = 'chat-message assistant-msg loading-msg';

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar assistant-avatar';
  avatar.textContent = '🤖';
  msg.appendChild(avatar);

  const content = document.createElement('div');
  content.className = 'msg-content';

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  const name = document.createElement('span');
  name.className = 'msg-author';
  name.textContent = 'Chenai';
  const badge = document.createElement('span');
  badge.className = 'ai-badge';
  badge.textContent = 'AI';
  meta.appendChild(name);
  meta.appendChild(badge);
  content.appendChild(meta);

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble assistant-bubble loading-bubble';

  const dots = document.createElement('div');
  dots.className = 'typing-indicator';
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span');
    dots.appendChild(dot);
  }
  const label = document.createElement('span');
  label.className = 'typing-text';
  label.textContent = 'Chenai sedang menyusun penjelasan…';
  bubble.appendChild(dots);
  bubble.appendChild(label);
  content.appendChild(bubble);

  msg.appendChild(content);
  resultBox.appendChild(msg);
  resultBox.scrollTop = resultBox.scrollHeight;
  currentLoadingBubble = msg;
}

function setResult(text, muted = false) {
  if (!resultBox.tagName) {
    resultBox.textContent = '';
    const container = document.createElement('div');
    container.className = muted ? 'empty' : 'markdown-content';
    container.textContent = text;
    resultBox.appendChild(container);
    return;
  }

  if (currentLoadingBubble) {
    currentLoadingBubble.remove();
    currentLoadingBubble = null;
  }

  if (muted) {
    const notice = document.createElement('div');
    notice.className = 'chat-notice';
    notice.textContent = text;
    resultBox.appendChild(notice);
    resultBox.scrollTop = resultBox.scrollHeight;
    return;
  }

  const welcome = resultBox.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  const msg = document.createElement('div');
  msg.className = 'chat-message assistant-msg';

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar assistant-avatar';
  avatar.textContent = '🤖';
  msg.appendChild(avatar);

  const content = document.createElement('div');
  content.className = 'msg-content';

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  const name = document.createElement('span');
  name.className = 'msg-author';
  name.textContent = 'Chenai';
  const badge = document.createElement('span');
  badge.className = 'ai-badge';
  badge.textContent = 'AI';
  const time = document.createElement('span');
  time.className = 'msg-timestamp';
  const d = new Date();
  time.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  meta.appendChild(name);
  meta.appendChild(badge);
  meta.appendChild(time);
  content.appendChild(meta);

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble assistant-bubble markdown-content';
  renderMarkdown(bubble, text);
  content.appendChild(bubble);

  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'btn-copy';
  copyBtn.textContent = '📋 Salin';
  copyBtn.addEventListener('click', () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = '✓ Tersalin!';
        setTimeout(() => { copyBtn.textContent = '📋 Salin'; }, 2000);
      });
    }
  });
  actions.appendChild(copyBtn);
  content.appendChild(actions);

  msg.appendChild(content);
  resultBox.appendChild(msg);
  resultBox.scrollTop = resultBox.scrollHeight;
}

function syncMode(resetFile = false) {
  const cfg = MODES[mode.value] || MODES.text;
  const needsFile = Boolean(cfg.field);
  modeBadge.textContent = cfg.badge;
  modeHint.textContent = cfg.hint;
  fileGroup.hidden = !needsFile;
  fileInput.required = needsFile;
  if (resetFile) fileInput.value = '';
  if (needsFile) {
    fileInput.accept = cfg.accept;
    fileLabel.textContent = cfg.label;
    fileHint.textContent = cfg.fileHint;
  }
  submitBtn.textContent = busy ? 'Memproses jawaban…' : cfg.cta;
  submitBtn.disabled = busy || !configured;
  mode.disabled = style.disabled = temp.disabled = promptInput.disabled = fileInput.disabled = busy;
}

async function checkHealth() {
  submitBtn.disabled = true;
  setStatus('Memeriksa konfigurasi server…');
  try {
    const res = await fetch('/health');
    const data = await res.json();
    configured = Boolean(res.ok && data.configured);
    if (configured) {
      setStatus(`Kunci API terdeteksi di server (${data.model || 'Gemini'}). Koneksi ke Google belum diuji sampai pertanyaan dikirim.`);
    } else {
      setStatus('GEMINI_API_KEY belum diatur di berkas .env pada server. Tambahkan kunci di server, restart server, lalu tekan Periksa lagi.', true, true);
    }
  } catch {
    configured = false;
    setStatus('Server tidak dapat dihubungi. Pastikan server berjalan lalu tekan Periksa lagi.', true, true);
  }
  syncMode();
}

mode.addEventListener('change', () => syncMode(true));
temp.addEventListener('input', () => { tempVal.textContent = temp.value; });
retryBtn.addEventListener('click', checkHealth);

const clearChatBtn = el('clear-chat');
if (clearChatBtn) {
  clearChatBtn.addEventListener('click', () => {
    resultBox.textContent = '';
    const welcome = document.createElement('div');
    welcome.className = 'chat-welcome';
    const av = document.createElement('div');
    av.className = 'welcome-avatar';
    av.textContent = '🤖';
    const title = document.createElement('h3');
    title.textContent = 'Halo! Aku Chenai';
    const desc = document.createElement('p');
    desc.textContent = 'Asisten belajar teknismu. Tanyakan konsep, unggah materi gambar/dokumen/audio, atau minta latihan soal untuk mulai belajar.';
    welcome.appendChild(av);
    welcome.appendChild(title);
    welcome.appendChild(desc);
    resultBox.appendChild(welcome);
    setStatus('Ruang obrolan telah dibersihkan.');
  });
}

promptInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (!submitBtn.disabled) {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }
  }
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !configured) return;
  const cfg = MODES[mode.value] || MODES.text;
  const prompt = promptInput.value.trim();
  const file = fileInput.files[0];
  if (!prompt) return setStatus('Tulis pertanyaan terlebih dahulu sebelum mengirim.', true);
  if (cfg.field && !file) return setStatus('Pilih berkas pendamping terlebih dahulu.', true);
  if (file && file.size > 10 * 1024 * 1024) return setStatus('Ukuran berkas melebihi batas 10 MB. Pilih berkas yang lebih kecil.', true);

  busy = true;
  syncMode();
  setStatus('Mengirim ke Google dan menyusun penjelasan…');
  appendUserBubble(prompt, file);
  appendLoadingBubble();

  try {
    let options;
    if (cfg.field) {
      const body = new FormData();
      body.append('prompt', prompt);
      body.append('style', style.value);
      body.append('temperature', temp.value);
      body.append(cfg.field, file);
      options = { method: 'POST', body };
    } else {
      options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style: style.value, temperature: Number(temp.value) })
      };
    }
    const res = await fetch(cfg.endpoint, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Permintaan gagal diproses.');
    setResult(data.result || 'Tidak ada teks jawaban yang dikembalikan.');
    setStatus('Jawaban selesai disusun untuk sesi ini.');
    if (promptInput.tagName) promptInput.value = '';
  } catch (err) {
    setResult('Belum ada jawaban karena permintaan gagal. Perbaiki pesan di atas lalu coba lagi.', true);
    setStatus(err.message || 'Gagal menghubungi server.', true, true);
  } finally {
    busy = false;
    syncMode();
  }
});

syncMode();
checkHealth();
