// Select DOM elements
const loadBtn = document.getElementById("load-users");
const filterInput = document.getElementById("filter-input");
const statusPara = document.getElementById("status");
const usersList = document.getElementById("users-list");

// Module-level array to store fetched users
let allUsers = [];

/**
 * Renders a list of users to the DOM using createElement and textContent.
 * @param {Array} list - Array of user objects to render.
 */
function renderUsers(list) {
  // Clear the users list
  usersList.textContent = "";

  if (list.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.textContent = "No users match your filter.";
    usersList.appendChild(emptyLi);
    return;
  }

  list.forEach((user) => {
    const li = document.createElement("li");

    const nameDiv = document.createElement("div");
    nameDiv.className = "user-name";
    nameDiv.textContent = user.name;

    const emailDiv = document.createElement("div");
    emailDiv.className = "user-info";
    emailDiv.textContent = `Email: ${user.email}`;

    const cityDiv = document.createElement("div");
    cityDiv.className = "user-info";
    cityDiv.textContent = `City: ${user.address?.city || "N/A"}`;

    const companyDiv = document.createElement("div");
    companyDiv.className = "user-info";
    companyDiv.textContent = `Company: ${user.company?.name || "N/A"}`;

    li.appendChild(nameDiv);
    li.appendChild(emailDiv);
    li.appendChild(cityDiv);
    li.appendChild(companyDiv);

    usersList.appendChild(li);
  });
}

/**
 * Fetches users from the JSONPlaceholder API.
 */
async function loadUsers() {
  loadBtn.disabled = true;
  statusPara.textContent = "Loading users...";

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    allUsers = data;

    statusPara.textContent = `Loaded ${allUsers.length} users.`;

    // Apply any active filter query to the newly loaded users
    const query = filterInput.value.trim().toLowerCase();
    const filtered = allUsers.filter((user) =>
      user.name.toLowerCase().includes(query)
    );
    renderUsers(filtered);
  } catch (error) {
    statusPara.textContent = "Failed to load users. Please try again.";
    console.error("Error loading users:", error);
  } finally {
    loadBtn.disabled = false;
  }
}

// Event Listeners

// Fetch users on Load Users button click
loadBtn.addEventListener("click", loadUsers);

// Filter users on text input event
filterInput.addEventListener("input", () => {
  const query = filterInput.value.trim().toLowerCase();
  const filtered = allUsers.filter((user) =>
    user.name.toLowerCase().includes(query)
  );
  renderUsers(filtered);
});
