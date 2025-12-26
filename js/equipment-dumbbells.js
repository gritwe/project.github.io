import { waitForAuthReady } from './auth-state.js';

// Ожидаем готовности авторизации
document.addEventListener('DOMContentLoaded', async () => {
    await waitForAuthReady();
    
    // Инициализация страницы с гантелями
    initDumbbellsPage();
});

// Инициализация страницы с гантелями
function initDumbbellsPage() {
    // Устанавливаем специфичный заголовок
    updatePageTitle();
    
    // Добавляем анимации карточкам
    animateCards();
    
    // Инициализируем навигацию
    setupNavigation();
    
    // Добавляем специфичную функциональность для гантелей
    initDumbbellsFeatures();
}

// Обновление заголовка страницы
function updatePageTitle() {
    document.title = 'Гантели - полный обзор | FitGy';
}

// Анимация карточек с задержкой
function animateCards() {
    const cards = document.querySelectorAll('.type-card, .exercise-card, .characteristic-item');
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Настройка навигации
function setupNavigation() {
    const backButton = document.querySelector('.breadcrumbs a');
    if (backButton) {
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
    }
}

// Специфичная функциональность для страницы с гантелями
function initDumbbellsFeatures() {
    // Добавляем интерактивность характеристикам
    const characteristics = document.querySelectorAll('.characteristic-item');
    characteristics.forEach(item => {
        item.addEventListener('click', function() {
            this.classList.toggle('active');
        });
    });
    
    // Добавляем подсветку активного упражнения
    const exerciseCards = document.querySelectorAll('.exercise-card');
    exerciseCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 10px 30px rgba(0, 102, 255, 0.3)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.boxShadow = 'none';
        });
    });
    
    // Загружаем дополнительные данные о гантелях
    loadDumbbellsData();
}

// Загрузка данных о гантелях
async function loadDumbbellsData() {
    try {
        // Моковые данные для гантелей
        const dumbbellsData = {
            title: 'Гантели',
            description: 'Универсальный спортивный инвентарь',
            features: [
                'Развитие всех групп мышц',
                'Улучшение координации',
                'Повышение силы и выносливости'
            ],
            weightRanges: {
                beginner: '2-5 кг',
                intermediate: '5-15 кг',
                advanced: '15-30 кг+'
            }
        };
        
        // Можно использовать данные для динамического обновления страницы
        console.log('Данные гантелей загружены:', dumbbellsData);
        
        // Пример динамического обновления
        // updatePageWithData(dumbbellsData);
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// Инициализация при полной загрузке страницы
window.addEventListener('load', function() {
    // Показываем плавное появление контента
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// Экспорт функций для возможного использования в других модулях
export {
    initDumbbellsPage,
    loadDumbbellsData
};