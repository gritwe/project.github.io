// Упрощенная реализация Яндекс Карт

let map;
let currentQuery = '';

// Чтение параметров из URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        search: params.get('search'),
        lat: params.get('lat'),
        lng: params.get('lng'),
        zoom: params.get('zoom'),
        city: params.get('city')
    };
}

// Инициализация карты
function initMap() {
    ymaps.ready(() => {
        // Получаем параметры из URL
        const urlParams = getUrlParams();
        
        // Определяем центр карты
        let center = [55.751574, 37.573856]; // Москва по умолчанию
        let zoom = 12;
        
        // Если есть координаты в URL, используем их
        if (urlParams.lat && urlParams.lng) {
            center = [parseFloat(urlParams.lat), parseFloat(urlParams.lng)];
            zoom = urlParams.zoom ? parseInt(urlParams.zoom) : 14;
        }
        
        // Создаем карту
        map = new ymaps.Map('map', {
            center: center,
            zoom: zoom,
            controls: [
                'zoomControl',
                'fullscreenControl',
                'typeSelector',
                'searchControl'
            ]
        });

        // Настраиваем поиск
        setupSearchControl();
        
        // Настраиваем кнопки быстрого поиска
        setupQuickSearchButtons();
        
        // Настраиваем кнопки типов тренировок
        setupWorkoutTypeButtons();
        
        // Добавляем поле для ввода города
        addCitySelector();
        
        // Если есть параметр поиска в URL, выполняем поиск
        if (urlParams.search) {
            setTimeout(() => {
                performSearch(urlParams.search);
                highlightButtonByQuery(urlParams.search);
            }, 1000); // Даем время для загрузки карты
        } else {
            // Поиск по умолчанию
            performSearch('фитнес клуб');
        }
    });
}

// Добавить выбор города
function addCitySelector() {
    const citySelector = document.createElement('div');
    citySelector.className = 'city-selector';
    citySelector.innerHTML = `
        <select id="citySelect" style="
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 1000;
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #ccc;
            background: white;
            font-family: inherit;
            cursor: pointer;
        ">
            <option value="auto">Автоопределение</option>
            <option value="56.129042,40.407030">Владимир</option>
            <option value="55.7558,37.6173">Москва</option>
            <option value="59.9343,30.3351">Санкт-Петербург</option>
            <option value="56.8391,60.6082">Екатеринбург</option>
            <option value="55.7887,49.1221">Казань</option>
            <option value="56.3269,44.0255">Нижний Новгород</option>
            <option value="54.9914,73.3686">Омск</option>
            <option value="57.1522,65.5272">Тюмень</option>
            <option value="54.9849,73.3674">Новосибирск</option>
            <option value="53.1959,50.1002">Самара</option>
            <option value="47.2214,39.7114">Ростов-на-Дону</option>
        </select>
    `;
    
    document.querySelector('.map-container').appendChild(citySelector);
    
    // Обработчик выбора города
    document.getElementById('citySelect').addEventListener('change', function() {
        if (this.value === 'auto') {
            getCurrentLocation();
        } else {
            const [lat, lng] = this.value.split(',').map(Number);
            map.setCenter([lat, lng], 13);
            updateUrlParam('lat', lat);
            updateUrlParam('lng', lng);
            updateUrlParam('city', this.options[this.selectedIndex].text);
        }
    });
}

// Получить текущее местоположение
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                map.setCenter([latitude, longitude], 14);
                updateUrlParam('lat', latitude);
                updateUrlParam('lng', longitude);
                updateUrlParam('city', 'Текущее местоположение');
            },
            (error) => {
                alert('Не удалось получить ваше местоположение. Пожалуйста, разрешите доступ к геолокации или выберите город вручную.');
                map.setCenter([55.751574, 37.573856], 12); // Москва по умолчанию
            }
        );
    }
}

// Настройка поискового контрола
function setupSearchControl() {
    const searchControl = map.controls.get('searchControl');
    
    // Настраиваем внешний вид
    searchControl.options.set({
        noPlacemark: false,
        provider: 'yandex#search',
        kind: 'house',
        resultsPerPage: 50,
        noSelect: false
    });

    // Обработка результатов поиска
    searchControl.events.add('resultselect', function (e) {
        const index = e.get('index');
        const results = searchControl.getResultsArray();
        if (results[index]) {
            showPlaceDetails(results[index]);
        }
    });

    // При изменении поиска
    searchControl.events.add('load', function () {
        console.log('Поиск выполнен');
    });

    // Показываем подсказку в поле поиска
    const searchInput = document.querySelector('.ymaps-2-1-79-searchbox-input__input');
    if (searchInput) {
        searchInput.placeholder = "Введите фитнес, бассейн, йога...";
    }
}

// Настройка кнопок быстрого поиска
function setupQuickSearchButtons() {
    document.querySelectorAll('.quick-btn').forEach(button => {
        button.addEventListener('click', function() {
            const query = this.getAttribute('data-query');
            performSearch(query);
            highlightButtonByQuery(query);
            
            // Обновляем URL без перезагрузки страницы
            updateUrlParam('search', query);
        });
    });
}

// Подсветить кнопку по запросу
function highlightButtonByQuery(query) {
    const buttons = document.querySelectorAll('.quick-btn');
    buttons.forEach(button => {
        if (button.getAttribute('data-query') === query) {
            button.style.backgroundColor = '#4285f4';
            button.style.borderColor = '#4285f4';
            button.style.color = 'white';
        } else {
            button.style.backgroundColor = '';
            button.style.borderColor = '';
            button.style.color = '';
        }
    });
}

