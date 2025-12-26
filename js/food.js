// Калькулятор БЖУ
document.addEventListener('DOMContentLoaded', function() {
    console.log('Калькулятор БЖУ загружен');
    
    // Элементы формы
    const genderSelect = document.getElementById('gender');
    const ageInput = document.getElementById('age');
    const heightInput = document.getElementById('height');
    const weightInput = document.getElementById('weight');
    const activitySelect = document.getElementById('activity');
    const goalSelect = document.getElementById('goal');
    const calculateBtn = document.getElementById('calculate-btn');
    
    // Элементы основных результатов
    const caloriesResult = document.getElementById('calories-result');
    const proteinResult = document.getElementById('protein-result');
    const fatsResult = document.getElementById('fats-result');
    const carbsResult = document.getElementById('carbs-result');
    
    // Элементы детальных результатов - калории
    const mifflinCalories = document.getElementById('mifflin-calories');
    const harrisCalories = document.getElementById('harris-calories');
    const weightCalories = document.getElementById('weight-calories');
    
    // Элементы для сброса веса
    const deficitSection = document.getElementById('deficit-section');
    const deficitRange = document.getElementById('deficit-range');
    const deficitProtein = document.getElementById('deficit-protein');
    const deficitFats = document.getElementById('deficit-fats');
    const deficitCarbs = document.getElementById('deficit-carbs');
    
    // Элементы для набора массы
    const massSection = document.getElementById('mass-section');
    const massRange = document.getElementById('mass-range');
    const massProtein = document.getElementById('mass-protein');
    const massFats = document.getElementById('mass-fats');
    const massCarbs = document.getElementById('mass-carbs');
    
    // Рекомендации
    const lastUpdate = document.getElementById('last-update');
    const calorieTip = document.getElementById('calorie-tip');
    const proteinTip = document.getElementById('protein-tip');
    const waterTip = document.getElementById('water-tip');
    const recommendationsList = document.getElementById('dynamic-recommendations');
    
    console.log('Элемент рекомендаций найден:', !!recommendationsList);
    
    // Создаем элемент для отображения статуса
    const statusDiv = document.createElement('div');
    statusDiv.className = 'calculation-status';
    calculateBtn.parentNode.appendChild(statusDiv);
    
    // Валидация полей ввода
    function validateInputs() {
        let isValid = true;
        
        // Проверка возраста
        if (ageInput.value === '' || ageInput.value < 15 || ageInput.value > 80) {
            showError(ageInput, 'Возраст должен быть от 15 до 80 лет');
            isValid = false;
        } else {
            clearError(ageInput);
        }
        
        // Проверка роста
        if (heightInput.value === '' || heightInput.value < 140 || heightInput.value > 220) {
            showError(heightInput, 'Рост должен быть от 140 до 220 см');
            isValid = false;
        } else {
            clearError(heightInput);
        }
        
        // Проверка веса
        if (weightInput.value === '' || weightInput.value < 40 || weightInput.value > 200) {
            showError(weightInput, 'Вес должен быть от 40 до 200 кг');
            isValid = false;
        } else {
            clearError(weightInput);
        }
        
        return isValid;
    }
    
    function showError(inputElement, message) {
        clearError(inputElement);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.color = '#ff6b6b';
        errorDiv.style.fontSize = '14px';
        errorDiv.style.marginTop = '5px';
        
        inputElement.parentNode.appendChild(errorDiv);
        inputElement.style.borderColor = '#ff6b6b';
    }
    
    function clearError(inputElement) {
        const errorDiv = inputElement.parentNode.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
        inputElement.style.borderColor = '#444';
    }
    
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = 'calculation-status ' + type;
        statusDiv.style.display = 'block';
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
    
    // Формула Миффлина-Сан Жеора
    function calculateMifflin(gender, age, height, weight) {
        if (gender === 'male') {
            return 10 * weight + 6.25 * height - 5 * age + 5;
        } else {
            return 10 * weight + 6.25 * height - 5 * age - 161;
        }
    }
    
    // Формула Харриса-Бенедикта (пересмотренная)
    function calculateHarris(gender, age, height, weight) {
        if (gender === 'male') {
            return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
        } else {
            return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
        }
    }
    
    // Расчет по среднему расходу на килограмм
    function calculateWeightBased(weight, activityLevel) {
        const baseMin = 29;
        const baseMax = 34;
        const activityFactor = (activityLevel - 1.2) * 5;
        
        const minMultiplier = baseMin + activityFactor;
        const maxMultiplier = baseMax + activityFactor;
        
        return {
            min: Math.round(weight * Math.max(minMultiplier, 25)),
            max: Math.round(weight * Math.min(maxMultiplier, 40))
        };
    }
    
    // Функция расчета БЖУ для конкретной цели
    function calculateMacrosForGoal(calories, weight, goalType) {
        let proteinRatio, fatRatio, carbRatio;
        
        switch(goalType) {
            case 'deficit':
                proteinRatio = 0.35;
                fatRatio = 0.25;
                carbRatio = 0.40;
                break;
            case 'mass':
                proteinRatio = 0.25;
                fatRatio = 0.20;
                carbRatio = 0.55;
                break;
            case 'maintenance':
            default:
                proteinRatio = 0.30;
                fatRatio = 0.25;
                carbRatio = 0.45;
        }
        
        const proteinGrams = Math.round((calories * proteinRatio) / 4);
        const fatGrams = Math.round((calories * fatRatio) / 9);
        const carbGrams = Math.round((calories * carbRatio) / 4);
        
        return {
            protein: proteinGrams,
            fats: fatGrams,
            carbs: carbGrams
        };
    }
    
    // Расчет основного результата
    function calculateMainResults(gender, age, height, weight, activityLevel, goal) {
        const mifflin = calculateMifflin(gender, age, height, weight);
        const harris = calculateHarris(gender, age, height, weight);
        
        const avgCalories = (mifflin + harris) / 2;
        const tdee = avgCalories * activityLevel;
        
        let targetCalories;
        switch(goal) {
            case 'deficit':
                targetCalories = tdee * 0.85;
                break;
            case 'surplus':
                targetCalories = tdee * 1.15;
                break;
            default:
                targetCalories = tdee;
        }
        
        const macros = calculateMacrosForGoal(targetCalories, weight, goal);
        
        return {
            calories: Math.round(targetCalories),
            protein: macros.protein,
            fats: macros.fats,
            carbs: macros.carbs,
            mifflin: Math.round(mifflin),
            harris: Math.round(harris),
            tdee: Math.round(tdee)
        };
    }
    
    // Расчет данных для сброса веса
    function calculateDeficitData(mifflin, harris, weight) {
        const baseCalories = Math.min(mifflin, harris);
        const deficitMin = Math.round(baseCalories * 0.75);
        const deficitMax = Math.round(baseCalories * 0.85);
        
        const avgDeficit = (deficitMin + deficitMax) / 2;
        const macros = calculateMacrosForGoal(avgDeficit, weight, 'deficit');
        
        return {
            range: `${deficitMin} – ${deficitMax}`,
            protein: macros.protein,
            fats: macros.fats,
            carbs: macros.carbs
        };
    }
    
    // Расчет данных для набора массы
    function calculateMassData(mifflin, harris, weight) {
        const baseCalories = Math.max(mifflin, harris);
        const massMin = Math.round(baseCalories * 1.10);
        const massMax = Math.round(baseCalories * 1.20);
        
        const avgMass = (massMin + massMax) / 2;
        const macros = calculateMacrosForGoal(avgMass, weight, 'mass');
        
        return {
            range: `${massMin} – ${massMax}`,
            protein: macros.protein,
            fats: macros.fats,
            carbs: macros.carbs
        };
    }
    
    // Обновление времени последнего расчета
    function updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        lastUpdate.textContent = timeString;
    }
    
    // Обновление рекомендаций
// Обновление рекомендаций
    function updateRecommendations(calories, goal, weight, gender, tdee) {
        console.log('Обновление рекомендаций для цели:', goal);
        
        const weightNum = parseInt(weight);
        
        // Обновление совета по калориям
        switch(goal) {
            case 'deficit':
                const deficitCalories = Math.round(tdee * 0.85);
                calorieTip.textContent = `Для похудения рекомендуется ${deficitCalories} ккал/день (дефицит 15%)`;
                break;
            case 'surplus':
                const surplusCalories = Math.round(tdee * 1.15);
                calorieTip.textContent = `Для набора массы рекомендуется ${surplusCalories} ккал/день (профицит 15%)`;
                break;
            case 'maintenance':
            default:
                calorieTip.textContent = `Для поддержания веса придерживайтесь ${calories} ккал/день`;
        }
        
        // Обновление совета по белку
        const proteinMin = Math.round(weightNum * 1.6);
        const proteinMax = Math.round(weightNum * 2.2);
        proteinTip.textContent = `Рекомендуемая норма белка: ${proteinMin}-${proteinMax} г/день`;
        
        // Обновление совета по воде
        const waterMl = Math.round(weightNum * 35);
        const waterLiters = (waterMl / 1000).toFixed(1);
        waterTip.textContent = `Пейте ${waterLiters} л воды в день (35 мл/кг веса)`;
        
        // Обновление списка рекомендаций (МАКСИМУМ 3)
        let recommendationsHTML = '';
        
        if (goal === 'deficit') {
            recommendationsHTML = `
                <li>Создайте дефицит 300-500 ккал в день</li>
                <li>Увеличьте потребление белка до 2-2.2 г/кг</li>
                <li>Добавьте кардио-тренировки 3-4 раза в неделю</li>
            `;
        } else if (goal === 'surplus') {
            recommendationsHTML = `
                <li>Создайте профицит 300-500 ккал в день</li>
                <li>Разделите приемы пищи на 5-6 раз в день</li>
                <li>Фокусируйтесь на силовых тренировках 4-5 раз в неделю</li>
            `;
        } else {
            recommendationsHTML = `
                <li>Пейте 2-3 литра воды в день</li>
                <li>Распределите белки равномерно в течение дня</li>
                <li>Не пропускайте приемы пищи</li>
            `;
        }
        
        recommendationsList.innerHTML = recommendationsHTML;
        console.log('Рекомендации установлены. 3 пункта');
    }
    
    // Управление отображением секций в зависимости от цели
    function updateSectionVisibility(goal) {
        if (goal === 'deficit') {
            deficitSection.style.display = 'block';
        } else {
            deficitSection.style.display = 'none';
        }
        
        if (goal === 'surplus') {
            massSection.style.display = 'block';
        } else {
            massSection.style.display = 'none';
        }
    }
    
    // Основная функция расчета
    function performCalculation() {
        console.log('Запуск расчета...');
        
        if (!validateInputs()) {
            showStatus('Пожалуйста, проверьте введенные данные', 'error');
            return;
        }
        
        const gender = genderSelect.value;
        const age = parseInt(ageInput.value);
        const height = parseInt(heightInput.value);
        const weight = parseInt(weightInput.value);
        const activityLevel = parseFloat(activitySelect.value);
        const goal = goalSelect.value;
        
        console.log('Введенные данные:', { gender, age, height, weight, activityLevel, goal });
        
        const mifflin = calculateMifflin(gender, age, height, weight);
        const harris = calculateHarris(gender, age, height, weight);
        const weightBased = calculateWeightBased(weight, activityLevel);
        
        const mainResults = calculateMainResults(gender, age, height, weight, activityLevel, goal);
        const deficitData = calculateDeficitData(mifflin, harris, weight);
        const massData = calculateMassData(mifflin, harris, weight);
        
        console.log('Результаты расчета:', mainResults);
        
        // Обновление основных результатов БЕЗ АНИМАЦИИ
        caloriesResult.textContent = mainResults.calories;
        proteinResult.textContent = mainResults.protein;
        fatsResult.textContent = mainResults.fats;
        carbsResult.textContent = mainResults.carbs;
        
        // Обновление данных по калориям
        mifflinCalories.textContent = mainResults.mifflin;
        harrisCalories.textContent = mainResults.harris;
        weightCalories.textContent = `${weightBased.min} – ${weightBased.max}`;
        
        // Обновление данных для сброса веса
        deficitRange.textContent = deficitData.range;
        deficitProtein.textContent = deficitData.protein;
        deficitFats.textContent = deficitData.fats;
        deficitCarbs.textContent = deficitData.carbs;
        
        // Обновление данных для набора массы
        massRange.textContent = massData.range;
        massProtein.textContent = massData.protein;
        massFats.textContent = massData.fats;
        massCarbs.textContent = massData.carbs;
        
        // Обновление видимости секций
        updateSectionVisibility(goal);
        
        // Обновление времени
        updateLastUpdateTime();
        
        // Обновление рекомендаций
        updateRecommendations(mainResults.calories, goal, weight, gender, mainResults.tdee);
        
        
        // Сохранить данные
        saveToLocalStorage();
        
        console.log('Расчет завершен');
    }
    
    // Обработчик нажатия на кнопку расчета
    calculateBtn.addEventListener('click', function() {
        console.log('Нажата кнопка расчета');
        // Добавляем эффект нажатия
        calculateBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            calculateBtn.style.transform = 'scale(1)';
        }, 200);
        
        // Выполняем расчет
        performCalculation();
    });
    
    // Также позволяем рассчитывать по нажатию Enter в полях ввода
    const inputFields = [ageInput, heightInput, weightInput];
    
    inputFields.forEach(field => {
        field.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performCalculation();
            }
        });
    });
    
    // Сохранение данных в localStorage
    function saveToLocalStorage() {
        const calculatorData = {
            gender: genderSelect.value,
            age: ageInput.value,
            height: heightInput.value,
            weight: weightInput.value,
            activity: activitySelect.value,
            goal: goalSelect.value
        };
        
        localStorage.setItem('bjuCalculatorData', JSON.stringify(calculatorData));
        console.log('Данные сохранены в localStorage');
    }
    
    function loadFromLocalStorage() {
        const savedData = localStorage.getItem('bjuCalculatorData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                genderSelect.value = data.gender || 'male';
                ageInput.value = data.age || 30;
                heightInput.value = data.height || 175;
                weightInput.value = data.weight || 70;
                activitySelect.value = data.activity || '1.55';
                goalSelect.value = data.goal || 'maintenance';
                console.log('Данные загружены из localStorage');
            } catch (e) {
                console.error('Ошибка загрузки данных:', e);
            }
        }
    }
    
    // Сохраняем данные при изменении
    const formElements = [genderSelect, ageInput, heightInput, weightInput, activitySelect, goalSelect];
    formElements.forEach(element => {
        element.addEventListener('change', saveToLocalStorage);
    });
    
    // Загружаем данные при загрузке страницы
    loadFromLocalStorage();
    
    // Первоначальный расчет при загрузке страницы
    console.log('Запуск первоначального расчета...');
    setTimeout(() => {
        performCalculation();
    }, 500);
});