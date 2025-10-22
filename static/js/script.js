document.addEventListener("DOMContentLoaded", async () => {
  // Backend URL (for Render deployment or local)
  const BACKEND_URL = window.location.origin; // Dynamically get the base URL

  // --- Get elements (use guards; some may not exist depending on page) ---
  const authOverlay = document.getElementById("auth-overlay");
  const loginSection = document.getElementById("login-section");
  const registerSection = document.getElementById("register-section");
  const showRegisterLink = document.getElementById("show-register");
  const showLoginLink = document.getElementById("show-login");
  const loginButton = document.getElementById("login-button");
  const registerButton = document.getElementById("register-button");
  const loginUsernameInput = document.getElementById("login-username");
  const loginPasswordInput = document.getElementById("login-password");
  const registerUsernameInput = document.getElementById("register-username");
  const registerPasswordInput = document.getElementById("register-password");
  const loginMessage = document.getElementById("login-message");
  const registerMessage = document.getElementById("register-message");
  const displayUsername = document.getElementById("display-username");

  const appContainer = document.querySelector(".app-container");
  const logoutButton = document.getElementById("logout-button");

  // Task related elements
  const taskList = document.querySelector(".task-list");
  const addTaskButton = document.getElementById("add-task-button");
  const addModalOverlay = document.getElementById("add-task-modal-overlay");
  const saveTaskButton = document.getElementById("save-task-button");
  const cancelTaskButton = document.getElementById("cancel-task-button");
  const taskNameInput = document.getElementById("task-name-input");
  const taskCategoryInput = document.getElementById("task-category-input");
  const taskDueDateInput = document.getElementById("task-due-date-input");
  const taskDueTimeInput = document.getElementById("task-due-time-input");
  const tasksLeftCount = document.getElementById("tasks-left-count");
  let editingTaskId = null; // To store the ID of the task being edited

  // Progress circle elements
  const progressCircle = document.querySelector(".progress-ring-progress");
  let circumference = 0; // Define circumference in a broader scope with a default value
  if (
    progressCircle &&
    progressCircle.r &&
    typeof progressCircle.r.baseVal?.value === "number"
  ) {
    circumference = 2 * Math.PI * progressCircle.r.baseVal.value;
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = circumference; // Start as full circle
  }

  // Streak and Daily Summary
  const tasksCompletedTodaySpan = document.getElementById(
    "tasks-completed-today"
  );
  const tasksTotalTodaySpan = document.getElementById("tasks-total-today");
  const currentStreakSpan = document.getElementById("current-streak");
  // completionSound might not exist on disk; guard it
  let completionSound;
  try {
    completionSound = new Audio("/static/sounds/ding.mp3");
  } catch (err) {
    completionSound = null;
  }

  // Notes related elements
  const notesButton = document.getElementById("notes-button");
  const tasksView = document.getElementById("tasks-view");
  const notesView = document.getElementById("notes-view");
  const backToTasksButton = document.getElementById("back-to-tasks-button");
  const notesDisplayArea = document.querySelector(".notes-display-area");
  const addNoteButton = document.getElementById("add-note-button");
  const addNoteModalOverlay = document.getElementById("add-note-modal-overlay");
  const noteModalTitle = document.getElementById("note-modal-title");
  const noteTopicInput = document.getElementById("note-topic-input");
  const noteDateInput = document.getElementById("note-date-input");
  const noteContentInput = document.getElementById("note-content-input");
  const saveNoteButton = document.getElementById("save-note-button");
  const cancelNoteButton = document.getElementById("cancel-note-button");
  let editingNoteId = null; // To store the ID of the note being edited

  // New: Search Notes Button
  const searchNotesButton = document.getElementById("search-notes-button");
  // New: Download Notes Button
  const downloadNotesButton = document.getElementById("download-notes-button");

  // Calendar Elements
  const monthYearDisplay = document.getElementById("month-year");
  const calendarGrid = document.getElementById("calendar-grid");
  const prevMonthBtn = document.getElementById("prevMonth");
  const nextMonthBtn = document.getElementById("nextMonth");
  let currentCalendarDate = new Date(); // To keep track of the displayed month

  // Digital Clock Elements
  const digitalClock = document.getElementById("digital-clock");
  const timeFormatSelect = document.getElementById("time-format-select");

  // Fun Fact Elements
  const funFactDisplay = document.getElementById("fun-fact-display");
  const generateFactButton = document.getElementById("generate-fact-button");

  // --- Utility Functions ---
  async function apiRequest(url, method = "GET", data = null) {
    try {
      const options = {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
      };
      if (data) {
        options.body = JSON.stringify(data);
      }
      const response = await fetch(url, options);

      // Some endpoints may return no JSON (e.g., file download), so only parse JSON when Content-Type indicates it
      const contentType = response.headers.get("content-type") || "";
      if (response.ok) {
        if (contentType.includes("application/json")) {
          return await response.json();
        } else {
          // Return raw response if not JSON (caller can decide)
          return response;
        }
      } else {
        // Try to parse JSON error, but fall back gracefully
        if (contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || JSON.stringify(errorData) || response.statusText
          );
        } else {
          const text = await response.text().catch(() => "");
          throw new Error(
            text || response.statusText || `HTTP ${response.status}`
          );
        }
      }
    } catch (error) {
      console.error("API Request Error:", error);
      throw error;
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // fallback to original if invalid
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatTime(timeString) {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    if (hours == null || minutes == null) return timeString;
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  // --- Authentication Logic ---
  if (showRegisterLink) {
    showRegisterLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (loginSection) loginSection.style.display = "none";
      if (registerSection) registerSection.style.display = "block";
      if (loginMessage) loginMessage.textContent = ""; // Clear messages
      if (registerMessage) registerMessage.textContent = "";
    });
  }

  if (showLoginLink) {
    showLoginLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (registerSection) registerSection.style.display = "none";
      if (loginSection) loginSection.style.display = "block";
      if (loginMessage) loginMessage.textContent = ""; // Clear messages
      if (registerMessage) registerMessage.textContent = "";
    });
  }

  if (loginButton) {
    loginButton.addEventListener("click", async () => {
      const username = loginUsernameInput ? loginUsernameInput.value : "";
      const password = loginPasswordInput ? loginPasswordInput.value : "";
      try {
        const data = await apiRequest(`${BACKEND_URL}/login`, "POST", {
          username,
          password,
        });
        // Some backends reply with JSON; check message property safely
        if (data && data.message === "Login successful") {
          localStorage.setItem("isAuthenticated", "true");
          localStorage.setItem("username", username);
          if (authOverlay) authOverlay.style.display = "none";
          if (appContainer) appContainer.style.display = "flex"; // Show main app
          if (displayUsername) displayUsername.textContent = username;
          fetchTasks(); // Load tasks after login
          fetchNotes(); // Load notes after login
        } else {
          if (loginMessage)
            loginMessage.textContent = data?.error || "Login failed";
        }
      } catch (error) {
        if (loginMessage)
          loginMessage.textContent = error.message || "Login failed";
        console.error("Login Error:", error);
      }
    });
  }

  if (registerButton) {
    registerButton.addEventListener("click", async () => {
      const username = registerUsernameInput ? registerUsernameInput.value : "";
      const password = registerPasswordInput ? registerPasswordInput.value : "";
      try {
        const data = await apiRequest(`${BACKEND_URL}/register`, "POST", {
          username,
          password,
        });
        if (data && data.message === "Registration successful") {
          if (registerMessage) {
            registerMessage.textContent =
              "Registration successful! You can now log in.";
            registerMessage.style.color = "green";
          }
          // Optionally switch to login screen after successful registration
          setTimeout(() => {
            if (loginSection) loginSection.style.display = "block";
            if (registerSection) registerSection.style.display = "none";
            if (registerMessage) registerMessage.textContent = "";
          }, 1500);
        } else {
          if (registerMessage) {
            registerMessage.textContent = data?.error || "Registration failed";
            registerMessage.style.color = "red";
          }
        }
      } catch (error) {
        if (registerMessage) {
          registerMessage.textContent = error.message || "Registration failed";
          registerMessage.style.color = "red";
        }
        console.error("Register Error:", error);
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      try {
        await apiRequest(`${BACKEND_URL}/logout`, "POST");
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("username");
        if (authOverlay) authOverlay.style.display = "flex"; // Show auth screen
        if (appContainer) appContainer.style.display = "none"; // Hide main app
        if (loginUsernameInput) loginUsernameInput.value = "";
        if (loginPasswordInput) loginPasswordInput.value = "";
        if (loginMessage) loginMessage.textContent = "";
      } catch (error) {
        console.error("Logout Error:", error);
        alert("Logout failed. Please try again.");
      }
    });
  }

  // --- Task Management Functions ---
  async function fetchTasks() {
    try {
      const tasksResp = await apiRequest(`${BACKEND_URL}/tasks`);
      // apiRequest returns response for non-json; ensure tasks is array
      const tasks = Array.isArray(tasksResp)
        ? tasksResp
        : (await (tasksResp.json?.() || tasksResp)) || [];
      renderTasks(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      // If it's a 401 Unauthorized, redirect to login
      if (
        String(error.message).includes("401") ||
        String(error.message).toLowerCase().includes("unauthorized")
      ) {
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("username");
        if (authOverlay) authOverlay.style.display = "flex";
        if (appContainer) appContainer.style.display = "none";
      }
      if (taskList)
        taskList.innerHTML =
          '<p style="color: #888; text-align: center;">Failed to load tasks. Please log in.</p>';
      if (tasksLeftCount) tasksLeftCount.textContent = "0";
      if (progressCircle) progressCircle.style.strokeDashoffset = circumference;
    }
  }

  function renderTasks(tasks = []) {
    // default to empty array
    if (!taskList) return;
    taskList.innerHTML = "";
    let activeTasks = 0;
    let totalTasks = tasks.length;
    let tasksCompletedToday = 0;
    let tasksTotalToday = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date to midnight

    tasks.forEach((task) => {
      const taskItem = document.createElement("div");
      taskItem.classList.add("task-item");
      if (task.id !== undefined) taskItem.dataset.id = task.id; // Store task ID for updates/deletes

      // Apply 'completed' class if task is inactive (defensive: coerce undefined to true=active)
      const isActive =
        task.isActive !== undefined ? Boolean(task.isActive) : true;
      if (!isActive) {
        taskItem.classList.add("completed");
      }

      // Check for overdue or due soon
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        if (!isNaN(dueDate.getTime())) {
          dueDate.setHours(0, 0, 0, 0); // Normalize task due date

          if (dueDate < today && isActive) {
            taskItem.classList.add("overdue");
          } else if (dueDate.getTime() === today.getTime() && isActive) {
            taskItem.classList.add("due-soon"); // Or 'due-today'
          }
        }
      }

      const taskInfo = document.createElement("div");
      taskInfo.classList.add("task-info");

      const taskName = document.createElement("span");
      taskName.classList.add("task-name");
      taskName.textContent = task.name || "Untitled Task";
      taskName.title = "Double-click to edit"; // Tooltip for editing

      const taskCategory = document.createElement("span");
      taskCategory.classList.add("task-category");
      taskCategory.textContent = task.category || "";

      const taskDueDate = document.createElement("span");
      taskDueDate.classList.add("task-due-date");
      if (task.dueDate) {
        let dueText = `Due: ${formatDate(task.dueDate)}`;
        if (task.dueTime) {
          dueText += ` at ${formatTime(task.dueTime)}`;
        }
        taskDueDate.textContent = dueText;
      } else {
        taskDueDate.textContent = "No due date";
      }

      taskInfo.appendChild(taskName);
      taskInfo.appendChild(taskCategory);
      taskInfo.appendChild(taskDueDate);

      const taskStatus = document.createElement("div");
      taskStatus.classList.add("task-status");

      const statusLabel = document.createElement("span");
      statusLabel.classList.add("status-label");
      statusLabel.textContent = isActive ? "ACTIVE" : "COMPLETED";
      statusLabel.classList.add(isActive ? "active" : "completed-status");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.classList.add("task-checkbox");
      checkbox.checked = !isActive; // Checkbox is checked if task is NOT active

      const deleteButton = document.createElement("button");
      deleteButton.classList.add("remove-task-btn");
      deleteButton.textContent = "X";

      taskStatus.appendChild(statusLabel);
      taskStatus.appendChild(checkbox);
      taskStatus.appendChild(deleteButton);

      taskItem.appendChild(taskInfo);
      taskItem.appendChild(taskStatus);
      taskList.appendChild(taskItem);

      if (isActive) {
        activeTasks++;
      }

      // Update daily tasks and streak
      if (task.completedAt) {
        const completedDate = new Date(task.completedAt);
        completedDate.setHours(0, 0, 0, 0);
        if (completedDate.getTime() === today.getTime()) {
          tasksCompletedToday++;
        }
      }
      if (task.createdAt) {
        // Assuming createdAt reflects the day the task was "set" for
        const createdDate = new Date(task.createdAt);
        if (!isNaN(createdDate.getTime())) {
          createdDate.setHours(0, 0, 0, 0);
          if (createdDate.getTime() === today.getTime()) {
            tasksTotalToday++;
          }
        }
      }

      // Double-click to edit (Task Name and Category)
      taskName.addEventListener("dblclick", (e) =>
        startEditingTask(e.target.closest(".task-item"), "name")
      );
      taskCategory.addEventListener("dblclick", (e) =>
        startEditingTask(e.target.closest(".task-item"), "category")
      );
      taskDueDate.addEventListener("dblclick", (e) =>
        startEditingTask(e.target.closest(".task-item"), "dueDate")
      );

      // Checkbox event listener (mark as complete/incomplete)
      checkbox.addEventListener("change", async () => {
        const taskId = taskItem.dataset.id;
        const isChecked = checkbox.checked; // true if now completed
        try {
          await apiRequest(`${BACKEND_URL}/tasks/${taskId}`, "PUT", {
            isActive: !isChecked,
          });
          if (isChecked && completionSound) {
            // attempt to play (may be blocked by browser until user interacts)
            completionSound.play().catch(() => {
              /* ignore autoplay blocks */
            });
          }
          fetchTasks(); // Re-fetch and re-render all tasks to update UI
        } catch (error) {
          console.error("Error updating task status:", error);
          checkbox.checked = !isChecked; // Revert checkbox state on error
        }
      });

      // Delete button event listener
      deleteButton.addEventListener("click", async () => {
        const taskId = taskItem.dataset.id;
        if (!taskId) return;
        if (confirm("Are you sure you want to delete this task?")) {
          try {
            await apiRequest(`${BACKEND_URL}/tasks/${taskId}`, "DELETE");
            fetchTasks(); // Re-fetch and re-render all tasks
          } catch (error) {
            console.error("Error deleting task:", error);
          }
        }
      });
    });

    // Update progress circle
    if (tasksLeftCount) tasksLeftCount.textContent = activeTasks;
    if (totalTasks > 0 && progressCircle) {
      const progress = (totalTasks - activeTasks) / totalTasks;
      const offset = circumference * (1 - progress);
      progressCircle.style.strokeDashoffset = offset;
    } else if (progressCircle) {
      progressCircle.style.strokeDashoffset = circumference; // Full circle if no tasks
    }

    // Update daily summary
    if (tasksCompletedTodaySpan)
      tasksCompletedTodaySpan.textContent = tasksCompletedToday;
    if (tasksTotalTodaySpan) tasksTotalTodaySpan.textContent = tasksTotalToday;

    // Update streak
    updateStreak();
  }

  async function startEditingTask(taskItem, fieldToEdit) {
    if (!taskItem || taskItem.classList.contains("editing")) return; // Prevent multiple edits or missing element

    taskItem.classList.add("editing");
    const taskId = taskItem.dataset.id;

    const taskNameSpan = taskItem.querySelector(".task-name");
    const taskCategorySpan = taskItem.querySelector(".task-category");
    const taskDueDateSpan = taskItem.querySelector(".task-due-date");
    const taskInfoDiv = taskItem.querySelector(".task-info");

    const currentName = taskNameSpan ? taskNameSpan.textContent : "";
    const currentCategory = taskCategorySpan
      ? taskCategorySpan.textContent
      : "";
    const currentDueDateText = taskDueDateSpan
      ? taskDueDateSpan.textContent
      : "";

    let currentDueDate = "";
    let currentDueTime = "";
    if (currentDueDateText && currentDueDateText.startsWith("Due: ")) {
      const dateAndTime = currentDueDateText.substring(5); // "Month D, YYYY at HH:MM AM/PM"
      const atIndex = dateAndTime.indexOf(" at ");
      if (atIndex !== -1) {
        currentDueDate = dateAndTime.substring(0, atIndex).trim();
        currentDueTime = dateAndTime.substring(atIndex + 4).trim();
      } else {
        currentDueDate = dateAndTime.trim();
      }
    }

    if (!taskInfoDiv) {
      taskItem.classList.remove("editing");
      return;
    }

    taskInfoDiv.innerHTML = ""; // Clear current info

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.classList.add("edit-input");
    nameInput.value = currentName;

    const categoryInput = document.createElement("input");
    categoryInput.type = "text";
    categoryInput.classList.add("edit-input");
    categoryInput.value = currentCategory;

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.classList.add("edit-input");
    // Convert to YYYY-MM-DD for date input
    if (currentDueDate) {
      const dateObj = new Date(currentDueDate);
      if (!isNaN(dateObj.getTime())) {
        dateInput.value = dateObj.toISOString().split("T")[0];
      }
    }

    const timeInput = document.createElement("input");
    timeInput.type = "time";
    timeInput.classList.add("edit-input");
    // Convert "HH:MM AM/PM" to "HH:MM" for time input
    if (currentDueTime) {
      const timeParts = currentDueTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (timeParts) {
        let hours = parseInt(timeParts[1], 10);
        const minutes = timeParts[2];
        const ampm = timeParts[3] ? timeParts[3].toUpperCase() : "";

        if (ampm === "PM" && hours < 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0; // 12 AM is 00 hours

        timeInput.value = `${String(hours).padStart(2, "0")}:${minutes}`;
      }
    }

    const saveButton = document.createElement("button");
    saveButton.classList.add("edit-save-btn");
    saveButton.textContent = "Save";

    const cancelButton = document.createElement("button");
    cancelButton.classList.add("edit-cancel-btn");
    cancelButton.textContent = "Cancel";

    const editActions = document.createElement("div");
    editActions.classList.add("edit-actions");
    editActions.appendChild(saveButton);
    editActions.appendChild(cancelButton);

    taskInfoDiv.appendChild(nameInput);
    taskInfoDiv.appendChild(categoryInput);
    taskInfoDiv.appendChild(dateInput);
    taskInfoDiv.appendChild(timeInput);
    taskInfoDiv.appendChild(editActions);

    // Focus on the input field that was double-clicked
    if (fieldToEdit === "name") nameInput.focus();
    else if (fieldToEdit === "category") categoryInput.focus();
    else if (fieldToEdit === "dueDate") dateInput.focus();

    saveButton.addEventListener("click", async () => {
      const updatedData = {
        name: nameInput.value,
        category: categoryInput.value,
        dueDate: dateInput.value || null, // Send null if empty
        dueTime: timeInput.value || null, // Send null if empty
      };
      try {
        if (taskId) {
          await apiRequest(
            `${BACKEND_URL}/tasks/${taskId}`,
            "PUT",
            updatedData
          );
        }
        fetchTasks(); // Re-render tasks after update
      } catch (error) {
        console.error("Error saving task edit:", error);
        alert("Failed to save task. Please try again.");
      } finally {
        taskItem.classList.remove("editing");
      }
    });

    cancelButton.addEventListener("click", () => {
      taskItem.classList.remove("editing");
      fetchTasks(); // Re-render to revert changes
    });
  }

  if (addTaskButton) {
    addTaskButton.addEventListener("click", () => {
      editingTaskId = null; // Clear editing state
      // Clear input fields for new task
      if (taskNameInput) taskNameInput.value = "";
      if (taskCategoryInput) taskCategoryInput.value = "";
      if (taskDueDateInput) taskDueDateInput.value = "";
      if (taskDueTimeInput) taskDueTimeInput.value = "";
      if (addModalOverlay) addModalOverlay.style.display = "flex"; // Show modal
    });
  }

  if (cancelTaskButton) {
    cancelTaskButton.addEventListener("click", () => {
      if (addModalOverlay) addModalOverlay.style.display = "none"; // Hide modal
    });
  }

  if (saveTaskButton) {
    saveTaskButton.addEventListener("click", async () => {
      const name = taskNameInput ? taskNameInput.value : "";
      const category = taskCategoryInput ? taskCategoryInput.value : "";
      const dueDate = taskDueDateInput ? taskDueDateInput.value || null : null;
      const dueTime = taskDueTimeInput ? taskDueTimeInput.value || null : null;

      if (!name) {
        alert("Task name cannot be empty!");
        return;
      }

      const taskData = { name, category, dueDate, dueTime };

      try {
        if (editingTaskId) {
          await apiRequest(
            `${BACKEND_URL}/tasks/${editingTaskId}`,
            "PUT",
            taskData
          );
        } else {
          await apiRequest(`${BACKEND_URL}/tasks`, "POST", taskData);
        }
        if (addModalOverlay) addModalOverlay.style.display = "none";
        fetchTasks(); // Refresh tasks
      } catch (error) {
        console.error("Error saving task:", error);
        alert("Failed to save task. Please try again.");
      }
    });
  }

  // --- Streak Calculation ---
  async function updateStreak() {
    if (!currentStreakSpan) return;
    try {
      const data = await apiRequest(`${BACKEND_URL}/streak`);
      // apiRequest might return response object when not JSON; handle safe
      const streakData =
        data && data.current_streak !== undefined
          ? data
          : (await (data.json?.() || data)) || {};
      currentStreakSpan.textContent = streakData.current_streak ?? "0";
      if (streakData.current_streak > 0 && streakData.streak_broken) {
        currentStreakSpan.classList.add("broken"); // Add a class for styling broken streak
      } else {
        currentStreakSpan.classList.remove("broken");
      }
    } catch (error) {
      console.error("Error fetching streak:", error);
      currentStreakSpan.textContent = "N/A";
    }
  }

  // --- Notes Management Functions ---
  if (notesButton && tasksView && notesView) {
    notesButton.addEventListener("click", () => {
      tasksView.style.display = "none";
      notesView.style.display = "flex";
      fetchNotes(); // Fetch and display notes when switching
    });
  }

  if (backToTasksButton && tasksView && notesView) {
    backToTasksButton.addEventListener("click", () => {
      notesView.style.display = "none";
      tasksView.style.display = "flex";
    });
  }

  if (searchNotesButton) {
    searchNotesButton.addEventListener("click", () => {
      // Open Google in a new tab
      window.open("https://www.google.com", "_blank");
    });
  }

    // Download Notes Button
    if (downloadNotesButton) {
        downloadNotesButton.addEventListener('click', () => {
            downloadNotes();
        });
    }

  async function fetchNotes() {
    try {
      const notesResp = await apiRequest(`${BACKEND_URL}/notes`);
      const notes = Array.isArray(notesResp)
        ? notesResp
        : (await (notesResp.json?.() || notesResp)) || [];
      renderNotes(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      if (notesDisplayArea)
        notesDisplayArea.innerHTML =
          '<p style="color: #888; text-align: center;">Failed to load notes. Please log in.</p>';
    }
  }

  // --- Download Notes Function ---
  async function downloadNotes() {
    if (!downloadNotesButton) return;

    try {
      // Show loading state
      downloadNotesButton.disabled = true;
      const originalText = downloadNotesButton.innerHTML;
      downloadNotesButton.innerHTML = "Downloading...";

      // Fetch the PDF file
      const response = await fetch(`${BACKEND_URL}/download-notes`, {
        method: "GET",
        credentials: "include", // Important for session cookies
      });

      if (!response.ok) {
        throw new Error("Failed to download notes");
      }

      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "my_notes.pdf";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Convert response to blob
      const blob = await response.blob();

      // Create a temporary download link and trigger it
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Reset button state
      downloadNotesButton.disabled = false;
      downloadNotesButton.innerHTML = originalText;

      console.log("Notes downloaded successfully!");
    } catch (error) {
      console.error("Error downloading notes:", error);
      alert("Failed to download notes. Please try again.");

      // Reset button state on error
      if (downloadNotesButton) {
        downloadNotesButton.disabled = false;
        downloadNotesButton.innerHTML = originalText || "Download";
      }
    }
  }

  function renderNotes(notes = []) {
    if (!notesDisplayArea) return;
    notesDisplayArea.innerHTML = "";
    if (!Array.isArray(notes) || notes.length === 0) {
      notesDisplayArea.innerHTML =
        '<p style="color: #888; text-align: center; margin-top: 50px;">No notes yet. Click "+" to add one!</p>';
      return;
    }

    // Group notes by date (use formatted date as key)
    const notesByDate = {};
    notes.forEach((note) => {
      const dateKey = formatDate(note.date) || "No date";
      if (!notesByDate[dateKey]) {
        notesByDate[dateKey] = [];
      }
      notesByDate[dateKey].push(note);
    });

    // Render notes grouped by date
    for (const dateKey in notesByDate) {
      const categoryHeading = document.createElement("h2");
      categoryHeading.classList.add("note-category-heading");
      categoryHeading.textContent = dateKey;
      notesDisplayArea.appendChild(categoryHeading);

      notesByDate[dateKey].forEach((note) => {
        const noteItem = document.createElement("div");
        noteItem.classList.add("note-item");
        if (note.id !== undefined) noteItem.dataset.id = note.id;

        const noteTopic = document.createElement("div");
        noteTopic.classList.add("note-topic");
        noteTopic.textContent = note.topic || "Untitled";

        const noteDateDisplay = document.createElement("div");
        noteDateDisplay.classList.add("note-date-display");
        noteDateDisplay.textContent = formatDate(note.date);

        const noteContentPreview = document.createElement("div");
        noteContentPreview.classList.add("note-content-preview");
        noteContentPreview.textContent = note.content || "";

        const noteActions = document.createElement("div");
        noteActions.classList.add("note-actions");

        const editButton = document.createElement("button");
        editButton.classList.add("note-edit-btn");
        editButton.textContent = "Edit";

        const deleteButton = document.createElement("button");
        deleteButton.classList.add("note-delete-btn");
        deleteButton.textContent = "Delete";

        noteActions.appendChild(editButton);
        noteActions.appendChild(deleteButton);

        noteItem.appendChild(noteTopic);
        noteItem.appendChild(noteDateDisplay);
        noteItem.appendChild(noteContentPreview);
        noteItem.appendChild(noteActions);

        notesDisplayArea.appendChild(noteItem);

        // Event Listeners for Notes
        editButton.addEventListener("click", (e) => {
          e.stopPropagation(); // Prevent item click from triggering
          openNoteModal(note);
        });

        deleteButton.addEventListener("click", async (e) => {
          e.stopPropagation(); // Prevent item click from triggering
          if (!note.id) return;
          if (confirm("Are you sure you want to delete this note?")) {
            try {
              await apiRequest(`${BACKEND_URL}/notes/${note.id}`, "DELETE");
              fetchNotes();
            } catch (error) {
              console.error("Error deleting note:", error);
              alert("Failed to delete note. Please try again.");
            }
          }
        });
      });
    }
  }

  if (addNoteButton) {
    addNoteButton.addEventListener("click", () => {
      openNoteModal();
    });
  }

  if (cancelNoteButton) {
    cancelNoteButton.addEventListener("click", () => {
      if (addNoteModalOverlay) addNoteModalOverlay.style.display = "none";
    });
  }

  if (saveNoteButton) {
    saveNoteButton.addEventListener("click", async () => {
      const topic = noteTopicInput ? noteTopicInput.value : "";
      const date = noteDateInput ? noteDateInput.value || null : null;
      const content = noteContentInput ? noteContentInput.value : "";

      if (!topic || !content) {
        alert("Note topic and content cannot be empty!");
        return;
      }

      const noteData = { topic, date, content };

      try {
        if (editingNoteId) {
          await apiRequest(
            `${BACKEND_URL}/notes/${editingNoteId}`,
            "PUT",
            noteData
          );
        } else {
          await apiRequest(`${BACKEND_URL}/notes`, "POST", noteData);
        }
        if (addNoteModalOverlay) addNoteModalOverlay.style.display = "none";
        fetchNotes();
      } catch (error) {
        console.error("Error saving note:", error);
        alert("Failed to save note. Please try again.");
      }
    });
  }

  function openNoteModal(note = null) {
    if (!addNoteModalOverlay) return;
    if (note) {
      editingNoteId = note.id;
      if (noteModalTitle) noteModalTitle.textContent = "Edit Note";
      if (noteTopicInput) noteTopicInput.value = note.topic || "";
      if (noteDateInput) noteDateInput.value = note.date || "";
      if (noteContentInput) noteContentInput.value = note.content || "";
    } else {
      editingNoteId = null;
      if (noteModalTitle) noteModalTitle.textContent = "Add New Note";
      if (noteTopicInput) noteTopicInput.value = "";
      if (noteDateInput)
        noteDateInput.value = new Date().toISOString().split("T")[0]; // Default to today
      if (noteContentInput) noteContentInput.value = "";
    }
    addNoteModalOverlay.style.display = "flex";
  }

  // --- Calendar Functions ---
  function renderCalendar() {
    if (!calendarGrid || !monthYearDisplay) return;
    calendarGrid.innerHTML = "";
    monthYearDisplay.textContent = currentCalendarDate.toLocaleDateString(
      "en-US",
      {
        month: "long",
        year: "numeric",
      }
    );

    const firstDayOfMonth = new Date(
      currentCalendarDate.getFullYear(),
      currentCalendarDate.getMonth(),
      1
    );
    const lastDayOfMonth = new Date(
      currentCalendarDate.getFullYear(),
      currentCalendarDate.getMonth() + 1,
      0
    );
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday...

    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      const emptyCell = document.createElement("div");
      emptyCell.classList.add("calendar-day", "inactive");
      calendarGrid.appendChild(emptyCell);
    }

    // Add days of the month
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateid = new Date(
        currentCalendarDate.getFullYear(),
        currentCalendarDate.getMonth(),
        day
      );
      const dayCell = document.createElement("div");
      dayCell.classList.add("calendar-day");
      dayCell.textContent = day;

      if (dateid.getTime() === today.getTime()) {
        dayCell.classList.add("today");
      }
      calendarGrid.appendChild(dayCell);
    }
  }

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      renderCalendar();
    });
  }
  if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      renderCalendar();
    });
  }

  // --- Digital Clock Functions ---
  function updateDigitalClock() {
    if (!digitalClock) return;
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    let ampm = "";

    const format =
      timeFormatSelect && timeFormatSelect.value
        ? timeFormatSelect.value
        : "24h";

    if (format === "12h") {
      ampm = hours >= 12 ? " PM" : " AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // The hour '0' should be '12'
    }

    const paddedHours = String(hours).padStart(2, "0");
    const paddedMinutes = String(minutes).padStart(2, "0");
    const paddedSeconds = String(seconds).padStart(2, "0");

    digitalClock.innerHTML = `${paddedHours}:${paddedMinutes}:${paddedSeconds}<span class="ampm">${ampm}</span>`;
  }

  // Update clock every second and initialize immediately
  updateDigitalClock();
  setInterval(updateDigitalClock, 1000);
  if (timeFormatSelect)
    timeFormatSelect.addEventListener("change", updateDigitalClock); // Update when format changes

  // --- Fun Fact / Joke Functions ---
  async function generateFunFact() {
    if (!funFactDisplay) return;
    try {
      const response = await fetch(
        "https://official-joke-api.appspot.com/random_joke"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch a joke");
      }
      const data = await response.json();
      funFactDisplay.textContent = `${data.setup} — ${data.punchline}`;
    } catch (error) {
      if (funFactDisplay)
        funFactDisplay.textContent = "Oops! Couldn't fetch a joke right now.";
      console.error(error);
    }
  }

  if (generateFactButton)
    generateFactButton.addEventListener("click", generateFunFact);

  // --- Initialization ---
  // Check authentication status on page load
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  if (isAuthenticated === "true") {
    if (authOverlay) authOverlay.style.display = "none";
    if (appContainer) appContainer.style.display = "flex"; // Show main app
    if (displayUsername)
      displayUsername.textContent = localStorage.getItem("username") || "";
    fetchTasks(); // Fetch tasks
    fetchNotes(); // Fetch notes
  } else {
    if (authOverlay) authOverlay.style.display = "flex";
    if (appContainer) appContainer.style.display = "none"; // Hide main app
  }

  // Initial renders
  renderCalendar();
  // clock already initialized + interval set
  generateFunFact(); // Display a fun fact on load (safe: function guards internal elements)
});
