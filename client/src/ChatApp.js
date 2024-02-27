import React, { useEffect, useRef, useState } from 'react'
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import "./ChatRoom.css";


const ChatRoom = () => {

    const [nickname, setNickname] = useState('');
    const [fullname, setFullname] = useState('');
    const [stompClient, setStompClient] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectedUsers, setConnectedUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [messageInput, setMessageInput] = useState('');


    const connet = (e) => {
        e.preventDefault();
        const socket = new SockJS('http://localhost:8080/ws');
        const temp = Stomp.over(socket);
        setStompClient(temp);
        temp.connect({}, onConnected, onError);
    }


    const onConnected = () => {
        setIsConnected(true);
    };

    useEffect(() => {
        if (isConnected && stompClient) {
            stompClient.subscribe(`/user/${nickname}/queue/messages`, onMessageReceived);
            stompClient.subscribe(`/user/public`, onMessageReceived);
            stompClient.send("/app/user.addUser", {}, JSON.stringify({ nickName: nickname, fullName: fullname, status: 'ONLINE' }));
            findAndDisplayConnectedUsers().then();
        }
    }, [isConnected, stompClient, messages]);


    const onError = (err) => {
        console.log(err);
    }


    const onMessageReceived = async (payload) => {
        await findAndDisplayConnectedUsers();
        //console.log('Message received', payload);
        const message = JSON.parse(payload.body);
        if (selectedUserId && selectedUserId === message.senderId) {
            setMessages([...messages, message]);
        }
        const notifiedUser = connectedUsers.find(user => user.nickName === message.senderId);
        if (notifiedUser && notifiedUser.nickName !== selectedUserId) {
            const updatedUsers = connectedUsers.map(user => {
                if (user.nickName === message.senderId) {
                    return { ...user, newMessage: true };
                }
                return user;
            });
            setConnectedUsers(updatedUsers);
        }
    };


    const findAndDisplayConnectedUsers = async () => {
        const connectedUsersResponse = await fetch('http://localhost:8080/users');
        let connectedUsers = await connectedUsersResponse.json();
        connectedUsers = connectedUsers.filter(user => user.nickName !== nickname);
        setConnectedUsers(connectedUsers);
    }


    const handleUserClick = (userId) => {
        setSelectedUserId(userId);
        const updatedUsers = connectedUsers.map(user => {
            if (user.nickName === userId) {
                return { ...user, newMessage: false };
            }
            return user;
        });
        setConnectedUsers(updatedUsers);
        fetchAndDisplayUserChat(userId);
    };


    const fetchAndDisplayUserChat = async (userId) => {
        const userChatResponse = await fetch(`http://localhost:8080/messages/${nickname}/${userId}`);
        const userChat = await userChatResponse.json();
        setMessages(userChat);
        //console.log(messages);
    }


    const sendMessage = (event) => {
        event.preventDefault();
        if (messageInput.trim() && stompClient) {
            const chatMessage = {
                senderId: nickname,
                recipientId: selectedUserId,
                content: messageInput.trim(),
                timestamp: new Date()
            };
            stompClient.send("/app/chat", {}, JSON.stringify(chatMessage));
            setMessages([...messages, chatMessage]);
            setMessageInput('');
        }
    };

    const logout = () => {
        stompClient.send("/app/user.disconnectUser",
            {},
            JSON.stringify({ nickName: nickname, fullName: fullname, status: 'OFFLINE' })
        );
        setIsConnected(false);
        setSelectedUserId(null);
    }

    const messageRef = useRef();

    useEffect(() => {
        if (messageRef.current) {
          messageRef.current.scrollIntoView(
            {
              behavior: 'smooth',
              block: 'end',
              inline: 'nearest'
            })
        }
      })

        return (
            <div>



                {
                    isConnected === false && (
                        <div className="user-form" id="username-page">
                            <h2>Enter Chatroom</h2>
                            <form id="usernameForm" onSubmit={(e) => connet(e)}>
                                <label>Nickname:</label>
                                <input type="text" id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} required />

                                <label>Real Name:</label>
                                <input type="text" id="fullname" value={fullname} onChange={(e) => setFullname(e.target.value)} required />

                                <button type="submit">Enter Chatroom</button>
                            </form>
                        </div>
                    )
                }

                {
                    isConnected === true && (
                        <div className="chat-container" id="chat-page">
                            <div className="users-list">
                                <div className="users-list-container">
                                    <h2>Online Users</h2>
                                    <ul id="connectedUsers">
                                        {connectedUsers.map(user => (
                                            <li key={user.nickName} className={user.newMessage ? 'new-message' : ''} onClick={() => handleUserClick(user.nickName)}>
                                                {user.fullName}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <p>{fullname}</p>
                                <button onClick={() => logout()}>Logout</button>

                            </div>

                            <div className="chat-area" ref={messageRef}>
                                {messages.map((message, index) => (
                                    <div key={index} className={message.senderId === nickname ? 'message sender' : 'message receiver'}>
                                        <p>{message.content}</p>
                                    </div>
                                ))}


                                <form onSubmit={sendMessage}>
                                    <div className="message-input">
                                        <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder="Type your message..." />
                                        <button type="submit">Send</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

            </div>
        )
    }

    export default ChatRoom