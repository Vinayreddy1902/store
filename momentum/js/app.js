/**
 * MOMENTUM APP LOGIC
 * Manages:
 * - Executive Dysfunction Deconstruction Engine
 * - Visual Momentum Ring & Dopamine Score
 * - 3-Minute Initiation Sprint Timer
 * - Soundscapes integration
 * - Local storage persistence
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let tasks = JSON.parse(localStorage.getItem('momentum_tasks') || 'null');
  if (!tasks) {
    // Default starter ADHD momentum queue
    tasks = [
      { id: '1', title: 'Drink a glass of cold water', done: true, minutes: 1, subtasks: [] },
      { id: '2', title: 'Open notebook / laptop to work area', done: false, minutes: 2, subtasks: [] },
      { id: '3', title: 'Set 3-minute timer for priority task', done: false, minutes: 3, subtasks: [] },
      { id: '4', title: 'Brain dump 3 thoughts cluttering mind', done: false, minutes: 3, subtasks: [] }
    ];
  }

  let streak = parseInt(localStorage.getItem('momentum_streak') || '1', 10);
  let focusMinutesToday = parseInt(localStorage.getItem('momentum_focus_min') || '14', 10);

  // Timer State
  let timerDuration = 3 * 60; // 3 minutes in seconds
  let timerRemaining = timerDuration;
  let timerInterval = null;
  let timerRunning = false;

  // DOM Elements
  const viewSections = document.querySelectorAll('.view-section');
  const navItems = document.querySelectorAll('.nav-item');
  const taskList = document.getElementById('task-list');
  const taskInput = document.getElementById('quick-task-input');
  const addTaskBtn = document.getElementById('add-task-btn');
  const momentumRing = document.getElementById('momentum-progress-ring');
  const momentumPercentage = document.getElementById('momentum-percentage');
  const tasksCompletedStat = document.getElementById('tasks-completed-stat');
  const focusMinutesStat = document.getElementById('focus-minutes-stat');
  const queueCount = document.getElementById('queue-count');

  // Timer Elements
  const bigTimerDisplay = document.getElementById('big-timer-display');
  const timerToggleBtn = document.getElementById('timer-toggle-btn');
  const timerResetBtn = document.getElementById('timer-reset-btn');
  const timerPills = document.querySelectorAll('.timer-pill');
  const gammaToggleBtn = document.getElementById('gamma-toggle-btn');

  // Deconstructor Elements
  const dumpTextarea = document.getElementById('brain-dump-textarea');
  const deconstructBtn = document.getElementById('deconstruct-btn');
  const deconstructedArea = document.getElementById('deconstructed-results-area');
  const deconstructedList = document.getElementById('deconstructed-list');

  // Pro & Banner Elements
  const openProBtn = document.getElementById('open-pro-btn');
  const subscribeProBtn = document.getElementById('subscribe-pro-btn');
  const watchRewardedAdBtn = document.getElementById('watch-rewarded-ad-btn');
  const planCards = document.querySelectorAll('.plan-card');

  // ==========================================
  // NAVIGATION
  // ==========================================
  function switchView(viewId) {
    viewSections.forEach(sec => {
      sec.classList.toggle('active', sec.id === viewId);
    });
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewId);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navItems.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  openProBtn.addEventListener('click', () => switchView('view-pro'));

  // ==========================================
  // MOMENTUM RING & METRICS
  // ==========================================
  const CIRCLE_RADIUS = 66;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
  momentumRing.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;

  function updateMomentumScore() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.done).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

    const offset = CIRCLE_CIRCUMFERENCE - (pct / 100) * CIRCLE_CIRCUMFERENCE;
    momentumRing.style.strokeDashoffset = offset;
    momentumPercentage.textContent = `${pct}%`;

    tasksCompletedStat.textContent = completed;
    focusMinutesStat.textContent = `${focusMinutesToday}m`;
    queueCount.textContent = `${tasks.filter(t => !t.done).length} active`;

    localStorage.setItem('momentum_tasks', JSON.stringify(tasks));
    localStorage.setItem('momentum_focus_min', String(focusMinutesToday));
  }

  // ==========================================
  // TASK MANAGEMENT
  // ==========================================
  function renderTasks() {
    taskList.innerHTML = '';

    if (tasks.length === 0) {
      taskList.innerHTML = `
        <div style="text-align:center;padding:2.5rem 1rem;color:var(--text-muted);">
          <div style="font-size:2rem;margin-bottom:0.5rem;">🎉</div>
          <strong>Queue Cleared!</strong>
          <p style="font-size:0.85rem;margin-top:0.25rem;">Add a new friction item or do a Brain Dump.</p>
        </div>
      `;
      updateMomentumScore();
      return;
    }

    tasks.forEach(task => {
      const card = document.createElement('div');
      card.className = `task-item ${task.done ? 'completed' : ''}`;
      card.innerHTML = `
        <div class="task-checkbox ${task.done ? 'checked' : ''}" data-id="${task.id}"></div>
        <div class="task-body">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-meta">
            <span class="micro-step-tag">⏱️ ${task.minutes || 3}m Sprint</span>
            ${task.subtasks && task.subtasks.length > 0 ? `<span class="subtask-count">${task.subtasks.length} steps</span>` : ''}
          </div>
          ${task.subtasks && task.subtasks.length > 0 ? `
            <div class="subtask-list">
              ${task.subtasks.map((st, i) => `
                <div class="subtask-item">
                  <span>${i+1}. ${escapeHtml(st)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <div class="task-actions">
          <button class="breakdown-btn" data-id="${task.id}" title="Split into micro-actions">
            ⚡ Break Down
          </button>
          <button class="delete-btn" data-id="${task.id}" title="Delete">✕</button>
        </div>
      `;

      // Toggle Done
      const cb = card.querySelector('.task-checkbox');
      cb.addEventListener('click', () => toggleTaskDone(task.id));

      // Break Down
      const bdBtn = card.querySelector('.breakdown-btn');
      bdBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        breakDownTask(task.id);
      });

      // Delete
      const delBtn = card.querySelector('.delete-btn');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(task.id);
      });

      taskList.appendChild(card);
    });

    updateMomentumScore();
  }

  function toggleTaskDone(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.done = !task.done;

    if (task.done) {
      window.audioEngine.playDopamineChime();
      focusMinutesToday += (task.minutes || 3);
    }
    renderTasks();
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    renderTasks();
  }

  function addTask(title, minutes = 3, subtasks = []) {
    if (!title.trim()) return;
    tasks.unshift({
      id: 'task-' + Date.now() + Math.random().toString(36).substring(2, 6),
      title: title.trim(),
      done: false,
      minutes: minutes,
      subtasks: subtasks
    });
    renderTasks();
  }

  addTaskBtn.addEventListener('click', () => {
    addTask(taskInput.value);
    taskInput.value = '';
  });
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addTask(taskInput.value);
      taskInput.value = '';
    }
  });

  // ==========================================
  // EXECUTIVE DYSFUNCTION DECONSTRUCTOR
  // ==========================================
  function splitIntoMicroSteps(text) {
    // ADHD Deconstruction Rules Engine
    const lower = text.toLowerCase();
    
    if (lower.includes('clean') || lower.includes('room') || lower.includes('house') || lower.includes('kitchen')) {
      return [
        'Throw away 5 pieces of obvious trash (1 min)',
        'Put all dirty dishes into the sink (2 mins)',
        'Stack all stray papers and clothes into one pile (2 mins)',
        'Wipe down one flat surface (1 min)'
      ];
    }

    if (lower.includes('study') || lower.includes('exam') || lower.includes('read') || lower.includes('homework')) {
      return [
        'Clear desk so only the book / notebook is in sight (1 min)',
        'Open to the target chapter and read the first paragraph (2 mins)',
        'Highlight 3 bold headers or diagrams (2 mins)',
        'Jot down 1 question or takeaway (1 min)'
      ];
    }

    if (lower.includes('email') || lower.includes('message') || lower.includes('reply') || lower.includes('call')) {
      return [
        'Open inbox and find the 1 priority email (1 min)',
        'Write a 2-sentence rough draft without editing (2 mins)',
        'Hit send and close the tab immediately (1 min)'
      ];
    }

    if (lower.includes('exercise') || lower.includes('workout') || lower.includes('gym') || lower.includes('run')) {
      return [
        'Put on running shoes and socks (2 mins)',
        'Fill up water bottle (1 min)',
        'Step outside front door or onto mat (1 min)',
        'Do 5 gentle stretches (2 mins)'
      ];
    }

    // Generic Overwhelm Deconstruction
    return [
      `Step 1: Open the work file / app for "${text}" (1 min)`,
      `Step 2: Write down the single easiest action to take next (2 mins)`,
      `Step 3: Work on it for just 3 minutes with zero perfectionism (3 mins)`
    ];
  }

  function breakDownTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const steps = splitIntoMicroSteps(task.title);
    task.subtasks = steps;
    renderTasks();
  }

  deconstructBtn.addEventListener('click', () => {
    const rawText = dumpTextarea.value.trim();
    if (!rawText) return;

    // Split paragraphs or lines
    const lines = rawText.split(/[\n,;]+/).map(s => s.trim()).filter(s => s.length > 2);
    deconstructedList.innerHTML = '';

    lines.forEach(line => {
      const microSteps = splitIntoMicroSteps(line);
      addTask(line, 5, microSteps);

      const preview = document.createElement('div');
      preview.className = 'task-item';
      preview.innerHTML = `
        <div class="task-body">
          <strong>${escapeHtml(line)}</strong>
          <div style="font-size:0.8rem;color:#38bdf8;margin-top:0.3rem;">
            ↳ Broken into ${microSteps.length} micro-steps & added to queue!
          </div>
        </div>
      `;
      deconstructedList.appendChild(preview);
    });

    deconstructedArea.style.display = 'block';
    dumpTextarea.value = '';
    renderTasks();
  });

  // ==========================================
  // 3-MINUTE INITIATION TIMER
  // ==========================================
  function updateTimerDisplay() {
    const m = Math.floor(timerRemaining / 60);
    const s = timerRemaining % 60;
    bigTimerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function startTimer() {
    if (timerRunning) return;
    timerRunning = true;
    timerToggleBtn.textContent = '⏸ PAUSE';
    timerToggleBtn.classList.add('running');

    timerInterval = setInterval(() => {
      if (timerRemaining > 0) {
        timerRemaining--;
        updateTimerDisplay();
      } else {
        // Timer Finished!
        clearInterval(timerInterval);
        timerRunning = false;
        timerToggleBtn.textContent = '▶ START';
        timerToggleBtn.classList.remove('running');
        window.audioEngine.playDopamineChime();
        focusMinutesToday += Math.round(timerDuration / 60);
        updateMomentumScore();
        alert('⚡ SPRINT COMPLETED! You broke through task initiation resistance!');
      }
    }, 1000);
  }

  function pauseTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
    timerToggleBtn.textContent = '▶ RESUME';
    timerToggleBtn.classList.remove('running');
  }

  timerToggleBtn.addEventListener('click', () => {
    if (timerRunning) pauseTimer();
    else startTimer();
  });

  timerResetBtn.addEventListener('click', () => {
    pauseTimer();
    timerRemaining = timerDuration;
    updateTimerDisplay();
    timerToggleBtn.textContent = '▶ START';
  });

  timerPills.forEach(pill => {
    pill.addEventListener('click', () => {
      timerPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      timerDuration = parseInt(pill.dataset.time, 10) * 60;
      timerRemaining = timerDuration;
      pauseTimer();
      updateTimerDisplay();
    });
  });

  // Gamma audio toggle in timer
  let gammaPlaying = false;
  gammaToggleBtn.addEventListener('click', () => {
    gammaPlaying = window.audioEngine.toggle('gamma');
    gammaToggleBtn.textContent = gammaPlaying ? 'Stop Gamma Audio ⏹' : 'Play Gamma Beats 🔊';
    gammaToggleBtn.classList.toggle('playing', gammaPlaying);
  });

  // ==========================================
  // SOUNDS LIBRARY
  // ==========================================
  const soundBtns = document.querySelectorAll('.sound-btn');
  soundBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const isPlaying = window.audioEngine.toggle(type);
      soundBtns.forEach(b => {
        b.textContent = b.dataset.type === 'brown' ? 'Play Brown Noise' : b.dataset.type === 'gamma' ? 'Play 40Hz Gamma' : 'Play 10Hz Alpha';
        b.classList.remove('playing');
      });
      if (isPlaying) {
        btn.textContent = '⏹ Stop Soundscape';
        btn.classList.add('playing');
      }
    });
  });

  // ==========================================
  // PRO STORE & AD REWARDS
  // ==========================================
  let selectedPlan = 'annual';
  planCards.forEach(card => {
    card.addEventListener('click', () => {
      planCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedPlan = card.dataset.plan;
    });
  });

  subscribeProBtn.addEventListener('click', async () => {
    subscribeProBtn.disabled = true;
    subscribeProBtn.textContent = 'Connecting to Google Play...';
    const result = await window.storeManager.purchasePro(selectedPlan);
    alert(result.message || 'Purchased successfully!');
    subscribeProBtn.disabled = false;
    subscribeProBtn.textContent = 'Unlock Momentum Pro 🚀';
    updateProUI();
  });

  watchRewardedAdBtn.addEventListener('click', async () => {
    watchRewardedAdBtn.disabled = true;
    watchRewardedAdBtn.textContent = 'Loading Rewarded Ad...';
    const res = await window.storeManager.watchRewardedAd();
    alert(`🎉 24 Hours of Momentum Pro unlocked! Enjoy the focus session.`);
    watchRewardedAdBtn.disabled = false;
    watchRewardedAdBtn.textContent = '📺 Watch a 15s Ad to Unlock Pro Today';
    updateProUI();
  });

  function updateProUI() {
    const isPro = window.storeManager.hasProAccess();
    if (isPro) {
      openProBtn.innerHTML = '👑 <span style="color:#00e599;">PRO ACTIVE</span>';
      openProBtn.style.borderColor = '#00e599';
    }
  }

  window.addEventListener('momentum:pro_status_changed', updateProUI);

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;');
  }

  // Initializations
  updateTimerDisplay();
  renderTasks();
  updateProUI();
});

