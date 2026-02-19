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

// ----------------- Render events Per Admin Bar Chart -----------------
let eventsPerAdminChart;

function renderEventsPerAdminChart() {
    const users = getUsers(); // admin + students
    const admins = users.filter(u => u.role === 'admin');

    const events = getEvents(); // you must have a function that returns all events

    if (!admins.length) return;

    const adminLabels = admins.map(a => a.firstName + ' ' + a.lastName);
    const eventCounts = admins.map(admin =>
        events.filter(e => e.adminId === admin.id).length
    );

    console.log("Admins:", adminLabels);
    console.log("Event counts:", eventCounts);

    const canvas = document.getElementById('eventsPerAdminChart'); // update your HTML id
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    if (eventsPerAdminChart) eventsPerAdminChart.destroy();

    eventsPerAdminChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: adminLabels,
            datasets: [{
                label: 'Number of Events',
                data: eventCounts,
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Events Per Admin' }
            },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } },
                x: { ticks: { autoSkip: false } }
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

    renderEventsPerAdminChart(); // updated
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
logoutBtn?.addEventListener('click', () => {
        saveCurrentUser(null);
        window.location.replace('index.html');
    });

// Initial load
loadAdmins();