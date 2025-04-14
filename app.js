
// Global Variables
let socket;
let userName = '';
let userEmail = '';
let chatActive = false;
let chatRoomId = null;
let currentRole = 'user'; // 'user', 'admin', or 'agent'
let isTyping = false;
let typingTimeout;
let humanRequested = false;

// DOM Elements
const userInfoForm = document.getElementById('user-info-form');
const welcomeContainer = document.getElementById('welcome-container');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const chatInputContainer = document.getElementById('chat-input-container');
const typingIndicator = document.getElementById('typing-indicator');
const statusText = document.getElementById('status-text');
const statusDot = document.getElementById('status-dot');
const requestHumanBtn = document.getElementById('request-human-btn');
const requestHumanContainer = document.getElementById('request-human-container');
const humanRequestFormContainer = document.getElementById('human-request-form-container');
const humanRequestForm = document.getElementById('human-request-form');
const cancelRequestBtn = document.getElementById('cancel-request');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Initialize the application
function initializeApp() {
    // Setup event listeners
    setupEventListeners();
    
    // Initialize WebSocket connection
    initializeSocket();
}

// Initialize WebSocket connection
function initializeSocket() {
    // Connect to the WebSocket server
    socket = io('http://localhost:5000');
    
    // Socket event listeners
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateStatus('Disconnected', 'red');
    });
    
    socket.on('message', (data) => {
        displayMessage(data.message, data.sender, data.timestamp);
        hideTypingIndicator();
    });
    
    socket.on('typing', (data) => {
        if (data.isTyping) {
            showTypingIndicator();
        } else {
            hideTypingIndicator();
        }
    });
    
    socket.on('human_requested', (data) => {
        updateStatus('Human Agent Requested', 'orange');
        displaySystemMessage('Your request for a human agent has been submitted. An agent will join the chat shortly.');
    });
    
    socket.on('human_joined', (data) => {
        updateStatus('Human Agent Connected', 'green');
        displaySystemMessage(`Human agent ${data.agentName} has joined the chat.`);
    });
    
    socket.on('room_created', (data) => {
        chatRoomId = data.roomId;
        console.log(`Joined room: ${chatRoomId}`);
    });
}

// Setup event listeners
function setupEventListeners() {
    // User info form submission
    if (userInfoForm) {
        userInfoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleUserInfoSubmit();
        });
    }
    
    // Chat form submission
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendMessage();
        });
    }
    
    // Message input typing event
    if (messageInput) {
        messageInput.addEventListener('input', () => {
            handleUserTyping();
        });
    }
    
    // Request human agent button
    if (requestHumanBtn) {
        requestHumanBtn.addEventListener('click', () => {
            showHumanRequestForm();
        });
    }
    
    // Human request form submission
    if (humanRequestForm) {
        humanRequestForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitHumanRequest();
        });
    }
    
    // Cancel request button
    if (cancelRequestBtn) {
        cancelRequestBtn.addEventListener('click', () => {
            hideHumanRequestForm();
        });
    }
}

// Handle user info form submission
function handleUserInfoSubmit() {
    userName = document.getElementById('user-name').value.trim();
    userEmail = document.getElementById('user-email').value.trim();
    
    if (!userName) {
        alert('Please enter your name');
        return;
    }
    
    // Initialize chat
    startChat();
}

// Start the chat
function startChat() {
    welcomeContainer.classList.add('hidden');
    chatMessages.classList.remove('hidden');
    chatInputContainer.classList.remove('hidden');
    requestHumanContainer.classList.remove('hidden');
    
    chatActive = true;
    
    // Join a chat room
    socket.emit('join_room', { userName, userEmail });
    
    // Display welcome message
    const welcomeMessage = `Hello ${userName}! How can I assist you today?`;
    displayMessage(welcomeMessage, 'bot');
}

// Send a message
function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Display the user's message
    displayMessage(message, 'user');
    
    // Send the message to the server
    socket.emit('message', {
        roomId: chatRoomId,
        message: message,
        sender: 'user',
        userName: userName,
        userEmail: userEmail
    });
    
    // Clear the input field
    messageInput.value = '';
    
    // Stop typing indicator
    socket.emit('typing', {
        roomId: chatRoomId,
        isTyping: false
    });
}

