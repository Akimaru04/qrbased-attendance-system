let currentAdmin = null;
let users = [];
let events = [];
let attendance = [];
let currentFilter = 'all';
let currentEventFilter = 'all';
let selectedEvent = null;
let isInitialized = false;
let attendanceChartInstance = null;
let verificationChartInstance = null;

// QR Scanner variables
let scanActive = false;
let animationFrameId = null;
let videoStream = null;

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) return;
    isInitialized = true;
    initializeAdminDashboard();
});

function initializeAdminDashboard() {
    const userStr = localStorage.getItem('currentUser');
    const form = document.getElementById('createEventForm');
    if (form) form.addEventListener('submit', createEvent);

    
    if (!userStr) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        
        if (!user || user.role !== 'admin') {
            window.location.href = 'index.html';
            return;
        }
        
        currentAdmin = user;
        document.getElementById('adminName').textContent = `${user.firstName} ${user.lastName}`;
        
        loadAllData();
        updateDashboardStats();
        initializeCharts();
        loadSection('dashboard');
    } catch (e) {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}

function loadAllData() {
    try {
        users = JSON.parse(localStorage.getItem('users') || '[]');
        events = JSON.parse(localStorage.getItem('events') || '[]');
        attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    } catch (e) {
        users = [];
        events = [];
        attendance = [];
    }
}

function loadSection(section) {
    // Stop scanner when leaving attendance section
    if (section !== 'attendance' && scanActive) {
        stopScanner();
    }
    
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const sectionElement = document.getElementById(`${section}-section`);
    if (sectionElement) sectionElement.classList.add('active');

    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`a[href="#${section}"]`);
    if (activeLink) activeLink.classList.add('active');

    switch(section) {
        case 'dashboard':
            setTimeout(() => {
                initializeAttendanceChart();
                initializeVerificationChart();
            }, 100);
            break;
        case 'users':
            loadUsersTable();
            break;
        case 'events':
            loadEventsTable();
            break;
        case 'attendance':
            loadScanAttendance();
            break;
    }
}

function updateDashboardStats() {
    const students = users.filter(u => u.role === 'student');
    const pending = students.filter(u => u.status === 'pending');
    const verified = students.filter(u => u.status === 'verified');
    
    document.getElementById('totalStudents').textContent = students.length;
    document.getElementById('pendingStudents').textContent = pending.length;
    document.getElementById('verifiedStudents').textContent = verified.length;
    document.getElementById('totalEvents').textContent = events.length;
    document.getElementById('totalAttendance').textContent = attendance.length;
}

function initializeCharts() {
    initializeAttendanceChart();
    initializeVerificationChart();
}

function initializeAttendanceChart() {
    const canvas = document.getElementById('attendanceChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (attendanceChartInstance) {
        attendanceChartInstance.destroy();
    }

    const events = JSON.parse(localStorage.getItem('events')) || [];
    const attendanceLogs = JSON.parse(localStorage.getItem('attendance')) || [];

    const labels = events.map(e => e.name);
    const counts = events.map(e =>
        attendanceLogs.filter(a => a.eventId === e.id).length
    );

    if (labels.length === 0) {
        labels.push("No Events");
        counts.push(0);
    }

    attendanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Attendance Per Event',
                data: counts,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });
}

function updateAttendanceChart() {
    if (document.getElementById('dashboard-section')?.classList.contains('active')) {
        setTimeout(() => initializeAttendanceChart(), 50);
    }
}

