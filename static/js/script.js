document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const USELESS_FACTS_API_URL = 'https://uselessfacts.jsph.pl/random.json?language=en';
    const BACKEND_URL = 'https://betterlist-7xgp.onrender.com'; // Use your actual Render URL here!

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
    const logoutButton = document.getElementById('logout-button');

    // --- Existing Element References ---
    const tasksLeftCountSpan = document.querySelector('.tasks-left-count');
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

    let currentCalendarDate = new Date(); // Keep track of the month currently displayed in the calendar
    let is12HourFormat = timeFormatSelect.value === '12';

    // --- Sound Effects ---
    const completeSound = new Audio('static/sounds/ding.mp3'); // You'll need to create or download this!

    // --- Helper Functions ---

    function updateProgress(tasks) {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => !task.isActive).length;
        const activeTasks = totalTasks - completedTasks;

        tasksLeftCountSpan.textContent = activeTasks;

        const circumference = progressRingProgress.r.baseVal.value * 2 * Math.PI;
        progressRingProgress.style.strokeDasharray = `${circumference} ${circumference}`;

        if (totalTasks === 0) {
            progressRingProgress.style.strokeDashoffset = circumference;
        } else {
            const offset = circumference - (activeTasks / totalTasks) * circumference;
            progressRingProgress.style.strokeDashoffset = offset;
        }
    }

    // Function to format due date for display
    function formatDueDate(isoDateString) {
        if (!isoDateString) return '';
        const date = new Date(isoDateString);
        // Using an absolute date/time format for clarity
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
        return date.toLocaleDateString(undefined, options);
    }

    // Function to check due date status
    function getDueDateStatus(isoDateString) {
        if (!isoDateString) return '';

        const dueDate = new Date(isoDateString);
        const now = new Date();

        const diffMs = dueDate.getTime() - now.getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (diffMs < 0) {
            return 'overdue';
        } else if (diffMs < oneDayMs) { // Less than 24 hours until due
            return 'due-soon';
        }
        return '';
    }

    // Function to calculate and display daily summary and streak
    function updateDailySummaryAndStreak(allTasks) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of today

        let completedTodayCount = 0;
        let totalTasksTodayCount = 0;

        allTasks.forEach(task => {
            // Count active tasks that have a due date of today or earlier
            if (task.isActive && task.dueDate) {
                const dueDate = new Date(task.dueDate);
                dueDate.setHours(0,0,0,0); // Normalize due date to start of day for comparison
                if (dueDate.getTime() <= today.getTime()) {
                    totalTasksTodayCount++;
                }
            }

            // Count completed tasks that were completed today
            if (!task.isActive && task.completedAt) {
                const completedDate = new Date(task.completedAt);
                completedDate.setHours(0, 0, 0, 0); // Normalize to start of completed day
                if (completedDate.getTime() === today.getTime()) {
                    completedTodayCount++;
                }
            }
        });

        tasksCompletedTodaySpan.textContent = completedTodayCount;
        tasksTotalTodaySpan.textContent = totalTasksTodayCount; // This will show tasks active and due today or before

        // --- Basic Client-side Streak Logic ---
        // This is a simplified streak. For a truly robust and accurate streak,
        // it's best to track daily completion statuses on the backend.
        let currentStreak = parseInt(localStorage.getItem('currentStreak')) || 0;
        let lastStreakDate = localStorage.getItem('lastStreakDate'); //YYYY-MM-DD string

        const todayStr = today.toISOString().substring(0, 10); //YYYY-MM-DD

        // Logic to update streak if all *relevant* tasks are completed today
        if (totalTasksTodayCount > 0 && completedTodayCount === totalTasksTodayCount) {
             if (lastStreakDate !== todayStr) { // If it's a new day since last streak update
                const lastDateObj = new Date(lastStreakDate);
                lastDateObj.setHours(0,0,0,0);

                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                yesterday.setHours(0,0,0,0);

                if (lastDateObj.getTime() === yesterday.getTime()) { // If last streak day was yesterday
                    currentStreak++;
                } else { // It's a new completion but not consecutive or first
                    currentStreak = 1;
                }
                localStorage.setItem('currentStreak', currentStreak);
                localStorage.setItem('lastStreakDate', todayStr);
                currentStreakSpan.classList.add('streak-celebration'); // Add celebration animation
                setTimeout(() => {
                    currentStreakSpan.classList.remove('streak-celebration');
                }, 1000); // Remove animation after 1 second
            }
        } else if (totalTasksTodayCount > 0 && completedTodayCount < totalTasksTodayCount) {
            // If tasks are still active and due today, or some are incomplete, streak might be broken or needs reset
            if (lastStreakDate && lastStreakDate !== todayStr) { // If it's a new day and tasks are incomplete
                const lastDateObj = new Date(lastStreakDate);
                lastDateObj.setHours(0,0,0,0);
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                yesterday.setHours(0,0,0,0);

                // If streak was active yesterday but not completed today, break it
                if (lastDateObj.getTime() === yesterday.getTime()) {
                     currentStreak = 0;
                     localStorage.setItem('currentStreak', currentStreak);
                     currentStreakSpan.classList.add('broken');
                     localStorage.removeItem('lastStreakDate'); // Clear last streak date
                }
            }
        } else if (totalTasksTodayCount === 0 && completedTodayCount === 0 && lastStreakDate && lastStreakDate !== todayStr) {
            // If no tasks due today and no tasks completed today, and it's a new day,
            // check if the last streak was for yesterday. If so, maintain it. Otherwise, reset.
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
        } else if (totalTasksTodayCount === 0 && completedTodayCount === 0 && !lastStreakDate) {
            // No tasks ever, no streak
             currentStreak = 0;
             localStorage.setItem('currentStreak', currentStreak);
             currentStreakSpan.classList.remove('broken');
        }

        // Update displayed streak
        currentStreakSpan.textContent = currentStreak;
        if (currentStreak === 0) {
             currentStreakSpan.classList.add('broken');
        } else {
             currentStreakSpan.classList.remove('broken');
        }
    }


    // Function to render (display) all tasks
    function renderTasks(tasksToDisplay) {
        taskListDiv.innerHTML = ''; // Clear existing tasks before re-rendering

        // Sort tasks: active first, then completed. Among active, sort by due date.
        const sortedTasks = [...tasksToDisplay].sort((a, b) => {
            // Sort by active status first
            if (a.isActive && !b.isActive) return -1;
            if (!a.isActive && b.isActive) return 1;

            // If both are active or both are inactive, sort by due date
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            }
            if (a.dueDate) return -1; // tasks with due date come before tasks without
            if (b.dueDate) return 1;
            return 0; // Maintain original order if no due dates
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

            taskItem.dataset.id = task.id; // Store the task ID on the element

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

            // Add event listeners
            const checkbox = taskItem.querySelector('.task-checkbox');
            checkbox.addEventListener('change', async (event) => {
                const taskId = event.target.closest('.task-item').dataset.id;
                const wasActive = task.isActive; // Store original state

                // Apply animation and sound if task is being completed
                if (wasActive && event.target.checked) { // Check if it's being marked as completed
                    taskItem.classList.add('completing');
                    completeSound.play();

                    // Delay re-fetching tasks until animation is almost done
                    setTimeout(async () => {
                        await toggleTaskStatus(taskId); // This will re-render tasks, removing the animated one
                    }, 350); // Match this with your CSS animation duration (0.4s = 400ms)
                } else {
                    await toggleTaskStatus(taskId);
                }
            });

            const deleteButton = taskItem.querySelector('.delete-task-button');
            deleteButton.addEventListener('click', async (event) => {
                const taskId = event.target.closest('.task-item').dataset.id;
                await deleteTask(taskId);
            });

            // --- Edit Functionality Event Listeners ---
            const taskInfoDiv = taskItem.querySelector('.task-info'); // Click anywhere in task-info to edit
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
                editModeContainer.style.display = 'block'; // Show the edit container
                taskNameInput.focus(); // Focus on the name input
            };

            const exitEditMode = () => {
                taskItem.classList.remove('editing');
                taskItem.querySelector('.task-info').style.display = 'flex'; // Revert to flex
                taskItem.querySelector('.task-status').style.display = 'flex'; // Revert to flex
                editModeContainer.style.display = 'none'; // Hide the edit container
            };

            taskInfoDiv.addEventListener('click', enterEditMode); // Click on entire task-info to edit

            saveBtn.addEventListener('click', async () => {
                const taskId = taskItem.dataset.id;
                const newName = taskNameInput.value.trim();
                const newCategory = taskCategoryInput.value.trim();
                const newDueDate = taskDueDateInput.value; //YYYY-MM-DD
                const newDueTime = taskDueTimeInput.value; // HH:MM

                if (newName === '') {
                    alert('Task name cannot be empty!');
                    return;
                }

                let combinedDueDate = null;
                if (newDueDate && newDueTime) {
                    combinedDueDate = `${newDueDate}T${newDueTime}:00`; // ISO format: YYYY-MM-DDTHH:MM:SS
                } else if (newDueDate) {
                    combinedDueDate = `${newDueDate}T00:00:00`; // Default to start of day if only date is provided
                }

                await updateTask(taskId, { name: newName, category: newCategory, dueDate: combinedDueDate });
                exitEditMode(); // Exit edit mode after saving
            });

            cancelBtn.addEventListener('click', () => {
                // Revert inputs to original values if needed (though fetchAndRender will do this)
                taskNameInput.value = task.name;
                taskCategoryInput.value = task.category;
                taskDueDateInput.value = task.dueDate ? task.dueDate.substring(0, 10) : '';
                taskDueTimeInput.value = task.dueDate ? task.dueDate.substring(11, 16) : '';
                exitEditMode();
            });

            // Keyboard shortcuts for saving/canceling while editing
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
        updateDailySummaryAndStreak(tasksToDisplay); // Call after rendering tasks
    }

    // --- Calendar Functions ---
    function renderCalendar() {
        calendarGrid.innerHTML = ''; // Clear previous days
        const today = new Date();
        const currentMonth = currentCalendarDate.getMonth();
        const currentYear = currentCalendarDate.getFullYear();

        calendarMonthName.textContent = currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        // Get the first day of the month
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate(); // Last day of current month

        // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
        let startDay = firstDayOfMonth.getDay();

        // Add empty cells for days before the 1st of the month
        for (let i = 0; i < startDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.classList.add('calendar-day', 'inactive');
            calendarGrid.appendChild(emptyDay);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('calendar-day');
            dayElement.textContent = day;

            // Highlight today's date
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

    // --- Digital Clock Functions ---
    function updateClock() {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        let seconds = now.getSeconds();
        let ampm = '';

        if (is12HourFormat) {
            ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // The hour '0' should be '12'
        }

        hours = String(hours).padStart(2, '0');
        minutes = String(minutes).padStart(2, '0');
        seconds = String(seconds).padStart(2, '0');

        digitalClockDiv.innerHTML = `${hours}:${minutes}:${seconds} ${is12HourFormat ? `<span class="ampm">${ampm}</span>` : ''}`;
    }

    // --- Fun Fact Functions ---
    async function generateFunFact() {
        funFactDisplay.textContent = "Loading a cool fact..."; // Provide immediate feedback
        try {
            const response = await fetch(USELESS_FACTS_API_URL); // Use the new API URL
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${errorText || response.statusText}`);
            }
            const data = await response.json(); // This API returns JSON
            if (data && data.text) { // The fact is in the 'text' property of the JSON
                funFactDisplay.textContent = data.text;
            } else {
                funFactDisplay.textContent = "Fact found, but content is empty.";
            }
        } catch (error) {
            console.error('Error fetching fun fact:', error);
            funFactDisplay.textContent = "Oops! Couldn't load a fact. Check your internet or try again!";
        }
    }

    // --- API Interaction Functions (Talking to the Backend) ---

    async function fetchAndRenderTasks() {
        try {
            // Include credentials for session cookie to be sent
            const response = await fetch(`${BACKEND_URL}/tasks`, {credentials: 'include'});
            if (!response.ok) {
                if (response.status === 401) { // Not authenticated
                    showAuthOverlay();
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const tasks = await response.json();
            renderTasks(tasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            alert('Failed to load tasks. Please ensure the backend server is running and you are logged in.');
            showAuthOverlay(); // Show auth overlay on error
        }
    }

    // Function to show the add task modal
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

        modalTaskName.focus(); // Focus on the first input

        // Event listener for adding task
        saveButton.addEventListener('click', async () => {
            const name = modalTaskName.value.trim();
            const category = modalTaskCategory.value.trim() || 'Uncategorized';
            const dueDate = modalDueDate.value; //YYYY-MM-DD
            const dueTime = modalDueTime.value; // HH:MM

            if (!name) {
                alert('Task name is required!');
                return;
            }

            let combinedDueDate = null;
            if (dueDate && dueTime) {
                combinedDueDate = `${dueDate}T${dueTime}:00`; // ISO format: YYYY-MM-DDTHH:MM:SS
            } else if (dueDate) {
                combinedDueDate = `${dueDate}T00:00:00`; // Default to start of day if only date is provided
            }

            try {
                const response = await fetch(`${BACKEND_URL}/tasks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: name,
                        category: category,
                        dueDate: combinedDueDate, // Send combined due date
                    }),
                    credentials: 'include' // Include credentials for session cookie
                });

                if (!response.ok) {
                    if (response.status === 401) { alert('You need to be logged in to add tasks.'); showAuthOverlay(); }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                modalOverlay.remove(); // Close modal
                await fetchAndRenderTasks(); // Refresh tasks

            } catch (error) {
                console.error('Error adding task:', error);
                alert('Failed to add task. Please try again.');
            }
        });

        // Event listener for cancelling
        cancelButton.addEventListener('click', () => {
            modalOverlay.remove();
        });

        // Close modal on outside click
        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay) {
                modalOverlay.remove();
            }
        });

        // Close modal on Escape key
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
                credentials: 'include' // Include credentials for session cookie
            });

            if (!response.ok) {
                if (response.status === 401) { alert('You need to be logged in to update tasks.'); showAuthOverlay(); }
                else if (response.status === 404) { alert('Task not found or you are not authorized to update it.'); }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // No need to re-fetch here immediately if called from toggleTaskStatus
            // as toggleTaskStatus already delays the re-fetch for animation.
            // If calling updateTask directly, it will trigger fetchAndRenderTasks.
            fetchAndRenderTasks(); // Re-render tasks after update

        } catch (error) {
            console.error('Error updating task:', error);
            alert('Failed to update task. Please try again.');
        }
    }

    async function toggleTaskStatus(id) {
        try {
            // First, fetch the current tasks to find the task's current status
            const currentTasksResponse = await fetch(`${BACKEND_URL}/tasks`, {credentials: 'include'});
            if (!currentTasksResponse.ok) {
                throw new Error(`HTTP error! status: ${currentTasksResponse.status}`);
            }
            const currentTasks = await currentTasksResponse.json();
            const taskToUpdate = currentTasks.find(task => task.id === parseInt(id));

            if (!taskToUpdate) {
                console.error('Task not found for toggling status:', id);
                return;
            }

            const newStatus = !taskToUpdate.isActive;
            const updates = { isActive: newStatus };
            if (newStatus === false) { // If completing, set completedAt
                updates.completedAt = new Date().toISOString();
            } else { // If uncompleting, clear completedAt
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
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            fetchAndRenderTasks(); // Always re-render to reflect changes and update summary/streak

        } catch (error) {
            console.error('Error toggling task status:', error);
            alert('Failed to update task status. Please try again.');
        }
    }

    async function deleteTask(id) {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/tasks/${id}`, {
                method: 'DELETE',
                credentials: 'include' // Include credentials for session cookie
            });

            if (!response.ok) {
                if (response.status === 401) { alert('You need to be logged in to delete tasks.'); showAuthOverlay(); }
                else if (response.status === 404) { alert('Task not found or you are not authorized to delete it.'); }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            await fetchAndRenderTasks();

        } catch (error) {
                console.error('Error deleting task:', error);
            alert('Failed to delete task. Please try again.');
        }
    }

    // --- New Authentication Functions ---

    function showAuthOverlay() {
        authOverlay.style.display = 'flex'; // Show the overlay
        mainAppContent.style.display = 'none'; // Hide main app
        loginForm.style.display = 'block'; // Default to login form
        registerForm.style.display = 'none';
        loginUsernameInput.focus(); // Focus on login username
    }

    function hideAuthOverlay() {
        authOverlay.style.display = 'none'; // Hide the overlay
        mainAppContent.style.display = 'flex'; // Show main app
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
                credentials: 'include' // Important for Flask session cookies
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Login failed');
            }

            alert('Login successful!');
            hideAuthOverlay();
            await fetchAndRenderTasks(); // Fetch tasks for the logged-in user
            // Initialize other components
            renderCalendar();
            updateClock();
            generateFunFact();
            loginUsernameInput.value = ''; // Clear inputs
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
                credentials: 'include' // Important for Flask session cookies
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Registration failed');
            }

            alert('Registration successful! You are now logged in.');
            hideAuthOverlay();
            await fetchAndRenderTasks(); // Fetch tasks for the newly registered user
            // Initialize other components
            renderCalendar();
            updateClock();
            generateFunFact();
            registerUsernameInput.value = ''; // Clear inputs
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
                credentials: 'include' // Important to send cookie for logout
            });

            if (!response.ok) {
                throw new Error('Logout failed');
            }

            alert('Logged out successfully.');
            showAuthOverlay(); // Show login/register screen after logout
            // Clear all displayed tasks and stats
            taskListDiv.innerHTML = '';
            tasksLeftCountSpan.textContent = '0';
            tasksCompletedTodaySpan.textContent = '0';
            tasksTotalTodaySpan.textContent = '0';
            currentStreakSpan.textContent = '0';
            currentStreakSpan.classList.add('broken'); // Show streak as broken (reset)

        } catch (error) {
            console.error('Logout error:', error);
            alert('Logout failed. Please try again.');
        }
    }

    // --- Initial Check and Event Listeners ---

    // New: Check authentication status on load
    async function checkAuthenticationStatus() {
        try {
            const response = await fetch(`${BACKEND_URL}/check_auth`, {credentials: 'include'});
            const data = await response.json();
            if (data.authenticated) {
                hideAuthOverlay();
                await fetchAndRenderTasks(); // Load tasks if already authenticated
                // Initialize other components if authenticated
                renderCalendar();
                updateClock();
                generateFunFact();
            } else {
                showAuthOverlay(); // Show auth screen if not authenticated
            }
        } catch (error) {
            console.error('Error checking authentication status:', error);
            // If there's an error (e.g., network issue), assume not authenticated and show login
            showAuthOverlay();
        }
    }


    // Auth related event listeners
    loginButton.addEventListener('click', handleLogin);
    registerButton.addEventListener('click', handleRegister);
    logoutButton.addEventListener('click', handleLogout);

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

    // Add Enter key listener for login/register forms
    loginUsernameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); loginPasswordInput.focus(); } });
    loginPasswordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleLogin(); } });
    registerUsernameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); registerPasswordInput.focus(); } });
    registerPasswordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleRegister(); } });


    // --- Existing Event Listeners ---
    addtaskButton.addEventListener('click', showAddTaskModal);

    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));

    timeFormatSelect.addEventListener('change', (event) => {
        is12HourFormat = event.target.value === '12';
        updateClock();
    });

    generateFactButton.addEventListener('click', generateFunFact);

    // --- Initial Load and Timers ---
    // These functions are now called after successful authentication
    checkAuthenticationStatus();

    // Clock update should run continuously
    setInterval(updateClock, 1000);

    // Re-render tasks every minute to update "due soon" / "overdue" status
    // and daily summary - this will now only happen for the authenticated user
    setInterval(fetchAndRenderTasks, 60 * 1000);

    // Initialize streak display from localStorage (will be updated by fetchAndRenderTasks)
    currentStreakSpan.textContent = parseInt(localStorage.getItem('currentStreak')) || 0;
});