import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid'
import './App.css'; 
import { FiLogOut } from 'react-icons/fi';

const App = () => {
  const [currentScreen, setCurrentScreen] = useState('welcome');

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen navigate={setCurrentScreen} />;
      case 'login':
        return <LoginScreen navigate={setCurrentScreen} />;
      case 'register':
        return <RegisterScreen navigate={setCurrentScreen} />;
      case 'changePassword':
        return <ChangePasswordScreen navigate={setCurrentScreen} />;
      case 'chat':
        return <ChatScreen navigate={setCurrentScreen} />;
      default:
        return <WelcomeScreen navigate={setCurrentScreen} />;
    }
  };

  return <div className="app">{renderScreen()}</div>;
};

const WelcomeScreen = ({ navigate }) => {
  return (
    <div className="welcome-screen">
      <img src={require('./logo.png')} alt="Logo" className="logo" />
      <h1>Welcome to StressGuru</h1>
      <button className="btn" onClick={() => navigate('login')}>Get Started</button>
    </div>
  );
};

const LoginScreen = ({ navigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token); // Save JWT token
        navigate('chat');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Server error. Please try again.');
    }
  };

  return (
    <div className="login-screen">
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleLogin}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        <button type="submit">Login</button>
        <button className="btn-regular" onClick={() => navigate('register')}>Go to Register</button>
      </form>
      <button type="button" className="link-button" onClick={() => navigate('changePassword')}>
        Forgot Password?
      </button>
    </div>
  );
};

const RegisterScreen = ({ navigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5001/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('Registration successful! Please log in.');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Server error. Please try again.');
    }
  };

  return (
    <div className="register-screen">
      <h2>Register</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      <form onSubmit={handleRegister}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />        
        <input 
          type="text" 
          placeholder="Username" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
          required 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        <button type="submit">Register</button>
        <button className="btn-regular" onClick={() => navigate('login')}>Back to Login</button>
      </form>
    </div>
  );
};

const ChangePasswordScreen = ({ navigate }) => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous error
    setSuccess(''); // Clear previous success message

    if (!email || !newPassword) {
      setError('Email and new password are required.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, new_password: newPassword }), // Match the backend key
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('Password reset successful!');
        setEmail('');
        setNewPassword('');
      } else {
        setError(data.message || 'Password reset failed.'); // Match backend error response key
      }
    } catch (err) {
      setError('Server error. Please try again.');
    }
  };

  return (
    <div className="change-password-screen">
      <h2>Change Password</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      <form onSubmit={handleChangePassword}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <input 
          type="password" 
          placeholder="New Password" 
          value={newPassword} 
          onChange={(e) => setNewPassword(e.target.value)} 
          required 
        />
        <button type="submit">Change Password</button>
        <button className="btn-regular" onClick={() => navigate('login')}>Back to Login</button>
      </form>
    </div>
  );
};

