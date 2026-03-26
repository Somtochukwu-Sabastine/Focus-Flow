# Focus Flow - Academic Coach

Focus Flow is a personal academic coach designed to help students maximize their productivity, intelligently manage workload, and avoid burnout. 

This simple web app runs completely in the browser, storing all your study plans and progress locally. It combines task management with a built-in focus timer to ensure you're spending time effectively without overloading your daily capacity.

## Features

- **Dashboard & Workload AI Insights**
  - Get a heatmap visualization of your planned workload over the next days.
  - Receive automated AI warnings if your daily schedule is overloaded (based on a default capacity, e.g., 4 hours/day).
  - One-click plan restructuring to balance workload across available days gracefully.

- **Study Plan Management**
  - Add academic goals (tasks) with titles, estimated effort (hours), and deadlines.
  - Mark tasks as complete, or individually delete tasks when they're no longer needed.
  - Sorts your tasks automatically by nearest deadline.
  - Informs you about upcoming deadlines with automated local toast notifications.

- **Focus Mode & Pomodoro Timer**
  - Select a task from your active study plan.
  - Start a 25-minute focus session where background distractions are minimized.
  - The app tracks how much time you've explicitly spent focused on each individual task.
  - Shows progress, pause, and stop controls gracefully.

## Tech Stack

This project is built using vanilla web technologies, making it extremely lightweight and accessible:
- **HTML5:** Semantic structure.
- **CSS3:** Custom styling featuring a dynamic dark theme, glassmorphism UI elements, responsive grid layout, and custom animations.
- **JavaScript (ES6+):** Pure vanilla JavaScript handling state management, DOM manipulation, timers, and the logical workload balancer.
- **LocalStorage:** Used for persistence of your study tasks across browser sessions.

## Getting Started

1. **Clone or Download the Repository:**
   Save the project files to your local machine.

2. **Open the App:**
   Simply double-click on `index.html` to open it in your preferred modern web browser. 
   *(No server, Node.js, or build step is required!)*

3. **Usage Flow:**
   - Enter your first academic goal via the "Add Academic Goal" section.
   - Specify the Title, Estimated Hours needed, and the Deadline.
   - Click "Add to Plan".
   - The AI will evaluate your plan and display it on the heatmap. If you've scheduled too much on a single day, use the **Optimize My Plan** button.
   - When you're ready to study, select your task in the **Focus & Timer** section and hit **Start Focus**.

## Project Files

- **`index.html`** - The core structural layout of the application.
- **`style.css`** - All the styling and aesthetic rules (Glass UI, Focus states, responsive CSS).
- **`app.js`** - Application logic, state management, workload distribution algorithm, and focus timer mechanisms.