function initializeVerificationChart() {
    const canvas = document.getElementById('verificationChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const students = users.filter(u => u.role === 'student');
    const pending = students.filter(u => u.status === 'pending').length;
    const verified = students.filter(u => u.status === 'verified').length;

    if (verificationChartInstance) {
        // Update existing chart
        verificationChartInstance.data.datasets[0].data = [verified, pending];
        verificationChartInstance.update();
    } else {
        // Create new chart
        verificationChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Verified', 'Pending'],
                datasets: [{
                    data: [verified, pending],
                    backgroundColor: ['#28a745', '#ffc107']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}

function loadUsersTable() {
    let filteredUsers = [];

    switch (currentFilter) {
        case 'pending':
            filteredUsers = users.filter(u => u.role === 'student' && u.status === 'pending');
            break;
        case 'verified':
            filteredUsers = users.filter(u => u.role === 'student' && u.status === 'verified');
            break;
        case 'admin':
            filteredUsers = users.filter(u => u.role === 'admin');
            break;
        default:
            filteredUsers = users;
    }

    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    const pendingCount = users.filter(u => u.role === 'student' && u.status === 'pending').length;
    const pendingEl = document.getElementById('pendingCount');
    if (pendingEl) pendingEl.textContent = pendingCount;

    if (filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = filteredUsers.map(user => `
        <tr class="stable-row">
            <td>
                <img src="${user.profilePhoto ? user.profilePhoto : 'assets/images/default-avatar.png'}"
            alt="Profile" class="table-avatar"
            loading="lazy" decoding="async">
            </td>
            <td>${user.studentId || '<span class="placeholder">—</span>'}</td>
            <td>${user.firstName} ${user.lastName}</td>
            <td>${user.email}</td>
            <td><span class="role-badge ${user.role}">${user.role}</span></td>
            <td>
                ${user.role === 'student'
                    ? `<span class="status-badge ${user.status}">${user.status}</span>`
                    : '<span class="placeholder">—</span>'}
            </td>
            <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '<span class="placeholder">—</span>'}</td>
            <td class="action-cell">
    ${user.role === 'student' && user.status === 'pending'
        ? `<button class="btn-primary btn-sm" onclick="openVerifyModal('${user.id}')">
            <i class="fas fa-check"></i> Verify
           </button>`
        : user.role === 'student' && user.status === 'verified'
        ? `<button class="btn-secondary btn-sm" onclick="viewUser('${user.id}')">
            <i class="fas fa-eye"></i> View
           </button>`
        : ''}
    ${user.role === 'student' ? `<button class="btn-danger btn-sm" onclick="deleteStudent('${user.id}')">
        <i class="fas fa-trash"></i> Delete
    </button>` : ''}
</td>
        </tr>
    `).join('');
}

function deleteStudent(userId) {
    if (!confirm('Are you sure you want to delete this student profile?')) return;

    users = users.filter(u => u.id !== userId);
    attendance = attendance.filter(a => a.studentId !== userId);

    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('attendance', JSON.stringify(attendance));

    loadUsersTable();
    updateDashboardStats();
    updateAttendanceChart();

    showNotification('Student profile deleted successfully', 'success');
    if (selectedEvent) updateAttendanceList();
}

function filterUsers(filter) {
    currentFilter = filter;
    loadUsersTable();
    setTimeout(() => {
        updateUserTabButtons(filter);
    }, 0);
}

function updateUserTabButtons(activeFilter) {
    const buttons = document.querySelectorAll('#users-section .tab-btn');
    buttons.forEach(btn => {
        const onclick = btn.getAttribute('onclick');
        btn.classList.remove('active');
        if (onclick && onclick.includes(`'${activeFilter}'`)) {
            btn.classList.add('active');
        }
    });
}

function searchUsers() {
    const query = document.getElementById('userSearch').value.toLowerCase();
    
    if (!query) {
        loadUsersTable();
        return;
    }
    
    const filteredUsers = users.filter(u => 
        u.firstName.toLowerCase().includes(query) ||
        u.lastName.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.studentId && u.studentId.toLowerCase().includes(query))
    );
    
    const tbody = document.getElementById('usersTableBody');
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredUsers.map(user => `
        <tr>
            <td>
                <img src="${user.profilePhoto || 'assets/images/default-avatar.png'}" 
                     alt="Profile" class="table-avatar" loading="lazy" decoding="async">
            </td>
            <td>${user.studentId || '-'}</td>
            <td>${user.firstName} ${user.lastName}</td>
            <td>${user.email}</td>
            <td><span class="role-badge ${user.role}">${user.role}</span></td>
            <td>
                ${user.role === 'student' ? 
                    `<span class="status-badge ${user.status}">${user.status}</span>` : 
                    '-'}
            </td>
            <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</td>
            <td>
                ${user.role === 'student' && user.status === 'pending' ? 
                    `<button class="btn-primary btn-sm" onclick="openVerifyModal('${user.id}')">
                        <i class="fas fa-check"></i> Verify
                    </button>` : 
                    user.role === 'student' && user.status === 'verified' ?
                    `<button class="btn-secondary btn-sm" onclick="viewUser('${user.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>` :
                    '-'}
            </td>
        </tr>
    `).join('');
}

function clearUserSearch() {
    document.getElementById('userSearch').value = '';
    loadUsersTable();
}

function openVerifyModal(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const modalContent = document.getElementById('verifyStudentContent');
    modalContent.innerHTML = `
        <div class="verify-student-info">
            <img src="${user.profilePhoto || 'assets/images/default-avatar.png'}" alt="Profile" class="table-avatar">
            <h3>${user.firstName} ${user.lastName}</h3>
            <p><strong>Student ID:</strong> ${user.studentId}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Registered:</strong> ${new Date(user.createdAt).toLocaleString()}</p>
        </div>
        <div class="verify-actions">
            <button class="btn-primary">
                <i class="fas fa-check"></i> Verify & Generate QR Code
            </button>
            <button class="btn-secondary">
                Cancel
            </button>
        </div>
    `;

    const verifyBtn = modalContent.querySelector('.btn-primary');
    const cancelBtn = modalContent.querySelector('.btn-secondary');

    verifyBtn.addEventListener('click', () => verifyStudent(user.id));
    cancelBtn.addEventListener('click', () => closeModal('verifyStudentModal'));

    openModal('verifyStudentModal');
}

function verifyStudent(userId){
    const user = users.find(u => u.id === userId);
    if (!user) return;

    user.status = 'verified';
    user.assignedAdminId = currentAdmin.id;

    localStorage.setItem('users', JSON.stringify(users));

    const qrContainer = document.createElement('div');
    qrContainer.style.width = '256px';
    qrContainer.style.height = '256px';
    qrContainer.style.position = 'absolute';
    qrContainer.style.left = '-9999px';
    document.body.appendChild(qrContainer);

    const qr = new QRCode(qrContainer, {
        text: user.id,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    // Wait until QR image is rendered
    const checkQR = setInterval(() => {
        const qrImg = qrContainer.querySelector('img');
        if (qrImg && qrImg.src) {
            clearInterval(checkQR);
            user.qrCode = qrImg.src;
            user.status = 'verified';
            localStorage.setItem('users', JSON.stringify(users));
            document.body.removeChild(qrContainer);
            loadUsersTable();
            updateDashboardStats();
            initializeVerificationChart(); // ✅ refresh the pie chart
            showNotification('Student verified and QR generated!', 'success');
        }
    }, 100);
}


function viewUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    alert(`Student: ${user.firstName} ${user.lastName}\nStudent ID: ${user.studentId}\nEmail: ${user.email}\nStatus: ${user.status}`);
}

function loadEventsTable() {
    const tbody = document.getElementById('eventsTableBody');
    
    let filtered = events;
    if (currentEventFilter !== 'all') {
        filtered = events.filter(e => e.status === currentEventFilter);
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No events found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(event => {
        const attendeeCount = attendance.filter(a => a.eventId === event.id).length;
        return `
            <tr>
                <td><strong>${event.name}</strong></td>
                <td>${event.description}</td>
                <td>${new Date(event.date).toLocaleDateString()}</td>
                <td>${event.startTime} - ${event.endTime}</td>
                <td><span class="status-badge ${event.status}">${event.status}</span></td>
                <td>${attendeeCount}</td>
                <td>
                    <button class="btn-secondary btn-sm" onclick="toggleEventStatus('${event.id}')">
                        <i class="fas fa-toggle-on"></i> ${event.status === 'active' ? 'Complete' : 'Activate'}
                    </button>
                    <button class="btn-danger btn-sm" onclick="deleteEvent('${event.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterEvents(status) {
    currentEventFilter = status;
    loadEventsTable();
    setTimeout(() => {
        updateEventTabButtons(status);
    }, 0);
}

function updateEventTabButtons(activeStatus) {
    const buttons = document.querySelectorAll('#events-section .tab-btn');
    buttons.forEach(btn => {
        const onclick = btn.getAttribute('onclick');
        btn.classList.remove('active');
        if (onclick && onclick.includes(`'${activeStatus}'`)) {
            btn.classList.add('active');
        }
    });
}

function createEvent(e) {
    e.preventDefault();

    const newEvent = {
    id: 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    name: document.getElementById('eventName').value,
    description: document.getElementById('eventDescription').value,
    date: document.getElementById('eventDate').value,
    startTime: document.getElementById('eventStartTime').value,
    endTime: document.getElementById('eventEndTime').value,
    status: 'active',
    createdAt: new Date().toISOString(),
    createdById: currentAdmin.id   // ✅ ADD THIS
};

    events.push(newEvent);
    localStorage.setItem('events', JSON.stringify(events));

    loadAllData();
    loadEventsTable();
    loadScanAttendance();
    updateDashboardStats();
    updateAttendanceChart();

    closeModal('createEventModal');
    e.target.reset();

    loadSection('events');

    showNotification('Event created successfully!', 'success');
}

function toggleEventStatus(eventId) {
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex !== -1) {
        events[eventIndex].status = events[eventIndex].status === 'active' ? 'completed' : 'active';
        localStorage.setItem('events', JSON.stringify(events));
        loadEventsTable();
        showNotification('Event status updated', 'success');
    }
}

function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    events = events.filter(e => e.id !== eventId);
    localStorage.setItem('events', JSON.stringify(events));
    loadEventsTable();
    updateDashboardStats();
    showNotification('Event deleted', 'success');
}

function loadScanAttendance() {
    const select = document.getElementById('eventSelect');
    const activeEvents = events.filter(e => e.status === 'active');
    
    select.innerHTML = '<option value="">-- Select an Event --</option>' +
        activeEvents.map(e => `<option value="${e.id}">${e.name} - ${new Date(e.date).toLocaleDateString()}</option>`).join('');
    
    // Reset scanner area when loading
    document.getElementById('scannerArea').style.display = 'none';
    document.getElementById('eventAttendance').style.display = 'none';
    document.getElementById('scanStats').style.display = 'none';
}

// Called when event is selected - Scanner opens automatically after selection
function selectEvent() {
    const eventId = document.getElementById('eventSelect').value;
    
    if (!eventId) {
        document.getElementById('scannerArea').style.display = 'none';
        document.getElementById('eventAttendance').style.display = 'none';
        document.getElementById('scanStats').style.display = 'none';
        stopScanner();
        selectedEvent = null;
        return;
    }
    
    selectedEvent = events.find(e => e.id === eventId);
    document.getElementById('scanStats').style.display = 'flex';
    document.getElementById('scannerArea').style.display = 'block';
    document.getElementById('eventAttendance').style.display = 'block';
    
    updateAttendanceList();

    // Automatically start scanner after event selection
    setTimeout(() => startScanner(), 100);
}

// START QR SCANNER using jsQR - Works with both PHYSICAL and DIGITAL (phone screen) QR codes
function startScanner() {
    if (!selectedEvent) {
        showNotification('Please select an event first', 'error');
        return;
    }

    const video = document.getElementById('qrVideo');
    const canvas = document.getElementById('qrCanvas');
    
    if (!video || !canvas) {
        console.error('❌ Video or canvas element not found');
        showNotification('Scanner elements not found. Check HTML structure.', 'error');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Canvas is hidden - only for processing
    canvas.style.display = 'none';
    
    document.getElementById('scannerArea').style.display = 'block';
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification('Camera not supported on this device', 'error');
        return;
    }

    scanActive = true;
    showScanResult(`📱 <strong>Scanner Starting...</strong><br>
        <small>💡 Tips for phone screens:<br>
        - Set screen brightness to 70-80%<br>
        - Hold phone steady (3-5 inches from camera)<br>
        - Tilt phone slightly if there's glare<br>
        - Make sure QR code fills the scan frame<br>
        - Try medium lighting (not too bright/dark)</small>`, 'info');

    console.log('📷 Requesting camera access...');

    // Enhanced camera settings for better QR detection on phone screens
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment',
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
            aspectRatio: 16/9
        } 
    })
    .then(stream => {
        console.log('✅ Camera access granted');
        videoStream = stream;
        video.srcObject = stream;
        video.setAttribute('playsinline', true); // iOS compatibility
        
        // Make video visible with proper styling
        video.style.display = 'block';
        video.style.maxWidth = '100%';
        video.style.width = '100%';
        video.style.borderRadius = '10px';
        
        video.play();
        
        console.log('✅ Video playing, starting scan loop...');
        showScanResult('✅ Camera active! Point at QR code...', 'success');
        
        // Start scanning loop
        requestAnimationFrame(function tick() {
            scanFrame(video, canvas, ctx, tick);
        });
    })
    .catch(err => {
        console.error('❌ Camera error:', err);
        showNotification('Unable to access camera. Please check permissions.', 'error');
        scanActive = false;
    });
}

