// Данные о времени восстановления мышц (в часах)
const muscleRecoveryTime = {
    "Грудь": 48,
    "Ноги": 72,
    "Бицепс": 24,
    "Трицепс": 48,
    "Спина": 72,
    "Пресс": 24,
    "Плечи": 48,
    "Предплечья": 24,
    "Шея": 48
};

// Дни недели для расписания
const weekDays = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
const monthDays = Array.from({length: 28}, (_, i) => `День ${i + 1}`);

// Функция для получения безопасного имени файла
function getSafeFileName(text) {
    if (!text) return 'exercise';
    
    let result = text.trim();
    
    // Убираем лишние символы и заменяем пробелы на _
    result = result
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    
    if (!result) {
        result = 'exercise_' + Math.random().toString(36).substr(2, 9);
    }
    
    return result;
}

// Генератор программ тренировок (28 дней)
class WorkoutGenerator {
    constructor(exercises, userLevel = "Средний", equipment = ["Штанга", "Гантели", "Тренажеры", "Без оборудования"]) {
        this.exercises = exercises;
        this.userLevel = userLevel;
        this.equipment = equipment;
        this.repRanges = this.getRepRange();
        this.usedExercises = new Set();
        this.exercisePool = [];
        
        // Нормализуем названия оборудования для сравнения
        this.equipment = this.equipment.map(eq => this.normalizeEquipmentName(eq));
        
        // Создаем пул доступных упражнений
        this.createExercisePool();
    }

    // Создание пула упражнений
    createExercisePool() {
        console.log("Создание пула упражнений...");
        
        // Основной пул - точные совпадения по оборудованию
        this.exercisePool = this.exercises.filter(ex => {
            const exerciseEquipment = this.normalizeEquipmentName(ex.equipment);
            return this.equipment.includes(exerciseEquipment);
        });
        
        console.log(`Основной пул: ${this.exercisePool.length} упражнений`);
        
        // Если упражнений мало, добавляем совместимые
        if (this.exercisePool.length < 50) {
            console.log("Добавляем совместимые упражнения...");
            
            // Добавляем упражнения без оборудования, если есть турник/брусья
            if (this.equipment.includes("Турник/брусья")) {
                const bodyweightExercises = this.exercises.filter(ex => 
                    this.normalizeEquipmentName(ex.equipment) === "Без оборудования"
                );
                
                bodyweightExercises.forEach(ex => {
                    if (!this.exercisePool.some(e => e.title === ex.title)) {
                        const adaptedExercise = {
                            ...ex,
                            description: `${ex.description} (адаптировано для тренировок с турником)`
                        };
                        this.exercisePool.push(adaptedExercise);
                    }
                });
            }
        }
        
        // Если все еще мало, добавляем базовые упражнения
        if (this.exercisePool.length < 30) {
            console.log("Добавляем базовые упражнения...");
            this.addBasicExercises();
        }
        
        // Группируем упражнения по группам мышц
        this.exercisePoolByMuscle = {};
        this.exercisePool.forEach(ex => {
            if (!this.exercisePoolByMuscle[ex.muscleGroup]) {
                this.exercisePoolByMuscle[ex.muscleGroup] = [];
            }
            this.exercisePoolByMuscle[ex.muscleGroup].push(ex);
        });
    }

    // Добавление базовых упражнений
    addBasicExercises() {
        const basicExercises = [
            // Турник/брусья упражнения
            {
                id: 1001,
                title: "Подтягивания широким хватом",
                englishTitle: "wide_grip_pull_ups",
                description: "Базовое упражнение для ширины спины на турнике",
                muscleGroup: "Спина",
                category: "upper",
                difficulty: "medium",
                equipment: "Турник/брусья",
                icon: "fas fa-arrows-alt-h"
            },
            {
                id: 1002,
                title: "Подтягивания обратным хватом",
                englishTitle: "reverse_grip_pull_ups",
                description: "Для толщины спины и бицепса на турнике",
                muscleGroup: "Бицепс",
                category: "upper",
                difficulty: "medium",
                equipment: "Турник/брусья",
                icon: "fas fa-retweet"
            },
            {
                id: 1003,
                title: "Отжимания на брусьях (грудь)",
                englishTitle: "dips",
                description: "Акцент на грудные мышцы, наклон корпуса вперед",
                muscleGroup: "Грудь",
                category: "upper",
                difficulty: "medium",
                equipment: "Турник/брусья",
                icon: "fas fa-people-arrows"
            },
            {
                id: 1004,
                title: "Отжимания на брусьях (трицепс)",
                englishTitle: "close_grip_dips",
                description: "Акцент на трицепс, корпус вертикально",
                muscleGroup: "Трицепс",
                category: "upper",
                difficulty: "medium",
                equipment: "Турник/брусья",
                icon: "fas fa-people-arrows"
            },
            {
                id: 1005,
                title: "Подъем ног в висе",
                englishTitle: "hanging_leg_raises",
                description: "Лучшее упражнение для пресса на турнике",
                muscleGroup: "Пресс",
                category: "core",
                difficulty: "hard",
                equipment: "Турник/брусья",
                icon: "fas fa-arrow-up"
            },
            // Без оборудования
            {
                id: 1006,
                title: "Отжимания от пола",
                englishTitle: "push_ups",
                description: "Базовое упражнение для грудных мышц",
                muscleGroup: "Грудь",
                category: "upper",
                difficulty: "easy",
                equipment: "Без оборудования",
                icon: "fas fa-hands"
            },
            {
                id: 1007,
                title: "Отжимания с узкой постановкой",
                englishTitle: "close_grip_push_ups_triceps",
                description: "Для трицепса и внутренней части груди",
                muscleGroup: "Трицепс",
                category: "upper",
                difficulty: "medium",
                equipment: "Без оборудования",
                icon: "fas fa-compress-arrows-alt"
            },
            {
                id: 1008,
                title: "Скручивания на пресс",
                englishTitle: "crunches",
                description: "Базовое упражнение для прямой мышцы живота",
                muscleGroup: "Пресс",
                category: "core",
                difficulty: "easy",
                equipment: "Без оборудования",
                icon: "fas fa-sync-alt"
            },
            {
                id: 1009,
                title: "Приседания",
                englishTitle: "squats",
                description: "Базовое упражнение для ног и ягодиц",
                muscleGroup: "Ноги",
                category: "lower",
                difficulty: "easy",
                equipment: "Без оборудования",
                icon: "fas fa-arrows-alt-v"
            },
            {
                id: 1010,
                title: "Выпады",
                englishTitle: "lunges",
                description: "Для ног, ягодиц и баланса",
                muscleGroup: "Ноги",
                category: "lower",
                difficulty: "medium",
                equipment: "Без оборудования",
                icon: "fas fa-football-ball"
            }
        ];
        
        basicExercises.forEach(ex => {
            if (!this.exercisePool.some(e => e.title === ex.title)) {
                this.exercisePool.push(ex);
            }
        });
    }

