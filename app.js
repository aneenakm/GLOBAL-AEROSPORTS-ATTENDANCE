const state = {
    user: JSON.parse(localStorage.getItem('currentUser')), // { name, role: 'admin' | 'employee' }
    attendance: JSON.parse(localStorage.getItem('attendance_records')) || [],
    currentView: localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')).role : 'login',
    loginRole: null, // 'employee' or 'admin'
    adminAction: 'login', // 'login' or 'signup'
    employeeAction: 'login', // 'login' or 'signup'
    showPassword: false,
    selectedDate: new Date(),
    viewDate: new Date(),
    activeTab: 'attendance', // 'attendance' or 'profile'
    adminTab: 'attendance', // 'attendance' or 'directory'
    adminEmployeeFilter: 'all',
    adminStatusFilter: 'all',
    resetStep: 1, // 1: Verify Identity, 2: Reset Password
    resetVerifiedUser: null,
};

// Constants
const REASONS = {
    late: ['Traffic', 'Personal Emergency', 'Health Issues', 'Vehicle Breakdown', 'Other'],
    leave: ['Sick Leave', 'Casual Leave', 'Emergency', 'Vacation', 'Other']
};

const SHIFT = {
    start: '09:30',
    lateThreshold: '09:45',
    end: '16:30',
    overtimeThreshold: '17:00',
    absenceThreshold: '11:00'
};

const HOLIDAYS = [
    '01/01/2026',  // New Year
    '26/01/2026', // Republic Day
    '01/05/2026', // May Day
];

const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

const isHoliday = (date) => {
    const day = date.getDay();
    const dateStr = formatDate(date);
    return day === 0 || HOLIDAYS.includes(dateStr); // Sunday or Holiday
};

// Helper Functions
const isAfterTime = (timeStr1, timeStr2) => {
    // Compares "HH:MM" (24h format)
    return timeStr1 > timeStr2;
};

const getCurrent24Time = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const formatDisplayTimeTo24 = (t) => {
    if (!t) return '';
    let [time, modifier] = t.split(' ');
    let [hours, minutes] = time.split(':');
    if (modifier === 'PM' && hours !== '12') hours = parseInt(hours, 10) + 12;
    if (modifier === 'AM' && hours === '12') hours = '00';
    return `${String(hours).padStart(2, '0')}:${minutes}`;
};

const getDurationHours = (start24, end24) => {
    if (!start24 || !end24) return 0;
    const [h1, m1] = start24.split(':').map(Number);
    const [h2, m2] = end24.split(':').map(Number);
    let totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);

    // If end time is earlier than start time, it's an overnight shift
    if (totalMinutes < 0) {
        totalMinutes += 24 * 60;
    }

    return totalMinutes / 60;
};

const saveAttendance = () => {
    localStorage.setItem('attendance_records', JSON.stringify(state.attendance));
};

const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

const getRecordForDate = (dateStr, name) => {
    return state.attendance.find(r => r.date === dateStr && r.name === name);
};

const calculateStats = () => {
    const today = formatDate(new Date());
    return {
        total: state.attendance.length,
        present: state.attendance.filter(r => r.status === 'Present' || r.status === 'Late' || r.status === 'Half Day').length,
        leave: state.attendance.filter(r => r.status === 'Leave').length,
        halfDay: state.attendance.filter(r => r.status === 'Half Day').length,
    };
};

// View Components
const renderLogin = () => {
    if (!state.loginRole) {
        return `
            <div class="glass-card auth-container">
                <div class="auth-header">
                    <div class="logo-icon"><i data-lucide="calendar-check"></i></div>
                    <h1>Attendance Portal</h1>
                    <p>Select your entry point</p>
                </div>
                <div class="portal-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <button class="status-btn" onclick="app.setLoginRole('employee')" style="padding: 2rem 1rem;">
                        <i data-lucide="user"></i>
                        <span>Employee Login</span>
                    </button>
                    <button class="status-btn" onclick="app.setLoginRole('admin')" style="padding: 2rem 1rem;">
                        <i data-lucide="shield-check"></i>
                        <span>Admin Login</span>
                    </button>
                </div>
            </div>
        `;
    }

    return `
        <div class="glass-card auth-container">
            <div class="auth-header">
                <button class="btn btn-outline" onclick="app.setLoginRole(null)" style="width: auto; position: absolute; top: 1.5rem; left: 1.5rem; padding: 0.5rem;">
                    <i data-lucide="arrow-left"></i>
                </button>
                <div class="logo-icon"><i data-lucide="${state.loginRole === 'admin' ? 'shield-check' : 'user'}"></i></div>
                <h1>${state.loginRole === 'admin' ? 'Admin portal' : 'Employee Login'}</h1>
                <p>${state.loginRole === 'admin' ? 'Management entry point' : 'Please enter your identification'}</p>
            </div>

            ${state.loginRole !== 'admin' ? `
            <div class="tab-container" style="display: flex; gap: 1rem; margin-bottom: 2rem;">
                <button class="btn ${((state.loginRole === 'admin' ? state.adminAction : state.employeeAction) === 'login') ? 'btn-primary' : 'btn-outline'}" 
                        onclick="app.setPortalAction('login')" style="flex: 1;">
                    <i data-lucide="log-in" style="width: 1.25rem; height: 1.25rem;"></i> Login
                </button>
                <button class="btn ${((state.loginRole === 'admin' ? state.adminAction : state.employeeAction) === 'signup') ? 'btn-primary' : 'btn-outline'}" 
                        onclick="app.setPortalAction('signup')" style="flex: 1;">
                    <i data-lucide="user-plus" style="width: 1.25rem; height: 1.25rem;"></i> Sign Up
                </button>
            </div>
            ` : ''}

            <form id="login-form">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="username" placeholder="Enter username" required autofocus>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <div class="password-wrapper">
                        <input type="${state.showPassword ? 'text' : 'password'}" id="password" placeholder="Enter password" required>
                        <button type="button" class="password-toggle" onclick="app.togglePassword()">
                            <i data-lucide="${state.showPassword ? 'eye-off' : 'eye'}"></i>
                        </button>
                    </div>
                </div>

                ${state.loginRole === 'employee' && state.employeeAction === 'login' ? `
                    <div style="text-align: right; margin-top: -1rem; margin-bottom: 1.5rem;">
                        <a href="#" class="forgot-password-link" onclick="event.preventDefault(); app.setView('reset-password')">Forgot Password?</a>
                    </div>
                ` : ''}

                ${(state.loginRole === 'employee' && state.employeeAction === 'signup') ? `
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" id="full-name" placeholder="Enter full name" required>
                    </div>
                    <div class="form-group">
                        <label>Date of Birth</label>
                        <input type="date" id="dob" required>
                    </div>
                    <div class="form-group">
                        <label>Position</label>
                        <input type="text" id="position" placeholder="e.g. Software Engineer" required>
                    </div>
                    <div class="form-group">
                        <label>Salary</label>
                        <input type="number" id="salary" placeholder="Enter monthly salary" required>
                    </div>
                    <div class="form-group">
                        <label>Profile Photo (Optional)</label>
                        <input type="file" id="photo" accept="image/*" onchange="app.handlePhotoUpload(this)">
                        <input type="hidden" id="photo-base64">
                    </div>
                ` : ''}
                <button type="submit" class="btn btn-primary">
                    <i data-lucide="${(state.loginRole === 'admin' ? state.adminAction : state.employeeAction) === 'login' ? 'check-circle' : 'user-plus'}" style="width: 1.25rem; height: 1.25rem;"></i>
                    ${(state.loginRole === 'admin' ? state.adminAction : state.employeeAction) === 'login' ? 'Login' : 'Sign Up'} 
                    <i data-lucide="arrow-right"></i>
                </button>
    `;
};

