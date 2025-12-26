// Скрипт подсветки мышц: подсветка при выборе из списка или при клике по модели

const viewer = document.getElementById('viewer');
const confirmScreen = document.getElementById('confirm-screen');
const confirmBtn = document.getElementById('confirm-btn');
const confirmClose = document.getElementById('confirm-close');
const muscleList = document.getElementById('muscle-list');
const container = document.getElementById('container');

const THREE = window.THREE;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let scene = null;
let camera = null;
let highlightedObject = null;
let activeListItem = null;
const originalMaterials = new WeakMap();
let isModelLocked = true;

// ===== Словарь мышц =====
const musclesDictionary = {
  "Object_1": { ru: "Костный скелет", en: "Skeleton", desc: "Пассивная опорная структура организма", group: "other" },

  // ===== ГОЛОВА =====
  "Object_2": { ru: "Челюсть", en: "Mandibula", desc: "Костная основа нижней части лица, место прикрепления жевательных мышц.", group: "head" },
  "Object_3": { ru: "Височная мышца (пр.)", en: "Musculus temporalis", desc: "Поднимает нижнюю челюсть (закрывает рот), участвует в боковых жевательных движениях.", group: "head" },
  "Object_4": { ru: "Височная мышца (лев.)", en: "Musculus temporalis", desc: "Поднимает нижнюю челюсть (закрывает рот), участвует в боковых жевательных движениях.", group: "head" },
  "Object_5": { ru: "Затылочно-лобная мышца", en: "Musculus occipitofrontalis", desc: "Лобное брюшко: поднимает брови, образует горизонтальные складки на лбу. Затылочное брюшко: смещает кожу головы назад.", group: "head" },
  "Object_6": { ru: "Мышца, опускающая бровь (пр.)", en: "Musculus depressor supercilii", desc: "Стягивает бровь вниз и медиально, участвуя в выражении хмурости.", group: "head" },
  "Object_7": { ru: "Мышца, опускающая бровь (лев.)", en: "Musculus depressor supercilii", desc: "Стягивает бровь вниз и медиально, участвуя в выражении хмурости.", group: "head" },
  "Object_8": { ru: "Мышца гордецов (пр.)", en: "Musculus procerus", desc: "Сморщивает кожу переносицы, опускает кожу лба вниз (выражение недовольства, гнева).", group: "head" },
  "Object_9": { ru: "Мышца гордецов (лев.)", en: "Musculus procerus", desc: "Сморщивает кожу переносицы, опускает кожу лба вниз (выражение недовольства, гнева).", group: "head" },
  "Object_10": { ru: "Круговая мышца глаза (пр.)", en: "Musculus orbicularis oculi", desc: "Закрывает веки (мигание, зажмуривание), способствует оттоку слезы.", group: "head" },
  "Object_11": { ru: "Круговая мышца глаза (лев.)", en: "Musculus orbicularis oculi", desc: "Закрывает веки (мигание, зажмуривание), способствует оттоку слезы.", group: "head" },
  "Object_12": { ru: "Глаза", en: "Oculi", desc: "Орган зрения.", group: "other" },
  "Object_13": { ru: "Мышца, поднимающая верхнюю губу и крыло носа (пр.)", en: "Musculus levator labii superioris alaeque nasi", desc: "Поднимает верхнюю губу и расширяет ноздрю (участвует в мимике плача, недовольства).", group: "head" },
  "Object_14": { ru: "Мышца, поднимающая верхнюю губу и крыло носа (лев.)", en: "Musculus levator labii superioris alaeque nasi", desc: "Поднимает верхнюю губу и расширяет ноздрю (участвует в мимике плача, недовольства).", group: "head" },
  "Object_15": { ru: "Носовая мышца", en: "Musculus nasalis", desc: "Сужение носовых отверстий (компрессор ноздрей) и расширение (расширяющая часть).", group: "head" },
  "Object_16": { ru: "Круговая мышца рта", en: "Musculus orbicularis oris", desc: "Замыкает ротовую щель (сомкнутые губы), вытягивает губы вперед (хоботком), участвует в артикуляции.", group: "head" },
  "Object_17": { ru: "Мышца, поднимающая верхнюю губу (пр.)", en: "Musculus levator labii superioris", desc: "Поднимает верхнюю губу, участвуя в формировании мимики (улыбка, отвращение).", group: "head" },
  "Object_18": { ru: "Мышца, поднимающая верхнюю губу (лев.)", en: "Musculus levator labii superioris", desc: "Поднимает верхнюю губу, участвуя в формировании мимики (улыбка, отвращение).", group: "head" },
  "Object_19": { ru: "Малая скуловая мышца (пр.)", en: "Musculus zygomaticus minor", desc: "Тянет угол рта вверх и латерально, формируя улыбку.", group: "head" },
  "Object_20": { ru: "Малая скуловая мышца (лев.)", en: "Musculus zygomaticus minor", desc: "Тянет угол рта вверх и латерально, формируя улыбку.", group: "head" },
  "Object_21": { ru: "Большая скуловая мышца (пр.)", en: "Musculus zygomaticus major", desc: "Основная мышца улыбки. Тянет угол рта вверх и кнаружи.", group: "head" },
  "Object_22": { ru: "Большая скуловая мышца (лев.)", en: "Musculus zygomaticus major", desc: "Основная мышца улыбки. Тянет угол рта вверх и кнаружи.", group: "head" },
  "Object_23": { ru: "Мышца смеха (пр.)", en: "Musculus risorius", desc: "Растягивает угол рта в сторону, формируя широкую улыбку или смех.", group: "head" },
  "Object_24": { ru: "Мышца смеха (лев.)", en: "Musculus risorius", desc: "Растягивает угол рта в сторону, формируя широкую улыбку или смех.", group: "head" },
  "Object_25": { ru: "Жевательная мышца (пр.)", en: "Musculus masseter", desc: "Основная жевательная мышца. Поднимает и выдвигает нижнюю челюсть.", group: "head" },
  "Object_26": { ru: "Жевательная мышца (лев.)", en: "Musculus masseter", desc: "Основная жевательная мышца. Поднимает и выдвигает нижнюю челюсть.", group: "head" },
  "Object_27": { ru: "Щечная мышца (пр.)", en: "Musculus buccinator", desc: "Прижимает щеку к зубам, участвует в жевании (удерживает пищу), вдувании и выдувании воздуха.", group: "head" },
  "Object_28": { ru: "Щечная мышца (лев.)", en: "Musculus buccinator", desc: "Прижимает щеку к зубам, участвует в жевании (удерживает пищу), вдувании и выдувании воздуха.", group: "head" },
  "Object_29": { ru: "Треугольная мышца (пр.)", en: "Musculus depressor anguli oris", desc: "Опускает угол рта вниз (выражение печали, недовольства).", group: "head" },
  "Object_30": { ru: "Треугольная мышца (лев.)", en: "Musculus depressor anguli oris", desc: "Опускает угол рта вниз (выражение печали, недовольства).", group: "head" },
  "Object_31": { ru: "Квадратная мышца нижней губы (пр.)", en: "Musculus depressor labii inferioris", desc: "Тянет нижнюю губу вниз и немного латерально (выражение отвращения).", group: "head" },
  "Object_32": { ru: "Квадратная мышца нижней губы (лев.)", en: "Musculus depressor labii inferioris", desc: "Тянет нижнюю губу вниз и немного латерально (выражение отвращения).", group: "head" },

  // ===== ШЕЯ + СПИНА =====
  "Object_33": { ru: "Грудино-подъязычная мышца (пр.)", en: "Musculus sternohyoideus", desc: "Тянет подъязычную кость (и гортань) вниз, участвует в глотании и речи.", group: "back" },
  "Object_34": { ru: "Грудино-подъязычная мышца (лев.)", en: "Musculus sternohyoideus", desc: "Тянет подъязычную кость (и гортань) вниз, участвует в глотании и речи.", group: "back" },
  "Object_35": { ru: "ГКС мышца (пр.)", en: "Musculus sternocleidomastoideus", desc: "При двустороннем сокращении наклоняет голову вперед, при одностороннем — поворачивает голову в противоположную сторону и наклоняет в свою.", group: "back" },
  "Object_36": { ru: "ГКС мышца (лев.)", en: "Musculus sternocleidomastoideus", desc: "При двустороннем сокращении наклоняет голову вперед, при одностороннем — поворачивает голову в противоположную сторону и наклоняет в свою.", group: "back" },
  "Object_37": { ru: "Средняя лестничная (пр.)", en: "Musculus scalenus medius", desc: "При фиксированной грудной клетке наклоняет шейный отдел позвоночника в свою сторону, при фиксированной шее — поднимает I ребро (вспомогательная дыхательная).", group: "back" },
  "Object_38": { ru: "Средняя лестничная (лев.)", en: "Musculus scalenus medius", desc: "При фиксированной грудной клетке наклоняет шейный отдел позвоночника в свою сторону, при фиксированной шее — поднимает I ребро (вспомогательная дыхательная).", group: "back" },
  "Object_39": { ru: "Поднимающая лопатку (пр.)", en: "Musculus levator scapulae", desc: "Поднимает лопатку, при фиксированной лопатке наклоняет шею назад и в свою сторону.", group: "back" },
  "Object_40": { ru: "Поднимающая лопатку (лев.)", en: "Musculus levator scapulae", desc: "Поднимает лопатку, при фиксированной лопатке наклоняет шею назад и в свою сторону.", group: "back" },
  "Object_41": { ru: "Ременная мышца шеи (пр.)", en: "Musculus splenius cervicis", desc: "При двустороннем сокращении разгибает шею, при одностороннем — поворачивает голову в свою сторону.", group: "back" },
  "Object_42": { ru: "Ременная мышца шеи (лев.)", en: "Musculus splenius cervicis", desc: "При двустороннем сокращении разгибает шею, при одностороннем — поворачивает голову в свою сторону.", group: "back" },

  // ===== ВЕРХНИЕ КОНЕЧНОСТИ =====
  "Object_43": { ru: "Дельтовидная (пр.)", en: "Musculus deltoideus", desc: "Передние пучки: сгибают и пронируют плечо. Средние: отводят руку. Задние: разгибают и супинируют плечо.", group: "upper" },
  "Object_44": { ru: "Дельтовидная (лев.)", en: "Musculus deltoideus", desc: "Передние пучки: сгибают и пронируют плечо. Средние: отводят руку. Задние: разгибают и супинируют плечо.", group: "upper" },
  "Object_45": { ru: "Бицепс (пр.)", en: "Musculus biceps brachii", desc: "Сгибает плечо в плечевом суставе и предплечье в локтевом, супинирует предплечье.", group: "upper" },
  "Object_46": { ru: "Бицепс (лев.)", en: "Musculus biceps brachii", desc: "Сгибает плечо в плечевом суставе и предплечье в локтевом, супинирует предплечье.", group: "upper" },
  "Object_47": { ru: "Плечевая (пр.)", en: "Musculus brachialis", desc: "Основной сгибатель предплечья в локтевом суставе.", group: "upper" },
  "Object_48": { ru: "Плечевая (лев.)", en: "Musculus brachialis", desc: "Основной сгибатель предплечья в локтевом суставе.", group: "upper" },
  "Object_49": { ru: "Трицепс (пр.)", en: "Musculus triceps brachii", desc: "Разгибает предплечье в локтевом суставе. Длинная головка также разгибает и приводит плечо.", group: "upper" },
  "Object_50": { ru: "Трицепс (лев.)", en: "Musculus triceps brachii", desc: "Разгибает предплечье в локтевом суставе. Длинная головка также разгибает и приводит плечо.", group: "upper" },
  "Object_51": { ru: "Круглый пронатор (пр.)", en: "Musculus pronator teres", desc: "Пронирует предплечье (поворачивает ладонью вниз) и слабо сгибает его.", group: "upper" },
  "Object_52": { ru: "Круглый пронатор (лев.)", en: "Musculus pronator teres", desc: "Пронирует предплечье (поворачивает ладонью вниз) и слабо сгибает его.", group: "upper" },
  "Object_53": { ru: "Плечелучевая (пр.)", en: "Musculus brachioradialis", desc: "Сгибает предплечье в локтевом суставе, устанавливает его в среднее положение между пронацией и супинацией.", group: "upper" },
  "Object_54": { ru: "Плечелучевая (лев.)", en: "Musculus brachioradialis", desc: "Сгибает предплечье в локтевом суставе, устанавливает его в среднее положение между пронацией и супинацией.", group: "upper" },
  "Object_55": { ru: "Лучевой сгибатель (пр.)", en: "Musculus flexor carpi radialis", desc: "Сгибает кисть и отводит ее в лучевую сторону, слабо сгибает предплечье.", group: "upper" },
  "Object_56": { ru: "Лучевой сгибатель (лев.)", en: "Musculus flexor carpi radialis", desc: "Сгибает кисть и отводит ее в лучевую сторону, слабо сгибает предплечье.", group: "upper" },
  "Object_57": { ru: "Разгибатель запястья (пр.)", en: "Musculus extensor carpi radialis longus", desc: "Разгибает кисть и отводит ее в лучевую сторону.", group: "upper" },
  "Object_58": { ru: "Разгибатель запястья (лев.)", en: "Musculus extensor carpi radialis longus", desc: "Разгибает кисть и отводит ее в лучевую сторону.", group: "upper" },
  "Object_59": { ru: "Разгибатель запястья (пр.)", en: "Musculus extensor carpi radialis brevis", desc: "Разгибает кисть и отводит ее в лучевую сторону.", group: "upper" },
  "Object_60": { ru: "Разгибатель запястья (лев.)", en: "Musculus extensor carpi radialis brevis", desc: "Разгибает кисть и отводит ее в лучевую сторону.", group: "upper" },
  "Object_61": { ru: "Разгибатель пальцев (пр.)", en: "Musculus extensor digitorum", desc: "Разгибает пальцы (II-V) и кисть.", group: "upper" },
  "Object_62": { ru: "Разгибатель пальцев (лев.)", en: "Musculus extensor digitorum", desc: "Разгибает пальцы (II-V) и кисть.", group: "upper" },
  "Object_63": { ru: "Разгибатель мизинца (пр.)", en: "Musculus extensor digiti minimi", desc: "Разгибает мизинец и участвует в разгибании кисти.", group: "upper" },
  "Object_64": { ru: "Разгибатель мизинца (лев.)", en: "Musculus extensor digiti minimi", desc: "Разгибает мизинец и участвует в разгибании кисти.", group: "upper" },
  "Object_65": { ru: "Локтевой разгибатель (пр.)", en: "Musculus extensor carpi ulnaris", desc: "Разгибает кисть и приводит ее в локтевую сторону.", group: "upper" },
  "Object_66": { ru: "Локтевой разгибатель (лев.)", en: "Musculus extensor carpi ulnaris", desc: "Разгибает кисть и приводит ее в локтевую сторону.", group: "upper" },
  "Object_67": { ru: "Локтевая мышца (пр.)", en: "Musculus anconeus", desc: "Разгибает предплечье в локтевом суставе.", group: "upper" },
  "Object_68": { ru: "Локтевая мышца (лев.)", en: "Musculus anconeus", desc: "Разгибает предплечье в локтевом суставе.", group: "upper" },
  "Object_69": { ru: "Локтевой сгибатель (пр.)", en: "Musculus flexor carpi ulnaris", desc: "Сгибает кисть и приводит ее в локтевую сторону.", group: "upper" },
  "Object_70": { ru: "Локтевой сгибатель (лев.)", en: "Musculus flexor carpi ulnaris", desc: "Сгибает кисть и приводит ее в локтевую сторону.", group: "upper" },
  "Object_71": { ru: "Длинная ладонная (пр.)", en: "Musculus palmaris longus", desc: "Напрягает ладонный апоневроз и участвует в сгибании кисти.", group: "upper" },
  "Object_72": { ru: "Длинная ладонная (лев.)", en: "Musculus palmaris longus", desc: "Напрягает ладонный апоневроз и участвует в сгибании кисти.", group: "upper" },
  "Object_132": { ru: "Ладони", en: "Palmae", desc: "Область кисти, содержащая мышцы, сухожилия и кожные покровы.", group: "other" },

  // ===== ГРУДЬ И ЖИВОТ =====
  "Object_73": { ru: "Большая грудная (пр.)", en: "Musculus pectoralis major", desc: "Приводит и пронирует плечо, опускает поднятую руку, участвует в акте вдоха (при фиксированных руках).", group: "abs" },
  "Object_74": { ru: "Большая грудная (лев.)", en: "Musculus pectoralis major", desc: "Приводит и пронирует плечо, опускает поднятую руку, участвует в акте вдоха (при фиксированных руках).", group: "abs" },
  "Object_75": { ru: "Прямая мышца живота (пр.)", en: "Musculus rectus abdominis", desc: "Сгибает туловище, опускает ребра, повышает внутрибрюшное давление.", group: "abs" },
  "Object_76": { ru: "Прямая мышца живота (лев.)", en: "Musculus rectus abdominis", desc: "Сгибает туловище, опускает ребра, повышает внутрибрюшное давление.", group: "abs" },
  "Object_77": { ru: "Наружная косая (пр.)", en: "Musculus obliquus externus abdominis", desc: "При одностороннем сокращении вращает туловище в противоположную сторону, при двустороннем — сгибает позвоночник, повышает внутрибрюшное давление.", group: "abs" },
  "Object_78": { ru: "Наружная косая (лев.)", en: "Musculus obliquus externus abdominis", desc: "При одностороннем сокращении вращает туловище в противоположную сторону, при двустороннем — сгибает позвоночник, повышает внутрибрюшное давление.", group: "abs" },
  "Object_79": { ru: "Передняя зубчатая (пр.)", en: "Musculus serratus anterior", desc: "Тянет лопатку вперед и латерально, прижимает ее к грудной клетке (мышца боксеров).", group: "abs" },
  "Object_80": { ru: "Передняя зубчатая (лев.)", en: "Musculus serratus anterior", desc: "Тянет лопатку вперед и латерально, прижимает ее к грудной клетке (мышца боксеров).", group: "abs" },

  // ===== НИЖНИЕ КОНЕЧНОСТИ =====
  "Object_93": { ru: "Большая ягодичная (пр.)", en: "Musculus gluteus maximus", desc: "Разгибает и вращает бедро кнаружи, выпрямляет и стабилизирует туловище.", group: "lower" },
  "Object_94": { ru: "Большая ягодичная (лев.)", en: "Musculus gluteus maximus", desc: "Разгибает и вращает бедро кнаружи, выпрямляет и стабилизирует туловище.", group: "lower" },
  "Object_95": { ru: "Средняя ягодичная (пр.)", en: "Musculus gluteus medius", desc: "Отводит бедро, передние пучки вращают его внутрь, задние — наружу. Стабилизирует таз при ходьбе.", group: "lower" },
  "Object_96": { ru: "Средняя ягодичная (лев.)", en: "Musculus gluteus medius", desc: "Отводит бедро, передние пучки вращают его внутрь, задние — наружу. Стабилизирует таз при ходьбе.", group: "lower" },
  "Object_97": { ru: "Полусухожильная (пр.)", en: "Musculus semitendinosus", desc: "Разгибает бедро, сгибает и вращает голень внутрь (входит в состав задней поверхности бедра).", group: "lower" },
  "Object_98": { ru: "Полусухожильная (лев.)", en: "Musculus semitendinosus", desc: "Разгибает бедро, сгибает и вращает голень внутрь (входит в состав задней поверхности бедра).", group: "lower" },
  "Object_99": { ru: "Двуглавая бедра (пр.)", en: "Musculus biceps femoris", desc: "Длинная головка разгибает бедро, короткая — сгибает голень. Вся мышца вращает согнутую голень наружу.", group: "lower" },
  "Object_100": { ru: "Двуглавая бедра (лев.)", en: "Musculus biceps femoris", desc: "Длинная головка разгибает бедро, короткая — сгибает голень. Вся мышца вращает согнутую голень наружу.", group: "lower" },
  "Object_101": { ru: "Полуперепончатая (пр.)", en: "Musculus semimembranosus", desc: "Разгибает бедро, сгибает и вращает голень внутрь (входит в состав задней поверхности бедра).", group: "lower" },
  "Object_102": { ru: "Полуперепончатая (лев.)", en: "Musculus semimembranosus", desc: "Разгибает бедро, сгибает и вращает голень внутрь (входит в состав задней поверхности бедра).", group: "lower" },
  "Object_103": { ru: "Большая приводящая мышца (пр.)", en: "Musculus adductor magnus", desc: "Приводит и разгибает бедро.", group: "lower" },
  "Object_104": { ru: "Большая приводящая мышца (лев.)", en: "Musculus adductor magnus", desc: "Приводит и разгибает бедро.", group: "lower" },
  "Object_105": { ru: "Тонкая мышца (пр.)", en: "Musculus gracilis", desc: "Приводит бедро, сгибает и вращает голень внутрь.", group: "lower" },
  "Object_106": { ru: "Тонкая мышца (лев.)", en: "Musculus gracilis", desc: "Приводит бедро, сгибает и вращает голень внутрь.", group: "lower" },
  "Object_107": { ru: "Прямая бедра (пр.)", en: "Musculus rectus femoris", desc: "Сгибает бедро в тазобедренном суставе и разгибает голень в коленном (часть четырехглавой мышцы бедра).", group: "lower" },
  "Object_108": { ru: "Прямая бедра (лев.)", en: "Musculus rectus femoris", desc: "Сгибает бедро в тазобедренном суставе и разгибает голень в коленном (часть четырехглавой мышцы бедра).", group: "lower" },
  "Object_109": { ru: "Медиальная широкая (пр.)", en: "Musculus vastus medialis", desc: "Разгибает голень в коленном суставе (часть четырехглавой мышцы бедра), стабилизирует коленную чашечку.", group: "lower" },
  "Object_110": { ru: "Медиальная широкая (лев.)", en: "Musculus vastus medialis", desc: "Разгибает голень в коленном суставе (часть четырехглавой мышцы бедра), стабилизирует коленную чашечку.", group: "lower" },
  "Object_111": { ru: "Портняжная (пр.)", en: "Musculus sartorius", desc: "Сгибает бедро и голень, вращает бедро кнаружи, а голень — внутрь («поза портного»).", group: "lower" },
  "Object_112": { ru: "Портняжная (лев.)", en: "Musculus sartorius", desc: "Сгибает бедро и голень, вращает бедро кнаружи, а голень — внутрь («поза портного»).", group: "lower" },
  "Object_113": { ru: "Длинная приводящая (пр.)", en: "Musculus adductor longus", desc: "Приводит, сгибает и вращает бедро кнаружи.", group: "lower" },
  "Object_114": { ru: "Длинная приводящая (лев.)", en: "Musculus adductor longus", desc: "Приводит, сгибает и вращает бедро кнаружи.", group: "lower" },
  "Object_115": { ru: "Гребенчатая (пр.)", en: "Musculus pectineus", desc: "Приводит и сгибает бедро.", group: "lower" },
  "Object_116": { ru: "Гребенчатая (лев.)", en: "Musculus pectineus", desc: "Приводит и сгибает бедро.", group: "lower" },
  "Object_117": { ru: "Подвздошно-поясничная (пр.)", en: "Musculus iliopsoas", desc: "Основной сгибатель бедра в тазобедренном суставе. При фиксированной ноге наклоняет таз вперед.", group: "lower" },
  "Object_118": { ru: "Подвздошно-поясничная (лев.)", en: "Musculus iliopsoas", desc: "Основной сгибатель бедра в тазобедренном суставе. При фиксированной ноге наклоняет таз вперед.", group: "lower" },
  "Object_119": { ru: "Камбаловидная (пр.)", en: "Musculus soleus", desc: "Сгибает стопу (подошвенное сгибание), стабилизирует голень при стоянии (часть трицепса голени).", group: "lower" },
  "Object_120": { ru: "Камбаловидная (лев.)", en: "Musculus soleus", desc: "Сгибает стопу (подошвенное сгибание), стабилизирует голень при стоянии (часть трицепса голени).", group: "lower" },
  "Object_121": { ru: "Длинный сгибатель пальцев (пр.)", en: "Musculus flexor digitorum longus", desc: "Сгибает II-V пальцы стопы, участвует в подошвенном сгибании стопы.", group: "lower" },
  "Object_122": { ru: "Длинный сгибатель пальцев (лев.)", en: "Musculus flexor digitorum longus", desc: "Сгибает II-V пальцы стопы, участвует в подошвенном сгибании стопы.", group: "lower" },
  "Object_123": { ru: "Передняя большеберцовая (пр.)", en: "Musculus tibialis anterior", desc: "Разгибает стопу (тыльное сгибание) и супинирует ее (поднимает внутренний край).", group: "lower" },
  "Object_124": { ru: "Передняя большеберцовая (лев.)", en: "Musculus tibialis anterior", desc: "Разгибает стопу (тыльное сгибание) и супинирует ее (поднимает внутренний край).", group: "lower" },
  "Object_125": { ru: "Длинный разгибатель пальцев (пр.)", en: "Musculus extensor digitorum longus", desc: "Разгибает II-V пальцы стопы и производит тыльное сгибание стопы.", group: "lower" },
  "Object_126": { ru: "Длинный разгибатель пальцев (лев.)", en: "Musculus extensor digitorum longus", desc: "Разгибает II-V пальцы стопы и производит тыльное сгибание стопы.", group: "lower" },
  "Object_127": { ru: "Длинная малоберцовая (пр.)", en: "Musculus peroneus longus", desc: "Сгибает стопу (подошвенное сгибание), пронирует и отводит ее.", group: "lower" },
  "Object_128": { ru: "Длинная малоберцовая (лев.)", en: "Musculus peroneus longus", desc: "Сгибает стопу (подошвенное сгибание), пронирует и отводит ее.", group: "lower" },
  "Object_129": { ru: "Икроножная (пр.)", en: "Musculus gastrocnemius", desc: "Сгибает стопу (подошвенное сгибание) и сгибает голень в коленном суставе (часть трицепса голени).", group: "lower" },
  "Object_130": { ru: "Икроножная (лев.)", en: "Musculus gastrocnemius", desc: "Сгибает стопу (подошвенное сгибание) и сгибает голень в коленном суставе (часть трицепса голени).", group: "lower" },
  "Object_131": { ru: "Ступни", en: "Pedes", desc: "Дистальный отдел нижней конечности, выполняющий опорную и рессорную функции.", group: "lower" }
};

