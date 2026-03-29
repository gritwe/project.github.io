import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { getFirestore, collection, addDoc, setDoc, doc, getDoc, updateDoc, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

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

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Текущая программа пользователя (глобальная переменная)
let currentUserWorkoutProgram = null;
let currentUser = null;
let authChecked = false;
let authPromiseResolve = null;

// Глобальная переменная для отслеживания состояния авторизации
let authStateReady = false;
let authStateReadyCallbacks = [];

// Создаем Promise для ожидания проверки авторизации
const authPromise = new Promise((resolve) => {
  authPromiseResolve = resolve;
});

// Функция для обновления навигации
// auth-state.js - обновите функцию waitForAuthReady
function waitForAuthReady() {
  return new Promise((resolve) => {
    if (authStateReady) {
      resolve(currentUser);
    } else {
      authStateReadyCallbacks.push(resolve);
      
      // Добавляем таймаут на случай, если авторизация не инициализируется
      setTimeout(() => {
        if (!authStateReady) {
          console.warn("Таймаут ожидания авторизации, продолжаем без пользователя");
          authStateReady = true;
          currentUser = null;
          resolve(null);
        }
      }, 5000); // 5 секунд таймаут
    }
  });
}

// Инициализация проверки состояния авторизации
function initAuthState() {
  const navAuth = document.querySelector('.nav-auth');
  
  // Сразу скрываем контейнер
  if (navAuth) {
    navAuth.style.opacity = '0';
    navAuth.style.visibility = 'hidden';
    navAuth.style.transition = 'opacity 0.3s ease';
  }

  onAuthStateChanged(auth, (user) => {
      authChecked = true;
      authStateReady = true;
      currentUser = user;
      
      // Сначала обновляем навигацию
      updateNavigation(!!user);
      onAuthStateChanged(auth, (user) => {
      authChecked = true;
      authStateReady = true;
      currentUser = user;
      
      // Сначала обновляем навигацию
      updateNavigation(!!user);
      
      // Потом показываем контейнер
      if (navAuth) {
          setTimeout(() => {
              navAuth.style.opacity = '1';
              navAuth.style.visibility = 'visible';
          }, 50);
      }
      
      if (user) {
          console.log(`✅ Пользователь авторизован: ${user.email} (${user.uid})`);
          // Генерируем событие входа пользователя
          window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));
      } else {
          console.log("ℹ️ Пользователь не авторизован");
          // Генерируем событие выхода пользователя
          window.dispatchEvent(new Event('userLoggedOut'));
      }
      
      // Резолвим все ожидающие промисы
      if (authPromiseResolve) {
          authPromiseResolve(user);
          authPromiseResolve = null;
      }
      
      // Вызываем все колбэки ожидания
      authStateReadyCallbacks.forEach(callback => callback(user));
      authStateReadyCallbacks = [];
  });
    // Потом показываем контейнер
    if (navAuth) {
      setTimeout(() => {
        navAuth.style.opacity = '1';
        navAuth.style.visibility = 'visible';
      }, 50);
    }
    
    if (user) {
      console.log(`✅ Пользователь авторизован: ${user.email} (${user.uid})`);
    } else {
      console.log("ℹ️ Пользователь не авторизован");
    }
  });
}

// Проверка авторизации (возвращает Promise)
async function checkAuth() {
  if (authChecked) {
    return currentUser;
  }
  
  // Ждем, пока authPromise разрешится
  return await authPromise;
}
// Функция для обновления навигации
function updateNavigation(isLoggedIn) {
  const authIcon = document.getElementById('auth-icon');
  const profileIcon = document.getElementById('profile-icon');
  const navAuth = document.querySelector('.nav-auth');

  if (!authIcon || !profileIcon || !navAuth) return;

  // Сразу обновляем классы
  if (isLoggedIn) {
    authIcon.classList.add('auth-icon-hidden');
    authIcon.classList.remove('auth-icon-visible');
    profileIcon.classList.remove('auth-icon-hidden');
    profileIcon.classList.add('auth-icon-visible');
  } else {
    profileIcon.classList.add('auth-icon-hidden');
    profileIcon.classList.remove('auth-icon-visible');
    authIcon.classList.remove('auth-icon-hidden');
    authIcon.classList.add('auth-icon-visible');
  }

  // Убедимся, что контейнер видим
  navAuth.style.opacity = '1';
  navAuth.style.visibility = 'visible';
}
// Выход из системы
async function logout() {
  try {
    await signOut(auth);
    currentUser = null;
    updateNavigation(false);
    return true;
  } catch (error) {
    console.error('❌ Ошибка выхода:', error);
    return false;
  }
}

