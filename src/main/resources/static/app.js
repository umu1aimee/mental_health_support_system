const apiBase = '/api';

const state = {
    me: null
};

async function api(path, method = 'GET', body) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin'
    };
    if (body !== undefined) {
        opts.body = JSON.stringify(body);
    }

    const resp = await fetch(apiBase + path, opts);
    const text = await resp.text();
    let data;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!resp.ok) {
        const msg = (data && data.error) ? data.error : `API error: ${resp.status}`;
        throw new Error(msg);
    }
    return data;
}

function escapeHtml(s) {
    return (s ?? '').toString()
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function renderHTML(html) {
    document.getElementById('main-content').innerHTML = html;
}

function setUserStatus() {
    const el = document.getElementById('user-status');
    if (!state.me || !state.me.authenticated) {
        el.innerHTML = '<div class="card">Not logged in</div>';
        document.getElementById('nav-auth').textContent = 'Login';
        return;
    }
    document.getElementById('nav-auth').textContent = 'Logout';
    el.innerHTML = `<div class="card">Logged in as <b>${escapeHtml(state.me.name || state.me.email)}</b> (${escapeHtml(state.me.role)})</div>`;
}

function initNav() {
    document.getElementById('nav-auth').addEventListener('click', async (e) => {
        e.preventDefault();
        if (state.me && state.me.authenticated) {
            await api('/auth/logout', 'POST');
            state.me = await api('/auth/me');
            setUserStatus();
            loadAuth();
        } else {
            loadAuth();
        }
    });

    document.getElementById('nav-mood').addEventListener('click', (e) => {
        e.preventDefault();
        loadMood();
    });

    document.getElementById('nav-appointments').addEventListener('click', (e) => {
        e.preventDefault();
        loadAppointments();
    });

    document.getElementById('nav-counselor').addEventListener('click', (e) => {
        e.preventDefault();
        loadCounselor();
    });

    document.getElementById('nav-admin').addEventListener('click', (e) => {
        e.preventDefault();
        loadAdmin();
    });
}

async function refreshMe() {
    state.me = await api('/auth/me');
    setUserStatus();
}

function renderError(err) {
    renderHTML(`<div class="card"><h2>Error</h2><p>${escapeHtml(err.message || String(err))}</p></div>`);
}

function requireRole(role) {
    if (!state.me || !state.me.authenticated) {
        throw new Error('Not authenticated');
    }
    if (state.me.role !== role) {
        throw new Error('Access denied');
    }
}

async function loadAuth() {
    renderHTML(`
        <div class="card">
            <h2>Login</h2>
            <div>
                <label>Email</label><br />
                <input id="login-email" type="email" style="width:100%" />
            </div>
            <div style="margin-top:0.75rem">
                <label>Password</label><br />
                <input id="login-password" type="password" style="width:100%" />
            </div>
            <div style="margin-top:1rem">
                <button id="btn-login">Login</button>
            </div>
        </div>

        <div class="card">
            <h2>Register</h2>
            <div>
                <label>Name</label><br />
                <input id="reg-name" type="text" style="width:100%" />
            </div>
            <div style="margin-top:0.75rem">
                <label>Email</label><br />
                <input id="reg-email" type="email" style="width:100%" />
            </div>
            <div style="margin-top:0.75rem">
                <label>Password</label><br />
                <input id="reg-password" type="password" style="width:100%" />
            </div>
            <div style="margin-top:0.75rem">
                <label>Emergency contact (patients only)</label><br />
                <input id="reg-emergency" type="text" style="width:100%" />
            </div>
            <div style="margin-top:1rem">
                <button id="btn-register">Register</button>
            </div>
        </div>
    `);

    document.getElementById('btn-login').addEventListener('click', async () => {
        try {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            await api('/auth/login', 'POST', { email, password });
            await refreshMe();
            routeDefault();
        } catch (e) {
            renderError(e);
        }
    });

    document.getElementById('btn-register').addEventListener('click', async () => {
        try {
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const emergencyContact = document.getElementById('reg-emergency').value;
            await api('/auth/register', 'POST', { name, email, password, role: 'patient', emergencyContact });
            await refreshMe();
            routeDefault();
        } catch (e) {
            renderError(e);
        }
    });
}

function moodChart(entries) {
    const max = 10;
    const bars = entries.map(e => {
        const w = Math.max(0, Math.min(max, e.rating)) * 10;
        return `
            <div style="margin:0.35rem 0">
                <div style="display:flex; justify-content:space-between; gap:1rem">
                    <div>${escapeHtml(e.entryDate)}</div>
                    <div><b>${escapeHtml(e.rating)}</b>/10</div>
                </div>
                <div style="height:10px; background:rgba(255,255,255,0.15); border-radius:6px; overflow:hidden">
                    <div style="height:10px; width:${w}%; background:rgba(80,160,255,0.9)"></div>
                </div>
            </div>
        `;
    }).join('');
    return `<div class="card"><h3>Mood history (chart)</h3>${bars || '<p>No entries yet.</p>'}</div>`;
}

async function loadMood() {
    try {
        requireRole('patient');
        const history = await api('/patient/mood');
        renderHTML(`
            <div class="card">
                <h2>Mood Tracker</h2>
                <div>
                    <label>Date</label><br />
                    <input id="mood-date" type="date" />
                </div>
                <div style="margin-top:0.75rem">
                    <label>Rating (1-10)</label><br />
                    <input id="mood-rating" type="number" min="1" max="10" value="5" />
                </div>
                <div style="margin-top:0.75rem">
                    <label>Notes (optional)</label><br />
                    <textarea id="mood-notes" rows="3" style="width:100%"></textarea>
                </div>
                <div style="margin-top:1rem">
                    <button id="btn-save-mood">Save</button>
                </div>
            </div>
            ${moodChart(history)}
        `);

        document.getElementById('btn-save-mood').addEventListener('click', async () => {
            try {
                const entryDate = document.getElementById('mood-date').value || null;
                const rating = Number(document.getElementById('mood-rating').value);
                const notes = document.getElementById('mood-notes').value;
                await api('/patient/mood', 'POST', { entryDate, rating, notes });
                loadMood();
            } catch (e) {
                renderError(e);
            }
        });
    } catch (e) {
        renderError(e);
    }
}

async function loadAppointments() {
    try {
        if (!state.me || !state.me.authenticated) {
            throw new Error('Not authenticated');
        }
        if (state.me.role === 'patient') {
            const counselors = await api('/patient/counselors');
            const my = await api('/patient/appointments');

            const counselorOptions = counselors.map(c => `<option value="${c.id}">${escapeHtml(c.name || c.email)}</option>`).join('');
            const apRows = my.map(a => {
                const counselorName = a.counselor ? (a.counselor.name || a.counselor.email) : '';
                const cancelBtn = a.status !== 'canceled' ? `<button data-cancel-id="${a.id}">Cancel</button>` : '';
                return `<div class="card"><b>${escapeHtml(a.appointmentDate)} ${escapeHtml(a.appointmentTime)}</b> - ${escapeHtml(counselorName)}<br/>Status: ${escapeHtml(a.status)}<div style="margin-top:0.75rem">${cancelBtn}</div></div>`;
            }).join('');

            renderHTML(`
                <div class="card">
                    <h2>Book Appointment</h2>
                    <div>
                        <label>Counselor</label><br />
                        <select id="ap-counselor" style="width:100%">${counselorOptions}</select>
                    </div>
                    <div style="margin-top:0.75rem">
                        <label>Date</label><br />
                        <input id="ap-date" type="date" />
                    </div>
                    <div style="margin-top:0.75rem">
                        <label>Time</label><br />
                        <input id="ap-time" type="time" />
                    </div>
                    <div style="margin-top:1rem">
                        <button id="btn-book">Book</button>
                        <button id="btn-check">Check availability</button>
                    </div>
                    <div id="ap-availability" style="margin-top:1rem"></div>
                </div>
                <h2>My Appointments</h2>
                ${apRows || '<div class="card">No appointments yet.</div>'}
            `);

            document.getElementById('btn-check').addEventListener('click', async () => {
                try {
                    const counselorId = document.getElementById('ap-counselor').value;
                    const dateStr = document.getElementById('ap-date').value;
                    if (!dateStr) {
                        throw new Error('Select a date to check availability');
                    }
                    const date = new Date(dateStr + 'T00:00:00');
                    const dow = date.getDay();
                    const slots = await api(`/patient/counselors/${counselorId}/availability?dayOfWeek=${dow}`);
                    const html = slots.map(s => `<div>Day ${escapeHtml(s.dayOfWeek)}: ${escapeHtml(s.startTime)} - ${escapeHtml(s.endTime)}</div>`).join('') || '<div>No availability configured.</div>';
                    document.getElementById('ap-availability').innerHTML = `<div class="card"><h3>Availability</h3>${html}</div>`;
                } catch (e) {
                    renderError(e);
                }
            });

            document.getElementById('btn-book').addEventListener('click', async () => {
                try {
                    const counselorId = Number(document.getElementById('ap-counselor').value);
                    const appointmentDate = document.getElementById('ap-date').value;
                    const appointmentTime = document.getElementById('ap-time').value;
                    await api('/patient/appointments', 'POST', { counselorId, appointmentDate, appointmentTime });
                    loadAppointments();
                } catch (e) {
                    renderError(e);
                }
            });

            document.querySelectorAll('[data-cancel-id]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        const id = btn.getAttribute('data-cancel-id');
                        await api(`/patient/appointments/${id}/cancel`, 'POST');
                        loadAppointments();
                    } catch (e) {
                        renderError(e);
                    }
                });
            });
            return;
        }

        if (state.me.role === 'counselor') {
            const aps = await api('/counselor/appointments');
            const rows = aps.map(a => {
                const patientName = a.patient ? (a.patient.name || a.patient.email) : '';
                return `<div class="card"><b>${escapeHtml(a.appointmentDate)} ${escapeHtml(a.appointmentTime)}</b> - ${escapeHtml(patientName)}<br/>Status: ${escapeHtml(a.status)}
                    <div style="margin-top:0.75rem">
                        <button data-status-id="${a.id}" data-status="confirmed">Confirm</button>
                        <button data-status-id="${a.id}" data-status="canceled">Cancel</button>
                    </div>
                </div>`;
            }).join('');
            renderHTML(`<h2>Upcoming Appointments</h2>${rows || '<div class="card">No appointments.</div>'}`);
            document.querySelectorAll('[data-status-id]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        const id = btn.getAttribute('data-status-id');
                        const status = btn.getAttribute('data-status');
                        await api(`/counselor/appointments/${id}/status`, 'POST', { status });
                        loadAppointments();
                    } catch (e) {
                        renderError(e);
                    }
                });
            });
            return;
        }

        if (state.me.role === 'admin') {
            renderHTML('<div class="card"><h2>Admin</h2><p>Use the Admin tab to manage users.</p></div>');
            return;
        }
    } catch (e) {
        renderError(e);
    }
}

