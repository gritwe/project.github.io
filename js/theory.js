// theory.js - версия без уведомлений
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const topicId = urlParams.get('topic') || 'physio1';
    
    const TOTAL_TOPICS = 3;
    
    initPage(topicId);
    setupButtons(topicId);
    setupEventListeners(topicId);
    
    if (urlParams.has('updated')) {
        console.log('Обнаружен параметр updated, проверяем статус');
        setTimeout(() => {
            checkTopicStatus(topicId);
            const newUrl = window.location.pathname + '?topic=' + topicId;
            window.history.replaceState({}, document.title, newUrl);
        }, 300);
    }
    
    async function initPage(topicId) {
        const topicsConfig = {
            'physio1': { 
                title: 'Мышечные волокна: типы и функции', 
                category: 'Физиология', 
                difficulty: 'Средняя', 
                time: 15 
            },
            'method1': { 
                title: 'Принцип прогрессии нагрузок', 
                category: 'Методология', 
                difficulty: 'Начальная', 
                time: 12 
            },
            'safety1': { 
                title: 'Правильная техника и профилактика травм', 
                category: 'Безопасность', 
                difficulty: 'Начальная', 
                time: 10 
            }
        };
        
        const topicData = topicsConfig[topicId] || topicsConfig['physio1'];
        
        document.title = `${topicData.title} - FitGy`;
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) {
            pageTitle.textContent = topicData.title;
        }
        
        const pageDescription = document.querySelector('.page-description');
        if (pageDescription && topicId === 'physio1') {
            pageDescription.textContent = 'Понимание структуры мышц для эффективных тренировок';
        }
        
        await checkTopicStatus(topicId);
    }
    
    async function checkTopicStatus(topicId) {
        try {
            const { waitForAuthReady, getLearningStats } = await import('./auth-state.js');
            const user = await waitForAuthReady();
            
            let isCompleted = false;
            
            const lastResetTime = localStorage.getItem('fitgy_last_reset_time');
            const topicCompletedTime = sessionStorage.getItem(`fitgy_topic_${topicId}_completed_time`);
            
            if (lastResetTime && topicCompletedTime && parseInt(lastResetTime) > parseInt(topicCompletedTime)) {
                console.log('Прогресс был сброшен после отметки темы, очищаем sessionStorage');
                sessionStorage.removeItem(`fitgy_topic_${topicId}_completed`);
                sessionStorage.removeItem(`fitgy_topic_${topicId}_completed_time`);
                updateUIState(false);
                return;
            }
            
            console.log('Проверка статуса темы, пользователь:', user);
            
            if (user) {
                const stats = await getLearningStats();
                if (stats?.completedTopics?.includes(topicId)) {
                    isCompleted = true;
                }
            } else {
                const sessionCompleted = sessionStorage.getItem(`fitgy_topic_${topicId}_completed`);
                if (sessionCompleted === 'true') {
                    console.log(`Тема ${topicId} найдена в sessionStorage как изученная`);
                    isCompleted = true;
                } else {
                    const allCompletedTopics = JSON.parse(localStorage.getItem('fitgy_all_completed_topics') || '[]');
                    if (allCompletedTopics.includes(topicId)) {
                        console.log(`Тема ${topicId} найдена в localStorage как изученная`);
                        isCompleted = true;
                        sessionStorage.setItem(`fitgy_topic_${topicId}_completed`, 'true');
                    }
                }
            }
            
            console.log(`Тема ${topicId} статус: ${isCompleted ? 'изучена' : 'не изучена'}`);
            updateUIState(isCompleted);
            
        } catch (error) {
            console.error('Ошибка при проверке статуса темы:', error);
            updateUIState(false);
        }
    }
    
    function updateUIState(isCompleted) {
        const completionSection = document.getElementById('completion-section');
        const repeatSection = document.getElementById('repeat-section');
        
        if (completionSection && repeatSection) {
            if (isCompleted) {
                completionSection.style.display = 'none';
                repeatSection.style.display = 'block';
                console.log('Показан блок "Тема изучена"');
            } else {
                completionSection.style.display = 'block';
                repeatSection.style.display = 'none';
                console.log('Показан блок "Отметить как изученное"');
            }
        } else {
            console.error('Не найдены секции completion-section или repeat-section');
        }
    }
    
    function setupButtons(topicId) {
        const completeBtn = document.getElementById('mark-completed-btn');
        if (completeBtn) {
            completeBtn.replaceWith(completeBtn.cloneNode(true));
            const newCompleteBtn = document.getElementById('mark-completed-btn');
            
            newCompleteBtn.addEventListener('click', async function(event) {
                event.preventDefault();
                event.stopPropagation();
                console.log(`Нажата кнопка завершения темы: ${topicId}`);
                await markTopicAsCompleted(topicId);
            });
        } else {
            console.warn('Кнопка mark-completed-btn не найдена');
        }
        
        const repeatBtn = document.getElementById('repeat-topic-btn');
        if (repeatBtn) {
            repeatBtn.addEventListener('click', function(event) {
                event.preventDefault();
                document.querySelector('.article').scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            });
        }
    }
    
    function setupEventListeners(topicId) {
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'topicCompleted') {
                console.log('Получено сообщение о завершении темы:', event.data);
                if (event.data.topicId === topicId) {
                    updateUIState(true);
                    sessionStorage.setItem(`fitgy_topic_${topicId}_completed`, 'true');
                }
            }
            
            if (event.data && event.data.type === 'progressReset') {
                console.log('Получен сигнал сброса прогресса');
                updateUIState(false);
                const urlParams = new URLSearchParams(window.location.search);
                const topicId = urlParams.get('topic');
                if (topicId) {
                    sessionStorage.removeItem(`fitgy_topic_${topicId}_completed`);
                }
            }
        });
        
        window.addEventListener('storage', function(event) {
            if (event.key === 'fitgy_all_completed_topics') {
                console.log('Обнаружено изменение в localStorage, обновляем статус темы');
                setTimeout(() => {
                    checkTopicStatus(topicId);
                }, 100);
            }
        });
        
        let checkInterval = setInterval(() => {
            const shouldCheck = localStorage.getItem('fitgy_should_check_topic_status');
            if (shouldCheck === 'true') {
                console.log('Обнаружен флаг для проверки статуса темы');
                checkTopicStatus(topicId);
                localStorage.removeItem('fitgy_should_check_topic_status');
                clearInterval(checkInterval);
            }
        }, 2000);
        
        setTimeout(() => {
            clearInterval(checkInterval);
        }, 10000);
    }
    
    async function markTopicAsCompleted(topicId) {
        try {
            const { waitForAuthReady, updateTopicStatus } = await import('./auth-state.js');
            const user = await waitForAuthReady();
            
            console.log(`Пользователь: ${user ? 'авторизован' : 'не авторизован'}`);
            
            let saveSuccess = false;
            let completedCount = 0;
            
            const completeBtn = document.getElementById('mark-completed-btn');
            if (completeBtn) {
                completeBtn.disabled = true;
                completeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
            }
            
            if (!user) {
                let allCompletedTopics = JSON.parse(localStorage.getItem('fitgy_all_completed_topics') || '[]');
                console.log('Темы до сохранения:', allCompletedTopics);
                
                const validTopicIds = ['physio1', 'method1', 'safety1'];
                if (!validTopicIds.includes(topicId)) {
                    console.error(`Неверный ID темы: ${topicId}`);
                    if (completeBtn) {
                        completeBtn.disabled = false;
                        completeBtn.innerHTML = '<i class="fas fa-check-circle"></i> Отметить как изученное';
                    }
                    return;
                }
                
                if (!allCompletedTopics.includes(topicId)) {
                    allCompletedTopics.push(topicId);
                    allCompletedTopics = [...new Set(allCompletedTopics)]
                        .filter(id => validTopicIds.includes(id))
                        .slice(0, 3);
                        
                    localStorage.setItem('fitgy_all_completed_topics', JSON.stringify(allCompletedTopics));
                    saveSuccess = true;
                    completedCount = allCompletedTopics.length;
                    console.log('Прогресс сохранен в localStorage:', allCompletedTopics);
                    
                    sessionStorage.setItem(`fitgy_topic_${topicId}_completed`, 'true');
                    console.log('Сохранено в sessionStorage');
                } else {
                    console.log('Тема уже была изучена ранее');
                    saveSuccess = true;
                    completedCount = allCompletedTopics.length;
                }
            } else {
                console.log(`Обновление статуса темы ${topicId} в Firebase...`);
                const success = await updateTopicStatus(topicId, true);
                
                if (success) {
                    saveSuccess = true;
                    
                    const { getLearningStats } = await import('./auth-state.js');
                    const stats = await getLearningStats();
                    completedCount = stats?.completedTopics?.length || 0;
                    
                    console.log('Прогресс сохранен в Firebase, изучено тем:', completedCount);
                } else {
                    if (completeBtn) {
                        completeBtn.disabled = false;
                        completeBtn.innerHTML = '<i class="fas fa-check-circle"></i> Отметить как изученное';
                    }
                    return;
                }
            }
            
            if (saveSuccess) {
                const percent = Math.min(Math.round((completedCount / TOTAL_TOPICS) * 100), 100);
                
                document.getElementById('completion-section').style.display = 'none';
                document.getElementById('repeat-section').style.display = 'block';
                
                localStorage.setItem('fitgy_progress_updated', 'true');
                localStorage.setItem('fitgy_last_completed_topic', topicId);
                localStorage.setItem('fitgy_last_update_time', Date.now());
                localStorage.setItem('fitgy_should_check_topic_status', 'true');
                
                window.postMessage({ 
                    type: 'topicCompleted', 
                    topicId: topicId,
                    completedCount: completedCount,
                    percent: percent,
                    timestamp: Date.now()
                }, window.location.origin);
                
                setTimeout(() => {
                    window.location.href = '../training.html?updated=true&timestamp=' + Date.now() + '&topic=' + topicId;
                }, 1500);
                
            } else {
                if (completeBtn) {
                    completeBtn.disabled = false;
                    completeBtn.innerHTML = '<i class="fas fa-check-circle"></i> Отметить как изученное';
                }
            }
            
        } catch (error) {
            console.error('Ошибка при отметке темы:', error);
            
            const completeBtn = document.getElementById('mark-completed-btn');
            if (completeBtn) {
                completeBtn.disabled = false;
                completeBtn.innerHTML = '<i class="fas fa-check-circle"></i> Отметить как изученное';
            }
        }
    }
});