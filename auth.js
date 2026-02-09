// Initialize default admin
function initializeDefaultUsers() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const adminExists = users.some(u => u.email === 'hckthon2026@gmail.com');
    if (!adminExists) {
        const defaultAdmin = {
            id: 'admin_' + Date.now(),
            email: 'hckthon2026@gmail.com',
            password: 'hckthon2026',
            role: 'admin',
            firstName: 'Admin',
            lastName: 'User',
            createdAt: new Date().toISOString()
        };
        users.push(defaultAdmin);
        localStorage.setItem('users', JSON.stringify(users));
        console.log('Default admin created');
    }
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
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    if (currentUser.role === 'admin') window.location.href = 'admin.html';
    else if (currentUser.role === 'student') window.location.href = 'user.html';
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
        alert('Please fill in all fields');
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === email)) {
        alert('Email already registered');
        showLogin();
        return;
    }
    if (users.some(u => u.studentId === studentId)) {
        alert('Student ID already registered');
        return;
    }

    const newUser = {
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
    };

    users.push(newUser);
    saveUsers(users);
    alert('Registration successful! Pending admin verification.');
    e.target.reset();
    showLogin();
}

// Handle login
function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email')?.trim().toLowerCase();
    const password = formData.get('password');

    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email && u.password === password);

    if (!user) {
        alert('Invalid email or password');
        return;
    }

    saveCurrentUser(user);
    alert('Login successful! Redirecting...');
    setTimeout(() => {
        if (user.role === 'admin') window.location.href = 'admin.html';
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