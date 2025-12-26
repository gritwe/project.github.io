document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const productsContainer = document.getElementById('productsContainer');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    const productCount = document.getElementById('productCount');
    const noResults = document.getElementById('noResults');
    const sortButtons = document.querySelectorAll('.sort-btn');
    const categoryFilter = document.getElementById('categoryFilter');
    const activeFilters = document.getElementById('activeFilters');
    const pagination = document.getElementById('pagination');
    
    // Настройки
    const ITEMS_PER_PAGE = 20;
    
    let products = [];
    let filteredProducts = [];
    let currentSort = 'name';
    let currentPage = 1;
    let selectedCategories = [];
    let allCategories = {};
    
    // Текстовые названия категорий (только для фильтров)
    const categoryNames = {
        'egg': 'Яйца',
        'berry': 'Ягоды',
        'bread': 'Хлеб',
        'fruit': 'Фрукты',
        'raw': 'Сырое',
        'cheese': 'Сыр',
        'snack': 'Закуски',
        'sea': 'Морепродукты',
        'nut': 'Орехи',
        'vegetable': 'Овощи',
        'beef': 'Говядина',
        'meal': 'Готовые блюда',
        'milk': 'Молоко',
        'butter': 'Масло',
        'cereals': 'Крупы',
        'sausage': 'Колбаса',
        'mushroom': 'Грибы',
        'cake': 'Торт',
        'icecream': 'Мороженое',
        'tort': 'Торты',
        'chocolate': 'Шоколад',
        'alcohol': 'Алкоголь',
        'drink': 'Напитки',
        'juice': 'Соки',
        'salad': 'Салаты',
        'soup': 'Супы',
        'burger-king': 'Burger King',
        'kfc': 'KFC',
        'mcdonalds': 'McDonald\'s',
        'japan': 'Японская кухня',
        'baby': 'Детское питание',
        'sport': 'Спортивное питание'
    };
    
    // Иконки для категорий (только для плашек продуктов)
    const categoryIcons = {
        'egg': '🥚',
        'berry': '🫐',
        'bread': '🍞',
        'fruit': '🍎',
        'raw': '🥬',
        'cheese': '🧀',
        'snack': '🍿',
        'sea': '🐟',
        'nut': '🥜',
        'vegetable': '🥦',
        'beef': '🥩',
        'meal': '🍲',
        'milk': '🥛',
        'butter': '🧈',
        'cereals': '🌾',
        'sausage': '🌭',
        'mushroom': '🍄',
        'cake': '🍰',
        'icecream': '🍦',
        'tort': '🎂',
        'chocolate': '🍫',
        'alcohol': '🍷',
        'drink': '🥤',
        'juice': '🧃',
        'salad': '🥗',
        'soup': '🍜',
        'burger-king': '🍔',
        'kfc': '🍗',
        'mcdonalds': '🍟',
        'japan': '🍣',
        'baby': '👶',
        'sport': '💪'
    };
    
    // Загрузка продуктов из JSON
    async function loadProducts() {
        try {
            const response = await fetch('../product.json');
            if (!response.ok) throw new Error('Не удалось загрузить продукты');
            
            products = await response.json();
            
            // Подсчитываем продукты по категориям
            calculateCategoryCounts();
            
            // Инициализируем фильтры
            filteredProducts = [...products];
            
            updateProductCount();
            renderCategories();
            renderProducts();
            renderPagination();
        } catch (error) {
            console.error('Ошибка загрузки продуктов:', error);
            showErrorMessage();
        }
    }
    
    // Подсчет продуктов по категориям
    function calculateCategoryCounts() {
        allCategories = {};
        
        products.forEach(product => {
            const category = product.category;
            if (!allCategories[category]) {
                allCategories[category] = 0;
            }
            allCategories[category]++;
        });
    }
    
    // Отображение ошибки
    function showErrorMessage() {
        productsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Не удалось загрузить продукты</h3>
                <p>Попробуйте обновить страницу</p>
            </div>
        `;
    }
    
    // Рендеринг категорий (текстовые с серым фоном и центрированием)
    function renderCategories() {
        const categories = Object.keys(allCategories).sort();
        
        const categoriesHTML = categories.map(category => `
            <button class="category-btn ${selectedCategories.includes(category) ? 'active' : ''}" 
                    data-category="${category}"
                    title="${categoryNames[category] || category}">
                <span class="category-name">${categoryNames[category] || category}</span>
                <span class="category-count">${allCategories[category]}</span>
            </button>
        `).join('');
        
        categoryFilter.innerHTML = categoriesHTML;
        
        // Добавляем обработчики кликов
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const category = this.dataset.category;
                toggleCategory(category);
            });
        });
    }
    
    // Рендеринг продуктов (только иконки категорий)
    function renderProducts() {
        if (filteredProducts.length === 0) {
            productsContainer.innerHTML = '';
            noResults.classList.remove('hidden');
            return;
        }
        
        noResults.classList.add('hidden');
        
        // Пагинация
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const productsToShow = filteredProducts.slice(startIndex, endIndex);
        
        const productsHTML = productsToShow.map(product => `
            <div class="product-card">
                <div class="product-header">
                    <div class="product-name-container">
                        <h3 class="product-name" title="${product.name}">${product.name}</h3>
                    </div>
                    <div class="product-category-icon" title="${categoryNames[product.category] || product.category}">
                        ${categoryIcons[product.category] || '🥗'}
                    </div>
                </div>
                
                <div class="nutrition-values">
                    <div class="nutrition-item">
                        <span class="nutrition-value protein">${product.proteins.toFixed(1)}g</span>
                        <span class="nutrition-label">Белки</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="nutrition-value fat">${product.fats.toFixed(1)}g</span>
                        <span class="nutrition-label">Жиры</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="nutrition-value carbs">${product.carbs.toFixed(1)}g</span>
                        <span class="nutrition-label">Углеводы</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="nutrition-value calories">${Math.round(product.calories)}</span>
                        <span class="nutrition-label">Ккал</span>
                    </div>
                </div>
                
                <div class="product-calories">
                    <span class="calories-badge">
                        ${Math.round(product.calories)} ккал на 100г
                    </span>
                </div>
            </div>
        `).join('');
        
        productsContainer.innerHTML = productsHTML;
    }
    
    // Рендеринг пагинации
    function renderPagination() {
        const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = `
            <button class="page-btn prev" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Отображаем первые страницы
        for (let i = 1; i <= Math.min(5, totalPages); i++) {
            paginationHTML += `
                <button class="page-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }
        
        // Пропускаем, если много страниц
        if (totalPages > 7 && currentPage > 4) {
            paginationHTML += `<span class="page-dots">...</span>`;
            
            const start = Math.max(currentPage - 1, 6);
            const end = Math.min(currentPage + 1, totalPages - 1);
            
            for (let i = start; i <= end; i++) {
                if (i > 5 && i < totalPages) {
                    paginationHTML += `
                        <button class="page-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">
                            ${i}
                        </button>
                    `;
                }
            }
        }
        
        // Последние страницы
        if (totalPages > 6) {
            paginationHTML += `
                <button class="page-btn ${currentPage === totalPages ? 'active' : ''}" data-page="${totalPages}">
                    ${totalPages}
                </button>
            `;
        }
        
        paginationHTML += `
            <button class="page-btn next" ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        pagination.innerHTML = paginationHTML;
        
        // Обработчики пагинации
        document.querySelectorAll('.page-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', function() {
                const page = parseInt(this.dataset.page);
                goToPage(page);
            });
        });
        
        document.querySelector('.page-btn.prev')?.addEventListener('click', () => goToPage(currentPage - 1));
        document.querySelector('.page-btn.next')?.addEventListener('click', () => goToPage(currentPage + 1));
    }
    
    // Переключение категории
    function toggleCategory(category) {
        const index = selectedCategories.indexOf(category);
        
        if (index === -1) {
            selectedCategories.push(category);
        } else {
            selectedCategories.splice(index, 1);
        }
        
        filterProducts();
        renderCategories();
        updateActiveFilters();
        currentPage = 1;
        renderPagination();
    }
    
    // Фильтрация продуктов
    function filterProducts() {
        let filtered = [...products];
        
        // Поиск по названию
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(searchTerm)
            );
        }
        
        // Фильтрация по категориям
        if (selectedCategories.length > 0) {
            filtered = filtered.filter(product =>
                selectedCategories.includes(product.category)
            );
        }
        
        filteredProducts = filtered;
        sortProducts(currentSort);
        updateProductCount();
        renderProducts();
    }
    
    // Сортировка продуктов
    function sortProducts(sortType) {
        filteredProducts.sort((a, b) => {
            switch(sortType) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'calories':
                    return b.calories - a.calories;
                case 'proteins':
                    return b.proteins - a.proteins;
                case 'fats':
                    return b.fats - a.fats;
                case 'carbs':
                    return b.carbs - a.carbs;
                default:
                    return 0;
            }
        });
        currentSort = sortType;
    }
    
    // Обновление счетчика продуктов
    function updateProductCount() {
        const total = products.length;
        const showing = filteredProducts.length;
        
        if (showing === total) {
            productCount.textContent = `Всего продуктов: ${total}`;
        } else {
            productCount.textContent = `Найдено: ${showing} из ${total}`;
        }
    }
    
    // Обновление активных фильтров
    function updateActiveFilters() {
        if (selectedCategories.length === 0) {
            activeFilters.innerHTML = '';
            return;
        }
        
        const filtersHTML = selectedCategories.map(category => `
            <div class="filter-tag" title="${categoryNames[category] || category}">
                <span class="filter-icon">${categoryIcons[category] || '🥗'}</span>
                <span class="filter-text">${categoryNames[category] || category}</span>
                <span class="remove" data-category="${category}">×</span>
            </div>
        `).join('');
        
        activeFilters.innerHTML = filtersHTML;
        
        // Обработчики удаления фильтров
        document.querySelectorAll('.filter-tag .remove').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const category = this.dataset.category;
                toggleCategory(category);
            });
        });
    }
    
    // Очистка поиска
    function clearSearch() {
        searchInput.value = '';
        filterProducts();
        searchInput.focus();
    }
    
    // Переход на страницу
    function goToPage(page) {
        const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
        
        if (page < 1 || page > totalPages) return;
        
        currentPage = page;
        renderProducts();
        renderPagination();
        
        // Прокрутка к началу списка продуктов
        productsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Инициализация сортировки
    function initSorting() {
        sortButtons.forEach(button => {
            button.addEventListener('click', function() {
                const sortBy = this.dataset.sort;
                
                // Обновляем активную кнопку
                sortButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // Сортируем и рендерим
                sortProducts(sortBy);
                currentPage = 1;
                renderProducts();
                renderPagination();
            });
        });
    }
    
    // Инициализация поиска
    function initSearch() {
        // Поиск при вводе
        searchInput.addEventListener('input', function() {
            filterProducts();
            currentPage = 1;
            renderPagination();
        });
        
        // Очистка поиска
        clearSearchBtn.addEventListener('click', clearSearch);
        
        // Очистка при нажатии Escape
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                clearSearch();
            }
        });
    }
    
    // Инициализация страницы
    function init() {
        loadProducts();
        initSearch();
        initSorting();
    }
    
    // Запуск
    init();
});