// State
let tasks = JSON.parse(localStorage.getItem('study_tasks')) || [];
const DAILY_CAPACITY = 4; // Hours per day threshold. Later we can make this user-configurable.
let timerInterval = null;
let timerSeconds = 25 * 60;
let isTimerRunning = false;
let activeTaskId = null;

// DOM Elements
const taskForm = document.getElementById('task-form');
const tasksList = document.getElementById('tasks-ul');
const heatmapContainer = document.getElementById('heatmap-container');
const overloadWarning = document.getElementById('overload-warning');
const btnRestructure = document.getElementById('btn-restructure');
const aiInsights = document.getElementById('ai-insights');
const aiMessage = document.getElementById('ai-message');
const focusTaskSelect = document.getElementById('focus-task-select');
const timerDisplay = document.getElementById('timer-display');
const btnStartTimer = document.getElementById('btn-start-timer');
const btnPauseTimer = document.getElementById('btn-pause-timer');
const btnStopTimer = document.getElementById('btn-stop-timer');
const toastContainer = document.getElementById('toast-container');

// Handlers
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value.trim();
    if (!title) return;

    const effort = parseFloat(document.getElementById('task-effort').value);
    const deadline = document.getElementById('task-deadline').value;

    // Validation
    if (effort <= 0 || effort > 300) {
        alert("Coach Tip: Please enter a realistic estimated effort (1-300 hours) so we can plan effectively!");
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineParts = deadline.split('-');
    const deadlineDate = new Date(deadlineParts[0], deadlineParts[1] - 1, deadlineParts[2]);

    if (deadlineDate < today) {
        alert("Deadline cannot be in the past.");
        return;
    }

    const newTask = {
        id: Date.now().toString(),
        title,
        effort,
        deadline,
        completed: false
    };

    tasks.push(newTask);
    saveTasks();
    renderTasks();
    analyzeWorkload();
    taskForm.reset();
});

function saveTasks() {
    localStorage.setItem('study_tasks', JSON.stringify(tasks));
}

