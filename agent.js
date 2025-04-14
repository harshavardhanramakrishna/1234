
// Global Variables
let socket;
let agentToken;
let agentName;
let activeRoomId = null;
let activeUserId = null;
let activeUserName = null;

// DOM Elements
const agentLoginForm = document.getElementById('agent-login-form');
const agentLogin = document.getElementById('agent-login');
const agentDashboard = document.getElementById('agent-dashboard');
const agentLogout = document.getElementById('agent-logout');
const agentId = document.getElementById('agent-id');
const searchRequests = document.getElementById('search-requests');
const filterPriority = document.getElementById('filter-priority');
const pendingRequests = document.getElementById('pending-requests');
const activeChat = document.getElementById('active-chat');
const agentChatInput = document.getElementById('agent-chat-input');
const agentChatForm = document.getElementById('agent-chat-form');
const agentMessageInput = document.getElementById('agent-message-input');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Initialize the application
function initializeApp() {
    // Check if agent is already logged in
    checkAgentAuth();
    
    // Setup event listeners
    setupEventListeners();
}

// Check if agent is already logged in
function checkAgentAuth() {
    // Check for token in localStorage
    agentToken = localStorage.getItem('agentToken');
    agentName = localStorage.getItem('agentName');
    
    if (agentToken && agentName) {
        showAgentDashboard();
        initializeSocket();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Agent login form submission
    if (agentLoginForm) {
        agentLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleAgentLogin();
        });
    }
    
    // Agent logout
    if (agentLogout) {
        agentLogout.addEventListener('click', handleAgentLogout);
    }
    
    // Search requests
    if (searchRequests) {
        searchRequests.addEventListener('input', filterRequests);
    }
    
    // Filter priority select
    if (filterPriority) {
        filterPriority.addEventListener('change', filterRequests);
    }
    
    // Agent chat form submission
    if (agentChatForm) {
        agentChatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendAgentMessage();
        });
    }
    
    // Setup join chat buttons
    setupJoinChatButtons();
}

// Initialize WebSocket connection
function initializeSocket() {
    // Connect to the WebSocket server
    socket = io('http://localhost:5000');
    
    // Socket event listeners
    socket.on('connect', () => {
        console.log('Agent connected to server');
        
        // Authenticate as agent
        socket.emit('agent_auth', { token: agentToken, agentName: agentName });
    });
    
    socket.on('disconnect', () => {
        console.log('Agent disconnected from server');
    });
    
    socket.on('pending_requests', (data) => {
        populatePendingRequests(data.requests);
    });
    
    socket.on('message', (data) => {
        if (data.roomId === activeRoomId) {
            displayMessage(data.message, data.sender, data.timestamp);
        }
    });
    
    socket.on('chat_history', (data) => {
        if (data.roomId === activeRoomId) {
            displayChatHistory(data);
        }
    });
    
    socket.on('new_request', (data) => {
        // Add new request to the list
        addPendingRequest(data);
    });
    
    socket.on('request_canceled', (data) => {
        // Remove request from the list
        removePendingRequest(data.roomId);
        
        // If this is the active chat, clear it
        if (data.roomId === activeRoomId) {
            clearActiveChat();
        }
    });
    
    socket.on('typing', (data) => {
        if (data.roomId === activeRoomId && data.sender !== 'agent') {
            showTypingIndicator();
        } else {
            hideTypingIndicator();
        }
    });
}

// Handle agent login
function handleAgentLogin() {
    const username = document.getElementById('agent-username').value.trim();
    const password = document.getElementById('agent-password').value.trim();
    
    if (!username || !password) {
        alert('Please enter username and password');
        return;
    }
    
    // For demo purposes, we'll use a hardcoded agent credentials
    // In a real application, you would send this to the server for validation
    if ((username === 'agent1' && password === 'agent123') || (username === 'agent2' && password === 'agent123')) {
        // Create a mock token
        agentToken = 'agent_' + Date.now();
        agentName = username;
        
        // Save token and name to localStorage
        localStorage.setItem('agentToken', agentToken);
        localStorage.setItem('agentName', agentName);
        
        // Show agent dashboard
        showAgentDashboard();
        
        // Update agent ID
        agentId.textContent = `AG-${Math.floor(1000 + Math.random() * 9000)}`;
        
        // Initialize WebSocket connection
        initializeSocket();
    } else {
        alert('Invalid username or password');
    }
}

// Handle agent logout
function handleAgentLogout() {
    // If agent is in an active chat, leave it
    if (activeRoomId) {
        socket.emit('leave_room', { roomId: activeRoomId, agentName: agentName });
    }
    
    // Remove token and name from localStorage
    localStorage.removeItem('agentToken');
    localStorage.removeItem('agentName');
    
    // Disconnect socket
    if (socket) {
        socket.disconnect();
    }
    
    // Show login form
    agentDashboard.classList.add('hidden');
    agentLogin.classList.remove('hidden');
}

