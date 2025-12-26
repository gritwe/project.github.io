// nutrition-plan-generator.js - УЛУЧШЕННАЯ ВЕРСИЯ С МАКСИМАЛЬНЫМ РАЗНООБРАЗИЕМ

import { auth, db, waitForAuthReady, saveMealPlan, loadMealPlan, showCustomAlert } from './auth-state.js';

class NutritionPlanGenerator {
    constructor() {
        this.recipes = [];
        this.categories = [];
        this.planData = null;
        this.currentWeek = 1;
        this.currentDay = 1;
        this.selectedMealType = null;
        this.selectedMealIndex = null;
        this.searchTimeout = null;
        
        // Фиксированный порядок приемов пищи
        this.mealOrder = ['breakfast', 'lunch', 'dinner', 'snack', 'snack1', 'snack2', 'snack3'];
        
        // Здоровые категории для завтрака
        this.healthyBreakfastCategories = ['breakfast', 'cereal', 'porridge', 'dairy', 'eggs', 'pancakes', 'smoothie', 'yogurt'];
        
        // Усиленная система отслеживания разнообразия
        this.usedRecipesHistory = {
            week1: { day1: [], day2: [], day3: [], day4: [], day5: [], day6: [], day7: [] },
            week2: { day1: [], day2: [], day3: [], day4: [], day5: [], day6: [], day7: [] },
            week3: { day1: [], day2: [], day3: [], day4: [], day5: [], day6: [], day7: [] },
            week4: { day1: [], day2: [], day3: [], day4: [], day5: [], day6: [], day7: [] }
        };
        
        // Расширенная статистика использования рецептов
        this.recipeUsageCount = {};
        this.recipeCategoryUsage = {};
        this.lastUsedWeek = {};
        
        // Типы блюд для максимального разнообразия
        this.dishTypeVariations = {
            breakfast: {
                primary: ['breakfast', 'porridge', 'cereal'],
                secondary: ['dairy', 'eggs', 'yogurt'],
                tertiary: ['fruit', 'smoothie', 'pancakes']
            },
            lunch: {
                primary: ['soup', 'main', 'poultry'],
                secondary: ['salad', 'side_dish', 'vegetables'],
                tertiary: ['fish', 'seafood', 'legumes']
            },
            dinner: {
                primary: ['main', 'fish', 'poultry'],
                secondary: ['salad', 'vegetables', 'light'],
                tertiary: ['soup', 'eggs', 'dairy']
            },
            snack: {
                primary: ['fruit', 'nuts', 'yogurt'],
                secondary: ['protein_bar', 'dairy', 'vegetables'],
                tertiary: ['snack', 'baking', 'seeds']
            }
        };
        
        this.init();
    }

    async init() {
        try {
            await waitForAuthReady();
            await this.loadRecipes();
            await this.setupEventListeners();
            
            this.loadCalculatedBJU();
            await this.loadSavedPlan();
            
            console.log("✅ NutritionPlanGenerator инициализирован");
        } catch (error) {
            console.error("❌ Ошибка инициализации NutritionPlanGenerator:", error);
            showCustomAlert('Ошибка инициализации генератора плана', 'error');
        }
    }

    async loadRecipes() {
        try {
            const response = await fetch('../calorizator_recipes_full.json');
            if (!response.ok) throw new Error('Не удалось загрузить рецепты');
            
            this.recipes = await response.json();
            
            // НОРМАЛИЗАЦИЯ КЛЮЧЕЙ НУТРИЕНТОВ
            this.recipes = this.recipes.map(recipe => {
                const nutrition = recipe.nutrition || {};
                
                // Получаем значения из всех возможных вариантов ключей
                const normalized = {
                    calories: nutrition.calories || nutrition.Calories || 0,
                    protein: nutrition.protein || nutrition.proteins || nutrition.Protein || 0,
                    fat: nutrition.fat || nutrition.fats || nutrition.Fat || 0,
                    carbs: nutrition.carbs || nutrition.Carbs || 0
                };
                
                // Дополнительная проверка: если есть proteins/fats, используем их
                if (nutrition.proteins !== undefined && normalized.protein === 0) {
                    normalized.protein = nutrition.proteins;
                }
                if (nutrition.fats !== undefined && normalized.fat === 0) {
                    normalized.fat = nutrition.fats;
                }
                
                return {
                    ...recipe,
                    nutrition: normalized
                };
            });
            
            // Собираем уникальные категории
            this.categories = [...new Set(this.recipes.map(r => r.category))];
            
            // Инициализируем систему учета
            this.initRecipeTracking();
            
        } catch (error) {
            showCustomAlert('Не удалось загрузить базу рецептов', 'error');
        }
    }

    initRecipeTracking() {
        // Инициализируем счетчики
        this.recipes.forEach(recipe => {
            this.recipeUsageCount[recipe.name] = 0;
            const category = recipe.category.toLowerCase();
            if (!this.recipeCategoryUsage[category]) {
                this.recipeCategoryUsage[category] = new Set();
            }
        });
    }

    async loadSavedPlan() {
        try {
            const savedPlan = await loadMealPlan(this.currentWeek);
            if (savedPlan) {
                this.planData = savedPlan;
                this.showPlanSection();
                this.renderPlan();
                this.updateUsedRecipesFromPlan();
            }
        } catch (error) {
            // Пропускаем ошибку загрузки
        }
    }
    
    updateUsedRecipesFromPlan() {
        if (!this.planData) return;
        
        // Сбрасываем историю
        this.resetRecipeTracking();
        
        // Заполняем из плана
        Object.keys(this.planData.weeks || {}).forEach(weekKey => {
            const weekNum = parseInt(weekKey);
            const week = this.planData.weeks[weekKey];
            
            Object.keys(week.days || {}).forEach(dayKey => {
                const dayNum = parseInt(dayKey);
                const day = week.days[dayKey];
                
                Object.values(day.meals || {}).forEach(meal => {
                    meal.recipes.forEach(recipe => {
                        const recipeName = recipe.name;
                        if (recipeName) {
                            this.addRecipeToHistory(recipeName, weekNum, dayNum);
                        }
                    });
                });
            });
        });
    }

    resetRecipeTracking() {
        // Сбрасываем всю историю
        this.usedRecipesHistory = {
            week1: { day1: [], day2: [], day3: [], day4: [], day5: [], day6: [], day7: [] },
            week2: { day1: [], day2: [], day3: [], day4: [], day5: [], day6: [], day7: [] },
            week3: { day1: [], day2: [], day3: [], day4: [], day5: [], day6: [], day7: [] },
            week4: { day1: [], day2: [], day3: [], day4: [], day5: [], day6: [], day7: [] }
        };
        
        // Сбрасываем счетчики
        Object.keys(this.recipeUsageCount).forEach(key => {
            this.recipeUsageCount[key] = 0;
        });
        
        // Сбрасываем использование категорий
        Object.keys(this.recipeCategoryUsage).forEach(key => {
            this.recipeCategoryUsage[key] = new Set();
        });
        
        // Сбрасываем последнее использование
        this.lastUsedWeek = {};
    }

    loadCalculatedBJU() {
        try {
            const savedBJU = localStorage.getItem('calculatedBJU');
            if (savedBJU) {
                const bju = JSON.parse(savedBJU);
                document.getElementById('targetCalories').value = bju.calories || 2000;
                document.getElementById('targetProtein').value = bju.protein || 100;
                document.getElementById('targetFat').value = bju.fat || 70;
                document.getElementById('targetCarbs').value = bju.carbs || 250;
                
                localStorage.removeItem('calculatedBJU');
            }
        } catch (error) {
            // Пропускаем ошибку загрузки
        }
    }

