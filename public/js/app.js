/* ================================================================
   LIFE IN WEEKS — Main Application Logic
   ================================================================ */

(function () {
    'use strict';

    // ---- STATE ----
    let state = {
        profile: null,
        chapters: [],
        journal: [],
        milestones: [],
        goals: [],
        snapshots: [],
        settings: { theme: 'coral', mode: 'dark', view: 'weeks', reminder_enabled: 'true' },
        currentView: 'weeks',
        heatmapMode: false,
        selectedWeek: null
    };

    // ---- API HELPERS ----
    function handleAuthError(r) {
        if (r.status === 401) {
            window.location.href = '/login.html';
            throw new Error('Not authenticated');
        }
        return r;
    }

    const api = {
        async get(url) { const r = handleAuthError(await fetch(url, { credentials: 'same-origin' })); return r.json(); },
        async post(url, data) {
            const r = handleAuthError(await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'same-origin' }));
            return r.json();
        },
        async put(url, data) {
            const r = handleAuthError(await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'same-origin' }));
            return r.json();
        },
        async del(url) { const r = handleAuthError(await fetch(url, { method: 'DELETE', credentials: 'same-origin' })); return r.json(); },
        async upload(url, formData) {
            const r = handleAuthError(await fetch(url, { method: 'POST', body: formData, credentials: 'same-origin' }));
            return r.json();
        }
    };

    // ---- DATE UTILITIES ----
    function getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    function getWeekDateRange(birthDate, yearIndex, weekIndex) {
        const birth = new Date(birthDate);
        const start = new Date(birth);
        start.setDate(start.getDate() + (yearIndex * 365.25) + (weekIndex * 7));
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return {
            start: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            end: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
    }

    function weeksBetween(d1, d2) {
        return Math.floor((d2 - d1) / (7 * 24 * 60 * 60 * 1000));
    }

    function dateToYearWeek(birthDate, targetDate) {
        const birth = new Date(birthDate);
        const target = new Date(targetDate);
        const totalWeeks = weeksBetween(birth, target);
        return { year: Math.floor(totalWeeks / 52), week: totalWeeks % 52 };
    }

    function yearWeekToDate(birthDate, year, week) {
        const birth = new Date(birthDate);
        const d = new Date(birth);
        d.setDate(d.getDate() + year * 364 + week * 7);
        return d;
    }

    // ---- INITIALIZATION ----
    async function init() {
        try {
            const data = await api.get('/api/grid-data');
            if (!data.profile) {
                showOnboarding();
            } else {
                state.profile = data.profile;
                state.chapters = data.chapters || [];
                state.journal = data.journal || [];
                state.milestones = data.milestones || [];
                state.goals = data.goals || [];
                state.snapshots = data.snapshots || [];
                if (data.settings) state.settings = { ...state.settings, ...data.settings };
                applyTheme();
                showApp();
            }
            setupEventListeners();
            setupReminder();
        } catch (err) {
            // If not authenticated, handleAuthError already redirected
            if (err.message !== 'Not authenticated') console.error('Init error:', err);
        }
    }

    function applyTheme() {
        document.documentElement.setAttribute('data-theme', state.settings.mode || 'dark');
        document.documentElement.setAttribute('data-palette', state.settings.theme || 'coral');
    }

    function showOnboarding() {
        document.getElementById('onboarding-overlay').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
    }

    function showApp() {
        document.getElementById('onboarding-overlay').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('user-name').textContent = state.profile.name || '';
        state.currentView = state.settings.view || 'weeks';
        updateViewToggle();
        renderLifeBar();
        renderGrid();
        renderStats();
        renderChapters();
        renderMilestones();
        renderGoals();
        renderSettings();
    }

    // ---- EVENT LISTENERS ----
    function setupEventListeners() {
        // Onboarding form
        document.getElementById('onboarding-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('ob-name').value.trim();
            const birth_date = document.getElementById('ob-dob').value;
            const lifespan = parseInt(document.getElementById('ob-lifespan').value) || 80;
            state.profile = await api.post('/api/profile', { name, birth_date, lifespan });
            showApp();
            showToast('🎉 Welcome to Life in Weeks!');
        });

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
                document.getElementById(`section-${section}`).classList.remove('hidden');
                document.getElementById(`section-${section}`).classList.add('active');
            });
        });

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.currentView = btn.dataset.view;
                updateViewToggle();
                renderGrid();
                api.put('/api/settings', { view: state.currentView });
            });
        });

        // Heatmap toggle
        document.getElementById('heatmap-toggle').addEventListener('change', (e) => {
            state.heatmapMode = e.target.checked;
            renderGrid();
        });

        // Export
        document.getElementById('export-grid-btn').addEventListener('click', exportGrid);

        // Journal panel
        document.getElementById('journal-close').addEventListener('click', closeJournal);
        document.getElementById('journal-save').addEventListener('click', saveJournal);

        // Rating stars
        document.querySelectorAll('#rating-stars .star').forEach(star => {
            star.addEventListener('click', () => {
                const rating = parseInt(star.dataset.rating);
                state.selectedWeek.rating = rating;
                updateStars(rating);
            });
        });

        // Snapshot upload
        document.getElementById('snapshot-input').addEventListener('change', uploadSnapshot);

        // Add buttons
        document.getElementById('add-chapter-btn').addEventListener('click', () => openModal('chapter'));
        document.getElementById('add-milestone-btn').addEventListener('click', () => openModal('milestone'));
        document.getElementById('add-goal-btn').addEventListener('click', () => openModal('goal'));

        // Modal close on overlay click
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeModal();
        });

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'grid-tooltip';
        tooltip.id = 'grid-tooltip';
        document.body.appendChild(tooltip);
    }

    function updateViewToggle() {
        document.querySelectorAll('.view-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.view === state.currentView);
        });
    }

    // ---- LIFE BAR ----
    function renderLifeBar() {
        if (!state.profile) return;
        const birth = new Date(state.profile.birth_date);
        const now = new Date();
        const totalWeeks = state.profile.lifespan * 52;
        const lived = weeksBetween(birth, now);
        const remaining = Math.max(0, totalWeeks - lived);
        const pct = Math.min(100, (lived / totalWeeks) * 100);

        document.getElementById('weeks-lived').textContent = lived.toLocaleString();
        document.getElementById('weeks-remaining').textContent = remaining.toLocaleString();
        document.getElementById('life-percent').textContent = pct.toFixed(1) + '%';
        document.getElementById('life-bar-fill').style.width = pct + '%';
        document.getElementById('life-bar-current').style.left = pct + '%';
    }

    // ---- WEEK GRID ----
    function renderGrid() {
        const container = document.getElementById('week-grid');
        const yearLabels = document.getElementById('grid-year-labels');
        container.innerHTML = '';
        yearLabels.innerHTML = '';

        if (!state.profile) return;

        if (state.currentView === 'weeks') renderWeeksGrid(container, yearLabels);
        else if (state.currentView === 'months') renderMonthsGrid(container, yearLabels);
        else if (state.currentView === 'years') renderYearsGrid(container, yearLabels);
        else if (state.currentView === 'era') renderEraGrid(container, yearLabels);
    }

    function renderWeeksGrid(container, yearLabels) {
        const lifespan = state.profile.lifespan;
        const birth = new Date(state.profile.birth_date);
        const now = new Date();
        const totalLivedWeeks = weeksBetween(birth, now);
        const currentYear = Math.floor(totalLivedWeeks / 52);
        const currentWeek = totalLivedWeeks % 52;

        // Build lookup maps
        const journalMap = {};
        state.journal.forEach(j => { journalMap[`${j.year}-${j.week}`] = j; });
        const snapshotMap = {};
        state.snapshots.forEach(s => { snapshotMap[`${s.year}-${s.week}`] = s; });
        const milestoneMap = {};
        state.milestones.forEach(m => {
            const yw = dateToYearWeek(state.profile.birth_date, m.date);
            const key = `${yw.year}-${yw.week}`;
            milestoneMap[key] = m;
        });
        const goalMap = {};
        state.goals.forEach(g => {
            const yw = dateToYearWeek(state.profile.birth_date, g.target_date);
            const key = `${yw.year}-${yw.week}`;
            goalMap[key] = g;
        });

        // Fragment for performance
        const gridFrag = document.createDocumentFragment();
        const labelFrag = document.createDocumentFragment();

        for (let y = 0; y < lifespan; y++) {
            // Year label
            const label = document.createElement('div');
            label.className = 'year-label' + (y % 10 === 0 ? ' decade' : '');
            label.textContent = y;
            labelFrag.appendChild(label);

            // Week row
            const row = document.createElement('div');
            row.className = 'week-row';

            for (let w = 0; w < 52; w++) {
                const cell = document.createElement('div');
                cell.className = 'week-cell';
                const weekIndex = y * 52 + w;
                const key = `${y}-${w}`;

                // Past/current/future
                if (y < currentYear || (y === currentYear && w < currentWeek)) {
                    cell.classList.add('filled');
                    // Chapter color
                    const color = getChapterColor(y, w);
                    if (color) cell.style.background = color;
                } else if (y === currentYear && w === currentWeek) {
                    cell.classList.add('current');
                }

                // Heatmap mode
                if (state.heatmapMode && journalMap[key] && journalMap[key].rating) {
                    cell.classList.add(`rating-${journalMap[key].rating}`);
                }

                // Indicators
                if (journalMap[key] && journalMap[key].note) cell.classList.add('has-note');
                if (milestoneMap[key]) cell.classList.add('has-milestone');
                if (goalMap[key]) cell.classList.add('has-goal');
                if (snapshotMap[key]) cell.classList.add('has-snapshot');

                // Data attributes for tooltip/click
                cell.dataset.year = y;
                cell.dataset.week = w;

                // Tooltip handlers
                cell.addEventListener('mouseenter', showTooltip);
                cell.addEventListener('mouseleave', hideTooltip);
                cell.addEventListener('click', () => openJournal(y, w));

                row.appendChild(cell);
            }
            gridFrag.appendChild(row);
        }

        yearLabels.appendChild(labelFrag);
        container.appendChild(gridFrag);
    }

    function renderMonthsGrid(container, yearLabels) {
        const lifespan = state.profile.lifespan;
        const birth = new Date(state.profile.birth_date);
        const now = new Date();
        const ageMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
        const currentYearIdx = Math.floor(ageMonths / 12);
        const currentMonth = ageMonths % 12;

        container.className = 'month-grid';
        yearLabels.innerHTML = '';

        const gridFrag = document.createDocumentFragment();
        const labelFrag = document.createDocumentFragment();

        for (let y = 0; y < lifespan; y++) {
            const label = document.createElement('div');
            label.className = 'year-label' + (y % 10 === 0 ? ' decade' : '');
            label.style.height = '19px';
            label.textContent = y;
            labelFrag.appendChild(label);

            const row = document.createElement('div');
            row.className = 'month-row';
            for (let m = 0; m < 12; m++) {
                const cell = document.createElement('div');
                cell.className = 'month-cell';
                if (y < currentYearIdx || (y === currentYearIdx && m < currentMonth)) {
                    cell.classList.add('filled');
                    const color = getChapterColorForMonth(y, m);
                    if (color) cell.style.background = color;
                } else if (y === currentYearIdx && m === currentMonth) {
                    cell.classList.add('current');
                }
                row.appendChild(cell);
            }
            gridFrag.appendChild(row);
        }

        yearLabels.appendChild(labelFrag);
        container.appendChild(gridFrag);
    }

    function renderYearsGrid(container) {
        const lifespan = state.profile.lifespan;
        const birth = new Date(state.profile.birth_date);
        const now = new Date();
        const ageYears = Math.floor((now - birth) / (365.25 * 24 * 60 * 60 * 1000));

        container.className = 'year-grid';
        const frag = document.createDocumentFragment();

        for (let y = 0; y < lifespan; y++) {
            const cell = document.createElement('div');
            cell.className = 'year-cell';
            cell.textContent = y;
            if (y < ageYears) {
                cell.classList.add('filled');
                const color = getChapterColorForYear(y);
                if (color) cell.style.background = color;
            } else if (y === ageYears) {
                cell.classList.add('current');
            }
            frag.appendChild(cell);
        }
        container.appendChild(frag);
    }

    function renderEraGrid(container) {
        container.className = 'era-grid';
        if (!state.chapters.length) {
            container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">No chapters defined yet. Add life chapters to see them here.</p>';
            return;
        }

        const totalWeeks = state.profile.lifespan * 52;

        state.chapters.forEach(ch => {
            const startYW = dateToYearWeek(state.profile.birth_date, ch.start_date);
            const startWeek = startYW.year * 52 + startYW.week;
            let endWeek = totalWeeks;
            if (ch.end_date) {
                const endYW = dateToYearWeek(state.profile.birth_date, ch.end_date);
                endWeek = endYW.year * 52 + endYW.week;
            }
            const widthPercent = ((endWeek - startWeek) / totalWeeks) * 100;
            const leftPercent = (startWeek / totalWeeks) * 100;

            const bar = document.createElement('div');
            bar.className = 'era-bar';
            bar.innerHTML = `
                <span class="era-label">${ch.name}</span>
                <div class="era-track">
                    <div class="era-fill" style="width:${widthPercent}%;margin-left:${leftPercent}%;background:${ch.color}"></div>
                </div>
                <span class="era-dates">${ch.start_date} → ${ch.end_date || 'Present'}</span>
            `;
            container.appendChild(bar);
        });
    }

    // ---- CHAPTER COLOR HELPERS ----
    function getChapterColor(yearIdx, weekIdx) {
        if (!state.chapters.length) return null;
        const weekDate = yearWeekToDate(state.profile.birth_date, yearIdx, weekIdx);
        for (const ch of state.chapters) {
            const start = new Date(ch.start_date);
            const end = ch.end_date ? new Date(ch.end_date) : new Date();
            if (weekDate >= start && weekDate <= end) return ch.color;
        }
        return null;
    }

    function getChapterColorForMonth(yearIdx, monthIdx) {
        const birth = new Date(state.profile.birth_date);
        const d = new Date(birth.getFullYear() + yearIdx, birth.getMonth() + monthIdx, 1);
        for (const ch of state.chapters) {
            const start = new Date(ch.start_date);
            const end = ch.end_date ? new Date(ch.end_date) : new Date();
            if (d >= start && d <= end) return ch.color;
        }
        return null;
    }

    function getChapterColorForYear(yearIdx) {
        const birth = new Date(state.profile.birth_date);
        const d = new Date(birth.getFullYear() + yearIdx, birth.getMonth(), birth.getDate());
        for (const ch of state.chapters) {
            const start = new Date(ch.start_date);
            const end = ch.end_date ? new Date(ch.end_date) : new Date();
            if (d >= start && d <= end) return ch.color;
        }
        return null;
    }

    // ---- TOOLTIP ----
    function showTooltip(e) {
        const cell = e.target;
        const y = parseInt(cell.dataset.year);
        const w = parseInt(cell.dataset.week);
        const range = getWeekDateRange(state.profile.birth_date, y, w);
        const journal = state.journal.find(j => j.year === y && j.week === w);
        const chapter = getChapterName(y, w);

        let html = `<strong>Year ${y}, Week ${w + 1}</strong>`;
        html += `<div class="tooltip-date">${range.start} – ${range.end}</div>`;
        if (chapter) html += `<div class="tooltip-chapter">${chapter}</div>`;
        if (journal && journal.rating) html += `<div>${'★'.repeat(journal.rating)}${'☆'.repeat(5 - journal.rating)}</div>`;
        if (journal && journal.note) html += `<div style="margin-top:4px;font-size:0.72rem;color:var(--text-muted)">${journal.note.substring(0, 80)}${journal.note.length > 80 ? '…' : ''}</div>`;

        const tooltip = document.getElementById('grid-tooltip');
        tooltip.innerHTML = html;
        tooltip.classList.add('visible');

        const rect = cell.getBoundingClientRect();
        tooltip.style.left = rect.right + 8 + 'px';
        tooltip.style.top = rect.top + 'px';

        // Keep tooltip within viewport
        const tr = tooltip.getBoundingClientRect();
        if (tr.right > window.innerWidth) tooltip.style.left = (rect.left - tr.width - 8) + 'px';
        if (tr.bottom > window.innerHeight) tooltip.style.top = (window.innerHeight - tr.height - 8) + 'px';
    }

    function hideTooltip() {
        document.getElementById('grid-tooltip').classList.remove('visible');
    }

    function getChapterName(yearIdx, weekIdx) {
        const weekDate = yearWeekToDate(state.profile.birth_date, yearIdx, weekIdx);
        for (const ch of state.chapters) {
            const start = new Date(ch.start_date);
            const end = ch.end_date ? new Date(ch.end_date) : new Date();
            if (weekDate >= start && weekDate <= end) return ch.name;
        }
        return null;
    }

    // ---- JOURNAL PANEL ----
    function openJournal(year, week) {
        const panel = document.getElementById('journal-panel');
        panel.classList.remove('hidden');
        setTimeout(() => panel.classList.add('open'), 10);

        const range = getWeekDateRange(state.profile.birth_date, year, week);
        document.getElementById('journal-title').textContent = `Year ${year}, Week ${week + 1}`;
        document.getElementById('journal-date-range').textContent = `${range.start} – ${range.end}`;

        const entry = state.journal.find(j => j.year === year && j.week === week);
        document.getElementById('journal-note').value = entry ? (entry.note || '') : '';
        updateStars(entry ? (entry.rating || 0) : 0);

        // Snapshot
        const snap = state.snapshots.find(s => s.year === year && s.week === week);
        const preview = document.getElementById('snapshot-preview');
        if (snap) {
            preview.src = `/uploads/${snap.filename}`;
            preview.classList.remove('hidden');
        } else {
            preview.classList.add('hidden');
        }

        state.selectedWeek = { year, week, rating: entry ? entry.rating : 0 };
    }

    function closeJournal() {
        const panel = document.getElementById('journal-panel');
        panel.classList.remove('open');
        setTimeout(() => panel.classList.add('hidden'), 350);
    }

    async function saveJournal() {
        if (!state.selectedWeek) return;
        const note = document.getElementById('journal-note').value.trim();
        const rating = state.selectedWeek.rating || null;
        const result = await api.post('/api/journal', {
            year: state.selectedWeek.year,
            week: state.selectedWeek.week,
            note: note || null,
            rating
        });

        // Update local state
        const idx = state.journal.findIndex(j => j.year === state.selectedWeek.year && j.week === state.selectedWeek.week);
        if (idx >= 0) state.journal[idx] = result;
        else state.journal.push(result);

        renderGrid();
        showToast('✨ Journal entry saved');
    }

    function updateStars(rating) {
        document.querySelectorAll('#rating-stars .star').forEach(s => {
            s.classList.toggle('active', parseInt(s.dataset.rating) <= rating);
        });
    }

    async function uploadSnapshot() {
        if (!state.selectedWeek) return;
        const input = document.getElementById('snapshot-input');
        if (!input.files.length) return;

        const formData = new FormData();
        formData.append('photo', input.files[0]);
        formData.append('year', state.selectedWeek.year);
        formData.append('week', state.selectedWeek.week);

        const result = await api.upload('/api/snapshots', formData);
        state.snapshots = state.snapshots.filter(s => !(s.year === state.selectedWeek.year && s.week === state.selectedWeek.week));
        state.snapshots.push(result);

        const preview = document.getElementById('snapshot-preview');
        preview.src = `/uploads/${result.filename}`;
        preview.classList.remove('hidden');

        renderGrid();
        showToast('📷 Snapshot uploaded');
    }

    // ---- STATS ----
    function renderStats() {
        if (!state.profile) return;
        const container = document.getElementById('stats-content');
        const birth = new Date(state.profile.birth_date);
        const now = new Date();
        const totalWeeks = state.profile.lifespan * 52;
        const lived = weeksBetween(birth, now);
        const remaining = Math.max(0, totalWeeks - lived);
        const pct = Math.min(100, (lived / totalWeeks) * 100);
        const ageYears = Math.floor((now - birth) / (365.25 * 24 * 60 * 60 * 1000));

        // Journal stats
        const ratedWeeks = state.journal.filter(j => j.rating);
        const avgRating = ratedWeeks.length ? (ratedWeeks.reduce((s, j) => s + j.rating, 0) / ratedWeeks.length).toFixed(1) : '—';
        const journalEntries = state.journal.filter(j => j.note).length;
        const currentChapter = getCurrentChapter();

        // Historical context
        const internetEra = new Date('1991-08-06');
        const smartphoneEra = new Date('2007-06-29');
        const aliveDuringInternet = now > internetEra ? Math.max(0, weeksBetween(birth > internetEra ? birth : internetEra, now)) : 0;
        const aliveDuringSmartphone = now > smartphoneEra ? Math.max(0, weeksBetween(birth > smartphoneEra ? birth : smartphoneEra, now)) : 0;

        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-title">Life Progress</span>
                    <span class="stat-card-icon">⏳</span>
                </div>
                <div class="stat-card-value">${pct.toFixed(1)}%</div>
                <div class="stat-card-sub">${lived.toLocaleString()} of ${totalWeeks.toLocaleString()} weeks</div>
                <div class="stat-bar"><div class="stat-bar-fill" style="width:${pct}%"></div></div>
            </div>

            <div class="stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-title">Current Age</span>
                    <span class="stat-card-icon">🎂</span>
                </div>
                <div class="stat-card-value">${ageYears}</div>
                <div class="stat-card-sub">years old · Week ${lived % 52 + 1} of year ${Math.floor(lived / 52)}</div>
            </div>

            <div class="stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-title">Weeks Remaining</span>
                    <span class="stat-card-icon">💎</span>
                </div>
                <div class="stat-card-value">${remaining.toLocaleString()}</div>
                <div class="stat-card-sub">${(remaining / 52).toFixed(1)} years left to make count</div>
                <div class="diamond-viz">
                    <div class="diamond-count">
                        💎 ${remaining.toLocaleString()}
                        <small>diamonds remaining in your spoon</small>
                    </div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-title">Current Chapter</span>
                    <span class="stat-card-icon">📖</span>
                </div>
                <div class="stat-card-value">${currentChapter || '—'}</div>
                <div class="stat-card-sub">${state.chapters.length} total chapters defined</div>
            </div>

            <div class="stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-title">Journal Entries</span>
                    <span class="stat-card-icon">📝</span>
                </div>
                <div class="stat-card-value">${journalEntries}</div>
                <div class="stat-card-sub">Avg rating: ${avgRating} · ${ratedWeeks.length} weeks rated</div>
            </div>

            <div class="stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-title">Milestones & Goals</span>
                    <span class="stat-card-icon">🎯</span>
                </div>
                <div class="stat-card-value">${state.milestones.length + state.goals.length}</div>
                <div class="stat-card-sub">${state.milestones.length} milestones · ${state.goals.length} goals (${state.goals.filter(g => g.completed).length} completed)</div>
            </div>

            <div class="stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-title">Internet Era</span>
                    <span class="stat-card-icon">🌐</span>
                </div>
                <div class="stat-card-value">${aliveDuringInternet.toLocaleString()}</div>
                <div class="stat-card-sub">weeks alive during the internet era (since Aug 1991)</div>
            </div>

            <div class="stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-title">Smartphone Era</span>
                    <span class="stat-card-icon">📱</span>
                </div>
                <div class="stat-card-value">${aliveDuringSmartphone.toLocaleString()}</div>
                <div class="stat-card-sub">weeks alive since the first iPhone (Jun 2007)</div>
            </div>
        `;
    }

    function getCurrentChapter() {
        const now = new Date();
        for (const ch of state.chapters) {
            const start = new Date(ch.start_date);
            const end = ch.end_date ? new Date(ch.end_date) : new Date('2200-01-01');
            if (now >= start && now <= end) return ch.name;
        }
        return null;
    }

    // ---- CHAPTERS ----
    function renderChapters() {
        const list = document.getElementById('chapters-list');
        if (!state.chapters.length) {
            list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">No chapters yet. Define your life chapters to color-code your grid.</p>';
            return;
        }
        list.innerHTML = state.chapters.map(ch => `
            <div class="chapter-card" data-id="${ch.id}">
                <div class="chapter-color" style="background:${ch.color}"></div>
                <div class="chapter-info">
                    <div class="chapter-name">${ch.name}</div>
                    <div class="chapter-dates">${ch.start_date} → ${ch.end_date || 'Present'}</div>
                </div>
                <div class="card-actions">
                    <button class="btn btn-sm" onclick="window.__editChapter(${ch.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="window.__deleteChapter(${ch.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    window.__editChapter = (id) => {
        const ch = state.chapters.find(c => c.id === id);
        if (ch) openModal('chapter', ch);
    };

    window.__deleteChapter = async (id) => {
        if (!confirm('Delete this chapter?')) return;
        await api.del(`/api/chapters/${id}`);
        state.chapters = state.chapters.filter(c => c.id !== id);
        renderChapters();
        renderGrid();
        showToast('Chapter deleted');
    };

    // ---- MILESTONES ----
    function renderMilestones() {
        const list = document.getElementById('milestones-list');
        if (!state.milestones.length) {
            list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">No milestones yet. Mark important moments in your life.</p>';
            return;
        }
        list.innerHTML = state.milestones.map(m => `
            <div class="milestone-card" data-id="${m.id}">
                <span class="milestone-icon">${m.icon}</span>
                <div class="milestone-info">
                    <div class="milestone-title">${m.title}</div>
                    <div class="milestone-date">${m.date}${m.description ? ' · ' + m.description : ''}</div>
                </div>
                <div class="card-actions">
                    <button class="btn btn-sm" onclick="window.__editMilestone(${m.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="window.__deleteMilestone(${m.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    window.__editMilestone = (id) => {
        const m = state.milestones.find(ms => ms.id === id);
        if (m) openModal('milestone', m);
    };

    window.__deleteMilestone = async (id) => {
        if (!confirm('Delete this milestone?')) return;
        await api.del(`/api/milestones/${id}`);
        state.milestones = state.milestones.filter(m => m.id !== id);
        renderMilestones();
        renderGrid();
        showToast('Milestone deleted');
    };

    // ---- GOALS ----
    function renderGoals() {
        const list = document.getElementById('goals-list');
        if (!state.goals.length) {
            list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">No goals yet. Set future targets and count down the weeks.</p>';
            return;
        }
        const now = new Date();
        list.innerHTML = state.goals.map(g => {
            const target = new Date(g.target_date);
            const weeksLeft = Math.max(0, weeksBetween(now, target));
            return `
                <div class="goal-card ${g.completed ? 'goal-completed' : ''}" data-id="${g.id}">
                    <div class="goal-info">
                        <div class="goal-title">${g.completed ? '✅ ' : ''}${g.title}</div>
                        <div class="goal-date">Target: ${g.target_date}${g.description ? ' · ' + g.description : ''}</div>
                        <div class="goal-progress">
                            <span class="goal-weeks-left">${g.completed ? 'Completed!' : weeksLeft + ' weeks remaining'}</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        ${!g.completed ? `<button class="btn btn-sm" style="background:var(--accent-success);border-color:var(--accent-success);color:#fff" onclick="window.__completeGoal(${g.id})">✓ Done</button>` : ''}
                        <button class="btn btn-sm" onclick="window.__editGoal(${g.id})">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="window.__deleteGoal(${g.id})">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.__completeGoal = async (id) => {
        const g = state.goals.find(gl => gl.id === id);
        if (!g) return;
        const result = await api.put(`/api/goals/${id}`, { ...g, completed: 1 });
        const idx = state.goals.findIndex(gl => gl.id === id);
        if (idx >= 0) state.goals[idx] = result;
        renderGoals();
        renderGrid();
        showToast('🎯 Goal completed!');
    };

    window.__editGoal = (id) => {
        const g = state.goals.find(gl => gl.id === id);
        if (g) openModal('goal', g);
    };

    window.__deleteGoal = async (id) => {
        if (!confirm('Delete this goal?')) return;
        await api.del(`/api/goals/${id}`);
        state.goals = state.goals.filter(g => g.id !== id);
        renderGoals();
        renderGrid();
        showToast('Goal deleted');
    };

    // ---- SETTINGS ----
    function renderSettings() {
        const panel = document.getElementById('settings-panel');
        panel.innerHTML = `
            <div class="settings-group">
                <div class="settings-group-title">Profile</div>
                <div class="setting-row">
                    <div>
                        <div class="setting-label">${state.profile.name}</div>
                        <div class="setting-sublabel">Born: ${state.profile.birth_date} · Lifespan: ${state.profile.lifespan} years</div>
                    </div>
                    <button class="btn btn-sm" id="edit-profile-btn">Edit</button>
                </div>
            </div>

            <div class="settings-group">
                <div class="settings-group-title">Appearance</div>
                <div class="setting-row">
                    <div>
                        <div class="setting-label">Color Palette</div>
                        <div class="setting-sublabel">Choose your Pantone-inspired theme</div>
                    </div>
                    <div class="palette-options">
                        <div class="palette-swatch ${state.settings.theme === 'coral' ? 'active' : ''}" style="background:#e94560" data-palette="coral" title="Coral"></div>
                        <div class="palette-swatch ${state.settings.theme === 'violet' ? 'active' : ''}" style="background:#6c5ce7" data-palette="violet" title="Ultra Violet"></div>
                        <div class="palette-swatch ${state.settings.theme === 'blue' ? 'active' : ''}" style="background:#0984e3" data-palette="blue" title="Classic Blue"></div>
                        <div class="palette-swatch ${state.settings.theme === 'green' ? 'active' : ''}" style="background:#00b894" data-palette="green" title="Verdant Green"></div>
                        <div class="palette-swatch ${state.settings.theme === 'yellow' ? 'active' : ''}" style="background:#fdcb6e" data-palette="yellow" title="Illuminating"></div>
                        <div class="palette-swatch ${state.settings.theme === 'frosted' ? 'active' : ''}" style="background:#768A96" data-palette="frosted" title="Frosted"></div>
                    </div>
                </div>
                <div class="setting-row">
                    <div>
                        <div class="setting-label">Dark Mode</div>
                        <div class="setting-sublabel">Toggle light/dark theme</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="dark-mode-toggle" ${state.settings.mode === 'dark' ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div class="settings-group">
                <div class="settings-group-title">Notifications</div>
                <div class="setting-row">
                    <div>
                        <div class="setting-label">Weekly Reminder</div>
                        <div class="setting-sublabel">Sunday evening reflection prompt</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="reminder-toggle" ${state.settings.reminder_enabled === 'true' ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div class="settings-group">
                <div class="settings-group-title">Account</div>
                <div class="setting-row">
                    <div>
                        <div class="setting-label">Change Password</div>
                        <div class="setting-sublabel">Update your account password</div>
                    </div>
                    <button class="btn btn-sm" id="change-password-btn">🔐 Change</button>
                </div>
                <div class="setting-row">
                    <div>
                        <div class="setting-label">Sign Out</div>
                        <div class="setting-sublabel">Log out of your account</div>
                    </div>
                    <button class="btn btn-sm btn-danger" id="logout-btn">🚪 Sign Out</button>
                </div>
            </div>

            <div class="settings-group">
                <div class="settings-group-title">Data</div>
                <div class="setting-row">
                    <div>
                        <div class="setting-label">Export Journal</div>
                        <div class="setting-sublabel">Download all journal entries as Markdown</div>
                    </div>
                    <button class="btn btn-sm" id="export-journal-btn">📄 Export</button>
                </div>
            </div>
        `;

        // Palette swatches
        panel.querySelectorAll('.palette-swatch').forEach(sw => {
            sw.addEventListener('click', async () => {
                state.settings.theme = sw.dataset.palette;
                applyTheme();
                await api.put('/api/settings', { theme: state.settings.theme });
                renderSettings();
                showToast('Theme updated');
            });
        });

        // Dark mode toggle
        document.getElementById('dark-mode-toggle').addEventListener('change', async (e) => {
            state.settings.mode = e.target.checked ? 'dark' : 'light';
            applyTheme();
            await api.put('/api/settings', { mode: state.settings.mode });
        });

        // Reminder toggle
        document.getElementById('reminder-toggle').addEventListener('change', async (e) => {
            state.settings.reminder_enabled = e.target.checked ? 'true' : 'false';
            await api.put('/api/settings', { reminder_enabled: state.settings.reminder_enabled });
        });

        // Edit profile
        document.getElementById('edit-profile-btn').addEventListener('click', () => {
            openModal('profile', state.profile);
        });

        // Change password
        document.getElementById('change-password-btn').addEventListener('click', () => {
            openModal('password');
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
            window.location.href = '/login.html';
        });

        // Export journal
        document.getElementById('export-journal-btn').addEventListener('click', exportJournal);
    }

    // ---- MODALS ----
    function openModal(type, data = null) {
        const overlay = document.getElementById('modal-overlay');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('modal-form');
        overlay.classList.remove('hidden');

        if (type === 'chapter') {
            title.textContent = data ? 'Edit Chapter' : 'New Chapter';
            form.innerHTML = `
                <div class="form-group">
                    <label>Chapter Name</label>
                    <input type="text" id="modal-name" value="${data ? data.name : ''}" required>
                </div>
                <div class="form-group">
                    <label>Color</label>
                    <input type="color" id="modal-color" value="${data ? data.color : '#e94560'}">
                </div>
                <div class="form-group">
                    <label>Start Date</label>
                    <input type="date" id="modal-start" value="${data ? data.start_date : ''}" required>
                </div>
                <div class="form-group">
                    <label>End Date (leave empty for ongoing)</label>
                    <input type="date" id="modal-end" value="${data && data.end_date ? data.end_date : ''}">
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
                    <button type="button" class="btn" onclick="window.__closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">${data ? 'Save' : 'Create'}</button>
                </div>
            `;
            form.onsubmit = async (e) => {
                e.preventDefault();
                const payload = {
                    name: document.getElementById('modal-name').value,
                    color: document.getElementById('modal-color').value,
                    start_date: document.getElementById('modal-start').value,
                    end_date: document.getElementById('modal-end').value || null
                };
                if (data) {
                    const result = await api.put(`/api/chapters/${data.id}`, payload);
                    const idx = state.chapters.findIndex(c => c.id === data.id);
                    if (idx >= 0) state.chapters[idx] = result;
                } else {
                    const result = await api.post('/api/chapters', payload);
                    state.chapters.push(result);
                }
                closeModal();
                renderChapters();
                renderGrid();
                renderStats();
                showToast(data ? 'Chapter updated' : 'Chapter created');
            };
        } else if (type === 'milestone') {
            title.textContent = data ? 'Edit Milestone' : 'New Milestone';
            form.innerHTML = `
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" id="modal-title-input" value="${data ? data.title : ''}" required>
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="date" id="modal-date" value="${data ? data.date : ''}" required>
                </div>
                <div class="form-group">
                    <label>Icon</label>
                    <input type="text" id="modal-icon" value="${data ? data.icon : '♦'}" maxlength="2">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="modal-desc" rows="3">${data ? (data.description || '') : ''}</textarea>
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
                    <button type="button" class="btn" onclick="window.__closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">${data ? 'Save' : 'Create'}</button>
                </div>
            `;
            form.onsubmit = async (e) => {
                e.preventDefault();
                const payload = {
                    title: document.getElementById('modal-title-input').value,
                    date: document.getElementById('modal-date').value,
                    icon: document.getElementById('modal-icon').value || '♦',
                    description: document.getElementById('modal-desc').value || null
                };
                if (data) {
                    const result = await api.put(`/api/milestones/${data.id}`, payload);
                    const idx = state.milestones.findIndex(m => m.id === data.id);
                    if (idx >= 0) state.milestones[idx] = result;
                } else {
                    const result = await api.post('/api/milestones', payload);
                    state.milestones.push(result);
                }
                closeModal();
                renderMilestones();
                renderGrid();
                renderStats();
                showToast(data ? 'Milestone updated' : 'Milestone created');
            };
        } else if (type === 'goal') {
            title.textContent = data ? 'Edit Goal' : 'New Goal';
            form.innerHTML = `
                <div class="form-group">
                    <label>Goal Title</label>
                    <input type="text" id="modal-title-input" value="${data ? data.title : ''}" required>
                </div>
                <div class="form-group">
                    <label>Target Date</label>
                    <input type="date" id="modal-date" value="${data ? data.target_date : ''}" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="modal-desc" rows="3">${data ? (data.description || '') : ''}</textarea>
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
                    <button type="button" class="btn" onclick="window.__closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">${data ? 'Save' : 'Create'}</button>
                </div>
            `;
            form.onsubmit = async (e) => {
                e.preventDefault();
                const payload = {
                    title: document.getElementById('modal-title-input').value,
                    target_date: document.getElementById('modal-date').value,
                    description: document.getElementById('modal-desc').value || null
                };
                if (data) {
                    const result = await api.put(`/api/goals/${data.id}`, { ...payload, completed: data.completed });
                    const idx = state.goals.findIndex(g => g.id === data.id);
                    if (idx >= 0) state.goals[idx] = result;
                } else {
                    const result = await api.post('/api/goals', payload);
                    state.goals.push(result);
                }
                closeModal();
                renderGoals();
                renderGrid();
                renderStats();
                showToast(data ? 'Goal updated' : 'Goal created');
            };
        } else if (type === 'profile') {
            title.textContent = 'Edit Profile';
            form.innerHTML = `
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" id="modal-name" value="${data.name || ''}" required>
                </div>
                <div class="form-group">
                    <label>Date of Birth</label>
                    <input type="date" id="modal-dob" value="${data.birth_date}" required>
                </div>
                <div class="form-group">
                    <label>Expected Lifespan</label>
                    <input type="number" id="modal-lifespan" value="${data.lifespan}" min="1" max="120">
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
                    <button type="button" class="btn" onclick="window.__closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            `;
            form.onsubmit = async (e) => {
                e.preventDefault();
                state.profile = await api.post('/api/profile', {
                    name: document.getElementById('modal-name').value,
                    birth_date: document.getElementById('modal-dob').value,
                    lifespan: parseInt(document.getElementById('modal-lifespan').value) || 80
                });
                closeModal();
                showApp();
                showToast('Profile updated');
            };
        } else if (type === 'password') {
            title.textContent = 'Change Password';
            form.innerHTML = `
                <div class="form-group">
                    <label>Current Password</label>
                    <input type="password" id="modal-current-pw" placeholder="Enter current password" required>
                </div>
                <div class="form-group">
                    <label>New Password</label>
                    <input type="password" id="modal-new-pw" placeholder="Enter new password (min 6 chars)" minlength="6" required>
                </div>
                <div class="form-group">
                    <label>Confirm New Password</label>
                    <input type="password" id="modal-confirm-pw" placeholder="Confirm new password" minlength="6" required>
                </div>
                <div id="pw-change-msg" style="display:none"></div>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
                    <button type="button" class="btn" onclick="window.__closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Password</button>
                </div>
            `;
            form.onsubmit = async (e) => {
                e.preventDefault();
                const currentPw = document.getElementById('modal-current-pw').value;
                const newPw = document.getElementById('modal-new-pw').value;
                const confirmPw = document.getElementById('modal-confirm-pw').value;
                const msgEl = document.getElementById('pw-change-msg');
                msgEl.style.display = 'none';

                if (newPw.length < 6) {
                    msgEl.textContent = 'New password must be at least 6 characters';
                    msgEl.className = 'auth-error';
                    msgEl.style.display = 'block';
                    return;
                }
                if (newPw !== confirmPw) {
                    msgEl.textContent = 'Passwords do not match';
                    msgEl.className = 'auth-error';
                    msgEl.style.display = 'block';
                    return;
                }
                try {
                    const r = await fetch('/api/auth/password', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
                        credentials: 'same-origin'
                    });
                    const data = await r.json();
                    if (!r.ok) {
                        msgEl.textContent = data.error || 'Failed to change password';
                        msgEl.className = 'auth-error';
                        msgEl.style.display = 'block';
                        return;
                    }
                    msgEl.textContent = '✓ Password updated successfully!';
                    msgEl.className = 'pw-change-success';
                    msgEl.style.display = 'block';
                    setTimeout(() => { closeModal(); showToast('🔐 Password updated'); }, 1500);
                } catch (err) {
                    msgEl.textContent = 'Network error. Please try again.';
                    msgEl.className = 'auth-error';
                    msgEl.style.display = 'block';
                }
            };
        }
    }

    function closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    }
    window.__closeModal = closeModal;

    // ---- EXPORT ----
    function exportGrid() {
        const grid = document.getElementById('grid-container');
        // Use html2canvas-like approach: create SVG
        const cells = grid.querySelectorAll('.week-cell, .month-cell, .year-cell');
        if (!cells.length) return showToast('No grid to export');

        // Simple SVG export for weeks grid
        const lifespan = state.profile.lifespan;
        const cellSize = 10;
        const gap = 2;
        const cols = state.currentView === 'weeks' ? 52 : state.currentView === 'months' ? 12 : lifespan;
        const rows = state.currentView === 'years' ? 1 : lifespan;
        const width = cols * (cellSize + gap) + 40;
        const height = rows * (cellSize + gap) + 20;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="background:#0d0d1a">`;
        let idx = 0;
        cells.forEach(cell => {
            const r = Math.floor(idx / cols);
            const c = idx % cols;
            const color = cell.style.background || getComputedStyle(cell).backgroundColor || '#1e1e38';
            svg += `<rect x="${30 + c * (cellSize + gap)}" y="${10 + r * (cellSize + gap)}" width="${cellSize}" height="${cellSize}" rx="2" fill="${color}"/>`;
            idx++;
        });
        svg += '</svg>';

        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `life-in-weeks-${state.currentView}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Grid exported as SVG');
    }

    function exportJournal() {
        if (!state.journal.length) return showToast('No journal entries to export');
        let md = `# Life in Weeks — Journal\n\n`;
        md += `**${state.profile.name}** · Born: ${state.profile.birth_date}\n\n---\n\n`;
        const sorted = [...state.journal].filter(j => j.note).sort((a, b) => (a.year * 52 + a.week) - (b.year * 52 + b.week));
        sorted.forEach(j => {
            const range = getWeekDateRange(state.profile.birth_date, j.year, j.week);
            md += `## Year ${j.year}, Week ${j.week + 1}\n`;
            md += `*${range.start} – ${range.end}*`;
            if (j.rating) md += ` · ${'★'.repeat(j.rating)}${'☆'.repeat(5 - j.rating)}`;
            md += `\n\n${j.note}\n\n---\n\n`;
        });

        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'life-in-weeks-journal.md';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Journal exported as Markdown');
    }

    // ---- WEEKLY REMINDER ----
    function setupReminder() {
        if (state.settings.reminder_enabled !== 'true') return;
        if (!('Notification' in window)) return;

        // Check if it's Sunday evening (after 6 PM)
        const now = new Date();
        if (now.getDay() === 0 && now.getHours() >= 18) {
            Notification.requestPermission().then(perm => {
                if (perm === 'granted') {
                    new Notification('💎 Life in Weeks', {
                        body: 'How was your week? Take a moment to reflect and rate it.',
                        icon: '💎'
                    });
                }
            });
        }
    }

    // ---- TOAST ----
    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.remove('hidden');
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 350);
        }, 2500);
    }

    // ---- BOOT ----
    document.addEventListener('DOMContentLoaded', init);
})();