// ===== Маппинг групп мышц 3D модели на группы упражнений =====
const muscleGroupToExerciseMap = {
    'head': 'Шея',
    'upper': getUpperMuscleGroup,
    'back': 'Спина',
    'abs': getAbsMuscleGroup,
    'lower': 'Ноги',
    'other': 'Разное'
};

// ===== Блокировка модели до подтверждения =====
function lockModel() {
    isModelLocked = true;
    confirmScreen.style.display = 'flex';
    viewer.style.display = 'none';
    viewer.removeAttribute('camera-controls');
    viewer.setAttribute('camera-controls', 'false');
}

function unlockModel() {
    isModelLocked = false;
    confirmScreen.style.display = 'none';
    viewer.style.display = 'block';
    viewer.setAttribute('camera-controls', '');
    viewer.style.pointerEvents = 'auto';
}

// ===== Отображение информации о мышце =====
function showInfoPanel(key) {
    const entry = musclesDictionary[key];
    const panel = document.getElementById('muscle-info-panel');
    const titleEl = document.getElementById('muscle-title');
    const enEl = document.getElementById('muscle-en');
    const descEl = document.getElementById('muscle-desc');

    titleEl.textContent = (entry && entry.ru) ? entry.ru : key;
    enEl.textContent = (entry && entry.en) ? entry.en : '';
    descEl.textContent = (entry && entry.desc) ? entry.desc : 'Описание отсутствует.';

    // Создаем или обновляем кнопку перехода к упражнениям
    updateExercisesLink(key, entry);

    if (panel) {
        panel.style.display = 'block';
        panel.style.animation = 'fadeIn 0.3s ease-out';
    }
}

