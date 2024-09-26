document.addEventListener('DOMContentLoaded', (event) => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

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

    function gridToCanvas(point) {
        return { x: origin.x + point.x * 50, y: origin.y - point.y * 50 };
    }

    function canvasToGrid(point) {
        return { x: Math.round((point.x - origin.x) / 50), y: Math.round((origin.y - point.y) / 50) };
    }

    function drawGrid() {
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = 'lightgray';
        for (let i = -width / 2; i <= width / 2; i += 50) {
            ctx.beginPath();
            ctx.moveTo(origin.x + i, 0);
            ctx.lineTo(origin.x + i, height);
            ctx.stroke();
            ctx.closePath();
        }
        for (let j = -height / 2; j <= height / 2; j += 50) {
            ctx.beginPath();
            ctx.moveTo(0, origin.y - j);
            ctx.lineTo(width, origin.y - j);
            ctx.stroke();
            ctx.closePath();
        }
    }

    function drawAxes() {
        ctx.beginPath();
        ctx.moveTo(0, origin.y);
        ctx.lineTo(width, origin.y);
        ctx.strokeStyle = 'black';
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.moveTo(origin.x, 0);
        ctx.lineTo(origin.x, height);
        ctx.strokeStyle = 'black';
        ctx.stroke();
        ctx.closePath();

        ctx.font = '12px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText('X', width - 10, origin.y - 10);
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
        ctx.closePath();

        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
        ctx.lineTo(end.x, end.y);
        ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.closePath();

        if (label) {
            ctx.font = '12px Arial';
            ctx.fillStyle = color;
            ctx.fillText(label, end.x + 5, end.y - 5);
        }
    }

    function drawPoints() {
        let redCanvasPoint = gridToCanvas({ x: 3, y: 2 });
        ctx.beginPath();
        ctx.arc(redCanvasPoint.x, redCanvasPoint.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();

        let blueCanvasPoint = gridToCanvas({ x: -2, y: -1 });
        ctx.beginPath();
        ctx.arc(blueCanvasPoint.x, blueCanvasPoint.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'blue';
        ctx.fill();
        ctx.closePath();

        drawArrow(origin, blueCanvasPoint, 'blue', '');
    }

    function drawTransformedVector() {
        const A = [
            [(unitVectorX.x / 50), (unitVectorY.x / 50)],
            [(-unitVectorX.y / 50), (-unitVectorY.y / 50)]
        ];

        const transformedBluePoint = {
            x: (A[0][0] * -2) + (A[0][1] * -1),
            y: (A[1][0] * -2) + (A[1][1] * -1)
        };

        const transformedBlueCanvasPoint = gridToCanvas(transformedBluePoint);
        ctx.beginPath();
        ctx.arc(transformedBlueCanvasPoint.x, transformedBlueCanvasPoint.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'lightblue';
        ctx.fill();
        ctx.closePath();

        drawArrow(origin, transformedBlueCanvasPoint, 'lightblue');

        if (Math.round(transformedBluePoint.x) === 3 && Math.round(transformedBluePoint.y) === 2) {
            gameWon = true;
            stopTimer();
            document.getElementById('winMessage').innerText = `Congratulations! You won in ${moveCounter} moves and ${elapsedTime} seconds!`;
            disableButtonsAfterWin();
        }
    }

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

    // Dragging functionality for green vectors on both computers and phones
    function handleDragging(event) {
        if (dragging && !isPaused) {
            const rect = canvas.getBoundingClientRect();
            const x = event.touches ? event.touches[0].clientX - rect.left : event.clientX - rect.left;
            const y = event.touches ? event.touches[0].clientY - rect.top : event.clientY - rect.top;
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

    function isOnVector(point, vector) {
        const vectorPoint = { x: origin.x + vector.x, y: origin.y + vector.y };
        const distance = Math.sqrt((point.x - vectorPoint.x) ** 2 + (point.y - vectorPoint.y) ** 2);
        return distance < 10;
    }

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

    // Timer functionality
    function startTimer() {
        if (!timer) {
            timer = setInterval(() => {
                elapsedTime += 1;
                document.getElementById('timer').innerText = `Timer: ${elapsedTime} seconds`;
            }, 1000);
        }
    }

    function stopTimer() {
        clearInterval(timer);
        timer = null;
    }

    function togglePause() {
        if (gameWon) return;

        if (isPaused) {
            isPaused = false;
            document.getElementById('pauseButton').innerText = 'Pause';
            startTimer();
            draw();
        } else {
            isPaused = true;
            document.getElementById('pauseButton').innerText = 'Resume';
            stopTimer();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawGrid();
            drawAxes();
        }
    }

    // Button functionality for Go, Reset, and Pause
    document.getElementById('goButton').addEventListener('click', () => {
        if (gameWon) return;
        if (!gameStarted) {
            gameStarted = true;
            draw();
            startTimer();
        }
        moveCounter += 1;
        document.getElementById('moveCounter').innerText = `${moveCounter}`;
        drawTransformedVector();
    });

    document.getElementById('resetButton').addEventListener('click', () => {
        unitVectorX = { ...initialUnitVectorX };
        unitVectorY = { ...initialUnitVectorY };
        moveCounter = 0;
        gameWon = false;
        gameStarted = false;
        elapsedTime = 0;
        document.getElementById('goButton').disabled = false;
        document.getElementById('moveCounter').innerText = `${moveCounter}`;
        document.getElementById('winMessage').innerText = '';
        document.getElementById('timer').innerText = `Timer: ${elapsedTime} seconds`;

        if (isPaused) {
            togglePause();
        }
        draw();
        startTimer();
    });

    document.getElementById('pauseButton').addEventListener('click', () => {
        if (!gameWon) {
            togglePause();
        }
    });

    // Start the game with the grid and vectors shown, timer running
    drawGrid();
    draw();
    startTimer();
});