const renderResetPassword = () => {
    return `
        <div class="glass-card auth-container">
            <div class="auth-header">
                <button class="btn btn-outline" onclick="app.setView('login')" style="width: auto; position: absolute; top: 1.5rem; left: 1.5rem; padding: 0.5rem;">
                    <i data-lucide="arrow-left"></i>
                </button>
                <div class="logo-icon"><i data-lucide="key"></i></div>
                <h1>Reset Password</h1>
                <p>${state.resetStep === 1 ? 'Verify your identity to continue' : 'Enter your new password'}</p>
            </div>

            ${state.resetStep === 1 ? `
                <form id="verify-identity-form">
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" id="reset-username" placeholder="Enter your username" required autofocus>
                    </div>
                    <div class="form-group">
                        <label>Date of Birth</label>
                        <input type="date" id="reset-dob" required>
                    </div>
                    <button type="submit" class="btn btn-primary">
                        <i data-lucide="user-check" style="width: 1.25rem; height: 1.25rem;"></i>
                        Verify Identity
                        <i data-lucide="arrow-right"></i>
                    </button>
                </form>
            ` : `
                <form id="reset-password-form">
                    <div class="form-group">
                        <label>New Password</label>
                        <div class="password-wrapper">
                            <input type="${state.showPassword ? 'text' : 'password'}" id="new-password" placeholder="Enter new password" required autofocus>
                            <button type="button" class="password-toggle" onclick="app.togglePassword()">
                                <i data-lucide="${state.showPassword ? 'eye-off' : 'eye'}"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Confirm Password</label>
                        <input type="${state.showPassword ? 'text' : 'password'}" id="confirm-password" placeholder="Confirm new password" required>
                    </div>
                    <button type="submit" class="btn btn-primary">
                        <i data-lucide="save" style="width: 1.25rem; height: 1.25rem;"></i>
                        Update Password
                    </button>
                </form>
            `}
        </div>
    `;
};

const renderCalendar = () => {
    const date = state.viewDate;
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = date.toLocaleString('default', { month: 'long' });

    let daysHtml = '';

    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
        daysHtml += '<div class="calendar-day empty"></div>';
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
        const currentDate = new Date(year, month, d);
        const dateStr = formatDate(currentDate);
        const isSelected = formatDate(state.selectedDate) === dateStr;
        const record = getRecordForDate(dateStr, state.user.name);

        let statusClass = '';
        if (record) {
            statusClass = `status-${record.status.toLowerCase()}`;
        } else if (isHoliday(currentDate)) {
            statusClass = 'status-holiday';
        }

        daysHtml += `
            <div class="calendar-day ${isSelected ? 'selected' : ''} ${statusClass}" 
                 onclick="app.selectDate(${year}, ${month}, ${d})">
                ${d}
                ${record ? `<span class="record-dot"></span>` : ''}
            </div>
        `;
    }

    return `
        <div class="calendar-widget glass-card" style="margin-bottom: 2rem; max-width: none;">
            <div class="calendar-header">
                <button class="btn btn-outline" onclick="app.changeMonth(-1)" style="width: auto; padding: 0.5rem;"><i data-lucide="chevron-left"></i></button>
                <h3>${monthName} ${year}</h3>
                <button class="btn btn-outline" onclick="app.changeMonth(1)" style="width: auto; padding: 0.5rem;"><i data-lucide="chevron-right"></i></button>
            </div>
            <div class="calendar-weekdays">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div class="calendar-grid">
                ${daysHtml}
            </div>
        </div>
    `;
};

