// DOM Element Selection
const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

/**
 * Updates character and word counters and applies appropriate state classes.
 */
function updateCounts() {
  const val = noteText.value;
  const len = val.length;

  // Update Character Count
  charCount.textContent = `${len} / 200 characters`;

  // Update Word Count
  const trimmed = val.trim();
  const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;
  wordCount.textContent = `${words} ${words === 1 ? "word" : "words"}`;

  // Reset state classes
  charCount.classList.remove("warning", "over");

  // Apply warning (>180 and <=200) or over (>200) class
  if (len > 200) {
    charCount.classList.add("over");
  } else if (len > 180) {
    charCount.classList.add("warning");
  }
}

/**
 * Clears the textarea, removes draft from localStorage, and updates counters.
 */
function clearNote() {
  noteText.value = "";
  localStorage.removeItem("noteDraft");
  updateCounts();
}

// Event Listeners

// Save draft and update counts on input
noteText.addEventListener("input", () => {
  updateCounts();
  localStorage.setItem("noteDraft", noteText.value);
});

// Clear note on Clear button click
clearBtn.addEventListener("click", clearNote);

// Clear note on Escape key press inside textarea
noteText.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    clearNote();
  }
});

// Toggle dark mode theme and save preference
themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  if (isDark) {
    themeToggle.textContent = "Light mode";
    localStorage.setItem("theme", "dark");
  } else {
    themeToggle.textContent = "Dark mode";
    localStorage.setItem("theme", "light");
  }
});

/**
 * Restores theme preference and note draft from localStorage on app initialization.
 */
function init() {
  // Restore saved theme preference
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "Light mode";
  } else {
    document.body.classList.remove("dark");
    themeToggle.textContent = "Dark mode";
  }

  // Restore saved note draft
  const savedDraft = localStorage.getItem("noteDraft");
  if (savedDraft !== null) {
    noteText.value = savedDraft;
  }

  // Calculate initial character and word counts
  updateCounts();
}

// Initialize application state (script is deferred in HTML head)
init();
