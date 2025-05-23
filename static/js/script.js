document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const USELESS_FACTS_API_URL = 'https://uselessfacts.jsph.pl/random.json?language=en';
    // IMPORTANT: Make sure this BACKEND_URL matches your deployed Flask backend URL on Render.
    const BACKEND_URL = 'https://betterlist-7xgp.onrender.com'; // This should be your Render app's URL

    // --- DOM Elements ---
    const authOverlay = document.getElementById('auth-overlay');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');
    const registerUsernameInput = document.getElementById('register-username');
    const registerPasswordInput = document.getElementById('register-password');

    const mainAppContent = document.getElementById('main-app-content');
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');

    const taskList = document.querySelector('.task-list');
    const addTaskButton = document.querySelector('.add-task-button');
    const addTaskModalOverlay = document.getElementById('add-task-modal-overlay');
    const saveNewTaskBtn = document.getElementById('save-new-task-btn');
    const cancelNewTaskBtn = document.getElementById('cancel-new-task-btn');
    const newTaskNameInput = document.getElementById('new-task-name');
    const newTaskCategoryInput = document.getElementById('new-task-category');
    const newTaskDueDateInput = document.getElementById('new-task-due-date');
    const newTaskDueTimeInput = document.getElementById('new-task-due-time');

    const tasksLeftCount = document.querySelector('.tasks-left-count');
    const progressCircle = document.querySelector('.progress-ring-progress');
    const tasksCompletedTodaySpan = document.getElementById('tasks-completed-today');
    const tasksTotalTodaySpan = document.getElementById('tasks-total-today');
    const currentStreakSpan = document.getElementById('current-streak');

    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const monthNameDisplay = document.getElementById('month-name');
    const calendarGrid = document.getElementById('calendar-grid');

    const digitalClock = document.getElementById('digital-clock');
    const timeFormatSelect = document.getElementById('time-format-select');

    const funFactDisplay = document.getElementById('fun-fact-display');
    const generateFactButton = document.getElementById('generate-fact-button');

    // New Notes Feature DOM Elements
    const showNotesButton = document.getElementById('show-notes-button');
    const addNoteButton = document.getElementById('add-note-button');
    const backToTasksButton = document.getElementById('back-to-tasks-button');
    const tasksView = document.getElementById('tasks-view');
    const notesView = document.getElementById('notes-view');
    const notesDisplayArea = document.getElementById('notes-display-area');
    const addNoteModalOverlay = document.getElementById('add-note-modal-overlay');
    const noteModalTitle = document.getElementById('note-modal-title');
    const noteIdField = document.getElementById('note-id-field');
    const noteTopicInput = document.getElementById('note-topic');
    const noteDateInput = document.getElementById('note-date');
    const noteCategorySelect = document.getElementById('note-category');
    const noteContentTextarea = document.getElementById('note-content');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const cancelNoteBtn = document.getElementById('cancel-note-btn');

    // --- Global Variables ---
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let currentStreak = 0; // Initialize streak
    // Ensure the sound file path is correct relative to the static folder
    let completionSound = new Audio('static/sounds/ding.mp3'); 

    // --- Utility Functions ---

    /**
     * Handles API requests.
     * @param {string} url - The API endpoint.
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE).
     * @param {object} [data=null] - Data to send with the request (for POST/PUT).
     * @returns {Promise<object>} - JSON response from the API.
     */
    async function apiRequest(url, method, data = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include' // Important for sending cookies (session)
        };
        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            // Handle 204 No Content for DELETE requests
            if (response.status === 204 || response.headers.get('Content-Length') === '0') {
                return {}; 
            }
            return await response.json();
        } catch (error) {
            console.error("API Request Failed:", error);
            // Implement a more user-friendly error display here
            // Using alert for simplicity, replace with custom modal
            alert(`Error: ${error.message}`); 
            throw error;
        }
    }

    /**
     * Formats a date string to YYYY-MM-DD.
     * @param {Date} date - The date object.
     * @returns {string} - Formatted date string.
     */
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Formats a time string to HH:MM.
     * @param {Date} date - The date object.
     * @returns {string} - Formatted time string.
     */
    function formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // --- Authentication Functions ---

    /**
     * Updates the UI based on authentication status.
     * @param {boolean} isAuthenticated - True if user is authenticated, false otherwise.
     * @param {string} [username=''] - The username if authenticated.
     */
    function updateAuthUI(isAuthenticated, username = '') {
        if (isAuthenticated) {
            authOverlay.style.display = 'none';
            mainAppContent.style.display = 'flex';
            // Fix: Ensure welcome message is correctly formatted
            welcomeMessage.textContent = `Welcome, @${username}!`; 
            fetchTasks(); // Fetch tasks when logged in
            fetchNotes(); // Fetch notes when logged in
            renderCalendar(currentMonth, currentYear); // Render calendar on login
            updateDigitalClock(); // Start digital clock
            fetchFunFact(); // Fetch a fun fact
        } else {
            authOverlay.style.display = 'flex';
            mainAppContent.style.display = 'none';
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            loginUsernameInput.value = '';
            loginPasswordInput.value = '';
            registerUsernameInput.value = '';
            registerPasswordInput.value = '';
        }
    }

    /**
     * Checks authentication status with the backend.
     */
    async function checkAuth() {
        try {
            const data = await apiRequest(`${BACKEND_URL}/check_auth`, 'GET');
            updateAuthUI(data.authenticated, data.username);
        } catch (error) {
            console.error("Authentication check failed:", error);
            updateAuthUI(false);
        }
    }

    /**
     * Handles user login.
     */
    async function handleLogin() {
        const username = loginUsernameInput.value;
        const password = loginPasswordInput.value;
        try {
            const data = await apiRequest(`${BACKEND_URL}/login`, 'POST', { username, password });
            updateAuthUI(true, data.username);
        } catch (error) {
            // Error handling is already in apiRequest, but can add specific UI feedback here
        }
    }

    /**
     * Handles user registration.
     */
    async function handleRegister() {
        const username = registerUsernameInput.value;
        const password = registerPasswordInput.value;
        try {
            const data = await apiRequest(`${BACKEND_URL}/register`, 'POST', { username, password });
            updateAuthUI(true, data.username);
        } catch (error) {
            // Error handling is already in apiRequest
        }
    }

    /**
     * Handles user logout.
     */
    async function handleLogout() {
        try {
            await apiRequest(`${BACKEND_URL}/logout`, 'POST');
            updateAuthUI(false);
        } catch (error) {
            // Error handling is already in apiRequest
        }
    }

    // --- Task Management Functions ---

    /**
     * Fetches tasks from the backend and renders them.
     */
    async function fetchTasks() {
        try {
            const tasks = await apiRequest(`${BACKEND_URL}/tasks`, 'GET');
            renderTasks(tasks);
            updateTaskSummary(tasks);
            updateDailySummary(tasks);
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
        }
    }

    /**
     * Renders tasks in the task list.
     * @param {Array<object>} tasks - List of task objects.
     */
    function renderTasks(tasks) {
        taskList.innerHTML = ''; // Clear existing tasks

        // Sort tasks: active first, then by due date (earliest first), then by creation date
        tasks.sort((a, b) => {
            // Active tasks first
            if (a.isActive && !b.isActive) return -1;
            if (!a.isActive && b.isActive) return 1;

            // Then by due date (earliest first)
            const dateA = a.dueDate ? new Date(a.dueDate) : null;
            const dateB = b.dueDate ? new Date(b.dueDate) : null;

            if (dateA && dateB) return dateA - dateB;
            if (dateA) return -1; // a has due date, b doesn't
            if (dateB) return 1;  // b has due date, a doesn't

            return 0; // No due dates or both have due dates and are equal
        });

        tasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.classList.add('task-item');
            taskItem.dataset.taskId = task.id;

            // Add 'completed' class if the task is not active (i.e., completed)
            if (!task.isActive) {
                taskItem.classList.add('completed');
            }

            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            const now = new Date();
            let dueDateClass = '';
            let dueText = '';

            if (dueDate) {
                const diffTime = dueDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (task.isActive) { // Only apply status if task is active
                    if (diffDays <= 0 && dueDate.toDateString() !== now.toDateString()) { // Overdue (past today, not just today)
                        dueDateClass = 'overdue';
                        dueText = `Overdue: ${formatDate(dueDate)} ${formatTime(dueDate)}`;
                    } else if (diffDays <= 3) { // Due soon (within 3 days)
                        dueDateClass = 'due-soon';
                        dueText = `Due: ${formatDate(dueDate)} ${formatTime(dueDate)}`;
                    } else {
                        dueText = `Due: ${formatDate(dueDate)} ${formatTime(dueDate)}`;
                    }
                } else { // Task is completed, just show original due date
                    dueText = `Due: ${formatDate(dueDate)} ${formatTime(dueDate)}`;
                }
            }

            // Apply due date class only if the task is active
            if (task.isActive) {
                taskItem.classList.add(dueDateClass);
            }


            taskItem.innerHTML = `
                <div class="task-info">
                    <div class="task-name">${task.name}</div>
                    <div class="task-category">${task.category}</div>
                    ${dueDate ? `<div class="task-due-date">${dueText}</div>` : ''}
                </div>
                <div class="task-status">
                    <span class="status-label ${task.isActive ? 'active' : 'completed-status'}">${task.isActive ? 'ACTIVE' : 'COMPLETED'}</span>
                    <input type="checkbox" class="task-checkbox" ${!task.isActive ? 'checked' : ''}>
                    <button class="remove-task-btn">X</button>
                </div>
            `;
            taskList.appendChild(taskItem);

            // Event listener for checkbox
            const checkbox = taskItem.querySelector('.task-checkbox');
            checkbox.addEventListener('change', async (e) => {
                const isChecked = e.target.checked;
                const taskId = taskItem.dataset.taskId;
                try {
                    await apiRequest(`${BACKEND_URL}/tasks/${taskId}`, 'PUT', { isActive: !isChecked });
                    // No direct DOM manipulation for strikethrough/status here,
                    // as fetchTasks() will re-render the entire list with the updated state.
                    if (isChecked) {
                        completionSound.play(); // Play sound on completion
                    }
                    fetchTasks(); // Re-fetch tasks after status update
                }
                catch (error) {
                    console.error("Error updating task status:", error);
                    // Revert checkbox state if API call fails
                    e.target.checked = !isChecked;
                }
            });

            // Event listener for in-line editing (click on task-info)
            const taskInfo = taskItem.querySelector('.task-info');
            taskInfo.addEventListener('click', () => {
                startEditingTask(taskItem, task);
            });

            // Event listener for remove button
            const removeBtn = taskItem.querySelector('.remove-task-btn');
            removeBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent triggering task-info click
                const taskId = taskItem.dataset.taskId;
                try {
                    await apiRequest(`${BACKEND_URL}/tasks/${taskId}`, 'DELETE');
                    fetchTasks(); // Refresh tasks after deletion
                } catch (error) {
                    console.error("Error deleting task:", error);
                }
            });
        });
    }

    /**
     * Updates the progress circle and tasks left count.
     * @param {Array<object>} tasks - List of task objects.
     */
    function updateTaskSummary(tasks) {
        const activeTasks = tasks.filter(task => task.isActive).length;
        tasksLeftCount.textContent = activeTasks;

        const totalTasks = tasks.length;
        const completedTasks = totalTasks - activeTasks;

        const circumference = 2 * Math.PI * 50; // r=50 from SVG
        progressCircle.style.strokeDasharray = circumference;

        if (totalTasks > 0) {
            const progress = completedTasks / totalTasks;
            const offset = circumference - (progress * circumference);
            progressCircle.style.strokeDashoffset = offset;
        } else {
            progressCircle.style.strokeDashoffset = circumference; // Full circle if no tasks
        }
    }

    /**
     * Updates the daily completed tasks and streak.
     * @param {Array<object>} tasks - List of task objects.
     */
    function updateDailySummary(tasks) {
        const today = formatDate(new Date());
        let completedToday = 0;
        let totalToday = 0;

        tasks.forEach(task => {
            // Count tasks due today (active or completed)
            if (task.dueDate && formatDate(new Date(task.dueDate)) === today) {
                totalToday++;
            }
            // Count completed tasks for today
            if (task.completedAt && formatDate(new Date(task.completedAt)) === today) {
                completedToday++;
            }
        });

        tasksCompletedTodaySpan.textContent = completedToday;
        tasksTotalTodaySpan.textContent = totalToday;

        // Streak logic (simplified for demonstration)
        // This would ideally involve more complex logic to track historical completion
        // For now, it's just checking if tasks were completed today.
        if (completedToday > 0) {
            // Only increment streak if it's a new day or if streak was 0 and tasks completed today
            const lastStreakDate = localStorage.getItem('lastStreakDate');
            if (lastStreakDate !== today) {
                currentStreak = (parseInt(localStorage.getItem('currentStreak') || '0') || 0) + 1;
                localStorage.setItem('currentStreak', currentStreak);
                localStorage.setItem('lastStreakDate', today); // Update last streak date
            }
            currentStreakSpan.classList.remove('broken');
            currentStreakSpan.classList.add('streak-celebration'); // Add animation
        } else {
            // Reset streak if no tasks completed today AND it's a new day since last streak update
            const lastStreakDate = localStorage.getItem('lastStreakDate');
            if (lastStreakDate && lastStreakDate !== today) { // If there was a streak and it's a new day
                currentStreak = 0;
                localStorage.setItem('currentStreak', currentStreak);
                localStorage.removeItem('lastStreakDate'); // Clear last streak date
            }
            currentStreakSpan.classList.remove('streak-celebration');
            currentStreakSpan.classList.add('broken');
        }
        currentStreakSpan.textContent = localStorage.getItem('currentStreak') || '0';
    }


    /**
     * Initiates in-line editing for a task.
     * @param {HTMLElement} taskItem - The task item div.
     * @param {object} taskData - The task object.
     */
    function startEditingTask(taskItem, taskData) {
        taskItem.classList.add('editing');
        taskItem.innerHTML = `
            <input type="text" class="edit-input task-name-edit" value="${taskData.name}" placeholder="Task Name">
            <input type="text" class="edit-input task-category-edit" value="${taskData.category || ''}" placeholder="Category">
            <input type="date" class="edit-input task-due-date-edit" value="${taskData.dueDate ? formatDate(new Date(taskData.dueDate)) : ''}">
            <input type="time" class="edit-input task-due-time-edit" value="${taskData.dueDate ? formatTime(new Date(taskData.dueDate)) : ''}">
            <div class="edit-actions">
                <button class="edit-save-btn">Save</button>
                <button class="edit-cancel-btn">Cancel</button>
            </div>
        `;

        const saveBtn = taskItem.querySelector('.edit-save-btn');
        const cancelBtn = taskItem.querySelector('.edit-cancel-btn');
        const nameInput = taskItem.querySelector('.task-name-edit');
        const categoryInput = taskItem.querySelector('.task-category-edit');
        const dueDateInput = taskItem.querySelector('.task-due-date-edit');
        const dueTimeInput = taskItem.querySelector('.task-due-time-edit');

        saveBtn.addEventListener('click', async () => {
            const newName = nameInput.value;
            const newCategory = categoryInput.value;
            const newDueDate = dueDateInput.value;
            const newDueTime = dueTimeInput.value;

            let combinedDueDate = null;
            if (newDueDate) {
                combinedDueDate = newDueTime ? `${newDueDate}T${newDueTime}` : `${newDueDate}T00:00`;
            }

            try {
                await apiRequest(`${BACKEND_URL}/tasks/${taskData.id}`, 'PUT', {
                    name: newName,
                    category: newCategory,
                    dueDate: combinedDueDate
                });
                fetchTasks(); // Re-fetch to update UI
            } catch (error) {
                console.error("Error saving task edit:", error);
            }
        });

        cancelBtn.addEventListener('click', () => {
            fetchTasks(); // Re-fetch to revert changes
        });
    }

    /**
     * Handles adding a new task.
     */
    async function handleAddTask() {
        const name = newTaskNameInput.value.trim();
        const category = newTaskCategoryInput.value.trim();
        const dueDate = newTaskDueDateInput.value;
        const dueTime = newTaskDueTimeInput.value;

        if (!name) {
            alert('Task name cannot be empty.');
            return;
        }

        let combinedDueDate = null;
        if (dueDate) {
            combinedDueDate = dueTime ? `${dueDate}T${dueTime}` : `${dueDate}T00:00`;
        }

        try {
            await apiRequest(`${BACKEND_URL}/tasks`, 'POST', {
                name: name,
                category: category,
                dueDate: combinedDueDate
            });
            // Clear inputs and hide modal AFTER successful API call
            newTaskNameInput.value = '';
            newTaskCategoryInput.value = '';
            newTaskDueDateInput.value = '';
            newTaskDueTimeInput.value = '';
            addTaskModalOverlay.style.display = 'none';
            fetchTasks(); // Refresh tasks to display the new one and update summary
        } catch (error) {
            console.error("Error adding task:", error);
        }
    }

    // --- Calendar Functions ---

    /**
     * Renders the calendar for a given month and year.
     * @param {number} month - Month (0-11).
     * @param {number} year - Full year.
     */
    function renderCalendar(month, year) {
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        monthNameDisplay.textContent = `${monthNames[month]} ${year}`;
        calendarGrid.innerHTML = '';

        const firstDay = new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday, etc.
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        const todayDate = today.getDate();
        const todayMonth = today.getMonth();
        const todayYear = today.getFullYear();

        // Add blank days for the start of the month
        for (let i = 0; i < firstDay; i++) {
            const blankDay = document.createElement('div');
            blankDay.classList.add('calendar-day', 'inactive');
            calendarGrid.appendChild(blankDay);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('calendar-day');
            dayElement.textContent = day;

            if (day === todayDate && month === todayMonth && year === todayYear) {
                dayElement.classList.add('today');
            }
            calendarGrid.appendChild(dayElement);
        }
    }

    // --- Digital Clock Functions ---

    /**
     * Updates the digital clock display.
     */
    function updateDigitalClock() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        let ampm = '';

        const format = timeFormatSelect.value;

        if (format === '12') {
            ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // The hour '0' should be '12'
        }

        digitalClock.innerHTML = `${String(hours).padStart(2, '0')}:${minutes}:${seconds} <span class="ampm">${ampm}</span>`;
    }

    // --- Fun Fact Functions ---

    /**
     * Fetches a fun fact from the API.
     */
    async function fetchFunFact() {
        try {
            const response = await fetch(USELESS_FACTS_API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            funFactDisplay.textContent = data.text;
        } catch (error) {
            console.error("Failed to fetch fun fact:", error);
            funFactDisplay.textContent = "Failed to load fun fact. Please try again.";
        }
    }

    // --- New: Notes Management Functions ---

    /**
     * Switches the view between tasks and notes.
     * @param {string} view - 'tasks' or 'notes'.
     */
    function switchView(view) {
        if (view === 'tasks') {
            tasksView.style.display = 'flex';
            notesView.style.display = 'none';
            fetchTasks(); // Refresh tasks when returning to tasks view
        } else if (view === 'notes') {
            tasksView.style.display = 'none';
            notesView.style.display = 'flex';
            fetchNotes(); // Fetch and render notes when switching to notes view
        }
    }

    /**
     * Fetches notes from the backend and renders them.
     */
    async function fetchNotes() {
        try {
            const notes = await apiRequest(`${BACKEND_URL}/notes`, 'GET');
            renderNotes(notes);
        } catch (error) {
            console.error("Failed to fetch notes:", error);
        }
    }

    /**
     * Renders notes in the notes display area, grouped by category.
     * @param {Array<object>} notes - List of note objects.
     */
    function renderNotes(notes) {
        notesDisplayArea.innerHTML = ''; // Clear existing notes

        const notesByCategory = {};
        notes.forEach(note => {
            const category = note.category || 'Uncategorized';
            if (!notesByCategory[category]) {
                notesByCategory[category] = [];
            }
            notesByCategory[category].push(note);
        });

        // Sort categories alphabetically
        const sortedCategories = Object.keys(notesByCategory).sort();

        sortedCategories.forEach(category => {
            // Create category heading
            const categoryHeading = document.createElement('h3');
            categoryHeading.classList.add('note-category-heading');
            categoryHeading.textContent = category.toUpperCase();
            notesDisplayArea.appendChild(categoryHeading);

            // Create container for notes within this category
            const categoryNotesContainer = document.createElement('div');
            categoryNotesContainer.classList.add('category-notes-container');
            notesDisplayArea.appendChild(categoryNotesContainer);

            // Sort notes within each category by date (newest first)
            notesByCategory[category].sort((a, b) => new Date(b.noteDate) - new Date(a.noteDate));

            notesByCategory[category].forEach(note => {
                const noteItem = document.createElement('div');
                noteItem.classList.add('note-item');
                noteItem.dataset.noteId = note.id;

                const noteDate = note.noteDate ? new Date(note.noteDate) : new Date(note.createdAt);

                noteItem.innerHTML = `
                    <div class="note-info-display">
                        <div class="note-topic">${note.topic}</div>
                        <div class="note-date-display">${formatDate(noteDate)}</div>
                        <div class="note-content-preview">${note.content || 'No content preview available.'}</div>
                    </div>
                    <div class="note-actions">
                        <button class="note-edit-btn">Edit</button>
                        <button class="note-delete-btn">Delete</button>
                    </div>
                `;
                categoryNotesContainer.appendChild(noteItem);

                // Event listener for editing a note
                const editBtn = noteItem.querySelector('.note-edit-btn');
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent parent click from triggering
                    openNoteModalForEdit(note);
                });

                // Event listener for deleting a note
                const deleteBtn = noteItem.querySelector('.note-delete-btn');
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation(); // Prevent parent click from triggering
                    if (confirm('Are you sure you want to delete this note?')) { // Using confirm for simplicity
                        try {
                            await apiRequest(`${BACKEND_URL}/notes/${note.id}`, 'DELETE');
                            fetchNotes(); // Refresh notes after deletion
                        } catch (error) {
                            console.error("Error deleting note:", error);
                        }
                    }
                });
            });
        });
    }

    /**
     * Opens the note modal for adding a new note.
     */
    function openNoteModalForAdd() {
        noteModalTitle.textContent = 'Add New Note';
        noteIdField.value = ''; // Clear ID for new note
        noteTopicInput.value = '';
        noteDateInput.value = formatDate(new Date()); // Default to today
        noteCategorySelect.value = 'General';
        noteContentTextarea.value = '';
        addNoteModalOverlay.style.display = 'flex';
    }

    /**
     * Opens the note modal for editing an existing note.
     * @param {object} note - The note object to edit.
     */
    function openNoteModalForEdit(note) {
        noteModalTitle.textContent = 'Edit Note';
        noteIdField.value = note.id;
        noteTopicInput.value = note.topic;
        noteDateInput.value = note.noteDate ? formatDate(new Date(note.noteDate)) : '';
        noteCategorySelect.value = note.category || 'General';
        noteContentTextarea.value = note.content;
        addNoteModalOverlay.style.display = 'flex';
    }

    /**
     * Handles saving a new or updated note.
     */
    async function handleSaveNote() {
        const noteId = noteIdField.value;
        const topic = noteTopicInput.value.trim();
        const noteDate = noteDateInput.value;
        const category = noteCategorySelect.value;
        const content = noteContentTextarea.value.trim();

        if (!topic || !noteDate) {
            alert('Note topic and date are required.');
            return;
        }

        const noteData = {
            topic: topic,
            noteDate: noteDate,
            category: category,
            content: content
        };

        try {
            if (noteId) {
                // Update existing note
                await apiRequest(`${BACKEND_URL}/notes/${noteId}`, 'PUT', noteData);
            } else {
                // Add new note
                await apiRequest(`${BACKEND_URL}/notes`, 'POST', noteData);
            }
            addNoteModalOverlay.style.display = 'none';
            fetchNotes(); // Refresh notes
        } catch (error) {
            console.error("Error saving note:", error);
        }
    }

    // --- Event Listeners ---

    // Auth
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    loginButton.addEventListener('click', handleLogin);
    registerButton.addEventListener('click', handleRegister);
    logoutButton.addEventListener('click', handleLogout);

    // Tasks
    addTaskButton.addEventListener('click', () => {
        addTaskModalOverlay.style.display = 'flex';
        newTaskNameInput.value = '';
        newTaskCategoryInput.value = '';
        newTaskDueDateInput.value = '';
        newTaskDueTimeInput.value = '';
    });

    cancelNewTaskBtn.addEventListener('click', () => {
        addTaskModalOverlay.style.display = 'none';
    });

    saveNewTaskBtn.addEventListener('click', handleAddTask);

    // Calendar
    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar(currentMonth, currentYear);
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar(currentMonth, currentYear);
    });

    // Digital Clock
    setInterval(updateDigitalClock, 1000); // Update every second
    timeFormatSelect.addEventListener('change', updateDigitalClock);

    // Fun Fact
    generateFactButton.addEventListener('click', fetchFunFact);

    // New: Notes Feature Event Listeners
    showNotesButton.addEventListener('click', () => switchView('notes'));
    addNoteButton.addEventListener('click', openNoteModalForAdd);
    backToTasksButton.addEventListener('click', () => switchView('tasks'));
    saveNoteBtn.addEventListener('click', handleSaveNote);
    cancelNoteBtn.addEventListener('click', () => {
        addNoteModalOverlay.style.display = 'none';
    });

    // --- Initial Load ---
    checkAuth(); // Check authentication status on page load
});
