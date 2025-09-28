# Собрание: данные для базы данных

## Краткий контекст

Проект визуализирует социальную сеть с живыми эфирами, блогами, сообществами и ИИ-проводником. Текущая реализация держит данные в статичных массивах (`lib/data`, `lib/content`) и моках внутри компонентов. Ниже список сущностей и атрибутов, которые нужно перенести в реальную БД, чтобы API могло выдавать и обновлять их в реальном времени.

## Основные домены

### Пользователи и связи
- `users`: id, display_name, handle/slug, роль или заголовок профиля, bio, avatar (url или инициалы), статус присутствия, контакты, временные зоны, created_at/updated_at.
- `user_settings`: предпочтения уведомлений, язык интерфейса, темплейт подсказок ИИ (используется в `FeedComposer`, `AiSignalPanel`).
- `memberships`: связи пользователя с сообществами/кругами (`circle_id`, `user_id`, роль, joined_at, last_seen_at).
- `user_connections`: граф «совместных связей» для расчета `mutuals`, подписок, приглашений (видно в `WhoToFollow`).
- CRUD операции: регистрация, обновление профиля, управление аватаром, статусом онлайн, настройками; запрос списка связей и рекомендаций.

### Сообщества и инициативы
- `circles`: id, name, focus (тематический фокус), описание, ярлык тона (`tone`), статус (`online|сбор|архив`), счётчики участников (из `circlesCopy.spotlight`).
- `circle_tags`: ключевые темы сообщества для фильтров.
- `circle_events`: расписание эфиров/митапов, владельцы, статус (`live|soon|replay`), описание (пересекается с ActivityStream).
- `circle_members`: детализированная таблица ролей (хост, модератор, участник) с правами.
- `initiatives` (из backlog): id, circle_id/owner_id, title, due_at, progress (0-100), status, metadata по задачам.
- CRUD: создание/редактирование сообществ, управление участниками, планирование эфиров, обновление прогресса инициатив.

### Посты ленты и взаимодействия
- `posts`: id, author_id, circle_id (опционально), content (rich text/markdown), accent_tone (`globe|neural|aurora`), visibility, created_at.
- `post_assets`: вложения (медиа, ссылки, превью), если появятся.
- `tags`: справочник тегов и slug-и; `post_tags` для связи с `posts`.
- `post_stats`: денормализованные счётчики (comments_count, boosts_count, signal_count) для быстрой отдачи в `FeedCard`.
- `comments`: древовидные комментарии с полями id, post_id, parent_id, author_id, body, created_at.
- `boosts`/`shares` и `signals` (аналог лайков): храним по пользователю, чтобы считать уникальные реакции.
- `drafts`: черновики редактора (`FeedComposer` использует статусы «черновик»).
- CRUD: публикация постов, редактирование/удаление, реакция, комментирование, выдача ленты с пагинацией и сортировкой.

### Реалтайм активность и сигналы
- `activity_stream`: записи «живого потока» из `ActivityStream`: id, title, host_type (user/circle), host_id, описание, теги, статус (`live|soon|replay`), start_at, end_at, stream_url.
- `interaction_loops`: сущность из блока «Петли взаимодействия» (id, title, description, members_count, intensity enum, icon).
- `alerts`: сигналы из `feedCopy.alerts` (id, title, details, tone, source_type, created_at, related_entity_id).
- `heatmap_metrics`: агрегаты для «Карта дня» (участники онлайн, количество эфиров, активность по часам).
- `trend_topics`: id, hashtag/label, описание, route/slug, популярность, обновлено в.
- CRUD: обновление статуса активностей, трансляция real-time обновлений, управление сигналами/алертами.

### Уведомления и входящие
- `notification_channels`: категории (`invitations`, `assistant`, др.) из `notificationsCopy.streams`.
- `notifications`: id, user_id, channel_id, actor_id (или произвольное имя), message, cta_label, cta_target, created_at, read_at, priority.
- `invitation_requests`: отдельная таблица для заявок на вступление (связь с circles, статус `pending|accepted|declined`).
- `daily_summaries`: агрегаты для блока «итоги суток»: дата/час, live_sessions_count, new_members_count, active_threads_count, описания.
- CRUD: генерация и доставка уведомлений, отметка прочитанных, обработка ответов на инвайты.

### ИИ-проводник и контент ассистента
- `ai_modes`: режимы ассистента из `llmCopy.modes` (id, title, description, accent_theme, активность).
- `assistant_sessions`: id, user_id, mode_id, статус, started_at, last_interaction_at.
- `assistant_messages`: per-session хранение истории (role, content, created_at, references).
- `assistant_sources`: база знаний (`knowledgeBase` в `AssistantPanel`): id, title, excerpt, source_url, тип (blog, эфира, документ), актуальность.
- `message_sources`: связь сообщений с источниками (для пояснения цитат).
- `prompt_templates`: заголовок, description, suggestions/ideas (из `AiSignalPanel` / `FeedComposer`), сегментация по темам, приоритет.
- `external_connectors`: конфигурации подключенных API/архивов (анонсированы в `llmCopy.context`).
- CRUD: создание/обновление подсказок, управление базой знаний, ведение истории диалогов, настройка подключений.

### Навигация и справочные данные
- `navigation_links`: данные `navItems` с правами доступа и порядком вывода.
- `site_copy`: тексты для hero-блоков, описаний разделов (`dashboardCopy`, `feedCopy`, `circlesCopy`, `notificationsCopy`, `llmCopy`). В проде хранится как управляемый контент, чтобы менять тексты без деплоя.
- `brand_assets`: фоновые градиенты, темы, метрики для UI (если нужно админке управлять визуалом).

## Связи и зависимости
- `users` ↔ `posts` (1:N), `users` ↔ `comments` (1:N), `users` ↔ `notifications` (1:N).
- `users` ↔ `circles` через `circle_members`; роли участников влияют на доступ к инициативам и эфиру.
- `circles` ↔ `activity_stream` / `circle_events`: события принадлежат сообществам или индивидуальным создателям.
- `posts` ↔ `tags` (M:N), `posts` ↔ `alerts` (оповещения по конкретному посту), `posts` ↔ `assistant_sources` (использовать контент постов как источник).
- `assistant_sessions` ↔ `assistant_messages` ↔ `message_sources` для трассировки рекомендованных материалов.

## Реалтайм и аналитика
- Хранить `presence`/`online_time` снапшоты для расчёта «обновление каждые 6 секунд» и тепловой карты.
- Логировать метрики вовлеченности (кол-во сигналов, рост подписчиков) — напрямую отражено в `ActivityStream` и сводках.
- Историю изменений по инициативам, событиям и постам фиксировать в audit-таблицах для отката/аналитики.

## Что важно отдать API
- Пагинированные фиды (основная лента, активности, уведомления) с фильтрами по сообществам, тегам и статусу.
- Эндпоинты для управления сообществами (создание, заявки, расписание эфиров).
- Эндпоинты ассистента: список режимов, создание сессии, поток сообщений, база источников.
- Ротация AI-подсказок (`rotateAiPrompts`) на основе данных в `prompt_templates`.
- Сервисы рекомендаций «кого позвать» — расчёт на данных `user_connections`, `memberships`, активности.
