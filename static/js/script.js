document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const BACKEND_URL = 'http://127.0.0.1:5555'; // Ensure this matches your Flask port!

    // --- Element References ---
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

    let currentCalendarDate = new Date(); // Keep track of the month currently displayed in the calendar
    let is12HourFormat = timeFormatSelect.value === '12';

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

    // Function to render (display) all tasks
    function renderTasks(tasksToDisplay) {
        taskListDiv.innerHTML = ''; // Clear existing tasks before re-rendering

        // Sort tasks: active first, then completed
        const sortedTasks = [...tasksToDisplay].sort((a, b) => {
            if (a.isActive && !b.isActive) return -1;
            if (!a.isActive && b.isActive) return 1;
            return 0;
        });

        sortedTasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.classList.add('task-item');
            if (!task.isActive) {
                taskItem.classList.add('completed');
            }
            taskItem.dataset.id = task.id; // Store the task ID on the element

            taskItem.innerHTML = `
                <div class="task-info">
                    <span class="task-name">${task.name}</span>
                    <span class="task-category">${task.category}</span>
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
                await toggleTaskStatus(taskId);
            });

            const deleteButton = taskItem.querySelector('.delete-task-button');
            deleteButton.addEventListener('click', async (event) => {
                const taskId = event.target.closest('.task-item').dataset.id;
                await deleteTask(taskId);
            });

            // --- Edit Functionality Event Listeners ---
            const taskNameSpan = taskItem.querySelector('.task-name');
            const taskCategorySpan = taskItem.querySelector('.task-category');
            const editModeContainer = taskItem.querySelector('.edit-mode-container');
            const taskNameInput = taskItem.querySelector('.task-name-input');
            const taskCategoryInput = taskItem.querySelector('.task-category-input');
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

            taskNameSpan.addEventListener('click', enterEditMode);
            taskCategorySpan.addEventListener('click', enterEditMode);

            saveBtn.addEventListener('click', async () => {
                const taskId = taskItem.dataset.id;
                const newName = taskNameInput.value.trim();
                const newCategory = taskCategoryInput.value.trim();
                if (newName === '') {
                    alert('Task name cannot be empty!');
                    return;
                }
                await updateTask(taskId, { name: newName, category: newCategory });
                exitEditMode(); // Exit edit mode after saving
            });

            cancelBtn.addEventListener('click', () => {
                // Revert inputs to original values if needed (though fetchAndRender will do this)
                taskNameInput.value = task.name;
                taskCategoryInput.value = task.category;
                exitEditMode();
            });

            // Keyboard shortcuts for saving/canceling while editing
            taskNameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent new line
                    saveBtn.click();
                } else if (e.key === 'Escape') {
                    exitEditMode();
                }
            });

            taskCategoryInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveBtn.click();
                } else if (e.key === 'Escape') {
                    exitEditMode();
                }
            });
        });

        updateProgress(tasksToDisplay);
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
    const funFacts = [
        "A group of owls is called a parliament.",
        "Honey never spoils.",
        "The shortest war in history lasted only 38 minutes.",
        "Butterflies taste with their feet.",
        "It is impossible for most people to lick their own elbow.",
        "A jiffy is an actual unit of time: 1/100th of a second.",
        "The unicorn is the national animal of Scotland.",
        "Octopuses have three hearts.",
        "A 'butt' is a real measurement of wine (126 gallons).",
        "The oldest known living tree is over 5,000 years old.",
        "There are more stars in the universe than grains of sand on all the beaches on Earth.",
        "It rains diamonds on Saturn and Jupiter.",
        "A group of pugs is called a grumble.",
        "The national anthem of Spain has no words.",
        "The average person walks the equivalent of three times around the world in a lifetime."
    ];

    function generateFunFact() {
        const randomIndex = Math.floor(Math.random() * funFacts.length);
        funFactDisplay.textContent = funFacts[randomIndex];
    }

    // --- API Interaction Functions (Talking to the Backend) ---

    async function fetchAndRenderTasks() {
        try {
            const response = await fetch(`${BACKEND_URL}/tasks`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const tasks = await response.json();
            renderTasks(tasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            alert('Failed to load tasks. Please ensure the backend server is running and the correct port is set.');
        }
    }

    async function addTask() {
        const taskName = prompt('Enter new task name:'); // Still using prompt for adding for simplicity
        if (!taskName) return;

        const taskCategory = prompt('Enter task category (e.g., School, Work, Personal):');

        try {
            const response = await fetch(`${BACKEND_URL}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: taskName,
                    category: taskCategory || 'Uncategorized',
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            await fetchAndRenderTasks();

        } catch (error) {
            console.error('Error adding task:', error);
            alert('Failed to add task. Please try again.');
        }
    }

    // New: Function to update task data
    async function updateTask(id, updates) {
        try {
            const response = await fetch(`${BACKEND_URL}/tasks/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            await fetchAndRenderTasks(); // Re-fetch and re-render to update UI

        } catch (error) {
            console.error('Error updating task:', error);
            alert('Failed to update task. Please try again.');
        }
    }

    async function toggleTaskStatus(id) {
        try {
            const currentTasksResponse = await fetch(`${BACKEND_URL}/tasks`);
            const currentTasks = await currentTasksResponse.json();
            const taskToUpdate = currentTasks.find(task => task.id === parseInt(id));

            if (!taskToUpdate) {
                console.error('Task not found for toggling status:', id);
                return;
            }

            const newStatus = !taskToUpdate.isActive;

            // Use the new updateTask function
            await updateTask(id, { isActive: newStatus });

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
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            await fetchAndRenderTasks();

        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task. Please try again.');
        }
    }

    // --- Event Listeners ---
    addtaskButton.addEventListener('click', addTask);

    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));

    timeFormatSelect.addEventListener('change', (event) => {
        is12HourFormat = event.target.value === '12';
        updateClock();
    });

    generateFactButton.addEventListener('click', generateFunFact);

    // --- Initial Load and Timers ---
    fetchAndRenderTasks();
    renderCalendar();
    updateClock();
    setInterval(updateClock, 1000);
    generateFunFact();
});