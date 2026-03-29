// auth.js - минималистичная версия
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, GoogleAuthProvider, signInWithPopup,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

// Firebase конфиг
const firebaseConfig = {
  apiKey: "AIzaSyC6a15kwckkkbLU2mqBxQkrVmLYHIHILkY",
  authDomain: "fitgy-d9455.firebaseapp.com",
  projectId: "fitgy-d9455",
  storageBucket: "fitgy-d9455.firebasestorage.app",
  messagingSenderId: "464555519770",
  appId: "1:464555519770:web:3574e5ca8ebe1477b5c6a3",
  measurementId: "G-1L5D9DRQ51"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Сохраняем предыдущую страницу при загрузке
if (document.referrer && !document.referrer.includes('login.html')) {
  localStorage.setItem('returnTo', document.referrer);
}

// Элементы UI
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("email-signup");
const loginBtn = document.getElementById("email-login-btn");
const googleBtn = document.getElementById("google-login-btn");
const yandexBtn = document.getElementById("yandex-login-btn");

// Функция перенаправления
function redirectAfterLogin(user) {
    const returnTo = localStorage.getItem('returnTo');
    
    // Генерируем событие входа для всех страниц
    window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));
    
    if (returnTo && returnTo !== window.location.href && !returnTo.includes('login.html')) {
        window.location.href = returnTo;
    } else {
        window.location.href = '../index.html';
    }
    
    localStorage.removeItem('returnTo');
}

// Простая функция показа уведомлений (только два типа)
function showNotification(message, type = 'info') {
  // Удаляем старое уведомление
  const oldAlert = document.querySelector('.notification-alert');
  if (oldAlert) oldAlert.remove();
  
  // Создаем новое
  const alert = document.createElement('div');
  alert.className = `notification-alert ${type}`;
  alert.innerHTML = `
    <span>${message}</span>
    <button class="close-alert">&times;</button>
  `;
  
  // Добавляем в начало body
  document.body.prepend(alert);
  
  // Автоудаление через 5 секунд
  setTimeout(() => {
    if (alert.parentNode) alert.remove();
  }, 5000);
  
  // Закрытие по клику
  alert.querySelector('.close-alert').addEventListener('click', () => alert.remove());
}

// Регистрация через Email
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) return;
  if (password.length < 6) return;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await sendEmailVerification(user);
    
    // УВЕДОМЛЕНИЕ 1: Подтверждение почты
    showNotification(`Регистрация успешна! Письмо для подтверждения отправлено на ${email}. Проверьте почту (включая папку "Спам").`, 'success');
    
    emailInput.value = "";
    passwordInput.value = "";
    
    setTimeout(redirectAfterLogin, 2000);
    
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      showNotification("Этот email уже зарегистрирован", "error");
    } else if (err.code === "auth/invalid-email") {
      showNotification("Некорректный email", "error");
    } else if (err.code === "auth/weak-password") {
      showNotification("Пароль слишком слабый", "error");
    }
  }
});

// Вход через Email
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) return;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    if (!user.emailVerified) {
      showNotification("Email не подтвержден. Проверьте вашу почту.", "warning");
      return;
    }
    
    redirectAfterLogin();
    
  } catch (err) {
    if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
      showNotification("Неверный email или пароль", "error");
    } else if (err.code === "auth/too-many-requests") {
      showNotification("Слишком много попыток. Попробуйте позже", "error");
    }
  }
});

// Вход через Google
googleBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, googleProvider);
    redirectAfterLogin();
  } catch (err) {
    if (err.code !== "auth/popup-closed-by-user") {
      showNotification("Ошибка входа через Google", "error");
    }
  }
});

// Вход через Яндекс (заглушка)
yandexBtn?.addEventListener("click", () => {
  showNotification("Вход через Яндекс скоро будет доступен", "info");
});

// Восстановление пароля
document.getElementById("forgot-password")?.addEventListener("click", (e) => {
  e.preventDefault();
  
  const modal = document.getElementById("password-reset-modal");
  const resetEmail = document.getElementById("reset-email");
  const cancelBtn = document.getElementById("cancel-reset");
  const sendBtn = document.getElementById("send-reset");
  
  modal.style.display = "flex";
  resetEmail.value = emailInput.value.trim();
  
  cancelBtn.onclick = () => {
    modal.style.display = "none";
  };
  
  sendBtn.onclick = async () => {
    const email = resetEmail.value.trim();
    
    if (!email) return;
    
    try {
      await sendPasswordResetEmail(auth, email);
      modal.style.display = "none";
      
      // УВЕДОМЛЕНИЕ 2: Сброс пароля
      showNotification(`Письмо для восстановления пароля отправлено на ${email}`, 'success');
      
    } catch (err) {
      showNotification("Ошибка при отправке письма", "error");
    }
  };
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  };
});

// Enter для входа
emailInput.addEventListener("keypress", (e) => { 
  if (e.key === "Enter") loginBtn.click(); 
});
passwordInput.addEventListener("keypress", (e) => { 
  if (e.key === "Enter") loginBtn.click(); 
});