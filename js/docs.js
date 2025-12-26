// docs.js

// Основной объект для управления разделами
const DocManager = {
  // Инициализация
  init() {
    this.cacheElements();
    this.bindEvents();
    this.handleInitialState();
  },
  
  // Кэширование элементов DOM
  cacheElements() {
    this.navButtons = document.querySelectorAll('.nav-btn');
    this.docSections = document.querySelectorAll('.doc-section');
    this.backButton = document.getElementById('back-btn');
  },
  
  // Привязка событий
  bindEvents() {
    // Обработка кликов по кнопкам навигации
    this.navButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const sectionId = e.currentTarget.dataset.section;
        this.switchToSection(sectionId);
      });
    });
    
    // Кнопка "Назад" - возврат на предыдущую страницу
    if (this.backButton) {
      this.backButton.addEventListener('click', () => {
        // Проверяем, есть ли предыдущая страница в истории
        if (document.referrer && document.referrer.includes(window.location.hostname)) {
          // Если пришли с нашего же сайта, используем history.back()
          window.history.back();
        } else {
          // Если пришли извне или прямой ссылкой, идем на главную
          window.location.href = 'index.html';
        }
      });
    }
    
    // Обработка изменений истории браузера
    window.addEventListener('popstate', () => {
      this.handleUrlState();
    });
  },
  
  // Обработка начального состояния из URL
  handleInitialState() {
    this.handleUrlState();
  },
  
  // Анализ URL и активация нужного раздела
  handleUrlState() {
    // Проверяем параметр section в URL (?section=offer)
    const urlParams = new URLSearchParams(window.location.search);
    const sectionParam = urlParams.get('section');
    
    // Проверяем хеш в URL (#offer-section)
    const hash = window.location.hash.substring(1); // Убираем #
    
    let targetSection = null;
    
    // Приоритет у параметра, затем у хеша
    if (sectionParam) {
      targetSection = sectionParam;
    } else if (hash) {
      // Извлекаем название раздела из хеша (offer-section → offer)
      targetSection = hash.replace('-section', '');
    }
    
    // Если найден допустимый раздел, активируем его
    if (targetSection && this.isValidSection(targetSection)) {
      this.switchToSection(targetSection, false); // false = не обновляем историю
    }
  },
  
  // Проверка, является ли раздел допустимым
  isValidSection(sectionId) {
    const validSections = ['offer', 'privacy', 'terms', 'cookies'];
    return validSections.includes(sectionId);
  },
  
  // Переключение на указанный раздел
  switchToSection(sectionId, updateHistory = true) {
    if (!this.isValidSection(sectionId)) return;
    
    // Находим нужную кнопку и раздел
    const targetBtn = document.querySelector(`.nav-btn[data-section="${sectionId}"]`);
    const targetSection = document.getElementById(`${sectionId}-section`);
    
    if (!targetBtn || !targetSection) return;
    
    // Снимаем активные классы
    this.navButtons.forEach(btn => btn.classList.remove('active'));
    this.docSections.forEach(section => section.classList.remove('active'));
    
    // Добавляем активные классы
    targetBtn.classList.add('active');
    targetSection.classList.add('active');
    
    // Прокручиваем к началу
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Обновляем URL, если требуется
    if (updateHistory) {
      this.updateUrl(sectionId);
    }
  },
  
  // Обновление URL в адресной строке
  updateUrl(sectionId) {
    const newUrl = new URL(window.location);
    
    // Устанавливаем параметр section
    newUrl.searchParams.set('section', sectionId);
    
    // Очищаем хеш, если он есть
    newUrl.hash = '';
    
    // Обновляем историю без перезагрузки
    window.history.pushState({ section: sectionId }, '', newUrl);
  },
  
  // Метод для принудительного переключения раздела (например, из другого скрипта)
  openSection(sectionId) {
    this.switchToSection(sectionId);
  }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => DocManager.init());

// Экспорт для использования в других модулях
export { DocManager };