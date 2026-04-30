const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicatorRow = document.getElementById('typingIndicatorRow');
const initialQuickReplies = document.getElementById('initial-quick-replies');

let conversation = [];

// Helper untuk format jam
function getFormattedTime() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

// Helper untuk render pesan ke chat box dengan style UI baru
function appendMessage(role, text, isMarkdown = false) {
  const row = document.createElement('div');
  row.classList.add('message-row', role === 'user' ? 'user' : 'bot');

  const bubble = document.createElement('div');
  bubble.classList.add('message-bubble');

  if (isMarkdown) {
    bubble.innerHTML = marked.parse(text);
  } else {
    bubble.textContent = text;
  }
  
  const timeDiv = document.createElement('div');
  timeDiv.classList.add('message-time');
  timeDiv.textContent = getFormattedTime();
  bubble.appendChild(timeDiv);

  row.appendChild(bubble);
  
  // Insert sebelum animasi typing indicator
  chatMessages.insertBefore(row, typingIndicatorRow);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return bubble;
}

async function handleSend() {
  const userMessage = chatInput.value.trim();
  if (!userMessage) return;

  // Sembunyikan quick replies saat user mulai chat
  if (initialQuickReplies) initialQuickReplies.style.display = 'none';

  appendMessage('user', userMessage, false);
  conversation.push({ role: 'user', text: userMessage });
  
  // Bersihkan input dan reset ukurannya
  chatInput.value = '';
  chatInput.style.height = 'auto';

  // Munculkan animasi typing
  typingIndicatorRow.style.display = 'flex';
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Disable input & button selama proses loading
  chatInput.disabled = true;
  sendBtn.disabled = true;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get response from server.');
    }
    if (!data.result) {
      throw new Error('Sorry, no response received.');
    }

    typingIndicatorRow.style.display = 'none';
    appendMessage('bot', data.result, true);
    conversation.push({ role: 'model', text: data.result });

  } catch (error) {
    console.error('Chat error:', error);
    typingIndicatorRow.style.display = 'none';
    appendMessage('bot', error.message || 'Failed to get response from server.', false);
    conversation.pop();
  } finally {
    // Enable kembali input & button
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

// Event Listeners
sendBtn.addEventListener('click', handleSend);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

// Event auto-resize tinggi textarea
chatInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = (this.scrollHeight < 100 ? this.scrollHeight : 100) + 'px';
});

// Fungsi global untuk Quick Reply
window.sendQuickReply = function(text) {
  chatInput.value = text;
  handleSend();
};