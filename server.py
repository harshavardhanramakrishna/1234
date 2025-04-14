from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import WebSocket
from typing import List, Dict, Any, Optional
import json
import asyncio
import uvicorn
import datetime
import smtplib
from email.mime.text import MIMEText
import uuid
import os
from pydantic import BaseModel
import motor.motor_asyncio
from datetime import datetime
from transformers import GPT2LMHeadModel, GPT2Tokenizer
import traceback
import sys

# Initialize FastAPI
app = FastAPI()

# Global variables for model
model_loaded = False
model = None
tokenizer = None

def load_gpt2_model():
    """Load custom GPT-2 model only once"""
    global model_loaded, model, tokenizer
    
    if model_loaded:
        return
    
    print("Loading custom GPT-2 model...")
    print(f"Python version: {sys.version}")
    print(f"Python executable: {sys.executable}")
    print(f"Python path: {sys.path}")

    # Ensure we have the necessary dependencies
    try:
        import transformers
        import torch
        
        # Use the default GPT-2 model instead of custom model
        print("Using default GPT-2 model...")
        model = GPT2LMHeadModel.from_pretrained('gpt2')
        tokenizer = GPT2Tokenizer.from_pretrained('gpt2')
        model_loaded = True
        print("Default GPT-2 model loaded successfully")
        return
    except ImportError as import_error:
        print(f"CRITICAL: Dependency import failed: {import_error}")
        print("Please install required packages: pip install transformers torch")
        return
    else:
        try:
            # Detailed model loading with comprehensive error handling
            print(f"Transformers version: {transformers.__version__}")
            print(f"Torch version: {torch.__version__}")

            # Custom model path
            custom_model_path = r"C:\internship\chatbot\gpt2_chatbot"
            print(f"Loading custom model from: {custom_model_path}")

            try:
                # Load custom model and tokenizer
                tokenizer = GPT2Tokenizer.from_pretrained(custom_model_path)
                model = GPT2LMHeadModel.from_pretrained(custom_model_path)
                
                print("Custom GPT-2 model loaded successfully")
                model_loaded = True
            
            except Exception as load_error:
                print("CRITICAL: Custom model loading failed")
                print(f"Detailed load error: {load_error}")
                print(traceback.format_exc())
                
                # Fallback to standard GPT-2 if custom model fails
                try:
                    print("Attempting to load standard GPT-2 as fallback...")
                    model_cache_dir = os.path.join(os.getcwd(), 'model_cache')
                    os.makedirs(model_cache_dir, exist_ok=True)
                    
                    tokenizer = GPT2Tokenizer.from_pretrained('gpt2', cache_dir=model_cache_dir)
                    model = GPT2LMHeadModel.from_pretrained('gpt2', cache_dir=model_cache_dir)
                    print("Standard GPT-2 model loaded as fallback")
                    model_loaded = True
                
                except Exception as fallback_error:
                    print("CRITICAL: Could not load fallback model")
                    print(f"Fallback error: {fallback_error}")
                    print(traceback.format_exc())
                    model = None
                    tokenizer = None

        except Exception as e:
            print("CRITICAL: Unexpected error during model loading")
            print(f"Unexpected error: {e}")
            print(traceback.format_exc())
            model = None
            tokenizer = None

# Load model on startup
load_gpt2_model()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # Replace with your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Mount static files (must come after WebSocket routes)
app.mount("/", StaticFiles(directory="dist", html=True), name="root")

# Connect to MongoDB Atlas
MONGO_CONNECTION_STRING = os.getenv('MONGO_URI', 'mongodb+srv://chatbotadmin:Harsha%40789@cluster0.9kgo6ow.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
try:
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_CONNECTION_STRING)
    db = client.chatbot_db
    print("Connected to MongoDB Atlas successfully")
except Exception as e:
    print(f"Warning: Could not connect to MongoDB Atlas: {e}")
    db = None

# Email configuration
COMPANY_EMAIL = os.getenv('COMPANY_EMAIL', 'example@company.com')
ALERT_EMAIL = os.getenv('ALERT_EMAIL', 'alerts@company.com')
ALERT_PASSWORD = os.getenv('ALERT_PASSWORD', '')

