// exercise-detail.js
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация авторизации
    initializeAuthState();
    
    // Получение параметров из URL
    const urlParams = new URLSearchParams(window.location.search);
    const muscleGroup = urlParams.get('muscle');
    
    // Если есть группа мышц, обновляем активную ссылку
    if (muscleGroup) {
        updateActiveNavLink(muscleGroup);
    }
    
    // Инициализация видео плеера
    initializeVideoPlayer();
});

// Функция для обновления активной ссылки в навигации
function updateActiveNavLink(muscleGroup) {
    const navLinks = document.querySelectorAll('.nav-center a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.textContent.toLowerCase().includes('упражнения')) {
            link.classList.add('active');
        }
    });
}

// Функция для инициализации состояния авторизации
function initializeAuthState() {
    // В реальном приложении проверяем, авторизован ли пользователь
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    const authIcon = document.getElementById('auth-icon');
    const profileIcon = document.getElementById('profile-icon');
    
    if (isLoggedIn && authIcon && profileIcon) {
        authIcon.classList.add('hidden');
        profileIcon.classList.remove('hidden');
    }
}

// Функция для инициализации видео плеера
function initializeVideoPlayer() {
    const video = document.querySelector('.video-player video');
    
    if (!video) {
        console.warn('Видео элемент не найден');
        return;
    }

    // Настройка видео
    video.muted = true;
    video.volume = 0;
    video.controls = false;
    
    // Зацикливание видео
    video.loop = true;
    
    // Защита от скачивания/копирования
    video.addEventListener('contextmenu', e => e.preventDefault());
    video.addEventListener('dblclick', e => e.preventDefault());
    
    // Блокировка клавиш управления
    document.addEventListener('keydown', function(e) {
        if (document.activeElement === video) {
            // Блокируем: пробел, стрелки, F (полный экран)
            if ([32, 37, 38, 39, 40, 70].includes(e.keyCode)) {
                e.preventDefault();
            }
        }
    });

    // Автоматическое воспроизведение с обработкой ошибок
    const playPromise = video.play();
    
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log('Автовоспроизведение заблокировано:', error);
            createPlayOverlay(video);
        });
    }

    // Обработка ошибок загрузки видео
    video.addEventListener('error', function() {
        showVideoError(video);
    });

    // Слушатель события окончания видео для зацикливания
    video.addEventListener('ended', function() {
        video.currentTime = 0;
        video.play();
    });
}

// Создание оверлея для ручного воспроизведения
function createPlayOverlay(video) {
    const container = video.closest('.video-player');
    if (!container) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'video-play-overlay';
    overlay.style.cssText = `
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 15px;
        z-index: 10;
        transition: opacity 0.3s ease;
    `;
    
    overlay.innerHTML = `
        <div style="text-align: center; color: #5EFFB0;">
            <i class="fas fa-play-circle" style="font-size: 4rem; margin-bottom: 10px;"></i>
            <p style="margin: 0; font-size: 1rem; font-weight: 500;">Нажмите для воспроизведения</p>
        </div>
    `;
    
    overlay.onclick = function() {
        video.play()
            .then(() => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            })
            .catch(error => {
                console.error('Ошибка воспроизведения:', error);
            });
    };
    
    container.style.position = 'relative';
    container.appendChild(overlay);
}

// Показать сообщение об ошибке видео
function showVideoError(video) {
    const container = video.closest('.video-player');
    if (!container) return;
    
    container.innerHTML = `
        <div class="video-error" style="
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            color: white;
            padding: 20px;
            text-align: center;
        ">
            <i class="fas fa-video-slash" style="font-size: 3rem; margin-bottom: 15px;"></i>
            <h4 style="margin: 0 0 10px 0;">Видео не доступно</h4>
            <p style="margin: 0; font-size: 0.9rem; opacity: 0.9;">
                Файл видео не найден или поврежден
            </p>
            <p style="margin: 10px 0 0 0; font-size: 0.8rem; opacity: 0.7;">
                ${video.querySelector('source')?.src || 'Путь к видео не указан'}
            </p>
        </div>
    `;
}

// Экспорт функций для использования в других местах
if (typeof window !== 'undefined') {
    window.VideoPlayer = {
        initialize: initializeVideoPlayer,
        createPlayOverlay: createPlayOverlay,
        showError: showVideoError
    };
}