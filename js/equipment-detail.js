import { waitForAuthReady } from './auth-state.js';

// Ожидаем готовности авторизации
document.addEventListener('DOMContentLoaded', async () => {
    await waitForAuthReady();
    
    // Инициализация страницы (базовая)
    initEquipmentPage();
});

// Инициализация страницы (базовая)
function initEquipmentPage() {
    // Получаем тип инвентаря из URL
    const equipmentType = getEquipmentTypeFromPath();
    
    // Устанавливаем заголовок страницы
    updatePageTitle(equipmentType);
    
    // Устанавливаем иконку для основного изображения
    updateMainIcon(equipmentType);
    
    // Инициализируем базовую навигацию
    setupBaseNavigation();
}

// Получение типа инвентаря из пути
function getEquipmentTypeFromPath() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    
    if (filename.includes('dumbbells')) return 'Гантели';
    if (filename.includes('treadmill')) return 'Беговые дорожки';
    if (filename.includes('barbell')) return 'Штанги';
    
    const equipmentName = filename.replace('equipment-', '').replace('.html', '');
    
    // Преобразуем название в читаемый формат
    const nameMap = {
        'barbell': 'Штанги',
        'dumbbells': 'Гантели',
        'kettlebell': 'Гири',
        'treadmill': 'Беговые дорожки',
        'elliptical': 'Эллиптические тренажеры',
        'cycle-trainer': 'Велотренажеры',
        'pullup-bar': 'Турники и брусья',
        'resistance-bands': 'Эспандеры',
        'yoga-mat': 'Коврики для йоги',
        'foam-roller': 'Роллеры для массажа',
        'step-platform': 'Степ-платформы',
        'jump-rope': 'Скакалки',
        'power-rack': 'Силовые рамы'
    };
    
    return nameMap[equipmentName] || equipmentName;
}

// Обновление заголовка страницы
function updatePageTitle(equipmentType) {
    if (equipmentType) {
        document.title = `${equipmentType} - FitGy`;
        
        const h1 = document.querySelector('.equipment-detail-title h1');
        if (h1 && h1.textContent === 'Оборудование') {
            h1.textContent = equipmentType;
        }
    }
}

// Обновление иконки в основном изображении
function updateMainIcon(equipmentType) {
    const iconMap = {
        'Штанги': 'fa-weight-hanging',
        'Гантели': 'fa-dumbbell',
        'Гири': 'fa-weight',
        'Беговые дорожки': 'fa-running',
        'Эллиптические тренажеры': 'fa-walking',
        'Велотренажеры': 'fa-bicycle',
        'Турники и брусья': 'fa-hands',
        'Эспандеры': 'fa-expand-arrows-alt',
        'Коврики для йоги': 'fa-th-large',
        'Роллеры для массажа': 'fa-roller',
        'Степ-платформы': 'fa-stairs',
        'Скакалки': 'fa-sync-alt',
        'Силовые рамы': 'fa-cube'
    };
    
    const placeholder = document.querySelector('.image-placeholder i');
    if (placeholder && iconMap[equipmentType]) {
        placeholder.className = `fas ${iconMap[equipmentType]} fa-6x`;
    }
}

// Базовая навигация
function setupBaseNavigation() {
    const backButton = document.querySelector('.breadcrumbs a');
    if (backButton && !backButton.hasAttribute('data-listener')) {
        backButton.setAttribute('data-listener', 'true');
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '../equipment.html';
        });
    }
}

// Базовая анимация карточек (может быть переопределена)
function animateBaseCards() {
    const cards = document.querySelectorAll('.type-card, .exercise-card, .safety-item');
    
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

// Экспорт функций для использования в специфичных файлах
export {
    getEquipmentTypeFromPath,
    updatePageTitle,
    updateMainIcon,
    animateBaseCards,
    setupBaseNavigation,
    waitForAuthReady
};