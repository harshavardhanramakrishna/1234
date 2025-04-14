
// Global Variables
let socket;
let adminToken;
let currentRoomId;

// DOM Elements
const adminLoginForm = document.getElementById('admin-login-form');
const adminLogin = document.getElementById('admin-login');
const adminDashboard = document.getElementById('admin-dashboard');
const adminLogout = document.getElementById('admin-logout');
const searchInput = document.getElementById('search-input');
const filterStatus = document.getElementById('filter-status');
const chatList = document.getElementById('chat-list');
const transcriptModal = document.getElementById('transcript-modal');
const closeTranscript = document.getElementById('close-transcript');
const downloadTranscript = document.getElementById('download-transcript');
const transcriptRoomId = document.getElementById('transcript-room-id');
const transcriptUser = document.getElementById('transcript-user');
const transcriptStarted = document.getElementById('transcript-started');
const transcriptMessages = document.getElementById('transcript-messages');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Initialize the application
function initializeApp() {
    // Check if admin is already logged in
    checkAdminAuth();
    
    // Setup event listeners
    setupEventListeners();
}

// Check if admin is already logged in
function checkAdminAuth() {
    // Check for token in localStorage
    adminToken = localStorage.getItem('adminToken');
    
    if (adminToken) {
        showAdminDashboard();
        initializeSocket();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Admin login form submission
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleAdminLogin();
        });
    }
    
    // Admin logout
    if (adminLogout) {
        adminLogout.addEventListener('click', handleAdminLogout);
    }
    
    // Search input
    if (searchInput) {
        searchInput.addEventListener('input', filterChatList);
    }
    
    // Filter status select
    if (filterStatus) {
        filterStatus.addEventListener('change', filterChatList);
    }
    
    // Close transcript modal
    if (closeTranscript) {
        closeTranscript.addEventListener('click', () => {
            transcriptModal.classList.add('hidden');
        });
    }
    
    // Download transcript
    if (downloadTranscript) {
        downloadTranscript.addEventListener('click', downloadChatTranscript);
    }
    
    // Setup chat action buttons
    setupChatActionButtons();
}

// Initialize WebSocket connection
function initializeSocket() {
    // Connect to the WebSocket server
    socket = io('http://localhost:5000');
    
    // Socket event listeners
    socket.on('connect', () => {
        console.log('Admin connected to server');
        
        // Authenticate as admin
        socket.emit('admin_auth', { token: adminToken });
    });
    
    socket.on('disconnect', () => {
        console.log('Admin disconnected from server');
    });
    
    socket.on('chat_list', (data) => {
        populateChatList(data.chats);
    });
    
    socket.on('chat_transcript', (data) => {
        displayChatTranscript(data);
    });
    
    socket.on('new_chat_room', (data) => {
        // Add new chat room to the list
        addChatRoom(data);
    });
    
    socket.on('chat_updated', (data) => {
        // Update chat room in the list
        updateChatRoom(data);
    });
}

// Handle admin login
function handleAdminLogin() {
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value.trim();
    
    if (!username || !password) {
        alert('Please enter username and password');
        return;
    }
    
    // For demo purposes, we'll use a hardcoded admin credentials
    // In a real application, you would send this to the server for validation
    if (username === 'admin' && password === 'admin123') {
        // Create a mock token
        adminToken = 'admin_' + Date.now();
        
        // Save token to localStorage
        localStorage.setItem('adminToken', adminToken);
        
        // Show admin dashboard
        showAdminDashboard();
        
        // Initialize WebSocket connection
        initializeSocket();
    } else {
        alert('Invalid username or password');
    }
}

// Handle admin logout
function handleAdminLogout() {
    // Remove token from localStorage
    localStorage.removeItem('adminToken');
    
    // Disconnect socket
    if (socket) {
        socket.disconnect();
    }
    
    // Show login form
    adminDashboard.classList.add('hidden');
    adminLogin.classList.remove('hidden');
}

// Show admin dashboard
function showAdminDashboard() {
    adminLogin.classList.add('hidden');
    adminDashboard.classList.remove('hidden');
}

// Populate the chat list
function populateChatList(chats) {
    chatList.innerHTML = '';
    
    if (chats.length === 0) {
        const noChatsRow = document.createElement('tr');
        noChatsRow.innerHTML = `
            <td colspan="6" class="text-center py-4 text-gray-500">No chat rooms found</td>
        `;
        chatList.appendChild(noChatsRow);
        return;
    }
    
    chats.forEach((chat) => {
        const chatRow = createChatRow(chat);
        chatList.appendChild(chatRow);
    });
    
    // Re-setup chat action buttons
    setupChatActionButtons();
}

