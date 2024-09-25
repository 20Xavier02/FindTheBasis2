document.addEventListener('DOMContentLoaded', (event) => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Function to adjust the size of the grid based on screen size
    function adjustGridSize() {
        const maxGridSize = 600;  // Original grid size
        const screenWidth = window.innerWidth;

        // If the screen width is smaller than the grid size, scale it down
        if (screenWidth < maxGridSize) {
            const newSize = screenWidth * 0.9;  // 90% of screen width
            canvas.style.width = `${newSize}px`;
            canvas.style.height = `${newSize}px`;
        } else {
            canvas.style.width = `${maxGridSize}px`;
            canvas.style.height = `${maxGridSize}px`;
        }
        resizeCanvas();  // Adjust canvas drawing area accordingly
    }

    function resizeCanvas() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    window.addEventListener('resize', adjustGridSize);
    adjustGridSize();

    const origin = { x: canvas.width / 2, y: canvas.height / 2 };
    const width = canvas.width;
    const height = canvas.height;

    const initialUnitVectorX = { x: 50, y: 0 };
    const initialUnitVectorY = { x: 0, y: -50 };
    let unitVectorX = { ...initialUnitVectorX };
    let unitVectorY = { ...initialUnitVectorY };

    let dragging = null;
    let moveCounter = 0;
    let gameWon = false;
    let gameStarted = false;
    let timer = null;
    let elapsedTime = 0;
    let isPaused = false;

    // Game logic and functions remain the same...

    function draw() {
        drawGrid();
        drawAxes();
        drawArrow(origin, { x: origin.x + initialUnitVectorX.x, y: origin.y + initialUnitVectorX.y }, 'black', 'i');
        drawArrow(origin, { x: origin.x + initialUnitVectorY.x, y: origin.y + initialUnitVectorY.y }, 'black', 'j');

        const labelIX = (unitVectorX.x !== initialUnitVectorX.x || unitVectorX.y !== initialUnitVectorX.y) ? "i'" : '';
        const labelJY = (unitVectorY.x !== initialUnitVectorY.x || unitVectorY.y !== initialUnitVectorY.y) ? "j'" : '';
        drawArrow(origin, { x: origin.x + unitVectorX.x, y: origin.y + unitVectorX.y }, 'green', labelIX);
        drawArrow(origin, { x: origin.x + unitVectorY.x, y: origin.y + unitVectorY.y }, 'green', labelJY);
        drawPoints();
    }

    // Handle touch events for mobile devices
    function handleTouchStart(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.touches[0].clientX - rect.left;
        const y = event.touches[0].clientY - rect.top;
        const clickPoint = { x: x, y: y };

        if (isOnVector(clickPoint, unitVectorX)) {
            dragging = 'unitVectorX';
        } else if (isOnVector(clickPoint, unitVectorY)) {
            dragging = 'unitVectorY';
        }
    }

    function handleTouchMove(event) {
        if (dragging && !isPaused) {
            const rect = canvas.getBoundingClientRect();
            const x = event.touches[0].clientX - rect.left;
            const y = event.touches[0].clientY - rect.top;
            const gridPoint = canvasToGrid({ x, y });

            const snappedX = Math.round(gridPoint.x) * 50;
            const snappedY = Math.round(gridPoint.y) * -50;

            if (dragging === 'unitVectorX') {
                unitVectorX = { x: snappedX, y: snappedY };
            } else if (dragging === 'unitVectorY') {
                unitVectorY = { x: snappedX, y: snappedY };
            }

            draw();
        }
    }

    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', () => {
        dragging = null;
    });

    // Mouse events for desktops remain unchanged
    canvas.addEventListener('mousedown', (event) => {
        if (gameWon || isPaused) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const clickPoint = { x: x, y: y };

        if (isOnVector(clickPoint, unitVectorX)) {
            dragging = 'unitVectorX';
        } else if (isOnVector(clickPoint, unitVectorY)) {
            dragging = 'unitVectorY';
        }
    });

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', () => {
        dragging = null;
    });

    // Initialize game properly
    function initializeGame() {
        isPaused = false;
        gameWon = false;
        gameStarted = false;
        moveCounter = 0;
        elapsedTime = 0;
        document.getElementById('moveCounter').innerText = '0';
        document.getElementById('timer').innerText = 'Timer: 0 seconds';
        document.getElementById('winMessage').innerText = '';
        drawGrid();
        draw();
    }

    // Start the game when "Go" button is clicked
    document.getElementById('goButton').addEventListener('click', () => {
        if (!gameStarted) {
            startTimer();
            gameStarted = true;
        }
    });

    initializeGame();
});
