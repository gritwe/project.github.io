// musciles_exercises.js
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, есть ли глобальная переменная exercisesData
    if (typeof window.exercisesData === 'undefined') {
        console.error('exercisesData не найден. Убедитесь, что exercises.js загружен перед этим файлом.');
        return;
    }

    const exercisesData = window.exercisesData;
    
    // DOM элементы
    const searchInput = document.getElementById('exercise-search');
    const searchBtn = document.getElementById('search-btn');
    const noResultsMessage = document.getElementById('no-results-message');
    const resultsCount = document.getElementById('search-results-count');
    const muscleGroupsContainer = document.querySelector('.muscle-groups');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Группировка мышц для отображения с иконками
    const muscleGroupConfig = {
        'Грудь': {
            category: 'upper',
            target: 'chest-exercises'
        },
        'Шея': {
            category: 'head',
            target: 'neck-exercises'
        },
        'Бицепс': {
            category: 'upper',
            target: 'biceps-exercises'
        },
        'Трицепс': {
            category: 'upper',
            target: 'triceps-exercises'
        },
        'Плечи': {
            category: 'upper',
            target: 'shoulders-exercises'
        },
        'Спина': {
            category: 'upper',
            target: 'back-exercises'
        },
        'Пресс': {
            category: 'core',
            target: 'abs-exercises'
        },
        'Ноги': {
            category: 'lower',
            target: 'legs-exercises'
        },
        'Предплечья': {
            category: 'upper',
            target: 'forearms-exercises'
        },
        'Разное': {
            category: 'fullbody',
            target: 'other-exercises'
        }
    };

    // Функция для получения ссылки на упражнение (используем englishTitle)
    function getExerciseLink(exercise) {
        if (exercise.englishTitle) {
            // Создаем ссылку на страницу в папке /exercise/
            return `../html/exercize/${exercise.englishTitle}.html`;
        }
        
        // Fallback на английский перевод названия
        const exerciseSlug = exercise.title.toLowerCase()
            .replace(/[^а-яa-z0-9\s]/g, '')
            .replace(/\s+/g, '_');
        return `..html/exercize/${exerciseSlug}.html`;
    }

    // Функция для получения пути к изображению
    function getExerciseImage(exercise) {
        const defaultImage = '../img/program/weight.jpg';
        
        if (exercise.englishTitle) {
            const imagePath = `../img/exercises/${exercise.englishTitle}.jpg`;
            // Можно добавить проверку существования изображения
            return imagePath;
        }
        
        const imageName = exercise.title.toLowerCase()
            .replace(/[^а-яa-z0-9\s]/g, '')
            .replace(/\s+/g, '-');
        return `../img/exercises/${imageName}.jpg`;
    }

    // Добавляем изображения и ссылки к упражнениям
    const enhancedExercises = exercisesData.map(exercise => ({
        ...exercise,
        image: getExerciseImage(exercise),
        link: getExerciseLink(exercise),
        sets: '3-4',
        reps: '8-12'
    }));

    // НОВЫЙ КОД: Проверка URL параметров
    function checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const muscleParam = urlParams.get('muscle');
        const highlightParam = urlParams.get('highlight');
        
        if (muscleParam) {
            // Автоматически открываем нужную группу мышц
            openMuscleGroup(muscleParam, highlightParam === 'true');
            
            // Если есть параметр highlight, добавляем особый стиль
            if (highlightParam === 'true') {
                highlightMuscleGroup(muscleParam);
            }
        }
    }

    // Функция открытия группы мышц
    function openMuscleGroup(muscleName, scrollToGroup = true) {
        // Ищем группу мышц по названию
        const targetGroup = Object.keys(muscleGroupConfig).find(
            key => key === muscleName || key.toLowerCase() === muscleName.toLowerCase()
        );
        
        if (!targetGroup) {
            console.log(`Группа мышц "${muscleName}" не найдена`);
            return;
        }
        
        // Находим соответствующий элемент в DOM
        const groupElement = document.querySelector(`.muscle-group[data-muscle="${targetGroup}"]`);
        if (!groupElement) {
            console.log(`Элемент группы мышц "${targetGroup}" не найден в DOM`);
            return;
        }
        
        // Прокручиваем к группе
        if (scrollToGroup) {
            setTimeout(() => {
                groupElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 300);
        }
        
        // Открываем группу
        setTimeout(() => {
            openGroupPanel(groupElement);
        }, 500);
        
        // Обновляем активный фильтр
        const groupCategory = groupElement.dataset.category;
        updateActiveFilter(groupCategory);
    }

    // Функция открытия панели группы
    function openGroupPanel(groupElement) {
        const header = groupElement.querySelector('.group-header');
        const panel = groupElement.querySelector('.exercises-panel');
        const arrow = header?.querySelector('.group-arrow i');
        
        if (!panel || !header) return;
        
        // Закрываем все другие панели
        document.querySelectorAll('.exercises-panel').forEach(p => {
            if (p !== panel && p.classList.contains('active')) {
                closeGroupPanel(p);
            }
        });
        
        // Открываем нужную панель
        if (!panel.classList.contains('active')) {
            header.classList.add('active');
            panel.classList.add('active');
            if (arrow) arrow.style.transform = 'rotate(180deg)';
            panel.style.maxHeight = panel.scrollHeight + 'px';
        }
    }

    // Функция закрытия панели группы
    function closeGroupPanel(panel) {
        const header = panel.previousElementSibling;
        const arrow = header?.querySelector('.group-arrow i');
        
        panel.classList.remove('active');
        panel.style.maxHeight = '0';
        
        if (header && header.classList.contains('group-header')) {
            header.classList.remove('active');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
    }

    // Функция подсветки группы мышц
    function highlightMuscleGroup(muscleName) {
        const targetGroup = Object.keys(muscleGroupConfig).find(
            key => key === muscleName || key.toLowerCase() === muscleName.toLowerCase()
        );
        
        if (!targetGroup) return;
        
        const groupElement = document.querySelector(`.muscle-group[data-muscle="${targetGroup}"]`);
        if (!groupElement) return;
        
        // Добавляем класс подсветки
        groupElement.classList.add('highlighted-group');
        
        // Убираем подсветку через 5 секунд
        setTimeout(() => {
            groupElement.classList.remove('highlighted-group');
        }, 5000);
        
        // Добавляем стили для подсветки
        if (!document.getElementById('group-highlight-styles')) {
            const style = document.createElement('style');
            style.id = 'group-highlight-styles';
            style.textContent = `
                .muscle-group.highlighted-group {
                    border: 2px solid #005fff !important;
                    box-shadow: 0 0 20px rgba(0, 95, 255, 0.3) !important;
                    animation: pulse-highlight 2s infinite !important;
                }
                
                @keyframes pulse-highlight {
                    0% { box-shadow: 0 0 10px rgba(0, 95, 255, 0.3); }
                    50% { box-shadow: 0 0 20px rgba(0, 95, 255, 0.6); }
                    100% { box-shadow: 0 0 10px rgba(0, 95, 255, 0.3); }
                }
                
                .muscle-group.highlighted-group .group-header {
                    background: rgba(0, 95, 255, 0.1) !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Функция обновления активного фильтра
    function updateActiveFilter(category) {
        filterButtons.forEach(btn => {
            if (btn.dataset.filter === category) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Применяем фильтр
        applyFilter(category);
    }

    // Инициализация упражнений при загрузке
    initializePage();

    // Проверяем URL параметры после инициализации
    setTimeout(checkUrlParameters, 800);

    // Обработчики событий
    if (searchInput) {
        searchInput.addEventListener('input', debounce(performSearch, 300));
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') performSearch();
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.dataset.filter;
            applyFilter(filter);
            
            if (searchInput) {
                searchInput.value = '';
                resultsCount.style.display = 'none';
                resultsCount.textContent = '';
            }
            noResultsMessage.classList.add('hidden');
        });
    });

    // Функция инициализации страницы
    function initializePage() {
        createMuscleGroups();
        loadAllExercises();
        setupAccordionListeners();
    }

    // Функция создания групп мышц в HTML
    function createMuscleGroups() {
        muscleGroupsContainer.innerHTML = '';
        
        // Создаем группы только для тех мышц, которые есть в данных
        const uniqueMuscleGroups = [...new Set(enhancedExercises.map(ex => ex.muscleGroup))];
        
        uniqueMuscleGroups.forEach(muscleName => {
            const config = muscleGroupConfig[muscleName] || {
                icon: 'fas fa-dumbbell',
                category: 'other',
                target: `${muscleName.toLowerCase().replace(/\s+/g, '-')}-exercises`
            };
            
            const groupElement = document.createElement('div');
            groupElement.className = 'muscle-group';
            groupElement.dataset.category = config.category;
            groupElement.dataset.muscle = muscleName;
            
            // Подсчитываем количество упражнений для этой мышцы
            const exercisesCount = enhancedExercises.filter(ex => ex.muscleGroup === muscleName).length;
            
            groupElement.innerHTML = `
                <div class="group-header" data-target="${config.target}">
                    <div class="group-info">
                        <h3 class="group-title">${muscleName}</h3>
                        <p class="group-count">${exercisesCount} упражнений</p>
                    </div>
                    <div class="group-arrow"><i class="fas fa-chevron-down"></i></div>
                </div>
                <div class="exercises-panel" id="${config.target}">
                    <div class="exercises-grid"></div>
                </div>
            `;
            
            muscleGroupsContainer.appendChild(groupElement);
        });
    }

    // Настройка аккордеона для раскрытия/скрытия панелей
    function setupAccordionListeners() {
        document.querySelectorAll('.group-header').forEach(header => {
            header.addEventListener('click', function() {
                const targetId = this.dataset.target;
                const targetPanel = document.getElementById(targetId);
                const arrow = this.querySelector('.group-arrow i');
                
                // Если панель уже активна, закрываем её
                if (targetPanel.classList.contains('active')) {
                    targetPanel.classList.remove('active');
                    this.classList.remove('active');
                    arrow.style.transform = 'rotate(0deg)';
                    // Устанавливаем max-height обратно в 0
                    setTimeout(() => {
                        targetPanel.style.maxHeight = '0';
                    }, 10);
                } else {
                    // Закрываем все другие панели
                    document.querySelectorAll('.exercises-panel').forEach(panel => {
                        if (panel !== targetPanel && panel.classList.contains('active')) {
                            panel.classList.remove('active');
                            panel.style.maxHeight = '0';
                            const otherHeader = panel.previousElementSibling;
                            if (otherHeader && otherHeader.classList.contains('group-header')) {
                                otherHeader.classList.remove('active');
                                const otherArrow = otherHeader.querySelector('.group-arrow i');
                                if (otherArrow) otherArrow.style.transform = 'rotate(0deg)';
                            }
                        }
                    });
                    
                    // Открываем выбранную панель
                    this.classList.add('active');
                    targetPanel.classList.add('active');
                    arrow.style.transform = 'rotate(180deg)';
                    
                    // Рассчитываем нужную высоту для плавной анимации
                    const scrollHeight = targetPanel.scrollHeight;
                    targetPanel.style.maxHeight = scrollHeight + 'px';
                }
            });
        });
    }

    // Функция загрузки всех упражнений
    function loadAllExercises() {
        const groupedExercises = groupExercisesByMuscle(enhancedExercises);
        
        document.querySelectorAll('.muscle-group').forEach(group => {
            const muscleName = group.dataset.muscle;
            const exercises = groupedExercises[muscleName] || [];
            
            updateMuscleGroup(group, exercises);
        });
    }

    // Функция группировки упражнений по мышцам
    function groupExercisesByMuscle(exercises) {
        const groups = {};
        exercises.forEach(exercise => {
            if (!groups[exercise.muscleGroup]) {
                groups[exercise.muscleGroup] = [];
            }
            groups[exercise.muscleGroup].push(exercise);
        });
        return groups;
    }

    // Функция обновления группы мышц
    function updateMuscleGroup(group, exercises) {
        const countElement = group.querySelector('.group-count');
        if (countElement) {
            countElement.textContent = `${exercises.length} упражнений`;
        }
        
        const grid = group.querySelector('.exercises-grid');
        if (grid) {
            grid.innerHTML = ''; // Очищаем сетку
            
            exercises.forEach(exercise => {
                const card = createExerciseCard(exercise);
                grid.appendChild(card);
            });
        }
    }

    // Функция поиска
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        noResultsMessage.classList.add('hidden');
        resultsCount.style.display = 'none';
        resultsCount.textContent = '';
        
        if (searchTerm.length === 0) {
            loadAllExercises();
            document.querySelectorAll('.muscle-group').forEach(group => {
                group.style.display = '';
            });
            return;
        }
        
        const filteredExercises = enhancedExercises.filter(exercise => 
            exercise.title.toLowerCase().includes(searchTerm) ||
            exercise.description.toLowerCase().includes(searchTerm) ||
            exercise.muscleGroup.toLowerCase().includes(searchTerm) ||
            exercise.equipment.toLowerCase().includes(searchTerm) ||
            (exercise.englishTitle && exercise.englishTitle.toLowerCase().includes(searchTerm))
        );
        
        if (filteredExercises.length > 0) {
            resultsCount.textContent = `Найдено упражнений: ${filteredExercises.length}`;
            resultsCount.style.display = 'block';
        } else {
            resultsCount.style.display = 'none';
        }
        
        const groupedResults = groupExercisesByMuscle(filteredExercises);
        let visibleGroups = 0;
        
        // Сначала закрываем ВСЕ панели
        document.querySelectorAll('.exercises-panel').forEach(panel => {
            panel.classList.remove('active');
            panel.style.maxHeight = '0';
        });
        document.querySelectorAll('.group-header').forEach(header => {
            header.classList.remove('active');
            const arrow = header.querySelector('.group-arrow i');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        });
        
        // Показываем только группы с результатами поиска
        document.querySelectorAll('.muscle-group').forEach(group => {
            const muscleName = group.dataset.muscle;
            const exercises = groupedResults[muscleName];
            
            if (exercises && exercises.length > 0) {
                group.style.display = '';
                visibleGroups++;
                updateMuscleGroupWithHighlight(group, exercises, searchTerm);
                
                // АВТОМАТИЧЕСКИ РАСКРЫВАЕМ ВСЕ найденные группы
                const panel = group.querySelector('.exercises-panel');
                const header = group.querySelector('.group-header');
                const arrow = header.querySelector('.group-arrow i');
                
                if (panel && header) {
                    // Открываем панель
                    header.classList.add('active');
                    panel.classList.add('active');
                    arrow.style.transform = 'rotate(180deg)';
                    const scrollHeight = panel.scrollHeight;
                    panel.style.maxHeight = scrollHeight + 'px';
                }
            } else {
                group.style.display = 'none';
            }
        });
        
        if (visibleGroups === 0) {
            noResultsMessage.classList.remove('hidden');
        }
    }

    // Функция обновления группы с подсветкой
    function updateMuscleGroupWithHighlight(group, exercises, searchTerm) {
        const countElement = group.querySelector('.group-count');
        if (countElement) {
            countElement.textContent = `${exercises.length} упражнений`;
        }
        
        const grid = group.querySelector('.exercises-grid');
        if (grid) {
            grid.innerHTML = ''; // Очищаем сетку
            
            exercises.forEach(exercise => {
                const card = createExerciseCardWithHighlight(exercise, searchTerm);
                grid.appendChild(card);
            });
        }
    }

    // Функция создания карточки упражнения
    function createExerciseCard(exercise) {
        const card = document.createElement('a');
        card.href = exercise.link;
        card.className = 'exercise-card';
        card.target = "_blank"; // Открывать в новой вкладке
        
        const difficultyClass = getDifficultyClass(exercise.difficulty);
        const difficultyText = getDifficultyText(exercise.difficulty);

        card.innerHTML = `
            <div class="exercise-img">
                <img src="${exercise.image}" alt="${exercise.title}" onerror="this.src='../img/program/weight.jpg'">
                <div class="difficulty ${difficultyClass}">${difficultyText}</div>
            </div>
            <div class="exercise-content">
                <h4>${escapeHtml(exercise.title)}</h4>
                <p>${escapeHtml(exercise.description)}</p>
                <div class="exercise-meta">
                    <span class="equipment-label">${exercise.equipment}</span>
                </div>
            </div>
        `;
        
        return card;
    }

    // Функция создания карточки с подсветкой
    function createExerciseCardWithHighlight(exercise, searchTerm) {
        const card = document.createElement('a');
        card.href = exercise.link;
        card.className = 'exercise-card';
        card.target = "_blank"; // Открывать в новой вкладке
        
        const difficultyClass = getDifficultyClass(exercise.difficulty);
        const difficultyText = getDifficultyText(exercise.difficulty);
        
        let highlightedTitle = highlightText(exercise.title, searchTerm);
        let highlightedDescription = highlightText(exercise.description, searchTerm);

        card.innerHTML = `
            <div class="exercise-img">
                <img src="${exercise.image}" alt="${exercise.title}" onerror="this.src='../img/program/weight.jpg'">
                <div class="difficulty ${difficultyClass}">${difficultyText}</div>
            </div>
            <div class="exercise-content">
                <h4>${highlightedTitle}</h4>
                <p>${highlightedDescription}</p>
                <div class="exercise-meta">
                    <span class="equipment-label">${exercise.equipment}</span>
                </div>
            </div>
        `;
        
        return card;
    }

    // Функция подсветки текста
    function highlightText(text, term) {
        if (!term) return escapeHtml(text);
        
        const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
        return escapeHtml(text).replace(regex, '<span class="search-highlight">$1</span>');
    }

    // Функция применения фильтра
    function applyFilter(category) {
        document.querySelectorAll('.muscle-group').forEach(group => {
            if (category === 'all') {
                group.style.display = '';
            } else {
                const groupCategory = group.dataset.category;
                group.style.display = groupCategory === category ? '' : 'none';
            }
        });
        
        // Закрываем все панели при смене фильтра
        document.querySelectorAll('.exercises-panel').forEach(panel => {
            panel.classList.remove('active');
            panel.style.maxHeight = '0';
        });
        document.querySelectorAll('.group-header').forEach(header => {
            header.classList.remove('active');
            const arrow = header.querySelector('.group-arrow i');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        });
    }

    // Вспомогательные функции
    function getDifficultyClass(difficulty) {
        switch(difficulty) {
            case 'easy': return 'difficulty-easy';
            case 'medium': return 'difficulty-medium';
            case 'hard': return 'difficulty-hard';
            default: return 'difficulty-medium';
        }
    }

    function getDifficultyText(difficulty) {
        switch(difficulty) {
            case 'easy': return 'Начальный';
            case 'medium': return 'Средний';
            case 'hard': return 'Продвинутый';
            default: return 'Средний';
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
});