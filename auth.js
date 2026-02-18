function getUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]');
}

function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser') || 'null');
}

function saveCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}

// Initialize default admin
function initializeDefaultUsers() {
    const users = getUsers();

    if (!users.some(u => u.email === 'superadmin@gmail.com')) {
        users.push({
            id: 'superadmin_' + Date.now(),
            email: 'superadmin@gmail.com',
            password: 'superadmin123',
            role: 'super_admin',
            firstName: 'Super',
            lastName: 'Admin',
            createdAt: new Date().toISOString()
        });
        console.log('Default super admin created');
    }

    if (!users.some(u => u.email === 'hckthon2026@gmail.com')) {
        users.push({
            id: 'admin_' + Date.now(),
            email: 'hckthon2026@gmail.com',
            password: 'hckthon2026',
            role: 'admin',
            firstName: 'Admin',
            lastName: 'User',
            createdAt: new Date().toISOString()
        });
        console.log('Default admin created');
    }

    saveUsers(users);
}


// Get all users
function getUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]');
}

// Save all users
function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

// Get current logged-in user
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser') || 'null');
}

// Save current logged-in user
function saveCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}

// Redirect if already logged in
function checkExistingSession() {
    const user = getCurrentUser();
    if (!user) return;

    const currentPage = window.location.pathname;

    if (user.role === 'super_admin' && !currentPage.includes('superadmin.html')) {
        window.location.href = 'superadmin.html';
    } 
    else if (user.role === 'admin' && !currentPage.includes('admin.html')) {
        window.location.href = 'admin.html';
    } 
    else if (user.role === 'student' && !currentPage.includes('user.html')) {
        window.location.href = 'user.html';
    }
}

function createAdmin(userData) {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
        return alert('Only Super Admins can create Admins!');
    }

    const users = getUsers();
    users.push({
        id: 'admin_' + Date.now(),
        email: userData.email,
        password: userData.password,
        role: 'admin',
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: new Date().toISOString()
    });

    saveUsers(users);
    alert('Admin created successfully!');
}

function deleteAdmin(adminId) {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
        return alert('Only Super Admins can delete Admins!');
    }

    let users = getUsers();
    users = users.filter(u => u.id !== adminId || u.role !== 'admin');
    saveUsers(users);
    alert('Admin deleted successfully!');
}


// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
}

// Show signup/login forms with explicit display control
function showSignup() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm) {
        loginForm.classList.remove('active');
        loginForm.style.display = 'none';
    }
    if (signupForm) {
        signupForm.classList.add('active');
        signupForm.style.display = 'block';
    }
}

function showLogin() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (signupForm) {
        signupForm.classList.remove('active');
        signupForm.style.display = 'none';
    }
    if (loginForm) {
        loginForm.classList.add('active');
        loginForm.style.display = 'block';
    }
}

// Handle signup
function handleSignup(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const studentId = formData.get('student_id')?.trim();
    const firstName = formData.get('first_name')?.trim();
    const lastName = formData.get('last_name')?.trim();
    const email = formData.get('email')?.trim().toLowerCase();
    const password = formData.get('password');
    const confirmPassword = formData.get('confirm_password');

    if (!studentId || !firstName || !lastName || !email || !password) {
        return alert('Please fill in all fields');
    }
    if (password !== confirmPassword) return alert('Passwords do not match');

    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === email)) {
        alert('Email already registered'); return;
    }
    if (users.some(u => u.studentId === studentId)) {
        alert('Student ID already registered'); return;
    }

    users.push({
        id: 'student_' + Date.now(),
        studentId,
        firstName,
        lastName,
        email,
        password,
        role: 'student',
        status: 'pending',
        qrCode: null,
        profilePhoto: null,
        createdAt: new Date().toISOString()
    });

    saveUsers(users);
    alert('Registration successful! Pending admin verification.');
    e.target.reset();
}

// Handle login
function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email')?.trim().toLowerCase();
    const password = formData.get('password');

    const user = getUsers().find(u => u.email.toLowerCase() === email && u.password === password);
    if (!user) return alert('Invalid email or password');

    saveCurrentUser(user);
    alert('Login successful! Redirecting...');
    setTimeout(() => {
        if (user.role === 'super_admin') window.location.href = 'superadmin.html';
        else if (user.role === 'admin') window.location.href = 'admin.html';
        else window.location.href = 'user.html';
    }, 300);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    initializeDefaultUsers();
    checkExistingSession();

    // Ensure login form is visible by default
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm) {
        loginForm.style.display = 'block';
        loginForm.classList.add('active');
    }
    if (signupForm) {
        signupForm.style.display = 'none';
        signupForm.classList.remove('active');
    }

    // Attach event listeners
    document.getElementById('loginFormElement')?.addEventListener('submit', handleLogin);
    document.getElementById('signupFormElement')?.addEventListener('submit', handleSignup);
    document.getElementById('showSignupLink')?.addEventListener('click', e => { 
        e.preventDefault(); 
        showSignup(); 
    });
    document.getElementById('showLoginLink')?.addEventListener('click', e => { 
        e.preventDefault(); 
        showLogin(); 
    });

    window.togglePassword = togglePassword;
});