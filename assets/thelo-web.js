/* ===========================================================================
   Thelo — desktop layer, script half.

   Loaded at the end of every ported page. Companion to thelo-web.css.

   Design rule, same as the iOS port: the pages under /sdashboard/, /learn/ and
   /scan/ are produced from the Android assets by tools/port-from-app.sh and are
   never hand-edited. Anything the web needs on top lives here.

   Deliberately small. The heavy lifting — mouse drawing, the desktop capture
   canvas, answer checking — is already in the app; it was only ever gated behind
   the phone build's hardcoded isMobileMode, which the port script rewrites.
   =========================================================================== */
(function () {
    'use strict';

    var isDesktop = window.matchMedia('(pointer: fine)').matches && window.innerWidth >= 900;
    var page = document.body ? (document.body.getAttribute('data-thelo-page') || '') : '';

    /* Identify the page for CSS and for the hint below. */
    var path = window.location.pathname;
    if (!page) {
        if (path.indexOf('/learn') === 0) page = 'lesson';
        else if (path.indexOf('/scan') === 0) page = 'scan';
        else page = 'dashboard';
    }
    document.documentElement.setAttribute('data-thelo-page', page);
    document.documentElement.setAttribute('data-thelo-pointer', isDesktop ? 'fine' : 'coarse');

    if (!isDesktop) return;   // phones get the app exactly as it ships

    /* --- 1. Title ---------------------------------------------------------
       The app pages are all called "thelo", which is fine in a task switcher on
       a phone and useless across a dozen browser tabs. */
    var titles = {
        lesson:    'Lesson · Thelo',
        scan:      'Scan a problem · Thelo',
        dashboard: 'My lessons · Thelo'
    };
    if (titles[page] && (document.title === 'thelo' || !document.title)) {
        document.title = titles[page];
    }

    /* --- 2. Scan wording --------------------------------------------------
       On a phone the button means "open the camera". On a desktop the same
       control opens a file picker, so the instruction has to change or it reads
       as broken to a student with no webcam pointed at their homework. */
    if (page === 'scan') {
        document.addEventListener('DOMContentLoaded', function () {
            var swaps = [
                ['Take a photo', 'Choose an image'],
                ['Take Photo', 'Choose Image'],
                ['Նկարել', 'Ընտրել նկար']
            ];
            var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
            var node;
            while ((node = walker.nextNode())) {
                for (var i = 0; i < swaps.length; i++) {
                    if (node.nodeValue.indexOf(swaps[i][0]) !== -1) {
                        node.nodeValue = node.nodeValue.replace(swaps[i][0], swaps[i][1]);
                    }
                }
            }
        });
    }

    /* --- 3. First-run hint for mouse drawing ------------------------------
       Writing maths with a mouse is not obvious, and the whole reason this page
       exists on the web is that students turned out to be fine with it. One
       gentle nudge the first time, then never again. */
    if (page === 'lesson') {
        var STORAGE_KEY = 'thelo.web.mouseHintSeen';
        var alreadySeen = false;
        try { alreadySeen = window.localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { alreadySeen = true; }

        if (!alreadySeen) {
            document.addEventListener('DOMContentLoaded', function () {
                var hint = document.createElement('div');
                hint.id = 'thelo-mouse-hint';

                var label = document.createElement('span');
                label.textContent = 'Hold the left mouse button to write on the board.';

                var dismiss = document.createElement('button');
                dismiss.type = 'button';
                dismiss.textContent = 'Got it';

                hint.appendChild(label);
                hint.appendChild(dismiss);
                document.body.appendChild(hint);

                var hide = function () {
                    hint.classList.remove('visible');
                    try { window.localStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* private mode */ }
                    setTimeout(function () {
                        if (hint.parentNode) hint.parentNode.removeChild(hint);
                    }, 400);
                };

                dismiss.addEventListener('click', hide);
                // Drawing anything is itself proof the student worked it out.
                var board = document.getElementById('board');
                if (board) board.addEventListener('mousedown', hide, { once: true });

                setTimeout(function () { hint.classList.add('visible'); }, 900);
                setTimeout(hide, 12000);
            });
        }
    }

    /* --- 4. Keep the layout honest when the window is resized -------------
       The app decides its pointer mode once at boot. Dragging a window between a
       laptop screen and a monitor, or opening dev tools, can cross the 900px
       line and leave the board wired for the wrong input. Rather than try to
       re-init a page that was never designed to switch, reload — cheap, and the
       lesson resumes at the same stage from the URL. */
    var wasDesktop = isDesktop;
    var resizeTimer = null;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            var nowDesktop = window.matchMedia('(pointer: fine)').matches && window.innerWidth >= 900;
            if (nowDesktop !== wasDesktop) {
                wasDesktop = nowDesktop;
                window.location.reload();
            }
        }, 400);
    });
})();