// Scan each frame for QR code - Optimized for both physical cards and phone screens
function scanFrame(video, canvas, ctx, tick) {
    if (!scanActive) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Draw scanning line animation
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const scanLineY = (Date.now() % 2000) / 2000 * canvas.height;
        ctx.moveTo(0, scanLineY);
        ctx.lineTo(canvas.width, scanLineY);
        ctx.stroke();
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Log that we're actively scanning (reduced frequency)
        if (Math.random() < 0.005) { // Log every ~200 frames
            console.log('🔍 Scanning... Video resolution:', canvas.width, 'x', canvas.height);
        }
        
        // Try normal detection first
        let code = jsQR(imageData.data, canvas.width, canvas.height, {
            inversionAttempts: "attemptBoth",
        });

        // If not found, try with enhanced contrast for phone screens
        if (!code) {
            const enhancedData = enhanceContrast(imageData);
            code = jsQR(enhancedData.data, canvas.width, canvas.height, {
                inversionAttempts: "attemptBoth",
            });
        }

        // If still not found, try with brightness adjustment
        if (!code) {
            const brightenedData = adjustBrightness(imageData, 1.5);
            code = jsQR(brightenedData.data, canvas.width, canvas.height, {
                inversionAttempts: "attemptBoth",
            });
        }

        // Try darkened version for overexposed screens
        if (!code) {
            const darkenedData = adjustBrightness(imageData, 0.5);
            code = jsQR(darkenedData.data, canvas.width, canvas.height, {
                inversionAttempts: "attemptBoth",
            });
        }
        
        // Try grayscale conversion
        if (!code) {
            const grayscaleData = convertToGrayscale(imageData);
            code = jsQR(grayscaleData.data, canvas.width, canvas.height, {
                inversionAttempts: "attemptBoth",
            });
        }

        if (code && code.data) {
            console.log('✅ QR Code detected:', code.data);
            
            // Visual feedback - draw green box
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 6;
            ctx.strokeRect(
                code.location.topLeftCorner.x - 10,
                code.location.topLeftCorner.y - 10,
                code.location.bottomRightCorner.x - code.location.topLeftCorner.x + 20,
                code.location.bottomRightCorner.y - code.location.topLeftCorner.y + 20
            );
            
            // Audio feedback
            playBeep();
            
            // Process the scanned QR code
            processQRScan(code.data);
            
            // Brief pause after successful scan to prevent duplicate scans
            scanActive = false;
            setTimeout(() => {
                if (selectedEvent) { // Only resume if event still selected
                    scanActive = true;
                    showScanResult('📱 Ready for next scan...', 'info');
                }
            }, 2000); // 2 second cooldown
        }
    }
    
    if (scanActive) {
        animationFrameId = requestAnimationFrame(tick);
    }
}

