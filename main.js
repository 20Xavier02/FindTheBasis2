document.addEventListener('DOMContentLoaded', (event) => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        const screenSize = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8);
        canvas.style.width = `${screenSize}px`;
        canvas.style.height = `${screenSize}px`;

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const origin = { x: canvas.width / 2, y: canvas.height / 2 };
    const gridSpacing = canvas.width / 12;  // Dynamically calculate for a 6x6 grid
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
    let solveClicked = false;

    // Prevent scrolling on mobile devices
    document.body.style.overflow = 'hidden';
    
    // Random point generation with restrictions
    function getRandomPoint() {
        const min = -3;
        const max = 3;
        let x, y;

        do {
            x = Math.floor(Math.random() * (max - min + 1)) + min;
            y = Math.floor(Math.random() * (max - min + 1)) + min;
        } while ((x === 1 && y === 0) || (x === 0 && y === 1) || (x === 0 && y === 0));

        return { x: x, y: y };
    }

    let bluePoint = getRandomPoint();
    let redPoint = getRandomPoint();

    function gridToCanvas(point) {
        return { x: origin.x + point.x * gridSpacing, y: origin.y - point.y * gridSpacing };
    }

    function canvasToGrid(point) {
        return { x: Math.round((point.x - origin.x) / gridSpacing), y: Math.round((origin.y - point.y) / gridSpacing) };
    }

    // Draw grid
    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'lightgray';

        for (let i = -canvas.width / 2; i <= canvas.width / 2; i += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(origin.x + i, 0);
            ctx.lineTo(origin.x + i, canvas.height);
            ctx.stroke();
        }

        for (let j = -canvas.height / 2; j <= canvas.height / 2; j += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, origin.y - j);
            ctx.lineTo(canvas.width, origin.y - j);
            ctx.stroke();
        }
    }

    // Draw axes
    function drawAxes() {
        ctx.beginPath();
        ctx.moveTo(0, origin.y);  // X-axis
        ctx.lineTo(canvas.width, origin.y);
        ctx.strokeStyle = 'black';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(origin.x, 0);  // Y-axis
        ctx.lineTo(origin.x, canvas.height);
        ctx.strokeStyle = 'black';
        ctx.stroke();
    }

    // Draw arrows (vectors)
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

        drawArrow(origin, blueCanvasPoint, 'blue', '');
    }

    function drawTransformedVector() {
        const A = [
            [(unitVectorX.x / gridSpacing), (unitVectorY.x / gridSpacing)],
            [(-unitVectorX.y / gridSpacing), (-unitVectorY.y / gridSpacing)]
        ];

        const transformedBluePoint = {
            x: (A[0][0] * bluePoint.x) + (A[0][1] * bluePoint.y),
            y: (A[1][0] * bluePoint.x) + (A[1][1] * bluePoint.y)
        };

        const transformedBlueCanvasPoint = gridToCanvas(transformedBluePoint);
        ctx.beginPath();
        ctx.arc(transformedBlueCanvasPoint.x, transformedBlueCanvasPoint.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'lightblue';
        ctx.fill();

        drawArrow(origin, transformedBlueCanvasPoint, 'lightblue');

        if (Math.round(transformedBluePoint.x) === redPoint.x && Math.round(transformedBluePoint.y) === redPoint.y) {
            gameWon = true;
            stopTimer();
            document.getElementById('winMessage').innerText = `Congratulations! You won in ${moveCounter} moves and ${elapsedTime} seconds!`;
            disableButtonsAfterWin();
        }
    }

    // Draw function
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

    // Dragging functionality for computers and phones
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

    // Solve functionality
    document.getElementById('solveButton').addEventListener('click', () => {
        solveClicked = !solveClicked;
        if (solveClicked) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const solutionText = `
                Solution:
                \\[
                A = 
                \\begin{bmatrix}
                ${unitVectorX.x / gridSpacing} & ${unitVectorY.x / gridSpacing} \\\\
                ${-unitVectorX.y / gridSpacing} & ${-unitVectorY.y / gridSpacing}
                \\end{bmatrix}
                \\]
                \\[
                A \\cdot \\mathbf{blue} = \\mathbf{red}
                \\]
            `;
            document.getElementById('solutionText').innerHTML = solutionText;
            MathJax.typeset(); // Re-render MathJax for solution display
        } else {
            document.getElementById('solutionText').innerHTML = '';
            draw();
        }
    });

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
        bluePoint = getRandomPoint();
        redPoint = getRandomPoint();
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