async function saveWorkoutProgram(programData) {
  try {
    const user = await waitForAuthReady();
    
    if (!user) {
      console.warn("Не удалось сохранить программу: пользователь не авторизован");
      return false;
    }
    
    if (!programData) {
      console.warn("Не удалось сохранить программу: нет данных");
      return false;
    }
    
    // Уникализируем упражнения в каждом дне
    if (programData.days) {
      programData.days.forEach(day => {
        if (day.exercises && day.exercises.length > 0) {
          // Удаляем дубликаты упражнений по названию
          const uniqueExercises = [];
          const seenTitles = new Set();
          
          day.exercises.forEach(exercise => {
            if (!seenTitles.has(exercise.title)) {
              seenTitles.add(exercise.title);
              uniqueExercises.push(exercise);
            }
          });
          
          day.exercises = uniqueExercises;
        }
      });
    }
    
    // Добавляем метаданные
    const programToSave = {
      ...programData,
      userId: user.uid,
      userEmail: user.email || "unknown",
      updatedAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };
    
    // Сохраняем в коллекции workoutPrograms
    const workoutRef = doc(db, "workoutPrograms", user.uid);
    await setDoc(workoutRef, programToSave, { merge: true });
    
    // Обновляем глобальную переменную
    currentUserWorkoutProgram = programToSave;
    
    console.log("✅ Программа тренировок сохранена в Firebase");
    return true;
  } catch (error) {
    console.error("❌ Ошибка при сохранении программы тренировок:", error);
    return false;
  }
}

/**
 * Загружает программу тренировок из Firebase
 */
async function loadWorkoutProgram() {
  try {
    const user = await waitForAuthReady();
    
    if (!user) {
      console.log("Не удалось загрузить программу: пользователь не авторизован");
      return null;
    }
    
    // Загружаем программу пользователя
    const workoutRef = doc(db, "workoutPrograms", user.uid);
    const workoutSnap = await getDoc(workoutRef);
    
    if (workoutSnap.exists()) {
      const programData = workoutSnap.data();
      
      // Проверяем, не слишком ли старая программа (больше 30 дней)
      const saveDate = new Date(programData.saveDate || programData.updatedAt || programData.createdAt);
      const now = new Date();
      const daysDiff = (now - saveDate) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 30) {
        console.log("Программа устарела (больше 30 дней), предлагаем создать новую");
        showCustomAlert("Ваша программа тренировок устарела (больше 30 дней). Рекомендуем создать новую.", "info");
      }
      
      // Обновляем время последнего доступа
      await updateDoc(workoutRef, {
        lastAccessed: new Date().toISOString()
      });
      
      // Обновляем глобальную переменную
      currentUserWorkoutProgram = programData;
      
      console.log("✅ Программа тренировок загружена из Firebase");
      return programData;
    } else {
      console.log("У пользователя нет сохраненной программы тренировок");
      currentUserWorkoutProgram = null;
      return null;
    }
  } catch (error) {
    console.error("❌ Ошибка при загрузке программы тренировок:", error);
    currentUserWorkoutProgram = null;
    return null;
  }
}

/**
 * Обновляет статус выполнения тренировки
 */
async function updateWorkoutStatus(dayNumber, isCompleted) {
  try {
    const user = await waitForAuthReady();
    
    if (!user) {
      console.warn("Не удалось обновить статус: пользователь не авторизован");
      return false;
    }
    
    const workoutRef = doc(db, "workoutPrograms", user.uid);
    
    // Сначала получаем текущую программу
    const workoutSnap = await getDoc(workoutRef);
    
    if (!workoutSnap.exists()) {
      console.warn("У пользователя нет сохраненной программы");
      return false;
    }
    
    const programData = workoutSnap.data();
    
    // Обновляем статус
    const workoutStatus = programData.workoutStatus || {};
    workoutStatus[`day${dayNumber}`] = {
      completed: isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString()
    };
    
    // Сохраняем обновленные данные
    await updateDoc(workoutRef, {
      workoutStatus: workoutStatus,
      updatedAt: new Date().toISOString()
    });
    
    // Обновляем глобальную переменную
    if (currentUserWorkoutProgram) {
      currentUserWorkoutProgram.workoutStatus = workoutStatus;
    }
    
    console.log(`✅ Статус дня ${dayNumber} обновлен: ${isCompleted ? 'выполнен' : 'не выполнен'}`);
    return true;
  } catch (error) {
    console.error("❌ Ошибка при обновлении статуса тренировки:", error);
    return false;
  }
}