// Convert to grayscale for better detection
function convertToGrayscale(imageData) {
    const data = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
    }
    
    return new ImageData(data, imageData.width, imageData.height);
}

// Enhance contrast for better QR detection on phone screens
function enhanceContrast(imageData) {
    const data = new Uint8ClampedArray(imageData.data);
    const factor = 2.5; // Increased contrast factor
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, ((data[i] - 128) * factor) + 128));     // Red
        data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - 128) * factor) + 128)); // Green
        data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - 128) * factor) + 128)); // Blue
    }
    
    return new ImageData(data, imageData.width, imageData.height);
}

// Adjust brightness for overexposed or underexposed screens
function adjustBrightness(imageData, factor) {
    const data = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * factor);         // Red
        data[i + 1] = Math.min(255, data[i + 1] * factor); // Green
        data[i + 2] = Math.min(255, data[i + 2] * factor); // Blue
    }
    
    return new ImageData(data, imageData.width, imageData.height);
}

// Play audio beep on successful scan
function playBeep() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// Draw a box around detected QR code for visual feedback
function drawDetectionBox(ctx, location) {
    ctx.beginPath();
    ctx.moveTo(location.topLeftCorner.x, location.topLeftCorner.y);
    ctx.lineTo(location.topRightCorner.x, location.topRightCorner.y);
    ctx.lineTo(location.bottomRightCorner.x, location.bottomRightCorner.y);
    ctx.lineTo(location.bottomLeftCorner.x, location.bottomLeftCorner.y);
    ctx.closePath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#00FF00';
    ctx.stroke();
}