function renderTasks() {
    tasksList.innerHTML = '';
    if (focusTaskSelect) focusTaskSelect.innerHTML = '<option value="">-- Select a task to focus on --</option>';

    // Sort by deadline
    const sortedTasks = [...tasks].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    sortedTasks.forEach(task => {
        if (!task.completed && focusTaskSelect) {
            const opt = document.createElement('option');
            opt.value = task.id;
            opt.textContent = task.title;
            if (activeTaskId === task.id) opt.selected = true;
            focusTaskSelect.appendChild(opt);
        }

        const li = document.createElement('li');
        li.style.marginBottom = '0.5rem';
        li.style.padding = '0.75rem';
        li.style.background = 'rgba(255, 255, 255, 0.05)';
        li.style.borderRadius = '8px';
        li.style.border = '1px solid var(--glass-border)';
        li.style.display = 'flex';
        li.style.flexDirection = 'column';
        li.style.gap = '0.5rem';

        let sessionDetails = '';
        if (task.sessions && task.sessions.length > 0) {
            const sortedSessions = [...task.sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
            sessionDetails = `<div style="font-size: 0.75rem; color: #cbd5e1; background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 4px; display:flex; gap: 0.5rem; flex-wrap: wrap;">`;
            sortedSessions.forEach(s => {
                sessionDetails += `<span>📅 ${s.date.slice(5)}: <strong style="color:var(--primary-color)">${s.hours.toFixed(1)}h</strong></span>`;
            });
            sessionDetails += `</div>`;
        }

        const isCompleted = task.completed ? 'text-decoration: line-through; opacity: 0.5;' : '';
        const checkboxState = task.completed ? 'checked' : '';

        let timeTrackedStr = '';
        if (task.timeTracked) {
            const h = Math.floor(task.timeTracked / 3600);
            const m = Math.floor((task.timeTracked % 3600) / 60);
            timeTrackedStr = `<span style="font-size: 0.8rem; color: #60a5fa;">⏱️ ${h}h ${m}m spent</span> &bull; `;
        }

        li.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; width: 100%;">
                <div style="display: flex; align-items: flex-start; gap: 0.75rem; ${isCompleted} overflow: hidden;">
                    <input type="checkbox" ${checkboxState} onchange="toggleComplete('${task.id}')" style="margin-top: 0.25rem; width: 1.25rem; height: 1.25rem; cursor: pointer; flex-shrink: 0;" aria-label="Mark task as complete">
                    <div style="overflow: hidden;">
                        <strong style="display:block; margin-bottom: 0.25rem; word-break: break-word;">${task.title}</strong>
                        <span style="font-size: 0.85rem; color: #94a3b8;">${timeTrackedStr}${task.effort}h total &bull; Due: ${task.deadline}</span>
                    </div>
                </div>
                <button onclick="deleteTask('${task.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--danger-color); white-space: nowrap; flex-shrink: 0;" aria-label="Delete task">Delete</button>
            </div>
            ${task.completed ? '' : sessionDetails}
        `;
        tasksList.appendChild(li);
    });
}

window.toggleComplete = (id) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
        analyzeWorkload();
    }
};

window.deleteTask = (id) => {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
    analyzeWorkload();
};

function analyzeWorkload() {
    if (tasks.length === 0) {
        heatmapContainer.innerHTML = '<p style="color: #64748b;">Great job! Your schedule is clear. Take a breather or add your next academic goal.</p>';
        overloadWarning.classList.add('hidden');
        if (aiInsights) aiInsights.classList.add('hidden');
        return;
    }

    const workloadByDay = {};
    let isOverloaded = false;

    tasks.forEach(task => {
        if (task.completed) return; // Skip completed tasks

        if (task.sessions && task.sessions.length > 0) {
            task.sessions.forEach(session => {
                if (!workloadByDay[session.date]) workloadByDay[session.date] = 0;
                workloadByDay[session.date] += session.hours;
            });
        } else {
            if (!workloadByDay[task.deadline]) {
                workloadByDay[task.deadline] = 0;
            }
            workloadByDay[task.deadline] += task.effort;
        }
    });

    let heatmapHTML = '<div style="display:flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 1rem; align-items: flex-end; min-height: 140px;">';

    const sortedDates = Object.keys(workloadByDay).sort();

    sortedDates.forEach(date => {
        const hours = workloadByDay[date];
        let color = 'var(--success-color)';
        if (hours > DAILY_CAPACITY) {
            color = 'var(--danger-color)';
            isOverloaded = true;
        } else if (hours > DAILY_CAPACITY * 0.75) {
            color = 'var(--warning-color)';
        }

        const height = Math.min(Math.max((hours / DAILY_CAPACITY) * 60, 5), 100);

        heatmapHTML += `
            <div style="min-width: 60px; text-align: center; display: flex; flex-direction: column; justify-content: flex-end;">
                <div style="font-size: 0.9rem; font-weight: bold; margin-bottom: 0.5rem; color: ${color};">${hours.toFixed(1)}h</div>
                <div style="height: ${height}px; background: ${color}; width: 100%; border-radius: 4px; transition: height 0.3s;"></div>
                <div style="font-size: 0.75rem; margin-top: 0.5rem; color: #94a3b8;">${date.slice(5)}</div>
            </div>
        `;
    });

    heatmapHTML += '</div>';
    heatmapContainer.innerHTML = heatmapHTML;

    if (isOverloaded) {
        overloadWarning.classList.remove('hidden');
    } else {
        overloadWarning.classList.add('hidden');
    }

    if (aiInsights && aiMessage) {
        aiInsights.classList.remove('hidden');
        if (isOverloaded) {
            aiMessage.textContent = "Your schedule is heavy right now! Focus on urgent tasks and let me optimize your plan.";
        } else if (tasks.filter(t => !t.completed).length > 4) {
            aiMessage.textContent = "You have several active goals. Tackle them one by one using the Focus Timer to prevent burnout.";
        } else {
            aiMessage.textContent = "Your workload is well balanced. Keep a steady pace and stick to your plan!";
        }
    }
}

function restructurePlan() {
    // Clear all existing sessions
    tasks.forEach(task => {
        task.sessions = [];
    });

    // Sort by deadline to prioritize completing more urgent tasks
    const sortedTasks = [...tasks].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    const dayLimits = {};

    sortedTasks.forEach(task => {
        if (task.completed) return; // Ignore completed tasks

        let remainingEffort = task.effort;
        let currentDate = new Date(task.deadline);
        currentDate.setHours(0, 0, 0, 0);

        while (remainingEffort > 0) {
            // Using local time string to prevent UTC date shifting issues
            const dateString = new Date(currentDate.getTime() - (currentDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

            if (!dayLimits[dateString]) dayLimits[dateString] = 0;

            const availableHours = DAILY_CAPACITY - dayLimits[dateString];

            if (availableHours > 0) {
                const hoursToAllocate = Math.min(availableHours, remainingEffort);
                task.sessions.push({ date: dateString, hours: hoursToAllocate });
                dayLimits[dateString] += hoursToAllocate;
                remainingEffort -= hoursToAllocate;
            }

            // Move one day back
            currentDate.setDate(currentDate.getDate() - 1);

            // Failsafe if task effort is massive
            if (task.sessions.length > 60) break;
        }

        if (remainingEffort > 0) {
            // Just dump it on the furthest back day found if completely overloaded over 60 days
            const dateString = new Date(currentDate.getTime() - (currentDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            task.sessions.push({ date: dateString, hours: remainingEffort });
            if (!dayLimits[dateString]) dayLimits[dateString] = 0;
            dayLimits[dateString] += remainingEffort;
        }
    });

    saveTasks();
    renderTasks();
    analyzeWorkload();
}

btnRestructure.addEventListener('click', () => {
    restructurePlan();
});

// Initialize
renderTasks();
analyzeWorkload();

// Set native minimum date constraint
const tDay = new Date();
const todayString = new Date(tDay.getTime() - (tDay.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
const taskDeadlineInput = document.getElementById('task-deadline');
if (taskDeadlineInput) taskDeadlineInput.setAttribute('min', todayString);

// --- Productivity & Notifications Logic ---

function showToast(title, message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="toast-title">${title}</span><span class="toast-message">${message}</span>`;
    toastContainer.appendChild(toast);

    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }

    if (Notification.permission === 'granted' && document.hidden) {
        new Notification(title, { body: message });
    }

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function checkDeadlines() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = tasks.filter(t => {
        if (t.completed) return false;
        const d = new Date(t.deadline);
        d.setHours(0, 0, 0, 0);
        const diff = (d - today) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 1; // due today or tomorrow
    });
    if (upcoming.length > 0) {
        showToast("Deadlines Approaching", `You have ${upcoming.length} task(s) due soon. Time to focus!`);
    }
}
setTimeout(checkDeadlines, 2000);

function formatTimer(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    if (timerDisplay) timerDisplay.textContent = formatTimer(timerSeconds);
}

function startTimer() {
    activeTaskId = focusTaskSelect.value;
    if (!activeTaskId) {
        alert("Please select a task to focus on first!");
        return;
    }

    isTimerRunning = true;
    document.body.classList.add('focus-active');
    btnStartTimer.classList.add('hidden');
    btnPauseTimer.classList.remove('hidden');
    btnStopTimer.classList.remove('hidden');
    focusTaskSelect.disabled = true;
    timerDisplay.classList.add('running');
    timerDisplay.classList.remove('paused');

    showToast("Focus Mode Activated", "Distractions minimized. Time to get to work!");

    timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
            timerSeconds--;
            updateTimerDisplay();

            const tk = tasks.find(t => t.id === activeTaskId);
            if (tk) {
                if (!tk.timeTracked) tk.timeTracked = 0;
                tk.timeTracked++;
            }
        } else {
            stopTimer(true);
        }
    }, 1000);
}

function pauseTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);
    btnStartTimer.classList.remove('hidden');
    btnPauseTimer.classList.add('hidden');
    btnStartTimer.textContent = "Resume";
    timerDisplay.classList.remove('running');
    timerDisplay.classList.add('paused');
    saveTasks();
    renderTasks();
}

function stopTimer(completed = false) {
    isTimerRunning = false;
    clearInterval(timerInterval);
    document.body.classList.remove('focus-active');
    btnStartTimer.classList.remove('hidden');
    btnPauseTimer.classList.add('hidden');
    btnStopTimer.classList.add('hidden');
    btnStartTimer.textContent = "Start Focus";
    focusTaskSelect.disabled = false;
    timerDisplay.classList.remove('running', 'paused');

    if (completed) {
        showToast("Session Complete!", "Great job! Take a short break.");
        timerSeconds = 25 * 60;
    } else {
        showToast("Focus Stopped", "Session aborted. Tracked time has been saved.");
        timerSeconds = 25 * 60;
    }

    saveTasks();
    renderTasks();
    updateTimerDisplay();
}

if (btnStartTimer) btnStartTimer.addEventListener('click', startTimer);
if (btnPauseTimer) btnPauseTimer.addEventListener('click', pauseTimer);
if (btnStopTimer) btnStopTimer.addEventListener('click', () => stopTimer(false));
