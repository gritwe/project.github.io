import { waitForAuthReady } from './auth-state.js';

// Ожидаем готовности авторизации
document.addEventListener('DOMContentLoaded', async () => {
    await waitForAuthReady();
    
    // Данные инвентаря с реальными изображениями
const equipmentData = [
    {
        id: 1,
        name: "Гантели",
        description: "Самый универсальный силовой инвентарь для домашних и зальных тренировок. Развивают мышцы рук, груди, плеч и всего тела.",
        image: "../img/equipment/dumbbell.jpg",
        category: "gym",
        link: "equipment/dumbbell.html"
    },
    {
        id: 2,
        name: "Фитнес браслет",
        description: "Умный гаджет для отслеживания активности, пульса, сна и тренировочного прогресса. Синхронизируется со смартфоном.",
        image: "../img/equipment/fitness-band.jpg",
        category: "accessories",
        link: "equipment/fitness-band.html"
    },
    {
        id: 3,
        name: "Йога-мат",
        description: "Толстый нескользящий коврик для йоги, пилатеса и домашних тренировок с высокой амортизацией и поддержкой позвоночника.",
        image: "../img/equipment/yoga-mat.jpg",
        category: "home",
        link: "equipment/yoga-mat.html"
    },
    {
        id: 4,
        name: "Уличный турник",
        description: "Прочный уличный тренажер для воркаута, установки во дворе или на спортивной площадке. Развивает силу и выносливость.",
        image: "../img/equipment/outdoor-bar.jpg",
        category: "outdoor",
        link: "equipment/outdoor-bar.html"
    }
];

    
    // Элементы DOM
    const equipmentContainer = document.getElementById('equipment-container');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const pagination = document.getElementById('pagination');
    
    let currentFilter = 'all';
    let currentPage = 1;
    const itemsPerPage = 6;
    
    // Инициализация страницы
    function initPage() {
        renderEquipment();
        setupFilters();
        setupPagination();
    }
    
    // Рендер инвентаря
    function renderEquipment() {
        equipmentContainer.innerHTML = '';
        
        // Фильтрация данных
        let filteredData = equipmentData;
        if (currentFilter !== 'all') {
            filteredData = equipmentData.filter(item => item.category === currentFilter);
        }
        
        // Пагинация
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = filteredData.slice(startIndex, endIndex);
        
        // Если нет данных после фильтрации
        if (paginatedData.length === 0) {
            equipmentContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-dumbbell"></i>
                    <h3>Инвентарь не найден</h3>
                    <p>Попробуйте выбрать другую категорию</p>
                </div>
            `;
            return;
        }
        
        // Создание карточек
        paginatedData.forEach(item => {
            const card = document.createElement('div');
            card.className = 'equipment-card';
            card.dataset.category = item.category;
            
            // Генерация звезд рейтинга
            const stars = generateStars(item.rating);
            
            card.innerHTML = `
                <div class="equipment-image">
                    <img src="${item.image}" alt="${item.name}" class="equipment-photo" onerror="this.onerror=null; this.src='../img/equipment/default.jpg';">
                </div>
                <div class="equipment-content">
                    <span class="equipment-type">${getCategoryName(item.category)}</span>
                    <h3 class="equipment-title">${item.name}</h3>
                    <p class="equipment-description">${item.description}</p>
                </div>
            `;
            
            // Обработчик клика для перехода на страницу обзора
            if (item.link) {
                card.addEventListener('click', (e) => {
                    // Не переходить по ссылке если кликнули на кнопку (обрабатывается отдельно)
                    if (!e.target.closest('.equipment-button')) {
                        window.location.href = item.link;
                    }
                });
                card.style.cursor = 'pointer';
                
                // Обработчик для кнопки "Подробнее"
                const button = card.querySelector('.equipment-button');
                if (button) {
                    button.addEventListener('click', (e) => {
                        e.stopPropagation();
                        window.location.href = item.link;
                    });
                }
            }
            
            equipmentContainer.appendChild(card);
        });
    }
    
    // Генерация звезд рейтинга
    function generateStars(rating) {
        let stars = '';
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        
        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                stars += '<i class="fas fa-star"></i>';
            } else if (i === fullStars + 1 && hasHalfStar) {
                stars += '<i class="fas fa-star-half-alt"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        
        return stars;
    }
    
    // Получение названия категории
    function getCategoryName(category) {
        const categoryNames = {
            'home': 'Домашние',
            'outdoor': 'Уличные',
            'gym': 'Зал',
            'accessories': 'Аксессуары'
        };
        
        return categoryNames[category] || category;
    }
    
    // Настройка фильтров
    function setupFilters() {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Сброс активного класса
                filterButtons.forEach(btn => btn.classList.remove('active'));
                
                // Установка активного класса нажатой кнопке
                button.classList.add('active');
                
                // Обновление фильтра и сброс пагинации
                currentFilter = button.dataset.filter;
                currentPage = 1;
                
                // Перерисовка
                renderEquipment();
                setupPagination();
            });
        });
    }
    
    // Настройка пагинации
    function setupPagination() {
        pagination.innerHTML = '';
        
        // Фильтрация данных
        let filteredData = equipmentData;
        if (currentFilter !== 'all') {
            filteredData = equipmentData.filter(item => item.category === currentFilter);
        }
        
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        
        // Если страниц меньше 2, скрываем пагинацию
        if (totalPages < 2) {
            pagination.style.display = 'none';
            return;
        }
        
        pagination.style.display = 'flex';
        
        // Кнопка "Назад"
        const prevButton = document.createElement('button');
        prevButton.className = 'page-btn';
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderEquipment();
                setupPagination();
            }
        });
        pagination.appendChild(prevButton);
        
        // Кнопки с номерами страниц
        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                currentPage = i;
                renderEquipment();
                setupPagination();
            });
            pagination.appendChild(pageButton);
        }
        
        // Кнопка "Вперед"
        const nextButton = document.createElement('button');
        nextButton.className = 'page-btn';
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderEquipment();
                setupPagination();
            }
        });
        pagination.appendChild(nextButton);
    }
    
    // Запуск инициализации
    initPage();
});