async function loadCounselor() {
    try {
        requireRole('counselor');
        const patients = await api('/counselor/patients');
        const availability = await api('/counselor/availability');

        const patientCards = patients.map(p => {
            const u = p.user || {};
            return `<div class="card"><b>${escapeHtml(u.name || u.email)}</b><br/>Emergency: ${escapeHtml(p.emergencyContact || '')}
                <div style="margin-top:0.75rem">
                    <button data-mood-patient="${p.id}">View mood</button>
                </div>
            </div>`;
        }).join('');

        const availabilityRows = availability.map(a => `<div>Day ${escapeHtml(a.dayOfWeek)}: ${escapeHtml(a.startTime)} - ${escapeHtml(a.endTime)}</div>`).join('') || '<div>No availability configured.</div>';

        renderHTML(`
            <div class="card">
                <h2>Counselor Dashboard</h2>
                <p>Patients assigned to you and your schedule settings.</p>
            </div>
            <div class="card">
                <h3>My availability</h3>
                ${availabilityRows}
                <div style="margin-top:1rem">
                    <p>Replace availability (one line per slot):</p>
                    <textarea id="avail-text" rows="6" style="width:100%" placeholder="dayOfWeek,startTime,endTime\n1,09:00,12:00\n3,14:00,17:00"></textarea>
                    <div style="margin-top:0.75rem">
                        <button id="btn-save-avail">Save availability</button>
                    </div>
                </div>
            </div>
            <h2>Assigned Patients</h2>
            ${patientCards || '<div class="card">No assigned patients.</div>'}
            <div id="counselor-mood"></div>
        `);

        document.getElementById('btn-save-avail').addEventListener('click', async () => {
            try {
                const raw = document.getElementById('avail-text').value.trim();
                const lines = raw ? raw.split(/\r?\n/).filter(Boolean) : [];
                const payload = lines.map(l => {
                    const [dayOfWeek, startTime, endTime] = l.split(',').map(x => x.trim());
                    return { dayOfWeek: Number(dayOfWeek), startTime, endTime };
                });
                await api('/counselor/availability', 'PUT', payload);
                loadCounselor();
            } catch (e) {
                renderError(e);
            }
        });

        document.querySelectorAll('[data-mood-patient]').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    const patientId = btn.getAttribute('data-mood-patient');
                    const mood = await api(`/counselor/patients/${patientId}/mood`);
                    document.getElementById('counselor-mood').innerHTML = moodChart(mood);
                } catch (e) {
                    renderError(e);
                }
            });
        });
    } catch (e) {
        renderError(e);
    }
}

