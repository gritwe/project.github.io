import { waitForAuthReady } from './auth-state.js';

// Ожидаем готовности авторизации
document.addEventListener('DOMContentLoaded', async () => {
    await waitForAuthReady();
    
    // Инициализация страницы со штангой
    initBarbellPage();
});

// Инициализация страницы со штангой
function initBarbellPage() {
    // Устанавливаем специфичный заголовок
    updatePageTitle();
    
    // Добавляем анимации карточкам
    animateBarbellCards();
    
    // Инициализируем навигацию
    setupNavigation();
    
    // Добавляем специфичную функциональность для штанги
    initBarbellFeatures();
    
    // Загружаем данные о штангах
    loadBarbellData();
}

// Обновление заголовка страницы
function updatePageTitle() {
    document.title = 'Штанги - полный обзор | FitGy';
    
    // Добавляем историческую справку в заголовок
    const subtitle = document.querySelector('.equipment-subtitle');
    if (subtitle) {
        subtitle.innerHTML += ' <span style="color:#66a3ff;font-size:0.9em">(Используется с древнеегипетских времен)</span>';
    }
}

// Анимация карточек для страницы со штангой
function animateBarbellCards() {
    const cards = document.querySelectorAll('.type-card, .exercise-card, .characteristic-item');
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        // Добавляем задержку для каскадного эффекта
        setTimeout(() => {
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
            
            // Добавляем эффект "веса" для карточек со штангой
            if (card.classList.contains('type-card')) {
                card.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-10px) scale(1.02)';
                });
                
                card.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0) scale(1)';
                });
            }
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

// Специфичная функциональность для страницы со штангой
function initBarbellFeatures() {
    // Добавляем интерактивность характеристикам
    const characteristics = document.querySelectorAll('.characteristic-item');
    characteristics.forEach(item => {
        item.addEventListener('click', function() {
            this.classList.toggle('active');
            const icon = this.querySelector('.characteristic-icon i');
            if (this.classList.contains('active')) {
                icon.style.transform = 'rotate(180deg)';
                icon.style.transition = 'transform 0.3s ease';
            } else {
                icon.style.transform = 'rotate(0deg)';
            }
        });
    });
    
    // Добавляем подсветку активного упражнения
    const exerciseCards = document.querySelectorAll('.exercise-card');
    exerciseCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 15px 35px rgba(0, 102, 255, 0.25)';
            this.style.border = '1px solid rgba(0, 102, 255, 0.3)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.boxShadow = 'none';
            this.style.border = 'none';
        });
    });
    
    // Добавляем индикатор веса для типов штанг
    addWeightIndicators();
}

// Добавление индикаторов веса для разных типов штанг
function addWeightIndicators() {
    const weightData = {
        'Олимпийская штанга': { min: 15, max: 20, unit: 'кг' },
        'Пауэрлифтерская штанга': { min: 20, max: 20, unit: 'кг' },
        'Стандартная тренировочная': { min: 10, max: 20, unit: 'кг' }
    };
    
    document.querySelectorAll('.type-card h3').forEach(title => {
        const cardTitle = title.textContent;
        if (weightData[cardTitle]) {
            const weight = weightData[cardTitle];
            const indicator = document.createElement('div');
            indicator.className = 'weight-indicator';
            indicator.innerHTML = `
                <span style="color:#00cc66; font-size:12px; background:rgba(0,204,102,0.1); padding:2px 8px; border-radius:10px;">
                    <i class="fas fa-weight-hanging"></i> ${weight.min}-${weight.max}${weight.unit}
                </span>
            `;
            title.parentNode.insertBefore(indicator, title.nextSibling);
        }
    });
}

// Загрузка данных о штангах
async function loadBarbellData() {
    try {
        // Данные о штангах
        const barbellData = {
            title: 'Штанги',
            history: 'Первые упоминания появились в Древнем Египте, современный вид сформировался в Германии в середине 19 века',
            components: ['Гриф', 'Блины', 'Замки'],
            maxWeight: {
                olympic: '600 кг',
                powerlifting: '600 кг',
                training: '200-300 кг'
            }
        };
        
        console.log('Данные о штангах загружены:', barbellData);
        
        // Можно добавить динамическое обновление страницы
        // updateBarbellPage(barbellData);
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// Плавное появление страницы
window.addEventListener('load', function() {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
    
    // Добавляем эффект загрузки весов
    simulateWeightLoading();
});

// Симуляция загрузки весов (визуальный эффект)
function simulateWeightLoading() {
    const weightElements = document.querySelectorAll('.type-card, .exercise-card');
    weightElements.forEach((el, index) => {
        setTimeout(() => {
            el.style.animation = 'weightLoad 0.5s ease';
        }, index * 200);
    });
}

// Добавляем CSS анимацию для эффекта веса
const style = document.createElement('style');
style.textContent = `
    @keyframes weightLoad {
        0% { transform: scale(0.95); opacity: 0.8; }
        50% { transform: scale(1.02); }
        100% { transform: scale(1); opacity: 1; }
    }
    
    .weight-indicator {
        margin: 5px 0 10px 0;
    }
`;
document.head.appendChild(style);

// Экспорт функций для возможного использования в других модулях
export {
    initBarbellPage,
    loadBarbellData
};