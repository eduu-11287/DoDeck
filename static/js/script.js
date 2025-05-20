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

    // Function to format due date for display
    function formatDueDate(isoDateString) {
        if (!isoDateString) return '';
        const date = new Date(isoDateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString(undefined, options);
    }

    // Function to check due date status
    function getDueDateStatus(isoDateString) {
        if (!isoDateString) return '';

        const dueDate = new Date(isoDateString);
        const now = new Date();

        // Calculate difference in milliseconds
        const diffMs = dueDate.getTime() - now.getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (diffMs < 0) {
            return 'overdue';
        } else if (diffMs < oneDayMs) { // Less than 24 hours until due
            return 'due-soon';
        }
        return '';
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
                await toggleTaskStatus(taskId);
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
                const newDueDate = taskDueDateInput.value; // YYYY-MM-DD
                const newDueTime = taskDueTimeInput.value; // HH:MM

                if (newName === '') {
                    alert('Task name cannot be empty!');
                    return;
                }

                let combinedDueDate = null;
                if (newDueDate && newDueTime) {
                    combinedDueDate = `${newDueDate}T${newDueTime}:00`; // YYYY-MM-DDTHH:MM:SS format
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
            const dueDate = modalDueDate.value; // YYYY-MM-DD
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
                });

                if (!response.ok) {
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
    addtaskButton.addEventListener('click', showAddTaskModal); // Changed to show modal

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

    // Re-render tasks every minute to update "due soon" / "overdue" status
    // This is optional but makes the status dynamic without a page refresh
    setInterval(fetchAndRenderTasks, 60 * 1000);
});