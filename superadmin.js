let studentsPerAdminChart;

// Ensure only super admin can view this page
const currentUser = getCurrentUser();
if (!currentUser || currentUser.role !== 'super_admin') {
    alert('Access denied! Only Super Admins can view this page.');
    window.location.href = 'login.html';
}

const adminsTableBody = document.querySelector('#adminsTable tbody');
const createAdminForm = document.getElementById('createAdminForm');

// Load all admins
function loadAdmins() {
    const users = getUsers();
    const admins = getUsers().filter(u => u.role === 'admin');
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
    updatestats();
}

// ----------------- Render Students Per Admin Bar Chart -----------------
function renderStudentsPerAdminChart() {
    const users = getUsers();
    const admins = users.filter(u => u.role === 'admin');
    const students = users.filter(u => u.role === 'student');

    // Count students per admin
    const adminLabels = admins.map(a => a.firstName + ' ' + a.lastName);
    const studentCounts = admins.map(admin => {
        return students.filter(s => s.assignedAdminId === admin.id).length;
    });

    const ctx = document.getElementById('studentsPerAdminChart').getContext('2d');
    if (studentsPerAdminChart) studentsPerAdminChart.destroy();

    studentsPerAdminChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: adminLabels,
            datasets: [{
                label: 'Number of Students',
                data: studentCounts,
                backgroundColor: '#007bff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Students Per Admin'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision:0
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

    renderStudentStatusChart(pending.length, verified.length);
    renderStudentsPerAdminChart(); // <-- NEW
}


// Delete admin and reload table
function deleteAdminAndReload(adminId) {
    deleteAdmin(adminId); // uses function from auth.js
    loadAdmins();
}

// Handle create admin form submission
createAdminForm.addEventListener('submit', e => {
    e.preventDefault();
    const formData = new FormData(createAdminForm);
    const email = formData.get('email')?.trim();
    const password = formData.get('password');
    const firstName = formData.get('firstName')?.trim();
    const lastName = formData.get('lastName')?.trim();

    if (!email || !password || !firstName || !lastName) {
        return alert('All fields are required.');
    }

    createAdmin({ email, password, firstName, lastName }); // from auth.js
    createAdminForm.reset();
    loadAdmins();
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    saveCurrentUser(null); // from auth.js
    window.location.href = 'login.html';
});

// Initial load
loadAdmins();
updatestats();