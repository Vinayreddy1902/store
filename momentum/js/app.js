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
          <button class="focus-now-btn" data-id="${task.id}" title="Launch 3-min focus sprint on this task" style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);color:#f59e0b;padding:0.35rem 0.6rem;border-radius:8px;font-size:0.75rem;cursor:pointer;font-weight:700;">
            🎯 Sprint
          </button>
          <button class="breakdown-btn" data-id="${task.id}" title="Split into micro-actions">
            ⚡ Break Down
          </button>
          <button class="delete-btn" data-id="${task.id}" title="Delete">✕</button>
        </div>
      `;

      // Toggle Done
      const cb = card.querySelector('.task-checkbox');
      cb.addEventListener('click', () => toggleTaskDone(task.id));

      // Quick Focus Sprint
      const focusBtn = card.querySelector('.focus-now-btn');
      focusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        timerRemaining = 3 * 60;
        timerDuration = 3 * 60;
        document.getElementById('timer-task-label').textContent = `Current: ${task.title}`;
        switchView('view-timer');
        startTimer();
        window.audioEngine.playBrownNoise();
        showDopamineToast('Hyperfocus Engaged! 🎧', `3-min sprint running on "${task.title.slice(0, 22)}..."`, '🎯');
      });

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
      showDopamineToast('Micro-Step Won! ⚡', '+10 Dopamine Points earned. Keep the wave going.', '🎉');
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
  // NATIVE CELEBRATION TOAST & HAPTICS
  // ==========================================
  const toast = document.getElementById('dopamine-toast');
  const toastTitle = document.getElementById('toast-title');
  const toastMessage = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');
  const toastCloseBtn = document.getElementById('toast-close-btn');
  let toastTimeout = null;

  function showDopamineToast(title, message, icon = '⚡') {
    if (!toast) return;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    toastIcon.textContent = icon;
    toast.classList.add('show');

    if (navigator.vibrate) {
      try { navigator.vibrate([40, 60, 40]); } catch (e) {}
    }

    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 4200);
  }

  if (toastCloseBtn) {
    toastCloseBtn.addEventListener('click', () => {
      toast.classList.remove('show');
    });
  }

  // ==========================================
  // EXECUTIVE DYSFUNCTION DECONSTRUCTOR
  // ==========================================
  function splitIntoMicroSteps(text) {
    const lower = text.toLowerCase();
    
    // 1. Cleaning & Household Paralyzing Chaos
    if (lower.includes('clean') || lower.includes('room') || lower.includes('house') || lower.includes('kitchen') || lower.includes('tidy')) {
      return [
        'Throw away 5 pieces of obvious trash (1 min)',
        'Put all dirty dishes into the sink with soap running (2 mins)',
        'Stack all stray papers and clothes into one pile (2 mins)',
        'Wipe down just ONE flat surface with a wet cloth (1 min)'
      ];
    }

    // 2. Financial, Taxes, Bills & Admin Dread
    if (lower.includes('tax') || lower.includes('bill') || lower.includes('invoice') || lower.includes('budget') || lower.includes('finance') || lower.includes('bank')) {
      return [
        'Open laptop and navigate to the target portal bookmark (1 min)',
        'Download the single required statement or PDF (2 mins)',
        'Create a new desktop folder named "Action Done" (1 min)',
        'Fill in just the first 2 required fields without submitting (3 mins)'
      ];
    }

    // 3. Coding, Software & Bug Fixing Overwhelm
    if (lower.includes('code') || lower.includes('bug') || lower.includes('program') || lower.includes('git') || lower.includes('deploy') || lower.includes('software')) {
      return [
        'Open terminal / IDE to the project directory (1 min)',
        'Write 1 failing unit test or reproduce the exact console error (2 mins)',
        'Add a single console.log or breakpoint to trace the parameter (2 mins)',
        'Write 3 lines of pseudocode for the fix (2 mins)'
      ];
    }

    // 4. Writing, Essays, Documentation & Creative Blocks
    if (lower.includes('write') || lower.includes('essay') || lower.includes('article') || lower.includes('draft') || lower.includes('doc') || lower.includes('blog')) {
      return [
        'Open a blank document and write a silly working title (1 min)',
        'Dump 3 bullet points of what you want the reader to feel (2 mins)',
        'Write the ugliest first sentence possible without hitting backspace (2 mins)',
        'Turn on 40Hz Gamma Audio and freewrite for 3 minutes (3 mins)'
      ];
    }

    // 5. Laundry & Wardrobe Avalanche
    if (lower.includes('laundry') || lower.includes('clothes') || lower.includes('fold') || lower.includes('wash')) {
      return [
        'Pick up all dirty clothes off the floor and put them into the basket (2 mins)',
        'Dump one basket load into the washing machine & start cycle (2 mins)',
        'Fold just 3 shirts or pairs of socks (2 mins)',
        'Hang up just 2 jackets (1 min)'
      ];
    }

    // 6. Food, Cooking & Grocery Decision Fatigue
    if (lower.includes('cook') || lower.includes('dinner') || lower.includes('meal') || lower.includes('grocery') || lower.includes('food')) {
      return [
        'Drink a glass of water and check fridge for 2 ingredients (1 min)',
        'Pull out one pan and set it on the stove (1 min)',
        'Cut or prep just 1 ingredient (2 mins)',
        'Order grocery staples or start heating water (2 mins)'
      ];
    }

    // 7. Academic, Study & Research Procrastination
    if (lower.includes('study') || lower.includes('exam') || lower.includes('read') || lower.includes('homework') || lower.includes('learn')) {
      return [
        'Clear desk so only the book / notebook is in sight (1 min)',
        'Open to the target chapter and read the first paragraph (2 mins)',
        'Highlight 3 bold headers or diagrams (2 mins)',
        'Write 1 question on an index card (1 min)'
      ];
    }

    // 8. Communication & Dreaded Messages/Calls
    if (lower.includes('email') || lower.includes('message') || lower.includes('reply') || lower.includes('call') || lower.includes('text')) {
      return [
        'Open inbox and isolate the 1 priority email (1 min)',
        'Write a 2-sentence rough draft without editing (2 mins)',
        'Copy-paste into reply box and immediately hit Send (1 min)'
      ];
    }

    // 9. Workout & Physical Inertia
    if (lower.includes('exercise') || lower.includes('workout') || lower.includes('gym') || lower.includes('run') || lower.includes('walk')) {
      return [
        'Put on workout shorts and running shoes (2 mins)',
        'Fill your water bottle to the brim (1 min)',
        'Step outside your front door or step onto yoga mat (1 min)',
        'Do 10 jumping jacks or gentle stretches (2 mins)'
      ];
    }

    // 10. Appointments & Medical Errands
    if (lower.includes('doctor') || lower.includes('dentist') || lower.includes('appointment') || lower.includes('schedule')) {
      return [
        'Locate the phone number or booking URL (1 min)',
        'Write down your calendar availability on paper (1 min)',
        'Dial number or click calendar slot (2 mins)'
      ];
    }

    // Universal Anti-Overwhelm Deconstruction
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
        showDopamineToast('Sprint Completed! ⚡', 'Initiation resistance shattered. +15 Dopamine Points!', '🏆');
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
    showDopamineToast(result.success ? 'Momentum Pro Activated! 👑' : 'Purchase unavailable', result.success ? result.message : (result.error || 'Verification required'), result.success ? '👑' : '⚠️');
    subscribeProBtn.disabled = false;
    subscribeProBtn.textContent = 'Unlock Momentum Pro 🚀';
    updateProUI();
  });

  watchRewardedAdBtn.addEventListener('click', async () => {
    watchRewardedAdBtn.disabled = true;
    watchRewardedAdBtn.textContent = 'Loading Rewarded Ad...';
    const res = await window.storeManager.watchRewardedAd();
    showDopamineToast(res.success ? '24h Pro Unlocked! 📺' : 'Reward unavailable', res.success ? 'Enjoy your verified reward.' : (res.error || 'Verification required'), res.success ? '🎁' : '⚠️');
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