// STOP QR SCANNER
function stopScanner() {
    scanActive = false;
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    const video = document.getElementById('qrVideo');
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    if (video) {
        video.srcObject = null;
    }
    
    showScanResult('📷 Scanner stopped.', 'info');
}

// Process scanned QR code
function processQRScan(qrData) {
    const params = new URLSearchParams(qrData);
    const studentId = params.get('student_id');
    qrData = qrData.trim();
    console.log("📱 Scanned QR Data:", qrData);

    loadAllData();
    
    // Debug: Show all user IDs
    console.log("Total users in database:", users.length);
    console.log("User IDs in database:", users.map(u => u.id));
    
    const student = users.find(u => u.id === studentId);

    if (!student) {
        console.error("❌ No student found with ID:", qrData);
        showScanResult('❌ QR does not match any student', 'error');
        return;
    }
    
    console.log("✅ Student found:", student.firstName, student.lastName, "Status:", student.status);
    
    if (student.status !== 'verified') {
        console.error("⚠️ Student not verified:", student.status);
        showScanResult('⚠️ Student not verified', 'error');
        return;
    }

    if (!selectedEvent) {
        console.error("❌ No event selected!");
        showScanResult('❌ No event selected', 'error');
        return;
    }

    console.log("Event selected:", selectedEvent.name, "ID:", selectedEvent.id);

    const existingAttendance = attendance.find(a =>
        a.eventId === selectedEvent.id && a.studentId === student.id
    );
    
    if (existingAttendance) {
        console.warn("⚠️ Duplicate scan - Student already marked present");
        showScanResult('⚠️ Student already scanned for this event', 'warning');
        return;
    }

    const newAttendance = {
        id: 'attendance_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        eventId: selectedEvent.id,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        studentPhoto: student.profilePhoto,
        timestamp: new Date().toISOString()
    };

    console.log("💾 Saving attendance record:", newAttendance);
    
    attendance.push(newAttendance);
    localStorage.setItem('attendance', JSON.stringify(attendance));
    
    // Verify save
    const savedAttendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    console.log("✅ Attendance saved! Total records now:", savedAttendance.length);

    updateAttendanceList();
    updateDashboardStats();
    updateAttendanceChart();
    showScanResult(`✅ ${student.firstName} ${student.lastName} - Attendance recorded!`, 'success');
}