// Display a message in the chat
function displayMessage(message, sender, timestamp = new Date().toISOString()) {
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-container flex flex-col';
    
    // Create the sender label if it's not the user
    if (sender !== 'user' && sender !== 'system') {
        const senderLabel = document.createElement('div');
        senderLabel.className = 'message-sender text-gray-600 ml-2';
        senderLabel.textContent = sender === 'bot' ? 'Chatbot' : `${sender} (Human Agent)`;
        messageContainer.appendChild(senderLabel);
    }
    
    // Create the message bubble
    const messageBubble = document.createElement('div');
    messageBubble.className = `message p-3 ${getSenderClass(sender)}`;
    messageBubble.textContent = message;
    
    // Create the timestamp
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time text-xs text-gray-500';
    const formattedTime = formatTimestamp(timestamp);
    messageTime.textContent = formattedTime;
    
    // Add elements to the container
    messageContainer.appendChild(messageBubble);
    messageContainer.appendChild(messageTime);
    
    // Add the message to the chat
    chatMessages.appendChild(messageContainer);
    
    // Scroll to the bottom
    scrollToBottom();
    
    // If this is a bot message, show the request human button
    if (sender === 'bot' && !humanRequested) {
        requestHumanContainer.classList.remove('hidden');
    }
}

// Display a system message
function displaySystemMessage(message) {
    const messageContainer = document.createElement('div');
    messageContainer.className = 'flex justify-center my-4';
    
    const messageBubble = document.createElement('div');
    messageBubble.className = 'bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm';
    messageBubble.textContent = message;
    
    messageContainer.appendChild(messageBubble);
    chatMessages.appendChild(messageContainer);
    
    scrollToBottom();
}

// Get the appropriate CSS class for the message based on sender
function getSenderClass(sender) {
    switch (sender) {
        case 'user':
            return 'message-user ml-auto';
        case 'bot':
            return 'message-bot';
        case 'human':
            return 'message-human';
        case 'system':
            return 'mx-auto bg-gray-200 text-gray-700';
        default:
            return 'message-human';
    }
}

// Format the timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Scroll to the bottom of the chat
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle user typing
function handleUserTyping() {
    if (!isTyping) {
        isTyping = true;
        socket.emit('typing', {
            roomId: chatRoomId,
            isTyping: true
        });
    }
    
    // Clear the previous timeout
    clearTimeout(typingTimeout);
    
    // Set a new timeout
    typingTimeout = setTimeout(() => {
        isTyping = false;
        socket.emit('typing', {
            roomId: chatRoomId,
            isTyping: false
        });
    }, 1000);
}

// Show typing indicator
function showTypingIndicator() {
    typingIndicator.classList.remove('hidden');
}

// Hide typing indicator
function hideTypingIndicator() {
    typingIndicator.classList.add('hidden');
}

// Update the status indicator
function updateStatus(text, color) {
    statusText.textContent = text;
    statusDot.className = `h-3 w-3 rounded-full bg-${color}-500`;
}

// Show the human request form
function showHumanRequestForm() {
    requestHumanContainer.classList.add('hidden');
    humanRequestFormContainer.classList.remove('hidden');
    
    // Pre-fill the form with user info
    document.getElementById('hr-name').value = userName;
    document.getElementById('hr-email').value = userEmail;
}

// Hide the human request form
function hideHumanRequestForm() {
    humanRequestFormContainer.classList.add('hidden');
    requestHumanContainer.classList.remove('hidden');
}

// Submit the human request
function submitHumanRequest() {
    const name = document.getElementById('hr-name').value.trim();
    const email = document.getElementById('hr-email').value.trim();
    const issue = document.getElementById('hr-issue').value.trim();
    
    if (!name || !email || !issue) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Update user info if changed
    userName = name;
    userEmail = email;
    
    // Send the request to the server
    socket.emit('request_human', {
        roomId: chatRoomId,
        userName: name,
        userEmail: email,
        issue: issue
    });
    
    // Hide the form and update UI
    humanRequestFormContainer.classList.add('hidden');
    updateStatus('Requesting Human Agent', 'yellow');
    displaySystemMessage('Requesting a human agent. Please wait...');
    
    // Mark human as requested
    humanRequested = true;
}