/**
 * Получает статус тренировок
 */
async function getWorkoutStatus() {
  try {
    const user = await waitForAuthReady();
    
    if (!user) {
      return {};
    }
    
    const workoutRef = doc(db, "workoutPrograms", user.uid);
    const workoutSnap = await getDoc(workoutRef);
    
    if (workoutSnap.exists()) {
      const programData = workoutSnap.data();
      return programData.workoutStatus || {};
    }
    
    return {};
  } catch (error) {
    console.error("❌ Ошибка при получении статуса тренировок:", error);
    return {};
  }
}

// ================ ФУНКЦИИ ДЛЯ РАБОТЫ С ПЛАНАМИ ПИТАНИЯ ================

/**
 * Сохраняет план питания в Firebase
 */
async function saveMealPlan(planData, silent = false) {
  try {
    // ПРЯМАЯ проверка текущего пользователя
    const user = auth.currentUser;
    
    if (!user) {
      console.warn("Не удалось сохранить план: пользователь не авторизован");
      if (!silent) showCustomAlert("Для сохранения плана питания необходимо авторизоваться", "warning");
      return false;
    }
    
    if (!planData) {
      console.warn("Не удалось сохранить план: нет данных");
      return false;
    }
    
    console.log(`Сохранение плана для пользователя: ${user.email} (${user.uid})`);
    
    // Добавляем метаданные
    const planToSave = {
      ...planData,
      userId: user.uid,
      userEmail: user.email || "unknown",
      savedAt: new Date().toISOString(),
      planType: 'advanced_meal_plan',
      weekNumber: planData.week || 1
    };
    
    // Сохраняем в коллекции mealPlans
    const planRef = doc(db, "mealPlans", user.uid);
    await setDoc(planRef, planToSave, { merge: true });
    
    console.log("✅ План питания сохранен в Firebase");
    
    return true;
  } catch (error) {
    console.error("❌ Ошибка при сохранении плана питания:", error);
    if (!silent) showCustomAlert("Ошибка при сохранении плана питания: " + error.message, "error");
    return false;
  }
}

/**
 * Загружает сохраненный план питания из Firebase
 */
async function loadMealPlan(week = 1) {
  try {
    // ПРЯМАЯ проверка текущего пользователя
    const user = auth.currentUser;
    
    if (!user) {
      console.log("Не удалось загрузить план: пользователь не авторизован");
      return null;
    }
    
    console.log(`Загрузка плана для пользователя: ${user.email} (${user.uid}), неделя ${week}`);
    
    const planRef = doc(db, "mealPlans", user.uid);
    const planSnap = await getDoc(planRef);
    
    if (planSnap.exists()) {
      const planData = planSnap.data();
      
      // Проверяем неделю
      if (planData.weekNumber && planData.weekNumber !== week) {
        console.log(`Запрошена неделя ${week}, но сохранен план для недели ${planData.weekNumber}. Возвращаем null.`);
        return null;
      }
      
      console.log("✅ План питания загружен из Firebase");
      return planData;
    } else {
      console.log("У пользователя нет сохраненного плана питания");
      return null;
    }
  } catch (error) {
    console.error("❌ Ошибка при загрузке плана питания:", error);
    showCustomAlert("Ошибка загрузки плана: " + error.message, "error");
    return null;
  }
}

/**
 * Получает историю планов питания
 */
async function getMealPlanHistory() {
  try {
    const user = await waitForAuthReady();
    
    if (!user) {
      return [];
    }
    
    const plansRef = collection(db, "mealPlansHistory");
    const q = query(
      plansRef,
      where("userId", "==", user.uid),
      orderBy("savedAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const plans = [];
    
    querySnapshot.forEach((doc) => {
      plans.push({ id: doc.id, ...doc.data() });
    });
    
    return plans;
  } catch (error) {
    console.error("❌ Ошибка при получении истории планов:", error);
    return [];
  }
}

// Кастомные алерты
function showCustomAlert(message, type = "info") {
  // Проверяем, существует ли уже контейнер для алертов
  let alertContainer = document.getElementById('custom-alerts');
  if (!alertContainer) {
    alertContainer = document.createElement('div');
    alertContainer.id = 'custom-alerts';
    alertContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(alertContainer);
  }
  
  // Создаем алерт
  const alert = document.createElement('div');
  alert.className = `custom-alert ${type}`;
  alert.style.cssText = `
    background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db'};
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 300px;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
    position: relative;
  `;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'warning' ? '⚠' : 'ℹ';
  
  alert.innerHTML = `
    <span style="font-size: 18px; font-weight: bold;">${icon}</span>
    <span style="flex: 1;">${message}</span>
    <button class="close-alert" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 0 5px;">&times;</button>
  `;
  
  // Добавляем алерт в контейнер
  alertContainer.appendChild(alert);
  
  // Удаляем алерт через 5 секунд
  const autoRemove = setTimeout(() => {
    if (alert.parentNode) {
      alert.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => alert.remove(), 300);
    }
  }, 5000);
  
  // Обработчик закрытия
  alert.querySelector('.close-alert').addEventListener('click', () => {
    clearTimeout(autoRemove);
    alert.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => alert.remove(), 300);
  });
  
  // Анимации
  const style = document.createElement('style');
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
  if (!document.querySelector('#alert-animations')) {
    style.id = 'alert-animations';
    document.head.appendChild(style);
  }
}

