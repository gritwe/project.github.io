import { 
  getAuth, 
  signOut, 
  onAuthStateChanged, 
  updateProfile 
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";

// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC6a15kwckkkbLU2mqBxQkrVmLYHIHILkY",
  authDomain: "fitgy-d9455.firebaseapp.com",
  projectId: "fitgy-d9455",
  storageBucket: "fitgy-d9455.firebasestorage.app",
  messagingSenderId: "464555519770",
  appId: "1:464555519770:web:3574e5ca8ebe1477b5c6a3",
  measurementId: "G-1L5D9DRQ51"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Состояние приложения
const state = {
  currentUser: null,
  userData: {},
  currentTab: 'personal',
  loadedTabs: new Set(),
  isLoading: false
};

// Кэш компонентов
const componentsCache = new Map();

// DOM элементы
const elements = {
  // Основные элементы
  profileContainer: document.querySelector('.profile-container'),
  
  // Элементы сайдбара
  avatarContainer: document.getElementById('avatar-container'),
  avatarIcon: document.getElementById('avatar-icon'),
  avatarUpload: document.getElementById('avatar-upload'),
  userNameDisplay: document.getElementById('user-name-display'),
  userEmailDisplay: document.getElementById('user-email-display'),
  
  // Навигация
  navButtons: document.querySelectorAll('.nav-btn'),
  
  // Кнопки действий
  backBtn: document.getElementById('back-btn'),
  logoutBtn: document.getElementById('logout-btn'),
  
  // Контейнеры контента
  tabContents: {
    personal: document.getElementById('personal-content'),
    settings: document.getElementById('settings-content'),
    policy: document.getElementById('policy-content'),
    contacts: document.getElementById('contacts-content')
  },
  
  // Модальное окно
  modalOverlay: document.getElementById('modal-overlay'),
  modalTitle: document.getElementById('modal-title'),
  modalMessage: document.getElementById('modal-message'),
  modalConfirm: document.getElementById('modal-confirm'),
  modalClose: document.querySelector('.modal-close')
};

// Компоненты вкладок
const components = {
  personal: `
    <div class="card">
      <form id="personal-form">
        <div class="form-group">
          <label class="form-label">
            <i class="fas fa-user"></i> Имя и фамилия
          </label>
          <div id="display-name" class="form-control" style="border: none; background: #f8f9fa;">
            Загрузка...
          </div>
          <input type="text" id="edit-name" class="form-control hidden" placeholder="Введите ваше имя">
        </div>
        
        <div class="form-group">
          <label class="form-label">
            <i class="fas fa-envelope"></i> Email
          </label>
          <div id="display-email" class="form-control" style="border: none; background: #f8f9fa;">
            Загрузка...
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">
            <i class="fas fa-birthday-cake"></i> Дата рождения
          </label>
          <div id="display-birthdate" class="form-control" style="border: none; background: #f8f9fa;">
            Загрузка...
          </div>
          <input type="date" id="edit-birthdate" class="form-control hidden">
        </div>
        
        <div class="form-group">
          <label class="form-label">
            <i class="fas fa-venus-mars"></i> Пол
          </label>
          <div id="display-gender" class="form-control" style="border: none; background: #f8f9fa;">
            Загрузка...
          </div>
          <select id="edit-gender" class="form-control hidden">
            <option value="">Выберите пол</option>
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
            <option value="other">Другой</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">
            <i class="fas fa-phone"></i> Телефон
          </label>
          <div id="display-phone" class="form-control" style="border: none; background: #f8f9fa;">
            Загрузка...
          </div>
          <input type="tel" id="edit-phone" class="form-control hidden" placeholder="+7 (999) 999-99-99">
        </div>
        
        <div class="btn-group">
          <button type="button" id="edit-btn" class="btn-primary">
            <i class="fas fa-edit"></i> Редактировать
          </button>
          
          <div id="save-buttons" class="btn-group hidden">
            <button type="button" id="save-btn" class="btn-primary">
              <i class="fas fa-save"></i> Сохранить
            </button>
            <button type="button" id="cancel-btn" class="btn-secondary">
              <i class="fas fa-times"></i> Отмена
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
  
  
  contacts: `
    <div class="contacts-grid">
      <div class="contact-card">
        <div class="contact-icon">
          <i class="fas fa-envelope"></i>
        </div>
        <div class="contact-info">
          <h4>Email поддержки</h4>
          <p>fitngy@gmail.com</p>
          <small>Отвечаем в течение 24 часов</small>
        </div>
      </div>
      
      <div class="contact-card">
        <div class="contact-icon">
          <i class="fas fa-phone"></i>
        </div>
        <div class="contact-info">
          <h4>Телефон</h4>
          <p>+7 (800) 123-45-67</p>
          <small>Бесплатный звонок по России</small>
        </div>
      </div>
      
      <div class="contact-card">
        <div class="contact-icon">
          <i class="fas fa-clock"></i>
        </div>
        <div class="contact-info">
          <h4>Время работы</h4>
          <p>Пн-Пт: 9:00-24:00</p>
          <small>Суббота/Воскресенье: 9:00-22:00</small>
        </div>
      </div>
      
      <div class="contact-card">
        <div class="contact-icon">
          <i class="fas fa-map-marker-alt"></i>
        </div>
        <div class="contact-info">
          <h4>Адрес офиса</h4>
          <p>г. Владимир, д. 1</p>
          <small>"Деловой центр"</small>
        </div>
      </div>
      
      <div class="contact-card">
        <div class="contact-icon">
          <i class="fab fa-telegram"></i>
        </div>
        <div class="contact-info">
          <h4>Telegram канал</h4>
          <p>@FIT_GY</p>
          <small>Быстрые ответы в Telegram</small>
        </div>
      </div>
      
      <div class="contact-card">
        <div class="contact-icon">
          <i class="fa-brands fa-vk"></i>
        </div>
        <div class="contact-info">
          <h4>Поддержка Вконтакте</h4>
          <p>@FIT_GY</p>
          <small>Онлайн консультации</small>
        </div>
      </div>
    </div>
  `
};

// ===== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ =====
async function initApp() {
  try {
    // Настройка слушателей событий
    setupEventListeners();
    
    // Проверка авторизации
    setupAuthListener();
    
    console.log('✅ Приложение профиля инициализировано');
  } catch (error) {
    console.error('❌ Ошибка инициализации приложения:', error);
    showError('Ошибка загрузки', 'Не удалось загрузить приложение профиля');
  }
}

// ===== АВТОРИЗАЦИЯ =====
function setupAuthListener() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      state.currentUser = user;
      await loadUserData(user);
    } else {
      // Сохраняем текущую страницу и редиректим на логин
      localStorage.setItem('returnTo', window.location.href);
      window.location.href = 'login.html';
    }
  });
}

// ===== ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ =====
async function loadUserData(user) {
  try {
    state.isLoading = true;
    
    // Обновляем отображение основной информации
    updateUserDisplay(user);
    
    // Загружаем данные из Firestore
    await loadFirestoreData(user);
    
    // Загружаем активную вкладку
    await loadTabContent(state.currentTab);
    
  } catch (error) {
    console.error('❌ Ошибка загрузки данных:', error);
    showError('Ошибка загрузки', 'Не удалось загрузить данные профиля');
  } finally {
    state.isLoading = false;
  }
}

async function loadFirestoreData(user) {
  try {
    const userDoc = doc(db, "users", user.uid);
    const docSnap = await getDoc(userDoc);
    
    if (docSnap.exists()) {
      state.userData = docSnap.data();
    } else {
      // Создаем новый документ
      state.userData = {
        name: user.displayName || '',
        email: user.email || '',
        birthdate: '',
        gender: '',
        phone: '',
        settings: {
          notifications: true,
          darkMode: true,
          twoFactorAuth: false,
          language: 'ru'
        },
        createdAt: new Date().toISOString()
      };
      
      await setDoc(userDoc, state.userData);
    }
    
  } catch (error) {
    console.error('❌ Ошибка загрузки из Firestore:', error);
    throw error;
  }
}

// ===== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА =====
function updateUserDisplay(user) {
  if (elements.userNameDisplay) {
    elements.userNameDisplay.textContent = user.displayName || 'Пользователь';
  }
  
  if (elements.userEmailDisplay) {
    elements.userEmailDisplay.textContent = user.email || '';
  }
}

// ===== РАБОТА С ВКЛАДКАМИ =====
async function loadTabContent(tabName) {
  if (state.loadedTabs.has(tabName)) {
    return; // Вкладка уже загружена
  }
  
  try {
    const contentElement = elements.tabContents[tabName];
    if (!contentElement) return;
    
    // Загружаем компонент
    const componentHtml = components[tabName];
    contentElement.innerHTML = componentHtml;
    
    // Инициализируем компонент
    await initTabComponent(tabName);
    
    // Помечаем как загруженную
    state.loadedTabs.add(tabName);
    
    console.log(`✅ Вкладка "${tabName}" загружена`);
  } catch (error) {
    console.error(`❌ Ошибка загрузки вкладки ${tabName}:`, error);
    showError('Ошибка загрузки', `Не удалось загрузить вкладку "${tabName}"`);
  }
}

async function initTabComponent(tabName) {
  switch (tabName) {
    case 'personal':
      initPersonalTab();
      break;
    case 'settings':
      initSettingsTab();
      break;
    case 'policy':
      // Политика не требует инициализации
      break;
    case 'contacts':
      // Контакты не требуют инициализации
      break;
  }
}

// ===== ИНИЦИАЛИЗАЦИЯ ВКЛАДКИ "ЛИЧНАЯ ИНФОРМАЦИЯ" =====
function initPersonalTab() {
  // Элементы формы
  const displayName = document.getElementById('display-name');
  const displayEmail = document.getElementById('display-email');
  const displayBirthdate = document.getElementById('display-birthdate');
  const displayGender = document.getElementById('display-gender');
  const displayPhone = document.getElementById('display-phone');
  
  const editName = document.getElementById('edit-name');
  const editBirthdate = document.getElementById('edit-birthdate');
  const editGender = document.getElementById('edit-gender');
  const editPhone = document.getElementById('edit-phone');
  
  const editBtn = document.getElementById('edit-btn');
  const saveBtn = document.getElementById('save-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const saveButtons = document.getElementById('save-buttons');
  
  if (!displayName || !editBtn) return;
  
  // Обновляем отображение данных
  updatePersonalDisplay();
  
  // Переключение режима редактирования
  let isEditing = false;
  
  function toggleEditMode(enable) {
    isEditing = enable;
    
    const elementsToToggle = [
      { display: displayName, edit: editName },
      { display: displayBirthdate, edit: editBirthdate },
      { display: displayGender, edit: editGender },
      { display: displayPhone, edit: editPhone }
    ];
    
    elementsToToggle.forEach(({ display, edit }) => {
      if (display && edit) {
        display.classList.toggle('hidden', enable);
        edit.classList.toggle('hidden', !enable);
      }
    });
    
    editBtn.classList.toggle('hidden', enable);
    saveButtons.classList.toggle('hidden', !enable);
  }
  
  // Обновление отображения данных
  function updatePersonalDisplay() {
    if (displayName) {
      displayName.textContent = state.userData.name || 'Не указано';
      editName.value = state.userData.name || '';
    }
    
    if (displayEmail) {
      displayEmail.textContent = state.userData.email || 'Не указан';
    }
    
    if (displayBirthdate) {
      displayBirthdate.textContent = state.userData.birthdate 
        ? formatDate(state.userData.birthdate) 
        : 'Не указана';
      editBirthdate.value = state.userData.birthdate || '';
    }
    
    if (displayGender) {
      displayGender.textContent = getGenderText(state.userData.gender);
      editGender.value = state.userData.gender || '';
    }
    
    if (displayPhone) {
      displayPhone.textContent = state.userData.phone || 'Не указан';
      editPhone.value = state.userData.phone || '';
    }
  }
  
  // Сохранение данных
  async function savePersonalData() {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      // Обновляем локальные данные
      state.userData.name = editName.value.trim();
      state.userData.birthdate = editBirthdate.value;
      state.userData.gender = editGender.value;
      state.userData.phone = editPhone.value;
      
      // Сохраняем в Firestore
      const userDoc = doc(db, "users", user.uid);
      await updateDoc(userDoc, {
        name: state.userData.name,
        birthdate: state.userData.birthdate,
        gender: state.userData.gender,
        phone: state.userData.phone,
        updatedAt: new Date().toISOString()
      });
      
      // Обновляем displayName в Auth
      if (state.userData.name) {
        await updateProfile(user, {
          displayName: state.userData.name
        });
      }
      
      // Обновляем интерфейс
      updatePersonalDisplay();
      toggleEditMode(false);
      
      // Показываем уведомление
      showNotification('Данные успешно сохранены', 'success');
      
    } catch (error) {
      console.error('❌ Ошибка сохранения данных:', error);
      showNotification('Ошибка при сохранении данных', 'error');
    }
  }
  
  // Назначаем обработчики событий
  if (editBtn) editBtn.addEventListener('click', () => toggleEditMode(true));
  if (cancelBtn) cancelBtn.addEventListener('click', () => toggleEditMode(false));
  if (saveBtn) saveBtn.addEventListener('click', savePersonalData);
}

// ===== ИНИЦИАЛИЗАЦИЯ ВКЛАДКИ "НАСТРОЙКИ" =====
function initSettingsTab() {
  if (!state.userData.settings) {
    state.userData.settings = {
      notifications: true,
      darkMode: true,
      twoFactorAuth: false,
      language: 'ru'
    };
  }
  
  // Получаем элементы
  const notificationsEmail = document.getElementById('notifications-email');
  const darkMode = document.getElementById('dark-mode');
  const twoFactorAuth = document.getElementById('two-factor-auth');
  const languageSelect = document.getElementById('language-select');
  
  // Устанавливаем текущие значения
  if (notificationsEmail) {
    notificationsEmail.checked = state.userData.settings.notifications || true;
    notificationsEmail.addEventListener('change', (e) => {
      updateSetting('notifications', e.target.checked);
    });
  }
  
  if (darkMode) {
    darkMode.checked = state.userData.settings.darkMode || true;
    darkMode.addEventListener('change', (e) => {
      updateSetting('darkMode', e.target.checked);
    });
  }
  
  if (twoFactorAuth) {
    twoFactorAuth.checked = state.userData.settings.twoFactorAuth || false;
    twoFactorAuth.addEventListener('change', (e) => {
      updateSetting('twoFactorAuth', e.target.checked);
    });
  }
  
  if (languageSelect) {
    languageSelect.value = state.userData.settings.language || 'ru';
    languageSelect.addEventListener('change', (e) => {
      updateSetting('language', e.target.value);
    });
  }
}

async function updateSetting(key, value) {
  try {
    const user = auth.currentUser;
    if (!user) return;
    
    // Обновляем локальные данные
    if (!state.userData.settings) state.userData.settings = {};
    state.userData.settings[key] = value;
    
    // Сохраняем в Firestore
    const userDoc = doc(db, "users", user.uid);
    await updateDoc(userDoc, {
      [`settings.${key}`]: value,
      updatedAt: new Date().toISOString()
    });
    
    showNotification('Настройки сохранены', 'success');
  } catch (error) {
    console.error('❌ Ошибка обновления настроек:', error);
    showNotification('Ошибка сохранения настроек', 'error');
  }
}

// ===== НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ =====
function setupEventListeners() {
  // Навигация по вкладкам
  elements.navButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // Кнопка "Вернуться назад"
  if (elements.backBtn) {
    elements.backBtn.addEventListener('click', goBack);
  }
  
  // Кнопка "Выйти из аккаунта"
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', handleLogout);
  }
  
  // Загрузка аватара
  if (elements.avatarContainer && elements.avatarUpload) {
    elements.avatarContainer.addEventListener('click', () => {
      elements.avatarUpload.click();
    });
    
    elements.avatarUpload.addEventListener('change', handleAvatarUpload);
  }
  
  // Модальное окно
  if (elements.modalOverlay) {
    if (elements.modalClose) {
      elements.modalClose.addEventListener('click', hideModal);
    }
    
    if (elements.modalConfirm) {
      elements.modalConfirm.addEventListener('click', hideModal);
    }
    
    elements.modalOverlay.addEventListener('click', (e) => {
      if (e.target === elements.modalOverlay) {
        hideModal();
      }
    });
  }
}

// ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК =====
async function switchTab(tabName) {
  if (state.currentTab === tabName || state.isLoading) return;
  
  // Обновляем активную кнопку навигации
  elements.navButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Скрываем все вкладки
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Показываем выбранную вкладку
  const tabElement = document.getElementById(`${tabName}-tab`);
  if (tabElement) {
    tabElement.classList.add('active');
    state.currentTab = tabName;
    
    // Загружаем контент вкладки, если он еще не загружен
    if (!state.loadedTabs.has(tabName)) {
      await loadTabContent(tabName);
    }
  }
}

// ===== ОБРАБОТКА АВАТАРА =====
function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    showError('Ошибка', 'Пожалуйста, выберите изображение');
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) { // 5MB
    showError('Ошибка', 'Размер файла не должен превышать 5MB');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (event) => {
    // Обновляем отображение аватара
    if (elements.avatarIcon) {
      elements.avatarIcon.style.display = 'none';
      elements.avatarContainer.style.backgroundImage = `url(${event.target.result})`;
      elements.avatarContainer.style.backgroundSize = 'cover';
      elements.avatarContainer.style.backgroundPosition = 'center';
    }
    
    showNotification('Аватар обновлен', 'success');
    
    // TODO: Сохранить аватар в Firebase Storage
  };
  
  reader.readAsDataURL(file);
}

// ===== НАВИГАЦИЯ =====
function goBack() {
  const returnTo = localStorage.getItem('returnTo') || '../index.html';
  
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = returnTo;
  }
}

// ===== ВЫХОД ИЗ СИСТЕМЫ =====
async function handleLogout() {
  try {
    await signOut(auth);
    const returnTo = localStorage.getItem('returnTo') || '../index1.html';
    window.location.href = returnTo;
  } catch (error) {
    console.error('❌ Ошибка выхода:', error);
    showError('Ошибка', 'Не удалось выйти из системы');
  }
}

// ===== УВЕДОМЛЕНИЯ И МОДАЛЬНЫЕ ОКНА =====
function showNotification(message, type = 'info') {
  // Создаем элемент уведомления
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Стили для уведомления
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 10px;
    color: white;
    font-weight: 500;
    z-index: 9999;
    animation: slideIn 0.3s ease;
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
  `;
  
  // Цвета в зависимости от типа
  const colors = {
    success: '#28a745',
    error: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8'
  };
  
  notification.style.background = colors[type] || colors.info;
  
  // Добавляем в DOM
  document.body.appendChild(notification);
  
  // Удаляем через 3 секунды
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
  
  // Добавляем стили анимации, если их еще нет
  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

function showError(title, message) {
  if (elements.modalTitle) elements.modalTitle.textContent = title;
  if (elements.modalMessage) elements.modalMessage.textContent = message;
  if (elements.modalOverlay) elements.modalOverlay.classList.remove('hidden');
}

function hideModal() {
  if (elements.modalOverlay) elements.modalOverlay.classList.add('hidden');
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

function getGenderText(gender) {
  const genders = {
    'male': 'Мужской',
    'female': 'Женский',
    'other': 'Другой'
  };
  return genders[gender] || 'Не указан';
}

// ===== ЗАПУСК ПРИЛОЖЕНИЯ =====
document.addEventListener('DOMContentLoaded', initApp);

// Экспортируем функции для использования в других модулях
export {
  auth,
  db,
  state,
  showNotification,
  showError
};