// Настройка кнопок типов тренировок
function setupWorkoutTypeButtons() {
    document.querySelectorAll('.type-btn').forEach(button => {
        button.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            
            // Обновляем активную кнопку
            document.querySelectorAll('.type-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            // Выполняем поиск по типу
            searchByWorkoutType(type);
        });
    });
}

// Поиск по типу тренировки
function searchByWorkoutType(type) {
    const queries = {
        'all': 'спортивный комплекс',
        'strength': 'тренажерный зал фитнес силовой зал',
        'cardio': 'кардио зал беговая дорожка велотренажер',
        'yoga': 'йога студия пилатес растяжка',
        'pool': 'бассейн плавание аквааэробика',
        'outdoor': 'спортивная площадка воркаут турник брусья'
    };
    
    if (queries[type]) {
        performSearch(queries[type]);
    }
}

// Выполнение поиска
function performSearch(query) {
    currentQuery = query;
    const searchControl = map.controls.get('searchControl');
    
    // Формируем запрос БЕЗ города
    // Яндекс сам будет искать вокруг текущего центра карты
    searchControl.search(query);
    
    // Показываем уведомление
    showSearchNotification(`Ищем: ${getQueryDisplayName(query)}`);
}

// Обновить параметр в URL
function updateUrlParam(key, value) {
    const url = new URL(window.location);
    url.searchParams.set(key, value);
    window.history.replaceState({}, '', url);
}

// Показать детали места
function showPlaceDetails(placemark) {
    const properties = placemark.properties;
    const name = properties.get('name') || 'Спортивный объект';
    const address = properties.get('description') || properties.get('text') || 'Адрес не указан';
    
    // Получаем дополнительную информацию
    const phone = properties.get('CompanyMetaData.Phones')?.[0]?.formatted || '';
    const hours = properties.get('CompanyMetaData.Hours')?.text || '';
    const website = properties.get('CompanyMetaData.Links')?.[0]?.href || '';
    
    // Формируем содержимое балуна
    let balloonContent = `
        <div class="place-info">
            <h3>${name}</h3>
            <p><strong>Адрес:</strong> ${address}</p>
    `;
    
    if (phone) {
        balloonContent += `<p><strong>Телефон:</strong> ${phone}</p>`;
    }
    
    if (hours) {
        balloonContent += `<p><strong>Режим работы:</strong> ${hours}</p>`;
    }
    
    if (website) {
        balloonContent += `<p><strong>Сайт:</strong> <a href="${website}" target="_blank">${website}</a></p>`;
    }
    
    balloonContent += `
            <div class="place-actions">
                <button onclick="saveToFavorites('${name.replace(/'/g, "\\'")}', '${address.replace(/'/g, "\\'")}')">
                    <i class="fas fa-heart"></i> В избранное
                </button>
            </div>
        </div>
    `;
    
    // Обновляем балун
    placemark.properties.set('balloonContent', balloonContent);
    placemark.balloon.open();
}

// Сохранение в избранное
function saveToFavorites(name, address) {
    import('./auth-state.js').then(module => {
        module.checkAuth().then(user => {
            if (user) {
                alert(`"${name}" добавлено в избранное`);
                // Здесь можно добавить сохранение в базу данных
            } else {
                alert('Войдите в аккаунт, чтобы сохранять места');
            }
        });
    });
}


// Получить читаемое имя запроса
function getQueryDisplayName(query) {
    const names = {
        'фитнес клуб': 'Фитнес-клубы',
        'бассейн': 'Бассейны',
        'йога студия': 'Йога-студии',
        'тренажерный зал': 'Тренажерные залы',
        'стадион': 'Стадионы',
        'спортивная площадка': 'Спортплощадки',
        'бокс зал': 'Бокс-залы',
        'баскетбол площадка': 'Баскетбольные площадки',
        'спортивный комплекс': 'Спорткомплексы'
    };
    
    return names[query] || query;
}

// Добавить кнопку "Мое местоположение"
function addCurrentLocationButton() {
    const locationButton = document.createElement('button');
    locationButton.className = 'current-location-btn';
    locationButton.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
    locationButton.title = 'Мое местоположение';
    locationButton.style.cssText = `
        position: absolute;
        top: 60px; // Смещаем ниже селектора города
        right: 20px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 1000;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    
    locationButton.addEventListener('click', () => {
        getCurrentLocation();
    });
    
    document.querySelector('.map-container').appendChild(locationButton);
}

// Функция для выполнения поиска из других страниц
function searchFromExternal(query) {
    if (map) {
        performSearch(query);
        highlightButtonByQuery(query);
    } else {
        // Если карта еще не загружена, сохраняем запрос в localStorage
        localStorage.setItem('pendingSearch', query);
    }
}

// Проверить наличие отложенного поиска
function checkPendingSearch() {
    const pendingSearch = localStorage.getItem('pendingSearch');
    if (pendingSearch) {
        setTimeout(() => {
            searchFromExternal(pendingSearch);
            localStorage.removeItem('pendingSearch');
        }, 1500);
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    // Добавляем кнопку "Мое местоположение"
    setTimeout(addCurrentLocationButton, 2000);
    // Проверяем отложенный поиск
    checkPendingSearch();
});

// Экспортируем функции
window.saveToFavorites = saveToFavorites;
window.searchFromExternal = searchFromExternal;
window.performSearch = performSearch;