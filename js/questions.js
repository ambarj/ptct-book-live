// Interactive Question System - Handles MCQ, MSQ, and Fill-in-blank questions

// Initialize all questions on page load
function initializeQuestions() {
    document.querySelectorAll('.question-container').forEach(container => {
        const type = container.dataset.type;
        const verifyBtn = container.querySelector('.btn-verify');

        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => verifyAnswer(container));
        }

        // Add change listeners to options
        if (type === 'mcq' || type === 'msq') {
            const inputs = container.querySelectorAll('input[type="radio"], input[type="checkbox"]');
            inputs.forEach(input => {
                input.addEventListener('change', () => {
                    updateOptionSelection(container);
                });
            });
        }
    });
}

function updateOptionSelection(container) {
    const options = container.querySelectorAll('.option');
    options.forEach(option => {
        const input = option.querySelector('input');
        if (input.checked) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}

function verifyAnswer(container) {
    const type = container.dataset.type;
    let isCorrect = false;

    if (type === 'mcq') {
        isCorrect = verifyMCQ(container);
    } else if (type === 'msq') {
        isCorrect = verifyMSQ(container);
    } else if (type === 'fill') {
        isCorrect = verifyFill(container);
    }

    showFeedback(container, isCorrect);
}

function verifyMCQ(container) {
    const correctAnswer = container.dataset.answer;
    const selectedInput = container.querySelector('input[type="radio"]:checked');

    if (!selectedInput) {
        alert('Please select an answer first!');
        return false;
    }

    const selectedValue = selectedInput.value;
    const isCorrect = selectedValue === correctAnswer;

    // Mark options - only show what user selected
    const options = container.querySelectorAll('.option');
    options.forEach((option, index) => {
        const input = option.querySelector('input');
        input.disabled = true;
        option.classList.add('disabled');

        if (input.checked) {
            // Mark the selected option as correct or incorrect
            if (isCorrect) {
                option.classList.add('correct');
            } else {
                option.classList.add('incorrect');
            }
        }
        // Don't reveal the correct answer if they got it wrong
    });

    return isCorrect;
}

function verifyMSQ(container) {
    const correctAnswers = container.dataset.answer.split(',').map(s => s.trim());
    const selectedInputs = container.querySelectorAll('input[type="checkbox"]:checked');

    if (selectedInputs.length === 0) {
        alert('Please select at least one answer!');
        return false;
    }

    const selectedValues = Array.from(selectedInputs).map(input => input.value);

    // Check if arrays are equal (same elements)
    const isCorrect = correctAnswers.length === selectedValues.length &&
                      correctAnswers.every(val => selectedValues.includes(val));

    // Disable all options
    const options = container.querySelectorAll('.option');
    options.forEach(option => {
        const input = option.querySelector('input');
        input.disabled = true;
        option.classList.add('disabled');
    });

    // Only show which options are correct/incorrect if they got it 100% right
    // Otherwise, no visual feedback on individual options (prevents revealing partial answers)
    if (isCorrect) {
        options.forEach(option => {
            const input = option.querySelector('input');
            if (input.checked) {
                option.classList.add('correct');
            }
        });
    }
    // If wrong, don't mark any options - just return false and show generic "incorrect" message

    return isCorrect;
}

function verifyFill(container) {
    const correctAnswers = container.dataset.answer.split('|').map(s => s.trim());
    // Get both text inputs and select dropdowns
    const blanks = container.querySelectorAll('.fill-blank, .fill-blank-select');

    let allCorrect = true;
    blanks.forEach((blank, index) => {
        const userAnswer = blank.value.trim();
        const correctAnswer = correctAnswers[index];

        blank.disabled = true;

        // Check if answer is correct
        if (isAnswerCorrect(userAnswer, correctAnswer)) {
            blank.classList.add('correct');
        } else {
            blank.classList.add('incorrect');
            allCorrect = false;
        }
    });

    return allCorrect;
}

// Helper function to check if answer is correct
// Supports text, exact numbers, and numerical ranges
function isAnswerCorrect(userAnswer, correctAnswer) {
    // Check for numerical range format: "3.1415[3.1414,3.1416]"
    const rangeMatch = correctAnswer.match(/^([\d.]+)\[([\d.]+),([\d.]+)\]$/);

    if (rangeMatch) {
        // Numerical range answer
        const userNum = parseFloat(userAnswer);
        const minVal = parseFloat(rangeMatch[2]);
        const maxVal = parseFloat(rangeMatch[3]);

        if (isNaN(userNum)) return false;
        return userNum >= minVal && userNum <= maxVal;
    }

    // Try exact number match (case-insensitive for text)
    const userLower = userAnswer.toLowerCase();
    const correctLower = correctAnswer.toLowerCase();

    // Check if both are numbers
    const userNum = parseFloat(userAnswer);
    const correctNum = parseFloat(correctAnswer);

    if (!isNaN(userNum) && !isNaN(correctNum)) {
        // Both are numbers - check exact match
        return userNum === correctNum;
    }

    // Text comparison (case-insensitive)
    return userLower === correctLower;
}

function showFeedback(container, isCorrect) {
    // Update container styling
    container.classList.add(isCorrect ? 'answered-correct' : 'answered-incorrect');

    // Hide verify button
    const verifyBtn = container.querySelector('.btn-verify');
    if (verifyBtn) verifyBtn.style.display = 'none';

    // Show feedback message
    let feedback = container.querySelector('.question-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'question-feedback';
        container.appendChild(feedback);
    }

    feedback.style.display = 'flex';
    feedback.className = `question-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedback.innerHTML = isCorrect
        ? '<span>Correct! Well done.</span>'
        : '<span>Not quite right.</span>';

    // Add action buttons
    const actions = container.querySelector('.question-actions');
    actions.innerHTML = '';

    const tryAgainBtn = document.createElement('button');
    tryAgainBtn.className = 'btn-try-again';
    tryAgainBtn.textContent = 'Try Again';
    tryAgainBtn.addEventListener('click', () => resetQuestion(container));

    const explainBtn = document.createElement('button');
    explainBtn.className = 'btn-explain';
    explainBtn.textContent = 'Explain';
    explainBtn.addEventListener('click', () => showExplanation(container));

    actions.appendChild(tryAgainBtn);
    actions.appendChild(explainBtn);
}

function resetQuestion(container) {
    const type = container.dataset.type;

    // Reset container styling
    container.classList.remove('answered-correct', 'answered-incorrect');

    // Hide feedback and explanation
    const feedback = container.querySelector('.question-feedback');
    if (feedback) feedback.style.display = 'none';

    const explanation = container.querySelector('.question-explanation');
    if (explanation) explanation.style.display = 'none';

    // Reset based on type
    if (type === 'mcq' || type === 'msq') {
        const options = container.querySelectorAll('.option');
        options.forEach(option => {
            const input = option.querySelector('input');
            input.checked = false;
            input.disabled = false;
            option.classList.remove('selected', 'correct', 'incorrect', 'disabled');
        });
    } else if (type === 'fill') {
        // Reset both text inputs and select dropdowns
        const blanks = container.querySelectorAll('.fill-blank, .fill-blank-select');
        blanks.forEach(blank => {
            blank.value = '';
            blank.disabled = false;
            blank.classList.remove('correct', 'incorrect');
        });
    }

    // Restore verify button
    const actions = container.querySelector('.question-actions');
    actions.innerHTML = '';
    const verifyBtn = document.createElement('button');
    verifyBtn.className = 'btn-verify';
    verifyBtn.textContent = 'Verify';
    verifyBtn.addEventListener('click', () => verifyAnswer(container));
    actions.appendChild(verifyBtn);
}

function showExplanation(container) {
    const explanation = container.querySelector('.question-explanation');
    if (explanation) {
        explanation.style.display = 'block';
    }
}
