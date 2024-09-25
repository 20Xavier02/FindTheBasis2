document.addEventListener('DOMContentLoaded', (event) => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const newSize = Math.min(screenWidth * 0.9, screenHeight * 0.8);

        // Set canvas size dynamically based on screen size
        canvas.style.width = `${newSize}px`;
        canvas.style.height = `${newSize}px`;

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    // Call resize function when the window is resized
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const origin = { x: canvas.width / 2, y: canvas.height / 2 };
    const gridSpacing = canvas.width / 10;  // Dynamically calculate spacing for grid
    const initialUnitVectorX = { x: gridSpacing, y: 0 };
    const initialUnitVectorY = { x: 0, y: -gridSpacing };
    let unitVectorX = { ...initialUnitVectorX };
    let unitVectorY = { ...initialUnitVectorY };

    let dragging = null;
    let moveCounter = 0;
    let gameWon = false;
    let gameStarted = false;
    let timer = null;
    let elapsedTime = 0;
    let isPaused = false;

    // Utility to convert grid coordinates to canvas coordinates
    function gridToCanvas(point) {
        return { x: origin.x + point.x * gridSpacing, y: origin.y - point.y * gridSpacing };
    }

    // Utility to convert canvas coordinates to grid coordinates
    function canvasToGrid(point) {
        return { x: Math.round((point.x - origin.x) / gridSpacing), y: Math.round((origin.y - point.y) / gridSpacing) };
    }

    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'lightgray';
        ctx.lineWidth = 1;

        // Draw vertical grid lines
        for (let i = 0; i <= canvas.width; i += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }

        // Draw horizontal grid lines
        for (let j = 0; j <= canvas.height; j += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, j);
            ctx.lineTo(canvas.width, j);
            ctx.stroke();
        }
    }

    function drawAxes() {
        ctx.beginPath();
        ctx.moveTo(0, origin.y);  // Draw x-axis
        ctx.lineTo(canvas.width, origin.y);
        ctx.strokeStyle = 'black';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(origin.x, 0);  // Draw y-axis
        ctx.lineTo(origin.x, canvas.height);
        ctx.strokeStyle = 'black';
        ctx.stroke();
    }

    // Function to draw arrows (vectors)
    function drawArrow(start, end, color, label = '') {
        const headLength = 7;
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
            ctx.font = '10px Arial';
            ctx.fillStyle = color;
            ctx.fillText(label, end.x + 5, end.y - 5);
        }
    }

    // Draw standard basis vectors and draggable green vectors
    function drawBasisVectors() {
        // Standard black basis vectors
        drawArrow(origin, { x: origin.x + initialUnitVectorX.x, y: origin.y + initialUnitVectorX.y }, 'black', 'i');
        drawArrow(origin, { x: origin.x + initialUnitVectorY.x, y: origin.y + initialUnitVectorY.y }, 'black', 'j');

        // Draggable green basis vectors
        drawArrow(origin, { x: origin.x + unitVectorX.x, y: origin.y + unitVectorX.y }, 'green', "i'");
        drawArrow(origin, { x: origin.x + unitVectorY.x, y: origin.y + unitVectorY.y }, 'green', "j'");
    }

    function drawPoints() {
        const redCanvasPoint = gridToCanvas({ x: 3, y: 2 });  // Example red point
        ctx.beginPath();
        ctx.arc(redCanvasPoint.x, redCanvasPoint.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();

        const blueCanvasPoint = gridToCanvas({ x: -2, y: -1 });  // Example blue point
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
        drawBasisVectors();
        drawPoints();
    }

    // Handle mouse and touch dragging for green vectors
    function handleDragging(event) {
        if (dragging && !isPaused) {
            const rect = canvas.getBoundingClientRect();
            const x = event.touches ? event.touches[0].clientX - rect.left : event.clientX - rect.left;
            const y = event.touches ? event.touches[0].clientY - rect.top : event.clientY - rect.top;
            const gridPoint = canvasToGrid({ x, y });

            const snappedX = Math.round(gridPoint.x) * gridSpacing;
            const snappedY = Math.round(gridPoint.y) * -gridSpacing;

            if (dragging === 'unitVectorX') {
                unitVectorX = { x: snappedX, y: snappedY };
            } else if (dragging === 'unitVectorY') {
                unitVectorY = { x: snappedX, y: snappedY };
            }

            draw();
        }
    }

    // Detect if a click/tap is on the vector
    function isOnVector(point, vector) {
        const vectorPoint = { x: origin.x + vector.x, y: origin.y + vector.y };
        const distance = Math.sqrt((point.x - vectorPoint.x) ** 2 + (point.y - vectorPoint.y) ** 2);
        return distance < 10;
    }

    // Mouse and touch events for dragging
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

    canvas.addEventListener('touchstart', (event) => {
        if (gameWon || isPaused) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.touches[0].clientX - rect.left;
        const y = event.touches[0].clientY - rect.top;
        const clickPoint = { x: x, y: y };

        if (isOnVector(clickPoint, unitVectorX)) {
            dragging = 'unitVectorX';
        } else if (isOnVector(clickPoint, unitVectorY)) {
            dragging = 'unitVectorY';
        }
    });

    canvas.addEventListener('mousemove', handleDragging);
    canvas.addEventListener('touchmove', handleDragging);

    canvas.addEventListener('mouseup', () => { dragging = null; });
    canvas.addEventListener('touchend', () => { dragging = null; });

    // Initialize the game
    initializeGame();
});