    // Диапазон повторений в зависимости от уровня
    getRepRange() {
        const ranges = {
            "Новичок": { min: 12, max: 15, sets: 3, rest: "60-90 сек" },
            "Средний": { min: 8, max: 12, sets: 4, rest: "90-120 сек" },
            "Продвинутый": { min: 5, max: 8, sets: 4, rest: "120-180 сек" }
        };
        return ranges[this.userLevel] || ranges["Средний"];
    }

    // Нормализация названия оборудования для сравнения
    normalizeEquipmentName(equipmentName) {
        const mapping = {
            "Турник/брусья": "Турник/брусья",
            "турник/брусья": "Турник/брусья",
            "Турник": "Турник/брусья",
            "Брусья": "Турник/брусья",
            "турник": "Турник/брусья",
            "брусья": "Турник/брусья",
            "Эспандеры": "Эспандеры",
            "эспандеры": "Эспандеры",
            "Эспандер": "Эспандеры",
            "эспандер": "Эспандеры",
            "Гири": "Гири",
            "гири": "Гири",
            "Гиря": "Гири",
            "гиря": "Гири",
            "Штанга": "Штанга",
            "штанга": "Штанга",
            "Гантели": "Гантели",
            "гантели": "Гантели",
            "Тренажеры": "Тренажеры",
            "тренажеры": "Тренажеры",
            "Без оборудования": "Без оборудования",
            "без оборудования": "Без оборудования",
            "Собственный вес": "Без оборудования",
            "Тело": "Без оборудования"
        };
        
        return mapping[equipmentName] || equipmentName;
    }

    // Получение englishTitle для упражнения
    getExerciseEnglishTitle(exercise) {
        // Пробуем найти упражнение в оригинальных данных
        let originalExercise = null;
        
        if (window.exercisesData) {
            originalExercise = window.exercisesData.find(ex => 
                ex.id === exercise.id || 
                ex.title === exercise.title ||
                (exercise.englishTitle && ex.englishTitle === exercise.englishTitle)
            );
        }
        
        if (originalExercise && originalExercise.englishTitle) {
            return originalExercise.englishTitle;
        }
        
        // Если не нашли, используем то, что есть в упражнении
        if (exercise.englishTitle) {
            return exercise.englishTitle;
        }
        
        // Запасной вариант - создаем из title
        return getSafeFileName(exercise.title);
    }

    // Фильтр упражнений по группе мышц и оборудованию
    filterExercises(muscleGroup, count = 2, dayNumber = 1) {
        let availableExercises = this.exercisePoolByMuscle[muscleGroup] || [];
        
        let unusedExercises = availableExercises.filter(ex => 
            !this.usedExercises.has(ex.title)
        );
        
        if (unusedExercises.length < count) {
            unusedExercises = availableExercises;
        }
        
        if (unusedExercises.length < count && muscleGroup !== "Разное") {
            if (muscleGroup === "Грудь") {
                const chestAlternatives = (this.exercisePoolByMuscle["Плечи"] || []).filter(ex => 
                    !this.usedExercises.has(ex.title)
                );
                unusedExercises = [...unusedExercises, ...chestAlternatives];
            }
            
            if (muscleGroup === "Спина") {
                const backAlternatives = (this.exercisePoolByMuscle["Предплечья"] || []).filter(ex => 
                    !this.usedExercises.has(ex.title)
                );
                unusedExercises = [...unusedExercises, ...backAlternatives];
            }
        }
        
        this.sortExercisesByDifficulty(unusedExercises, dayNumber);
        const selected = this.getRandomItems(unusedExercises, Math.min(count, unusedExercises.length));
        selected.forEach(ex => this.usedExercises.add(ex.title));
        
        return selected;
    }

    // Сортировка упражнений по сложности
    sortExercisesByDifficulty(exercises, dayNumber) {
        if (exercises.length === 0) return;
        
        const weekNumber = Math.ceil(dayNumber / 7);
        
        if (this.userLevel === "Новичок") {
            exercises.sort((a, b) => {
                const difficultyOrder = { "easy": 1, "medium": 2, "hard": 3 };
                return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
            });
        } else if (this.userLevel === "Продвинутый") {
            exercises.sort((a, b) => {
                const difficultyOrder = { "easy": 3, "medium": 2, "hard": 1 };
                return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
            });
        } else {
            exercises.sort(() => Math.random() - 0.5);
        }
        
        if (weekNumber >= 3) {
            exercises.sort((a, b) => {
                const difficultyOrder = { "easy": 3, "medium": 2, "hard": 1 };
                return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
            });
        }
    }

    // Выбор случайных элементов из массива
    getRandomItems(arr, n) {
        if (arr.length <= n) return [...arr];
        return arr.slice(0, n);
    }