# Sensitive categories
SENSITIVE_CATEGORIES = {
    "Financial & Business Information": ["revenue", "profit margin", "financial statements", "valuation", "charges", "cost"],
    "Legal & Compliance Issues": ["lawsuit", "court order", "policy violation", "nda"],
    "Employee & HR Data": ["salary", "compensation", "benefits", "layoffs"],
    "Security & Data Breach": ["cyber attack", "hacked", "data breach", "password leak"],
    "Negative Reputation & Crisis Management": ["scandal", "fraud", "public backlash", "ceo resignation"],
    "Competitive & Confidential Information": ["competitor strategy", "pricing model", "business secrets"],
    "Unethical or Illegal Activities": ["bribery", "corruption", "money laundering", "insider trading"],
    "Fraudulent & Phishing Attempts": ["fake refund", "payment dispute", "unauthorized transaction"],
    "Workplace Culture & Ethics": ["work-life balance", "employee burnout", "toxic culture"],
    "Political & Social Issues": ["government policy", "human rights", "labor rights"],
}

# Connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, str] = {}
        self.chat_rooms: Dict[str, Dict[str, Any]] = {}
        self.admin_connections: List[str] = []
        self.agent_connections: Dict[str, str] = {}
    
    def connect(self, sid: str, client_id: str):
        self.active_connections[client_id] = sid
    
    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
    
    def connect_admin(self, sid: str):
        self.admin_connections.append(sid)
    
    def disconnect_admin(self, sid: str):
        if sid in self.admin_connections:
            self.admin_connections.remove(sid)
    
    def connect_agent(self, sid: str, agent_id: str):
        self.agent_connections[agent_id] = sid
    
    def disconnect_agent(self, agent_id: str):
        if agent_id in self.agent_connections:
            del self.agent_connections[agent_id]
    
    async def create_chat_room(self, user_id: str, user_name: str, user_email: str = None):
        room_id = f"room_{uuid.uuid4().hex[:6]}"
        
        self.chat_rooms[room_id] = {
            "userId": user_id,
            "userName": user_name,
            "userEmail": user_email,
            "startTime": datetime.now().isoformat(),
            "lastActivity": datetime.now().isoformat(),
            "status": "active",
            "agentId": None,
            "agentName": None,
            "messages": []
        }
        
        # Store in database
        await db.chat_rooms.insert_one({
            "roomId": room_id,
            "userId": user_id,
            "userName": user_name,
            "userEmail": user_email,
            "startTime": datetime.now().isoformat(),
            "lastActivity": datetime.now().isoformat(),
            "status": "active",
            "agentId": None,
            "agentName": None,
            "messages": []
        })
        
        return room_id
    
    async def add_message(self, room_id: str, message: str, sender: str, agent_name: str = None):
        if room_id not in self.chat_rooms:
            return False
        
        message_data = {
            "message": message,
            "sender": sender,
            "timestamp": datetime.now().isoformat(),
            "agentName": agent_name
        }
        
        self.chat_rooms[room_id]["messages"].append(message_data)
        self.chat_rooms[room_id]["lastActivity"] = datetime.now().isoformat()
        
        # Update in database
        await db.chat_rooms.update_one(
            {"roomId": room_id},
            {
                "$push": {"messages": message_data},
                "$set": {"lastActivity": datetime.now().isoformat()}
            }
        )
        
        return True
    
    async def request_human_agent(self, room_id: str, user_name: str, user_email: str, issue: str):
        if room_id not in self.chat_rooms:
            return False
        
        # Update room status
        self.chat_rooms[room_id]["status"] = "pending"
        
        # Create a human request
        request_data = {
            "roomId": room_id,
            "userId": self.chat_rooms[room_id]["userId"],
            "userName": user_name,
            "userEmail": user_email,
            "issue": issue,
            "timestamp": datetime.now().isoformat(),
            "priority": "medium"  # Default priority
        }
        
        # Update in database
        await db.chat_rooms.update_one(
            {"roomId": room_id},
            {"$set": {"status": "pending"}}
        )
        
        # Store request in database
        await db.human_requests.insert_one(request_data)
        
        # Send email notification
        await self.send_email_notification(user_name, user_email, issue, room_id)
        
        # Notify all agents
        for agent_id, websocket in self.agent_connections.items():
            await websocket.send_text(json.dumps({
                "type": "new_request",
                "data": request_data
            }))
        
        return True
    
    async def join_room_agent(self, room_id: str, agent_id: str, agent_name: str):
        if room_id not in self.chat_rooms:
            return False
        
        # Update room with agent info
        self.chat_rooms[room_id]["agentId"] = agent_id
        self.chat_rooms[room_id]["agentName"] = agent_name
        self.chat_rooms[room_id]["status"] = "active"
        
        # Update in database
        await db.chat_rooms.update_one(
            {"roomId": room_id},
            {
                "$set": {
                    "agentId": agent_id,
                    "agentName": agent_name,
                    "status": "active"
                }
            }
        )
        
        # Delete from human requests
        await db.human_requests.delete_one({"roomId": room_id})
        
        # Notify user
        user_id = self.chat_rooms[room_id]["userId"]
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(json.dumps({
                "type": "human_joined",
                "agentName": agent_name,
                "roomId": room_id
            }))
        
        return True
    
    async def get_chat_history(self, room_id: str):
        if room_id not in self.chat_rooms:
            return None
        
        return {
            "roomId": room_id,
            "userName": self.chat_rooms[room_id]["userName"],
            "userEmail": self.chat_rooms[room_id]["userEmail"],
            "startTime": self.chat_rooms[room_id]["startTime"],
            "messages": self.chat_rooms[room_id]["messages"]
        }
    
    async def get_pending_requests(self):
        # Get from database
        requests = await db.human_requests.find().to_list(length=100)
        
        # Convert ObjectId to string
        for request in requests:
            if "_id" in request:
                request["_id"] = str(request["_id"])
        
        return requests
    
    async def get_chat_rooms(self):
        rooms = []
        
        for room_id, room in self.chat_rooms.items():
            rooms.append({
                "roomId": room_id,
                "userId": room["userId"],
                "userName": room["userName"],
                "userEmail": room["userEmail"],
                "startTime": room["startTime"],
                "lastActivity": room["lastActivity"],
                "status": room["status"],
                "agentName": room["agentName"]
            })
        
        return rooms
    
    async def end_chat(self, room_id: str):
        if room_id not in self.chat_rooms:
            return False
        
        # Update room status
        self.chat_rooms[room_id]["status"] = "closed"
        
        # Update in database
        await db.chat_rooms.update_one(
            {"roomId": room_id},
            {"$set": {"status": "closed"}}
        )
        
        return True
    
    async def detect_sensitive_query(self, query: str):
        query_lower = query.lower()
        
        for category, keywords in SENSITIVE_CATEGORIES.items():
            for keyword in keywords:
                if keyword in query_lower:
                    return category
        
        return None
    
    async def send_email_notification(self, user_name: str, user_email: str, issue: str, room_id: str):
        subject = f"New Support Request: {user_name}"
        body = f"""
        A new support request has been received:
        
        User: {user_name}
        Email: {user_email}
        Issue: {issue}
        Room ID: {room_id}
        Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        
        Please log in to the agent portal to assist this user.
        """
        
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = ALERT_EMAIL
        msg["To"] = COMPANY_EMAIL
        
        try:
            with smtplib.SMTP("smtp.gmail.com", 587) as server:
                server.starttls()
                server.login(ALERT_EMAIL, ALERT_PASSWORD)
                server.sendmail(ALERT_EMAIL, COMPANY_EMAIL, msg.as_string())
                return True
        except Exception as e:
            print(f"Email send error: {e}")
            return False

