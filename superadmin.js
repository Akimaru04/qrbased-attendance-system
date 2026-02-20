let studentsPerAdminChart;

// Ensure only super admin can view this page
const currentUser = getCurrentUser();
if (!currentUser || currentUser.role !== 'super_admin') {
    alert('Access denied! Only Super Admins can view this page.');
    window.location.href = 'index.html';
}

const adminsTableBody = document.querySelector('#adminsTable tbody');
const createAdminForm = document.getElementById('createAdminForm');

// Load all admins
function loadAdmins() {
        const users = getUsers();
        const admins = users.filter(u => u.role === 'admin');

        adminsTableBody.innerHTML = '';

        admins.forEach(admin => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${admin.id}</td>
                <td>${admin.email}</td>
                <td>${admin.firstName} ${admin.lastName}</td>
                <td>${new Date(admin.createdAt).toLocaleString()}</td>
                <td>
                    <button onclick="deleteAdminAndReload('${admin.id}')">Delete</button>
                </td>
            `;
            adminsTableBody.appendChild(tr);
        });

        updateStats();
    }

// ----------------- Render Events Per Admin Bar Chart -----------------
let eventsPerAdminChart = null;

function renderEventsPerAdminChart() {

    const users = getUsers();
    const admins = users.filter(u => u.role === 'admin');
    const events = getEvents();

    const canvas = document.getElementById('eventsPerAdminChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // If no admins exist, destroy chart and exit
    if (!admins.length) {
        if (eventsPerAdminChart) {
            eventsPerAdminChart.destroy();
            eventsPerAdminChart = null;
        }
        return;
    }

    const labels = admins.map(a => `${a.firstName} ${a.lastName}`);

    const eventCounts = admins.map(admin =>
        events.filter(event => event.createdById === admin.id).length
    );

    // Destroy previous chart instance
    if (eventsPerAdminChart) {
        eventsPerAdminChart.destroy();
    }

    eventsPerAdminChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Events per Admin',
                data: eventCounts,
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

function updateStats() {
    const users = getUsers();
    const admins = users.filter(u => u.role === 'admin');
    const students = users.filter(u => u.role === 'student');
    const pending = students.filter(s => s.status === 'pending');
    const verified = students.filter(s => s.status === 'verified');

    document.getElementById('totalAdmins').textContent = admins.length;
    document.getElementById('totalStudents').textContent = students.length;
    document.getElementById('pendingStudents').textContent = pending.length;
    document.getElementById('verifiedStudents').textContent = verified.length;

    if (typeof renderStudentStatusChart === "function") {
        renderStudentStatusChart(pending.length, verified.length);
    }

    renderEventsPerAdminChart();
}

// Delete admin and reload table
window.deleteAdminAndReload = function (adminId) {
        deleteAdmin(adminId);
        loadAdmins();
    };

// Handle create admin form submission
createAdminForm?.addEventListener('submit', e => {
        e.preventDefault();

        const formData = new FormData(createAdminForm);
        const email = formData.get('email')?.trim();
        const password = formData.get('password');
        const firstName = formData.get('firstName')?.trim();
        const lastName = formData.get('lastName')?.trim();

        if (!email || !password || !firstName || !lastName) {
            alert('All fields are required.');
            return;
        }

        createAdmin({ email, password, firstName, lastName });
        createAdminForm.reset();
        loadAdmins();
    });

// Logout
const logoutBtn = document.getElementById('logoutBtn');
        logoutBtn?.addEventListener('click', () => {
            saveCurrentUser(null);
            window.location.replace('index.html');
        });

// Initial load
loadAdmins();