const ChatScreen = ({ navigate }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userResponse, setUserResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [animatedMessages, setAnimatedMessages] = useState(new Set());
  const [displayedTexts, setDisplayedTexts] = useState({});
  const [assessment, setAssessment] = useState({
    inProgress: false,
    currentResponses: [],
    completed: false,
    showingHistory: false
  });
  
  const chatWindowRef = useRef(null);
  const typewriterSpeed = 30;
  const messageQueue = useRef([]);
  const isAnimating = useRef(false);
  const isInitialized = useRef(false);

  const getStressRecommendations = (stressLevel) => {
    const recommendations = {
      'low stress': [
        "Continue your current stress management practices - they're working well!",
        "Try incorporating a daily mindfulness practice to maintain your low stress levels",
        "Consider starting a gratitude journal to reinforce positive thinking"
      ],
      'moderate stress': [
        "Take regular breaks during work - try the 25/5 Pomodoro technique",
        "Practice deep breathing exercises for 5 minutes, 3 times a day",
        "Make time for light exercise like walking or stretching",
        "Consider limiting caffeine intake and maintaining a regular sleep schedule"
      ],
      'high stress': [
        "Schedule time for daily relaxation activities like meditation or yoga",
        "Reach out to friends or family for support - social connections are important",
        "Try progressive muscle relaxation before bed to improve sleep quality",
        "Consider talking to a mental health professional for additional support",
        "Make time for regular physical exercise to reduce stress hormones"
      ]
    };
    
    return recommendations[stressLevel] || [
      "Practice regular self-care activities",
      "Make time for activities you enjoy",
      "Maintain a balanced daily routine"
    ];
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages, displayedTexts]);

  // Animation manager
  const processMessageQueue = useCallback(async () => {
    if (isAnimating.current || messageQueue.current.length === 0) return;

    isAnimating.current = true;
    const message = messageQueue.current[0];

    if (message.sender === 'bot' && !animatedMessages.has(message.id)) {
      let displayText = '';
      setDisplayedTexts(prev => ({ ...prev, [message.id]: '' }));

      for (let i = 0; i < message.text.length; i++) {
        displayText += message.text[i];
        setDisplayedTexts(prev => ({ ...prev, [message.id]: displayText }));
        await new Promise(resolve => setTimeout(resolve, typewriterSpeed));
      }

      setAnimatedMessages(prev => new Set([...prev, message.id]));
    }

    messageQueue.current.shift();
    isAnimating.current = false;
    processMessageQueue();
  }, [animatedMessages, typewriterSpeed]);

  // Handle message queue processing
  useEffect(() => {
    if (messageQueue.current.length > 0 && !isAnimating.current) {
      processMessageQueue();
    }
  }, [messages, processMessageQueue]);

  const addMessage = useCallback((sender, text) => {
    const newMessage = {
      id: uuidv4(),
      sender,
      text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newMessage]);
    if (sender === 'bot') {
      messageQueue.current.push(newMessage);
      if (!isAnimating.current) {
        processMessageQueue();
      }
    } else {
      setAnimatedMessages(prev => new Set([...prev, newMessage.id]));
      setDisplayedTexts(prev => ({ ...prev, [newMessage.id]: text }));
    }
  }, [processMessageQueue]);

  // Initialize chat - only run once
  useEffect(() => {
    if (!isInitialized.current && messages.length === 0) {
      isInitialized.current = true;
      addMessage('bot', 'Welcome to StressGuru.');
      addMessage('bot', 'I\'ll help evaluate your stress levels using an adaptive questioning approach.');
      addMessage('bot', 'Would you like to begin? (yes/no)');
    }
  }, [addMessage]);

  const getNextQuestion = async (currentResponses) => {
    try {
      const response = await fetch('http://localhost:5001/pss/next-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ current_responses: currentResponses })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching next question:', error);
      throw error;
    }
  };


  const handleAssessmentSubmit = async (responses) => {
    try {
      // Format responses as array of [index, response] pairs
      const formattedResponses = responses.map((response, index) => [
        assessment.currentQuestionIndex - responses.length + index + 1, 
        response
      ]);

      console.log('Sending responses:', formattedResponses); // Debug log

      const response = await fetch('http://localhost:5001/pss/assess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ responses: formattedResponses })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      
      // Add null checks and default values
      const questionsAnswered = data.questions_answered || 0;
      const score = typeof data.score === 'number' ? Math.round(data.score) : 0;
      const stressLevel = data.stress_level || 'undefined';
      
      addMessage('bot', '=== Assessment Results ===');
      addMessage('bot', `Questions Answered: ${questionsAnswered}`);
      addMessage('bot', `PSS Score: ${score}`);
      addMessage('bot', `AI Assessment: ${stressLevel}`);
      
      if (data.confidence && data.confidence > 0.7) {
        addMessage('bot', `Confidence Level: ${(data.confidence * 100).toFixed(1)}%`);
      }

      // Add recommendations based on stress level
      addMessage('bot', '\n=== Recommended Activities ===');
      const recommendations = getStressRecommendations(stressLevel);
      recommendations.forEach(recommendation => {
        addMessage('bot', `• ${recommendation}`);
      });

      if (stressLevel === 'high stress') {
        addMessage('bot', 'Note: If you\'re experiencing high levels of stress, consider talking to a mental health professional.');
      }

      addMessage('bot', 'Would you like to see your assessment history? (yes/no)');
      setAssessment(prev => ({ ...prev, completed: true }));

    } catch (error) {
      console.error('Error submitting assessment:', error);
      addMessage('bot', 'Sorry, there was an error processing your assessment. Would you like to try again? (yes/no)');
      setAssessment(prev => ({ ...prev, inProgress: false, completed: false }));
    }
  };

  const fetchAndDisplayHistory = async () => {
    try {
      const response = await fetch('http://localhost:5001/pss/history', {
        headers: {
          'x-access-token': localStorage.getItem('token')
        }
      });
      const data = await response.json();
      
      if (data.history && data.history.length > 0) {
        addMessage('bot', '=== Assessment History ===');
        data.history.slice(0, 5).forEach(entry => {
          const date = new Date(entry.timestamp).toLocaleDateString();
          addMessage('bot', 
            `Date: ${date} - Score: ${Math.round(entry.score)} - Level: ${entry.stress_level}` +
            (entry.ai_confidence > 0.7 ? ` (Confidence: ${(entry.ai_confidence * 100).toFixed(1)}%)` : '')
          );
        });
      } else {
        addMessage('bot', 'No previous assessment history found.');
      }
      
      addMessage('bot', 'Would you like to take another assessment? (yes/no)');
    } catch (error) {
      console.error('Error fetching history:', error);
      addMessage('bot', 'Sorry, there was an error fetching your history. Would you like to take another assessment? (yes/no)');
    }
  };

  const handleUserResponse = async () => {
    if (!userResponse.trim() || isLoading) return;
    setIsLoading(true);

    const response = userResponse.toLowerCase().trim();
    addMessage('user', userResponse);
    setUserResponse('');

    try {
      if (!assessment.inProgress) {
        if (response === 'yes') {
          setAssessment(prev => ({
            ...prev,
            inProgress: true,
            currentResponses: [],
            currentQuestionIndex: 0
          }));
          const nextQuestion = await getNextQuestion([]);
          if (nextQuestion && !nextQuestion.complete) {
            addMessage('bot', 'In the last month, ' + nextQuestion.question);
            addMessage('bot', 'Please answer with: never, almost never, sometimes, fairly often, or very often');
            setAssessment(prev => ({
              ...prev,
              currentQuestionIndex: nextQuestion.question_index
            }));
          }
        } else if (response === 'no') {
          addMessage('bot', 'No problem. Feel free to return when you\'d like to assess your stress levels.');
        } else {
          addMessage('bot', 'Please answer with yes or no.');
        }
      } else if (!assessment.completed) {
        const validResponses = ['never', 'almost never', 'sometimes', 'fairly often', 'very often'];
        
        if (!validResponses.includes(response)) {
          addMessage('bot', 'Please use one of these responses: never, almost never, sometimes, fairly often, or very often');
        } else {
          const updatedResponses = [...assessment.currentResponses, response];
          
          try {
            const formattedResponses = updatedResponses.map((resp, idx) => [
              assessment.currentQuestionIndex - updatedResponses.length + idx + 1,
              resp
            ]);
            
            const nextQuestion = await getNextQuestion(formattedResponses);
            
            if (nextQuestion && !nextQuestion.complete) {
              setAssessment(prev => ({
                ...prev,
                currentResponses: updatedResponses,
                currentQuestionIndex: nextQuestion.question_index
              }));
              addMessage('bot', 'In the last month, ' + nextQuestion.question);
            } else {
              await handleAssessmentSubmit(updatedResponses);
            }
          } catch (error) {
            throw new Error('Failed to process question response: ' + error.message);
          }
        }
      } else if (assessment.completed) {
        if (response === 'yes') {
          if (assessment.showingHistory) {
            setAssessment({
              inProgress: true,
              currentResponses: [],
              currentQuestionIndex: 0,
              completed: false,
              showingHistory: false
            });
            const nextQuestion = await getNextQuestion([]);
            if (nextQuestion && !nextQuestion.complete) {
              addMessage('bot', 'In the last month, ' + nextQuestion.question);
              addMessage('bot', 'Please answer with: never, almost never, sometimes, fairly often, or very often');
              setAssessment(prev => ({
                ...prev,
                currentQuestionIndex: nextQuestion.question_index
              }));
            }
          } else {
            setAssessment(prev => ({ ...prev, showingHistory: true }));
            await fetchAndDisplayHistory();
          }
        } else if (response === 'no') {
          addMessage('bot', 'Thank you for completing the assessment. Take care!');
        } else {
          addMessage('bot', 'Please answer with yes or no.');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      addMessage('bot', 'Sorry, there was an error. Would you like to try again? (yes/no)');
      setAssessment({
        inProgress: false,
        currentResponses: [],
        currentQuestionIndex: null,
        completed: false,
        showingHistory: false
      });
    }

    setIsLoading(false);
  };

  return (
    <div className={`chat-screen ${darkMode ? 'dark' : ''}`}>
      <header>
        <h2>StressGuru</h2>
        <div className="header-actions">
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="dark-mode-toggle"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '🌞' : '🌙'}
          </button>
          <button 
            className="logout-btn" 
            onClick={() => navigate('welcome')}
            aria-label="Logout"
          >
            <FiLogOut />
          </button>
        </div>
      </header>
      <div className="chat-window" ref={chatWindowRef}>
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`message-bubble ${msg.sender}`}
          >
            <div className="message-text">
              {animatedMessages.has(msg.id) ? msg.text : displayedTexts[msg.id] || ''}
            </div>
          </div>
        ))}
      </div>
      <div className="message-input">
        <input 
          type="text" 
          placeholder={assessment.inProgress && !assessment.completed ? 
            "Type: never, almost never, sometimes, fairly often, or very often" : 
            "Type yes or no..."}
          value={userResponse}
          onChange={(e) => setUserResponse(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !isLoading && userResponse.trim() && handleUserResponse()}
          aria-label="Response input"
          disabled={isAnimating.current}
        />
        <button 
          onClick={handleUserResponse}
          disabled={isLoading || !userResponse.trim() || isAnimating.current}
          aria-label="Send response"
        >
          {isLoading ? '...' : '🚀'}
        </button>
      </div>
    </div>
  );
};

export default App;