# Create connection manager instance
manager = ConnectionManager()

# WebSocket endpoint (before static files to avoid conflicts)
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Validate WebSocket connection
    if websocket.url.path != "/ws":
        await websocket.close(code=1008)  # Policy violation
        return
        
    await websocket.accept()
    client_id = str(uuid.uuid4())
    print(f"New WebSocket connection from {websocket.client}")
    
    # Connection state tracking
    connection_active = True
    last_ping = datetime.now()
    
    async def send_ping():
        """Send periodic ping to check connection health"""
        nonlocal last_ping
        while connection_active:
            try:
                await asyncio.sleep(30)  # Ping every 30 seconds
                if connection_active:
                    await websocket.send_text(json.dumps({"type": "ping"}))
                    last_ping = datetime.now()
            except Exception as e:
                print(f"Ping error: {e}")
                break
    
    # Start ping task
    ping_task = asyncio.create_task(send_ping())
    
    try:
        while connection_active:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=60)
                
                # Handle ping responses
                if data.get("type") == "pong":
                    continue
                    
            except asyncio.TimeoutError:
                print(f"Receive timeout for client {client_id}")
                continue
            except json.JSONDecodeError as e:
                print(f"Invalid JSON from client {client_id}: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error", 
                    "message": "Invalid message format"
                }))
                continue
            message_type = data.get("type", "message")
            
            if message_type == "join_room":
                user_name = data.get("userName", "Anonymous")
                user_email = data.get("userEmail")
                
                # Create a new chat room
                room_id = await manager.create_chat_room(client_id, user_name, user_email)
                
                # Add user to the room
                manager.active_connections[client_id] = websocket
                
                # Send room ID to the client
                await websocket.send_json({
                    "type": "room_created",
                    "roomId": room_id
                })
                await websocket.send_text(json.dumps({
                    "type": "room_created",
                    "roomId": room_id
                }))
                
                # Send welcome message
                await websocket.send_json({
                    "type": "message",
                    "message": f"Hello {user_name}! How can I assist you today?",
                    "sender": "bot",
                    "timestamp": datetime.now().isoformat()
                })
                
                # Notify admin about new chat room
                for admin in manager.admin_connections:
                    try:
                        await admin.send_text(json.dumps({
                            "type": "new_chat_room",
                            "data": {
                                "roomId": room_id,
                                "userId": client_id,
                                "userName": user_name,
                                "userEmail": user_email,
                                "startTime": datetime.now().isoformat(),
                                "lastActivity": datetime.now().isoformat(),
                                "status": "active"
                            }
                        }))
                    except:
                        pass
            
            elif message_type == "message":
                print("Received message:", data)
                message = data.get("message", "")
                sender = data.get("sender", "user")
                
                print("Processing message:", message)
                print("Model status:", "Available" if model and tokenizer else "Not available")
                
                # Echo back user's message
                await websocket.send_json({
                    "type": "message",
                    "message": message,
                    "sender": sender,
                    "timestamp": datetime.now().isoformat()
                })
                
                # Generate response using GPT-2
                if model and tokenizer:
                    try:
                        print("Generating response with GPT-2...")
                        # Send thinking state
                        await websocket.send_json({
                            "type": "thinking",
                            "isThinking": True,
                            "timestamp": datetime.now().isoformat()
                        })
                        
                        # Encode the message
                        input_ids = tokenizer.encode(message, return_tensors="pt")
                        
                        # Generate response
                        output = model.generate(
                            input_ids,
                            max_length=100,
                            num_return_sequences=1,
                            no_repeat_ngram_size=2,
                            temperature=0.7,
                            pad_token_id=tokenizer.eos_token_id
                        )
                        
                        # Decode and send response
                        response = tokenizer.decode(output[0], skip_special_tokens=True)
                        print("Generated response:", response)
                        
                        # End thinking state
                        await websocket.send_json({
                            "type": "thinking",
                            "isThinking": False,
                            "timestamp": datetime.now().isoformat()
                        })
                        
                        await websocket.send_json({
                            "type": "message",
                            "message": response,
                            "sender": "bot",
                            "timestamp": datetime.now().isoformat()
                        })
                    except Exception as e:
                        print(f"Error generating response: {e}")
                        await websocket.send_json({
                            "type": "message",
                            "message": "I apologize, but I'm having trouble generating a response right now.",
                            "sender": "bot",
                            "timestamp": datetime.now().isoformat()
                        })
                else:
                    await websocket.send_json({
                        "type": "message",
                        "message": "I apologize, but the GPT-2 model is not available right now.",
                        "sender": "bot",
                        "timestamp": datetime.now().isoformat()
                    })
                
                # Check for sensitive content
                category = await manager.detect_sensitive_query(message)
                
                if category and sender == "user":
                    # Add message to the room
                    await manager.add_message(room_id, message, sender)
                    
                    # Send response to the client
                    response = "I can't provide a response. I will connect you with a human agent regarding the query."
                    await websocket.send_text(json.dumps({
                        "type": "message",
                        "message": response,
                        "sender": "bot",
                        "timestamp": datetime.now().isoformat(),
                        "roomId": room_id
                    }))
                else:
                    # Add message to the room
                    await manager.add_message(room_id, message, sender)
                    
                    if sender == "user":
                        # Generate response using GPT-2 model
                        if model is not None and tokenizer is not None:
                            try:
                                # Encode the input text
                                inputs = tokenizer.encode(message, return_tensors='pt', max_length=512, truncation=True)
                                
                                # Generate response
                                outputs = model.generate(
                                    inputs,
                                    max_length=150,
                                    num_return_sequences=1,
                                    no_repeat_ngram_size=2,
                                    temperature=0.7
                                )
                                
                                # Decode the response
                                response = tokenizer.decode(outputs[0], skip_special_tokens=True)
                            except Exception as e:
                                print(f"Error generating response: {e}")
                                response = "I apologize, but I'm having trouble generating a response right now."
                        else:
                            response = "I apologize, but my language model is not loaded properly."
                        
                        # Add bot response to the room
                        await manager.add_message(room_id, response, "bot")
                        
                        # Send response to the client with a delay to simulate typing
                        await asyncio.sleep(1)
                        await websocket.send_text(json.dumps({
                            "type": "message",
                            "message": response,
                            "sender": "bot",
                            "timestamp": datetime.now().isoformat(),
                            "roomId": room_id
                        }))
            
            elif message_type == "typing":
                room_id = message_data.get("roomId")
                is_typing = message_data.get("isTyping", False)
                
                # Forward typing indicator to agents
                agent_id = manager.chat_rooms.get(room_id, {}).get("agentId")
                if agent_id and agent_id in manager.agent_connections:
                    await manager.agent_connections[agent_id].send_text(json.dumps({
                        "type": "typing",
                        "isTyping": is_typing,
                        "sender": "user",
                        "roomId": room_id
                    }))
            
            elif message_type == "request_human":
                room_id = message_data.get("roomId")
                user_name = message_data.get("userName", "Anonymous")
                user_email = message_data.get("userEmail", "")
                issue = message_data.get("issue", "No issue specified")
                
                # Request a human agent
                success = await manager.request_human_agent(room_id, user_name, user_email, issue)
                
                if success:
                    # Notify the client
                    await websocket.send_text(json.dumps({
                        "type": "human_requested",
                        "roomId": room_id
                    }))
                    
                    # Add system message
                    await manager.add_message(room_id, "Human agent requested", "system")
    
    except asyncio.TimeoutError:
        print(f"WebSocket timeout for client {client_id}")
        await websocket.close(code=1001)  # Going away
    except WebSocketDisconnect:
        print(f"Client {client_id} disconnected normally")
    except json.JSONDecodeError as e:
        print(f"Invalid JSON received from client {client_id}: {e}")
        await websocket.close(code=1003)  # Invalid data
    except Exception as e:
        print(f"WebSocket error for client {client_id}: {e}")
        print(traceback.format_exc())
    finally:
        # Cleanup
        connection_active = False
        ping_task.cancel()
        try:
            await ping_task
        except:
            pass
            
        if client_id in manager.active_connections:
            manager.disconnect(client_id)
            
        try:
            await websocket.close()
        except:
            pass
            
        print(f"Connection closed for client {client_id}")

