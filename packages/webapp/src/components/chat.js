import { LitElement, html } from 'lit';
import { loadMessages, saveMessages, clearMessages } from '../utils/chatStore.js';
import './chat.css'; // Import the CSS file

export class ChatInterface extends LitElement {
  static get properties() {
    return {
      messages: { type: Array },
      inputMessage: { type: String },
      isLoading: { type: Boolean }
    };
  }

  constructor() {
    super();
    this.messages = [];
    this.inputMessage = '';
    this.isLoading = false;
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.messages = loadMessages();
  }

  updated(changedProps) {
    if (changedProps.has('messages')) {
      saveMessages(this.messages);
    }
  }

  render() {
    return html`
      <div class="chat-container">
        <div class="chat-header">
          <button class="clear-cache-btn" @click=${this._clearCache}> 🧹Clear Chat</button>
        </div>
        <div class="chat-messages">
          ${this.messages.map(message => html`
            <div class="message ${message.role === 'user' ? 'user-message' : 'ai-message'}">
              <div class="message-content">
                <span class="message-sender">${message.role === 'user' ? 'You' : 'AI'}</span>
                <p>${message.content}</p>
              </div>
            </div>
          `)}
          ${this.isLoading ? html`
            <div class="message ai-message">
              <div class="message-content">
                <span class="message-sender">AI</span>
                <p>Thinking...</p>
              </div>
            </div>
          ` : ''}
        </div>
        <div class="chat-input">
          <input 
            type="text" 
            placeholder="Type your message here..." 
            .value=${this.inputMessage}
            @input=${this._handleInput}
            @keyup=${this._handleKeyUp}
          />
          <button @click=${this._sendMessage} ?disabled=${this.isLoading || !this.inputMessage.trim()}>
            Send
          </button>
        </div>
      </div>
    `;
  }

  _clearCache() {
    clearMessages();
    this.messages = [];
  }

  _handleInput(e) {
    this.inputMessage = e.target.value;
  }

  _handleKeyUp(e) {
    if (e.key === 'Enter' && this.inputMessage.trim() && !this.isLoading) {
      this._sendMessage();
    }
  }

  async _sendMessage() {
    if (!this.inputMessage.trim() || this.isLoading) return;

    const userMessage = {
      role: 'user',
      content: this.inputMessage
    };

    this.messages = [...this.messages, userMessage];
    const userQuery = this.inputMessage;
    this.inputMessage = '';
    this.isLoading = true;

    try {
      const aiResponse = await this._apiCall(userQuery);

      this.messages = [
        ...this.messages,
        { role: 'assistant', content: aiResponse }
      ];
    } catch (error) {
      console.error('Error calling model:', error);
      this.messages = [
        ...this.messages,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ];
    } finally {
      this.isLoading = false;
    }
  }

  // Real API call to backend server
  async _apiCall(message) {
    const res = await fetch("http://localhost:3001/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    return data.reply;
  }
}

customElements.define('chat-interface', ChatInterface);