    // Генерация одного дня программы
    generateDay(dayNumber, type, totalDays = 28) {
        const weekNumber = Math.ceil(dayNumber / 7);
        const progressionFactor = {
            sets: Math.min(4, this.repRanges.sets + Math.floor((weekNumber - 1) / 2)),
            repsMin: Math.max(5, this.repRanges.min - (weekNumber - 1)),
            repsMax: Math.max(8, this.repRanges.max - (weekNumber - 1))
        };

        const dayOfWeek = (dayNumber - 1) % 7;
        let dayFocus = "";
        let exercises = [];

        if (this.equipment.includes("Турник/брусья") && this.equipment.length <= 2) {
            dayFocus = this.getTurboFriendlyFocus(dayOfWeek, type);
            exercises = this.generateTurboFriendlyDay(dayFocus, dayNumber);
        } else {
            switch(type) {
                case "Фуллбади":
                    dayFocus = "Все тело";
                    exercises = this.generateFullBodyDay(dayNumber);
                    break;
                case "Сплит":
                    dayFocus = this.getSplitFocus(dayOfWeek);
                    exercises = this.generateSplitDay(dayFocus, dayNumber);
                    break;
                case "Верх/Низ":
                    dayFocus = dayOfWeek % 2 === 0 ? "Верх тела" : "Низ тела";
                    exercises = this.generateUpperLowerDay(dayFocus, dayNumber);
                    break;
                case "Тяни/Толкай":
                    dayFocus = this.getPushPullFocus(dayOfWeek);
                    exercises = this.generatePushPullDay(dayFocus, dayNumber);
                    break;
                default:
                    dayFocus = "Сплит";
                    exercises = this.generateSplitDay("Грудь + Бицепс", dayNumber);
            }
        }

        if (this.isRestDay(dayNumber, type)) {
            return {
                dayNumber: dayNumber,
                dayName: monthDays[dayNumber - 1],
                focus: "Отдых",
                exercises: [],
                progression: progressionFactor,
                isRestDay: true
            };
        }

        return {
            dayNumber: dayNumber,
            dayName: monthDays[dayNumber - 1],
            focus: dayFocus,
            exercises: exercises,
            progression: progressionFactor,
            isRestDay: false
        };
    }

    // Фокус для тренировок с турником/брусьями
    getTurboFriendlyFocus(dayOfWeek, type) {
        const turboSplit = [
            "Грудь + Трицепс",
            "Спина + Бицепс", 
            "Ноги + Пресс",
            "Плечи + Пресс",
            "Грудь + Трицепс",
            "Спина + Бицепс",
            "Отдых"
        ];
        return turboSplit[dayOfWeek];
    }

    // Генерация дня для турника/брусьев
    generateTurboFriendlyDay(focus, dayNumber) {
        const exercises = [];
        const muscleGroups = {};
        
        if (focus.includes("Грудь")) muscleGroups["Грудь"] = 3;
        if (focus.includes("Трицепс")) muscleGroups["Трицепс"] = 2;
        if (focus.includes("Спина")) muscleGroups["Спина"] = 3;
        if (focus.includes("Бицепс")) muscleGroups["Бицепс"] = 2;
        if (focus.includes("Ноги")) muscleGroups["Ноги"] = 2;
        if (focus.includes("Плечи")) muscleGroups["Плечи"] = 2;
        if (focus.includes("Пресс")) muscleGroups["Пресс"] = 2;
        
        Object.entries(muscleGroups).forEach(([muscle, count]) => {
            exercises.push(...this.filterExercises(muscle, count, dayNumber));
        });
        
        return exercises;
    }

    // Определение фокуса для сплита
    getSplitFocus(dayOfWeek) {
        const splitCycle = [
            "Грудь + Бицепс",
            "Спина + Трицепс",
            "Ноги + Плечи",
            "Грудь + Бицепс",
            "Спина + Трицепс",
            "Ноги + Плечи",
            "Отдых"
        ];
        return splitCycle[dayOfWeek];
    }

    // Определение фокуса для тяни/толкай
    getPushPullFocus(dayOfWeek) {
        const pushPullCycle = [
            "Толкай (Грудь, Плечи, Трицепс)",
            "Тяни (Спина, Бицепс, Предплечья)",
            "Ноги",
            "Толкай (Грудь, Плечи, Трицепс)",
            "Тяни (Спина, Бицепс, Предплечья)",
            "Ноги",
            "Отдых"
        ];
        return pushPullCycle[dayOfWeek];
    }

    // Проверка дня отдыха
    isRestDay(dayNumber, type) {
        const dayOfWeek = (dayNumber - 1) % 7;
        if (dayOfWeek === 6) return true;
        if (type === "Сплит" && dayNumber % 4 === 0) return true;
        if (type === "Тяни/Толкай" && dayNumber % 4 === 0) return true;
        return false;
    }

    // Генерация Фуллбади дня
    generateFullBodyDay(dayNumber) {
        const exercises = [];
        const muscleGroups = {
            "Грудь": 1, "Спина": 1, "Ноги": 1, "Плечи": 1,
            "Бицепс": 1, "Трицепс": 1, "Пресс": 1
        };
        
        Object.entries(muscleGroups).forEach(([muscle, count]) => {
            exercises.push(...this.filterExercises(muscle, count, dayNumber));
        });
        
        return exercises;
    }

    // Генерация Сплит дня
    generateSplitDay(focus, dayNumber) {
        const exercises = [];
        const muscleGroups = {};
        
        if (focus.includes("Грудь")) muscleGroups["Грудь"] = 3;
        if (focus.includes("Бицепс")) muscleGroups["Бицепс"] = 2;
        if (focus.includes("Спина")) muscleGroups["Спина"] = 3;
        if (focus.includes("Трицепс")) muscleGroups["Трицепс"] = 2;
        if (focus.includes("Ноги")) muscleGroups["Ноги"] = 4;
        if (focus.includes("Плечи")) muscleGroups["Плечи"] = 2;
        muscleGroups["Пресс"] = 1;
        
        Object.entries(muscleGroups).forEach(([muscle, count]) => {
            exercises.push(...this.filterExercises(muscle, count, dayNumber));
        });
        
        return exercises;
    }

    // Генерация Верх/Низ дня
    generateUpperLowerDay(focus, dayNumber) {
        const exercises = [];
        
        if (focus === "Верх тела") {
            const muscleGroups = {
                "Грудь": 2, "Спина": 2, "Плечи": 1,
                "Бицепс": 1, "Трицепс": 1
            };
            
            Object.entries(muscleGroups).forEach(([muscle, count]) => {
                exercises.push(...this.filterExercises(muscle, count, dayNumber));
            });
        } else {
            const muscleGroups = { "Ноги": 3, "Пресс": 2 };
            Object.entries(muscleGroups).forEach(([muscle, count]) => {
                exercises.push(...this.filterExercises(muscle, count, dayNumber));
            });
        }
        
        return exercises;
    }

