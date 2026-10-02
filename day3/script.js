let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];
 
const CATEGORIES = ["personal", "work", "study"];
 
// 1. Keep only notes whose lower-case text contains the lower-case word
function searchNotes(word) {
  const search = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(search));
}
 
// 2. Start with the first note as the "longest so far", then compare
function longestNote() {
  if (notes.length === 0) return null;
  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}
 
// 3. Start every category at 0, then add 1 for each note
function countByCategory() {
  const counts = { personal: 0, work: 0, study: 0 };
  notes.forEach((note) => {
    counts[note.category]++;
  });
  return counts;
}
 
// 4. Build a readable sentence from the counts
function getSummary() {
  const counts = countByCategory();
  const word = notes.length === 1 ? "note" : "notes";
  return (
    `${notes.length} ${word}: ` +
    `${counts.personal} personal, ${counts.work} work, ${counts.study} study.`
  );
}
 
// 5. true if ANY existing note has the same cleaned text
function isDuplicate(text) {
  const cleaned = text.trim().toLowerCase();
  return notes.some((note) => note.text.toLowerCase() === cleaned);
}
 
// 6. Check every rule; stop at the first one that fails
function addNote(text, category) {
  const cleaned = text.trim();
 
  if (cleaned.length === 0 || cleaned.length > 200) {
    console.log("Rejected: a note must be 1-200 characters.");
    return false;
  }
  if (isDuplicate(cleaned)) {
    console.log(`Rejected: "${cleaned}" already exists.`);
    return false;
  }
  if (!CATEGORIES.includes(category)) {
    console.log(`Rejected: "${category}" is not a valid category.`);
    return false;
  }
 
  notes.push({ id: Date.now(), text: cleaned, category: category });
  console.log(`Added: "${cleaned}" (${category})`);
  return true;
}
 
// ---------------- Tests ----------------
console.log(searchNotes("revise"));   // [ {id: 4, text: "Revise...", ...} ]
console.log(searchNotes("BREAD"));    // [ {id: 1, ...} ] - case does not matter
console.log(searchNotes("holiday"));  // [] - no matches
 
console.log(longestNote().text);      // "Email the project report to Grace"
 
console.log(countByCategory());       // { personal: 2, work: 1, study: 2 }
console.log(getSummary());            // "5 notes: 2 personal, 1 work, 2 study."
 
console.log(isDuplicate("  call MUM ")); // true
console.log(isDuplicate("Call dad"));    // false
 
console.log(addNote("Read chapter 4", "study")); // Added ... then true
console.log(addNote("call mum", "personal"));    // Rejected (duplicate), false
console.log(addNote("   ", "work"));             // Rejected (length), false
console.log(addNote("Plan trip", "holiday"));    // Rejected (category), false
console.log(getSummary());            // "6 notes: 2 personal, 1 work, 3 study."
