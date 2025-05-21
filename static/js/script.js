document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const USELESS_FACTS_API_URL = 'https://uselessfacts.jsph.pl/random.json?language=en';
    // IMPORTANT: Make sure this BACKEND_URL matches your deployed Flask backend URL on Render.
    const BACKEND_URL = 'https://betterlist-7xgp.onrender.com'; // This should be your Render app's URL

    // --- New Auth Element References ---
    const authOverlay = document.getElementById('auth-overlay');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');
    const registerUsernameInput = document.getElementById('register-username');
    const registerPasswordInput = document.getElementById('register-password');
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const mainAppContent = document.getElementById('main-app-content');
    const logoutButton = document.getElementById('logout-button'); // Now in middle-panel

    // --- Existing Element References ---
    const tasksLeftCountSpan = document.querySelector('.tasks-left-count');
    // Progress circle elements are SVG, not canvas:
    const progressRingProgress = document.querySelector('.progress-ring-progress');
    const taskListDiv = document.querySelector('.task-list');
    const addtaskButton = document.querySelector('.add-task-button');

    // Calendar Elements
    const calendarMonthName = document.getElementById('month-name');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');

    // Clock Elements
    const digitalClockDiv = document.getElementById('digital-clock');
    const timeFormatSelect = document.getElementById('time-format-select');

    // Fun Fact Elements
    const funFactDisplay = document.getElementById('fun-fact-display');
    const generateFactButton = document.getElementById('generate-fact-button');

    // Daily Summary & Streak Elements
    const tasksCompletedTodaySpan = document.getElementById('tasks-completed-today');
    const tasksTotalTodaySpan = document.getElementById('tasks-total-today');
    const currentStreakSpan = document.getElementById('current-streak');

    // Welcome Message Element (moved to middle panel)
    const welcomeMessageDiv = document.getElementById('welcome-message');

    // New Pomodoro Timer Elements
    const pomodoroDisplay = document.getElementById('pomodoro-display');
    const pomodoroHoursInput = document.getElementById('pomodoro-hours-input');
    const pomodoroMinutesInput = document.getElementById('pomodoro-minutes-input');
    const pomodoroSetBtn = document.getElementById('pomodoro-set-btn');
    const pomodoroStartBtn = document.getElementById('pomodoro-start-btn');
    const pomodoroPauseBtn = document.getElementById('pomodoro-pause-btn');
    const pomodoroStopBtn = document.getElementById('pomodoro-stop-btn'); // Changed from reset
    const pomodoroStatus = document.getElementById('pomodoro-status');

    let currentCalendarDate = new Date(); // Keep track of the month currently displayed in the calendar
    let is12HourFormat = timeFormatSelect.value === '12';

    // --- Pomodoro Timer Variables ---
    let timerInterval;
    let timeLeft = 0; // Initialize to 0, will be set by user
    let initialTime = 0; // Store the time set by the user
    let isPaused = true;
    let isRunning = false; // New state to track if timer is actively running
    let pomodoroMode = 'custom'; // Now it's a custom timer, not just pomodoro cycles

    // --- Sound Effects ---
    // Ensure you have a 'ding.mp3' in your static/sounds/ directory
    const completeSound = new Audio('static/sounds/ding.mp3');
    const timerEndSound = new Audio('static/sounds/bell.mp3'); // Assuming you have a bell sound for timer end

    // --- Helper Functions ---

    function updateProgress(tasks) {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => !task.isActive).length;
        const activeTasks = totalTasks - completedTasks;

        tasksLeftCountSpan.textContent = activeTasks;

        // Using SVG properties for the progress circle - NO CANVAS
        const circumference = progressRingProgress.r.baseVal.value * 2 * Math.PI;
        progressRingProgress.style.strokeDasharray = `${circumference} ${circumference}`;

        if (totalTasks === 0) {
            progressRingProgress.style.strokeDashoffset = circumference;
        } else {
            const offset = circumference - (activeTasks / totalTasks) * circumference;
            progressRingProgress.style.strokeDashoffset = offset;
        }
    }

    function formatDueDate(isoDateString) {
        if (!isoDateString) return '';
        const date = new Date(isoDateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
        return date.toLocaleDateString(undefined, options);
    }

    function getDueDateStatus(isoDateString) {
        if (!isoDateString) return '';

        const dueDate = new Date(isoDateString);
        const now = new Date();

        const diffMs = dueDate.getTime() - now.getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (diffMs < 0) {
            return 'overdue';
        } else if (diffMs < oneDayMs) {
            return 'due-soon';
        }
        return '';
    }

    function updateDailySummaryAndStreak(allTasks) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let completedTodayCount = 0;
        let totalTasksDueTodayOrBefore = 0; // Renamed for clarity

        allTasks.forEach(task => {
            if (task.dueDate) {
                const dueDate = new Date(task.dueDate);
                dueDate.setHours(0,0,0,0);
                if (dueDate.getTime() <= today.getTime() && task.isActive) {
                    totalTasksDueTodayOrBefore++;
                }
            }

            if (!task.isActive && task.completedAt) {
                const completedDate = new Date(task.completedAt);
                completedDate.setHours(0, 0, 0, 0);
                if (completedDate.getTime() === today.getTime()) {
                    completedTodayCount++;
                }
            }
        });

        tasksCompletedTodaySpan.textContent = completedTodayCount;
        tasksTotalTodaySpan.textContent = totalTasksDueTodayOrBefore;

        // --- Basic Client-side Streak Logic ---
        let currentStreak = parseInt(localStorage.getItem('currentStreak')) || 0;
        let lastStreakDate = localStorage.getItem('lastStreakDate');
        const todayStr = today.toISOString().substring(0, 10);

        if (totalTasksDueTodayOrBefore > 0 && completedTodayCount === totalTasksDueTodayOrBefore) {
             if (lastStreakDate !== todayStr) {
                const lastDateObj = new Date(lastStreakDate);
                lastDateObj.setHours(0,0,0,0);

                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                yesterday.setHours(0,0,0,0);

                if (lastDateObj.getTime() === yesterday.getTime()) {
                    currentStreak++;
                } else {
                    currentStreak = 1;
                }
                localStorage.setItem('currentStreak', currentStreak);
                localStorage.setItem('lastStreakDate', todayStr);
                currentStreakSpan.classList.add('streak-celebration');
                setTimeout(() => {
                    currentStreakSpan.classList.remove('streak-celebration');
                }, 1000);
            }
        } else if (totalTasksDueTodayOrBefore > 0 && completedTodayCount < totalTasksDueTodayOrBefore) {
            if (lastStreakDate && lastStreakDate !== todayStr) {
                const lastDateObj = new Date(lastStreakDate);
                lastDateObj.setHours(0,0,0,0);
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                yesterday.setHours(0,0,0,0);

                if (lastDateObj.getTime() === yesterday.getTime()) {
                     currentStreak = 0;
                     localStorage.setItem('currentStreak', currentStreak);
                     currentStreakSpan.classList.add('broken');
                     localStorage.removeItem('lastStreakDate');
                }
            }
        } else if (totalTasksDueTodayOrBefore === 0 && completedTodayCount === 0 && lastStreakDate && lastStreakDate !== todayStr) {
            const lastDateObj = new Date(lastStreakDate);
            lastDateObj.setHours(0,0,0,0);
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            yesterday.setHours(0,0,0,0);

            if (lastDateObj.getTime() !== yesterday.getTime() && lastDateObj.getTime() !== today.getTime()) {
                currentStreak = 0;
                localStorage.setItem('currentStreak', currentStreak);
                currentStreakSpan.classList.add('broken');
                localStorage.removeItem('lastStreakDate');
            }
        } else if (totalTasksDueTodayOrBefore === 0 && completedTodayCount === 0 && !lastStreakDate) {
             currentStreak = 0;
             localStorage.setItem('currentStreak', currentStreak);
             currentStreakSpan.classList.remove('broken');
        }

        currentStreakSpan.textContent = currentStreak;
        if (currentStreak === 0) {
             currentStreakSpan.classList.add('broken');
        } else {
             currentStreakSpan.classList.remove('broken');
        }
    }


    function renderTasks(tasksToDisplay) {
        taskListDiv.innerHTML = '';

        const sortedTasks = [...tasksToDisplay].sort((a, b) => {
            if (a.isActive && !b.isActive) return -1;
            if (!a.isActive && b.isActive) return 1;

            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            }
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return 0;
        });

        sortedTasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.classList.add('task-item');
            if (!task.isActive) {
                taskItem.classList.add('completed');
            }

            const dueDateStatus = getDueDateStatus(task.dueDate);
            if (dueDateStatus) {
                taskItem.classList.add(dueDateStatus);
            }

            taskItem.dataset.id = task.id;

            const displayDueDate = formatDueDate(task.dueDate);

            taskItem.innerHTML = `
                <div class="task-info">
                    <span class="task-name">${task.name}</span>
                    <span class="task-category">${task.category}</span>
                    ${displayDueDate ? `<span class="task-due-date">Due: ${displayDueDate}</span>` : ''}
                </div>
                <div class="task-status">
                    ${task.isActive && task.timeLeft ? `<span class="time-left">${task.timeLeft}</span>` : ''}
                    ${task.isActive ? `<span class="status-label active">active</span>` : ''}
                    <input type="checkbox" class="task-checkbox" ${!task.isActive ? 'checked' : ''}>
                    <button class="delete-task-button">X</button>
                </div>
                <div class="edit-mode-container" style="display: none;">
                    <input type="text" class="edit-input task-name-input" value="${task.name}">
                    <input type="text" class="edit-input task-category-input" value="${task.category}">
                    <input type="date" class="edit-input task-due-date-input" value="${task.dueDate ? task.dueDate.substring(0, 10) : ''}">
                    <input type="time" class="edit-input task-due-time-input" value="${task.dueDate ? task.dueDate.substring(11, 16) : ''}">
                    <div class="edit-actions">
                        <button class="edit-save-btn">Save</button>
                        <button class="edit-cancel-btn">Cancel</button>
                    </div>
                </div>
            `;
            taskListDiv.appendChild(taskItem);

            const checkbox = taskItem.querySelector('.task-checkbox');
            checkbox.addEventListener('change', async (event) => {
                const taskId = event.target.closest('.task-item').dataset.id;
                const wasActive = task.isActive;

                if (wasActive && event.target.checked) {
                    taskItem.classList.add('completing');
                    completeSound.play();

                    setTimeout(async () => {
                        await toggleTaskStatus(taskId);
                    }, 350);
                } else {
                    await toggleTaskStatus(taskId);
                }
            });

            const deleteButton = taskItem.querySelector('.delete-task-button');
            deleteButton.addEventListener('click', async (event) => {
                const taskId = event.target.closest('.task-item').dataset.id;
                await deleteTask(taskId);
            });

            const taskInfoDiv = taskItem.querySelector('.task-info');
            const editModeContainer = taskItem.querySelector('.edit-mode-container');
            const taskNameInput = taskItem.querySelector('.task-name-input');
            const taskCategoryInput = taskItem.querySelector('.task-category-input');
            const taskDueDateInput = taskItem.querySelector('.task-due-date-input');
            const taskDueTimeInput = taskItem.querySelector('.task-due-time-input');
            const saveBtn = taskItem.querySelector('.edit-save-btn');
            const cancelBtn = taskItem.querySelector('.edit-cancel-btn');

            const enterEditMode = () => {
                taskItem.classList.add('editing');
                taskItem.querySelector('.task-info').style.display = 'none';
                taskItem.querySelector('.task-status').style.display = 'none';
                editModeContainer.style.display = 'block';
                taskNameInput.focus();
            };

            const exitEditMode = () => {
                taskItem.classList.remove('editing');
                taskItem.querySelector('.task-info').style.display = 'flex';
                taskItem.querySelector('.task-status').style.display = 'flex';
                editModeContainer.style.display = 'none';
            };

            taskInfoDiv.addEventListener('click', enterEditMode);

            saveBtn.addEventListener('click', async () => {
                const taskId = taskItem.dataset.id;
                const newName = taskNameInput.value.trim();
                const newCategory = taskCategoryInput.value.trim() || 'Uncategorized';
                const newDueDate = taskDueDateInput.value;
                const newDueTime = taskDueTimeInput.value;

                if (newName === '') {
                    alert('Task name cannot be empty!');
                    return;
                }

                let combinedDueDate = null;
                if (newDueDate && newDueTime) {
                    combinedDueDate = `${newDueDate}T${newDueTime}:00`;
                } else if (newDueDate) {
                    combinedDueDate = `${newDueDate}T00:00:00`;
                }

                await updateTask(taskId, { name: newName, category: newCategory, dueDate: combinedDueDate });
                exitEditMode();
            });

            cancelBtn.addEventListener('click', () => {
                taskNameInput.value = task.name;
                taskCategoryInput.value = task.category;
                taskDueDateInput.value = task.dueDate ? task.dueDate.substring(0, 10) : '';
                taskDueTimeInput.value = task.dueDate ? task.dueDate.substring(11, 16) : '';
                exitEditMode();
            });

            taskNameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
                else if (e.key === 'Escape') { exitEditMode(); }
            });
            taskCategoryInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
                else if (e.key === 'Escape') { exitEditMode(); }
            });
            taskDueDateInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
                else if (e.key === 'Escape') { exitEditMode(); }
            });
            taskDueTimeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
                else if (e.key === 'Escape') { exitEditMode(); }
            });
        });

        updateProgress(tasksToDisplay);
        updateDailySummaryAndStreak(tasksToDisplay);
    }

    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const today = new Date();
        const currentMonth = currentCalendarDate.getMonth();
        const currentYear = currentCalendarDate.getFullYear();

        calendarMonthName.textContent = currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        let startDay = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday...

        // Fill in leading empty days
        for (let i = 0; i < startDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.classList.add('calendar-day', 'inactive');
            calendarGrid.appendChild(emptyDay);
        }

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('calendar-day');
            dayElement.textContent = day;

            if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
                dayElement.classList.add('today');
            }
            calendarGrid.appendChild(dayElement);
        }
    }

    function changeMonth(delta) {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
        renderCalendar();
    }

    function updateClock() {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        let seconds = now.getSeconds();
        let ampm = '';

        if (is12HourFormat) {
            ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // The hour '0' (midnight) should be '12' in 12-hour format
        }

        hours = String(hours).padStart(2, '0');
        minutes = String(minutes).padStart(2, '0');
        seconds = String(seconds).padStart(2, '0');

        digitalClockDiv.innerHTML = `${hours}:${minutes}:${seconds} ${is12HourFormat ? `<span class="ampm">${ampm}</span>` : ''}`;
    }

    async function generateFunFact() {
        funFactDisplay.textContent = "Loading a cool fact...";
        try {
            const response = await fetch(USELESS_FACTS_API_URL);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${errorText || response.statusText}`);
            }
            const data = await response.json();
            if (data && data.text) {
                funFactDisplay.textContent = data.text;
            } else {
                funFactDisplay.textContent = "Fact found, but content is empty.";
            }
        } catch (error) {
            console.error('Error fetching fun fact:', error);
            funFactDisplay.textContent = "Oops! Couldn't load a fact. Check your internet or try again!";
        }
    }

    // --- API Interaction Functions ---

    async function fetchAndRenderTasks() {
        try {
            const response = await fetch(`${BACKEND_URL}/tasks`, {credentials: 'include'});
            if (!response.ok) {
                if (response.status === 401) {
                    showAuthOverlay();
                    return;
                }
                // Handle non-2xx but not 401 statuses gracefully
                const errorText = await response.text();
                console.error('Error fetching tasks:', errorText);
                throw new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0,100)}...`);
            }
            const tasks = await response.json();
            renderTasks(tasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            alert('Failed to load tasks. Please ensure the backend server is running and you are logged in. ' + error.message);
            showAuthOverlay();
        }
    }

    function showAddTaskModal() {
        const modalOverlay = document.createElement('div');
        modalOverlay.classList.add('add-task-modal-overlay');
        modalOverlay.innerHTML = `
            <div class="add-task-modal">
                <h3>Add New Task</h3>
                <input type="text" id="modal-task-name" placeholder="Task Name" required>
                <input type="text" id="modal-task-category" placeholder="Category (e.g., Work)">
                <input type="date" id="modal-due-date">
                <input type="time" id="modal-due-time">
                <div class="add-task-modal-actions">
                    <button class="cancel-btn">Cancel</button>
                    <button class="save-btn">Add Task</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        const modalTaskName = document.getElementById('modal-task-name');
        const modalTaskCategory = document.getElementById('modal-task-category');
        const modalDueDate = document.getElementById('modal-due-date');
        const modalDueTime = document.getElementById('modal-due-time');
        const saveButton = modalOverlay.querySelector('.save-btn');
        const cancelButton = modalOverlay.querySelector('.cancel-btn');

        modalTaskName.focus();

        saveButton.addEventListener('click', async () => {
            const name = modalTaskName.value.trim();
            const category = modalTaskCategory.value.trim() || 'Uncategorized';
            const dueDate = modalDueDate.value;
            const dueTime = modalDueTime.value;

            if (!name) {
                alert('Task name is required!');
                return;
            }

            let combinedDueDate = null;
            if (dueDate && dueTime) {
                combinedDueDate = `${dueDate}T${dueTime}:00`;
            } else if (dueDate) {
                combinedDueDate = `${dueDate}T00:00:00`;
            }

            try {
                const response = await fetch(`${BACKEND_URL}/tasks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: name,
                        category: category,
                        dueDate: combinedDueDate,
                    }),
                    credentials: 'include'
                });

                if (!response.ok) {
                    if (response.status === 401) { alert('You need to be logged in to add tasks.'); showAuthOverlay(); }
                    const errorText = await response.text();
                    console.error('Error adding task:', errorText);
                    throw new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0,100)}...`);
                }

                modalOverlay.remove();
                await fetchAndRenderTasks();

            } catch (error) {
                console.error('Error adding task:', error);
                alert('Failed to add task. Please try again. ' + error.message);
            }
        });

        cancelButton.addEventListener('click', () => {
            modalOverlay.remove();
        });

        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay) {
                modalOverlay.remove();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && document.body.contains(modalOverlay)) {
                modalOverlay.remove();
            }
        });
    }

    async function updateTask(id, updates) {
        try {
            const response = await fetch(`${BACKEND_URL}/tasks/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 401) { alert('You need to be logged in to update tasks.'); showAuthOverlay(); }
                else if (response.status === 404) { alert('Task not found or you are not authorized to update it.'); }
                const errorText = await response.text();
                console.error('Error updating task:', errorText);
                throw new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0,100)}...`);
            }

            fetchAndRenderTasks();

        } catch (error) {
            console.error('Error updating task:', error);
            alert('Failed to update task. Please try again. ' + error.message);
        }
    }

    async function toggleTaskStatus(id) {
        try {
            const currentTasksResponse = await fetch(`${BACKEND_URL}/tasks`, {credentials: 'include'});
            if (!currentTasksResponse.ok) {
                const errorText = await currentTasksResponse.text();
                console.error('Error fetching current tasks for toggle:', errorText);
                throw new Error(`HTTP error! status: ${currentTasksResponse.status} - ${errorText.substring(0,100)}...`);
            }
            const currentTasks = await currentTasksResponse.json();
            const taskToUpdate = currentTasks.find(task => task.id === parseInt(id));

            if (!taskToUpdate) {
                console.error('Task not found for toggling status:', id);
                return;
            }

            const newStatus = !taskToUpdate.isActive;
            const updates = { isActive: newStatus };
            if (newStatus === false) {
                updates.completedAt = new Date().toISOString();
            } else {
                updates.completedAt = null;
            }

            const response = await fetch(`${BACKEND_URL}/tasks/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 401) { alert('You need to be logged in to change task status.'); showAuthOverlay(); }
                else if (response.status === 404) { alert('Task not found or you are not authorized to change its status.'); }
                const errorText = await response.text();
                console.error('Error toggling task status:', errorText);
                throw new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0,100)}...`);
            }

            fetchAndRenderTasks();

        } catch (error) {
            console.error('Error toggling task status:', error);
            alert('Failed to update task status. Please try again. ' + error.message);
        }
    }

    async function deleteTask(id) {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/tasks/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 401) { alert('You need to be logged in to delete tasks.'); showAuthOverlay(); }
                else if (response.status === 404) { alert('Task not found or you are not authorized to delete it.'); }
                const errorText = await response.text();
                console.error('Error deleting task:', errorText);
                throw new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0,100)}...`);
            }

            await fetchAndRenderTasks();

        } catch (error) {
                console.error('Error deleting task:', error);
            alert('Failed to delete task. Please try again. ' + error.message);
        }
    }

    // --- Authentication Functions ---

    function showAuthOverlay() {
        authOverlay.style.display = 'flex';
        mainAppContent.style.display = 'none';
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        loginUsernameInput.focus();
        welcomeMessageDiv.textContent = ''; // Clear welcome message on logout/show auth
    }

    function hideAuthOverlay() {
        authOverlay.style.display = 'none';
        mainAppContent.style.display = 'flex';
    }

    async function handleLogin() {
        const username = loginUsernameInput.value.trim();
        const password = loginPasswordInput.value.trim();

        if (!username || !password) {
            alert('Please enter both username and password.');
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            if (!response.ok) {
                let errorMessage = 'Login failed';
                const responseText = await response.text(); // Read the body ONCE as text

                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.error || errorMessage;
                } catch (jsonParseError) {
                    console.error("Server responded with non-JSON for login error:", responseText);
                    errorMessage = `Login failed: Unexpected server response (status: ${response.status}). Check console for details.`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json(); // Parse successful login response
            alert('Login successful!');
            welcomeMessageDiv.textContent = `Welcome, ${data.username}!`; // Display welcome message
            hideAuthOverlay();
            await fetchAndRenderTasks();
            renderCalendar();
            updateClock();
            generateFunFact();
            loginUsernameInput.value = '';
            loginPasswordInput.value = '';

        } catch (error) {
            console.error('Login error:', error);
            alert(`Login failed: ${error.message}`);
        }
    }

    async function handleRegister() {
        const username = registerUsernameInput.value.trim();
        const password = registerPasswordInput.value.trim();

        if (!username || !password) {
            alert('Please enter both username and password.');
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            if (!response.ok) {
                let errorMessage = 'Registration failed';
                const responseText = await response.text(); // Read the body ONCE as text

                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.error || errorMessage;
                } catch (jsonParseError) {
                    console.error("Server responded with non-JSON for registration error:", responseText);
                    errorMessage = `Registration failed: Unexpected server response (status: ${response.status}). Check console for details.`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json(); // Parse successful registration response
            alert('Registration successful! You are now logged in.');
            welcomeMessageDiv.textContent = `Welcome, ${data.username}!`; // Display welcome message
            hideAuthOverlay();
            await fetchAndRenderTasks();
            renderCalendar();
            updateClock();
            generateFunFact();
            registerUsernameInput.value = '';
            registerPasswordInput.value = '';

        } catch (error) {
            console.error('Registration error:', error);
            alert(`Registration failed: ${error.message}`);
        }
    }

    async function handleLogout() {
        try {
            const response = await fetch(`${BACKEND_URL}/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error logging out:', errorText);
                throw new Error(`Logout failed: HTTP error! status: ${response.status} - ${errorText.substring(0,100)}...`);
            }

            alert('Logged out successfully.');
            showAuthOverlay();
            taskListDiv.innerHTML = '';
            tasksLeftCountSpan.textContent = '0';
            tasksCompletedTodaySpan.textContent = '0';
            tasksTotalTodaySpan.textContent = '0';
            currentStreakSpan.textContent = '0';
            currentStreakSpan.classList.add('broken');
            welcomeMessageDiv.textContent = ''; // Clear welcome message on logout

        } catch (error) {
            console.error('Logout error:', error);
            alert('Logout failed. Please try again. ' + error.message);
        }
    }

    // --- Custom Timer Logic ---
    function formatTime(seconds) {
        const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function updatePomodoroDisplay() {
        pomodoroDisplay.textContent = formatTime(timeLeft);
    }

    function setTimer() {
        const hours = parseInt(pomodoroHoursInput.value) || 0;
        const minutes = parseInt(pomodoroMinutesInput.value) || 0;

        if (hours === 0 && minutes === 0) {
            alert('Please set a valid time (hours or minutes must be greater than zero).');
            return;
        }

        timeLeft = (hours * 3600) + (minutes * 60);
        initialTime = timeLeft; // Store initial time for reset
        updatePomodoroDisplay();
        pomodoroStatus.textContent = 'Timer set. Ready to start!';

        // Enable/disable buttons appropriately
        pomodoroStartBtn.disabled = false;
        pomodoroPauseBtn.disabled = true;
        pomodoroStopBtn.disabled = false;
        pomodoroHoursInput.disabled = true;
        pomodoroMinutesInput.disabled = true;
        pomodoroSetBtn.disabled = true;
    }

    function startTimer() {
        if (isRunning) return; // Already running
        if (timeLeft <= 0) {
            setTimer(); // If timer is at 0, set it first based on inputs
            if (timeLeft <= 0) return; // If still 0 after setting, something is wrong with inputs
        }

        isRunning = true;
        isPaused = false;
        pomodoroStartBtn.disabled = true;
        pomodoroPauseBtn.disabled = false;
        pomodoroStopBtn.disabled = false;
        pomodoroStatus.textContent = 'Timer running...';

        timerInterval = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerEndSound.play();
                handleTimerEnd();
            } else {
                timeLeft--;
                updatePomodoroDisplay();
            }
        }, 1000);
    }

    function pauseTimer() {
        if (!isRunning || isPaused) return; // Not running or already paused
        isPaused = true;
        clearInterval(timerInterval);
        pomodoroStartBtn.disabled = false;
        pomodoroPauseBtn.disabled = true;
        pomodoroStatus.textContent = 'Timer paused.';
    }

    function stopTimer() {
        clearInterval(timerInterval);
        isRunning = false;
        isPaused = true;
        timeLeft = initialTime; // Reset to the initially set time
        updatePomodoroDisplay();
        pomodoroStatus.textContent = 'Timer stopped. Ready to start again or set new time.';

        // Re-enable input fields and set button
        pomodoroHoursInput.disabled = false;
        pomodoroMinutesInput.disabled = false;
        pomodoroSetBtn.disabled = false;
        pomodoroStartBtn.disabled = true; // Cannot start until set or if already running
        pomodoroPauseBtn.disabled = true;
        pomodoroStopBtn.disabled = true;
    }

    function handleTimerEnd() {
        isRunning = false;
        isPaused = true;
        pomodoroStatus.textContent = 'Time\'s up!';
        // After timer ends, allow user to start again or set new time
        pomodoroStartBtn.disabled = false;
        pomodoroPauseBtn.disabled = true;
        pomodoroStopBtn.disabled = false; // Allow stopping to reset inputs
        pomodoroHoursInput.disabled = false;
        pomodoroMinutesInput.disabled = false;
        pomodoroSetBtn.disabled = false;
    }


    // --- Initial Check and Event Listeners ---

    async function checkAuthenticationStatus() {
        try {
            const response = await fetch(`${BACKEND_URL}/check_auth`, {credentials: 'include'});
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error checking authentication status:', errorText);
                throw new Error(`Auth check failed: status ${response.status} - ${errorText.substring(0,100)}...`);
            }
            const data = await response.json();
            if (data.authenticated) {
                welcomeMessageDiv.textContent = `Welcome, ${data.username}!`; // Display welcome message
                hideAuthOverlay();
                await fetchAndRenderTasks();
                renderCalendar();
                updateClock();
                generateFunFact();
            } else {
                showAuthOverlay();
            }
        } catch (error) {
            console.error('Error checking authentication status:', error);
            alert('Failed to check authentication status. ' + error.message);
            showAuthOverlay();
        }
    }

    loginButton.addEventListener('click', handleLogin);
    registerButton.addEventListener('click', handleRegister);
    logoutButton.addEventListener('click', handleLogout); // Event listener for the new logout button position

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        registerUsernameInput.focus();
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        loginUsernameInput.focus();
    });

    loginUsernameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); loginPasswordInput.focus(); } });
    loginPasswordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleLogin(); } });
    registerUsernameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); registerPasswordInput.focus(); } });
    registerPasswordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleRegister(); } });


    addtaskButton.addEventListener('click', showAddTaskModal);

    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));

    timeFormatSelect.addEventListener('change', (event) => {
        is12HourFormat = event.target.value === '12';
        updateClock();
    });

    generateFactButton.addEventListener('click', generateFunFact);

    // Custom Timer Event Listeners
    pomodoroSetBtn.addEventListener('click', setTimer);
    pomodoroStartBtn.addEventListener('click', startTimer);
    pomodoroPauseBtn.addEventListener('click', pauseTimer);
    pomodoroStopBtn.addEventListener('click', stopTimer); // Changed from reset

    // Initial setup for Custom timer
    setTimer(); // Set initial display based on input values (00:25)
    pomodoroStartBtn.disabled = true; // Start button disabled until set or if already running
    pomodoroPauseBtn.disabled = true; // Pause button disabled initially
    pomodoroStopBtn.disabled = true; // Stop button disabled initially


    // Initial checks and setup
    checkAuthenticationStatus();
    setInterval(updateClock, 1000);
    setInterval(fetchAndRenderTasks, 60 * 1000); // Refresh tasks every minute
    currentStreakSpan.textContent = parseInt(localStorage.getItem('currentStreak')) || 0;
});