async function getLearningStats() {
  try {
    const user = await waitForAuthReady();
    
    if (!user) {
      return null;
    }
    
    const statsRef = doc(db, "learningProgress", user.uid);
    const statsSnap = await getDoc(statsRef);
    
    if (statsSnap.exists()) {
      return statsSnap.data();
    } else {
      // Создаем новую запись
      const initialStats = {
        userId: user.uid,
        userEmail: user.email || "unknown",
        completedTopics: [],
        progress: 0,
        lastUpdated: new Date().toISOString()
      };
      
      await setDoc(statsRef, initialStats, { merge: true });
      return initialStats;
    }
  } catch (error) {
    console.error("❌ Ошибка при получении статистики обучения:", error);
    return null;
  }
}

/**
 * Обновляет статус темы (изучена/не изучена)
 */
async function updateTopicStatus(topicId, isCompleted) {
    try {
        const user = await waitForAuthReady();
        
        if (!user) {
            console.warn("Не удалось обновить статус темы: пользователь не авторизован");
            return false;
        }
        
        const statsRef = doc(db, "learningProgress", user.uid);
        const statsSnap = await getDoc(statsRef);
        
        let statsData;
        if (statsSnap.exists()) {
            statsData = statsSnap.data();
        } else {
            statsData = {
                userId: user.uid,
                userEmail: user.email || "unknown",
                completedTopics: [],
                progress: 0
            };
        }
        
        // Обновляем список изученных тем
        let completedTopics = statsData.completedTopics || [];
        
        // Только 3 существующие темы
        const validTopicIds = ['physio1', 'method1', 'safety1']; // ИСПРАВЛЕНО
        completedTopics = completedTopics.filter(id => validTopicIds.includes(id));
        
        if (isCompleted) {
            if (!completedTopics.includes(topicId) && validTopicIds.includes(topicId)) {
                completedTopics.push(topicId);
            }
        } else {
            completedTopics = completedTopics.filter(id => id !== topicId);
        }
        
        // Удаляем дубликаты и ограничиваем 3 темы
        completedTopics = [...new Set(completedTopics)].slice(0, 3); // ИСПРАВЛЕНО
        
        // Рассчитываем прогресс (всего 3 темы)
        const TOTAL_TOPICS = 3; // ИСПРАВЛЕНО
        const progress = Math.min(Math.round((completedTopics.length / TOTAL_TOPICS) * 100), 100);
        
        // Сохраняем обновленные данные
        await setDoc(statsRef, {
            ...statsData,
            completedTopics: completedTopics,
            progress: progress,
            lastUpdated: new Date().toISOString()
        }, { merge: true });
        
        console.log(`✅ Статус темы ${topicId} обновлен: ${isCompleted ? 'изучена' : 'не изучена'}`);
        console.log(`📊 Прогресс: ${progress}% (${completedTopics.length}/${TOTAL_TOPICS} тем)`);
        
        return true;
    } catch (error) {
        console.error("❌ Ошибка при обновлении статуса темы:", error);
        return false;
    }
}

// Ждем загрузки DOM и инициализируем проверку авторизации
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthState);
} else {
  initAuthState();
}

// Экспортируем функции
export { 
  auth, 
  db,
  currentUser,
  checkAuth,
  logout,
  waitForAuthReady,
  saveWorkoutProgram,
  loadWorkoutProgram,
  updateWorkoutStatus,
  getWorkoutStatus,
  saveMealPlan,
  loadMealPlan,
  getMealPlanHistory,
  getLearningStats,
  updateTopicStatus,
  showCustomAlert
};