// Create a chat row
function createChatRow(chat) {
    const row = document.createElement('tr');
    row.className = 'chat-row';
    row.setAttribute('data-room-id', chat.roomId);
    row.setAttribute('data-status', chat.status);
    row.setAttribute('data-user', chat.userName + ' ' + chat.userEmail);
    
    const formattedStartTime = formatDateTime(chat.startTime);
    const lastActivity = getTimeAgo(chat.lastActivity);
    
    row.innerHTML = `
        <td>${chat.roomId}</td>
        <td>${chat.userName} <span class="text-xs text-gray-500">(${chat.userEmail || 'No email'})</span></td>
        <td><span class="badge badge-${getStatusBadge(chat.status)}">${chat.status}</span></td>
        <td>${formattedStartTime}</td>
        <td>${lastActivity}</td>
        <td>
            <button class="text-indigo-600 hover:text-indigo-800 mr-2 view-chat" data-room-id="${chat.roomId}">
                <i class="fas fa-eye"></i>
            </button>
            <button class="text-red-600 hover:text-red-800 delete-chat" data-room-id="${chat.roomId}">
                <i class="fas fa-trash-alt"></i>
            </button>
        </td>
    `;
    
    return row;
}

// Get the appropriate badge class based on status
function getStatusBadge(status) {
    switch (status.toLowerCase()) {
        case 'active':
            return 'success';
        case 'pending':
            return 'pending';
        case 'closed':
            return 'closed';
        default:
            return 'closed';
    }
}

// Format date and time
function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
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

// Setup chat action buttons
function setupChatActionButtons() {
    // View chat buttons
    const viewButtons = document.querySelectorAll('.view-chat');
    viewButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const roomId = button.getAttribute('data-room-id');
            viewChatTranscript(roomId);
        });
    });
    
    // Delete chat buttons
    const deleteButtons = document.querySelectorAll('.delete-chat');
    deleteButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const roomId = button.getAttribute('data-room-id');
            deleteChatRoom(roomId);
        });
    });
}

// Filter the chat list
function filterChatList() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = filterStatus.value;
    
    const rows = document.querySelectorAll('.chat-row');
    
    rows.forEach((row) => {
        const roomId = row.getAttribute('data-room-id').toLowerCase();
        const user = row.getAttribute('data-user').toLowerCase();
        const status = row.getAttribute('data-status').toLowerCase();
        
        const matchesSearch = roomId.includes(searchTerm) || user.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        
        if (matchesSearch && matchesStatus) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// View chat transcript
function viewChatTranscript(roomId) {
    currentRoomId = roomId;
    
    // Show loading state
    transcriptMessages.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin mr-2"></i> Loading transcript...</div>';
    
    // Update modal header
    const roomRow = document.querySelector(`.chat-row[data-room-id="${roomId}"]`);
    if (roomRow) {
        const userName = roomRow.querySelector('td:nth-child(2)').textContent;
        const startTime = roomRow.querySelector('td:nth-child(4)').textContent;
        
        transcriptRoomId.textContent = roomId;
        transcriptUser.textContent = userName;
        transcriptStarted.textContent = startTime;
    }
    
    // Show modal
    transcriptModal.classList.remove('hidden');
    
    // Request transcript from server
    socket.emit('get_transcript', { roomId, token: adminToken });
}

// Display chat transcript
function displayChatTranscript(data) {
    transcriptMessages.innerHTML = '';
    
    if (!data.messages || data.messages.length === 0) {
        transcriptMessages.innerHTML = '<div class="text-center py-4 text-gray-500">No messages in this chat</div>';
        return;
    }
    
    data.messages.forEach((message) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'p-3 border rounded-lg';
        
        const sender = message.sender === 'user' ? data.userName : message.sender;
        const timestamp = formatDateTime(message.timestamp);
        
        messageDiv.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div class="font-medium ${message.sender === 'user' ? 'text-indigo-600' : message.sender === 'bot' ? 'text-gray-700' : 'text-green-600'}">
                    ${sender}
                </div>
                <div class="text-xs text-gray-500">${timestamp}</div>
            </div>
            <div class="text-gray-800">${message.message}</div>
        `;
        
        transcriptMessages.appendChild(messageDiv);
    });
}

// Download chat transcript
function downloadChatTranscript() {
    if (!currentRoomId) return;
    
    // Request transcript from server as download
    socket.emit('download_transcript', { roomId: currentRoomId, token: adminToken });
    
    // For demo purposes, we'll simulate a download
    alert('In a real application, this would download the transcript as a file.');
}

// Delete chat room
function deleteChatRoom(roomId) {
    const confirmDelete = confirm('Are you sure you want to delete this chat room? This action cannot be undone.');
    
    if (confirmDelete) {
        // Send delete request to server
        socket.emit('delete_chat', { roomId, token: adminToken });
        
        // Remove row from table
        const row = document.querySelector(`.chat-row[data-room-id="${roomId}"]`);
        if (row) {
            row.remove();
        }
    }
}

// Add a new chat room to the list
function addChatRoom(chat) {
    const row = createChatRow(chat);
    chatList.prepend(row);
    
    // Re-setup chat action buttons
    setupChatActionButtons();
}

// Update a chat room in the list
function updateChatRoom(chat) {
    const row = document.querySelector(`.chat-row[data-room-id="${chat.roomId}"]`);
    
    if (!row) return;
    
    // Update row with new data
    const newRow = createChatRow(chat);
    row.replaceWith(newRow);
    
    // Re-setup chat action buttons
    setupChatActionButtons();
}
