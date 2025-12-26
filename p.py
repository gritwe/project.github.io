from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time
import json
import os
import logging
from urllib.parse import urljoin
from typing import Dict, List, Optional, Set

# --- Настройка логирования ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('parser.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# --- Конфигурация ---
class Config:
    BASE_URL = "https://calorizator.ru"
    INPUT_FILE = "calorizator_recipes.json"
    OUTPUT_FILE = "calorizator_recipes_full.json"
    WAIT_TIMEOUT = 10
    RETRY_COUNT = 3
    DELAY_BETWEEN_REQUESTS = 1

# --- Инициализация драйвера ---
def init_driver() -> webdriver.Chrome:
    """Инициализация и настройка Chrome драйвера"""
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
    
    # Добавляем опции для лучшей производительности
    options.add_experimental_option("excludeSwitches", ["enable-logging"])
    
    return webdriver.Chrome(options=options)

# --- Утилиты для работы с файлами ---
def load_json_file(filepath: str) -> List[Dict]:
    """Загрузка JSON файла"""
    if not os.path.exists(filepath):
        logger.warning(f"Файл {filepath} не найден. Создаю пустой список.")
        return []
    
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        logger.error(f"Ошибка при загрузке файла {filepath}: {e}")
        return []

def save_json_file(data: List[Dict], filepath: str) -> bool:
    """Сохранение данных в JSON файл"""
    try:
        # Создаем временный файл для безопасной записи
        temp_file = filepath + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        # Заменяем основной файл временным
        if os.path.exists(filepath):
            os.remove(filepath)
        os.rename(temp_file, filepath)
        
        return True
    except Exception as e:
        logger.error(f"Ошибка при сохранении файла {filepath}: {e}")
        return False

# --- Функции парсинга ---
def parse_ingredients(ingr_container: BeautifulSoup) -> List[str]:
    """Парсинг ингредиентов из контейнера"""
    ingredients = []
    
    if not ingr_container:
        return ingredients
    
    # Пробуем разные селекторы для поиска ингредиентов
    selectors = [
        "li.recipes-ingr-item",
        "div.field-item li",
        "div.recipes-ingredients li"
    ]
    
    for selector in selectors:
        li_items = ingr_container.select(selector)
        if li_items:
            for li in li_items:
                text = li.get_text(strip=True)
                if text and text not in ingredients:
                    ingredients.append(text)
            break
    else:
        # Если не нашли список, разбиваем текст по строкам
        text = ingr_container.get_text(separator="\n", strip=True)
        for line in text.split("\n"):
            line = line.strip()
            if line and line not in ingredients:
                ingredients.append(line)
    
    return ingredients

def parse_nutrition(nutrition_container: BeautifulSoup) -> Dict[str, float]:
    """Парсинг пищевой ценности"""
    nutrition = {
        "calories": 0.0,
        "proteins": 0.0,
        "fats": 0.0,
        "carbs": 0.0
    }
    
    if not nutrition_container:
        return nutrition
    
    # Словарь для маппинга свойств
    nutrition_map = {
        "calories": ["[itemprop='calories']", "[itemprop='calories'] span"],
        "proteins": ["[itemprop='proteinContent']", "[itemprop='proteinContent'] span"],
        "fats": ["[itemprop='fatContent']", "[itemprop='fatContent'] span"],
        "carbs": ["[itemprop='carbohydrateContent']", "[itemprop='carbohydrateContent'] span"]
    }
    
    for key, selectors in nutrition_map.items():
        for selector in selectors:
            element = nutrition_container.select_one(selector)
            if element:
                try:
                    # Извлекаем число из текста
                    text = element.get_text(strip=True)
                    # Убираем нечисловые символы, кроме точки и запятой
                    import re
                    number_text = re.search(r'[\d,\.]+', text)
                    if number_text:
                        value = float(number_text.group().replace(',', '.'))
                        nutrition[key] = round(value, 2)
                except (ValueError, AttributeError):
                    continue
                break
    
    return nutrition

def fetch_recipe_data(driver: webdriver.Chrome, url: str, retries: int = Config.RETRY_COUNT) -> Optional[BeautifulSoup]:
    """Получение страницы рецепта с повторами при ошибках"""
    for attempt in range(retries):
        try:
            driver.get(url)
            # Ждем загрузки основного контента
            WebDriverWait(driver, Config.WAIT_TIMEOUT).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "#page-title, .recipes-ingredients"))
            )
            time.sleep(Config.DELAY_BETWEEN_REQUESTS)
            return BeautifulSoup(driver.page_source, "html.parser")
        except Exception as e:
            logger.warning(f"Попытка {attempt + 1}/{retries} не удалась для {url}: {e}")
            time.sleep(2)  # Увеличиваем задержку при повторе
    
    logger.error(f"Не удалось загрузить страницу: {url}")
    return None

