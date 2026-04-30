const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// Keep track of the entire conversation history
let conversation = [];

// Helper function to render a message in the chat box
function appendMessage(role, text) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', role);
  msgDiv.textContent = text;
  
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to bottom
  
  return msgDiv;
}

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return; // Ignore empty submissions (prevents Gemini API 'oneof data' errors)

  // 1. Add user message to UI and conversation history
  appendMessage('user', userMessage);
  conversation.push({ role: 'user', text: userMessage });
  input.value = ''; // Clear input field

  // 2. Show temporary "Thinking..." message
  const thinkingNode = appendMessage('bot', 'Sedang memproses...');
  thinkingNode.classList.add('thinking');

  try {
    // 3. Send POST request to backend
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

    // 4. Update the "Thinking..." message with the actual AI response
    thinkingNode.classList.remove('thinking');
    thinkingNode.textContent = data.result;
    conversation.push({ role: 'model', text: data.result });

  } catch (error) {
    console.error('Chat error:', error);
    
    // 5. Handle errors visually
    thinkingNode.classList.remove('thinking');
    thinkingNode.textContent = error.message || 'Failed to get response from server.';
    
    // Remove the failed user prompt from state so they can try again smoothly
    conversation.pop();
  }
});