// ===== Обновление кнопки перехода к упражнениям =====
function updateExercisesLink(key, entry) {
    let exercisesLinkContainer = document.getElementById('muscle-exercises-link');
    
    // Если контейнера нет - создаем его
    if (!exercisesLinkContainer) {
        exercisesLinkContainer = document.createElement('div');
        exercisesLinkContainer.id = 'muscle-exercises-link';
        exercisesLinkContainer.style.cssText = 'margin-top: 15px; padding-top: 15px; border-top: 1px solid #333;';
        
        const infoPanel = document.getElementById('muscle-info-panel');
        if (infoPanel) {
            infoPanel.appendChild(exercisesLinkContainer);
        } else {
            return;
        }
    }
    
    exercisesLinkContainer.innerHTML = '';
    
    if (entry && entry.group !== 'other') {
        // Определяем группу упражнений
        const exerciseGroup = getExerciseGroup(entry.group, entry.ru);
        
        // Создаем URL для перехода - ФИКСИРОВАННЫЙ ПУТЬ
        const exerciseUrl = `muscle-exercises.html?muscle=${encodeURIComponent(exerciseGroup)}&highlight=true`;
        
        // Создаем кнопку
        const linkBtn = document.createElement('a');
        linkBtn.id = 'exercises-link-btn';
        linkBtn.href = exerciseUrl;
        linkBtn.target = '_blank';
        linkBtn.style.cssText = 'display: inline-block; background: #005fff; color: white; ' +
                               'padding: 8px 16px; border-radius: 5px; text-decoration: none; ' +
                               'font-weight: bold; transition: background 0.3s; cursor: pointer;';
        linkBtn.innerHTML = `<i class="fas fa-dumbbell"></i> Упражнения для ${getGroupDisplayName(entry.group)}`;
        
        linkBtn.addEventListener('mouseenter', () => {
            linkBtn.style.background = '#0044cc';
        });
        linkBtn.addEventListener('mouseleave', () => {
            linkBtn.style.background = '#005fff';
        });
        
        // Создаем подпись
        const hint = document.createElement('p');
        hint.style.cssText = 'margin-top: 10px; font-size: 12px; color: #aaa;';

        
        exercisesLinkContainer.appendChild(linkBtn);
        exercisesLinkContainer.appendChild(hint);
    } else {
        // Для скелета и других не-мышечных объектов
        const noExercises = document.createElement('p');
        noExercises.style.cssText = 'color: #aaa; font-style: italic;';
        noExercises.textContent = 'Для этой части тела нет специальных упражнений';
        exercisesLinkContainer.appendChild(noExercises);
    }
}

