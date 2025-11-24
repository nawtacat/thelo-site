// Define the Controller object that the main Thelo app looks for
window.GraphController = {
    calculator: null,
    tutorSteps: [],
    currentStepIndex: 0,
    rootElement: null,
    styleElement: null,

    // The narration text from your original file
    stepNarration: [
        "👋 Welcome! We'll solve the system. Press Next to start.",
        "✍️ Step 1: We've entered the first equation, **0.5x + y = 1** (The red line).",
        "✍️ Step 2: Now we've added the second equation, **-2x - y = 5**. The solution is where they meet.",
        "🔎 Step 3: We've zoomed in to focus on the exact intersection point.",
        "💡 Step 4: The intersection is **(-4, 3)**. This is our (x, y) solution.",
        "✅ Step 5: We calculate **x + y = -4 + 3 = -1**. The answer is B."
    ],

    /**
     * 1. INIT: Called by the main app when the stage loads.
     * @param {HTMLElement} root - The <div id="dynamicGraphRoot"> from the main app
     * @param {Object} stageData - The JSON data for the current stage
     */
    init: async function(root, stageData) {
        this.rootElement = root;
        this.tutorSteps = [];
        this.currentStepIndex = 0;

        // A. Ensure Desmos API is loaded
        if (typeof Desmos === 'undefined') {
            await this._loadDesmosLib();
        }

        // B. Inject Styles
        this._injectStyles();

        // C. Build the UI (Calculator + Controls)
        root.innerHTML = `
            <div id="embed-container">
                <div id="desmos-calculator"></div>
                <div id="desmos-controls">
                    <button id="desmos-prevBtn" disabled>◀️ Previous</button>
                    <div id="desmos-status">Status: Initializing...</div>
                    <button id="desmos-nextBtn" disabled>Next ▶️</button>
                </div>
            </div>
        `;

        // D. Bind UI Button Clicks
        root.querySelector('#desmos-prevBtn').onclick = () => this.goToStep(-1);
        root.querySelector('#desmos-nextBtn').onclick = () => this.goToStep(1);

        // E. Initialize Desmos Calculator
        const elt = root.querySelector('#desmos-calculator');
        this.calculator = Desmos.GraphingCalculator(elt, {
            keypad: true, 
            expressions: true, 
            settingsMenu: true,
            // Remove branding if you have a paid API key, otherwise keep it
            lockViewport: false
        });

        // F. Build the lesson states
        await this._buildTutorStates();
    },

    /**
     * 2. HANDLE INPUT: Called by the main app on KeyDown
     */
    handleInput: function(key) {
        if (key === 'ArrowLeft') this.goToStep(-1);
        if (key === 'ArrowRight') this.goToStep(1);
    },

    /**
     * 3. DESTROY: Cleanup when leaving the stage
     */
    destroy: function() {
        if (this.calculator) {
            this.calculator.destroy();
            this.calculator = null;
        }
        if (this.styleElement) {
            this.styleElement.remove();
        }
        this.rootElement.innerHTML = '';
        this.tutorSteps = [];
    },

    // --- INTERNAL LOGIC ---

    goToStep: function(direction) {
        const newIndex = this.currentStepIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.tutorSteps.length) {
            this.currentStepIndex = newIndex;
            this.loadState(this.currentStepIndex);
            this.updateButtonState();
        }
    },

    loadState: function(index) {
        if (this.calculator && this.tutorSteps[index]) {
            this.calculator.setState(this.tutorSteps[index]);
            this._updateStatus(this.stepNarration[index]);
        }
    },

    updateButtonState: function() {
        const prevBtn = this.rootElement.querySelector('#desmos-prevBtn');
        const nextBtn = this.rootElement.querySelector('#desmos-nextBtn');
        
        if(prevBtn) prevBtn.disabled = (this.currentStepIndex === 0);
        if(nextBtn) nextBtn.disabled = (this.currentStepIndex === this.tutorSteps.length - 1);
    },

    _updateStatus: function(text) {
        const el = this.rootElement.querySelector('#desmos-status');
        if(el) el.innerHTML = text; // innerHTML allows bold tags
    },

    // --- STATE BUILDER (Ported from your script) ---
    _buildTutorStates: async function() {
        this._updateStatus("Building lesson states...");
        const c = this.calculator;

        // 0. Initial State
        c.setBlank();
        c.setMathBounds({ left: -10, right: 10, bottom: -10, top: 10 });
        this.tutorSteps.push(c.getState());

        // 1. Equation 1
        c.setExpression({ id: 'eq1', latex: '0.5x + y = 1', color: Desmos.Colors.RED });
        this.tutorSteps.push(c.getState());

        // 2. Equation 2
        c.setExpression({ id: 'eq2', latex: '-2x - y = 5', color: Desmos.Colors.BLUE });
        this.tutorSteps.push(c.getState());

        // 3. Zoom/Pan
        const targetX = -4;
        const targetY = 3;
        // Get current bounds to calculate width/height for centering
        const bounds = c.graphpaperBounds.mathCoordinates; 
        const width = bounds.right - bounds.left;
        const height = bounds.top - bounds.bottom;
        
        // Note: In a headless script run, mathCoordinates might be undefined if the graph hasn't rendered.
        // We use fallbacks just in case.
        const w = width || 20; 
        const h = height || 20;

        c.setMathBounds({
            left: targetX - (w / 4), // Zoomed in (dividing width by 2 effectively zooms 2x)
            right: targetX + (w / 4),
            bottom: targetY - (h / 4),
            top: targetY + (h / 4)
        });
        this.tutorSteps.push(c.getState());

        // 4. Marking Solution
        c.setExpression({ id: 'sol', latex: '(-4, 3)', color: Desmos.Colors.BLACK, label: "Solution (x, y)", showLabel: true });
        this.tutorSteps.push(c.getState());

        // 5. Final Calculation
        c.setExpression({ id: 'calc', latex: 'x + y = -4 + 3', color: Desmos.Colors.GREEN });
        c.setExpression({ id: 'ans', latex: '=-1', color: Desmos.Colors.GREEN });
        this.tutorSteps.push(c.getState());

        // Finish
        this.loadState(0);
        this.updateButtonState();
    },

    // --- HELPER: Load Desmos API Dynamically ---
    _loadDesmosLib: function() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            // Use the API key from your original file
            script.src = 'https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6';
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    // --- HELPER: Inject CSS ---
    _injectStyles: function() {
        const css = `
            #embed-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%;
                height: 100%;
                font-family: 'Segoe UI', sans-serif;
            }
            #desmos-calculator {
                flex-grow: 1;
                width: 100%;
                border: 1px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                margin-bottom: 15px;
            }
            #desmos-controls {
                display: flex;
                gap: 15px;
                align-items: center;
                padding: 5px;
                width: 100%;
                justify-content: center;
            }
            #desmos-controls button {
                padding: 10px 20px;
                font-size: 14px;
                font-weight: 600;
                background-color: #2563eb; /* Used Thelo Blue */
                color: white;
                border: none;
                border-radius: 50px;
                cursor: pointer;
                transition: background 0.2s;
                white-space: nowrap;
            }
            #desmos-controls button:hover:not(:disabled) {
                background-color: #1d4ed8;
            }
            #desmos-controls button:disabled {
                background-color: #cccccc;
                cursor: not-allowed;
            }
            #desmos-status {
                font-size: 1rem;
                color: #333;
                font-weight: 500;
                min-width: 250px;
                text-align: center;
                padding: 8px 15px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background-color: white;
            }
        `;
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }
};