// Show agent dashboard
function showAgentDashboard() {
    agentLogin.classList.add('hidden');
    agentDashboard.classList.remove('hidden');
}

// Populate the pending requests
function populatePendingRequests(requests) {
    pendingRequests.innerHTML = '';
    
    if (requests.length === 0) {
        pendingRequests.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>No pending requests at this time.</p>
                <p class="text-sm mt-2">New requests will appear here.</p>
            </div>
        `;
        return;
    }
    
    requests.forEach((request) => {
        const requestDiv = createRequestElement(request);
        pendingRequests.appendChild(requestDiv);
    });
    
    // Re-setup join chat buttons
    setupJoinChatButtons();
}

// Create a request element
function createRequestElement(request) {
    const div = document.createElement('div');
    div.className = 'bg-white border border-gray-200 rounded-lg p-4 mb-4 pending-request';
    div.setAttribute('data-room-id', request.roomId);
    div.setAttribute('data-priority', request.priority || 'medium');
    
    const timeAgo = getTimeAgo(request.timestamp);
    
    div.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <h4 class="font-medium text-gray-800">${request.userName}</h4>
            <span class="badge badge-pending">Pending</span>
        </div>
        <p class="text-sm text-gray-600 mb-2">Email: ${request.userEmail || 'No email'}</p>
        <p class="text-sm text-gray-700 mb-3">Issue: ${request.issue || 'No description provided'}</p>
        <p class="text-xs text-gray-500 mb-3">Requested: ${timeAgo}</p>
        <button class="w-full bg-indigo-600 text-white py-1.5 px-3 rounded-md hover:bg-indigo-700 transition duration-200 join-chat" data-room-id="${request.roomId}" data-user-id="${request.userId}" data-user-name="${request.userName}">
            Join Chat
        </button>
    `;
    
    return div;
}

// Get time ago string
function getTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}

// Setup join chat buttons
function setupJoinChatButtons() {
    const joinButtons = document.querySelectorAll('.join-chat');
    joinButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const roomId = button.getAttribute('data-room-id');
            const userId = button.getAttribute('data-user-id');
            const userName = button.getAttribute('data-user-name');
            joinChat(roomId, userId, userName);
        });
    });
}

// Join a chat
function joinChat(roomId, userId, userName) {
    // If agent is already in a chat, ask for confirmation
    if (activeRoomId) {
        const confirmLeave = confirm('You are already in a chat. Are you sure you want to leave it and join a new one?');
        
        if (!confirmLeave) {
            return;
        }
        
        // Leave the current chat
        socket.emit('leave_room', { roomId: activeRoomId, agentName: agentName });
    }
    
    // Set the active room and user
    activeRoomId = roomId;
    activeUserId = userId;
    activeUserName = userName;
    
    // Join the room
    socket.emit('join_room_agent', { roomId: roomId, agentName: agentName });
    
    // Update the UI
    updateActiveChat(roomId, userName);
    
    // Remove the request from the pending list
    removePendingRequest(roomId);
    
    // Show the chat input
    agentChatInput.classList.remove('hidden');
    
    // Request chat history
    socket.emit('get_chat_history', { roomId: roomId });
}

// Update the active chat
function updateActiveChat(roomId, userName) {
    activeChat.innerHTML = `
        <div class="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
            <div>
                <h3 class="font-medium text-gray-800">${userName}</h3>
                <p class="text-xs text-gray-500">Room ID: ${roomId}</p>
            </div>
            <button id="end-chat" class="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm">
                End Chat
            </button>
        </div>
        <div id="agent-chat-messages" class="flex-1 overflow-y-auto space-y-3 mb-4">
            <div class="text-center py-2">
                <span class="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                    You joined the chat
                </span>
            </div>
        </div>
        <div id="agent-typing-indicator" class="text-xs text-gray-500 mb-2 hidden">
            <span>User is typing</span>
            <span class="inline-flex space-x-1 ml-1">
                <span class="h-1 w-1 bg-gray-500 rounded-full animate-bounce"></span>
                <span class="h-1 w-1 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
                <span class="h-1 w-1 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.4s"></span>
            </span>
        </div>
    `;
    
    // Setup end chat button
    const endChatButton = document.getElementById('end-chat');
    endChatButton.addEventListener('click', () => {
        endChat();
    });
}

// End the chat
function endChat() {
    const confirmEnd = confirm('Are you sure you want to end this chat?');
    
    if (!confirmEnd) {
        return;
    }
    
    // Leave the room
    socket.emit('end_chat', { roomId: activeRoomId, agentName: agentName });
    
    // Clear the active chat
    clearActiveChat();
}

