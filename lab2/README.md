# Лабораторная работа №2

Вариант: **544147**

## Состав

- `public/index.html` — страница с формой, Canvas и таблицей результатов.
- `public/script.js` — валидация, AJAX GET-запросы и отрисовка.
- `src/app` — Java FastCGI-сервер и проверка попадания в область.
- `httpd.conf` — конфигурация Apache для пользователя `s501219`.
- `scripts/build.sh` — сборка Java-приложения.
- `scripts/deploy.sh` — развёртывание и запуск на Helios.

## Подготовка

Команда подключения к Helios:

```bash
ssh s501219@se.ifmo.ru -p 2222
```

Важно: в SSH сначала указывается пользователь, затем хост.

Скопируйте выданный преподавателем файл `fastcgi-lib.jar`:

```text
lab2/lib/fastcgi-lib.jar
```

## Сборка и запуск

```bash
cd Veb3Sem/lab2
chmod +x scripts/*.sh
./scripts/deploy.sh
```

После запуска страница доступна по адресу:

```text
http://helios.cs.ifmo.ru:24000/lab2/
```

Используются порты:

- Apache: `24000`;
- Java FastCGI: `24001`.

Если порт занят, одинаково измените его в `httpd.conf` и `scripts/deploy.sh`.