// ===== Определение группы упражнений =====
function getExerciseGroup(modelGroup, muscleName) {
    const mappingFunction = muscleGroupToExerciseMap[modelGroup];
    
    if (typeof mappingFunction === 'function') {
        return mappingFunction(muscleName);
    }
    
    return mappingFunction || 'Разное';
}

// ===== Функции для определения групп =====
function getUpperMuscleGroup(muscleName) {
    if (!muscleName) return 'Разное';
    
    const name = muscleName.toLowerCase();
    
    if (name.includes('дельт') || name.includes('плеч')) {
        return 'Плечи';
    }
    if (name.includes('бицепс')) {
        return 'Бицепс';
    }
    if (name.includes('трицепс')) {
        return 'Трицепс';
    }
    if (name.includes('груд') || name.includes('пектор')) {
        return 'Грудь';
    }
    if (name.includes('спин') || name.includes('трапец') || name.includes('широчайш')) {
        return 'Спина';
    }
    if (name.includes('предплеч') || name.includes('запяст') || name.includes('ладон') || 
        name.includes('плечелучев') || name.includes('лучев') || name.includes('локтев')) {
        return 'Предплечья';
    }
    
    return 'Разное';
}

function getAbsMuscleGroup(muscleName) {
    if (!muscleName) return 'Пресс';
    
    const name = muscleName.toLowerCase();
    
    if (name.includes('груд') || name.includes('пектор')) {
        return 'Грудь';
    }
    if (name.includes('живот') || name.includes('пресс') || name.includes('кос') || name.includes('зубчат')) {
        return 'Пресс';
    }
    
    return 'Пресс';
}