    // Генерация Тяни/Толкай дня
    generatePushPullDay(focus, dayNumber) {
        const exercises = [];
        
        if (focus.includes("Толкай")) {
            const muscleGroups = {
                "Грудь": 2, "Плечи": 2, "Трицепс": 2, "Пресс": 1
            };
            
            Object.entries(muscleGroups).forEach(([muscle, count]) => {
                exercises.push(...this.filterExercises(muscle, count, dayNumber));
            });
        } else if (focus.includes("Тяни")) {
            const muscleGroups = {
                "Спина": 3, "Бицепс": 2, "Предплечья": 1
            };
            
            Object.entries(muscleGroups).forEach(([muscle, count]) => {
                exercises.push(...this.filterExercises(muscle, count, dayNumber));
            });
        } else {
            const muscleGroups = { "Ноги": 4, "Пресс": 1 };
            Object.entries(muscleGroups).forEach(([muscle, count]) => {
                exercises.push(...this.filterExercises(muscle, count, dayNumber));
            });
        }
        
        return exercises;
    }

    // Основная функция генерации программы
    generateProgram(type = "Сплит", totalDays = 28) {
        console.log(`Генерация программы: ${type}, уровень: ${this.userLevel}`);
        
        this.usedExercises.clear();
        const days = [];
        
        for (let dayNumber = 1; dayNumber <= totalDays; dayNumber++) {
            days.push(this.generateDay(dayNumber, type, totalDays));
        }

        return {
            type: type,
            level: this.userLevel,
            days: days,
            totalDays: totalDays,
            createdAt: new Date().toISOString(),
            status: "active",
            equipment: this.equipment,
            workoutStatus: {}
        };
    }
}

// Основной класс приложения
class WorkoutApp {
    constructor() {
        this.generator = null;
        this.currentProgram = null;
        this.selectedDayNumber = 1;
        this.hasSavedProgram = false;
        this.isInitialized = false;
        this.workoutStatus = {};
        this.isUserLoggedIn = false;
        this.hasSavedProgramInFirebase = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log("Инициализация приложения...");
        
        this.setupEventListeners();
        this.populateRecoveryTable();
        
        try {
            // Сначала скрываем все секции
            this.hideAllContent();
            
            // 1. Проверяем авторизацию
            const isLoggedIn = await this.checkAuthStatus();
            
            if (isLoggedIn) {
                console.log("Пользователь авторизован, пытаемся загрузить программу");
                
                // Пытаемся загрузить сохраненную программу
                const hasProgram = await this.loadUserProgram();
                
                if (hasProgram && this.currentProgram) {
                    console.log("✅ Загружена сохраненная программа");
                    // ПОКАЗЫВАЕМ РЕЗУЛЬТАТЫ, НЕ ФОРМУ
                    this.showResultsSection();
                    this.displayProgram();
                    this.isInitialized = true;
                    return;
                }
            }
            
            // Если не авторизован или нет сохраненной программы - показываем форму
            console.log("Показываем форму для создания программы");
            this.showSetupSection();
            
        } catch (error) {
            console.error("Ошибка при инициализации:", error);
            // При ошибке показываем форму
            this.showSetupSection();
        }
        
        this.isInitialized = true;
    }

// Скрыть все контентные блоки
    hideAllContent() {
        const setupSection = document.getElementById('setupSection');
        const resultsSection = document.getElementById('resultsSection');
        
        if (setupSection) setupSection.classList.add('hidden');
        if (resultsSection) resultsSection.classList.add('hidden');
    }

// Показать секцию настройки
    showSetupSection() {
        const setupSection = document.getElementById('setupSection');
        const resultsSection = document.getElementById('resultsSection');
        
        if (setupSection) setupSection.classList.remove('hidden');
        if (resultsSection) resultsSection.classList.add('hidden');
    }

// Показать секцию результатов
    showResultsSection() {
        const setupSection = document.getElementById('setupSection');
        const resultsSection = document.getElementById('resultsSection');
        
        if (setupSection) setupSection.classList.add('hidden');
        if (resultsSection) resultsSection.classList.remove('hidden');
    }
    

    async checkAuthStatus() {
        try {
            const authModule = await import('./auth-state.js');
            
            // Используем прямое обращение к auth
            if (authModule.auth && authModule.auth.currentUser) {
                this.isUserLoggedIn = true;
                return true;
            }
            
            // Если нет текущего пользователя, ждем
            const user = await Promise.race([
                authModule.waitForAuthReady(),
                new Promise(resolve => setTimeout(() => resolve(null), 3000))
            ]);
            
            this.isUserLoggedIn = !!user;
            return this.isUserLoggedIn;
            
        } catch (error) {
            console.error("Ошибка проверки авторизации:", error);
            this.isUserLoggedIn = false;
            return false;
        }
    }


    async determineWhatToShow() {
        if (this.isUserLoggedIn) {
            // Пользователь авторизован, пытаемся загрузить сохраненную программу
            const hasProgram = await this.loadUserProgram();
            
            if (hasProgram) {
                // У пользователя есть сохраненная программа - показываем календарь
                this.showResultsSection();
            } else {
                // У пользователя нет сохраненной программы - показываем форму
                this.showSetupSection();
            }
        } else {
            // Пользователь не авторизован - показываем форму
            this.showSetupSection();
        }
    }