# ... (rest of the code remains the same)
# WebSocket route for admin
@app.websocket("/admin")
async def admin_websocket(websocket: WebSocket):
    await manager.connect_admin(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            message_type = message_data.get("type", "message")
            
            if message_type == "admin_auth":
                token = message_data.get("token")
                
                # In a real application, validate the token
                
                # Send chat list to admin
                chat_rooms = await manager.get_chat_rooms()
                await websocket.send_text(json.dumps({
                    "type": "chat_list",
                    "chats": chat_rooms
                }))
            
            elif message_type == "get_transcript":
                room_id = message_data.get("roomId")
                
                # Get chat history
                chat_history = await manager.get_chat_history(room_id)
                
                if chat_history:
                    await websocket.send_text(json.dumps({
                        "type": "chat_transcript",
                        "data": chat_history
                    }))
            
            elif message_type == "delete_chat":
                room_id = message_data.get("roomId")
                
                # In a real application, delete the chat from database
                
                # Notify admin
                await websocket.send_text(json.dumps({
                    "type": "chat_deleted",
                    "roomId": room_id
                }))
    
    except WebSocketDisconnect:
        manager.disconnect_admin(websocket)
        print("Admin disconnected")

# WebSocket route for agent
@app.websocket("/agent")
async def agent_websocket(websocket: WebSocket):
    await websocket.accept()
    agent_id = str(uuid.uuid4())
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            message_type = message_data.get("type", "message")
            
            if message_type == "agent_auth":
                token = message_data.get("token")
                agent_name = message_data.get("agentName", "Agent")
                
                # In a real application, validate the token
                
                # Add agent to connections
                manager.agent_connections[agent_id] = websocket
                
                # Send pending requests to agent
                pending_requests = await manager.get_pending_requests()
                await websocket.send_text(json.dumps({
                    "type": "pending_requests",
                    "requests": pending_requests
                }))
            
            elif message_type == "join_room_agent":
                room_id = message_data.get("roomId")
                agent_name = message_data.get("agentName", "Agent")
                
                # Agent joins the room
                success = await manager.join_room_agent(room_id, agent_id, agent_name)
                
                if success:
                    # Notify other agents
                    for aid, ws in manager.agent_connections.items():
                        if aid != agent_id:
                            try:
                                await ws.send_text(json.dumps({
                                    "type": "request_taken",
                                    "roomId": room_id,
                                    "agentName": agent_name
                                }))
                            except:
                                pass
            
            elif message_type == "message":
                room_id = message_data.get("roomId")
                message = message_data.get("message", "")
                sender = message_data.get("sender", "human")
                agent_name = message_data.get("agentName", "Agent")
                
                # Add message to the room
                await manager.add_message(room_id, message, sender, agent_name)
                
                # Forward message to user
                user_id = manager.chat_rooms.get(room_id, {}).get("userId")
                if user_id and user_id in manager.active_connections:
                    await manager.active_connections[user_id].send_text(json.dumps({
                        "type": "message",
                        "message": message,
                        "sender": "human",
                        "timestamp": datetime.now().isoformat(),
                        "roomId": room_id
                    }))
            
            elif message_type == "get_chat_history":
                room_id = message_data.get("roomId")
                
                # Get chat history
                chat_history = await manager.get_chat_history(room_id)
                
                if chat_history:
                    await websocket.send_text(json.dumps({
                        "type": "chat_history",
                        "data": chat_history
                    }))
            
            elif message_type == "typing":
                room_id = message_data.get("roomId")
                is_typing = message_data.get("isTyping", False)
                
                # Forward typing indicator to user
                user_id = manager.chat_rooms.get(room_id, {}).get("userId")
                if user_id and user_id in manager.active_connections:
                    await manager.active_connections[user_id].send_text(json.dumps({
                        "type": "typing",
                        "isTyping": is_typing,
                        "sender": "human",
                        "roomId": room_id
                    }))
            
            elif message_type == "end_chat":
                room_id = message_data.get("roomId")
                agent_name = message_data.get("agentName", "Agent")
                
                # End the chat
                success = await manager.end_chat(room_id)
                
                if success:
                    # Notify user
                    user_id = manager.chat_rooms.get(room_id, {}).get("userId")
                    if user_id and user_id in manager.active_connections:
                        await manager.active_connections[user_id].send_text(json.dumps({
                            "type": "chat_ended",
                            "agentName": agent_name,
                            "roomId": room_id
                        }))
                    
                    # Add system message
                    await manager.add_message(room_id, f"Chat ended by {agent_name}", "system")
    
    except WebSocketDisconnect:
        manager.disconnect_agent(agent_id)
        print(f"Agent #{agent_id} disconnected")

# Route to serve the main HTML page

if __name__ == "__main__":
    import uvicorn
    
    # Use fixed port for WebSocket
    WS_PORT = 8081
    
    print(f"Starting server on port {WS_PORT}")
    
    uvicorn.run(
        "server:app", 
        host="0.0.0.0", 
        port=WS_PORT,
        reload=True,
        ws_ping_interval=20,
        ws_ping_timeout=20,
        timeout_keep_alive=60
    )