const renderEmployeeDashboard = () => {
    const selectedDateStr = formatDate(state.selectedDate);
    const existingRecord = getRecordForDate(selectedDateStr, state.user.name);
    const todayStr = formatDate(new Date());

    return `
        <div class="dashboard-container">
            <header class="header-nav" style="background: var(--surface); padding: 1.25rem; border-radius: 1.5rem; margin-bottom: 2rem; box-shadow: var(--shadow);">
                <div class="user-profile">
                    <div class="avatar">${state.user.name.charAt(0)}</div>
                    <div>
                        <h3 style="font-size: 1.125rem;">Hello, ${state.user.name}</h3>
                        <p class="text-secondary" style="font-size: 0.875rem;">Attendance Portal</p>
                    </div>
                </div>
                <div class="nav-links" style="display: flex; gap: 0.5rem; align-items: center;">
                    <button class="btn ${state.activeTab === 'attendance' ? 'btn-primary' : 'btn-outline'}" onclick="app.setTab('attendance')" style="width: auto; padding: 0.625rem 1.25rem; font-size: 0.875rem;">
                        <i data-lucide="calendar" style="width: 1rem; height: 1rem;"></i> Attendance
                    </button>
                    <button class="btn ${state.activeTab === 'profile' ? 'btn-primary' : 'btn-outline'}" onclick="app.setTab('profile')" style="width: auto; padding: 0.625rem 1.25rem; font-size: 0.875rem;">
                        <i data-lucide="user" style="width: 1rem; height: 1rem;"></i> Profile
                    </button>
                    <button class="btn btn-outline" onclick="app.logout()" style="width: auto; padding: 0.625rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">
                        <i data-lucide="log-out" style="width: 1rem; height: 1rem;"></i>
                    </button>
                </div>
            </header>

            ${renderCalendar()}

    <div class="glass-card" style="max-width: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h4 style="margin: 0;">Mark Attendance: ${selectedDateStr}</h4>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                ${existingRecord ? `
                            <button class="btn btn-outline" onclick="app.openEditModal(${existingRecord.id})" style="width: auto; padding: 0.4rem 0.8rem; font-size: 0.75rem; border-color: var(--primary); color: var(--primary);">
                                <i data-lucide="edit-3" style="width: 12px; height: 12px;"></i> Regularize
                            </button>
                        ` : ''}
                <span class="badge" style="background: rgba(99, 102, 241, 0.1); color: var(--primary); font-size: 0.75rem;">
                    <i data-lucide="clock" style="width: 12px; height: 12px; vertical-align: middle; margin-right: 4px;"></i>
                    Shift: 9:30 AM - 4:30 PM
                </span>
            </div>
        </div>

        ${existingRecord ? `
                    <div class="success-banner" style="background: rgba(16, 185, 129, 0.1); color: var(--success); padding: 1rem; border-radius: 1rem; margin-bottom: 1.5rem;">
                        <i data-lucide="check-circle"></i> Already marked as ${existingRecord.status}
                    </div>
                ` : ''}

        ${selectedDateStr === todayStr ? `
                    <button class="status-btn present ${app.selectedStatus === 'Present' ? 'active' : ''}" onclick="app.setStatus('Present')" data-status="Present">
                        <i data-lucide="check-circle"></i>
                        <span>Present</span>
                    </button>
                    <button class="status-btn late ${app.selectedStatus === 'Late' ? 'active' : ''}" onclick="app.setStatus('Late')" data-status="Late">
                        <i data-lucide="clock"></i>
                        <span>Late</span>
                    </button>
                    <button class="status-btn leave ${app.selectedStatus === 'Leave' ? 'active' : ''}" onclick="app.setStatus('Leave')" data-status="Leave">
                        <i data-lucide="calendar-x"></i>
                        <span>Absent</span>
                    </button>
                    <button class="status-btn half-day ${app.selectedStatus === 'Half Day' ? 'active' : ''}" onclick="app.setStatus('Half Day')" data-status="Half Day">
                        <i data-lucide="hourglass"></i>
                        <span>Half Day</span>
                    </button>
                ` : (() => {
            const isMissingCheckout = existingRecord && existingRecord.checkIn && !existingRecord.checkOut;
            const isPastWithNoRecord = !existingRecord && selectedDateStr !== todayStr;
            return `
                    <div class="info-banner" style="background: ${isMissingCheckout ? 'rgba(251, 191, 36, 0.1)' : 'rgba(99, 102, 241, 0.05)'}; color: ${isMissingCheckout ? '#92400e' : 'var(--primary)'}; padding: 1.5rem; border-radius: 1rem; margin-bottom: 2rem; text-align: center; border: 1px dashed ${isMissingCheckout ? 'var(--warning)' : 'var(--primary)'}">
                        <p style="font-weight: 600;">${isMissingCheckout ? 'Incomplete Attendance Record' : (isPastWithNoRecord ? 'Attendance Locked' : 'Attendance Already Recorded')}</p>
                        <p style="font-size: 0.875rem; margin-top: 0.25rem;">
                            ${isMissingCheckout
                    ? `You missed checking out on this day. Please regularize your checkout time.`
                    : (isPastWithNoRecord ? `Attendance can only be submitted for the current day.` : `Attendance has already been recorded for this date.`)}
                        </p>
                        ${existingRecord ? `
                            <button class="btn btn-primary" onclick="app.openEditModal(${existingRecord.id})" style="width: auto; margin-top: 1rem; padding: 0.6rem 1.25rem; font-size: 0.875rem; background: ${isMissingCheckout ? 'var(--warning)' : 'var(--primary)'}; border: none;">
                                <i data-lucide="edit-3"></i> ${isMissingCheckout ? 'Regularize Checkout' : 'Regularize Record'}
                            </button>
                        ` : ''}
                    </div>
                `;
        })()}

        <div id="time-tracking" style="display: ${((app.selectedStatus === 'Present' || app.selectedStatus === 'Late' || app.selectedStatus === 'Half Day' || (existingRecord && existingRecord.status !== 'Leave')) && selectedDateStr === todayStr) ? 'flex' : 'none'}; gap: 1rem; margin-bottom: 2rem;">
            <button class="btn btn-outline" style="flex: 1;" onclick="app.handleTimeAction('checkIn')"
                ${(existingRecord && existingRecord.checkIn) ? 'disabled' : ''}>
                <i data-lucide="log-in"></i>
                ${(existingRecord && existingRecord.checkIn) ? `In: ${existingRecord.checkIn}` : 'Check In'}
            </button>
            ${(() => {
            const openRecord = state.attendance.find(r => r.name === state.user.name && r.checkIn && !r.checkOut);
            const isToday = selectedDateStr === todayStr;
            return `
                        <button class="btn btn-outline" style="flex: 1;" onclick="app.handleTimeAction('checkOut')" 
                                ${(!openRecord || !isToday) ? 'disabled' : ''}>
                            <i data-lucide="log-out"></i> 
                            ${(existingRecord && existingRecord.checkOut) ? `Out: ${existingRecord.checkOut}` : 'Check Out'}
                        </button>
                        `;
        })()}
        </div>

        <div id="details-section" style="display: ${(app.selectedStatus === 'Late' || app.selectedStatus === 'Leave' || app.selectedStatus === 'Half Day') ? 'block' : 'none'}; margin-bottom: 2rem;">
            <div class="form-group">
                <label id="reason-label"><i data-lucide="file-text" style="width:1rem;height:1rem;vertical-align:middle;margin-right:4px;"></i> Reason for ${(app.selectedStatus === 'Leave' ? 'Absent' : (app.selectedStatus || ''))} entry</label>
                <textarea id="reason-input" placeholder="Enter reason here..." rows="3" style="width: 100%; padding: 0.75rem; border-radius: 0.75rem; border: 1px solid var(--border); font-family: inherit; margin-bottom: 1rem;">${existingRecord?.reason || ''}</textarea>
                <button class="btn btn-outline" onclick="app.saveReason()" style="width: auto; padding: 0.6rem 1.25rem; font-size: 0.875rem;">
                    <i data-lucide="save"></i> Save Reason
                </button>
            </div>
        </div>

        ${selectedDateStr === todayStr ? `
                <button class="btn btn-primary" onclick="app.submitAttendance()" ${existingRecord ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} style="margin-bottom: 1rem;">
                    ${existingRecord ? 'Attendance Recorded' : 'Submit Attendance'} <i data-lucide="send"></i>
                </button>
                ` : ''}

        ${(app.showOvertimeReason || (existingRecord && existingRecord.checkOut && !isAfterTime(formatDisplayTimeTo24(existingRecord.checkOut), SHIFT.end))) ? `
                    <div id="overtime-section" class="glass-card animate-scale" style="margin-top: 2rem; border-color: rgba(99, 102, 241, 0.2); background: rgba(99, 102, 241, 0.05); max-width: none;">
                        <h4 style="color: var(--primary); margin-bottom: 1rem;">
                            <i data-lucide="${app.showOvertimeReason ? 'award' : 'alert-triangle'}"></i> 
                            ${app.showOvertimeReason ? 'Overtime Work' : 'Early Checkout Detected'}
                        </h4>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label>${app.showOvertimeReason ? 'Please tell us why you worked overtime today:' : 'Please provide a reason for early checkout:'}</label>
                            <div style="display: flex; gap: 1rem;">
                                <textarea id="${app.showOvertimeReason ? 'ot-reason-input' : 'early-co-reason-input'}" 
                                          placeholder="${app.showOvertimeReason ? 'Working on project X, meeting deadlines...' : 'Personal emergency, appointment, etc.'}" 
                                          rows="2" style="flex: 1; padding: 0.75rem; border-radius: 0.75rem; border: 1px solid var(--border); font-family: inherit;">${app.showOvertimeReason ? (existingRecord?.overtimeReason || '') : (existingRecord?.earlyCheckoutReason || '')}</textarea>
                                <button class="btn btn-primary" onclick="${app.showOvertimeReason ? 'app.saveOvertimeReason()' : 'app.saveEarlyCheckoutReason()'}" style="width: auto; padding: 0.75rem 1.5rem;">
                                    <i data-lucide="check"></i> Submit
                                </button>
                            </div>
                        </div>
                        ${app.showOvertimeReason ? `<p style="font-size: 0.815rem; color: var(--text-secondary); margin-top: 1rem; font-style: italic;">Note: We appreciate your extra effort today!</p>` : ''}
                    </div>
                ` : ''}
    </div>
</div>
    `;
};

const renderEmployeeProfile = () => {
    const user = state.user;
    const calculateAge = (dob) => {
        if (!dob) return 'N/A';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };

    return `
        <div class="dashboard-container" style="max-width: 800px;">
            <header class="header-nav" style="background: var(--surface); padding: 1.25rem; border-radius: 1.5rem; margin-bottom: 2rem; box-shadow: var(--shadow);">
                <div class="user-profile">
                    <div class="avatar">${state.user.name.charAt(0)}</div>
                    <div>
                        <h3 style="font-size: 1.125rem;">My Profile</h3>
                        <p class="text-secondary" style="font-size: 0.875rem;">Employee Details</p>
                    </div>
                </div>
                <div class="nav-links" style="display: flex; gap: 0.5rem; align-items: center;">
                    <button class="btn ${state.activeTab === 'attendance' ? 'btn-primary' : 'btn-outline'}" onclick="app.setTab('attendance')" style="width: auto; padding: 0.625rem 1.25rem; font-size: 0.875rem;">
                        <i data-lucide="calendar" style="width: 1rem; height: 1rem;"></i> Attendance
                    </button>
                    <button class="btn ${state.activeTab === 'profile' ? 'btn-primary' : 'btn-outline'}" onclick="app.setTab('profile')" style="width: auto; padding: 0.625rem 1.25rem; font-size: 0.875rem;">
                        <i data-lucide="user" style="width: 1rem; height: 1rem;"></i> Profile
                    </button>
                    <button class="btn btn-outline" onclick="app.logout()" style="width: auto; padding: 0.625rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">
                        <i data-lucide="log-out" style="width: 1rem; height: 1rem;"></i>
                    </button>
                </div>
            </header>

            <div class="glass-card profile-card animate-scale" style="max-width: 600px; margin: 0 auto; padding: 3rem;">
                <div class="profile-photo-wrapper" style="width: 150px; height: 150px; margin: 0 auto 1.5rem; border-radius: 50%; overflow: hidden; border: 4px solid var(--primary); box-shadow: var(--shadow-lg); background: var(--background);">
                    ${user.photo ? `<img src="${user.photo}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover;">` : ''}
                </div>
                <h1 style="font-size: 2.25rem; margin-bottom: 0.5rem;">${user.fullName || user.name}</h1>
            </div>

            <div class="profile-details" style="display: grid; gap: 2rem;">
                <div class="detail-item" style="background: rgba(255, 255, 255, 0.03); padding: 1.5rem; border-radius: 1.25rem; display: flex; align-items: center; gap: 1.5rem;">
                    <div style="width: 3.5rem; height: 3.5rem; background: rgba(99, 102, 241, 0.1); color: var(--primary); border-radius: 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        <i data-lucide="calendar"></i>
                    </div>
                    <div>
                        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Date of Birth & Age</p>
                        <h3 style="font-size: 1.125rem;">${formatDate(user.dob) || 'Not provided'} (${calculateAge(user.dob)} years old)</h3>
                    </div>
                </div>

                <div class="detail-item" style="background: rgba(255, 255, 255, 0.03); padding: 1.5rem; border-radius: 1.25rem; display: flex; align-items: center; gap: 1.5rem;">
                    <div style="width: 3.5rem; height: 3.5rem; background: rgba(16, 185, 129, 0.1); color: var(--success); border-radius: 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        <i data-lucide="indian-rupee"></i>
                    </div>
                    <div>
                        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Monthly Salary</p>
                        <h3 style="font-size: 1.125rem;">Rs.${Number(user.salary).toLocaleString() || '0'}</h3>
                    </div>
                </div>
            </div>

            <div style="margin-top: 3rem; text-align: center; display: flex; gap: 1rem; justify-content: center;">
                <button class="btn btn-primary" onclick="app.openProfileEditModal('${state.user.name}')" style="width: auto; padding: 0.75rem 2rem;">
                    <i data-lucide="edit"></i> Edit Profile
                </button>
                <button class="btn btn-outline" onclick="app.logout()" style="width: auto; padding: 0.75rem 2rem; border-color: #ef4444; color: #ef4444;">
                    <i data-lucide="log-out"></i> Logout from Profile
                </button>
            </div>
        </div>
    `;
};

