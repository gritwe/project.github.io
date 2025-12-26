const slides = document.querySelectorAll('.carousel-slide');
const prev = document.querySelector('.carousel-arrow.left');
const next = document.querySelector('.carousel-arrow.right');

let current = 0;
let interval = null;

function showSlide(index) {
    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });
    current = index;
}

// Кнопки стрелок
prev.addEventListener('click', () => {
    showSlide((current - 1 + slides.length) % slides.length);
    resetInterval();
});

next.addEventListener('click', () => {
    showSlide((current + 1) % slides.length);
    resetInterval();
});

// Автопереключение каждые 10 секунд
function startInterval() {
    interval = setInterval(() => {
        showSlide((current + 1) % slides.length);
    }, 7000);
}

// Сброс интервала при ручном переключении
function resetInterval() {
    clearInterval(interval);
    startInterval();
}

// Запуск
showSlide(0);
startInterval();