// ===== Вспомогательные функции =====
function getGroupDisplayName(group) {
    const names = {
        'head': 'головы и шеи',
        'upper': 'верхних конечностей',
        'back': 'спины',
        'abs': 'груди и живота',
        'lower': 'нижних конечностей'
    };
    
    return names[group] || 'этой мышцы';
}

// ===== Подсветка =====
function resetHighlight() {
    if (highlightedObject) {
        highlightedObject.traverse(obj => {
            if (obj.isMesh && originalMaterials.has(obj)) {
                obj.material = originalMaterials.get(obj);
            }
        });
        highlightedObject = null;
    }

    if (activeListItem) {
        activeListItem.classList.remove('active');
        activeListItem = null;
    }

    const panel = document.getElementById('muscle-info-panel');
    if (panel) panel.style.display = 'none';
}

function safeCloneMaterial(mat) {
    try {
        return mat && typeof mat.clone === 'function' ? mat.clone() : mat;
    } catch (err) {
        return mat;
    }
}

function highlightObject(object, key) {
    // Если модель заблокирована — показываем информацию, но не подсвечиваем
    if (isModelLocked) {
        showInfoPanel(key);
        highlightListItem(key);
        console.warn('Модель заблокирована — разблокируйте для подсветки объекта.');
        return;
    }

    // Если кликаем на тот же объект — сбрасываем подсветку
    if (object && highlightedObject === object) {
        resetHighlight();
        return;
    }

    // Сбрасываем предыдущую подсветку
    resetHighlight();

    // Подсвечиваем новый объект
    if (object) {
        object.traverse(child => {
            if (!child.isMesh) return;
            
            // Сохраняем оригинальный материал
            if (!originalMaterials.has(child)) {
                originalMaterials.set(child, child.material);
            }
            
            // Создаем новый материал для подсветки
            const originalMat = originalMaterials.get(child);
            let highlightMat;
            
            if (originalMat && originalMat.isMaterial) {
                // Клонируем материал для безопасного изменения
                highlightMat = originalMat.clone();
                
                // Изменяем цвет в зависимости от типа материала
                if (highlightMat.color) {
                    highlightMat.color.set(0xff4444); // Красный цвет
                }
                
                // Добавляем свечение
                if (highlightMat.emissive) {
                    highlightMat.emissive.set(0x880000); // Красное свечение
                    highlightMat.emissiveIntensity = 0.5;
                }
                
                // Делаем материал более блестящим
                if (highlightMat.metalness !== undefined) {
                    highlightMat.metalness = 0.8;
                }
                
                if (highlightMat.roughness !== undefined) {
                    highlightMat.roughness = 0.3;
                }
            } else {
                // Если не удалось клонировать, создаем новый материал
                highlightMat = new THREE.MeshStandardMaterial({
                    color: 0xff4444,
                    emissive: 0x880000,
                    emissiveIntensity: 0.5,
                    metalness: 0.8,
                    roughness: 0.3
                });
            }
            
            // Применяем материал
            child.material = highlightMat;
        });
        
        highlightedObject = object;
        
        // Фокусируем камеру на объекте (опционально)
        focusCameraOnObject(object);
    }

    // Показываем информацию о мышце
    if (key) {
        showInfoPanel(key);
        highlightListItem(key);
    }
}
function focusCameraOnObject(object) {
    if (!camera || !object) return;
    
    // Получаем ограничивающий бокс объекта
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // Вычисляем расстояние для камеры
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraDistance = maxDim / (2 * Math.tan(fov / 2));
    
    // Добавляем отступ
    cameraDistance *= 1.5;
    
    // Позиционируем камеру
    const direction = new THREE.Vector3()
        .subVectors(camera.position, center)
        .normalize();
    
    const newPosition = new THREE.Vector3()
        .copy(center)
        .add(direction.multiplyScalar(cameraDistance));
    
    // Анимация перемещения камеры
    viewer.cameraTarget = center;
    viewer.cameraOrbit = `${cameraDistance}m 75deg 75deg`;
}
// ===== Поиск объекта в сцене (гибкий) =====
function findObjectInSceneByName(name) {
    if (!scene) return null;
    // native getObjectByName (глубокий)
    let obj = scene.getObjectByName(name);
    if (obj) return obj;

    // traverse с разными стратегиями поиска
    let foundExact = null;
    let foundIncludes = null;
    let foundParent = null;
    scene.traverse(child => {
        if (!child.name) return;
        if (!foundExact && child.name === name) foundExact = child;
        if (!foundIncludes && child.name.includes(name)) foundIncludes = child;
        if (!foundParent && child.parent && child.parent.name === name) foundParent = child.parent;
    });
    return foundExact || foundParent || foundIncludes || null;
}