    setupEventListeners() {
        // Навигация
        document.getElementById('newPlanBtn')?.addEventListener('click', () => this.showSetupSection());
        document.getElementById('backToSetupBtn')?.addEventListener('click', () => this.showSetupSection());

        // Генерация плана
        document.getElementById('generatePlanBtn')?.addEventListener('click', () => this.generatePlan());

        // Сохранение плана
        document.getElementById('savePlanBtn')?.addEventListener('click', async () => await this.savePlan());
        
        // Скачивание списка покупок
        document.getElementById('downloadShoppingListBtn')?.addEventListener('click', () => {
            this.generateShoppingList();
        });

        // Навигация по неделям
        document.getElementById('prevWeekBtn')?.addEventListener('click', () => {
            if (this.currentWeek > 1) {
                this.currentWeek--;
                this.renderPlan();
                this.loadSavedPlanForWeek();
            }
        });

        document.getElementById('nextWeekBtn')?.addEventListener('click', () => {
            const maxWeeks = this.planData?.settings?.duration ? Math.ceil(this.planData.settings.duration / 7) : 4;
            if (this.currentWeek < maxWeeks) {
                this.currentWeek++;
                this.renderPlan();
                this.loadSavedPlanForWeek();
            }
        });

        // Навигация по дням
        document.querySelectorAll('.day-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentDay = parseInt(btn.dataset.day);
                this.renderDay();
            });
        });

        // Кнопки для автоматической коррекции БЖУ
        document.getElementById('correctForCaloriesBtn')?.addEventListener('click', () => this.correctBJUForCalories());

        // Закрытие модальных окон
        document.getElementById('closeRecipeModal')?.addEventListener('click', () => {
            document.getElementById('recipeModal').classList.remove('active');
        });

        document.getElementById('closeAddRecipeModal')?.addEventListener('click', () => {
            document.getElementById('addRecipeModal').classList.remove('active');
        });

        document.getElementById('closePortionModal')?.addEventListener('click', () => {
            document.getElementById('portionModal').classList.remove('active');
        });

        // Поиск рецептов
        const searchInput = document.getElementById('recipeSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.debouncedSearchRecipes(e.target.value);
            });
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchRecipes(e.target.value);
                }
            });
        }

        // Поиск по кнопке
        const searchBtn = document.querySelector('.search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const query = searchInput?.value || '';
                this.searchRecipes(query);
            });
        }
        
        // Автосохранение
        this.setupAutoSave();
        this.setupBJUListeners();
    }
    
    setupBJUListeners() {
        const proteinInput = document.getElementById('targetProtein');
        const fatInput = document.getElementById('targetFat');
        const carbsInput = document.getElementById('targetCarbs');
        const caloriesInput = document.getElementById('targetCalories');
        
        [proteinInput, fatInput, carbsInput].forEach(input => {
            input?.addEventListener('input', () => {
                this.showCorrectionButtonIfNeeded();
            });
        });
        
        caloriesInput?.addEventListener('input', () => {
            this.showCorrectionButtonIfNeeded();
        });
    }
    
    showCorrectionButtonIfNeeded() {
        const calories = parseInt(document.getElementById('targetCalories')?.value) || 0;
        const protein = parseInt(document.getElementById('targetProtein')?.value) || 0;
        const fat = parseInt(document.getElementById('targetFat')?.value) || 0;
        const carbs = parseInt(document.getElementById('targetCarbs')?.value) || 0;
        
        const caloriesFromBJU = (protein * 4) + (fat * 9) + (carbs * 4);
        const difference = Math.abs(calories - caloriesFromBJU);
        
        const correctionBtn = document.getElementById('correctForCaloriesBtn');
        if (correctionBtn) {
            if (difference > 50 && calories > 0) {
                correctionBtn.style.display = 'inline-block';
                correctionBtn.title = `Разница: ${Math.round(calories - caloriesFromBJU)} ккал`;
            } else {
                correctionBtn.style.display = 'none';
            }
        }
    }
    
    correctBJUForCalories() {
        const targetCalories = parseInt(document.getElementById('targetCalories')?.value) || 2000;
        const currentProtein = parseInt(document.getElementById('targetProtein')?.value) || 100;
        const currentFat = parseInt(document.getElementById('targetFat')?.value) || 70;
        const currentCarbs = parseInt(document.getElementById('targetCarbs')?.value) || 250;
        
        const currentCalories = (currentProtein * 4) + (currentFat * 9) + (currentCarbs * 4);
        const difference = targetCalories - currentCalories;
        
        if (Math.abs(difference) < 10) {
            showCustomAlert('БЖУ уже соответствуют целевым калориям', 'info');
            return;
        }
        
        // Простая пропорциональная коррекция
        const total = currentProtein + currentFat + currentCarbs;
        if (total === 0) return;
        
        const proteinRatio = currentProtein / total;
        const fatRatio = currentFat / total;
        const carbsRatio = currentCarbs / total;
        
        let remainingDifference = difference;
        let newProtein = currentProtein;
        let newFat = currentFat;
        let newCarbs = currentCarbs;
        
        // Корректируем постепенно
        while (Math.abs(remainingDifference) > 5) {
            if (remainingDifference > 0) {
                // Добавляем
                if (Math.random() > 0.5 && remainingDifference >= 4) {
                    newProtein += 1;
                    remainingDifference -= 4;
                } else if (remainingDifference >= 9) {
                    newFat += 1;
                    remainingDifference -= 9;
                } else {
                    newCarbs += 1;
                    remainingDifference -= 4;
                }
            } else {
                // Убираем
                if (Math.random() > 0.5 && newProtein > 10 && remainingDifference <= -4) {
                    newProtein -= 1;
                    remainingDifference += 4;
                } else if (newFat > 10 && remainingDifference <= -9) {
                    newFat -= 1;
                    remainingDifference += 9;
                } else if (newCarbs > 20) {
                    newCarbs -= 1;
                    remainingDifference += 4;
                } else {
                    break;
                }
            }
            
            if (Math.abs(remainingDifference) > 1000) break;
        }
        
        // Устанавливаем значения
        document.getElementById('targetProtein').value = Math.round(newProtein);
        document.getElementById('targetFat').value = Math.round(newFat);
        document.getElementById('targetCarbs').value = Math.round(newCarbs);
        
        const finalCalories = (newProtein * 4) + (newFat * 9) + (newCarbs * 4);
        const finalDiff = targetCalories - finalCalories;
        
        if (Math.abs(finalDiff) <= 10) {
            showCustomAlert(`БЖУ скорректированы. Теперь: ${Math.round(finalCalories)} ккал`, 'success');
        } else {
            showCustomAlert(`БЖУ частично скорректированы. Разница: ${Math.round(finalDiff)} ккал`, 'info');
        }
        
        const correctionBtn = document.getElementById('correctForCaloriesBtn');
        if (correctionBtn) correctionBtn.style.display = 'none';
    }
    
    setupAutoSave() {
        const saveDebounced = this.debounce(() => {
            if (this.planData) this.savePlan(true);
        }, 5000);
        
        const observer = new MutationObserver(() => saveDebounced());
        const planSection = document.getElementById('planSection');
        if (planSection) {
            observer.observe(planSection, { 
                childList: true, 
                subtree: true,
                characterData: true 
            });
        }
    }
    
    debounce(func, wait) {
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

    async loadSavedPlanForWeek() {
        try {
            const savedPlan = await loadMealPlan(this.currentWeek);
            if (savedPlan) {
                if (!this.planData) {
                    this.planData = savedPlan;
                } else {
                    this.planData.weeks[this.currentWeek] = savedPlan.weeks[this.currentWeek];
                }
                this.renderPlan();
            }
        } catch (error) {
            // Пропускаем ошибку загрузки
        }
    }

    showSetupSection() {
        document.getElementById('setupSection')?.classList.add('active');
        document.getElementById('planSection')?.classList.remove('active');
    }

    showPlanSection() {
        document.getElementById('setupSection')?.classList.remove('active');
        document.getElementById('planSection')?.classList.add('active');
        
        const regenerateBtn = document.getElementById('regenerateVarietyBtn');
        if (regenerateBtn) regenerateBtn.style.display = 'block';
    }

    // ОСНОВНОЙ МЕТОД ГЕНЕРАЦИИ ПЛАНА С МАКСИМАЛЬНЫМ РАЗНООБРАЗИЕМ
    generatePlan() {
        // Получаем параметры
        const goals = {
            calories: parseInt(document.getElementById('targetCalories')?.value) || 2000,
            protein: parseInt(document.getElementById('targetProtein')?.value) || 100,
            fat: parseInt(document.getElementById('targetFat')?.value) || 70,
            carbs: parseInt(document.getElementById('targetCarbs')?.value) || 250
        };

        const mealCount = parseInt(document.querySelector('input[name="mealCount"]:checked')?.value || '3');
        const duration = parseInt(document.querySelector('input[name="duration"]:checked')?.value || '28');
        const dietType = document.getElementById('dietType')?.value || 'balanced';

        // Проверяем валидность
        if (!this.validateGoalsFlexible(goals)) return;

        // Сбрасываем историю
        this.resetRecipeTracking();

        // Создаем структуру плана
        this.planData = {
            id: Date.now().toString(),
            goals: goals,
            settings: {
                mealCount: mealCount,
                duration: duration,
                dietType: dietType,
                restrictions: this.getSelectedRestrictions(),
                favorites: document.getElementById('favoriteFoods')?.value || ''
            },
            weeks: {},
            generatedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            week: this.currentWeek
        };

        // Генерируем недели с УСИЛЕННЫМ РАЗНООБРАЗИЕМ
        const totalWeeks = Math.ceil(duration / 7);
        for (let week = 1; week <= totalWeeks; week++) {
            this.planData.weeks[week] = this.generateUltraDiverseWeek(week, goals, mealCount, dietType);
        }

        // Показываем план
        this.showPlanSection();
        this.renderPlan();
        
        // Автоматически сохраняем
        this.savePlan(true);
    }

    validateGoalsFlexible(goals) {
        const errors = [];
        
        if (!goals.calories || goals.calories < 1000 || goals.calories > 5000) {
            errors.push('Калории должны быть в диапазоне 1000-5000 ккал');
        }
        
        if (!goals.protein || goals.protein < 30 || goals.protein > 300) {
            errors.push('Белки должны быть в диапазоне 30-300 г');
        }
        
        if (!goals.fat || goals.fat < 20 || goals.fat > 150) {
            errors.push('Жиры должны быть в диапазоне 20-150 г');
        }
        
        if (!goals.carbs || goals.carbs < 100 || goals.carbs > 500) {
            errors.push('Углеводы должны быть в диапазоне 100-500 г');
        }
        
        if (errors.length > 0) {
            showCustomAlert(errors.join('<br>'), 'error');
            return false;
        }
        
        return true;
    }

    getSelectedRestrictions() {
        const restrictions = [];
        document.querySelectorAll('.restriction-checkbox input:checked').forEach(cb => {
            restrictions.push(cb.value);
        });
        return restrictions;
    }

    // ГЕНЕРАЦИЯ НЕДЕЛИ С МАКСИМАЛЬНЫМ РАЗНООБРАЗИЕМ
    generateUltraDiverseWeek(weekNumber, goals, mealCount, dietType) {
        const week = {
            number: weekNumber,
            days: {}
        };

        const mealTypes = this.getMealTypes(mealCount);
        const orderedMealTypes = this.getOrderedMealTypes(mealCount);
        
        // Генерируем 7 дней с уникальными комбинациями
        for (let day = 1; day <= 7; day++) {
            week.days[day] = {
                dayNumber: day,
                meals: {}
            };

            for (const mealType of orderedMealTypes) {
                const mealInfo = mealTypes[mealType];
                if (mealInfo) {
                    // Генерируем прием пищи с УСИЛЕННЫМ разнообразием
                    week.days[day].meals[mealType] = this.generateUltraDiverseMeal(
                        mealType,
                        mealInfo,
                        goals,
                        mealCount,
                        dietType,
                        weekNumber,
                        day
                    );
                }
            }
            
            // Сбалансированное заполнение оставшихся калорий
            this.balanceDayCalories(week.days[day], goals, mealCount, dietType, weekNumber, day);
        }

        return week;
    }

    getMealTypes(mealCount) {
        // Веса распределения калорий по приемам пищи
        switch(mealCount) {
            case 3:
                return {
                    breakfast: { name: 'Завтрак', time: '8:00', weight: 0.25 },
                    lunch: { name: 'Обед', time: '13:00', weight: 0.45 },
                    dinner: { name: 'Ужин', time: '19:00', weight: 0.30 }
                };
            case 4:
                return {
                    breakfast: { name: 'Завтрак', time: '8:00', weight: 0.20 },
                    lunch: { name: 'Обед', time: '13:00', weight: 0.35 },
                    snack: { name: 'Перекус', time: '16:00', weight: 0.15 },
                    dinner: { name: 'Ужин', time: '19:00', weight: 0.30 }
                };
            case 5:
                return {
                    breakfast: { name: 'Завтрак', time: '8:00', weight: 0.20 },
                    snack1: { name: 'Перекус', time: '11:00', weight: 0.10 },
                    lunch: { name: 'Обед', time: '14:00', weight: 0.30 },
                    snack2: { name: 'Перекус', time: '17:00', weight: 0.15 },
                    dinner: { name: 'Ужин', time: '20:00', weight: 0.25 }
                };
            default:
                return {
                    breakfast: { name: 'Завтрак', time: '8:00', weight: 0.25 },
                    lunch: { name: 'Обед', time: '13:00', weight: 0.40 },
                    dinner: { name: 'Ужин', time: '19:00', weight: 0.35 }
                };
        }
    }

    getOrderedMealTypes(mealCount) {
        switch(mealCount) {
            case 3: return ['breakfast', 'lunch', 'dinner'];
            case 4: return ['breakfast', 'lunch', 'snack', 'dinner'];
            case 5: return ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner'];
            default: return ['breakfast', 'lunch', 'dinner'];
        }
    }

    // ГЕНЕРАЦИЯ ПРИЕМА ПИЩИ С МАКСИМАЛЬНЫМ РАЗНООБРАЗИЕМ
    generateUltraDiverseMeal(mealType, mealInfo, goals, mealCount, dietType, week, day) {
        // Распределяем цели
        const mealGoals = {
            calories: Math.round(goals.calories * mealInfo.weight),
            protein: Math.round(goals.protein * mealInfo.weight),
            fat: Math.round(goals.fat * mealInfo.weight),
            carbs: Math.round(goals.carbs * mealInfo.weight)
        };

        // Оптимизация для завтрака
        if (mealType === 'breakfast') {
            mealGoals.carbs = Math.round(mealGoals.carbs * 0.8);
            mealGoals.protein = Math.round(mealGoals.protein * 1.2);
        }

        // Подбираем разнообразные типы блюд
        const dishTypes = this.selectDiverseDishTypes(mealType, dietType, week, day);
        
        const selectedRecipes = [];
        let currentNutrition = { calories: 0, protein: 0, fat: 0, carbs: 0 };
        
        // Подбираем рецепты для каждого типа блюда
        for (const dishType of dishTypes) {
            const recipe = this.findUltraDiverseRecipe(dishType, mealGoals, currentNutrition, dietType, week, day);
            
            if (recipe) {
                const portion = this.calculateOptimalPortion(recipe, dishType, mealGoals, currentNutrition, dietType);
                const scaledRecipe = this.createScaledRecipe(recipe, portion, dishType);
                
                selectedRecipes.push(scaledRecipe);
                
                // ОБНОВЛЯЕМ НУТРИЕНТЫ ПРАВИЛЬНО
                currentNutrition.calories += scaledRecipe.scaledNutrition.calories;
                currentNutrition.protein += scaledRecipe.scaledNutrition.protein;
                currentNutrition.fat += scaledRecipe.scaledNutrition.fat;
                currentNutrition.carbs += scaledRecipe.scaledNutrition.carbs;
                
                this.addRecipeToHistory(recipe.name, week, day);
            }
        }

        // Добавляем блюда для балансировки
        this.addBalancingDishes(selectedRecipes, mealType, mealGoals, currentNutrition, dietType, week, day);

        // ВОЗВРАЩАЕМ ПРАВИЛЬНО СФОРМИРОВАННЫЙ ОБЪЕКТ
        return {
            name: mealInfo.name,
            time: mealInfo.time,
            type: mealType,
            goals: mealGoals,
            recipes: selectedRecipes,
            actual: { ...currentNutrition } // Копируем актуальные значения
        };
    }

    // ВЫБОР РАЗНООБРАЗНЫХ ТИПОВ БЛЮД
    selectDiverseDishTypes(mealType, dietType, week, day) {
        const variations = this.dishTypeVariations[mealType] || this.dishTypeVariations.breakfast;
        
        // Выбираем по одному типу из каждой группы для максимального разнообразия
        const selectedTypes = [];
        
        // Primary (обязательно)
        const availablePrimary = variations.primary.filter(type => 
            this.isDishTypeAllowed(type, dietType)
        );
        if (availablePrimary.length > 0) {
            selectedTypes.push(this.selectLeastUsedType(availablePrimary, mealType, week, day));
        }
        
        // Secondary (по возможности)
        const availableSecondary = variations.secondary.filter(type => 
            this.isDishTypeAllowed(type, dietType)
        );
        if (availableSecondary.length > 0 && Math.random() > 0.3) {
            selectedTypes.push(this.selectLeastUsedType(availableSecondary, mealType, week, day));
        }
        
        // Tertiary (иногда)
        const availableTertiary = variations.tertiary.filter(type => 
            this.isDishTypeAllowed(type, dietType)
        );
        if (availableTertiary.length > 0 && Math.random() > 0.7) {
            selectedTypes.push(this.selectLeastUsedType(availableTertiary, mealType, week, day));
        }
        
        // Убираем дубликаты
        return [...new Set(selectedTypes)];
    }

    selectLeastUsedType(types, mealType, week, day) {
        // Выбираем тип, который меньше всего использовался в последнее время
        let minUsage = Infinity;
        let selectedType = types[0];
        
        for (const type of types) {
            const usageCount = this.getTypeUsageCount(type, mealType, week);
            if (usageCount < minUsage) {
                minUsage = usageCount;
                selectedType = type;
            }
        }
        
        return selectedType;
    }

    getTypeUsageCount(type, mealType, week) {
        let count = 0;
        const weekKey = `week${week}`;
        
        // Считаем сколько раз использовался этот тип в этой неделе
        for (let day = 1; day <= 7; day++) {
            const dayKey = `day${day}`;
            const recipes = this.usedRecipesHistory[weekKey]?.[dayKey] || [];
            recipes.forEach(recipeName => {
                const recipe = this.recipes.find(r => r.name === recipeName);
                if (recipe && this.isRecipeOfType(recipe, type)) {
                    count++;
                }
            });
        }
        
        return count;
    }

    // ПОИСК РЕЦЕПТА С МАКСИМАЛЬНЫМ РАЗНООБРАЗИЕМ
    findUltraDiverseRecipe(dishType, mealGoals, currentNutrition, dietType, week, day) {
        // Фильтруем по типу
        let filtered = this.recipes.filter(recipe => 
            this.isRecipeOfType(recipe, dishType) &&
            this.isRecipeAllowed(recipe, this.planData?.settings?.restrictions || [], dietType)
        );

        if (filtered.length === 0) {
            // Расширяем поиск
            filtered = this.recipes.filter(recipe => 
                this.isRecipeAllowed(recipe, this.planData?.settings?.restrictions || [], dietType)
            );
        }

        // Оцениваем и сортируем по разнообразию
        filtered = filtered.map(recipe => {
            const score = this.calculateUltraDiversityScore(recipe, dishType, mealGoals, currentNutrition, week, day);
            return { recipe, score };
        }).sort((a, b) => b.score - a.score);

        return filtered.length > 0 ? filtered[0].recipe : null;
    }

    // КОМПЛЕКСНАЯ ОЦЕНКА РАЗНООБРАЗИЯ
    calculateUltraDiversityScore(recipe, dishType, mealGoals, currentNutrition, week, day) {
        let score = 0;
        
        const baseCalories = recipe.nutrition.calories || 100;
        const baseProtein = recipe.nutrition.protein || 0;
        const baseFat = recipe.nutrition.fat || 0;
        const baseCarbs = recipe.nutrition.carbs || 0;
        
        // 1. Соответствие целям (30%)
        const remainingCalories = mealGoals.calories - currentNutrition.calories;
        const remainingProtein = mealGoals.protein - currentNutrition.protein;
        
        const calorieDiff = Math.abs(baseCalories - remainingCalories / 2);
        score += 300 / (calorieDiff + 1);
        
        if (['main', 'breakfast', 'poultry', 'fish', 'eggs'].includes(dishType)) {
            const proteinDiff = Math.abs(baseProtein - remainingProtein / 3);
            score += 200 / (proteinDiff + 1);
        }
        
        // 2. РАЗНООБРАЗИЕ - самая важная часть (50%)
        const usageCount = this.recipeUsageCount[recipe.name] || 0;
        
        // Большие бонусы за новые и редко используемые рецепты
        if (usageCount === 0) {
            score += 1000; // Максимальный бонус за новые
        } else if (usageCount === 1) {
            score += 600;
        } else if (usageCount === 2) {
            score += 300;
        } else if (usageCount === 3) {
            score += 100;
        } else {
            // Штраф за частое использование
            score -= (usageCount - 3) * 200;
        }
        
        // Бонус за разнообразие категорий
        const category = recipe.category.toLowerCase();
        const categoryUsage = this.recipeCategoryUsage[category]?.size || 0;
        if (categoryUsage === 0) {
            score += 400; // Новая категория
        } else if (categoryUsage === 1) {
            score += 200;
        }
        
        // Штраф за использование в этой неделе (меньше, чем раньше)
        if (this.isRecipeUsedInWeek(recipe.name, week)) {
            score -= 100;
        }
        
        // Штраф за использование в последние 2 дня
        if (this.isRecipeUsedRecently(recipe.name, week, day, 2)) {
            score -= 150;
        }
        
        // 3. Качество рецепта (20%)
        if (recipe.description && recipe.description.length > 10) score += 100;
        if (recipe.instructions && recipe.instructions.length >= 3) score += 50;
        if (recipe.ingredients && recipe.ingredients.length >= 3) score += 50;
        
        // 4. Случайность для дополнительного разнообразия (до 15%)
        score += Math.random() * (score * 0.15);
        
        return score;
    }

    isRecipeUsedRecently(recipeName, week, day, daysBack) {
        const weekKey = `week${week}`;
        
        for (let d = Math.max(1, day - daysBack); d < day; d++) {
            const dayKey = `day${d}`;
            if (this.usedRecipesHistory[weekKey]?.[dayKey]?.includes(recipeName)) {
                return true;
            }
        }
        
        return false;
    }

    isRecipeUsedInWeek(recipeName, week) {
        const weekKey = `week${week}`;
        if (!this.usedRecipesHistory[weekKey]) return false;
        
        for (let day = 1; day <= 7; day++) {
            const dayKey = `day${day}`;
            if (this.usedRecipesHistory[weekKey][dayKey]?.includes(recipeName)) {
                return true;
            }
        }
        
        return false;
    }

    calculateOptimalPortion(recipe, dishType, mealGoals, currentNutrition, dietType) {
        // Стандартные порции
        const standardPortions = {
            breakfast: 250, cereal: 200, porridge: 250, soup: 300, main: 200,
            salad: 200, snack: 150, fruit: 200, yogurt: 150, nuts: 50,
            light: 200, dessert: 100, side_dish: 150, baking: 100,
            eggs: 150, dairy: 200, poultry: 150, fish: 150,
            vegetables: 250, protein_bar: 60, smoothie: 250, pancakes: 200
        };
        
        let portion = standardPortions[dishType] || 150;
        
        // Рассчитываем по оставшимся калориям
        const remainingCalories = mealGoals.calories - currentNutrition.calories;
        const caloriesPer100g = recipe.nutrition.calories || 100;
        
        if (caloriesPer100g > 0) {
            const maxPortionByCalories = (remainingCalories / caloriesPer100g) * 100;
            portion = Math.min(portion, maxPortionByCalories);
        }
        
        // Для белковых блюд учитываем белки
        if (['main', 'breakfast', 'poultry', 'fish', 'eggs'].includes(dishType)) {
            const remainingProtein = mealGoals.protein - currentNutrition.protein;
            const proteinPer100g = recipe.nutrition.protein || 10;
            
            if (proteinPer100g > 0) {
                const maxPortionByProtein = (remainingProtein / proteinPer100g) * 100;
                portion = Math.min(portion, maxPortionByProtein);
            }
        }
        
        // Ограничения по диете
        if (dietType === 'keto' && ['cereal', 'rice', 'pasta', 'baking'].includes(dishType)) {
            portion = Math.min(portion, 50);
        }
        
        // Минимальные и максимальные значения
        const minPortion = dishType === 'nuts' ? 30 : dishType === 'protein_bar' ? 40 : 100;
        const maxPortion = dishType === 'soup' ? 400 : dishType === 'vegetables' ? 350 : 300;
        
        portion = Math.max(minPortion, Math.min(portion, maxPortion));
        portion = Math.round(portion / 25) * 25;
        
        return portion;
    }

    createScaledRecipe(recipe, portion, dishType) {
        const scaled = this.scaleNutrition(recipe.nutrition, portion);
        
        return {
            ...recipe,
            portion: portion,
            scaledNutrition: scaled,
            dishType: dishType
        };
    }

    scaleNutrition(nutrition, portion) {
        const scale = portion / 100;
        
        // Убедитесь, что все значения - числа
        const calories = parseFloat(nutrition.calories || 0);
        const protein = parseFloat(nutrition.protein || 0);
        const fat = parseFloat(nutrition.fat || 0);
        const carbs = parseFloat(nutrition.carbs || 0);
        
        return {
            calories: Math.round(calories * scale),
            protein: parseFloat((protein * scale).toFixed(1)), // Сохраняем десятичные
            fat: parseFloat((fat * scale).toFixed(1)),        // Сохраняем десятичные
            carbs: parseFloat((carbs * scale).toFixed(1))     // Сохраняем десятичные
        };
    }

    // ДОБАВЛЕНИЕ БАЛАНСИРУЮЩИХ БЛЮД
    addBalancingDishes(selectedRecipes, mealType, mealGoals, currentNutrition, dietType, week, day) {
        const remainingCalories = mealGoals.calories - currentNutrition.calories;
        const remainingProtein = mealGoals.protein - currentNutrition.protein;
        const remainingFat = mealGoals.fat - currentNutrition.fat;
        const remainingCarbs = mealGoals.carbs - currentNutrition.carbs;
        
        if (remainingCalories < 50) return;
        
        // Определяем приоритетные нутриенты
        const priorities = [];
        if (remainingProtein > 8) priorities.push('protein');
        if (remainingFat > 5) priorities.push('fat');
        if (remainingCarbs > 15) priorities.push('carbs');
        
        // Выбираем тип дополнительного блюда
        let dishType;
        if (priorities.includes('protein')) {
            dishType = this.getRandomFromArray(['protein_bar', 'eggs', 'dairy', 'poultry']);
        } else if (priorities.includes('fat')) {
            dishType = this.getRandomFromArray(['nuts', 'avocado', 'fatty_fish']);
        } else if (priorities.includes('carbs')) {
            dishType = this.getRandomFromArray(['fruit', 'vegetables', 'side_dish']);
        } else {
            // Сбалансированный вариант
            switch(mealType) {
                case 'breakfast': dishType = 'fruit'; break;
                case 'lunch': dishType = 'vegetables'; break;
                case 'dinner': dishType = 'salad'; break;
                default: dishType = 'yogurt';
            }
        }
        
        // Ищем рецепт
        const recipe = this.findUltraDiverseRecipe(dishType, mealGoals, currentNutrition, dietType, week, day);
        if (!recipe) return;
        
        // Рассчитываем порцию
        const portion = Math.min(
            this.calculateOptimalPortion(recipe, dishType, mealGoals, currentNutrition, dietType),
            (remainingCalories / (recipe.nutrition.calories || 100)) * 100
        );
        
        const scaledRecipe = this.createScaledRecipe(recipe, portion, dishType);
        selectedRecipes.push(scaledRecipe);
        
        // Обновляем текущую нутриентность
        currentNutrition.calories += scaledRecipe.scaledNutrition.calories;
        currentNutrition.protein += scaledRecipe.scaledNutrition.protein;
        currentNutrition.fat += scaledRecipe.scaledNutrition.fat;
        currentNutrition.carbs += scaledRecipe.scaledNutrition.carbs;
        
        this.addRecipeToHistory(recipe.name, week, day);
    }

    getRandomFromArray(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    // БАЛАНСИРОВКА КАЛОРИЙ ЗА ДЕНЬ
    balanceDayCalories(day, goals, mealCount, dietType, week, dayNum) {
        let totalCalories = 0;
        let totalProtein = 0;
        let totalFat = 0;
        let totalCarbs = 0;
        
        // Считаем текущие показатели
        for (const meal of Object.values(day.meals)) {
            totalCalories += meal.actual.calories || 0;
            totalProtein += meal.actual.protein || 0;
            totalFat += meal.actual.fat || 0;
            totalCarbs += meal.actual.carbs || 0;
        }
        
        const remainingCalories = goals.calories - totalCalories;
        const remainingProtein = goals.protein - totalProtein;
        const remainingFat = goals.fat - totalFat;
        const remainingCarbs = goals.carbs - totalCarbs;
        
        if (remainingCalories < 100) return;
        
        // Добавляем в самый недобравший прием пищи
        const orderedMealTypes = this.getOrderedMealTypes(mealCount);
        let bestMeal = null;
        let maxDeficit = 0;
        
        for (const mealType of orderedMealTypes) {
            const meal = day.meals[mealType];
            if (meal) {
                const deficit = meal.goals.calories - (meal.actual.calories || 0);
                if (deficit > maxDeficit) {
                    maxDeficit = deficit;
                    bestMeal = meal;
                }
            }
        }
        
        if (!bestMeal) return;
        
        // Выбираем тип блюда для добавления
        let dishType = 'fruit';
        if (remainingProtein > 10) dishType = 'protein_bar';
        else if (remainingFat > 5) dishType = 'nuts';
        else if (remainingCarbs > 20) dishType = 'fruit';
        
        const recipe = this.findUltraDiverseRecipe(dishType, bestMeal.goals, bestMeal.actual, dietType, week, dayNum);
        if (!recipe) return;
        
        const portion = this.calculateOptimalPortion(recipe, dishType, bestMeal.goals, bestMeal.actual, dietType);
        const scaledRecipe = this.createScaledRecipe(recipe, portion, dishType);
        
        bestMeal.recipes.push(scaledRecipe);
        
        // ОБНОВЛЯЕМ ФАКТИЧЕСКИЕ ЗНАЧЕНИЯ
        bestMeal.actual.calories += scaledRecipe.scaledNutrition.calories;
        bestMeal.actual.protein += scaledRecipe.scaledNutrition.protein;
        bestMeal.actual.fat += scaledRecipe.scaledNutrition.fat;
        bestMeal.actual.carbs += scaledRecipe.scaledNutrition.carbs;
        
        this.addRecipeToHistory(recipe.name, week, dayNum);
    }

    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ДЛЯ ОПРЕДЕЛЕНИЯ ТИПОВ
    isRecipeOfType(recipe, dishType) {
        return this.determineRecipeType(recipe) === dishType;
    }

    determineRecipeType(recipe) {
        const category = recipe.category.toLowerCase();
        const name = recipe.name.toLowerCase();
        
        const typeMap = [
            { keywords: ['завтрак', 'утренн'], type: 'breakfast' },
            { keywords: ['каша', 'овсян', 'гречнев', 'рисовая каша'], type: 'porridge' },
            { keywords: ['смузи', 'коктейль'], type: 'smoothie' },
            { keywords: ['блин', 'оладь'], type: 'pancakes' },
            { keywords: ['творог', 'сырник'], type: 'dairy' },
            { keywords: ['яйц', 'яичн', 'омлет'], type: 'eggs' },
            { keywords: ['суп', 'борщ', 'щи'], type: 'soup' },
            { keywords: ['котлет', 'стейк', 'жаркое', 'рагу'], type: 'main' },
            { keywords: ['салат'], type: 'salad' },
            { keywords: ['перекус', 'сэндвич', 'бутерброд'], type: 'snack' },
            { keywords: ['фрукт', 'яблоко', 'банан', 'апельсин'], type: 'fruit' },
            { keywords: ['йогурт', 'кефир', 'ряженк'], type: 'yogurt' },
            { keywords: ['орех', 'миндаль', 'грецкий', 'арахис'], type: 'nuts' },
            { keywords: ['протеин', 'батончик белков'], type: 'protein_bar' },
            { keywords: ['десерт', 'торт', 'пирожное'], type: 'dessert' },
            { keywords: ['легк', 'диетическ', 'постн'], type: 'light' },
            { keywords: ['гарнир', 'паста', 'макарон', 'рис ', 'греч ', 'картофель'], type: 'side_dish' },
            { keywords: ['куриц', 'индейк', 'утк'], type: 'poultry' },
            { keywords: ['рыб', 'лосос', 'тунец', 'треск'], type: 'fish' },
            { keywords: ['овощ', 'брокколи', 'цветная', 'морковь', 'капуст'], type: 'vegetables' }
        ];
        
        for (const mapping of typeMap) {
            if (mapping.keywords.some(keyword => name.includes(keyword) || category.includes(keyword))) {
                return mapping.type;
            }
        }
        
        return category.includes('breakfast') ? 'breakfast' : 
               category.includes('soup') ? 'soup' : 
               category.includes('main') ? 'main' : 'main';
    }

    isDishTypeAllowed(dishType, dietType) {
        const restrictions = {
            vegetarian: ['meat', 'fish', 'poultry'],
            vegan: ['meat', 'fish', 'poultry', 'dairy', 'eggs'],
            keto: ['cereal', 'fruit', 'baking', 'dessert', 'pasta', 'rice'],
            low_fat: ['fatty_meat', 'nuts', 'oils', 'avocado'],
            high_protein: ['fruit', 'dessert', 'sweets']
        };
        
        const dietRestrictions = restrictions[dietType] || [];
        
        const dishTypeMapping = {
            meat: ['meat', 'poultry', 'fish'],
            dairy: ['dairy', 'yogurt', 'cheese'],
            cereal: ['cereal', 'baking', 'pasta', 'rice'],
            fruit: ['fruit', 'sweet'],
            nuts: ['nuts', 'seeds'],
            fatty_meat: ['pork', 'beef', 'lamb']
        };
        
        for (const restriction of dietRestrictions) {
            if (dishTypeMapping[restriction] && dishTypeMapping[restriction].includes(dishType)) {
                return false;
            }
        }
        
        return true;
    }

    isRecipeAllowed(recipe, restrictions, dietType) {
        const ingredients = recipe.ingredients.join(' ').toLowerCase();
        
        // Проверяем ограничения
        for (const restriction of restrictions) {
            if (this.hasIngredient(ingredients, restriction)) {
                return false;
            }
        }
        
        // Проверяем тип диеты
        switch (dietType) {
            case 'vegetarian':
                if (this.hasMeat(ingredients) || this.hasFish(ingredients)) return false;
                break;
            case 'vegan':
                if (this.hasAnimalProducts(ingredients)) return false;
                break;
            case 'keto':
                if (recipe.nutrition.carbs > 10 && recipe.nutrition.calories > 100) return false;
                break;
            case 'high_protein':
                if (recipe.nutrition.protein < 15 && recipe.nutrition.calories > 150) return false;
                break;
            case 'low_fat':
                if (recipe.nutrition.fat > 10 && recipe.nutrition.calories > 150) return false;
                break;
        }
        
        return true;
    }

    hasIngredient(ingredientsText, ingredient) {
        const ingredientMap = {
            pork: ['свинин', 'бекон', 'ветчин', 'сало', 'карбонад'],
            fish: ['рыб', 'лосос', 'тунец', 'сельд', 'скумбр', 'креветк', 'кальмар', 'миди', 'икра'],
            milk: ['молок', 'сыр', 'творог', 'сметан', 'йогурт', 'кефир', 'сливк', 'ряженк'],
            gluten: ['пшениц', 'рожь', 'ячмен', 'хлеб', 'макарон', 'паст', 'лапш', 'мука', 'булгур'],
            nuts: ['орех', 'миндаль', 'грецкий', 'арахис', 'кешью', 'фундук', 'фисташк'],
            eggs: ['яйц', 'яичн', 'желток', 'белок'],
            soy: ['соев', 'тофу', 'соев', 'соевый'],
            honey: ['мед', 'медов']
        };
        
        const keywords = ingredientMap[ingredient] || [ingredient];
        return keywords.some(keyword => ingredientsText.includes(keyword));
    }

    hasMeat(ingredientsText) {
        const meatKeywords = ['мяс', 'говядин', 'свинин', 'куриц', 'индейк', 'утк', 'баран', 'телятин', 'конин'];
        return meatKeywords.some(keyword => ingredientsText.includes(keyword));
    }

    hasFish(ingredientsText) {
        const fishKeywords = ['рыб', 'лосос', 'тунец', 'сельд', 'скумбр', 'окун', 'карп', 'щук'];
        return fishKeywords.some(keyword => ingredientsText.includes(keyword));
    }

    hasAnimalProducts(ingredientsText) {
        const animalKeywords = ['мяс', 'рыб', 'яйц', 'молок', 'сыр', 'творог', 'сметан', 'мед'];
        return animalKeywords.some(keyword => ingredientsText.includes(keyword));
    }

    // ДОБАВЛЕНИЕ РЕЦЕПТА В ИСТОРИЮ
    addRecipeToHistory(recipeName, week, day) {
        const weekKey = `week${week}`;
        const dayKey = `day${day}`;
        
        if (this.usedRecipesHistory[weekKey] && this.usedRecipesHistory[weekKey][dayKey]) {
            if (!this.usedRecipesHistory[weekKey][dayKey].includes(recipeName)) {
                this.usedRecipesHistory[weekKey][dayKey].push(recipeName);
            }
            
            // Обновляем счетчики
            this.recipeUsageCount[recipeName] = (this.recipeUsageCount[recipeName] || 0) + 1;
            
            // Обновляем использование категорий
            const recipe = this.recipes.find(r => r.name === recipeName);
            if (recipe) {
                const category = recipe.category.toLowerCase();
                if (!this.recipeCategoryUsage[category]) {
                    this.recipeCategoryUsage[category] = new Set();
                }
                this.recipeCategoryUsage[category].add(recipeName);
            }
            
            // Запоминаем последнее использование
            this.lastUsedWeek[recipeName] = week;
        }
    }

    // РЕНДЕРИНГ ПЛАНА
    renderPlan() {
        if (!this.planData) {
            this.renderEmptyPlan();
            return;
        }
        
        // Обновляем информацию о неделе
        const weekNumber = this.currentWeek;
        const totalWeeks = Math.ceil(this.planData.settings.duration / 7);
        document.getElementById('currentWeek').textContent = `Неделя ${weekNumber} из ${totalWeeks}`;
        
        // Обновляем цели
        const goals = this.planData.goals;
        document.getElementById('goalCalories').textContent = goals.calories;
        document.getElementById('proteinTarget').textContent = goals.protein + 'г';
        document.getElementById('fatTarget').textContent = goals.fat + 'г';
        document.getElementById('carbsTarget').textContent = goals.carbs + 'г';
        
        // Показываем статистику разнообразия
        this.showEnhancedVarietyStats();
        
        // Рендерим текущий день
        this.renderDay();
    }
    
    showEnhancedVarietyStats() {
        const uniqueRecipes = new Set();
        const recipeFrequency = {};
        let totalRecipes = 0;
        
        // Собираем статистику
        Object.values(this.planData.weeks || {}).forEach(week => {
            Object.values(week.days || {}).forEach(day => {
                Object.values(day.meals || {}).forEach(meal => {
                    meal.recipes.forEach(recipe => {
                        uniqueRecipes.add(recipe.name);
                        totalRecipes++;
                        recipeFrequency[recipe.name] = (recipeFrequency[recipe.name] || 0) + 1;
                    });
                });
            });
        });
        
        const varietyPercent = totalRecipes > 0 ? Math.round((uniqueRecipes.size / totalRecipes) * 100) : 0;
        
        const statsElement = document.getElementById('varietyStats');
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="variety-stats">
                    <span class="variety-badge ${varietyPercent > 70 ? 'good' : varietyPercent > 50 ? 'medium' : 'low'}" 
                          title="Уникальных блюд: ${uniqueRecipes.size} из ${totalRecipes}">
                        <i class="fas fa-seedling"></i>
                        Разнообразие: ${varietyPercent}%
                    </span>
                    <button class="btn btn-small" id="regenerateVarietyBtn" title="Сгенерировать полностью новые блюда">
                        <i class="fas fa-random"></i> Обновить все блюда
                    </button>
                    <button class="btn btn-small" id="showVarietyDetails" title="Подробная статистика">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                </div>
            `;
            
            document.getElementById('regenerateVarietyBtn').addEventListener('click', () => {
                this.regenerateWithVariety();
            });
            
            document.getElementById('showVarietyDetails').addEventListener('click', () => {
                this.showVarietyDetails(uniqueRecipes.size, totalRecipes, recipeFrequency);
            });
        }
    }

    showVarietyDetails(uniqueCount, totalCount, recipeFrequency) {
        // Сортируем по частоте
        const frequentRecipes = Object.entries(recipeFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => `${name} (${count} раз)`);
        
        const message = `
            <strong>📊 Статистика разнообразия:</strong><br><br>
            <div style="text-align: left; padding: 10px;">
                • Уникальных блюд: <strong>${uniqueCount}</strong><br>
                • Всего блюд в плане: <strong>${totalCount}</strong><br>
                • Коэффициент разнообразия: <strong>${Math.round((uniqueCount/totalCount)*100)}%</strong><br><br>
                
                <strong>🍽️ Самые частые блюда:</strong><br>
                ${frequentRecipes.map(recipe => `• ${recipe}`).join('<br>')}
            </div>
        `;
        
        showCustomAlert(message, 'info', 5000);
    }

    regenerateWithVariety() {
        if (!this.planData) {
            showCustomAlert('Сначала создайте план питания', 'warning');
            return;
        }
        
        if (confirm('Сгенерировать план с полностью новыми блюдами? Текущие блюда будут заменены.')) {
            const goals = this.planData.goals;
            const settings = this.planData.settings;
            
            // Полностью сбрасываем историю
            this.resetRecipeTracking();
            
            // Пересоздаем недели
            const totalWeeks = Math.ceil(settings.duration / 7);
            for (let week = 1; week <= totalWeeks; week++) {
                this.planData.weeks[week] = this.generateUltraDiverseWeek(week, goals, settings.mealCount, settings.dietType);
            }
            
            this.renderPlan();
            this.savePlan(true);
            showCustomAlert('План обновлен с максимальным разнообразием!', 'success');
        }
    }

    renderEmptyPlan() {
        const mealsGrid = document.getElementById('mealsGrid');
        mealsGrid.innerHTML = `
            <div class="meal-card" style="grid-column: 1 / -1;">
                <div class="meal-header">
                    <h4>План питания</h4>
                </div>
                <div class="meal-content">
                    <div class="empty-meal">
                        <i class="fas fa-utensils"></i>
                        <p>Нажмите "Сгенерировать план" для создания плана питания</p>
                        <button class="btn btn-primary" id="generateFromEmpty" style="margin-top: 20px;">
                            <i class="fas fa-magic"></i> Сгенерировать план
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('generateFromEmpty').addEventListener('click', () => {
            this.generatePlan();
        });
        
        this.resetDaySummary();
    }

    renderDay() {
        if (!this.planData?.weeks[this.currentWeek]?.days[this.currentDay]) {
            this.renderEmptyDay();
            return;
        }
        
        const day = this.planData.weeks[this.currentWeek].days[this.currentDay];
        
        // Обновляем название дня
        const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
        const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        document.getElementById('currentDayName').textContent = dayNames[this.currentDay - 1];
        
        // Обновляем кнопки дней
        document.querySelectorAll('.day-btn').forEach((btn, index) => {
            btn.textContent = dayNamesShort[index];
            btn.classList.toggle('active', index === this.currentDay - 1);
        });
        
        // Рендерим приемы пищи
        this.renderMeals(day.meals);
        
        // Обновляем сводку по дню - ВАЖНО: правильный расчет БЖУ
        this.updateDaySummary(day);
    }

    renderEmptyDay() {
        const mealsGrid = document.getElementById('mealsGrid');
        mealsGrid.innerHTML = `
            <div class="meal-card" style="grid-column: 1 / -1;">
                <div class="meal-header">
                    <h4>Нет данных для этого дня</h4>
                </div>
                <div class="meal-content">
                    <div class="empty-meal">
                        <i class="fas fa-calendar-plus"></i>
                        <p>Создайте план питания или перейдите на другой день</p>
                    </div>
                </div>
            </div>
        `;
        
        this.resetDaySummary();
    }

    renderMeals(meals) {
        const mealsGrid = document.getElementById('mealsGrid');
        mealsGrid.innerHTML = '';
        
        const mealCount = this.planData?.settings?.mealCount || 3;
        const orderedMealTypes = this.getOrderedMealTypes(mealCount);
        
        let totalCalories = 0;
        let totalProtein = 0;
        let totalFat = 0;
        let totalCarbs = 0;
        
        for (const mealType of orderedMealTypes) {
            const meal = meals[mealType];
            if (meal) {
                const mealElement = this.createMealElement(meal, mealType);
                mealsGrid.appendChild(mealElement);
                
                // Используем актуальные значения из meal.actual
                const actual = meal.actual || { calories: 0, protein: 0, fat: 0, carbs: 0 };
                
                totalCalories += actual.calories || 0;
                totalProtein += actual.protein || 0;
                totalFat += actual.fat || 0;
                totalCarbs += actual.carbs || 0;
            }
        }
        
        // Обновляем фактические значения
        this.updateDaySummaryValues(totalCalories, totalProtein, totalFat, totalCarbs);
    }

    createMealElement(meal, mealType) {
        const div = document.createElement('div');
        div.className = 'meal-card';
        
        let dishesHTML = '';
        if (meal.recipes.length === 0) {
            dishesHTML = `
                <div class="empty-meal">
                    <i class="fas fa-plus-circle"></i>
                    <p>Добавьте блюда</p>
                </div>
            `;
        } else {
            dishesHTML = meal.recipes.map((recipe, index) => {
                // БЕЗ округления до целых!
                const protein = recipe.scaledNutrition?.protein || 0;
                const fat = recipe.scaledNutrition?.fat || 0;
                const carbs = recipe.scaledNutrition?.carbs || 0;
                
                const usageCount = this.recipeUsageCount[recipe.name] || 0;
                let noveltyBadge = '';
                if (usageCount <= 1) {
                    noveltyBadge = '<span class="novelty-badge new" title="Новое блюдо">🆕</span>';
                } else if (usageCount <= 3) {
                    noveltyBadge = '<span class="novelty-badge rare" title="Редкое блюдо">🔸</span>';
                }
                
                return `
                <div class="dish-card" data-recipe-id="${recipe.name}" data-recipe-index="${index}">
                    <div class="dish-info">
                        <div class="dish-name">${recipe.name} ${noveltyBadge}</div>
                        <div class="dish-category">${recipe.category}</div>
                    </div>
                    <div class="dish-portion">${recipe.portion}г</div>
                    <div class="dish-nutrition">
                        <div class="dish-calories">${recipe.scaledNutrition?.calories || 0} ккал</div>
                        <div class="dish-macros">
                            Б${protein.toFixed(1)} Ж${fat.toFixed(1)} У${carbs.toFixed(1)}
                        </div>
                        <button class="dish-delete-btn" title="Удалить блюдо">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `}).join('');
        }
        
        const calorieProgress = meal.goals.calories > 0 ? (meal.actual.calories || 0) / meal.goals.calories : 0;
        let progressClass = 'progress-good';
        if (calorieProgress < 0.7) progressClass = 'progress-low';
        if (calorieProgress < 0.5) progressClass = 'progress-bad';
        
        // БЕЗ округления до целых!
        const actualProtein = meal.actual.protein || 0;
        const actualFat = meal.actual.fat || 0;
        const actualCarbs = meal.actual.carbs || 0;
        
        div.innerHTML = `
            <div class="meal-header">
                <h4>
                    <i class="fas fa-${this.getMealIcon(mealType)}"></i>
                    ${meal.name}
                    <span class="meal-time">${meal.time}</span>
                </h4>
                <div class="meal-actions">
                    <button class="meal-action-btn add-dish-btn" data-meal-type="${mealType}" title="Добавить блюдо">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="meal-action-btn fill-calories-btn" data-meal-type="${mealType}" title="Заполнить калории">
                        <i class="fas fa-balance-scale"></i>
                    </button>
                    ${meal.recipes.length > 0 ? `
                    <button class="meal-action-btn remove-all-btn" data-meal-type="${mealType}" title="Удалить все блюда">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
            <div class="meal-content">
                <div class="dishes-list">
                    ${dishesHTML}
                </div>
                <div class="meal-summary">
                    <div class="meal-totals">
                        <span class="meal-total-label">Цель:</span>
                        <span class="meal-total-value">${meal.goals.calories} ккал</span>
                    </div>
                    <div class="meal-totals">
                        <span class="meal-total-label">Факт:</span>
                        <span class="meal-total-value">${Math.round(meal.actual.calories || 0)} ккал</span>
                    </div>
                    <div class="meal-macros-summary">
                        <div class="macro-item">
                            <span class="macro-label">Белки:</span>
                            <span class="macro-value">${actualProtein.toFixed(1)}/${Math.round(meal.goals.protein)}г</span>
                        </div>
                        <div class="macro-item">
                            <span class="macro-label">Жиры:</span>
                            <span class="macro-value">${actualFat.toFixed(1)}/${Math.round(meal.goals.fat)}г</span>
                        </div>
                        <div class="macro-item">
                            <span class="macro-label">Углеводы:</span>
                            <span class="macro-value">${actualCarbs.toFixed(1)}/${Math.round(meal.goals.carbs)}г</span>
                        </div>
                    </div>
                    <div class="meal-goal-progress">
                        <span class="${progressClass}">
                            ${Math.round(calorieProgress * 100)}% от цели
                        </span>
                        <span class="${progressClass}">
                            ${Math.round(meal.goals.calories - (meal.actual.calories || 0))} ккал осталось
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        // Добавляем обработчики
        const addBtn = div.querySelector('.add-dish-btn');
        const fillBtn = div.querySelector('.fill-calories-btn');
        const removeAllBtn = div.querySelector('.remove-all-btn');
        
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showAddRecipeModal(mealType);
        });
        
        fillBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.fillMealCaloriesBalanced(mealType);
        });
        
        if (removeAllBtn) {
            removeAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeAllRecipesFromMeal(mealType);
            });
        }
        
        // Обработчики для блюд
        div.querySelectorAll('.dish-card').forEach(dish => {
            dish.addEventListener('click', (e) => {
                if (!e.target.closest('.dish-delete-btn')) {
                    const recipeName = dish.dataset.recipeId;
                    const recipeIndex = parseInt(dish.dataset.recipeIndex);
                    this.showRecipeModal(recipeName, mealType, recipeIndex);
                }
            });
            
            const deleteBtn = dish.querySelector('.dish-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const recipeIndex = parseInt(dish.dataset.recipeIndex);
                this.removeRecipeFromMeal(mealType, recipeIndex);
            });
        });
        
        return div;
    }

    getMealIcon(mealType) {
        const icons = {
            breakfast: 'sun',
            lunch: 'utensils',
            dinner: 'moon',
            snack: 'apple-alt',
            snack1: 'apple-alt',
            snack2: 'apple-alt'
        };
        return icons[mealType] || 'utensils';
    }

    updateDaySummaryValues(totalCalories, totalProtein, totalFat, totalCarbs) {
        if (!this.planData) return;
        
        const goals = this.planData.goals;
        
        // Обновляем заголовок плана
        document.getElementById('actualCalories').textContent = Math.round(totalCalories);
        
        const calorieDiff = goals.calories - totalCalories;
        const diffElement = document.getElementById('calorieDiff');
        diffElement.textContent = Math.round(calorieDiff);
        diffElement.className = 'summary-value';
        
        if (Math.abs(calorieDiff) < 50) {
            diffElement.classList.add('neutral');
        } else if (calorieDiff > 0) {
            diffElement.classList.add('negative');
        } else {
            diffElement.classList.add('positive');
        }
        
        // Обновляем БЖУ - ВАЖНО: сохраняем десятичные значения
        const proteinElement = document.getElementById('proteinActual');
        const fatElement = document.getElementById('fatActual');
        const carbsElement = document.getElementById('carbsActual');
        
        // Форматируем значения (один десятичный знак)
        proteinElement.textContent = totalProtein.toFixed(1);
        fatElement.textContent = totalFat.toFixed(1);
        carbsElement.textContent = totalCarbs.toFixed(1);
        
        // Устанавливаем значения целей
        document.getElementById('proteinTarget').textContent = goals.protein + 'г';
        document.getElementById('fatTarget').textContent = goals.fat + 'г';
        document.getElementById('carbsTarget').textContent = goals.carbs + 'г';
        
        // Обновляем прогресс-бары
        const proteinProgress = document.getElementById('proteinProgress');
        const fatProgress = document.getElementById('fatProgress');
        const carbsProgress = document.getElementById('carbsProgress');
        
        const proteinPercent = goals.protein > 0 ? Math.min(100, (totalProtein / goals.protein) * 100) : 0;
        const fatPercent = goals.fat > 0 ? Math.min(100, (totalFat / goals.fat) * 100) : 0;
        const carbsPercent = goals.carbs > 0 ? Math.min(100, (totalCarbs / goals.carbs) * 100) : 0;
        
        proteinProgress.style.width = proteinPercent + '%';
        fatProgress.style.width = fatPercent + '%';
        carbsProgress.style.width = carbsPercent + '%';
        
        // Обновляем цвета прогресс-баров
        this.updateProgressBarColor(proteinProgress, proteinPercent);
        this.updateProgressBarColor(fatProgress, fatPercent);
        this.updateProgressBarColor(carbsProgress, carbsPercent);
        
        // Обновляем цвета текста
        this.updateNutritionValueColor(proteinElement, proteinPercent);
        this.updateNutritionValueColor(fatElement, fatPercent);
        this.updateNutritionValueColor(carbsElement, carbsPercent);
    }

    updateProgressBarColor(element, percent) {
        element.className = 'bju-progress';
        if (percent >= 90 && percent <= 110) {
            element.classList.add('perfect');
        } else if (percent < 80) {
            element.classList.add('under');
        } else if (percent > 120) {
            element.classList.add('over');
        }
    }

    updateNutritionValueColor(element, percent) {
        element.className = '';
        if (percent >= 90 && percent <= 110) {
            element.classList.add('good');
        } else if (percent < 70 || percent > 130) {
            element.classList.add('bad');
        } else {
            element.classList.add('okay');
        }
    }

    updateDaySummary(day) {
        let totalCalories = 0;
        let totalProtein = 0;
        let totalFat = 0;
        let totalCarbs = 0;
        
        // Пересчитываем фактические значения из рецептов
        for (const mealType of Object.keys(day.meals)) {
            const meal = day.meals[mealType];
            
            // Инициализируем actual, если нет
            if (!meal.actual) {
                meal.actual = { calories: 0, protein: 0, fat: 0, carbs: 0 };
            }
            
            // Пересчитываем из рецептов
            let mealCalories = 0;
            let mealProtein = 0;
            let mealFat = 0;
            let mealCarbs = 0;
            
            for (const recipe of meal.recipes) {
                mealCalories += recipe.scaledNutrition?.calories || 0;
                mealProtein += recipe.scaledNutrition?.protein || 0;
                mealFat += recipe.scaledNutrition?.fat || 0;
                mealCarbs += recipe.scaledNutrition?.carbs || 0;
            }
            
            // Обновляем actual
            meal.actual.calories = mealCalories;
            meal.actual.protein = mealProtein;
            meal.actual.fat = mealFat;
            meal.actual.carbs = mealCarbs;
            
            // Суммируем
            totalCalories += mealCalories;
            totalProtein += mealProtein;
            totalFat += mealFat;
            totalCarbs += mealCarbs;
        }
        
        this.updateDaySummaryValues(totalCalories, totalProtein, totalFat, totalCarbs);
    }

    resetDaySummary() {
        document.getElementById('actualCalories').textContent = '0';
        
        const diffElement = document.getElementById('calorieDiff');
        diffElement.textContent = '0';
        diffElement.className = 'summary-value';
        
        document.getElementById('proteinActual').textContent = '0';
        document.getElementById('fatActual').textContent = '0';
        document.getElementById('carbsActual').textContent = '0';
        
        document.getElementById('proteinProgress').style.width = '0%';
        document.getElementById('fatProgress').style.width = '0%';
        document.getElementById('carbsProgress').style.width = '0%';
    }

    // ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ДЛЯ РАБОТЫ С ПЛАНОМ
    removeRecipeFromMeal(mealType, recipeIndex) {
        if (!this.planData || !this.planData.weeks[this.currentWeek]?.days[this.currentDay]?.meals[mealType]) {
            return;
        }
        
        const meal = this.planData.weeks[this.currentWeek].days[this.currentDay].meals[mealType];
        
        if (recipeIndex >= 0 && recipeIndex < meal.recipes.length) {
            const removedRecipe = meal.recipes[recipeIndex];
            
            meal.recipes.splice(recipeIndex, 1);
            
            // Уменьшаем счетчик
            const recipeName = removedRecipe.name;
            if (recipeName && this.recipeUsageCount[recipeName] > 0) {
                this.recipeUsageCount[recipeName]--;
            }
            
            // Удаляем из истории
            this.removeRecipeFromHistory(recipeName, this.currentWeek, this.currentDay);
            
            // Пересчитываем
            this.recalculateMealNutrition(meal);
            this.renderDay();
            this.savePlan(true);
        }
    }
    
    removeRecipeFromHistory(recipeName, week, day) {
        const weekKey = `week${week}`;
        const dayKey = `day${day}`;
        
        if (this.usedRecipesHistory[weekKey] && this.usedRecipesHistory[weekKey][dayKey]) {
            const index = this.usedRecipesHistory[weekKey][dayKey].indexOf(recipeName);
            if (index > -1) {
                this.usedRecipesHistory[weekKey][dayKey].splice(index, 1);
            }
        }
    }

    removeAllRecipesFromMeal(mealType) {
        if (!this.planData || !this.planData.weeks[this.currentWeek]?.days[this.currentDay]?.meals[mealType]) {
            return;
        }
        
        const meal = this.planData.weeks[this.currentWeek].days[this.currentDay].meals[mealType];
        
        if (meal.recipes.length === 0) {
            showCustomAlert('В этом приеме пищи нет блюд', 'info');
            return;
        }
        
        if (confirm(`Удалить все ${meal.recipes.length} блюд из "${meal.name}"?`)) {
            meal.recipes.forEach(recipe => {
                const recipeName = recipe.name;
                if (recipeName && this.recipeUsageCount[recipeName] > 0) {
                    this.recipeUsageCount[recipeName]--;
                }
                this.removeRecipeFromHistory(recipeName, this.currentWeek, this.currentDay);
            });
            
            meal.recipes = [];
            meal.actual = { calories: 0, protein: 0, fat: 0, carbs: 0 };
            
            this.renderDay();
            this.savePlan(true);
        }
    }

    recalculateMealNutrition(meal) {
        meal.actual = { calories: 0, protein: 0, fat: 0, carbs: 0 };
        
        for (const recipe of meal.recipes) {
            meal.actual.calories += recipe.scaledNutrition?.calories || 0;
            meal.actual.protein += recipe.scaledNutrition?.protein || 0;
            meal.actual.fat += recipe.scaledNutrition?.fat || 0;
            meal.actual.carbs += recipe.scaledNutrition?.carbs || 0;
        }
    }

    // МЕТОДЫ ДЛЯ МОДАЛЬНЫХ ОКОН
    showAddRecipeModal(mealType) {
        this.selectedMealType = mealType;
        
        const categoriesContainer = document.getElementById('recipeCategories');
        categoriesContainer.innerHTML = '';
        
        const mealCount = this.planData?.settings?.mealCount || 3;
        const dietType = this.planData?.settings?.dietType || 'balanced';
        
        // Определяем подходящие категории
        let relevantCategories = [];
        
        if (mealType === 'breakfast') {
            relevantCategories = [...this.healthyBreakfastCategories];
        } else {
            switch(mealType) {
                case 'lunch':
                    relevantCategories = ['soup', 'main', 'salad', 'side_dish', 'pasta', 'rice'];
                    break;
                case 'dinner':
                    relevantCategories = ['main', 'salad', 'light', 'fish', 'poultry', 'vegetables'];
                    break;
                case 'snack':
                case 'snack1':
                case 'snack2':
                    relevantCategories = ['fruit', 'nuts', 'yogurt', 'snack', 'protein_bar', 'dairy'];
                    break;
                default:
                    relevantCategories = ['main', 'salad', 'snack'];
            }
        }
        
        relevantCategories = relevantCategories.filter(cat => this.isDishTypeAllowed(cat, dietType));
        
        relevantCategories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'category-btn';
            btn.textContent = this.getCategoryDisplayName(category);
            btn.dataset.type = category;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterRecipesByType(category, mealType);
            });
            categoriesContainer.appendChild(btn);
        });
        
        if (categoriesContainer.firstChild) {
            categoriesContainer.firstChild.classList.add('active');
            const firstType = categoriesContainer.firstChild.dataset.type;
            this.filterRecipesByType(firstType, mealType);
        }
        
        document.getElementById('addRecipeModal').classList.add('active');
    }

    getCategoryDisplayName(type) {
        const names = {
            breakfast: '🍳 Завтраки',
            porridge: '🥣 Каши',
            dairy: '🥛 Молочные',
            eggs: '🥚 Яйца',
            baking: '🥐 Выпечка',
            soup: '🍲 Супы',
            main: '🍛 Основные',
            salad: '🥗 Салаты',
            side_dish: '🍚 Гарниры',
            dessert: '🍰 Десерты',
            light: '🥙 Легкие',
            fish: '🐟 Рыба',
            poultry: '🍗 Птица',
            fruit: '🍎 Фрукты',
            nuts: '🥜 Орехи',
            yogurt: '🥛 Йогурты',
            snack: '🥪 Перекусы',
            vegetables: '🥦 Овощи',
            seafood: '🦐 Морепродукты',
            pancakes: '🥞 Блины',
            pasta: '🍝 Паста',
            rice: '🍚 Рис',
            smoothie: '🥤 Смузи',
            protein_bar: '🍫 Протеин'
        };
        return names[type] || type;
    }

    filterRecipesByType(type, mealType) {
        const recipesList = document.getElementById('recipesList');
        recipesList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка рецептов...</div>';
        
        setTimeout(() => {
            let filtered = this.recipes.filter(recipe => 
                this.isRecipeOfType(recipe, type)
            );
            
            if (mealType === 'breakfast') {
                filtered = filtered.filter(recipe => this.isRecipeHealthyForBreakfast(recipe));
            }
            
            const restrictions = this.planData?.settings?.restrictions || [];
            const dietType = this.planData?.settings?.dietType || 'balanced';
            
            const finalFiltered = filtered.filter(recipe => 
                this.isRecipeAllowed(recipe, restrictions, dietType)
            );
            
            // Сортируем по разнообразию
            finalFiltered.sort((a, b) => {
                const aUsage = this.recipeUsageCount[a.name] || 0;
                const bUsage = this.recipeUsageCount[b.name] || 0;
                return aUsage - bUsage;
            }).slice(0, 30);
            
            this.displayRecipesList(finalFiltered, mealType);
        }, 100);
    }

    isRecipeHealthyForBreakfast(recipe) {
        const unhealthyKeywords = ['торт', 'пирожное', 'печенье', 'шоколад', 'конфеты', 'сладкий', 'сахар', 'варенье', 'джем', 'мороженое'];
        const name = recipe.name.toLowerCase();
        const ingredients = recipe.ingredients.join(' ').toLowerCase();
        
        for (const keyword of unhealthyKeywords) {
            if (name.includes(keyword) || ingredients.includes(keyword)) {
                return false;
            }
        }
        
        if (recipe.nutrition.calories > 400) return false;
        if (recipe.nutrition.fat > 25) return false;
        if (recipe.nutrition.carbs > 60 && recipe.nutrition.protein < 10) return false;
        
        return true;
    }

    displayRecipesList(recipes, mealType) {
        const recipesList = document.getElementById('recipesList');
        recipesList.innerHTML = '';
        
        if (recipes.length === 0) {
            recipesList.innerHTML = '<div class="empty-meal"><p>Нет подходящих рецептов</p></div>';
            return;
        }
        
        recipes.forEach(recipe => {
            const item = document.createElement('div');
            item.className = 'recipe-item';
            
            let warning = '';
            if (mealType === 'breakfast' && !this.isRecipeHealthyForBreakfast(recipe)) {
                warning = '<div class="recipe-warning">⚠️ Не рекомендуется для завтрака</div>';
            }
            
            const usageCount = this.recipeUsageCount[recipe.name] || 0;
            let usageBadge = '';
            if (usageCount === 0) {
                usageBadge = '<div class="recipe-usage new">🆕 Новое</div>';
            } else if (usageCount <= 2) {
                usageBadge = `<div class="recipe-usage rare">🔸 Использовано: ${usageCount}</div>`;
            } else {
                usageBadge = `<div class="recipe-usage common">🔻 Использовано: ${usageCount}</div>`;
            }
            
            item.innerHTML = `
                <h5>${recipe.name}</h5>
                <div class="recipe-cat">${recipe.category}</div>
                <div class="recipe-nutrition">
                    <span class="recipe-calories">${recipe.nutrition.calories || 0} ккал/100г</span>
                    <span class="recipe-macros">
                        Б${recipe.nutrition.protein || 0} Ж${recipe.nutrition.fat || 0} У${recipe.nutrition.carbs || 0}
                    </span>
                </div>
                ${usageBadge}
                ${warning}
            `;
            
            item.addEventListener('click', () => {
                this.addRecipeToMeal(recipe);
            });
            
            recipesList.appendChild(item);
        });
    }

    debouncedSearchRecipes(query) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.searchRecipes(query);
        }, 300);
    }

    searchRecipes(query) {
        if (!query.trim()) {
            const activeCategory = document.querySelector('.category-btn.active');
            if (activeCategory) {
                this.filterRecipesByType(activeCategory.dataset.type, this.selectedMealType);
            } else {
                this.displayRecipesList(this.recipes.slice(0, 50), this.selectedMealType);
            }
            return;
        }
        
        const recipesList = document.getElementById('recipesList');
        recipesList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Поиск рецептов...</div>';
        
        setTimeout(() => {
            const searchTerm = query.toLowerCase().trim();
            
            let filtered = this.recipes.filter(recipe => {
                const nameMatch = recipe.name.toLowerCase().includes(searchTerm);
                const categoryMatch = recipe.category.toLowerCase().includes(searchTerm);
                const ingredientMatch = recipe.ingredients.some(ing => 
                    ing.toLowerCase().includes(searchTerm)
                );
                const descriptionMatch = recipe.description?.toLowerCase().includes(searchTerm);
                
                return nameMatch || categoryMatch || ingredientMatch || descriptionMatch;
            });
            
            if (this.selectedMealType === 'breakfast') {
                filtered = filtered.filter(recipe => this.isRecipeHealthyForBreakfast(recipe));
            }
            
            const restrictions = this.planData?.settings?.restrictions || [];
            const dietType = this.planData?.settings?.dietType || 'balanced';
            
            filtered = filtered.filter(recipe => 
                this.isRecipeAllowed(recipe, restrictions, dietType)
            );
            
            // Сортируем по релевантности и разнообразию
            filtered = filtered.sort((a, b) => {
                const aScore = this.calculateSearchScore(a, searchTerm);
                const bScore = this.calculateSearchScore(b, searchTerm);
                
                const aUsage = this.recipeUsageCount[a.name] || 0;
                const bUsage = this.recipeUsageCount[b.name] || 0;
                
                return (bScore - (bUsage * 50)) - (aScore - (aUsage * 50));
            }).slice(0, 50);
            
            this.displayRecipesList(filtered, this.selectedMealType);
        }, 100);
    }

    calculateSearchScore(recipe, searchTerm) {
        let score = 0;
        
        if (recipe.name.toLowerCase().includes(searchTerm)) score += 100;
        if (recipe.category.toLowerCase().includes(searchTerm)) score += 50;
        if (recipe.ingredients.some(ing => ing.toLowerCase().includes(searchTerm))) score += 30;
        if (recipe.description?.toLowerCase().includes(searchTerm)) score += 20;
        
        return score;
    }

    addRecipeToMeal(recipe) {
        if (!this.selectedMealType || !this.planData) return;
        
        if (this.selectedMealType === 'breakfast' && !this.isRecipeHealthyForBreakfast(recipe)) {
            if (!confirm('Это блюдо не рекомендуется для завтрака. Добавить все равно?')) {
                return;
            }
        }
        
        const mealCount = this.planData.settings.mealCount;
        const mealTypes = this.getMealTypes(mealCount);
        const mealInfo = mealTypes[this.selectedMealType];
        const dishType = this.determineRecipeType(recipe);
        
        const meal = this.planData.weeks[this.currentWeek].days[this.currentDay].meals[this.selectedMealType];
        const currentNutrition = meal ? { ...meal.actual } : { calories: 0, protein: 0, fat: 0, carbs: 0 };
        const mealGoals = meal ? meal.goals : { 
            calories: Math.round(this.planData.goals.calories * (mealInfo?.weight || 0.25)),
            protein: Math.round(this.planData.goals.protein * (mealInfo?.weight || 0.25)),
            fat: Math.round(this.planData.goals.fat * (mealInfo?.weight || 0.25)),
            carbs: Math.round(this.planData.goals.carbs * (mealInfo?.weight || 0.25))
        };
        
        const portion = this.calculateOptimalPortion(recipe, dishType, mealGoals, currentNutrition, this.planData.settings.dietType);
        const scaledRecipe = this.createScaledRecipe(recipe, portion, dishType);
        
        if (!this.planData.weeks[this.currentWeek].days[this.currentDay].meals[this.selectedMealType]) {
            this.planData.weeks[this.currentWeek].days[this.currentDay].meals[this.selectedMealType] = {
                name: mealInfo?.name || 'Прием пищи',
                time: mealInfo?.time || '12:00',
                type: this.selectedMealType,
                goals: mealGoals,
                recipes: [],
                actual: { calories: 0, protein: 0, fat: 0, carbs: 0 }
            };
        }
        
        const targetMeal = this.planData.weeks[this.currentWeek].days[this.currentDay].meals[this.selectedMealType];
        targetMeal.recipes.push(scaledRecipe);
        
        // ОБНОВЛЯЕМ ФАКТИЧЕСКИЕ ЗНАЧЕНИЯ
        targetMeal.actual.calories += scaledRecipe.scaledNutrition.calories;
        targetMeal.actual.protein += scaledRecipe.scaledNutrition.protein;
        targetMeal.actual.fat += scaledRecipe.scaledNutrition.fat;
        targetMeal.actual.carbs += scaledRecipe.scaledNutrition.carbs;
        
        this.addRecipeToHistory(recipe.name, this.currentWeek, this.currentDay);
        
        this.renderDay();
        document.getElementById('addRecipeModal').classList.remove('active');
        this.savePlan(true);
    }

    fillMealCaloriesBalanced(mealType) {
        if (!this.planData) return;
        
        const meal = this.planData.weeks[this.currentWeek].days[this.currentDay].meals[mealType];
        if (!meal) return;
        
        const remainingCalories = meal.goals.calories - meal.actual.calories;
        const remainingProtein = meal.goals.protein - meal.actual.protein;
        const remainingFat = meal.goals.fat - meal.actual.fat;
        const remainingCarbs = meal.goals.carbs - meal.actual.carbs;
        
        if (remainingCalories <= 50) {
            showCustomAlert('В этом приеме пищи уже достаточно калорий', 'info');
            return;
        }
        
        let dishType = 'fruit';
        if (remainingProtein > 10) dishType = 'protein_bar';
        else if (remainingFat > 5) dishType = 'nuts';
        else if (remainingCarbs > 20) dishType = 'fruit';
        else {
            switch(mealType) {
                case 'breakfast': dishType = 'yogurt'; break;
                case 'lunch': dishType = 'vegetables'; break;
                case 'dinner': dishType = 'salad'; break;
                default: dishType = 'fruit';
            }
        }
        
        const recipe = this.findUltraDiverseRecipe(dishType, meal.goals, meal.actual, this.planData.settings.dietType, this.currentWeek, this.currentDay);
        if (!recipe) {
            showCustomAlert('Не удалось найти подходящее дополнительное блюдо', 'warning');
            return;
        }
        
        let portion;
        if (dishType === 'protein_bar') portion = 60;
        else if (dishType === 'nuts') portion = 40;
        else {
            portion = Math.min(200, (remainingCalories / (recipe.nutrition.calories || 100)) * 100);
            portion = Math.max(100, Math.min(portion, 250));
        }
        
        portion = Math.round(portion / 25) * 25;
        
        const scaledRecipe = this.createScaledRecipe(recipe, portion, dishType);
        
        meal.recipes.push(scaledRecipe);
        
        meal.actual.calories += scaledRecipe.scaledNutrition.calories;
        meal.actual.protein += scaledRecipe.scaledNutrition.protein;
        meal.actual.fat += scaledRecipe.scaledNutrition.fat;
        meal.actual.carbs += scaledRecipe.scaledNutrition.carbs;
        
        this.addRecipeToHistory(recipe.name, this.currentWeek, this.currentDay);
        
        this.renderDay();
        this.savePlan(true);
    }

    showRecipeModal(recipeName, mealType, recipeIndex) {
        const recipe = this.recipes.find(r => r.name === recipeName);
        if (!recipe) return;
        
        document.getElementById('recipeModalTitle').textContent = recipe.name;
        
        const modalBody = document.getElementById('recipeModalBody');
        modalBody.innerHTML = `
            <div class="recipe-info">
                <div class="recipe-meta">
                    <span class="recipe-category">${recipe.category}</span>
                    <div class="recipe-nutrition-badges">
                        <span class="nutrition-badge">
                            <i class="fas fa-fire"></i>
                            ${recipe.nutrition.calories || 0} ккал/100г
                        </span>
                        <span class="nutrition-badge">
                            <i class="fas fa-dumbbell"></i>
                            Б ${recipe.nutrition.protein || 0}г
                        </span>
                        <span class="nutrition-badge">
                            <i class="fas fa-oil-can"></i>
                            Ж ${recipe.nutrition.fat || 0}г
                        </span>
                        <span class="nutrition-badge">
                            <i class="fas fa-bread-slice"></i>
                            У ${recipe.nutrition.carbs || 0}г
                        </span>
                    </div>
                </div>
                
                <div class="recipe-section">
                    <h4><i class="fas fa-shopping-basket"></i> Ингредиенты</h4>
                    <ul class="ingredients-list">
                        ${recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="recipe-section">
                    <h4><i class="fas fa-list-ol"></i> Способ приготовления</h4>
                    <ol class="instructions-list">
                        ${recipe.instructions.map((step, i) => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
                
                ${recipe.description ? `
                    <div class="recipe-section">
                        <h4><i class="fas fa-info-circle"></i> Описание</h4>
                        <p class="recipe-description">${recipe.description}</p>
                    </div>
                ` : ''}
                
                <div class="recipe-actions">
                    <button class="btn btn-primary" id="adjustPortionBtn">
                        <i class="fas fa-weight"></i> Настроить порцию
                    </button>
                </div>
            </div>
        `;
        
        const adjustBtn = document.getElementById('adjustPortionBtn');
        if (adjustBtn) {
            adjustBtn.addEventListener('click', () => {
                this.showPortionModal(recipe, mealType, recipeIndex);
            });
        }
        
        document.getElementById('recipeModal').classList.add('active');
    }

    showPortionModal(recipe, mealType, recipeIndex) {
        if (!this.planData || !mealType || recipeIndex === undefined) return;
        
        const meal = this.planData.weeks[this.currentWeek].days[this.currentDay].meals[mealType];
        if (!meal || !meal.recipes[recipeIndex]) return;
        
        const currentRecipe = meal.recipes[recipeIndex];
        
        document.getElementById('portionRecipeName').textContent = recipe.name;
        document.getElementById('portionCalories').textContent = currentRecipe.scaledNutrition.calories;
        document.getElementById('portionProtein').textContent = currentRecipe.scaledNutrition.protein + 'г';
        document.getElementById('portionFat').textContent = currentRecipe.scaledNutrition.fat + 'г';
        document.getElementById('portionCarbs').textContent = currentRecipe.scaledNutrition.carbs + 'г';
        
        const portionSlider = document.getElementById('portionSize');
        const portionValue = document.getElementById('portionValue');
        
        portionSlider.value = currentRecipe.portion;
        portionValue.textContent = currentRecipe.portion + ' г';
        
        portionSlider.addEventListener('input', () => {
            const newPortion = parseInt(portionSlider.value);
            portionValue.textContent = newPortion + ' г';
            
            const scaledNutrition = this.scaleNutrition(recipe.nutrition, newPortion);
            document.getElementById('portionCalories').textContent = scaledNutrition.calories;
            document.getElementById('portionProtein').textContent = scaledNutrition.protein + 'г';
            document.getElementById('portionFat').textContent = scaledNutrition.fat + 'г';
            document.getElementById('portionCarbs').textContent = scaledNutrition.carbs + 'г';
        });
        
        document.getElementById('portionSaveBtn').onclick = () => {
            const newPortion = parseInt(portionSlider.value);
            
            const scaledRecipe = this.createScaledRecipe(recipe, newPortion, currentRecipe.dishType);
            meal.recipes[recipeIndex] = scaledRecipe;
            
            this.recalculateMealNutrition(meal);
            this.renderDay();
            
            document.getElementById('portionModal').classList.remove('active');
            document.getElementById('recipeModal').classList.remove('active');
            this.savePlan(true);
        };
        
        document.getElementById('portionRemoveBtn').onclick = () => {
            meal.recipes.splice(recipeIndex, 1);
            
            if (recipe.name && this.recipeUsageCount[recipe.name] > 0) {
                this.recipeUsageCount[recipe.name]--;
            }
            
            this.removeRecipeFromHistory(recipe.name, this.currentWeek, this.currentDay);
            this.recalculateMealNutrition(meal);
            this.renderDay();
            
            document.getElementById('portionModal').classList.remove('active');
            document.getElementById('recipeModal').classList.remove('active');
            this.savePlan(true);
        };
        
        document.getElementById('portionModal').classList.add('active');
    }

    // УЛУЧШЕННЫЙ ПАРСЕР ИНГРЕДИЕНТОВ
    parseIngredient(ingredientStr) {
        try {
            if (!ingredientStr || typeof ingredientStr !== 'string') {
                return {
                    name: 'неизвестный ингредиент',
                    amount: 1,
                    unit: 'шт'
                };
            }
            
            // Очищаем строку
            let cleanStr = ingredientStr.trim();
            
            // Если строка содержит "по вкусу" или "для украшения" - особый случай
            if (cleanStr.toLowerCase().includes('по вкусу') || 
                cleanStr.toLowerCase().includes('для украшения') ||
                cleanStr.toLowerCase().includes('для подачи') ||
                cleanStr.toLowerCase().includes('для смазывания') ||
                cleanStr.toLowerCase().includes('для начинки') ||
                cleanStr.toLowerCase().includes('для коржей') ||
                cleanStr.toLowerCase().includes('для карамели')) {
                return {
                    name: cleanStr,
                    amount: 1,
                    unit: 'по вкусу'
                };
            }
            
            // Специальная обработка для строк типа "Куриное филе 300 гр.: 2 шт"
            // Убираем часть после двоеточия, если она есть
            let strWithoutColon = cleanStr;
            if (cleanStr.includes(':')) {
                const parts = cleanStr.split(':');
                if (parts.length > 1) {
                    // Берем только часть до первого двоеточия
                    strWithoutColon = parts[0].trim();
                }
            }
            
            // Убираем скобки и их содержимое для лучшего парсинга
            let strToParse = strWithoutColon.replace(/\([^)]*\)/g, '').trim();
            
            // Убираем дефисы с пробелами вокруг
            strToParse = strToParse.replace(/\s*-\s*/g, ' ').trim();
            
            // Паттерны для парсинга в порядке приоритета
            const patterns = [
                // Паттерн 1: "300 гр. куриное филе" или "300гр куриное филе" (число + единица + название)
                /^(\d+(?:[.,]\d+)?)\s*(гр?|кг|мл|л|шт|стакан|ч\.?л|ст\.?л|зуб|кусочков?|стеблей?|пучков?|банок?|пакетов?|бутылок?|упаковок?|пачек?)\s+(.+)$/i,
                
                // Паттерн 2: "куриное филе 300 гр." (название + число + единица)
                /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(гр?|кг|мл|л|шт|стакан|ч\.?л|ст\.?л|зуб|кусочков?|стеблей?|пучков?|банок?|пакетов?|бутылок?|упаковок?|пачек?)$/i,
                
                // Паттерн 3: "куриное филе - 300 гр" (с дефисом)
                /^(.+?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*(гр?|кг|мл|л|шт|стакан|ч\.?л|ст\.?л|зуб|кусочков?|стеблей?|пучков?|банок?|пакетов?|бутылок?|упаковок?|пачек?)$/i,
                
                // Паттерн 4: "куриное филе 300" (без единицы измерения)
                /^(.+?)\s+(\d+(?:[.,]\d+)?)$/,
                
                // Паттерн 5: "куриное филе" (только название)
                /^(.+)$/
            ];
            
            // Пробуем парсить строку
            for (let i = 0; i < patterns.length; i++) {
                const match = strToParse.match(patterns[i]);
                if (match) {
                    let name, amount, unit;
                    
                    switch(i) {
                        case 0: // "300 гр. куриное филе"
                            amount = parseFloat(match[1].replace(',', '.'));
                            unit = this.normalizeUnit(match[2]);
                            name = match[3].trim();
                            break;
                            
                        case 1: // "куриное филе 300 гр."
                            name = match[1].trim();
                            amount = parseFloat(match[2].replace(',', '.'));
                            unit = this.normalizeUnit(match[3]);
                            break;
                            
                        case 2: // "куриное филе - 300 гр"
                            name = match[1].trim();
                            amount = parseFloat(match[2].replace(',', '.'));
                            unit = this.normalizeUnit(match[3]);
                            break;
                            
                        case 3: // "куриное филе 300" (без единицы)
                            name = match[1].trim();
                            amount = parseFloat(match[2].replace(',', '.'));
                            
                            // Пытаемся определить единицу по контексту
                            if (this.looksLikeWeightIngredient(name)) {
                                unit = 'г';
                            } else if (this.looksLikeLiquidIngredient(name)) {
                                unit = 'мл';
                            } else {
                                unit = 'шт';
                            }
                            break;
                            
                        case 4: // "куриное филе" (только название)
                            name = match[1].trim();
                            
                            // Определяем количество по умолчанию
                            if (this.looksLikeWeightIngredient(name)) {
                                amount = 100;
                                unit = 'г';
                            } else if (this.looksLikeLiquidIngredient(name)) {
                                amount = 100;
                                unit = 'мл';
                            } else if (this.looksLikeCountableIngredient(name)) {
                                amount = 1;
                                unit = 'шт';
                            } else {
                                amount = 1;
                                unit = 'по вкусу';
                            }
                            break;
                    }
                    
                    // Очищаем название от остаточных скобок и лишних символов
                    name = name.replace(/[()\[\]]/g, '').trim();
                    
                    // Убираем возможные единицы измерения из названия
                    name = this.removeUnitFromName(name);
                    
                    return { name, amount, unit };
                }
            }
            
            // Если не удалось распарсить, возвращаем как есть
            return {
                name: cleanStr,
                amount: 1,
                unit: 'шт'
            };
            
        } catch (error) {
            return {
                name: ingredientStr || 'неизвестный ингредиент',
                amount: 1,
                unit: 'шт'
            };
        }
    }

    // Вспомогательные методы для определения типа ингредиента
    looksLikeWeightIngredient(name) {
        const weightKeywords = ['мясо', 'филе', 'фарш', 'рыба', 'творог', 'сыр', 'мука', 'сахар', 'соль', 'орех', 'семя', 'крупа', 'боб', 'фрукт', 'овощ', 'гриб', 'хлеб', 'тесто', 'шоколад', 'паста', 'масло', 'творог', 'йогурт', 'молоко', 'сливки', 'кефир'];
        const nameLower = name.toLowerCase();
        return weightKeywords.some(keyword => nameLower.includes(keyword));
    }

    looksLikeLiquidIngredient(name) {
        const liquidKeywords = ['вода', 'молоко', 'сок', 'масло', 'уксус', 'соус', 'бульон', 'кефир', 'йогурт', 'сливки', 'ликер', 'вино', 'пиво', 'чай', 'кофе'];
        const nameLower = name.toLowerCase();
        return liquidKeywords.some(keyword => nameLower.includes(keyword));
    }

    looksLikeCountableIngredient(name) {
        const countableKeywords = ['яйцо', 'яйца', 'яблоко', 'помидор', 'огурец', 'перец', 'картофелина', 'морковь', 'луковица', 'голень', 'крыло', 'филе', 'стейк', 'котлета', 'колбаса', 'сосиска', 'булка', 'лепешка', 'лаваш'];
        const nameLower = name.toLowerCase();
        return countableKeywords.some(keyword => nameLower.includes(keyword));
    }

    // Убирает единицы измерения из названия ингредиента
    removeUnitFromName(name) {
        const unitPatterns = [
            /\s+-\s*\d+(?:[.,]\d+)?\s*(?:гр?|кг|мл|л|шт|стакан|ч\.?л|ст\.?л|зуб|кусочков?|стеблей?|пучков?|банок?|пакетов?|бутылок?|упаковок?|пачек?)/i,
            /\s+\d+(?:[.,]\d+)?\s*(?:гр?|кг|мл|л|шт|стакан|ч\.?л|ст\.?л|зуб|кусочков?|стеблей?|пучков?|банок?|пакетов?|бутылок?|упаковок?|пачек?)$/i
        ];
        
        let cleanedName = name;
        unitPatterns.forEach(pattern => {
            cleanedName = cleanedName.replace(pattern, '').trim();
        });
        
        return cleanedName;
    }

    normalizeUnit(unit) {
        if (!unit) return 'шт';
        
        const unitLower = unit.toLowerCase().trim();
        
        const unitMap = {
            // Вес
            'г': 'г', 'гр': 'г', 'г.': 'г', 'грамм': 'г', 'граммов': 'г', 'грамма': 'г',
            'кг': 'кг', 'кг.': 'кг', 'килограмм': 'кг', 'килограммов': 'кг', 'килограмма': 'кг',
            
            // Объем
            'мл': 'мл', 'мл.': 'мл', 'миллилитр': 'мл', 'миллилитров': 'мл', 'миллилитра': 'мл',
            'л': 'л', 'л.': 'л', 'литр': 'л', 'литров': 'л', 'литра': 'л',
            
            // Штуки
            'шт': 'шт', 'шт.': 'шт', 'штук': 'шт', 'штука': 'шт', 'штуки': 'шт',
            
            // Столовые приборы
            'ст.л': 'ст.л.', 'ст.л.': 'ст.л.', 'ст ложка': 'ст.л.', 'столовая ложка': 'ст.л.', 
            'ложка столовая': 'ст.л.', 'столовые ложки': 'ст.л.', 'столовую ложку': 'ст.л.',
            'ч.л': 'ч.л.', 'ч.л.': 'ч.л.', 'ч ложка': 'ч.л.', 'чайная ложка': 'ч.л.', 
            'ложка чайная': 'ч.л.', 'чайные ложки': 'ч.л.', 'чайную ложку': 'ч.л.',
            
            // Другие единицы
            'зуб': 'зуб.', 'зубчик': 'зуб.', 'зубчиков': 'зуб.', 'зубчика': 'зуб.',
            'стакан': 'стакан', 'стаканов': 'стакан', 'стакана': 'стакан', 'стаканы': 'стакан',
            'щепотка': 'щепотка', 'щепоток': 'щепотка', 'щепоть': 'щепотка',
            'пучок': 'пучок', 'пучков': 'пучок', 'пучка': 'пучок',
            'банка': 'банка', 'банок': 'банка', 'банки': 'банка',
            'пакет': 'пакет', 'пакетов': 'пакет', 'пакета': 'пакет',
            'бутылка': 'бутылка', 'бутылок': 'бутылка', 'бутылки': 'бутылка',
            'упаковка': 'упаковка', 'упаковок': 'упаковка', 'упаковки': 'упаковка',
            'пачка': 'пачка', 'пачек': 'пачка', 'пачки': 'пачка',
            'кусочек': 'кусочек', 'кусочков': 'кусочек', 'кусочка': 'кусочек',
            'стебель': 'стебель', 'стеблей': 'стебель', 'стебля': 'стебель',
            
            // Особые случаи
            'по вкусу': 'по вкусу',
            'для украшения': 'для украшения',
            'для подачи': 'для подачи'
        };
        
        // Сначала ищем точное совпадение
        if (unitMap[unitLower]) {
            return unitMap[unitLower];
        }
        
        // Убираем точки в конце для сравнения
        const unitWithoutDot = unitLower.replace(/\.$/, '');
        if (unitMap[unitWithoutDot]) {
            return unitMap[unitWithoutDot];
        }
        
        // Ищем частичное совпадение
        for (const [key, value] of Object.entries(unitMap)) {
            const keyWithoutDot = key.replace(/\.$/, '');
            if (unitLower.includes(key) || unitLower.includes(keyWithoutDot)) {
                return value;
            }
        }
        
        return 'шт';
    }

    // НОВЫЙ МЕТОД: ГЕНЕРАЦИЯ СПИСКА ПОКУПОК С ПРАВИЛЬНОЙ ГРУППИРОВКОЙ БЕЗ ДУБЛИКАТОВ
    // НОВЫЙ УЛУЧШЕННЫЙ МЕТОД: ГЕНЕРАЦИЯ СПИСКА ПОКУПОК С ПРАВИЛЬНОЙ ГРУППИРОВКОЙ
    // НОВЫЙ МЕТОД: ГЕНЕРАЦИЯ СПИСКА ПОКУПОК С ПРАВИЛЬНОЙ ГРУППИРОВКОЙ БЕЗ ДУБЛИКАТОВ
    generateShoppingList() {
        if (!this.planData) {
            showCustomAlert('Сначала создайте план питания', 'warning');
            return;
        }

        console.log('Начинаем генерацию списка покупок...');
        
        // Мапа для хранения ингредиентов
        const ingredientMap = new Map();
        
        // Функция для предварительной очистки названий
        const preCleanName = (name) => {
            let cleaned = name.toLowerCase().trim();
            
            // Удаляем числовые префиксы с единицами измерения
            cleaned = cleaned.replace(/^\d+([.,]\d+)?\s*(гр?|кг|мл|л|шт|%|ст\.?|ч\.?л\.?|ст\.?л\.?)/, '');
            
            // Удаляем числовые суффиксы с единицами измерения
            cleaned = cleaned.replace(/\s+\d+([.,]\d+)?\s*(гр?|кг|мл|л|шт|%|ст\.?|ч\.?л\.?|ст\.?л\.?)$/, '');
            
            // Удаляем специфичные паттерны
            cleaned = cleaned.replace(/\s*-\s*\d+/g, ''); // удаляем " - 300" и подобное
            
            // Удаляем указания количества фруктов/овощей
            cleaned = cleaned.replace(/\s+\d+\s*(шт|яблок[ао]?|помидор[аы]?|огурц[аы]?|морков[ьи]?|перц[аы]?)$/, '');
            
            return cleaned.trim();
        };
        
        // ЗАМЕНИТЕ функцию normalizeIngredientName в методе generateShoppingList() на эту версию:

        const normalizeIngredientName = (name) => {
            if (!name || typeof name !== 'string') return '';
            
            let normalized = name.toLowerCase().trim();
            
            // 1. ОСНОВНАЯ ОЧИСТКА
            // Убираем скобки и их содержимое
            normalized = normalized.replace(/\([^)]*\)/g, '');
            
            // Убираем указания "по вкусу", "для украшения" и т.д.
            normalized = normalized.replace(/\s*(по вкусу|для украшения|для подачи|для смазывания|для начинки|для коржей|для карамели)\s*/g, '');
            
            // 2. УДАЛЕНИЕ ЧИСЛОВЫХ ЧАСТЕЙ (более аккуратное)
            
            // Сначала определим основные категории ингредиентов
            const isLiquid = (str) => /(вода|молоко|кефир|сок|уксус|бульон|соус|масло|вино)/.test(str);
            const isPowder = (str) => /(мука|сахар|соль|пудра|сахарная|пудра|карри|кофе|чай)/.test(str);
            const isSolid = (str) => /(сыр|творог|йогурт|шоколад|орех|мясо|филе|колбаса|сосиска|хлеб|лаваш)/.test(str);
            const isFruitVegetable = (str) => /(яблок|помидор|огурец|морков|перец|виноград|фасоль|гриб|шампиньон)/.test(str);
            
            // Для жидкостей - удаляем все числовые указания
            if (isLiquid(normalized)) {
                normalized = normalized.replace(/\s+\d+([.,]\d+)?\s*(мл|л|ст|ст\.л|ч\.л)/g, '');
                normalized = normalized.replace(/\s+\d+([.,]\d+)?\s*(шт|%|гр?|кг)?/g, '');
            }
            
            // Для порошков/сыпучих - удаляем граммы
            if (isPowder(normalized)) {
                normalized = normalized.replace(/\s+\d+([.,]\d+)?\s*(гр?|кг|ст|ст\.л|ч\.л)/g, '');
            }
            
            // Для фруктов/овощей - удаляем штучные указания
            if (isFruitVegetable(normalized)) {
                normalized = normalized.replace(/\s+\d+\s*(шт|яблок|помидор|огурец|морков|перец)/g, '');
                normalized = normalized.replace(/\s+\d+([.,]\d+)?\s*(гр?|кг)/g, '');
            }
            
            // Для остальных - общая очистка
            normalized = normalized.replace(/\s+\d+([.,]\d+)?\s*(гр?|кг|мл|л|шт|%|ст|ч\.л|ст\.л)/g, '');
            
            // Убираем дефисы
            normalized = normalized.replace(/\s*-\s*/g, ' ').trim();
            
            // Убираем лишние пробелы
            normalized = normalized.replace(/\s+/g, ' ').trim();
            
            // Убираем знаки препинания в конце
            normalized = normalized.replace(/[.,;:!?]+$/, '');
            
            // 3. СТАНДАРТИЗАЦИЯ НАЗВАНИЙ
            const standardNames = {
                // ВОДА и жидкости
                'вода': 'вода',
                'вода теплая': 'вода',
                'вода горячая': 'вода',
                'бульон': 'бульон',
                'лимонный сок': 'лимонный сок',
                'сок лимона': 'лимонный сок',
                'сок апельсина': 'апельсиновый сок',
                'томатный сок': 'томатный сок',
                'вино белое': 'белое вино',
                'уксус': 'уксус',
                'уксус 9%': 'уксус',
                'соус соевый': 'соевый соус',
                'соевый соус': 'соевый соус',
                'малиновый соус': 'малиновый соус',
                'для малинового соуса': 'малиновый соус',
                'томатная паста': 'томатная паста',
                
                // МОЛОЧНЫЕ ПРОДУКТЫ
                'молоко': 'молоко',
                'сухое молоко обезжиренное': 'сухое молоко',
                'миндальное молоко': 'миндальное молоко',
                'кокосовое молоко': 'кокосовое молоко',
                'кефир': 'кефир',
                'кефир 1%': 'кефир',
                'кефир 3,2%': 'кефир',
                'йогурт': 'йогурт',
                'йогурт натуральный': 'йогурт',
                'натуральный йогурт': 'йогурт',
                'сливки': 'сливки',
                'сливки 10%': 'сливки',
                
                // СЫРЫ
                'сыр': 'сыр',
                'адыгейский сыр': 'адыгейский сыр',
                'сыр адыгейский': 'адыгейский сыр',
                'сыр пармезан': 'сыр пармезан',
                'сыр фета': 'сыр фета',
                'сливочный сыр': 'сливочный сыр',
                'бекон сыр': 'сыр',
                
                // ТВОРОГ
                'творог': 'творог',
                'творог 0%': 'творог',
                'творог 2%': 'творог',
                'творог жирный': 'творог',
                
                // МАСЛА
                'масло': 'масло',
                'масло сливочное': 'сливочное масло',
                'сливочное масло': 'сливочное масло',
                'масло растительное': 'растительное масло',
                'растительное масло': 'растительное масло',
                'масло кокосовое': 'кокосовое масло',
                'кокосовое масло': 'кокосовое масло',
                
                // МУКА и КРУПЫ
                'мука': 'мука',
                'мука пшеничная': 'мука пшеничная',
                'пшеничная мука': 'мука пшеничная',
                'мука рисовая': 'мука рисовая',
                'рисовая мука': 'мука рисовая',
                'мука кукурузная': 'мука кукурузная',
                'кукурузная мука': 'мука кукурузная',
                'мука овсяная': 'мука овсяная',
                'овсяная мука': 'мука овсяная',
                'мука цельнозерновая': 'мука цельнозерновая',
                'цельнозерновая мука': 'мука цельнозерновая',
                'мука кокосовая': 'мука кокосовая',
                'кокосовая мука': 'мука кокосовая',
                'манная крупа': 'манная крупа',
                
                // САХАР и СЛАДОСТИ
                'сахар': 'сахар',
                'сахар ванильный': 'ванильный сахар',
                'сахар тростниковый': 'тростниковый сахар',
                'тростниковый сахар': 'тростниковый сахар',
                'сахарная пудра': 'сахарная пудра',
                'сахарный песок': 'сахар',
                'заменитель сахара': 'заменитель сахара',
                'шоколад': 'шоколад',
                'шоколад белый': 'белый шоколад',
                'белый шоколад': 'белый шоколад',
                'шоколад горький': 'горький шоколад',
                'горький шоколад': 'горький шоколад',
                'шоколад молочный': 'молочный шоколад',
                'молочный шоколад': 'молочный шоколад',
                'кокосовый сахар': 'кокосовый сахар',
                
                // СОЛЬ и ПРИПРАВЫ
                'соль': 'соль',
                'соль гималайская розовая': 'соль',
                'соль морская': 'соль',
                'карри': 'карри',
                'мускатный орех': 'мускатный орех',
                'паста карри': 'паста карри',
                'паста птитим': 'паста птитим',
                'кофе': 'кофе',
                'чай молочный улун сухой': 'чай улун',
                'чай улун': 'чай улун',
                
                // ОРЕХИ
                'орехи': 'орехи',
                'орехи грецкие': 'грецкие орехи',
                'грецкие орехи': 'грецкие орехи',
                'орехи кешью': 'кешью',
                'кешью': 'кешью',
                'арахисовая паста': 'арахисовая паста',
                
                // ОВОЩИ
                'яблоки': 'яблоки',
                'яблоко': 'яблоки',
                'помидоры': 'помидоры',
                'помидор': 'помидоры',
                'огурцы': 'огурцы',
                'огурец': 'огурцы',
                'морковь': 'морковь',
                'перец': 'перец',
                'болгарский перец': 'болгарский перец',
                'красный перец': 'красный перец',
                'черный перец': 'черный перец',
                'виноград': 'виноград',
                'шампиньоны': 'шампиньоны',
                'грибы жареные': 'грибы',
                
                // БОБОВЫЕ
                'фасоль': 'фасоль',
                'фасоль белая': 'фасоль белая',
                'белая фасоль': 'фасоль белая',
                'фасоль консервированная': 'фасоль консервированная',
                'фасоль красная консервированная': 'фасоль консервированная',
                'фасоль стручковая': 'стручковая фасоль',
                'стручковая фасоль': 'стручковая фасоль',
                
                // МЯСО и РЫБА
                'куриное филе': 'куриное филе',
                'филе индейки': 'филе индейки',
                'филе минтая': 'филе рыбы',
                'филе пангасиуса': 'филе рыбы',
                'филе сельди': 'филе рыбы',
                'филе трески': 'филе рыбы',
                'свинина': 'свинина',
                'фарш говяжий': 'фарш говяжий',
                'колбаса': 'колбаса',
                'колбаса вареная': 'колбаса',
                'колбаса варено копченая сервелат': 'колбаса',
                'сосиска': 'сосиски',
                'сосиски': 'сосиски',
                'бекон': 'бекон',
                
                // ХЛЕБ и ВЫПЕЧКА
                'хлеб': 'хлеб',
                'хлеб белый': 'хлеб белый',
                'белый хлеб': 'хлеб белый',
                'хлеб черный': 'хлеб черный',
                'чёрный хлеб': 'хлеб черный',
                'лаваш': 'лаваш',
                'лепешка ржаная': 'ржаная лепешка',
                
                // ЯЙЦА
                'яйца': 'яйца',
                'яйцо': 'яйца'
            };
            
            // 4. ПРИМЕНЕНИЕ СТАНДАРТНЫХ НАЗВАНИЙ
            
            // Сначала проверяем точное совпадение
            if (standardNames[normalized]) {
                return standardNames[normalized];
            }
            
            // Проверяем частичные совпадения (ищем ключи, которые содержатся в normalized)
            for (const [key, value] of Object.entries(standardNames)) {
                if (normalized.includes(key) && key.length > 2) {
                    // Особые случаи: если нашли "масло", проверяем контекст
                    if (key === 'масло' && (normalized.includes('сливочное') || normalized.includes('растительное'))) {
                        continue; // Пропускаем, так как это будет обработано специальными ключами
                    }
                    // Особые случаи: если нашли "сыр", проверяем тип
                    if (key === 'сыр' && (normalized.includes('адыгейск') || normalized.includes('пармезан') || normalized.includes('фета'))) {
                        continue; // Пропускаем, так как это будет обработано специальными ключами
                    }
                    // Особые случаи: если нашли "мука", проверяем тип
                    if (key === 'мука' && (normalized.includes('пшенич') || normalized.includes('рисов') || normalized.includes('кукуруз'))) {
                        continue; // Пропускаем, так как это будет обработано специальными ключами
                    }
                    // Особые случаи: если нашли "перец", проверяем тип
                    if (key === 'перец' && (normalized.includes('болгарск') || normalized.includes('красн') || normalized.includes('черн'))) {
                        continue; // Пропускаем, так как это будет обработано специальными ключами
                    }
                    
                    return value;
                }
            }
            
            // 5. ФИНАЛЬНАЯ ОЧИСТКА (удаляем остатки цифр)
            normalized = normalized.replace(/\s+\d+/g, '');
            normalized = normalized.replace(/\s+/g, ' ').trim();
            
            return normalized || 'неизвестный ингредиент';
        };

        // ДОБАВЬТЕ эту вспомогательную функцию перед normalizeIngredientName:
        const cleanNumericParts = (str) => {
            if (!str || typeof str !== 'string') return str;
            
            // Удаляем числовые части в различных форматах
            return str
                .replace(/\s+\d+([.,]\d+)?\s*(гр?|кг|мл|л|шт|%|ст|ст\.|ст\.л|ч\.|ч\.л)/g, '')
                .replace(/\s+\d+\s*(шт|яблок[ао]?|помидор[аы]?|огурц[аы]?|морков[ьи]?|перц[аы]?)/g, '')
                .replace(/\s+\d+([.,]\d+)?/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        };
        
        // Функция для конвертации в стандартные единицы
        const convertToStandardUnit = (amount, unit) => {
            if (!unit) return { amount: amount || 1, unit: 'шт' };
            
            const unitLower = unit.toLowerCase();
            
            // Таблица конвертации
            const conversionTable = {
                // Вес
                'г': { factor: 1, unit: 'г' },
                'гр': { factor: 1, unit: 'г' },
                'г.': { factor: 1, unit: 'г' },
                'грамм': { factor: 1, unit: 'г' },
                'граммов': { factor: 1, unit: 'г' },
                'кг': { factor: 1000, unit: 'г' },
                'кг.': { factor: 1000, unit: 'г' },
                'килограмм': { factor: 1000, unit: 'г' },
                'килограммов': { factor: 1000, unit: 'г' },
                
                // Объем
                'мл': { factor: 1, unit: 'мл' },
                'мл.': { factor: 1, unit: 'мл' },
                'миллилитр': { factor: 1, unit: 'мл' },
                'миллилитров': { factor: 1, unit: 'мл' },
                'л': { factor: 1000, unit: 'мл' },
                'л.': { factor: 1000, unit: 'мл' },
                'литр': { factor: 1000, unit: 'мл' },
                'литров': { factor: 1000, unit: 'мл' },
                'стакан': { factor: 250, unit: 'мл' },
                'стаканов': { factor: 250, unit: 'мл' },
                'стакана': { factor: 250, unit: 'мл' },
                
                // Столовые приборы
                'ст.л.': { factor: 15, unit: 'г' },
                'ст.л': { factor: 15, unit: 'г' },
                'ст ложка': { factor: 15, unit: 'г' },
                'столовая ложка': { factor: 15, unit: 'г' },
                'столовые ложки': { factor: 15, unit: 'г' },
                'столовую ложку': { factor: 15, unit: 'г' },
                'ч.л.': { factor: 5, unit: 'г' },
                'ч.л': { factor: 5, unit: 'г' },
                'чайная ложка': { factor: 5, unit: 'г' },
                'чайные ложки': { factor: 5, unit: 'г' },
                'чайную ложку': { factor: 5, unit: 'г' },
                
                // Штуки
                'шт': { factor: 1, unit: 'шт' },
                'шт.': { factor: 1, unit: 'шт' },
                'штук': { factor: 1, unit: 'шт' },
                'штука': { factor: 1, unit: 'шт' },
                'штуки': { factor: 1, unit: 'шт' },
                'зуб.': { factor: 1, unit: 'шт' },
                'зубчик': { factor: 1, unit: 'шт' },
                'зубчиков': { factor: 1, unit: 'шт' },
                'зубчика': { factor: 1, unit: 'шт' },
                'кусочек': { factor: 1, unit: 'шт' },
                'кусочков': { factor: 1, unit: 'шт' },
                'кусочка': { factor: 1, unit: 'шт' },
                'стебель': { factor: 1, unit: 'шт' },
                'стеблей': { factor: 1, unit: 'шт' },
                'стебля': { factor: 1, unit: 'шт' },
                'пучок': { factor: 1, unit: 'шт' },
                'пучков': { factor: 1, unit: 'шт' },
                'пучка': { factor: 1, unit: 'шт' },
                'банка': { factor: 1, unit: 'шт' },
                'банок': { factor: 1, unit: 'шт' },
                'банки': { factor: 1, unit: 'шт' },
                'пакет': { factor: 1, unit: 'шт' },
                'пакетов': { factor: 1, unit: 'шт' },
                'пакета': { factor: 1, unit: 'шт' },
                'бутылка': { factor: 1, unit: 'шт' },
                'бутылок': { factor: 1, unit: 'шт' },
                'бутылки': { factor: 1, unit: 'шт' },
                'упаковка': { factor: 1, unit: 'шт' },
                'упаковок': { factor: 1, unit: 'шт' },
                'упаковки': { factor: 1, unit: 'шт' },
                'пачка': { factor: 1, unit: 'шт' },
                'пачек': { factor: 1, unit: 'шт' },
                'пачки': { factor: 1, unit: 'шт' }
            };
            
            // Сначала ищем точное совпадение
            if (conversionTable[unitLower]) {
                const conv = conversionTable[unitLower];
                return {
                    amount: (amount || 1) * conv.factor,
                    unit: conv.unit
                };
            }
            
            // Убираем точки в конце для сравнения
            const unitWithoutDot = unitLower.replace(/\.$/, '');
            if (conversionTable[unitWithoutDot]) {
                const conv = conversionTable[unitWithoutDot];
                return {
                    amount: (amount || 1) * conv.factor,
                    unit: conv.unit
                };
            }
            
            // Ищем частичное совпадение
            for (const [key, value] of Object.entries(conversionTable)) {
                const keyWithoutDot = key.replace(/\.$/, '');
                if (unitLower.includes(key) || unitLower.includes(keyWithoutDot)) {
                    return {
                        amount: (amount || 1) * value.factor,
                        unit: value.unit
                    };
                }
            }
            
            return { amount: amount || 1, unit: unit || 'шт' };
        };
        
        // Проходим по всем неделям, дням и приемам пищи
        Object.values(this.planData.weeks || {}).forEach(week => {
            Object.values(week.days || {}).forEach(day => {
                Object.values(day.meals || {}).forEach(meal => {
                    meal.recipes.forEach(recipe => {
                        // Получаем масштабированные ингредиенты
                        const portionMultiplier = recipe.portion / 100;
                        
                        recipe.ingredients.forEach(ingredient => {
                            if (!ingredient || typeof ingredient !== 'string') {
                                return;
                            }
                            
                            ingredient = ingredient.trim();
                            
                            // Пропускаем пустые и служебные ингредиенты
                            if (!ingredient || 
                                ingredient.toLowerCase().includes('которую потом выбросим') ||
                                ingredient.toLowerCase().includes('для украшения') ||
                                ingredient.toLowerCase().includes('для подачи') ||
                                ingredient.toLowerCase().includes('по вкусу') ||
                                ingredient.toLowerCase().includes('для смазывания') ||
                                ingredient.toLowerCase().includes('для начинки') ||
                                ingredient.toLowerCase().includes('для коржей') ||
                                ingredient.toLowerCase().includes('для карамели') ||
                                ingredient.toLowerCase().includes('для теста') ||
                                ingredient.toLowerCase().includes('для соуса') ||
                                ingredient.toLowerCase().includes('щепотка')) {
                                return;
                            }
                            
                            // Парсим ингредиент
                            const parsed = this.parseIngredient(ingredient);
                            
                            if (parsed) {
                                const { name, amount, unit } = parsed;
                                
                                // Пропускаем ингредиенты "по вкусу" и служебные
                                if (!name || unit === 'по вкусу' || 
                                    name.toLowerCase().includes('по вкусу') ||
                                    name.toLowerCase().includes('для украшения') ||
                                    name.toLowerCase().includes('для подачи') ||
                                    amount === 0) {
                                    return;
                                }
                                
                                // Масштабируем количество
                                const scaledAmount = (amount || 1) * portionMultiplier;
                                
                                // Нормализуем название
                                const normalizedName = normalizeIngredientName(name);
                                
                                if (!normalizedName || normalizedName.length < 2) {
                                    return;
                                }
                                
                                // Конвертируем в стандартные единицы
                                const { amount: standardAmount, unit: standardUnit } = 
                                    convertToStandardUnit(scaledAmount, unit);
                                
                                // Ключ для группировки - только название
                                const key = normalizedName;
                                
                                if (ingredientMap.has(key)) {
                                    const existing = ingredientMap.get(key);
                                    
                                    // Суммируем количество если единицы совпадают
                                    if (existing.unit === standardUnit) {
                                        existing.amount += standardAmount;
                                    } else if ((existing.unit === 'г' && standardUnit === 'кг') || 
                                            (existing.unit === 'кг' && standardUnit === 'г')) {
                                        // Конвертируем кг в г
                                        let amount1 = existing.unit === 'кг' ? existing.amount * 1000 : existing.amount;
                                        let amount2 = standardUnit === 'кг' ? standardAmount * 1000 : standardAmount;
                                        existing.amount = amount1 + amount2;
                                        existing.unit = 'г';
                                    } else if ((existing.unit === 'мл' && standardUnit === 'л') || 
                                            (existing.unit === 'л' && standardUnit === 'мл')) {
                                        // Конвертируем л в мл
                                        let amount1 = existing.unit === 'л' ? existing.amount * 1000 : existing.amount;
                                        let amount2 = standardUnit === 'л' ? standardAmount * 1000 : standardAmount;
                                        existing.amount = amount1 + amount2;
                                        existing.unit = 'мл';
                                    }
                                    // Для штучных товаров просто складываем
                                    else if (existing.unit === 'шт' && standardUnit === 'шт') {
                                        existing.amount += standardAmount;
                                    }
                                    
                                } else {
                                    // Создаем новый ингредиент
                                    ingredientMap.set(key, {
                                        name: normalizedName,
                                        amount: standardAmount,
                                        unit: standardUnit
                                    });
                                }
                            }
                        });
                    });
                });
            });
        });
        
        // Конвертируем Map в массив и сортируем
        let ingredientsArray = Array.from(ingredientMap.values());
        
        // Функция для форматирования вывода
        const formatForDisplay = (item) => {
            let displayAmount, displayUnit;
            
            if (item.unit === 'г') {
                if (item.amount >= 1000) {
                    displayAmount = (item.amount / 1000).toFixed(1);
                    displayUnit = 'кг';
                } else {
                    displayAmount = Math.round(item.amount);
                    displayUnit = 'г';
                }
            } else if (item.unit === 'мл') {
                if (item.amount >= 1000) {
                    displayAmount = (item.amount / 1000).toFixed(1);
                    displayUnit = 'л';
                } else {
                    displayAmount = Math.round(item.amount);
                    displayUnit = 'мл';
                }
            } else if (item.unit === 'шт') {
                displayAmount = Math.round(item.amount);
                displayUnit = 'шт';
            } else {
                displayAmount = Math.round(item.amount);
                displayUnit = item.unit;
            }
            
            return {
                displayName: this.capitalizeFirstLetter(item.name),
                displayAmount: displayAmount,
                displayUnit: displayUnit
            };
        };
        
        // Форматируем все ингредиенты
        ingredientsArray = ingredientsArray.map(item => {
            const formatted = formatForDisplay(item);
            return {
                ...item,
                displayName: formatted.displayName,
                displayAmount: formatted.displayAmount,
                displayUnit: formatted.displayUnit
            };
        });
        
        // Сортируем по названию (без учета регистра)
        ingredientsArray.sort((a, b) => {
            return a.displayName.localeCompare(b.displayName, 'ru', { sensitivity: 'base' });
        });
        
        // Форматируем список
        let shoppingList = '📋 СПИСОК ПОКУПОК\n';
        
        // Выводим все ингредиенты
        ingredientsArray.forEach(item => {
            shoppingList += `• ${item.displayName}: ${item.displayAmount} ${item.displayUnit}\n`;
        });
        
        // Создаем и скачиваем файл
        const blob = new Blob([shoppingList], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        // Генерируем имя файла
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        
        a.href = url;
        a.download = `Список_покупок_${dateStr}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        
        // Отладочная информация в консоль
        console.log('Список покупок сгенерирован успешно');
        console.log(`Всего уникальных позиций: ${ingredientMap.size}`);

        const postProcessGroupedIngredients = (ingredientsArray) => {
            const finalIngredients = [];
            const seen = new Set();
            
            // Сначала объединяем дубликаты, которые могли появиться из-за разных нормализаций
            const mergedMap = new Map();
            
            ingredientsArray.forEach(item => {
                const key = item.displayName.toLowerCase();
                
                // Для яиц - всегда группируем как "Яйца"
                if (key.includes('яйц')) {
                    const existing = mergedMap.get('яйца');
                    if (existing) {
                        // Суммируем количество
                        if (existing.unit === 'шт' && item.unit === 'шт') {
                            existing.amount += item.amount;
                            existing.displayAmount += item.displayAmount;
                        } else {
                            // Конвертируем в стандартные единицы
                            const amount1 = existing.unit === 'шт' ? existing.amount : existing.amount;
                            const amount2 = item.unit === 'шт' ? item.amount : item.amount;
                            existing.amount = amount1 + amount2;
                            existing.displayAmount = Math.round(existing.amount);
                            existing.unit = 'шт';
                            existing.displayUnit = 'шт';
                        }
                    } else {
                        mergedMap.set('яйца', { ...item });
                    }
                }
                // Для воды - всегда группируем как "Вода"
                else if (key.includes('вода') && !key.includes('томат') && !key.includes('апельсин')) {
                    const existing = mergedMap.get('вода');
                    if (existing) {
                        // Суммируем в миллилитрах
                        const amount1 = existing.unit === 'л' ? existing.amount * 1000 : 
                                    existing.unit === 'мл' ? existing.amount : existing.amount;
                        const amount2 = item.unit === 'л' ? item.amount * 1000 : 
                                    item.unit === 'мл' ? item.amount : item.amount;
                        existing.amount = amount1 + amount2;
                        if (existing.amount >= 1000) {
                            existing.displayAmount = (existing.amount / 1000).toFixed(1);
                            existing.displayUnit = 'л';
                        } else {
                            existing.displayAmount = Math.round(existing.amount);
                            existing.displayUnit = 'мл';
                        }
                        existing.unit = 'мл';
                    } else {
                        mergedMap.set('вода', { ...item });
                    }
                }
                // Для молока - всегда группируем как "Молоко"
                else if (key.includes('молоко') && !key.includes('миндальн') && !key.includes('кокосов')) {
                    const existing = mergedMap.get('молоко');
                    if (existing) {
                        // Суммируем в граммах
                        const amount1 = existing.unit === 'кг' ? existing.amount * 1000 : 
                                    existing.unit === 'г' ? existing.amount : existing.amount;
                        const amount2 = item.unit === 'кг' ? item.amount * 1000 : 
                                    item.unit === 'г' ? item.amount : item.amount;
                        existing.amount = amount1 + amount2;
                        if (existing.amount >= 1000) {
                            existing.displayAmount = (existing.amount / 1000).toFixed(1);
                            existing.displayUnit = 'кг';
                        } else {
                            existing.displayAmount = Math.round(existing.amount);
                            existing.displayUnit = 'г';
                        }
                        existing.unit = 'г';
                    } else {
                        mergedMap.set('молоко', { ...item });
                    }
                }
                // Для яблок - всегда группируем как "Яблоки"
                else if (key.includes('яблок')) {
                    const existing = mergedMap.get('яблоки');
                    if (existing) {
                        // Суммируем штуки
                        if (existing.unit === 'шт' && item.unit === 'шт') {
                            existing.amount += item.amount;
                            existing.displayAmount += item.displayAmount;
                        } else {
                            existing.amount += item.amount || item.displayAmount || 0;
                            existing.displayAmount = Math.round(existing.amount);
                            existing.unit = 'шт';
                            existing.displayUnit = 'шт';
                        }
                    } else {
                        mergedMap.set('яблоки', { ...item });
                    }
                }
                // Для помидоров - всегда группируем как "Помидоры"
                else if (key.includes('помидор')) {
                    const existing = mergedMap.get('помидоры');
                    if (existing) {
                        // Суммируем штуки
                        if (existing.unit === 'шт' && item.unit === 'шт') {
                            existing.amount += item.amount;
                            existing.displayAmount += item.displayAmount;
                        } else {
                            existing.amount += item.amount || item.displayAmount || 0;
                            existing.displayAmount = Math.round(existing.amount);
                            existing.unit = 'шт';
                            existing.displayUnit = 'шт';
                        }
                    } else {
                        mergedMap.set('помидоры', { ...item });
                    }
                }
                // Для огурцов - всегда группируем как "Огурцы"
                else if (key.includes('огурец')) {
                    const existing = mergedMap.get('огурцы');
                    if (existing) {
                        // Суммируем штуки
                        if (existing.unit === 'шт' && item.unit === 'шт') {
                            existing.amount += item.amount;
                            existing.displayAmount += item.displayAmount;
                        } else {
                            existing.amount += item.amount || item.displayAmount || 0;
                            existing.displayAmount = Math.round(existing.amount);
                            existing.unit = 'шт';
                            existing.displayUnit = 'шт';
                        }
                    } else {
                        mergedMap.set('огурцы', { ...item });
                    }
                }
                // Для остальных - добавляем как есть
                else {
                    mergedMap.set(key, { ...item });
                }
            });
            
            // Конвертируем Map обратно в массив
            return Array.from(mergedMap.values());
        };

        // И ИЗМЕНИТЕ код после группировки в generateShoppingList():
        // ... существующий код группировки ...

        // После сортировки и форматирования ingredientsArray, добавьте:
        ingredientsArray = postProcessGroupedIngredients(ingredientsArray);

        // ... продолжение формирования списка ...
    }

    // Вспомогательный метод для капитализации первой буквы
    capitalizeFirstLetter(string) {
        if (!string) return '';
        // Капитализируем первую букву и убираем лишние пробелы
        return string
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^\w/, c => c.toUpperCase());
    }

    // Вспомогательный метод для капитализации первой буквы
    capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Вспомогательный метод для получения названия типа питания
    getDietTypeName(dietType) {
        const dietNames = {
            'balanced': 'Сбалансированное',
            'keto': 'Кето',
            'vegetarian': 'Вегетарианское',
            'vegan': 'Веганское',
            'high_protein': 'Высокобелковое',
            'low_fat': 'Низкожировое',
            'low_carb': 'Низкоуглеводное'
        };
        
        return dietNames[dietType] || dietType;
    }
    // Функция для определения, является ли продукт фруктом/овощем для группировки
    isGroupableProduct(name) {
        const groupableProducts = [
            'яблок', 'перец', 'помидор', 'огурец', 'морков', 'лук', 'чеснок',
            'картофель', 'свекл', 'редис', 'капуст', 'салат', 'шпинат',
            'банан', 'апельсин', 'мандарин', 'лимон', 'лайм', 'груш',
            'слив', 'абрикос', 'персик', 'нектарин', 'вишн', 'черешн',
            'клубник', 'малин', 'ежевик', 'черник', 'голубик', 'брусник'
        ];
        
        const nameLower = name.toLowerCase();
        return groupableProducts.some(product => nameLower.includes(product));
    }
    // Дополнительный метод для нормализации названий (добавить в класс)
    capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Обновленный метод categorizeIngredient для лучшей классификации
    categorizeIngredient(name) {
        if (!name) return '🛒 Прочее';
        
        const nameLower = name.toLowerCase().trim();
        
        // Мясо и птица
        if (/(курин|индейк|утк|гус|перепел|фазан|кролик|заяц|оленин|телятин|конин|баран|свинин|говядин|мясн|фарш|колбас|сосиск|ветчин|бекон|карбонад|сало|грудк|окорок|бедр|голен|крыл|стейк|отбивн|шашлык)/.test(nameLower)) {
            // Но исключаем "куриный бульон" - он идет в прочее
            if (!nameLower.includes('бульон') && !nameLower.includes('бульона')) {
                return '🥩 Мясо и птица';
            }
        }
        
        // Рыба и морепродукты
        if (/(лосос|семг|форел|тунец|сельд|скумбр|окун|карп|щук|судак|камбал|палтус|треск|минта|горбуш|кет|икра|краб|кревет|кальмар|миди|гребешок|осьминог|каракатиц|устриц|омар|лобстер|рыб|филе рыб|пангасиус)/.test(nameLower)) {
            // Исключаем "сельдерей" - это овощ
            if (!nameLower.includes('сельдерей')) {
                return '🐟 Рыба и морепродукты';
            }
        }
        
        // Молочные продукты
        if (/(молок|кефир|йогурт|ряженк|простокваш|сметан|творог|сыр|брынз|адыгейск|моцарел|пармезан|чеддер|сулугун|сливк|масло сливочн|маргарин|спред|топлен|творожный сыр|плавленый сыр|сливочный сыр|филадельфия)/.test(nameLower)) {
            return '🥛 Молочные продукты';
        }
        
        // Яйца
        if (/(яйц|яич|желток|белок|перепелин|страусин)/.test(nameLower)) {
            return '🥚 Яйца';
        }
        
        // Овощи
        if (/(авокадо|баклажан|перец болгарск|перец сладк|зелен|петрушк|укроп|кинз|базилик|тимьян|мята|щавель|шпинат|руккол|салат|спарж|капуст|картофель|морков|свекл|редьк|редис|реп|лук|чеснок|помидор|томат|огур|кабачк|тыкв|сельдерей|оливк|маслин|артишок|брокколи|цветная капуст|кабачок|цуккини|патиссон|редиска)/.test(nameLower)) {
            return '🥦 Овощи';
        }
        
        // Фрукты и ягоды
        if (/(апельсин|мандарин|грейпфрут|помело|лайм|лимон|гранат|виноград|арбуз|дын|ананас|манго|папай|гуав|маракуй|финик|инжир|хурм|фейхоа|личи|рамбутан|дуриан|питай|яблок|груш|слив|абрикос|персик|нектарин|вишн|черешн|клубник|земляник|малин|ежевик|черник|голубик|брусник|клюкв|облепих|рябин|калин|киви|банан)/.test(nameLower)) {
            return '🍎 Фрукты и ягоды';
        }
        
        // Крупы, злаки и бобовые
        if (/(гречк|рис|овсян|пшен|перлов|ячмен|кукурузн|манн|мука|круп|хлопь|отруб|зерн|злак|семен|семечк|кунжут|лен|льнян|чиа|подсолнечн|тыквенн|кедров|арахис|фундук|миндал|кешью|фисташк|мак|нут|фасол|горох|чечевиц|боб|соя|киноа|булгур|кус-кус|полба|амарант|теф|сорго|бобы|горошек)/.test(nameLower)) {
            return '🍚 Крупы, злаки и бобовые';
        }
        
        // Хлеб и выпечка
        if (/(хлеб|булка|батон|лаваш|лепешк|пит|тортиль|тест|сухар|гренк|крекер|печенье|пряник|бублик|баранк|сушк|вафл|кекс|маффин|пирог|пирожок|пончик|булочк|рогалик|круасан|бриош)/.test(nameLower)) {
            return '🍞 Хлеб и выпечка';
        }
        
        // Специи, приправы и соусы
        if (/(соль|перец черн|перец красн|перец бел|сахар|ванил|кориц|имбир|куркум|карри|паприк|чили|мускат|лавров|базилик|орегано|тимьян|розмарин|майоран|чабер|эстрагон|шалфей|горчиц|кетчуп|майонез|соус|уксус|разрыхлитель|сода|дрожж|желатин|агар|пектин|крахмал|приправа|специ|пряност)/.test(nameLower)) {
            return '🧂 Специи, приправы и соусы';
        }
        
        // Сладости и орехи
        if (/(шоколад|конфет|печенье|пряник|зефир|мармелад|пастил|халв|нуга|грильяж|щербет|мороженое|торт|пирожное|кекс|вафл|бисквит|крек|орех|миндал|кешью|фисташк|грецк|фундук|арахис|семечк|семян|изюм|кураг|чернослив|финик)/.test(nameLower)) {
            return '🍫 Сладости и орехи';
        }
        
        // Масла и жиры (кроме сливочного)
        if (/(масло оливков|масло подсолнечн|масло растительн|масло кокосов|кокосовое масло|оливковое масло|подсолнечное масло|растительное масло|масло льнян|масло кунжутн|масло авокадо|жир)/.test(nameLower)) {
            return '🛒 Прочее';
        }
        
        // Напитки и жидкости
        if (/(вода|бульон|сок|компот|морс|кисель|чай|кофе|какао|напиток|ликер|вино|пиво|алкоголь|минералка|газировка|лимонад)/.test(nameLower)) {
            return '🛒 Прочее';
        }
        
        return '🛒 Прочее';
    }

    categorizeIngredient(name) {
        if (!name) return '🛒 Прочее';
        
        const nameLower = name.toLowerCase().trim();
        
        // Убираем скобки и их содержимое
        const cleanName = nameLower.replace(/\([^)]*\)/g, '').trim();
        
        // Определяем категорию по ключевым словам
        // Мясо и птица
        if (/(индейка|куриц|мясн|фарш|свинин|говядин|баран|телятин|конин|оленин|кролик|заяц|фазан|перепел|утк|гус|бройлер|филе|грудка|окорок|бедро|голень|крыло|колбас|сосиск|ветчин|бекон|сало|карбонад)/i.test(cleanName)) {
            return '🥩 Мясо и птица';
        }
        
        // Рыба и морепродукты
        if (/(лосос|семг|форел|тунец|сельд|скумбр|окун|карп|щук|судак|камбал|палтус|треск|минта|горбуш|кет|икра|краб|кревет|кальмар|миди|гребешок|осьминог|каракатиц|устриц|омар|лобстер|рыб)/i.test(cleanName)) {
            // Но исключаем "сельдерей" - это овощ!
            if (!cleanName.includes('сельдерей')) {
                return '🐟 Рыба и морепродукты';
            }
        }
        
        // Молочные продукты
        if (/(молок|кефир|йогурт|ряженк|простокваш|сметан|творог|сыр|брынз|адыгейск|моцарел|пармезан|чеддер|сулугун|сливк|масло сливочн|маргарин|спред|топлен)/i.test(cleanName)) {
            return '🥛 Молочные продукты';
        }
        
        // Яйца
        if (/(яйц|яич|желток|белок|перепелин|страусин)/i.test(cleanName)) {
            return '🥚 Яйца';
        }
        
        // Овощи
        if (/(авокадо|баклажан|перец|зелен|петрушк|укроп|кинз|базилик|тимьян|мята|щавель|шпинат|руккол|салат|спарж|капуст|картофель|морков|свекл|редьк|редис|реп|лук|чеснок|помидор|томат|огур|кабачк|тыкв|сельдерей|оливк|маслин|артишок)/i.test(cleanName)) {
            return '🥦 Овощи';
        }
        
        // Фрукты и ягоды
        if (/(апельсин|мандарин|грейпфрут|помело|лайм|лимон|гранат|виноград|арбуз|дын|ананас|манго|папай|гуав|маракуй|финик|инжир|хурм|фейхоа|личи|рамбутан|дуриан|питай|яблок|груш|слив|абрикос|персик|нектарин|вишн|черешн|клубник|земляник|малин|ежевик|черник|голубик|брусник|клюкв|облепих|рябин|калин|киви|банан)/i.test(cleanName)) {
            return '🍎 Фрукты и ягоды';
        }
        
        // Крупы, злаки и бобовые
        if (/(гречк|рис|овсян|пшен|перлов|ячмен|кукурузн|манн|мука|круп|хлопь|отруб|зерн|злак|семен|семечк|кунжут|лен|льнян|чиа|подсолнечн|тыквенн|кедров|арахис|фундук|миндал|кешью|фисташк|мак|нут|фасол|горох|чечевиц|боб|соя|киноа|булгур|кус-кус|полба|амарант|теф|сорго)/i.test(cleanName)) {
            return '🍚 Крупы, злаки и бобовые';
        }
        
        // Хлеб и выпечка
        if (/(хлеб|булка|батон|лаваш|лепешк|пит|тортиль|тест|сухар|гренк|крекер|печенье|пряник|бублик|баранк|сушк|вафл|кекс|маффин|пирог|пирожок|пончик|булочк|рогалик|круасан|бриош)/i.test(cleanName)) {
            return '🍞 Хлеб и выпечка';
        }
        
        // Специи, приправы и соусы
        if (/(соль|перец|сахар|ванил|кориц|имбир|куркум|карри|паприк|чили|мускат|лавров|базилик|орегано|тимьян|розмарин|майоран|чабер|эстрагон|шалфей|горчиц|кетчуп|майонез|соус|уксус|разрыхлитель|сода|дрожж|желатин|агар|пектин|крахмал)/i.test(cleanName)) {
            return '🧂 Специи, приправы и соусы';
        }
        
        return '🛒 Прочее';
    }

    // СОХРАНЕНИЕ ПЛАНА
    async savePlan(silent = false) {
        if (!this.planData) {
            if (!silent) showCustomAlert('Сначала создайте план питания', 'warning');
            return;
        }

        try {
            this.planData.updatedAt = new Date().toISOString();
            this.planData.week = this.currentWeek;
            
            const user = auth.currentUser;
            if (!user) {
                if (!silent) showCustomAlert('Для сохранения плана необходимо авторизоваться', 'warning');
                return;
            }
            
            await saveMealPlan(this.planData);
            
            localStorage.setItem(`mealPlan_${user.uid}_week${this.currentWeek}`, JSON.stringify(this.planData));
            
        } catch (error) {
            if (!silent) showCustomAlert('Ошибка при сохранении плана: ' + error.message, 'error');
        }
    }


    showBJUHelp(type) {
        const helpTexts = {
            calories: 'Рекомендуемая калорийность зависит от вашего веса, роста, возраста, пола и уровня активности. Средняя норма: 2000-2500 ккал/день.',
            protein: 'Белки: 1.5-2.2г на кг веса. Для похудения: 2-2.4г, для набора массы: 1.6-1.8г, для поддержания: 1.2-1.5г.',
            fat: 'Жиры: 0.8-1г на кг веса. 20-35% от общей калорийности. Важны для гормонов и усвоения витаминов.',
            carbs: 'Углеводы рассчитываются исходя из оставшихся калорий после учета белков и жиров. 45-65% от общей калорийности.'
        };
        
        showCustomAlert(helpTexts[type] || 'Информация о БЖУ', 'info');
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.nutritionPlan = new NutritionPlanGenerator();
});