const renderEmployeeDirectory = () => {
    const employees = JSON.parse(localStorage.getItem('employee_users')) || {};
    const employeeList = Object.keys(employees).map(username => ({
        username,
        ...employees[username]
    }));

    return `
        <div class="directory-container animate-scale">
            <header class="header-nav" style="background: var(--surface); padding: 1.25rem; border-radius: 1.5rem; margin-bottom: 2rem; box-shadow: var(--shadow);">
                <div class="user-profile">
                    <div class="stat-icon stat-total" style="width: 2.5rem; height: 2.5rem; font-size: 1rem;"><i data-lucide="users"></i></div>
                    <div>
                        <h3 style="font-size: 1.125rem;">Directory</h3>
                        <p class="text-secondary" style="font-size: 0.875rem;">${employeeList.length} Staff</p>
                    </div>
                </div>
                <div class="nav-links" style="display: flex; gap: 0.5rem; align-items: center;">
                    <button class="btn ${state.adminTab === 'attendance' ? 'btn-primary' : 'btn-outline'}" onclick="app.setAdminTab('attendance')" style="width: auto; padding: 0.625rem 1.25rem; font-size: 0.875rem;">
                        <i data-lucide="monitor" style="width: 1rem; height: 1rem;"></i> Monitoring
                    </button>
                    <button class="btn ${state.adminTab === 'directory' ? 'btn-primary' : 'btn-outline'}" onclick="app.setAdminTab('directory')" style="width: auto; padding: 0.625rem 1.25rem; font-size: 0.875rem;">
                        <i data-lucide="users" style="width: 1rem; height: 1rem;"></i> Employees
                    </button>
                    <button class="btn btn-outline" onclick="app.logout()" style="width: auto; padding: 0.625rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">
                        <i data-lucide="log-out" style="width: 1rem; height: 1rem;"></i>
                    </button>
                </div>
            </header>

            <div class="employee-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
                ${employeeList.map(emp => {
        const dob = formatDate(emp.dob);
        return `
                        <div class="glass-card stat-card" style="max-width: none; text-align: left; padding: 1.5rem; display: block;">
                            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                                <div style="width: 4rem; height: 4rem; border-radius: 50%; overflow: hidden; background: var(--background); border: 1px solid var(--border);">
                                    ${emp.photo ? `<img src="${emp.photo}" style="width: 100%; height: 100%; object-fit: cover;">` : ''}
                                </div>
                                <div>
                                    <h4 style="margin: 0;">${emp.fullName || emp.username}</h4>
                                    <p class="text-secondary" style="font-size: 0.815rem; margin: 0;">${emp.position || 'No position set'}</p>
                                </div>
                            </div>
                            <div class="profile-info-grid" style="font-size: 0.875rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; border-top: 1px solid var(--border); padding-top: 1rem; position: relative;">
                                <div>
                                    <p class="text-secondary" style="font-size: 0.75rem; margin: 0;">Date of Birth</p>
                                    <p style="font-weight: 500;">${dob}</p>
                                </div>
                                <div>
                                    <p class="text-secondary" style="font-size: 0.75rem; margin: 0;">Monthly Salary</p>
                                    <p style="font-weight: 500;">Rs.${Number(emp.salary).toLocaleString() || '0'}</p>
                                </div>
                                <div style="position: absolute; right: 0; bottom: 0; display: flex; gap: 0.5rem;">
                                    <button class="btn-icon" onclick="app.openProfileEditModal('${emp.username}')" style="padding: 0.4rem;" title="Edit Profile">
                                        <i data-lucide="edit-2" style="width: 1rem; height: 1rem;"></i>
                                    </button>
                                    <button class="btn-icon delete" onclick="app.deleteEmployee('${emp.username}')" style="padding: 0.4rem;" title="Delete Employee">
                                        <i data-lucide="user-minus" style="width: 1rem; height: 1rem;"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
    }).join('')}
                ${employeeList.length === 0 ? '<p style="text-align: center; grid-column: 1/-1; padding: 3rem; color: var(--text-secondary);">No employees registered yet.</p>' : ''}
            </div>
        </div>
    `;
};

const renderAdminDashboard = () => {
    const stats = calculateStats();
    const searchTerm = state.adminSearch || '';
    const employeeFilter = state.adminEmployeeFilter || 'all';
    const statusFilter = state.adminStatusFilter || 'all';

    const employees = JSON.parse(localStorage.getItem('employee_users')) || {};
    const employeeNames = Object.keys(employees);

    const filteredRecords = state.attendance.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.date.includes(searchTerm);
        const matchesEmployee = employeeFilter === 'all' || r.name === employeeFilter;
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

        // Date range filtering
        let matchesDateRange = true;
        if (state.adminDateFrom || state.adminDateTo) {
            const [d, m, y] = r.date.split('/').map(Number);
            const recordDate = new Date(y, m - 1, d);
            recordDate.setHours(0, 0, 0, 0);

            if (state.adminDateFrom) {
                const fromDate = new Date(state.adminDateFrom);
                fromDate.setHours(0, 0, 0, 0);
                if (recordDate < fromDate) matchesDateRange = false;
            }
            if (state.adminDateTo) {
                const toDate = new Date(state.adminDateTo);
                toDate.setHours(0, 0, 0, 0);
                if (recordDate > toDate) matchesDateRange = false;
            }
        }

        return matchesSearch && matchesEmployee && matchesStatus && matchesDateRange;
    });

    return `
    <div class="dashboard-container" style="max-width: 1000px;">
            <header class="header-nav" style="background: var(--surface); padding: 1.25rem; border-radius: 1.5rem; margin-bottom: 2rem; box-shadow: var(--shadow);">
                <div class="user-profile">
                    <div class="avatar">A</div>
                    <div>
                        <h3 style="font-size: 1.125rem;">Admin Monitoring: ${formatDate(new Date())}</h3>
                        <p class="text-secondary" style="font-size: 0.875rem;">Live Statistics</p>
                    </div>
                </div>
                <div class="nav-links" style="display: flex; gap: 0.5rem; align-items: center;">
                    <button class="btn ${state.adminTab === 'attendance' ? 'btn-primary' : 'btn-outline'}" onclick="app.setAdminTab('attendance')" style="width: auto; padding: 0.625rem 1.25rem; font-size: 0.875rem;">
                        <i data-lucide="monitor" style="width: 1rem; height: 1rem;"></i> Monitoring
                    </button>
                    <button class="btn ${state.adminTab === 'directory' ? 'btn-primary' : 'btn-outline'}" onclick="app.setAdminTab('directory')" style="width: auto; padding: 0.625rem 1.25rem; font-size: 0.875rem;">
                        <i data-lucide="users" style="width: 1rem; height: 1rem;"></i> Employees
                    </button>
                    <button class="btn btn-outline" onclick="app.exportToCSV()" style="width: auto; padding: 0.625rem;" title="Export to CSV">
                        <i data-lucide="download" style="width: 1rem; height: 1rem;"></i> Export CSV
                    </button>
                    <button class="btn btn-outline" onclick="app.logout()" style="width: auto; padding: 0.625rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">
                        <i data-lucide="log-out" style="width: 1rem; height: 1rem;"></i>
                    </button>
                </div>
            </header>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon stat-total"><i data-lucide="users"></i></div>
                    <div class="stat-info"><h2>${stats.total}</h2><p>Total Records</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon stat-present"><i data-lucide="check-circle"></i></div>
                    <div class="stat-info"><h2>${stats.present}</h2><p>Present</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon stat-leave"><i data-lucide="calendar-x"></i></div>
                    <div class="stat-info"><h2>${stats.leave}</h2><p>On Leave</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon stat-half-day"><i data-lucide="hourglass"></i></div>
                    <div class="stat-info"><h2>${stats.halfDay}</h2><p>Half Day</p></div>
                </div>
            </div>

            <div class="admin-tools">
                <div class="form-group" style="flex: 2; min-width: 250px;">
                    <label><i data-lucide="search" style="width: 1rem; height: 1rem;"></i> Search</label>
                    <div class="input-wrapper" style="position: relative;">
                        <i data-lucide="search" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); width: 1.25rem; height: 1.25rem; color: var(--text-secondary);"></i>
                        <input type="text" id="admin-search" placeholder="Search records..." 
                               oninput="app.handleSearch(this.value)" value="${searchTerm}"
                               style="padding-left: 3rem;">
                    </div>
                </div>
                <div class="form-group" style="flex: 1; min-width: 140px;">
                    <label>From Date</label>
                    <input type="date" id="admin-date-from" onchange="app.handleDateFilterChange()" value="${state.adminDateFrom || ''}">
                </div>
                <div class="form-group" style="flex: 1; min-width: 140px;">
                    <label>To Date</label>
                    <input type="date" id="admin-date-to" onchange="app.handleDateFilterChange()" value="${state.adminDateTo || ''}">
                </div>
                <div class="form-group" style="flex: 1; min-width: 150px;">
                    <label>Employee</label>
                    <select onchange="app.setEmployeeFilter(this.value)">
                        <option value="all" ${employeeFilter === 'all' ? 'selected' : ''}>All Employees</option>
                        ${employeeNames.map(name => `<option value="${name}" ${employeeFilter === name ? 'selected' : ''}>${name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group" style="flex: 1; min-width: 150px;">
                    <label>Status</label>
                    <select onchange="app.setStatusFilter(this.value)">
                        <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
                        <option value="Present" ${statusFilter === 'Present' ? 'selected' : ''}>Present</option>
                        <option value="Late" ${statusFilter === 'Late' ? 'selected' : ''}>Late</option>
                        <option value="Leave" ${statusFilter === 'Leave' ? 'selected' : ''}>Absent</option>
                        <option value="Half Day" ${statusFilter === 'Half Day' ? 'selected' : ''}>Half Day</option>
                    </select>
                </div>
                <button class="btn btn-outline" onclick="app.clearFilters()" style="padding: 0.75rem 1rem; border-radius: 0.75rem;">
                    <i data-lucide="filter-x"></i> Clear
                </button>
            </div>

            <div class="records-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Employee</th>
                            <th>Status</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Reason</th>
                            <th>Regularization Reason</th>
                            <th>OT Reason</th>
                            <th>Early CO Reason</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredRecords.length === 0 ? '<tr><td colspan="9" style="text-align: center;">No matching records found</td></tr>' :
            filteredRecords.map(r => {
                const empData = employees[r.name] || {};
                const displayName = empData.fullName || r.name;
                return `
                                <tr class="staggered-row">
                                    <td>${r.date}</td>
                                    <td>${displayName}</td>
                                    <td><span class="badge badge-${r.status.toLowerCase()}">${r.status === 'Leave' ? 'Absent' : r.status}</span></td>
                                    <td style="white-space: nowrap;">${r.checkIn ? `${r.date} ${r.checkIn}` : '<span class="placeholder-text">not given</span>'}</td>
                                    <td style="white-space: nowrap;">${r.checkOut ? `${app.getCheckOutDate(r)} ${r.checkOut}` : '<span class="placeholder-text">not given</span>'}</td>
                                    <td>${r.reason || '<span class="placeholder-text">not given</span>'}</td>
                                    <td>${r.regularizationReason || '<span class="placeholder-text">not given</span>'}</td>
                                    <td>${r.overtimeReason || '<span class="placeholder-text">not given</span>'}</td>
                                    <td>${r.earlyCheckoutReason || '<span class="placeholder-text">not given</span>'}</td>
                                    <td>
                                        <div style="display: flex; gap: 0.5rem;">
                                            <button class="btn-icon" onclick="app.openEditModal(${r.id})" title="Edit Record">
                                                <i data-lucide="edit-3" style="color: var(--primary);"></i>
                                            </button>
                                            <button class="btn-icon delete" onclick="app.deleteRecord(${r.id})" title="Delete Record">
                                                <i data-lucide="trash-2" style="color: var(--danger);"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
            }).join('')
        }
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

