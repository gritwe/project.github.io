// training.js - версия только с модальным окном подтверждения
import { 
  waitForAuthReady, 
  getLearningStats,
  updateTopicStatus
} from './auth-state.js';

const TOTAL_TOPICS = 3;

document.addEventListener('DOMContentLoaded', async function() {
    await initPage();
    
    async function initPage() {
        console.log('Инициализация страницы тренировок');
        
        document.querySelectorAll('.topic-study-btn-link').forEach(link => {
            const originalHref = link.getAttribute('href');
            if (originalHref) {
                link.setAttribute('data-original-href', originalHref);
            }
        });
        
        await waitForAuthReady();
        
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('updated') === 'true') {
            console.log('Обнаружен флаг обновления');
            const newUrl = window.location.pathname + '?section=theory';
            window.history.replaceState({}, document.title, newUrl);
            
            localStorage.removeItem('fitgy_progress_updated');
            localStorage.removeItem('fitgy_last_completed_topic');
        }
        
        await updateProgressBar();
        await updateTopicButtons();
        setupEventListeners();
        setupResetButton();
        
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'topicCompleted') {
                console.log('Получено сообщение от дочернего окна:', event.data);
                updateProgressBar();
                updateTopicButtons();
            }
        });
        
        if (localStorage.getItem('fitgy_progress_updated') === 'true') {
            console.log('Обновление прогресса из localStorage');
            updateProgressBar();
            updateTopicButtons();
            localStorage.removeItem('fitgy_progress_updated');
        }
    }
    
    async function updateProgressBar() {
        const progressBar = document.getElementById('progress-fill');
        const progressPercent = document.getElementById('progress-percent');
        const progressCount = document.getElementById('progress-count');
        const progressNote = document.getElementById('progress-note');
        const resetBtn = document.getElementById('reset-progress-btn');
        
        if (!progressBar || !progressPercent) return;
        
        try {
            const user = await waitForAuthReady();
            let completedCount = 0;
            let stats = null;
            
            console.log('Пользователь в updateProgressBar:', user ? user.email : 'не авторизован');
            
            if (user) {
                stats = await getLearningStats();
                console.log('Статистика из БД:', stats);
                
                if (stats?.completedTopics) {
                    const validTopicIds = ['physio1', 'method1', 'safety1'];
                    completedCount = stats.completedTopics.filter(id => validTopicIds.includes(id)).length;
                }
            } else {
                const allCompletedTopics = JSON.parse(localStorage.getItem('fitgy_all_completed_topics') || '[]');
                const validTopicIds = ['physio1', 'method1', 'safety1'];
                const filteredTopics = allCompletedTopics.filter(id => validTopicIds.includes(id));
                completedCount = [...new Set(filteredTopics)].length;
            }
            
            const percent = Math.min(Math.round((completedCount / TOTAL_TOPICS) * 100), 100);
            
            console.log(`Прогресс: ${completedCount}/${TOTAL_TOPICS} (${percent}%)`);
            
            progressBar.style.width = `${percent}%`;
            progressPercent.textContent = `${percent}%`;
            progressCount.textContent = `${completedCount}/${TOTAL_TOPICS} тем`;
            
            if (resetBtn) {
                resetBtn.style.display = completedCount > 0 ? 'inline-flex' : 'none';
            }
            
            if (progressNote) {
                if (percent === 100) {
                    progressNote.textContent = '🎉 Поздравляем! Вы изучили все темы!';
                } else if (user) {
                    progressNote.textContent = `Вы изучили ${completedCount} из ${TOTAL_TOPICS} тем`;
                } else {
                    progressNote.textContent = 'Авторизуйтесь, чтобы сохранять прогресс';
                }
            }
            
        } catch (error) {
            console.error('Ошибка при обновлении прогресс-бара:', error);
            setDefaultProgress();
            const resetBtn = document.getElementById('reset-progress-btn');
            if (resetBtn) resetBtn.style.display = 'none';
        }
    }
    
    async function updateTopicButtons() {
        try {
            const user = await waitForAuthReady();
            let completedTopics = [];
            
            if (user) {
                const stats = await getLearningStats();
                completedTopics = stats ? stats.completedTopics || [] : [];
            } else {
                const allTopics = JSON.parse(localStorage.getItem('fitgy_all_completed_topics') || '[]');
                const validTopicIds = ['physio1', 'method1', 'safety1'];
                completedTopics = [...new Set(allTopics.filter(id => validTopicIds.includes(id)))];
            }
            
            document.querySelectorAll('.theory-topic').forEach(topicItem => {
                const topicLink = topicItem.querySelector('.topic-study-btn-link');
                if (!topicLink) return;
                
                const topicId = topicLink.dataset.topicId;
                
                if (topicId && completedTopics.includes(topicId)) {
                    updateButtonToRepeat(topicLink, topicId);
                    topicItem.classList.add('completed');
                } else if (topicId) {
                    updateButtonToStudy(topicLink, topicId);
                    topicItem.classList.remove('completed');
                }
            });
        } catch (error) {
            console.error('Ошибка при обновлении кнопок тем:', error);
        }
    }
    
    function updateButtonToRepeat(topicLink, topicId) {
        const button = topicLink.querySelector('.topic-study-btn, .topic-repeat-btn');
        if (button) {
            const originalHref = topicLink.getAttribute('data-original-href');
            if (originalHref) {
                topicLink.href = originalHref;
            } else {
                const currentHref = topicLink.getAttribute('href');
                if (currentHref && !currentHref.includes('theory.html')) {
                    topicLink.href = currentHref;
                } else {
                    topicLink.href = `theory/theory.html?topic=${topicId}`;
                }
            }
            
            button.className = 'topic-repeat-btn';
            button.innerHTML = '<i class="fas fa-redo"></i> Повторить';
        }
    }

    function updateButtonToStudy(topicLink, topicId) {
        const button = topicLink.querySelector('.topic-study-btn, .topic-repeat-btn');
        if (button) {
            const originalHref = topicLink.getAttribute('data-original-href');
            if (originalHref) {
                topicLink.href = originalHref;
            } else {
                const currentHref = topicLink.getAttribute('href');
                if (currentHref && !currentHref.includes('theory.html')) {
                    topicLink.href = currentHref;
                } else {
                    topicLink.href = `theory/theory.html?topic=${topicId}`;
                }
            }
            
            button.className = 'topic-study-btn';
            button.innerHTML = '<i class="fas fa-book"></i> Изучить';
        }
    }
    
    function setDefaultProgress() {
        const progressBar = document.getElementById('progress-fill');
        const progressPercent = document.getElementById('progress-percent');
        const progressCount = document.getElementById('progress-count');
        const progressNote = document.getElementById('progress-note');
        const resetBtn = document.getElementById('reset-progress-btn');
        
        if (progressBar) progressBar.style.width = '0%';
        if (progressPercent) progressPercent.textContent = '0%';
        if (progressCount) progressCount.textContent = `0/${TOTAL_TOPICS} тем`;
        if (resetBtn) resetBtn.style.display = 'none';
        if (progressNote) progressNote.textContent = 'Авторизуйтесь, чтобы сохранять прогресс';
    }
    
    function setupEventListeners() {
        document.querySelectorAll('.nav-center a').forEach(link => {
            if (link.getAttribute('href') === '#') {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    scrollToTheorySection();
                });
            }
        });
        
        const theoryCard = document.getElementById('theory-card');
        if (theoryCard) {
            theoryCard.addEventListener('click', function(e) {
                e.preventDefault();
                scrollToTheorySection();
            });
        }
    }
    
    function scrollToTheorySection() {
        const theorySection = document.getElementById('theory_fit');
        if (theorySection) {
            theorySection.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    // Функция сброса прогресса с кастомным модальным окном
    async function resetProgress() {
        const modal = document.getElementById('confirm-modal');
        if (!modal) {
            console.error('Модальное окно не найдено');
            return false;
        }
        
        return new Promise((resolve) => {
            modal.classList.add('active');
            
            const confirmBtn = document.getElementById('modal-confirm');
            const cancelBtn = document.getElementById('modal-cancel');
            
            const handleConfirm = async () => {
                modal.classList.remove('active');
                
                try {
                    const user = await waitForAuthReady();
                    
                    if (!user) {
                        localStorage.removeItem('fitgy_all_completed_topics');
                        const validTopicIds = ['physio1', 'method1', 'safety1'];
                        validTopicIds.forEach(topicId => {
                            sessionStorage.removeItem(`fitgy_topic_${topicId}_completed`);
                            sessionStorage.removeItem(`fitgy_topic_${topicId}_completed_time`);
                        });
                    } else {
                        const stats = await getLearningStats();
                        const completedTopics = stats?.completedTopics || [];
                        
                        for (const topicId of completedTopics) {
                            await updateTopicStatus(topicId, false);
                        }
                        
                        localStorage.setItem('fitgy_last_reset_time', Date.now());
                    }
                    
                    const validTopicIds = ['physio1', 'method1', 'safety1'];
                    validTopicIds.forEach(topicId => {
                        sessionStorage.removeItem(`fitgy_topic_${topicId}_completed`);
                        sessionStorage.removeItem(`fitgy_topic_${topicId}_completed_time`);
                    });
                    
                    await updateProgressBar();
                    await updateTopicButtons();
                    
                    window.postMessage({ 
                        type: 'progressReset', 
                        timestamp: Date.now() 
                    }, window.location.origin);
                    
                    resolve(true);
                } catch (error) {
                    console.error('Ошибка при сбросе прогресса:', error);
                    resolve(false);
                }
            };
            
            const handleCancel = () => {
                modal.classList.remove('active');
                resolve(false);
            };
            
            // Удаляем старые обработчики
            confirmBtn.replaceWith(confirmBtn.cloneNode(true));
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));
            
            const newConfirmBtn = document.getElementById('modal-confirm');
            const newCancelBtn = document.getElementById('modal-cancel');
            
            newConfirmBtn.addEventListener('click', handleConfirm);
            newCancelBtn.addEventListener('click', handleCancel);
            
            const handleOutsideClick = (e) => {
                if (e.target === modal) {
                    handleCancel();
                }
            };
            
            modal.addEventListener('click', handleOutsideClick);
        });
    }
    
    function setupResetButton() {
        const resetBtn = document.getElementById('reset-progress-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetProgress);
        }
    }
    
    // Слушаем события авторизации
    window.addEventListener('userLoggedIn', async function(event) {
        console.log('Пользователь вошел в систему', event.detail);
        await updateProgressBar();
        await updateTopicButtons();
        await syncLocalProgressWithFirebase();
    });
    
    window.addEventListener('userLoggedOut', async function() {
        console.log('Пользователь вышел из системы');
        await updateProgressBar();
        await updateTopicButtons();
    });
    
    // Функция синхронизации локального прогресса с Firebase
    async function syncLocalProgressWithFirebase() {
        try {
            const user = await waitForAuthReady();
            if (!user) return;
            
            const localCompletedTopics = JSON.parse(localStorage.getItem('fitgy_all_completed_topics') || '[]');
            const validTopicIds = ['physio1', 'method1', 'safety1'];
            const uniqueTopics = [...new Set(localCompletedTopics.filter(id => validTopicIds.includes(id)))];
            
            if (uniqueTopics.length > 0) {
                console.log('Синхронизация локального прогресса:', uniqueTopics);
                
                for (const topicId of uniqueTopics) {
                    await updateTopicStatus(topicId, true);
                }
                
                localStorage.removeItem('fitgy_all_completed_topics');
                await updateTopicButtons();
            }
        } catch (error) {
            console.error('Ошибка при синхронизации прогресса:', error);
        }
    }
});