    async loadUserProgram() {
        try {
            console.log("Попытка загрузить сохраненную программу...");
            
            const authModule = await import('../js/auth-state.js');
            const savedProgram = await authModule.loadWorkoutProgram();
            
            if (savedProgram && savedProgram.userId) {
                console.log("Программа загружена:", savedProgram);
                this.currentProgram = savedProgram;
                this.hasSavedProgram = true;
                this.hasSavedProgramInFirebase = true;
                
                // Загружаем статус тренировок
                await this.loadWorkoutStatus();
                
                // Восстанавливаем выбранный день
                const savedDay = localStorage.getItem('fitgy_selectedDay');
                if (savedDay) {
                    this.selectedDayNumber = parseInt(savedDay);
                }
                
                console.log("У пользователя есть сохраненная программа");
                return true;
            }
            
            console.log("У пользователя нет сохраненной программы");
            this.currentProgram = null;
            this.hasSavedProgram = false;
            this.hasSavedProgramInFirebase = false;
            return false;
            
        } catch (error) {
            console.error("Ошибка при загрузке программы:", error);
            this.currentProgram = null;
            this.hasSavedProgram = false;
            this.hasSavedProgramInFirebase = false;
            return false;
        }
    }

    setupEventListeners() {
        console.log("Настройка обработчиков событий...");
        
        // Кнопка генерации программы
        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                console.log("Кнопка генерации нажата");
                this.generateNewProgram();
            });
        }
        
        console.log("Обработчики событий установлены");
    }

    populateRecoveryTable() {
        const tbody = document.getElementById('recoveryTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        Object.entries(muscleRecoveryTime).forEach(([muscle, hours]) => {
            const row = document.createElement('tr');
            
            let frequency = "";
            if (hours <= 24) {
                frequency = "Каждый день";
            } else if (hours <= 48) {
                frequency = "1-2 раза в неделю";
            } else {
                frequency = "1 раз в неделю";
            }
            
            // Определяем правильное окончание для слова "час"
            let hoursText = `${hours} час`;
            if (hours === 1) {
                hoursText = `${hours} час`;
            } else if (hours >= 2 && hours <= 4) {
                hoursText = `${hours} часа`;
            } else if (hours >= 5 && hours <= 20) {
                hoursText = `${hours} часов`;
            } else {
                // Для чисел больше 20 определяем по последней цифре
                const lastDigit = hours % 10;
                const lastTwoDigits = hours % 100;
                
                if (lastTwoDigits >= 11 && lastTwoDigits <= 20) {
                    hoursText = `${hours} часов`;
                } else if (lastDigit === 1) {
                    hoursText = `${hours} час`;
                } else if (lastDigit >= 2 && lastDigit <= 4) {
                    hoursText = `${hours} часа`;
                } else {
                    hoursText = `${hours} часов`;
                }
            }
            
            row.innerHTML = `
                <td><strong>${muscle}</strong></td>
                <td><span class="recovery-time">${hoursText}</span></td>
                <td>${frequency}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    // Генерация новой программы
    generateNewProgram() {
        try {
            console.log("Генерация новой программы...");
            
            // Собираем параметры из формы
            const programType = document.getElementById('programType').value;
            const userLevel = document.getElementById('userLevel').value;
            
            // Собираем выбранное оборудование
            const equipment = [];
            const equipmentLabels = {
                1: 'Штанга',
                2: 'Гантели',
                3: 'Тренажеры',
                4: 'Без оборудования',
                5: 'Турник/брусья',
                6: 'Гири',
                7: 'Эспандеры'
            };
            
            for (let i = 1; i <= 7; i++) {
                const checkbox = document.getElementById(`equip${i}`);
                if (checkbox && checkbox.checked) {
                    equipment.push(equipmentLabels[i]);
                }
            }
            
            // Проверяем, что хотя бы одно оборудование выбрано
            if (equipment.length === 0) {
                this.showErrorMessage('Пожалуйста, выберите хотя бы один тип оборудования');
                return;
            }
            
            console.log("Параметры программы:", {
                programType,
                userLevel,
                equipment
            });
            
            // Проверяем, что exercisesData доступна
            if (!window.exercisesData) {
                console.error("Exercises data не найдена!");
                this.showErrorMessage("Ошибка: данные упражнений не загружены");
                return;
            }
            
            // Создаем генератор
            this.generator = new WorkoutGenerator(
                window.exercisesData,
                userLevel,
                equipment
            );
            
            // Генерируем программу
            this.currentProgram = this.generator.generateProgram(programType, 28);
            this.selectedDayNumber = 1;
            this.hasSavedProgram = false;
            this.hasSavedProgramInFirebase = false;
            
            console.log("Программа успешно сгенерирована");
            
            // Показываем секцию с результатами
            this.showResultsSection();
            
            // Отображаем программу
            this.displayProgram();
            
            
            
        } catch (error) {
            console.error("Ошибка при генерации программы:", error);
            this.showErrorMessage("❌ Ошибка при генерации программы: " + error.message);
        }
    }

    showResultsSection() {
        const setupSection = document.getElementById('setupSection');
        const resultsSection = document.getElementById('resultsSection');
        
        if (setupSection) {
            setupSection.classList.add('hidden');
        }
        if (resultsSection) {
            resultsSection.classList.remove('hidden');
        }
        
        // Отображаем программу
        if (this.currentProgram) {
            this.displayProgram();
        }
    }

    

    async displayProgram() {
        const output = document.getElementById('programOutput');
        if (!output) {
            console.error("Элемент programOutput не найден!");
            return;
        }
        
        output.innerHTML = '';
        
        if (!this.currentProgram || !this.currentProgram.days || this.currentProgram.days.length === 0) {
            output.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Программа не сгенерирована</h3>
                    <p>Настройте параметры и нажмите "Сгенерировать программу"</p>
                </div>
            `;
            return;
        }
        
        try {
            // Загружаем статус тренировок
            await this.loadWorkoutStatus();
        } catch (error) {
            console.log("Не удалось загрузить статус тренировок:", error);
        }
        
        // Сохраняем выбранный день в localStorage
        try {
            localStorage.setItem('fitgy_selectedDay', this.selectedDayNumber.toString());
        } catch (e) {
            console.log("Не удалось сохранить в localStorage:", e);
        }
        
        const selectedDay = this.currentProgram.days[this.selectedDayNumber - 1];
        let html = '';
        
        html += this.createProgramControls();
        // УДАЛИТЬ ЭТУ СТРОКУ ↓
        // html += this.createDayTitle(selectedDay);
        html += this.createDayNavigation();
        html += this.createProgramSummary(selectedDay);
        
        if (selectedDay.isRestDay) {
            html += this.createRestDay(selectedDay);
        } else if (selectedDay.exercises.length > 0) {
            html += this.createWorkoutDay(selectedDay);
        }
        
        html += this.createProgressStats();
        html += this.createTrainingPrinciples(selectedDay.dayNumber);
        
        output.innerHTML = html;
        this.addProgramControlsListeners();
    }

    createDayTitle(day) {
        return `
            <div class="day-title-section">
                <h2><i class="fas fa-dumbbell"></i> ${day.dayName}</h2>
                <p class="day-focus">${day.focus}</p>
            </div>
        `;
    }

    createProgramControls() {
        const saveIcon = this.hasSavedProgramInFirebase ? 'fa-check' : 'fa-save';
        const saveText = this.hasSavedProgramInFirebase ? 'Сохранено' : 'Сохранить программу';
        const saveClass = this.hasSavedProgramInFirebase ? 'saved' : '';
        
        return `
            <div class="program-controls">
                ${!this.hasSavedProgramInFirebase ? `
                <button id="saveProgramBtn" class="btn save-btn ${saveClass}">
                    <i class="fas ${saveIcon}"></i> ${saveText}
                </button>
                ` : ''}
                <button id="editProgramBtn" class="btn edit-btn">
                    <i class="fas fa-edit"></i> ${this.hasSavedProgramInFirebase ? 'Создать новую программу' : 'Изменить параметры'}
                </button>
            </div>
        `;
    }

    // Навигация между днями
    createDayNavigation() {
        const isFirstDay = this.selectedDayNumber === 1;
        const isLastDay = this.selectedDayNumber === 28;
        
        return `
            <div class="day-navigation-centered">
                <button id="prevDayBtn" class="nav-btn-circle prev-btn" ${isFirstDay ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
                
                <div class="day-selector-centered">
                    <div class="day-info">
                        <span class="day-number">День ${this.selectedDayNumber}</span>
                        <span class="day-total">/ 28</span>
                    </div>
                    <select id="daySelect" class="day-select-centered">
                        ${this.currentProgram.days.map((day, index) => `
                            <option value="${index + 1}" ${index + 1 === this.selectedDayNumber ? 'selected' : ''}>
                                ${day.dayName} - ${day.focus}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <button id="nextDayBtn" class="nav-btn-circle next-btn" ${isLastDay ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }

    createProgressStats() {
        const completedDays = Object.values(this.workoutStatus).filter(s => s.completed).length;
        const remainingDays = 28 - completedDays;
        const currentStreak = this.calculateCurrentStreak();
        
        return `
            <div class="progress-stats">
                <h3><i class="fas fa-chart-bar"></i> Статистика выполнения</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value">${completedDays}</div>
                        <div class="stat-label">Выполнено дней</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${remainingDays}</div>
                        <div class="stat-label">Осталось дней</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${currentStreak}</div>
                        <div class="stat-label">Текущая серия</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${this.currentProgram.type}</div>
                        <div class="stat-label">Тип программы</div>
                    </div>
                </div>
            </div>
        `;
    }

    calculateCurrentStreak() {
        let streak = 0;
        for (let i = this.selectedDayNumber; i >= 1; i--) {
            const status = this.workoutStatus[`day${i}`];
            if (status && status.completed) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    createProgramSummary(day) {
        const { type, level } = this.currentProgram;
        const { progression } = day;
        
        const todayStatus = this.workoutStatus[`day${day.dayNumber}`];
        const isCompleted = todayStatus && todayStatus.completed;
        const completedClass = isCompleted ? 'completed' : '';
        
        // Показываем кнопку отметки для ВСЕХ дней, включая отдых
        const completeButton = `
            <div class="completion-section">
                <button id="completeWorkoutBtn" class="btn complete-btn ${completedClass}">
                    <i class="fas ${isCompleted ? 'fa-check-circle' : 'fa-check'}"></i>
                    ${isCompleted ? 'День выполнен' : 'Отметить как выполненный'}
                </button>
                ${isCompleted && todayStatus.completedAt ? `
                <div class="completion-time">
                    <i class="fas fa-clock"></i>
                    Выполнено: ${new Date(todayStatus.completedAt).toLocaleDateString('ru-RU')}
                </div>
                ` : ''}
            </div>
        `;
        
        return `
            <div class="day-info-header">
                <div class="day-title">
                    <h2><i class="fas fa-dumbbell"></i> ${day.dayName} - ${day.focus}</h2>
                    <p class="day-description">${day.isRestDay ? 'День активного восстановления' : 'Тренировочный день'}</p>
                </div>
                ${completeButton}
            </div>
            
            <div class="program-summary">
                <div class="summary-item">
                    <div class="summary-value">${type}</div>
                    <div class="summary-label">Тип программы</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${level}</div>
                    <div class="summary-label">Уровень</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${progression.repsMin}-${progression.repsMax}</div>
                    <div class="summary-label">${this.getRepetitionWord(progression.repsMax)}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${progression.sets}</div>
                    <div class="summary-label">${this.getSetWord(progression.sets)}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">День ${day.dayNumber}/28</div>
                    <div class="summary-label">Прогресс</div>
                </div>
            </div>
        `;
    }
    getRepetitionWord(count) {
        if (count % 10 === 1 && count % 100 !== 11) {
            return 'повторение';
        } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
            return 'повторения';
        } else {
            return 'повторений';
        }
    }

    getSetWord(count) {
        if (count % 10 === 1 && count % 100 !== 11) {
            return 'подход';
        } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
            return 'подхода';
        } else {
            return 'подходов';
        }
    }
    createWorkoutDay(day) {
        const progression = day.progression;
        
        let exercisesHtml = '';
        
        day.exercises.forEach((exercise, exIndex) => {
            // Получаем englishTitle для формирования ссылки
            let fileName = '';
            
            // Пробуем найти оригинальное упражнение в базе данных
            let originalExercise = null;
            if (window.exercisesData) {
                originalExercise = window.exercisesData.find(ex => 
                    ex.id === exercise.id || 
                    ex.title === exercise.title ||
                    (exercise.englishTitle && ex.englishTitle === exercise.englishTitle)
                );
            }
            
            // Используем englishTitle из оригинала, если есть
            if (originalExercise && originalExercise.englishTitle) {
                fileName = originalExercise.englishTitle;
            } else if (exercise.englishTitle) {
                fileName = exercise.englishTitle;
            } else {
                // Запасной вариант - создаем из title
                fileName = getSafeFileName(exercise.title);
            }
            
            // Формируем ссылку на упражнение
            const exerciseLink = `../html/exercize/${fileName}.html`;
            
            exercisesHtml += `
                <div class="exercise">
                    <div class="exercise-number">${exIndex + 1}</div>
                    <div class="exercise-details">
                        <div class="exercise-title">
                            <span class="exercise-name">${exercise.title}</span>
                            <a href="${exerciseLink}" class="exercise-btn" target="_blank">
                                <i class="fas fa-external-link-alt"></i> Перейти к упражнению
                            </a>
                        </div>
                        <div class="exercise-description">${exercise.description}</div>
                        <div class="exercise-meta">
                            <span class="meta-tag muscle-group">
                                ${exercise.muscleGroup}
                            </span>
                            <span class="meta-tag equipment">
                                ${exercise.equipment}
                            </span>
                            <span class="meta-tag difficulty ${exercise.difficulty}">
                                ${exercise.difficulty === 'easy' ? 'Легко' : 
                                exercise.difficulty === 'medium' ? 'Средне' : 'Сложно'}
                            </span>
                            <span class="meta-tag reps">
                                ${this.getSetText(progression.sets)} × 
                                ${this.getRepetitionText(progression.repsMin, progression.repsMax)}
                            </span>
                            ${day.dayNumber >= 14 ? `
                            <span class="meta-tag progression">
                                Прогрессия
                            </span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        return `
            <div class="workout-day">
                <div class="workout-exercises">
                    ${exercisesHtml}
                </div>
                <div class="workout-tips">
                    <p><i class="fas fa-lightbulb"></i> <strong>Совет дня ${day.dayNumber}:</strong> Отдых между подходами: ${this.currentProgram.level === 'Новичок' ? '60-90 сек' : this.currentProgram.level === 'Средний' ? '90-120 сек' : '120-180 сек'}</p>
                    <p><i class="fas fa-heartbeat"></i> <strong>Восстановление:</strong> Пульс должен успокоиться до 100 уд/мин перед следующим подходом</p>
                    <p><i class="fas fa-info-circle"></i> <strong>Совет:</strong> Нажмите на кнопку "Подробнее" для подробной информации об упражнении</p>
                </div>
            </div>
        `;
    }

    createRestDay(day) {
        return `
            <div class="workout-day rest-day">
                <div class="rest-content">
                    <div class="rest-icon">
                        <i class="fas fa-spa"></i>
                    </div>
                    <div class="rest-text">
                        <h4>День активного восстановления</h4>
                        <p>В этот день рекомендуется:</p>
                        <ul>
                            <li>Легкая кардионагрузка (ходьба, велосипед 20-30 минут)</li>
                            <li>Растяжка всех групп мышц (10-15 минут)</li>
                            <li>Мобильность суставов</li>
                            <li>Массаж или сауна</li>
                            <li>Полноценный сон 7-9 часов</li>
                        </ul>
                        <p class="rest-note"><i class="fas fa-info-circle"></i> Восстановление так же важно, как и тренировки!</p>
                    </div>
                </div>
            </div>
        `;
    }

    createTrainingPrinciples(dayNumber) {
        const weekNumber = Math.ceil(dayNumber / 7);
        const tips = [
            "Каждая тренировка должна быть достаточно интенсивной",
            "Соблюдайте время восстановления между тренировками",
            "Придерживайтесь расписания тренировок",
            "Каждые 2-3 недели увеличивайте нагрузку"
        ];
        
        const weekTips = [
            "Неделя 1: Освоение техники и привыкание к нагрузке",
            "Неделя 2: Увеличение рабочего веса на 5-10%",
            "Неделя 3: Добавление 1-2 подходов к основным упражнениям",
            "Неделя 4: Максимальная интенсивность перед отдыхом"
        ];
        
        return `
        `;
    }

    addProgramControlsListeners() {
        // Кнопка сохранения
        const saveBtn = document.getElementById('saveProgramBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                console.log("Кнопка сохранения нажата");
                await this.saveToFirebase();
            });
        }
        
        // Кнопка отметки выполнения (для ВСЕХ дней, включая отдых)
        const completeBtn = document.getElementById('completeWorkoutBtn');
        if (completeBtn) {
            completeBtn.addEventListener('click', async () => {
                await this.toggleWorkoutCompletion();
            });
        }
        
        // Кнопка изменения параметров
        const editBtn = document.getElementById('editProgramBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                if (this.hasSavedProgramInFirebase) {
                    // Если программа сохранена в Firebase, показываем красивое модальное окно
                    this.showCreateNewProgramModal();
                } else {
                    this.showSetupSection();
                }
            });
        }
        
        // Выбор дня из списка
        const daySelect = document.getElementById('daySelect');
        if (daySelect) {
            daySelect.addEventListener('change', (e) => {
                this.selectedDayNumber = parseInt(e.target.value);
                this.displayProgram();
            });
        }
        
        // Кнопка предыдущего дня
        const prevDayBtn = document.getElementById('prevDayBtn');
        if (prevDayBtn) {
            prevDayBtn.addEventListener('click', () => {
                if (this.selectedDayNumber > 1) {
                    this.selectedDayNumber--;
                    this.displayProgram();
                }
            });
        }
        
        // Кнопка следующего дня
        const nextDayBtn = document.getElementById('nextDayBtn');
        if (nextDayBtn) {
            nextDayBtn.addEventListener('click', () => {
                if (this.selectedDayNumber < 28) {
                    this.selectedDayNumber++;
                    this.displayProgram();
                }
            });
        }
    }
    // Добавьте эти методы в класс WorkoutApp:
    getRepetitionText(min, max) {
        const count = max; // Используем максимальное значение для определения формы
        let word;
        
        if (count % 10 === 1 && count % 100 !== 11) {
            word = 'повторение';
        } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
            word = 'повторения';
        } else {
            word = 'повторений';
        }
        
        return `${min}-${max} ${word}`;
    }

    getSetText(sets) {
        let word;
        
        if (sets % 10 === 1 && sets % 100 !== 11) {
            word = 'подход';
        } else if ([2, 3, 4].includes(sets % 10) && ![12, 13, 14].includes(sets % 100)) {
            word = 'подхода';
        } else {
            word = 'подходов';
        }
        
        return `${sets} ${word}`;
    }
    // Показать модальное окно для создания новой программы
    showCreateNewProgramModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-dumbbell"></i> Создание новой программы</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="modal-icon">
                        <i class="fas fa-question-circle"></i>
                    </div>
                    <div class="modal-text">
                        <p>Вы уверены, что хотите создать новую программу тренировок?</p>
                        <p><strong>Текущая программа останется сохраненной в вашем аккаунте.</strong></p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="modalCancelBtn">Отмена</button>
                    <button class="btn btn-primary" id="modalConfirmBtn">Создать новую</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Закрытие модального окна
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('#modalCancelBtn');
        const confirmBtn = modal.querySelector('#modalConfirmBtn');
        
        const closeModal = () => {
            modal.remove();
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        confirmBtn.addEventListener('click', () => {
            closeModal();
            this.showSetupSection();
        });
        
        // Закрытие по клику на оверлей
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Сообщения
    showSuccessMessage(text) {
        console.log("Успех:", text);
        // Просто выводим в консоль вместо алертов
    }

    showErrorMessage(text) {
        console.error("Ошибка:", text);
        // Просто выводим в консоль вместо алертов
    }

    showInfoMessage(text) {
        console.info("Информация:", text);
        // Просто выводим в консоль вместо алертов
    }

    // Методы Firebase
    async saveToFirebase() {
        try {
            console.log("Начало сохранения программы в Firebase...");
            
            // Ждем готовности авторизации
            const authModule = await import('../js/auth-state.js');
            const user = await authModule.waitForAuthReady();
            
            if (!user) {
                const shouldLogin = confirm("Для сохранения программы необходимо войти в систему. Перейти на страницу входа?");
                if (shouldLogin) {
                    window.location.href = "login.html";
                }
                return false;
            }
            
            if (!this.currentProgram) {
                alert("Сначала создайте программу");
                return false;
            }
            
            console.log("Попытка сохранения программы...");
            
            // Добавляем метаданные
            this.currentProgram.userId = user.uid;
            this.currentProgram.userEmail = user.email;
            this.currentProgram.updatedAt = new Date().toISOString();
            this.currentProgram.workoutStatus = this.workoutStatus || {};
            this.currentProgram.saveDate = new Date().toISOString();
            
            console.log("Данные для сохранения:", this.currentProgram);
            
            // Пытаемся сохранить
            const success = await authModule.saveWorkoutProgram(this.currentProgram);
            
            if (success) {
                this.hasSavedProgram = true;
                this.hasSavedProgramInFirebase = true;
                
                console.log("Программа успешно сохранена");
                
                // Показываем простой алерт без HTML
                alert("Программа успешно сохранена!");
                
                // Обновляем отображение, чтобы скрыть кнопку сохранения
                this.displayProgram();
                
                return true;
            } else {
                alert("Не удалось сохранить программу. Попробуйте еще раз.");
                return false;
            }
        } catch (error) {
            console.error("Ошибка при сохранении:", error);
            alert("Ошибка при сохранении: " + error.message);
            return false;
        }
    }

    async loadWorkoutStatus() {
        try {
            const authModule = await import('../js/auth-state.js');
            const user = await authModule.waitForAuthReady();
            
            if (user) {
                const status = await authModule.getWorkoutStatus();
                this.workoutStatus = status || {};
            } else {
                this.workoutStatus = {};
            }
        } catch (error) {
            console.log("Ошибка загрузки статуса:", error);
            this.workoutStatus = {};
        }
    }

    async toggleWorkoutCompletion() {
    try {
        const authModule = await import('../js/auth-state.js');
        const user = await authModule.waitForAuthReady();
        
        if (!user) {
        const shouldLogin = confirm("Для отметки тренировок необходимо войти в систему. Перейти на страницу входа?");
        if (shouldLogin) {
            window.location.href = "login.html";
        }
        return;
        }
        
        const todayStatus = this.workoutStatus[`day${this.selectedDayNumber}`];
        const isCompleted = !(todayStatus && todayStatus.completed);
        
        // Обновляем статус
        this.workoutStatus[`day${this.selectedDayNumber}`] = {
        completed: isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString()
        };
        
        // Обновляем статус в Firebase
        const success = await authModule.updateWorkoutStatus(this.selectedDayNumber, isCompleted);
        
        if (success) {
        // Обновляем текущую программу
        if (this.currentProgram) {
            this.currentProgram.workoutStatus = this.workoutStatus;
        }
        
        this.displayProgram();
        
        // Показываем соответствующее сообщение
        if (isCompleted) {
            alert("✅ День отмечен как выполненный!");
        } else {
            alert("ℹ️ Статус дня сброшен");
        }
        } else {
        alert("❌ Не удалось обновить статус");
        }
    } catch (error) {
        console.error("Ошибка при обновлении статуса тренировки:", error);
        alert("❌ Ошибка при обновлении статуса: " + error.message);
    }
    }
}

// Обновите блок DOMContentLoaded:
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM загружен");
    
    try {
        // Создаем экземпляр приложения
        window.workoutApp = new WorkoutApp();
        
        // Запускаем инициализацию - она сама определит, что показывать
        await window.workoutApp.init();
        
    } catch (error) {
        console.error("Критическая ошибка:", error);
        // При ошибке всегда показываем форму
        const setupSection = document.getElementById('setupSection');
        if (setupSection) {
            setupSection.classList.remove('hidden');
        }
    }
});