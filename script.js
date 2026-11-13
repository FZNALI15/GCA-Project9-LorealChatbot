
// Cloudflare Worker endpoint
const workerUrl =
  "https://lorealchatbotworker.faizanwagpura.workers.dev/";

// Get elements from the page
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const loadingIndicator = document.getElementById("loadingIndicator");

// Save the welcome screen so it can be restored
const welcomeScreen = chatWindow.innerHTML;

// Store conversation history
let conversationHistory = [];

// Prevent multiple requests at the same time
let isLoading = false;


// =====================================
// Display messages in the chat window
// =====================================

function addMessage(message, role) {
  // Remove welcome screen when conversation starts
  const welcomeMessage = document.getElementById("welcomeMessage");

  if (welcomeMessage) {
    welcomeMessage.remove();
  }

  // Create message container
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("msg", ...role.split(" "));

  // Create sender label
  const label = document.createElement("div");
  label.classList.add("msg-label");

  if (role === "user") {
    label.textContent = "You";
  } else {
    label.textContent = "L'Oréal Beauty Advisor";
  }

  // Create message content
  const content = document.createElement("div");
  content.classList.add("msg-content");
  // Format AI responses using Markdown
  if (
    role === "ai" &&
    window.marked &&
    window.DOMPurify
  ) {
    content.innerHTML = DOMPurify.sanitize(
      marked.parse(message)
    );
  } else {
    content.textContent = message;
  }

  // Add message to the chat window
  messageDiv.appendChild(label);
  messageDiv.appendChild(content);
  chatWindow.appendChild(messageDiv);

  scrollToBottom();
}


// =====================================
// Automatically scroll to latest message
// =====================================

function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}


// =====================================
// Loading state
// =====================================

function setLoading(loading) {
  isLoading = loading;

  loadingIndicator.hidden = !loading;
  sendBtn.disabled = loading;
  userInput.disabled = loading;
  newChatBtn.disabled = loading;

  if (!loading) {
    userInput.focus();
  }
}


// =====================================
// Send message to Cloudflare Worker
// =====================================

async function sendMessage(question) {
  const message = question.trim();

  // Prevent empty or duplicate submissions
  if (!message || isLoading) {
    return;
  }

  if (message.length > 2000) {
    return;
  }

  // Display the user's question
  addMessage(message, "user");

  // Add question to conversation history
  conversationHistory.push({
    role: "user",
    content: message
  });

  // Clear input and show loading animation
  userInput.value = "";
  setLoading(true);

  try {
    // Send conversation to Cloudflare Worker
    const response = await fetch(workerUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        messages: conversationHistory.slice(-12)
      })
    });

    const data = await response.json();

    // Check for API errors
    if (!response.ok) {
      throw new Error(
        data.error || "Unable to connect to the beauty advisor."
      );
    }

    // Extract AI response
    const aiResponse = data.choices?.[0]?.message?.content;

    if (typeof aiResponse !== "string" || !aiResponse.trim()) {
      throw new Error("No response was received.");
    }

    // Display the AI response
    addMessage(aiResponse, "ai");

    // Save response to conversation history
    conversationHistory.push({
      role: "assistant",
      content: aiResponse
    });

    // Keep the most recent conversation messages
    conversationHistory = conversationHistory.slice(-12);

  } catch (error) {
    console.error("Chatbot error:", error);

    // Display a friendly error message
    addMessage(
      "I'm sorry, I couldn't generate a response right now. " +
      "Please try again in a moment.",
      "ai error"
    );

    // Remove unsuccessful question from history
    conversationHistory.pop();

    // Restore question so the user can retry
    userInput.value = message;

  } finally {
    // Hide loading animation and enable input
    setLoading(false);
    scrollToBottom();
  }
}


// =====================================
// Handle chat form submission
// =====================================

chatForm.addEventListener("submit", function (event) {
  event.preventDefault();

  sendMessage(userInput.value);
});


// =====================================
// Handle suggested questions
// =====================================

chatWindow.addEventListener("click", function (event) {
  const suggestion = event.target.closest(".suggestion-btn");

  if (suggestion && !isLoading) {
    const question = suggestion.dataset.question;

    sendMessage(question);
  }
});


// =====================================
// Start a new conversation
// =====================================

newChatBtn.addEventListener("click", function () {
  if (isLoading) {
    return;
  }

  // Clear conversation history
  conversationHistory = [];

  // Restore original welcome screen
  chatWindow.innerHTML = welcomeScreen;

  // Reset input
  userInput.value = "";

  // Hide loading indicator
  loadingIndicator.hidden = true;

  // Reset scroll position
  chatWindow.scrollTop = 0;

  userInput.focus();
});


// =====================================
// Application ready
// =====================================

console.log("L'Oréal Beauty Advisor is ready.");
