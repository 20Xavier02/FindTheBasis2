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

    // Prevent touch events from scrolling the page
    window.addEventListener('touchmove', (event) => {
        event.preventDefault();
    }, { passive: false });

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

    // Display the solution text in the center of the grid
    function displaySolution() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);  // Clear the grid
        drawGrid();  // Keep the grid visible

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

        // Display the solution in the center of the canvas
        const midX = origin.x;
        const midY = origin.y;

        ctx.font = '16px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.fillText('Solution:', midX, midY - 100);
        ctx.fillText(`A = [${unitVectorX.x / gridSpacing} ${unitVectorY.x / gridSpacing}]`, midX, midY - 70);
        ctx.fillText(`[${-unitVectorX.y / gridSpacing} ${-unitVectorY.y / gridSpacing}]`, midX, midY - 50);
        ctx.fillText(`A * blue = red`, midX, midY - 20);

        MathJax.typeset();  // Update MathJax rendering
    }

    function draw() {
        drawGrid();
        drawAxes();
        drawArrow(origin, { x: origin.x + unitVectorX.x, y: origin.y + unitVectorX.y }, 'green', "i'");
        drawArrow(origin, { x: origin.x + unitVectorY.x, y: origin.y + unitVectorY.y }, 'green', "j'");
    }

    // Handle "Solve" button click to toggle solution display
    document.getElementById('solveButton').addEventListener('click', () => {
        solveClicked = !solveClicked;
        if (solveClicked) {
            displaySolution();  // Show the solution text in the center
        } else {
            draw();  // Redraw the grid and vectors if toggled off
        }
    });

    // Dragging and moving the vectors
    function handleMouseMove(event) {
        if (dragging && !isPaused) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
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

    canvas.addEventListener('mousemove', handleMouseMove);

    canvas.addEventListener('mouseup', () => {
        dragging = null;
    });

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

    // Initial draw and start timer
    draw();
    startTimer();
});