// ===== Асинхронный ожидатель объекта (несколько попыток) =====
async function waitForObject(name, attempts = 10, intervalMs = 200) {
    for (let i = 0; i < attempts; i++) {
        const f = findObjectInSceneByName(name);
        if (f) return f;
        await new Promise(r => setTimeout(r, intervalMs));
    }
    return null;
}

// ===== Raycast =====
function doRaycast(e) {
    if (!scene || !camera || isModelLocked) return;

    const rect = viewer.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(scene.children, true);

    if (!hits.length) return;

    const mesh = hits[0].object;
    const root = findObjectInSceneByName(mesh.name) || mesh;
    highlightObject(root, root.name);
}

// ===== Список мышц =====
function createMuscleList() {
    muscleList.innerHTML = '';
    for (const key in musclesDictionary) {
        const m = musclesDictionary[key];
        const item = document.createElement('div');
        item.className = 'muscle-item';
        item.dataset.key = key;
        item.dataset.group = m.group;
        item.textContent = m.ru;

        item.addEventListener('click', async () => {
    // Пытаемся найти объект немедленно
            let found = findObjectInSceneByName(key);

            // Если не найден — ждём краткое время
            if (!found) {
                found = await waitForObject(key, 12, 200);
            }

            if (!found) {
                // Если всё ещё не найден — показываем инфо, но не подсвечиваем
                showInfoPanel(key);
                highlightListItem(key);
                console.warn(`Объект "${key}" не найден в сцене.`);
                return;
            }

            // Нашли объект — подсвечиваем
            highlightObject(found, key);
        });

        muscleList.appendChild(item);
    }
}