// Clear the active chat
function clearActiveChat() {
    activeRoomId = null;
    activeUserId = null;
    activeUserName = null;
    
    activeChat.innerHTML = `
        <div class="text-center text-gray-500 my-4">
            <p>No active chat. Join a chat from the pending requests.</p>
        </div>
    `;
    
    // Hide the chat input
    agentChatInput.classList.add('hidden');
}

// Send an agent message
function sendAgentMessage() {
    const message = agentMessageInput.value.trim();
    
    if (!message || !activeRoomId) {
        return;
    }
    
    // Send the message to the server
    socket.emit('message', {
        roomId: activeRoomId,
        message: message,
        sender: 'human',
        agentName: agentName
    });
    
    // Display the message
    displayMessage(message, 'agent');
    
    // Clear the input field
    agentMessageInput.value = '';
}

// Display a message
function displayMessage(message, sender, timestamp = new Date().toISOString()) {
    const chatMessages = document.getElementById('agent-chat-messages');
    
    if (!chatMessages) {
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = sender === 'agent' ? 'flex justify-end' : 'flex justify-start';
    
    const bubble = document.createElement('div');
    bubble.className = sender === 'agent' 
        ? 'bg-indigo-600 text-white rounded-lg py-2 px-3 max-w-[80%]' 
        : 'bg-gray-200 text-gray-800 rounded-lg py-2 px-3 max-w-[80%]';
    
    // Add sender name for non-agent messages
    if (sender !== 'agent' && sender !== 'user') {
        const senderName = document.createElement('div');
        senderName.className = 'text-xs font-medium mb-1';
        senderName.textContent = sender === 'bot' ? 'Chatbot' : `${activeUserName}`;
        bubble.appendChild(senderName);
    }
    
    // Add message text
    const messageText = document.createElement('div');
    messageText.textContent = message;
    bubble.appendChild(messageText);
    
    // Add timestamp
    const time = document.createElement('div');
    time.className = 'text-xs opacity-70 mt-1 text-right';
    time.textContent = formatTimestamp(timestamp);
    bubble.appendChild(time);
    
    messageDiv.appendChild(bubble);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Display chat history
function displayChatHistory(data) {
    const chatMessages = document.getElementById('agent-chat-messages');
    
    if (!chatMessages) {
        return;
    }
    
    // Clear existing messages except the join message
    chatMessages.innerHTML = `
        <div class="text-center py-2">
            <span class="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                You joined the chat
            </span>
        </div>
    `;
    
    // Display each message
    data.messages.forEach((message) => {
        const sender = message.sender === 'human' && message.agentName === agentName ? 'agent' : message.sender;
        displayMessage(message.message, sender, message.timestamp);
    });
}

// Filter requests
function filterRequests() {
    const searchTerm = searchRequests.value.toLowerCase();
    const priorityFilter = filterPriority.value;
    
    const requests = document.querySelectorAll('.pending-request');
    
    requests.forEach((request) => {
        const roomId = request.getAttribute('data-room-id').toLowerCase();
        const userName = request.querySelector('h4').textContent.toLowerCase();
        const userEmail = request.querySelector('p:nth-of-type(1)').textContent.toLowerCase();
        const issue = request.querySelector('p:nth-of-type(2)').textContent.toLowerCase();
        const priority = request.getAttribute('data-priority').toLowerCase();
        
        const matchesSearch = roomId.includes(searchTerm) || 
                              userName.includes(searchTerm) || 
                              userEmail.includes(searchTerm) || 
                              issue.includes(searchTerm);
        
        const matchesPriority = priorityFilter === 'all' || priority === priorityFilter;
        
        if (matchesSearch && matchesPriority) {
            request.style.display = '';
        } else {
            request.style.display = 'none';
        }
    });
}

// Add a pending request
function addPendingRequest(request) {
    const requestDiv = createRequestElement(request);
    pendingRequests.prepend(requestDiv);
    
    // Re-setup join chat buttons
    setupJoinChatButtons();
}

// Remove a pending request
function removePendingRequest(roomId) {
    const request = document.querySelector(`.pending-request[data-room-id="${roomId}"]`);
    
    if (request) {
        request.remove();
    }
    
    // Check if there are no more pending requests
    if (pendingRequests.children.length === 0) {
        pendingRequests.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>No pending requests at this time.</p>
                <p class="text-sm mt-2">New requests will appear here.</p>
            </div>
        `;
    }
}

// Show typing indicator
function showTypingIndicator() {
    const typingIndicator = document.getElementById('agent-typing-indicator');
    
    if (typingIndicator) {
        typingIndicator.classList.remove('hidden');
    }
}

// Hide typing indicator
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('agent-typing-indicator');
    
    if (typingIndicator) {
        typingIndicator.classList.add('hidden');
    }
}
