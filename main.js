document.addEventListener('DOMContentLoaded', (event) => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Adjust canvas size dynamically
    function resizeCanvas() {
        const maxGridSize = 600;  // Max grid size for larger screens
        const screenWidth = window.innerWidth;

        if (screenWidth < maxGridSize) {
            const newSize = screenWidth * 0.9;  // Scale to 90% of screen width for smaller devices
            canvas.style.width = `${newSize}px`;
            canvas.style.height = `${newSize}px`;
        } else {
            canvas.style.width = `${maxGridSize}px`;
            canvas.style.height = `${maxGridSize}px`;
        }

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const origin = { x: canvas.width / 2, y: canvas.height / 2 };
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

    // Drawing and game logic remain the same...

    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'lightgray';
        for (let i = -canvas.width / 2; i <= canvas.width / 2; i += 50) {
            ctx.beginPath();
            ctx.moveTo(origin.x + i, 0);
            ctx.lineTo(origin.x + i, canvas.height);
            ctx.stroke();
        }
        for (let j = -canvas.height / 2; j <= canvas.height / 2; j += 50) {
            ctx.beginPath();
            ctx.moveTo(0, origin.y - j);
            ctx.lineTo(canvas.width, origin.y - j);
            ctx.stroke();
        }
    }

    function drawAxes() {
        ctx.beginPath();
        ctx.moveTo(0, origin.y);
        ctx.lineTo(canvas.width, origin.y);
        ctx.strokeStyle = 'black';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(origin.x, 0);
        ctx.lineTo(origin.x, canvas.height);
        ctx.strokeStyle = 'black';
        ctx.stroke();

        ctx.font = '12px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText('X', canvas.width - 10, origin.y - 10);
        ctx.fillText('Y', origin.x + 10, 10);
    }

    function drawArrow(start, end, color, label = '') {
        const headLength = 10;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const angle = Math.atan2(dy, dx);

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fill();

        if (label) {
            ctx.font = '12px Arial';
            ctx.fillStyle = color;
            ctx.fillText(label, end.x + 5, end.y - 5);
        }
    }

    function drawPoints() {
        let redCanvasPoint = gridToCanvas(redPoint);
        ctx.beginPath();
        ctx.arc(redCanvasPoint.x, redCanvasPoint.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();

        let blueCanvasPoint = gridToCanvas(bluePoint);
        ctx.beginPath();
        ctx.arc(blueCanvasPoint.x, blueCanvasPoint.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'blue';
        ctx.fill();

        drawArrow(origin, blueCanvasPoint, 'blue');
    }

    function initializeGame() {
        moveCounter = 0;
        gameWon = false;
        gameStarted = false;
        document.getElementById('moveCounter').innerText = '0';
        drawGrid();
        drawAxes();
        drawPoints();
    }

    // Touch events for mobile devices
    function handleTouchStart(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.touches[0].clientX - rect.left;
        const y = event.touches[0].clientY - rect.top;
        const clickPoint = { x, y };

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

    // Mouse events for desktop
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

    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', () => { dragging = null; });

    // Initialize game
    initializeGame();
});