function highlightListItem(key) {
    if (activeListItem) activeListItem.classList.remove('active');
    const item = document.querySelector(`[data-key="${key}"]`);
    if (!item) return;
    item.classList.add('active');
    activeListItem = item;
    item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ===== Фильтр мышц =====
document.querySelectorAll('#muscle-filter button').forEach(btn => {
    btn.addEventListener('click', () => {
        const group = btn.dataset.group;
        document.querySelectorAll('.muscle-item').forEach(item => {
            item.style.display = (group === 'all' || item.dataset.group === group) ? 'flex' : 'none';
        });
        document.querySelectorAll('#muscle-filter button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Сбрасываем выделение при смене фильтра
        resetHighlight();
    });
});

// ===== Инициализация сцены =====
function getSceneAndCamera() {
    for (const sym of Object.getOwnPropertySymbols(viewer)) {
        const obj = viewer[sym];
        if (obj?.scene && obj?.camera) {
            scene = obj.scene;
            camera = obj.camera;
            return true;
        }
    }
    return false;
}

function init() {
    let tries = 0;
    const wait = () => {
        tries++;
        if (getSceneAndCamera()) {
            viewer.addEventListener('click', doRaycast);
            console.log('3D сцена загружена');
        } else if (tries < 40) setTimeout(wait, 300);
        else console.warn('Не удалось получить доступ к 3D сцене');
    };
    wait();
}

// ===== События =====
viewer.addEventListener('load', init);

confirmBtn.addEventListener('click', () => {
    unlockModel();
    viewer.setAttribute('camera-controls', '');
});

confirmClose.addEventListener('click', () => {
    alert('Для работы с 3D моделью необходимо подтвердить загрузку');
});

// Блокируем взаимодействие с моделью до подтверждения (клик по viewer при заблокированной модели предупреждает)
viewer.addEventListener('click', (e) => {
    if (isModelLocked) {
        e.preventDefault();
        e.stopPropagation();
        alert('Для взаимодействия с моделью нажмите кнопку "Загрузить модель"');
    }
});

// Клик вне модели — сброс подсветки
document.addEventListener('click', (e) => {
    if (!isModelLocked &&
        !viewer.contains(e.target) &&
        !muscleList.contains(e.target) &&
        !document.getElementById('muscle-info-panel')?.contains(e.target) &&
        !document.getElementById('muscle-exercises-link')?.contains(e.target)) {
        resetHighlight();
    }
});

// ===== Старт =====
createMuscleList();
lockModel(); // Блокируем модель при загрузке