const renderModals = () => {
    return `
    <div id="edit-modal" class="modal-root" style="display: none;">
        <div class="modal-content glass-card">
            <div class="modal-header">
                <h3>Edit Attendance Record</h3>
                <button class="btn-icon" onclick="app.closeModal()"><i data-lucide="x"></i></button>
            </div>
            <form id="edit-form" class="modal-body">
                <input type="hidden" id="edit-id">
                    <div class="form-group">
                        <label>Status</label>
                        <select id="edit-status">
                            <option value="Present">Present</option>
                            <option value="Late">Late</option>
                            <option value="Leave">Absent</option>
                            <option value="Half Day">Half Day</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <div class="form-group" style="flex: 1;">
                            <label>Check In</label>
                            <input type="time" id="edit-checkin">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Check Out</label>
                            <input type="time" id="edit-checkout">
                        </div>
                    </div>
                    <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                        <input type="checkbox" id="edit-next-day" style="width: auto; height: 1.25rem; width: 1.25rem;">
                            <label for="edit-next-day" style="margin: 0; cursor: pointer;">Checkout on Next Day</label>
                    </div>
                    <div id="group-reason" class="form-group">
                        <label>Reason</label>
                        <textarea id="edit-reason" rows="2"></textarea>
                    </div>
                    <div id="group-ot-reason" class="form-group">
                        <label>Overtime Reason</label>
                        <textarea id="edit-ot-reason" rows="2"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Regularization Reason</label>
                        <textarea id="edit-reg-reason" rows="2"></textarea>
                    </div>
                    <div id="group-early-co-reason" class="form-group">
                        <label>Early Checkout Reason</label>
                        <textarea id="edit-early-co-reason" rows="2"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline cancel" onclick="app.closeModal()">
                             <i data-lucide="x"></i> Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                             <i data-lucide="check"></i> Save Changes
                        </button>
                    </div>
            </form>
        </div>
        </div>

    <div id="profile-edit-modal" class="modal-root full-screen" style="display: none;">
        <div class="modal-content glass-card">
            <div class="modal-header">
                <h3>Edit Employee Profile</h3>
                <button class="btn-icon" onclick="app.closeModal()"><i data-lucide="x"></i></button>
            </div>
            <form id="profile-edit-form" class="modal-body">
                <input type="hidden" id="prof-edit-username">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" id="prof-edit-fullname" required>
                    </div>
                    <div class="form-group">
                        <label>Date of Birth</label>
                        <input type="date" id="prof-edit-dob" required>
                    </div>
                    <div class="form-group">
                        <label>Position</label>
                        <input type="text" id="prof-edit-position" required>
                    </div>
                    <div class="form-group">
                        <label>Monthly Salary</label>
                        <input type="number" id="prof-edit-salary" required>
                    </div>
                    <div class="form-group">
                        <label>Profile Photo</label>
                        <input type="file" id="prof-edit-photo" accept="image/*" onchange="app.handlePhotoUpload(this, 'prof-edit-photo-base64')">
                            <input type="hidden" id="prof-edit-photo-base64">
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-outline cancel" onclick="app.closeModal()">
                                    <i data-lucide="x"></i> Cancel
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    <i data-lucide="save"></i> Update Profile
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                `;
};

