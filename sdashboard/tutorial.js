/*
 * thelo's first-run tutorial, told by the thelo icon.
 *
 * It runs once per student on every device (the record is in this device's
 * localStorage, keyed by uid), so the web app and the phone app each show it the
 * first time. Profile -> "Start tutorial" runs it again.
 *
 *   home.html   phase "intro": the home screen (next lesson, sections, locks, jump
 *               tests, streak, the bottom bar), then opens the demo lesson.
 *   lesson.html ?tutorial=1: the demo lesson for the student's grade and language
 *               (lessons/TUTORIAL-HY|EN|RU, built by lesson-gen/build_tutorial.py):
 *               the board, the replay bar, the lesson menu, two-finger moving,
 *               a multiple-choice check and a handwritten answer.
 *   home.html   phase "after": Scan (the tour continues inside scan.html, which
 *               reports back with postMessage), Profile with Assistive Panning and
 *               "Start tutorial", Courses, and the end.
 *
 * lesson.html reports its progress with DOM events (thelo:lesson-ready,
 * thelo:stage, thelo:lesson-complete) and exposes window.theloLessonApi for the menu.
 */
(function () {
    'use strict';
    if (window.TheloTutorial) return;

    const AVATAR = 'https://thelo.ink/img/thelofavicon.png';
    const STORE = 'theloTutorial:';            // + uid -> { status: running|done|skipped, phase }
    const ACTIVE = 'theloTutorial.active';     // uid whose tour is running, for lesson.html / scan.html

    // ------------------------------------------------------------------ words
    const TEXT = {
        en: {
            next: 'Next', go: "Let's go", startLesson: 'Start the lesson', skip: 'Skip tutorial', gotIt: 'Got it',
            finish: "Let's start!", ok: 'OK',
            skipped: 'No problem! You can start the tutorial again any time: Profile → Start Tutorial.',
            welcome: "Hi{name}! I'm thelo 👋 Let me show you around. It takes about 3 minutes.",
            hero: 'Your next lesson always waits here. Tap Continue to pick up where you left off.',
            folders: 'Your course is split into sections, like folders. Tap one to open it. Lessons open one by one: finish a lesson to unlock the next.',
            locked: "A lock 🔒 means you haven't reached that lesson yet.",
            jump: 'Already know a section? Tap Jump here and pass a short test to unlock it straight away.',
            stats: 'Do a lesson every week to grow your streak 🔥 (tap it for streak freezes). Stars ⭐ are the points you earn.',
            nav: 'This bar takes you around the app: Home, Courses, Scan, Compete (your weekly league and maths battles with friends) and Profile.',
            toLesson: "Now let's do your first lesson together! I made a special one for grade {grade}.",
            lStart: 'This is a lesson. The board works like a real whiteboard. Tap anywhere to start.',
            lStartDesk: 'This is a lesson. The board works like a real whiteboard. Press {start} to begin.',
            lHeadline: 'Each step starts with a short explanation at the top, and I draw the rest on the board for you.',
            lProgress: 'This bar follows the drawing. Drag the dot to rewind or watch it again.',
            lFab: "This round button opens the lesson menu. It's always here, in the corner.",
            lMenu: 'Go / Check: moves you on, and on a question I check your answer.\nHint: a small clue when you are stuck on a question.\nStep by step: we solve the question together, one small step at a time.\nNext Stage / Previous Stage: move through the lesson.\nClear: wipe your writing.\nFinish Lesson: leave the lesson.',
            lBtnNext: 'This button moves you on. On a question it turns into Check, and I check your answer.',
            lBtnClear: 'Clear wipes your writing off the board.',
            lBtnPrev: 'This takes you back to the previous step.',
            lBtnBook: 'thelobook is your notebook for working things out.',
            lBtnCalc: 'A graphing calculator, whenever you need one.',
            lGesture: 'Write with one finger. To move the board, drag it with two fingers.\nAssistive Panning moves it for you while you write. You can turn it off in Profile.',
            lGoNextMobile: 'Now open the menu and tap {nextStage}.',
            lGoNextDesk: 'Now press {next} to go on.',
            lBoard2: 'Watch the board, then go to the next step.',
            lMcqMobile: 'A question! Tap the answer you think is right, then open the menu and tap {check}. When it turns green, tap {next} to go on.',
            lMcqDesk: 'A question! Click the answer you think is right, then press {check}. When it turns green, press {next} to go on.',
            lWriteMobile: 'Now write the answer on the board with your finger, then open the menu and tap {check}. I read your handwriting! Stuck? Tap {hint}, or {guide} and we solve it together.',
            lWriteDesk: 'Now write the answer on the board, then press {check}. I read your handwriting! Stuck? Press {hint}, or {guide} and we solve it together.',
            afterWelcome: 'Great job with your first lesson! 🎉 Now a quick look at the rest of the app.',
            scanNav: "Scan helps with any problem from your book or homework. Let's open it.",
            sCamera: 'Take a photo of one problem…',
            sGallery: '…or choose a picture you already have.',
            sTips: 'For the best result: one problem at a time, good light, page flat.',
            sExplain: "Don't understand a topic? Tap here: ask one short question or send one picture, and I explain it one small step at a time.",
            sAfter: 'Then I explain the solution step by step and give you similar problems to practise. On the practice board, move with two fingers and pinch to zoom.',
            pLang: "Change the app's language here.",
            pPan: "Assistive Panning moves the board for you while you write, so you never run out of space. Some people love it, others don't: switch it on or off right here.",
            pTutorial: 'Want to see this tour again? Tap Start Tutorial.',
            courses: 'In Courses you can change your grade or language. Moving up a grade needs a short test.',
            final: "That's it, you're ready! Have fun learning with thelo.",
        },
        hy: {
            next: 'Հաջորդը', go: 'Սկսենք', startLesson: 'Սկսել դասը', skip: 'Բաց թողնել ուղեցույցը', gotIt: 'Պարզ է',
            finish: 'Սկսենք', ok: 'Լավ',
            skipped: 'Ոչինչ։ Ուղեցույցը կարող ես նորից սկսել ցանկացած պահի՝ Պրոֆիլ → Սկսել ուղեցույցը։',
            welcome: 'Բարև{name}։ Ես thelo-ն եմ 👋 Եկ ցույց տամ, թե ինչպես է ամեն ինչ աշխատում։ Դա կտևի մոտ 3 րոպե։',
            hero: 'Քո հաջորդ դասը միշտ սպասում է այստեղ։ Սեղմիր «Շարունակել»՝ կանգնած տեղից շարունակելու համար։',
            folders: 'Դասընթացը բաժանված է բաժինների՝ թղթապանակների պես։ Սեղմիր՝ բացելու համար։ Դասերը բացվում են հերթով. ավարտիր դասը, և հաջորդը կբացվի։',
            locked: 'Կողպեքը 🔒 նշանակում է, որ դեռ չես հասել այդ դասին։',
            jump: 'Արդեն գիտե՞ս բաժինը։ Սեղմիր «Թռիչք այստեղ» և հանձնիր կարճ թեստ՝ այն միանգամից բացելու համար։',
            stats: 'Ամեն շաբաթ արա դաս, և շարքդ 🔥 կաճի (սեղմիր դրա վրա՝ սառեցումների համար)։ Աստղերը ⭐ քո վաստակած միավորներն են։',
            nav: 'Այս վահանակով շարժվում ես հավելվածով՝ Տուն, Դասընթացներ, Սկան, Մրցույթ (շաբաթական լիգա և մրցամարտեր ընկերներիդ հետ) և Պրոֆիլ։',
            toLesson: 'Իսկ հիմա միասին անցնենք քո առաջին դասը։ Ես հատուկ դաս եմ պատրաստել {grade}-րդ դասարանի համար։',
            lStart: 'Սա դաս է։ Գրատախտակն աշխատում է իսկականի պես։ Սեղմիր ցանկացած տեղ՝ սկսելու համար։',
            lStartDesk: 'Սա դաս է։ Գրատախտակն աշխատում է իսկականի պես։ Սեղմիր «{start}»՝ սկսելու համար։',
            lHeadline: 'Ամեն քայլ սկսվում է վերևում գրված կարճ բացատրությամբ, իսկ մնացածը ես նկարում եմ գրատախտակին։',
            lProgress: 'Այս գիծը հետևում է նկարին։ Քաշիր կետը՝ հետ տալու կամ նորից դիտելու համար։',
            lFab: 'Այս կլոր կոճակը բացում է դասի ընտրացանկը։ Այն միշտ այստեղ է՝ անկյունում։',
            lMenu: 'Գնալ / Ստուգել՝ տանում է առաջ, իսկ հարցի ժամանակ ես ստուգում եմ պատասխանդ։\nՀուշում՝ փոքր օգնություն, երբ հարցի ժամանակ խրվել ես։\nՔայլ առ քայլ՝ հարցը լուծում ենք միասին, մեկ փոքր քայլով։\nՀաջորդ փուլ / Նախորդ փուլ՝ շարժվել դասի մեջ։\nՄաքրել՝ ջնջել գրածդ։\nԱվարտել դասը՝ դուրս գալ դասից։',
            lBtnNext: 'Այս կոճակը տանում է առաջ։ Հարցի ժամանակ այն դառնում է «Ստուգել», և ես ստուգում եմ պատասխանդ։',
            lBtnClear: '«Մաքրել»-ը ջնջում է գրածդ գրատախտակից։',
            lBtnPrev: 'Սա վերադարձնում է նախորդ քայլին։',
            lBtnBook: '«Թելոգիրք»-ը քո տետրն է՝ հաշվարկներ անելու համար։',
            lBtnCalc: 'Գրաֆիկական հաշվիչ, երբ պետք լինի։',
            lGesture: 'Գրիր մեկ մատով։ Գրատախտակը տեղաշարժելու համար քաշիր այն երկու մատով։\nՕգնող ոլորումը գրելիս ինքն է տեղաշարժում գրատախտակը։ Այն կարող ես անջատել Պրոֆիլում։',
            lGoNextMobile: 'Հիմա բացիր ընտրացանկը և սեղմիր «{nextStage}»։',
            lGoNextDesk: 'Հիմա սեղմիր «{next}»՝ շարունակելու համար։',
            lBoard2: 'Դիտիր գրատախտակը, հետո անցիր հաջորդ քայլին։',
            lMcqMobile: 'Հարց։ Սեղմիր այն պատասխանը, որը ճիշտ ես համարում, հետո բացիր ընտրացանկը և սեղմիր «{check}»։ Երբ այն կանաչի, սեղմիր «{next}»՝ առաջ գնալու համար։',
            lMcqDesk: 'Հարց։ Ընտրիր այն պատասխանը, որը ճիշտ ես համարում, հետո սեղմիր «{check}»։ Երբ այն կանաչի, սեղմիր «{next}»՝ առաջ գնալու համար։',
            lWriteMobile: 'Հիմա գրատախտակին մատով գրիր պատասխանը, հետո բացիր ընտրացանկը և սեղմիր «{check}»։ Ես կարդում եմ ձեռագիրդ։ Խրվե՞լ ես. սեղմիր «{hint}» կամ «{guide}», ու կլուծենք միասին։',
            lWriteDesk: 'Հիմա գրատախտակին գրիր պատասխանը, հետո սեղմիր «{check}»։ Ես կարդում եմ ձեռագիրդ։ Խրվե՞լ ես. սեղմիր «{hint}» կամ «{guide}», ու կլուծենք միասին։',
            afterWelcome: 'Կեցցե՛ս, դու ավարտեցիր քո առաջին դասը 🎉 Հիմա արագ նայենք հավելվածի մնացած մասերին։',
            scanNav: '«Սկան»-ն օգնում է դասագրքի կամ տնայինի ցանկացած խնդրի հարցում։ Եկ բացենք այն։',
            sCamera: 'Լուսանկարիր մեկ խնդիր…',
            sGallery: '…կամ ընտրիր արդեն ունեցած նկարը։',
            sTips: 'Լավագույն արդյունքի համար՝ մեկ խնդիր, լավ լույս, հարթ էջ։',
            sExplain: 'Ինչ-որ թեմա չե՞ս հասկանում։ Սեղմիր այստեղ՝ գրիր մեկ կարճ հարց կամ ուղարկիր մեկ նկար, և ես կբացատրեմ այն փոքր քայլերով։',
            sAfter: 'Հետո ես քայլ առ քայլ բացատրում եմ լուծումը և տալիս նմանատիպ խնդիրներ՝ վարժվելու համար։ Վարժության գրատախտակին շարժվիր երկու մատով, իսկ մեծացնելու համար մատներդ հեռացրու իրարից։',
            pLang: 'Այստեղ փոխում ես հավելվածի լեզուն։',
            pPan: 'Օգնող ոլորումը գրելիս ինքն է տեղաշարժում գրատախտակը, որպեսզի տեղը չվերջանա։ Ոմանք այն շատ են սիրում, ոմանք՝ ոչ. միացրու կամ անջատիր հենց այստեղ։',
            pTutorial: 'Ուզո՞ւմ ես նորից տեսնել այս ուղեցույցը։ Սեղմիր «Սկսել ուղեցույցը»։',
            courses: '«Դասընթացներ»-ում կարող ես փոխել դասարանը կամ լեզուն։ Ավելի բարձր դասարան անցնելու համար պետք է կարճ թեստ հանձնել։',
            final: 'Վերջ, դու պատրաստ ես։ Հաճելի ուսուցում thelo-ի հետ։',
        },
        ru: {
            next: 'Дальше', go: 'Поехали', startLesson: 'Начать урок', skip: 'Пропустить обучение', gotIt: 'Понятно',
            finish: 'Начнём!', ok: 'Хорошо',
            skipped: 'Ничего страшного! Обучение можно начать снова в любой момент: Профиль → Начать обучение.',
            welcome: 'Привет{name}! Я thelo 👋 Давай покажу, как здесь всё устроено. Это займёт около 3 минут.',
            hero: 'Здесь всегда ждёт твой следующий урок. Нажми «Продолжить», чтобы продолжить с того места, где остановился.',
            folders: 'Курс разделён на разделы, как на папки. Нажми на раздел, чтобы открыть его. Уроки открываются по порядку: закончи урок, и откроется следующий.',
            locked: 'Замок 🔒 значит, что ты ещё не дошёл до этого урока.',
            jump: 'Уже знаешь раздел? Нажми «Перейти сюда» и сдай короткий тест, чтобы сразу его открыть.',
            stats: 'Проходи урок каждую неделю, и твоя серия 🔥 будет расти (нажми на неё, чтобы купить заморозку). Звёзды ⭐ — это очки, которые ты зарабатываешь.',
            nav: 'Эта панель ведёт по приложению: Главная, Курсы, Скан, Турнир (недельная лига и математические битвы с друзьями) и Профиль.',
            toLesson: 'А теперь пройдём твой первый урок вместе! Я сделал специальный урок для {grade} класса.',
            lStart: 'Это урок. Доска работает как настоящая. Нажми в любом месте, чтобы начать.',
            lStartDesk: 'Это урок. Доска работает как настоящая. Нажми «{start}», чтобы начать.',
            lHeadline: 'Каждый шаг начинается с короткого объяснения сверху, а остальное я рисую для тебя на доске.',
            lProgress: 'Эта полоска идёт вместе с рисунком. Потяни точку, чтобы перемотать или посмотреть снова.',
            lFab: 'Эта круглая кнопка открывает меню урока. Она всегда здесь, в углу.',
            lMenu: 'Начать / Проверить: ведёт дальше, а на вопросе я проверяю твой ответ.\nПодсказка: маленькая помощь, если застрял на вопросе.\nШаг за шагом: решаем вопрос вместе, по маленькому шагу.\nСледующий шаг / Предыдущий шаг: перемещение по уроку.\nОчистить: стереть написанное.\nЗавершить урок: выйти из урока.',
            lBtnNext: 'Эта кнопка ведёт дальше. На вопросе она становится «Проверить», и я проверяю твой ответ.',
            lBtnClear: '«Очистить» стирает написанное с доски.',
            lBtnPrev: 'Эта кнопка возвращает к предыдущему шагу.',
            lBtnBook: 'thelobook — твоя тетрадь для вычислений.',
            lBtnCalc: 'Графический калькулятор, когда он нужен.',
            lGesture: 'Пиши одним пальцем. Чтобы сдвинуть доску, тяни её двумя пальцами.\nАвтопрокрутка сама сдвигает доску, пока ты пишешь. Её можно выключить в Профиле.',
            lGoNextMobile: 'Теперь открой меню и нажми «{nextStage}».',
            lGoNextDesk: 'Теперь нажми «{next}», чтобы продолжить.',
            lBoard2: 'Посмотри на доску, а потом переходи к следующему шагу.',
            lMcqMobile: 'Вопрос! Нажми на ответ, который считаешь верным, потом открой меню и нажми «{check}». Когда он станет зелёным, нажми «{next}», чтобы идти дальше.',
            lMcqDesk: 'Вопрос! Выбери ответ, который считаешь верным, потом нажми «{check}». Когда он станет зелёным, нажми «{next}», чтобы идти дальше.',
            lWriteMobile: 'Теперь напиши ответ на доске пальцем, потом открой меню и нажми «{check}». Я читаю твой почерк! Застрял? Нажми «{hint}» или «{guide}», и решим вместе.',
            lWriteDesk: 'Теперь напиши ответ на доске, потом нажми «{check}». Я читаю твой почерк! Застрял? Нажми «{hint}» или «{guide}», и решим вместе.',
            afterWelcome: 'Молодец, первый урок пройден! 🎉 Теперь быстро посмотрим на остальное приложение.',
            scanNav: '«Скан» помогает с любой задачей из учебника или домашки. Давай откроем его.',
            sCamera: 'Сфотографируй одну задачу…',
            sGallery: '…или выбери уже готовую картинку.',
            sTips: 'Для лучшего результата: одна задача, хороший свет, ровная страница.',
            sExplain: 'Не понимаешь тему? Нажми сюда: задай один короткий вопрос или отправь одну картинку, и я объясню по маленьким шагам.',
            sAfter: 'Потом я объясняю решение шаг за шагом и даю похожие задачи для тренировки. На доске для тренировки двигай двумя пальцами, а чтобы увеличить, разведи пальцы.',
            pLang: 'Здесь меняется язык приложения.',
            pPan: 'Автопрокрутка сама сдвигает доску, пока ты пишешь, чтобы место не заканчивалось. Кому-то она очень нравится, кому-то нет: включи или выключи её прямо здесь.',
            pTutorial: 'Хочешь посмотреть обучение ещё раз? Нажми «Начать обучение».',
            courses: 'В «Курсах» можно сменить класс или язык. Чтобы перейти в класс выше, нужно сдать короткий тест.',
            final: 'Вот и всё, ты готов! Приятной учёбы с thelo.',
        },
    };
    const words = (lang) => TEXT[lang] || TEXT.en;
    const knownLang = (l) => (TEXT[l] ? l : 'hy');
    const fmt = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (v && v[k] != null ? v[k] : ''));
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const q = (sel, root) => (root || document).querySelector(sel);

    // ------------------------------------------------------------------ the record
    function getState(uid) {
        try { return JSON.parse(localStorage.getItem(STORE + uid) || 'null'); } catch (e) { return null; }
    }
    function setState(uid, state) {
        try {
            localStorage.setItem(STORE + uid, JSON.stringify(Object.assign({ at: Date.now() }, state)));
            if (state.status === 'running') localStorage.setItem(ACTIVE, uid);
            else localStorage.removeItem(ACTIVE);
        } catch (e) { /* private mode: the tour simply runs again next time */ }
    }
    const activeUid = () => { try { return localStorage.getItem(ACTIVE); } catch (e) { return null; } };

    // ------------------------------------------------------------------ overlay
    const CSS = `
    .tt-blocker { position: fixed; inset: 0; z-index: 100000; background: transparent; }
    .tt-blocker.tt-dim { background: rgba(15, 23, 42, 0.55); }
    .tt-spot { position: fixed; z-index: 100001; border-radius: 14px; pointer-events: none;
        box-shadow: 0 0 0 200vmax rgba(15, 23, 42, 0.55); transition: all 0.25s ease; }
    .tt-ring { position: fixed; z-index: 100001; border-radius: 14px; pointer-events: none;
        border: 3px solid #2563EB; animation: tt-pulse 1.4s ease-in-out infinite; }
    @keyframes tt-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.45); } 50% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); } }
    .tt-bubble { position: fixed; z-index: 100002; display: flex; align-items: flex-end; gap: 10px;
        width: min(380px, calc(100vw - 24px)); pointer-events: none; opacity: 0; transition: opacity 0.2s ease;
        font-family: 'Manrope', 'Montserrat Arm', system-ui, sans-serif; }
    .tt-bubble.tt-hy { font-family: 'Montserrat Arm', 'Manrope', system-ui, sans-serif; }
    .tt-bubble.tt-show { opacity: 1; }
    .tt-bubble.tt-coach { width: min(540px, calc(100vw - 100px)); align-items: center; }
    .tt-coach .tt-avatar { width: 46px; height: 46px; }
    .tt-coach .tt-avatar img { width: 32px; height: 32px; }
    .tt-coach .tt-card { padding: 10px 14px 8px; }
    .tt-coach .tt-text { font-size: 14px; }
    .tt-coach .tt-actions { margin-top: 6px; }
    .tt-coach .tt-card::before { bottom: auto; top: calc(50% - 7px); }
    .tt-avatar { width: 54px; height: 54px; flex-shrink: 0; border-radius: 50%; background: #fff;
        border: 3px solid #2563EB; box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
        display: flex; align-items: center; justify-content: center; animation: tt-bob 2.4s ease-in-out infinite; }
    .tt-avatar img { width: 38px; height: 38px; object-fit: contain; }
    @keyframes tt-bob { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-4px) rotate(-6deg); } }
    .tt-card { position: relative; flex: 1; background: #fff; color: #111827; border-radius: 16px; padding: 14px 16px 12px;
        box-shadow: 0 14px 34px rgba(15, 23, 42, 0.25); pointer-events: auto; max-height: calc(100vh - 24px); overflow-y: auto; }
    .tt-card::before { content: ''; position: absolute; left: -7px; bottom: 18px; width: 14px; height: 14px;
        background: #fff; transform: rotate(45deg); border-radius: 2px; }
    .tt-text { font-size: 15px; line-height: 1.45; font-weight: 600; white-space: pre-line; margin: 0; }
    .tt-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; }
    .tt-skip { background: none; border: none; color: #64748b; font: inherit; font-size: 13px; font-weight: 700;
        padding: 6px 2px; cursor: pointer; text-align: left; flex: 1 1 auto; min-width: 0; }
    .tt-next { background: #2563EB; color: #fff; border: none; border-radius: 12px; font: inherit; font-size: 15px;
        font-weight: 800; padding: 9px 18px; cursor: pointer; white-space: nowrap; flex: 0 0 auto; box-shadow: 0 6px 14px -4px rgba(37, 99, 235, 0.45); margin-left: auto; }
    .tt-next:active { transform: translateY(1px); }
    .tt-fingers { position: relative; height: 70px; margin: 10px 0 2px; border-radius: 12px; background: #EFF6FF; overflow: hidden; }
    .tt-fingers span { position: absolute; top: 18px; width: 26px; height: 26px; border-radius: 50%;
        background: rgba(37, 99, 235, 0.85); box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.2); animation: tt-drag 2.2s ease-in-out infinite; }
    .tt-fingers span:nth-child(1) { left: 22%; }
    .tt-fingers span:nth-child(2) { left: calc(22% + 36px); top: 28px; }
    @keyframes tt-drag { 0%, 15% { transform: translateX(0); opacity: 0.4; } 30% { opacity: 1; } 75% { transform: translateX(120px); opacity: 1; } 100% { transform: translateX(120px); opacity: 0; } }
    `;

    function ensureStyle() {
        if (document.getElementById('tt-style')) return;
        const st = document.createElement('style');
        st.id = 'tt-style';
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    function rectOf(target) {
        let t = typeof target === 'function' ? target() : target;
        if (!t) return null;
        if (t.getBoundingClientRect) {
            if (!t.isConnected) return null;
            const r = t.getBoundingClientRect();
            if (r.width < 2 || r.height < 2) return null;
            return { left: r.left, top: r.top, width: r.width, height: r.height };
        }
        return t;
    }

    let current = null;          // the step on screen, so a new one replaces it

    /**
     * Show one step and resolve with 'next', 'skip' or 'event'.
     *   text       what thelo says (\n for new lines)
     *   target     element, () => element|rect, or nothing (centred)
     *   mode       'modal': dims the screen and waits for Next;
     *              'coach': no dimming, the page stays usable (a pulsing ring marks the target)
     *   place      'auto' | 'top' | 'bottom' | 'bottom-left' | 'center'
     *   next       label of the button (null: no button)
     *   until      (done) => cleanup: resolve the step from outside (an app event)
     *   fingers    show the two-finger animation
     */
    function show(lang, opts) {
        ensureStyle();
        if (current) current.finish('replaced');
        const W = words(lang);
        const mode = opts.mode || 'modal';
        return new Promise(resolve => {
            const els = [];
            let raf = 0, timer = 0, cleanupUntil = null, done = false;

            let blocker = null;
            if (mode === 'modal') {
                blocker = document.createElement('div');
                blocker.className = 'tt-blocker';
                document.body.appendChild(blocker); els.push(blocker);
            }
            const spot = document.createElement('div');
            spot.className = mode === 'modal' ? 'tt-spot' : 'tt-ring';
            spot.style.display = 'none';
            document.body.appendChild(spot); els.push(spot);

            const bubble = document.createElement('div');
            bubble.className = 'tt-bubble' + (lang === 'hy' ? ' tt-hy' : '') + (mode === 'coach' ? ' tt-coach' : '');
            bubble.innerHTML = `
                <div class="tt-avatar"><img alt="thelo" src="${AVATAR}"></div>
                <div class="tt-card">
                    <p class="tt-text"></p>
                    ${opts.fingers ? '<div class="tt-fingers"><span></span><span></span></div>' : ''}
                    <div class="tt-actions">
                        ${opts.noSkip ? '' : `<button class="tt-skip" type="button"></button>`}
                        ${opts.next ? `<button class="tt-next" type="button"></button>` : ''}
                    </div>
                </div>`;
            bubble.querySelector('.tt-text').textContent = opts.text;
            const skipBtn = bubble.querySelector('.tt-skip');
            const nextBtn = bubble.querySelector('.tt-next');
            if (skipBtn) skipBtn.textContent = W.skip;
            if (nextBtn) nextBtn.textContent = opts.next;
            document.body.appendChild(bubble); els.push(bubble);

            const finish = (result) => {
                if (done) return;
                done = true;
                cancelAnimationFrame(raf);
                clearInterval(timer);
                if (cleanupUntil) { try { cleanupUntil(); } catch (e) { /* ignore */ } }
                els.forEach(e => e.remove());
                if (current && current.finish === finish) current = null;
                resolve(result);
            };
            current = { finish };
            if (skipBtn) skipBtn.onclick = (e) => { e.stopPropagation(); finish('skip'); };
            if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); finish('next'); };
            if (opts.until) cleanupUntil = opts.until(() => finish('event'));

            const place = () => {
                const vw = window.innerWidth, vh = window.innerHeight, m = 12, pad = opts.pad == null ? 8 : opts.pad;
                const r = opts.target ? rectOf(opts.target) : null;
                if (r) {
                    spot.style.display = '';
                    spot.style.left = `${r.left - pad}px`; spot.style.top = `${r.top - pad}px`;
                    spot.style.width = `${r.width + pad * 2}px`; spot.style.height = `${r.height + pad * 2}px`;
                    if (blocker) blocker.classList.remove('tt-dim');
                } else {
                    spot.style.display = 'none';
                    if (blocker) blocker.classList.add('tt-dim');
                }
                const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
                let x, y;
                const where = opts.place || 'auto';
                if (where === 'top') { x = (vw - bw) / 2; y = m; }
                else if (where === 'bottom') { x = (vw - bw) / 2; y = vh - bh - m; }
                else if (where === 'bottom-left') { x = m; y = vh - bh - m; }
                else if (where === 'center' || !r) { x = (vw - bw) / 2; y = (vh - bh) / 2; }
                else {
                    // Below the target, else above it, else beside it (landscape phones
                    // rarely have room above or below), else wherever it covers least.
                    const below = r.top + r.height + pad + 14, above = r.top - pad - 14 - bh;
                    const left = r.left - pad - 14 - bw, right = r.left + r.width + pad + 14;
                    const midY = r.top + r.height / 2 - bh / 2;
                    x = r.left + r.width / 2 - bw / 2;
                    if (below + bh <= vh - m) y = below;
                    else if (above >= m) y = above;
                    else if (left >= m) { x = left; y = midY; }
                    else if (right + bw <= vw - m) { x = right; y = midY; }
                    else y = Math.max(m, Math.min(vh - bh - m, (vh - bh) / 2));
                }
                x = Math.max(m, Math.min(vw - bw - m, x));
                y = Math.max(m, Math.min(vh - bh - m, y));
                bubble.style.left = `${x}px`;
                bubble.style.top = `${y}px`;
                bubble.classList.add('tt-show');
            };
            // Follow the target every frame (it may scroll or move), and also on a timer:
            // a WebView in the background, or a slow device, can hold animation frames back.
            const tick = () => { if (done) return; place(); raf = requestAnimationFrame(tick); };
            place();
            raf = requestAnimationFrame(tick);
            timer = setInterval(() => { if (!done) place(); }, 250);
        });
    }

    /** Scroll an element into view inside its scrolling container, then let it settle. */
    async function bringIntoView(el) {
        if (!el) return;
        try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { el.scrollIntoView(); }
        await sleep(450);
    }

    /** Ends the tour after "Skip": remember it and say where to find it again. */
    async function skipped(lang, uid) {
        if (uid) setState(uid, { status: 'skipped' });
        await show(lang, { text: words(lang).skipped, next: words(lang).ok, noSkip: true, place: 'center' });
    }

    // ------------------------------------------------------------------ home.html
    /**
     * ctx: { uid, lang, grade, name, api: { hangar(), scan(), profile(), scanFrame(), lessonUrl } }
     * Runs the part of the tour that belongs to the home screen, according to the record.
     */
    async function runHome(ctx) {
        const st = getState(ctx.uid);
        const phase = st && st.status === 'running' ? st.phase : 'intro';
        if (phase === 'lesson' || phase === 'after') return afterLesson(ctx);
        return intro(ctx);
    }

    async function intro(ctx) {
        const { uid, lang } = ctx, W = words(lang);
        setState(uid, { status: 'running', phase: 'intro' });
        const hangar = q('#view-hangar');
        const step = async (opts) => {
            const r = await show(lang, opts);
            if (r === 'skip') { await skipped(lang, uid); return false; }
            return true;
        };
        if (!await step({ text: fmt(W.welcome, { name: ctx.name ? `, ${ctx.name}` : '' }), next: W.go, place: 'center' })) return;
        const hero = q('.window-card-hero', hangar);
        await bringIntoView(hero);
        if (!await step({ text: W.hero, target: hero, next: W.next })) return;
        const folder = q('#h-lesson-list .path-unit.current', hangar) || q('#h-lesson-list .path-unit', hangar);
        if (folder) {
            await bringIntoView(q('.path-head', folder) || folder);
            if (!await step({ text: W.folders, target: q('.path-head', folder) || folder, next: W.next })) return;
        }
        const locked = q('#h-lesson-list .path-unit.current .lesson-item.locked', hangar);
        if (locked) {
            await bringIntoView(locked);
            if (!await step({ text: W.locked, target: locked, next: W.next })) return;
        }
        const jump = q('#h-lesson-list .btn-jump', hangar);
        if (jump) {
            await bringIntoView(jump);
            if (!await step({ text: W.jump, target: jump, next: W.next })) return;
        }
        if (hero) await bringIntoView(hero);
        const stats = q('.stats-row', hangar);
        if (stats && !await step({ text: W.stats, target: stats, next: W.next })) return;
        const nav = q('.nav-bar', hangar);
        if (nav && !await step({ text: W.nav, target: nav, next: W.next, pad: 4 })) return;
        if (!await step({ text: fmt(W.toLesson, { grade: ctx.grade }), next: W.startLesson, place: 'center' })) return;
        setState(uid, { status: 'running', phase: 'lesson' });
        window.location.href = ctx.api.lessonUrl;
    }

    async function afterLesson(ctx) {
        const { uid, lang, api } = ctx, W = words(lang);
        setState(uid, { status: 'running', phase: 'after' });
        const step = async (opts) => {
            const r = await show(lang, opts);
            if (r === 'skip') { await skipped(lang, uid); return false; }
            return true;
        };
        if (!await step({ text: W.afterWelcome, next: W.next, place: 'center' })) return;
        const scanTab = q('#view-hangar .nav-bar .nav-item:nth-child(3)');
        if (!await step({ text: W.scanNav, target: scanTab, next: W.next, pad: 4 })) return;

        // Scan lives in an iframe; its own tutorial.js runs that part and reports back.
        api.scan();
        const scanResult = await scanTour(api.scanFrame(), lang);
        if (scanResult === 'skip') { await skipped(lang, uid); api.hangar(); return; }

        api.profile();
        await sleep(500);
        const row = (id) => { const el = document.getElementById(id); return el ? el.closest('.settings-item') : null; };
        const langRow = row('p-lang');
        if (langRow) { await bringIntoView(langRow); if (!await step({ text: W.pLang, target: langRow, next: W.next })) return; }
        const panRow = row('p-pan-toggle');
        if (panRow) { await bringIntoView(panRow); if (!await step({ text: W.pPan, target: panRow, next: W.next })) return; }
        const tutRow = row('p-tutorial-btn');
        if (tutRow) { await bringIntoView(tutRow); if (!await step({ text: W.pTutorial, target: tutRow, next: W.next })) return; }
        const coursesTab = q('#view-profile .nav-bar .nav-courses-tab');
        if (coursesTab && !await step({ text: W.courses, target: coursesTab, next: W.next, pad: 4 })) return;
        await show(lang, { text: W.final, next: W.finish, noSkip: true, place: 'center' });
        setState(uid, { status: 'done' });
        api.hangar();
    }

    /** Ask the scan iframe to run its part; resolves 'done' or 'skip'. */
    function scanTour(frame, lang) {
        return new Promise(resolve => {
            let started = false, settled = false;
            const ask = () => { try { frame && frame.contentWindow && frame.contentWindow.postMessage({ type: 'thelo-tutorial', action: 'scan', lang }, '*'); } catch (e) { /* ignore */ } };
            const onMessage = (event) => {
                if (!frame || event.source !== frame.contentWindow || !event.data || event.data.type !== 'thelo-tutorial') return;
                if (event.data.event === 'scan-ready' && !started) ask();
                if (event.data.event === 'scan-started') started = true;
                if (event.data.event === 'scan-done') end(event.data.skipped ? 'skip' : 'done');
            };
            const end = (r) => { if (settled) return; settled = true; window.removeEventListener('message', onMessage); resolve(r); };
            window.addEventListener('message', onMessage);
            ask();
            setTimeout(ask, 800);
            // If the scan page never answers (offline, old version), carry on without it.
            setTimeout(() => { if (!started) end('done'); }, 8000);
        });
    }

    // ------------------------------------------------------------------ scan.html
    function setupScan() {
        let running = false;
        const reply = (msg) => { try { window.parent.postMessage(Object.assign({ type: 'thelo-tutorial' }, msg), '*'); } catch (e) { /* ignore */ } };
        window.addEventListener('message', async (event) => {
            if (event.source !== window.parent || !event.data || event.data.type !== 'thelo-tutorial' || event.data.action !== 'scan') return;
            if (running) return;
            running = true;
            reply({ event: 'scan-started' });
            const lang = knownLang(event.data.lang), W = words(lang);
            let result = 'done';
            for (const s of [
                { text: W.sCamera, target: () => document.getElementById('btn-camera') },
                { text: W.sGallery, target: () => document.getElementById('btn-gallery') },
                { text: W.sExplain, target: () => document.getElementById('btn-explain') },
                { text: W.sTips, target: () => { const t = document.getElementById('lbl-tips'); return t ? t.parentElement : null; } },
                { text: W.sAfter, fingers: true, place: 'center' },
            ]) {
                const r = await show(lang, Object.assign({ next: W.next }, s));
                if (r === 'skip') { result = 'skip'; break; }
            }
            running = false;
            reply({ event: 'scan-done', skipped: result === 'skip' });
        });
        if (window.parent !== window) reply({ event: 'scan-ready' });
    }

    // ------------------------------------------------------------------ lesson.html (?tutorial=1)
    function setupLesson() {
        let stage = -1, complete = false, started = false;
        const waiters = [];
        const wake = () => { for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].test()) { waiters[i].resolve(); waiters.splice(i, 1); } };
        const waitFor = (test) => new Promise(resolve => { if (test()) resolve(); else waiters.push({ test, resolve }); });
        document.addEventListener('thelo:stage', (e) => { stage = e.detail ? e.detail.index : stage; wake(); });
        document.addEventListener('thelo:lesson-complete', () => {
            complete = true;
            const uid = activeUid();
            if (uid) setState(uid, { status: 'running', phase: 'after' });
            if (current) current.finish('replaced');
            wake();
        });
        document.addEventListener('thelo:lesson-ready', (e) => {
            if (started) return;
            started = true;
            runLesson(e.detail || {}, { getStage: () => stage, isComplete: () => complete, waitFor });
        });
    }

    async function runLesson(detail, live) {
        const lang = knownLang(detail.lang), W = words(lang);
        const mobile = !!detail.mobile;
        const touch = mobile || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
        const uid = activeUid();
        const api = window.theloLessonApi || {};
        const fallback = {
            en: { start: 'Go', check: 'Check', next: 'Next', nextStage: 'Next Stage', hint: 'Hint', guide: 'Step by step' },
            hy: { start: 'Գնալ', check: 'Ստուգել', next: 'Հաջորդը', nextStage: 'Հաջորդ փուլ', hint: 'Հուշում', guide: 'Քայլ առ քայլ' },
            ru: { start: 'Начать', check: 'Проверить', next: 'Дальше', nextStage: 'Следующий шаг', hint: 'Подсказка', guide: 'Шаг за шагом' },
        }[lang];
        let labels = fallback;
        try { labels = Object.assign({}, fallback, api.labels ? api.labels() : {}); } catch (e) { /* keep the fallback */ }
        const say = (key) => fmt(W[key], labels);
        const stageAtLeast = (i) => live.waitFor(() => live.getStage() >= i || live.isComplete());
        const untilStage = (i) => (done) => { let alive = true; stageAtLeast(i).then(() => { if (alive) done(); }); return () => { alive = false; }; };
        const quit = async () => { await skipped(lang, uid); };
        const coach = async (opts, i) => {
            const r = await show(lang, Object.assign({ mode: 'coach', next: W.gotIt, place: 'bottom-left', until: untilStage(i) }, opts));
            if (r === 'skip') return false;
            await stageAtLeast(i);
            return true;
        };
        const modal = async (opts) => (await show(lang, Object.assign({ next: W.next }, opts))) !== 'skip';
        const visible = (id) => { const el = document.getElementById(id); return el && el.offsetParent !== null ? el : null; };

        // 1. "tap anywhere to start"
        if (live.getStage() < 0) {
            const startTip = mobile ? { text: W.lStart, place: 'top' }
                                    : { text: say('lStartDesk'), target: () => visible('nextCheckBtn'), place: 'auto' };
            if (!await coach(Object.assign({ next: null }, startTip), 0)) return quit();
        }
        await sleep(1200);
        if (live.isComplete()) return;

        // 2. how a lesson screen works
        const board = document.getElementById('boardWrap') || document.getElementById('lessonArea');
        const headline = () => {
            if (!board) return null;
            const b = board.getBoundingClientRect();
            return { left: b.left + 8, top: b.top + 6, width: b.width - 16, height: Math.min(b.height * 0.36, 160) };
        };
        if (!await modal({ text: W.lHeadline, target: headline, pad: 4 })) return quit();
        const bar = document.getElementById('stageProgressBarContainer');
        if (bar && bar.classList.contains('visible') && !await modal({ text: W.lProgress, target: bar })) return quit();
        if (mobile) {
            if (!await modal({ text: W.lFab, target: () => document.getElementById('mobileMenuFab') })) return quit();
            if (api.openMenu) {
                api.openMenu();
                await sleep(300);
                const ok = await modal({ text: W.lMenu, target: () => document.getElementById('mobileMenu') });
                if (api.closeMenu) api.closeMenu();
                if (!ok) return quit();
            }
        } else {
            for (const [id, text] of [['nextCheckBtn', W.lBtnNext], ['clearBtn', W.lBtnClear], ['prevBtn', W.lBtnPrev],
                                      ['thelobookBtn', W.lBtnBook], ['openCalculatorBtn', W.lBtnCalc]]) {
                const el = visible(id);
                if (el && !await modal({ text, target: el, pad: 6 })) return quit();
            }
        }
        if (touch && !await modal({ text: W.lGesture, fingers: true, place: 'center' })) return quit();

        // 3. through the lesson together
        if (!await coach({ text: say(mobile ? 'lGoNextMobile' : 'lGoNextDesk') }, 1)) return quit();
        if (!await coach({ text: W.lBoard2 }, 2)) return quit();
        if (!await coach({ text: say(mobile ? 'lMcqMobile' : 'lMcqDesk'), target: () => visible('mcqOptionsContainer'), place: 'auto' }, 3)) return quit();
        await live.waitFor(() => live.isComplete() || live.getStage() >= 3);
        if (!live.isComplete()) {
            const r = await show(lang, { mode: 'coach', next: W.gotIt, place: 'bottom-left', text: say(mobile ? 'lWriteMobile' : 'lWriteDesk'),
                until: (done) => { let alive = true; live.waitFor(() => live.isComplete()).then(() => { if (alive) done(); }); return () => { alive = false; }; } });
            if (r === 'skip') return quit();
        }
        // The lesson takes the student home by itself; thelo:lesson-complete moved the record to "after".
    }

    // ------------------------------------------------------------------ boot
    const params = new URLSearchParams(location.search);
    if (params.get('tutorial') === '1' && /lesson|learn/i.test(location.pathname + location.search)) setupLesson();
    if (document.getElementById('screen-capture') || /scan/i.test(location.pathname)) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupScan);
        else setupScan();
    }

    window.TheloTutorial = {
        getState, setState, runHome,
        reset(uid) { setState(uid, { status: 'running', phase: 'intro' }); },
        isFinished(uid) { const s = getState(uid); return !!(s && (s.status === 'done' || s.status === 'skipped')); },
        lessonFile(grade, lang) {
            const g = Math.min(12, Math.max(5, Number(grade) || 7));
            if (lang === 'en' || lang === 'ru') return `TUTORIAL-${lang.toUpperCase()}/${lang}-tut-${g}.json`;
            return `TUTORIAL-HY/tut-${g}.json`;
        },
    };
})();