# --- Основная функция ---
def main():
    """Основная функция парсинга"""
    # Загружаем исходные рецепты
    recipes = load_json_file(Config.INPUT_FILE)
    if not recipes:
        logger.error(f"Нет рецептов для обработки в файле {Config.INPUT_FILE}")
        return
    
    # Загружаем уже обработанные рецепты
    full_recipes = load_json_file(Config.OUTPUT_FILE)
    processed_links = {r["link"] for r in full_recipes}
    
    logger.info(f"Загружено {len(recipes)} рецептов для обработки")
    logger.info(f"Уже обработано: {len(processed_links)}")
    
    # Инициализируем драйвер
    driver = init_driver()
    
    try:
        total = len(recipes)
        success_count = 0
        fail_count = 0
        
        for idx, recipe in enumerate(recipes, 1):
            link = recipe.get("link", "")
            if not link:
                logger.warning(f"Рецепт {idx} не содержит ссылки, пропускаем")
                fail_count += 1
                continue
            
            if link in processed_links:
                logger.debug(f"[{idx}/{total}] Уже обработан: {link}")
                continue
            
            url = urljoin(Config.BASE_URL, link)
            logger.info(f"[{idx}/{total}] Парсим рецепт: {url}")
            
            # Получаем страницу
            soup = fetch_recipe_data(driver, url)
            if not soup:
                fail_count += 1
                continue
            
            # Извлекаем данные
            try:
                # Название
                h1 = soup.select_one("#page-title, h1.title")
                name = h1.text.strip() if h1 else recipe.get("name", "")
                
                # Ингредиенты
                ingr_container = soup.select_one("div.recipes-ingredients, .ingredients, [class*='ingr']")
                ingredients = parse_ingredients(ingr_container)
                
                # Инструкции
                instr_container = soup.select_one(
                    "div[itemprop='recipeInstructions'], .instructions, .steps, .cooking-steps"
                )
                instructions = []
                if instr_container:
                    # Пробуем разные форматы инструкций
                    steps = instr_container.select("li, p, div.step")
                    for step in steps:
                        text = step.get_text(strip=True)
                        if text and len(text) > 5:  # Фильтруем слишком короткие тексты
                            instructions.append(text)
                
                # Пищевая ценность
                nutrition_container = soup.select_one(
                    "div[itemprop='nutrition'], .nutrition, .nutrition-facts"
                )
                nutrition = parse_nutrition(nutrition_container)
                
                # Описание
                desc_container = soup.select_one(
                    "div[itemprop='description'], .description, .recipe-description"
                )
                description = desc_container.get_text(strip=True) if desc_container else ""
                
                # Дополнительная информация
                additional_info = {}
                
                # Время приготовления
                time_elem = soup.select_one("[itemprop='totalTime'], .cooking-time, .time")
                if time_elem:
                    additional_info["cooking_time"] = time_elem.get_text(strip=True)
                
                # Порции
                servings_elem = soup.select_one("[itemprop='recipeYield'], .servings, .portions")
                if servings_elem:
                    additional_info["servings"] = servings_elem.get_text(strip=True)
                
                # Создаем полный объект рецепта
                full_recipe = {
                    "id": idx,
                    "category": recipe.get("category", ""),
                    "name": name,
                    "link": link,
                    "url": url,
                    "ingredients": ingredients,
                    "ingredients_count": len(ingredients),
                    "nutrition": nutrition,
                    "instructions": instructions,
                    "instructions_count": len(instructions),
                    "description": description,
                    "additional_info": additional_info,
                    "parsed_at": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                
                full_recipes.append(full_recipe)
                processed_links.add(link)
                success_count += 1
                
                # Сохраняем прогресс
                if idx % 10 == 0 or idx == total:
                    if save_json_file(full_recipes, Config.OUTPUT_FILE):
                        logger.info(f"  Прогресс сохранен: {idx}/{total}")
                
                logger.info(f"  ✓ Готово: {len(ingredients)} ингредиентов, {len(instructions)} шагов")
                
            except Exception as e:
                logger.error(f"  ✗ Ошибка при парсинге {url}: {e}")
                fail_count += 1
                # Сохраняем хотя бы базовую информацию
                basic_recipe = {
                    "id": idx,
                    "category": recipe.get("category", ""),
                    "name": recipe.get("name", ""),
                    "link": link,
                    "url": url,
                    "error": str(e),
                    "parsed_at": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                full_recipes.append(basic_recipe)
                processed_links.add(link)
                
                # Сохраняем чтобы не потерять прогресс
                save_json_file(full_recipes, Config.OUTPUT_FILE)
        
        # Финальное сохранение
        save_json_file(full_recipes, Config.OUTPUT_FILE)
        
        logger.info(f"\n{'='*50}")
        logger.info(f"Парсинг завершен!")
        logger.info(f"Успешно: {success_count}")
        logger.info(f"С ошибками: {fail_count}")
        logger.info(f"Всего собрано: {len(full_recipes)} рецептов")
        logger.info(f"Сохранено в: {Config.OUTPUT_FILE}")
        
    except KeyboardInterrupt:
        logger.info("\nПарсинг прерван пользователем. Сохраняем прогресс...")
        save_json_file(full_recipes, Config.OUTPUT_FILE)
    except Exception as e:
        logger.error(f"Критическая ошибка: {e}")
        save_json_file(full_recipes, Config.OUTPUT_FILE)
    finally:
        driver.quit()
        logger.info("Драйвер закрыт")

if __name__ == "__main__":
    main()