// Show scanned message
function showScanResult(message, type) {
    const resultDiv = document.getElementById('scanResult');
    const timestamp = new Date().toLocaleTimeString();
    
    // Create styled message with timestamp
    const messageHTML = `
        <div class="scan-message ${type}" style="padding: 15px; margin: 10px 0; border-radius: 8px; 
             background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : type === 'warning' ? '#fff3cd' : '#d1ecf1'};
             color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : type === 'warning' ? '#856404' : '#0c5460'};
             border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : type === 'warning' ? '#ffeaa7' : '#bee5eb'};
             font-weight: bold; font-size: 16px;">
            <div style="font-size: 12px; opacity: 0.8; margin-bottom: 5px;">${timestamp}</div>
            ${message}
        </div>
    `;
    
    resultDiv.innerHTML = messageHTML;
    
    // Also log to console for debugging
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
}

function updateAttendanceList() {
    const eventAttendance = attendance.filter(a => a.eventId === selectedEvent.id);
    document.getElementById('totalScanned').textContent = eventAttendance.length;
    
    const tbody = document.getElementById('eventAttendanceBody');
    
    if (eventAttendance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No attendance recorded yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = eventAttendance.map(a => {
        const student = users.find(u => u.id === a.studentId);
        return `
            <tr>
                <td>
                    <img src="${student ? student.profilePhoto : 'assets/images/default-avatar.png'}"
            alt="Profile" class="table-avatar" loading="lazy" decoding="async">
                </td>
                <td>${student ? student.studentId : a.studentId}</td>
                <td>${a.studentName}</td>
                <td>${new Date(a.timestamp).toLocaleString()}</td>
                <td>
                    <button class="btn-danger btn-sm" onclick="removeAttendance('${a.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function removeAttendance(attendanceId) {
    if (!confirm('Remove this attendance record?')) return;
    
    attendance = attendance.filter(a => a.id !== attendanceId);
    localStorage.setItem('attendance', JSON.stringify(attendance));
    
    updateAttendanceList();
    updateDashboardStats();
    showNotification('Attendance record removed', 'success');
}

// MANUAL ENTRY - Opens Modal
function manualEntry() {
    if (!selectedEvent) {
        showNotification('Please select an event first', 'error');
        return;
    }
    
    const input = document.getElementById('manualStudentId');
    if (input) input.value = '';
    
    openModal('manualEntryModal');
}

// SUBMIT MANUAL ENTRY - From Modal Form
function submitManualEntry(e) {
    e.preventDefault();
    
    if (!selectedEvent) {
        showNotification('Please select an event first', 'error');
        closeModal('manualEntryModal');
        return;
    }
    
    const studentIdInput = document.getElementById('manualStudentId');
    const studentId = studentIdInput.value.trim();
    
    if (!studentId) {
        showNotification('Please enter a student ID', 'error');
        return;
    }
    
    loadAllData();
    
    const student = users.find(u => u.studentId === studentId && u.role === 'student');
    
    if (!student) {
        showNotification('Student ID not found', 'error');
        return;
    }
    
    if (student.status !== 'verified') {
        showNotification('Student is not verified', 'error');
        return;
    }
    
    const existingAttendance = attendance.find(a => 
        a.eventId === selectedEvent.id && a.studentId === student.id
    );
    
    if (existingAttendance) {
        showNotification('Student already marked for this event', 'warning');
        return;
    }
    
    const newAttendance = {
        id: 'attendance_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        eventId: selectedEvent.id,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        studentPhoto: student.profilePhoto,
        timestamp: new Date().toISOString()
    };
    
    attendance.push(newAttendance);
    localStorage.setItem('attendance', JSON.stringify(attendance));
    
    updateAttendanceList();
    updateDashboardStats();
    updateAttendanceChart();
    
    showNotification(`✓ ${student.firstName} ${student.lastName} - Attendance recorded`, 'success');
    
    closeModal('manualEntryModal');
}

function generateReport() {
    const reportType = document.getElementById('reportType').value;
    
    loadAllData();
    
    let reportData = [];
    let headers = [];
    
    if (reportType === 'event') {
        headers = ['Event Name', 'Date', 'Total Students', 'Attended', 'Attendance Rate'];
        reportData = events.map(event => {
            const eventAttendance = attendance.filter(a => a.eventId === event.id);
            const totalStudents = users.filter(u => u.role === 'student' && u.status === 'verified').length;
            const attendanceRate = totalStudents > 0 ? Math.round((eventAttendance.length / totalStudents) * 100) : 0;
            
            return [
                event.name,
                new Date(event.date).toLocaleDateString(),
                totalStudents,
                eventAttendance.length,
                attendanceRate + '%'
            ];
        });
    } else if (reportType === 'student') {
        headers = ['Student ID', 'Name', 'Total Events', 'Attended', 'Attendance Rate'];
        const students = users.filter(u => u.role === 'student' && u.status === 'verified');
        reportData = students.map(student => {
            const studentAttendance = attendance.filter(a => a.studentId === student.id);
            const totalEvents = events.length;
            const attendanceRate = totalEvents > 0 ? Math.round((studentAttendance.length / totalEvents) * 100) : 0;
            
            return [
                student.studentId,
                `${student.firstName} ${student.lastName}`,
                totalEvents,
                studentAttendance.length,
                attendanceRate + '%'
            ];
        });
    } else if (reportType === 'summary') {
        headers = ['Metric', 'Value'];
        const totalStudents = users.filter(u => u.role === 'student' && u.status === 'verified').length;
        const totalEvents = events.length;
        const totalAttendance = attendance.length;
        const avgAttendancePerEvent = totalEvents > 0 ? Math.round(totalAttendance / totalEvents) : 0;
        
        reportData = [
            ['Total Students', totalStudents],
            ['Total Events', totalEvents],
            ['Total Attendance Records', totalAttendance],
            ['Average Attendance per Event', avgAttendancePerEvent]
        ];
    }
    
    displayReport(headers, reportData);
}

function displayReport(headers, data) {
    const thead = document.getElementById('reportTableHead');
    const tbody = document.getElementById('reportTableBody');
    
    thead.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="' + headers.length + '" class="no-data">No data available for this report</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(row => 
        '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>'
    ).join('');
}

function exportReport() {
    const table = document.querySelector('#reportDisplay table');
    if (!table) {
        showNotification('No report to export', 'error');
        return;
    }
    
    const rows = table.querySelectorAll('tr');
    
    let csv = [];
    rows.forEach(row => {
        const cols = row.querySelectorAll('th, td');
        const csvRow = [];
        cols.forEach(col => csvRow.push(col.textContent));
        csv.push(csvRow.join(','));
    });
    
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance_report_' + Date.now() + '.csv';
    a.click();
    
    showNotification('Report exported successfully', 'success');
}

function importReport(event) {
    const file = event.target.files[0];
    if (!file) {
        showNotification('No file selected', 'error');
        return;
    }

    if (!file.name.endsWith('.csv')) {
        showNotification('Please upload a CSV file', 'error');
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        const text = e.target.result.trim();
        const rows = text.split('\n').map(row => row.split(','));

        const container = document.getElementById('reportDisplay');
        container.innerHTML = '';

        const table = document.createElement('table');
        table.className = 'report-table';

        rows.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');

            row.forEach(cell => {
                const cellEl = document.createElement(rowIndex === 0 ? 'th' : 'td');
                cellEl.textContent = cell.trim();
                tr.appendChild(cellEl);
            });

            table.appendChild(tr);
        });

        container.appendChild(table);

        showNotification('Report imported successfully', 'success');
    };

    reader.onerror = function() {
        showNotification('Error reading file', 'error');
    };

    reader.readAsText(file);
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
    const form = modal ? modal.querySelector('form') : null;
    if (form) form.reset();
}

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

function showNotification(message, type = 'info') {
    alert(message);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        stopScanner();
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}

const toggleBtn = document.querySelector('.toggle-sidebar');
if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('active');
    });
}