async function loadAdmin() {
    try {
        requireRole('admin');
        const users = await api('/admin/users');
        const createCard = `
            <div class="card">
                <h2>Create Counselor</h2>
                <div>
                    <label>Name</label><br />
                    <input id="create-c-name" type="text" style="width:100%" />
                </div>
                <div style="margin-top:0.75rem">
                    <label>Email</label><br />
                    <input id="create-c-email" type="email" style="width:100%" />
                </div>
                <div style="margin-top:0.75rem">
                    <label>Temporary Password</label><br />
                    <input id="create-c-password" type="password" style="width:100%" />
                </div>
                <div style="margin-top:1rem">
                    <button id="btn-create-counselor">Create counselor</button>
                </div>
            </div>
        `;
        const rows = users.map(u => {
            return `<div class="card">
                <b>${escapeHtml(u.name || u.email)}</b><br/>
                Email: ${escapeHtml(u.email)}<br/>
                Role: ${escapeHtml(u.role)} | Active: ${escapeHtml(u.active)}
                <div style="margin-top:0.75rem; display:flex; gap:0.5rem; flex-wrap:wrap">
                    <select data-role-user="${u.id}">
                        <option value="patient" ${u.role === 'patient' ? 'selected' : ''}>patient</option>
                        <option value="counselor" ${u.role === 'counselor' ? 'selected' : ''}>counselor</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
                    </select>
                    <button data-save-role="${u.id}">Change role</button>
                    <button data-toggle-active="${u.id}" data-active="${u.active ? '1' : '0'}">${u.active ? 'Deactivate' : 'Activate'}</button>
                    <button data-delete-user="${u.id}">Delete</button>
                </div>
            </div>`;
        }).join('');

        renderHTML(`${createCard}<h2>Admin - User Management</h2>${rows || '<div class="card">No users.</div>'}`);

        document.getElementById('btn-create-counselor').addEventListener('click', async () => {
            try {
                const name = document.getElementById('create-c-name').value;
                const email = document.getElementById('create-c-email').value;
                const password = document.getElementById('create-c-password').value;
                await api('/admin/counselors', 'POST', { name, email, password });
                loadAdmin();
            } catch (e) {
                renderError(e);
            }
        });

        document.querySelectorAll('[data-save-role]').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    const id = btn.getAttribute('data-save-role');
                    const sel = document.querySelector(`select[data-role-user="${id}"]`);
                    await api(`/admin/users/${id}/role`, 'POST', { role: sel.value });
                    loadAdmin();
                } catch (e) {
                    renderError(e);
                }
            });
        });

        document.querySelectorAll('[data-toggle-active]').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    const id = btn.getAttribute('data-toggle-active');
                    const current = btn.getAttribute('data-active') === '1';
                    await api(`/admin/users/${id}/active`, 'POST', { active: !current });
                    loadAdmin();
                } catch (e) {
                    renderError(e);
                }
            });
        });

        document.querySelectorAll('[data-delete-user]').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    const id = btn.getAttribute('data-delete-user');
                    await api(`/admin/users/${id}`, 'DELETE');
                    loadAdmin();
                } catch (e) {
                    renderError(e);
                }
            });
        });
    } catch (e) {
        renderError(e);
    }
}

function routeDefault() {
    if (!state.me || !state.me.authenticated) {
        loadAuth();
        return;
    }
    if (state.me.role === 'patient') {
        loadMood();
        return;
    }
    if (state.me.role === 'counselor') {
        loadCounselor();
        return;
    }
    loadAdmin();
}

window.addEventListener('load', async () => {
    initNav();
    try {
        await refreshMe();
        routeDefault();
    } catch (e) {
        renderError(e);
    }
});
