import React, { useState, useEffect, useRef } from 'react';
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
  const [ setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5001/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('Password reset successful!');
        setEmail('');
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setError(data.error || 'Password reset failed');
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

// Helper function for weighted random choice
const weightedRandomChoice = (options) => {
  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
  const randVal = Math.random() * totalWeight;
  let cumulativeWeight = 0;
  
  for (const option of options) {
    cumulativeWeight += option.weight;
    if (randVal <= cumulativeWeight) {
      return option.text;
    }
  }
};

// Score mapping for responses
const scoreKeywords = {
  0: ["no", "never", "not at all"],
  1: ["a little", "sometimes", "rarely"],
  2: ["maybe", "occasionally", "quite a bit"],
  3: ["yes", "often", "frequently", "a lot"]
};

// Category mapping
const categoryMapping = {
  "S": "Stress",
  "A": "Anxiety",
  "D": "Depression"
};

// Severity labels for feedback
const severityLabels = {
  "Stress": [
    [0, 14, "Normal"],
    [15, 18, "Mild"],
    [19, 25, "Moderate"],
    [26, 33, "Severe"],
    [34, Infinity, "Extremely Severe"]
  ],
  "Anxiety": [
    [0, 7, "Normal"],
    [8, 9, "Mild"],
    [10, 14, "Moderate"],
    [15, 19, "Severe"],
    [20, Infinity, "Extremely Severe"]
  ],
  "Depression": [
    [0, 9, "Normal"],
    [10, 13, "Mild"],
    [14, 20, "Moderate"],
    [21, 27, "Severe"],
    [28, Infinity, "Extremely Severe"]
  ]
};

const ChatScreen = ({ navigate }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userResponse, setUserResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatbotData, setChatbotData] = useState(null);
  const [dassData, setDassData] = useState(null);
  const [activityRecommendations, setActivityRecommendations] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [responses, setResponses] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const chatWindowRef = useRef(null);

  // Extract score from user response
  const extractScoreFromResponse = (response) => {
    const lowerResponse = response.toLowerCase();
    for (const [score, keywords] of Object.entries(scoreKeywords)) {
      if (keywords.some(keyword => lowerResponse.includes(keyword))) {
        return parseInt(score);
      }
    }
    return null;
  };

  // Calculate final scores
  const calculateScores = (responses) => {
    const scores = { "Stress": 0, "Anxiety": 0, "Depression": 0 };
    responses.forEach(([score, category]) => {
      scores[category] += score * 2;
    });
    return scores;
  };

  // Provide feedback based on scores
  const provideFeedback = (scores) => {
    const feedback = [];
    
    Object.entries(scores).forEach(([category, score]) => {
      const severityRanges = severityLabels[category];
      for (const [min, max, label] of severityRanges) {
        if (score >= min && score <= max) {
          feedback.push(`${category}: ${score} - ${label}`);
          
          if (activityRecommendations && 
              activityRecommendations[category] && 
              activityRecommendations[category][label]) {
            feedback.push(`Here are some activities that could help with ${category.toLowerCase()}:`);
            activityRecommendations[category][label].forEach(activity => {
              feedback.push(`• ${activity}`);
            });
          }
          break;
        }
      }
    });

    feedback.forEach(msg => addMessage('bot', msg));
    addMessage('bot', "It's okay to feel how you're feeling. If you need to talk more, I'm here.");
    addMessage('bot', "If things get tough, please consider reaching out to someone you trust or a professional.");
  };

  // Load JSON data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [chatbotResponse, dassResponse, activityResponse] = await Promise.all([
          fetch('/chatbot_data.json'),
          fetch('/dass_data.json'),
          fetch('/activity_recommendations.json')
        ]);

        const chatbotJson = await chatbotResponse.json();
        const dassJson = await dassResponse.json();
        const activityJson = await activityResponse.json();

        setChatbotData(chatbotJson);
        setDassData(dassJson);
        setActivityRecommendations(activityJson);
        setDataLoaded(true);

        // Send initial greeting
        const currentHour = new Date().getHours();
        let greeting;
        if (currentHour >= 5 && currentHour < 12) {
          greeting = "Good morning! How are you feeling today?";
        } else if (currentHour >= 12 && currentHour < 18) {
          greeting = "Good afternoon! How's everything going?";
        } else {
          greeting = "Good evening! I hope your day has been okay so far.";
        }
        addMessage('bot', greeting);
      } catch (error) {
        console.error('Error loading chat data:', error);
        addMessage('bot', 'I apologize, but I had trouble loading. Please try refreshing the page.');
      }
    };

    loadData();
  }, []);

  // Add message to chat
  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { sender, text }]);
  };

  // Handle initial greeting response
  const handleInitialGreetingResponse = (response) => {
    if (!chatbotData || !chatbotData.greeting_reactions) {
      addMessage('bot', "I'm sorry, I'm still loading. Please try again in a moment.");
      return;
    }

    const lowerResponse = response.toLowerCase();
    let sentiment = 'neutral';

    if (lowerResponse.includes('good') || lowerResponse.includes('great') || lowerResponse.includes('wonderful')) {
      sentiment = 'good';
    } else if (lowerResponse.includes('okay') || lowerResponse.includes('fine')) {
      sentiment = 'okay';
    } else if (lowerResponse.includes('bad') || lowerResponse.includes('terrible') || lowerResponse.includes('not')) {
      sentiment = 'bad';
    }

    const reactions = chatbotData.greeting_reactions[sentiment] || 
                     chatbotData.greeting_reactions.neutral || 
                     ["I'm here to listen and help."];
                     
    const selectedResponse = Array.isArray(reactions) ? 
      reactions[Math.floor(Math.random() * reactions.length)] : 
      "I'm here to listen and help.";

    addMessage('bot', selectedResponse);
    addMessage('bot', "Would you like to answer some questions to help me better understand how you're feeling? (yes/no)");
  };

  // Handle user response
  const handleUserResponse = async () => {
    if (!userResponse.trim() || !dataLoaded) return;

    setIsLoading(true);
    addMessage('user', userResponse);
    const response = userResponse.trim().toLowerCase();
    setUserResponse('');

    try {
      if (!assessmentStarted) {
        if (response.includes('yes') || response.includes('y')) {
          setAssessmentStarted(true);
          addMessage('bot', "Thank you for being willing to share. I'm going to ask you some questions about how you've been feeling.");
          if (dassData && dassData.questions && dassData.questions[currentQuestion]) {
            addMessage('bot', dassData.questions[currentQuestion]);
          }
        } else if (response.includes('no') || response.includes('n')) {
          addMessage('bot', "That's perfectly fine! Sometimes just chatting is enough. I'm here whenever you need me.");
        } else {
          handleInitialGreetingResponse(response);
        }
      } else {
        if (!dassData || !dassData.questions || !dassData.categories) {
          addMessage('bot', "I'm sorry, I'm having trouble accessing the assessment questions. Please try refreshing the page.");
          setIsLoading(false);
          return;
        }

        const score = extractScoreFromResponse(response);
        if (score !== null) {
          setResponses(prev => [...prev, [score, categoryMapping[dassData.categories[currentQuestion]]]]);
          
          if (currentQuestion < dassData.questions.length - 1) {
            setCurrentQuestion(prev => prev + 1);
            addMessage('bot', dassData.questions[currentQuestion + 1]);
          } else {
            const scores = calculateScores([...responses, [score, categoryMapping[dassData.categories[currentQuestion]]]]);
            provideFeedback(scores);
            setAssessmentStarted(false);
            setCurrentQuestion(0);
            setResponses([]);
          }
        } else {
          addMessage('bot', "I'm having trouble understanding your response. Could you please rephrase it using terms like 'never', 'sometimes', 'often', or 'frequently'?");
        }
      }
    } catch (error) {
      console.error('Error handling response:', error);
      addMessage('bot', "I'm sorry, something went wrong. Please try again.");
    }

    setIsLoading(false);
  };

  // Auto-scroll effect
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className={`chat-screen ${darkMode ? 'dark' : ''}`}>
      <header>
        <h2>StressGuru Chat</h2>
        <div className="header-actions">
          <button onClick={() => setDarkMode(!darkMode)} className="dark-mode-toggle">
            {darkMode ? '🌞' : '🌙'}
          </button>
          <button className="logout-btn" onClick={() => navigate('welcome')}>
            <FiLogOut />
          </button>
        </div>
      </header>
      <div className="chat-window" ref={chatWindowRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`message-bubble ${msg.sender}`}>
            <div className="message-text">{msg.text}</div>
          </div>
        ))}
      </div>
      <div className="message-input">
        <input 
          type="text" 
          placeholder={dataLoaded ? "Type a message..." : "Loading..."}
          value={userResponse}
          onChange={(e) => setUserResponse(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !isLoading && userResponse.trim() && handleUserResponse()}
          disabled={isLoading || !dataLoaded}
        />
        <button 
          onClick={handleUserResponse}
          disabled={isLoading || !userResponse.trim() || !dataLoaded}
        >
          {isLoading ? '...' : '🚀'}
        </button>
      </div>
    </div>
  );
};

export default App;