// Core Logic
const app = {
    init: () => {
        // Ensure app starts on "Today"
        state.selectedDate = new Date();
        state.viewDate = new Date();

        // Migrate existing records to DD/MM/YYYY if they are in a different format
        let updated = false;
        state.attendance.forEach(r => {
            const parts = r.date.split('/');
            if (parts.length === 3 && (parts[0].length < 2 || parts[1].length < 2)) {
                r.date = formatDate(r.date);
                updated = true;
            } else if (r.date.includes('-')) {
                r.date = formatDate(r.date);
                updated = true;
            }
        });
        if (updated) saveAttendance();

        // Auto-refresh date when window gains focus
        window.addEventListener('focus', () => {
            app.syncDate();
        });

        // Check for date change every minute
        setInterval(() => {
            app.syncDate();
        }, 60000);

        // app.checkAndMarkAbsentees();
        app.render();
    },

    syncDate: () => {
        const now = formatDate(new Date());
        const selected = formatDate(state.selectedDate);
        // If the day changed while the app was inactive, refresh to today
        if (now !== selected && state.activeTab === 'attendance' && state.user?.role === 'employee') {
            state.selectedDate = new Date();
            state.viewDate = new Date();
            app.render();
        }
        // app.checkAndMarkAbsentees();
    },

    setView: (view) => {
        state.currentView = view;
        if (view === 'reset-password') {
            state.resetStep = 1;
            state.resetVerifiedUser = null;
        }
        app.render();
    },

    render: () => {
        const container = document.getElementById('screen-container');

        if (state.currentView === 'reset-password') {
            container.innerHTML = renderResetPassword();
            const verifyForm = document.getElementById('verify-identity-form');
            const resetForm = document.getElementById('reset-password-form');

            if (verifyForm) {
                verifyForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    app.verifyIdentity();
                });
            }
            if (resetForm) {
                resetForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    app.resetPassword();
                });
            }
            lucide.createIcons();
            return;
        }

        if (state.currentView === 'login') {
            container.innerHTML = renderLogin();
            const form = document.getElementById('login-form');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const name = document.getElementById('username').value;
                    const password = document.getElementById('password').value;
                    const role = state.loginRole;
                    const action = role === 'admin' ? state.adminAction : state.employeeAction;
                    const storageKey = role === 'admin' ? 'admin_users' : 'employee_users';
                    const defaultUsers = role === 'admin' ? { 'arthana': 'arthana2255' } : { 'user': 'user123' };

                    if (action === 'signup') {
                        if (role === 'admin') {
                            showToast('Admin registration is disabled', 'danger');
                            return;
                        }
                        const users = JSON.parse(localStorage.getItem(storageKey)) || {};
                        if (users[name]) {
                            showToast('Username already exists', 'danger');
                            return;
                        }

                        if (role === 'employee') {
                            users[name] = {
                                password: password,
                                fullName: document.getElementById('full-name').value,
                                dob: document.getElementById('dob').value,
                                position: document.getElementById('position').value,
                                salary: document.getElementById('salary').value,
                                photo: document.getElementById('photo-base64').value || null
                            };
                        } else {
                            users[name] = password;
                        }

                        localStorage.setItem(storageKey, JSON.stringify(users));
                        showToast(`${role.charAt(0).toUpperCase() + role.slice(1)} registered! Please login.`, 'success');
                        if (role === 'admin') state.adminAction = 'login';
                        else state.employeeAction = 'login';
                        app.render();
                        return;
                    } else {
                        const users = JSON.parse(localStorage.getItem(storageKey)) || defaultUsers;
                        const userData = users[name];

                        // Handle both old (string) and new (object) storage formats
                        const storedPassword = (typeof userData === 'object') ? userData.password : userData;

                        if (!userData || storedPassword !== password) {
                            showToast('Invalid credentials', 'danger');
                            return;
                        }

                        if (role === 'admin' && name !== 'arthana') {
                            showToast('Access denied: Only the primary admin account is allowed.', 'danger');
                            return;
                        }

                        // Attach full profile data to state.user if it exists
                        state.user = {
                            name,
                            role,
                            ...(typeof userData === 'object' ? userData : {})
                        };
                    }

                    localStorage.setItem('currentUser', JSON.stringify(state.user));
                    state.currentView = role === 'admin' ? 'admin' : 'employee';
                    app.render();
                    showToast(`Welcome, ${name}!`);
                });
            }
        } else if (state.currentView === 'employee') {
            container.innerHTML = state.activeTab === 'attendance' ? renderEmployeeDashboard() : renderEmployeeProfile();
        } else if (state.currentView === 'admin') {
            container.innerHTML = state.adminTab === 'attendance' ? renderAdminDashboard() : renderEmployeeDirectory();
        }

        // Initialize modals only if they don't exist
        const modalHost = document.getElementById('modal-host');
        if (modalHost && !modalHost.innerHTML.trim()) {
            modalHost.innerHTML = renderModals();
        }
        lucide.createIcons();
    },

    logout: () => {
        state.user = null;
        localStorage.removeItem('currentUser');
        state.loginRole = null;
        state.currentView = 'login';
        const modalHost = document.getElementById('modal-host');
        if (modalHost) modalHost.innerHTML = ''; // Force modals to re-render on next login
        app.render();
    },

    setLoginRole: (role) => {
        state.loginRole = role;
        state.adminAction = 'login';
        state.employeeAction = 'login';
        app.render();
    },

    setPortalAction: (action) => {
        if (state.loginRole === 'admin') state.adminAction = action;
        else state.employeeAction = action;
        app.render();
    },

    togglePassword: () => {
        state.showPassword = !state.showPassword;
        const passInput = document.getElementById('password');
        const toggleBtn = document.querySelector('.password-toggle');

        if (passInput && toggleBtn) {
            passInput.type = state.showPassword ? 'text' : 'password';
            toggleBtn.innerHTML = `<i data-lucide="${state.showPassword ? 'eye-off' : 'eye'}"></i>`;
            lucide.createIcons();
        }
    },

    setStatus: (status) => {
        app.selectedStatus = status;
        const btns = document.querySelectorAll('.status-btn');
        btns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.status === status) btn.classList.add('active');
        });

        const details = document.getElementById('details-section');
        const label = document.getElementById('reason-label');

        if (status === 'Late' || status === 'Leave' || status === 'Half Day') {
            details.style.display = 'block';
            label.textContent = `Reason for ${status === 'Leave' ? 'Absent' : status} entry`;
        } else {
            details.style.display = 'none';
        }
    },

    submitAttendance: () => {
        if (!app.selectedStatus) {
            showToast('Please select a status', 'danger');
            return;
        }

        const dateStr = formatDate(state.selectedDate);
        if (dateStr !== formatDate(new Date())) {
            showToast('Attendance can only be submitted for the current date', 'danger');
            return;
        }

        // Check if record exists for this date
        if (getRecordForDate(dateStr, state.user.name)) {
            showToast('Attendance already marked for this date', 'danger');
            return;
        }

        const record = {
            id: Date.now(),
            date: dateStr,
            name: state.user.name,
            status: app.selectedStatus,
            reason: (app.selectedStatus === 'Late' || app.selectedStatus === 'Leave' || app.selectedStatus === 'Half Day') ? document.getElementById('reason-input').value : null
        };

        state.attendance.unshift(record);
        saveAttendance();
        showToast('Attendance submitted successfully!');

        app.selectedStatus = null;
        app.selectedEmoji = null;
        app.render();
    },

    selectDate: (y, m, d) => {
        state.selectedDate = new Date(y, m, d);
        app.selectedStatus = null;
        app.selectedEmoji = null;
        app.render();
    },

    changeMonth: (delta) => {
        const newDate = new Date(state.viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        state.viewDate = newDate;
        app.render();
    },

    handleSearch: (val) => {
        state.adminSearch = val;
        app.render();
        // Maintain focus on search input
        const input = document.getElementById('admin-search');
        if (input) {
            input.focus();
            input.setSelectionRange(val.length, val.length);
        }
    },

    handleTimeAction: (action) => {
        const time24 = getCurrent24Time();
        const displayTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const todayStr = formatDate(new Date());

        if (formatDate(state.selectedDate) !== todayStr) {
            showToast('Check-in/out is only allowed for the current date', 'danger');
            return;
        }

        let record;

        if (action === 'checkOut') {
            // Find the most recent record that has a check-in but no check-out
            record = [...state.attendance].find(r => r.name === state.user.name && r.checkIn && !r.checkOut);

            if (!record) {
                // If no open record found, try to find today's record
                record = getRecordForDate(formatDate(state.selectedDate), state.user.name);
            }

            if (!record || !record.checkIn) {
                showToast('You must check in first', 'danger');
                return;
            }
        } else {
            // For check-in, always target the currently selected date or today
            const dateStr = formatDate(state.selectedDate);
            record = getRecordForDate(dateStr, state.user.name);

            if (!record) {
                if (!app.selectedStatus) {
                    if (isAfterTime(time24, SHIFT.lateThreshold)) {
                        showToast('Late check-in detected', 'warning');
                        app.setStatus('Late');
                    } else {
                        app.setStatus('Present');
                    }
                }
                app.submitAttendance();
                record = getRecordForDate(dateStr, state.user.name);
            }
        }

        if (action === 'checkIn' && !record.checkIn) {
            record.checkIn = displayTime;
            // Double check late if status was manually set to Present but time is late
            if (isAfterTime(time24, SHIFT.lateThreshold) && record.status === 'Present') {
                record.status = 'Late';
                showToast('Checked in late. Please provide a reason.', 'warning');
            } else {
                showToast(`Checked in at ${displayTime}`);
            }
        } else if (action === 'checkOut' && record.checkIn && !record.checkOut) {
            record.checkOut = displayTime;
            const checkIn24 = formatDisplayTimeTo24(record.checkIn);

            // Detect next day checkout if check-out time is earlier than check-in time
            if (isAfterTime(checkIn24, time24)) {
                record.nextDayCheckout = true;
            }

            const duration = getDurationHours(checkIn24, time24);

            if (isAfterTime(time24, SHIFT.overtimeThreshold)) {
                showToast(`Checked out. Great work today!`, 'success');
                app.showOvertimeReason = true;
                app.showEarlyCheckoutReason = false;
            } else if (time24 < SHIFT.end) {
                showToast('Early checkout detected. Please provide a reason.', 'warning');
                app.showEarlyCheckoutReason = true;
                app.showOvertimeReason = false;
            } else {
                showToast(`Checked out at ${displayTime}`);
                app.showOvertimeReason = false;
                app.showEarlyCheckoutReason = false;
            }
        }



        saveAttendance();
        app.render();
    },

    exportToCSV: () => {
        if (state.attendance.length === 0) {
            showToast('No records to export', 'danger');
            return;
        }

        const now = new Date();
        const exportDateStr = formatDate(now).replace(/\//g, '-');
        const exportTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(/:/g, '-');

        // CSV Headers - Improved for clarity in Excel
        const headers = ['Record Date', 'Employee', 'Status', 'Check In Time', 'Check Out Time', 'Reason', 'Regularization Reason', 'OT Reason', 'Early CO Reason'];

        const rows = state.attendance.map(r => {
            const sanitize = (val, isDate = false) => {
                if (val === null || val === undefined || val === 'not given' || val === '-') return 'not given';
                const escaped = String(val).replace(/"/g, '""');
                // Excel formula trick to force literal text: ="value"
                // This prevents the ######## issue for dates/long strings
                return isDate ? `=" ${escaped}"` : `"${escaped}"`;
            };

            const checkOutDate = app.getCheckOutDate(r);

            return [
                sanitize(r.date, true),
                sanitize(r.name),
                sanitize(r.status),
                sanitize(r.checkIn ? `${r.date} ${r.checkIn}` : 'not given', true),
                sanitize(r.checkOut ? `${checkOutDate} ${r.checkOut}` : 'not given', true),
                sanitize(r.reason),
                sanitize(r.regularizationReason),
                sanitize(r.overtimeReason),
                sanitize(r.earlyCheckoutReason)
            ];
        });

        // Add UTF-8 BOM (\uFEFF) for Excel compatibility with special characters and symbols
        const csvContent = '\uFEFF' + [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `attendance_export_${exportDateStr}_${exportTimeStr}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Attendance exported for ${formatDate(now)}`);
    },

    deleteRecord: (id) => {
        if (confirm('Are you sure you want to delete this record?')) {
            state.attendance = state.attendance.filter(r => r.id !== id);
            saveAttendance();
            app.render();
            showToast('Record deleted successfully');
        }
    },

    deleteEmployee: (username) => {
        if (confirm(`Are you sure you want to delete employee "${username}"? This action cannot be undone.`)) {
            const employees = JSON.parse(localStorage.getItem('employee_users')) || {};
            if (employees[username]) {
                delete employees[username];
                localStorage.setItem('employee_users', JSON.stringify(employees));

                // Clean up attendance records
                state.attendance = state.attendance.filter(r => r.name !== username);
                saveAttendance();

                app.render();
                showToast(`Employee "${username}" deleted successfully`, 'success');
            }
        }
    },

    openEditModal: (id) => {
        const record = state.attendance.find(r => r.id === id);
        if (!record) return;

        // Security check for employees: only own records
        if (state.user.role === 'employee' && record.name !== state.user.name) {
            showToast('You can only regularize your own records', 'danger');
            return;
        }

        const modal = document.getElementById('edit-modal');
        modal.style.display = 'flex';

        // Update title based on role
        const modalTitle = modal.querySelector('h3');
        if (modalTitle) {
            modalTitle.textContent = state.user.role === 'employee' ? 'Regularize Attendance' : 'Edit Attendance Record';
        }

        // Dynamically hide/show redundant fields for employees
        const isEmployee = state.user.role === 'employee';
        const displayStyle = isEmployee ? 'none' : 'block';

        const gReason = document.getElementById('group-reason');
        const gOtReason = document.getElementById('group-ot-reason');
        const gEarlyReason = document.getElementById('group-early-co-reason');

        if (gReason) gReason.style.display = displayStyle;
        if (gOtReason) gOtReason.style.display = displayStyle;
        if (gEarlyReason) gEarlyReason.style.display = displayStyle;

        document.getElementById('edit-id').value = record.id;
        document.getElementById('edit-status').value = record.status;
        document.getElementById('edit-reason').value = record.reason || '';
        document.getElementById('edit-reg-reason').value = record.regularizationReason || '';
        document.getElementById('edit-ot-reason').value = record.overtimeReason || '';
        document.getElementById('edit-early-co-reason').value = record.earlyCheckoutReason || '';
        document.getElementById('edit-next-day').checked = record.nextDayCheckout || false;

        // Convert "10:30 AM" to "10:30" format for time input
        const formatTime = (t) => {
            if (!t) return '';
            let [time, modifier] = t.split(' ');
            let [hours, minutes] = time.split(':');
            if (modifier === 'PM' && hours !== '12') hours = parseInt(hours, 10) + 12;
            if (modifier === 'AM' && hours === '12') hours = '00';
            return `${hours}:${minutes}`;
        };

        document.getElementById('edit-checkin').value = formatTime(record.checkIn);
        document.getElementById('edit-checkout').value = formatTime(record.checkOut);

        lucide.createIcons();

        // Handle form submit
        const form = document.getElementById('edit-form');
        form.onsubmit = (e) => {
            e.preventDefault();
            const updatedRecord = state.attendance.find(r => r.id === id);

            const regReason = document.getElementById('edit-reg-reason').value;
            if (state.user.role === 'employee' && !regReason.trim()) {
                showToast('Please provide a reason for regularization', 'warning');
                return;
            }

            const formatDisplayTime = (t) => {
                if (!t) return null;
                const [h, m] = t.split(':');
                const hours = parseInt(h, 10);
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayH = hours % 12 || 12;
                return `${displayH}:${m} ${ampm}`;
            };

            updatedRecord.status = document.getElementById('edit-status').value;
            if (state.user.role === 'employee') {
                updatedRecord.reason = 'nill';
                updatedRecord.overtimeReason = 'nill';
                updatedRecord.earlyCheckoutReason = 'nill';
            } else {
                updatedRecord.reason = document.getElementById('edit-reason').value;
                updatedRecord.overtimeReason = document.getElementById('edit-ot-reason').value;
                updatedRecord.earlyCheckoutReason = document.getElementById('edit-early-co-reason').value;
            }
            updatedRecord.regularizationReason = regReason;
            updatedRecord.nextDayCheckout = document.getElementById('edit-next-day').checked;
            updatedRecord.checkIn = formatDisplayTime(document.getElementById('edit-checkin').value);
            updatedRecord.checkOut = formatDisplayTime(document.getElementById('edit-checkout').value);

            saveAttendance();
            app.closeModal();
            app.render();
            showToast(state.user.role === 'employee' ? 'Regularization submitted successfully' : 'Record updated successfully');
        };
    },

    saveReason: () => {
        const reason = document.getElementById('reason-input').value;
        if (!reason.trim()) {
            showToast('Please enter a reason', 'warning');
            return;
        }

        const dateStr = formatDate(state.selectedDate);
        let record = getRecordForDate(dateStr, state.user.name);

        if (record) {
            record.reason = reason;
            saveAttendance();
            showToast('Reason updated successfully');
        } else {
            showToast('Please submit attendance first', 'warning');
        }
    },

    saveOvertimeReason: () => {
        const reason = document.getElementById('ot-reason-input').value;
        if (!reason.trim()) {
            showToast('Please enter overtime reason', 'warning');
            return;
        }

        const dateStr = formatDate(state.selectedDate);
        let record = getRecordForDate(dateStr, state.user.name);

        if (record) {
            record.overtimeReason = reason;
            saveAttendance();
            showToast('Overtime reason saved! Great work.', 'success');
            app.showOvertimeReason = false;
            app.render();
        } else {
            showToast('Please submit attendance first', 'warning');
        }
    },

    saveEarlyCheckoutReason: () => {
        const reason = document.getElementById('early-co-reason-input').value;
        if (!reason.trim()) {
            showToast('Please enter early checkout reason', 'warning');
            return;
        }

        const dateStr = formatDate(state.selectedDate);
        let record = getRecordForDate(dateStr, state.user.name);

        if (record) {
            record.earlyCheckoutReason = reason;
            saveAttendance();
            showToast('Early checkout reason saved.', 'success');
            app.showEarlyCheckoutReason = false;
            app.render();
        } else {
            showToast('Please submit attendance first', 'warning');
        }
    },

    handlePhotoUpload: (input, hiddenId = 'photo-base64') => {
        const file = input.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById(hiddenId).value = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    },

    openProfileEditModal: (username) => {
        const employees = JSON.parse(localStorage.getItem('employee_users')) || {};
        const emp = employees[username];
        if (!emp) return;

        const modal = document.getElementById('profile-edit-modal');
        modal.style.display = 'flex';

        document.getElementById('prof-edit-username').value = username;
        document.getElementById('prof-edit-fullname').value = emp.fullName || '';
        document.getElementById('prof-edit-dob').value = emp.dob || '';
        document.getElementById('prof-edit-position').value = emp.position || '';
        document.getElementById('prof-edit-salary').value = emp.salary || 0;
        document.getElementById('prof-edit-photo-base64').value = emp.photo || '';

        const isEmployee = state.user.role === 'employee';
        document.getElementById('prof-edit-position').disabled = isEmployee;
        document.getElementById('prof-edit-salary').disabled = isEmployee;

        lucide.createIcons();

        const form = document.getElementById('profile-edit-form');
        form.onsubmit = (e) => {
            e.preventDefault();
            const uname = document.getElementById('prof-edit-username').value;
            const users = JSON.parse(localStorage.getItem('employee_users')) || {};

            users[uname] = {
                ...users[uname],
                fullName: document.getElementById('prof-edit-fullname').value,
                dob: document.getElementById('prof-edit-dob').value,
                position: document.getElementById('prof-edit-position').value,
                salary: document.getElementById('prof-edit-salary').value,
                photo: document.getElementById('prof-edit-photo-base64').value || users[uname].photo
            };

            localStorage.setItem('employee_users', JSON.stringify(users));

            // update current session if editing self
            if (state.user && state.user.name === uname) {
                state.user = {
                    ...state.user,
                    ...users[uname]
                };
                localStorage.setItem('currentUser', JSON.stringify(state.user));
            }

            app.closeModal();
            app.render();
            showToast('Profile updated successfully');
        };
    },

    closeModal: () => {
        document.getElementById('edit-modal').style.display = 'none';
        const profileModal = document.getElementById('profile-edit-modal');
        if (profileModal) profileModal.style.display = 'none';
    },

    setTab: (tab) => {
        state.activeTab = tab;
        app.render();
    },

    setAdminTab: (tab) => {
        state.adminTab = tab;
        app.render();
    },

    setEmployeeFilter: (val) => {
        state.adminEmployeeFilter = val;
        app.render();
    },

    setStatusFilter: (val) => {
        state.adminStatusFilter = val;
        app.render();
    },

    handleDateFilterChange: () => {
        state.adminDateFrom = document.getElementById('admin-date-from').value;
        state.adminDateTo = document.getElementById('admin-date-to').value;
        app.render();
    },

    getCheckOutDate: (record) => {
        if (!record.checkOut) return '<span class="placeholder-text">not given</span>';
        if (!record.nextDayCheckout) return record.date;

        const [d, m, y] = record.date.split('/').map(Number);
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + 1);
        return formatDate(date);
    },

    clearFilters: () => {
        state.adminSearch = '';
        state.adminEmployeeFilter = 'all';
        state.adminStatusFilter = 'all';
        state.adminDateFrom = '';
        state.adminDateTo = '';
        app.render();
        showToast('Filters cleared');
    },

    checkAndMarkAbsentees: () => {
        // Function disabled as per user request to only mark leave if employee explicitly marks it.
        /*
        const now = new Date();
        ...
        */
    },

    verifyIdentity: () => {
        const username = document.getElementById('reset-username').value;
        const dob = document.getElementById('reset-dob').value;
        const users = JSON.parse(localStorage.getItem('employee_users')) || {};

        if (!users[username]) {
            showToast('User not found. Please enter a valid username.', 'danger');
            return;
        }

        if (users[username].dob === dob) {
            state.resetVerifiedUser = username;
            state.resetStep = 2;
            app.render();
            showToast('Identity verified. Please set a new password.');
        } else {
            showToast('Date of Birth is incorrect. Verification failed.', 'danger');
        }
    },

    resetPassword: () => {
        const password = document.getElementById('new-password').value;
        const confirm = document.getElementById('confirm-password').value;

        if (password.length < 4) {
            showToast('Password must be at least 4 characters', 'danger');
            return;
        }

        if (password !== confirm) {
            showToast('Passwords do not match', 'danger');
            return;
        }

        const users = JSON.parse(localStorage.getItem('employee_users')) || {};
        if (state.resetVerifiedUser && users[state.resetVerifiedUser]) {
            users[state.resetVerifiedUser].password = password;
            localStorage.setItem('employee_users', JSON.stringify(users));
            showToast('Password updated successfully. Please login.');
            app.setView('login');
        } else {
            showToast('An error occurred. Please try again.', 'danger');
            app.setView('login');
        }
    }
};

// Initialize
window.onload = app.init;
