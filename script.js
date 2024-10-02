let currentRecipe = null;

const languageSelect = document.getElementById('language-select');
let currentLanguage = 'en';

async function translateText(text, targetLanguage) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLanguage}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('Translation failed');
    }

    const data = await response.json();
    return data.responseData.translatedText;
}

async function updateLanguage() {
    const newLanguage = languageSelect.value;
    if (newLanguage === currentLanguage) return;

    currentLanguage = newLanguage;

    // Show loading indicator
    document.getElementById("loading").style.display = "block";

    try {
        // Translate title
        const title = await translateText(currentRecipe.title, currentLanguage);
        document.getElementById("meal-name").textContent = title;

        // Translate ingredients
        const ingredientsList = document.getElementById("ingredients");
        for (const li of ingredientsList.children) {
            li.textContent = await translateText(li.textContent, currentLanguage);
        }

        // Translate instructions
        const instructionsList = document.getElementById("instructions");
        for (const li of instructionsList.children) {
            li.textContent = await translateText(li.textContent, currentLanguage);
        }

        // Translate button texts
        document.getElementById("save").textContent = await translateText("Save", currentLanguage);
        document.getElementById("next").textContent = await translateText("Next", currentLanguage);

        // Translate static texts
        const ingredientsHeader = document.querySelector("#meal-container h3:first-of-type");
        const instructionsHeader = document.querySelector("#meal-container h3:last-of-type");
        ingredientsHeader.textContent = await translateText("Ingredients:", currentLanguage);
        instructionsHeader.textContent = await translateText("Instructions:", currentLanguage);
    } catch (error) {
        console.error("Translation error:", error);
        alert("An error occurred during translation. Please try again.");
    } finally {
        // Hide loading indicator
        document.getElementById("loading").style.display = "none";
    }
}

languageSelect.addEventListener('change', updateLanguage);

async function getRandomRecipe() {
    try {
        const response = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
        const data = await response.json();
        const meal = data.meals[0];

        // Format the recipe data to match our expected structure
        return {
            title: meal.strMeal,
            image: meal.strMealThumb,
            extendedIngredients: getIngredients(meal),
            analyzedInstructions: [{
                steps: meal.strInstructions.split('\n').filter(step => step.trim() !== '').map(step => ({ step: step.trim() }))
            }]
        };
    } catch (error) {
        console.error('Error fetching recipe:', error);
        throw error;
    }
}

function getIngredients(meal) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ingredient && ingredient.trim() !== '') {
            ingredients.push({
                name: ingredient,
                amount: measure
            });
        }
    }
    return ingredients;
}

async function displayRandomMeal() {
    const mealContainer = document.getElementById("meal-container");
    const loadingElement = document.getElementById("loading");

    mealContainer.style.opacity = "0";
    mealContainer.style.transform = "translateY(20px)";
    loadingElement.style.display = "block";
    
    try {
        const recipe = await getRandomRecipe();
        currentRecipe = recipe; // Store the current recipe
        
        // Reset language to English
        currentLanguage = 'en';
        languageSelect.value = 'en';

        // Display recipe in English
        document.getElementById("meal-name").textContent = recipe.title;
        
        // Add the image
        const mealImage = document.getElementById("meal-image");
        mealImage.src = recipe.image;
        mealImage.alt = recipe.title;
        
        const ingredientsList = document.getElementById("ingredients");
        ingredientsList.innerHTML = "";
        recipe.extendedIngredients.forEach(ingredient => {
            const li = document.createElement("li");
            li.textContent = `${ingredient.amount} ${ingredient.name}`;
            ingredientsList.appendChild(li);
        });

        const instructionsList = document.getElementById("instructions");
        instructionsList.innerHTML = "";
        recipe.analyzedInstructions[0].steps.forEach((step) => {
            const li = document.createElement("li");
            li.textContent = step.step; // Remove the numbering
            instructionsList.appendChild(li);
        });

        mealContainer.style.opacity = "1";
        mealContainer.style.transform = "translateY(0)";
    } catch (error) {
        console.error("Error fetching recipe:", error);
        document.getElementById("meal-name").textContent = "Error fetching recipe. Please try again.";
    } finally {
        loadingElement.style.display = "none";
    }
}

function generatePDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    // Set font styles
    pdf.setFont("helvetica", "normal");

    // Add title
    pdf.setFontSize(24);
    pdf.setTextColor(231, 76, 60); // #e74c3c - Red color for title
    const title = document.getElementById('meal-name').textContent;
    const splitTitle = pdf.splitTextToSize(title, 170);
    pdf.text(splitTitle, 20, 20);

    let yPos = 20 + (splitTitle.length * 10); // Adjust Y position based on title length

    // Add image with correct aspect ratio
    if (currentRecipe.image) {
        const img = new Image();
        img.crossOrigin = "Anonymous";  // This can help with CORS issues
        img.src = currentRecipe.image;
        img.onload = function() {
            const imgWidth = 170;
            const imgHeight = (img.height * imgWidth) / img.width;
            pdf.addImage(img, 'JPEG', 20, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 10;

            // Continue with the rest of the PDF generation
            generatePDFContent(pdf, yPos, title);
        }
        img.onerror = function() {
            console.error("Error loading image");
            // Continue PDF generation without the image
            generatePDFContent(pdf, yPos, title);
        }
    } else {
        // If there's no image, continue with the rest of the PDF generation
        generatePDFContent(pdf, yPos, title);
    }
}

function generatePDFContent(pdf, startY, title) {
    let yPos = startY;

    // Add ingredients
    pdf.setFontSize(16);
    pdf.setTextColor(52, 152, 219); // #3498db - Blue color for section headers
    const ingredientsTitle = document.querySelector('h3').textContent;
    pdf.text(ingredientsTitle, 20, yPos);
    
    // Add line below "Ingredients"
    yPos += 5;
    pdf.setDrawColor(52, 152, 219); // Blue color for the line (#3498db)
    pdf.setLineWidth(0.5);
    pdf.line(20, yPos, 190, yPos);
    
    pdf.setFontSize(12);
    pdf.setTextColor(51, 51, 51); // #333333 - Dark gray for main text
    yPos += 10;
    const ingredientsList = document.getElementById('ingredients').getElementsByTagName('li');
    Array.from(ingredientsList).forEach(ingredient => {
        pdf.setFillColor(51, 51, 51); // Set fill color to dark gray for bullet points
        pdf.circle(23, yPos - 1, 1, 'F');  // Add a filled circle as a bullet point
        pdf.text(ingredient.textContent, 28, yPos);
        yPos += 7;
        if (yPos > 280) {
            pdf.addPage();
            yPos = 20;
        }
    });

    // Add instructions
    yPos += 15;
    if (yPos > 260) {
        pdf.addPage();
        yPos = 20;
    }
    pdf.setFontSize(16);
    pdf.setTextColor(52, 152, 219); // #3498db - Blue color for section headers
    const instructionsTitle = document.querySelectorAll('h3')[1].textContent;
    pdf.text(instructionsTitle, 20, yPos);
    
    // Add line below "Instructions"
    yPos += 5;
    pdf.setDrawColor(52, 152, 219); // Blue color for the line (#3498db)
    pdf.setLineWidth(0.5);
    pdf.line(20, yPos, 190, yPos);
    
    pdf.setFontSize(12);
    pdf.setTextColor(51, 51, 51); // #333333 - Dark gray for main text
    yPos += 10;
    const instructionsList = document.getElementById('instructions').getElementsByTagName('li');
    Array.from(instructionsList).forEach((instruction) => {
        pdf.setFillColor(51, 51, 51); // Set fill color to dark gray for bullet points
        pdf.circle(23, yPos - 1, 1, 'F');  // Add a filled circle as a bullet point
        const splitStep = pdf.splitTextToSize(instruction.textContent, 160);
        pdf.text(splitStep, 28, yPos);
        yPos += splitStep.length * 7;
        if (yPos > 280) {
            pdf.addPage();
            yPos = 20;
        }
    });

    // Sanitize the recipe name for use as a filename
    const safeFileName = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    pdf.save(`${safeFileName}.pdf`);
}

document.getElementById("save").addEventListener("click", () => {
    try {
        generatePDF();
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("An error occurred while generating the PDF. Please try again.");
    }
});

document.getElementById("next").addEventListener("click", () => {
    displayRandomMeal();
});

// Display initial random meal
displayRandomMeal();

function changeLanguage() {
    const selectedLanguage = document.getElementById('language-select').value;
    localStorage.setItem('preferredLanguage', selectedLanguage);
    translatePage(selectedLanguage);
}

function applyStoredLanguage() {
    const storedLanguage = localStorage.getItem('preferredLanguage');
    if (storedLanguage) {
        document.getElementById('language-select').value = storedLanguage;
        translatePage(storedLanguage);
    }
}

document.addEventListener('DOMContentLoaded', applyStoredLanguage);

// Initial translation (if needed)
const initialLanguage = document.getElementById('language-select').value;
translatePage(initialLanguage);

document.getElementById('language-select').addEventListener('change', function() {
    const selectedLanguage = this.value;
    translatePage(selectedLanguage);
});
